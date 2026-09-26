/**
 * Mistakes — bilingual, explainable.
 */

import { useState } from 'react';
import { Button, Card, EmptyState, Field, Select, TextArea } from '../components/primitives';
import { SubjectHealthCard, ChapterProfileCard } from '../components/intelligence';
import { HelpButton, ExplainableSection } from '../components/contextualHelp';
import { useI18n } from '../../i18n';
import { navigate } from '../router';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { useLookups } from '../lookups';
import type { MistakeType } from '../../domain/types';

export function MistakesScreen() {
  const { state } = useStudy();
  const { t } = useI18n();
  const store = useStore();
  const analytics = useAnalytics();
  const { subjectLookup, chapterById } = useLookups();
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [typeFilter, setTypeFilter] = useState<MistakeType | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [question, setQuestion] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [mistakeType, setMistakeType] = useState<MistakeType>('concept');

  const mistakes = state.snapshot.mistakes.filter((m) => {
    if (filter === 'open' && m.resolved) return false;
    if (filter === 'resolved' && !m.resolved) return false;
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    return true;
  });

  const openMistakes = state.snapshot.mistakes.filter((m) => !m.resolved);
  const byChapter = new Map<string, number>();
  for (const m of openMistakes) {
    if (m.chapterId) byChapter.set(m.chapterId, (byChapter.get(m.chapterId) ?? 0) + 1);
  }
  const pressureChapters = Array.from(byChapter.entries()).filter(([, count]) => count >= 2).sort((a,b) => b[1]-a[1]).slice(0,3);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">{t('mistakes.title')} <HelpButton titleKey="help.weakestChapter.title" descKey="help.weakestChapter.desc" /></h1>
          <p className="text-xs text-text-muted">{t('mistakes.subtitle')}</p>
        </div>
        <Button size="sm" variant="primary" onClick={() => setShowAdd(true)}>{t('form.add')}</Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['all','open','resolved'] as const).map((f) => <Button key={f} size="sm" variant={filter === f ? 'secondary' : 'ghost'} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'open' ? t('common.open') : t('common.resolved')}</Button>)}
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="max-w-40">
          <option value="all">{t('form.type')} - all</option>
          {(['concept','calculation','memory','careless','interpretation','algorithm-logic','syntax','time-management'] as const).map((tp) => <option key={tp} value={tp}>{tp}</option>)}
        </Select>
      </div>

      {pressureChapters.length > 0 && (
        <Card title={t('mistakes.pressure')} subtitle={`${pressureChapters.length} ${t('dashboard.chapters')} ${t('common.atRisk')}`}>
          <div className="space-y-2">
            {pressureChapters.map(([chapterId]) => {
              const profile = analytics.chapterProfiles.find((p) => p.chapterId === chapterId);
              if (!profile) return null;
              return <ChapterProfileCard key={chapterId} profile={profile} onOpen={(id) => navigate(`chapter/${id}`)} />;
            })}
          </div>
        </Card>
      )}

      <Card title={t('subjects.healthTitle')} subtitle={t('subjects.healthSubtitle')}>
        <div className="grid gap-3 md:grid-cols-2">
          {analytics.subjectHealth.filter((h) => h.stats.openMistakes > 0).slice(0,4).map((h) => <SubjectHealthCard key={h.subjectId} health={h} onSelect={(id) => navigate(`subject/${id}`)} />)}
        </div>
      </Card>

      {mistakes.length === 0 ? (
        <Card><EmptyState title={t('mistakes.noMistakes')} description={t('mistakes.noMistakesDesc')} /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {mistakes.map((m) => {
            const subject = m.subjectId ? subjectLookup.get(m.subjectId) : null;
            const chapter = m.chapterId ? chapterById.get(m.chapterId) : null;
            return (
              <Card key={m.id} as="article" className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{m.question}</p>
                    <p className="text-[11px] text-text-muted">{subject?.shortName ?? ''} {chapter ? `· ${chapter.title}` : ''} · {m.type} · {m.recurrenceCount}x</p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${m.resolved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{m.resolved ? t('common.resolved') : t('common.open')}</span>
                </div>
                <ExplainableSection why={m.explanation || t('explain.needsWork')} evidence={`${t('common.evidence')}: ${m.type}, ${m.recurrenceCount}x, ${m.date}`} recommendation={m.correctAnswer} />
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => store.resolveMistake(m.id, !m.resolved)}>{m.resolved ? t('common.open') : t('common.resolved')}</Button>
                  {m.chapterId && <Button size="sm" variant="secondary" onClick={() => navigate(`chapter/${m.chapterId}`)}>{t('common.showDetails')}</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showAdd && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-raised p-5">
            <h3 className="text-sm font-semibold">{t('form.add')} {t('nav.mistakes')}</h3>
            <div className="mt-3 space-y-3">
              <Field label={t('form.title')}><TextArea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t('form.title')} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('form.subject')}><Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">{t('common.noData')}</option>{state.snapshot.subjects.map((s) => <option key={s.id} value={s.id}>{s.shortName}</option>)}</Select></Field>
                <Field label={t('form.type')}><Select value={mistakeType} onChange={(e) => setMistakeType(e.target.value as any)}>{(['concept','calculation','memory','careless'] as const).map((tp) => <option key={tp} value={tp}>{tp}</option>)}</Select></Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
                <Button variant="primary" onClick={() => { if (!question.trim()) return; store.addMistake({ subjectId: subjectId || state.snapshot.subjects[0]?.id || 'sub-unknown', chapterId: null, question: question.trim(), userAnswer: '', correctAnswer: '', explanation: '', type: mistakeType, date: new Date().toISOString().slice(0,10), source: 'manual', nextReview: null }); setShowAdd(false); setQuestion(''); }}>{t('form.save')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
