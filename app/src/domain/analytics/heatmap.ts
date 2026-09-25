/**
 * Study heatmap (spec add-on §5) and the circular habit matrix (add-on §4).
 * Intensity levels are computed from real stored data — an empty history renders an empty grid.
 */

import type { StudySession, StudyTask } from '../types';
import type { ISODate } from '../date';
import { effectiveMinutes, type DayAggregate } from './common';

export type HeatmapMetric = 'time' | 'completion' | 'revision' | 'exercises' | 'mockExams';

export const HEATMAP_METRICS: Array<{ id: HeatmapMetric; label: string; unit: string }> = [
  { id: 'time', label: 'Study time', unit: 'min' },
  { id: 'completion', label: 'Task completion', unit: '%' },
  { id: 'revision', label: 'Revision', unit: 'recalls' },
  { id: 'exercises', label: 'Exercises', unit: 'blocks' },
  { id: 'mockExams', label: 'Mock exams', unit: 'tests' },
];

export interface HeatmapCell {
  date: ISODate;
  value: number;
  /** 0..5 — 0 means "no activity". */
  level: number;
  metric: HeatmapMetric;
  /** Short human label used in tooltips and accessible text. */
  label: string;
}

export const TIME_LEVEL_THRESHOLDS = [1, 60, 120, 240, 360]; // <1h, 1-2h, 2-4h, 4-6h, 6h+

export function levelForTime(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes < 60) return 1;
  if (minutes < 120) return 2;
  if (minutes < 240) return 3;
  if (minutes < 360) return 4;
  return 5;
}

export function levelForPercent(value: number): number {
  if (value <= 0) return 0;
  if (value < 25) return 1;
  if (value < 50) return 2;
  if (value < 75) return 3;
  if (value < 100) return 4;
  return 5;
}

export function levelForCount(value: number): number {
  if (value <= 0) return 0;
  if (value === 1) return 2;
  if (value === 2) return 3;
  return 4;
}

export function metricValueForDay(params: {
  day: DayAggregate;
  metric: HeatmapMetric;
  sessions: StudySession[];
  tasks: StudyTask[];
}): number {
  const { day, metric } = params;
  const sessions = params.sessions.filter((s) => s.date === day.date);
  const tasks = params.tasks.filter((t) => t.planDate === day.date);
  switch (metric) {
    case 'time':
      return Math.round(Math.max(day.completedMin, day.effectiveMin));
    case 'completion': {
      const decided = tasks.filter((t) => t.status === 'done' || t.status === 'skipped');
      if (decided.length === 0) return tasks.some((t) => t.status === 'done') ? 100 : 0;
      return Math.round((tasks.filter((t) => t.status === 'done').length / decided.length) * 100);
    }
    case 'revision':
      return sessions.filter((s) => s.activeRecall).length;
    case 'exercises':
      return tasks.filter(
        (t) => t.status === 'done' && (t.type === 'TD' || t.type === 'TP' || t.type === 'PRACTICE'),
      ).length;
    case 'mockExams':
      return tasks.filter((t) => t.status === 'done' && t.type === 'ASSESSMENT').length;
    default:
      return 0;
  }
}

export function computeHeatmap(params: {
  days: DayAggregate[];
  metric: HeatmapMetric;
  sessions: StudySession[];
  tasks: StudyTask[];
}): HeatmapCell[] {
  const { days, metric, sessions, tasks } = params;
  return days.map((day) => {
    const value = metricValueForDay({ day, metric, sessions, tasks });
    const level =
      metric === 'time'
        ? levelForTime(value)
        : metric === 'completion'
          ? levelForPercent(value)
          : levelForCount(value);
    const unit = HEATMAP_METRICS.find((m) => m.id === metric)?.unit ?? '';
    return {
      date: day.date,
      value,
      level,
      metric,
      label:
        value === 0
          ? `${day.date}: no activity`
          : `${day.date}: ${value}${metric === 'completion' ? '%' : unit === 'min' ? ' min' : ` ${unit}`}`,
    };
  });
}

