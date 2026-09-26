/** A single timed learning session; completion never logs the same minutes twice. */
import { useEffect, useRef, useState } from 'react';
import type { StudyTask, TaskDifficulty } from '../../domain/types';
import { useStudy } from '../../state/provider';
import { useI18n } from '../../i18n';
import { Button, Field, Select, TextArea } from './primitives';
import { LearningContext } from './learning';

export function FocusTimer({ tasks, initialTaskId, onFinished }: { tasks: StudyTask[]; initialTaskId?: string | null; onFinished?: () => void }) {
  const { store, state } = useStudy();
  const { t } = useI18n();
  const [taskId, setTaskId] = useState(initialTaskId ?? tasks[0]?.id ?? '');
  const [minutes, setMinutes] = useState(state.snapshot.preferences.rules.focusMin);
  const [breakMin, setBreakMin] = useState(state.snapshot.preferences.rules.breakMin);
  const [remaining, setRemaining] = useState(minutes * 60);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'focus' | 'paused' | 'break' | 'done'>('idle');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('ok');
  const [note, setNote] = useState('');
  const [interruptions, setInterruptions] = useState(0);
  const [recall, setRecall] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [breakRemaining, setBreakRemaining] = useState(0);
  const saved = useRef(false);
  const task = tasks.find(item => item.id === taskId);
  useEffect(() => {
    if (phase === 'idle' && !task) setTaskId(initialTaskId ?? tasks[0]?.id ?? '');
  }, [task, tasks, initialTaskId, phase]);
  useEffect(() => {
    if (phase !== 'focus' && phase !== 'break') return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = Math.floor((now - last) / 1000);
      if (delta < 1) return;
      last += delta * 1000;
      if (phase === 'focus') { const spent = Math.min(delta, remaining); setElapsed(e => e + spent); setRemaining(r => Math.max(0, r - spent)); }
      else setBreakRemaining(r => Math.max(0, r - delta));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, remaining]);
  useEffect(() => { if (phase === 'focus' && remaining === 0) setPhase('done'); if (phase === 'break' && breakRemaining === 0) setPhase('paused'); }, [remaining, breakRemaining, phase]);
  const save = (finishTask: boolean) => {
    if (saved.current || elapsed === 0) return;
    saved.current = true;
    store.logFocusSession({ taskId: task?.id ?? null, durationMin: Math.max(1, Math.round(elapsed / 60)), interruptions, outcomeRating: difficulty === 'easy' ? 5 : difficulty === 'ok' ? 3 : 1, activeRecall: recall, recallScore: recall ? difficulty === 'easy' ? 1 : difficulty === 'ok' ? 0.6 : 0.2 : null, note, finishTask, difficulty });
    setPhase('idle'); setElapsed(0); setRemaining(minutes * 60); setInterruptions(0); setNote(''); setStep(0); setRecall(false); setDifficulty('ok');
    onFinished?.();
  };
  const seconds = phase === 'break' ? breakRemaining : remaining;
  return <div className="space-y-4 rounded-xl border border-border p-4">
    <Field label={t('learning.task')}><Select disabled={phase !== 'idle'} value={taskId} onChange={e => setTaskId(e.target.value)}><option value="">{t('learning.noTask')}</option>{tasks.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</Select></Field>
    {task && <LearningContext key={task.id} task={task} />}
    <ol className="flex flex-wrap gap-3">{(['learn','practice','recall'] as const).map((s,i) => <li key={s} aria-current={step === i ? 'step' : undefined} className={step === i ? 'font-bold text-accent' : ''}>{t(`learning.${s}`)}</li>)}</ol>
    <p>{t(`learning.${(['learn','practice','recall'] as const)[step]}Help`)}</p>
    {step < 2 && <Button onClick={() => { setStep((step + 1) as 1 | 2); if (step === 1) setRecall(true); }}>{t('learning.nextStep')}</Button>}
    <p className="text-center text-5xl tnum" role="timer" dir="ltr">{String(Math.floor(seconds / 60)).padStart(2,'0')}:{String(seconds % 60).padStart(2,'0')}</p>
    <p>{t('learning.elapsed')}: {Math.floor(elapsed / 60)} · {interruptions}</p>
    <div className="flex flex-wrap gap-2">
      {phase === 'idle' && <Button variant="primary" onClick={() => { saved.current = false; setRemaining(minutes * 60); setPhase('focus'); if (task) store.startTask(task.id); }}>{t('learning.start')}</Button>}
      {phase === 'focus' && <><Button onClick={() => { setPhase('paused'); if(task) store.pauseTask(task.id); }}>{t('learning.pause')}</Button><Button onClick={() => { setBreakRemaining(breakMin * 60); setPhase('break'); }}>{t('learning.break')}</Button><Button onClick={() => setInterruptions(n => n + 1)}>{t('learning.distraction')}</Button></>}
      {(phase === 'paused' || phase === 'break') && <Button onClick={() => { setPhase('focus'); if(task) store.startTask(task.id); }}>{t('learning.resume')}</Button>}
      {phase !== 'idle' && phase !== 'done' && <Button onClick={() => setPhase('done')}>{t('learning.finish')}</Button>}
      {task && <Button variant="ghost" onClick={() => { if (elapsed > 0) save(false); store.skipTask(task.id); setPhase('idle'); setRemaining(minutes * 60); }}>{t('learning.skip')}</Button>}
    </div>
    {phase === 'done' && <section className="space-y-3"><h3>{t('learning.done')} · {t('learning.outcome')}</h3>
      <div className="flex gap-2">{(['easy','ok','hard'] as const).map(d => <Button key={d} aria-pressed={difficulty === d} variant={difficulty === d ? 'primary' : 'secondary'} onClick={() => setDifficulty(d)}>{t(`learning.${d === 'ok' ? 'okay' : d}`)}</Button>)}</div>
      <label><input type="checkbox" checked={recall} onChange={e => setRecall(e.target.checked)} /> {t('learning.recallCheck')}</label>
      <TextArea aria-label={t('learning.note')} value={note} onChange={e => setNote(e.target.value)} />
      <Button disabled={elapsed === 0} onClick={() => save(false)}>{t('learning.saveOpen')}</Button> {task && <Button disabled={elapsed === 0} variant="primary" onClick={() => save(true)}>{t('learning.save')}</Button>}
    </section>}
    <div className="grid gap-3 sm:grid-cols-2"><Field label={t('learning.length')}><Select disabled={phase !== 'idle'} value={minutes} onChange={e => { setMinutes(Number(e.target.value)); setRemaining(Number(e.target.value) * 60); }}>{Array.from(new Set([minutes,5,15,25,30,45,50,60,90])).sort((a,b)=>a-b).map(m => <option key={m}>{m}</option>)}</Select></Field>
    <Field label={t('learning.breakLength')}><Select disabled={phase !== 'idle'} value={breakMin} onChange={e => setBreakMin(Number(e.target.value))}>{Array.from(new Set([breakMin,5,10,15])).map(m => <option key={m}>{m}</option>)}</Select></Field></div>
  </div>;
}
