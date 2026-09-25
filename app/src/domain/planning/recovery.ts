/**
 * SMART RECOVERY GENERATOR — `generateRecoveryPlan()` (spec §9, §10, §11, §30, §38).
 *
 * Design rules that the code below enforces:
 *  - Missing a day never pushes everything to tomorrow and never doubles a day's workload.
 *  - Missed work is classified by urgency, academic weight, dependency, deadline and mastery impact.
 *  - High-value work is protected, mid-value work is distributed across several days, low-value work is
 *    deferred — and after a long interruption it is deliberately archived instead of "recovered".
 *  - The configured daily maximum, the buffer ratio and rest days are hard limits.
 */

import type {
  BacklogItem,
  Chapter,
  Exam,
  MasteryLevel,
  RecoveryDayPlan,
  RecoveryMode,
  RecoveryPlan,
  StudyTask,
} from '../types';
import { addDays, clamp, daysBetween, dayOfWeek, formatDurationShort, type ISODate } from '../date';
import type { RecoveryInput } from './types';

export const RECOVERY_MODE_LABELS: Record<RecoveryMode, string> = {
  A: 'Mode A — normal recovery',
  B: 'Mode B — controlled backlog reduction',
  C: 'Mode C — emergency catch-up',
  D: 'Mode D — reset and rebuild',
};

export interface BacklogClassification {
  item: BacklogItem;
  score: number;
  classification: BacklogItem['classification'];
  reasons: string[];
  daysOverdue: number;
}

export function recoveryModeForMissedDays(missedDays: number): RecoveryMode {
  if (missedDays <= 1) return 'A';
  if (missedDays <= 3) return 'B';
  if (missedDays <= 7) return 'C';
  return 'D';
}

/** How many chapters (transitively) depend on this one — prerequisite depth matters in recovery. */
export function dependencyDepth(chapterId: string | null, chapters: Chapter[]): number {
  if (!chapterId) return 0;
  const direct = chapters.filter((c) => c.prerequisiteIds.includes(chapterId));
  const seen = new Set<string>(direct.map((c) => c.id));
  let depth = direct.length;
  const queue = [...direct];
  while (queue.length > 0) {
    const current = queue.shift() as Chapter;
    for (const child of chapters.filter((c) => c.prerequisiteIds.includes(current.id))) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      depth += 1;
      queue.push(child);
    }
  }
  return depth;
}

