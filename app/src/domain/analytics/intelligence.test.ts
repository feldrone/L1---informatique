/**
 * Progress Intelligence tests — Phase 3.
 * Covers chapter profiles, performance, subject health and weekly reviews.
 * All deterministic, no external dependencies, transparent evidence checks.
 */

import { describe, expect, it } from 'vitest';
import { addDays } from '../date';
import { buildChapterProfile, buildAllChapterProfiles, getWeakestChapters, getDueChapters } from './chapterProfile';
import { computePerformance } from './performance';
import { computeSubjectHealth, computeAllSubjectHealth } from './subjectHealth';
import { generateWeeklyReview, getCurrentWeeklyReview } from './weeklyReview';
import { buildTimeline } from './common';
import {
  makeChapter,
  makeSubject,
  makeTask,
  makeSession,
  makeBacklogItem,
  T,
} from '../testing/fixtures';
import type { Mistake, QuizAttempt, ReviewEvent } from '../types';

const subject = makeSubject({ id: 'sub-analyse1', shortName: 'Analyse 1', name: 'Analyse 1', color: '#4f7ef7' });
const subject2 = makeSubject({ id: 'sub-algebre1', shortName: 'Algèbre 1', name: 'Algèbre 1', color: '#f59e0b' });

function makeMistake(overrides: Partial<Mistake> = {}): Mistake {
  return {
    id: `mist-${Math.random().toString(36).slice(2, 7)}`,
    subjectId: subject.id,
    chapterId: 'an1-c1',
    question: 'Test question',
    userAnswer: 'wrong',
    correctAnswer: 'correct',
    explanation: 'explanation',
    type: 'concept',
    date: T.monday,
    recurrenceCount: 1,
    nextReview: T.monday,
    resolved: false,
    source: 'TD',
    createdAt: `${T.monday}T10:00:00.000Z`,
    ...overrides,
  };
}

function makeQuiz(overrides: Partial<QuizAttempt> = {}): QuizAttempt {
  return {
    id: `quiz-${Math.random().toString(36).slice(2, 7)}`,
    subjectId: subject.id,
    chapterId: 'an1-c1',
    title: 'Quiz 1',
    date: T.monday,
    total: 10,
    correct: 7,
    kind: 'QUIZ',
    durationMin: 30,
    note: '',
    ...overrides,
  };
}

function makeReview(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    id: `rev-${Math.random().toString(36).slice(2, 7)}`,
    chapterId: 'an1-c1',
    subjectId: subject.id,
    date: T.monday,
    recallScore: 0.8,
    outcome: 'strong',
    intervalDays: 3,
    nextDue: addDays(T.monday, 3),
    note: '',
    ...overrides,
  };
}

