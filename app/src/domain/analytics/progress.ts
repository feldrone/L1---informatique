/**
 * Progress, distribution and period statistics (spec add-on §2, §3, §6, §11 and base §14).
 * Every number is derived from stored tasks/sessions; nothing is estimated or fabricated.
 */

import type { StudySession, StudyTask, Subject, UserRules } from '../types';
import { addDays, daysBetween, type ISODate, WEEKDAY_SHORT } from '../date';
import { effectiveMinutes, mean, pct, sum, type DayAggregate } from './common';
import { computeConsistency, computeStreaks, type ConsistencyResult, type StreakSummary } from './streaks';

export interface TodayProgress {
  date: ISODate;
  plannedMin: number;
  completedMin: number;
  effectiveMin: number;
  percent: number;
  tasksDone: number;
  tasksTotal: number;
  tasksSkipped: number;
  tasksPending: number;
  remainingMin: number;
}

export function computeTodayProgress(params: {
  date: ISODate;
  tasks: StudyTask[];
  sessions: StudySession[];
}): TodayProgress {
  const tasks = params.tasks.filter((t) => t.planDate === params.date);
  const sessions = params.sessions.filter((s) => s.date === params.date);
  const plannedMin = tasks.reduce((acc, t) => acc + (t.status === 'deferred' ? 0 : t.plannedMin), 0);
  const done = tasks.filter((t) => t.status === 'done');
  const completedMin = done.reduce((acc, t) => acc + t.actualMin, 0);
  const effective = sessions.reduce((acc, s) => acc + effectiveMinutes(s), 0);
  const denominator = Math.max(plannedMin, completedMin);
  return {
    date: params.date,
    plannedMin,
    completedMin,
    effectiveMin: effective,
    percent: denominator === 0 ? 0 : Math.round((completedMin / denominator) * 100),
    tasksDone: done.length,
    tasksTotal: tasks.filter((t) => t.status !== 'deferred').length,
    tasksSkipped: tasks.filter((t) => t.status === 'skipped').length,
    tasksPending: tasks.filter((t) => t.status === 'pending' || t.status === 'running' || t.status === 'paused').length,
    remainingMin: Math.max(0, plannedMin - completedMin),
  };
}

export interface SubjectDistributionEntry {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  plannedMin: number;
  actualMin: number;
  effectiveMin: number;
  /** Share of today's actual study time, in percent. */
  share: number;
  completionPercent: number;
  tasksDone: number;
  tasksMissed: number;
  tasksTotal: number;
  priority: number;
}

export function computeSubjectDistribution(params: {
  date: ISODate;
  tasks: StudyTask[];
  sessions: StudySession[];
  subjects: Subject[];
}): SubjectDistributionEntry[] {
  const { date, subjects } = params;
  const tasks = params.tasks.filter((t) => t.planDate === date);
  const sessions = params.sessions.filter((s) => s.date === date);
  const totalActual = sum(
    subjects.map((s) =>
      sum(
        sessions
          .filter((x) => x.subjectId === s.id)
          .map((x) => effectiveMinutes(x)),
      ),
    ),
  );

  return subjects
    .map((subject) => {
      const subjectTasks = tasks.filter((t) => t.subjectId === subject.id);
      const subjectSessions = sessions.filter((s) => s.subjectId === subject.id);
      const plannedMin = subjectTasks.reduce(
        (acc, t) => acc + (t.status === 'deferred' ? 0 : t.plannedMin),
        0,
      );
      const doneTasks = subjectTasks.filter((t) => t.status === 'done');
      const actualMin =
        doneTasks.reduce((acc, t) => acc + t.actualMin, 0) +
        Math.max(
          0,
          sum(subjectSessions.map((s) => s.durationMin)) - doneTasks.reduce((acc, t) => acc + t.actualMin, 0),
        );
      const effective = sum(subjectSessions.map((s) => effectiveMinutes(s)));
      return {
        subjectId: subject.id,
        name: subject.name,
        shortName: subject.shortName,
        color: subject.color,
        plannedMin,
        actualMin,
        effectiveMin: effective,
        share: totalActual === 0 ? 0 : Math.round((effective / totalActual) * 1000) / 10,
        completionPercent: plannedMin === 0 ? (doneTasks.length > 0 ? 100 : 0) : pct(actualMin, plannedMin),
        tasksDone: doneTasks.length,
        tasksMissed: subjectTasks.filter((t) => t.status === 'skipped').length,
        tasksTotal: subjectTasks.filter((t) => t.status !== 'deferred').length,
        priority: 0,
      };
    })
    .filter((entry) => entry.tasksTotal > 0 || entry.effectiveMin > 0)
    .sort((a, b) => b.effectiveMin - a.effectiveMin);
}

// ---------------------------------------------------------------------------
// weekly
// ---------------------------------------------------------------------------

