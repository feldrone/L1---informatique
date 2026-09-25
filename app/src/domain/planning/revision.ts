/**
 * Spaced review scheduler (spec §17).
 *
 * Honest by construction: the intervals are configurable study intervals, NOT a medical or
 * scientifically exact model. Failing recall shortens the interval, strong recall lengthens it.
 */

import type { Chapter, MasteryLevel, ReviewEvent, ReviewOutcome } from '../types';
import { addDays, daysBetween, type ISODate } from '../date';

export const DEFAULT_INTERVALS = [1, 3, 7, 14, 30];

export const MIN_RECALL_SCORE = 0.4;

export interface RecallAssessment {
  /** 0..1 — proportion of items recalled correctly, or a qualitative score. */
  score: number;
  outcome: ReviewOutcome;
  /** Human-readable label shown on the chapter page. */
  label: string;
}

export function assessRecall(score: number): RecallAssessment {
  const clamped = Math.max(0, Math.min(1, score));
  if (clamped < MIN_RECALL_SCORE) {
    return { score: clamped, outcome: 'fail', label: 'Recall failed — interval reduced' };
  }
  if (clamped < 0.75) {
    return { score: clamped, outcome: 'partial', label: 'Partial recall — interval held' };
  }
  return { score: clamped, outcome: 'strong', label: 'Strong recall — interval extended' };
}

/** Next interval index after a review. */
export function nextIntervalIndex(current: number, outcome: ReviewOutcome, intervals = DEFAULT_INTERVALS): number {
  const last = intervals.length - 1;
  if (outcome === 'fail') return Math.max(0, current - 1);
  if (outcome === 'partial') return Math.min(last, current);
  return Math.min(last, current + 1);
}

export interface ScheduledReview {
  chapterId: string;
  subjectId: string;
  date: ISODate;
  intervalDays: number;
  index: number;
  nextDue: ISODate;
  outcome: ReviewOutcome;
  recallScore: number;
  event: ReviewEvent;
  chapter: Chapter;
}

/**
 * Records a review: returns the updated chapter fields plus the append-only ReviewEvent.
 * Pure function — persistence happens in the caller.
 */
export function scheduleReview(params: {
  chapter: Chapter;
  date: ISODate;
  recallScore: number;
  intervals?: number[];
  note?: string;
  eventId: string;
}): ScheduledReview {
  const intervals = params.intervals?.length ? params.intervals : DEFAULT_INTERVALS;
  const assessment = assessRecall(params.recallScore);
  const index = nextIntervalIndex(params.chapter.reviewIntervalIndex, assessment.outcome, intervals);
  const intervalDays = intervals[Math.min(index, intervals.length - 1)];
  const nextDue = addDays(params.date, intervalDays);
  const event: ReviewEvent = {
    id: params.eventId,
    chapterId: params.chapter.id,
    subjectId: params.chapter.subjectId,
    date: params.date,
    recallScore: assessment.score,
    outcome: assessment.outcome,
    intervalDays,
    nextDue,
    note: params.note ?? '',
  };
  return {
    chapterId: params.chapter.id,
    subjectId: params.chapter.subjectId,
    date: params.date,
    intervalDays,
    index,
    nextDue,
    outcome: assessment.outcome,
    recallScore: assessment.score,
    event,
    chapter: params.chapter,
  };
}

/** Chapters whose next planned review is due on or before `date`. */
export function dueRevisions(chapters: Chapter[], date: ISODate): Chapter[] {
  return chapters
    .filter((c) => c.nextRevisionDate !== null && c.nextRevisionDate <= date)
    .sort((a, b) => (a.nextRevisionDate ?? '').localeCompare(b.nextRevisionDate ?? ''));
}

/** Chapters never revised but already seen (mastery ≥ 1) — the scheduler bootstraps them. */
export function bootstrapRevisions(chapters: Chapter[], intervals = DEFAULT_INTERVALS): Chapter[] {
  return chapters.filter(
    (c) => c.nextRevisionDate === null && c.mastery >= 1 && c.lastRevisionDate === null && intervals.length > 0,
  ).map((c) => c);
}

export function daysSinceRevision(chapter: Chapter, date: ISODate): number | null {
  if (!chapter.lastRevisionDate) return null;
  return daysBetween(chapter.lastRevisionDate, date);
}

/** Initial next-due for a chapter that has just been studied for the first time. */
export function initialNextDue(date: ISODate, intervals = DEFAULT_INTERVALS): ISODate {
  return addDays(date, intervals[0]);
}

export function masteryLabel(level: MasteryLevel): string {
  switch (level) {
    case 0:
      return 'Not started';
    case 1:
      return 'Seen';
    case 2:
      return 'Basic understanding';
    case 3:
      return 'Practiced';
    case 4:
      return 'Strong';
    case 5:
      return 'Exam-ready';
    default:
      return 'Unknown';
  }
}

export const MASTERY_LABELS: string[] = [
  'Not started',
  'Seen',
  'Basic understanding',
  'Practiced',
  'Strong',
  'Exam-ready',
];
