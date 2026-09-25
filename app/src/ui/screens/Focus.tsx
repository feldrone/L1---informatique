/**
 * Focus screen: the timer plus the anti-procrastination helpers from the spec — a 10-minute start
 * block, task splitting and a no-shame distraction counter.
 */

import { useMemo, useState } from 'react';
import { Button, Card, StatTile } from '../components/primitives';
import { FocusTimer } from '../components/timer';
import { formatMinutes } from '../../domain/date';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { useLookups } from '../lookups';

export function FocusScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { today } = useStudy();
  const store = useStore();
  const analytics = useAnalytics();
  const { subjectLookup } = useLookups();
  const [splitTarget, setSplitTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const openTasks = useMemo(
    () => analytics.todayTasks.filter((t) => t.status !== 'done' && t.status !== 'skipped' && t.status !== 'deferred'),
    [analytics.todayTasks],
  );
  const running = analytics.todayTasks.find((t) => t.status === 'running') ?? null;
  const longTasks = openTasks.filter((t) => t.plannedMin > 50);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Focus timer</h1>
          <p className="text-xs text-text-muted">
            Default {store.planningRules().focusMin}/{store.planningRules().breakMin} — configurable in Settings.
            Distractions are counted, never judged.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onOpenDay(today)}>
          Today&apos;s data
        </Button>
      </header>

      <FocusTimer tasks={openTasks} initialTaskId={running?.id ?? null} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Open tasks" value={openTasks.length} hint="ready to run now" />
        <StatTile label="Logged today" value={formatMinutes(analytics.todayProgress.completedMin)} hint={`${analytics.todayProgress.effectiveMin} effective`} />
        <StatTile label="Sessions today" value={analytics.sessionTimelineToday.length} />
      </div>

      <Card
        title="Struggling to start?"
        subtitle="Anti-procrastination tools — no motivational quotes, just smaller first steps"
      >
        <div className="space-y-3 text-sm text-text-muted">
          <p>
            Pick a task and commit to <strong className="text-text">10 minutes</strong>. The planner shortens the block,
            keeps the task open and never treats the short start as a failure.
          </p>
          <div className="flex flex-wrap gap-2">
            {openTasks.slice(0, 4).map((task) => (
              <Button
                key={task.id}
                size="sm"
                variant="secondary"
                onClick={() => {
                  store.shortStartTask(task.id);
                  setFeedback(`10-minute start block created for “${task.title}”.`);
                }}
              >
                10-min start · {subjectLookup.get(task.subjectId ?? '')?.shortName ?? 'General'}
              </Button>
            ))}
          </div>
          {feedback && <p className="text-xs text-accent">{feedback}</p>}

          {longTasks.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-medium text-text">Split a long task</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={splitTarget ?? ''}
                  onChange={(event) => setSplitTarget(event.target.value || null)}
                  className="rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                  aria-label="Task to split"
                >
                  <option value="">Select a task…</option>
                  {longTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title} ({task.plannedMin} min)
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!splitTarget}
                  onClick={() => {
                    if (!splitTarget) return;
                    store.splitTask(splitTarget);
                    setFeedback('Task split into blocks of 60 minutes or less, scheduled one after the other.');
                    setSplitTarget(null);
                  }}
                >
                  Split into blocks
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="Today&apos;s remaining plan" subtitle="Same actions as the Today screen, without leaving the timer">
        <ul className="space-y-2">
          {openTasks.length === 0 ? (
            <li className="text-sm text-text-muted">No open task. Generate today&apos;s plan from the Today screen.</li>
          ) : (
            openTasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm">{task.title}</span>
                  <span className="text-[11px] text-text-muted">
                    {subjectLookup.get(task.subjectId ?? '')?.shortName ?? 'General'} · {formatMinutes(task.plannedMin)}
                  </span>
                </span>
                <span className="flex gap-1.5">
                  <Button size="sm" variant="primary" onClick={() => store.startTask(task.id)}>
                    Start
                  </Button>
                  <Button size="sm" variant="success" onClick={() => store.completeTask(task.id)}>
                    Complete
                  </Button>
                </span>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
