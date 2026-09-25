/**
 * Behavioural signals derived from real history (spec §13, §20, §24, §25).
 * Used by the planner to adapt task size, ordering and recovery load.
 */

import type { StudySession, StudyTask } from '../types';
import { addDays, daysBetween, type ISODate } from '../date';
import type { BehaviourSignals } from './types';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export interface BehaviourInput {
  date: ISODate;
  tasks: StudyTask[];
  sessions: StudySession[];
  struggleThreshold?: number;
}

export function deriveBehaviourSignals(input: BehaviourInput): BehaviourSignals {
  const { date, tasks, sessions } = input;
  const last14 = addDays(date, -14);
  const last7 = addDays(date, -7);

  const windowTasks = tasks.filter((t) => t.planDate >= last14 && t.planDate <= date);
  const decided = windowTasks.filter((t) => t.status === 'done' || t.status === 'skipped');
  const doneCount = windowTasks.filter((t) => t.status === 'done').length;
  const completionRate7d = decided.length === 0 ? 0 : doneCount / decided.length;

  const measured = windowTasks.filter((t) => t.status === 'done' && t.plannedMin > 0 && t.actualMin > 0);
  const overshoots = measured.map((t) => (t.actualMin - t.plannedMin) / t.plannedMin).filter((v) => v > 0);
  const undershoots = measured.map((t) => (t.actualMin - t.plannedMin) / t.plannedMin).filter((v) => v < 0);

  const skipCountBySubject: Record<string, number> = {};
  for (const task of windowTasks) {
    if (task.status === 'skipped' && task.subjectId) {
      skipCountBySubject[task.subjectId] = (skipCountBySubject[task.subjectId] ?? 0) + 1;
    }
  }

  const recentSessions = sessions.filter((s) => s.date >= last14 && s.date <= date);
  const rated = recentSessions.filter((s) => s.outcomeRating !== null);
  const averageOutcomeRating =
    rated.length === 0
      ? null
      : rated.reduce((acc, s) => acc + (s.outcomeRating as number), 0) / rated.length;

  // Struggling subjects: recent exercise sessions where recall/quality was rated low.
  const struggleThreshold = input.struggleThreshold ?? 2.5;
  const struggling = new Set<string>();
  for (const session of recentSessions) {
    if (!session.subjectId) continue;
    if (session.outcomeRating !== null && session.outcomeRating <= struggleThreshold) {
      struggling.add(session.subjectId);
    }
  }

  return {
    completionRate7d: Number.isFinite(completionRate7d) ? completionRate7d : 0,
    overshootRatio: median(overshoots),
    undershootRatio: Math.abs(median(undershoots)),
    skipCountBySubject,
    strugglingSubjectIds: [...struggling],
    averageOutcomeRating,
    sessionsLast7d: sessions.filter((s) => s.date >= last7 && s.date <= date).length,
  };
}

/**
 * Number of consecutive days with no completed work before `date`, starting from yesterday.
 * A day counts as missed when it had planned work and nothing was completed, or when it had
 * planned work and every task was skipped.
 */
export function countMissedDays(params: { date: ISODate; tasks: StudyTask[]; maxLookback?: number }): number {
  const { date, tasks } = params;
  const maxLookback = params.maxLookback ?? 30;
  let missed = 0;
  for (let i = 1; i <= maxLookback; i += 1) {
    const day = addDays(date, -i);
    const dayTasks = tasks.filter((t) => t.planDate === day);
    const planned = dayTasks.filter((t) => t.status !== 'deferred');
    if (planned.length === 0) continue; // nothing planned → not a "missed" day
    const anyDone = dayTasks.some((t) => t.status === 'done');
    if (anyDone) break;
    missed += 1;
  }
  return missed;
}

/** Days of continuous activity ending today (used by the streak analytics). */
export function daysSince(days: string[], date: ISODate): number | null {
  if (days.length === 0) return null;
  const latest = [...days].sort().reverse()[0];
  return daysBetween(latest, date);
}
