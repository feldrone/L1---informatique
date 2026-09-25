/**
 * Daily loop UI: check-in (start of day), day inspection drawer and end-of-day review.
 * All wording is deliberately non-punitive: "your plan changed", "backlog detected", never "you failed".
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Select, StatTile, TextArea, cx } from './primitives';
import { SessionTimeline } from './charts';
import { useStudy } from '../../state/provider';
import { formatLongDate, formatMinutes, type ISODate } from '../../domain/date';
import type { BlockedBy, EnergyLevel } from '../../domain/types';
import { buildSessionTimeline } from '../../domain/analytics/progress';

const BLOCKERS: Array<{ id: BlockedBy; label: string }> = [
  { id: 'lack-of-time', label: 'Lack of time' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'distraction', label: 'Phone / distraction' },
  { id: 'difficult-subject', label: 'Difficult subject' },
  { id: 'task-too-long', label: 'Task was too long' },
  { id: 'unexpected-event', label: 'Unexpected event' },
  { id: 'procrastination', label: 'Procrastination' },
  { id: 'unclear-task', label: 'Unclear task' },
];

export function CheckInCard({ compact }: { compact?: boolean }) {
  const { store, state, today } = useStudy();
  const existing = state.snapshot.checkIns.find((c) => c.date === today) ?? null;
  const rules = state.snapshot.preferences.rules;
  const classCount = state.snapshot.timetable.filter(
    (c) => c.active && c.dayOfWeek === new Date(`${today}T12:00:00`).getDay(),
  ).length;

  const [availableMin, setAvailableMin] = useState(existing?.availableMin ?? Math.round(rules.maxDailyMin * 0.8));
  const [energy, setEnergy] = useState<EnergyLevel>(existing?.energy ?? 3);
  const [sleep, setSleep] = useState(existing?.sleepQuality ?? 3);
  const [urgent, setUrgent] = useState(existing?.urgentWork ?? '');
  const [note, setNote] = useState(existing?.classNote ?? '');
  const [open, setOpen] = useState(!existing);

  if (!open) {
    return (
      <Card
        title="Daily check-in"
        subtitle="Used to size today's plan"
        action={
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Edit
          </Button>
        }
      >
        <div className="flex flex-wrap gap-4 text-xs text-text-muted">
          <span className="tnum">Available: {formatMinutes(availableMin)}</span>
          <span className="tnum">Energy: {energy}/5</span>
          <span className="tnum">Sleep: {sleep}/5</span>
          {urgent && <span>Urgent: {urgent}</span>}
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Daily check-in"
      subtitle="Five quick answers — they adapt the schedule instead of a long questionnaire"
    >
      <div className={cx('grid gap-3', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        <Field label="Study time available today (minutes)" hint={`Rules allow up to ${rules.maxDailyMin} min`}>
          <Select value={availableMin} onChange={(event) => setAvailableMin(Number(event.target.value))}>
            {[30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300].map((value) => (
              <option key={value} value={value}>
                {formatMinutes(value)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Energy level">
          <Select value={energy} onChange={(event) => setEnergy(Number(event.target.value) as EnergyLevel)}>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} — {['very low', 'low', 'normal', 'good', 'high'][value - 1]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sleep quality">
          <Select value={sleep} onChange={(event) => setSleep(Number(event.target.value))}>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}/5
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Urgent university work">
          <TextArea
            value={urgent}
            onChange={(event) => setUrgent(event.target.value)}
            placeholder="e.g. TD sheet due on Sunday, TP report"
          />
        </Field>
        <Field label={`University classes noted for today (timetable shows ${classCount})`}>
          <TextArea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. extra TD at 14:00, room change"
          />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          onClick={() => {
            store.saveCheckIn({ date: today, availableMin, energy, sleepQuality: sleep, urgentWork: urgent, classNote: note });
            setOpen(false);
          }}
        >
          Save & regenerate today&apos;s plan
        </Button>
        {existing && (
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        )}
        <span className="text-[11px] text-text-muted">
          Energy 1 or under 60 minutes available switches to a minimum viable day automatically.
        </span>
      </div>
    </Card>
  );
}

export function DayReviewCard() {
  const { store, state, today } = useStudy();
  const tasks = state.snapshot.tasks.filter((t) => t.planDate === today);
  const sessions = state.snapshot.sessions.filter((s) => s.date === today);
  const existing = state.snapshot.reviews.find((r) => r.date === today) ?? null;
  const [blockers, setBlockers] = useState<BlockedBy[]>(existing?.blockedBy ?? []);
  const [note, setNote] = useState(existing?.note ?? '');
  const [saved, setSaved] = useState(false);

  const done = tasks.filter((t) => t.status === 'done');
  const plannedMin = tasks.reduce((acc, t) => acc + t.plannedMin, 0);
  const completedMin = done.reduce((acc, t) => acc + t.actualMin, 0);
  const completionRate = plannedMin === 0 ? 0 : Math.round((completedMin / plannedMin) * 100);
  const subjectsStudied = new Set(done.map((t) => t.subjectId).filter(Boolean));
  const mistakesToday = state.snapshot.mistakes.filter((m) => m.date === today).length;
  const reviewsToday = state.snapshot.reviewEvents.filter((r) => r.date === today).length;
  const masteryToday = state.snapshot.chapters.filter((c) => c.lastRevisionDate === today).length;

  return (
    <Card title="End-of-day review" subtitle="Closes the loop: PLAN → EXECUTE → RECORD → EVALUATE → ADAPT">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Planned" value={formatMinutes(plannedMin)} />
        <StatTile label="Completed" value={formatMinutes(completedMin)} tone={completionRate >= 80 ? 'success' : undefined} />
        <StatTile label="Completion" value={`${completionRate}%`} tone={completionRate >= 80 ? 'success' : completionRate >= 50 ? 'warning' : 'danger'} />
        <StatTile label="Sessions" value={sessions.length} hint={`${reviewsToday} recall check(s)`} />
      </div>
      <dl className="mt-3 grid gap-1 text-xs text-text-muted sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt>Subjects studied</dt>
          <dd className="tnum text-text">{subjectsStudied.size}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Tasks skipped</dt>
          <dd className="tnum text-text">{tasks.filter((t) => t.status === 'skipped').length}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Tasks delayed</dt>
          <dd className="tnum text-text">{tasks.filter((t) => t.status === 'pending').length}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Mistakes recorded</dt>
          <dd className="tnum text-text">{mistakesToday}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Chapters touched</dt>
          <dd className="tnum text-text">{masteryToday}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Backlog</dt>
          <dd className="tnum text-text">{formatMinutes(state.snapshot.backlog.filter((b) => b.state === 'open').reduce((a, b) => a + b.minutes, 0))}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="text-sm font-medium">What blocked you today?</p>
        <p className="mb-2 text-[11px] text-text-muted">
          Stored and reused by the planner — repeated patterns change how tasks are sized and placed.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BLOCKERS.map((blocker) => {
            const active = blockers.includes(blocker.id);
            return (
              <button
                key={blocker.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setBlockers((previous) =>
                    previous.includes(blocker.id) ? previous.filter((b) => b !== blocker.id) : [...previous, blocker.id],
                  )
                }
                className={cx(
                  'rounded-full border px-2.5 py-1 text-xs transition',
                  active ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:text-text',
                )}
              >
                {blocker.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <Field label="Notes (optional)">
          <TextArea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything worth remembering for tomorrow" />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          onClick={() => {
            store.saveDailyReview({ date: today, blockedBy: blockers, note });
            setSaved(true);
          }}
        >
          Save review
        </Button>
        {saved && <Badge tone="success">saved</Badge>}
        {existing && <span className="text-[11px] text-text-muted">Review saved at {existing.createdAt.slice(11, 16)}</span>}
      </div>
    </Card>
  );
}

export function DayDrawer({
  date,
  onClose,
}: {
  date: ISODate | null;
  onClose: () => void;
}) {
  const { state } = useStudy();
  const day = useMemo(
    () => (date ? state.snapshot : null),
    [date, state.snapshot],
  );
  if (!date || !day) return null;

  const tasks = day.tasks.filter((t) => t.planDate === date);
  const sessions = day.sessions.filter((s) => s.date === date);
  const plan = day.plans.find((p) => p.date === date) ?? null;
  const review = day.reviews.find((r) => r.date === date) ?? null;
  const notes = tasks.filter((t) => t.note.length > 0);
  const plannedMin = tasks.reduce((acc, t) => acc + t.plannedMin, 0);
  const completedMin = tasks.filter((t) => t.status === 'done').reduce((acc, t) => acc + t.actualMin, 0);
  const completion = plannedMin === 0 ? 0 : Math.round((completedMin / plannedMin) * 100);
  const hasData = tasks.length > 0 || sessions.length > 0;
  const timeline = buildSessionTimeline({ date, sessions: day.sessions, subjects: day.subjects });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" role="dialog" aria-modal="true" aria-label={`Day details ${date}`}>
      <div className="animate-fade-in h-full w-full max-w-lg overflow-y-auto border-l border-border bg-surface-raised p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-text-muted uppercase">Day inspection</p>
            <h2 className="text-lg font-semibold">{formatLongDate(date)}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {!hasData ? (
          <EmptyState
            title="No data recorded for this day"
            description="Your study history will appear here once you start logging sessions. Nothing is generated for days you did not use the app."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Planned" value={formatMinutes(plannedMin)} />
              <StatTile label="Actual" value={formatMinutes(completedMin)} />
              <StatTile label="Completion" value={`${completion}%`} tone={completion >= 80 ? 'success' : completion >= 50 ? 'warning' : 'danger'} />
            </div>

            {plan && (
              <div className="rounded-xl border border-border bg-surface-sunken/60 p-3 text-xs text-text-muted">
                <p className="font-medium text-text">Plan mode: {plan.mode}</p>
                <p className="mt-1">{plan.rationale}</p>
              </div>
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold">Tasks</h3>
              {tasks.length === 0 ? (
                <p className="text-xs text-text-muted">No tasks planned for this day.</p>
              ) : (
                <ul className="space-y-1.5">
                  {tasks.map((task) => {
                    const subject = day.subjects.find((s) => s.id === task.subjectId);
                    return (
                      <li key={task.id} className="flex items-start gap-2 text-xs">
                        <span
                          className={cx(
                            'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]',
                            task.status === 'done'
                              ? 'bg-success/20 text-success'
                              : task.status === 'skipped'
                                ? 'bg-danger/20 text-danger'
                                : 'bg-surface-sunken text-text-muted',
                          )}
                          aria-hidden="true"
                        >
                          {task.status === 'done' ? '✓' : task.status === 'skipped' ? '✗' : '·'}
                        </span>
                        <span className="flex-1">
                          <span className={cx('block', task.status === 'done' && 'line-through')}>{task.title}</span>
                          <span className="text-text-muted">
                            {subject?.shortName ?? 'General'} · {formatMinutes(task.plannedMin)}
                            {task.actualMin > 0 && ` · logged ${formatMinutes(task.actualMin)}`}
                            {task.status === 'skipped' && ' · skipped (moved to backlog)'}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Study sessions</h3>
              <SessionTimeline entries={timeline} />
            </section>

            {(notes.length > 0 || review?.note) && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Notes</h3>
                <ul className="space-y-1 text-xs text-text-muted">
                  {notes.map((task) => (
                    <li key={task.id}>
                      <span className="text-text">{task.title}:</span> {task.note}
                    </li>
                  ))}
                  {review?.note && <li>{review.note}</li>}
                </ul>
              </section>
            )}

            {review && review.blockedBy.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Reported blockers</h3>
                <div className="flex flex-wrap gap-1.5">
                  {review.blockedBy.map((blocker) => (
                    <Badge key={blocker} tone="warning">
                      {blocker.replace(/-/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function useDayDrawer() {
  const [date, setDate] = useState<ISODate | null>(null);
  return { date, open: setDate, close: () => setDate(null) };
}