export function heatmapSummary(cells: HeatmapCell[]): {
  activeCells: number;
  totalValue: number;
  bestCell: HeatmapCell | null;
  averageOnActiveDays: number;
} {
  const active = cells.filter((c) => c.level > 0);
  const totalValue = cells.reduce((acc, c) => acc + c.value, 0);
  return {
    activeCells: active.length,
    totalValue,
    bestCell: active.length === 0 ? null : active.reduce((a, b) => (b.value > a.value ? b : a)),
    averageOnActiveDays: active.length === 0 ? 0 : Math.round(totalValue / active.length),
  };
}

// ---------------------------------------------------------------------------
// circular habit matrix
// ---------------------------------------------------------------------------

export interface HabitSlice {
  habitId: string;
  name: string;
  color: string;
  done: boolean;
  minutes: number;
}

export interface HabitDayCell {
  date: ISODate;
  dayOfMonth: number;
  slices: HabitSlice[];
  completedCount: number;
  totalCount: number;
  minutes: number;
  status: 'empty' | 'partial' | 'full' | 'missed' | 'recovery' | 'overloaded';
  plannedMin: number;
}

/**
 * A day is "overloaded" when it demanded far more than the configured comfortable maximum,
 * "recovery" when it contains recovery-origin tasks, "missed" when it was planned but nothing was done.
 */
export function computeHabitMatrix(params: {
  days: DayAggregate[];
  habits: Array<{ id: string; name: string; color: string }>;
  tasks: StudyTask[];
  sessions: StudySession[];
  maxComfortableMin: number;
}): HabitDayCell[] {
  const { days, habits, tasks, sessions, maxComfortableMin } = params;
  return days.map((day) => {
    const dayTasks = tasks.filter((t) => t.planDate === day.date);
    const daySessions = sessions.filter((s) => s.date === day.date);
    const slices: HabitSlice[] = habits.map((habit) => {
      const habitTasks = dayTasks.filter((t) => t.status === 'done' && habitForTask(habit.id, t));
      const habitSessions = daySessions.filter((s) => habitForMode(habit.id, s.activeRecall, s.mode));
      const minutes =
        habitTasks.reduce((acc, t) => acc + t.actualMin, 0) +
        habitSessions.reduce((acc, s) => acc + effectiveMinutes(s), 0);
      return {
        habitId: habit.id,
        name: habit.name,
        color: habit.color,
        done: habitTasks.length > 0 || habitSessions.length > 0,
        minutes,
      };
    });
    const completedCount = slices.filter((s) => s.done).length;
    const plannedMin = dayTasks.reduce((acc, t) => acc + (t.status === 'deferred' ? 0 : t.plannedMin), 0);
    const hasRecovery = dayTasks.some((t) => t.type === 'RECOVERY' && t.status === 'done');
    let status: HabitDayCell['status'] = 'empty';
    if (day.missed && plannedMin > 0) status = 'missed';
    else if (completedCount === 0) status = 'empty';
    else if (hasRecovery && completedCount <= 2) status = 'recovery';
    else if (plannedMin > maxComfortableMin * 1.25 && day.active) status = 'overloaded';
    else if (completedCount >= slices.length) status = 'full';
    else status = 'partial';

    return {
      date: day.date,
      dayOfMonth: Number(day.date.slice(8, 10)),
      slices,
      completedCount,
      totalCount: slices.length,
      minutes: Math.round(Math.max(day.completedMin, day.effectiveMin)),
      status,
      plannedMin,
    };
  });
}

function habitForTask(habitId: string, task: StudyTask): boolean {
  switch (habitId) {
    case 'habit-recall':
      return task.type === 'REVISION' || task.type === 'MEMORY';
    case 'habit-exercises':
      return task.type === 'TD' || task.type === 'PRACTICE';
    case 'habit-practice':
      return task.type === 'TP' || task.type === 'ASSESSMENT';
    case 'habit-revision':
      return task.origin === 'review' || task.type === 'REVIEW';
    case 'habit-course':
      return task.type === 'COURSE';
    default:
      return false;
  }
}

function habitForMode(habitId: string, activeRecall: boolean, mode: StudySession['mode']): boolean {
  if (habitId === 'habit-recall') return activeRecall;
  if (habitId === 'habit-revision') return activeRecall && mode === 'focus';
  return false;
}
