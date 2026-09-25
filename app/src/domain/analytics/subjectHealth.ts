/**
 * Subject health — Progress Intelligence (Phase 3).
 *
 * A health score per subject, built from transparent, weighted factors.
 * No hidden model, no fake AI: every factor states its evidence, weight and
 * contribution, and recommendations carry explainable reasons.
 *
 * Score 0..100:
 *  - 80+ excellent
 *  - 60-79 good
 *  - 40-59 at-risk
 *  - <40 critical
 *  - not-started / insufficient when sample is too small
 */

import type {
  BacklogItem,
  Chapter,
  Exam,
  Mistake,
  QuizAttempt,
  StudySession,
  StudyTask,
  Subject,
} from '../types';
import type { ISODate } from '../date';
import { daysBetween } from '../date';
import { effectiveMinutes, pct, sum } from './common';
import { effectiveMastery } from '../planning/mastery';

export interface HealthFactor {
  key: string;
  label: string;
  value: number; // 0..1
  weight: number;
  contribution: number;
  evidence: string;
  sampleSize: number;
  trend?: number | null; // delta vs previous, if available
}

export interface HealthRecommendation {
  id: string;
  kind:
    | 'mastery-low'
    | 'completion-low'
    | 'revision-missing'
    | 'mistakes-high'
    | 'backlog-high'
    | 'recency-low'
    | 'balance-off'
    | 'exam-risk'
    | 'neglected'
    | 'maintain';
  text: string;
  reason: string;
  evidence: string;
  priority: number;
  actionLabel: string;
}

export interface SubjectHealth {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  coefficient: number | null;
  score: number; // 0..100
  label: 'excellent' | 'good' | 'at-risk' | 'critical' | 'not-started' | 'insufficient';
  factors: HealthFactor[];
  recommendations: HealthRecommendation[];
  stats: {
    masteryAvg: number | null;
    masteryDistribution: Record<number, number>; // level -> count
    examReadyCount: number;
    atRiskCount: number;
    completionRate: number;
    plannedMin: number;
    actualMin: number;
    effectiveMin: number;
    activeDays: number;
    totalChapters: number;
    openMistakes: number;
    totalMistakes: number;
    backlogMin: number;
    daysSinceLastStudy: number | null;
    lastStudyDate: ISODate | null;
    quizAccuracy: number | null;
    revisionCoverage: number; // 0..100
    overdueRevisions: number;
  };
  evidence: {
    sampleSize: number;
    insufficientData: boolean;
    sentence: string;
  };
}

export interface ComputeSubjectHealthInput {
  subject: Subject;
  chapters: Chapter[];
  tasks: StudyTask[];
  sessions: StudySession[];
  mistakes: Mistake[];
  quizzes: QuizAttempt[];
  backlog: BacklogItem[];
  exams: Exam[];
  today: ISODate;
  windowDays?: number;
}

