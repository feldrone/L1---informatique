/**
 * Subject detail — chapter mastery ladder (0 Not started → 5 Exam-ready), spaced revision state,
 * recorded sessions and mistakes for a single subject.
 */

import { useMemo } from 'react';
import { Button, Card, EmptyState, ProvenanceBadge, StatTile, cx } from '../components/primitives';
import { Sparkline } from '../components/charts';
import { formatMinutes, addDays } from '../../domain/date';
import { href, navigate } from '../router';
import { useStore, useStudy } from '../../state/provider';
import { MASTERY_TEXT } from '../lookups';

export function SubjectDetailScreen({ subjectId }: { subjectId: string }) {
  const { state, today } = useStudy();
  const store = useStore();

  const subject = state.snapshot.subjects.find((s) => s.id === subjectId) ?? null;
  const chapters = useMemo(
    () => state.snapshot.chapters.filter((c) => c.subjectId === subjectId).sort((a, b) => a.order - b.order),
    [state.snapshot.chapters, subjectId],
  );
  const tasks = state.snapshot.tasks.filter((t) => t.subjectId === subjectId);
  const sessions = state.snapshot.sessions.filter((s) => s.subjectId === subjectId);
  const mistakes = state.snapshot.mistakes.filter((m) => m.subjectId === subjectId && !m.resolved);
  const exams = state.snapshot.exams.filter((e) => e.subjectId === subjectId).sort((a, b) => a.date.localeCompare(b.date));
  const classes = state.snapshot.timetable.filter((c) => c.subjectId === subjectId && c.active);

  if (!subject) {
    return (
      <Card title="Subject not found">
        <EmptyState title="Unknown subject" description="This subject no longer exists in the configuration." />
        <Button className="mt-3" variant="secondary" onClick={() => navigate('subjects')}>
          Back to subjects
        </Button>
      </Card>
    );
  }

  const done = tasks.filter((t) => t.status === 'done');
  const actualMin = done.reduce((acc, t) => acc + t.actualMin, 0);
  const effectiveMin = sessions.reduce((acc, s) => acc + s.effectiveMin, 0);
  const backlogMin = state.snapshot.backlog
    .filter((b) => b.subjectId === subjectId && b.state !== 'recovered')
    .reduce((acc, b) => acc + b.minutes, 0);

  // weekly effective minutes for the sparkline (last 8 weeks)
  const weekly = useMemo(() => {
    const buckets: number[] = [];
    for (let week = 7; week >= 0; week -= 1) {
      const from = addDays(today, -(week * 7 + 6));
      const to = addDays(today, -(week * 7));
      buckets.push(
        sessions.filter((s) => s.date >= from && s.date <= to).reduce((acc, s) => acc + s.effectiveMin, 0),
      );
    }
    return buckets;
  }, [sessions, today]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-3.5 w-3.5 rounded-full" style={{ background: subject.color }} aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold">{subject.name}</h1>
            <p className="text-xs text-text-muted">
              {subject.code} · {subject.unit} · coefficient {subject.coefficient ?? '—'} · {subject.credits ?? '—'} credits
              {classes.length > 0 && ` · ${classes.length} timetable slot(s)`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProvenanceBadge provenance={subject.provenance} />
          <Button size="sm" variant="ghost" onClick={() => navigate('subjects')}>
            All subjects
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Logged" value={formatMinutes(actualMin)} hint={`${done.length} completed task(s)`} />
        <StatTile label="Effective" value={formatMinutes(effectiveMin)} hint="active work weighted higher" />
        <StatTile label="Backlog" value={formatMinutes(backlogMin)} tone={backlogMin > 0 ? 'warning' : undefined} />
        <StatTile label="Open mistakes" value={mistakes.length} hint={mistakes.length > 0 ? 'recurrence raises priority' : 'none recorded'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Chapter mastery" subtitle="Chapters come from the seeded programme — edit them in Settings">
          {chapters.length === 0 ? (
            <EmptyState title="No chapter recorded" description="Add chapters in Settings to track mastery for this subject." />
          ) : (
            <ul className="space-y-2">
              {chapters.map((chapter) => {
                const due = chapter.nextRevisionDate !== null && chapter.nextRevisionDate <= today;
                return (
                  <li key={chapter.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <a className="text-sm font-medium hover:text-accent" href={href(`chapter/${chapter.id}`)}>
                        {chapter.order}. {chapter.title}
                      </a>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {due && <span className="text-[11px] text-warning">revision due</span>}
                        <span className="text-[11px] text-text-muted">{MASTERY_TEXT[chapter.mastery]}</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1" role="img" aria-label={`Mastery ${chapter.mastery} of 5`}>
                        {[1, 2, 3, 4, 5].map((step) => (
                          <span
                            key={step}
                            className={cx(
                              'h-1.5 w-7 rounded-full',
                              chapter.mastery >= step ? 'bg-accent' : 'bg-surface-sunken',
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-text-muted">
                        {chapter.expectedMin} min expected · source {chapter.sourceLabel}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`chapter/${chapter.id}`)}>
                        Open
                      </Button>
                      {due && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            store.recordRecall(chapter.id, 0.6, { date: today, note: 'Quick review from subject screen' });
                          }}
                        >
                          Log a review attempt
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Last 8 weeks" subtitle="Effective minutes per week">
            <Sparkline values={weekly} width={280} height={60} />
            <p className="mt-2 tnum text-xs text-text-muted">
              {formatMinutes(weekly.reduce((a, b) => a + b, 0))} total · week target {formatMinutes(subject.weeklyTargetMin)}
            </p>
          </Card>

          <Card title="Assessments" subtitle="Exams and quizzes recorded for this subject">
            {exams.length === 0 ? (
              <p className="text-sm text-text-muted">No exam recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {exams.map((exam) => (
                  <li key={exam.id} className="flex items-center justify-between gap-2">
                    <span>{exam.name}</span>
                    <span className="tnum text-xs text-text-muted">
                      {exam.date} · weight {exam.weight} · prep {exam.prepStatus}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigate('exams')}>
              Manage exams
            </Button>
          </Card>

          <Card title="Timetable slots" subtitle="Editable in Settings — provisional values are marked">
            {classes.length === 0 ? (
              <p className="text-sm text-text-muted">No class recorded for this subject.</p>
            ) : (
              <ul className="space-y-1 text-xs text-text-muted">
                {classes.map((slot) => (
                  <li key={slot.id} className="flex items-center justify-between gap-2">
                    <span>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.dayOfWeek]} {slot.startTime}–{slot.endTime} · {slot.kind}
                      {slot.room ? ` · ${slot.room}` : ''}
                    </span>
                    <ProvenanceBadge provenance={slot.provenance} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
