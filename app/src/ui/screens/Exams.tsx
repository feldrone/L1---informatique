/**
 * Exams — countdown, weights, syllabus coverage and exam mode. Exam mode is derived by the planner
 * from the recorded dates (no hidden switch), so the plan stays honest.
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Modal, Select, StatTile, cx } from '../components/primitives';
import { formatMinutes, daysBetween, todayISO } from '../../domain/date';
import { useStore, useStudy } from '../../state/provider';
import { useLookups, MASTERY_TEXT } from '../lookups';
import type { Exam } from '../../domain/types';

export function ExamsScreen() {
  const { state, today } = useStudy();
  const store = useStore();
  const { subjectById, chapterById } = useLookups();
  const rules = store.planningRules();
  const [editing, setEditing] = useState<Exam | null>(null);
  const [creating, setCreating] = useState(false);

  const subjects = state.snapshot.subjects.filter((s) => s.active);
  const exams = useMemo(
    () => [...state.snapshot.exams].sort((a, b) => a.date.localeCompare(b.date)),
    [state.snapshot.exams],
  );
  const upcoming = exams.filter((exam) => exam.date >= today);
  const nextExam = upcoming[0] ?? null;
  const inExamMode = nextExam !== null && daysBetween(today, nextExam.date) <= rules.examModeWindowDays;

  const [draft, setDraft] = useState<Omit<Exam, 'createdAt'>>({
    id: '',
    subjectId: subjects[0]?.id ?? '',
    name: '',
    date: today,
    weight: 1,
    difficulty: 3,
    syllabusChapterIds: [],
    prepStatus: 0,
    kind: 'EMD',
    room: '',
    note: '',
  });

  const openCreate = () => {
    setDraft({
      id: `exam-${Date.now()}`,
      subjectId: subjects[0]?.id ?? '',
      name: '',
      date: today,
      weight: 1,
      difficulty: 3,
      syllabusChapterIds: [],
      prepStatus: 0,
      kind: 'EMD',
      room: '',
      note: '',
    });
    setCreating(true);
  };

  const openEdit = (exam: Exam) => {
    setDraft({ ...exam });
    setEditing(exam);
  };

  const coverage = (exam: Exam) => {
    const chapters = exam.syllabusChapterIds
      .map((id) => chapterById.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    if (chapters.length === 0) return null;
    const ready = chapters.filter((c) => c.mastery >= 4).length;
    const average = chapters.reduce((acc, c) => acc + c.mastery, 0) / chapters.length;
    return { chapters, ready, percent: Math.round((average / 5) * 100) };
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Exams</h1>
          <p className="text-xs text-text-muted">
            Exam mode starts {rules.examModeWindowDays} day(s) before an assessment and reserves more revision time in
            the daily plan.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={openCreate}>
          Add exam
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Upcoming" value={upcoming.length} hint={nextExam ? `next ${nextExam.date}` : 'none recorded'} />
        <StatTile
          label="Countdown"
          value={nextExam ? `${daysBetween(today, nextExam.date)} d` : '—'}
          tone={inExamMode ? 'warning' : undefined}
          hint={nextExam ? nextExam.name : 'add an exam to start the countdown'}
        />
        <StatTile label="Exam mode" value={inExamMode ? 'Active' : 'Inactive'} hint={`window ${rules.examModeWindowDays} day(s)`} />
        <StatTile label="Past exams" value={exams.length - upcoming.length} hint="kept for history" />
      </div>

      {inExamMode && nextExam && (
        <Card title="Exam mode" subtitle={`${nextExam.name} on ${nextExam.date}`}>
          <ul className="space-y-2 text-sm text-text-muted">
            <li>• The planner will prioritise the chapters listed in the syllabus of this exam.</li>
            <li>• New COURSE/TD tasks are lower priority; revision and practice blocks take precedence.</li>
            <li>• Buffer time is still reserved — cramming is not scheduled.</li>
            <li>
              • Revision due now: <strong className="tnum text-text">{state.snapshot.chapters.filter((c) => c.nextRevisionDate !== null && c.nextRevisionDate <= today).length}</strong> chapter(s).
            </li>
          </ul>
        </Card>
      )}

      {exams.length === 0 ? (
        <Card title="No exam recorded" subtitle="Add the official dates when your faculty publishes them">
          <EmptyState
            title="Nothing to count down yet"
            description="Add an exam with its date, weight and chapters to activate exam mode and syllabus coverage tracking."
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {exams.map((exam) => {
            const subject = subjectById.get(exam.subjectId);
            const days = daysBetween(today, exam.date);
            const isPast = days < 0;
            const info = coverage(exam);
            return (
              <Card key={exam.id} as="article" className={cx(isPast && 'opacity-70')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {subject && <span className="h-2.5 w-2.5 rounded-full" style={{ background: subject.color }} />}
                      {exam.name || subject?.name || 'Exam'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {subject?.shortName ?? '—'} · {exam.kind} · {exam.date}
                      {exam.room ? ` · room ${exam.room}` : ''}
                    </p>
                  </div>
                  <Badge tone={isPast ? 'neutral' : days <= rules.examModeWindowDays ? 'warning' : 'accent'}>
                    {isPast ? 'done' : days === 0 ? 'today' : `${days} d`}
                  </Badge>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-text-muted">Weight</dt>
                    <dd className="tnum">{exam.weight}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Difficulty</dt>
                    <dd className="tnum">{exam.difficulty}/5</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Prep</dt>
                    <dd className="tnum">{exam.prepStatus}%</dd>
                  </div>
                </dl>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted">
                    <span>Syllabus readiness</span>
                    {info && (
                      <span className="tnum">
                        {info.ready}/{info.chapters.length} chapters confident
                      </span>
                    )}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className={cx('h-2 rounded-full', info && info.percent >= 70 ? 'bg-success' : 'bg-accent')}
                      style={{ width: `${info?.percent ?? 0}%` }}
                    />
                  </div>
                  {info ? (
                    <ul className="mt-2 space-y-0.5 text-[11px] text-text-muted">
                      {info.chapters
                        .slice()
                        .sort((a, b) => a.mastery - b.mastery)
                        .slice(0, 4)
                        .map((chapter) => (
                          <li key={chapter.id} className="flex justify-between gap-2">
                            <span className="truncate">{chapter.title}</span>
                            <span>{MASTERY_TEXT[chapter.mastery]}</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-text-muted">
                      No syllabus chapter linked — edit the exam to track coverage.
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(exam)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const next = Math.min(100, exam.prepStatus + 10);
                      store.saveExam({ ...exam, prepStatus: next });
                    }}
                  >
                    +10% prep
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => store.deleteExam(exam.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card title="Preparation guidance" subtitle="Derived from your recorded mastery and the exam weights">
        {upcoming.length === 0 ? (
          <p className="text-sm text-text-muted">Add an upcoming exam to see preparation guidance.</p>
        ) : (
          <ul className="space-y-2 text-sm text-text-muted">
            {upcoming.slice(0, 3).map((exam) => {
              const subject = subjectById.get(exam.subjectId);
              const chapters = state.snapshot.chapters.filter((c) => c.subjectId === exam.subjectId);
              const weakest = [...chapters].sort((a, b) => a.mastery - b.mastery)[0] ?? null;
              const total = chapters.reduce((acc, c) => acc + c.expectedMin, 0);
              return (
                <li key={exam.id} className="rounded-xl border border-border p-3">
                  <p className="text-sm text-text">
                    {exam.name || subject?.name} · {daysBetween(today, exam.date)} day(s) left
                  </p>
                  <p className="mt-1 text-xs">
                    {chapters.length} chapter(s) in the programme, {formatMinutes(total)} of expected work.{' '}
                    {weakest ? (
                      <>
                        Weakest area now: <strong className="text-text">{weakest.title}</strong> ({MASTERY_TEXT[weakest.mastery]}).
                      </>
                    ) : (
                      'No chapter recorded for this subject.'
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-text-muted">
          Preparation is the objective here: coverage, revision and timed practice. The system does not predict grades or
          ranks.
        </p>
      </Card>

      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit exam' : 'Add exam'}
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subject">
              <Select
                value={draft.subjectId}
                onChange={(event) => setDraft((d) => ({ ...d, subjectId: event.target.value }))}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.shortName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name">
              <input
                value={draft.name}
                onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
                className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                placeholder="e.g. Examen Analyse 1"
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={draft.date}
                onChange={(event) => setDraft((d) => ({ ...d, date: event.target.value || todayISO() }))}
                className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Kind">
              <Select
                value={draft.kind}
                onChange={(event) => setDraft((d) => ({ ...d, kind: event.target.value as Exam['kind'] }))}
              >
                {(['EMD', 'TD', 'TP', 'QUIZ', 'ORAL', 'MOCK'] as const).map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Weight" hint="Higher weight = more planning priority">
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={draft.weight}
                onChange={(event) => setDraft((d) => ({ ...d, weight: Number(event.target.value) }))}
                className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Difficulty (1-5)">
              <Select value={draft.difficulty} onChange={(event) => setDraft((d) => ({ ...d, difficulty: Number(event.target.value) }))}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Preparation %">
              <Select value={draft.prepStatus} onChange={(event) => setDraft((d) => ({ ...d, prepStatus: Number(event.target.value) }))}>
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((value) => (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Room (optional)">
              <input
                value={draft.room}
                onChange={(event) => setDraft((d) => ({ ...d, room: event.target.value }))}
                className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium">Syllabus chapters</p>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {state.snapshot.chapters
                .filter((chapter) => chapter.subjectId === draft.subjectId)
                .map((chapter) => {
                  const checked = draft.syllabusChapterIds.includes(chapter.id);
                  return (
                    <label key={chapter.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setDraft((d) => ({
                            ...d,
                            syllabusChapterIds: event.target.checked
                              ? [...d.syllabusChapterIds, chapter.id]
                              : d.syllabusChapterIds.filter((id) => id !== chapter.id),
                          }))
                        }
                        className="h-3.5 w-3.5"
                      />
                      {chapter.title}
                    </label>
                  );
                })}
              {state.snapshot.chapters.filter((chapter) => chapter.subjectId === draft.subjectId).length === 0 && (
                <p className="text-[11px] text-text-muted">No chapter recorded for this subject yet.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                store.saveExam(draft);
                setCreating(false);
                setEditing(null);
              }}
            >
              Save exam
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
