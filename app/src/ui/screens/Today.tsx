/**
 * Today — the working screen: check-in, generated plan with reasons, compact task actions and
 * a quick-complete modal so a task can be closed without leaving the page.
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Card, Field, Modal, Select, StatTile, TextArea, cx } from '../components/primitives';
import { CheckInCard, DayReviewCard } from '../components/day';
import { SessionTimeline } from '../components/charts';
import { TaskList } from '../components/task';
import { formatLongDate, formatMinutes } from '../../domain/date';
import { navigate } from '../router';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { useLookups } from '../lookups';
import type { StudyTask } from '../../domain/types';

export function TodayScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { store, today, state } = useStudy();
  const analytics = useAnalytics();
  const { subjectLookup, chapterLookup } = useLookups();
  const storeApi = useStore();
  const [quickComplete, setQuickComplete] = useState<StudyTask | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addSubject, setAddSubject] = useState('');
  const [addMinutes, setAddMinutes] = useState(45);
  const [addType, setAddType] = useState<StudyTask['type']>('REVISION');
  const [actualMin, setActualMin] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'ok' | 'hard'>('ok');
  const [note, setNote] = useState('');
  const [activeRecall, setActiveRecall] = useState(false);
  const [recallScore, setRecallScore] = useState(3);

  const tasks = analytics.todayTasks;
  const openTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'skipped');
  const finished = tasks.filter((t) => t.status === 'done' || t.status === 'skipped');
  const plan = analytics.todayPlan;
  const isMinimumDay = plan?.mode === 'minimum-viable';
  const isExamMode = plan?.mode === 'exam';
  // Planner notes (class time removed, buffer reserved, behaviour adjustments) are stored with the plan.
  const planNotes: string[] = useMemo(() => {
    if (!plan) return [];
    try {
      return (JSON.parse(plan.inputsJson) as { notes?: string[] }).notes ?? [];
    } catch {
      return [];
    }
  }, [plan]);

  const timeline = analytics.sessionTimelineToday;
  const subjects = useMemo(() => state.snapshot.subjects.filter((s) => s.active), [state.snapshot.subjects]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-text-muted uppercase">{formatLongDate(today)}</p>
          <h1 className="text-xl font-semibold">Today&apos;s mission</h1>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {plan && (
            <Badge tone={isExamMode ? 'warning' : isMinimumDay ? 'accent' : 'neutral'}>
              {isExamMode ? 'Exam mode' : isMinimumDay ? 'Minimum viable day' : `Plan: ${plan.mode}`}
            </Badge>
          )}
          <Button size="sm" variant="secondary" onClick={() => store.generatePlan(today)}>
            Regenerate plan
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onOpenDay(today)}>
            Today&apos;s data
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Planned" value={formatMinutes(analytics.todayProgress.plannedMin)} hint={`${analytics.todayProgress.tasksTotal} task(s)`} />
        <StatTile
          label="Done"
          value={`${analytics.todayProgress.tasksDone}/${analytics.todayProgress.tasksTotal}`}
          tone={analytics.todayProgress.percent >= 80 ? 'success' : undefined}
        />
        <StatTile label="Logged" value={formatMinutes(analytics.todayProgress.completedMin)} hint={`${analytics.todayProgress.percent}% of plan`} />
        <StatTile label="Effective" value={formatMinutes(analytics.todayProgress.effectiveMin)} hint="passive reading weighted lower" />
      </div>

      {plan && (
        <div className="rounded-xl border border-border bg-surface-raised p-3">
          <p className="text-xs text-text-muted">
            <strong className="text-text">Why this plan:</strong> {plan.rationale}
          </p>
          {planNotes.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-xs text-text-muted">
              {planNotes.map((note, index) => (
                <li key={index}>• {note}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <CheckInCard />

      <Card
        title="Plan for today"
        subtitle="Every task carries its own justification and can be actioned in one tap"
        action={
          <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
            Add task
          </Button>
        }
      >
        <TaskList
          tasks={openTasks}
          subjectLookup={subjectLookup}
          chapterLookup={chapterLookup}
          onOpenFocus={() => navigate('focus')}
          emptyTitle={analytics.todayProgress.tasksDone > 0 ? 'Plan complete' : 'No study task planned'}
          emptyDescription={
            analytics.todayProgress.tasksDone > 0
              ? 'Everything planned for today is handled. Revision of weak chapters is the next useful action.'
              : 'Generate today’s plan — the generator keeps buffer time and never fills 100% of your availability.'
          }
          emptyAction={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="primary" onClick={() => store.generatePlan(today)}>
                Generate plan
              </Button>
              {analytics.revisionDue.length > 0 && (
                <Button size="sm" variant="secondary" onClick={() => navigate('recovery')}>
                  Schedule due revisions ({analytics.revisionDue.length})
                </Button>
              )}
            </div>
          }
        />
      </Card>

      {finished.length > 0 && (
        <Card title="Handled today" subtitle="Completed and skipped tasks stay visible for traceability">
          <TaskList tasks={finished} subjectLookup={subjectLookup} chapterLookup={chapterLookup} compact />
        </Card>
      )}

      <Card title="Study timeline" subtitle="Actual sessions recorded today">
        <SessionTimeline entries={timeline} />
      </Card>

      <DayReviewCard />

      <Modal open={quickComplete !== null} onClose={() => setQuickComplete(null)} title="Complete task">
        <p className="text-sm text-text-muted">{quickComplete?.title}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Minutes actually studied">
            <Select value={actualMin} onChange={(event) => setActualMin(Number(event.target.value))}>
              {[10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120].map((value) => (
                <option key={value} value={value}>
                  {value} min
                </option>
              ))}
            </Select>
          </Field>
          <Field label="How did it feel?">
            <Select value={difficulty} onChange={(event) => setDifficulty(event.target.value as 'easy' | 'ok' | 'hard')}>
              <option value="easy">Easier than expected</option>
              <option value="ok">As expected</option>
              <option value="hard">Harder than expected</option>
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Note (optional)">
            <TextArea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What blocked you or what clicked?" />
          </Field>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-text-muted">
          <input type="checkbox" checked={activeRecall} onChange={(event) => setActiveRecall(event.target.checked)} className="h-4 w-4" />
          I used active recall (closed book)
        </label>
        {activeRecall && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-text-muted">Recall quality</span>
            {[1, 2, 3, 4, 5].map((value) => (
              <Button key={value} size="sm" variant={recallScore === value ? 'primary' : 'ghost'} onClick={() => setRecallScore(value)}>
                {value}
              </Button>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setQuickComplete(null)}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={() => {
              if (!quickComplete) return;
              storeApi.completeTask(quickComplete.id, {
                actualMin: actualMin || quickComplete.plannedMin,
                difficulty,
                note,
                activeRecall,
                recallScore: activeRecall ? (recallScore - 1) / 4 : null,
              });
              setQuickComplete(null);
              setNote('');
              setActiveRecall(false);
            }}
          >
            Save completion
          </Button>
        </div>
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add a task manually">
        <div className="space-y-3">
          <Field label="Title">
            <input
              value={addTitle}
              onChange={(event) => setAddTitle(event.target.value)}
              className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
              placeholder="e.g. Re-read chapter 3 of Analyse 1"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Subject">
              <Select value={addSubject} onChange={(event) => setAddSubject(event.target.value)}>
                <option value="">General</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.shortName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={addType} onChange={(event) => setAddType(event.target.value as StudyTask['type'])}>
                {(['COURSE', 'TD', 'TP', 'REVISION', 'PRACTICE', 'MEMORY', 'ASSESSMENT', 'REVIEW'] as const).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Planned minutes">
              <Select value={addMinutes} onChange={(event) => setAddMinutes(Number(event.target.value))}>
                {[15, 20, 25, 30, 45, 50, 60, 90, 120].map((value) => (
                  <option key={value} value={value}>
                    {value} min
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                storeApi.addManualTask({
                  date: today,
                  title: addTitle,
                  type: addType,
                  plannedMin: addMinutes,
                  subjectId: addSubject || null,
                  chapterId: null,
                });
                setShowAdd(false);
                setAddTitle('');
              }}
            >
              Add to today
            </Button>
          </div>
        </div>
      </Modal>

      <p className={cx('text-[11px] text-text-muted')}>
        Skipping a task moves it to the backlog automatically — that is recorded as a plan change, never as a failure.
      </p>
    </div>
  );
}
