/**
 * Intelligence UI — bilingual, explainable, RTL-aware.
 */

import { useState } from 'react';
import { Badge, Button, Card, EmptyState, SectionTitle, StatTile, cx } from './primitives';
import { HelpButton, ExplainableSection } from './contextualHelp';
import { useI18n } from '../../i18n';
import { formatMinutes } from '../../i18n/formatters';
import type { ChapterProfile } from '../../domain/analytics/chapterProfile';
import type { SubjectHealth } from '../../domain/analytics/subjectHealth';
import type { WeeklyReview } from '../../domain/analytics/weeklyReview';
import type { AdaptationPlan } from '../../domain/planning/adaptation';
import type { PerformanceSummary } from '../../domain/analytics/performance';
import { navigate } from '../router';

function HealthBadge({ label }: { label: SubjectHealth['label'] }) {
  const { t } = useI18n();
  const tones: Record<SubjectHealth['label'], 'success' | 'accent' | 'warning' | 'danger' | 'neutral'> = {
    excellent: 'success',
    good: 'accent',
    'at-risk': 'warning',
    critical: 'danger',
    'not-started': 'neutral',
    insufficient: 'neutral',
  };
  const labelMap: Record<SubjectHealth['label'], string> = {
    excellent: t('common.healthy'),
    good: t('common.stable'),
    'at-risk': t('common.atRisk'),
    critical: t('common.critical'),
    'not-started': t('common.noData'),
    insufficient: t('explain.notEnoughData'),
  };
  return <Badge tone={tones[label]}>{labelMap[label] ?? label}</Badge>;
}

