/**
 * Data-layer tests: migrations, idempotency, repository round-trip, seed policy and backup/restore.
 */

import { describe, expect, it } from 'vitest';
import { openMemoryDatabase, openDatabaseFromBytes, type DbClient } from './database';
import { LATEST_SCHEMA_VERSION, getSchemaVersion, MIGRATIONS } from './migrations';
import { Repository } from './repo';
import { applySeed, isSeeded } from './seed';
import { makeChapter, makeSession, makeSubject, makeTask, T } from '../domain/testing/fixtures';
import { DEFAULT_RULES } from '../domain/seed/academic';

async function freshDb(): Promise<{ client: DbClient; repo: Repository }> {
  const client = await openMemoryDatabase();
  return { client, repo: new Repository(client) };
}

describe('migrations', () => {
  it('applies every migration and records the schema version', async () => {
    const { client } = await freshDb();
    expect(getSchemaVersion(client.db)).toBe(LATEST_SCHEMA_VERSION);
    const tables = client
      .all<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table'`)
      .map((r) => r.name);
    for (const table of [
      'subjects',
      'chapters',
      'university_classes',
      'daily_plans',
      'study_tasks',
      'study_sessions',
      'check_ins',
      'daily_reviews',
      'exams',
      'quizzes',
      'mistakes',
      'review_events',
      'backlog_items',
      'goals',
      'habits',
      'achievements',
      'events',
      'insights',
      'mastery_history',
    ]) {
      expect(tables).toContain(table);
    }
  });

  it('is idempotent (running the migrator twice changes nothing)', async () => {
    const { client } = await freshDb();
    const before = client.exportBytes().length;
    // re-running the module-level migrator on an up-to-date database is a no-op
    const { runMigrations } = await import('./migrations');
    expect(runMigrations(client.db)).toBe(LATEST_SCHEMA_VERSION);
    expect(client.exportBytes().length).toBe(before);
    expect(MIGRATIONS.length).toBeGreaterThanOrEqual(2);
  });
});

describe('seeding', () => {
  it('seeds the verified academic configuration exactly once', async () => {
    const { repo } = await freshDb();
    expect(isSeeded(repo)).toBe(false);
    applySeed(repo);
    expect(isSeeded(repo)).toBe(true);

    const subjects = repo.listSubjects();
    expect(subjects.length).toBe(8);
    expect(subjects.map((s) => s.code)).toContain('AN1');

    const analyse = subjects.find((s) => s.code === 'AN1');
    expect(analyse?.coefficient).toBe(4);
    expect(analyse?.credits).toBe(6);

    const chapters = repo.listChapters();
    expect(chapters.length).toBeGreaterThan(20);
    // no chapter is invented for modules without a published programme
    expect(chapters.some((c) => c.subjectId === 'sub-histoire')).toBe(false);
    expect(chapters.every((c) => c.mastery === 0)).toBe(true);
    expect(chapters.every((c) => c.masteryManual === null)).toBe(true);

    const classes = repo.listUniversityClasses();
    expect(classes.length).toBeGreaterThan(10);
    expect(classes.some((c) => c.subjectId === 'sub-elec' && c.dayOfWeek === 6)).toBe(true);

    // no fabricated history
    expect(repo.countAll().study_tasks).toBe(0);
    expect(repo.countAll().study_sessions).toBe(0);
    expect(repo.countAll().exams).toBe(0);
    expect(repo.listAchievements()).toHaveLength(0);

    // second call is a no-op
    applySeed(repo);
    expect(repo.listSubjects()).toHaveLength(8);
  });

  it('stores preferences defaults that the planner can use', async () => {
    const { repo } = await freshDb();
    applySeed(repo);
    const prefs = repo.loadPreferences();
    expect(prefs.rules.focusMin).toBe(DEFAULT_RULES.focusMin);
    expect(prefs.rules.maxDailyMin).toBe(DEFAULT_RULES.maxDailyMin);
    expect(prefs.theme).toBe('dark');
  });
});

describe('repository round-trip', () => {
  it('persists tasks, sessions, reviews and settings without losing history', async () => {
    const { repo, client } = await freshDb();
    applySeed(repo);

    const task = makeTask({ id: 'task-1', planDate: T.monday, status: 'done', actualMin: 50 });
    repo.upsertTask(task);
    const loaded = repo.listTasksByDate(T.monday);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].status).toBe('done');
    expect(loaded[0].actualMin).toBe(50);

    const session = makeSession({ id: 'sess-1', date: T.monday, taskId: 'task-1' });
    repo.insertSession(session);
    expect(repo.listSessions()).toHaveLength(1);

    repo.insertReviewEvent({
      id: 'rev-1',
      chapterId: 'an1-c1',
      subjectId: 'sub-analyse1',
      date: T.monday,
      recallScore: 0.9,
      outcome: 'strong',
      intervalDays: 3,
      nextDue: '2026-10-08',
      note: '',
    });
    expect(repo.listReviewEvents()).toHaveLength(1);

    repo.recordMasteryChange('an1-c1', T.monday, 0, 2, 'manual');
    expect(repo.listMasteryHistory('an1-c1')).toHaveLength(1);

    repo.appendEvent({
      id: 'ev-1',
      type: 'task.completed',
      entity: 'study_tasks',
      entityId: 'task-1',
      payloadJson: JSON.stringify({ minutes: 50 }),
    });
    expect(repo.listEvents()).toHaveLength(1);

    // history accumulates: re-saving the same task does not duplicate it
    repo.upsertTask({ ...task, actualMin: 60, updatedAt: `${T.monday}T21:00:00.000Z` });
    expect(repo.listTasksByDate(T.monday)).toHaveLength(1);
    expect(repo.listTasksByDate(T.monday)[0].actualMin).toBe(60);
    expect(repo.listEvents()).toHaveLength(1);

    // settings round-trip
    repo.setSetting('custom', { a: 1 });
    expect(repo.getSetting('custom')).toBe('{"a":1}');
    expect(client.count('settings')).toBeGreaterThan(0);
  });

  it('exports bytes and restores them (backup/restore)', async () => {
    const { repo, client } = await freshDb();
    applySeed(repo);
    repo.upsertSubject(makeSubject({ id: 'sub-extra', code: 'X', name: 'Extra' }));
    repo.upsertChapter(makeChapter({ id: 'x-c1', subjectId: 'sub-extra' }));
    const bytes = client.exportBytes();

    const restored = await openDatabaseFromBytes(bytes);
    const restoredRepo = new Repository(restored);
    expect(restoredRepo.listSubjects().some((s) => s.id === 'sub-extra')).toBe(true);
    expect(restoredRepo.listChapters().some((c) => c.id === 'x-c1')).toBe(true);
    expect(getSchemaVersion(restored.db)).toBe(LATEST_SCHEMA_VERSION);
  });

  it('wipes data on request without touching the schema', async () => {
    const { repo } = await freshDb();
    applySeed(repo);
    repo.wipe();
    expect(repo.countAll().subjects).toBe(0);
    expect(isSeeded(repo)).toBe(false);
    applySeed(repo);
    expect(repo.listSubjects()).toHaveLength(8);
  });
});
