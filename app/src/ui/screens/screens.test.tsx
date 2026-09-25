/**
 * Render verification for every screen (server-side render, no browser required).
 *
 * It boots the real store on an in-memory SQLite database, renders each of the twelve screens from
 * the real context value and asserts that: no screen throws, empty states are honest, a completed
 * task changes the dashboard numbers, and no screen renders a number it cannot justify.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { openMemoryDatabase } from '../../db/database';
import type { BrowserDatabaseHandle } from '../../db/browser';
import { StudyStore } from '../../state/store';
import { computeAnalytics, type AnalyticsBundle, type PeriodKey } from '../../state/analytics';
import { StudyContext, buildContextValue } from '../../state/provider';
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
  return <StudyContext.Provider value={value}>{element}</StudyContext.Provider>;
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
    ['chapter detail', () => <ChapterDetailScreen chapterId="ch-analyse1-1" />],
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
    expect(analyticsHtml).toContain('Your study history will appear here once you start logging sessions.');

    const dashboardHtml = render(store, <DashboardScreen onOpenDay={() => undefined} />);
    expect(dashboardHtml).toContain('No activity yet');

    const recoveryHtml = render(store, <RecoveryScreen />);
    expect(recoveryHtml).toContain('Nothing to recover');
  });

  it('updates the dashboard numbers when a task is completed (single state layer, no reload)', () => {
    const before = render(store, <DashboardScreen onOpenDay={() => undefined} />);
    const rules = store.planningRules();
    // plan a working day so the plan is a normal day rather than a rest-day minimum
    let date = addDays(TODAY, 1);
    while (rules.restDays.includes(dayOfWeek(date))) date = addDays(date, 1);
    const { plan, tasks } = store.generatePlan(date);
    void plan;

    // the dashboard reads today: complete one of today's tasks
    const todayPlan = store.generatePlan(TODAY);
    const task = todayPlan.tasks[0] ?? tasks[0];
    store.startTask(task.id);
    store.completeTask(task.id, { actualMin: task.plannedMin });

    const after = render(store, <DashboardScreen onOpenDay={() => undefined} />);
    expect(after).not.toBe(before);
    expect(after).toContain(`${task.plannedMin} min`);
    // the heatmap and streak now carry a real value
    const state = store.getState();
    expect(state.snapshot.sessions.length).toBeGreaterThan(0);
    expect(computeAnalytics(state.snapshot, TODAY, '30d').dataPoints).toBeGreaterThan(0);
  });

  it('exposes the planner reasoning and the recovery mode in the interface', () => {
    const todayHtml = render(store, <TodayScreen onOpenDay={() => undefined} />);
    expect(todayHtml).toContain('Why this plan:');

    const recoveryHtml = render(store, <RecoveryScreen />);
    expect(recoveryHtml).toMatch(/MODE [ABCD]/);

    const settingsHtml = render(store, <SettingsScreen />);
    expect(settingsHtml).toContain('Daily limits');
    expect(settingsHtml).toContain('never fills 100 % of your availability');
    expect(settingsHtml).toContain('Rest days');
  });
});