export function computeSubjectHealth(input: ComputeSubjectHealthInput): SubjectHealth {
  const { subject, chapters, tasks, sessions, mistakes, quizzes, backlog, exams, today } = input;
  const windowDays = input.windowDays ?? 14;
  const fromDate = (() => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - (windowDays - 1));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })() as ISODate;

  const subjectChapters = chapters.filter((c) => c.subjectId === subject.id);
  const subjectTasks = tasks.filter((t) => t.subjectId === subject.id && t.planDate >= fromDate && t.planDate <= today);
  const subjectSessions = sessions.filter((s) => s.subjectId === subject.id && s.date >= fromDate && s.date <= today);
  const allSubjectTasks = tasks.filter((t) => t.subjectId === subject.id);
  const allSubjectSessions = sessions.filter((s) => s.subjectId === subject.id);
  const subjectMistakes = mistakes.filter((m) => m.subjectId === subject.id);
  const subjectQuizzes = quizzes.filter((q) => q.subjectId === subject.id);
  const subjectBacklog = backlog.filter((b) => b.subjectId === subject.id && (b.state === 'open' || b.state === 'scheduled'));
  const subjectExams = exams.filter((e) => e.subjectId === subject.id && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  // --- mastery ---
  const masteryValues = subjectChapters.map((c) => effectiveMastery(c));
  const masteryAvg = masteryValues.length === 0 ? null : Math.round((sum(masteryValues) / masteryValues.length) * 100) / 100;
  const masteryDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const v of masteryValues) {
    masteryDistribution[v] = (masteryDistribution[v] ?? 0) + 1;
  }
  const examReadyCount = subjectChapters.filter((c) => effectiveMastery(c) === 5).length;
  const atRiskCount = subjectChapters.filter((c) => effectiveMastery(c) <= 1).length;

  // --- completion ---
  const totalTasks = subjectTasks.filter((t) => t.status !== 'deferred').length;
  const doneTasks = subjectTasks.filter((t) => t.status === 'done').length;
  const skippedTasks = subjectTasks.filter((t) => t.status === 'skipped').length;
  const decided = doneTasks + skippedTasks;
  const completionRate = decided === 0 ? 0 : pct(doneTasks, decided);

  // --- time ---
  const plannedMin = sum(subjectTasks.map((t) => t.plannedMin));
  const actualMin = sum(subjectTasks.filter((t) => t.status === 'done').map((t) => t.actualMin));
  const effectiveMin = sum(subjectSessions.map((s) => effectiveMinutes(s)));
  const activeDays = new Set(subjectSessions.map((s) => s.date).concat(subjectTasks.filter((t) => t.status === 'done').map((t) => t.planDate))).size;

  // --- recency ---
  const allDates = [
    ...allSubjectTasks.filter((t) => t.status === 'done').map((t) => t.planDate),
    ...allSubjectSessions.map((s) => s.date),
  ].sort();
  const lastStudyDate = allDates.length > 0 ? (allDates[allDates.length - 1] as ISODate) : null;
  const daysSinceLastStudy = lastStudyDate ? daysBetween(lastStudyDate, today) : null;

  // --- mistakes ---
  const openMistakes = subjectMistakes.filter((m) => !m.resolved).length;
  const totalMistakes = subjectMistakes.length;

  // --- backlog ---
  const backlogMin = sum(subjectBacklog.map((b) => b.minutes));

  // --- quizzes ---
  const quizQuestions = sum(subjectQuizzes.map((q) => q.total));
  const quizCorrect = sum(subjectQuizzes.map((q) => q.correct));
  const quizAccuracy = quizQuestions === 0 ? null : Math.round((quizCorrect / quizQuestions) * 1000) / 10;

  // --- revision ---
  const studiedChapters = subjectChapters.filter((c) => effectiveMastery(c) >= 2);
  const reviewedChapters = studiedChapters.filter((c) => c.lastRevisionDate !== null).length;
  const revisionCoverage = studiedChapters.length === 0 ? 0 : pct(reviewedChapters, studiedChapters.length);
  const overdueRevisions = subjectChapters.filter((c) => c.nextRevisionDate !== null && c.nextRevisionDate < today).length;

  // --- factors (transparent, weighted) ---
  const masteryFactorValue = (() => {
    if (masteryAvg === null) return 0;
    return masteryAvg / 5;
  })();
  const completionFactorValue = decided === 0 ? 0 : doneTasks / decided;
  const revisionFactorValue = (() => {
    if (studiedChapters.length === 0) return 0.5; // not yet expected
    const coverage = reviewedChapters / studiedChapters.length;
    const overduePenalty = overdueRevisions > 0 ? Math.max(0, 1 - overdueRevisions * 0.15) : 1;
    return Math.max(0, Math.min(1, coverage * overduePenalty));
  })();
  const mistakeFactorValue = (() => {
    if (totalMistakes === 0) return 1;
    if (openMistakes === 0) return 0.9;
    const avgRecurrence = totalMistakes === 0 ? 0 : sum(subjectMistakes.map((m) => m.recurrenceCount)) / totalMistakes;
    return Math.max(0, 1 - openMistakes * 0.12 - (avgRecurrence - 1) * 0.08);
  })();
  const backlogFactorValue = (() => {
    if (backlogMin === 0) return 1;
    const weeklyTarget = subject.weeklyTargetMin || 120;
    return Math.max(0, 1 - backlogMin / (weeklyTarget * 2));
  })();
  const recencyFactorValue = (() => {
    if (daysSinceLastStudy === null) return 0;
    if (daysSinceLastStudy <= 2) return 1;
    if (daysSinceLastStudy <= 5) return 0.7;
    if (daysSinceLastStudy <= 10) return 0.4;
    if (daysSinceLastStudy <= 20) return 0.2;
    return 0;
  })();
  const balanceFactorValue = (() => {
    if (plannedMin === 0) return 0.5;
    const ratio = effectiveMin / Math.max(1, plannedMin);
    // ideal ratio ~0.8-1.0
    if (ratio >= 0.8 && ratio <= 1.2) return 1;
    if (ratio >= 0.5 && ratio < 0.8) return 0.7;
    if (ratio > 1.2 && ratio <= 1.5) return 0.8;
    if (ratio < 0.5) return Math.max(0, ratio * 1.5);
    return 0.5;
  })();
  const examFactorValue = (() => {
    if (subjectExams.length === 0) return 0.7; // neutral when no exam
    const nextExam = subjectExams[0];
    const daysToExam = daysBetween(today, nextExam.date);
    if (daysToExam > 30) return 0.8;
    if (daysToExam <= 7) {
      // close exam: health depends on mastery and prep
      const prep = nextExam.prepStatus / 100;
      const mastery = masteryFactorValue;
      return Math.min(1, (prep + mastery) / 2 + 0.2);
    }
    // 8-30 days: moderate pressure
    return Math.max(0.3, masteryFactorValue * 0.8 + 0.2);
  })();

  const factors: HealthFactor[] = [
    {
      key: 'mastery',
      label: 'Mastery average',
      value: masteryFactorValue,
      weight: 0.25,
      contribution: 0,
      evidence: masteryAvg === null ? 'No chapters tracked' : `Avg mastery ${masteryAvg}/5 over ${subjectChapters.length} chapter(s), ${examReadyCount} exam-ready, ${atRiskCount} at risk`,
      sampleSize: subjectChapters.length,
    },
    {
      key: 'completion',
      label: 'Task completion',
      value: completionFactorValue,
      weight: 0.2,
      contribution: 0,
      evidence: `${doneTasks} of ${decided} decided tasks done (${completionRate}%) over last ${windowDays} days`,
      sampleSize: decided,
    },
    {
      key: 'revision',
      label: 'Revision coverage',
      value: revisionFactorValue,
      weight: 0.15,
      contribution: 0,
      evidence: studiedChapters.length === 0 ? 'No chapter at mastery ≥2 yet' : `${reviewedChapters}/${studiedChapters.length} studied chapters reviewed (${revisionCoverage}%), ${overdueRevisions} overdue`,
      sampleSize: studiedChapters.length,
    },
    {
      key: 'mistakes',
      label: 'Mistake pressure',
      value: mistakeFactorValue,
      weight: 0.1,
      contribution: 0,
      evidence: totalMistakes === 0 ? 'No mistakes recorded' : `${openMistakes} open / ${totalMistakes} total mistakes`,
      sampleSize: totalMistakes,
    },
    {
      key: 'backlog',
      label: 'Backlog load',
      value: backlogFactorValue,
      weight: 0.1,
      contribution: 0,
      evidence: backlogMin === 0 ? 'No backlog' : `${backlogMin} min overdue, ${subjectBacklog.length} item(s)`,
      sampleSize: subjectBacklog.length,
    },
    {
      key: 'recency',
      label: 'Recent activity',
      value: recencyFactorValue,
      weight: 0.1,
      contribution: 0,
      evidence: lastStudyDate ? `Last studied ${lastStudyDate} (${daysSinceLastStudy}d ago)` : 'Never studied',
      sampleSize: allDates.length,
    },
    {
      key: 'balance',
      label: 'Study balance',
      value: balanceFactorValue,
      weight: 0.05,
      contribution: 0,
      evidence: `${effectiveMin} effective / ${plannedMin} planned min over last ${windowDays} days`,
      sampleSize: subjectTasks.length,
    },
    {
      key: 'exam',
      label: 'Exam readiness',
      value: examFactorValue,
      weight: 0.05,
      contribution: 0,
      evidence:
        subjectExams.length === 0
          ? 'No upcoming exam'
          : `Next exam ${subjectExams[0].name} in ${daysBetween(today, subjectExams[0].date)}d, prep ${subjectExams[0].prepStatus}%`,
      sampleSize: subjectExams.length,
    },
  ];

  let score = 0;
  for (const f of factors) {
    const contrib = f.value * f.weight;
    f.contribution = Math.round(contrib * 1000) / 1000;
    score += contrib;
  }
  score = Math.round(score * 100);

  const totalSample = totalTasks + allSubjectSessions.length + totalMistakes;
  const insufficientData = totalSample < 3 && subjectChapters.length < 2;
  let label: SubjectHealth['label'];
  if (totalSample === 0 && subjectChapters.length === 0) label = 'not-started';
  else if (insufficientData) label = 'insufficient';
  else if (score >= 80) label = 'excellent';
  else if (score >= 60) label = 'good';
  else if (score >= 40) label = 'at-risk';
  else label = 'critical';

  // --- recommendations ---
  const recommendations: HealthRecommendation[] = [];

  if (masteryFactorValue < 0.4 && subjectChapters.length > 0) {
    recommendations.push({
      id: `${subject.id}-mastery-low`,
      kind: 'mastery-low',
      text: `Mastery is low (avg ${masteryAvg}/5) — strengthen fundamentals`,
      reason: 'Low average mastery suggests course material not yet secured',
      evidence: `Avg ${masteryAvg}/5, distribution: ${Object.entries(masteryDistribution).map(([k, v]) => `${k}:${v}`).join(', ')}`,
      priority: 90,
      actionLabel: 'Study course',
    });
  }

  if (completionFactorValue < 0.5 && decided >= 3) {
    recommendations.push({
      id: `${subject.id}-completion-low`,
      kind: 'completion-low',
      text: `Completion is ${completionRate}% — many planned tasks skipped`,
      reason: 'Low completion over last 14 days indicates overload or difficulty',
      evidence: `${doneTasks} done, ${skippedTasks} skipped over last ${windowDays}d`,
      priority: 85,
      actionLabel: 'Reduce scope',
    });
  }

  if (revisionFactorValue < 0.5 && studiedChapters.length >= 2) {
    recommendations.push({
      id: `${subject.id}-revision-missing`,
      kind: 'revision-missing',
      text: `Revision coverage ${revisionCoverage}% — ${overdueRevisions} overdue`,
      reason: 'Studied chapters need spaced recall to stay retained',
      evidence: `${reviewedChapters}/${studiedChapters.length} reviewed, ${overdueRevisions} overdue`,
      priority: 80,
      actionLabel: 'Active recall',
    });
  }

  if (mistakeFactorValue < 0.6) {
    recommendations.push({
      id: `${subject.id}-mistakes-high`,
      kind: 'mistakes-high',
      text: `${openMistakes} open mistakes need resolution`,
      reason: 'Open mistakes with recurrence indicate persistent misconceptions',
      evidence: `${openMistakes} open / ${totalMistakes} total, quiz accuracy ${quizAccuracy ?? 'n/a'}%`,
      priority: 75,
      actionLabel: 'Fix mistakes',
    });
  }

  if (backlogFactorValue < 0.6) {
    recommendations.push({
      id: `${subject.id}-backlog-high`,
      kind: 'backlog-high',
      text: `Backlog ${backlogMin} min — recovery needed`,
      reason: 'Overdue work accumulating beyond weekly target',
      evidence: `${backlogMin} min in ${subjectBacklog.length} item(s), weekly target ${subject.weeklyTargetMin} min`,
      priority: 70,
      actionLabel: 'Recovery plan',
    });
  }

  if (recencyFactorValue < 0.4) {
    recommendations.push({
      id: `${subject.id}-recency-low`,
      kind: 'recency-low',
      text: daysSinceLastStudy === null ? 'Never studied — start with a short block' : `Not studied for ${daysSinceLastStudy} days`,
      reason: 'Long gap increases forgetting and breaks streak',
      evidence: lastStudyDate ? `Last ${lastStudyDate}, ${daysSinceLastStudy}d ago` : 'No study date recorded',
      priority: 65,
      actionLabel: '10-min start',
    });
  }

  if (balanceFactorValue < 0.5 && plannedMin >= 60) {
    recommendations.push({
      id: `${subject.id}-balance-off`,
      kind: 'balance-off',
      text: `Study balance off: ${effectiveMin} effective vs ${plannedMin} planned`,
      reason: 'Effective time far from planned suggests over- or under-estimation',
      evidence: `${effectiveMin} effective / ${plannedMin} planned over ${windowDays}d`,
      priority: 50,
      actionLabel: 'Adjust estimates',
    });
  }

  if (subjectExams.length > 0 && daysBetween(today, subjectExams[0].date) <= 14 && masteryFactorValue < 0.6) {
    recommendations.push({
      id: `${subject.id}-exam-risk`,
      kind: 'exam-risk',
      text: `Exam ${subjectExams[0].name} in ${daysBetween(today, subjectExams[0].date)}d — mastery low`,
      reason: 'Upcoming exam with low mastery needs focused practice',
      evidence: `Exam ${subjectExams[0].date}, prep ${subjectExams[0].prepStatus}%, mastery avg ${masteryAvg}`,
      priority: 95,
      actionLabel: 'Exam prep',
    });
  }

  if (daysSinceLastStudy !== null && daysSinceLastStudy >= 7 && completionRate < 60) {
    recommendations.push({
      id: `${subject.id}-neglected`,
      kind: 'neglected',
      text: `${subject.shortName} neglected: ${daysSinceLastStudy}d since last study`,
      reason: 'Subject has not been studied for a week and completion is low',
      evidence: `Last ${lastStudyDate}, ${daysSinceLastStudy}d ago, completion ${completionRate}%`,
      priority: 60,
      actionLabel: 'Re-engage',
    });
  }

  if (score >= 80) {
    recommendations.push({
      id: `${subject.id}-maintain`,
      kind: 'maintain',
      text: 'Excellent health — maintain with spaced recall',
      reason: 'High health score indicates solid mastery and regular practice',
      evidence: `Score ${score}/100, mastery ${masteryAvg}, completion ${completionRate}%, revision ${revisionCoverage}%`,
      priority: 10,
      actionLabel: 'Maintain',
    });
  }

  recommendations.sort((a, b) => b.priority - a.priority);

  return {
    subjectId: subject.id,
    name: subject.name,
    shortName: subject.shortName,
    color: subject.color,
    coefficient: subject.coefficient,
    score,
    label,
    factors,
    recommendations,
    stats: {
      masteryAvg,
      masteryDistribution,
      examReadyCount,
      atRiskCount,
      completionRate,
      plannedMin,
      actualMin,
      effectiveMin,
      activeDays,
      totalChapters: subjectChapters.length,
      openMistakes,
      totalMistakes,
      backlogMin,
      daysSinceLastStudy,
      lastStudyDate,
      quizAccuracy,
      revisionCoverage,
      overdueRevisions,
    },
    evidence: {
      sampleSize: totalSample,
      insufficientData,
      sentence: insufficientData
        ? `Only ${totalSample} data point(s) — health score needs at least 3 days of real activity`
        : `Based on ${totalTasks} task(s), ${allSubjectSessions.length} session(s), ${totalMistakes} mistake(s) over last ${windowDays} days`,
    },
  };
}

export function computeAllSubjectHealth(input: {
  subjects: Subject[];
  chapters: Chapter[];
  tasks: StudyTask[];
  sessions: StudySession[];
  mistakes: Mistake[];
  quizzes: QuizAttempt[];
  backlog: BacklogItem[];
  exams: Exam[];
  today: ISODate;
  windowDays?: number;
}): SubjectHealth[] {
  return input.subjects
    .filter((s) => s.active)
    .map((subject) =>
      computeSubjectHealth({
        subject,
        chapters: input.chapters,
        tasks: input.tasks,
        sessions: input.sessions,
        mistakes: input.mistakes,
        quizzes: input.quizzes,
        backlog: input.backlog,
        exams: input.exams,
        today: input.today,
        windowDays: input.windowDays,
      }),
    )
    .sort((a, b) => a.score - b.score);
}

export function getCriticalSubjects(health: SubjectHealth[]): SubjectHealth[] {
  return health.filter((h) => h.label === 'critical' || h.label === 'at-risk').sort((a, b) => a.score - b.score);
}

export function getHealthySubjects(health: SubjectHealth[]): SubjectHealth[] {
  return health.filter((h) => h.label === 'excellent' || h.label === 'good').sort((a, b) => b.score - a.score);
}
