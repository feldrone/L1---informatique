/**
 * Mastery estimation (spec §8).
 *
 * Mastery is never silently promoted: a single successful attempt cannot reach "Strong" or
 * "Exam-ready". Several independent signals (course work, practice, quiz accuracy, recall) must
 * agree before the estimate rises, and the manual value set by the student always wins.
 */

import type { Chapter, MasteryLevel, StudySession, StudyTask } from '../types';
import { daysBetween, type ISODate } from '../date';
import { MASTERY_LABELS } from './revision';

export interface MasterySignals {
  courseTasksDone: number;
  courseMinutes: number;
  practiceTasksDone: number;
  exerciseSessions: number;
  quizAccuracy: number | null;
  quizSamples: number;
  recallScores: number[];
  daysSinceLastWork: number | null;
  mistakesOpen: number;
}

export interface MasteryEstimate {
  level: MasteryLevel;
  confidence: number;
  reasons: string[];
  /** True when a manual value exists and therefore overrides the estimate. */
  overridden: boolean;
}

export function collectMasterySignals(params: {
  chapter: Chapter;
  tasks: StudyTask[];
  sessions: StudySession[];
  quizAccuracy: number | null;
  quizSamples: number;
  mistakesOpen: number;
  date: ISODate;
}): MasterySignals {
  const { chapter, tasks, sessions, date } = params;
  const chapterTasks = tasks.filter((t) => t.chapterId === chapter.id);
  const doneTasks = chapterTasks.filter((t) => t.status === 'done');
  const courseTasks = doneTasks.filter((t) => t.type === 'COURSE' || t.type === 'TP');
  const practiceTasks = doneTasks.filter((t) => t.type === 'TD' || t.type === 'PRACTICE');
  const chapterSessions = sessions.filter((s) => s.chapterId === chapter.id);
  const recallScores = chapterSessions
    .filter((s) => s.activeRecall && s.recallScore !== null)
    .map((s) => s.recallScore as number);
  const lastWorkDates = [
    ...chapterTasks.map((t) => t.planDate),
    ...chapterSessions.map((s) => s.date),
  ].sort();
  const last = lastWorkDates.length > 0 ? lastWorkDates[lastWorkDates.length - 1] : null;

  return {
    courseTasksDone: courseTasks.length,
    courseMinutes: courseTasks.reduce((acc, t) => acc + t.actualMin, 0),
    practiceTasksDone: practiceTasks.length,
    exerciseSessions: chapterSessions.filter((s) => !s.activeRecall).length,
    quizAccuracy: params.quizAccuracy,
    quizSamples: params.quizSamples,
    recallScores,
    daysSinceLastWork: last ? daysBetween(last, date) : null,
    mistakesOpen: params.mistakesOpen,
  };
}

/**
 * Deterministic rule set. Each level requires cumulative evidence:
 *  1 Seen              — at least one completed course/TP block
 *  2 Basic             — seen + ≥ 45 min of course work
 *  3 Practiced         — at least 2 practice blocks solved
 *  4 Strong            — practiced + quiz accuracy ≥ 70 % over ≥ 8 questions + ≥ 3 practice blocks
 *  5 Exam-ready        — strong + ≥ 2 strong recalls + accuracy ≥ 80 % + no open high-recurrence mistake
 * Recall failure or many open mistakes can lower the proposal by one level (never below Seen once worked).
 */
export function estimateMastery(signals: MasterySignals, current: MasteryLevel): MasteryEstimate {
  const reasons: string[] = [];
  let level = 0;

  if (signals.courseTasksDone >= 1) {
    level = 1;
    reasons.push('Course material worked at least once');
  }
  if (level >= 1 && signals.courseMinutes >= 45) {
    level = 2;
    reasons.push(`${signals.courseMinutes} min of course work completed`);
  }
  if (signals.practiceTasksDone >= 2) {
    level = Math.max(level, 3);
    reasons.push(`${signals.practiceTasksDone} exercise/practice blocks solved`);
  }
  const strongQuiz = signals.quizAccuracy !== null && signals.quizSamples >= 8 && signals.quizAccuracy >= 0.7;
  if (level >= 3 && strongQuiz) {
    level = 4;
    reasons.push(`Quiz accuracy ${Math.round((signals.quizAccuracy ?? 0) * 100)}% over ${signals.quizSamples} questions`);
  }
  const strongRecalls = signals.recallScores.filter((s) => s >= 0.75).length;
  if (level >= 4 && strongRecalls >= 2 && (signals.quizAccuracy ?? 0) >= 0.8 && signals.mistakesOpen <= 2) {
    level = 5;
    reasons.push(`${strongRecalls} strong active-recall checks with high accuracy`);
  }

  // Downgrade pressure: recent recall failure or accumulating unresolved mistakes.
  const failedRecall = signals.recallScores.length > 0 && signals.recallScores[signals.recallScores.length - 1] < 0.4;
  if (level >= 4 && (failedRecall || signals.mistakesOpen > 4)) {
    level -= 1;
    reasons.push(failedRecall ? 'Latest recall failed — level reduced' : 'Open mistakes piling up');
  }

  // One successful attempt must never read as mastery: cap level 5 behind repeated evidence.
  if (level === 5 && signals.practiceTasksDone < 3) {
    level = 4;
    reasons.push('More practice blocks needed before “exam-ready”');
  }

  const cappedCurrent = Math.max(current, 0) as MasteryLevel;
  // The estimate never drops below "Seen" once the chapter has been worked on at all.
  if (signals.courseTasksDone >= 1) level = Math.max(level, 1);

  const confidence = Math.max(
    0,
    Math.min(
      1,
      signals.courseTasksDone * 0.2 +
        signals.practiceTasksDone * 0.15 +
        (signals.quizSamples >= 8 ? 0.2 : 0) +
        signals.recallScores.length * 0.1,
    ),
  );

  const finalLevel = Math.max(0, Math.min(5, Math.max(level, cappedCurrent === 0 ? 0 : Math.min(level, cappedCurrent + 1)))) as MasteryLevel;

  return {
    level: finalLevel,
    confidence,
    reasons: reasons.length > 0 ? reasons : ['No completed work recorded yet'],
    overridden: false,
  };
}

export function describeMastery(level: MasteryLevel): string {
  return MASTERY_LABELS[level] ?? 'Unknown';
}

/** Applies a manual override: the stored manual value always wins for the effective level. */
export function effectiveMastery(chapter: Chapter): MasteryLevel {
  return chapter.masteryManual ?? chapter.mastery;
}
