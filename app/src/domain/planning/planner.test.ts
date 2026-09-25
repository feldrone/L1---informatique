/**
 * Required algorithm test cases (spec §45) — 15 scenarios, deterministic, no I/O.
 */

import { describe, expect, it } from 'vitest';
import { generateDailyPlan, computeFreeWindows } from './planner';
import { computeSubjectPriorities } from './priority';
import { generateRecoveryPlan, recoveryModeForMissedDays } from './recovery';
import { addDays, dayOfWeek } from '../date';
import {
  BASE_RULES,
  makeChapter,
  makeCheckIn,
  makeClass,
  makeContext,
  makeExam,
  makeSubject,
  makeTask,
  NEUTRAL_BEHAVIOUR,
  T,
} from '../testing/fixtures';

const analyse = makeSubject();
const algebre = makeSubject({
  id: 'sub-algebre1',
  name: 'Algèbre 1',
  shortName: 'Algèbre 1',
  coefficient: 2,
  color: '#8b5cf6',
  sortOrder: 1,
});
const chapters = [
  makeChapter(),
  makeChapter({ id: 'an1-c2', order: 1, title: 'Ch II — Complexes', mastery: 2, prerequisiteIds: ['an1-c1'] }),
  makeChapter({ id: 'an1-c3', order: 2, title: 'Ch III — Suites', mastery: 3, prerequisiteIds: ['an1-c2'] }),
];

describe('CASE 1 — normal day', () => {
  it('builds a realistic plan, reserves buffer and explains every task', () => {
    const plan = generateDailyPlan(
      makeContext({
        subjects: [analyse, algebre],
        chapters: [
          ...chapters,
          makeChapter({ id: 'al1-c1', subjectId: 'sub-algebre1', title: 'Ch 1 — Logique', mastery: 1 }),
        ],
        checkIn: makeCheckIn({ availableMin: 240, energy: 4 }),
      }),
    );

    expect(plan.mode).toBe('normal');
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.bufferMin).toBeGreaterThan(0);
    expect(plan.plannedMin).toBeLessThanOrEqual(plan.availableMin - plan.bufferMin);
    expect(plan.plannedMin).toBe(plan.tasks.reduce((acc, t) => acc + t.plannedMin, 0));

    for (const task of plan.tasks) {
      expect(task.plannedMin).toBeGreaterThanOrEqual(10);
      expect(task.reasons.length).toBeGreaterThan(0);
      expect(task.subjectId).not.toBeNull();
      expect(task.priorityLabel.length).toBeGreaterThan(0);
      expect(task.key).toMatch(/^task-/);
    }
    expect(plan.allocation.length).toBeGreaterThanOrEqual(2);
    expect(plan.rationale).toContain('Standard day');
  });

  it('is deterministic: same context ⇒ same plan', () => {
    const ctx = makeContext({ subjects: [analyse], chapters, checkIn: makeCheckIn({ availableMin: 180 }) });
    const a = generateDailyPlan(ctx);
    const b = generateDailyPlan(ctx);
    expect(b.tasks.map((t) => [t.key, t.plannedMin, t.type])).toEqual(
      a.tasks.map((t) => [t.key, t.plannedMin, t.type]),
    );
  });
});

describe('CASE 2 — one missed day', () => {
  it('switches to recovery, caps recovery work and never pushes everything to today', () => {
    const overdue = [1, 2, 3].map((i) =>
      makeTask({
        id: `overdue-${i}`,
        planDate: addDays(T.monday, -1),
        plannedMin: 60,
        priority: 70,
        status: 'skipped',
      }),
    );
    const plan = generateDailyPlan(
      makeContext({
        date: T.monday,
        subjects: [analyse],
        chapters,
        overdueTasks: overdue,
        missedDays: 1,
        checkIn: makeCheckIn({ availableMin: 240 }),
      }),
    );

    expect(plan.mode).toBe('recovery');
    const recoveryMin = plan.tasks
      .filter((t) => t.type === 'RECOVERY')
      .reduce((acc, t) => acc + t.plannedMin, 0);
    const usable = plan.availableMin - plan.bufferMin;
    expect(recoveryMin).toBeGreaterThan(0);
    expect(recoveryMin).toBeLessThanOrEqual(Math.round(usable * BASE_RULES.recoveryShareRecovery) + 1);
    expect(plan.notes.join(' ')).toMatch(/missed day/i);
  });
});

