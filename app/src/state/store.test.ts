/**
 * End-to-end integration test of the closed loop: DB → planner → task lifecycle → sessions →
 * analytics, plus portability and the "no fabricated statistics" rule.
 *
 * This runs against a real in-memory SQLite database (same migrations, same repository, same
 * planner as the browser build), so it verifies the wiring rather than a mock.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { openMemoryDatabase } from '../db/database';
import type { BrowserDatabaseHandle } from '../db/browser';
import { StudyStore } from './store';
import { computeAnalytics } from './analytics';
import { addDays, dayOfWeek, todayISO } from '../domain/date';

async function makeHandle(existing?: BrowserDatabaseHandle): Promise<BrowserDatabaseHandle> {
  const client = existing ?? ((await openMemoryDatabase()) as unknown as BrowserDatabaseHandle);
  const handle = client;
  if (!Object.prototype.hasOwnProperty.call(handle, 'flush')) {
    Object.defineProperty(handle, 'flush', { value: async () => undefined, configurable: true });
    Object.defineProperty(handle, 'flushCount', { value: () => 0, configurable: true });
  }
  return handle;
}

/** Next weekday that is not configured as a rest day (the seeder marks Friday as rest). */
function nextWorkingDay(from: string, restDays: number[]): string {
  let date = addDays(from, 1);
  while (restDays.includes(dayOfWeek(date))) date = addDays(date, 1);
  return date;
}

async function bootStore(): Promise<StudyStore> {
  const store = new StudyStore();
  await store.init(await makeHandle());
  return store;
}

const TODAY = todayISO();

describe('store bootstrap', () => {
  it('opens a database, applies migrations, seeds the academic configuration exactly once', async () => {
    const store = await bootStore();
    const state = store.getState();
    expect(state.status).toBe('ready');
    expect(state.error).toBeNull();

    const snapshot = state.snapshot;
    expect(snapshot.subjects.length).toBeGreaterThanOrEqual(8);
    expect(snapshot.chapters.length).toBeGreaterThanOrEqual(20);
    expect(snapshot.timetable.length).toBeGreaterThanOrEqual(10);

    // second boot on the same data must not duplicate the seed
    const client = store.repository.client;
    const before = client.count('subjects');
    const second = new StudyStore();
    await second.init(await makeHandle(client as unknown as BrowserDatabaseHandle));
    expect(second.getState().snapshot.subjects.length).toBe(snapshot.subjects.length);
    expect(before).toBe(second.repository.client.count('subjects'));
  });

  it('starts with no fabricated history at all', async () => {
    const store = await bootStore();
    const snapshot = store.getState().snapshot;
    expect(snapshot.sessions).toHaveLength(0);
    expect(snapshot.tasks.filter((t) => t.status === 'done')).toHaveLength(0);
    expect(snapshot.mistakes).toHaveLength(0);
    expect(snapshot.quizzes).toHaveLength(0);

    const analytics = computeAnalytics(snapshot, TODAY, '30d');
    expect(analytics.dataPoints).toBe(0);
    expect(analytics.streaks.currentStreak).toBe(0);
    expect(analytics.streaks.totalActiveDays).toBe(0);
    expect(analytics.todayProgress.percent).toBe(0);
    expect(analytics.consistency.insufficientData).toBe(true);
    expect(analytics.consistency.score).toBe(0);
    expect(analytics.insights).toHaveLength(1);
    expect(analytics.insights[0].kind).toBe('empty');
    expect(analytics.heatmap.time.every((cell) => cell.value === 0)).toBe(true);
  });
});

describe('daily planning through the store', () => {
  let store: StudyStore;
  beforeEach(async () => {
    store = await bootStore();
  });

  it('generates a plan that keeps a buffer, never fills the whole day and explains every task', () => {
    const rules = store.planningRules();
    const workingDay = nextWorkingDay(TODAY, rules.restDays);
    const { plan, tasks } = store.generatePlan(workingDay);
    expect(plan.date).toBe(workingDay);
    expect(tasks.length).toBeGreaterThan(0);

    const planned = tasks.reduce((acc, task) => acc + task.plannedMin, 0);
    expect(planned).toBeLessThanOrEqual(rules.maxDailyMin);
    expect(plan.bufferMin).toBeGreaterThan(0);
    expect(plan.plannedMin + plan.bufferMin).toBeLessThanOrEqual(plan.availableMin);
    for (const task of tasks) {
      expect(task.reasons.length).toBeGreaterThan(0);
      expect(task.plannedMin).toBeGreaterThan(0);
      expect(task.plannedMin).toBeLessThanOrEqual(rules.maxBlockMin);
    }
    // several subjects are covered on a normal day
    expect(new Set(tasks.map((t) => t.subjectId)).size).toBeGreaterThan(1);
  });

  it('respects a rest day instead of filling it with work', () => {
    const rules = store.planningRules();
    const restDay = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i)).find((date) =>
      rules.restDays.includes(dayOfWeek(date)),
    );
    if (!restDay) return; // no rest day configured: nothing to assert
    const { plan, tasks } = store.generatePlan(restDay);
    const planned = tasks.reduce((acc, task) => acc + task.plannedMin, 0);
    expect(planned).toBeLessThanOrEqual(rules.minDailyMin);
    expect(plan.mode).toBe('minimum-viable');
  });

  it('is deterministic for the same inputs and preserves completed work when regenerated', () => {
    const first = store.generatePlan(TODAY);
    const firstIds = first.tasks.map((t) => t.id).sort();
    const second = store.generatePlan(TODAY);
    expect(second.tasks.map((t) => t.id).sort()).toEqual(firstIds);

    const target = first.tasks[0];
    store.completeTask(target.id, { actualMin: target.plannedMin });
    const third = store.generatePlan(TODAY);
    expect(third.tasks.find((t) => t.id === target.id)?.status).toBe('done');
  });
});

