/**
 * Chapter profiles — Progress Intelligence (Phase 3).
 *
 * A chapter profile aggregates every stored signal for a single chapter into one
 * transparent, deterministic summary. No estimation beyond what the existing
 * mastery estimator already does; everything else is a direct measurement from
 * tasks / sessions / mistakes / quizzes / review events.
 *
 * Quality: local-first, deterministic, explainable. Every number states its
 * evidence; recommendations carry a reason and the data that triggered them.
 */

import type {
  Chapter,
  MasteryLevel,
  Mistake,
  QuizAttempt,
  ReviewEvent,
  StudySession,
  StudyTask,
  Subject,
} from '../types';
import type { ISODate } from '../date';
import { daysBetween } from '../date';
import { effectiveMinutes, mean, pct, sum } from './common';
import { effectiveMastery } from '../planning/mastery';

export interface ChapterTaskStats {
  total: number;
  done: number;
  skipped: number;
  pending: number;
  completionRate: number; // 0..100
  totalPlannedMin: number;
  totalActualMin: number;
  avgPlannedMin: number;
  avgActualMin: number;
  difficulty: {
    easy: number;
    ok: number;
    hard: number;
    unknown: number;
  };
  byType: Record<string, number>;
  lastTaskDate: ISODate | null;
  daysSinceLastTask: number | null;
}

export interface ChapterSessionStats {
  count: number;
  totalMin: number;
  effectiveMin: number;
  avgDuration: number;
  avgInterruptions: number;
  avgOutcome: number | null;
  activeRecallCount: number;
  avgRecallScore: number | null;
  lastDate: ISODate | null;
  daysSinceLast: number | null;
  efficiency: number; // effective / total *100, 0 when no sessions
}

export interface ChapterQuizStats {
  attempts: number;
  totalQuestions: number;
  correct: number;
  accuracy: number | null; // 0..100
  avgAccuracy: number | null;
  lastDate: ISODate | null;
  daysSinceLastQuiz: number | null;
}

export interface ChapterMistakeStats {
  open: number;
  resolved: number;
  total: number;
  recurrenceSum: number;
  avgRecurrence: number;
  byType: Record<string, number>;
  lastDate: ISODate | null;
  daysSinceLastMistake: number | null;
  highestRecurrence: number;
}

export interface ChapterReviewStats {
  count: number;
  lastRevisionDate: ISODate | null;
  nextDueDate: ISODate | null;
  intervalIndex: number;
  overdueDays: number | null;
  daysSinceLastRevision: number | null;
  avgRecallScore: number | null;
  outcomes: {
    fail: number;
    partial: number;
    strong: number;
  };
  lastOutcome: ReviewEvent['outcome'] | null;
}

export interface ChapterPrereqStatus {
  total: number;
  unmet: number;
  unmetChapters: Array<{ id: string; title: string; mastery: MasteryLevel }>;
  isBlocked: boolean;
}

export interface ChapterRecommendation {
  id: string;
  kind:
    | 'revision-overdue'
    | 'mastery-low'
    | 'practice-needed'
    | 'quiz-low'
    | 'mistakes-high'
    | 'no-recent-work'
    | 'prerequisite-blocked'
    | 'exam-ready'
    | 'review-soon'
    | 'efficiency-low';
  text: string;
  reason: string;
  evidence: string;
  priority: number; // higher = more urgent
  actionLabel: string;
}

export interface ChapterProfile {
  chapterId: string;
  subjectId: string;
  subjectName: string;
  subjectShortName: string;
  subjectColor: string;
  title: string;
  kind: Chapter['kind'];
  order: number;
  mastery: {
    level: MasteryLevel;
    manual: MasteryLevel | null;
    effective: MasteryLevel;
    confidence: number;
    text: string;
  };
  tasks: ChapterTaskStats;
  sessions: ChapterSessionStats;
  quizzes: ChapterQuizStats;
  mistakes: ChapterMistakeStats;
  reviews: ChapterReviewStats;
  prerequisites: ChapterPrereqStatus;
  time: {
    plannedVsActualRatio: number | null; // actual / planned
    effectiveVsPlannedRatio: number | null;
    expectedMin: number;
    totalInvestedMin: number;
    remainingEstimatedMin: number;
  };
  health: {
    score: number; // 0..100, transparent composite
    label: 'excellent' | 'good' | 'at-risk' | 'critical' | 'not-started' | 'insufficient';
    factors: Array<{
      key: string;
      label: string;
      value: number; // 0..1
      weight: number;
      contribution: number;
      evidence: string;
    }>;
  };
  recommendations: ChapterRecommendation[];
  evidence: {
    sampleSize: number;
    lastActivityDate: ISODate | null;
    daysSinceLastActivity: number | null;
    insufficientData: boolean;
  };
}

