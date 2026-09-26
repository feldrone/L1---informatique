/**
 * Application shell: navigation, routing and the day drawer host.
 * Bilingual + RTL + Onboarding + Explainable cockpit.
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, cx } from './ui/components/primitives';
import { DayDrawer } from './ui/components/day';
import { href, navigate, useRoute } from './ui/router';
import { useStudy } from './state/provider';
import { useI18n } from './i18n';
import { formatLongDate } from './i18n/formatters';
import { LanguageSelector } from './ui/components/languageSelector';
import { OnboardingDialog } from './ui/components/onboarding';
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
  labelKey: string;
  shortKey: string;
  badge?: number;
}

export function App() {
  const { state, today, theme, toggleTheme } = useStudy();
  const { t, lang, hasSeenOnboarding } = useI18n();
  const route = useRoute();
  const [drawerDate, setDrawerDate] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(timer);
    }
  }, [hasSeenOnboarding]);

  const snap = state.snapshot;
  const openBacklog = snap.backlog.filter((b) => b.state === 'open');
  const dueRevisions = snap.chapters.filter((c) => c.nextRevisionDate !== null && c.nextRevisionDate <= today);
  const openTasks = snap.tasks.filter((t) => t.planDate === today && t.status !== 'done' && t.status !== 'skipped');
  const upcomingExams = snap.exams.filter((e) => e.date >= today);

  const nav: NavItem[] = useMemo(
    () => [
      { id: 'dashboard', labelKey: 'nav.dashboard', shortKey: 'nav.short.dashboard' },
      { id: 'today', labelKey: 'nav.today', shortKey: 'nav.short.today', badge: openTasks.length },
      { id: 'week', labelKey: 'nav.week', shortKey: 'nav.short.week' },
      { id: 'focus', labelKey: 'nav.focus', shortKey: 'nav.short.focus' },
      { id: 'recovery', labelKey: 'nav.recovery', shortKey: 'nav.short.recovery', badge: openBacklog.length },
      { id: 'subjects', labelKey: 'nav.subjects', shortKey: 'nav.short.subjects' },
      { id: 'exams', labelKey: 'nav.exams', shortKey: 'nav.short.exams', badge: upcomingExams.length },
      { id: 'analytics', labelKey: 'nav.analytics', shortKey: 'nav.short.analytics', badge: dueRevisions.length },
      { id: 'mistakes', labelKey: 'nav.mistakes', shortKey: 'nav.short.mistakes' },
      { id: 'settings', labelKey: 'nav.settings', shortKey: 'nav.short.settings' },
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
        return <SettingsScreen onOpenOnboarding={() => setShowOnboarding(true)} />;
      default:
        return <DashboardScreen onOpenDay={setDrawerDate} />;
    }
  })();

  const mobileNav = nav.filter((item) => ['today', 'focus', 'recovery', 'analytics', 'settings'].includes(item.id));

  return (
    <div className="min-h-screen bg-surface text-text">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:rounded-lg focus:bg-surface-raised focus:px-3 focus:py-2 focus:text-sm"
      >
        {t('nav.skipToContent')}
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={() => navigate('dashboard')}
            className="flex items-center gap-2.5 text-start"
            aria-label={t('nav.goToDashboard')}
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-semibold text-on-accent">S1</span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold">{t('header.appTitle')}</span>
              <span className="block text-[11px] text-text-muted">{t('header.appSubtitle')}</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-text-muted md:block">{formatLongDate(today, lang)}</span>
            <LanguageSelector variant="header" />
            <Button size="sm" variant="ghost" onClick={() => navigate('focus')} title={t('nav.focus')}>
              {t('header.focus')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDrawerDate(today)} title={t('header.todaysData')}>
              {t('header.todaysData')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleTheme}
              aria-label={lang === 'ar' ? (theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')) : theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
            >
              {theme === 'dark' ? t('header.themeLight') : t('header.themeDark')}
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
                    <span>{t(item.labelKey as any)}</span>
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

      <nav aria-label="Primary screens" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
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
                  {t(item.shortKey as any)}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <DayDrawer date={drawerDate} onClose={() => setDrawerDate(null)} />
      {showOnboarding && <OnboardingDialog onClose={() => setShowOnboarding(false)} />}
    </div>
  );
}
