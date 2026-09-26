/**
 * Weekly review — Progress Intelligence (Phase 3).
 *
 * Generates a deterministic weekly summary from stored records.
 * No fake AI, no external calls: every sentence is built from measured
 * numbers and states its evidence.
 *
 * A week is Monday → Sunday (academic convention). The review can be
 * generated for any week, past or current.
 */

import type {
  BacklogItem,
  Chapter,
  CheckIn,
  DailyReview,
  Mistake,
  StudySession,
  StudyTask,
  Subject,
} from '../types';
import type { ISODate } from '../date';
import { addDays, daysBetween, startOfWeek, endOfWeek } from '../date';
import { effectiveMinutes, pct, sum } from './common';

export interface WeeklySubjectBreakdown {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  plannedMin: number;
  actualMin: number;
  effectiveMin: number;
  completionRate: number;
  tasksDone: number;
  tasksTotal: number;
  share: number; // % of week effective
}

export interface WeeklyHighlight {
  id: string;
  kind: 'success' | 'improvement' | 'streak' | 'mastery' | 'consistency';
  text: string;
  evidence: string;
}

export interface WeeklyBlocker {
  id: string;
  kind: 'skipped' | 'overload' | 'backlog' | 'low-completion' | 'no-recall' | 'interruption';
  text: string;
  evidence: string;
  subjectId?: string;
}

export interface WeeklyRecommendation {
  id: string;
  text: string;
  reason: string;
  evidence: string;
  priority: number;
  actionLabel: string;
  subjectId?: string;
}

export interface WeeklyStats {
  plannedMin: number;
  completedMin: number;
  effectiveMin: number;
  completionRate: number;
  activeDays: number;
  plannedDays: number;
  totalTasks: number;
  doneTasks: number;
  skippedTasks: number;
  avgDailyMin: number;
  bestDay: { date: ISODate; minutes: number } | null;
  weakestDay: { date: ISODate; minutes: number } | null;
  backlogDelta: number;
  mistakeCount: number;
  revisionCount: number;
  focusSessions: number;
  avgInterruptions: number;
}

export interface WeeklyReview {
  weekStart: ISODate;
  weekEnd: ISODate;
  label: string;
  generatedAt: string;
  stats: WeeklyStats;
  subjectBreakdown: WeeklySubjectBreakdown[];
  highlights: WeeklyHighlight[];
  blockers: WeeklyBlocker[];
  recommendations: WeeklyRecommendation[];
  nextWeekFocus: {
    subjects: Array<{ subjectId: string; reason: string }>;
    chapters: Array<{ chapterId: string; reason: string }>;
    habits: string[];
  };
  evidence: {
    sampleSize: number;
    insufficientData: boolean;
    sentence: string;
  };
}

export interface GenerateWeeklyReviewInput {
  weekStart: ISODate; // Monday
  today: ISODate;
  tasks: StudyTask[];
  sessions: StudySession[];
  subjects: Subject[];
  chapters: Chapter[];
  mistakes: Mistake[];
  reviews: DailyReview[];
  backlog: BacklogItem[];
  checkIns: CheckIn[];
}

function mondayOf(date: ISODate): ISODate {
  return startOfWeek(date);
}