export function SubjectHealthCard({ health, onSelect }: { health: SubjectHealth; onSelect?: (id: string) => void }) {
  const [showFactors, setShowFactors] = useState(false);
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: health.color }} />
          <span className="text-sm font-medium">{health.shortName}</span>
          <HealthBadge label={health.label} />
        </div>
        <span className="tnum text-sm font-semibold">{health.score}/100</span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-text-muted">{t('glossary.mastery')}</span>
          <p className="tnum font-medium">{health.stats.masteryAvg ?? '—'}/5</p>
        </div>
        <div>
          <span className="text-text-muted">{t('glossary.completion')}</span>
          <p className="tnum font-medium">{health.stats.completionRate}%</p>
        </div>
        <div>
          <span className="text-text-muted">{t('common.due')}</span>
          <p className="tnum font-medium">{health.stats.revisionCoverage}%</p>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-text-muted">{health.evidence.sentence}</p>

      {health.recommendations.length > 0 && (
        <div className="mt-2 rounded-lg bg-surface-sunken/60 p-2">
          <p className="text-xs font-medium flex items-center gap-1">
            {t('common.recommendation')} <HelpButton titleKey="help.recommendation.title" descKey="help.recommendation.desc" />
          </p>
          <p className="mt-1 text-xs">{health.recommendations[0].text}</p>
          <ExplainableSection why={health.recommendations[0].reason} evidence={health.recommendations[0].evidence} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setShowFactors((v) => !v)}>
          {showFactors ? t('common.hideDetails') : t('explain.howCalculated')}
        </Button>
        {onSelect && (
          <Button size="sm" variant="secondary" onClick={() => onSelect(health.subjectId)}>
            {t('common.showDetails')}
          </Button>
        )}
      </div>

      {showFactors && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {health.factors.map((f) => (
            <div key={f.key}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-text-muted">
                  {f.label} <span className="text-text-muted/60">({Math.round(f.weight * 100)}%)</span>
                </span>
                <span className="tnum">{Math.round(f.value * 100)}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.round(f.value * 100)}%` }} />
              </div>
              <p className="mt-0.5 text-[11px] text-text-muted">{f.evidence}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChapterProfileCard({ profile, onOpen }: { profile: ChapterProfile; onOpen?: (id: string) => void }) {
  const [showDetail, setShowDetail] = useState(false);
  const { t, lang } = useI18n();
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{profile.title}</p>
          <p className="text-xs text-text-muted">
            {profile.subjectShortName} · {profile.kind} · {t('glossary.mastery')} {profile.mastery.level}/5 ({profile.mastery.text}) · {t('glossary.subjectHealth')} {profile.health.score}
          </p>
        </div>
        <Badge tone={profile.health.label === 'excellent' ? 'success' : profile.health.label === 'critical' ? 'danger' : profile.health.label === 'at-risk' ? 'warning' : 'neutral'}>
          {profile.health.label}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-text-muted">{t('dashboard.tasksCompleted')}</span>
          <p className="tnum">{profile.tasks.done}/{profile.tasks.total} ({profile.tasks.completionRate}%)</p>
        </div>
        <div>
          <span className="text-text-muted">{t('charts.effectiveTime')}</span>
          <p className="tnum">{formatMinutes(profile.sessions.effectiveMin, lang)}</p>
        </div>
        <div>
          <span className="text-text-muted">{t('glossary.mistakes')}</span>
          <p className="tnum">{profile.mistakes.open} {t('common.open')} / {profile.mistakes.total}</p>
        </div>
      </div>

      {profile.recommendations[0] && (
        <div className="mt-2 rounded-lg bg-accent-soft/40 p-2">
          <p className="text-xs font-medium">{profile.recommendations[0].text}</p>
          <ExplainableSection why={profile.recommendations[0].reason} evidence={profile.recommendations[0].evidence} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setShowDetail((v) => !v)}>
          {showDetail ? t('common.hideDetails') : t('common.showDetails')}
        </Button>
        {onOpen && (
          <Button size="sm" variant="secondary" onClick={() => onOpen(profile.chapterId)}>
            {t('common.showDetails')}
          </Button>
        )}
      </div>

      {showDetail && (
        <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs text-text-muted">
          <p>{t('glossary.focus')}: {profile.sessions.count} · {formatMinutes(profile.sessions.totalMin, lang)} total, {formatMinutes(profile.sessions.effectiveMin, lang)} effective, {profile.sessions.efficiency}%</p>
          <p>{t('glossary.mistakes')}: {profile.quizzes.attempts} {t('common.completed')}, {profile.quizzes.totalQuestions} Q, {profile.quizzes.accuracy ?? '—'}%</p>
          <p>{t('week.planned')}: {profile.reviews.count} · last {profile.reviews.lastRevisionDate ?? t('common.noData')}, next {profile.reviews.nextDueDate ?? t('common.noData')}</p>
          <p>{t('glossary.prerequisite')}: {profile.prerequisites.total} total, {profile.prerequisites.unmet} {t('common.pending')} {profile.prerequisites.isBlocked ? `(${t('common.critical')})` : ''}</p>
          <p>{profile.evidence.sampleSize} {t('common.evidence')} · last {profile.evidence.lastActivityDate ?? t('common.noData')}</p>
        </div>
      )}
    </div>
  );
}

export function WeeklyReviewCard({ review }: { review: WeeklyReview }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { t, lang } = useI18n();
  if (review.evidence.insufficientData) {
    return (
      <Card title={t('dashboard.weeklyReview')} subtitle={review.label}>
        <EmptyState title={t('common.notEnoughData')} description={review.evidence.sentence} />
      </Card>
    );
  }

  return (
    <Card title={t('dashboard.weeklyReview')} subtitle={`${review.label} · ${review.stats.activeDays} ${t('week.activeDays')} / ${review.stats.plannedDays}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('glossary.completion')} value={`${review.stats.completionRate}%`} hint={`${review.stats.doneTasks}/${review.stats.totalTasks}`} />
        <StatTile label={t('charts.effectiveTime')} value={formatMinutes(review.stats.effectiveMin, lang)} hint={`avg ${review.stats.avgDailyMin}/day`} />
        <StatTile label={t('week.bestDay')} value={review.stats.bestDay?.date ?? '—'} hint={review.stats.bestDay ? formatMinutes(review.stats.bestDay.minutes, lang) : undefined} />
        <StatTile label={t('glossary.focus')} value={review.stats.revisionCount} hint={`${review.stats.focusSessions} ${t('glossary.focus')}`} />
      </div>

      {review.highlights.length > 0 && (
        <div className="mt-4">
          <SectionTitle>{t('dashboard.whatIsImproving')}</SectionTitle>
          <ul className="space-y-1.5">
            {review.highlights.map((h) => (
              <li key={h.id} className="rounded-xl border border-success/30 bg-success/5 p-2.5 text-xs">
                <p className="font-medium">{h.text}</p>
                <p className="mt-0.5 text-[11px] text-text-muted">{t('common.evidence')}: {h.evidence}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {review.blockers.length > 0 && (
        <div className="mt-4">
          <SectionTitle>{t('dashboard.whatNeedsAttention')}</SectionTitle>
          <ul className="space-y-1.5">
            {review.blockers.map((b) => (
              <li key={b.id} className="rounded-xl border border-warning/30 bg-warning/5 p-2.5 text-xs">
                <p className="font-medium">{b.text}</p>
                <p className="mt-0.5 text-[11px] text-text-muted">{t('common.evidence')}: {b.evidence}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {review.recommendations.length > 0 && (
        <div className="mt-4">
          <SectionTitle>{t('dashboard.whatShouldIDoNext')}</SectionTitle>
          <ul className="space-y-1.5">
            {review.recommendations.slice(0, 3).map((r) => (
              <li key={r.id} className="rounded-xl border border-border p-2.5 text-xs">
                <p className="font-medium">{r.text}</p>
                <ExplainableSection why={r.reason} evidence={r.evidence} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setShowBreakdown((v) => !v)}>
          {showBreakdown ? t('common.hideDetails') : t('common.showDetails')}
        </Button>
      </div>

      {showBreakdown && (
        <div className="mt-3 space-y-1.5">
          {review.subjectBreakdown.map((s) => (
            <div key={s.subjectId} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.shortName}
              </span>
              <span className="tnum text-text-muted">{s.tasksDone}/{s.tasksTotal} · {formatMinutes(s.effectiveMin, lang)} ({s.share}%)</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function AdaptationCard({ plan, onApply }: { plan: AdaptationPlan; onApply?: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const { t } = useI18n();
  const suggestions = showAll ? plan.suggestions : plan.suggestions.slice(0, 3);

  if (plan.evidence.insufficientData) {
    return (
      <Card title={t('glossary.adaptivePlanning')} subtitle={t('common.notEnoughData')}>
        <EmptyState title={t('common.notEnoughData')} description={plan.rationale} />
      </Card>
    );
  }

  if (plan.suggestions.length === 0) {
    return (
      <Card title={t('glossary.adaptivePlanning')} subtitle={t('common.stable')}>
        <p className="text-sm">{plan.rationale}</p>
        <p className="mt-2 text-xs text-text-muted">{t('common.evidence')}: {plan.evidence.behaviourSample} behaviour, {plan.evidence.healthSample} health, {plan.evidence.performanceSample} performance</p>
      </Card>
    );
  }

  return (
    <Card title={t('glossary.adaptivePlanning')} subtitle={`${plan.suggestions.length} ${t('dashboard.recommendedActions')} · ${plan.rationale}`}>
      <ul className="space-y-2.5">
        {suggestions.map((s) => (
          <li key={s.id} className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{s.text}</p>
              <Badge tone={s.impact === 'high' ? 'danger' : s.impact === 'medium' ? 'warning' : 'neutral'}>{s.impact}</Badge>
            </div>
            <ExplainableSection why={s.reason} evidence={s.evidence} recommendation={s.suggestedChange ? `${String(s.suggestedChange.field)} ${String(s.suggestedChange.from)} → ${String(s.suggestedChange.to)} — ${s.suggestedChange.explanation}` : undefined} />
            <div className="mt-2 flex gap-1.5">
              {s.subjectId && <Button size="sm" variant="ghost" onClick={() => navigate(`subject/${s.subjectId}`)}>{t('nav.subjects')}</Button>}
              {s.chapterId && <Button size="sm" variant="ghost" onClick={() => navigate(`chapter/${s.chapterId}`)}>{t('subjects.title')}</Button>}
              {onApply && s.actionable && <Button size="sm" variant="secondary" onClick={() => onApply(s.id)}>{t('common.apply')}</Button>}
            </div>
          </li>
        ))}
      </ul>

      {plan.suggestions.length > 3 && (
        <Button size="sm" variant="ghost" className="mt-3" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t('common.hideDetails') : `${t('common.showDetails')} ${plan.suggestions.length}`}
        </Button>
      )}

      {plan.adjustedRules && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft/30 p-3">
          <p className="text-xs font-semibold text-accent flex items-center gap-1">{t('common.recommendation')} <HelpButton titleKey="help.adaptivePlanning.title" descKey="help.adaptivePlanning.desc" /></p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-text-muted">
            {Object.entries(plan.adjustedRules).map(([k, v]) => (
              <li key={k}>{k}: {Array.isArray(v) ? v.join(', ') : String(v)}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function PerformanceCard({ performance }: { performance: PerformanceSummary }) {
  const { t, lang } = useI18n();
  if (performance.insufficientData) {
    return (
      <Card title={t('glossary.performance')} subtitle={performance.label}>
        <EmptyState title={t('common.notEnoughData')} description={t('common.notEnoughDataDesc')} />
      </Card>
    );
  }

  return (
    <Card title={t('glossary.performance')} subtitle={`${performance.label} · ${performance.windowDays} ${t('time.days')} · ${performance.overall.completionRate}% ${t('glossary.completion')}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('dashboard.tasksCompleted')} value={`${performance.overall.tasksDone}/${performance.overall.tasksTotal}`} hint={`${performance.overall.tasksSkipped} ${t('task.skip')}`} />
        <StatTile label={t('charts.effectiveTime')} value={formatMinutes(performance.overall.effectiveMin, lang)} hint={`${performance.overall.efficiency}%`} />
        <StatTile label={t('week.activeDays')} value={`${performance.velocity.activeDays}/${performance.velocity.totalDays}`} hint={`${performance.velocity.consistency}%`} />
        <StatTile label={t('glossary.focus')} value={`${performance.focus.focusSessions}`} hint={`${performance.focus.activeRecallShare}%`} />
      </div>

      {performance.bySubject.length > 0 && (
        <div className="mt-4">
          <SectionTitle>{t('nav.subjects')}</SectionTitle>
          <div className="space-y-1.5">
            {performance.bySubject.slice(0, 5).map((s) => (
              <div key={s.subjectId} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.shortName}</span>
                <span className="tnum text-text-muted">{s.tasks.done}/{s.tasks.total} · {formatMinutes(s.time.effectiveMin, lang)} ({s.time.share}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-semibold flex items-center gap-1">{t('glossary.focus')} <HelpButton titleKey="help.focus.title" descKey="help.focus.desc" /></p>
          <p className="mt-1 text-xs text-text-muted">{performance.focus.evidence}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-semibold flex items-center gap-1">{t('glossary.velocity')} <HelpButton titleKey="help.velocity.title" descKey="help.velocity.desc" /></p>
          <p className="mt-1 text-xs text-text-muted">{performance.velocity.trend.evidence}</p>
        </div>
      </div>
    </Card>
  );
}

export function IntelligencePanel({
  chapterProfiles,
  subjectHealth,
  weeklyReview,
  adaptationPlan,
  performance,
  onOpenSubject,
  onOpenChapter,
}: {
  chapterProfiles: ChapterProfile[];
  subjectHealth: SubjectHealth[];
  weeklyReview: WeeklyReview;
  adaptationPlan: AdaptationPlan;
  performance: PerformanceSummary;
  onOpenSubject?: (id: string) => void;
  onOpenChapter?: (id: string) => void;
}) {
  const [tab, setTab] = useState<'health' | 'chapters' | 'weekly' | 'adapt' | 'perf'>('health');
  const { t } = useI18n();

  const critical = subjectHealth.filter((h) => h.label === 'critical' || h.label === 'at-risk');
  const due = chapterProfiles.filter((p) => (p.reviews.overdueDays ?? -1) >= 0).slice(0, 5);
  const weakest = chapterProfiles.filter((p) => p.health.label !== 'not-started').sort((a, b) => a.health.score - b.health.score).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'health', label: `${t('glossary.subjectHealth')} (${critical.length})` },
          { id: 'chapters', label: `${t('glossary.chapterProfile')} (${chapterProfiles.length})` },
          { id: 'weekly', label: t('glossary.weeklyReview') },
          { id: 'adapt', label: `${t('glossary.adaptivePlanning')} (${adaptationPlan.suggestions.length})` },
          { id: 'perf', label: t('glossary.performance') },
        ].map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id as typeof tab)}
            className={cx('rounded-full border px-3 py-1.5 text-xs transition', tab === tabItem.id ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:text-text')}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'health' && (
        <div className="space-y-3">
          {subjectHealth.length === 0 ? (
            <EmptyState title={t('analytics.noData')} description={t('common.notEnoughDataDesc')} />
          ) : (
            <>
              {critical.length > 0 && (
                <Card title={t('dashboard.needsAttention')} subtitle={`${critical.length} ${t('common.atRisk')}`}>
                  <div className="space-y-3">{critical.map((h) => <SubjectHealthCard key={h.subjectId} health={h} onSelect={onOpenSubject} />)}</div>
                </Card>
              )}
              <Card title={t('subjects.allSubjects')} subtitle={`${subjectHealth.length} ${t('nav.subjects')}`}>
                <div className="space-y-3">{subjectHealth.map((h) => <SubjectHealthCard key={h.subjectId} health={h} onSelect={onOpenSubject} />)}</div>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === 'chapters' && (
        <div className="space-y-3">
          {chapterProfiles.length === 0 ? (
            <EmptyState title={t('analytics.noData')} description={t('common.notEnoughDataDesc')} />
          ) : (
            <>
              {due.length > 0 && (
                <Card title={t('common.overdue')} subtitle={`${due.length} ${t('common.overdue')}`}>
                  <div className="space-y-2.5">{due.map((p) => <ChapterProfileCard key={p.chapterId} profile={p} onOpen={onOpenChapter} />)}</div>
                </Card>
              )}
              {weakest.length > 0 && (
                <Card title={t('glossary.weakestChapter')} subtitle={t('dashboard.weakChapters')}>
                  <div className="space-y-2.5">{weakest.map((p) => <ChapterProfileCard key={p.chapterId} profile={p} onOpen={onOpenChapter} />)}</div>
                </Card>
              )}
              <Card title={t('analytics.allChapterProfiles')} subtitle={`${chapterProfiles.length}`}>
                <div className="space-y-2.5">{chapterProfiles.slice(0, 15).map((p) => <ChapterProfileCard key={p.chapterId} profile={p} onOpen={onOpenChapter} />)}</div>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === 'weekly' && <WeeklyReviewCard review={weeklyReview} />}
      {tab === 'adapt' && <AdaptationCard plan={adaptationPlan} />}
      {tab === 'perf' && <PerformanceCard performance={performance} />}
    </div>
  );
}

export type { ChapterProfile, SubjectHealth, WeeklyReview, AdaptationPlan, PerformanceSummary };