describe('CASE 3 — three missed days', () => {
  it('classifies the backlog and distributes it over several days (MODE B)', () => {
    expect(recoveryModeForMissedDays(3)).toBe('B');

    const backlog = [0, 1, 2, 3, 4, 5].map((i) => ({
      id: `bl-${i}`,
      taskId: null,
      subjectId: 'sub-analyse1',
      chapterId: 'an1-c1',
      originalDate: addDays(T.monday, -2),
      minutes: 45,
      type: 'COURSE' as const,
      title: `Missed ${i}`,
      urgency: 0,
      weight: 0,
      dependencyDepth: 0,
      masteryImpact: 0,
      score: 0,
      classification: 'distribute' as const,
      state: 'open' as const,
      plannedFor: null,
      createdAt: '2026-10-03T08:00:00.000Z',
    }));

    const plan = generateRecoveryPlan({
      date: T.monday,
      missedDays: 3,
      overdueTasks: [],
      backlog,
      subjects: [analyse],
      chapters,
      exams: [],
      rules: BASE_RULES,
      todayCapacityMin: 120,
      preset: 'auto',
    });

    expect(plan.mode).toBe('B');
    expect(plan.days.length).toBeGreaterThan(1);
    expect(plan.days.some((d) => d.totalMin > 0)).toBe(true);
    const budget = Math.round(Math.min(BASE_RULES.maxDailyMin * 0.45, 120));
    for (const day of plan.days) expect(day.totalMin).toBeLessThanOrEqual(budget);
    expect(plan.recoverableMin + plan.deferMin + plan.droppedMin).toBeLessThanOrEqual(plan.overdueMin);
  });
});

describe('CASE 4 — seven missed days', () => {
  it('uses MODE C, refuses to recover every lost hour and archives dead low-impact work', () => {
    const backlog = Array.from({ length: 16 }, (_, i) => ({
      id: `bl-${i}`,
      taskId: null,
      subjectId: 'sub-analyse1',
      chapterId: 'an1-c1',
      originalDate: addDays(T.monday, -(10 + i)),
      minutes: 50,
      type: 'COURSE' as const,
      title: `Old missed block ${i}`,
      urgency: 0,
      weight: 0,
      dependencyDepth: 0,
      masteryImpact: 0,
      score: 0,
      classification: 'distribute' as const,
      state: 'open' as const,
      plannedFor: null,
      createdAt: '2026-09-01T08:00:00.000Z',
    }));

    const plan = generateRecoveryPlan({
      date: T.monday,
      missedDays: 7,
      overdueTasks: [],
      backlog,
      subjects: [analyse],
      chapters,
      exams: [],
      rules: BASE_RULES,
      todayCapacityMin: 150,
      preset: 'auto',
    });

    expect(plan.mode).toBe('C');
    expect(plan.overdueMin).toBeGreaterThan(plan.recoverableMin);
    expect(plan.deferMin).toBeGreaterThan(0);
    expect(plan.warnings.join(' ')).toMatch(/do not try to recover every missed hour/i);
  });
});

describe('CASE 5 — exam in 3 days', () => {
  it('activates EXAM MODE with timed practice and reduced low-value reading', () => {
    const plan = generateDailyPlan(
      makeContext({
        date: T.monday,
        subjects: [analyse],
        chapters,
        exams: [makeExam({ date: addDays(T.monday, 3) })],
        checkIn: makeCheckIn({ availableMin: 240 }),
      }),
    );
    expect(plan.mode).toBe('exam');
    expect(plan.tasks.some((t) => t.type === 'ASSESSMENT')).toBe(true);
    expect(plan.tasks.some((t) => t.type === 'REVISION')).toBe(true);
    expect(plan.notes.join(' ')).toMatch(/Exam mode/i);
  });
});

describe('CASE 6 — weak high-weight subject', () => {
  it('ranks the weak high-coefficient subject above the strong low-coefficient one', () => {
    const priorities = computeSubjectPriorities({
      date: T.monday,
      subjects: [analyse, algebre],
      chapters: [
        makeChapter({ id: 'a-1', subjectId: 'sub-analyse1', mastery: 0 }),
        makeChapter({ id: 'a-2', subjectId: 'sub-analyse1', mastery: 1, order: 1 }),
        makeChapter({ id: 'b-1', subjectId: 'sub-algebre1', mastery: 5 }),
      ],
      exams: [],
      sessions: [],
      overdueTasks: [],
    });
    expect(priorities[0].subjectId).toBe('sub-analyse1');
    expect(priorities[0].factors.coefficient).toBe(4);
    expect(priorities[0].reasons.join(' ')).toMatch(/coefficient/i);
  });
});

