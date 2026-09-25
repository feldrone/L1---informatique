/**
 * Goal progress (spec add-on §17) and lightweight achievements (add-on §18).
 * Goals progress once, from real stored work only — achievements are secondary and never faked.
 */

import type {
  Achievement,
  Chapter,
  Goal,
  StudySession,
  StudyTask,
  Subject,
} from '../types';
import type { ISODate } from '../date';
import { effectiveMinutes, sum, type DayAggregate } from './common';

export interface GoalProgress {
  goal: Goal;
  /** 0..100 */
  percent: number;
  completedTasks: number;
  targetTasks: number;
  completedMin: number;
  targetMin: number;
  chaptersAtTarget: number;
  deadlineDaysLeft: number | null;
  /** Minutes per week required to finish on time, computed only when a deadline exists. */
  requiredWeeklyMin: number | null;
  onTrack: boolean | null;
}

export function computeGoalProgress(params: {
  goal: Goal;
  chapters: Chapter[];
  tasks: StudyTask[];
  sessions: StudySession[];
  today: ISODate;
  masteryTarget?: number;
}): GoalProgress {
  const masteryTarget = params.masteryTarget ?? 3;
  const goalChapters = params.chapters.filter((c) => params.goal.subjectIds.includes(c.subjectId));
  const chaptersAtTarget = goalChapters.filter((c) => c.mastery >= masteryTarget).length;
  const goalTasks = params.tasks.filter((t) => {
    const chapterInGoal = t.chapterId
      ? goalChapters.some((c) => c.id === t.chapterId)
      : t.subjectId
        ? params.goal.subjectIds.includes(t.subjectId)
        : false;
    return chapterInGoal && t.status === 'done';
  });
  const goalSessions = params.sessions.filter(
    (s) => s.subjectId !== null && params.goal.subjectIds.includes(s.subjectId),
  );

  const completedTasks = Math.max(goalTasks.length, chaptersAtTarget);
  const completedMin = Math.max(
    sum(goalTasks.map((t) => t.actualMin)),
    sum(goalSessions.map((s) => effectiveMinutes(s))),
  );
  const targetTasks = params.goal.targetTasks > 0 ? params.goal.targetTasks : Math.max(1, goalChapters.length);
  const targetMin = params.goal.targetMin > 0 ? params.goal.targetMin : 1;

  const byTask = Math.min(100, (completedTasks / targetTasks) * 100);
  const byTime = Math.min(100, (completedMin / targetMin) * 100);
  const percent = Math.round((byTask * 0.5 + byTime * 0.5) * 10) / 10;

  let deadlineDaysLeft: number | null = null;
  let requiredWeeklyMin: number | null = null;
  let onTrack: boolean | null = null;
  if (params.goal.deadline) {
    const diff = Math.round(
      (new Date(`${params.goal.deadline}T12:00:00`).getTime() -
        new Date(`${params.today}T12:00:00`).getTime()) /
        86_400_000,
    );
    deadlineDaysLeft = diff;
    if (diff > 0) {
      const remaining = Math.max(0, targetMin - completedMin);
      requiredWeeklyMin = Math.round((remaining / diff) * 7);
      onTrack = requiredWeeklyMin <= 0 || requiredWeeklyMin <= 900; // 15 h/week ceiling — configurable by the user
    } else {
      onTrack = percent >= 100;
    }
  }

  return {
    goal: params.goal,
    percent,
    completedTasks,
    targetTasks,
    completedMin,
    targetMin,
    chaptersAtTarget,
    deadlineDaysLeft,
    requiredWeeklyMin,
    onTrack,
  };
}

// ---------------------------------------------------------------------------
// achievements
// ---------------------------------------------------------------------------

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  /** Evaluates real data → { unlocked, progress 0..1 }. */
  evaluate: (ctx: AchievementContext) => { unlocked: boolean; progress: number };
}

export interface AchievementContext {
  days: DayAggregate[];
  tasks: StudyTask[];
  sessions: StudySession[];
  chapters: Chapter[];
  subjects: Subject[];
  goals: Goal[];
  today: ISODate;
  streaks: { currentStreak: number; longestStreak: number; totalActiveDays: number; recoveryStreak: number };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first-7-day-streak',
    title: 'First 7-day streak',
    description: 'Seven consecutive active study days.',
    evaluate: (ctx) => ({
      unlocked: ctx.streaks.longestStreak >= 7,
      progress: Math.min(1, ctx.streaks.longestStreak / 7),
    }),
  },
  {
    id: '50-study-hours',
    title: '50 study hours',
    description: '50 hours of logged study time.',
    evaluate: (ctx) => {
      const minutes = sum(ctx.days.map((d) => Math.max(d.completedMin, d.effectiveMin)));
      return { unlocked: minutes >= 3000, progress: Math.min(1, minutes / 3000) };
    },
  },
  {
    id: '100-completed-tasks',
    title: '100 completed tasks',
    description: 'One hundred study blocks finished.',
    evaluate: (ctx) => {
      const count = ctx.tasks.filter((t) => t.status === 'done').length;
      return { unlocked: count >= 100, progress: Math.min(1, count / 100) };
    },
  },
  {
    id: '30-active-days',
    title: '30 active days',
    description: 'Thirty days with real study activity.',
    evaluate: (ctx) => ({
      unlocked: ctx.streaks.totalActiveDays >= 30,
      progress: Math.min(1, ctx.streaks.totalActiveDays / 30),
    }),
  },
  {
    id: 'recovery-return',
    title: 'Recovery return',
    description: 'Returned to the routine after a missed day.',
    evaluate: (ctx) => {
      const missed = ctx.days.filter((d) => d.missed).length;
      const recovered = missed > 0 && ctx.streaks.recoveryStreak >= 1;
      return { unlocked: recovered, progress: recovered ? 1 : missed > 0 ? 0.5 : 0 };
    },
  },
];

export function evaluateAchievements(
  ctx: AchievementContext,
  existing: Achievement[],
  now: string,
): Array<{ definition: AchievementDefinition; unlocked: boolean; progress: number; unlockedAt: string | null }> {
  const existingById = new Map(existing.map((a) => [a.id, a]));
  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const result = definition.evaluate(ctx);
    const already = existingById.get(definition.id);
    return {
      definition,
      unlocked: result.unlocked || Boolean(already),
      progress: result.progress,
      unlockedAt: already?.unlockedAt ?? (result.unlocked ? now : null),
    };
  });
}
