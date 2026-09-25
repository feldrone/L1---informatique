/**
 * Recovery Center — the "I fell behind" flow.
 *
 * The student answers four short questions (missed days, time available today, energy, upcoming
 * exam / urgent work), then sees a realistic preview: TODAY, the NEXT 3 DAYS and THIS WEEK.
 * Nothing is applied until the plan is explicitly accepted.
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Select, StatTile, TextArea, cx } from '../components/primitives';
import { AdaptationCard, SubjectHealthCard } from '../components/intelligence';
import { formatMinutes, addDays } from '../../domain/date';
import { navigate } from '../router';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { useLookups } from '../lookups';

const MODE_COPY: Record<string, { title: string; body: string }> = {
  A: {
    title: 'MODE A — normal planning',
    body: 'One missed day at most. Recovery work stays limited and today’s plan keeps its shape.',
  },
  B: {
    title: 'MODE B — controlled backlog reduction',
    body: 'A few days were missed. The backlog is spread over several days instead of being stacked on today.',
  },
  C: {
    title: 'MODE C — emergency catch-up',
    body: 'A week was lost. Only the highest-impact work is recovered; the rest is explicitly deferred, not deleted.',
  },
  D: {
    title: 'MODE D — reset & rebuild',
    body: 'A long interruption. Old low-value work is archived and a clean, rebuildable plan is created.',
  },
};

export function RecoveryScreen() {
  const { today, state } = useStudy();
  const store = useStore();
  const analytics = useAnalytics();
  const { subjectLookup } = useLookups();

  const [missedDays, setMissedDays] = useState(Math.max(1, Math.min(30, analytics.streaks.missedDays || 1)));
  const [availableMin, setAvailableMin] = useState(analytics.todayCheckIn?.availableMin ?? 120);
  const [energy, setEnergy] = useState(3);
  const [examSoon, setExamSoon] = useState<'yes' | 'no'>(
    analytics.upcomingExams.some((exam) => exam.date <= addDays(today, 7)) ? 'yes' : 'no',
  );
  const [urgent, setUrgent] = useState('');
  const [applied, setApplied] = useState<string | null>(null);

  const plan = useMemo(() => store.buildRecoveryPlan('auto'), [store, state.revision, analytics.backlog.openMin]);
  const copy = MODE_COPY[plan.mode] ?? MODE_COPY.A;

  const todayPlan = plan.days[0] ?? { date: today, additions: [], totalMin: 0 };
  const next3 = plan.days.slice(0, 3);
  const week = plan.days.slice(0, 7);

  const backlog = state.snapshot.backlog.filter((b) => b.state === 'open');
  const classificationCounts = backlog.reduce<Record<string, number>>((acc, item) => {
    acc[item.classification] = (acc[item.classification] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Recovery required</h1>
          <p className="text-xs text-text-muted">
            Uses only recorded data: {backlog.length} open backlog item(s),{' '}
            {formatMinutes(analytics.backlog.openMin)} unfinished. Recovery never doubles a day’s load.
          </p>
        </div>
        <Badge tone={plan.mode === 'D' ? 'danger' : plan.mode === 'C' ? 'warning' : 'accent'}>Mode {plan.mode}</Badge>
      </header>

      <Card title="I fell behind" subtitle="Answer five short questions — the preview updates immediately">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="How many days were missed?">
            <Select value={missedDays} onChange={(event) => setMissedDays(Number(event.target.value))}>
              {[1, 2, 3, 4, 5, 7, 10, 14, 21, 30].map((value) => (
                <option key={value} value={value}>
                  {value} day{value > 1 ? 's' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Available time today">
            <Select value={availableMin} onChange={(event) => setAvailableMin(Number(event.target.value))}>
              {[30, 45, 60, 90, 120, 150, 180, 240, 300].map((value) => (
                <option key={value} value={value}>
                  {formatMinutes(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Energy today">
            <Select value={energy} onChange={(event) => setEnergy(Number(event.target.value))}>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} — {['very low', 'low', 'normal', 'good', 'high'][value - 1]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Exam within 7 days?">
            <Select value={examSoon} onChange={(event) => setExamSoon(event.target.value as 'yes' | 'no')}>
              <option value="no">No</option>
              <option value="yes">Yes — prioritise exam subjects</option>
            </Select>
          </Field>
          <Field label="Urgent university work">
            <TextArea
              value={urgent}
              onChange={(event) => setUrgent(event.target.value)}
              placeholder="e.g. TD sheet due tomorrow, TP report, class change"
            />
          </Field>
        </div>
        <p className="mt-2 text-[11px] text-text-muted">
          These answers are used for the preview. Save the check-in on the Today screen to persist them and regenerate
          the normal plan.
        </p>
      </Card>

      <Card title={copy.title} subtitle={plan.rationale}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Overdue" value={formatMinutes(plan.overdueMin)} hint={`${plan.missedDays} missed day(s) detected`} />
          <StatTile label="Recovered" value={formatMinutes(plan.recoverableMin)} tone="success" hint={`spread over ${plan.horizonDays} day(s)`} />
          <StatTile label="Deferred" value={formatMinutes(plan.deferMin)} hint="moved to later days, never deleted" />
          <StatTile label="Archived" value={formatMinutes(plan.droppedMin)} hint={plan.mode === 'D' ? 'long-interruption archive' : 'only in mode D'} />
        </div>
        <p className="mt-3 text-sm text-text-muted">{copy.body}</p>
        {plan.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-warning">
            {plan.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Today" subtitle="What today would look like">
          {todayPlan.totalMin === 0 ? (
            <EmptyState title="Nothing to recover" description="No open backlog item — today’s plan is complete as it stands." />
          ) : (
            <>
              <StatTile label="Recovery time" value={formatMinutes(todayPlan.totalMin)} hint="kept below the normal load" />
              <ul className="mt-3 space-y-2">
                {todayPlan.additions.map((addition) => (
                  <li key={addition.subjectId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: subjectLookup.get(addition.subjectId)?.color }} />
                      {subjectLookup.get(addition.subjectId)?.shortName ?? addition.subjectId}
                    </span>
                    <span className="tnum text-xs text-text-muted">
                      {formatMinutes(addition.minutes)} · {addition.backlogItemIds.length} item(s)
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Next 3 days" subtitle="Realistic distribution">
          <ul className="space-y-3">
            {next3.map((day) => (
              <li key={day.date}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{day.date}</span>
                  <span className="tnum text-xs text-text-muted">{formatMinutes(day.totalMin)}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${Math.min(100, (day.totalMin / Math.max(60, availableMin)) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-text-muted">
                  {day.additions.length === 0
                    ? 'No recovery block — normal plan only.'
                    : day.additions.map((a) => subjectLookup.get(a.subjectId)?.shortName ?? a.subjectId).join(', ')}
                </p>
              </li>
            ))}
            {next3.length === 0 && <li className="text-sm text-text-muted">No recovery horizon required.</li>}
          </ul>
        </Card>

        <Card title="This week" subtitle="Total recovery load">
          <StatTile label="This week" value={formatMinutes(week.reduce((acc, d) => acc + d.totalMin, 0))} hint={`${week.length} day(s) covered`} />
          <ul className="mt-3 space-y-1 text-xs text-text-muted">
            {Object.entries(classificationCounts).length === 0 ? (
              <li>No backlog classification required.</li>
            ) : (
              Object.entries(classificationCounts).map(([classification, count]) => (
                <li key={classification} className="flex justify-between">
                  <span>{classification}</span>
                  <span className="tnum">{count}</span>
                </li>
              ))
            )}
          </ul>
          <p className="mt-3 text-[11px] text-text-muted">
            Classifications: protect · distribute · defer · drop. Nothing is silently discarded.
          </p>
        </Card>
      </div>

      <AdaptationCard plan={analytics.adaptationPlan} />

      {analytics.subjectHealth.filter((h) => h.label === 'critical' || h.label === 'at-risk').length > 0 && (
        <Card title="Subject health — at risk" subtitle="Health scores that influence recovery priority">
          <div className="space-y-3">
            {analytics.subjectHealth
              .filter((h) => h.label === 'critical' || h.label === 'at-risk')
              .slice(0, 3)
              .map((h) => (
                <SubjectHealthCard key={h.subjectId} health={h} onSelect={(id) => navigate(`subject/${id}`)} />
              ))}
          </div>
        </Card>
      )}

      <Card title="Apply the recovery plan" subtitle="Only what you accept is written to the plan">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={() => {
              store.applyRecoveryPlan(plan);
              setApplied(`Recovery plan (mode ${plan.mode}) applied. Recovery blocks were added to today only.`);
            }}
          >
            Accept TODAY’s recovery blocks
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              store.generateDays(today, plan.horizonDays);
              setApplied(`Plans regenerated for the next ${plan.horizonDays} day(s) using mode ${plan.mode}.`);
            }}
          >
            Rebuild the next {plan.horizonDays} day(s)
          </Button>
          <Button variant="ghost" onClick={() => navigate('today')}>
            Back to Today
          </Button>
        </div>
        {applied && <p className="mt-2 text-xs text-success">{applied}</p>}
      </Card>

      <Card title="Backlog detail" subtitle="Everything unfinished, with the reason it is ranked where it is">
        {backlog.length === 0 ? (
          <EmptyState title="Backlog empty" description="No unfinished work from previous days. Nothing to recover." />
        ) : (
          <ul className="space-y-2">
            {[...backlog]
              .sort((a, b) => b.score - a.score)
              .slice(0, 12)
              .map((item) => (
                <li key={item.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm">{item.title}</span>
                    <span className="flex items-center gap-2">
                      <Badge
                        tone={
                          item.classification === 'drop'
                            ? 'danger'
                            : item.classification === 'protect'
                              ? 'warning'
                              : item.classification === 'defer'
                                ? 'neutral'
                                : 'accent'
                        }
                      >
                        {item.classification}
                      </Badge>
                      <span className="tnum text-xs text-text-muted">{formatMinutes(item.minutes)}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted">
                    From {item.originalDate} · {subjectLookup.get(item.subjectId)?.shortName ?? 'General'} · score{' '}
                    {item.score.toFixed(2)} (weight {item.weight.toFixed(2)}, urgency {item.urgency.toFixed(2)}, mastery impact{' '}
                    {item.masteryImpact.toFixed(2)})
                    {item.plannedFor ? ` · scheduled ${item.plannedFor}` : ''}
                  </p>
                </li>
              ))}
          </ul>
        )}
        <p className={cx('mt-3 text-[11px] text-text-muted')}>
          Classification is transparent: protect (exam-critical or highest weight, recovered first), distribute (spread over
          several days), defer (low value right now, kept in the backlog) and drop (archived only after a long
          interruption in mode D). Nothing is ever deleted silently.
        </p>
      </Card>
    </div>
  );
}
