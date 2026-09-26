/**
 * Exams — bilingual.
 */

import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Select, StatTile } from '../components/primitives';
import { SubjectHealthCard, ChapterProfileCard, AdaptationCard } from '../components/intelligence';
import { useI18n } from '../../i18n';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { useLookups, MASTERY_TEXT } from '../lookups';
import { navigate } from '../router';
import type { AssessmentKind } from '../../domain/types';

export function ExamsScreen() {
  const { state, today } = useStudy();
  const { t } = useI18n();
  const store = useStore();
  const analytics = useAnalytics();
  const { subjectLookup, chapterById } = useLookups();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState(state.snapshot.subjects[0]?.id ?? '');
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<AssessmentKind>('EMD');

  const upcoming = state.snapshot.exams.filter((e) => e.date >= today).sort((a,b) => a.date.localeCompare(b.date));
  const past = state.snapshot.exams.filter((e) => e.date < today).sort((a,b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t('exams.title')}</h1>
          <p className="text-xs text-text-muted">{t('exams.subtitle')}</p>
        </div>
        <Button size="sm" variant="primary" onClick={() => setShowAdd(true)}>{t('form.add')}</Button>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('exams.upcoming')} value={upcoming.length} />
        <StatTile label={t('common.completed')} value={past.length} />
        <StatTile label={t('nav.subjects')} value={state.snapshot.subjects.length} />
        <StatTile label={t('dashboard.chapters')} value={state.snapshot.chapters.length} />
      </div>

      {upcoming.length === 0 ? (
        <Card><EmptyState title={t('exams.noExams')} description={t('exams.subtitle')} /></Card>
      ) : (
        <>
          <Card title={t('exams.subjectHealth')} subtitle={t('exams.subjectHealth')}>
            <div className="grid gap-3 md:grid-cols-3">
              {(() => {
                const subjectIds = new Set(upcoming.slice(0,3).map((e) => e.subjectId));
                return analytics.subjectHealth.filter((h) => subjectIds.has(h.subjectId)).slice(0,3).map((h) => <SubjectHealthCard key={h.subjectId} health={h} onSelect={(id) => navigate(`subject/${id}`)} />);
              })()}
            </div>
          </Card>

          <Card title={t('exams.chapterProfiles')} subtitle={t('exams.chapterProfiles')}>
            <div className="space-y-4">
              {upcoming.slice(0,3).map((exam) => {
                const subject = subjectLookup.get(exam.subjectId);
                const syllabusProfiles = exam.syllabusChapterIds.map((id) => analytics.chapterProfiles.find((p) => p.chapterId === id)).filter(Boolean).sort((a,b) => (a!.health.score - b!.health.score)).slice(0,2);
                return (
                  <div key={exam.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{exam.name} · {subject?.shortName} · {exam.date}</p><Badge tone="warning">{exam.kind}</Badge></div>
                    {syllabusProfiles.length > 0 && <div className="mt-2 space-y-2">{syllabusProfiles.map((p) => p && <ChapterProfileCard key={p.chapterId} profile={p} onOpen={(id) => navigate(`chapter/${id}`)} />)}</div>}
                  </div>
                );
              })}
            </div>
          </Card>

          <AdaptationCard plan={analytics.adaptationPlan} />
        </>
      )}

      <Card title={t('exams.upcoming')} subtitle={`${upcoming.length} ${t('exams.upcoming')}`}>
        <ul className="space-y-2">
          {upcoming.map((exam) => {
            const subject = subjectLookup.get(exam.subjectId);
            const chapters = exam.syllabusChapterIds.map((id) => chapterById.get(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
            const weakest = chapters.sort((a,b) => a.mastery - b.mastery).slice(0,1)[0];
            return (
              <li key={exam.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{exam.name}</span><span className="text-xs text-text-muted">{exam.date} · {subject?.shortName}</span></div>
                {weakest && <p className="mt-1 text-xs text-text-muted">{t('exams.weakestArea')}: <strong className="text-text">{weakest.title}</strong> ({MASTERY_TEXT[weakest.mastery]})</p>}
                <div className="mt-2 flex gap-1.5"><Button size="sm" variant="ghost" onClick={() => navigate(`subject/${exam.subjectId}`)}>{t('nav.subjects')}</Button><Button size="sm" variant="danger" onClick={() => store.deleteExam(exam.id)}>{t('common.delete')}</Button></div>
              </li>
            );
          })}
        </ul>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-raised p-5">
            <h3 className="text-sm font-semibold">{t('form.add')} {t('nav.exams')}</h3>
            <div className="mt-3 space-y-3">
              <Field label={t('form.title')}><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('form.subject')}><Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>{state.snapshot.subjects.map((s) => <option key={s.id} value={s.id}>{s.shortName}</option>)}</Select></Field>
                <Field label={t('form.date')}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" /></Field>
              </div>
              <Field label={t('form.type')}><Select value={kind} onChange={(e) => setKind(e.target.value as any)}>{(['EMD','TP','TD','QUIZ','ORAL','MOCK'] as const).map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button><Button variant="primary" onClick={() => { if (!name.trim()) return; store.saveExam({ id: `exam-${Date.now()}`, subjectId, name: name.trim(), date, weight: 1, difficulty: 3, syllabusChapterIds: [], prepStatus: 0, kind, room: '', note: '' }); setShowAdd(false); setName(''); }}>{t('form.save')}</Button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
