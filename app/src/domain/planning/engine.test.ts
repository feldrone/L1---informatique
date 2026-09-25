/**
 * Engine unit tests: spaced review, mastery estimation, priority configuration and recovery presets.
 */

import { describe, expect, it } from 'vitest';
import {
  assessRecall,
  nextIntervalIndex,
  scheduleReview,
  dueRevisions,
  DEFAULT_INTERVALS,
} from './revision';
import { collectMasterySignals, estimateMastery } from './mastery';
import { computeSubjectPriorities, DEFAULT_PRIORITY_CONFIG } from './priority';
import {
  classifyMissedWork,
  dailyRecoveryBudget,
  dependencyDepth,
  generateRecoveryPlan,
  recoveryModeForMissedDays,
} from './recovery';
import {
  BASE_RULES,
  makeBacklogItem,
  makeChapter,
  makeRecoveryInput,
  makeSession,
  makeSubject,
  makeTask,
  T,
} from '../testing/fixtures';
import { addDays, daysBetween } from '../date';

describe('spaced review scheduler', () => {
  it('reduces the interval on failed recall', () => {
    const chapter = makeChapter({ reviewIntervalIndex: 3, lastRevisionDate: T.monday });
    const result = scheduleReview({ chapter, date: T.thursday, recallScore: 0.2, eventId: 'e1' });
    expect(result.outcome).toBe('fail');
    expect(result.index).toBe(2);
    expect(result.intervalDays).toBe(DEFAULT_INTERVALS[2]);
    expect(daysBetween(T.thursday, result.nextDue)).toBe(result.intervalDays);
  });

  it('holds the interval on partial recall and extends it on strong recall', () => {
    const chapter = makeChapter({ reviewIntervalIndex: 1 });
    expect(scheduleReview({ chapter, date: T.monday, recallScore: 0.6, eventId: 'e' }).index).toBe(1);
    expect(scheduleReview({ chapter, date: T.monday, recallScore: 0.95, eventId: 'e' }).index).toBe(2);
    expect(assessRecall(0.95).outcome).toBe('strong');
    expect(nextIntervalIndex(0, 'fail')).toBe(0); // never below the first interval
  });

  it('reports due revisions in date order', () => {
    const chapters = [
      makeChapter({ id: 'c1', nextRevisionDate: addDays(T.monday, -1) }),
      makeChapter({ id: 'c2', nextRevisionDate: T.monday }),
      makeChapter({ id: 'c3', nextRevisionDate: addDays(T.monday, 5) }),
    ];
    expect(dueRevisions(chapters, T.monday).map((c) => c.id)).toEqual(['c1', 'c2']);
  });
});

describe('mastery estimator', () => {
  const base = {
    tasks: [] as ReturnType<typeof makeTask>[],
    sessions: [] as ReturnType<typeof makeSession>[],
    quizAccuracy: null as number | null,
    quizSamples: 0,
    mistakesOpen: 0,
    date: T.monday,
  };

  it('never turns a single successful attempt into "mastered"', () => {
    const chapter = makeChapter();
    const signals = collectMasterySignals({
      chapter,
      ...base,
      tasks: [makeTask({ chapterId: chapter.id, type: 'COURSE', status: 'done', actualMin: 60 })],
    });
    const estimate = estimateMastery(signals, 0);
    expect(estimate.level).toBeLessThanOrEqual(2);
    expect(estimate.reasons.join(' ')).not.toMatch(/exam-ready/i);
  });

  it('requires repeated evidence before reaching exam-ready', () => {
    const chapter = makeChapter();
    const tasks = [
      ...Array.from({ length: 4 }, (_, i) =>
        makeTask({ id: `t${i}`, chapterId: chapter.id, type: 'COURSE', status: 'done', actualMin: 60 }),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        makeTask({ id: `p${i}`, chapterId: chapter.id, type: 'PRACTICE', status: 'done', actualMin: 50 }),
      ),
    ];
    const sessions = [
      makeSession({ chapterId: chapter.id, activeRecall: true, recallScore: 0.9 }),
      makeSession({ id: 's2', chapterId: chapter.id, activeRecall: true, recallScore: 0.85 }),
    ];
    const signals = collectMasterySignals({
      chapter,
      ...base,
      tasks,
      sessions,
      quizAccuracy: 0.85,
      quizSamples: 12,
    });
    expect(estimateMastery(signals, 3).level).toBe(5);
  });

  it('lowers the proposal when recall fails', () => {
    const chapter = makeChapter();
    const tasks = Array.from({ length: 3 }, (_, i) =>
      makeTask({ id: `t${i}`, chapterId: chapter.id, type: 'PRACTICE', status: 'done', actualMin: 50 }),
    );
    const sessions = [
      makeSession({ chapterId: chapter.id, activeRecall: true, recallScore: 0.9 }),
      makeSession({ id: 's2', chapterId: chapter.id, activeRecall: true, recallScore: 0.2 }),
    ];
    const signals = collectMasterySignals({
      chapter,
      ...base,
      tasks,
      sessions,
      quizAccuracy: 0.9,
      quizSamples: 10,
    });
    expect(estimateMastery(signals, 5).level).toBeLessThan(5);
  });
});

