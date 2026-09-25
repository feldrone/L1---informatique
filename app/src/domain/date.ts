/**
 * Local-date arithmetic.
 *
 * The whole application stores calendar dates as `YYYY-MM-DD` strings interpreted in the
 * user's LOCAL timezone (a study plan belongs to the day the student actually lives).
 * All helpers below avoid `new Date('YYYY-MM-DD')` (which parses as UTC and can shift the
 * day around midnight) and avoid DST-sensitive arithmetic by normalising to midday.
 */

export type ISODate = string; // YYYY-MM-DD

const MS_PER_DAY = 86_400_000;

/** Local calendar date of a Date object, as YYYY-MM-DD. */
export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string into a local Date at 12:00 (DST-safe anchor). */
export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d, 12);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function addDays(iso: ISODate, days: number): ISODate {
  const base = fromISODate(iso);
  base.setDate(base.getDate() + days);
  return toISODate(base);
}

/** Whole days between two local dates (b - a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / MS_PER_DAY);
}

/** 0 = Sunday … 6 = Saturday, matching `UniversityClass.dayOfWeek`. */
export function dayOfWeek(iso: ISODate): number {
  return fromISODate(iso).getDay();
}

/** ISO week starts on Monday (academic convention used by the weekly screens). */
export function startOfWeek(iso: ISODate): ISODate {
  const dow = dayOfWeek(iso); // 0=Sun
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDays(iso, delta);
}

export function endOfWeek(iso: ISODate): ISODate {
  return addDays(startOfWeek(iso), 6);
}

export function startOfMonth(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`;
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0, 12).getDate();
}

export function rangeOfDates(fromISO: ISODate, toISO: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const total = daysBetween(fromISO, toISO);
  for (let i = 0; i <= total; i += 1) out.push(addDays(fromISO, i));
  return out;
}

/** Last `n` days ending at `endISO` (inclusive), oldest first. */
export function lastNDays(endISO: ISODate, n: number): ISODate[] {
  return rangeOfDates(addDays(endISO, -(n - 1)), endISO);
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
/** Monday-first ordering used by the weekly plan and charts. */
export const WEEK_ORDER: number[] = [1, 2, 3, 4, 5, 6, 0];

export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  if (rest === 0) return `${h}h`;
  return `${h}h ${String(rest).padStart(2, '0')}m`;
}

export function formatDurationShort(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h${String(rest).padStart(2, '0')}`;
}

export function formatLongDate(iso: ISODate): string {
  return fromISODate(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDate(iso: ISODate): string {
  return fromISODate(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

/** `now` as a full ISO timestamp — the single place the app reads the wall clock. */
export function nowISO(): string {
  return new Date().toISOString();
}

export function nowTimeHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
