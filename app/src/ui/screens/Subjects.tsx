/**
 * Subjects — every subject with its coefficient, mastery progress, real logged time and the
 * planner's priority reasons. Nothing here is hard-coded in the component: all of it comes from
 * the editable seed plus stored records.
 */

import { useMemo } from 'react';
import { Badge, Button, Card, ProvenanceBadge, StatTile, cx } from '../components/primitives';
import { BalanceBars } from '../components/charts';
import { formatMinutes } from '../../domain/date';
import { navigate } from '../router';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { MASTERY_TEXT } from '../lookups';

export function SubjectsScreen() {
  const { state, today } = useStudy();
  const store = useStore();
  const analytics = useAnalytics();
  const subjects = state.snapshot.subjects;

  const priorityById = useMemo(
    () => new Map(analytics.priorities.map((p) => [p.subjectId, p])),
    [analytics.priorities],
  );
  const balanceById = useMemo(() => new Map(analytics.balance.map((b) => [b.subjectId, b])), [analytics.balance]);

  const active = subjects.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const pendingExams = analytics.upcomingExams;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Subjects</h1>
          <p className="text-xs text-text-muted">
            {active.length} active subject(s) · weights, colours and chapters are editable in Settings
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate('settings')}>
          Edit configuration
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Chapters tracked" value={analytics.masteryByChapter.length} hint={`${state.snapshot.chapters.length} in the programme seed`} />
        <StatTile label="Revision due" value={analytics.revisionDue.length} hint="spaced review schedule" />
        <StatTile label="Upcoming exams" value={pendingExams.length} hint={pendingExams[0] ? `next: ${pendingExams[0].date}` : 'none recorded'} />
        <StatTile label="Backlog" value={formatMinutes(analytics.backlog.openMin)} hint={`${analytics.backlog.openItems} item(s)`} />
      </div>

      <Card title="Subject balance" subtitle="Planned vs effective time, last 14 days — neglect warnings are factual only">
        <BalanceBars entries={analytics.balance} onSelect={(id) => navigate(`subject/${id}`)} />
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {active.map((subject) => {
          const chapters = state.snapshot.chapters.filter((c) => c.subjectId === subject.id);
          const mastered = chapters.filter((c) => c.mastery >= 4).length;
          const averageMastery =
            chapters.length === 0 ? null : chapters.reduce((acc, c) => acc + c.mastery, 0) / chapters.length;
          const priority = priorityById.get(subject.id);
          const balance = balanceById.get(subject.id);
          const exam = pendingExams.find((e) => e.subjectId === subject.id) ?? null;

          return (
            <Card key={subject.id} as="article" className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: subject.color }} aria-hidden="true" />
                  <div>
                    <h2 className="text-sm font-semibold">
                      <a className="hover:text-accent" href={`#/subject/${subject.id}`}>
                        {subject.name}
                      </a>
                    </h2>
                    <p className="text-[11px] text-text-muted">
                      {subject.code} · {subject.unit} · coefficient {subject.coefficient ?? '—'} · {subject.credits ?? '—'} credits
                    </p>
                  </div>
                </div>
                <ProvenanceBadge provenance={subject.provenance} />
              </div>

              <dl className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-text-muted">Mastery</dt>
                  <dd className="tnum">
                    {averageMastery === null ? '—' : `${averageMastery.toFixed(1)}/5`}
                    <span className="block text-[11px] text-text-muted">
                      {averageMastery === null ? 'no chapter' : MASTERY_TEXT[Math.round(averageMastery)]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Logged (14 d)</dt>
                  <dd className="tnum">{formatMinutes(balance?.effectiveMin ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Last studied</dt>
                  <dd className="tnum">{balance?.lastStudiedDate ?? '—'}</dd>
                </div>
              </dl>

              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted">
                  <span>
                    {mastered}/{chapters.length} chapters at “Confident” or better
                  </span>
                  {exam && <span>exam {exam.date}</span>}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-2 rounded-full transition-[width] duration-700"
                    style={{
                      width: `${chapters.length === 0 ? 0 : (mastered / chapters.length) * 100}%`,
                      background: subject.color,
                    }}
                  />
                </div>
              </div>

              {priority && (
                <ul className="space-y-0.5 text-[11px] text-text-muted">
                  {priority.reasons.slice(0, 3).map((reason, index) => (
                    <li key={index}>• {reason}</li>
                  ))}
                </ul>
              )}

              {balance?.warning && (
                <p className={cx('rounded-lg border border-warning/40 bg-warning/5 px-2.5 py-1.5 text-[11px] text-warning')}>
                  {balance.warning}
                </p>
              )}

              <div className="mt-auto flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => navigate(`subject/${subject.id}`)}>
                  Chapter mastery
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    store.generatePlan(today);
                    navigate('today');
                  }}
                >
                  Plan a session today
                </Button>
                <Badge tone="neutral">target {formatMinutes(subject.weeklyTargetMin)}/week</Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
