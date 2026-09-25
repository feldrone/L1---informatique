/** Analytics test fixtures: re-exports + goal builder. */

import type { Goal } from '../types';
import { T } from '../testing/fixtures';

export {
  BASE_RULES,
  makeChapter,
  makeExam,
  makePlan,
  makeSession,
  makeSubject,
  makeTask,
  T,
} from '../testing/fixtures';

export function makeGoalFixture(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    title: 'Semester 1 coverage',
    description: 'Study every chapter then reach mastery ≥ 3.',
    deadline: null,
    subjectIds: ['sub-analyse1'],
    targetTasks: 10,
    targetMin: 1000,
    state: 'active',
    createdAt: `${T.monday}T08:00:00.000Z`,
    ...overrides,
  };
}
