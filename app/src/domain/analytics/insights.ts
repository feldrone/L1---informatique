/**
 * Smart insights (spec add-on §16).
 *
 * Rules: an insight is emitted only when the underlying sample is large enough, it is built strictly
 * from stored statistics, it states the evidence, and it makes no psychological, medical or
 * rank-related claim. When data is missing the UI receives an explicit "not enough data" marker.
 */

import type { Chapter, Exam, StudySession, StudyTask, Subject } from '../types';
import { addDays, dayOfWeek, type ISODate, WEEKDAY_LONG } from '../date';
import { effectiveMinutes, mean, pct, sum, type DayAggregate } from './common';

export interface Insight {
  id: string;
  kind: 'trend' | 'subject' | 'time-of-day' | 'weekday' | 'revision' | 'accuracy' | 'backlog' | 'empty';
  text: string;
  evidence: string;
  /** Number of data points behind the insight — surfaced in the UI for transparency. */
  sampleSize: number;
}

export interface InsightInput {
  today: ISODate;
  days: DayAggregate[];
  tasks: StudyTask[];
  sessions: StudySession[];
  subjects: Subject[];
  chapters: Chapter[];
  exams: Exam[];
  quizzes: Array<{ subjectId: string; date: string; correct: number; total: number }>;
  backlogOpenMin: number;
  previousBacklogOpenMin: number | null;
  minSampleDays?: number;
}

