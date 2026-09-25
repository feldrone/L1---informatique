/**
 * Dashboard — the answer to "what do I do today, why, how long, and what should be recovered first".
 * Mobile priority order: progress ring → tasks → timer shortcut → streak → subject balance →
 * weekly chart → calendar. Desktop spreads the same content over two columns.
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, StatTile, cx } from '../components/primitives';
import { ProgressRing, RadialSubjects, WeeklyBars, StudyHeatmap, BalanceBars } from '../components/charts';
import { TaskList } from '../components/task';
import { formatMinutes } from '../../domain/date';
import { href, navigate } from '../router';
import { useAnalytics, useStudy } from '../../state/provider';
import { useLookups, MASTERY_TEXT } from '../lookups';

export function DashboardScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { store, today, period } = useStudy();
  const analytics = useAnalytics();
  const { subjectLookup, chapterLookup } = useLookups();
  const [heatmapMetric, setHeatmapMetric] = useState<'time' | 'completion' | 'revision' | 'exercises' | 'mockExams'>('time');

  const { todayProgress, streaks, consistency, weekly, insights, goals, balance, priorities, backlog, recoveryPlan, revisionDue } = analytics;

  const openTasks = useMemo(
    () => analytics.todayTasks.filter((t) => t.status !== 'done' && t.status !== 'skipped' && t.status !== 'deferred'),
    [analytics.todayTasks],
  );
  const nextBest = openTasks[0] ?? null;
  const nextBestSubject = nextBest?.subjectId ? subjectLookup.get(nextBest.subjectId) : null;
  const topPriority = priorities[0] ?? null;
  const hasHistory = analytics.dataPoints > 0;
  const dayHasTasks = analytics.todayTasks.length > 0;

  const heroInset = (
    <>
      <span className="tnum block">
        {todayProgress.tasksDone}/{todayProgress.tasksTotal} tasks · {formatMinutes(todayProgress.completedMin)} logged
      </span>
      <span className="tnum block">
        {formatMinutes(todayProgress.completedMin)} of {formatMinutes(todayProgress.plannedMin)} planned
      </span>
    </>
  );

  return (
    <div className="space-y-6">
      {/* items-start keeps each card at its natural height instead of stretching a short hero
          card into a tall empty column when the task list next to it is long. */}
      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card className="flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col items-center">
            <ProgressRing
              percent={todayProgress.percent}
              label="Today"
              percentNote="of planned time"
              primary={heroInset}
              secondary={
                todayProgress.remainingMin > 0
                  ? `${formatMinutes(todayProgress.remainingMin)} left in the plan`
                  : hasHistory
                    ? 'Plan complete — revision is next'
                    : 'No work logged yet'
              }
              tone={todayProgress.percent >= 80 ? 'success' : todayProgress.percent >= 40 ? 'accent' : 'warning'}
              ariaSummary={`Today ${todayProgress.percent} percent complete: ${todayProgress.tasksDone} of ${todayProgress.tasksTotal} tasks, ${formatMinutes(todayProgress.completedMin)} logged out of ${formatMinutes(todayProgress.plannedMin)} planned.`}
            />
          </div>
          <div className="w-full space-y-3 sm:max-w-xs">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-text-muted uppercase">Next best action</p>
              {nextBest ? (
                <>
                  <p className="mt-1 text-sm font-medium">{nextBest.title}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {nextBestSubject?.shortName ?? 'General'} · {formatMinutes(nextBest.plannedMin)}
                  </p>
                  {nextBest.reasons[0] && <p className="mt-1 text-xs text-text-muted">Why: {nextBest.reasons[0]}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="primary" onClick={() => { store.startTask(nextBest.id); navigate('focus'); }}>
                      Start now
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => store.completeTask(nextBest.id)}>
                      Complete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => store.skipTask(nextBest.id)}>
                      Skip
                    </Button>
                  </div>
                </>
              ) : (
                <p className="mt-1 text-sm text-text-muted">
                  {hasHistory ? 'Nothing left planned for today.' : 'Generate today’s plan from the Today screen.'}
                </p>
              )}
            </div>

            {backlog.openMin > 0 && (
              <div className="rounded-xl border border-warning/40 bg-warning/5 p-3">
                <p className="text-xs font-semibold text-warning">Backlog detected</p>
                <p className="mt-1 text-xs text-text-muted">
                  {backlog.openItems} open item(s), {formatMinutes(backlog.openMin)}. Recovery mode {recoveryPlan.mode} can
                  spread this over {recoveryPlan.horizonDays} day(s) — {formatMinutes(recoveryPlan.recoverableMin)} kept for today.
                </p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigate('recovery')}>
                  Open recovery center
                </Button>
              </div>
            )}
            {revisionDue.length > 0 && (
              <div className="rounded-xl border border-accent/40 bg-accent-soft/40 p-3">
                <p className="text-xs font-semibold text-accent">Revision due</p>
                <p className="mt-1 text-xs text-text-muted">
                  {revisionDue.length} chapter(s) scheduled for spaced review today: {revisionDue.slice(0, 3).map((c) => c.title).join(', ')}
                  {revisionDue.length > 3 ? '…' : ''}
                </p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigate('today')}>
                  Add to today
                </Button>
              </div>
            )}
            {topPriority && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-text-muted uppercase">Priority now</p>
                <p className="mt-1 text-sm">
                  <a className="text-accent hover:underline" href={href(`subject/${topPriority.subjectId}`)}>
                    {subjectLookup.get(topPriority.subjectId)?.name ?? topPriority.subjectId}
                  </a>
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-text-muted">
                  {topPriority.reasons.slice(0, 3).map((reason, i) => (
                    <li key={i}>• {reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        <Card
          title="Today's tasks"
          subtitle={
            openTasks.length > 0
              ? `${openTasks.length} task(s) ready to run`
              : dayHasTasks
                ? 'All planned work handled'
                : 'Nothing planned yet'
          }
          action={
            <Button size="sm" variant="ghost" onClick={() => navigate('today')}>
              Open Today
            </Button>
          }
        >
          <TaskList
            tasks={openTasks.slice(0, 4)}
            subjectLookup={subjectLookup}
            chapterLookup={chapterLookup}
            compact
            onOpenFocus={() => navigate('focus')}
            /* The empty state depends on why nothing is open: a finished plan must not be
               mistaken for a missing one (the button would rebuild work already done). */
            emptyTitle={dayHasTasks ? 'Plan complete' : 'No study task planned'}
            emptyDescription={
              dayHasTasks
                ? 'Everything planned for today is handled. Revision of weak chapters is the next useful action.'
                : 'Generate today’s plan — it reserves buffer time and never fills 100% of your availability.'
            }
            emptyAction={
              dayHasTasks ? (
                <Button size="sm" variant="secondary" onClick={() => navigate('today')}>
                  Open Today
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={() => store.generatePlan(today)}>
                  Generate today&apos;s plan
                </Button>
              )
            }
          />
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Current streak"
            value={`${streaks.currentStreak} d`}
            hint={
              streaks.missedYesterday
                ? 'Yesterday was missed — today still counts, the streak is not reset'
                : streaks.todayPending
                  ? 'Today is still open'
                  : streaks.lastActiveDate
                    ? `Last active ${streaks.lastActiveDate}`
                    : 'No activity yet'
            }
            tone={streaks.currentStreak > 0 ? 'success' : undefined}
          />
          <StatTile label="Longest streak" value={`${streaks.longestStreak} d`} hint={`${streaks.totalActiveDays} active day(s) recorded`} />
          <StatTile
            label="Active days (30 d)"
            value={`${streaks.activeDaysWindow}/${streaks.windowDays}`}
            hint="A day counts from 20 effective minutes"
          />
        <StatTile
          label="Consistency"
          value={consistency.insufficientData ? '—' : `${consistency.score}/100`}
          hint={consistency.insufficientData ? 'Not enough data yet.' : 'Prep regularity — not intelligence or rank'}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Subject balance"
          subtitle="Planned vs effective time over the last 14 days"
          action={
            <Button size="sm" variant="ghost" onClick={() => navigate('subjects')}>
              Subjects
            </Button>
          }
        >
          <BalanceBars entries={balance} onSelect={(id) => navigate(`subject/${id}`)} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Study time by subject"
          subtitle="Today · effective learning time"
          action={
            <Button size="sm" variant="ghost" onClick={() => navigate('analytics')}>
              Analytics
            </Button>
          }
        >
          <RadialSubjects
            entries={analytics.distributionToday}
            centerLabel="Today"
            centerValue={formatMinutes(todayProgress.effectiveMin)}
            centerHint="effective time"
            onSelect={(id) => navigate(`subject/${id}`)}
          />
        </Card>

        <Card title="This week" subtitle="Planned vs actual, Monday to Sunday">
          <WeeklyBars days={weekly.days} targetWeeklyMin={weekly.targetMin} onSelect={(date) => onOpenDay(date)} />
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-muted sm:grid-cols-4">
            <div>
              <dt>Active days</dt>
              <dd className="tnum text-sm text-text">{weekly.activeDays}/7</dd>
            </div>
            <div>
              <dt>Best day</dt>
              <dd className="text-sm text-text">{weekly.bestDay ? weekly.bestDay.label : '—'}</dd>
            </div>
            <div>
              <dt>Weakest day</dt>
              <dd className="text-sm text-text">{weekly.weakestDay ? weekly.weakestDay.label : '—'}</dd>
            </div>
            <div>
              <dt>Recall sessions</dt>
              <dd className="tnum text-sm text-text">{weekly.revisionSessions}</dd>
            </div>
          </dl>
        </Card>
      </section>

      <Card
        title="Study calendar"
        subtitle="Every cell comes from a logged session — empty days stay empty"
      >
        <StudyHeatmap
          cells={analytics.heatmap[heatmapMetric]}
          metric={heatmapMetric}
          onMetricChange={setHeatmapMetric}
          onSelectDay={onOpenDay}
        />
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Insights" subtitle="Derived only from your stored statistics">
          {insights.length === 0 ? (
            <EmptyState
              title="Not enough data yet."
              description="Your study history will appear here once you start logging sessions."
            />
          ) : (
            <ul className="space-y-2.5">
              {insights.map((insight) => (
                <li key={insight.id} className="rounded-xl border border-border bg-surface-sunken/50 p-3">
                  <p className="text-sm">{insight.text}</p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    Evidence: {insight.evidence} · {insight.sampleSize} data point(s)
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-text-muted">
            Insights describe your own recorded work only. They are not medical or psychological advice, and this system
            never predicts ranks.
          </p>
        </Card>

        <Card title="Long-term goals" subtitle="Progress computed from completed work">
          {goals.length === 0 ? (
            <EmptyState title="No goal defined" description="Add a semester goal in Settings to track its progress here." />
          ) : (
            <ul className="space-y-3">
              {goals.map(({ goal, percent, onTrack, deadlineDaysLeft, requiredWeeklyMin }) => (
                <li key={goal.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{goal.title}</p>
                    <p className="tnum text-sm">{percent}%</p>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className={cx('h-2 rounded-full transition-[width] duration-700', onTrack === false ? 'bg-warning' : 'bg-accent')}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {deadlineDaysLeft !== null && deadlineDaysLeft >= 0
                      ? `${deadlineDaysLeft} day(s) left`
                      : 'No deadline'}
                    {requiredWeeklyMin !== null && ` · ${formatMinutes(requiredWeeklyMin)}/week needed to finish on time`}
                    {onTrack === true && ' · on track with the current pace'}
                    {onTrack === false && ' · behind the pace required by the deadline'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {!hasHistory && (
        <Card title="Getting started">
          <ol className="space-y-2 text-sm text-text-muted">
            <li>1. Fill the daily check-in on the Today screen (available time, energy, sleep).</li>
            <li>2. Generate today’s plan — it will never use all of your available time.</li>
            <li>3. Run a task with the focus timer, then complete it. Charts fill from recorded sessions only.</li>
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => navigate('today')}>
              Open Today
            </Button>
            <Button variant="secondary" onClick={() => navigate('settings')}>
              Review seed data & rules
            </Button>
          </div>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="Mastery overview" subtitle="Chapters closest to exam-ready">
          {analytics.masteryByChapter.length === 0 ? (
            <EmptyState title="No chapter tracked" description="Chapters come from the seeded academic configuration." />
          ) : (
            <ul className="space-y-2">
              {[...analytics.masteryByChapter]
                .sort((a, b) => b.level - a.level || b.confidence - a.confidence)
                .slice(0, 6)
                .map(({ chapter, level, suggested }) => (
                  <li key={chapter.id} className="flex items-center justify-between gap-2 text-sm">
                    <a className="truncate text-text hover:text-accent" href={href(`chapter/${chapter.id}`)}>
                      {chapter.title}
                    </a>
                    <span className="flex items-center gap-2 whitespace-nowrap text-xs text-text-muted">
                      {MASTERY_TEXT[level]}
                      {suggested !== null && suggested !== level && (
                        <Badge tone="accent" title="The engine estimates a higher level from your recorded practice">
                          est. {MASTERY_TEXT[suggested]}
                        </Badge>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card title="Buffer & minimum day" subtitle="Anti-burnout guardrails">
          <ul className="space-y-2 text-xs text-text-muted">
            <li>
              Buffer reserved each day: <strong className="tnum text-text">{analytics.todayPlan?.bufferMin ?? 0} min</strong>
            </li>
            <li>
              Minimum viable day: <strong className="tnum text-text">{store.planningRules().minDailyMin} min</strong>
            </li>
            <li>
              Maximum planned per day: <strong className="tnum text-text">{store.planningRules().maxDailyMin} min</strong>
            </li>
            <li>Never schedules 100% of the time you declare available.</li>
            <li>One missed day never doubles the next day’s workload.</li>
          </ul>
        </Card>

        <Card title="Portability" subtitle="Local-first · offline-capable">
          <p className="text-xs text-text-muted">
            Everything is stored in a local SQLite database in your browser. Export a JSON or CSV backup at any time;
            migrations never delete completed sessions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => store.downloadExport('json')}>
              Export JSON
            </Button>
            <Button size="sm" variant="secondary" onClick={() => store.downloadExport('csv')}>
              Export CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('settings')}>
              Restore / import
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-text-muted">Current range: {period === '30d' ? '30 days' : period}</p>
        </Card>
      </section>
    </div>
  );
}
