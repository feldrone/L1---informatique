/**
 * Subjects — bilingual.
 */

import { useMemo } from 'react';
import { Badge, Button, Card, ProvenanceBadge, StatTile, cx } from '../components/primitives';
import { BalanceBars } from '../components/charts';
import { SubjectHealthCard } from '../components/intelligence';
import { HelpButton } from '../components/contextualHelp';
import { useI18n } from '../../i18n';
import { formatMinutes } from '../../i18n/formatters';
import { navigate } from '../router';
import { useAnalytics, useStore, useStudy } from '../../state/provider';

export function SubjectsScreen() {
  const { state, today } = useStudy();
  const { t, lang } = useI18n();
  const store = useStore();
  const analytics = useAnalytics();
  const subjects = state.snapshot.subjects;

  const priorityById = useMemo(() => new Map(analytics.priorities.map((p) => [p.subjectId, p])), [analytics.priorities]);
  const balanceById = useMemo(() => new Map(analytics.balance.map((b) => [b.subjectId, b])), [analytics.balance]);
  const healthById = useMemo(() => new Map(analytics.subjectHealth.map((h) => [h.subjectId, h])), [analytics.subjectHealth]);

  const active = subjects.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const pendingExams = analytics.upcomingExams;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">{t('subjects.title')} <HelpButton titleKey="help.subjectHealth.title" descKey="help.subjectHealth.desc" /></h1>
          <p className="text-xs text-text-muted">{active.length} {t('subjects.allSubjects')}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => navigate('settings')}>{t('settings.title')}</Button>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={t('dashboard.chapters')} value={analytics.masteryByChapter.length} />
        <StatTile label={t('common.due')} value={analytics.revisionDue.length} />
        <StatTile label={t('nav.exams')} value={pendingExams.length} />
        <StatTile label={t('glossary.recovery')} value={formatMinutes(analytics.backlog.openMin, lang)} />
      </div>

      <Card title={t('analytics.subjectBalance')} subtitle={t('charts.subjectBalance')}>
        <BalanceBars entries={analytics.balance} onSelect={(id) => navigate(`subject/${id}`)} />
      </Card>

      <Card title={t('subjects.healthTitle')} subtitle={t('subjects.healthSubtitle')}>
        <div className="grid gap-3 md:grid-cols-2">
          {analytics.subjectHealth.map((h) => <SubjectHealthCard key={h.subjectId} health={h} onSelect={(id) => navigate(`subject/${id}`)} />)}
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {active.map((subject) => {
          const chapters = state.snapshot.chapters.filter((c) => c.subjectId === subject.id);
          const mastered = chapters.filter((c) => c.mastery >= 4).length;
          const averageMastery = chapters.length === 0 ? null : chapters.reduce((acc, c) => acc + c.mastery, 0) / chapters.length;
          const priority = priorityById.get(subject.id);
          const balance = balanceById.get(subject.id);
          const exam = pendingExams.find((e) => e.subjectId === subject.id) ?? null;
          return (
            <Card key={subject.id} as="article" className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: subject.color }} />
                  <div>
                    <h2 className="text-sm font-semibold"><a className="hover:text-accent" href={`#/subject/${subject.id}`}>{subject.name}</a></h2>
                    <p className="text-[11px] text-text-muted">{subject.code} · {subject.unit}</p>
                  </div>
                </div>
                <ProvenanceBadge provenance={subject.provenance} />
              </div>
              <dl className="grid grid-cols-4 gap-2 text-xs">
                <div><dt className="text-text-muted">{t('glossary.mastery')}</dt><dd className="tnum">{averageMastery === null ? '—' : `${averageMastery.toFixed(1)}/5`}</dd></div>
                <div><dt className="text-text-muted">{t('glossary.subjectHealth')}</dt><dd className="tnum">{healthById.get(subject.id)?.score ?? '—'}/100</dd></div>
                <div><dt className="text-text-muted">{t('charts.effectiveTime')}</dt><dd className="tnum">{formatMinutes(balance?.effectiveMin ?? 0, lang)}</dd></div>
                <div><dt className="text-text-muted">{t('common.completed')}</dt><dd className="tnum">{balance?.lastStudiedDate ?? '—'}</dd></div>
              </dl>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted"><span>{mastered}/{chapters.length}</span>{exam && <span>{exam.date}</span>}</div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"><div className="h-2 rounded-full" style={{ width: `${chapters.length === 0 ? 0 : (mastered / chapters.length) * 100}%`, background: subject.color }} /></div>
              </div>
              {priority && <ul className="space-y-0.5 text-[11px] text-text-muted">{priority.reasons.slice(0, 3).map((r, i) => <li key={i}>• {r}</li>)}</ul>}
              {balance?.warning && <p className={cx('rounded-lg border border-warning/40 bg-warning/5 px-2.5 py-1.5 text-[11px] text-warning')}>{balance.warning}</p>}
              <div className="mt-auto flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => navigate(`subject/${subject.id}`)}>{t('common.showDetails')}</Button>
                <Button size="sm" variant="ghost" onClick={() => { store.generatePlan(today); navigate('today'); }}>{t('today.title')}</Button>
                <Badge tone="neutral">{formatMinutes(subject.weeklyTargetMin, lang)}/week</Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
