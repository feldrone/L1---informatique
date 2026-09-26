import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import initSqlJs from 'sql.js';
import { VERIFIED_RESOURCES, learningStage, nextLearningTask, safeYouTubeUrl, selectResources, youtubeThumbnail } from './learning';
import { makeTask } from './testing/fixtures';
import { DbClient, openMemoryDatabase, openDatabaseFromBytes } from '../db/database';
import { MIGRATIONS, runMigrations } from '../db/migrations';
import { Repository } from '../db/repo';
import { applySeed } from '../db/seed';
import { StudyStore } from '../state/store';
import { StudyContext, buildContextValue } from '../state/provider';
import { computeAnalytics } from '../state/analytics';
import { I18nProvider } from '../i18n';
import { LearningPlan } from '../ui/components/learning';
import type { BrowserDatabaseHandle } from '../db/browser';
import { todayISO } from './date';

async function boot() {
  const client = await openMemoryDatabase();
  Object.defineProperty(client, 'flush', { value: async () => undefined });
  const store = new StudyStore();
  await store.init(client as unknown as BrowserDatabaseHandle);
  return { store, client };
}

describe('Phase 4 learning experience', () => {
  it('upgrades a v4 database forward, preserves records, and is idempotent', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    for (const migration of MIGRATIONS.filter(m => m.version <= 4)) for (const sql of migration.statements) db.exec(sql);
    db.exec("INSERT OR REPLACE INTO meta (key,value) VALUES ('schema_version','4'); INSERT INTO settings (key,value_json,updated_at) VALUES ('preserved','true','2026-09-26');");
    expect(runMigrations(db)).toBe(6);
    expect(runMigrations(db)).toBe(6);
    const client = new DbClient(db);
    const repo = new Repository(client);
    expect(repo.getSetting('preserved')).toBe('true');
    expect(repo.listResources()).toHaveLength(5);
    expect(client.all<{ name: string }>('PRAGMA table_info(study_tasks)').map(r => r.name)).toEqual(expect.arrayContaining(['goal','reference','resource_ids_json']));
    client.close();
  });

  it('seeds only the five supplied URLs without inventing topic mappings', async () => {
    const client = await openMemoryDatabase();
    const repo = new Repository(client);
    applySeed(repo); applySeed(repo);
    expect(repo.listResources().map(r => r.url).sort()).toEqual([
      'https://www.youtube.com/watch?v=aaDMXl4FVBg', 'https://www.youtube.com/watch?v=9KAgoYwUH4s',
      'https://www.youtube.com/watch?v=GkRsyvj72YU', 'https://www.youtube.com/@15MinMathLr/playlists',
      'https://www.youtube.com/@hassanbahi',
    ].sort());
    expect(repo.listResources().every(r => r.verified && r.chapterId === null)).toBe(true);
    client.close();
  });

  it('round-trips resource CRUD and removes deleted task references', async () => {
    const client = await openMemoryDatabase();
    const repo = new Repository(client);
    const resource = { ...VERIFIED_RESOURCES[0], title: 'My label' };
    repo.upsertResource(resource);
    expect(repo.listResources().find(r => r.id === resource.id)).toEqual(resource);
    repo.upsertTask(makeTask({ subjectId: null, chapterId: null, resourceIds: [resource.id] }));
    repo.deleteResource(resource.id);
    expect(repo.listResources()).toHaveLength(4);
    expect(repo.listTasks()[0].resourceIds).toEqual([]);
    expect(() => repo.upsertResource({ ...resource, url: 'javascript:alert(1)' })).toThrow();
    client.close();
  });

  it('selects at most three deterministically without mutating input', () => {
    const task = makeTask();
    const before = [...VERIFIED_RESOURCES];
    const selected = selectResources(before, task);
    expect(selected).toHaveLength(3);
    expect(selectResources([...before].reverse(), task)).toEqual(selected);
    expect(before).toEqual(VERIFIED_RESOURCES);
    expect(selectResources([], task)).toEqual([]);
  });

  it('ranks explicit, chapter and subject matches and excludes unrelated or unverified links', () => {
    const task = makeTask({ subjectId: 's', chapterId: 'c', resourceIds: [VERIFIED_RESOURCES[2].id] });
    const resources = VERIFIED_RESOURCES.map((r, i) => ({ ...r, subjectId: i === 4 ? 'other' : 's', chapterId: i === 0 ? 'c' : null }));
    expect(selectResources(resources, task).map(r => r.id)).toEqual([resources[2].id, resources[0].id, resources[3].id]);
    expect(selectResources(resources.map(r => ({ ...r, verified: false })), task)).toEqual([]);
    expect(selectResources([resources[0], { ...resources[0], id: 'duplicate' }], task)).toHaveLength(1);
  });

  it('rejects unsafe URLs and constructs thumbnails only for valid video IDs', () => {
    for (const url of ['javascript:alert(1)', 'http://www.youtube.com/watch?v=aaDMXl4FVBg', 'https://www.youtube.com.evil.test/watch?v=aaDMXl4FVBg', 'https://evil@www.youtube.com/watch?v=aaDMXl4FVBg', 'https://www.youtube.com/watch?v=bad', 'https://www.youtube.com:444/watch?v=aaDMXl4FVBg']) {
      expect(safeYouTubeUrl(url)).toBeNull(); expect(youtubeThumbnail(url)).toBeNull();
    }
    expect(youtubeThumbnail(VERIFIED_RESOURCES[0].url)).toBe('https://i.ytimg.com/vi/aaDMXl4FVBg/hqdefault.jpg');
    expect(youtubeThumbnail(VERIFIED_RESOURCES[3].url)).toBeNull();
    expect(safeYouTubeUrl(VERIFIED_RESOURCES[0].url + '&tracking=1')).toBe(VERIFIED_RESOURCES[0].url);
  });

  it('maps learning stages and selects only actionable tasks with running first', () => {
    expect(learningStage('COURSE')).toBe('learn'); expect(learningStage('TD')).toBe('practice');
    expect(learningStage('MEMORY')).toBe('recall'); expect(learningStage('REVIEW')).toBe('recall');
    const running = makeTask({ id: 'running', status: 'running', priority: 1 });
    const tasks = [makeTask({ id: 'pending', priority: 100 }), running, makeTask({ status: 'done', priority: 200 })];
    expect(nextLearningTask(tasks)).toEqual(running);
    expect(nextLearningTask(tasks.reverse())).toEqual(running);
    expect(nextLearningTask(['done','skipped','deferred','rescheduled'].map(status => makeTask({ status: status as 'done' })))).toBeNull();
  });

  it('persists legacy task defaults and explicit learning context through SQLite export', async () => {
    const client = await openMemoryDatabase();
    const repo = new Repository(client);
    repo.upsertTask(makeTask({ subjectId: null, chapterId: null }));
    expect(repo.listTasks()[0].goal).toBe(repo.listTasks()[0].title);
    const task = { ...repo.listTasks()[0], goal: 'Explain the concept', reference: 'Course page 2', resourceIds: [VERIFIED_RESOURCES[0].id] };
    repo.upsertTasks([task]);
    const copy = await openDatabaseFromBytes(client.exportBytes());
    expect(new Repository(copy).listTasks()[0]).toEqual(task);
    copy.close(); client.close();
  });

  it('completes a focus task with one session and preserves difficulty and elapsed minutes', async () => {
    const { store, client } = await boot();
    const task = store.addManualTask({ date: todayISO(), title: 'Practice', type: 'PRACTICE', plannedMin: 25, subjectId: null, chapterId: null });
    store.startTask(task.id);
    store.logFocusSession({ taskId: task.id, durationMin: 7, interruptions: 1, outcomeRating: 1, activeRecall: false, recallScore: null, note: 'Try again', finishTask: true, difficulty: 'hard' });
    const snapshot = store.getState().snapshot;
    expect(snapshot.sessions).toHaveLength(1);
    expect(snapshot.sessions[0].durationMin).toBe(7);
    expect(snapshot.tasks.find(t => t.id === task.id)).toMatchObject({ status: 'done', actualMin: 7, difficulty: 'hard' });
    client.close();
  });

  it('exports and imports resource edits alongside task context', async () => {
    const { store, client } = await boot();
    store.saveResource({ ...VERIFIED_RESOURCES[0], title: 'Personal label' });
    const exported = store.exportJson();
    store.saveResource(VERIFIED_RESOURCES[0]);
    const result = await store.importJson(exported);
    expect(result.errors).toEqual([]);
    expect(store.repository.listResources().find(r => r.id === VERIFIED_RESOURCES[0].id)?.title).toBe('Personal label');
    client.close();
  });

  it('renders learning guidance in English and Arabic with safe external links', async () => {
    const { store, client } = await boot();
    store.addManualTask({ date: todayISO(), title: 'Task', type: 'COURSE', plannedMin: 25, subjectId: null, chapterId: null });
    const state = store.getState();
    const context = buildContextValue(store, state, todayISO(), computeAnalytics(state.snapshot, todayISO(), '30d'), '30d', () => undefined);
    for (const lang of ['en','ar'] as const) {
      const html = renderToStaticMarkup(<I18nProvider initialLang={lang}><StudyContext.Provider value={context}><LearningPlan tasks={state.snapshot.tasks} /></StudyContext.Provider></I18nProvider>);
      expect(html).toContain(lang === 'en' ? 'NEXT UP' : 'التالي');
      expect(html).toContain(lang === 'en' ? 'Why this?' : 'لماذا هذا؟');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).not.toContain('undefined');
      expect(html).toContain('<progress');
    }
    client.close();
  });
});