export interface WeeklyDayStat {
  date: ISODate;
  weekday: number;
  label: string;
  plannedMin: number;
  actualMin: number;
  effectiveMin: number;
  completionPercent: number;
  active: boolean;
}

export interface WeeklyStats {
  from: ISODate;
  to: ISODate;
  days: WeeklyDayStat[];
  plannedTotal: number;
  actualTotal: number;
  effectiveTotal: number;
  targetMin: number;
  averageDailyMin: number;
  averageCompletion: number;
  bestDay: WeeklyDayStat | null;
  weakestDay: WeeklyDayStat | null;
  revisionSessions: number;
  exerciseSessions: number;
  activeDays: number;
}

export function computeWeeklyStats(params: {
  days: DayAggregate[];
  from: ISODate;
  to: ISODate;
  rules: UserRules;
  sessions: StudySession[];
}): WeeklyStats {
  const byDate = new Map(params.days.map((d) => [d.date, d]));
  const stats: WeeklyDayStat[] = [];
  const span = daysBetween(params.from, params.to);
  for (let i = 0; i <= span; i += 1) {
    const date = addDays(params.from, i);
    const day = byDate.get(date);
    const plannedMin = day?.plannedMin ?? 0;
    const actualMin = Math.max(day?.completedMin ?? 0, day?.effectiveMin ?? 0);
    stats.push({
      date,
      weekday: new Date(`${date}T12:00:00`).getDay(),
      label: WEEKDAY_SHORT[new Date(`${date}T12:00:00`).getDay()],
      plannedMin,
      actualMin,
      effectiveMin: day?.effectiveMin ?? 0,
      completionPercent: plannedMin === 0 ? 0 : pct(actualMin, plannedMin),
      active: day?.active ?? false,
    });
  }
  const withPlan = stats.filter((d) => d.plannedMin > 0);
  const best = withPlan.length === 0 ? null : withPlan.reduce((a, b) => (b.actualMin > a.actualMin ? b : a));
  const weakest = withPlan.length === 0 ? null : withPlan.reduce((a, b) => (b.actualMin < a.actualMin ? b : a));
  const weekSessions = params.sessions.filter((s) => s.date >= params.from && s.date <= params.to);

  return {
    from: params.from,
    to: params.to,
    days: stats,
    plannedTotal: sum(stats.map((d) => d.plannedMin)),
    actualTotal: sum(stats.map((d) => d.actualMin)),
    effectiveTotal: sum(stats.map((d) => d.effectiveMin)),
    targetMin: params.rules.minWeeklyMin,
    averageDailyMin: Math.round(mean(stats.map((d) => d.actualMin))),
    averageCompletion: Math.round(mean(withPlan.map((d) => d.completionPercent))),
    bestDay: best,
    weakestDay: weakest,
    revisionSessions: weekSessions.filter((s) => s.mode === 'focus' && s.activeRecall).length,
    exerciseSessions: weekSessions.filter((s) => !s.activeRecall && s.mode === 'focus').length,
    activeDays: stats.filter((d) => d.active).length,
  };
}

// ---------------------------------------------------------------------------
// period summary (7 / 30 / 90 / semester / year)
// ---------------------------------------------------------------------------

export interface PeriodSummary {
  from: ISODate;
  to: ISODate;
  label: string;
  totalMin: number;
  effectiveMin: number;
  plannedMin: number;
  averageDailyMin: number;
  completionRate: number;
  activeDays: number;
  plannedDays: number;
  longestStreak: number;
  currentStreak: number;
  subjectDistribution: SubjectDistributionEntry[];
  strongestDay: { label: string; minutes: number } | null;
  weakestDay: { label: string; minutes: number } | null;
  trendPercent: number | null;
  consistency: ConsistencyResult;
  streaks: StreakSummary;
  insufficientData: boolean;
}

