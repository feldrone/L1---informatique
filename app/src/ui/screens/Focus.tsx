/**
 * Focus — bilingual.
 */

import { nextLearningTask } from '../../domain/learning';
import { Button, Card } from '../components/primitives';
import { FocusTimer } from '../components/timer';
import { useI18n } from '../../i18n';
import { useStudy } from '../../state/provider';

export function FocusScreen({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const { state, today } = useStudy();
  const { t } = useI18n();
  const openTasks = state.snapshot.tasks.filter((t) => t.planDate === today && ['pending', 'running', 'paused'].includes(t.status));
  const running = nextLearningTask(openTasks);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold">{t('focus.title')}</h1>
        <p className="text-xs text-text-muted">{t('focus.subtitle')}</p>
      </header>

      <FocusTimer tasks={openTasks} initialTaskId={running?.id ?? null} />

      <Card title={t('today.tasks')} subtitle={`${openTasks.length} ${t('common.pending')}`}>
        <ul className="space-y-2">
          {openTasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
              <span>{task.title}</span>
              <Button size="sm" variant="ghost" onClick={() => onOpenDay(task.planDate)}>{t('common.showDetails')}</Button>
            </li>
          ))}
          {openTasks.length === 0 && <li className="text-sm text-text-muted">{t('empty.noTasks')}</li>}
        </ul>
      </Card>
    </div>
  );
}
