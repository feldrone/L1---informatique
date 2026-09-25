/**
 * Mistake book — eight mistake types, recurrence-aware priority and honest accuracy statistics.
 * A mistake is never hidden: recurring ones become visible study targets.
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Modal, Select, StatTile, TextArea, cx } from '../components/primitives';
import { ChapterProfileCard, SubjectHealthCard } from '../components/intelligence';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { useLookups } from '../lookups';
import type { MistakeType } from '../../domain/types';

const TYPES: Array<{ id: MistakeType; label: string; hint: string }> = [
  { id: 'concept', label: 'Misunderstood concept', hint: 'The idea behind the exercise was wrong' },
  { id: 'calculation', label: 'Calculation error', hint: 'Method right, arithmetic wrong' },
  { id: 'memory', label: 'Forgotten formula / definition', hint: 'Needed an active-recall block' },
  { id: 'careless', label: 'Careless mistake', hint: 'Read the question too fast' },
  { id: 'interpretation', label: 'Misread the question', hint: 'Understood what was asked wrongly' },
  { id: 'algorithm-logic', label: 'Algorithm logic', hint: 'Wrong loop, condition or invariant' },
  { id: 'syntax', label: 'Syntax / language', hint: 'C or French wording, compiler error' },
  { id: 'time-management', label: 'Time management', hint: 'Ran out of time during practice' },
];

export function MistakesScreen() {
  const { state, today } = useStudy();
  const store = useStore();
  const analytics = useAnalytics();
  const { subjectById, chapterById } = useLookups();
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState<'' | MistakeType>('');
  const [showResolved, setShowResolved] = useState(false);
  const [adding, setAdding] = useState(false);

  const subjects = state.snapshot.subjects.filter((s) => s.active);
  const [draft, setDraft] = useState({
    subjectId: subjects[0]?.id ?? '',
    chapterId: '',
    question: '',
    userAnswer: '',
    correctAnswer: '',
    explanation: '',
    type: 'concept' as MistakeType,
    source: '',
  });

  const mistakes = useMemo(() => {
    return state.snapshot.mistakes
      .filter((m) => (showResolved ? true : !m.resolved))
      .filter((m) => (filterSubject ? m.subjectId === filterSubject : true))
      .filter((m) => (filterType ? m.type === filterType : true))
      .sort((a, b) => b.recurrenceCount - a.recurrenceCount || b.date.localeCompare(a.date));
  }, [state.snapshot.mistakes, showResolved, filterSubject, filterType]);

  const quizzes = state.snapshot.quizzes;
  const accuracy = quizzes.length === 0 ? null : Math.round((quizzes.reduce((a, q) => a + q.correct / Math.max(1, q.total), 0) / quizzes.length) * 100);
  const recurring = state.snapshot.mistakes.filter((m) => m.recurrenceCount > 1 && !m.resolved);
  const byType = TYPES.map((type) => ({
    ...type,
    count: state.snapshot.mistakes.filter((m) => m.type === type.id && !m.resolved).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Mistake book</h1>
          <p className="text-xs text-text-muted">
            Mistake classification feeds the planner: recurring errors re-prioritise their chapter without shaming you.
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setShowResolved((v) => !v)}>
            {showResolved ? 'Hide resolved' : 'Show resolved'}
          </Button>
          <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
            Record a mistake
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Open mistakes" value={state.snapshot.mistakes.filter((m) => !m.resolved).length} />
        <StatTile label="Recurring" value={recurring.length} tone={recurring.length > 0 ? 'warning' : undefined} hint="seen more than once" />
        <StatTile label="Quiz accuracy" value={accuracy === null ? '—' : `${accuracy}%`} hint={`${quizzes.length} attempt(s)`} />
        <StatTile label="Total recorded" value={state.snapshot.mistakes.length} hint="kept for history" />
      </div>

      <Card title="Distribution by type" subtitle="Where your errors actually come from">
        {state.snapshot.mistakes.length === 0 ? (
          <p className="text-sm text-text-muted">No mistake recorded yet — this chart fills from your entries only.</p>
        ) : (
          <ul className="space-y-2">
            {byType.map((type) => (
              <li key={type.id}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span>
                    {type.label} <span className="text-text-muted">— {type.hint}</span>
                  </span>
                  <span className="tnum">{type.count}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-1.5 rounded-full bg-accent"
                    style={{ width: `${(type.count / Math.max(1, ...byType.map((t) => t.count))) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Filters" subtitle="Narrow the list when you revise a specific chapter">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subject">
            <Select value={filterSubject} onChange={(event) => setFilterSubject(event.target.value)}>
              <option value="">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.shortName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mistake type">
            <Select value={filterType} onChange={(event) => setFilterType(event.target.value as MistakeType | '')}>
              <option value="">All types</option>
              {TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {analytics.chapterProfiles.filter((p) => p.mistakes.open >= 2).length > 0 && (
        <Card title="Chapter intelligence — mistake pressure" subtitle="Chapters with 2+ open mistakes">
          <div className="space-y-2.5">
            {analytics.chapterProfiles
              .filter((p) => p.mistakes.open >= 2)
              .slice(0, 3)
              .map((p) => (
                <ChapterProfileCard key={p.chapterId} profile={p} onOpen={(id) => (window.location.hash = `#/chapter/${id}`)} />
              ))}
          </div>
        </Card>
      )}

      {analytics.subjectHealth.filter((h) => h.stats.openMistakes > 0).length > 0 && (
        <Card title="Subject health — mistake impact" subtitle="Health scores affected by open mistakes">
          <div className="space-y-3">
            {analytics.subjectHealth
              .filter((h) => h.stats.openMistakes > 0)
              .sort((a, b) => a.score - b.score)
              .slice(0, 2)
              .map((h) => (
                <SubjectHealthCard key={h.subjectId} health={h} onSelect={(id) => (window.location.hash = `#/subject/${id}`)} />
              ))}
          </div>
        </Card>
      )}

      {mistakes.length === 0 ? (
        <Card title="Mistake list">
          <EmptyState
            title="No mistake recorded"
            description="Record mistakes after TD/TP sessions or quizzes. Recurring entries raise the priority of their chapter."
          />
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {mistakes.map((mistake) => (
            <li key={mistake.id} className="rounded-2xl border border-border bg-surface-raised p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{mistake.question}</p>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    {subjectById.get(mistake.subjectId)?.shortName ?? 'Subject'} ·
                    {mistake.chapterId ? ` ${chapterById.get(mistake.chapterId)?.title ?? 'chapter'}` : ' no chapter'} ·{' '}
                    {mistake.date}
                    {mistake.source ? ` · ${mistake.source}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={mistake.recurrenceCount > 1 ? 'warning' : 'neutral'}>
                    {TYPES.find((t) => t.id === mistake.type)?.label ?? mistake.type}
                  </Badge>
                  {mistake.recurrenceCount > 1 && <Badge tone="danger">×{mistake.recurrenceCount}</Badge>}
                  {mistake.resolved && <Badge tone="success">resolved</Badge>}
                </div>
              </div>

              {(mistake.userAnswer || mistake.correctAnswer) && (
                <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-danger/30 bg-danger/5 p-2">
                    <dt className="text-danger">Your answer</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">{mistake.userAnswer || '—'}</dd>
                  </div>
                  <div className="rounded-xl border border-success/30 bg-success/5 p-2">
                    <dt className="text-success">Correct answer</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap">{mistake.correctAnswer || '—'}</dd>
                  </div>
                </dl>
              )}
              {mistake.explanation && <p className="mt-2 text-xs text-text-muted">{mistake.explanation}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant={mistake.resolved ? 'secondary' : 'success'} onClick={() => store.resolveMistake(mistake.id, !mistake.resolved)}>
                  {mistake.resolved ? 'Reopen' : 'Mark resolved'}
                </Button>
                {mistake.nextReview && (
                  <span className="text-[11px] text-text-muted">
                    Next review {mistake.nextReview} {mistake.nextReview <= today && '· due now'}
                  </span>
                )}
                {mistake.chapterId && (
                  <Button size="sm" variant="ghost" onClick={() => (window.location.hash = `#/chapter/${mistake.chapterId}`)}>
                    Open chapter
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Record a mistake">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subject">
              <Select value={draft.subjectId} onChange={(event) => setDraft((d) => ({ ...d, subjectId: event.target.value, chapterId: '' }))}>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.shortName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Chapter (optional)">
              <Select value={draft.chapterId} onChange={(event) => setDraft((d) => ({ ...d, chapterId: event.target.value }))}>
                <option value="">No specific chapter</option>
                {state.snapshot.chapters
                  .filter((c) => c.subjectId === draft.subjectId)
                  .map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Mistake type">
              <Select value={draft.type} onChange={(event) => setDraft((d) => ({ ...d, type: event.target.value as MistakeType }))}>
                {TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Source (optional)">
              <input
                value={draft.source}
                onChange={(event) => setDraft((d) => ({ ...d, source: event.target.value }))}
                className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                placeholder="e.g. TD 4 exercice 2"
              />
            </Field>
          </div>
          <Field label="Question / exercise">
            <TextArea value={draft.question} onChange={(event) => setDraft((d) => ({ ...d, question: event.target.value }))} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your answer">
              <TextArea value={draft.userAnswer} onChange={(event) => setDraft((d) => ({ ...d, userAnswer: event.target.value }))} />
            </Field>
            <Field label="Correct answer">
              <TextArea value={draft.correctAnswer} onChange={(event) => setDraft((d) => ({ ...d, correctAnswer: event.target.value }))} />
            </Field>
          </div>
          <Field label="What to remember next time">
            <TextArea value={draft.explanation} onChange={(event) => setDraft((d) => ({ ...d, explanation: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={draft.question.trim().length === 0}
              onClick={() => {
                store.addMistake({
                  subjectId: draft.subjectId,
                  chapterId: draft.chapterId || null,
                  question: draft.question,
                  userAnswer: draft.userAnswer,
                  correctAnswer: draft.correctAnswer,
                  explanation: draft.explanation,
                  type: draft.type,
                  date: today,
                  nextReview: today,
                  source: draft.source,
                });
                setDraft((d) => ({ ...d, question: '', userAnswer: '', correctAnswer: '', explanation: '', source: '' }));
                setAdding(false);
              }}
            >
              Save mistake
            </Button>
          </div>
        </div>
      </Modal>

      <p className={cx('text-[11px] text-text-muted')}>
        Recurrence is counted automatically when the same question is recorded twice before being resolved. A resolved
        mistake stays in the history — it is evidence of progress, not a deleted record.
      </p>
    </div>
  );
}
