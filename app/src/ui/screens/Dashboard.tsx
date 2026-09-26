/**
 * Dashboard — bilingual, explainable academic cockpit.
 * Hierarchy: Where am I? → What today? → What needs attention? Why? → What changed? → Adaptive → Detailed.
 * Mobile first, progressive disclosure, real data only.
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, StatTile, cx } from '../components/primitives';
import { ProgressRing, RadialSubjects, WeeklyBars, StudyHeatmap, BalanceBars } from '../components/charts';
import { SubjectHealthCard, ChapterProfileCard, WeeklyReviewCard, AdaptationCard } from '../components/intelligence';
import { HelpButton, ExplainableSection } from '../components/contextualHelp';
import { TaskList } from '../components/task';
import { useAnalytics, useStudy } from '../../state/provider';
import { useI18n } from '../../i18n';
import { formatMinutes } from '../../i18n/formatters';
import { href, navigate } from '../router';
import { useLookups, MASTERY_TEXT } from '../lookups';

export function DashboardScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { store, today } = useStudy();
  const { t, lang } = useI18n();
  const analytics = useAnalytics();
  const { subjectLookup, chapterLookup } = useLookups();
  const [heatmapMetric, setHeatmapMetric] = useState<'time' | 'completion' | 'revision' | 'exercises' | 'mockExams'>('time');
  const [showDetails, setShowDetails] = useState(false);

  const { todayProgress, streaks, consistency, weekly, insights, goals, balance, priorities, backlog, recoveryPlan, revisionDue, subjectHealth, chapterProfiles, weeklyReview, adaptationPlan, performance } = analytics;

  const openTasks = useMemo(
    () => analytics.todayTasks.filter((t) => t.status !== 'done' && t.status !== 'skipped' && t.status !== 'deferred'),
    [analytics.todayTasks],
  );
  const nextBest = openTasks[0] ?? null;
  const nextBestSubject = nextBest?.subjectId ? subjectLookup.get(nextBest.subjectId) : null;
  const topPriority = priorities[0] ?? null;
  const hasHistory = analytics.dataPoints > 0;
  const dayHasTasks = analytics.todayTasks.length > 0;

  const snap = store.getState().snapshot;
  const totalSubjects = snap.subjects.filter((s) => s.active).length;
  const totalChapters = snap.chapters.length;
  const totalTasks = snap.tasks.length;
  const doneTasks = snap.tasks.filter((t) => t.status === 'done').length;
  const masteryAvg = snap.chapters.length ? (snap.chapters.reduce((a, c) => a + c.mastery, 0) / snap.chapters.length).toFixed(1) : '—';
  const strongest = performance.strongestSubject ? subjectLookup.get(performance.strongestSubject.subjectId) : null;
  const criticalHealth = subjectHealth.filter((h) => h.label === 'critical' || h.label === 'at-risk');

  const whereAmIData = {
    overallPercent: todayProgress.percent,
    completed: `${doneTasks}/${totalTasks}`,
    subjects: `${snap.subjects.filter((s) => s.active).length}`,
    chapters: `${totalChapters}`,
    tasks: `${doneTasks}/${totalTasks}`,
    mastery: masteryAvg,
    currentFocus: nextBest ? nextBest.title : t('common.noData'),
    strongestArea: strongest?.shortName ?? t('common.noData'),
    needsAttention: criticalHealth[0] ? subjectLookup.get(criticalHealth[0].subjectId)?.shortName ?? criticalHealth[0].label : t('common.noData'),
    examRisk: snap.exams.filter((e) => e.date >= today).length > 0 ? `${snap.exams.filter((e) => e.date >= today).length} ${t('nav.exams')}` : t('common.noData'),
  };

  const heroInset = (
    <>
      <span className="tnum block">
        {todayProgress.tasksDone}/{todayProgress.tasksTotal} {t('dashboard.tasksCompleted')} · {formatMinutes(todayProgress.completedMin, lang)} {t('common.completed')}
      </span>
      <span className="tnum block">
        {formatMinutes(todayProgress.completedMin, lang)} / {formatMinutes(todayProgress.plannedMin, lang)} {t('week.planned')}
      </span>
    </>
  );

  if (!hasHistory) {
    return (
      <div className="space-y-6">
        <Card title={t('dashboard.whereAmI')} subtitle={t('dashboard.whereAmI.desc')}>
          <div className="space-y-4">
            <EmptyState title={t('dashboard.noData.title')} description={t('dashboard.noData.desc')} />
            <div className="grid gap-2 text-sm text-text-muted">
              <p>{t('dashboard.noData.step1')}</p>
              <p>{t('dashboard.noData.step2')}</p>
              <p>{t('dashboard.noData.step3')}</p>
              <p>{t('dashboard.noData.step4')}</p>
              <p>{t('dashboard.noData.step5')}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => navigate('today')}>{t('today.title')}</Button>
              <Button variant="secondary" onClick={() => navigate('settings')}>{t('settings.title')}</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Welcome / Where am I? */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{t('dashboard.whereAmI')}</h1>
          <HelpButton titleKey="help.subjectHealth.title" descKey="help.subjectHealth.desc" />
        </div>
        <Card title={t('dashboard.whereAmI')} subtitle={t('dashboard.whereAmI.desc')}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label={t('dashboard.overallProgress')} value={`${todayProgress.percent}%`} hint={`${todayProgress.completedMin}/${todayProgress.plannedMin} ${t('time.minutes')}`} />
            <StatTile label={t('dashboard.completed')} value={whereAmIData.completed} hint={`${doneTasks} ${t('common.completed')}`} />
            <StatTile label={t('dashboard.subjects')} value={`${totalSubjects}`} hint={t('subjects.allSubjects')} />
            <StatTile label={t('dashboard.chapters')} value={`${totalChapters}`} hint={t('subjects.subtitle')} />
            <StatTile label={t('dashboard.tasksCompleted')} value={`${doneTasks}/${totalTasks}`} />
            <StatTile label={t('dashboard.mastery')} value={masteryAvg} hint={`${snap.chapters.filter((c) => c.mastery >= 4).length} ${t('glossary.mastery')}`} />
            <StatTile label={t('dashboard.currentFocus')} value={whereAmIData.currentFocus} hint={nextBestSubject?.shortName ?? ''} />
            <StatTile label={t('dashboard.strongestArea')} value={whereAmIData.strongestArea} hint={t('common.strongest')} />
            <StatTile label={t('dashboard.needsAttention')} value={whereAmIData.needsAttention} hint={t('common.atRisk')} />
            <StatTile label={t('dashboard.examRisk')} value={whereAmIData.examRisk} hint={t('glossary.examRisk')} />
          </div>
          <ExplainableSection
            why={t('explain.whatItMeans')}
            evidence={`${t('dashboard.completed')}: ${whereAmIData.completed}, ${t('dashboard.mastery')}: ${masteryAvg}, ${t('dashboard.subjects')}: ${totalSubjects}, ${t('dashboard.chapters')}: ${totalChapters}`}
          />
        </Card>
      </section>

      {/* 2. Overall progress + Today's priority */}
      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card className="flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col items-center">
            <ProgressRing
              percent={todayProgress.percent}
              label={t('common.today')}
              percentNote={t('week.planned')}
              primary={heroInset}
              secondary={
                todayProgress.remainingMin > 0
                  ? `${formatMinutes(todayProgress.remainingMin, lang)} ${t('common.pending')}`
                  : hasHistory
                    ? t('today.handledToday')
                    : t('common.notEnoughData')
              }
              tone={todayProgress.percent >= 80 ? 'success' : todayProgress.percent >= 40 ? 'accent' : 'warning'}
              ariaSummary={`${todayProgress.percent}%`}
            />
          </div>
          <div className="w-full space-y-3 sm:max-w-xs">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-text-muted uppercase">{t('dashboard.todaysPriority')}</p>
              {nextBest ? (
                <>
                  <p className="mt-1 text-sm font-medium">{nextBest.title}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {nextBestSubject?.shortName ?? t('common.noData')} · {formatMinutes(nextBest.plannedMin, lang)}
                  </p>
                  {nextBest.reasons[0] && (
                    <ExplainableSection why={nextBest.reasons[0]} evidence={`${nextBestSubject?.shortName}, ${formatMinutes(nextBest.plannedMin, lang)}`} />
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="primary" onClick={() => { store.startTask(nextBest.id); navigate('focus'); }}>
                      {t('task.start')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => store.completeTask(nextBest.id)}>
                      {t('task.complete')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => store.skipTask(nextBest.id)}>
                      {t('task.skip')}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="mt-1 text-sm text-text-muted">{t('empty.noTasks')}</p>
              )}
            </div>

            {backlog.openMin > 0 && (
              <div className="rounded-xl border border-warning/40 bg-warning/5 p-3">
                <p className="text-xs font-semibold text-warning">{t('common.overdue')}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {backlog.openItems} {t('common.open')}, {formatMinutes(backlog.openMin, lang)}. {t('recovery.plan')} {recoveryPlan.mode} · {recoveryPlan.horizonDays} {t('time.days')}
                </p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigate('recovery')}>
                  {t('nav.recovery')}
                </Button>
              </div>
            )}
            {revisionDue.length > 0 && (
              <div className="rounded-xl border border-accent/40 bg-accent-soft/40 p-3">
                <p className="text-xs font-semibold text-accent">{t('common.due')}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {revisionDue.length} {t('dashboard.chapters')} {t('common.due')}: {revisionDue.slice(0, 3).map((c) => c.title).join(', ')}
                </p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigate('today')}>
                  {t('today.title')}
                </Button>
              </div>
            )}
            {topPriority && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-text-muted uppercase">{t('dashboard.todaysPriority')}</p>
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
          title={t('today.tasks')}
          subtitle={openTasks.length > 0 ? `${openTasks.length} ${t('common.pending')}` : t('today.handledToday')}
          action={
            <Button size="sm" variant="ghost" onClick={() => navigate('today')}>
              {t('today.title')}
            </Button>
          }
        >
          <TaskList
            tasks={openTasks.slice(0, 4)}
            subjectLookup={subjectLookup}
            chapterLookup={chapterLookup}
            compact
            onOpenFocus={() => navigate('focus')}
            emptyTitle={dayHasTasks ? t('today.handledToday') : t('empty.noTasks')}
            emptyDescription={dayHasTasks ? t('today.handledToday') : t('empty.noTasksDesc')}
            emptyAction={
              dayHasTasks ? (
                <Button size="sm" variant="secondary" onClick={() => navigate('today')}>
                  {t('today.title')}
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={() => store.generatePlan(today)}>
                  {t('today.title')}
                </Button>
              )
            }
          />
        </Card>
      </section>

      {/* 3. What needs attention + Why */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{t('dashboard.whatNeedsAttention')}</h2>
          <HelpButton titleKey="help.examRisk.title" descKey="help.examRisk.desc" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={t('dashboard.criticalSubjects')} subtitle={`${criticalHealth.length} ${t('common.atRisk')}`}>
            {criticalHealth.length === 0 ? (
              <EmptyState title={t('common.noData')} description={t('analytics.noData')} />
            ) : (
              <div className="space-y-3">
                {criticalHealth.slice(0, 2).map((h) => (
                  <div key={h.subjectId} className="space-y-2">
                    <SubjectHealthCard health={h} onSelect={(id) => navigate(`subject/${id}`)} />
                    <ExplainableSection
                      why={h.recommendations[0]?.reason ?? t('explain.whyAtRisk')}
                      evidence={h.recommendations[0]?.evidence ?? h.evidence.sentence}
                      recommendation={h.recommendations[0]?.text}
                    />
                  </div>
                ))}
                <Button size="sm" variant="ghost" onClick={() => navigate('analytics')}>
                  {t('analytics.title')} →
                </Button>
              </div>
            )}
          </Card>

          <Card title={t('dashboard.weakChapters')} subtitle={t('dashboard.weakChaptersCard')}>
            {chapterProfiles.length === 0 ? (
              <EmptyState title={t('analytics.noData')} description={t('common.notEnoughDataDesc')} />
            ) : (
              <div className="space-y-2.5">
                {chapterProfiles
                  .filter((p) => p.health.label !== 'not-started')
                  .sort((a, b) => a.health.score - b.health.score)
                  .slice(0, 3)
                  .map((p) => (
                    <div key={p.chapterId} className="space-y-1">
                      <ChapterProfileCard profile={p} onOpen={(id) => navigate(`chapter/${id}`)} />
                      <ExplainableSection why={p.recommendations[0]?.reason ?? t('explain.needsWork')} evidence={p.recommendations[0]?.evidence} recommendation={p.recommendations[0]?.text} />
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* 4. What changed this week + Adaptive */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{t('dashboard.whatIsImproving')}</h2>
          <HelpButton titleKey="help.weeklyReview.title" descKey="help.weeklyReview.desc" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <WeeklyReviewCard review={weeklyReview} />
          <Card title={t('dashboard.adaptivePlanningCard')} subtitle={t('analytics.progressIntelligenceHint')}>
            <AdaptationCard plan={adaptationPlan} />
          </Card>
        </div>
      </section>

      {/* 5. Performance + Streak */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={t('week.activeDays')}
          value={`${streaks.currentStreak} ${t('time.days')}`}
          hint={streaks.missedYesterday ? t('explain.noRecentActivity') : t('common.today')}
          tone={streaks.currentStreak > 0 ? 'success' : undefined}
        />
        <StatTile label={t('dashboard.performance')} value={`${streaks.longestStreak} ${t('time.days')}`} hint={`${streaks.totalActiveDays} ${t('common.active')}`} />
        <StatTile label={t('week.activeDays')} value={`${streaks.activeDaysWindow}/${streaks.windowDays}`} hint={t('week.consistency')} />
        <StatTile
          label={t('glossary.velocity')}
          value={consistency.insufficientData ? '—' : `${consistency.score}/100`}
          hint={consistency.insufficientData ? t('common.notEnoughData') : t('help.velocity.title')}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title={t('analytics.subjectBalance')} subtitle={t('charts.subjectBalance')} action={<Button size="sm" variant="ghost" onClick={() => navigate('subjects')}>{t('nav.subjects')}</Button>}>
          <BalanceBars entries={balance} onSelect={(id) => navigate(`subject/${id}`)} />
        </Card>

        <Card title={t('dashboard.performance')} subtitle={`${performance.label} · ${performance.overall.completionRate}% ${t('glossary.completion')}`}>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label={t('glossary.completion')} value={formatMinutes(performance.overall.effectiveMin, lang)} hint={`${performance.overall.efficiency}%`} />
            <StatTile label={t('week.activeDays')} value={`${performance.velocity.activeDays}/${performance.velocity.totalDays}`} hint={`${performance.velocity.consistency}%`} />
            <StatTile label={t('glossary.focus')} value={`${performance.focus.focusSessions}`} hint={`${performance.focus.activeRecallShare}%`} />
            <StatTile label={t('dashboard.tasksCompleted')} value={`${performance.overall.tasksDone}/${performance.overall.tasksTotal}`} />
          </div>
          <Button size="sm" variant="ghost" className="mt-3" onClick={() => navigate('analytics')}>
            {t('analytics.title')} →
          </Button>
        </Card>
      </section>

      {/* 6. Detailed analytics - progressive disclosure */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? t('common.hideDetails') : t('common.showDetails')}
        </Button>
      </div>

      {showDetails && (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <Card title={t('analytics.studyTimeBySubject')} subtitle={t('common.today')} action={<Button size="sm" variant="ghost" onClick={() => navigate('analytics')}>{t('nav.analytics')}</Button>}>
              <RadialSubjects entries={analytics.distributionToday} centerLabel={t('common.today')} centerValue={formatMinutes(todayProgress.effectiveMin, lang)} centerHint={t('charts.effectiveTime')} onSelect={(id) => navigate(`subject/${id}`)} />
            </Card>
            <Card title={t('week.title')} subtitle={t('week.subtitle')}>
              <WeeklyBars days={weekly.days} targetWeeklyMin={weekly.targetMin} onSelect={(date) => onOpenDay(date)} />
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-muted sm:grid-cols-4">
                <div><dt>{t('week.activeDays')}</dt><dd className="tnum text-sm text-text">{weekly.activeDays}/7</dd></div>
                <div><dt>{t('week.bestDay')}</dt><dd className="text-sm text-text">{weekly.bestDay ? weekly.bestDay.label : '—'}</dd></div>
                <div><dt>{t('week.weakestDay')}</dt><dd className="text-sm text-text">{weekly.weakestDay ? weekly.weakestDay.label : '—'}</dd></div>
                <div><dt>{t('glossary.focus')}</dt><dd className="tnum text-sm text-text">{weekly.revisionSessions}</dd></div>
              </dl>
            </Card>
          </section>

          <Card title={t('charts.heatmap')} subtitle={t('analytics.subtitle')}>
            <StudyHeatmap cells={analytics.heatmap[heatmapMetric]} metric={heatmapMetric} onMetricChange={setHeatmapMetric} onSelectDay={onOpenDay} />
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card title={t('analytics.insights')} subtitle={t('analytics.subtitle')}>
              {insights.length === 0 ? (
                <EmptyState title={t('common.notEnoughData')} description={t('common.notEnoughDataDesc')} />
              ) : (
                <ul className="space-y-2.5">
                  {insights.map((insight) => (
                    <li key={insight.id} className="rounded-xl border border-border bg-surface-sunken/50 p-3">
                      <p className="text-sm">{insight.text}</p>
                      <p className="mt-1 text-[11px] text-text-muted">{t('common.evidence')}: {insight.evidence} · {insight.sampleSize}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={t('analytics.goals')} subtitle={t('analytics.goals')}>
              {goals.length === 0 ? (
                <EmptyState title={t('common.noData')} description={t('analytics.goals')} />
              ) : (
                <ul className="space-y-3">
                  {goals.map(({ goal, percent, onTrack, deadlineDaysLeft, requiredWeeklyMin }) => (
                    <li key={goal.id}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{goal.title}</p>
                        <p className="tnum text-sm">{percent}%</p>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                        <div className={cx('h-2 rounded-full transition-[width] duration-700', onTrack === false ? 'bg-warning' : 'bg-accent')} style={{ width: `${percent}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-text-muted">
                        {deadlineDaysLeft !== null && deadlineDaysLeft >= 0 ? `${deadlineDaysLeft} ${t('time.days')}` : t('common.noData')}
                        {requiredWeeklyMin !== null && ` · ${formatMinutes(requiredWeeklyMin, lang)}/week`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card title={t('chapterDetail.masteryLadder')} subtitle={t('analytics.subtitle')}>
              {analytics.masteryByChapter.length === 0 ? (
                <EmptyState title={t('chapterDetail.noChapter')} description={t('common.notEnoughDataDesc')} />
              ) : (
                <ul className="space-y-2">
                  {[...analytics.masteryByChapter].sort((a, b) => b.level - a.level || b.confidence - a.confidence).slice(0, 6).map(({ chapter, level, suggested }) => (
                    <li key={chapter.id} className="flex items-center justify-between gap-2 text-sm">
                      <a className="truncate text-text hover:text-accent" href={href(`chapter/${chapter.id}`)}>{chapter.title}</a>
                      <span className="flex items-center gap-2 whitespace-nowrap text-xs text-text-muted">
                        {MASTERY_TEXT[level]}
                        {suggested !== null && suggested !== level && (
                          <Badge tone="accent">est. {MASTERY_TEXT[suggested]}</Badge>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title={t('settings.dailyLimits')} subtitle={t('settings.dailyLimits')}>
              <ul className="space-y-2 text-xs text-text-muted">
                <li>{t('week.planned')}: <strong className="tnum text-text">{analytics.todayPlan?.bufferMin ?? 0} {t('time.minutes')}</strong></li>
                <li>{t('form.availableTime')}: <strong className="tnum text-text">{store.planningRules().minDailyMin} {t('time.minutes')}</strong></li>
                <li>{t('settings.dailyLimits')}: <strong className="tnum text-text">{store.planningRules().maxDailyMin} {t('time.minutes')}</strong></li>
              </ul>
            </Card>
            <Card title={t('settings.data')} subtitle={t('settings.data')}>
              <p className="text-xs text-text-muted">{t('settings.data')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => store.downloadExport('json')}>{t('settings.export')} JSON</Button>
                <Button size="sm" variant="secondary" onClick={() => store.downloadExport('csv')}>{t('settings.export')} CSV</Button>
                <Button size="sm" variant="ghost" onClick={() => navigate('settings')}>{t('settings.title')}</Button>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