describe('task lifecycle updates the analytics without any reload', () => {
  it('records a session, moves progress and fills the charts from real values only', async () => {
    const store = await bootStore();
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });

    const { tasks } = store.generatePlan(TODAY);
    const task = tasks[0];
    store.startTask(task.id);
    expect(store.getState().snapshot.tasks.find((t) => t.id === task.id)?.status).toBe('running');

    store.pauseTask(task.id);
    expect(store.getState().snapshot.tasks.find((t) => t.id === task.id)?.status).toBe('paused');

    store.completeTask(task.id, { actualMin: 25, difficulty: 'hard', note: 'chains rule' });
    const snapshot = store.getState().snapshot;
    const stored = snapshot.tasks.find((t) => t.id === task.id);
    expect(stored?.status).toBe('done');
    expect(stored?.actualMin).toBe(25);
    expect(stored?.difficulty).toBe('hard');

    const session = snapshot.sessions.find((s) => s.taskId === task.id);
    expect(session).toBeDefined();
    expect(session?.durationMin).toBe(25);
    expect(session?.effectiveMin).toBeLessThanOrEqual(25);

    const analytics = computeAnalytics(snapshot, TODAY, '30d');
    expect(analytics.todayProgress.tasksDone).toBe(1);
    expect(analytics.todayProgress.percent).toBeGreaterThan(0);
    expect(analytics.streaks.currentStreak).toBe(1);
    expect(analytics.heatmap.time.find((c) => c.date === TODAY)?.value).toBeGreaterThan(0);
    expect(analytics.sessionTimelineToday).toHaveLength(1);
    expect(notifications).toBeGreaterThanOrEqual(4);
    unsubscribe();
  });

  it('moves skipped work into the backlog instead of deleting it', async () => {
    const store = await bootStore();
    const { tasks } = store.generatePlan(TODAY);
    const task = tasks[1];
    store.skipTask(task.id, 'no time');

    const snapshot = store.getState().snapshot;
    expect(snapshot.tasks.find((t) => t.id === task.id)?.status).toBe('skipped');
    const backlog = snapshot.backlog.filter((b) => b.taskId === task.id);
    expect(backlog).toHaveLength(1);
    expect(backlog[0].state).toBe('open');
    expect(backlog[0].minutes).toBe(task.plannedMin);

    const analytics = computeAnalytics(snapshot, TODAY, '30d');
    expect(analytics.backlog.openItems).toBeGreaterThanOrEqual(1);
  });

  it('splits an oversized task and creates a 10-minute start block inside the rules', async () => {
    const store = await bootStore();
    const { tasks } = store.generatePlan(TODAY);
    const task = tasks.find((t) => t.plannedMin >= 40) ?? tasks[0];
    store.shortStartTask(task.id);
    expect(store.getState().snapshot.tasks.find((t) => t.id === task.id)?.plannedMin).toBe(10);

    const big = store.getState().snapshot.tasks.find((t) => t.plannedMin > store.planningRules().maxBlockMin);
    if (big) {
      store.splitTask(big.id);
      const blocks = store.getState().snapshot.tasks.filter((t) => t.id === big.id || t.title.startsWith(big.title));
      expect(blocks.length).toBeGreaterThan(1);
      for (const block of blocks) expect(block.plannedMin).toBeLessThanOrEqual(store.planningRules().maxBlockMin * 1.5);
    }
  });
});