export function generateWeeklyReview(input: GenerateWeeklyReviewInput): WeeklyReview {
  let weekStart = input.weekStart;
  // ensure Monday
  weekStart = mondayOf(weekStart);
  const weekEnd = endOfWeek(weekStart);
  const label = `${weekStart} → ${weekEnd}`;

  const weekTasks = input.tasks.filter((t) => t.planDate >= weekStart && t.planDate <= weekEnd);
  const weekSessions = input.sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd);
  const weekMistakes = input.mistakes.filter((m) => m.date >= weekStart && m.date <= weekEnd);
  const weekReviews = input.reviews.filter((r) => r.date >= weekStart && r.date <= weekEnd);
  const weekCheckIns = input.checkIns.filter((c) => c.date >= weekStart && c.date <= weekEnd);

  const totalTasks = weekTasks.filter((t) => t.status !== 'deferred').length;
  const doneTasks = weekTasks.filter((t) => t.status === 'done').length;
  const skippedTasks = weekTasks.filter((t) => t.status === 'skipped').length;
  const decided = doneTasks + skippedTasks;
  const completionRate = decided === 0 ? 0 : pct(doneTasks, decided);

  const plannedMin = sum(weekTasks.map((t) => t.plannedMin));
  const completedMin = sum(weekTasks.filter((t) => t.status === 'done').map((t) => t.actualMin));
  const effectiveMin = sum(weekSessions.map((s) => effectiveMinutes(s)));

  // per-day aggregation for active/planned
  const days: Array<{ date: ISODate; planned: number; effective: number; active: boolean; hadPlan: boolean }> = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dayTasks = weekTasks.filter((t) => t.planDate === date);
    const daySessions = weekSessions.filter((s) => s.date === date);
    const dayPlanned = sum(dayTasks.map((t) => t.plannedMin));
    const dayEffective = sum(daySessions.map((s) => effectiveMinutes(s)));
    const dayDone = dayTasks.filter((t) => t.status === 'done').length;
    const active = dayDone > 0 || dayEffective >= 20;
    const hadPlan = dayTasks.length > 0;
    days.push({ date, planned: dayPlanned, effective: dayEffective, active, hadPlan });
  }

  const activeDays = days.filter((d) => d.active).length;
  const plannedDays = days.filter((d) => d.hadPlan).length;
  const avgDailyMin = activeDays === 0 ? 0 : Math.round(effectiveMin / activeDays);
  const bestDay = days.filter((d) => d.effective > 0).sort((a, b) => b.effective - a.effective)[0] ?? null;
  const weakestDay = days.filter((d) => d.hadPlan).sort((a, b) => a.effective - b.effective)[0] ?? null;

  const backlogDelta = sum(weekReviews.map((r) => r.backlogDeltaMin));
  const mistakeCount = weekMistakes.length;
  const revisionCount = weekSessions.filter((s) => s.activeRecall).length;
  const focusSessions = weekSessions.filter((s) => s.mode === 'focus').length;
  const avgInterruptions =
    weekSessions.length === 0 ? 0 : Math.round((sum(weekSessions.map((s) => s.interruptions)) / weekSessions.length) * 10) / 10;

  // subject breakdown
  const totalEffective = effectiveMin;
  const subjectBreakdown: WeeklySubjectBreakdown[] = input.subjects
    .filter((s) => s.active)
    .map((subject) => {
      const subjTasks = weekTasks.filter((t) => t.subjectId === subject.id);
      const subjSessions = weekSessions.filter((s) => s.subjectId === subject.id);
      const subjPlanned = sum(subjTasks.map((t) => t.plannedMin));
      const subjActual = sum(subjTasks.filter((t) => t.status === 'done').map((t) => t.actualMin));
      const subjEffective = sum(subjSessions.map((s) => effectiveMinutes(s)));
      const subjDone = subjTasks.filter((t) => t.status === 'done').length;
      const subjTotal = subjTasks.filter((t) => t.status !== 'deferred').length;
      const subjDecided = subjDone + subjTasks.filter((t) => t.status === 'skipped').length;
      const subjCompletion = subjDecided === 0 ? 0 : pct(subjDone, subjDecided);
      const share = totalEffective === 0 ? 0 : Math.round((subjEffective / totalEffective) * 1000) / 10;
      return {
        subjectId: subject.id,
        name: subject.name,
        shortName: subject.shortName,
        color: subject.color,
        plannedMin: subjPlanned,
        actualMin: subjActual,
        effectiveMin: subjEffective,
        completionRate: subjCompletion,
        tasksDone: subjDone,
        tasksTotal: subjTotal,
        share,
      };
    })
    .filter((s) => s.tasksTotal > 0 || s.effectiveMin > 0)
    .sort((a, b) => b.effectiveMin - a.effectiveMin);

  // highlights
  const highlights: WeeklyHighlight[] = [];

  if (completionRate >= 80 && totalTasks >= 3) {
    highlights.push({
      id: 'high-completion',
      kind: 'success',
      text: `High completion: ${completionRate}% of decided tasks done`,
      evidence: `${doneTasks} of ${decided} decided tasks completed over ${activeDays} active day(s)`,
    });
  }

  if (activeDays >= 5) {
    highlights.push({
      id: 'high-active',
      kind: 'consistency',
      text: `${activeDays} active days this week`,
      evidence: `${activeDays} of 7 days reached the activity threshold (≥1 task or ≥20 effective min)`,
    });
  }

  if (bestDay && bestDay.effective >= 90) {
    highlights.push({
      id: 'best-day',
      kind: 'success',
      text: `Strongest day ${bestDay.date} with ${bestDay.effective} effective minutes`,
      evidence: `Best day ${bestDay.date}, weakest ${weakestDay?.date ?? 'n/a'}`,
    });
  }

  if (revisionCount >= 3) {
    highlights.push({
      id: 'revision',
      kind: 'consistency',
      text: `${revisionCount} active-recall sessions this week`,
      evidence: `${revisionCount} recall session(s) logged, ${focusSessions} focus session(s) total`,
    });
  }

  if (subjectBreakdown.length >= 2) {
    const top = subjectBreakdown[0];
    if (top.completionRate >= 80) {
      highlights.push({
        id: `subject-${top.subjectId}`,
        kind: 'success',
        text: `${top.shortName} was your strongest subject (${top.completionRate}% completion)`,
        evidence: `${top.tasksDone}/${top.tasksTotal} tasks, ${top.effectiveMin} effective min (${top.share}% of week)`,
      });
    }
  }

  // compare with previous week if available
  const prevWeekStart = addDays(weekStart, -7);
  const prevWeekEnd = addDays(weekStart, -1);
  const prevTasks = input.tasks.filter((t) => t.planDate >= prevWeekStart && t.planDate <= prevWeekEnd && t.status === 'done');
  const prevEffective = sum(
    input.sessions.filter((s) => s.date >= prevWeekStart && s.date <= prevWeekEnd).map((s) => effectiveMinutes(s)),
  );
  if (prevTasks.length >= 2 && effectiveMin > prevEffective) {
    const delta = prevEffective === 0 ? 100 : Math.round(((effectiveMin - prevEffective) / prevEffective) * 100);
    if (delta >= 15) {
      highlights.push({
        id: 'improvement',
        kind: 'improvement',
        text: `Effective time up ${delta}% vs previous week`,
        evidence: `${effectiveMin} min now vs ${prevEffective} min previous week`,
      });
    }
  }

  // blockers
  const blockers: WeeklyBlocker[] = [];

  if (skippedTasks >= 3) {
    blockers.push({
      id: 'skipped-many',
      kind: 'skipped',
      text: `${skippedTasks} tasks skipped this week`,
      evidence: `${skippedTasks} skipped of ${totalTasks} total, completion ${completionRate}%`,
    });
  }

  if (completionRate > 0 && completionRate < 50 && totalTasks >= 4) {
    blockers.push({
      id: 'low-completion',
      kind: 'low-completion',
      text: `Low completion: ${completionRate}%`,
      evidence: `${doneTasks} done, ${skippedTasks} skipped, ${totalTasks} total planned`,
    });
  }

  if (backlogDelta > 60) {
    blockers.push({
      id: 'backlog-growing',
      kind: 'backlog',
      text: `Backlog grew by ${backlogDelta} minutes`,
      evidence: `Daily reviews report +${backlogDelta} min backlog delta this week`,
    });
  }

  if (revisionCount === 0 && activeDays >= 3) {
    blockers.push({
      id: 'no-recall',
      kind: 'no-recall',
      text: 'No active-recall sessions logged',
      evidence: `${activeDays} active days but 0 recall sessions — spaced review cycle may be breaking`,
    });
  }

  if (avgInterruptions >= 2 && weekSessions.length >= 3) {
    blockers.push({
      id: 'interruptions',
      kind: 'interruption',
      text: `High interruptions: avg ${avgInterruptions} per session`,
      evidence: `${sum(weekSessions.map((s) => s.interruptions))} total interruptions over ${weekSessions.length} session(s)`,
    });
  }

  for (const subj of subjectBreakdown) {
    if (subj.completionRate < 50 && subj.tasksTotal >= 3) {
      blockers.push({
        id: `subj-low-${subj.subjectId}`,
        kind: 'low-completion',
        text: `${subj.shortName} low completion: ${subj.completionRate}%`,
        evidence: `${subj.tasksDone}/${subj.tasksTotal} tasks done, ${subj.effectiveMin} effective min`,
        subjectId: subj.subjectId,
      });
    }
  }

  // recommendations
  const recommendations: WeeklyRecommendation[] = [];

  if (completionRate < 60 && plannedMin > 0) {
    recommendations.push({
      id: 'reduce-scope',
      text: 'Reduce next week’s daily scope by 20%',
      reason: 'Completion below 60% suggests overload — smaller plans improve adherence',
      evidence: `${completionRate}% completion, ${plannedMin} min planned, ${completedMin} min completed`,
      priority: 90,
      actionLabel: 'Adjust rules',
    });
  }

  if (skippedTasks >= 2) {
    // find most skipped subject
    const skippedBySubject = new Map<string, number>();
    for (const t of weekTasks.filter((t) => t.status === 'skipped' && t.subjectId)) {
      skippedBySubject.set(t.subjectId as string, (skippedBySubject.get(t.subjectId as string) ?? 0) + 1);
    }
    const mostSkipped = [...skippedBySubject.entries()].sort((a, b) => b[1] - a[1])[0];
    if (mostSkipped) {
      const subj = input.subjects.find((s) => s.id === mostSkipped[0]);
      recommendations.push({
        id: 'anti-procrastination',
        text: `${subj?.shortName ?? 'A subject'} was skipped ${mostSkipped[1]} times — use 10-min start blocks`,
        reason: 'Repeated skips indicate initiation barrier — shrinking the first block removes it',
        evidence: `${mostSkipped[1]} skip(s) for ${subj?.shortName ?? mostSkipped[0]} this week`,
        priority: 85,
        actionLabel: '10-min start',
        subjectId: mostSkipped[0],
      });
    }
  }

  if (backlogDelta > 30) {
    recommendations.push({
      id: 'recovery',
      text: `Schedule recovery: ${backlogDelta} min overdue`,
      reason: 'Backlog growing — recovery plan spreads it over realistic horizon',
      evidence: `Backlog delta +${backlogDelta} min this week, ${input.backlog.filter((b) => b.state === 'open').length} open item(s)`,
      priority: 80,
      actionLabel: 'Recovery center',
    });
  }

  if (revisionCount === 0) {
    recommendations.push({
      id: 'add-recall',
      text: 'Add 2 active-recall blocks next week',
      reason: 'No recall logged — retention decays without retrieval practice',
      evidence: `0 recall sessions over ${activeDays} active day(s)`,
      priority: 75,
      actionLabel: 'Schedule recall',
    });
  }

  if (avgInterruptions >= 2) {
    recommendations.push({
      id: 'reduce-interruptions',
      text: 'Reduce interruptions — try 25-min focus blocks',
      reason: 'High interruption rate lowers effective time',
      evidence: `Avg ${avgInterruptions} interruptions per session over ${weekSessions.length} session(s)`,
      priority: 60,
      actionLabel: 'Focus timer',
    });
  }

  // next week focus
  const neglectedSubjects = subjectBreakdown
    .filter((s) => s.completionRate < 60)
    .map((s) => ({ subjectId: s.subjectId, reason: `Completion ${s.completionRate}% this week` }));

  const weakChapters = input.chapters
    .filter((c) => {
      const chTasks = weekTasks.filter((t) => t.chapterId === c.id);
      const chDone = chTasks.filter((t) => t.status === 'done').length;
      const chSkipped = chTasks.filter((t) => t.status === 'skipped').length;
      return chDone === 0 && chSkipped > 0;
    })
    .slice(0, 3)
    .map((c) => ({ chapterId: c.id, reason: 'Skipped this week — needs re-engagement' }));

  const habits: string[] = [];
  if (revisionCount < 2) habits.push('Active recall — 15 min closed-book per day');
  if (activeDays < 4) habits.push('Daily continuity — at least 1 task per day');
  if (avgInterruptions >= 1.5) habits.push('Focus — phone away, 25-min timer');
  if (weekCheckIns.length < 3) habits.push('Check-in — log available time and energy daily');

  recommendations.sort((a, b) => b.priority - a.priority);

  const sampleSize = totalTasks + weekSessions.length;
  const insufficientData = sampleSize < 3;

  return {
    weekStart,
    weekEnd,
    label,
    generatedAt: new Date().toISOString(),
    stats: {
      plannedMin,
      completedMin,
      effectiveMin,
      completionRate,
      activeDays,
      plannedDays,
      totalTasks,
      doneTasks,
      skippedTasks,
      avgDailyMin,
      bestDay: bestDay ? { date: bestDay.date, minutes: bestDay.effective } : null,
      weakestDay: weakestDay ? { date: weakestDay.date, minutes: weakestDay.effective } : null,
      backlogDelta,
      mistakeCount,
      revisionCount,
      focusSessions,
      avgInterruptions,
    },
    subjectBreakdown,
    highlights,
    blockers,
    recommendations,
    nextWeekFocus: {
      subjects: neglectedSubjects,
      chapters: weakChapters,
      habits,
    },
    evidence: {
      sampleSize,
      insufficientData,
      sentence: insufficientData
        ? `Only ${sampleSize} data point(s) this week — weekly review needs at least 3 tasks or sessions`
        : `Based on ${totalTasks} task(s), ${weekSessions.length} session(s), ${weekMistakes.length} mistake(s) over ${weekStart}→${weekEnd}`,
    },
  };
}

export function generateLastNWeeklyReviews(input: Omit<GenerateWeeklyReviewInput, 'weekStart'> & { n: number }): WeeklyReview[] {
  const reviews: WeeklyReview[] = [];
  let cursor = mondayOf(input.today);
  for (let i = 0; i < input.n; i++) {
    const weekStart = addDays(cursor, -i * 7);
    if (daysBetween(weekStart, input.today) > 365) break;
    reviews.push(
      generateWeeklyReview({
        ...input,
        weekStart,
        today: input.today,
      }),
    );
  }
  return reviews;
}

export function getCurrentWeeklyReview(input: Omit<GenerateWeeklyReviewInput, 'weekStart'>): WeeklyReview {
  return generateWeeklyReview({
    ...input,
    weekStart: mondayOf(input.today),
    today: input.today,
  });
}
