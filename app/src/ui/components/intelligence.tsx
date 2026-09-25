/**
 * Intelligence UI — Progress Intelligence + Adaptive Planning (Phase 3).
 *
 * Mobile-first, explainable, no cosmetic-only dashboards.
 * Every recommendation shows its reason and evidence.
 */

import { useState } from 'react';
import { Badge, Button, Card, EmptyState, SectionTitle, StatTile, cx } from './primitives';
import { formatMinutes } from '../../domain/date';
import type { ChapterProfile } from '../../domain/analytics/chapterProfile';
import type { SubjectHealth } from '../../domain/analytics/subjectHealth';
import type { WeeklyReview } from '../../domain/analytics/weeklyReview';
import type { AdaptationPlan, AdaptationSuggestion } from '../../domain/planning/adaptation';
import type { PerformanceSummary } from '../../domain/analytics/performance';
import { navigate } from '../router';

function HealthBadge({ label }: { label: SubjectHealth['label'] }) {
  const tones: Record<SubjectHealth['label'], 'success' | 'accent' | 'warning' | 'danger' | 'neutral'> = {
    excellent: 'success',
    good: 'accent',
    'at-risk': 'warning',
    critical: 'danger',
    'not-started': 'neutral',
    insufficient: 'neutral',
  };
  return <Badge tone={tones[label]}>{label}</Badge>;
}

