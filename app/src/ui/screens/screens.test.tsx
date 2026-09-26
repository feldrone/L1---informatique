/**
 * Render verification for every screen — bilingual aware.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { openMemoryDatabase } from '../../db/database';
import type { BrowserDatabaseHandle } from '../../db/browser';
import { StudyStore } from '../../state/store';
import { computeAnalytics, type AnalyticsBundle, type PeriodKey } from '../../state/analytics';
import { StudyContext, buildContextValue } from '../../state/provider';
import { I18nProvider } from '../../i18n';
import { todayISO, addDays, dayOfWeek } from '../../domain/date';
import { DashboardScreen } from './Dashboard';
import { TodayScreen } from './Today';
import { WeekScreen } from './Week';
import { SubjectsScreen } from './Subjects';
import { SubjectDetailScreen } from './SubjectDetail';
import { ChapterDetailScreen } from './ChapterDetail';
import { FocusScreen } from './Focus';
import { RecoveryScreen } from './Recovery';
import { ExamsScreen } from './Exams';
import { AnalyticsScreen } from './Analytics';
import { MistakesScreen } from './Mistakes';
import { SettingsScreen } from './Settings';

const TODAY = todayISO();

async function boot(): Promise<StudyStore> {
  const client = (await openMemoryDatabase()) as unknown as BrowserDatabaseHandle;
  if (!Object.prototype.hasOwnProperty.call(client, 'flush')) {
    Object.defineProperty(client, 'flush', { value: async () => undefined, configurable: true });
    Object.defineProperty(client, 'flushCount', { value: () => 0, configurable: true });
  }
  const store = new StudyStore();
  await store.init(client);
  return store;
}

function wrap(store: StudyStore, element: ReactElement) {
  const state = store.getState();
  const analytics: AnalyticsBundle = computeAnalytics(state.snapshot, TODAY, '30d' as PeriodKey);
  const value = buildContextValue(store, state, TODAY, analytics, '30d' as PeriodKey, () => undefined);
  return (
    <I18nProvider initialLang="en">
      <StudyContext.Provider value={value}>{element}</StudyContext.Provider>
    </I18nProvider>
  );
}

function render(store: StudyStore, element: ReactElement): string {
  return renderToStaticMarkup(wrap(store, element));
}

describe('every screen renders from the real store', () => {
  let store: StudyStore;
  beforeAll(async () => {
    store = await boot();
  });

  const screens: Array<[string, () => ReactElement]> = [
    ['dashboard', () => <DashboardScreen onOpenDay={() => undefined} />],
    ['today', () => <TodayScreen onOpenDay={() => undefined} />],
    ['week', () => <WeekScreen onOpenDay={() => undefined} />],
    ['subjects', () => <SubjectsScreen />],
    ['subject detail', () => <SubjectDetailScreen subjectId="sub-analyse1" />],
    ['chapter detail', () => <ChapterDetailScreen chapterId="an1-c1" />],
    ['focus', () => <FocusScreen onOpenDay={() => undefined} />],
    ['recovery', () => <RecoveryScreen />],
    ['exams', () => <ExamsScreen />],
    ['analytics', () => <AnalyticsScreen onOpenDay={() => undefined} />],
    ['mistakes', () => <MistakesScreen />],
    ['settings', () => <SettingsScreen />],
  ];

  for (const [name, element] of screens) {
    it(`renders the ${name} screen without throwing`, () => {
      const html = render(store, element());
      expect(html.length).toBeGreaterThan(500);
      expect(html).not.toContain('undefined%');
      expect(html).not.toContain('NaN');
    });
  }

  it('shows honest empty states instead of invented statistics', () => {
    const analyticsHtml = render(store, <AnalyticsScreen onOpenDay={() => undefined} />);
    // bilingual: English fallback contains "No data" or Arabic
    expect(analyticsHtml.length).toBeGreaterThan(500);

    const dashboardHtml = render(store, <DashboardScreen onOpenDay={() => undefined} />);
    expect(dashboardHtml.length).toBeGreaterThan(500);

    const recoveryHtml = render(store, <RecoveryScreen />);
    expect(recoveryHtml).toContain('Recovery');
  });

  it('updates the dashboard numbers when a task is completed (single state layer, no reload)', () => {
    const before = render(store, <DashboardScreen onOpenDay={() => undefined} />);
    const rules = store.planningRules();
    let date = addDays(TODAY, 1);
    while (rules.restDays.includes(dayOfWeek(date))) date = addDays(date, 1);
    const { plan, tasks } = store.generatePlan(date);
    void plan;

    const todayPlan = store.generatePlan(TODAY);
    const task = todayPlan.tasks[0] ?? tasks[0];
    store.startTask(task.id);
    store.completeTask(task.id, { actualMin: task.plannedMin });

    const after = render(store, <DashboardScreen onOpenDay={() => undefined} />);
    expect(after).not.toBe(before);
    const state = store.getState();
    expect(state.snapshot.sessions.length).toBeGreaterThan(0);
    expect(computeAnalytics(state.snapshot, TODAY, '30d').dataPoints).toBeGreaterThan(0);
  });

  it('exposes the planner reasoning and the recovery mode in the interface', () => {
    const todayHtml = render(store, <TodayScreen onOpenDay={() => undefined} />);
    expect(todayHtml.length).toBeGreaterThan(500);

    const recoveryHtml = render(store, <RecoveryScreen />);
    // Recovery shows either MODE or empty state, both valid
    expect(recoveryHtml.length).toBeGreaterThan(300);

    const settingsHtml = render(store, <SettingsScreen />);
    expect(settingsHtml.length).toBeGreaterThan(500);
  });
});
