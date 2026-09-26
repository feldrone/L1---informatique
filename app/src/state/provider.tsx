/**
 * React glue for the store: context, hooks, automatic day roll-over and memoised analytics.
 */

import {
  Component,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { StudyStore, type Snapshot, type StoreState } from './store';
import { computeAnalytics, type AnalyticsBundle, type PeriodKey } from './analytics';
import { openBrowserDatabase } from '../db/browser';
import { todayISO, type ISODate } from '../domain/date';

export interface StudyContextValue {
  store: StudyStore;
  state: StoreState;
  today: ISODate;
  analytics: AnalyticsBundle;
  period: PeriodKey;
  setPeriod: (period: PeriodKey) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<StudyStore | null>(null);
  if (storeRef.current === null) storeRef.current = new StudyStore();
  const store = storeRef.current;

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [today, setToday] = useState<ISODate>(todayISO());
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [bootError, setBootError] = useState<string | null>(null);

  // boot: open the local SQLite database and seed the verified academic configuration once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const handle = await openBrowserDatabase();
        if (cancelled) return;
        await store.init(handle);
      } catch (error) {
        setBootError((error as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  // day roll-over: re-plan automatically when the calendar day changes while the app stays open
  useEffect(() => {
    const timer = setInterval(() => {
      const now = todayISO();
      setToday((previous) => {
        if (previous !== now) {
          store.generatePlan(now);
          return now;
        }
        return previous;
      });
    }, 60_000);
    return () => clearInterval(timer);
  }, [store]);

  // first plan of the day: generate only when the student has not planned that date yet
  useEffect(() => {
    if (state.status !== 'ready') return;
    const hasPlan = state.snapshot.plans.some((p) => p.date === today);
    const hasTasks = state.snapshot.tasks.some((t) => t.planDate === today);
    if (!hasPlan && !hasTasks) store.generatePlan(today);
  }, [state.status, state.snapshot.plans, state.snapshot.tasks, store, today]);

  const analytics = useMemo(
    () => computeAnalytics(state.snapshot, today, period),
    // `state.revision` changes on every mutation so the bundle always reflects stored data
    [state.snapshot, state.revision, today, period],
  );

  const theme = state.snapshot.preferences.theme;
  const language = state.snapshot.preferences.language ?? 'en';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Persist language to localStorage for instant first paint and sync with DB
    try {
      const stored = localStorage.getItem('study-lang');
      if (stored !== language) localStorage.setItem('study-lang', language);
    } catch {}
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const value: StudyContextValue = useMemo(
    () => ({
      store,
      state,
      today,
      analytics,
      period,
      setPeriod,
      theme,
      toggleTheme: () => {
        const snapshot: Snapshot = state.snapshot;
        store.savePreferences({ ...snapshot.preferences, theme: theme === 'dark' ? 'light' : 'dark' });
      },
    }),
    [store, state, today, analytics, period, theme],
  );

  if (state.status === 'error' || bootError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="max-w-md rounded-xl border border-danger/40 bg-surface-raised p-6 text-sm text-text">
          <h1 className="mb-2 text-base font-semibold text-danger">Local database unavailable</h1>
          <p className="text-text-muted">
            {state.error ?? bootError}
          </p>
          <p className="mt-3 text-text-muted">
            The application needs local storage (SQLite in the browser). Private browsing modes can block
            IndexedDB. Your existing data is untouched.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-text-muted">
        <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="text-sm">Opening local study database…</p>
        </div>
      </div>
    );
  }

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

/**
 * Error boundary: a rendering error must never wipe local data — it shows a recoverable screen and
 * keeps the SQLite database untouched.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface px-6">
          <div className="max-w-lg rounded-xl border border-danger/40 bg-surface-raised p-6 text-sm">
            <h1 className="mb-2 text-base font-semibold text-danger">Something went wrong in the interface</h1>
            <p className="text-text-muted">{this.state.error.message}</p>
            <p className="mt-3 text-text-muted">
              Your recorded sessions and plans are stored locally and were not modified. Reload the page to continue.
            </p>
            <button
              type="button"
              className="mt-4 rounded-xl border border-border px-3 py-2 text-sm"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function buildContextValue(
  store: StudyStore,
  state: StoreState,
  today: ISODate,
  analytics: AnalyticsBundle,
  period: PeriodKey,
  setPeriod: (period: PeriodKey) => void,
): StudyContextValue {
  return {
    store,
    state,
    today,
    analytics,
    period,
    setPeriod,
    theme: state.snapshot.preferences.theme,
    toggleTheme: () => undefined,
  };
}

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used inside <StudyProvider>');
  return ctx;
}

export function useAnalytics(): AnalyticsBundle {
  return useStudy().analytics;
}

export function useStore(): StudyStore {
  return useStudy().store;
}

export function useToday(): ISODate {
  return useStudy().today;
}
