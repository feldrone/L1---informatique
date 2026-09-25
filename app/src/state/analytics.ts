/**
 * Derived analytics bundle: everything the dashboard/charts need, computed from ONE snapshot.
 * Nothing here is persisted, so a metric can never drift away from the stored records.
 */

import type { Snapshot } from './store';
import type {
  Chapter,
  Exam,
  MasteryLevel,
  RecoveryPlan,
  StudyTask,
  UserRules,
} from '../domain/types';
import { addDays, daysBetween, todayISO, type ISODate } from '../domain/date';
import { buildTimeline, effectiveMinutes, type DayAggregate } from '../domain/analytics/common';
import {
  computePeriodSummary,
  computeSubjectDistribution,
  computeTodayProgress,
  computeWeeklyStats,
  buildSessionTimeline,
  type PeriodSummary,
  type SessionTimelineEntry,
  type SubjectDistributionEntry,
  type TodayProgress,
  type WeeklyStats,
} from '../domain/analytics/progress';
import { computeConsistency, computeStreaks, type ConsistencyResult, type StreakSummary } from '../domain/analytics/streaks';
import {
  computeHabitMatrix,
  computeHeatmap,
  type HabitDayCell,
  type HeatmapCell,
  type HeatmapMetric,
} from '../domain/analytics/heatmap';
import { computeSubjectBalance, type SubjectBalanceEntry } from '../domain/analytics/balance';
import { generateInsights, type Insight } from '../domain/analytics/insights';
import { computeGoalProgress, evaluateAchievements, type GoalProgress } from '../domain/analytics/goals';
import { computeSubjectPriorities, type SubjectPriority } from '../domain/planning/priority';
import { dueRevisions } from '../domain/planning/revision';
import { generateRecoveryPlan } from '../domain/planning/recovery';
import { countMissedDays } from '../domain/planning/behaviour';
import type { AchievementDefinition } from '../domain/analytics/goals';

export type PeriodKey = '7d' | '30d' | '90d' | 'semester' | 'year';

export const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'semester', label: 'Semester' },
  { key: 'year', label: 'Academic year' },
];

export interface PeriodWindow {
  key: PeriodKey;
  from: ISODate;
  to: ISODate;
  label: string;
  previous: { from: ISODate; to: ISODate } | null;
}

export function periodWindow(key: PeriodKey, today: ISODate): PeriodWindow {
  switch (key) {
    case '7d':
      return {
        key,
        from: addDays(today, -6),
        to: today,
        label: 'Last 7 days',
        previous: { from: addDays(today, -13), to: addDays(today, -7) },
      };
    case '30d':
      return {
        key,
        from: addDays(today, -29),
        to: today,
        label: 'Last 30 days',
        previous: { from: addDays(today, -59), to: addDays(today, -30) },
      };
    case '90d':
      return {
        key,
        from: addDays(today, -89),
        to: today,
        label: 'Last 90 days',
        previous: { from: addDays(today, -179), to: addDays(today, -90) },
      };
    case 'semester': {
      const from = semesterStart(today);
      return {
        key,
        from,
        to: today,
        label: `Semester (since ${from})`,
        previous: null,
      };
    }
    case 'year':
    default: {
      const from = academicYearStart(today);
      return { key: 'year', from, to: today, label: `Academic year (since ${from})`, previous: null };
    }
  }
}

/** S1 runs from September; the window is derived from the calendar, not invented per user. */
export function semesterStart(today: ISODate): ISODate {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return month >= 9 ? `${year}-09-01` : `${year - 1}-09-01`;
}

export function academicYearStart(today: ISODate): ISODate {
  return semesterStart(today);
}

export interface BacklogSummary {
  openItems: number;
  openMin: number;
  scheduledMin: number;
  recoveredMin: number;
  droppedMin: number;
  trend: 'shrinking' | 'stable' | 'growing';
  bySubject: Array<{ subjectId: string; minutes: number; items: number }>;
}

export interface AchievementView {
  definition: AchievementDefinition;
  unlocked: boolean;
  progress: number;
  unlockedAt: string | null;
}