describe('CASE 7 — large backlog', () => {
  it('protects high-value work and defers the rest instead of overloading the day', () => {
    const backlog = Array.from({ length: 12 }, (_, i) => ({
      id: `bl-${i}`,
      taskId: null,
      subjectId: 'sub-analyse1',
      chapterId: 'an1-c1',
      originalDate: addDays(T.monday, -1),
      minutes: 60,
      type: 'COURSE' as const,
      title: `Backlog ${i}`,
      urgency: 0,
      weight: 0,
      dependencyDepth: 0,
      masteryImpact: 0,
      score: 0,
      classification: 'distribute' as const,
      state: 'open' as const,
      plannedFor: null,
      createdAt: '2026-10-04T08:00:00.000Z',
    }));
    const plan = generateRecoveryPlan({
      date: T.monday,
      missedDays: 2,
      overdueTasks: [],
      backlog,
      subjects: [analyse],
      chapters,
      exams: [],
      rules: BASE_RULES,
      todayCapacityMin: 90,
      preset: 'auto',
    });
    expect(plan.deferMin).toBeGreaterThan(0);
    expect(plan.days[0].totalMin).toBeLessThanOrEqual(120);
    expect(plan.warnings.length).toBeGreaterThan(0);
  });
});

describe('CASE 8 — very limited available study time', () => {
  it('falls back to a minimum viable day instead of an unrealistic schedule', () => {
    const plan = generateDailyPlan(
      makeContext({ subjects: [analyse], chapters, checkIn: makeCheckIn({ availableMin: 45, energy: 3 }) }),
    );
    expect(plan.mode).toBe('minimum-viable');
    expect(plan.tasks.length).toBeLessThanOrEqual(4);
    expect(plan.plannedMin).toBeLessThanOrEqual(plan.availableMin - plan.bufferMin + 1);
    expect(plan.rationale).toMatch(/Minimum viable day/);
  });
});

describe('CASE 9 — unexpected university class', () => {
  it('removes class time from the free windows and caps the plan accordingly', () => {
    const unexpected = [
      makeClass({ id: 'c1', dayOfWeek: dayOfWeek(T.monday), startTime: '08:00', endTime: '10:00' }),
      makeClass({ id: 'c2', dayOfWeek: dayOfWeek(T.monday), startTime: '10:00', endTime: '12:00' }),
      makeClass({ id: 'c3', dayOfWeek: dayOfWeek(T.monday), startTime: '14:00', endTime: '16:00' }),
    ];
    const windows = computeFreeWindows(T.monday, unexpected, BASE_RULES);
    const freeMinutes = windows.reduce((acc, w) => acc + (w.endMin - w.startMin), 0);
    expect(freeMinutes).toBeLessThan(14 * 60);

    const plan = generateDailyPlan(
      makeContext({
        subjects: [analyse],
        chapters,
        timetable: unexpected,
        checkIn: makeCheckIn({ availableMin: 240 }),
      }),
    );
    expect(plan.availableMin).toBeLessThanOrEqual(freeMinutes);
    expect(plan.notes.join(' ')).toMatch(/university class\(es\) today/i);
  });
});

describe('CASE 10 — multiple simultaneous deadlines', () => {
  it('serves both subjects and reports them in the allocation', () => {
    const sm1 = makeSubject({ id: 'sub-sm1', name: 'Structure machine 1', shortName: 'SM1', sortOrder: 2 });
    const plan = generateDailyPlan(
      makeContext({
        date: T.monday,
        subjects: [analyse, sm1],
        chapters: [
          ...chapters,
          makeChapter({
            id: 'sm1-c1',
            subjectId: 'sub-sm1',
            title: 'Ch 1 — Introduction',
            mastery: 1,
            prerequisiteIds: [],
          }),
        ],
        exams: [
          makeExam({ id: 'e1', subjectId: 'sub-analyse1', date: addDays(T.monday, 4), name: 'EMD Analyse' }),
          makeExam({
            id: 'e2',
            subjectId: 'sub-sm1',
            date: addDays(T.monday, 5),
            name: 'EMD SM1',
          }),
        ],
        checkIn: makeCheckIn({ availableMin: 300 }),
      }),
    );
    const subjectsInPlan = new Set(plan.tasks.map((t) => t.subjectId));
    expect(subjectsInPlan.has('sub-analyse1')).toBe(true);
    expect(subjectsInPlan.has('sub-sm1')).toBe(true);
    expect(plan.allocation.length).toBeGreaterThanOrEqual(2);
  });
});

