/**
 * Adaptive planning tests — Phase 3.
 * Deterministic, transparent, no external dependencies.
 */

import { describe, expect, it } from 'vitest';
import { analyzeAdaptationNeeds, generateAdaptationPlan, applyAdaptationsToRules } from './adaptation';
import { buildAllChapterProfiles } from '../analytics/chapterProfile';
import { computeAllSubjectHealth } from '../analytics/subjectHealth';
import { generateLastNWeeklyReviews } from '../analytics/weeklyReview';
import { computePerformance } from '../analytics/performance';
import { buildTimeline } from '../analytics/common';
import {
  BASE_RULES,
  makeChapter,
  makeSubject,
  makeTask,
  makeSession,
  makeBacklogItem,
  T,
} from '../testing/fixtures';
import { addDays } from '../date';
import type { BehaviourSignals } from './types';

const subject = makeSubject({ id: 'sub-analyse1', shortName: 'Analyse 1' });
const subject2 = makeSubject({ id: 'sub-algebre1', shortName: 'Algèbre 1' });

function makeBehaviour(overrides: Partial<BehaviourSignals> = {}): BehaviourSignals {
  return {
    completionRate7d: 0.8,
    overshootRatio: 0,
    undershootRatio: 0,
    skipCountBySubject: {},
    strugglingSubjectIds: [],
    averageOutcomeRating: 3,
    sessionsLast7d: 4,
    ...overrides,
  };
}

