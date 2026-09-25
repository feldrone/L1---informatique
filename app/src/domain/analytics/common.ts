/**
 * Shared analytics primitives.
 *
 * Canonical definitions used everywhere (and tested):
 *  - an ACTIVE day  = ≥ 1 completed task or ≥ 20 effective minutes of study;
 *  - a PLANNED day  = a day that had a generated plan with at least one task;
 *  - a MISSED day   = a planned day (strictly before today) with zero completed work;
 *  - effective minutes = study minutes weighted by mode (see `effectiveMinutes`).
 */

import type { Chapter, DailyPlan, StudySession, StudyTask } from '../types';
import { addDays, daysBetween, type ISODate } from '../date';

export const ACTIVE_DAY_MIN_MINUTES = 20;

export interface DayAggregate {
  date: ISODate;
  plannedMin: number;
  completedMin: number;
  effectiveMin: number;
  tasks: StudyTask[];
  completedTasks: StudyTask[];
  skippedTasks: StudyTask[];
  sessions: StudySession[];
  hadPlan: boolean;
  completedTaskCount: number;
  totalTaskCount: number;
  completionRate: number; // 0..1 of decided tasks
  active: boolean;
  missed: boolean;
}

export interface AnalyticsWindow {
  from: ISODate;
  to: ISODate;
  days: ISODate[];
}

/** Minutes counted as real learning: focus/practice/recall weigh more than open reading. */
export function effectiveMinutes(session: StudySession): number {
  if (session.effectiveMin > 0) return session.effectiveMin;
  const base = session.durationMin;
  if (session.mode === 'focus') return session.activeRecall ? base : Math.round(base * 0.85);
  if (session.mode === 'short-start') return Math.round(base * 0.8);
  return Math.round(base * 0.6);
}

export function aggregateDay(params: {
  date: ISODate;
  tasks: StudyTask[];
  sessions: StudySession[];
  plan: DailyPlan | null;
}): DayAggregate {
  const { date, tasks, sessions, plan } = params;
  const dayTasks = tasks.filter((t) => t.planDate === date);
  const daySessions = sessions.filter((s) => s.date === date);
  const completedTasks = dayTasks.filter((t) => t.status === 'done');
  const skippedTasks = dayTasks.filter((t) => t.status === 'skipped');
  const decided = dayTasks.filter((t) => t.status === 'done' || t.status === 'skipped');
  const plannedMin = dayTasks
    .filter((t) => t.status !== 'deferred')
    .reduce((acc, t) => acc + t.plannedMin, 0);
  const completedMin = completedTasks.reduce((acc, t) => acc + t.actualMin, 0);
  const effective = daySessions.reduce((acc, s) => acc + effectiveMinutes(s), 0);
  const hadPlan = Boolean(plan) || dayTasks.length > 0;

  return {
    date,
    plannedMin,
    completedMin,
    effectiveMin: effective,
    tasks: dayTasks,
    completedTasks,
    skippedTasks,
    sessions: daySessions,
    hadPlan,
    completedTaskCount: completedTasks.length,
    totalTaskCount: dayTasks.length,
    completionRate: decided.length === 0 ? (completedTasks.length > 0 ? 1 : 0) : completedTasks.length / decided.length,
    active: completedTasks.length > 0 || effective >= ACTIVE_DAY_MIN_MINUTES,
    missed: hadPlan && completedTasks.length === 0,
  };
}

export function buildTimeline(params: {
  from: ISODate;
  to: ISODate;
  tasks: StudyTask[];
  sessions: StudySession[];
  plans: DailyPlan[];
}): DayAggregate[] {
  const { from, to } = params;
  const span = Math.max(0, daysBetween(from, to));
  const planByDate = new Map(params.plans.map((p) => [p.date, p]));
  const out: DayAggregate[] = [];
  for (let i = 0; i <= span; i += 1) {
    const date = addDays(from, i);
    out.push(
      aggregateDay({
        date,
        tasks: params.tasks,
        sessions: params.sessions,
        plan: planByDate.get(date) ?? null,
      }),
    );
  }
  return out;
}

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function mean(values: number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

export function chapterMasteryAverage(chapters: Chapter[], subjectId?: string): number | null {
  const list = subjectId ? chapters.filter((c) => c.subjectId === subjectId) : chapters;
  if (list.length === 0) return null;
  return Math.round((sum(list.map((c) => c.mastery)) / list.length) * 100) / 100;
}