const MASTERY_TEXT: Record<MasteryLevel, string> = {
  0: 'Not started',
  1: 'Seen',
  2: 'Basic',
  3: 'Practiced',
  4: 'Strong',
  5: 'Exam-ready',
};

function masteryLabel(level: MasteryLevel): string {
  return MASTERY_TEXT[level] ?? `Level ${level}`;
}

export interface BuildChapterProfileInput {
  chapter: Chapter;
  subject: Subject | null;
  tasks: StudyTask[];
  sessions: StudySession[];
  mistakes: Mistake[];
  quizzes: QuizAttempt[];
  reviewEvents: ReviewEvent[];
  allChapters: Chapter[];
  today: ISODate;
}

export function buildChapterProfile(input: BuildChapterProfileInput): ChapterProfile {
  const { chapter, subject, tasks, sessions, mistakes, quizzes, reviewEvents, allChapters, today } = input;

  const chapterTasks = tasks.filter((t) => t.chapterId === chapter.id);
  const chapterSessions = sessions.filter((s) => s.chapterId === chapter.id);
  const chapterMistakes = mistakes.filter((m) => m.chapterId === chapter.id);
  const chapterQuizzes = quizzes.filter((q) => q.chapterId === chapter.id);
  const chapterReviews = reviewEvents.filter((r) => r.chapterId === chapter.id).sort((a, b) => a.date.localeCompare(b.date));

  // --- tasks ---
  const total = chapterTasks.length;
  const done = chapterTasks.filter((t) => t.status === 'done').length;
  const skipped = chapterTasks.filter((t) => t.status === 'skipped').length;
  const pending = chapterTasks.filter((t) => t.status === 'pending' || t.status === 'running' || t.status === 'paused').length;
  const completionRate = total === 0 ? 0 : pct(done, done + skipped);
  const totalPlannedMin = sum(chapterTasks.map((t) => t.plannedMin));
  const totalActualMin = sum(chapterTasks.filter((t) => t.status === 'done').map((t) => t.actualMin));
  const avgPlannedMin = total === 0 ? 0 : Math.round(totalPlannedMin / total);
  const avgActualMin = done === 0 ? 0 : Math.round(totalActualMin / done);
  const difficulty = {
    easy: chapterTasks.filter((t) => t.difficulty === 'easy').length,
    ok: chapterTasks.filter((t) => t.difficulty === 'ok').length,
    hard: chapterTasks.filter((t) => t.difficulty === 'hard').length,
    unknown: chapterTasks.filter((t) => t.difficulty === null).length,
  };
  const byType: Record<string, number> = {};
  for (const t of chapterTasks) {
    byType[t.type] = (byType[t.type] ?? 0) + 1;
  }
  const sortedTaskDates = [...chapterTasks].map((t) => t.planDate).sort();
  const lastTaskDate = sortedTaskDates.length > 0 ? sortedTaskDates[sortedTaskDates.length - 1] : null;
  const daysSinceLastTask = lastTaskDate ? daysBetween(lastTaskDate, today) : null;

  // --- sessions ---
  const sessionCount = chapterSessions.length;
  const totalMin = sum(chapterSessions.map((s) => s.durationMin));
  const effectiveMin = sum(chapterSessions.map((s) => effectiveMinutes(s)));
  const avgDuration = sessionCount === 0 ? 0 : Math.round(totalMin / sessionCount);
  const avgInterruptions = sessionCount === 0 ? 0 : Math.round((sum(chapterSessions.map((s) => s.interruptions)) / sessionCount) * 10) / 10;
  const rated = chapterSessions.filter((s) => s.outcomeRating !== null);
  const avgOutcome = rated.length === 0 ? null : Math.round((sum(rated.map((s) => s.outcomeRating as number)) / rated.length) * 10) / 10;
  const activeRecallCount = chapterSessions.filter((s) => s.activeRecall).length;
  const recallScores = chapterSessions.filter((s) => s.recallScore !== null).map((s) => s.recallScore as number);
  const avgRecallScore = recallScores.length === 0 ? null : Math.round((mean(recallScores) * 100)) / 100;
  const sortedSessionDates = [...chapterSessions].map((s) => s.date).sort();
  const lastSessionDate = sortedSessionDates.length > 0 ? sortedSessionDates[sortedSessionDates.length - 1] : null;
  const daysSinceLastSession = lastSessionDate ? daysBetween(lastSessionDate, today) : null;
  const efficiency = totalMin === 0 ? 0 : Math.round((effectiveMin / totalMin) * 1000) / 10;

  // --- quizzes ---
  const quizAttempts = chapterQuizzes.length;
  const totalQuestions = sum(chapterQuizzes.map((q) => q.total));
  const correct = sum(chapterQuizzes.map((q) => q.correct));
  const accuracy = totalQuestions === 0 ? null : Math.round((correct / totalQuestions) * 1000) / 10;
  const perAttemptAcc = chapterQuizzes.filter((q) => q.total > 0).map((q) => q.correct / q.total);
  const avgAccuracy = perAttemptAcc.length === 0 ? null : Math.round(mean(perAttemptAcc) * 1000) / 10;
  const sortedQuizDates = [...chapterQuizzes].map((q) => q.date).sort();
  const lastQuizDate = sortedQuizDates.length > 0 ? sortedQuizDates[sortedQuizDates.length - 1] : null;
  const daysSinceLastQuiz = lastQuizDate ? daysBetween(lastQuizDate, today) : null;

  // --- mistakes ---
  const openMistakes = chapterMistakes.filter((m) => !m.resolved).length;
  const resolvedMistakes = chapterMistakes.filter((m) => m.resolved).length;
  const totalMistakes = chapterMistakes.length;
  const recurrenceSum = sum(chapterMistakes.map((m) => m.recurrenceCount));
  const avgRecurrence = totalMistakes === 0 ? 0 : Math.round((recurrenceSum / totalMistakes) * 10) / 10;
  const byMistakeType: Record<string, number> = {};
  for (const m of chapterMistakes) {
    byMistakeType[m.type] = (byMistakeType[m.type] ?? 0) + 1;
  }
  const sortedMistakeDates = [...chapterMistakes].map((m) => m.date).sort();
  const lastMistakeDate = sortedMistakeDates.length > 0 ? sortedMistakeDates[sortedMistakeDates.length - 1] : null;
  const daysSinceLastMistake = lastMistakeDate ? daysBetween(lastMistakeDate, today) : null;
  const highestRecurrence = totalMistakes === 0 ? 0 : Math.max(...chapterMistakes.map((m) => m.recurrenceCount));

  // --- reviews ---
  const reviewCount = chapterReviews.length;
  const lastRevisionDate = chapter.lastRevisionDate;
  const nextDueDate = chapter.nextRevisionDate;
  const intervalIndex = chapter.reviewIntervalIndex;
  const daysSinceLastRevision = lastRevisionDate ? daysBetween(lastRevisionDate, today) : null;
  const overdueDays = nextDueDate && nextDueDate < today ? daysBetween(nextDueDate, today) : nextDueDate && nextDueDate === today ? 0 : null;
  const avgReviewRecall = chapterReviews.length === 0 ? null : Math.round(mean(chapterReviews.map((r) => r.recallScore)) * 100) / 100;
  const outcomes = {
    fail: chapterReviews.filter((r) => r.outcome === 'fail').length,
    partial: chapterReviews.filter((r) => r.outcome === 'partial').length,
    strong: chapterReviews.filter((r) => r.outcome === 'strong').length,
  };
  const lastOutcome = chapterReviews.length > 0 ? chapterReviews[chapterReviews.length - 1].outcome : null;

  // --- prerequisites ---
  const prereqChapters = chapter.prerequisiteIds
    .map((id) => allChapters.find((c) => c.id === id))
    .filter((c): c is Chapter => Boolean(c));
  const unmet = prereqChapters.filter((c) => effectiveMastery(c) < 2);
  const prereqStatus: ChapterPrereqStatus = {
    total: prereqChapters.length,
    unmet: unmet.length,
    unmetChapters: unmet.map((c) => ({ id: c.id, title: c.title, mastery: effectiveMastery(c) })),
    isBlocked: unmet.length > 0,
  };

  // --- time ---
  const plannedVsActualRatio = totalPlannedMin === 0 ? null : Math.round((totalActualMin / totalPlannedMin) * 100) / 100;
  const effectiveVsPlannedRatio = totalPlannedMin === 0 ? null : Math.round((effectiveMin / totalPlannedMin) * 100) / 100;
  const totalInvestedMin = Math.max(totalActualMin, effectiveMin);
  const remainingEstimatedMin = Math.max(0, chapter.expectedMin - totalInvestedMin);

  // --- health composite (transparent) ---
  const masteryValue = chapter.mastery / 5;
  const completionValue = total === 0 ? 0 : done / total;
  const revisionValue = (() => {
    if (chapter.mastery < 2) return 0.5; // not yet expected to be reviewed
    if (!lastRevisionDate) return 0.2;
    if (overdueDays !== null && overdueDays > 0) return Math.max(0, 1 - overdueDays / 14);
    if (nextDueDate && nextDueDate >= today) return 1;
    return 0.6;
  })();
  const mistakeValue = (() => {
    if (totalMistakes === 0) return 1;
    if (openMistakes === 0) return 0.9;
    // more open mistakes = lower value, recurrence amplifies
    return Math.max(0, 1 - openMistakes * 0.15 - (avgRecurrence - 1) * 0.1);
  })();
  const recencyValue = (() => {
    const lastActivity = [lastTaskDate, lastSessionDate, lastRevisionDate].filter(Boolean).sort().reverse()[0] as ISODate | undefined;
    if (!lastActivity) return 0;
    const days = daysBetween(lastActivity, today);
    if (days <= 2) return 1;
    if (days <= 7) return 0.7;
    if (days <= 14) return 0.4;
    return 0.1;
  })();
  const quizValue = (() => {
    if (totalQuestions === 0) return 0.5;
    const acc = (accuracy ?? 0) / 100;
    return acc;
  })();

  const healthFactors = [
    {
      key: 'mastery',
      label: 'Mastery level',
      value: masteryValue,
      weight: 0.25,
      contribution: 0,
      evidence: `Mastery ${chapter.mastery}/5 (${masteryLabel(chapter.mastery as MasteryLevel)}), confidence ${Math.round(chapter.confidence * 100)}%`,
    },
    {
      key: 'completion',
      label: 'Task completion',
      value: completionValue,
      weight: 0.2,
      contribution: 0,
      evidence: `${done} of ${total} tasks done (${completionRate}% completion)`,
    },
    {
      key: 'revision',
      label: 'Revision coverage',
      value: revisionValue,
      weight: 0.2,
      contribution: 0,
      evidence: lastRevisionDate ? `Last revision ${lastRevisionDate}, next due ${nextDueDate ?? 'not scheduled'}${overdueDays ? `, ${overdueDays}d overdue` : ''}` : 'No revision recorded yet',
    },
    {
      key: 'mistakes',
      label: 'Mistake pressure',
      value: mistakeValue,
      weight: 0.15,
      contribution: 0,
      evidence: totalMistakes === 0 ? 'No mistakes recorded' : `${openMistakes} open / ${totalMistakes} total, avg recurrence ${avgRecurrence}`,
    },
    {
      key: 'recency',
      label: 'Recent activity',
      value: recencyValue,
      weight: 0.1,
      contribution: 0,
      evidence: (() => {
        const last = [lastTaskDate, lastSessionDate].filter(Boolean).sort().reverse()[0];
        return last ? `Last activity ${last} (${daysBetween(last, today)}d ago)` : 'No activity recorded';
      })(),
    },
    {
      key: 'quiz',
      label: 'Quiz accuracy',
      value: quizValue,
      weight: 0.1,
      contribution: 0,
      evidence: totalQuestions === 0 ? 'No quiz attempts' : `${accuracy}% accuracy over ${totalQuestions} questions`,
    },
  ];

  let score = 0;
  for (const f of healthFactors) {
    const contrib = f.value * f.weight;
    (f as { contribution: number }).contribution = Math.round(contrib * 1000) / 1000;
    score += contrib;
  }
  score = Math.round(score * 100);

  let healthLabel: ChapterProfile['health']['label'];
  if (total === 0 && sessionCount === 0) healthLabel = 'not-started';
  else if (total + sessionCount < 2) healthLabel = 'insufficient';
  else if (score >= 80) healthLabel = 'excellent';
  else if (score >= 60) healthLabel = 'good';
  else if (score >= 35) healthLabel = 'at-risk';
  else healthLabel = 'critical';

  // --- recommendations (deterministic, explainable) ---
  const recommendations: ChapterRecommendation[] = [];

  if (prereqStatus.isBlocked) {
    recommendations.push({
      id: `${chapter.id}-prereq`,
      kind: 'prerequisite-blocked',
      text: `Secure prerequisites first: ${prereqStatus.unmetChapters.map((c) => c.title).join(', ')}`,
      reason: `This chapter depends on ${prereqStatus.unmet} unsecured prerequisite(s) with mastery < 2`,
      evidence: `Prerequisites: ${prereqStatus.unmetChapters.map((c) => `${c.title} (mastery ${c.mastery})`).join('; ')}`,
      priority: 95,
      actionLabel: 'Review prerequisites',
    });
  }

  if (overdueDays !== null && overdueDays > 0) {
    recommendations.push({
      id: `${chapter.id}-revision-overdue`,
      kind: 'revision-overdue',
      text: `Revision overdue by ${overdueDays} day(s)`,
      reason: 'Spaced review interval elapsed — recall decays without active retrieval',
      evidence: `Last revision ${lastRevisionDate}, next due was ${nextDueDate}, today ${today}, overdue ${overdueDays}d`,
      priority: 90,
      actionLabel: 'Do active recall',
    });
  } else if (nextDueDate && daysBetween(today, nextDueDate) <= 2 && daysBetween(today, nextDueDate) >= 0) {
    recommendations.push({
      id: `${chapter.id}-review-soon`,
      kind: 'review-soon',
      text: `Revision due in ${daysBetween(today, nextDueDate)} day(s)`,
      reason: 'Scheduled review approaching — short recall now protects long-term retention',
      evidence: `Next due ${nextDueDate}, interval index ${intervalIndex}`,
      priority: 60,
      actionLabel: 'Schedule recall',
    });
  }

  if (chapter.mastery <= 1 && total > 0) {
    recommendations.push({
      id: `${chapter.id}-mastery-low`,
      kind: 'mastery-low',
      text: `Strengthen fundamentals — mastery is ${masteryLabel(chapter.mastery as MasteryLevel)}`,
      reason: 'Low mastery with recorded work suggests course material not yet secured',
      evidence: `Mastery ${chapter.mastery}/5, ${total} task(s), ${totalActualMin} min actual, confidence ${Math.round(chapter.confidence * 100)}%`,
      priority: 85,
      actionLabel: 'Study course',
    });
  }

  if (chapter.mastery === 2 && (byType['TD'] ?? 0) + (byType['PRACTICE'] ?? 0) < 2) {
    recommendations.push({
      id: `${chapter.id}-practice-needed`,
      kind: 'practice-needed',
      text: 'Add exercise practice — mastery is Basic but few exercises solved',
      reason: 'Moving from Basic to Practiced requires at least 2 exercise blocks',
      evidence: `${byType['TD'] ?? 0} TD + ${byType['PRACTICE'] ?? 0} PRACTICE tasks, mastery ${chapter.mastery}`,
      priority: 70,
      actionLabel: 'Solve exercises',
    });
  }

  if (accuracy !== null && accuracy < 60 && totalQuestions >= 5) {
    recommendations.push({
      id: `${chapter.id}-quiz-low`,
      kind: 'quiz-low',
      text: `Quiz accuracy is ${accuracy}% — review errors`,
      reason: 'Low quiz accuracy indicates gaps in understanding or calculation',
      evidence: `${correct}/${totalQuestions} correct over ${quizAttempts} attempt(s), avg ${avgAccuracy}%`,
      priority: 75,
      actionLabel: 'Fix mistakes',
    });
  }

  if (openMistakes >= 3) {
    recommendations.push({
      id: `${chapter.id}-mistakes-high`,
      kind: 'mistakes-high',
      text: `${openMistakes} open mistakes, highest recurrence ${highestRecurrence}`,
      reason: 'Repeated mistakes signal a persistent misconception that needs targeted review',
      evidence: `${openMistakes} open, ${totalMistakes} total, recurrence sum ${recurrenceSum}, types: ${Object.entries(byMistakeType).map(([k, v]) => `${k}:${v}`).join(', ') || 'none'}`,
      priority: 80,
      actionLabel: 'Resolve mistakes',
    });
  }

  if (daysSinceLastSession !== null && daysSinceLastSession >= 10 && chapter.mastery >= 2) {
    recommendations.push({
      id: `${chapter.id}-no-recent`,
      kind: 'no-recent-work',
      text: `No work for ${daysSinceLastSession} days — re-activate this chapter`,
      reason: 'Long gap without practice increases forgetting, especially for chapters at mastery ≥2',
      evidence: `Last session ${lastSessionDate}, ${daysSinceLastSession}d ago, mastery ${chapter.mastery}`,
      priority: 65,
      actionLabel: 'Quick recall',
    });
  }

  if (efficiency > 0 && efficiency < 60 && sessionCount >= 3) {
    recommendations.push({
      id: `${chapter.id}-efficiency-low`,
      kind: 'efficiency-low',
      text: `Low efficiency: ${efficiency}% effective time`,
      reason: 'Effective minutes are consistently lower than clock time — interruptions or passive reading may dominate',
      evidence: `${effectiveMin} effective / ${totalMin} total minutes over ${sessionCount} session(s), avg interruptions ${avgInterruptions}`,
      priority: 50,
      actionLabel: 'Focus session',
    });
  }

  if (chapter.mastery === 5) {
    recommendations.push({
      id: `${chapter.id}-exam-ready`,
      kind: 'exam-ready',
      text: 'Exam-ready — maintain with spaced recall',
      reason: 'Chapter has reached the highest mastery level; maintenance is cheaper than relearning',
      evidence: `Mastery 5/5, ${reviewCount} review(s), accuracy ${accuracy ?? 'n/a'}%, confidence ${Math.round(chapter.confidence * 100)}%`,
      priority: 20,
      actionLabel: 'Maintain',
    });
  }

  recommendations.sort((a, b) => b.priority - a.priority);

  // --- evidence summary ---
  const allDates = [lastTaskDate, lastSessionDate, lastRevisionDate, lastQuizDate, lastMistakeDate].filter(Boolean) as ISODate[];
  const lastActivityDate = allDates.length > 0 ? allDates.sort().reverse()[0] : null;
  const daysSinceLastActivity = lastActivityDate ? daysBetween(lastActivityDate, today) : null;
  const sampleSize = total + sessionCount + totalMistakes + quizAttempts + reviewCount;
  const insufficientData = sampleSize < 2;

  return {
    chapterId: chapter.id,
    subjectId: chapter.subjectId,
    subjectName: subject?.name ?? chapter.subjectId,
    subjectShortName: subject?.shortName ?? chapter.subjectId,
    subjectColor: subject?.color ?? '#64748b',
    title: chapter.title,
    kind: chapter.kind,
    order: chapter.order,
    mastery: {
      level: chapter.mastery,
      manual: chapter.masteryManual,
      effective: effectiveMastery(chapter),
      confidence: chapter.confidence,
      text: masteryLabel(chapter.mastery),
    },
    tasks: {
      total,
      done,
      skipped,
      pending,
      completionRate,
      totalPlannedMin,
      totalActualMin,
      avgPlannedMin,
      avgActualMin,
      difficulty,
      byType,
      lastTaskDate,
      daysSinceLastTask,
    },
    sessions: {
      count: sessionCount,
      totalMin,
      effectiveMin,
      avgDuration,
      avgInterruptions,
      avgOutcome,
      activeRecallCount,
      avgRecallScore,
      lastDate: lastSessionDate,
      daysSinceLast: daysSinceLastSession,
      efficiency,
    },
    quizzes: {
      attempts: quizAttempts,
      totalQuestions,
      correct,
      accuracy,
      avgAccuracy,
      lastDate: lastQuizDate,
      daysSinceLastQuiz,
    },
    mistakes: {
      open: openMistakes,
      resolved: resolvedMistakes,
      total: totalMistakes,
      recurrenceSum,
      avgRecurrence,
      byType: byMistakeType,
      lastDate: lastMistakeDate,
      daysSinceLastMistake,
      highestRecurrence,
    },
    reviews: {
      count: reviewCount,
      lastRevisionDate,
      nextDueDate,
      intervalIndex,
      overdueDays,
      daysSinceLastRevision,
      avgRecallScore: avgReviewRecall,
      outcomes,
      lastOutcome,
    },
    prerequisites: prereqStatus,
    time: {
      plannedVsActualRatio,
      effectiveVsPlannedRatio,
      expectedMin: chapter.expectedMin,
      totalInvestedMin,
      remainingEstimatedMin,
    },
    health: {
      score,
      label: healthLabel,
      factors: healthFactors,
    },
    recommendations,
    evidence: {
      sampleSize,
      lastActivityDate,
      daysSinceLastActivity,
      insufficientData,
    },
  };
}

