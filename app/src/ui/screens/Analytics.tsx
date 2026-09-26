/**
 * Analytics — bilingual.
 */

import { useState } from 'react';
import { Button, Card, EmptyState, SectionTitle, StatTile, cx } from '../components/primitives';
import { ProgressRing, RadialSubjects, WeeklyBars, StudyHeatmap } from '../components/charts';
import { IntelligencePanel } from '../components/intelligence';
import { useI18n } from '../../i18n';
import { formatMinutes } from '../../i18n/formatters';
import { PERIODS, type PeriodKey } from '../../state/analytics';
import { navigate } from '../router';
import { useAnalytics, useStudy } from '../../state/provider';
import type { HeatmapMetric } from '../../domain/analytics/heatmap';

export function AnalyticsScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { period, setPeriod } = useStudy();
  const { t, lang } = useI18n();
  const analytics = useAnalytics();
  const [metric, setMetric] = useState<HeatmapMetric>('time');
  const [showConsistencyDetail, setShowConsistencyDetail] = useState(false);

  const summary = analytics.period;
  const hasHistory = analytics.dataPoints > 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t('analytics.title')}</h1>
          <p className="text-xs text-text-muted">{summary.from} → {summary.to} · {analytics.dataPoints} {t('common.evidence')}</p>
        </div>
        <div role="tablist" aria-label="Time range" className="flex flex-wrap gap-1.5">
          {PERIODS.map((option) => (
            <button key={option.key} role="tab" aria-selected={period === option.key} onClick={() => setPeriod(option.key as PeriodKey)} className={cx('min-h-8 rounded-full border px-3 py-1.5 text-xs transition', period === option.key ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:text-text')}>
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {!hasHistory ? (
        <Card title={t('common.noData')}>
          <EmptyState title={t('common.notEnoughData')} description={t('common.notEnoughDataDesc')} />
          <div className="mt-3 flex gap-2">
            <Button variant="primary" onClick={() => navigate('today')}>{t('nav.today')}</Button>
            <Button variant="secondary" onClick={() => navigate('focus')}>{t('nav.focus')}</Button>
          </div>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <Card className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <ProgressRing
                percent={summary.completionRate}
                label={summary.label}
                percentNote={t('glossary.completion')}
                primary={<><span className="tnum block">{formatMinutes(summary.totalMin, lang)} {t('common.completed')}</span><span className="tnum block">{formatMinutes(summary.effectiveMin, lang)} {t('charts.effectiveTime')}</span></>}
                secondary={summary.trendPercent === null ? t('common.noData') : `${summary.trendPercent >= 0 ? '+' : ''}${summary.trendPercent}%`}
                tone={summary.completionRate >= 80 ? 'success' : summary.completionRate >= 45 ? 'accent' : 'warning'}
                ariaSummary={`${summary.label}`}
              />
              <dl className="w-full space-y-2 text-xs sm:max-w-xs">
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t('week.planned')}</dt><dd className="tnum">{summary.plannedDays}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-text-muted">{t('week.activeDays')}</dt><dd className="tnum">{summary.activeDays}</dd></div>
              </dl>
            </Card>

            <Card title={t('analytics.consistency')} subtitle={t('analytics.consistency')}>
              <div className="flex items-end justify-between gap-3">
                <p className="tnum text-4xl font-semibold">{summary.consistency.insufficientData ? '—' : summary.consistency.score}<span className="text-base text-text-muted">/100</span></p>
                <Button size="sm" variant="ghost" onClick={() => setShowConsistencyDetail((v) => !v)}>{showConsistencyDetail ? t('common.hideDetails') : t('explain.howCalculated')}</Button>
              </div>
              <p className="mt-2 text-xs text-text-muted">{summary.consistency.sentence}</p>
              {showConsistencyDetail && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {summary.consistency.factors.map((factor) => (
                    <div key={factor.key}><div className="flex items-baseline justify-between gap-2 text-xs"><span className="text-text-muted">{factor.label}</span><span className="tnum">{Math.round(factor.value * 100)}%</span></div><div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"><div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, factor.value * 100))}%` }} /></div><p className="mt-0.5 text-[11px] text-text-muted">{factor.explanation}</p></div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle hint={t('analytics.progressIntelligenceHint')}>{t('analytics.progressIntelligence')}</SectionTitle>
            <IntelligencePanel chapterProfiles={analytics.chapterProfiles} subjectHealth={analytics.subjectHealth} weeklyReview={analytics.weeklyReview} adaptationPlan={analytics.adaptationPlan} performance={analytics.performance} onOpenSubject={(id) => navigate(`subject/${id}`)} onOpenChapter={(id) => navigate(`chapter/${id}`)} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card title={t('analytics.studyTimeBySubject')} subtitle={summary.label}><RadialSubjects entries={summary.subjectDistribution} centerLabel={summary.label} centerValue={formatMinutes(summary.effectiveMin, lang)} centerHint={t('charts.effectiveTime')} onSelect={(id) => navigate(`subject/${id}`)} emptyLabel={t('common.noData')} /></Card>
            <Card title={t('analytics.weeklyRhythm')} subtitle={t('analytics.weeklyRhythm')}><WeeklyBars days={analytics.weekly.days} targetWeeklyMin={analytics.weekly.targetMin} onSelect={onOpenDay} /></Card>
          </section>

          <Card title={t('charts.heatmap')} subtitle={t('analytics.subtitle')}><StudyHeatmap cells={analytics.heatmap[metric]} metric={metric} onMetricChange={setMetric} onSelectDay={onOpenDay} /></Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card title={t('analytics.insights')} subtitle={t('analytics.insights')}>
              {analytics.insights.length === 0 ? <EmptyState title={t('common.notEnoughData')} description={t('common.notEnoughDataDesc')} /> : <ul className="space-y-2">{analytics.insights.map((insight) => <li key={insight.id} className="rounded-xl border border-border p-3"><p className="text-sm">{insight.text}</p><p className="mt-1 text-[11px] text-text-muted">{t('common.evidence')}: {insight.evidence} · {insight.sampleSize}</p></li>)}</ul>}
            </Card>
            <Card title={t('analytics.backlogTrend')} subtitle={`${analytics.backlog.trend} · ${analytics.backlog.openItems} ${t('common.open')}`}>
              <div className="grid grid-cols-2 gap-2"><StatTile label={t('common.open')} value={formatMinutes(analytics.backlog.openMin, lang)} /><StatTile label={t('common.completed')} value={formatMinutes(analytics.backlog.scheduledMin, lang)} /><StatTile label={t('common.completed')} value={formatMinutes(analytics.backlog.recoveredMin, lang)} /><StatTile label={t('common.noData')} value={formatMinutes(analytics.backlog.droppedMin, lang)} /></div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