export interface AnalyticsBundle {
  today: ISODate;
  timeline: DayAggregate[];
  todayProgress: TodayProgress;
  todayTasks: StudyTask[];
  todayPlan: Snapshot['plans'][number] | null;
  todayCheckIn: Snapshot['checkIns'][number] | null;
  todayReview: Snapshot['reviews'][number] | null;
  distributionToday: SubjectDistributionEntry[];
  weekly: WeeklyStats;
  weeklyTimeline: DayAggregate[];
  streaks: StreakSummary;
  consistency: ConsistencyResult;
  balance: SubjectBalanceEntry[];
  priorities: SubjectPriority[];
  insights: Insight[];
  goals: GoalProgress[];
  achievements: AchievementView[];
  heatmap: Record<HeatmapMetric, HeatmapCell[]>;
  habitMatrix: HabitDayCell[];
  sessionTimelineToday: SessionTimelineEntry[];
  period: PeriodSummary;
  periods: Record<PeriodKey, PeriodSummary>;
  recoveryPlan: RecoveryPlan;
  backlog: BacklogSummary;
  upcomingExams: Exam[];
  revisionDue: Chapter[];
  masteryByChapter: Array<{ chapter: Chapter; level: MasteryLevel; confidence: number; suggested: number | null }>;
  dataPoints: number;
}