describe('chapterProfile', () => {
  it('handles empty state (no tasks, sessions, mistakes, quizzes)', () => {
    const chapter = makeChapter({ id: 'an1-c1', mastery: 0, confidence: 0, lastRevisionDate: null, nextRevisionDate: null });
    const profile = buildChapterProfile({
      chapter,
      subject,
      tasks: [],
      sessions: [],
      mistakes: [],
      quizzes: [],
      reviewEvents: [],
      allChapters: [chapter],
      today: T.monday,
    });

    expect(profile.chapterId).toBe('an1-c1');
    expect(profile.tasks.total).toBe(0);
    expect(profile.sessions.count).toBe(0);
    expect(profile.mistakes.total).toBe(0);
    expect(profile.quizzes.attempts).toBe(0);
    expect(profile.health.label).toBe('not-started');
    expect(profile.evidence.insufficientData).toBe(true);
    expect(profile.recommendations.length).toBe(0);
    expect(profile.mastery.text).toBe('Not started');
  });

  it('computes task stats and completion rate', () => {
    const chapter = makeChapter({ id: 'an1-c1', mastery: 2 });
    const tasks = [
      makeTask({ id: 't1', chapterId: 'an1-c1', planDate: T.monday, status: 'done', actualMin: 45, plannedMin: 45 }),
      makeTask({ id: 't2', chapterId: 'an1-c1', planDate: T.monday, status: 'done', actualMin: 30, plannedMin: 45 }),
      makeTask({ id: 't3', chapterId: 'an1-c1', planDate: T.monday, status: 'skipped', plannedMin: 30 }),
      makeTask({ id: 't4', chapterId: 'an1-c1', planDate: T.monday, status: 'pending', plannedMin: 30 }),
    ];
    const profile = buildChapterProfile({
      chapter,
      subject,
      tasks,
      sessions: [],
      mistakes: [],
      quizzes: [],
      reviewEvents: [],
      allChapters: [chapter],
      today: T.monday,
    });

    expect(profile.tasks.total).toBe(4);
    expect(profile.tasks.done).toBe(2);
    expect(profile.tasks.skipped).toBe(1);
    expect(profile.tasks.pending).toBe(1);
    expect(profile.tasks.completionRate).toBe(66.7); // 2/3
    expect(profile.tasks.totalPlannedMin).toBe(150);
    expect(profile.tasks.totalActualMin).toBe(75);
  });

  it('detects overdue revision and produces recommendation with evidence', () => {
    const chapter = makeChapter({
      id: 'an1-c1',
      mastery: 3,
      lastRevisionDate: addDays(T.monday, -10),
      nextRevisionDate: addDays(T.monday, -2),
      reviewIntervalIndex: 2,
    });
    const profile = buildChapterProfile({
      chapter,
      subject,
      tasks: [makeTask({ chapterId: 'an1-c1', status: 'done', actualMin: 60 })],
      sessions: [makeSession({ chapterId: 'an1-c1', date: addDays(T.monday, -1) })],
      mistakes: [],
      quizzes: [],
      reviewEvents: [makeReview({ date: addDays(T.monday, -10), recallScore: 0.7 })],
      allChapters: [chapter],
      today: T.monday,
    });

    expect(profile.reviews.overdueDays).toBe(2);
    expect(profile.reviews.daysSinceLastRevision).toBe(10);
    const rec = profile.recommendations.find((r) => r.kind === 'revision-overdue');
    expect(rec).toBeDefined();
    expect(rec?.evidence).toContain('overdue');
    expect(rec?.reason.length).toBeGreaterThan(10);
    expect(rec?.priority).toBeGreaterThan(80);
  });

  it('detects blocked prerequisites', () => {
    const prereq = makeChapter({ id: 'an1-c0', subjectId: subject.id, mastery: 0, order: 0, title: 'Prereq chapter' });
    const chapter = makeChapter({
      id: 'an1-c1',
      subjectId: subject.id,
      mastery: 1,
      prerequisiteIds: ['an1-c0'],
      order: 1,
    });
    const profile = buildChapterProfile({
      chapter,
      subject,
      tasks: [],
      sessions: [],
      mistakes: [],
      quizzes: [],
      reviewEvents: [],
      allChapters: [prereq, chapter],
      today: T.monday,
    });

    expect(profile.prerequisites.isBlocked).toBe(true);
    expect(profile.prerequisites.unmet).toBe(1);
    expect(profile.recommendations.some((r) => r.kind === 'prerequisite-blocked')).toBe(true);
  });

  it('computes quiz accuracy and mistake pressure', () => {
    const chapter = makeChapter({ id: 'an1-c1', mastery: 3 });
    const quizzes = [
      makeQuiz({ correct: 3, total: 10, date: T.monday }),
      makeQuiz({ correct: 4, total: 10, date: addDays(T.monday, -1) }),
    ];
    const mistakes = [
      makeMistake({ recurrenceCount: 3, resolved: false }),
      makeMistake({ recurrenceCount: 2, resolved: false }),
      makeMistake({ recurrenceCount: 1, resolved: true }),
    ];
    const profile = buildChapterProfile({
      chapter,
      subject,
      tasks: [makeTask({ chapterId: 'an1-c1', status: 'done', actualMin: 45 })],
      sessions: [],
      mistakes,
      quizzes,
      reviewEvents: [],
      allChapters: [chapter],
      today: T.monday,
    });

    expect(profile.quizzes.accuracy).toBe(35); // 7/20
    expect(profile.mistakes.open).toBe(2);
    expect(profile.mistakes.highestRecurrence).toBe(3);
    expect(profile.recommendations.some((r) => r.kind === 'quiz-low')).toBe(true);
    expect(profile.recommendations.some((r) => r.kind === 'mistakes-high')).toBe(false); // only 2 open, need 3
  });

  it('ranks weakest and due chapters', () => {
    const chapters = [
      makeChapter({ id: 'c1', mastery: 1, order: 0, lastRevisionDate: null, nextRevisionDate: addDays(T.monday, -5) }),
      makeChapter({ id: 'c2', mastery: 4, order: 1, lastRevisionDate: T.monday, nextRevisionDate: addDays(T.monday, 5) }),
      makeChapter({ id: 'c3', mastery: 0, order: 2, lastRevisionDate: null, nextRevisionDate: null }),
    ];
    const tasks = [
      makeTask({ chapterId: 'c1', planDate: T.monday, status: 'done', actualMin: 60 }),
      makeTask({ chapterId: 'c2', planDate: T.monday, status: 'done', actualMin: 60 }),
    ];
    const sessions = [
      makeSession({ chapterId: 'c1', date: T.monday, durationMin: 60, effectiveMin: 60 }),
      makeSession({ chapterId: 'c2', date: T.monday, durationMin: 60, effectiveMin: 60 }),
    ];
    const profiles = buildAllChapterProfiles({
      chapters,
      subjects: [subject],
      tasks,
      sessions,
      mistakes: [],
      quizzes: [],
      reviewEvents: [],
      today: T.monday,
    });

    expect(profiles.length).toBe(3);
    const weakest = getWeakestChapters(profiles, 2);
    expect(weakest[0].chapterId).toBe('c1'); // lowest health
    const due = getDueChapters(profiles);
    expect(due.length).toBe(1);
    expect(due[0].chapterId).toBe('c1');
  });
});