export function buildAllChapterProfiles(input: {
  chapters: Chapter[];
  subjects: Subject[];
  tasks: StudyTask[];
  sessions: StudySession[];
  mistakes: Mistake[];
  quizzes: QuizAttempt[];
  reviewEvents: ReviewEvent[];
  today: ISODate;
}): ChapterProfile[] {
  const subjectMap = new Map(input.subjects.map((s) => [s.id, s]));
  return input.chapters
    .map((chapter) =>
      buildChapterProfile({
        chapter,
        subject: subjectMap.get(chapter.subjectId) ?? null,
        tasks: input.tasks,
        sessions: input.sessions,
        mistakes: input.mistakes,
        quizzes: input.quizzes,
        reviewEvents: input.reviewEvents,
        allChapters: input.chapters,
        today: input.today,
      }),
    )
    .sort((a, b) => {
      // most urgent first: critical health, overdue, low mastery
      const scoreDiff = a.health.score - b.health.score;
      if (scoreDiff !== 0) return scoreDiff;
      const overdueA = a.reviews.overdueDays ?? -1;
      const overdueB = b.reviews.overdueDays ?? -1;
      if (overdueB !== overdueA) return overdueB - overdueA;
      return a.mastery.level - b.mastery.level;
    });
}

export function getWeakestChapters(profiles: ChapterProfile[], limit = 5): ChapterProfile[] {
  return [...profiles]
    .filter((p) => p.health.label !== 'not-started' && p.health.label !== 'insufficient')
    .sort((a, b) => a.health.score - b.health.score)
    .slice(0, limit);
}

export function getDueChapters(profiles: ChapterProfile[], limit = 10): ChapterProfile[] {
  return [...profiles]
    .filter((p) => p.reviews.overdueDays !== null && p.reviews.overdueDays >= 0)
    .sort((a, b) => (b.reviews.overdueDays ?? 0) - (a.reviews.overdueDays ?? 0))
    .slice(0, limit);
}

export function getExamReadyChapters(profiles: ChapterProfile[]): ChapterProfile[] {
  return profiles.filter((p) => p.mastery.level === 5);
}
