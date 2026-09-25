/**
 * SMART DAILY GENERATOR — `generateDailyPlan(date)` (spec §5, §37).
 *
 * Pure and deterministic. Inputs: university timetable, subject weights, deadlines, exam proximity,
 * mastery, backlog, missed work, available time, energy, personal rules and recent behaviour.
 * Output: an ordered task list where **every task carries why / duration / priority / subject / topic / type**,
 * plus a reserved buffer so the day is never filled to 100 %.
 */

import type { Chapter, StudyTask, Subject, TaskType } from '../types';
import type { ISODate } from '../date';
import {
  clamp,
  daysBetween,
  dayOfWeek,
  formatDurationShort,
  minutesToTime,
  parseTimeToMinutes,
} from '../date';
import { computeSubjectPriorities, priorityLabel, type SubjectPriority } from './priority';
import { dueRevisions, daysSinceRevision } from './revision';
import type { DayWindow, PlannedTaskDraft, PlanningContext, PlanningResult } from './types';
import { effectiveMastery } from './mastery';
import { stableId } from '../ids';

const TYPE_RANK: Record<TaskType, number> = {
  ASSESSMENT: 0,
  PRACTICE: 1,
  REVISION: 2,
  MEMORY: 3,
  TD: 4,
  TP: 5,
  COURSE: 6,
  REVIEW: 7,
  RECOVERY: 8,
};

const TYPE_DEMAND: Record<TaskType, number> = {
  ASSESSMENT: 3,
  PRACTICE: 3,
  TD: 2,
  TP: 3,
  REVISION: 1,
  MEMORY: 1,
  COURSE: 2,
  REVIEW: 1,
  RECOVERY: 2,
};

/** Free study windows of a day, after removing university classes and transitions. */
export function computeFreeWindows(
  date: ISODate,
  timetable: PlanningContext['timetable'],
  rules: PlanningContext['rules'],
): DayWindow[] {
  const dow = dayOfWeek(date);
  const dayStart = parseTimeToMinutes(rules.dayStart);
  const dayEnd = parseTimeToMinutes(rules.dayEnd);
  const blocks = timetable
    .filter((c) => c.active && c.dayOfWeek === dow)
    .map((c) => ({
      start: parseTimeToMinutes(c.startTime),
      end: parseTimeToMinutes(c.endTime) + 15, // getting out of the room
      label: `${c.kind} ${c.subjectId}`,
    }))
    .sort((a, b) => a.start - b.start);

  const windows: DayWindow[] = [];
  let cursor = dayStart;
  for (const block of blocks) {
    if (block.start - cursor >= 30) {
      windows.push({ startMin: cursor, endMin: Math.min(block.start, dayEnd), label: 'free' });
    }
    cursor = Math.max(cursor, block.end);
  }
  if (dayEnd - cursor >= 30) windows.push({ startMin: cursor, endMin: dayEnd, label: 'free' });
  return windows.filter((w) => w.endMin - w.startMin >= 30);
}

interface Candidate {
  subjectId: string | null;
  chapterId: string | null;
  type: TaskType;
  title: string;
  minutes: number;
  priority: number;
  reasons: string[];
  origin: StudyTask['origin'];
  demand: number;
}

function pickFocusChapter(chapters: Chapter[], subjectId: string, date: ISODate): Chapter | null {
  const list = chapters
    .filter((c) => c.subjectId === subjectId)
    .sort((a, b) => a.order - b.order);
  if (list.length === 0) return null;
  const due = dueRevisions(list, date);
  if (due.length > 0) return due[0];
  const byMastery = list.find((c) => effectiveMastery(c) < 2);
  if (byMastery) return byMastery;
  const practised = list.find((c) => effectiveMastery(c) < 4);
  if (practised) return practised;
  return list[list.length - 1];
}

function unmetPrerequisites(chapter: Chapter | null, chapters: Chapter[]): Chapter[] {
  if (!chapter) return [];
  return chapter.prerequisiteIds
    .map((id) => chapters.find((c) => c.id === id))
    .filter((c): c is Chapter => Boolean(c))
    .filter((c) => effectiveMastery(c) < 2);
}

