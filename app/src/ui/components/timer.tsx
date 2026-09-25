/**
 * Focus timer (spec §19, §20): configurable focus/break durations, explicit pause, distraction
 * counter and a post-session outcome rating. Nothing is logged until the student confirms the
 * outcome, and interruptions are reported without shame.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Field, Select, TextArea, cx } from './primitives';
import { useStudy } from '../../state/provider';
import { formatMinutes } from '../../domain/date';
import type { StudyTask } from '../../domain/types';

type Phase = 'focus' | 'break' | 'idle' | 'done';

export function FocusTimer({
  tasks,
  initialTaskId,
  onFinished,
}: {
  tasks: StudyTask[];
  initialTaskId?: string | null;
  onFinished?: () => void;
}) {
  const { store, state } = useStudy();
  const rules = state.snapshot.preferences.rules;
  const subjects = state.snapshot.subjects;

  const [taskId, setTaskId] = useState<string | null>(initialTaskId ?? tasks[0]?.id ?? null);
  const [focusMin, setFocusMin] = useState(rules.focusMin);
  const [breakMin, setBreakMin] = useState(rules.breakMin);
  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(rules.focusMin * 60);
  const [interruptions, setInterruptions] = useState(0);
  const [activeRecall, setActiveRecall] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [sessionNote, setSessionNote] = useState('');
  const [elapsedFocus, setElapsedFocus] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const task = useMemo(() => tasks.find((t) => t.id === taskId) ?? null, [tasks, taskId]);
  const subject = task?.subjectId ? subjects.find((s) => s.id === task.subjectId) ?? null : null;

  useEffect(() => {
    setRemaining((phase === 'break' ? breakMin : focusMin) * 60);
  }, [focusMin, breakMin, phase]);

  useEffect(() => {
    if (phase !== 'focus' && phase !== 'break') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (phase === 'focus') {
            setPhase('done');
          } else {
            setPhase('idle');
          }
          return 0;
        }
        return prev - 1;
      });
      if (phase === 'focus') setElapsedFocus((prev) => prev + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  const total = (phase === 'break' ? breakMin : focusMin) * 60;
  const progress = total === 0 ? 0 : ((total - remaining) / total) * 100;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  const start = () => {
    setPhase('focus');
    setRemaining(focusMin * 60);
    setElapsedFocus(0);
  };

  const saveSession = (outcomeRating: number | null, finishTask: boolean) => {
    const minutes = Math.max(1, Math.round(elapsedFocus / 60));
    store.logFocusSession({
      taskId,
      durationMin: minutes,
      interruptions,
      outcomeRating,
      activeRecall,
      recallScore: activeRecall ? (rating ?? 3) / 5 : null,
      note: sessionNote,
    });
    if (finishTask && task) store.completeTask(task.id, { actualMin: task.actualMin + minutes, note: sessionNote });
    setPhase('idle');
    setInterruptions(0);
    setElapsedFocus(0);
    setSessionNote('');
    setRating(null);
    onFinished?.();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface-raised p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone={phase === 'focus' ? 'accent' : phase === 'break' ? 'success' : 'neutral'}>
              {phase === 'focus' ? 'Focus running' : phase === 'break' ? 'Break' : phase === 'done' ? 'Session finished' : 'Ready'}
            </Badge>
            {subject && (
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: subject.color }} />
                {subject.shortName}
              </span>
            )}
          </div>
          <span className="tnum text-xs text-text-muted">
            Elapsed {formatMinutes(Math.round(elapsedFocus / 60))} · {interruptions} interruption(s)
          </span>
        </div>

        <div className="mt-4 flex flex-col items-center">
          <p className="tnum text-6xl font-semibold tracking-tight sm:text-7xl">
            {mm}:{ss}
          </p>
          <div className="mt-3 h-1.5 w-full max-w-sm rounded-full bg-surface-sunken">
            <div
              className="h-1.5 rounded-full transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress}%`, background: phase === 'break' ? 'var(--color-success)' : 'var(--color-accent)' }}
            />
          </div>
          {task && <p className="mt-3 text-center text-sm text-text-muted">{task.title}</p>}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {phase === 'idle' && (
            <Button variant="primary" size="lg" onClick={start}>
              Start focus
            </Button>
          )}
          {phase === 'focus' && (
            <>
              <Button size="lg" onClick={() => setPhase('break')}>
                Take a break
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => {
                  setInterruptions((n) => n + 1);
                }}
              >
                Log distraction
              </Button>
              <Button size="lg" variant="success" onClick={() => setPhase('done')}>
                Finish session
              </Button>
            </>
          )}
          {phase === 'break' && (
            <>
              <Button variant="primary" size="lg" onClick={() => setPhase('focus')}>
                Back to focus
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setPhase('idle')}>
                End break
              </Button>
            </>
          )}
          {phase === 'done' && (
            <Button variant="success" size="lg" onClick={() => saveSession(rating, false)}>
              Save session
            </Button>
          )}
        </div>

        {phase === 'done' && (
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium">Quick outcome check</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={rating === value ? 'primary' : 'secondary'}
                  onClick={() => setRating(value)}
                  aria-label={`Rate this session ${value} out of 5`}
                >
                  {value}
                </Button>
              ))}
              <span className="self-center text-[11px] text-text-muted">
                1 = barely productive · 5 = deep, focused work
              </span>
            </div>
            <label className="flex items-center gap-2 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={activeRecall}
                onChange={(event) => setActiveRecall(event.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              This session used active recall (closed book)
            </label>
            <TextArea
              value={sessionNote}
              onChange={(event) => setSessionNote(event.target.value)}
              placeholder="What worked, what to fix next time (optional)"
              aria-label="Session note"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="success" onClick={() => saveSession(rating, false)}>
                Save & keep the task open
              </Button>
              <Button variant="primary" onClick={() => saveSession(rating, true)}>
                Save & complete the task
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Task">
          <Select value={taskId ?? ''} onChange={(event) => setTaskId(event.target.value || null)}>
            <option value="">No specific task</option>
            {tasks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Focus length (min)">
          <Select value={focusMin} onChange={(event) => setFocusMin(Number(event.target.value))}>
            {[25, 30, 40, 45, 50, 60, 90].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Break length (min)">
          <Select value={breakMin} onChange={(event) => setBreakMin(Number(event.target.value))}>
            {[5, 10, 15, 20].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <p className={cx('text-[11px] text-text-muted')}>
        Defaults come from your personal rules (Settings → Personal rules). Interruptions are stored with the
        session and used by the planner to adjust block sizes — never to judge you.
      </p>
    </div>
  );
}
