/**
 * Recovery — bilingual.
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Select, StatTile } from '../components/primitives';
import { AdaptationCard, SubjectHealthCard } from '../components/intelligence';
import { useI18n } from '../../i18n';
import { formatMinutes } from '../../i18n/formatters';
import { navigate } from '../router';
import { useAnalytics, useStore, useStudy } from '../../state/provider';

export function RecoveryScreen() {
  const { today, state } = useStudy();
  const { t, lang } = useI18n();
  const store = useStore();
  const analytics = useAnalytics();

  const [missedDays, setMissedDays] = useState(Math.max(1, Math.min(30, analytics.streaks.missedDays || 1)));
  const [availableMin, setAvailableMin] = useState(analytics.todayCheckIn?.availableMin ?? 120);
  const [energy, setEnergy] = useState(3);
  const [applied, setApplied] = useState<string | null>(null);

  const plan = useMemo(() => store.buildRecoveryPlan('auto'), [store, state.revision, analytics.backlog.openMin]);
  const todayPlan = plan.days[0] ?? { date: today, additions: [], totalMin: 0 };
  const week = plan.days.slice(0, 7);
  const backlog = state.snapshot.backlog.filter((b) => b.state === 'open');

  if (backlog.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold">{t('recovery.title')}</h1>
        <Card><EmptyState title={t('recovery.nothingToRecover')} description={t('recovery.nothingToRecoverDesc')} /></Card>
        <AdaptationCard plan={analytics.adaptationPlan} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t('recovery.title')}</h1>
          <p className="text-xs text-text-muted">{backlog.length} {t('common.open')} · {formatMinutes(analytics.backlog.openMin, lang)}</p>
        </div>
        <Badge tone={plan.mode === 'D' ? 'danger' : plan.mode === 'C' ? 'warning' : 'accent'}>Mode {plan.mode}</Badge>
      </header>

      <Card title={t('recovery.title')} subtitle={t('recovery.subtitle')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('form.date')}><Select value={missedDays} onChange={(e) => setMissedDays(Number(e.target.value))}>{[1,2,3,4,5,7,10,14,21,30].map((v) => <option key={v} value={v}>{v} {t('time.days')}</option>)}</Select></Field>
          <Field label={t('form.availableTime')}><Select value={availableMin} onChange={(e) => setAvailableMin(Number(e.target.value))}>{[30,45,60,90,120,150,180,240,300].map((v) => <option key={v} value={v}>{formatMinutes(v, lang)}</option>)}</Select></Field>
          <Field label={t('form.energy')}><Select value={energy} onChange={(e) => setEnergy(Number(e.target.value))}>{[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}</option>)}</Select></Field>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('common.today')}><StatTile label={t('week.planned')} value={formatMinutes(todayPlan.totalMin, lang)} /><ul className="mt-2 space-y-1 text-xs">{todayPlan.additions.map((a,i) => <li key={i}>{a.subjectId} · {formatMinutes(a.minutes, lang)}</li>)}</ul></Card>
        <Card title={t('common.thisWeek')}><StatTile label={t('week.planned')} value={formatMinutes(week.reduce((acc,d)=>acc+d.totalMin,0), lang)} /><ul className="mt-2 space-y-1 text-xs">{week.slice(0,3).map((d) => <li key={d.date}>{d.date} · {formatMinutes(d.totalMin, lang)}</li>)}</ul></Card>
        <Card title={t('recovery.plan')}><p className="text-xs text-text-muted">{plan.rationale}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="primary" onClick={() => { store.applyRecoveryPlan(plan); setApplied(new Date().toISOString()); }}>{t('recovery.applyPlan')}</Button><Button size="sm" variant="ghost" onClick={() => navigate('today')}>{t('nav.today')}</Button></div>{applied && <p className="mt-2 text-xs text-success">{t('common.applied')} {applied.slice(11,19)}</p>}</Card>
      </div>

      <AdaptationCard plan={analytics.adaptationPlan} />

      <Card title={t('subjects.healthTitle')} subtitle={t('subjects.healthSubtitle')}>
        <div className="space-y-3">{analytics.subjectHealth.filter((h) => h.label === 'critical' || h.label === 'at-risk').slice(0,3).map((h) => <SubjectHealthCard key={h.subjectId} health={h} onSelect={(id) => navigate(`subject/${id}`)} />)}</div>
      </Card>
    </div>
  );
}