/** Titles are practical and specific — never motivational filler. */
function buildTitle(type: TaskType, subject: Subject, chapter: Chapter | null): string {
  const topic = chapter ? chapter.title : `${subject.shortName} — structure not published`;
  switch (type) {
    case 'COURSE':
      return `Study & summarise — ${topic}`;
    case 'TD':
      return `Solve exercises — ${topic}`;
    case 'TP':
      return `Practice on machine — ${topic}`;
    case 'PRACTICE':
      return `Timed exam-style practice — ${topic}`;
    case 'REVISION':
      return `Active recall (closed book) — ${topic}`;
    case 'MEMORY':
      return `Memorise formulas & definitions — ${topic}`;
    case 'ASSESSMENT':
      return `Timed mock exam — ${subject.shortName}`;
    case 'REVIEW':
      return `Fix weak prerequisite — ${topic}`;
    case 'RECOVERY':
      return `Recovery — ${topic}`;
    default:
      return `${topic}`;
  }
}

export function generateDailyPlan(ctx: PlanningContext): PlanningResult {
  const { date, rules, subjects, chapters, timetable } = ctx;
  const notes: string[] = [];
  const nowIso = ctx.now;

  // ---- 1. available time -------------------------------------------------
  const windows = computeFreeWindows(date, timetable, rules);
  const freeMinutes = windows.reduce((acc, w) => acc + (w.endMin - w.startMin), 0);
  const dow = dayOfWeek(date);
  const isRestDay = rules.restDays.includes(dow);
  const classMinutes = timetable
    .filter((c) => c.active && c.dayOfWeek === dow)
    .reduce((acc, c) => acc + (parseTimeToMinutes(c.endTime) - parseTimeToMinutes(c.startTime)), 0);

  const requested = Math.max(0, ctx.checkIn.availableMin);
  let availableMin = Math.min(requested, rules.maxDailyMin, freeMinutes);
  if (classMinutes > 0) {
    const classCount = timetable.filter((c) => c.active && c.dayOfWeek === dow).length;
    notes.push(
      `${classCount} university class(es) today (${formatDurationShort(classMinutes)}) — study blocks are placed in the ${formatDurationShort(freeMinutes)} of free time around them.`,
    );
  }
  if (isRestDay) {
    availableMin = Math.min(availableMin, 45);
    notes.push('Protected rest day — light revision only, recovery is deferred.');
  }
  if (requested > freeMinutes) {
    notes.push(
      `Only ${formatDurationShort(freeMinutes)} of the day is genuinely free around university classes — plan capped.`,
    );
  }
  const bufferMin = Math.round(availableMin * rules.bufferRatio);
  const usableMin = Math.max(0, availableMin - bufferMin);

  // ---- 2. mode -----------------------------------------------------------
  const upcomingExam = ctx.exams
    .filter((e) => e.date >= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .find((e) => daysBetween(date, e.date) <= rules.examModeWindowDays);

  let mode: PlanningResult['mode'] = 'normal';
  if (ctx.checkIn.energy <= 1 || usableMin < 60) {
    mode = 'minimum-viable';
    notes.push(
      usableMin < 60
        ? `Only ${formatDurationShort(usableMin)} usable — minimum viable day generated instead of a full plan.`
        : 'Energy reported as very low — minimum viable day generated.',
    );
  } else if (ctx.missedDays >= 1) {
    mode = 'recovery';
    notes.push(
      `${ctx.missedDays} missed day(s) detected — recovery blocks capped at ${Math.round(
        rules.recoveryShareRecovery * 100,
      )} % of the day; nothing is pushed blindly onto today.`,
    );
  } else if (upcomingExam) {
    mode = 'exam';
    notes.push(
      `Exam mode: ${upcomingExam.name} in ${daysBetween(date, upcomingExam.date)} day(s) — timed practice and recall prioritised, low-value reading reduced.`,
    );
  }

  // ---- 3. priorities -----------------------------------------------------
  const priorities = computeSubjectPriorities({
    date,
    subjects,
    chapters,
    exams: ctx.exams,
    sessions: ctx.sessions,
    overdueTasks: ctx.overdueTasks,
  });
  const priorityBySubject = new Map(priorities.map((p) => [p.subjectId, p]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  if (mode === 'minimum-viable') {
    return buildMinimumViableDay(ctx, priorities, subjectById, {
      date,
      availableMin,
      bufferMin,
      usableMin,
      windows,
      notes,
      nowIso,
    });
  }

  // ---- 4. recovery budget -------------------------------------------------
  const recoveryShare = mode === 'recovery' ? rules.recoveryShareRecovery : rules.recoveryShareNormal;
  let recoveryBudget = Math.round(usableMin * recoveryShare);
  if (mode === 'exam') recoveryBudget = Math.round(usableMin * Math.min(0.25, rules.recoveryShareNormal));

  // ---- 5. candidate tasks per subject ------------------------------------
  const candidates: Candidate[] = [];
  const overdueBySubject = new Map<string, StudyTask[]>();
  for (const task of ctx.overdueTasks) {
    if (!task.subjectId) continue;
    const list = overdueBySubject.get(task.subjectId) ?? [];
    list.push(task);
    overdueBySubject.set(task.subjectId, list);
  }

  // Recovery first (protected budget) — highest scoring overdue work.
  let recoveryUsed = 0;
  const recoveryCandidates = ctx.overdueTasks
    .filter((t) => t.subjectId !== null)
    .sort((a, b) => b.priority - a.priority || a.planDate.localeCompare(b.planDate));
  for (const task of recoveryCandidates) {
    if (recoveryUsed >= recoveryBudget) break;
    const subject = task.subjectId ? subjectById.get(task.subjectId) : undefined;
    if (!subject) continue;
    const chapter = task.chapterId ? chapters.find((c) => c.id === task.chapterId) ?? null : null;
    const minutes = clamp(task.plannedMin, 15, 45);
    if (recoveryUsed + minutes > recoveryBudget && recoveryCandidates.length > 1) continue;
    recoveryUsed += minutes;
    candidates.push({
      subjectId: subject.id,
      chapterId: chapter?.id ?? null,
      type: 'RECOVERY',
      title: `Recovery — ${chapter ? chapter.title : subject.shortName} (from ${task.planDate})`,
      minutes,
      priority: task.priority,
      reasons: [`Overdue since ${task.planDate}`, ...priorityBySubject.get(subject.id)?.reasons.slice(0, 1) ?? []],
      origin: 'recovery',
      demand: TYPE_DEMAND.RECOVERY,
    });
  }
  if (recoveryUsed > 0) {
    notes.push(
      `Recovery keeps ${formatDurationShort(recoveryUsed)} of today (cap ${formatDurationShort(recoveryBudget)}) — the rest is deferred to a realistic horizon.`,
    );
  }

  const remainingMin = Math.max(0, usableMin - recoveryUsed);
  const examSubjects = new Set(
    ctx.exams
      .filter((e) => e.date >= date && daysBetween(date, e.date) <= rules.examModeWindowDays)
      .map((e) => e.subjectId),
  );

  // Which subjects deserve new work today?
  const scored = priorities
    .map((p) => {
      const subject = subjectById.get(p.subjectId);
      if (!subject) return null;
      const subjectChapters = chapters.filter((c) => c.subjectId === subject.id);
      const overdueMin = overdueBySubject.get(subject.id)?.reduce((a, t) => a + t.plannedMin, 0) ?? 0;
      const due = dueRevisions(subjectChapters, date).length;
      const hasUnmastered = subjectChapters.some((c) => effectiveMastery(c) < 4);
      const examSoon = examSubjects.has(subject.id);
      const relevant = due > 0 || overdueMin > 0 || hasUnmastered || examSoon || subjectChapters.length === 0;
      return { priority: p, subject, subjectChapters, due, relevant };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter((x) => x.relevant);

  const totalWeight = scored.reduce((acc, x) => acc + x.priority.raw, 0) || 1;

  for (const entry of scored) {
    const { priority, subject, subjectChapters } = entry;
    const share = mode === 'exam' && examSubjects.has(subject.id) ? 0.6 : 0.45;
    const budget = clamp(
      Math.round((remainingMin * priority.raw) / totalWeight),
      20,
      Math.max(20, Math.round(remainingMin * share)),
    );
    let spent = 0;
    const focusChapter = pickFocusChapter(subjectChapters, subject.id, date);
    const gapChapters = unmetPrerequisites(focusChapter, chapters);
    const skipCount = ctx.behaviour.skipCountBySubject[subject.id] ?? 0;
    const struggling = ctx.behaviour.strugglingSubjectIds.includes(subject.id);
    const reasons = priority.reasons.slice(0, 3);

    // (a) anti-procrastination: repeated skips → deliberate minimum-viable start block
    if (skipCount >= 2) {
      candidates.push({
        subjectId: subject.id,
        chapterId: focusChapter?.id ?? null,
        type: 'COURSE',
        title: `Start 10-minute session — ${focusChapter ? focusChapter.title : subject.shortName}`,
        minutes: 10,
        priority: priority.normalized,
        reasons: [
          `Skipped ${skipCount} times recently — task cut down to remove the initiation barrier`,
          ...reasons.slice(0, 1),
        ],
        origin: 'planner',
        demand: 1,
      });
      spent += 10;
      notes.push(
        `${subject.shortName} was skipped repeatedly — reduced to a 10-minute start block (continue or stop honestly).`,
      );
      if (budget - spent < 20) continue;
    }

    // (b) prerequisite repair (spec §25: a subject that keeps failing gets prerequisite review)
    if (gapChapters.length > 0 && (struggling || effectiveMastery(focusChapter as Chapter) <= 1)) {
      const prereq = gapChapters[0];
      const minutes = 25;
      if (spent + minutes <= budget || spent === 0) {
        candidates.push({
          subjectId: subject.id,
          chapterId: prereq.id,
          type: 'REVIEW',
          title: buildTitle('REVIEW', subject, prereq),
          minutes,
          priority: priority.normalized,
          reasons: [`Prerequisite for "${focusChapter?.title ?? ''}" is not secured`, ...reasons.slice(0, 1)],
          origin: 'review',
          demand: TYPE_DEMAND.REVIEW,
        });
        spent += minutes;
      }
    }

    // (c) revision due (protected first pass)
    const dueList = dueRevisions(subjectChapters, date);
    if (dueList.length > 0) {
      const chapter = dueList[0];
      const since = daysSinceRevision(chapter, date);
      const minutes = 25;
      if (spent + minutes <= budget || spent === 0) {
        candidates.push({
          subjectId: subject.id,
          chapterId: chapter.id,
          type: 'REVISION',
          title: buildTitle('REVISION', subject, chapter),
          minutes,
          priority: priority.normalized + 10,
          reasons: [
            since === null
              ? 'Scheduled review due'
              : `Scheduled review due (${since} day(s) since last recall)`,
            ...reasons.slice(0, 1),
          ],
          origin: 'review',
          demand: TYPE_DEMAND.REVISION,
        });
        spent += minutes;
      }
    }

    // (d) main work block(s) driven by mastery
    const mastery = focusChapter ? effectiveMastery(focusChapter) : 0;
    const planned: Array<{ type: TaskType; minutes: number }> = [];
    if (mode === 'exam' && examSubjects.has(subject.id)) {
      planned.push({ type: 'ASSESSMENT', minutes: 60 });
      planned.push({ type: 'REVISION', minutes: 25 });
      if (spent + 85 <= budget + 30) planned.push({ type: 'MEMORY', minutes: 20 });
    } else if (!focusChapter) {
      planned.push({ type: 'COURSE', minutes: 40 });
    } else if (mastery <= 1) {
      planned.push({ type: 'COURSE', minutes: 45 });
      if (mastery === 1) planned.push({ type: 'TD', minutes: 40 });
    } else if (mastery === 2) {
      planned.push({ type: 'TD', minutes: 45 });
    } else if (mastery === 3) {
      planned.push({ type: 'PRACTICE', minutes: 45 });
    } else {
      planned.push({ type: 'PRACTICE', minutes: 40 });
      if (subjectChapters.length > 1) planned.push({ type: 'MEMORY', minutes: 20 });
    }

    for (const item of planned) {
      let minutes = item.minutes;
      // (e) adaptive sizing — repeated overruns shrink and split blocks; early finishes raise challenge
      if (ctx.behaviour.overshootRatio > 0.5) {
        minutes = Math.round(minutes * 0.6);
        notes.push('Recent sessions ran far over estimate — blocks split into shorter ones.');
      } else if (ctx.behaviour.overshootRatio > 0.25) {
        minutes = Math.round(minutes * 0.8);
        notes.push('Recent sessions ran over estimate — blocks shortened by 20 %.');
      } else if (ctx.behaviour.undershootRatio > 0.2 && ctx.behaviour.sessionsLast7d >= 3) {
        minutes = Math.round(Math.min(rules.maxBlockMin, minutes * 1.15));
        notes.push('Tasks have been finishing early — challenge raised by 15 %.');
      }
      minutes = clamp(minutes, 15, rules.maxBlockMin);
      if (spent + minutes > budget && spent > 0) continue;
      candidates.push({
        subjectId: subject.id,
        chapterId: focusChapter?.id ?? null,
        type: item.type,
        title: buildTitle(item.type, subject, focusChapter),
        minutes,
        priority: priority.normalized,
        reasons,
        origin: mode === 'exam' && item.type === 'ASSESSMENT' ? 'exam-mode' : 'planner',
        demand: TYPE_DEMAND[item.type],
      });
      spent += minutes;
    }
  }

  // ---- 6. ordering + trimming --------------------------------------------
  const ordered = orderCandidates(candidates, ctx);
  const fitted = fitToBudget(ordered, usableMin, notes);

  // ---- 7. timeline placement ---------------------------------------------
  const tasks = placeOnTimeline(fitted, windows, ctx);
  const plannedMin = tasks.reduce((acc, t) => acc + t.plannedMin, 0);

  const allocation = [...new Map(tasks.filter((t) => t.subjectId).map((t) => [t.subjectId as string, t])).keys()]
    .map((subjectId) => {
      const p = priorityBySubject.get(subjectId);
      return {
        subjectId,
        minutes: tasks.filter((t) => t.subjectId === subjectId).reduce((acc, t) => acc + t.plannedMin, 0),
        priority: p?.normalized ?? 0,
        reasons: p?.reasons ?? [],
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  const rationale = buildRationale({ mode, plannedMin, bufferMin, availableMin, tasks, notes, nowIso });

  return {
    date,
    mode,
    availableMin,
    bufferMin,
    plannedMin,
    tasks,
    allocation,
    rationale,
    notes: dedupe(notes),
    freeWindows: windows,
  };
}

function orderCandidates(candidates: Candidate[], ctx: PlanningContext): Candidate[] {
  const morningEnergyBonus = ctx.checkIn.energy >= 3 ? 1 : 0;
  return [...candidates].sort((a, b) => {
    const demandDelta =
      morningEnergyBonus * (b.demand - a.demand) * 3 + (TYPE_RANK[a.type] - TYPE_RANK[b.type]);
    if (demandDelta !== 0) return demandDelta;
    if (b.priority !== a.priority) return b.priority - a.priority;
    const subjectOrder =
      (a.subjectId ? ctx.subjects.find((s) => s.id === a.subjectId)?.sortOrder ?? 99 : 99) -
      (b.subjectId ? ctx.subjects.find((s) => s.id === b.subjectId)?.sortOrder ?? 99 : 99);
    if (subjectOrder !== 0) return subjectOrder;
    return a.title.localeCompare(b.title);
  });
}

function fitToBudget(candidates: Candidate[], usableMin: number, notes: string[]): Candidate[] {
  const out: Candidate[] = [];
  let total = 0;
  for (const candidate of candidates) {
    if (total + candidate.minutes <= usableMin) {
      out.push(candidate);
      total += candidate.minutes;
      continue;
    }
    const room = usableMin - total;
    if (room >= 15) {
      out.push({ ...candidate, minutes: room });
      total += room;
      notes.push('Last block shortened to respect the daily buffer.');
    } else {
      notes.push(`"${candidate.title}" deferred — no room left inside the buffer.`);
    }
  }
  return out;
}

function placeOnTimeline(
  candidates: Candidate[],
  windows: DayWindow[],
  ctx: PlanningContext,
): PlannedTaskDraft[] {
  const nowMinutes = (() => {
    const d = new Date(ctx.now);
    return d.getHours() * 60 + d.getMinutes();
  })();
  const isToday = ctx.date === new Date(ctx.now).toLocaleDateString('en-CA');
  let windowIndex = 0;
  let cursor = windows.length > 0 ? windows[0].startMin : 8 * 60;
  if (isToday) {
    while (windowIndex < windows.length && windows[windowIndex].endMin <= nowMinutes + 5) windowIndex += 1;
    if (windowIndex < windows.length) cursor = Math.max(windows[windowIndex].startMin, nowMinutes + 5);
  }

  return candidates.map((candidate, index) => {
    let suggestedStart: string | null = null;
    if (windowIndex < windows.length && cursor + candidate.minutes <= windows[windowIndex].endMin) {
      suggestedStart = minutesToTime(cursor);
      cursor += candidate.minutes + 5;
    } else {
      windowIndex += 1;
      if (windowIndex < windows.length) {
        cursor = windows[windowIndex].startMin;
        suggestedStart = minutesToTime(cursor);
        cursor += candidate.minutes + 5;
      } else {
        suggestedStart = null;
      }
    }
    const key = stableId(
      'task',
      ctx.date,
      candidate.subjectId,
      candidate.chapterId,
      candidate.type,
      index,
    );
    return {
      key,
      subjectId: candidate.subjectId,
      chapterId: candidate.chapterId,
      type: candidate.type,
      title: candidate.title,
      plannedMin: candidate.minutes,
      priority: Math.round(candidate.priority * 10) / 10,
      priorityLabel: priorityLabel(candidate.priority),
      reasons: dedupe(candidate.reasons).slice(0, 4),
      difficultyHint: candidate.demand >= 3 ? 'hard' : candidate.demand === 2 ? 'ok' : 'easy',
      origin: candidate.origin,
      suggestedStart,
      note: '',
    };
  });
}

interface MinimumDayArgs {
  date: ISODate;
  availableMin: number;
  bufferMin: number;
  usableMin: number;
  windows: DayWindow[];
  notes: string[];
  nowIso: string;
}

/**
 * MINIMUM VIABLE DAY (spec §40): 1 priority concept + 1 active recall + 1 exercise + 1 revision item.
 * Goal = continuity, not completing the schedule.
 */
function buildMinimumViableDay(
  ctx: PlanningContext,
  priorities: SubjectPriority[],
  subjectById: Map<string, Subject>,
  args: MinimumDayArgs,
): PlanningResult {
  const { date, chapters } = ctx;
  const top = priorities[0];
  const subject = top ? subjectById.get(top.subjectId) : undefined;
  const chapter = subject ? pickFocusChapter(chapters, subject.id, date) : null;
  const due = dueRevisions(chapters, date);
  const revisionChapter = due[0] ?? chapters
    .filter((c) => c.mastery >= 1)
    .sort((a, b) => (a.lastRevisionDate ?? '').localeCompare(b.lastRevisionDate ?? ''))[0] ?? null;

  const drafts: Array<{ type: TaskType; minutes: number; chapterId: string | null; title: string; reason: string }> = [];
  if (subject) {
    drafts.push({
      type: 'REVISION',
      minutes: 15,
      chapterId: chapter?.id ?? null,
      title: buildTitle('REVISION', subject, chapter),
      reason: 'Priority concept — recall what you already know',
    });
    drafts.push({
      type: 'TD',
      minutes: 20,
      chapterId: chapter?.id ?? null,
      title: buildTitle('TD', subject, chapter),
      reason: 'One exercise block only',
    });
  }
  if (revisionChapter) {
    const revSubject = subjectById.get(revisionChapter.subjectId);
    if (revSubject) {
      drafts.push({
        type: 'REVISION',
        minutes: 15,
        chapterId: revisionChapter.id,
        title: buildTitle('REVISION', revSubject, revisionChapter),
        reason: 'Scheduled review due — protects the revision cycle',
      });
    }
  }
  if (subject && drafts.length < 4) {
    drafts.push({
      type: 'MEMORY',
      minutes: 10,
      chapterId: chapter?.id ?? null,
      title: buildTitle('MEMORY', subject, chapter),
      reason: 'Definitions & formulas — cheap, high-value retention',
    });
  }

  const capped = drafts.slice(0, 4);
  let remaining = Math.max(15, args.usableMin);
  const tasks: PlannedTaskDraft[] = [];
  let windowIndex = 0;
  let cursor = args.windows.length > 0 ? args.windows[0].startMin : 9 * 60;
  capped.forEach((draft, index) => {
    const minutes = Math.min(draft.minutes, remaining);
    if (minutes < 10) return;
    remaining -= minutes;
    let suggestedStart: string | null = null;
    if (args.windows.length > 0) {
      if (windowIndex < args.windows.length && cursor + minutes <= args.windows[windowIndex].endMin) {
        suggestedStart = minutesToTime(cursor);
        cursor += minutes + 5;
      } else {
        windowIndex += 1;
        if (windowIndex < args.windows.length) {
          cursor = args.windows[windowIndex].startMin;
          suggestedStart = minutesToTime(cursor);
          cursor += minutes + 5;
        }
      }
    }
    tasks.push({
      key: stableId('task', date, draft.chapterId, draft.type, index, 'min'),
      subjectId: draft.chapterId
        ? chapters.find((c) => c.id === draft.chapterId)?.subjectId ?? null
        : subject?.id ?? null,
      chapterId: draft.chapterId,
      type: draft.type,
      title: draft.title,
      plannedMin: minutes,
      priority: top?.normalized ?? 50,
      priorityLabel: priorityLabel(top?.normalized ?? 50),
      reasons: [draft.reason, ...(top?.reasons.slice(0, 1) ?? [])],
      difficultyHint: 'easy',
      origin: 'minimum-day' as StudyTask['origin'],
      suggestedStart,
      note: 'Minimum viable day — continuity over volume.',
    });
  });

  const plannedMin = tasks.reduce((acc, t) => acc + t.plannedMin, 0);
  return {
    date,
    mode: 'minimum-viable',
    availableMin: args.availableMin,
    bufferMin: args.bufferMin,
    plannedMin,
    tasks,
    allocation: subject
      ? [
          {
            subjectId: subject.id,
            minutes: plannedMin,
            priority: top?.normalized ?? 0,
            reasons: top?.reasons ?? [],
          },
        ]
      : [],
    rationale: `Minimum viable day: ${plannedMin} min focused on the priority concept, one recall pass, one exercise and one scheduled review. The goal today is continuity, not coverage.`,
    notes: dedupe([
      ...args.notes,
      'Minimum viable day — the full plan is replaced, never stacked on top of a short day.',
    ]),
    freeWindows: args.windows,
  };
}

function buildRationale(args: {
  mode: string;
  plannedMin: number;
  bufferMin: number;
  availableMin: number;
  tasks: PlannedTaskDraft[];
  notes: string[];
  nowIso: string;
}): string {
  const { mode, plannedMin, bufferMin, availableMin, tasks } = args;
  const subjects = new Set(tasks.map((t) => t.subjectId).filter(Boolean)).size;
  const head =
    mode === 'exam'
      ? 'Exam mode'
      : mode === 'recovery'
        ? 'Recovery mode'
        : mode === 'minimum-viable'
          ? 'Minimum viable day'
          : 'Standard day';
  return `${head}: ${tasks.length} block(s) across ${subjects} subject(s), ${formatDurationShort(
    plannedMin,
  )} planned out of ${formatDurationShort(availableMin)} available, with ${formatDurationShort(
    bufferMin,
  )} reserved as buffer.`;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter((v) => v.length > 0))];
}
