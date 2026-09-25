/**
 * Planning engine — shared input/output contracts.
 *
 * Every function in `src/domain/planning` is PURE and DETERMINISTIC: the same context produces the
 * same plan. Time, randomness and I/O are injected by the caller, which is what makes the planning
 * test-suite (spec §45) reproducible.
 */

import type {
  BacklogItem,
  Chapter,
  CheckIn,
  Exam,
  PlanMode,
  StudySession,
  StudyTask,
  Subject,
  UniversityClass,
  UserRules,
} from '../types';
import type { ISODate } from '../date';

/** Behavioural signals extracted from recent history (see `behaviour.ts`). */
export interface BehaviourSignals {
  completionRate7d: number;
  /** Median (actual - planned) / planned over recent completed tasks; > 0 means sessions run long. */
  overshootRatio: number;
  /** Median (planned - actual) / planned over recent completed tasks; > 0 means sessions finish early. */
  undershootRatio: number;
  /** How many times each subject was skipped in the last 14 days. */
  skipCountBySubject: Record<string, number>;
  /** Subjects whose recent exercise/quiz accuracy is below the failure threshold. */
  strugglingSubjectIds: string[];
  /** Average rating (1..5) of recent sessions; null when no rated session exists yet. */
  averageOutcomeRating: number | null;
  /** Number of completed sessions in the last 7 days. */
  sessionsLast7d: number;
}

export interface PlanningContext {
  date: ISODate;
  /** ISO timestamp used for created/updated fields. */
  now: string;
  subjects: Subject[];
  chapters: Chapter[];
  timetable: UniversityClass[];
  exams: Exam[];
  /** Open tasks from earlier days (carry-over candidates). */
  overdueTasks: StudyTask[];
  /** Open backlog items (classified by the recovery engine). */
  backlog: BacklogItem[];
  /** Recent sessions (used for revision spacing and behaviour). */
  sessions: StudySession[];
  /** Tasks for the last 14 days, used to measure behaviour and to avoid duplicating today's plan. */
  recentTasks: StudyTask[];
  checkIn: Pick<CheckIn, 'availableMin' | 'energy' | 'sleepQuality' | 'urgentWork'>;
  rules: UserRules;
  behaviour: BehaviourSignals;
  /** Consecutive fully-missed days immediately before `date`. */
  missedDays: number;
}

export interface DayWindow {
  startMin: number;
  endMin: number;
  label: string;
}

/** Reason tags surfaced in the UI next to every generated task ("why am I doing this"). */
export interface PlannedTaskDraft {
  key: string;
  subjectId: string | null;
  chapterId: string | null;
  type: StudyTask['type'];
  title: string;
  plannedMin: number;
  priority: number;
  priorityLabel: string;
  reasons: string[];
  difficultyHint: 'easy' | 'ok' | 'hard';
  origin: StudyTask['origin'];
  suggestedStart: string | null;
  note: string;
}

export interface PlanningResult {
  date: ISODate;
  mode: PlanMode;
  availableMin: number;
  bufferMin: number;
  plannedMin: number;
  tasks: PlannedTaskDraft[];
  allocation: Array<{ subjectId: string; minutes: number; priority: number; reasons: string[] }>;
  rationale: string;
  notes: string[];
  freeWindows: DayWindow[];
}

export interface RecoveryInput {
  date: ISODate;
  missedDays: number;
  overdueTasks: StudyTask[];
  backlog: BacklogItem[];
  subjects: Subject[];
  chapters: Chapter[];
  exams: Exam[];
  rules: UserRules;
  /** Study minutes the student can realistically add today on top of the normal plan. */
  todayCapacityMin: number;
  /** 'auto' picks MODE A→D from `missedDays`; a preset overrides it. */
  preset?: 'auto' | 'today' | '3d' | '7d' | 'rebuild';
}