export function computePeriodSummary(params: {
  from: ISODate;
  to: ISODate;
  label: string;
  today: ISODate;
  days: DayAggregate[];
  subjects: Subject[];
  tasks: StudyTask[];
  sessions: StudySession[];
  previous?: { from: ISODate; to: ISODate };
}): PeriodSummary {
  const { from, to, subjects, tasks, sessions } = params;
  const window = params.days.filter((d) => d.date >= from && d.date <= to);
  const windowTasks = tasks.filter((t) => t.planDate >= from && t.planDate <= to);
  const windowSessions = sessions.filter((s) => s.date >= from && s.date <= to);

  const totalMin = sum(window.map((d) => Math.max(d.completedMin, d.effectiveMin)));
  const effective = sum(window.map((d) => d.effectiveMin));
  const plannedMin = sum(window.map((d) => d.plannedMin));
  const decided = windowTasks.filter((t) => t.status === 'done' || t.status === 'skipped');
  const doneTasks = decided.filter((t) => t.status === 'done');
  const activeDays = window.filter((d) => d.active).length;
  const plannedDays = window.filter((d) => d.hadPlan).length;

  const streaks = computeStreaks(params.days, params.today);
  const consistency = computeConsistency({ days: params.days, today: to, windowDays: Math.max(7, daysBetween(from, to) + 1) });

  const distribution = buildDistributionForRange({
    from,
    to,
    subjects,
    tasks: windowTasks,
    sessions: windowSessions,
  });

  // strongest / weakest weekday by average minutes
  const byWeekday = new Map<number, number[]>();
  for (const day of window) {
    const wd = new Date(`${day.date}T12:00:00`).getDay();
    const list = byWeekday.get(wd) ?? [];
    list.push(Math.max(day.completedMin, day.effectiveMin));
    byWeekday.set(wd, list);
  }
  const weekdayAverages = [...byWeekday.entries()]
    .map(([wd, values]) => ({ weekday: wd, label: WEEKDAY_SHORT[wd], minutes: Math.round(mean(values)) }))
    .filter((w) => w.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  let trendPercent: number | null = null;
  if (params.previous) {
    const prev = params.days.filter((d) => d.date >= params.previous!.from && d.date <= params.previous!.to);
    const prevAvg = mean(prev.map((d) => Math.max(d.completedMin, d.effectiveMin)));
    const currentAvg = mean(window.map((d) => Math.max(d.completedMin, d.effectiveMin)));
    if (prevAvg > 0) trendPercent = Math.round(((currentAvg - prevAvg) / prevAvg) * 1000) / 10;
  }

  return {
    from,
    to,
    label: params.label,
    totalMin,
    effectiveMin: effective,
    plannedMin,
    averageDailyMin: Math.round(totalMin / Math.max(1, window.length)),
    completionRate: decided.length === 0 ? 0 : pct(doneTasks.length, decided.length),
    activeDays,
    plannedDays,
    longestStreak: streaks.longestStreak,
    currentStreak: streaks.currentStreak,
    subjectDistribution: distribution,
    strongestDay: weekdayAverages.length > 0 ? weekdayAverages[0] : null,
    weakestDay: weekdayAverages.length > 0 ? weekdayAverages[weekdayAverages.length - 1] : null,
    trendPercent,
    consistency,
    streaks,
    insufficientData: activeDays < 3 || plannedDays < 3,
  };
}

export function buildDistributionForRange(params: {
  from: ISODate;
  to: ISODate;
  subjects: Subject[];
  tasks: StudyTask[];
  sessions: StudySession[];
}): SubjectDistributionEntry[] {
  const { subjects, tasks, sessions } = params;
  const totalEffective = sum(sessions.map((s) => effectiveMinutes(s)));
  return subjects
    .map((subject) => {
      const subjectTasks = tasks.filter((t) => t.subjectId === subject.id);
      const subjectSessions = sessions.filter((s) => s.subjectId === subject.id);
      const plannedMin = sum(subjectTasks.map((t) => (t.status === 'deferred' ? 0 : t.plannedMin)));
      const doneTasks = subjectTasks.filter((t) => t.status === 'done');
      const actualMin = sum(doneTasks.map((t) => t.actualMin));
      const effective = sum(subjectSessions.map((s) => effectiveMinutes(s)));
      return {
        subjectId: subject.id,
        name: subject.name,
        shortName: subject.shortName,
        color: subject.color,
        plannedMin,
        actualMin,
        effectiveMin: effective,
        share: totalEffective === 0 ? 0 : Math.round((effective / totalEffective) * 1000) / 10,
        completionPercent: plannedMin === 0 ? (doneTasks.length > 0 ? 100 : 0) : pct(actualMin, plannedMin),
        tasksDone: doneTasks.length,
        tasksMissed: subjectTasks.filter((t) => t.status === 'skipped').length,
        tasksTotal: subjectTasks.filter((t) => t.status !== 'deferred').length,
        priority: 0,
      };
    })
    .filter((entry) => entry.tasksTotal > 0 || entry.effectiveMin > 0)
    .sort((a, b) => b.effectiveMin - a.effectiveMin);
}

export interface SessionTimelineEntry {
  id: string;
  startTime: string;
  endTime: string;
  subjectId: string | null;
  subjectName: string;
  color: string;
  minutes: number;
  type: StudySession['mode'];
  activeRecall: boolean;
  interruptions: number;
  note: string;
}

export function buildSessionTimeline(params: {
  date: ISODate;
  sessions: StudySession[];
  subjects: Subject[];
}): SessionTimelineEntry[] {
  return params.sessions
    .filter((s) => s.date === params.date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((session) => {
      const subject = params.subjects.find((s) => s.id === session.subjectId);
      return {
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        subjectId: session.subjectId,
        subjectName: subject?.shortName ?? 'Unassigned',
        color: subject?.color ?? '#64748b',
        minutes: session.durationMin,
        type: session.mode,
        activeRecall: session.activeRecall,
        interruptions: session.interruptions,
        note: session.note,
      };
    });
}

export { computeStreaks, computeConsistency };
