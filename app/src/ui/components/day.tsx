/**
 * Daily loop UI — bilingual, non-punitive.
 */

import { useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Select, StatTile, TextArea, cx, useDialogBehavior } from './primitives';
import { SessionTimeline } from './charts';
import { useStudy } from '../../state/provider';
import { useI18n } from '../../i18n';
import { formatMinutes, formatLongDate } from '../../i18n/formatters';
import type { ISODate } from '../../domain/date';
import type { BlockedBy, EnergyLevel } from '../../domain/types';
import { buildSessionTimeline } from '../../domain/analytics/progress';

const BLOCKERS: Array<{ id: BlockedBy; labelKey: string }> = [
  { id: 'lack-of-time', labelKey: 'form.availableTime' },
  { id: 'fatigue', labelKey: 'common.error' },
  { id: 'distraction', labelKey: 'glossary.focus' },
  { id: 'difficult-subject', labelKey: 'nav.subjects' },
  { id: 'task-too-long', labelKey: 'form.plannedMin' },
  { id: 'unexpected-event', labelKey: 'common.error' },
  { id: 'procrastination', labelKey: 'common.pending' },
  { id: 'unclear-task', labelKey: 'form.title' },
];

export function CheckInCard({ compact }: { compact?: boolean }) {
  const { store, state, today } = useStudy();
  const { t, lang } = useI18n();
  const existing = state.snapshot.checkIns.find((c) => c.date === today) ?? null;
  const rules = state.snapshot.preferences.rules;
  const classCount = state.snapshot.timetable.filter((c) => c.active && c.dayOfWeek === new Date(`${today}T12:00:00`).getDay()).length;

  const [availableMin, setAvailableMin] = useState(existing?.availableMin ?? Math.round(rules.maxDailyMin * 0.8));
  const [energy, setEnergy] = useState<EnergyLevel>(existing?.energy ?? 3);
  const [sleep, setSleep] = useState(existing?.sleepQuality ?? 3);
  const [urgent, setUrgent] = useState(existing?.urgentWork ?? '');
  const [note, setNote] = useState(existing?.classNote ?? '');
  const [open, setOpen] = useState(!existing);

  if (!open) {
    return (
      <Card title={t('form.availableTime')} subtitle={t('week.planned')} action={<Button size="sm" variant="ghost" onClick={() => setOpen(true)}>{t('form.edit')}</Button>}>
        <div className="flex flex-wrap gap-4 text-xs text-text-muted">
          <span className="tnum">{t('form.availableTime')}: {formatMinutes(availableMin, lang)}</span>
          <span className="tnum">{t('form.energy')}: {energy}/5</span>
        </div>
      </Card>
    );
  }

  return (
    <Card title={t('form.availableTime')} subtitle={t('week.planned')}>
      <div className={cx('grid gap-3', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        <Field label={t('form.availableTime')}>
          <Select value={availableMin} onChange={(e) => setAvailableMin(Number(e.target.value))}>{[30,45,60,90,120,150,180,210,240,270,300].map((v) => <option key={v} value={v}>{formatMinutes(v, lang)}</option>)}</Select>
        </Field>
        <Field label={t('form.energy')}>
          <Select value={energy} onChange={(e) => setEnergy(Number(e.target.value) as EnergyLevel)}>{[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}</option>)}</Select>
        </Field>
        <Field label={t('form.date')}>
          <Select value={sleep} onChange={(e) => setSleep(Number(e.target.value))}>{[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}/5</option>)}</Select>
        </Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label={t('form.note')}><TextArea value={urgent} onChange={(e) => setUrgent(e.target.value)} placeholder={t('form.note')} /></Field>
        <Field label={`${t('form.note')} (${classCount})`}><TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('form.note')} /></Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => { store.saveCheckIn({ date: today, availableMin, energy, sleepQuality: sleep, urgentWork: urgent, classNote: note }); setOpen(false); }}>{t('form.save')}</Button>
        {existing && <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>}
      </div>
    </Card>
  );
}

