/**
 * Application shell: navigation, routing and the day drawer host.
 * Desktop shows a side rail + multi-column content; mobile keeps a bottom bar with the
 * priority screens reachable in one tap (spec add-on §21).
 */

import { useMemo, useState } from 'react';
import { Button, cx } from './ui/components/primitives';
import { DayDrawer } from './ui/components/day';
import { href, navigate, useRoute } from './ui/router';
import { useStudy } from './state/provider';
import { formatLongDate } from './domain/date';
import { DashboardScreen } from './ui/screens/Dashboard';
import { TodayScreen } from './ui/screens/Today';
import { WeekScreen } from './ui/screens/Week';
import { SubjectsScreen } from './ui/screens/Subjects';
import { SubjectDetailScreen } from './ui/screens/SubjectDetail';
import { ChapterDetailScreen } from './ui/screens/ChapterDetail';
import { FocusScreen } from './ui/screens/Focus';
import { RecoveryScreen } from './ui/screens/Recovery';
import { ExamsScreen } from './ui/screens/Exams';
import { AnalyticsScreen } from './ui/screens/Analytics';
import { MistakesScreen } from './ui/screens/Mistakes';
import { SettingsScreen } from './ui/screens/Settings';

interface NavItem {
  id: string;
  label: string;
  short: string;
  badge?: number;
}

export function App() {
  const { state, today, theme, toggleTheme } = useStudy();
  const route = useRoute();
  const [drawerDate, setDrawerDate] = useState<string | null>(null);

  const snap = state.snapshot;
  const openBacklog = snap.backlog.filter((b) => b.state === 'open');
  const dueRevisions = snap.chapters.filter((c) => c.nextRevisionDate !== null && c.nextRevisionDate <= today);
  const openTasks = snap.tasks.filter((t) => t.planDate === today && t.status !== 'done' && t.status !== 'skipped');
  const upcomingExams = snap.exams.filter((e) => e.date >= today);

  const nav: NavItem[] = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', short: 'Home' },
      { id: 'today', label: 'Today', short: 'Today', badge: openTasks.length },
      { id: 'week', label: 'Weekly plan', short: 'Week' },
      { id: 'focus', label: 'Focus timer', short: 'Focus' },
      { id: 'recovery', label: 'Recovery center', short: 'Recover', badge: openBacklog.length },
      { id: 'subjects', label: 'Subjects', short: 'Subjects' },
      { id: 'exams', label: 'Exams', short: 'Exams', badge: upcomingExams.length },
      { id: 'analytics', label: 'Analytics', short: 'Stats', badge: dueRevisions.length },
      { id: 'mistakes', label: 'Mistakes', short: 'Mistakes' },
      { id: 'settings', label: 'Settings', short: 'Settings' },
    ],
    [openTasks.length, openBacklog.length, upcomingExams.length, dueRevisions.length],
  );

  const activeId = nav.some((n) => n.id === route.screen) ? route.screen : 'dashboard';

  const content = (() => {
    switch (route.screen) {
      case 'today':
        return <TodayScreen onOpenDay={setDrawerDate} />;
      case 'week':
        return <WeekScreen onOpenDay={setDrawerDate} />;
      case 'focus':
        return <FocusScreen onOpenDay={setDrawerDate} />;
      case 'recovery':
        return <RecoveryScreen />;
      case 'subjects':
        return <SubjectsScreen />;
      case 'subject':
        return <SubjectDetailScreen subjectId={route.params[0] ?? ''} />;
      case 'chapter':
        return <ChapterDetailScreen chapterId={route.params[0] ?? ''} />;
      case 'exams':
        return <ExamsScreen />;
      case 'analytics':
        return <AnalyticsScreen onOpenDay={setDrawerDate} />;
      case 'mistakes':
        return <MistakesScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen onOpenDay={setDrawerDate} />;
    }
  })();

  const mobileNav = nav.filter((item) => ['today', 'focus', 'recovery', 'analytics', 'settings'].includes(item.id));

  return (
    <div className="min-h-screen bg-surface text-text">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface-raised focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={() => navigate('dashboard')}
            className="flex items-center gap-2.5 text-left"
            aria-label="Go to dashboard"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-semibold text-on-accent">
              S1
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold">Study Performance System</span>
              <span className="block text-[11px] text-text-muted">L1 Systèmes Informatiques · UBMA</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-text-muted md:block">{formatLongDate(today)}</span>
            <Button size="sm" variant="ghost" onClick={() => navigate('focus')} title="Open the focus timer">
              Focus
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDrawerDate(today)}
              title="Inspect today's recorded data"
            >
              Today&apos;s data
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-3 pt-4 pb-24 sm:px-5 lg:pb-8">
        <nav aria-label="Screens" className="hidden w-52 shrink-0 lg:block">
          <ul className="sticky top-20 space-y-1">
            {nav.map((item) => {
              const active = item.id === activeId;
              return (
                <li key={item.id}>
                  <a
                    href={href(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition',
                      active ? 'bg-accent-soft font-medium text-accent' : 'text-text-muted hover:bg-surface-sunken hover:text-text',
                    )}
                  >
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="tnum rounded-full border border-border px-1.5 text-[11px]">{item.badge}</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <main id="main" className="min-w-0 flex-1">
          {content}
        </main>
      </div>

      <nav
        aria-label="Primary screens"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-2xl">
          {mobileNav.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id} className="flex-1">
                <a
                  href={href(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]',
                    active ? 'text-accent' : 'text-text-muted',
                  )}
                >
                  <span className={cx('h-1 w-6 rounded-full', active ? 'bg-accent' : 'bg-transparent')} />
                  {item.short}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <DayDrawer date={drawerDate} onClose={() => setDrawerDate(null)} />
    </div>
  );
}