describe('performance', () => {
  it('handles empty history without NaN', () => {
    const days = buildTimeline({ from: addDays(T.monday, -6), to: T.monday, plans: [], tasks: [], sessions: [] });
    const perf = computePerformance({
      from: addDays(T.monday, -6),
      to: T.monday,
      label: '7 days',
      days,
      tasks: [],
      sessions: [],
      subjects: [subject],
      chapters: [],
      mistakes: [],
      quizzes: [],
    });

    expect(perf.overall.tasksTotal).toBe(0);
    expect(perf.overall.completionRate).toBe(0);
    expect(Number.isNaN(perf.overall.efficiency)).toBe(false);
    expect(perf.insufficientData).toBe(true);
    expect(perf.byTaskType.length).toBe(0);
  });

  it('computes overall and per-subject performance with evidence', () => {
    const tasks = [
      makeTask({ id: 't1', subjectId: subject.id, planDate: T.monday, status: 'done', actualMin: 60, plannedMin: 60, type: 'COURSE' }),
      makeTask({ id: 't2', subjectId: subject.id, planDate: T.monday, status: 'done', actualMin: 30, plannedMin: 60, type: 'TD' }),
      makeTask({ id: 't3', subjectId: subject2.id, planDate: T.monday, status: 'skipped', plannedMin: 30, type: 'COURSE' }),
    ];
    const sessions = [
      makeSession({ subjectId: subject.id, date: T.monday, durationMin: 60, effectiveMin: 55, mode: 'focus', activeRecall: true, recallScore: 0.8 }),
      makeSession({ subjectId: subject.id, date: T.monday, durationMin: 30, effectiveMin: 25, mode: 'focus', interruptions: 2 }),
    ];
    const chapters = [makeChapter({ subjectId: subject.id, mastery: 3 }), makeChapter({ id: 'c2', subjectId: subject2.id, mastery: 1 })];
    const days = buildTimeline({ from: T.monday, to: T.monday, plans: [], tasks, sessions });

    const perf = computePerformance({
      from: T.monday,
      to: T.monday,
      label: 'Today',
      days,
      tasks,
      sessions,
      subjects: [subject, subject2],
      chapters,
      mistakes: [],
      quizzes: [],
    });

    expect(perf.overall.tasksTotal).toBe(3);
    expect(perf.overall.tasksDone).toBe(2);
    expect(perf.overall.completionRate).toBe(66.7);
    expect(perf.bySubject.length).toBe(2);
    expect(perf.byTaskType.length).toBe(2);
    expect(perf.focus.totalSessions).toBe(2);
    expect(perf.focus.activeRecallSessions).toBe(1);
    expect(perf.focus.evidence.length).toBeGreaterThan(10);
    expect(perf.strongestSubject).toBeDefined();
    expect(perf.weakestSubject).toBeDefined();
  });

  it('computes focus metrics and velocity trend', () => {
    const from = addDays(T.monday, -6);
    const tasks = [
      ...Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((date, idx) =>
        makeTask({ id: `t-${date}`, planDate: date, status: idx % 3 === 2 ? 'skipped' : 'done', actualMin: 60, plannedMin: 60 }),
      ),
    ];
    const sessions = Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((date, idx) =>
      makeSession({ id: `s-${date}`, date, durationMin: 60, effectiveMin: 55, interruptions: idx % 2 }),
    );
    const days = buildTimeline({ from, to: T.monday, plans: [], tasks, sessions });
    const perf = computePerformance({
      from,
      to: T.monday,
      label: '7 days',
      days,
      tasks,
      sessions,
      subjects: [subject],
      chapters: [makeChapter()],
      mistakes: [],
      quizzes: [],
      previous: { from: addDays(from, -7), to: addDays(from, -1) },
    });

    expect(perf.velocity.activeDays).toBeGreaterThan(0);
    expect(perf.velocity.tasksPerActiveDay).toBeGreaterThan(0);
    expect(perf.focus.avgInterruptions).toBeGreaterThanOrEqual(0);
  });
});