export function computeAnalytics(snapshot: Snapshot, today: ISODate, periodKey: PeriodKey = '30d'): AnalyticsBundle {
  const rules: UserRules = snapshot.preferences.rules;
  const firstActivity = [
    ...snapshot.tasks.map((t) => t.planDate),
    ...snapshot.sessions.map((s) => s.date),
    ...snapshot.plans.map((p) => p.date),
  ].sort()[0];
  const timelineStart =
    firstActivity && daysBetween(firstActivity, today) < 400 ? firstActivity : addDays(today, -120);

  const timeline = buildTimeline({
    from: timelineStart,
    to: today,
    tasks: snapshot.tasks,
    sessions: snapshot.sessions,
    plans: snapshot.plans,
  });

  const todayTasks = snapshot.tasks.filter((t) => t.planDate === today);
  const todayProgress = computeTodayProgress({ date: today, tasks: snapshot.tasks, sessions: snapshot.sessions });
  const distributionToday = computeSubjectDistribution({
    date: today,
    tasks: snapshot.tasks,
    sessions: snapshot.sessions,
    subjects: snapshot.subjects.filter((s) => s.active),
  });
  const streaks = computeStreaks(timeline, today);
  const consistency = computeConsistency({ days: timeline, today, windowDays: 30 });

  const weekFrom = addDays(today, -((new Date(`${today}T12:00:00`).getDay() + 6) % 7));
  const weekly = computeWeeklyStats({
    days: timeline,
    from: weekFrom,
    to: addDays(weekFrom, 6),
    rules,
    sessions: snapshot.sessions,
  });
  const weeklyTimeline = timeline.filter((d) => d.date >= weekFrom && d.date <= addDays(weekFrom, 6));

  const balance = computeSubjectBalance({
    subjects: snapshot.subjects.filter((s) => s.active),
    tasks: snapshot.tasks,
    sessions: snapshot.sessions,
    days: timeline,
    today,
    windowDays: 14,
  });

  const priorities = computeSubjectPriorities({
    date: today,
    subjects: snapshot.subjects,
    chapters: snapshot.chapters,
    exams: snapshot.exams,
    sessions: snapshot.sessions,
    overdueTasks: snapshot.tasks.filter((t) => t.planDate < today && t.status !== 'done'),
  });

  const recoveryPlan = generateRecoveryPlan({
    date: today,
    missedDays: countMissedDays({ date: today, tasks: snapshot.tasks }),
    overdueTasks: snapshot.tasks.filter((t) => t.planDate < today && t.status !== 'done'),
    backlog: snapshot.backlog.filter((b) => b.state === 'open' || b.state === 'scheduled'),
    subjects: snapshot.subjects,
    chapters: snapshot.chapters,
    exams: snapshot.exams,
    rules,
    todayCapacityMin: snapshot.checkIns.find((c) => c.date === today)?.availableMin ?? rules.minDailyMin,
    preset: 'auto',
  });

  const insights = generateInsights({
    today,
    days: timeline,
    tasks: snapshot.tasks,
    sessions: snapshot.sessions,
    subjects: snapshot.subjects,
    chapters: snapshot.chapters,
    exams: snapshot.exams,
    quizzes: snapshot.quizzes.map((q) => ({ subjectId: q.subjectId, date: q.date, correct: q.correct, total: q.total })),
    backlogOpenMin: snapshot.backlog.filter((b) => b.state === 'open').reduce((a, b) => a + b.minutes, 0),
    previousBacklogOpenMin: null,
  });

  const goals = snapshot.goals.map((goal) =>
    computeGoalProgress({
      goal,
      chapters: snapshot.chapters,
      tasks: snapshot.tasks,
      sessions: snapshot.sessions,
      today,
    }),
  );

  const achievements = evaluateAchievements(
    {
      days: timeline,
      tasks: snapshot.tasks,
      sessions: snapshot.sessions,
      chapters: snapshot.chapters,
      subjects: snapshot.subjects,
      goals: snapshot.goals,
      today,
      streaks,
    },
    snapshot.achievements,
    `${today}T00:00:00.000Z`,
  );

  const heatmap: Record<HeatmapMetric, HeatmapCell[]> = {
    time: computeHeatmap({ days: timeline, metric: 'time', sessions: snapshot.sessions, tasks: snapshot.tasks }),
    completion: computeHeatmap({ days: timeline, metric: 'completion', sessions: snapshot.sessions, tasks: snapshot.tasks }),
    revision: computeHeatmap({ days: timeline, metric: 'revision', sessions: snapshot.sessions, tasks: snapshot.tasks }),
    exercises: computeHeatmap({ days: timeline, metric: 'exercises', sessions: snapshot.sessions, tasks: snapshot.tasks }),
    mockExams: computeHeatmap({ days: timeline, metric: 'mockExams', sessions: snapshot.sessions, tasks: snapshot.tasks }),
  };

  const habitMatrix = computeHabitMatrix({
    days: timeline.filter((d) => d.date.slice(0, 7) === today.slice(0, 7)),
    habits: snapshot.habits.map((h) => ({ id: h.id, name: h.name, color: h.color })),
    tasks: snapshot.tasks,
    sessions: snapshot.sessions,
    maxComfortableMin: rules.maxDailyMin,
  });

  const periods: Record<PeriodKey, PeriodSummary> = {
    '7d': buildPeriod('7d'),
    '30d': buildPeriod('30d'),
    '90d': buildPeriod('90d'),
    semester: buildPeriod('semester'),
    year: buildPeriod('year'),
  };

  function buildPeriod(key: PeriodKey): PeriodSummary {
    const window = periodWindow(key, today);
    return computePeriodSummary({
      from: window.from,
      to: window.to,
      label: window.label,
      today,
      days: timeline,
      subjects: snapshot.subjects.filter((s) => s.active),
      tasks: snapshot.tasks,
      sessions: snapshot.sessions,
      previous: window.previous ?? undefined,
    });
  }

  const backlogItems = snapshot.backlog;
  const openItems = backlogItems.filter((b) => b.state === 'open' || b.state === 'scheduled');
  const backlog: BacklogSummary = {
    openItems: openItems.length,
    openMin: openItems.reduce((acc, b) => acc + b.minutes, 0),
    scheduledMin: backlogItems.filter((b) => b.state === 'scheduled').reduce((acc, b) => acc + b.minutes, 0),
    recoveredMin: backlogItems.filter((b) => b.state === 'recovered').reduce((acc, b) => acc + b.minutes, 0),
    droppedMin: backlogItems.filter((b) => b.state === 'dropped').reduce((acc, b) => acc + b.minutes, 0),
    trend: recoveryPlan.deferMin > recoveryPlan.recoverableMin ? 'growing' : recoveryPlan.overdueMin === 0 ? 'stable' : 'shrinking',
    bySubject: [...new Set(openItems.map((b) => b.subjectId))].map((subjectId) => ({
      subjectId,
      minutes: openItems.filter((b) => b.subjectId === subjectId).reduce((acc, b) => acc + b.minutes, 0),
      items: openItems.filter((b) => b.subjectId === subjectId).length,
    })),
  };

  return {
    today,
    timeline,
    todayProgress,
    todayTasks,
    todayPlan: snapshot.plans.find((p) => p.date === today) ?? null,
    todayCheckIn: snapshot.checkIns.find((c) => c.date === today) ?? null,
    todayReview: snapshot.reviews.find((r) => r.date === today) ?? null,
    distributionToday,
    weekly,
    weeklyTimeline,
    streaks,
    consistency,
    balance,
    priorities,
    insights,
    goals,
    achievements,
    heatmap,
    habitMatrix,
    sessionTimelineToday: buildSessionTimeline({ date: today, sessions: snapshot.sessions, subjects: snapshot.subjects }),
    period: periods[periodKey],
    periods,
    recoveryPlan,
    backlog,
    upcomingExams: snapshot.exams
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date)),
    revisionDue: dueRevisions(snapshot.chapters, today),
    masteryByChapter: snapshot.chapters.map((chapter) => ({
      chapter,
      level: chapter.masteryManual ?? chapter.mastery,
      confidence: chapter.confidence,
      suggested: chapter.masteryManual === null ? null : chapter.mastery,
    })),
    dataPoints: snapshot.tasks.length + snapshot.sessions.length,
  };
}

/** Effective minutes helper reused by screens. */
export { effectiveMinutes, todayISO };
