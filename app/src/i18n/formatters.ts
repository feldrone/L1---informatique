import type { Language } from './types';

export function formatNumber(value: number, lang: Language): string {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-DZ' : 'en-US').format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(dateStr: string, lang: Language, opts?: Intl.DateTimeFormatOptions): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const locale = lang === 'ar' ? 'ar-DZ' : 'en-US';
    return new Intl.DateTimeFormat(locale, opts ?? { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatLongDate(dateStr: string, lang: Language): string {
  return formatDate(dateStr, lang, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatMinutes(min: number, lang: Language): string {
  if (min < 60) return `${formatNumber(min, lang)} ${lang === 'ar' ? 'د' : 'min'}`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${formatNumber(h, lang)}${lang === 'ar' ? ' س' : 'h'}`;
  return `${formatNumber(h, lang)}${lang === 'ar' ? ' س ' : 'h '}${formatNumber(m, lang)}${lang === 'ar' ? ' د' : 'm'}`;
}

export function formatPercent(value: number, lang: Language): string {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-DZ' : 'en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value / 100);
  } catch {
    return `${value}%`;
  }
}