export function generateInsights(input: InsightInput): Insight[] {
  const minDays = input.minSampleDays ?? 3;
  const insights: Insight[] = [];
  const last30From = addDays(input.today, -29);
  const prev30From = addDays(input.today, -59);
  const window30 = input.days.filter((d) => d.date >= last30From && d.date <= input.today);
  const prev30 = input.days.filter((d) => d.date >= prev30From && d.date < last30From);
  const activeDays30 = window30.filter((d) => d.active);
  const activeDaysPrev = prev30.filter((d) => d.active);

  if (activeDays30.length < minDays) {
    return [
      {
        id: 'insight-empty',
        kind: 'empty',
        text: 'Not enough data yet.',
        evidence: `${activeDays30.length} active day(s) recorded in the last 30 days — insights appear once you have at least ${minDays}.`,
        sampleSize: activeDays30.length,
      },
    ];
  }

  // 1. trend vs previous period
  const avgNow = mean(activeDays30.map((d) => Math.max(d.completedMin, d.effectiveMin)));
  const avgPrev = mean(activeDaysPrev.map((d) => Math.max(d.completedMin, d.effectiveMin)));
  if (activeDaysPrev.length >= minDays && avgPrev > 0) {
    const delta = Math.round(((avgNow - avgPrev) / avgPrev) * 100);
    if (Math.abs(delta) >= 10) {
      insights.push({
        id: 'insight-trend',
        kind: 'trend',
        text: `Your average study time ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}% compared with the previous 30 days.`,
        evidence: `${Math.round(avgNow)} min/day now vs ${Math.round(avgPrev)} min/day before (${activeDaysPrev.length} active days in the previous window).`,
        sampleSize: activeDays30.length + activeDaysPrev.length,
      });
    }
  }

  // 2. per-subject completion over the last 30 days
  const subjectRows = input.subjects
    .map((subject) => {
      const tasks = input.tasks.filter(
        (t) => t.subjectId === subject.id && t.planDate >= last30From && t.planDate <= input.today,
      );
      const decided = tasks.filter((t) => t.status === 'done' || t.status === 'skipped');
      const done = decided.filter((t) => t.status === 'done').length;
      return { subject, total: decided.length, done };
    })
    .filter((row) => row.total >= 4);
  for (const row of subjectRows.sort((a, b) => b.done / b.total - a.done / a.total).slice(0, 1)) {
    const rate = Math.round((row.done / row.total) * 100);
    insights.push({
      id: `insight-subject-${row.subject.id}`,
      kind: 'subject',
      text: `You completed ${rate}% of planned ${row.subject.shortName} sessions in the last 30 days.`,
      evidence: `${row.done} of ${row.total} decided tasks completed.`,
      sampleSize: row.total,
    });
  }
  const neglected = subjectRows.filter((row) => row.total >= 4 && row.done / row.total < 0.5);
  if (neglected.length > 0) {
    const worst = neglected.sort((a, b) => a.done / a.total - b.done / b.total)[0];
    insights.push({
      id: `insight-neglect-${worst.subject.id}`,
      kind: 'subject',
      text: `${worst.subject.shortName} is the most neglected module in the last 30 days.`,
      evidence: `${worst.done} of ${worst.total} planned sessions completed.`,
      sampleSize: worst.total,
    });
  }

  // 3. time-of-day pattern (needs real session times)
  const sessions30 = input.sessions.filter((s) => s.date >= last30From && s.date <= input.today);
  if (sessions30.length >= 5) {
    const buckets = [
      { label: '06:00–09:00', from: 6 * 60, to: 9 * 60 },
      { label: '09:00–12:00', from: 9 * 60, to: 12 * 60 },
      { label: '12:00–15:00', from: 12 * 60, to: 15 * 60 },
      { label: '15:00–18:00', from: 15 * 60, to: 18 * 60 },
      { label: '18:00–22:00', from: 18 * 60, to: 22 * 60 },
      { label: '22:00–06:00', from: 22 * 60, to: 6 * 60 },
    ];
    const totals = buckets.map((bucket) => {
      const inBucket = sessions30.filter((s) => {
        const [h, m] = s.startTime.split(':').map(Number);
        const minutes = h * 60 + m;
        return bucket.from < bucket.to
          ? minutes >= bucket.from && minutes < bucket.to
          : minutes >= bucket.from || minutes < bucket.to;
      });
      return { ...bucket, minutes: sum(inBucket.map((s) => effectiveMinutes(s))), count: inBucket.length };
    });
    const best = totals.reduce((a, b) => (b.minutes > a.minutes ? b : a));
    if (best.minutes > 0 && totals.filter((t) => t.minutes > 0).length >= 2) {
      insights.push({
        id: 'insight-timeofday',
        kind: 'time-of-day',
        text: `You study most consistently between ${best.label}.`,
        evidence: `${best.count} sessions, ${best.minutes} effective minutes in that window over the last 30 days.`,
        sampleSize: sessions30.length,
      });
    }
  }

  // 4. strongest weekday
  const last28From = addDays(input.today, -27);
  const window28 = input.days.filter((d) => d.date >= last28From && d.date <= input.today);
  const byWeekday = new Map<number, number[]>();
  for (const day of window28) {
    const wd = dayOfWeek(day.date);
    const list = byWeekday.get(wd) ?? [];
    list.push(Math.max(day.completedMin, day.effectiveMin));
    byWeekday.set(wd, list);
  }
  const weekdayStats = [...byWeekday.entries()]
    .filter(([, values]) => values.length >= 2)
    .map(([wd, values]) => ({ wd, avg: mean(values), n: values.length }))
    .filter((w) => w.avg > 0)
    .sort((a, b) => b.avg - a.avg);
  if (weekdayStats.length >= 2) {
    const best = weekdayStats[0];
    insights.push({
      id: 'insight-weekday',
      kind: 'weekday',
      text: `${WEEKDAY_LONG[best.wd]} has been your strongest study day over the last 4 weeks.`,
      evidence: `Average ${Math.round(best.avg)} min across ${best.n} ${WEEKDAY_LONG[best.wd]}s.`,
      sampleSize: weekdayStats.reduce((acc, w) => acc + w.n, 0),
    });
  }

  // 5. revision coverage
  const chaptersSeen = input.chapters.filter((c) => c.mastery >= 2);
  if (chaptersSeen.length >= 3) {
    const reviewed = chaptersSeen.filter((c) => c.lastRevisionDate !== null).length;
    const rate = pct(reviewed, chaptersSeen.length);
    insights.push({
      id: 'insight-revision',
      kind: 'revision',
      text: `${rate}% of your studied chapters have been through at least one active-recall review.`,
      evidence: `${reviewed} of ${chaptersSeen.length} chapters at mastery ≥ 2 have a recorded review.`,
      sampleSize: chaptersSeen.length,
    });
  }

  // 6. quiz accuracy
  const quizzes30 = input.quizzes.filter((q) => q.date >= last30From && q.date <= input.today && q.total > 0);
  if (quizzes30.length >= 2) {
    const totalQ = sum(quizzes30.map((q) => q.total));
    const correct = sum(quizzes30.map((q) => q.correct));
    insights.push({
      id: 'insight-accuracy',
      kind: 'accuracy',
      text: `Your quiz accuracy over the last 30 days is ${pct(correct, totalQ)}%.`,
      evidence: `${correct} correct out of ${totalQ} questions across ${quizzes30.length} quiz(zes).`,
      sampleSize: quizzes30.length,
    });
  }

  // 7. backlog movement
  if (input.previousBacklogOpenMin !== null && input.backlogOpenMin !== input.previousBacklogOpenMin) {
    const delta = input.backlogOpenMin - input.previousBacklogOpenMin;
    insights.push({
      id: 'insight-backlog',
      kind: 'backlog',
      text: `Backlog ${delta > 0 ? 'grew' : 'shrank'} by ${Math.abs(delta)} minutes compared with the start of the period.`,
      evidence: `${input.backlogOpenMin} min open now vs ${input.previousBacklogOpenMin} min at the start.`,
      sampleSize: 2,
    });
  }

  return insights;
}