export function SubjectHealthCard({ health, onSelect }: { health: SubjectHealth; onSelect?: (id: string) => void }) {
  const [showFactors, setShowFactors] = useState(false);
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
          <span className="text-text-muted">Mastery avg</span>
          <p className="tnum font-medium">{health.stats.masteryAvg ?? '—'}/5</p>
        </div>
        <div>
          <span className="text-text-muted">Completion</span>
          <p className="tnum font-medium">{health.stats.completionRate}%</p>
        </div>
        <div>
          <span className="text-text-muted">Revision</span>
          <p className="tnum font-medium">{health.stats.revisionCoverage}%</p>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-text-muted">{health.evidence.sentence}</p>

      {health.recommendations.length > 0 && (
        <div className="mt-2 rounded-lg bg-surface-sunken/60 p-2">
          <p className="text-xs font-medium">Top recommendation</p>
          <p className="mt-1 text-xs">{health.recommendations[0].text}</p>
          <p className="mt-1 text-[11px] text-text-muted">Why: {health.recommendations[0].reason}</p>
          <p className="mt-0.5 text-[11px] text-text-muted">Evidence: {health.recommendations[0].evidence}</p>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setShowFactors((v) => !v)}>
          {showFactors ? 'Hide factors' : 'How computed?'}
        </Button>
        {onSelect && (
          <Button size="sm" variant="secondary" onClick={() => onSelect(health.subjectId)}>
            Open subject
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
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{profile.title}</p>
          <p className="text-xs text-text-muted">
            {profile.subjectShortName} · {profile.kind} · mastery {profile.mastery.level}/5 ({profile.mastery.text}) · health {profile.health.score}
          </p>
        </div>
        <Badge tone={profile.health.label === 'excellent' ? 'success' : profile.health.label === 'critical' ? 'danger' : profile.health.label === 'at-risk' ? 'warning' : 'neutral'}>
          {profile.health.label}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-text-muted">Tasks</span>
          <p className="tnum">
            {profile.tasks.done}/{profile.tasks.total} ({profile.tasks.completionRate}%)
          </p>
        </div>
        <div>
          <span className="text-text-muted">Effective</span>
          <p className="tnum">{formatMinutes(profile.sessions.effectiveMin)}</p>
        </div>
        <div>
          <span className="text-text-muted">Mistakes</span>
          <p className="tnum">
            {profile.mistakes.open} open / {profile.mistakes.total}
          </p>
        </div>
      </div>

      {profile.recommendations[0] && (
        <div className="mt-2 rounded-lg bg-accent-soft/40 p-2">
          <p className="text-xs font-medium">{profile.recommendations[0].text}</p>
          <p className="mt-1 text-[11px] text-text-muted">Why: {profile.recommendations[0].reason}</p>
          <p className="text-[11px] text-text-muted">Evidence: {profile.recommendations[0].evidence}</p>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setShowDetail((v) => !v)}>
          {showDetail ? 'Hide details' : 'Details'}
        </Button>
        {onOpen && (
          <Button size="sm" variant="secondary" onClick={() => onOpen(profile.chapterId)}>
            Open chapter
          </Button>
        )}
      </div>

      {showDetail && (
        <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs text-text-muted">
          <p>
            Sessions: {profile.sessions.count} · {formatMinutes(profile.sessions.totalMin)} total, {formatMinutes(profile.sessions.effectiveMin)} effective, efficiency {profile.sessions.efficiency}%
          </p>
          <p>
            Quizzes: {profile.quizzes.attempts} attempt(s), {profile.quizzes.totalQuestions} Q, accuracy {profile.quizzes.accuracy ?? '—'}%
          </p>
          <p>
            Reviews: {profile.reviews.count} · last {profile.reviews.lastRevisionDate ?? 'never'}, next due {profile.reviews.nextDueDate ?? 'not scheduled'}
            {profile.reviews.overdueDays !== null && profile.reviews.overdueDays > 0 ? `, ${profile.reviews.overdueDays}d overdue` : ''}
          </p>
          <p>
            Prerequisites: {profile.prerequisites.total} total, {profile.prerequisites.unmet} unmet{' '}
            {profile.prerequisites.isBlocked ? '(blocked)' : ''}
          </p>
          <p>
            Time invested: {formatMinutes(profile.time.totalInvestedMin)} / {formatMinutes(profile.time.expectedMin)} expected, remaining ~{formatMinutes(profile.time.remainingEstimatedMin)}
          </p>
          <p>{profile.evidence.sampleSize} data point(s) · last activity {profile.evidence.lastActivityDate ?? 'never'}</p>
        </div>
      )}
    </div>
  );
}

export function WeeklyReviewCard({ review }: { review: WeeklyReview }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  if (review.evidence.insufficientData) {
    return (
      <Card title="Weekly review" subtitle={review.label}>
        <EmptyState
          title="Not enough data this week"
          description={review.evidence.sentence}
        />
      </Card>
    );
  }

  return (
    <Card title="Weekly review" subtitle={`${review.label} · ${review.stats.activeDays} active / ${review.stats.plannedDays} planned`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Completion" value={`${review.stats.completionRate}%`} hint={`${review.stats.doneTasks}/${review.stats.totalTasks} tasks`} />
        <StatTile label="Effective" value={formatMinutes(review.stats.effectiveMin)} hint={`avg ${review.stats.avgDailyMin}/day`} />
        <StatTile label="Best day" value={review.stats.bestDay?.date ?? '—'} hint={review.stats.bestDay ? formatMinutes(review.stats.bestDay.minutes) : undefined} />
        <StatTile label="Revisions" value={review.stats.revisionCount} hint={`${review.stats.focusSessions} focus`} />
      </div>

      {review.highlights.length > 0 && (
        <div className="mt-4">
          <SectionTitle>Highlights</SectionTitle>
          <ul className="space-y-1.5">
            {review.highlights.map((h) => (
              <li key={h.id} className="rounded-xl border border-success/30 bg-success/5 p-2.5 text-xs">
                <p className="font-medium">{h.text}</p>
                <p className="mt-0.5 text-[11px] text-text-muted">Evidence: {h.evidence}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {review.blockers.length > 0 && (
        <div className="mt-4">
          <SectionTitle>Blockers</SectionTitle>
          <ul className="space-y-1.5">
            {review.blockers.map((b) => (
              <li key={b.id} className="rounded-xl border border-warning/30 bg-warning/5 p-2.5 text-xs">
                <p className="font-medium">{b.text}</p>
                <p className="mt-0.5 text-[11px] text-text-muted">Evidence: {b.evidence}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {review.recommendations.length > 0 && (
        <div className="mt-4">
          <SectionTitle>Next week</SectionTitle>
          <ul className="space-y-1.5">
            {review.recommendations.slice(0, 3).map((r) => (
              <li key={r.id} className="rounded-xl border border-border p-2.5 text-xs">
                <p className="font-medium">{r.text}</p>
                <p className="mt-0.5 text-[11px] text-text-muted">Why: {r.reason}</p>
                <p className="text-[11px] text-text-muted">Evidence: {r.evidence}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setShowBreakdown((v) => !v)}>
          {showBreakdown ? 'Hide subjects' : 'Subject breakdown'}
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
              <span className="tnum text-text-muted">
                {s.tasksDone}/{s.tasksTotal} · {formatMinutes(s.effectiveMin)} ({s.share}%)
              </span>
            </div>
          ))}
        </div>
      )}

      {review.nextWeekFocus.habits.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-surface-sunken/40 p-3">
          <p className="text-xs font-semibold">Habits to reinforce</p>
          <ul className="mt-1 space-y-0.5 text-xs text-text-muted">
            {review.nextWeekFocus.habits.map((h, i) => (
              <li key={i}>• {h}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function AdaptationCard({
  plan,
  onApply,
}: {
  plan: AdaptationPlan;
  onApply?: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const suggestions = showAll ? plan.suggestions : plan.suggestions.slice(0, 3);

  if (plan.evidence.insufficientData) {
    return (
      <Card title="Adaptive planning" subtitle="Needs at least 3 days of history">
        <EmptyState title="Not enough data yet" description={plan.rationale} />
      </Card>
    );
  }

  if (plan.suggestions.length === 0) {
    return (
      <Card title="Adaptive planning" subtitle="All signals stable">
        <p className="text-sm">{plan.rationale}</p>
        <p className="mt-2 text-xs text-text-muted">
          Evidence: {plan.evidence.behaviourSample} behaviour, {plan.evidence.healthSample} health, {plan.evidence.performanceSample} performance data points
        </p>
      </Card>
    );
  }

  return (
    <Card title="Adaptive planning" subtitle={`${plan.suggestions.length} suggestion(s) · ${plan.rationale}`}>
      <ul className="space-y-2.5">
        {suggestions.map((s) => (
          <li key={s.id} className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{s.text}</p>
              <Badge tone={s.impact === 'high' ? 'danger' : s.impact === 'medium' ? 'warning' : 'neutral'}>{s.impact}</Badge>
            </div>
            <p className="mt-1 text-xs text-text-muted">Why: {s.reason}</p>
            <p className="mt-0.5 text-[11px] text-text-muted">Evidence: {s.evidence}</p>
            {s.suggestedChange && (
              <p className="mt-1 text-[11px] text-text-muted">
                Proposed: {String(s.suggestedChange.field)} {String(s.suggestedChange.from)} → {String(s.suggestedChange.to)} — {s.suggestedChange.explanation}
              </p>
            )}
            <div className="mt-2 flex gap-1.5">
              {s.subjectId && (
                <Button size="sm" variant="ghost" onClick={() => navigate(`subject/${s.subjectId}`)}>
                  Open subject
                </Button>
              )}
              {s.chapterId && (
                <Button size="sm" variant="ghost" onClick={() => navigate(`chapter/${s.chapterId}`)}>
                  Open chapter
                </Button>
              )}
              {onApply && s.actionable && (
                <Button size="sm" variant="secondary" onClick={() => onApply(s.id)}>
                  Apply
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {plan.suggestions.length > 3 && (
        <Button size="sm" variant="ghost" className="mt-3" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show less' : `Show all ${plan.suggestions.length}`}
        </Button>
      )}

      {plan.adjustedRules && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft/30 p-3">
          <p className="text-xs font-semibold text-accent">Proposed rule adjustments</p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-text-muted">
            {Object.entries(plan.adjustedRules).map(([k, v]) => (
              <li key={k}>
                {k}: {Array.isArray(v) ? v.join(', ') : String(v)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function PerformanceCard({ performance }: { performance: PerformanceSummary }) {
  if (performance.insufficientData) {
    return (
      <Card title="Performance" subtitle={performance.label}>
        <EmptyState title="Not enough data" description="Log at least 3 tasks or 2 sessions for performance metrics." />
      </Card>
    );
  }

  return (
    <Card title="Performance" subtitle={`${performance.label} · ${performance.windowDays} days · ${performance.overall.completionRate}% completion`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Tasks" value={`${performance.overall.tasksDone}/${performance.overall.tasksTotal}`} hint={`${performance.overall.tasksSkipped} skipped`} />
        <StatTile label="Effective" value={formatMinutes(performance.overall.effectiveMin)} hint={`${performance.overall.efficiency}% efficiency`} />
        <StatTile label="Active days" value={`${performance.velocity.activeDays}/${performance.velocity.totalDays}`} hint={`${performance.velocity.consistency}% consistency`} />
        <StatTile label="Focus" value={`${performance.focus.focusSessions}`} hint={`${performance.focus.activeRecallShare}% recall`} />
      </div>

      {performance.bySubject.length > 0 && (
        <div className="mt-4">
          <SectionTitle>By subject</SectionTitle>
          <div className="space-y-1.5">
            {performance.bySubject.slice(0, 5).map((s) => (
              <div key={s.subjectId} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.shortName}
                </span>
                <span className="tnum text-text-muted">
                  {s.tasks.done}/{s.tasks.total} · {formatMinutes(s.time.effectiveMin)} ({s.time.share}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {performance.byTaskType.length > 0 && (
        <div className="mt-4">
          <SectionTitle>By task type</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-xs">
              <thead>
                <tr className="text-text-muted">
                  <th className="py-1 pr-2 font-medium">Type</th>
                  <th className="py-1 pr-2 font-medium">Done</th>
                  <th className="py-1 pr-2 font-medium">Completion</th>
                  <th className="py-1 pr-2 font-medium">Avg min</th>
                  <th className="py-1 font-medium">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {performance.byTaskType.map((t) => (
                  <tr key={t.type} className="border-t border-border">
                    <td className="py-1 pr-2">{t.type}</td>
                    <td className="py-1 pr-2 tnum">
                      {t.done}/{t.total}
                    </td>
                    <td className="py-1 pr-2 tnum">{t.completionRate}%</td>
                    <td className="py-1 pr-2 tnum">{t.avgActualMin}′</td>
                    <td className="py-1 tnum">{t.efficiency}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-semibold">Focus metrics</p>
          <p className="mt-1 text-xs text-text-muted">{performance.focus.evidence}</p>
          <ul className="mt-2 space-y-0.5 text-xs text-text-muted">
            <li>• Avg interruptions: {performance.focus.avgInterruptions} ({performance.focus.interruptionRate}/h)</li>
            <li>• Outcome avg: {performance.focus.avgOutcomeRating ?? '—'} (rated {performance.focus.outcomeDistribution.rated})</li>
            <li>• Recall: {performance.focus.activeRecallSessions} session(s), avg score {performance.focus.avgRecallScore ?? '—'}</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-semibold">Velocity</p>
          <p className="mt-1 text-xs text-text-muted">{performance.velocity.trend.evidence}</p>
          <ul className="mt-2 space-y-0.5 text-xs text-text-muted">
            <li>• {performance.velocity.tasksPerActiveDay} tasks / active day</li>
            <li>• {formatMinutes(performance.velocity.effectivePerActiveDay)} effective / active day</li>
            <li>• Trend: {performance.velocity.trend.direction} {performance.velocity.trend.percent !== null ? `${performance.velocity.trend.percent}%` : ''}</li>
          </ul>
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

  const critical = subjectHealth.filter((h) => h.label === 'critical' || h.label === 'at-risk');
  const due = chapterProfiles.filter((p) => (p.reviews.overdueDays ?? -1) >= 0).slice(0, 5);
  const weakest = chapterProfiles.filter((p) => p.health.label !== 'not-started').sort((a, b) => a.health.score - b.health.score).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'health', label: `Health (${critical.length})` },
          { id: 'chapters', label: `Chapters (${chapterProfiles.length})` },
          { id: 'weekly', label: 'Weekly' },
          { id: 'adapt', label: `Adapt (${adaptationPlan.suggestions.length})` },
          { id: 'perf', label: 'Performance' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={cx(
              'rounded-full border px-3 py-1.5 text-xs transition',
              tab === t.id ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:text-text',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'health' && (
        <div className="space-y-3">
          {subjectHealth.length === 0 ? (
            <EmptyState title="No subject health" description="Add subjects and log study sessions to compute health." />
          ) : (
            <>
              {critical.length > 0 && (
                <Card title="Needs attention" subtitle={`${critical.length} subject(s) at risk or critical`}>
                  <div className="space-y-3">
                    {critical.map((h) => (
                      <SubjectHealthCard key={h.subjectId} health={h} onSelect={onOpenSubject} />
                    ))}
                  </div>
                </Card>
              )}
              <Card title="All subjects" subtitle={`${subjectHealth.length} subject(s) · sorted by health score`}>
                <div className="space-y-3">
                  {subjectHealth.map((h) => (
                    <SubjectHealthCard key={h.subjectId} health={h} onSelect={onOpenSubject} />
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === 'chapters' && (
        <div className="space-y-3">
          {chapterProfiles.length === 0 ? (
            <EmptyState title="No chapter profiles" description="Chapters from seeded programme will appear here once you log work." />
          ) : (
            <>
              {due.length > 0 && (
                <Card title="Revision due" subtitle={`${due.length} chapter(s) overdue`}>
                  <div className="space-y-2.5">
                    {due.map((p) => (
                      <ChapterProfileCard key={p.chapterId} profile={p} onOpen={onOpenChapter} />
                    ))}
                  </div>
                </Card>
              )}
              {weakest.length > 0 && (
                <Card title="Weakest chapters" subtitle="Lowest health scores">
                  <div className="space-y-2.5">
                    {weakest.map((p) => (
                      <ChapterProfileCard key={p.chapterId} profile={p} onOpen={onOpenChapter} />
                    ))}
                  </div>
                </Card>
              )}
              <Card title="All chapter profiles" subtitle={`${chapterProfiles.length} chapter(s) · sorted by need`}>
                <div className="space-y-2.5">
                  {chapterProfiles.slice(0, 15).map((p) => (
                    <ChapterProfileCard key={p.chapterId} profile={p} onOpen={onOpenChapter} />
                  ))}
                </div>
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

// Re-export for convenience
export type { ChapterProfile, SubjectHealth, WeeklyReview, AdaptationPlan, PerformanceSummary, AdaptationSuggestion };
