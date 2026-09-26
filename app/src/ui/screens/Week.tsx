/**
 * Weekly plan — bilingual.
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Card, StatTile, cx } from '../components/primitives';
import { WeeklyBars } from '../components/charts';
import { WeeklyReviewCard, SubjectHealthCard } from '../components/intelligence';
import { useI18n } from '../../i18n';
import { formatMinutes, formatLongDate } from '../../i18n/formatters';
import { addDays } from '../../domain/date';
import { navigate } from '../router';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { useLookups } from '../lookups';

export function WeekScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { today, state } = useStudy();
  const { t, lang } = useI18n();
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
          <h1 className="text-xl font-semibold">{t('week.title')}</h1>
          <p className="text-xs text-text-muted">{weekStart} → {addDays(weekStart, 6)}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setOffsetWeeks((w) => w - 1)}>← {t('common.previous')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setOffsetWeeks(0)}>{t('common.today')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setOffsetWeeks((w) => w + 1)}>{t('common.next')} →</Button>
          <Button size="sm" variant="secondary" onClick={() => store.generateDays(weekStart, 7)}>{t('week.title')}</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('week.planned')} value={formatMinutes(plannedTotal, lang)} />
        <StatTile label={t('week.completed')} value={formatMinutes(actualTotal, lang)} tone={actualTotal >= rules.minWeeklyMin ? 'success' : undefined} />
        <StatTile label={t('week.planned')} value={formatMinutes(rules.minWeeklyMin, lang)} />
        <StatTile label={t('common.pending')} value={missingPlans.length} />
      </div>

      <Card title={t('charts.plannedVsActual')} subtitle={t('week.subtitle')}>
        <WeeklyBars
          days={days.map((d) => ({
            date: d.date,
            weekday: d.weekday,
            label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.weekday],
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

      <Card title={t('week.title')} subtitle={t('week.subtitle')}>
        <ul className="space-y-2.5">
          {days.map((day) => (
            <li key={day.date} className={cx('rounded-xl border p-3', day.isToday ? 'border-accent bg-accent-soft/20' : 'border-border', day.isRestDay && 'bg-surface-sunken/40')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="text-sm font-medium hover:text-accent" onClick={() => onOpenDay(day.date)}>{formatLongDate(day.date, lang)}</button>
                  {day.isToday && <Badge tone="accent">{t('common.today')}</Badge>}
                  {day.isRestDay && <Badge tone="neutral">{t('common.inactive')}</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span className="tnum">{formatMinutes(day.planned, lang)} {t('week.planned')} · {formatMinutes(day.actual, lang)} {t('week.completed')}</span>
                  <Button size="sm" variant="ghost" onClick={() => store.generatePlan(day.date)}>{day.hasPlan ? t('form.edit') : t('form.add')}</Button>
                </div>
              </div>
              {day.tasks.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {day.tasks.slice(0, 6).map((task) => {
                    const subject = task.subjectId ? subjectLookup.get(task.subjectId) : null;
                    return <li key={task.id} className="flex items-center gap-2 text-xs"><span className={cx('h-1.5 w-1.5 rounded-full', task.status === 'done' ? 'bg-success' : 'bg-text-muted/40')} /><span className="w-16 shrink-0 text-text-muted">{subject?.shortName ?? ''}</span><span className="min-w-0 flex-1 truncate">{task.title}</span><span className="tnum">{task.plannedMin}′</span></li>;
                  })}
                </ul>
              ) : <p className="mt-2 text-xs text-text-muted">{t('empty.noTasks')}</p>}
            </li>
          ))}
        </ul>
      </Card>

      <WeeklyReviewCard review={analytics.weeklyReview} />

      <Card title={t('subjects.healthTitle')} subtitle={t('subjects.healthSubtitle')}>
        <div className="space-y-3">{analytics.subjectHealth.slice(0, 4).map((h) => <SubjectHealthCard key={h.subjectId} health={h} onSelect={(id) => navigate(`subject/${id}`)} />)}</div>
      </Card>

      <Card title={t('analytics.weeklyReview')} subtitle={t('analytics.weeklyReview')}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label={t('glossary.completion')} value={`${analytics.weekly.averageCompletion}%`} />
          <StatTile label={t('week.activeDays')} value={`${analytics.weekly.activeDays}/7`} />
          <StatTile label={t('week.bestDay')} value={analytics.weekly.bestDay?.label ?? '—'} />
          <StatTile label={t('week.weakestDay')} value={analytics.weekly.weakestDay?.label ?? '—'} />
        </div>
      </Card>
    </div>
  );
}
