/**
 * Analytics — the interactive visual layer.
 *
 * Every chart reads the same derived bundle computed from the stored SQLite records, so completing a
 * task anywhere in the app updates this screen without a reload. Ranges (7 / 30 / 90 / semester /
 * year) drive all visualisations at once. When there is not enough history, empty states are shown
 * rather than invented numbers.
 */

import { useState } from 'react';
import { Badge, Button, Card, EmptyState, SectionTitle, StatTile, cx } from '../components/primitives';
import { BalanceBars, ProgressRing, RadialSubjects, SessionTimeline, StudyHeatmap, WeeklyBars, HabitMatrix } from '../components/charts';
import { IntelligencePanel } from '../components/intelligence';
import { addDays, formatMinutes } from '../../domain/date';
import { PERIODS, type PeriodKey } from '../../state/analytics';
import { navigate } from '../router';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { useLookups } from '../lookups';
import type { HeatmapMetric } from '../../domain/analytics/heatmap';

export function AnalyticsScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { today, state, period, setPeriod } = useStudy();
  const store = useStore();
  const analytics = useAnalytics();
  const { subjectLookup } = useLookups();
  const [metric, setMetric] = useState<HeatmapMetric>('time');
  const [showConsistencyDetail, setShowConsistencyDetail] = useState(false);
  const [habitMonthOffset, setHabitMonthOffset] = useState(0);

  const summary = analytics.period;
  const hasHistory = analytics.dataPoints > 0;

  const habitDays = analytics.habitMatrix.filter((day) => {
    const reference = new Date(`${today}T12:00:00`);
    const target = new Date(reference.getFullYear(), reference.getMonth() + habitMonthOffset, 1);
    const date = new Date(`${day.date}T12:00:00`);
    return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
  });

  const habitMonthLabel = (() => {
    const reference = new Date(`${today}T12:00:00`);
    const target = new Date(reference.getFullYear(), reference.getMonth() + habitMonthOffset, 1);
    return target.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-xs text-text-muted">
            {summary.from} → {summary.to} · {analytics.dataPoints} recorded data point(s). Ranges change every chart at once.
          </p>
        </div>
        <div role="tablist" aria-label="Time range" className="flex flex-wrap gap-1.5">
          {PERIODS.map((option) => (
            <button
              key={option.key}
              role="tab"
              aria-selected={period === option.key}
              onClick={() => setPeriod(option.key as PeriodKey)}
              className={cx(
                'min-h-8 rounded-full border px-3 py-1.5 text-xs transition',
                period === option.key ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:text-text',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {!hasHistory ? (
        <Card title="No study history yet">
          <EmptyState
            title="Your study history will appear here once you start logging sessions."
            description="Nothing is simulated: the rings, heatmap, streaks and consistency score stay empty until real sessions are recorded."
          />
          <div className="mt-3 flex gap-2">
            <Button variant="primary" onClick={() => navigate('today')}>
              Open Today
            </Button>
            <Button variant="secondary" onClick={() => navigate('focus')}>
              Start a focus session
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <Card className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <ProgressRing
                percent={summary.completionRate}
                label={summary.label}
                percentNote="of decided tasks"
                primary={
                  <>
                    <span className="tnum block">{formatMinutes(summary.totalMin)} logged</span>
                    <span className="tnum block">{formatMinutes(summary.effectiveMin)} effective</span>
                  </>
                }
                secondary={
                  summary.trendPercent === null
                    ? 'No previous comparable period'
                    : `${summary.trendPercent >= 0 ? '+' : ''}${summary.trendPercent}% vs previous period`
                }
                tone={summary.completionRate >= 80 ? 'success' : summary.completionRate >= 45 ? 'accent' : 'warning'}
                ariaSummary={`${summary.label} completion ${summary.completionRate} percent. ${formatMinutes(summary.totalMin)} logged, ${formatMinutes(summary.effectiveMin)} effective.`}
              />
              <dl className="w-full space-y-2 text-xs sm:max-w-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-text-muted">Planned days</dt>
                  <dd className="tnum">{summary.plannedDays}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-muted">Active days</dt>
                  <dd className="tnum">{summary.activeDays}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-muted">Average per active day</dt>
                  <dd className="tnum">
                    {summary.activeDays === 0 ? '—' : formatMinutes(Math.round(summary.effectiveMin / summary.activeDays))}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-muted">Strongest weekday</dt>
                  <dd>{summary.strongestDay ? `${summary.strongestDay.label} · ${formatMinutes(summary.strongestDay.minutes)}` : '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-muted">Weakest weekday</dt>
                  <dd>{summary.weakestDay ? `${summary.weakestDay.label} · ${formatMinutes(summary.weakestDay.minutes)}` : '—'}</dd>
                </div>
              </dl>
            </Card>

            <Card title="Consistency" subtitle="A measure of preparation regularity — not intelligence, not rank">
              <div className="flex items-end justify-between gap-3">
                <p className="tnum text-4xl font-semibold">
                  {summary.consistency.insufficientData ? '—' : summary.consistency.score}
                  <span className="text-base text-text-muted">/100</span>
                </p>
                <Button size="sm" variant="ghost" onClick={() => setShowConsistencyDetail((v) => !v)} aria-expanded={showConsistencyDetail}>
                  {showConsistencyDetail ? 'Hide calculation' : 'How is this computed?'}
                </Button>
              </div>
              <p className="mt-2 text-xs text-text-muted">{summary.consistency.sentence}</p>
              {showConsistencyDetail && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {summary.consistency.factors.map((factor) => (
                    <div key={factor.key}>
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="text-text-muted">
                          {factor.label} <span className="text-text-muted/70">(weight {Math.round(factor.weight * 100)}%)</span>
                        </span>
                        <span className="tnum">{Math.round(factor.value * 100)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, factor.value * 100))}%` }} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-text-muted">{factor.explanation}</p>
                    </div>
                  ))}
                  <p className="text-[11px] text-text-muted">
                    Sample: {summary.consistency.sampleSizeDays} day(s) in this range.
                    {summary.consistency.insufficientData && ' Not enough data yet.'}
                  </p>
                </div>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle hint="Streaks never break because of a single missed day">Streak system</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile label="Current" value={`${summary.streaks.currentStreak} d`} tone={summary.streaks.currentStreak > 0 ? 'success' : undefined} />
              <StatTile label="Longest" value={`${summary.streaks.longestStreak} d`} />
              <StatTile label="Active days" value={summary.streaks.totalActiveDays} />
              <StatTile label="Missed days" value={summary.streaks.missedDays} hint="past days only" />
              <StatTile label="Recovery streak" value={`${summary.streaks.recoveryStreak} d`} hint="consecutive days after a miss" />
              <StatTile
                label="Today"
                value={summary.streaks.todayPending ? 'Pending' : 'Logged'}
                hint={summary.streaks.missedYesterday ? 'yesterday was missed — still recoverable' : undefined}
              />
            </div>
          </section>

          <section>
            <SectionTitle hint="Progress Intelligence — health, chapter profiles, weekly review, adaptation, performance">Progress Intelligence</SectionTitle>
            <IntelligencePanel
              chapterProfiles={analytics.chapterProfiles}
              subjectHealth={analytics.subjectHealth}
              weeklyReview={analytics.weeklyReview}
              adaptationPlan={analytics.adaptationPlan}
              performance={analytics.performance}
              onOpenSubject={(id) => navigate(`subject/${id}`)}
              onOpenChapter={(id) => navigate(`chapter/${id}`)}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Study time by subject" subtitle={`${summary.label} · effective minutes`}>
              <RadialSubjects
                entries={summary.subjectDistribution}
                centerLabel={summary.label}
                centerValue={formatMinutes(summary.effectiveMin)}
                centerHint="effective time"
                onSelect={(id) => navigate(`subject/${id}`)}
                emptyLabel="No study time logged in this range."
              />
            </Card>

            <Card title="Weekly rhythm" subtitle="Planned vs actual for the current week">
              <WeeklyBars days={analytics.weekly.days} targetWeeklyMin={analytics.weekly.targetMin} onSelect={onOpenDay} />
            </Card>
          </section>

          <Card
            title="Study heatmap"
            subtitle="Twelve weeks, six months or a year — five metrics, all from stored records"
          >
            <StudyHeatmap cells={analytics.heatmap[metric]} metric={metric} onMetricChange={setMetric} onSelectDay={onOpenDay} />
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card
              title="Habit matrix"
              subtitle="Segmented day cells — one arc per habit, only real check-offs"
            >
              <HabitMatrix
                days={habitDays}
                habits={state.snapshot.habits.filter((h) => h.active)}
                monthLabel={habitMonthLabel}
                onSelectDay={onOpenDay}
                onPrevMonth={() => setHabitMonthOffset((m) => m - 1)}
                onNextMonth={() => setHabitMonthOffset((m) => m + 1)}
              />
            </Card>

            <Card title="Subject balance" subtitle="Neglect warnings are factual — they state the number of days since the last session">
              <BalanceBars entries={analytics.balance} onSelect={(id) => navigate(`subject/${id}`)} />
            </Card>
          </section>

          <Card title="Daily study timeline" subtitle="Recorded sessions for today, in order">
            <SessionTimeline entries={analytics.sessionTimelineToday} />
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Insights" subtitle="Generated from stored statistics only">
              {analytics.insights.length === 0 ? (
                <EmptyState title="Not enough data yet." description="Insights appear after a few days of real records." />
              ) : (
                <ul className="space-y-2">
                  {analytics.insights.map((insight) => (
                    <li key={insight.id} className="rounded-xl border border-border p-3">
                      <p className="text-sm">{insight.text}</p>
                      <p className="mt-1 text-[11px] text-text-muted">
                        Evidence: {insight.evidence} · {insight.sampleSize} data point(s)
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-text-muted">
                No psychological or medical claims, no rank prediction — only descriptions of your recorded work.
              </p>
            </Card>

            <Card title="Backlog trend" subtitle={`${analytics.backlog.trend} · ${analytics.backlog.openItems} open item(s)`}>
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="Open" value={formatMinutes(analytics.backlog.openMin)} tone={analytics.backlog.openMin > 0 ? 'warning' : undefined} />
                <StatTile label="Scheduled" value={formatMinutes(analytics.backlog.scheduledMin)} />
                <StatTile label="Recovered" value={formatMinutes(analytics.backlog.recoveredMin)} tone="success" />
                <StatTile label="Archived" value={formatMinutes(analytics.backlog.droppedMin)} />
              </div>
              {analytics.backlog.bySubject.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-text-muted">
                  {analytics.backlog.bySubject.slice(0, 6).map((entry) => (
                    <li key={entry.subjectId} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: subjectLookup.get(entry.subjectId)?.color }} />
                        {subjectLookup.get(entry.subjectId)?.shortName ?? entry.subjectId}
                      </span>
                      <span className="tnum">
                        {formatMinutes(entry.minutes)} · {entry.items} item(s)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => navigate('recovery')}>
                  Recovery center
                </Button>
                <Button size="sm" variant="ghost" onClick={() => store.generatePlan(today)}>
                  Regenerate today
                </Button>
              </div>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Goals" subtitle="Progress from completed work only">
              {analytics.goals.length === 0 ? (
                <EmptyState title="No goal defined" description="Add semester goals in Settings to track them here." />
              ) : (
                <ul className="space-y-3">
                  {analytics.goals.map(({ goal, percent, completedTasks, targetTasks, deadlineDaysLeft }) => (
                    <li key={goal.id}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm">{goal.title}</span>
                        <span className="tnum text-sm">{percent}%</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-2 rounded-full bg-accent transition-[width] duration-700" style={{ width: `${percent}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-text-muted">
                        {completedTasks}/{targetTasks} task(s)
                        {deadlineDaysLeft !== null ? ` · ${deadlineDaysLeft} day(s) left` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Achievements" subtitle="Optional, derived from real thresholds — never from fake data">
              <ul className="space-y-2">
                {analytics.achievements.map((achievement) => (
                  <li key={achievement.definition.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                    <div>
                      <p className="text-sm">{achievement.definition.title}</p>
                      <p className="text-[11px] text-text-muted">{achievement.definition.description}</p>
                      <p className="mt-0.5 tnum text-[11px] text-text-muted">{Math.round(achievement.progress * 100)}% progress</p>
                    </div>
                    <Badge tone={achievement.unlocked ? 'success' : 'neutral'}>
                      {achievement.unlocked ? `unlocked${achievement.unlockedAt ? ` ${achievement.unlockedAt.slice(0, 10)}` : ''}` : 'locked'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <Card title="Range comparison" subtitle="Same metric across every range — trend without interpretation">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-xs">
                <thead>
                  <tr className="text-text-muted">
                    <th className="py-1.5 pr-3 font-medium">Range</th>
                    <th className="py-1.5 pr-3 font-medium">Logged</th>
                    <th className="py-1.5 pr-3 font-medium">Effective</th>
                    <th className="py-1.5 pr-3 font-medium">Completion</th>
                    <th className="py-1.5 pr-3 font-medium">Active days</th>
                    <th className="py-1.5 font-medium">Consistency</th>
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((option) => {
                    const item = analytics.periods[option.key];
                    return (
                      <tr key={option.key} className={cx('border-t border-border', period === option.key && 'text-text')}>
                        <td className="py-1.5 pr-3">{option.label}</td>
                        <td className="py-1.5 pr-3 tnum">{formatMinutes(item.totalMin)}</td>
                        <td className="py-1.5 pr-3 tnum">{formatMinutes(item.effectiveMin)}</td>
                        <td className="py-1.5 pr-3 tnum">{item.completionRate}%</td>
                        <td className="py-1.5 pr-3 tnum">
                          {item.activeDays}/{item.plannedDays || '—'}
                        </td>
                        <td className="py-1.5 tnum">{item.consistency.insufficientData ? '—' : item.consistency.score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-text-muted">
              Semester range starts on {addDays(today, 0).slice(0, 4)}-09-01 when the academic year begins; the year range
              covers the last 365 days. Time-zone safe: dates are stored as local calendar days.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