describe('adaptation', () => {
  it('handles empty data without crashing', () => {
    const days = buildTimeline({ from: addDays(T.monday, -6), to: T.monday, plans: [], tasks: [], sessions: [] });
    const performance = computePerformance({
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

    const plan = generateAdaptationPlan({
      date: T.monday,
      rules: BASE_RULES,
      behaviour: makeBehaviour({ sessionsLast7d: 0 }),
      subjectHealth: [],
      chapterProfiles: [],
      weeklyReviews: [],
      performance,
      today: T.monday,
    });

    expect(plan.suggestions.length).toBe(0);
    expect(plan.evidence.insufficientData).toBe(true);
    expect(plan.rationale).toContain('Not enough data');
  });

  it('suggests reducing block size when overshoot is high', () => {
    const behaviour = makeBehaviour({ overshootRatio: 0.5, sessionsLast7d: 5 });
    const days = buildTimeline({ from: T.monday, to: T.monday, plans: [], tasks: [], sessions: [] });
    const performance = computePerformance({
      from: T.monday,
      to: T.monday,
      label: 'Today',
      days,
      tasks: [],
      sessions: [],
      subjects: [subject],
      chapters: [],
      mistakes: [],
      quizzes: [],
    });

    const suggestions = analyzeAdaptationNeeds({
      date: T.monday,
      rules: BASE_RULES,
      behaviour,
      subjectHealth: [],
      chapterProfiles: [],
      weeklyReviews: [],
      performance,
      today: T.monday,
    });

    const overshoot = suggestions.find((s) => s.kind === 'reduce-block-size');
    expect(overshoot).toBeDefined();
    expect(overshoot?.evidence).toContain('overshoot');
    expect(overshoot?.suggestedChange?.field).toBe('maxBlockMin');
    expect((overshoot?.suggestedChange?.to as number) < BASE_RULES.maxBlockMin).toBe(true);
    expect(overshoot?.priority).toBeGreaterThan(80);
  });

  it('suggests anti-procrastination for repeatedly skipped subjects', () => {
    const behaviour = makeBehaviour({ skipCountBySubject: { [subject.id]: 3 }, sessionsLast7d: 3 });
    const chapters = [makeChapter({ subjectId: subject.id })];
    const tasks = [makeTask({ subjectId: subject.id, status: 'skipped' }), makeTask({ subjectId: subject.id, status: 'skipped' }), makeTask({ subjectId: subject.id, status: 'skipped' })];
    const days = buildTimeline({ from: T.monday, to: T.monday, plans: [], tasks, sessions: [] });
    const performance = computePerformance({
      from: T.monday,
      to: T.monday,
      label: 'Today',
      days,
      tasks,
      sessions: [],
      subjects: [subject],
      chapters,
      mistakes: [],
      quizzes: [],
    });
    const health = computeAllSubjectHealth({
      subjects: [subject],
      chapters,
      tasks,
      sessions: [],
      mistakes: [],
      quizzes: [],
      backlog: [],
      exams: [],
      today: T.monday,
    });

    const suggestions = analyzeAdaptationNeeds({
      date: T.monday,
      rules: BASE_RULES,
      behaviour,
      subjectHealth: health,
      chapterProfiles: buildAllChapterProfiles({
        chapters,
        subjects: [subject],
        tasks,
        sessions: [],
        mistakes: [],
        quizzes: [],
        reviewEvents: [],
        today: T.monday,
      }),
      weeklyReviews: [],
      performance,
      today: T.monday,
    });

    const anti = suggestions.find((s) => s.kind === 'anti-procrastination');
    expect(anti).toBeDefined();
    expect(anti?.subjectId).toBe(subject.id);
    expect(anti?.reason.length).toBeGreaterThan(10);
  });

  it('suggests focusing on critical subjects and blocked chapters', () => {
    const chapters = [
      makeChapter({ id: 'c1', subjectId: subject.id, mastery: 0, prerequisiteIds: ['c0'] }),
      makeChapter({ id: 'c0', subjectId: subject.id, mastery: 0 }),
    ];
    const tasks = [makeTask({ subjectId: subject.id, chapterId: 'c1', status: 'skipped' })];
    const health = computeAllSubjectHealth({
      subjects: [subject],
      chapters,
      tasks,
      sessions: [],
      mistakes: [],
      quizzes: [],
      backlog: [makeBacklogItem({ subjectId: subject.id, minutes: 200 })],
      exams: [],
      today: T.monday,
    });

    const profiles = buildAllChapterProfiles({
      chapters,
      subjects: [subject],
      tasks,
      sessions: [],
      mistakes: [],
      quizzes: [],
      reviewEvents: [],
      today: T.monday,
    });

    const days = buildTimeline({ from: T.monday, to: T.monday, plans: [], tasks, sessions: [] });
    const performance = computePerformance({
      from: T.monday,
      to: T.monday,
      label: 'Today',
      days,
      tasks,
      sessions: [],
      subjects: [subject],
      chapters,
      mistakes: [],
      quizzes: [],
    });

    const suggestions = analyzeAdaptationNeeds({
      date: T.monday,
      rules: BASE_RULES,
      behaviour: makeBehaviour(),
      subjectHealth: health,
      chapterProfiles: profiles,
      weeklyReviews: [],
      performance,
      today: T.monday,
    });

    expect(suggestions.some((s) => s.kind === 'focus-subject')).toBe(true);
    expect(suggestions.some((s) => s.kind === 'prerequisite-repair')).toBe(true);
  });

  it('suggests recall boost when many chapters overdue', () => {
    const chapters = [
      makeChapter({ id: 'c1', lastRevisionDate: addDays(T.monday, -10), nextRevisionDate: addDays(T.monday, -3) }),
      makeChapter({ id: 'c2', lastRevisionDate: addDays(T.monday, -12), nextRevisionDate: addDays(T.monday, -2) }),
      makeChapter({ id: 'c3', lastRevisionDate: addDays(T.monday, -15), nextRevisionDate: addDays(T.monday, -1) }),
    ];
    const profiles = buildAllChapterProfiles({
      chapters,
      subjects: [subject],
      tasks: chapters.map((c) => makeTask({ chapterId: c.id, status: 'done', actualMin: 60 })),
      sessions: chapters.map((c) => makeSession({ chapterId: c.id, date: T.monday })),
      mistakes: [],
      quizzes: [],
      reviewEvents: [],
      today: T.monday,
    });

    const days = buildTimeline({ from: T.monday, to: T.monday, plans: [], tasks: [], sessions: [] });
    const performance = computePerformance({
      from: T.monday,
      to: T.monday,
      label: 'Today',
      days,
      tasks: [],
      sessions: [],
      subjects: [subject],
      chapters,
      mistakes: [],
      quizzes: [],
    });

    const suggestions = analyzeAdaptationNeeds({
      date: T.monday,
      rules: BASE_RULES,
      behaviour: makeBehaviour(),
      subjectHealth: [],
      chapterProfiles: profiles,
      weeklyReviews: [],
      performance,
      today: T.monday,
    });

    expect(suggestions.some((s) => s.kind === 'recall-boost')).toBe(true);
  });

  it('generates adaptation plan with adjusted rules', () => {
    const behaviour = makeBehaviour({ overshootRatio: 0.4, completionRate7d: 0.4, sessionsLast7d: 5 });
    const tasks = Array.from({ length: 6 }, (_, i) => makeTask({ id: `t${i}`, planDate: T.monday, status: i < 2 ? 'done' : 'skipped', actualMin: 60, plannedMin: 60 }));
    const sessions = tasks.filter((t) => t.status === 'done').map((t) => makeSession({ date: t.planDate, durationMin: 80, effectiveMin: 70 }));
    const days = buildTimeline({ from: T.monday, to: T.monday, plans: [], tasks, sessions });
    const performance = computePerformance({
      from: T.monday,
      to: T.monday,
      label: 'Today',
      days,
      tasks,
      sessions,
      subjects: [subject],
      chapters: [makeChapter()],
      mistakes: [],
      quizzes: [],
    });

    const plan = generateAdaptationPlan({
      date: T.monday,
      rules: BASE_RULES,
      behaviour,
      subjectHealth: computeAllSubjectHealth({
        subjects: [subject],
        chapters: [makeChapter()],
        tasks,
        sessions,
        mistakes: [],
        quizzes: [],
        backlog: [],
        exams: [],
        today: T.monday,
      }),
      chapterProfiles: buildAllChapterProfiles({
        chapters: [makeChapter()],
        subjects: [subject],
        tasks,
        sessions,
        mistakes: [],
        quizzes: [],
        reviewEvents: [],
        today: T.monday,
      }),
      weeklyReviews: generateLastNWeeklyReviews({
        today: T.monday,
        tasks,
        sessions,
        subjects: [subject],
        chapters: [makeChapter()],
        mistakes: [],
        reviews: [],
        backlog: [],
        checkIns: [],
        n: 2,
      }),
      performance,
      today: T.monday,
    });

    expect(plan.suggestions.length).toBeGreaterThan(0);
    expect(plan.rationale.length).toBeGreaterThan(10);
    expect(plan.evidence.behaviourSample).toBe(5);
    // at least one suggestion should have a rule change
    expect(plan.suggestions.some((s) => s.suggestedChange)).toBe(true);
  });

  it('applies adaptations to rules transparently', () => {
    const rules = { ...BASE_RULES, maxBlockMin: 60, maxDailyMin: 300 };
    const suggestions = [
      {
        id: 's1',
        kind: 'reduce-block-size' as const,
        text: 'Reduce block',
        reason: 'Overshoot',
        evidence: 'Overshoot 50%',
        impact: 'high' as const,
        priority: 90,
        actionable: true,
        suggestedChange: { field: 'maxBlockMin' as const, from: 60, to: 40, explanation: 'Reduce' },
        evidenceSampleSize: 5,
      },
      {
        id: 's2',
        kind: 'reduce-scope' as const,
        text: 'Reduce scope',
        reason: 'Low completion',
        evidence: 'Completion 40%',
        impact: 'high' as const,
        priority: 85,
        actionable: true,
        suggestedChange: { field: 'maxDailyMin' as const, from: 300, to: 240, explanation: 'Reduce daily' },
        evidenceSampleSize: 5,
      },
    ];

    const result = applyAdaptationsToRules(rules, suggestions);
    expect(result.rules.maxBlockMin).toBe(40);
    expect(result.rules.maxDailyMin).toBe(240);
    expect(result.applied.length).toBe(2);
    expect(result.rationale).toContain('Applied 2 adaptation');
  });

  it('keeps recommendations explainable with reasons and evidence', () => {
    const behaviour = makeBehaviour({ skipCountBySubject: { [subject2.id]: 2 }, strugglingSubjectIds: [subject.id], sessionsLast7d: 4 });
    const chapters = [makeChapter({ id: 'c1', subjectId: subject.id, mastery: 1 }), makeChapter({ id: 'c2', subjectId: subject2.id, mastery: 2 })];
    const tasks = [
      makeTask({ subjectId: subject.id, chapterId: 'c1', status: 'done', actualMin: 60 }),
      makeTask({ subjectId: subject2.id, chapterId: 'c2', status: 'skipped' }),
      makeTask({ subjectId: subject2.id, chapterId: 'c2', status: 'skipped' }),
    ];
    const days = buildTimeline({ from: T.monday, to: T.monday, plans: [], tasks, sessions: [] });
    const performance = computePerformance({
      from: T.monday,
      to: T.monday,
      label: 'Today',
      days,
      tasks,
      sessions: [],
      subjects: [subject, subject2],
      chapters,
      mistakes: [],
      quizzes: [],
    });

    const suggestions = analyzeAdaptationNeeds({
      date: T.monday,
      rules: BASE_RULES,
      behaviour,
      subjectHealth: computeAllSubjectHealth({
        subjects: [subject, subject2],
        chapters,
        tasks,
        sessions: [],
        mistakes: [],
        quizzes: [],
        backlog: [],
        exams: [],
        today: T.monday,
      }),
      chapterProfiles: buildAllChapterProfiles({
        chapters,
        subjects: [subject, subject2],
        tasks,
        sessions: [],
        mistakes: [],
        quizzes: [],
        reviewEvents: [],
        today: T.monday,
      }),
      weeklyReviews: [],
      performance,
      today: T.monday,
    });

    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(s.reason.length).toBeGreaterThan(10);
      expect(s.evidence.length).toBeGreaterThan(10);
      expect(s.text.length).toBeGreaterThan(10);
      expect(s.priority).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(s.impact);
    }
  });
});
