/**
 * Subject balance analysis (spec add-on §10).
 * Purely factual: a subject is reported as neglected only when its measured study time is genuinely
 * below what was planned for it over the window. No explanation is invented beyond the numbers.
 */

import type { StudySession, StudyTask, Subject } from '../types';
import { addDays, type ISODate } from '../date';
import { effectiveMinutes, pct, sum, type DayAggregate } from './common';

export interface SubjectBalanceEntry {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  plannedMin: number;
  actualMin: number;
  effectiveMin: number;
  completionPercent: number;
  trendPercent: number | null;
  neglected: boolean;
  /** Factual sentence when neglected, built from the numbers only. */
  warning: string | null;
  lastStudiedDate: ISODate | null;
  daysSinceStudied: number | null;
}

export function computeSubjectBalance(params: {
  subjects: Subject[];
  tasks: StudyTask[];
  sessions: StudySession[];
  days: DayAggregate[];
  today: ISODate;
  windowDays: number;
}): SubjectBalanceEntry[] {
  const { subjects, tasks, sessions, today, windowDays } = params;
  const from = addDays(today, -(windowDays - 1));
  const prevFrom = addDays(from, -windowDays);

  return subjects
    .filter((s) => s.active)
    .map((subject) => {
      const windowTasks = tasks.filter(
        (t) => t.subjectId === subject.id && t.planDate >= from && t.planDate <= today,
      );
      const windowSessions = sessions.filter(
        (s) => s.subjectId === subject.id && s.date >= from && s.date <= today,
      );
      const prevSessions = sessions.filter(
        (s) => s.subjectId === subject.id && s.date >= prevFrom && s.date < from,
      );

      const plannedMin = sum(windowTasks.map((t) => t.plannedMin));
      const actualMin = sum(windowTasks.filter((t) => t.status === 'done').map((t) => t.actualMin));
      const effective = sum(windowSessions.map((s) => effectiveMinutes(s)));
      const prevEffective = sum(prevSessions.map((s) => effectiveMinutes(s)));
      const baseline = Math.max(actualMin, effective);

      const trendPercent =
        prevEffective <= 0
          ? null
          : Math.round(((effective - prevEffective) / prevEffective) * 1000) / 10;

      const subjectDates = [
        ...windowSessions.map((s) => s.date),
        ...windowTasks.filter((t) => t.status === 'done').map((t) => t.planDate),
      ].sort();
      const lastStudiedDate = subjectDates.length > 0 ? subjectDates[subjectDates.length - 1] : null;
      const daysSinceStudied = lastStudiedDate
        ? Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${lastStudiedDate}T12:00:00`).getTime()) / 86_400_000)
        : null;

      const plannedThreshold = Math.max(60, subject.weeklyTargetMin);
      const neglected =
        plannedMin >= plannedThreshold &&
        baseline < plannedMin * 0.6 &&
        (daysSinceStudied === null || daysSinceStudied >= 3);
      const shortfall = plannedMin === 0 ? 0 : Math.round((1 - baseline / plannedMin) * 100);

      return {
        subjectId: subject.id,
        name: subject.name,
        shortName: subject.shortName,
        color: subject.color,
        plannedMin,
        actualMin,
        effectiveMin: effective,
        completionPercent: plannedMin === 0 ? (baseline > 0 ? 100 : 0) : pct(baseline, plannedMin),
        trendPercent,
        neglected,
        warning: neglected
          ? `${subject.shortName} has received ${shortfall}% less study time than planned over the last ${windowDays} days.`
          : null,
        lastStudiedDate,
        daysSinceStudied,
      };
    })
    .sort((a, b) => a.completionPercent - b.completionPercent);
}