describe('CASE 11 — user repeatedly skips the same task', () => {
  it('shrinks the task to a 10-minute start block instead of stacking reminders', () => {
    const plan = generateDailyPlan(
      makeContext({
        subjects: [analyse],
        chapters,
        behaviour: { ...NEUTRAL_BEHAVIOUR, skipCountBySubject: { 'sub-analyse1': 3 }, completionRate7d: 0.3 },
        checkIn: makeCheckIn({ availableMin: 240 }),
      }),
    );
    const startTask = plan.tasks.find((t) => t.title.startsWith('Start 10-minute session'));
    expect(startTask).toBeDefined();
    expect(startTask?.plannedMin).toBe(10);
    expect(plan.notes.join(' ')).toMatch(/skipped repeatedly/i);
  });
});

describe('CASE 12 — user completes tasks faster than estimated', () => {
  it('raises the challenge and says so', () => {
    const baseline = generateDailyPlan(makeContext({ subjects: [analyse], chapters, checkIn: makeCheckIn({ availableMin: 240 }) }));
    const faster = generateDailyPlan(
      makeContext({
        subjects: [analyse],
        chapters,
        behaviour: { ...NEUTRAL_BEHAVIOUR, undershootRatio: 0.35, sessionsLast7d: 5 },
        checkIn: makeCheckIn({ availableMin: 240 }),
      }),
    );
    const baselineTotal = baseline.plannedMin;
    expect(faster.plannedMin).toBeGreaterThanOrEqual(baselineTotal);
    expect(faster.notes.join(' ')).toMatch(/finishing early/i);
    const maxBlock = Math.max(...faster.tasks.map((t) => t.plannedMin));
    expect(maxBlock).toBeLessThanOrEqual(BASE_RULES.maxBlockMin);
  });
});

describe('CASE 13 — user repeatedly exceeds estimated duration', () => {
  it('splits and shortens blocks based on measured overrun', () => {
    const plan = generateDailyPlan(
      makeContext({
        subjects: [analyse],
        chapters,
        behaviour: { ...NEUTRAL_BEHAVIOUR, overshootRatio: 0.6 },
        checkIn: makeCheckIn({ availableMin: 240 }),
      }),
    );
    expect(plan.notes.join(' ')).toMatch(/over estimate/i);
    expect(Math.max(...plan.tasks.map((t) => t.plannedMin))).toBeLessThanOrEqual(60);
  });
});

describe('CASE 14 — minimum viable day', () => {
  it('keeps continuity with 4 light blocks and an explicit rationale', () => {
    const plan = generateDailyPlan(
      makeContext({
        subjects: [analyse],
        chapters,
        checkIn: makeCheckIn({ availableMin: 200, energy: 1 }),
      }),
    );
    expect(plan.mode).toBe('minimum-viable');
    expect(plan.tasks.length).toBeGreaterThanOrEqual(2);
    expect(plan.tasks.length).toBeLessThanOrEqual(4);
    expect(plan.notes.join(' ')).toMatch(/Minimum viable day/);
    expect(plan.tasks.every((t) => t.priorityLabel.length > 0)).toBe(true);
  });
});

describe('CASE 15 — exam mode', () => {
  it('protects revision cycles, raises recall and reduces low-value reading', () => {
    const plan = generateDailyPlan(
      makeContext({
        date: T.monday,
        subjects: [analyse, algebre],
        chapters: [
          ...chapters,
          makeChapter({ id: 'al1-c1', subjectId: 'sub-algebre1', title: 'Ch 1 — Logique', mastery: 2 }),
        ],
        exams: [makeExam({ date: addDays(T.monday, 2) })],
        checkIn: makeCheckIn({ availableMin: 300, energy: 4 }),
      }),
    );
    expect(plan.mode).toBe('exam');
    const types = plan.tasks.map((t) => t.type);
    expect(types).toContain('ASSESSMENT');
    expect(types.filter((t) => t === 'REVISION' || t === 'MEMORY').length).toBeGreaterThanOrEqual(1);
    const courseTasks = plan.tasks.filter((t) => t.type === 'COURSE');
    expect(courseTasks.length).toBeLessThanOrEqual(1);
    const recoveryMin = plan.tasks
      .filter((t) => t.type === 'RECOVERY')
      .reduce((acc, t) => acc + t.plannedMin, 0);
    expect(recoveryMin).toBeLessThanOrEqual(Math.round((plan.availableMin - plan.bufferMin) * 0.25) + 1);
  });
});
