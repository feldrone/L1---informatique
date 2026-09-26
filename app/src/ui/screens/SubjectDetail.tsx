/**
 * SubjectDetail — bilingual.
 */

import { Button, Card, EmptyState } from '../components/primitives';
import { SubjectHealthCard, ChapterProfileCard } from '../components/intelligence';
import { HelpButton } from '../components/contextualHelp';
import { useI18n } from '../../i18n';
import { formatMinutes } from '../../i18n/formatters';
import { navigate } from '../router';
import { useAnalytics, useStudy } from '../../state/provider';
import { MASTERY_TEXT } from '../lookups';

export function SubjectDetailScreen({ subjectId }: { subjectId: string }) {
  const { state } = useStudy();
  const { t, lang } = useI18n();
  const analytics = useAnalytics();
  const subject = state.snapshot.subjects.find((s) => s.id === subjectId);
  if (!subject) return <Card><EmptyState title={t('common.noData')} description={t('subjects.noSubjects')} /></Card>;

  const health = analytics.subjectHealth.find((h) => h.subjectId === subjectId);
  const chapters = state.snapshot.chapters.filter((c) => c.subjectId === subjectId);
  const profiles = analytics.chapterProfiles.filter((p) => p.subjectId === subjectId).sort((a,b) => a.health.score - b.health.score);
  const perf = analytics.performance.bySubject.find((s) => s.subjectId === subjectId);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">{subject.name} <HelpButton titleKey="help.subjectHealth.title" descKey="help.subjectHealth.desc" /></h1>
          <p className="text-xs text-text-muted">{subject.code} · {subject.unit}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate('subjects')}>{t('nav.subjects')}</Button>
      </header>

      {health && <Card title={t('subjectDetail.health')} subtitle={`Score ${health.score}/100 · ${health.label}`}><SubjectHealthCard health={health} /></Card>}

      {perf && <Card title={t('subjectDetail.performance')} subtitle={`${perf.name} · ${perf.tasks.completionRate}%`}><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-border p-2 text-xs"><span className="text-text-muted">{t('dashboard.tasksCompleted')}</span><p className="tnum">{perf.tasks.done}/{perf.tasks.total}</p></div><div className="rounded-xl border border-border p-2 text-xs"><span className="text-text-muted">{t('charts.effectiveTime')}</span><p className="tnum">{formatMinutes(perf.time.effectiveMin, lang)}</p></div></div></Card>}

      <Card title={t('subjectDetail.chapters')} subtitle={`${chapters.length} ${t('dashboard.chapters')}`}>
        <div className="space-y-2">
          {chapters.map((c) => <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm"><span>{c.title}</span><span className="text-xs text-text-muted">{MASTERY_TEXT[c.mastery]} · {formatMinutes(c.expectedMin, lang)}</span><Button size="sm" variant="ghost" onClick={() => navigate(`chapter/${c.id}`)}>{t('common.showDetails')}</Button></div>)}
        </div>
      </Card>

      <Card title={t('subjectDetail.weakChapters')} subtitle={t('subjectDetail.weakChapters')}>
        <div className="space-y-2">{profiles.slice(0,3).map((p) => <ChapterProfileCard key={p.chapterId} profile={p} onOpen={(id) => navigate(`chapter/${id}`)} />)}</div>
      </Card>
    </div>
  );
}