describe('priority engine', () => {
  it('is configurable and exposes its factors', () => {
    const subject = makeSubject();
    const [priority] = computeSubjectPriorities({
      date: T.monday,
      subjects: [subject],
      chapters: [makeChapter({ mastery: 1 })],
      exams: [],
      sessions: [],
      overdueTasks: [],
    });
    expect(priority.factors.weight).toBeGreaterThan(0.5);
    expect(priority.normalized).toBeCloseTo(100, 0);
    expect(priority.reasons.length).toBeGreaterThan(0);

    const [custom] = computeSubjectPriorities({
      date: T.monday,
      subjects: [subject],
      chapters: [makeChapter({ mastery: 1 })],
      exams: [],
      sessions: [],
      overdueTasks: [],
      config: { weaknessWeight: 0 },
    });
    expect(custom.factors.weakness).toBe(1);
    expect(DEFAULT_PRIORITY_CONFIG.urgencyHalfLifeDays).toBeGreaterThan(0);
  });
});

describe('recovery engine', () => {
  it('maps missed-day counts to progressive modes', () => {
    expect(recoveryModeForMissedDays(0)).toBe('A');
    expect(recoveryModeForMissedDays(1)).toBe('A');
    expect(recoveryModeForMissedDays(2)).toBe('B');
    expect(recoveryModeForMissedDays(3)).toBe('B');
    expect(recoveryModeForMissedDays(6)).toBe('C');
    expect(recoveryModeForMissedDays(12)).toBe('D');
  });

  it('never exceeds the configured daily maximum for recovery additions', () => {
    const budget = dailyRecoveryBudget('C', makeRecoveryInput({ rules: BASE_RULES }));
    expect(budget).toBeLessThanOrEqual(BASE_RULES.maxDailyMin);
  });

  it('honours the "recover today" preset with a single-day horizon', () => {
    const plan = generateRecoveryPlan(
      makeRecoveryInput({
        missedDays: 2,
        preset: 'today',
        todayCapacityMin: 150,
        backlog: [makeBacklogItem({ minutes: 60 })],
      }),
    );
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].totalMin).toBeLessThanOrEqual(plan.days[0].additions.reduce((a, b) => a + b.minutes, 0));
  });

  it('spreads recovery over 3 days and 7 days on demand', () => {
    const backlog = Array.from({ length: 6 }, (_, i) => makeBacklogItem({ id: `bl-${i}`, minutes: 45 }));
    const three = generateRecoveryPlan(
      makeRecoveryInput({ missedDays: 2, preset: '3d', backlog, todayCapacityMin: 120 }),
    );
    const seven = generateRecoveryPlan(
      makeRecoveryInput({ missedDays: 4, preset: '7d', backlog, todayCapacityMin: 120 }),
    );
    expect(three.horizonDays).toBe(3);
    expect(seven.horizonDays).toBe(7);
    expect(three.days).toHaveLength(3);
    expect(seven.days).toHaveLength(7);
  });

  it('archives long-dead low-impact work in rebuild mode instead of piling it up', () => {
    const old = makeBacklogItem({
      id: 'old-1',
      originalDate: addDays(T.monday, -30),
      minutes: 30,
      title: 'Ancient low-value task on a mastered chapter',
    });
    const plan = generateRecoveryPlan(
      makeRecoveryInput({
        missedDays: 20,
        preset: 'rebuild',
        // mastered chapter + low coefficient ⇒ score 0.45: below the triage bar after 14+ days
        chapters: [makeChapter({ mastery: 5 })],
        backlog: [old],
        todayCapacityMin: 60,
      }),
    );
    expect(plan.mode).toBe('D');
    expect(plan.droppedItems.length).toBeGreaterThan(0);
    expect(plan.rationale).toMatch(/archived/i);
  });

  it('scores prerequisite items above leaf items', () => {
    const chapters = [
      makeChapter({ id: 'c1', order: 0 }),
      makeChapter({ id: 'c2', order: 1, prerequisiteIds: ['c1'] }),
      makeChapter({ id: 'c3', order: 2, prerequisiteIds: ['c2'] }),
    ];
    expect(dependencyDepth('c1', chapters)).toBe(2);
    expect(dependencyDepth('c3', chapters)).toBe(0);

    const classifications = classifyMissedWork(
      makeRecoveryInput({
        missedDays: 1,
        chapters,
        backlog: [
          makeBacklogItem({ id: 'root', chapterId: 'c1', minutes: 60 }),
          makeBacklogItem({ id: 'leaf', chapterId: 'c3', minutes: 60 }),
        ],
      }),
    );
    expect(classifications[0].item.id).toBe('root');
    expect(classifications[0].score).toBeGreaterThan(classifications[1].score);
  });

  it('keeps deferred work in the backlog rather than dropping it (modes A–C)', () => {
    const backlog = Array.from({ length: 10 }, (_, i) => makeBacklogItem({ id: `bl-${i}`, minutes: 60 }));
    const plan = generateRecoveryPlan(
      makeRecoveryInput({ missedDays: 1, preset: 'today', backlog, todayCapacityMin: 60 }),
    );
    expect(plan.deferredItems.length).toBeGreaterThan(0);
    expect(plan.droppedItems).toHaveLength(0);
  });
});
