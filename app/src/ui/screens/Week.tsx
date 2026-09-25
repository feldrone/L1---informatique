/**
 * Weekly plan: the seven planned days at a glance, with planned-vs-actual per day and a one-tap
 * generation for the whole week. Rest days are respected — the planner does not fill them.
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Card, StatTile, cx } from '../components/primitives';
import { WeeklyBars } from '../components/charts';
import { WeeklyReviewCard, SubjectHealthCard } from '../components/intelligence';
import { formatLongDate, formatMinutes, addDays, daysBetween } from '../../domain/date';
import { navigate } from '../router';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { useLookups } from '../lookups';

export function WeekScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { today, state } = useStudy();
  const store = useStore();
  const analytics = useAnalytics();
  const { subjectLookup } = useLookups();
  const rules = store.planningRules();
  const [offsetWeeks, setOffsetWeeks] = useState(0);

  const weekStart = useMemo(() => {
    const weekday = new Date(`${today}T12:00:00`).getDay();
    const monday = addDays(today, -((weekday + 6) % 7));
    return addDays(monday, offsetWeeks * 7);
  }, [today, offsetWeeks]);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const tasks = state.snapshot.tasks;
  const plans = state.snapshot.plans;
  const sessions = state.snapshot.sessions;

  const days = weekDates.map((date) => {
    const dayTasks = tasks.filter((t) => t.planDate === date);
    const planned = dayTasks.reduce((acc, t) => acc + t.plannedMin, 0);
    const done = dayTasks.filter((t) => t.status === 'done');
    const actual = done.reduce((acc, t) => acc + t.actualMin, 0);
    const daySessions = sessions.filter((s) => s.date === date);
    const effective = daySessions.reduce((acc, s) => acc + s.effectiveMin, 0);
    const weekday = new Date(`${date}T12:00:00`).getDay();
    return {
      date,
      weekday,
      tasks: dayTasks,
      planned,
      actual,
      effective,
      hasPlan: plans.some((p) => p.date === date),
      isRestDay: rules.restDays.includes(weekday),
      isPast: date < today,
      isToday: date === today,
      completion: planned === 0 ? 0 : Math.round((actual / planned) * 100),
    };
  });

  const plannedTotal = days.reduce((acc, d) => acc + d.planned, 0);
  const actualTotal = days.reduce((acc, d) => acc + d.actual, 0);
  const missingPlans = days.filter((d) => !d.hasPlan && d.date >= today && !d.isRestDay);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Weekly plan</h1>
          <p className="text-xs text-text-muted">
            {weekStart} → {addDays(weekStart, 6)} · rest day{ rules.restDays.length === 1 ? '' : 's'}:{' '}
            {rules.restDays.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') || 'none'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setOffsetWeeks((w) => w - 1)}>
            ← Previous
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOffsetWeeks(0)}>
            This week
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOffsetWeeks((w) => w + 1)}>
            Next →
          </Button>
          <Button size="sm" variant="secondary" onClick={() => store.generateDays(weekStart, 7)}>
            Generate week
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Planned" value={formatMinutes(plannedTotal)} hint={`${days.reduce((a, d) => a + d.tasks.length, 0)} task(s)`} />
        <StatTile label="Actual" value={formatMinutes(actualTotal)} tone={actualTotal >= rules.minWeeklyMin ? 'success' : undefined} />
        <StatTile label="Weekly minimum" value={formatMinutes(rules.minWeeklyMin)} hint="personal rule" />
        <StatTile label="Days without a plan" value={missingPlans.length} hint={missingPlans.length === 0 ? 'every upcoming day is planned' : 'future days only'} />
      </div>

      <Card title="Planned vs actual" subtitle="Click a bar to inspect the day">
        <WeeklyBars
          days={days.map((d) => ({
            date: d.date,
            weekday: d.weekday,
            label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.weekday],
            plannedMin: d.planned,
            actualMin: Math.max(d.actual, d.effective),
            effectiveMin: d.effective,
            completionPercent: d.completion,
            active: d.effective >= 20,
          }))}
          targetWeeklyMin={rules.minWeeklyMin}
          onSelect={onOpenDay}
        />
      </Card>

      <Card
        title="Seven days"
        subtitle="Each row is one planned day; regenerate only what you need"
      >
        <ul className="space-y-2.5">
          {days.map((day) => (
            <li
              key={day.date}
              className={cx(
                'rounded-xl border p-3',
                day.isToday ? 'border-accent bg-accent-soft/20' : 'border-border',
                day.isRestDay && 'bg-surface-sunken/40',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="text-sm font-medium hover:text-accent"
                    onClick={() => onOpenDay(day.date)}
                  >
                    {formatLongDate(day.date)}
                  </button>
                  {day.isToday && <Badge tone="accent">today</Badge>}
                  {day.isRestDay && <Badge tone="neutral">rest day</Badge>}
                  {day.isPast && !day.hasPlan && <Badge tone="neutral">no plan recorded</Badge>}
                  {!day.hasPlan && !day.isPast && <Badge tone="warning">not planned yet</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span className="tnum">
                    {formatMinutes(day.planned)} planned · {formatMinutes(day.actual)} actual
                  </span>
                  {day.isPast && day.planned > 0 && (
                    <span className={cx('tnum', day.completion >= 80 ? 'text-success' : day.completion >= 50 ? 'text-warning' : 'text-text-muted')}>
                      {day.completion}%
                    </span>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => store.generatePlan(day.date)}>
                    {day.hasPlan ? 'Regenerate' : 'Generate'}
                  </Button>
                </div>
              </div>

              {day.tasks.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {day.tasks.slice(0, 6).map((task) => {
                    const subject = task.subjectId ? subjectLookup.get(task.subjectId) : null;
                    return (
                      <li key={task.id} className="flex items-center gap-2 text-xs">
                        <span
                          className={cx(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            task.status === 'done' ? 'bg-success' : task.status === 'skipped' ? 'bg-danger' : 'bg-text-muted/40',
                          )}
                          aria-hidden="true"
                        />
                        <span className="w-16 shrink-0 text-text-muted">{subject?.shortName ?? 'General'}</span>
                        <span className={cx('min-w-0 flex-1 truncate', task.status === 'done' && 'line-through text-text-muted')}>
                          {task.title}
                        </span>
                        <span className="tnum shrink-0 text-text-muted">{task.plannedMin}′</span>
                      </li>
                    );
                  })}
                  {day.tasks.length > 6 && (
                    <li className="text-[11px] text-text-muted">+{day.tasks.length - 6} more task(s)</li>
                  )}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-text-muted">
                  {day.isRestDay
                    ? 'Rest day — no work is scheduled by default. You can still add tasks manually.'
                    : 'No tasks recorded for this day.'}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <WeeklyReviewCard review={analytics.weeklyReview} />

      <Card title="Subject health this week" subtitle="Health scores based on last 14 days">
        <div className="space-y-3">
          {analytics.subjectHealth.slice(0, 4).map((h) => (
            <SubjectHealthCard key={h.subjectId} health={h} onSelect={(id) => navigate(`subject/${id}`)} />
          ))}
        </div>
      </Card>

      <Card title="Weekly review" subtitle="Closes the week: what worked, what changed">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Completion" value={`${analytics.weekly.averageCompletion}%`} hint="average of planned days" />
          <StatTile label="Active days" value={`${analytics.weekly.activeDays}/7`} />
          <StatTile label="Best day" value={analytics.weekly.bestDay?.label ?? '—'} />
          <StatTile label="Weakest day" value={analytics.weekly.weakestDay?.label ?? '—'} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate('analytics')}>
            Full analytics
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onOpenDay(today)}>
            Inspect today
          </Button>
          <span className="self-center text-[11px] text-text-muted">
            {daysBetween(weekStart, today) >= 0 && daysBetween(today, addDays(weekStart, 6)) >= 0
              ? 'This is the current week.'
              : 'Past and future weeks are read-only history unless you regenerate them.'}
          </span>
        </div>
      </Card>
    </div>
  );
}