describe('subjectHealth', () => {
  it('handles not-started subject', () => {
    const health = computeSubjectHealth({
      subject,
      chapters: [],
      tasks: [],
      sessions: [],
      mistakes: [],
      quizzes: [],
      backlog: [],
      exams: [],
      today: T.monday,
    });

    expect(health.subjectId).toBe(subject.id);
    expect(health.label).toBe('not-started');
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.factors.length).toBe(8);
    expect(health.evidence.insufficientData).toBe(true);
  });

  it('computes health with mastery, completion, revision, mistakes, backlog', () => {
    const chapters = [
      makeChapter({ id: 'an1-c1', subjectId: subject.id, mastery: 4, lastRevisionDate: T.monday, nextRevisionDate: addDays(T.monday, 5) }),
      makeChapter({ id: 'an1-c2', subjectId: subject.id, mastery: 2, lastRevisionDate: null, nextRevisionDate: null }),
      makeChapter({ id: 'an1-c3', subjectId: subject.id, mastery: 1, lastRevisionDate: null, nextRevisionDate: addDays(T.monday, -2) }),
    ];
    const tasks = [
      makeTask({ subjectId: subject.id, chapterId: 'an1-c1', planDate: T.monday, status: 'done', actualMin: 60, plannedMin: 60 }),
      makeTask({ subjectId: subject.id, chapterId: 'an1-c2', planDate: T.monday, status: 'done', actualMin: 45, plannedMin: 60 }),
      makeTask({ subjectId: subject.id, chapterId: 'an1-c3', planDate: addDays(T.monday, -1), status: 'skipped', plannedMin: 60 }),
    ];
    const sessions = [
      makeSession({ subjectId: subject.id, chapterId: 'an1-c1', date: T.monday, durationMin: 60, effectiveMin: 60 }),
      makeSession({ subjectId: subject.id, chapterId: 'an1-c2', date: T.monday, durationMin: 45, effectiveMin: 40 }),
    ];
    const mistakes = [makeMistake({ subjectId: subject.id, chapterId: 'an1-c3', recurrenceCount: 2 })];
    const backlog = [makeBacklogItem({ subjectId: subject.id, minutes: 90, state: 'open' })];
    const quizzes = [makeQuiz({ subjectId: subject.id, total: 20, correct: 14 })];

    const health = computeSubjectHealth({
      subject,
      chapters,
      tasks,
      sessions,
      mistakes,
      quizzes,
      backlog,
      exams: [],
      today: T.monday,
    });

    expect(health.stats.totalChapters).toBe(3);
    expect(health.stats.masteryAvg).toBeCloseTo((4 + 2 + 1) / 3, 1);
    expect(health.stats.completionRate).toBe(66.7);
    expect(health.stats.openMistakes).toBe(1);
    expect(health.stats.backlogMin).toBe(90);
    expect(health.stats.revisionCoverage).toBe(50); // 1 of 2 studied reviewed
    expect(health.factors.every((f) => f.evidence.length > 0)).toBe(true);
    expect(health.factors.reduce((a, f) => a + f.weight, 0)).toBeCloseTo(1, 5);
    expect(health.recommendations.length).toBeGreaterThan(0);
    expect(health.recommendations[0].reason.length).toBeGreaterThan(10);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
  });

  it('detects exam risk and neglected subjects', () => {
    const exam = { id: 'exam-1', subjectId: subject.id, name: 'EMD', date: addDays(T.monday, 5), weight: 1, difficulty: 3, syllabusChapterIds: [], prepStatus: 20, kind: 'EMD' as const, room: '', note: '', createdAt: '' };
    const chapters = [makeChapter({ mastery: 1, subjectId: subject.id })];
    const health = computeSubjectHealth({
      subject,
      chapters,
      tasks: [makeTask({ subjectId: subject.id, planDate: addDays(T.monday, -8), status: 'done', actualMin: 30 })],
      sessions: [],
      mistakes: [],
      quizzes: [],
      backlog: [],
      exams: [exam],
      today: T.monday,
    });

    expect(health.recommendations.some((r) => r.kind === 'exam-risk')).toBe(true);
  });

  it('ranks all subjects by health', () => {
    const subjects = [subject, subject2];
    const chapters = [
      makeChapter({ id: 'c1', subjectId: subject.id, mastery: 5 }),
      makeChapter({ id: 'c2', subjectId: subject2.id, mastery: 0 }),
    ];
    const tasks = [
      makeTask({ subjectId: subject.id, chapterId: 'c1', planDate: T.monday, status: 'done', actualMin: 60 }),
      makeTask({ subjectId: subject2.id, chapterId: 'c2', planDate: T.monday, status: 'skipped', plannedMin: 60 }),
    ];
    const all = computeAllSubjectHealth({
      subjects,
      chapters,
      tasks,
      sessions: [makeSession({ subjectId: subject.id, date: T.monday })],
      mistakes: [],
      quizzes: [],
      backlog: [],
      exams: [],
      today: T.monday,
    });

    expect(all.length).toBe(2);
    expect(all[0].score).toBeLessThanOrEqual(all[1].score); // sorted ascending (weakest first)
  });
});

