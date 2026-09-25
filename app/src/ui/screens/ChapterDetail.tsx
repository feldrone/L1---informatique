/**
 * Chapter detail — mastery ladder with manual override (never a silent promotion), spaced-revision
 * history, recorded sessions, quiz attempts and the mistake book entries for this chapter.
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Modal, StatTile, TextArea, cx } from '../components/primitives';
import { buildSessionTimeline } from '../../domain/analytics/progress';
import { SessionTimeline } from '../components/charts';
import { formatMinutes } from '../../domain/date';
import { navigate } from '../router';
import { useStore, useStudy } from '../../state/provider';
import { MASTERY_TEXT } from '../lookups';

const LABELS: Array<{ level: 1 | 2 | 3 | 4 | 5; description: string }> = [
  { level: 1, description: 'Seen — attended the course, watched the explanations' },
  { level: 2, description: 'Understood — can follow the reasoning with help' },
  { level: 3, description: 'Practised — solved TD/TP exercises with the corrected solution nearby' },
  { level: 4, description: 'Confident — solved exercises without help, minor mistakes remain' },
  { level: 5, description: 'Exam-ready — recall without notes, timed exercises under exam conditions' },
];

export function ChapterDetailScreen({ chapterId }: { chapterId: string }) {
  const { state, today } = useStudy();
  const store = useStore();
  const [showRecall, setShowRecall] = useState(false);
  const [recallScore, setRecallScore] = useState(3);
  const [recallNote, setRecallNote] = useState('');
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizTotal, setQuizTotal] = useState(10);
  const [quizCorrect, setQuizCorrect] = useState(7);
  const [quizTitle, setQuizTitle] = useState('');

  const chapter = state.snapshot.chapters.find((c) => c.id === chapterId) ?? null;
  const subject = chapter ? state.snapshot.subjects.find((s) => s.id === chapter.subjectId) ?? null : null;
  if (chapter && subject) {
    return (
      <ChapterView
        chapter={chapter}
        subjectName={subject.name}
        subjectColor={subject.color}
        today={today}
        store={store}
        chapters={state.snapshot.chapters}
        mistakes={state.snapshot.mistakes.filter((m) => m.chapterId === chapter.id)}
        sessions={state.snapshot.sessions.filter((s) => s.chapterId === chapter.id)}
        quizzes={state.snapshot.quizzes.filter((q) => q.chapterId === chapter.id)}
        reviews={state.snapshot.reviewEvents.filter((r) => r.chapterId === chapter.id)}
        subjects={state.snapshot.subjects}
        recall={{
          open: showRecall,
          setOpen: setShowRecall,
          score: recallScore,
          setScore: setRecallScore,
          note: recallNote,
          setNote: setRecallNote,
        }}
        quiz={{
          open: showQuiz,
          setOpen: setShowQuiz,
          total: quizTotal,
          setTotal: setQuizTotal,
          correct: quizCorrect,
          setCorrect: setQuizCorrect,
          title: quizTitle,
          setTitle: setQuizTitle,
        }}
      />
    );
  }

  return (
    <Card title="Chapter not found">
      <EmptyState title="Unknown chapter" description="This chapter is not part of the current configuration." />
      <Button className="mt-3" variant="secondary" onClick={() => navigate('subjects')}>
        Back to subjects
      </Button>
    </Card>
  );
}

function ChapterView({
  chapter,
  subjectName,
  subjectColor,
  today,
  store,
  chapters,
  mistakes,
  sessions,
  quizzes,
  reviews,
  subjects,
  recall,
  quiz,
}: {
  chapter: import('../../domain/types').Chapter;
  subjectName: string;
  subjectColor: string;
  today: string;
  store: ReturnType<typeof useStore>;
  chapters: import('../../domain/types').Chapter[];
  mistakes: import('../../domain/types').Mistake[];
  sessions: import('../../domain/types').StudySession[];
  quizzes: import('../../domain/types').QuizAttempt[];
  reviews: import('../../domain/types').ReviewEvent[];
  subjects: import('../../domain/types').Subject[];
  recall: {
    open: boolean;
    setOpen: (value: boolean) => void;
    score: number;
    setScore: (value: number) => void;
    note: string;
    setNote: (value: string) => void;
  };
  quiz: {
    open: boolean;
    setOpen: (value: boolean) => void;
    total: number;
    setTotal: (value: number) => void;
    correct: number;
    setCorrect: (value: number) => void;
    title: string;
    setTitle: (value: string) => void;
  };
}) {
  const prerequisites = useMemo(
    () => chapters.filter((c) => chapter.prerequisiteIds.includes(c.id)),
    [chapters, chapter.prerequisiteIds],
  );
  const related = useMemo(
    () => chapters.filter((c) => c.subjectId === chapter.subjectId && c.id !== chapter.id).slice(0, 6),
    [chapters, chapter.id, chapter.subjectId],
  );

  const timeline = useMemo(
    () =>
      buildSessionTimeline({
        date: today,
        sessions,
        subjects: subjects,
      }),
    [sessions, subjects, today],
  );

  const effectiveMin = sessions.reduce((acc, s) => acc + s.effectiveMin, 0);
  const masteryHistory = store.masteryHistory(chapter.id);
  const revisionDue = chapter.nextRevisionDate !== null && chapter.nextRevisionDate <= today;
  const averageQuiz = quizzes.length === 0 ? null : Math.round((quizzes.reduce((a, q) => a + q.correct / Math.max(1, q.total), 0) / quizzes.length) * 100);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-text-muted uppercase">
            <a className="hover:text-accent" href={`#/subject/${chapter.subjectId}`}>
              {subjectName}
            </a>{' '}
            · chapter {chapter.order}
          </p>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <span className="h-3 w-3 rounded-full" style={{ background: subjectColor }} aria-hidden="true" />
            {chapter.title}
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Source: {chapter.sourceLabel} ({chapter.sourceRef}) · expected {chapter.expectedMin} min
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {revisionDue && <Badge tone="warning">Revision due</Badge>}
          {chapter.masteryManual !== null && <Badge tone="accent">mastery set manually</Badge>}
          <Button size="sm" variant="secondary" onClick={() => recall.setOpen(true)}>
            Log a review attempt
          </Button>
          <Button size="sm" variant="ghost" onClick={() => quiz.setOpen(true)}>
            Record a quiz
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Mastery" value={`${chapter.mastery}/5`} hint={MASTERY_TEXT[chapter.mastery]} />
        <StatTile label="Confidence" value={`${Math.round(chapter.confidence * 100)}%`} hint="evidence behind the level" />
        <StatTile label="Effective time" value={formatMinutes(effectiveMin)} hint={`${sessions.length} session(s)`} />
        <StatTile label="Quiz average" value={averageQuiz === null ? '—' : `${averageQuiz}%`} hint={`${quizzes.length} attempt(s)`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Mastery ladder"
          subtitle="One success never promotes a chapter to mastered — the estimate needs repeated evidence"
        >
          <ol className="space-y-1.5">
            {LABELS.map((step) => {
              const reached = chapter.mastery >= step.level;
              const suggested = step.level === chapter.mastery + 1;
              return (
                <li key={step.level} className="flex items-start gap-3">
                  <span
                    className={cx(
                      'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs',
                      reached ? 'border-accent bg-accent text-on-accent' : 'border-border text-text-muted',
                    )}
                  >
                    {step.level}
                  </span>
                  <span>
                    <span className={cx('block text-sm', reached ? 'text-text' : 'text-text-muted')}>{MASTERY_TEXT[step.level]}</span>
                    <span className="block text-[11px] text-text-muted">{step.description}</span>
                    {suggested && (
                      <span className="mt-1 block text-[11px] text-accent">
                        Next realistic step based on your recorded work.
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 text-xs text-text-muted">
              Adjust by hand when your own judgement differs — the estimator then only proposes, never overwrites silently.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  size="sm"
                  variant={chapter.mastery === level ? 'primary' : 'ghost'}
                  onClick={() => store.setChapterMastery(chapter.id, level as 0 | 1 | 2 | 3 | 4 | 5, true)}
                >
                  {level}
                </Button>
              ))}
              <Button size="sm" variant="secondary" onClick={() => store.refreshChapterMastery(chapter.id, today)}>
                Recompute from evidence
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Spaced revision" subtitle={`Default intervals: ${store.planningRules().reviewIntervals.join(' / ')} days`}>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-text-muted">Last revision</dt>
              <dd className="tnum text-sm text-text">{chapter.lastRevisionDate ?? 'never'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Next revision</dt>
              <dd className={cx('tnum text-sm', revisionDue ? 'text-warning' : 'text-text')}>
                {chapter.nextRevisionDate ?? 'not scheduled'}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Interval index</dt>
              <dd className="tnum text-sm text-text">{chapter.reviewIntervalIndex}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Recorded reviews</dt>
              <dd className="tnum text-sm text-text">{reviews.length}</dd>
            </div>
          </dl>

          {reviews.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-xs">
              {reviews
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 6)
                .map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-2">
                    <span className="text-text-muted">
                      {event.date} · recall {Math.round(event.recallScore * 100)}%
                      {event.note ? ` · ${event.note}` : ''}
                    </span>
                    <Badge tone={event.outcome === 'strong' ? 'success' : event.outcome === 'partial' ? 'warning' : 'danger'}>
                      {event.outcome}
                    </Badge>
                  </li>
                ))}
            </ul>
          )}

          <div className="mt-3 rounded-xl border border-border bg-surface-sunken/50 p-3">
            <p className="text-[11px] text-text-muted">
              Passive reading does not count as revision. A review only moves the schedule when you record a recall
              attempt: <strong className="text-text">pass</strong> stretches the interval, a{' '}
              <strong className="text-text">failed</strong> recall brings the chapter back sooner and lowers the stored
              mastery by at most one level.
            </p>
          </div>

          {prerequisites.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-text-muted">Study these first:</p>
              <ul className="mt-1 space-y-1 text-xs">
                {prerequisites.map((pre) => (
                  <li key={pre.id}>
                    <a className="text-accent hover:underline" href={`#/chapter/${pre.id}`}>
                      {pre.title}
                    </a>{' '}
                    <span className="text-text-muted">({MASTERY_TEXT[pre.mastery]})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Sessions on this chapter" subtitle="Recorded study time, newest first">
          {sessions.length === 0 ? (
            <EmptyState
              title="No session recorded"
              description="Your study history will appear here once you start logging sessions on this chapter."
            />
          ) : (
            <>
              <SessionTimeline entries={timeline} />
              <ul className="mt-3 space-y-1 text-xs text-text-muted">
                {sessions
                  .slice()
                  .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
                  .slice(0, 8)
                  .map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-2">
                      <span>
                        {session.date} {session.startTime}–{session.endTime}
                      </span>
                      <span className="tnum">
                        {session.durationMin} min · {session.effectiveMin} effective
                        {session.activeRecall ? ' · active recall' : ''}
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Mistake book" subtitle="Recurring mistakes raise this chapter's priority">
          {mistakes.length === 0 ? (
            <EmptyState title="No mistake recorded" description="Record mistakes after TD/TP sessions to build the review list." />
          ) : (
            <ul className="space-y-2">
              {mistakes.map((mistake) => (
                <li key={mistake.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm">{mistake.question}</span>
                    <span className="flex items-center gap-1.5">
                      <Badge tone={mistake.resolved ? 'success' : 'warning'}>{mistake.type}</Badge>
                      {mistake.recurrenceCount > 1 && <span className="text-[11px] text-danger">×{mistake.recurrenceCount}</span>}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {mistake.source || 'source not recorded'} · next review {mistake.nextReview ?? '—'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Related chapters" subtitle="Same subject, useful next steps">
        <div className="flex flex-wrap gap-2">
          {related.map((item) => (
            <Button key={item.id} size="sm" variant="ghost" onClick={() => navigate(`chapter/${item.id}`)}>
              {item.title} · {MASTERY_TEXT[item.mastery]}
            </Button>
          ))}
          {related.length === 0 && <p className="text-sm text-text-muted">No other chapter in this subject.</p>}
        </div>
      </Card>

      {masteryHistory.length > 0 && (
        <Card title="Mastery history" subtitle="Append-only change log (manual or estimated)">
          <ul className="space-y-1 text-xs text-text-muted">
            {masteryHistory.slice(-10).reverse().map((entry, index) => (
              <li key={index} className="flex items-center justify-between gap-2">
                <span>
                  {entry.date} · {entry.source}
                </span>
                <span className="tnum">
                  {entry.from} → {entry.to}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={recall.open} onClose={() => recall.setOpen(false)} title="Log a review attempt">
        <p className="text-sm text-text-muted">
          Answer honestly: use this only if you tried to recall without your notes. Interval before review:{' '}
          {store.planningRules().reviewIntervals[chapter.reviewIntervalIndex] ?? '—'} day(s).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted">Recall quality</span>
          {[1, 2, 3, 4, 5].map((value) => (
            <Button key={value} size="sm" variant={recall.score === value ? 'primary' : 'ghost'} onClick={() => recall.setScore(value)}>
              {value}
            </Button>
          ))}
          <span className="text-[11px] text-text-muted">1 = blank, 3 = partial, 5 = full recall</span>
        </div>
        <div className="mt-3">
          <Field label="Note (optional)">
            <TextArea value={recall.note} onChange={(event) => recall.setNote(event.target.value)} placeholder="What did you forget?" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => recall.setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              store.recordRecall(chapter.id, (recall.score - 1) / 4, { date: today, note: recall.note });
              recall.setOpen(false);
              recall.setNote('');
            }}
          >
            Save attempt
          </Button>
        </div>
      </Modal>

      <Modal open={quiz.open} onClose={() => quiz.setOpen(false)} title="Record a quiz or TD score">
        <div className="space-y-3">
          <Field label="Title">
            <input
              value={quiz.title}
              onChange={(event) => quiz.setTitle(event.target.value)}
              className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
              placeholder="e.g. TD 3 — exercice 2"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Questions / points">
              <input
                type="number"
                min={1}
                value={quiz.total}
                onChange={(event) => quiz.setTotal(Math.max(1, Number(event.target.value)))}
                className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Correct">
              <input
                type="number"
                min={0}
                max={quiz.total}
                value={quiz.correct}
                onChange={(event) => quiz.setCorrect(Math.min(quiz.total, Math.max(0, Number(event.target.value))))}
                className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => quiz.setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                store.addQuizAttempt({
                  subjectId: chapter.subjectId,
                  chapterId: chapter.id,
                  title: quiz.title || `${chapter.title} quiz`,
                  date: today,
                  total: quiz.total,
                  correct: quiz.correct,
                  kind: 'TD',
                  durationMin: null,
                  note: '',
                });
                quiz.setOpen(false);
                quiz.setTitle('');
              }}
            >
              Save result
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