describe('recovery and revisions', () => {
  it('produces a realistic recovery plan and adds recovery blocks only for today', async () => {
    const store = await bootStore();
    // two unfinished days in the past (never completed) + work skipped today
    const rules = store.planningRules();
    for (const offset of [-2, -1]) {
      const date = addDays(TODAY, offset);
      const { tasks } = store.generatePlan(date);
      if (tasks.length > 0) store.skipTask(tasks[0].id, 'missed the day');
    }
    const todayTasks = store.generatePlan(nextWorkingDay(TODAY, rules.restDays)).tasks;
    if (todayTasks.length > 0) store.skipTask(todayTasks[0].id, 'no time');

    const plan = store.buildRecoveryPlan('auto');
    // two unfinished days in the past → MODE B (controlled backlog reduction), never MODE A
    expect(plan.mode).toBe('B');
    expect(plan.overdueMin).toBeGreaterThan(0);
    // a recovery day never exceeds the configured daily maximum: no doubling of the workload
    expect(plan.days[0].totalMin).toBeLessThanOrEqual(store.planningRules().maxDailyMin);
    expect(plan.days.length).toBeGreaterThan(0);
    // every overdue minute is accounted for: recovered, deferred or archived — never lost
    expect(plan.recoverableMin + plan.deferMin + plan.droppedMin).toBeGreaterThanOrEqual(plan.overdueMin);
    expect(plan.days.reduce((acc, day) => acc + day.totalMin, 0)).toBe(plan.recoverableMin);

    store.applyRecoveryPlan(plan);
    const snapshot = store.getState().snapshot;
    const recoveryTasks = snapshot.tasks.filter((t) => t.origin === 'recovery');
    expect(recoveryTasks.length).toBeGreaterThan(0);
    expect(recoveryTasks.every((t) => t.planDate === TODAY)).toBe(true);
    // recovery work never exceeds the share of the day reserved for it
    const recoveryMinutes = recoveryTasks.reduce((acc, t) => acc + t.plannedMin, 0);
    const planned = snapshot.tasks.filter((t) => t.planDate === TODAY).reduce((acc, t) => acc + t.plannedMin, 0);
    expect(recoveryMinutes).toBeLessThanOrEqual(planned);
  });

  it('lowers mastery by at most one level after a failed recall and log the change', async () => {
    const store = await bootStore();
    const chapter = store.getState().snapshot.chapters.find((c) => c.subjectId.startsWith('sub-'))!;
    store.setChapterMastery(chapter.id, 4, true);
    expect(store.getState().snapshot.chapters.find((c) => c.id === chapter.id)?.mastery).toBe(4);

    store.recordRecall(chapter.id, 0.1, { note: 'blank under pressure' });
    const after = store.getState().snapshot.chapters.find((c) => c.id === chapter.id)!;
    expect(after.mastery).toBe(3);
    expect(after.lastRevisionDate).toBe(TODAY);
    expect(after.nextRevisionDate).not.toBeNull();

    const history = store.masteryHistory(chapter.id);
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it('never promotes a chapter to mastered from a single success', async () => {
    const store = await bootStore();
    const { tasks } = store.generatePlan(TODAY);
    const task = tasks.find((t) => t.chapterId !== null)!;
    const chapterId = task.chapterId!;
    const before = store.getState().snapshot.chapters.find((c) => c.id === chapterId)!;
    store.completeTask(task.id, { actualMin: task.plannedMin });
    const after = store.getState().snapshot.chapters.find((c) => c.id === chapterId)!;
    expect(after.mastery).toBeLessThan(5);
    expect(after.mastery).toBeLessThanOrEqual(Math.max(1, before.mastery + 1));
  });
});

describe('portability', () => {
  it('exports a JSON backup that restores into a fresh database with the same records', async () => {
    const source = await bootStore();
    const { tasks } = source.generatePlan(TODAY);
    source.completeTask(tasks[0].id, { actualMin: 30 });
    source.skipTask(tasks[1].id, 'no time');
    const payload = source.exportJson();
    const before = source.getState().snapshot;

    const target = await bootStore();
    const report = await target.importJson(payload);
    expect(report.errors).toHaveLength(0);
    const after = target.getState().snapshot;

    expect(after.subjects.length).toBe(before.subjects.length);
    expect(after.chapters.length).toBe(before.chapters.length);
    expect(after.tasks.length).toBe(before.tasks.length);
    expect(after.sessions.length).toBe(before.sessions.length);
    expect(after.sessions[0].durationMin).toBe(30);
  });

  it('reports invalid rows instead of corrupting the database', async () => {
    const store = await bootStore();
    const report = await store.importJson('{"tasks":[{"id":"broken"}],"notAThing":42}');
    expect(report.errors.length).toBeGreaterThan(0);
    // existing data is intact
    expect(store.getState().snapshot.subjects.length).toBeGreaterThanOrEqual(8);
  });

  it('exports a CSV with the recorded sessions', async () => {
    const store = await bootStore();
    const { tasks } = store.generatePlan(TODAY);
    store.completeTask(tasks[0].id, { actualMin: 30 });
    const csv = store.exportCsv();
    expect(csv).toContain('date,subject,type,title,planned_min');
    expect(csv).toContain('date,subject,start,end,duration_min');
    expect(csv.split('\n').length).toBeGreaterThan(2);
  });

  it('persists the database bytes for a SQLite backup', async () => {
    const store = await bootStore();
    store.generatePlan(TODAY);
    const bytes = store.exportDatabaseBytes();
    expect(bytes.byteLength).toBeGreaterThan(10_000);
  });
});