export function DayReviewCard() {
  const { store, state, today } = useStudy();
  const { t, lang } = useI18n();
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

  return (
    <Card title={t('week.title')} subtitle={t('week.subtitle')}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('week.planned')} value={formatMinutes(plannedMin, lang)} />
        <StatTile label={t('week.completed')} value={formatMinutes(completedMin, lang)} />
        <StatTile label={t('glossary.completion')} value={`${completionRate}%`} />
        <StatTile label={t('glossary.focus')} value={sessions.length} />
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium">{t('form.note')}</p>
        <div className="flex flex-wrap gap-1.5">
          {BLOCKERS.map((blocker) => {
            const active = blockers.includes(blocker.id);
            return <button key={blocker.id} type="button" aria-pressed={active} onClick={() => setBlockers((prev) => prev.includes(blocker.id) ? prev.filter((b) => b !== blocker.id) : [...prev, blocker.id])} className={cx('min-h-8 rounded-full border px-3 py-1.5 text-xs transition', active ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:text-text')}>{t(blocker.labelKey as any)}</button>;
          })}
        </div>
      </div>
      <div className="mt-3"><Field label={t('form.note')}><TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('form.note')} /></Field></div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => { store.saveDailyReview({ date: today, blockedBy: blockers, note }); setSaved(true); }}>{t('form.save')}</Button>
        {saved && <Badge tone="success">{t('common.save')}</Badge>}
      </div>
    </Card>
  );
}

export function DayDrawer({ date, onClose }: { date: ISODate | null; onClose: () => void }) {
  const { state } = useStudy();
  const { t, lang } = useI18n();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const day = useMemo(() => (date ? state.snapshot : null), [date, state.snapshot]);
  useDialogBehavior(date !== null, onClose, panelRef);
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={`Day ${date}`} tabIndex={-1} className="animate-fade-in h-full w-full max-w-lg overflow-y-auto border-s border-border bg-surface-raised p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-text-muted uppercase">{t('common.today')}</p>
            <h2 className="text-lg font-semibold">{formatLongDate(date, lang)}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('a11y.closeDrawer')}>{t('common.close')}</Button>
        </div>

        {!hasData ? <EmptyState title={t('common.noData')} description={t('common.notEnoughDataDesc')} /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <StatTile label={t('week.planned')} value={formatMinutes(plannedMin, lang)} />
              <StatTile label={t('week.completed')} value={formatMinutes(completedMin, lang)} />
              <StatTile label={t('glossary.completion')} value={`${completion}%`} />
            </div>
            {plan && <div className="rounded-xl border border-border bg-surface-sunken/60 p-3 text-xs text-text-muted"><p className="font-medium text-text">{plan.mode}</p><p className="mt-1">{plan.rationale}</p></div>}
            <section><h3 className="mb-2 text-sm font-semibold">{t('today.tasks')}</h3><ul className="space-y-1.5">{tasks.map((task) => <li key={task.id} className="flex items-start gap-2 text-xs"><span className={cx('mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]', task.status === 'done' ? 'bg-success/20 text-success' : 'bg-surface-sunken text-text-muted')}>{task.status === 'done' ? '✓' : '·'}</span><span className="flex-1"><span className={cx('block', task.status === 'done' && 'line-through')}>{task.title}</span><span className="text-text-muted">{formatMinutes(task.plannedMin, lang)}</span></span></li>)}</ul></section>
            <section><h3 className="mb-2 text-sm font-semibold">{t('glossary.focus')}</h3><SessionTimeline entries={timeline} /></section>
            {(notes.length > 0 || review?.note) && <section><h3 className="mb-2 text-sm font-semibold">{t('form.note')}</h3><ul className="space-y-1 text-xs text-text-muted">{notes.map((task) => <li key={task.id}><span className="text-text">{task.title}:</span> {task.note}</li>)}{review?.note && <li>{review.note}</li>}</ul></section>}
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
