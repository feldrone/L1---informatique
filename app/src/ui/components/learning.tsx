import { useState } from 'react';
import type { StudyTask } from '../../domain/types';
import { learningStage, nextLearningTask, safeYouTubeUrl, selectResources, youtubeThumbnail } from '../../domain/learning';
import { useStudy } from '../../state/provider';
import { useI18n } from '../../i18n';
import { Button, Card } from './primitives';
import { navigate } from '../router';

export function LearningContext({ task }: { task: StudyTask }) {
  const { store } = useStudy();
  const { t } = useI18n();
  const [help, setHelp] = useState(false);
  const resources = selectResources(store.repository.listResources(), task);
  const stage = learningStage(task.type);
  return <section className="space-y-3 text-sm">
    <p className="font-medium">{t('learning.goal')}: {task.goal || task.title}</p>
    <ol className="flex flex-wrap gap-3" aria-label={t('learning.workspace')}>
      {(['learn', 'practice', 'recall'] as const).map(s => <li key={s} aria-current={s === stage ? 'step' : undefined} className={s === stage ? 'font-bold text-accent' : 'text-text-muted'}>{t(`learning.${s}`)}</li>)}
    </ol>
    <p>{t(`learning.${stage}Help`)}</p>
    {task.reference && <p className="break-words">{t('learning.reference')}: {task.reference}</p>}
    <details><summary className="cursor-pointer">{t('learning.why')}</summary><ul>{task.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul></details>
    <h3 className="font-medium">{t('learning.resources')}</h3>
    <ul className="grid gap-2 sm:grid-cols-3">{resources.map(r => {
      const thumbnail = youtubeThumbnail(r.url);
      return <li key={r.id} className="rounded-lg border border-border p-2">
        <a href={safeYouTubeUrl(r.url)!} target="_blank" rel="noopener noreferrer" className="text-accent underline">
          {thumbnail && <img src={thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="mb-2 aspect-video w-full rounded object-cover" onError={e => { e.currentTarget.hidden = true; }} />}
          <bdi>{r.title}</bdi>
        </a>
        {!r.subjectId && !r.chapterId && <p className="mt-1 text-xs text-text-muted">{t('learning.supplementary')}</p>}
      </li>;
    })}</ul>
    {resources.length === 0 && <p>{t('common.noData')}</p>}
    <Button variant="ghost" aria-expanded={help} onClick={() => setHelp(!help)}>{t('learning.help')}</Button>
    {help && <p role="status">{t('learning.helpText')}</p>}
  </section>;
}

export function LearningPlan({ tasks }: { tasks: StudyTask[] }) {
  const { store } = useStudy();
  const { t } = useI18n();
  const next = nextLearningTask(tasks);
  const done = tasks.filter(task => task.status === 'done').length;
  return <Card title={t('learning.plan')}>
    <p>{t('learning.progress')}: {done}/{tasks.length}</p>
    <progress className="w-full" aria-label={t('learning.progress')} max={Math.max(1, tasks.length)} value={done} />
    <h2 className="mt-3 font-semibold">{t('learning.next')}</h2>
    {next ? <div className="space-y-3"><p>{next.title}</p><LearningContext task={next} /><Button variant="primary" onClick={() => { store.startTask(next.id); navigate('focus'); }}>{t('learning.start')}</Button></div> : <p>{t('empty.noTasks')}</p>}
  </Card>;
}
