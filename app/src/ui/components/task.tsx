/**
 * Actionable task card — every task action is reachable in one tap (spec §4).
 * Start · Pause · Complete · Skip · Reschedule · Mark difficult/easy · Add note.
 */

import { LearningContext } from './learning';
import { useState } from 'react';
import { Badge, Button, Select, TextInput, cx } from './primitives';
import { useStore } from '../../state/provider';
import { addDays, type ISODate } from '../../domain/date';
import { useI18n } from '../../i18n';
import { formatMinutes } from '../../i18n/formatters';
import type { StudyTask, TaskDifficulty } from '../../domain/types';

const TYPE_LABEL: Record<StudyTask['type'], string> = {
  COURSE: 'Course',
  TD: 'TD',
  TP: 'TP',
  REVISION: 'Revision',
  PRACTICE: 'Practice',
  MEMORY: 'Memory',
  ASSESSMENT: 'Assessment',
  REVIEW: 'Review',
  RECOVERY: 'Recovery',
};

const STATUS_TONE: Record<StudyTask['status'], 'neutral' | 'accent' | 'success' | 'warning' | 'danger'> = {
  pending: 'neutral',
  running: 'accent',
  paused: 'warning',
  done: 'success',
  skipped: 'danger',
  rescheduled: 'warning',
  deferred: 'neutral',
};