export function classifyMissedWork(input: RecoveryInput): BacklogClassification[] {
  const { date, backlog, subjects, chapters, exams } = input;
  const maxCoef = Math.max(...subjects.map((s) => s.coefficient ?? 2), 1);

  return backlog
    .filter((item) => item.state === 'open' || item.state === 'scheduled')
    .map((item) => {
      const reasons: string[] = [];
      const subject = subjects.find((s) => s.id === item.subjectId);
      const chapter = item.chapterId ? chapters.find((c) => c.id === item.chapterId) ?? null : null;
      const daysOverdue = Math.max(0, daysBetween(item.originalDate, date));

      const weight = clamp((subject?.coefficient ?? 2) / maxCoef, 0.2, 1);
      if ((subject?.coefficient ?? 0) >= 3) reasons.push(`High coefficient (${subject?.coefficient})`);

      const urgency = clamp(daysOverdue / 7, 0, 1);
      if (daysOverdue >= 2) reasons.push(`${daysOverdue} days overdue`);

      const subjectExams = exams
        .filter((e: Exam) => e.subjectId === item.subjectId && e.date >= date)
        .sort((a, b) => a.date.localeCompare(b.date));
      const nearestExam = subjectExams[0];
      const daysToExam = nearestExam ? daysBetween(date, nearestExam.date) : null;
      const deadline = daysToExam !== null ? clamp(1 - daysToExam / 14, 0, 1) : 0;
      if (daysToExam !== null && daysToExam <= 14) reasons.push(`Assessment in ${daysToExam} day(s)`);

      const mastery: MasteryLevel = chapter?.mastery ?? 0;
      const masteryImpact = clamp((5 - mastery) / 5, 0, 1);
      if (chapter && mastery <= 2) reasons.push('Chapter not secured yet');

      const depth = dependencyDepth(item.chapterId, chapters);
      const dependency = clamp(depth / 4, 0, 1);
      if (depth >= 2) reasons.push(`Prerequisite for ${depth} later chapters`);

      const score =
        0.25 * weight +
        0.2 * urgency +
        0.2 * deadline +
        0.2 * masteryImpact +
        0.15 * dependency;

      let classification: BacklogItem['classification'];
      if (score >= 0.62) classification = 'protect';
      else if (score >= 0.35) classification = 'distribute';
      else if (score >= 0.18) classification = 'defer';
      else classification = input.missedDays >= 4 ? 'drop' : 'defer';

      return {
        item: { ...item, score: Math.round(score * 1000) / 1000, classification },
        score: Math.round(score * 1000) / 1000,
        classification,
        reasons: reasons.length > 0 ? reasons : ['Low impact relative to current load'],
        daysOverdue,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** Recovery minutes that may be added to a day, by mode. Never exceeds the configured daily maximum. */
export function dailyRecoveryBudget(mode: RecoveryMode, input: RecoveryInput): number {
  const maxDaily = input.rules.maxDailyMin;
  const todayCapacity = Math.max(0, input.todayCapacityMin);
  switch (mode) {
    case 'A':
      return Math.round(Math.min(todayCapacity > 0 ? todayCapacity : maxDaily * 0.35, 90));
    case 'B':
      return Math.round(Math.min(maxDaily * 0.45, 120));
    case 'C':
      return Math.round(Math.min(maxDaily * 0.4, 150));
    case 'D':
    default:
      return Math.round(Math.min(maxDaily * 0.35, 120));
  }
}

function horizonFor(preset: RecoveryInput['preset'], mode: RecoveryMode): number {
  switch (preset) {
    case 'today':
      return 1;
    case '3d':
      return 3;
    case '7d':
      return 7;
    case 'rebuild':
      return 14;
    default:
      return mode === 'A' ? 3 : mode === 'B' ? 5 : mode === 'C' ? 7 : 10;
  }
}

export function generateRecoveryPlan(input: RecoveryInput): RecoveryPlan {
  const mode: RecoveryMode =
    input.preset === 'rebuild' ? 'D' : recoveryModeForMissedDays(input.missedDays);
  const classifications = classifyMissedWork(input);
  const warnings: string[] = [];

  const overdueMin = classifications.reduce((acc, c) => acc + c.item.minutes, 0);

  // MODE D archives long-dead work that is NOT in the protected triage set (high coefficient, near
  // deadline, weak topic or prerequisite). Rebuilding the routine beats restarting an ancient queue.
  // Archived items are kept in storage and can be restored — nothing is deleted.
  const droppable = classifications.filter(
    (c) =>
      mode === 'D' &&
      c.daysOverdue >= 14 &&
      c.score < 0.5 &&
      c.item.type !== 'REVISION',
  );
  const active = classifications.filter((c) => !droppable.includes(c));
  const droppedItems = droppable.map((c) => c.item);
  const droppedMin = droppedItems.reduce((acc, i) => acc + i.minutes, 0);

  const budget = dailyRecoveryBudget(mode, input);
  const horizonDays = horizonFor(input.preset, mode);
  // Progressive recovery: the deeper the interruption, the larger the share of the recovery budget that
  // stays free for the *normal* routine. A long absence is never answered by saturating every day.
  const capacityFraction = mode === 'A' ? 1 : mode === 'B' ? 0.9 : mode === 'C' ? 0.75 : 0.6;
  const capacity = Math.round(budget * horizonDays * capacityFraction);

  // Protect first, then distribute; the remainder is deferred (nothing is silently dropped).
  const protectedItems: BacklogItem[] = [];
  const distributedItems: BacklogItem[] = [];
  let consumed = 0;
  for (const entry of active) {
    if (consumed + entry.item.minutes <= capacity) {
      consumed += entry.item.minutes;
      if (entry.classification === 'protect') protectedItems.push(entry.item);
      else distributedItems.push(entry.item);
    }
  }
  const recoverable = [...protectedItems, ...distributedItems];
  const recoverableMin = recoverable.reduce((acc, i) => acc + i.minutes, 0);
  const deferredItems = active
    .filter((c) => !recoverable.includes(c.item))
    .map((c) => c.item);
  const deferMin = deferredItems.reduce((acc, i) => acc + i.minutes, 0);

  // Distribution across days, in score order, respecting each day's budget and rest days.
  const days: RecoveryDayPlan[] = [];
  let cursor = 0;
  const queue = [...recoverable].sort((a, b) => b.score - a.score);
  for (let d = 0; d < horizonDays; d += 1) {
    const dayDate = addDays(input.date, d);
    const isRestDay = input.rules.restDays.includes(dayOfWeek(dayDate));
    const dayBudget = isRestDay ? Math.round(budget * 0.4) : budget;
    const used = new Map<string, { minutes: number; ids: string[] }>();
    let dayTotal = 0;
    while (cursor < queue.length && dayTotal + queue[cursor].minutes <= dayBudget) {
      const item = queue[cursor];
      cursor += 1;
      const entry = used.get(item.subjectId) ?? { minutes: 0, ids: [] };
      entry.minutes += item.minutes;
      entry.ids.push(item.id);
      used.set(item.subjectId, entry);
      dayTotal += item.minutes;
    }
    days.push({
      date: dayDate,
      additions: [...used.entries()].map(([subjectId, v]) => ({
        subjectId,
        minutes: v.minutes,
        backlogItemIds: v.ids,
      })),
      totalMin: dayTotal,
    });
  }

  if (deferMin > 0) {
    warnings.push(
      `${formatDurationShort(deferMin)} cannot be recovered inside ${horizonDays} day(s) at ${formatDurationShort(
        budget,
      )}/day — it stays in the backlog instead of being stacked onto your days.`,
    );
  }
  if (days[0] && days[0].totalMin > input.todayCapacityMin && input.todayCapacityMin > 0) {
    warnings.push(
      `Today's recovery (${formatDurationShort(days[0].totalMin)}) exceeds the time you declared for today (${formatDurationShort(
        input.todayCapacityMin,
      )}) — shift it or extend the horizon.`,
    );
  }
  if (mode === 'C' || mode === 'D') {
    warnings.push(
      'Long interruption: do not try to recover every missed hour. Prerequisites, high-coefficient subjects, near deadlines and weak topics come first; the rest is archived or deferred.',
    );
  }

  const rationale = buildRecoveryRationale(mode, input, {
    overdueMin,
    recoverableMin,
    deferMin,
    droppedMin,
    horizonDays,
    protectedCount: protectedItems.length,
  });

  return {
    mode,
    missedDays: input.missedDays,
    overdueMin,
    recoverableMin,
    deferMin,
    droppedMin,
    horizonDays,
    days,
    protectedItems,
    deferredItems,
    droppedItems,
    rationale,
    warnings,
  };
}

function buildRecoveryRationale(
  mode: RecoveryMode,
  input: RecoveryInput,
  totals: {
    overdueMin: number;
    recoverableMin: number;
    deferMin: number;
    droppedMin: number;
    horizonDays: number;
    protectedCount: number;
  },
): string {
  const { overdueMin, recoverableMin, deferMin, droppedMin, horizonDays, protectedCount } = totals;
  const modeSentence = {
    A: 'One day missed: the plan is recalculated, not shifted.',
    B: 'A few days missed: controlled backlog reduction — mid-value work is spread out.',
    C: 'A week-scale interruption: emergency catch-up on prerequisites, high-weight subjects and near deadlines.',
    D: 'Long interruption: reset and rebuild. Old low-impact work is archived instead of punished.',
  }[mode];
  const parts = [
    modeSentence,
    `${formatDurationShort(overdueMin)} of missed work detected across ${input.backlog.length} item(s).`,
    `${protectedCount} protected item(s), ${formatDurationShort(recoverableMin)} distributed over ${horizonDays} day(s).`,
  ];
  if (deferMin > 0) parts.push(`${formatDurationShort(deferMin)} deferred (kept, not deleted).`);
  if (droppedMin > 0) parts.push(`${formatDurationShort(droppedMin)} archived to rebuild a sustainable routine.`);
  return parts.join(' ');
}

/** Backlog trend helper for the recovery centre ("catching up" / "stable" / "growing"). */
export function backlogTrend(
  items: BacklogItem[],
  date: ISODate,
): { openMin: number; addedLast7d: number; recoveredLast7d: number; trend: 'shrinking' | 'stable' | 'growing' } {
  const open = items.filter((i) => i.state === 'open' || i.state === 'scheduled');
  const openMin = open.reduce((acc, i) => acc + i.minutes, 0);
  const addedLast7d = items
    .filter((i) => daysBetween(i.originalDate, date) <= 7)
    .reduce((acc, i) => acc + i.minutes, 0);
  const recoveredLast7d = items
    .filter((i) => i.state === 'recovered' && daysBetween(i.originalDate, date) <= 7)
    .reduce((acc, i) => acc + i.minutes, 0);
  const trend = recoveredLast7d > addedLast7d ? 'shrinking' : addedLast7d > recoveredLast7d * 1.2 ? 'growing' : 'stable';
  return { openMin, addedLast7d, recoveredLast7d, trend };
}

/** Builds backlog items from missed tasks (called by the app when a day passes unfinished). */
export function backlogFromTasks(tasks: StudyTask[], date: ISODate): BacklogItem[] {
  return tasks
    .filter(
      (t) =>
        t.planDate < date &&
        (t.status === 'pending' || t.status === 'skipped' || t.status === 'rescheduled' || t.status === 'paused'),
    )
    .map((t) => ({
      id: `bl-${t.id}`,
      taskId: t.id,
      subjectId: t.subjectId ?? 'sub-unknown',
      chapterId: t.chapterId,
      originalDate: t.planDate,
      minutes: t.plannedMin,
      type: t.type,
      title: t.title,
      urgency: 0,
      weight: 0,
      dependencyDepth: 0,
      masteryImpact: 0,
      score: 0,
      classification: 'distribute' as const,
      state: 'open' as const,
      plannedFor: null,
      createdAt: t.createdAt,
    }));
}

export { formatDurationShort };
