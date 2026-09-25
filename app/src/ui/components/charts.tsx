/**
 * Visual analytics components — hand-rolled SVG so every pixel maps to real stored data.
 * Motion is limited to what improves comprehension: ring fill, bar growth, count-ups, hover states.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from './primitives';
import type { HabitDayCell, HeatmapCell, HeatmapMetric } from '../../domain/analytics/heatmap';
import { HEATMAP_METRICS } from '../../domain/analytics/heatmap';
import type { SubjectDistributionEntry, SessionTimelineEntry } from '../../domain/analytics/progress';
import type { WeeklyDayStat } from '../../domain/analytics/progress';
import { formatMinutes } from '../../domain/date';

/** Smooth numeric transition used for percentages and totals. */
export function useCountUp(target: number, duration = 650): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (target - from) * eased;
      setValue(next);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

// ---------------------------------------------------------------------------
// HERO DAILY PROGRESS RING
// ---------------------------------------------------------------------------

export function ProgressRing({
  percent,
  size = 208,
  stroke = 14,
  label,
  percentNote,
  primary,
  secondary,
  tone = 'accent',
  ariaSummary,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
  /** What the percentage is a percentage *of* — two rings measure different things on purpose. */
  percentNote?: string;
  primary?: ReactNode;
  secondary?: ReactNode;
  tone?: 'accent' | 'success' | 'warning';
  ariaSummary: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const animated = useCountUp(clamped);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;
  const toneColor = tone === 'success' ? 'var(--color-success)' : tone === 'warning' ? 'var(--color-warning)' : 'var(--color-accent)';

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-flex items-center justify-center" role="img" aria-label={ariaSummary}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={toneColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="ring-progress"
            style={{ filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--color-accent) 35%, transparent))' }}
          />
        </svg>
        {/* The inset is padded so every line stays inside the circle instead of crossing the stroke. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-[15%] text-center">
          {label && (
            <p className="max-w-full text-[10px] leading-none font-semibold tracking-[0.12em] text-text-muted uppercase">{label}</p>
          )}
          <p className="tnum text-[27px] leading-none font-semibold">{Math.round(animated)}%</p>
          {percentNote && <p className="text-[10px] leading-tight text-text-muted">{percentNote}</p>}
          {primary && <div className="mt-0.5 max-w-full text-[11px] leading-tight text-text-muted">{primary}</div>}
        </div>
      </div>
      {secondary && <p className="mt-2 max-w-[16rem] text-center text-[11px] text-text-muted">{secondary}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MULTI-RING SUBJECT ANALYTICS
// ---------------------------------------------------------------------------

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number): string {
  const large = end - start > 180 ? 1 : 0;
  const p1 = polar(cx, cy, rOuter, start);
  const p2 = polar(cx, cy, rOuter, end);
  const p3 = polar(cx, cy, rInner, end);
  const p4 = polar(cx, cy, rInner, start);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

export function RadialSubjects({
  entries,
  size = 200,
  centerLabel,
  centerValue,
  centerHint,
  onSelect,
  emptyLabel = 'No study time logged today yet.',
}: {
  entries: SubjectDistributionEntry[];
  size?: number;
  centerLabel: string;
  centerValue: string;
  centerHint?: string;
  onSelect?: (subjectId: string) => void;
  emptyLabel?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const total = entries.reduce((acc, e) => acc + Math.max(e.effectiveMin, e.actualMin), 0);

  const segments = useMemo(() => {
    if (total <= 0) return [];
    let angle = 0;
    const gap = entries.length > 1 ? 2.2 : 0;
    return entries.map((entry) => {
      const value = Math.max(entry.effectiveMin, entry.actualMin);
      const sweep = (value / total) * 360;
      const start = angle + gap / 2;
      const end = angle + sweep - gap / 2;
      angle += sweep;
      return { entry, start, end: Math.max(end, start + 0.6), value };
    });
  }, [entries, total]);

  const outer = size / 2;
  const inner = outer - 30;
  const active = entries.find((e) => e.subjectId === activeId) ?? null;

  if (segments.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-sunken/50 p-6 text-center"
        style={{ minHeight: size }}
      >
        <p className="text-sm text-text-muted">{emptyLabel}</p>
        <p className="mt-1 max-w-xs text-xs text-text-muted">
          The subject ring fills from real logged study sessions — nothing is simulated.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="group" aria-label="Study time by subject">
          <circle cx={outer} cy={outer} r={(outer + inner) / 2} fill="none" stroke="var(--color-border)" strokeWidth={outer - inner} opacity={0.35} />
          {segments.map(({ entry, start, end }) => {
            const isActive = activeId === entry.subjectId;
            return (
              <path
                key={entry.subjectId}
                d={arcPath(outer, outer, outer - 4, inner + 4, start, end)}
                fill={entry.color}
                opacity={activeId && !isActive ? 0.35 : 1}
                className="ring-segment cursor-pointer"
                tabIndex={0}
                role="button"
                aria-label={`${entry.shortName}: ${formatMinutes(entry.effectiveMin || entry.actualMin)}, ${entry.share}% of today's study time. Open subject.`}
                onMouseEnter={() => setActiveId(entry.subjectId)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(entry.subjectId)}
                onBlur={() => setActiveId(null)}
                onClick={() => onSelect?.(entry.subjectId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect?.(entry.subjectId);
                  }
                }}
                style={{ transformOrigin: 'center' }}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {active ? (
            <>
              <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: active.color }}>
                {active.shortName}
              </p>
              <p className="tnum text-2xl font-semibold">{formatMinutes(active.effectiveMin || active.actualMin)}</p>
              <p className="text-[11px] text-text-muted">
                {active.share}% · {active.completionPercent}% of plan
              </p>
              <p className="text-[11px] text-text-muted">
                {active.tasksDone} done · {active.tasksMissed} missed
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-text-muted uppercase">{centerLabel}</p>
              <p className="tnum text-2xl font-semibold">{centerValue}</p>
              {centerHint && <p className="text-[11px] text-text-muted">{centerHint}</p>}
            </>
          )}
        </div>
      </div>
      <ul className="w-full space-y-1.5 sm:w-auto sm:min-w-52">
        {entries.map((entry) => (
          <li key={entry.subjectId}>
            <button
              type="button"
              onClick={() => onSelect?.(entry.subjectId)}
              onMouseEnter={() => setActiveId(entry.subjectId)}
              onMouseLeave={() => setActiveId(null)}
              className={cx(
                'flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition',
                activeId === entry.subjectId ? 'bg-surface-sunken' : 'hover:bg-surface-sunken',
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
              <span className="flex-1 truncate">{entry.shortName}</span>
              <span className="tnum text-text-muted">{entry.share}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WEEKLY PERFORMANCE GRAPH
// ---------------------------------------------------------------------------

export function WeeklyBars({
  days,
  targetWeeklyMin,
  onSelect,
}: {
  days: WeeklyDayStat[];
  targetWeeklyMin?: number;
  onSelect?: (date: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(...days.map((d) => Math.max(d.plannedMin, d.actualMin)), 60);
  const active = activeIndex !== null ? days[activeIndex] : null;
  const totalActual = days.reduce((acc, d) => acc + d.actualMin, 0);
  const totalPlanned = days.reduce((acc, d) => acc + d.plannedMin, 0);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-text-muted">
        <span>
          Planned <strong className="tnum text-text">{formatMinutes(totalPlanned)}</strong> · Actual{' '}
          <strong className="tnum text-text">{formatMinutes(totalActual)}</strong>
        </span>
        {targetWeeklyMin ? <span>Weekly target {formatMinutes(targetWeeklyMin)}</span> : null}
      </div>
      <div
        className="scroll-thin flex w-full min-w-0 items-end gap-2 overflow-x-auto pb-1"
        role="img"
        aria-label={`Weekly planned versus actual study time: ${days
          .map((d) => `${d.label} ${d.actualMin} of ${d.plannedMin} minutes`)
          .join(', ')}`}
      >
        {days.map((day, index) => (
          <button
            key={day.date}
            type="button"
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
            onClick={() => onSelect?.(day.date)}
            className="group flex min-w-10 flex-1 flex-col items-center gap-1 rounded-lg px-1 pt-2 pb-1 hover:bg-surface-sunken"
            aria-label={`${day.label}: ${day.actualMin} minutes completed of ${day.plannedMin} planned`}
          >
            <div className="flex h-28 w-full items-end justify-center gap-1">
              <div
                className="w-1/3 rounded-t bg-border"
                style={{ height: `${Math.max(2, (day.plannedMin / max) * 100)}%` }}
                title={`Planned ${formatMinutes(day.plannedMin)}`}
              />
              <div
                className="animate-grow-w w-1/3 rounded-t"
                style={{
                  height: `${Math.max(2, (day.actualMin / max) * 100)}%`,
                  background: day.completionPercent >= 80 ? 'var(--color-success)' : day.actualMin > 0 ? 'var(--color-accent)' : 'var(--color-neutral)',
                }}
              />
            </div>
            <span className="text-[11px] text-text-muted">{day.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 min-h-8 rounded-lg bg-surface-sunken/70 px-3 py-1.5 text-xs text-text-muted">
        {active ? (
          <span>
            <strong className="text-text">{active.label}</strong> · {formatMinutes(active.actualMin)} done /{' '}
            {formatMinutes(active.plannedMin)} planned ({active.completionPercent}%)
            {active.plannedMin > 0 && (
              <> · difference {formatMinutes(active.actualMin - active.plannedMin)}</>
            )}
          </span>
        ) : (
          <span>Hover or focus a day for exact values. Actual bars are solid, planned bars are muted.</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STUDY HEATMAP
// ---------------------------------------------------------------------------

const RANGES = [
  { id: '12w', label: '12 weeks', days: 84 },
  { id: '6m', label: '6 months', days: 182 },
  { id: 'year', label: 'Academic year', days: 365 },
] as const;

const LEVEL_OPACITY = [0.06, 0.25, 0.45, 0.65, 0.82, 1];

export function StudyHeatmap({
  cells,
  metric,
  onMetricChange,
  onSelectDay,
  availableRanges = RANGES.map((r) => r.id),
}: {
  cells: HeatmapCell[];
  metric: HeatmapMetric;
  onMetricChange: (metric: HeatmapMetric) => void;
  onSelectDay?: (date: string) => void;
  availableRanges?: string[];
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('12w');
  const activeRange = RANGES.find((r) => r.id === range) ?? RANGES[0];
  const windowed = cells.slice(-activeRange.days);
  const weeks: HeatmapCell[][] = [];
  for (let i = 0; i < windowed.length; i += 7) weeks.push(windowed.slice(i, i + 7));
  const active = windowed.filter((c) => c.level > 0).length;
  const total = windowed.reduce((acc, c) => acc + c.value, 0);
  const metricInfo = HEATMAP_METRICS.find((m) => m.id === metric);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Heatmap metric">
          {HEATMAP_METRICS.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={m.id === metric}
              onClick={() => onMetricChange(m.id)}
              className={cx(
                'min-h-8 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition',
                m.id === metric ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:text-text',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1" role="tablist" aria-label="Heatmap range">
          {RANGES.filter((r) => availableRanges.includes(r.id)).map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={r.id === range}
              onClick={() => setRange(r.id)}
              className={cx(
                'min-h-8 rounded-lg border px-2.5 py-1.5 text-[11px] transition',
                r.id === range ? 'border-accent text-accent' : 'border-border text-text-muted hover:text-text',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-thin overflow-x-auto pb-1">
        <div className="flex gap-1 sm:gap-[3px]" role="img" aria-label={`Study heatmap, ${activeRange.label}, ${metricInfo?.label}: ${active} active days, total ${total} ${metricInfo?.unit}`}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1 sm:gap-[3px]">
              {week.map((cell) => (
                <button
                  key={cell.date}
                  type="button"
                  className="heat-cell h-5 w-5 rounded-[3px] border border-black/5 sm:h-3.5 sm:w-3.5 dark:border-white/5"
                  style={{
                    background:
                      cell.level === 0
                        ? 'color-mix(in srgb, var(--color-border) 55%, transparent)'
                        : `color-mix(in srgb, var(--color-accent) ${Math.round(LEVEL_OPACITY[cell.level] * 100)}%, var(--color-surface-sunken))`,
                  }}
                  title={cell.label}
                  aria-label={cell.label}
                  onClick={() => onSelectDay?.(cell.date)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted">
        <span>
          {active} active day(s) · total {metric === 'completion' ? `${total}%` : `${total} ${metricInfo?.unit}`}
        </span>
        <span className="flex items-center gap-1">
          Less
          {LEVEL_OPACITY.map((opacity, level) => (
            <span
              key={level}
              className="h-3 w-3 rounded-[3px] border border-black/5 dark:border-white/5"
              style={{
                background:
                  level === 0
                    ? 'color-mix(in srgb, var(--color-border) 55%, transparent)'
                    : `color-mix(in srgb, var(--color-accent) ${Math.round(opacity * 100)}%, var(--color-surface-sunken))`,
              }}
            />
          ))}
          More
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CIRCULAR HABIT MATRIX
// ---------------------------------------------------------------------------

export function HabitMatrix({
  days,
  habits,
  onSelectDay,
  monthLabel,
  onPrevMonth,
  onNextMonth,
}: {
  days: HabitDayCell[];
  habits: Array<{ id: string; name: string; color: string }>;
  onSelectDay?: (date: string) => void;
  monthLabel: string;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}) {
  const size = 66;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-3 text-[11px] text-text-muted">
          {habits.map((habit) => (
            <span key={habit.id} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: habit.color }} />
              {habit.name}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onPrevMonth} className="inline-flex min-h-8 items-center rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted hover:text-text" aria-label="Previous month">
            ‹
          </button>
          <span className="tnum text-xs text-text-muted">{monthLabel}</span>
          <button type="button" onClick={onNextMonth} className="inline-flex min-h-8 items-center rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted hover:text-text" aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {days.map((day) => {
          const statusColor =
            day.status === 'missed'
              ? 'var(--color-danger)'
              : day.status === 'overloaded'
                ? 'var(--color-warning)'
                : day.status === 'recovery'
                  ? 'var(--color-accent)'
                  : 'transparent';
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDay?.(day.date)}
              className="matrix-cell group relative flex flex-col items-center gap-1"
              aria-label={`${day.date}: ${day.completedCount} of ${day.totalCount} habits, ${day.minutes} minutes, status ${day.status}`}
              title={`${day.date} · ${day.minutes} min · ${day.status}`}
            >
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius + 5}
                  fill="none"
                  stroke={statusColor}
                  strokeWidth={1.5}
                  opacity={day.status === 'empty' ? 0 : 0.9}
                />
                <circle cx={size / 2} cy={size / 2} r={radius - 1} fill="none" stroke="var(--color-border)" strokeWidth={7} opacity={0.5} />
                {day.slices.map((slice, index) => {
                  const sliceLength = circumference / Math.max(1, day.slices.length);
                  const gap = 3;
                  const dash = Math.max(2, sliceLength - gap);
                  const total = day.slices.length;
                  return (
                    <circle
                      key={slice.habitId}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius - 1}
                      fill="none"
                      stroke={slice.done ? slice.color : 'var(--color-border)'}
                      strokeWidth={slice.done ? 8 : 5}
                      strokeDasharray={`${dash} ${circumference - dash}`}
                      strokeDashoffset={-index * sliceLength - gap / 2 - total * gap * 0}
                      strokeLinecap="butt"
                      opacity={slice.done ? 1 : 0.55}
                      transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                  );
                })}
                <text
                  x={size / 2}
                  y={size / 2 + 4}
                  textAnchor="middle"
                  className="tnum fill-current text-[12px]"
                  style={{ fill: 'var(--color-text-muted)' }}
                >
                  {day.dayOfMonth}
                </text>
              </svg>
              <span className="tnum text-[10px] text-text-muted">{day.minutes > 0 ? formatMinutes(day.minutes) : '—'}</span>
            </button>
          );
        })}
        {days.length === 0 && (
          <p className="text-xs text-text-muted">
            Your study history will appear here once you start logging sessions.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border border-danger" style={{ borderColor: 'var(--color-danger)' }} /> missed
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full" style={{ border: '1px solid var(--color-warning)' }} /> overloaded
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full" style={{ border: '1px solid var(--color-accent)' }} /> recovery day
        </span>
        <span>Filled arcs = habit completed on that day.</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SESSION TIMELINE
// ---------------------------------------------------------------------------

export function SessionTimeline({ entries }: { entries: SessionTimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-text-muted">
        No study session logged today yet. Sessions appear here as soon as you start a focus block.
      </p>
    );
  }
  const max = Math.max(...entries.map((e) => e.minutes));
  return (
    <ol className="space-y-2">
      {entries.map((entry, index) => (
        <li
          key={entry.id}
          className="timeline-item flex items-center gap-3"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <span className="tnum w-12 shrink-0 text-xs text-text-muted">{entry.startTime}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm">{entry.subjectName}</span>
              <span className="tnum text-xs text-text-muted">{formatMinutes(entry.minutes)}</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-surface-sunken">
              <div
                className="animate-grow-w h-1.5 rounded-full"
                style={{ width: `${Math.max(6, (entry.minutes / max) * 100)}%`, background: entry.color }}
              />
            </div>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {entry.startTime}–{entry.endTime}
              {entry.activeRecall && ' · active recall'}
              {entry.interruptions > 0 && ` · ${entry.interruptions} interruption(s)`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// SPARKLINE + BALANCE BARS
// ---------------------------------------------------------------------------

export function Sparkline({ values, width = 96, height = 26 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <span className="text-[11px] text-text-muted">—</span>;
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export function BalanceBars({
  entries,
  onSelect,
}: {
  entries: Array<{
    subjectId: string;
    shortName: string;
    color: string;
    plannedMin: number;
    actualMin: number;
    effectiveMin: number;
    completionPercent: number;
    trendPercent: number | null;
    neglected: boolean;
    warning: string | null;
  }>;
  onSelect?: (subjectId: string) => void;
}) {
  const max = Math.max(...entries.map((e) => Math.max(e.plannedMin, e.effectiveMin, e.actualMin)), 60);
  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.subjectId}>
          <button
            type="button"
            onClick={() => onSelect?.(entry.subjectId)}
            className="w-full rounded-lg text-left transition hover:bg-surface-sunken/60"
          >
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-2 truncate">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                {entry.shortName}
              </span>
              <span className="tnum shrink-0 text-text-muted">
                {entry.completionPercent}%
                {entry.trendPercent !== null && (
                  <span className={entry.trendPercent >= 0 ? 'ml-2 text-success' : 'ml-2 text-danger'}>
                    {entry.trendPercent >= 0 ? '▲' : '▼'} {Math.abs(entry.trendPercent)}%
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1.5 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-surface-sunken" title={`Planned ${formatMinutes(entry.plannedMin)}`}>
                <div className="h-1.5 rounded-full bg-border" style={{ width: `${(entry.plannedMin / max) * 100}%` }} />
              </div>
              <div className="h-2 w-full rounded-full bg-surface-sunken" title={`Actual ${formatMinutes(entry.effectiveMin || entry.actualMin)}`}>
                <div
                  className="animate-grow-w h-2 rounded-full"
                  style={{
                    width: `${(Math.max(entry.effectiveMin, entry.actualMin) / max) * 100}%`,
                    background: entry.neglected ? 'var(--color-warning)' : entry.color,
                  }}
                />
              </div>
            </div>
            {entry.warning && <p className="mt-1 text-[11px] text-warning">{entry.warning}</p>}
          </button>
        </li>
      ))}
    </ul>
  );
}