describe('weeklyReview', () => {
  it('handles empty week', () => {
    const review = generateWeeklyReview({
      weekStart: T.monday,
      today: T.monday,
      tasks: [],
      sessions: [],
      subjects: [subject],
      chapters: [],
      mistakes: [],
      reviews: [],
      backlog: [],
      checkIns: [],
    });

    expect(review.weekStart).toBeDefined();
    expect(review.stats.totalTasks).toBe(0);
    expect(review.evidence.insufficientData).toBe(true);
    expect(review.subjectBreakdown.length).toBe(0);
  });

  it('computes stats, highlights and blockers from real data', () => {
    const weekStart = addDays(T.monday, -6);
    const tasks = [
      makeTask({ id: 'w1', planDate: addDays(weekStart, 0), status: 'done', actualMin: 60, plannedMin: 60 }),
      makeTask({ id: 'w2', planDate: addDays(weekStart, 1), status: 'done', actualMin: 60, plannedMin: 60 }),
      makeTask({ id: 'w3', planDate: addDays(weekStart, 2), status: 'skipped', plannedMin: 60 }),
      makeTask({ id: 'w4', planDate: addDays(weekStart, 3), status: 'done', actualMin: 90, plannedMin: 60 }),
      makeTask({ id: 'w5', planDate: addDays(weekStart, 4), status: 'done', actualMin: 30, plannedMin: 60 }),
    ];
    const sessions = tasks
      .filter((t) => t.status === 'done')
      .map((t) => makeSession({ date: t.planDate, durationMin: t.actualMin, effectiveMin: t.actualMin, activeRecall: t.planDate === addDays(weekStart, 0) }));

    const review = generateWeeklyReview({
      weekStart,
      today: addDays(weekStart, 6),
      tasks,
      sessions,
      subjects: [subject],
      chapters: [makeChapter()],
      mistakes: [makeMistake({ date: addDays(weekStart, 2) })],
      reviews: [{ id: 'r1', date: addDays(weekStart, 2), plannedMin: 60, completedMin: 0, completionRate: 0, skippedCount: 1, delayedCount: 0, mistakeCount: 1, reviewEventCount: 0, blockedBy: [], note: '', backlogDeltaMin: 60, createdAt: '' }],
      backlog: [makeBacklogItem({ minutes: 60 })],
      checkIns: [],
    });

    expect(review.stats.totalTasks).toBe(5);
    expect(review.stats.doneTasks).toBe(4);
    expect(review.stats.skippedTasks).toBe(1);
    expect(review.stats.activeDays).toBeGreaterThan(0);
    expect(review.subjectBreakdown.length).toBe(1);
    expect(review.highlights.length + review.blockers.length).toBeGreaterThan(0);
    expect(review.recommendations.length).toBeGreaterThan(0);
    expect(review.recommendations[0].evidence.length).toBeGreaterThan(10);
    expect(review.nextWeekFocus.habits.length).toBeGreaterThanOrEqual(0);
  });

  it('generates current weekly review', () => {
    const review = getCurrentWeeklyReview({
      today: T.monday,
      tasks: [makeTask({ planDate: T.monday, status: 'done', actualMin: 60 })],
      sessions: [makeSession({ date: T.monday, durationMin: 60, effectiveMin: 60 })],
      subjects: [subject],
      chapters: [],
      mistakes: [],
      reviews: [],
      backlog: [],
      checkIns: [],
    });

    expect(review.label).toContain('→');
    expect(review.weekEnd).toBeDefined();
  });
});