export function TaskCard({
  task,
  subjectName,
  subjectColor,
  chapterTitle,
  compact,
  onOpenFocus,
  onRequestComplete,
}: {
  task: StudyTask;
  subjectName?: string;
  subjectColor?: string;
  chapterTitle?: string;
  compact?: boolean;
  onOpenFocus?: (taskId: string) => void;
  /** Opens the quick-complete dialog (minutes, difficulty, note). Falls back to instant completion. */
  onRequestComplete?: (task: StudyTask) => void;
}) {
  const store = useStore();
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(task.note);
  const [showReschedule, setShowReschedule] = useState(false);

  const isDone = task.status === 'done';
  const isSkipped = task.status === 'skipped';

  return (
    <article
      className={cx(
        'rounded-xl border bg-surface-raised p-3 transition sm:p-4',
        task.status === 'running' ? 'border-accent' : 'border-border',
        (isDone || isSkipped) && 'opacity-80',
      )}
    >
      {!compact && <details className="mb-3"><summary>{t('learning.workspace')}</summary><LearningContext task={task} /></details>}
      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: subjectColor ?? 'var(--color-neutral)' }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[task.status]}>{STATUS_TONE[task.status] === 'neutral' ? TYPE_LABEL[task.type] : task.status}</Badge>
            {task.origin === 'recovery' && <Badge tone="warning">{lang === 'ar' ? 'استدراك' : 'recovery'}</Badge>}
            {task.origin === 'minimum-day' && <Badge tone="accent">{lang === 'ar' ? 'يوم أدنى' : 'minimum day'}</Badge>}
            {task.priorityLabel && <Badge tone="neutral">{task.priorityLabel} {lang === 'ar' ? 'أولوية' : 'priority'}</Badge>}
            <span className="tnum text-xs text-text-muted">{formatMinutes(task.plannedMin, lang)}</span>
            {task.startedAt && <span className="tnum text-xs text-text-muted">· {lang === 'ar' ? 'بدأ' : 'started'} {task.startedAt.slice(11, 16)}</span>}
          </div>
          <h3 className={cx('mt-1.5 text-sm font-medium', isDone && 'line-through')}>{task.title}</h3>
          {(subjectName || chapterTitle) && (
            <p className="mt-0.5 truncate text-xs text-text-muted">
              {subjectName}
              {chapterTitle ? ` · ${chapterTitle}` : ''}
            </p>
          )}
          {task.reasons.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-text-muted">
              {task.reasons.slice(0, compact ? 1 : 3).map((reason, index) => (
                <li key={index}>• {reason}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {!isDone && !isSkipped && (
          <>
            {task.status !== 'running' ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  store.startTask(task.id);
                  onOpenFocus?.(task.id);
                }}
              >
                {t('task.start')}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => store.pauseTask(task.id)}>
                {t('task.pause')}
              </Button>
            )}
            <Button
              size="sm"
              variant="success"
              onClick={() =>
                onRequestComplete ? onRequestComplete(task) : store.completeTask(task.id, { actualMin: task.plannedMin })
              }
            >
              {t('task.complete')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => store.skipTask(task.id)}>
              {t('task.skip')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowReschedule((v) => !v)}>
              {t('task.reschedule')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => store.rateTask(task.id, task.difficulty === 'hard' ? 'ok' : 'hard')}
              title="Mark this task as difficult for future scheduling"
            >
              {task.difficulty === 'hard' ? (lang === 'ar' ? '✓ صعب' : '✓ Difficult') : t('task.difficult')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => store.rateTask(task.id, task.difficulty === 'easy' ? 'ok' : 'easy')}
              title="Mark this task as easy — the planner will raise the challenge"
            >
              {task.difficulty === 'easy' ? (lang === 'ar' ? '✓ سهل' : '✓ Easy') : t('task.easy')}
            </Button>
          </>
        )}
        {(isDone || isSkipped) && (
          <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded ? t('common.hideDetails') : t('common.showDetails')}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {t('task.note')}
        </Button>
      </div>

      {showReschedule && !isDone && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select
            aria-label="Reschedule to"
            className="max-w-44"
            defaultValue={addDays(task.planDate, 1)}
            onChange={(event) => {
              store.rescheduleTask(task.id, event.target.value as ISODate);
              setShowReschedule(false);
            }}
          >
            {Array.from({ length: 7 }, (_, i) => addDays(task.planDate, i + 1)).map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </Select>
          <span className="text-[11px] text-text-muted">{lang === 'ar' ? 'ينقل المهمة دون تكديسها في اليوم.' : 'Moves the task without piling it onto today.'}</span>
        </div>
      )}

      {expanded && (
        <div className="mt-2 space-y-2">
          <TextInput
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={lang === 'ar' ? 'ماذا تعلمت / ما الذي عرقلَك؟' : 'What did you learn / what blocked you?'}
            aria-label={t('task.note')}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => store.addTaskNote(task.id, note)}>
              {t('common.save')}
            </Button>
            {task.actualMin > 0 && (
              <span className="tnum text-[11px] text-text-muted">{lang === 'ar' ? 'المسجل:' : 'Logged:'} {formatMinutes(task.actualMin, lang)}</span>
            )}
            {task.skipCount > 0 && (
              <span className="text-[11px] text-warning">{lang === 'ar' ? 'تم تخطي' : 'Skipped'} {task.skipCount}×</span>
            )}
            {task.deferCount > 0 && (
              <span className="text-[11px] text-text-muted">{lang === 'ar' ? 'تم النقل' : 'Moved'} {task.deferCount}×</span>
            )}
          </div>
          {task.difficulty && (
            <div className="flex gap-1">
              {(['easy', 'ok', 'hard'] as TaskDifficulty[]).map((level) => (
                <Button
                  key={level}
                  size="sm"
                  variant={task.difficulty === level ? 'primary' : 'ghost'}
                  onClick={() => store.rateTask(task.id, level, note)}
                >
                  {level}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function TaskList({
  tasks,
  subjectLookup,
  chapterLookup,
  onOpenFocus,
  onRequestComplete,
  emptyTitle = 'No study task planned',
  emptyDescription = 'Generate today’s plan or add a task manually.',
  emptyAction,
  compact,
}: {
  tasks: StudyTask[];
  subjectLookup: Map<string, { name: string; shortName: string; color: string }>;
  chapterLookup: Map<string, string>;
  onOpenFocus?: (taskId: string) => void;
  onRequestComplete?: (task: StudyTask) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  compact?: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-sunken/50 p-5 text-center">
        <p className="text-sm font-medium">{emptyTitle}</p>
        <p className="mt-1 text-xs text-text-muted">{emptyDescription}</p>
        {emptyAction && <div className="mt-3 flex justify-center">{emptyAction}</div>}
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          subjectName={task.subjectId ? subjectLookup.get(task.subjectId)?.shortName : undefined}
          subjectColor={task.subjectId ? subjectLookup.get(task.subjectId)?.color : undefined}
          chapterTitle={task.chapterId ? chapterLookup.get(task.chapterId) : undefined}
          onOpenFocus={onOpenFocus}
          onRequestComplete={onRequestComplete}
          compact={compact}
        />
      ))}
    </div>
  );
}
