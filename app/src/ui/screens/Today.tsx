/**
 * Today — bilingual, explainable.
 */

import { LearningPlan } from '../components/learning';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, Field, Modal, Select, StatTile, TextArea } from '../components/primitives';
import { CheckInCard, DayReviewCard } from '../components/day';
import { SessionTimeline } from '../components/charts';
import { TaskList } from '../components/task';
import { ChapterProfileCard, AdaptationCard } from '../components/intelligence';
import { HelpButton } from '../components/contextualHelp';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { useI18n } from '../../i18n';
import { formatLongDate, formatMinutes } from '../../i18n/formatters';
import { navigate } from '../router';
import { useLookups } from '../lookups';
import type { StudyTask } from '../../domain/types';

export function TodayScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { store, today, state } = useStudy();
  const { t, lang } = useI18n();
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
      <LearningPlan tasks={analytics.todayTasks} />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-text-muted uppercase">{formatLongDate(today, lang)}</p>
          <h1 className="text-xl font-semibold flex items-center gap-2">{t('today.title')} <HelpButton titleKey="help.weeklyReview.title" descKey="help.weeklyReview.desc" /></h1>
          <p className="text-xs text-text-muted">{t('today.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {plan && <Badge tone={isExamMode ? 'warning' : isMinimumDay ? 'accent' : 'neutral'}>{isExamMode ? t('glossary.examRisk') : isMinimumDay ? t('common.noData') : `${t('glossary.studyPlan')}: ${plan.mode}`}</Badge>}
          <Button size="sm" variant="secondary" onClick={() => store.generatePlan(today)}>{t('today.title')}</Button>
          <Button size="sm" variant="ghost" onClick={() => onOpenDay(today)}>{t('header.todaysData')}</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('week.planned')} value={formatMinutes(analytics.todayProgress.plannedMin, lang)} hint={`${analytics.todayProgress.tasksTotal} ${t('dashboard.tasksCompleted')}`} />
        <StatTile label={t('common.completed')} value={`${analytics.todayProgress.tasksDone}/${analytics.todayProgress.tasksTotal}`} tone={analytics.todayProgress.percent >= 80 ? 'success' : undefined} />
        <StatTile label={t('common.completed')} value={formatMinutes(analytics.todayProgress.completedMin, lang)} hint={`${analytics.todayProgress.percent}%`} />
        <StatTile label={t('charts.effectiveTime')} value={formatMinutes(analytics.todayProgress.effectiveMin, lang)} />
      </div>

      {plan && (
        <div className="rounded-xl border border-border bg-surface-raised p-3">
          <p className="text-xs text-text-muted"><strong className="text-text">{t('explain.why')}:</strong> {plan.rationale}</p>
          {planNotes.length > 0 && <ul className="mt-1.5 space-y-0.5 text-xs text-text-muted">{planNotes.map((n, i) => <li key={i}>• {n}</li>)}</ul>}
        </div>
      )}

      <CheckInCard />

      <Card title={t('today.tasks')} subtitle={t('today.subtitle')} action={<Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>{t('form.add')}</Button>}>
        <TaskList
          tasks={openTasks}
          subjectLookup={subjectLookup}
          chapterLookup={chapterLookup}
          onOpenFocus={() => navigate('focus')}
          onRequestComplete={(task) => {
            setActualMin(task.plannedMin);
            setDifficulty('ok');
            setNote('');
            setActiveRecall(task.type === 'REVISION' || task.type === 'MEMORY');
            setQuickComplete(task);
          }}
          emptyTitle={analytics.todayProgress.tasksDone > 0 ? t('today.handledToday') : t('empty.noTasks')}
          emptyDescription={analytics.todayProgress.tasksDone > 0 ? t('today.handledToday') : t('empty.noTasksDesc')}
          emptyAction={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="primary" onClick={() => store.generatePlan(today)}>{t('today.title')}</Button>
              {analytics.revisionDue.length > 0 && <Button size="sm" variant="secondary" onClick={() => navigate('recovery')}>{t('recovery.title')} ({analytics.revisionDue.length})</Button>}
            </div>
          }
        />
      </Card>

      {finished.length > 0 && (
        <Card title={t('today.handledToday')} subtitle={t('common.completed')}>
          <TaskList tasks={finished} subjectLookup={subjectLookup} chapterLookup={chapterLookup} compact />
        </Card>
      )}

      <Card title={t('charts.heatmap')} subtitle={t('charts.heatmap')}>
        <SessionTimeline entries={timeline} />
      </Card>

      <DayReviewCard />

      <Card title={t('today.chapterIntelligence')} subtitle={t('glossary.chapterProfile')}>
        {(() => {
          const todayChapterIds = new Set(tasks.map((t) => t.chapterId).filter(Boolean) as string[]);
          const profiles = analytics.chapterProfiles.filter((p) => todayChapterIds.has(p.chapterId));
          if (profiles.length === 0) return <p className="text-sm text-text-muted">{t('common.noData')}</p>;
          return <div className="space-y-2.5">{profiles.slice(0, 3).map((p) => <ChapterProfileCard key={p.chapterId} profile={p} onOpen={(id) => navigate(`chapter/${id}`)} />)}</div>;
        })()}
      </Card>

      <AdaptationCard plan={analytics.adaptationPlan} />

      <Modal open={quickComplete !== null} onClose={() => setQuickComplete(null)} title={t('task.complete')}>
        <p className="text-sm text-text-muted">{quickComplete?.title}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label={t('form.plannedMin')}>
            <Select value={actualMin} onChange={(e) => setActualMin(Number(e.target.value))}>{[10,15,20,25,30,40,45,50,60,75,90,120].map((v) => <option key={v} value={v}>{v} {t('time.minutes')}</option>)}</Select>
          </Field>
          <Field label={t('form.note')}>
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}><option value="easy">{t('task.easy')}</option><option value="ok">OK</option><option value="hard">{t('task.difficult')}</option></Select>
          </Field>
        </div>
        <div className="mt-3"><Field label={t('form.note')}><TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('form.note')} /></Field></div>
        <label className="mt-2 flex items-center gap-2 text-xs text-text-muted"><input type="checkbox" checked={activeRecall} onChange={(e) => setActiveRecall(e.target.checked)} className="h-4 w-4" />{t('glossary.focus')}</label>
        {activeRecall && <div className="mt-2 flex items-center gap-2"><span className="text-xs text-text-muted">{t('glossary.mastery')}</span>{[1,2,3,4,5].map((v) => <Button key={v} size="sm" variant={recallScore === v ? 'primary' : 'ghost'} onClick={() => setRecallScore(v)}>{v}</Button>)}</div>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setQuickComplete(null)}>{t('common.cancel')}</Button>
          <Button variant="success" onClick={() => { if (!quickComplete) return; storeApi.completeTask(quickComplete.id, { actualMin: actualMin || quickComplete.plannedMin, difficulty, note, activeRecall, recallScore: activeRecall ? (recallScore - 1) / 4 : null }); setQuickComplete(null); setNote(''); setActiveRecall(false); }}>{t('form.save')}</Button>
        </div>
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('form.add')}>
        <div className="space-y-3">
          <Field label={t('form.title')}><input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" placeholder={t('form.title')} /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('form.subject')}><Select value={addSubject} onChange={(e) => setAddSubject(e.target.value)}><option value="">{t('common.noData')}</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.shortName}</option>)}</Select></Field>
            <Field label={t('form.type')}><Select value={addType} onChange={(e) => setAddType(e.target.value as any)}>{(['COURSE','TD','TP','REVISION','PRACTICE','MEMORY','ASSESSMENT','REVIEW'] as const).map((type) => <option key={type} value={type}>{type}</option>)}</Select></Field>
            <Field label={t('form.plannedMin')}><Select value={addMinutes} onChange={(e) => setAddMinutes(Number(e.target.value))}>{[15,20,25,30,45,50,60,90,120].map((v) => <option key={v} value={v}>{v} {t('time.minutes')}</option>)}</Select></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={() => { storeApi.addManualTask({ date: today, title: addTitle, type: addType, plannedMin: addMinutes, subjectId: addSubject || null, chapterId: null }); setShowAdd(false); setAddTitle(''); }}>{t('form.add')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
