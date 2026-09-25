/**
 * Streaks, consistency score and recovery streak (spec add-on §7, §8 and base §17, §18, §24).
 *
 * A missed day is only reported for days in the past that had a plan and no completed work, and a
 * single missed day never breaks the current streak (that is the product rule, encoded here).
 */

import type { UserRules } from '../types';
import { addDays, daysBetween, type ISODate } from '../date';
import { buildTimeline, effectiveMinutes, mean, pct, sum, type DayAggregate } from './common';

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  missedDays: number;
  /** Length of the streak that is currently running after the most recent missed day. */
  recoveryStreak: number;
  activeDaysWindow: number;
  windowDays: number;
  lastActiveDate: ISODate | null;
  lastMissedDate: ISODate | null;
  missedYesterday: boolean;
  /** Never true: a day still in progress is not a missed day. */
  missedToday: boolean;
  /** True when the day has a plan but no completed work yet — informational, not punitive. */
  todayPending: boolean;
  /** Days since the last active day; null when there is no history at all. */
  daysSinceLastActive: number | null;
}

export function computeStreaks(days: DayAggregate[], today: ISODate, windowDays = 30): StreakSummary {
  const past = days.filter((d) => d.date <= today);
  const byDate = new Map(past.map((d) => [d.date, d]));
  const active = past.filter((d) => d.active);
  const missed = past.filter((d) => d.missed);

  // Current streak: consecutive active days ending today (today is simply not counted while it is
  // still unfinished). A missed day stops the count but never resets the record: what was achieved
  // stays counted in `longestStreak` and the days after the miss are tracked as `recoveryStreak`.
  let currentStreak = 0;
  const todayEntry = byDate.get(today);
  const startOffset = todayEntry && todayEntry.active ? 0 : 1;
  for (let offset = startOffset; offset < 400; offset += 1) {
    const day = byDate.get(addDays(today, -offset));
    if (!day || !day.active) break;
    currentStreak += 1;
  }

  let longestStreak = 0;
  let run = 0;
  for (const day of past) {
    if (day.active) {
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else if (day.missed) {
      run = 0;
    }
  }

  let recoveryStreak = 0;
  const missedDates = missed.map((d) => d.date).sort();
  const lastMissedDate = missedDates.length > 0 ? missedDates[missedDates.length - 1] : null;
  if (lastMissedDate) {
    let cursor = addDays(lastMissedDate, 1);
    while (byDate.get(cursor)?.active) {
      recoveryStreak += 1;
      cursor = addDays(cursor, 1);
    }
  }

  const window = past.filter((d) => d.date >= addDays(today, -(windowDays - 1)));
  const lastActiveDate = active.length > 0 ? active[active.length - 1].date : null;

  return {
    currentStreak,
    longestStreak,
    totalActiveDays: active.length,
    missedDays: missed.length,
    recoveryStreak,
    activeDaysWindow: window.filter((d) => d.active).length,
    windowDays,
    lastActiveDate,
    lastMissedDate,
    missedYesterday: byDate.get(addDays(today, -1))?.missed ?? false,
    missedToday: false,
    todayPending: Boolean(todayEntry && !todayEntry.active && (todayEntry.hadPlan || todayEntry.plannedMin > 0)),
    daysSinceLastActive: lastActiveDate ? daysBetween(lastActiveDate, today) : null,
  };
}

export interface ConsistencyFactor {
  key: string;
  label: string;
  /** 0..1 */
  value: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface ConsistencyResult {
  score: number;
  factors: ConsistencyFactor[];
  sampleSizeDays: number;
  insufficientData: boolean;
  sentence: string;
}

/**
 * Consistency = regularity of preparation. It is explicitly NOT a measure of intelligence,
 * talent or rank, and the UI must say so whenever the score is shown.
 */
export function computeConsistency(params: {
  days: DayAggregate[];
  today: ISODate;
  windowDays?: number;
  rules?: Pick<UserRules, 'minDailyMin' | 'minWeeklyMin'>;
  backlogTrend?: 'shrinking' | 'stable' | 'growing';
}): ConsistencyResult {
  const windowDays = params.windowDays ?? 30;
  const window = params.days.filter((d) => d.date <= params.today && d.date >= addDays(params.today, -(windowDays - 1)));
  const withPlan = window.filter((d) => d.plannedMin > 0);
  const activeDays = window.filter((d) => d.active);
  const missedDays = window.filter((d) => d.missed);

  const regularity = window.length === 0 ? 0 : activeDays.length / window.length;
  const completion =
    withPlan.length === 0
      ? 0
      : mean(withPlan.map((d) => Math.min(1, d.effectiveMin / Math.max(1, d.plannedMin))));
  const volumeTarget = params.rules?.minDailyMin ?? 60;
  const volume =
    activeDays.length === 0
      ? 0
      : mean(activeDays.map((d) => Math.min(1, d.effectiveMin / Math.max(1, volumeTarget * 3))));
  const recovery = missedDays.length === 0 ? Math.min(1, activeDays.length / 5) : Math.min(1, activeDays.length / (missedDays.length * 3));
  const backlogFactor =
    params.backlogTrend === 'shrinking' ? 1 : params.backlogTrend === 'stable' ? 0.7 : params.backlogTrend === 'growing' ? 0.35 : 0.6;

  const factors: ConsistencyFactor[] = [
    {
      key: 'regularity',
      label: 'Active-day regularity',
      value: regularity,
      contribution: 0,
      weight: 0.35,
      explanation: `${activeDays.length} of ${window.length} day(s) in the window reached the activity threshold.`,
    },
    {
      key: 'completion',
      label: 'Plan completion',
      value: completion,
      contribution: 0,
      weight: 0.25,
      explanation:
        withPlan.length === 0
          ? 'No planned day in the window yet.'
          : `Average of effective time divided by planned time over ${withPlan.length} planned day(s).`,
    },
    {
      key: 'volume',
      label: 'Study volume',
      value: volume,
      contribution: 0,
      weight: 0.2,
      explanation: `Effective minutes per active day compared with the ${volumeTarget}-minute daily target.`,
    },
    {
      key: 'recovery',
      label: 'Recovery after missed days',
      value: recovery,
      contribution: 0,
      weight: 0.1,
      explanation:
        missedDays.length === 0
          ? 'No missed day in the window.'
          : `${missedDays.length} missed day(s) balanced against ${activeDays.length} active day(s).`,
    },
    {
      key: 'backlog',
      label: 'Backlog management',
      value: backlogFactor,
      contribution: 0,
      weight: 0.1,
      explanation:
        params.backlogTrend === undefined
          ? 'Not enough backlog history yet.'
          : `Backlog is ${params.backlogTrend}.`,
    },
  ];

  const score = Math.round(
    sum(factors.map((f) => f.value * f.weight)) * 100,
  );

  // Honest empty state: a brand-new user with no records at all scores 0, never a fake baseline.
  const sampleSizeDays = window.filter((d) => d.plannedMin > 0 || d.effectiveMin > 0 || d.active).length;
  const insufficientData = sampleSizeDays < 3;

  return {
    score: insufficientData ? 0 : score,
    factors: factors.map((f) => ({ ...f, contribution: f.value * f.weight })),
    sampleSizeDays,
    insufficientData,
    sentence: insufficientData
      ? 'Not enough data yet — log at least three days of real study behaviour for a meaningful consistency score.'
      : `Based on ${sampleSizeDays} recorded day(s) of study behaviour; it measures the regularity of your preparation, not your intelligence or your rank.`,
  };
}

export { buildTimeline, effectiveMinutes, pct };
