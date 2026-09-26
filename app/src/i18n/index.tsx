import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Language, TranslationKey, InterpolationParams, Dictionary } from './types';
import { en } from './dictionaries/en';
import { ar } from './dictionaries/ar';

const DICTIONARIES: Record<Language, Dictionary> = { en, ar };

const STORAGE_KEY = 'study-lang';
const ONBOARDING_KEY = 'study-onboarding-seen';

function detectSystemLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('ar')) return 'ar';
  return 'en';
}

function getStoredLanguage(): Language | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'en' || raw === 'ar') return raw;
  } catch {}
  return null;
}

function persistLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

function interpolate(template: string, params?: InterpolationParams): string {
  if (!params) return template;
  let out = template;
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export interface I18nContextValue {
  lang: Language;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, params?: InterpolationParams) => string;
  hasSeenOnboarding: boolean;
  markOnboardingSeen: () => void;
  resetOnboarding: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, initialLang }: { children: ReactNode; initialLang?: Language }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (initialLang) return initialLang;
    const stored = getStoredLanguage();
    if (stored) return stored;
    return detectSystemLanguage();
  });

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(ONBOARDING_KEY) === '1';
    } catch {
      return true;
    }
  });

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.body.dir = dir;
  }, [dir, lang]);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    persistLanguage(newLang);
  }, []);

  const markOnboardingSeen = useCallback(() => {
    setHasSeenOnboarding(true);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {}
  }, []);

  const resetOnboarding = useCallback(() => {
    setHasSeenOnboarding(false);
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(ONBOARDING_KEY);
    } catch {}
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: InterpolationParams): string => {
      const dict = DICTIONARIES[lang];
      const fallback = DICTIONARIES.en;
      let template = dict[key] ?? fallback[key] ?? key;
      return interpolate(template, params);
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ lang, dir, setLang, t, hasSeenOnboarding, markOnboardingSeen, resetOnboarding }),
    [lang, dir, setLang, t, hasSeenOnboarding, markOnboardingSeen, resetOnboarding],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

export function useTranslation() {
  const { t, lang, dir, setLang } = useI18n();
  return { t, lang, dir, setLang };
}

// For tests: create a mock provider that returns English
export function createMockT(lang: Language = 'en') {
  return (key: TranslationKey, params?: InterpolationParams) => {
    const dict = DICTIONARIES[lang];
    const fallback = DICTIONARIES.en;
    const template = dict[key] ?? fallback[key] ?? key;
    return interpolate(template, params);
  };
}

export function getDictionary(lang: Language): Dictionary {
  return DICTIONARIES[lang];
}
