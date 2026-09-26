/**
 * ChapterDetail — bilingual.
 */

import { useState } from 'react';
import { Button, Card, EmptyState, Select } from '../components/primitives';
import { ChapterProfileCard } from '../components/intelligence';
import { HelpButton } from '../components/contextualHelp';
import { useI18n } from '../../i18n';
import { formatMinutes } from '../../i18n/formatters';
import { useAnalytics, useStore, useStudy } from '../../state/provider';
import { MASTERY_TEXT } from '../lookups';
import type { MasteryLevel } from '../../domain/types';
import { navigate } from '../router';

export function ChapterDetailScreen({ chapterId }: { chapterId: string }) {
  const { state } = useStudy();
  const { t, lang } = useI18n();
  const store = useStore();
  const analytics = useAnalytics();
  const chapter = state.snapshot.chapters.find((c) => c.id === chapterId);
  const subject = chapter ? state.snapshot.subjects.find((s) => s.id === chapter.subjectId) : null;
  const profile = analytics.chapterProfiles.find((p) => p.chapterId === chapterId);

  const [mastery, setMastery] = useState<MasteryLevel>(chapter?.mastery ?? 0);

  if (!chapter) return <Card><EmptyState title={t('chapterDetail.noChapter')} description={t('common.noData')} /></Card>;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">{chapter.title} <HelpButton titleKey="help.chapterProfile.title" descKey="help.chapterProfile.desc" /></h1>
          <p className="text-xs text-text-muted">{subject?.name} · {chapter.kind} · {MASTERY_TEXT[chapter.mastery]}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate(`subject/${chapter.subjectId}`)}>{t('nav.subjects')}</Button>
      </header>

      {profile && <Card title={t('chapterDetail.profile')} subtitle={`${profile.health.label} · ${profile.health.score}/100 · ${profile.evidence.sampleSize} ${t('common.evidence')}`}><ChapterProfileCard profile={profile} /></Card>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('chapterDetail.masteryLadder')} subtitle={t('help.mastery.title')}>
          <div className="space-y-2">
            {[0,1,2,3,4,5].map((level) => (
              <div key={level} className={`flex items-center justify-between rounded-lg border p-2 text-sm ${chapter.mastery === level ? 'border-accent bg-accent-soft' : 'border-border'}`}>
                <span>{level} — {MASTERY_TEXT[level as MasteryLevel]}</span>
                <Button size="sm" variant={chapter.mastery === level ? 'primary' : 'ghost'} onClick={() => { setMastery(level as MasteryLevel); store.setChapterMastery(chapter.id, level as MasteryLevel, true); }}>{t('form.save')}</Button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-text-muted">{t('glossary.mastery')}</span>
            <Select value={mastery} onChange={(e) => setMastery(Number(e.target.value) as MasteryLevel)} className="max-w-32">{[0,1,2,3,4,5].map((l) => <option key={l} value={l}>{l}</option>)}</Select>
            <Button size="sm" variant="secondary" onClick={() => store.setChapterMastery(chapter.id, mastery, true)}>{t('form.save')}</Button>
          </div>
        </Card>

        <Card title={t('chapterDetail.completion')} subtitle={t('chapterDetail.completion')}>
          <div className="space-y-2 text-xs">
            <p>{t('glossary.completion')}: {profile?.tasks.completionRate ?? '—'}%</p>
            <p>{t('charts.effectiveTime')}: {profile ? formatMinutes(profile.sessions.effectiveMin, lang) : '—'}</p>
            <p>{t('glossary.mistakes')}: {profile?.mistakes.open ?? 0} {t('common.open')} / {profile?.mistakes.total ?? 0}</p>
            <p>{t('glossary.prerequisite')}: {profile?.prerequisites.unmet ?? 0} {t('common.pending')} {profile?.prerequisites.isBlocked ? `(${t('common.critical')})` : ''}</p>
          </div>
        </Card>
      </div>

      <Card title={t('chapterDetail.recommendedAction')} subtitle={t('chapterDetail.recommendedAction')}>
        {profile?.recommendations[0] ? <div className="rounded-xl bg-accent-soft/40 p-3"><p className="text-sm font-medium">{profile.recommendations[0].text}</p><p className="mt-1 text-xs text-text-muted">{t('explain.why')}: {profile.recommendations[0].reason}</p><p className="text-[11px] text-text-muted">{t('common.evidence')}: {profile.recommendations[0].evidence}</p></div> : <p className="text-sm text-text-muted">{t('common.noData')}</p>}
      </Card>
    </div>
  );
}
