/**
 * Domain types — Personal Study Performance System (L1 Systèmes Informatiques, UBMA Annaba).
 *
 * Every entity here maps 1:1 to a table in the local SQLite database (see `src/db/migrations.ts`).
 * Derived/analytics types are declared at the bottom and are NEVER persisted: they are recomputed
 * from stored rows so that no statistic can drift away from the underlying records.
 */

// ---------------------------------------------------------------------------
// Primitive unions
// ---------------------------------------------------------------------------

export type Semester = 'S1' | 'S2';

/**
 * Provenance of a piece of academic data, following the repository's source policy
 * (`resources/sources/SOURCES.md`): never present an unverified value as official.
 */
export type Provenance = 'verified' | 'partial' | 'to-confirm' | 'supplementary';

export type TaskType =
  | 'COURSE'
  | 'TD'
  | 'TP'
  | 'REVISION'
  | 'PRACTICE'
  | 'MEMORY'
  | 'ASSESSMENT'
  | 'REVIEW'
  | 'RECOVERY';

export type TaskStatus = 'pending' | 'running' | 'paused' | 'done' | 'skipped' | 'rescheduled' | 'deferred';

export type TaskDifficulty = 'easy' | 'ok' | 'hard';

export type TaskOrigin = 'planner' | 'recovery' | 'manual' | 'review' | 'exam-mode' | 'minimum-day';

export type ClassKind = 'CM' | 'TD' | 'TP' | 'EXAM';

export type ChapterKind = 'course' | 'td' | 'tp' | 'practice';

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type AssessmentKind = 'EMD' | 'TP' | 'TD' | 'QUIZ' | 'ORAL' | 'MOCK';

export type MistakeType =
  | 'concept'
  | 'calculation'
  | 'memory'
  | 'careless'
  | 'interpretation'
  | 'algorithm-logic'
  | 'syntax'
  | 'time-management';

export type BlockedBy =
  | 'lack-of-time'
  | 'fatigue'
  | 'distraction'
  | 'difficult-subject'
  | 'task-too-long'
  | 'unexpected-event'
  | 'procrastination'
  | 'unclear-task';

export type PlanMode = 'normal' | 'recovery' | 'minimum-viable' | 'exam';

export type RecoveryMode = 'A' | 'B' | 'C' | 'D';

export type ReviewOutcome = 'fail' | 'partial' | 'strong';

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export type GoalState = 'active' | 'achieved' | 'archived';

// ---------------------------------------------------------------------------
// Persisted entities
// ---------------------------------------------------------------------------

export interface Subject {
  id: string;
  code: string;
  name: string;
  shortName: string;
  unit: string;
  semester: Semester;
  /** Academic coefficient, `null` when not published by an official source. */
  coefficient: number | null;
  /** ECTS credits, `null` when not published by an official source. */
  credits: number | null;
  /** Stable per-subject colour (hex). Stored in the data model, never randomised per page. */
  color: string;
  /** Self-declared difficulty 1..5 used only as a tie-breaker in the planner. */
  difficulty: number;
  weeklyTargetMin: number;
  aliases: string[];
  provenance: Provenance;
  active: boolean;
  sortOrder: number;
}

export interface Chapter {
  id: string;
  subjectId: string;
  order: number;
  title: string;
  kind: ChapterKind;
  /** Chapter ids that should be studied first (planner respects these in recovery schedules). */
  prerequisiteIds: string[];
  expectedMin: number;
  sourceLabel: string;
  sourceRef: string;
  /** 0..5 — see MasteryLevel. */
  mastery: MasteryLevel;
  /** Set when the user adjusted mastery by hand; the estimator then only proposes values. */
  masteryManual: MasteryLevel | null;
  confidence: number;
  lastRevisionDate: string | null;
  nextRevisionDate: string | null;
  reviewIntervalIndex: number;
  notes: string;
}

export interface UniversityClass {
  id: string;
  subjectId: string;
  /** 0 = Sunday … 6 = Saturday (JS convention, local time). */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  kind: ClassKind;
  room: string;
  groupLabel: string;
  instructor: string;
  /** 'all' | 'odd' | 'even' — editable weekly parity. */
  weekParity: 'all' | 'odd' | 'even';
  active: boolean;
  provenance: Provenance;
}

export interface DailyPlan {
  id: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  generatedAt: string;
  mode: PlanMode;
  availableMin: number;
  bufferMin: number;
  plannedMin: number;
  energy: EnergyLevel;
  rationale: string;
  /** JSON snapshot of the planning inputs, kept for auditability. */
  inputsJson: string;
}

export interface StudyTask {
  id: string;
  planId: string | null;
  planDate: string;
  subjectId: string | null;
  chapterId: string | null;
  type: TaskType;
  title: string;
  plannedMin: number;
  priority: number;
  priorityLabel: string;
  /** Human-readable justification ("why am I doing this"). */
  reasons: string[];
  status: TaskStatus;
  actualMin: number;
  startedAt: string | null;
  completedAt: string | null;
  difficulty: TaskDifficulty | null;
  note: string;
  origin: TaskOrigin;
  skipCount: number;
  deferCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  taskId: string | null;
  subjectId: string | null;
  chapterId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  /** Minutes considered as real learning (active recall / practice weighted higher). */
  effectiveMin: number;
  mode: 'focus' | 'open' | 'short-start';
  interruptions: number;
  outcomeRating: number | null;
  activeRecall: boolean;
  recallScore: number | null;
  note: string;
  createdAt: string;
}

export interface CheckIn {
  id: string;
  date: string;
  availableMin: number;
  energy: EnergyLevel;
  sleepQuality: number;
  urgentWork: string;
  classNote: string;
  createdAt: string;
}

export interface DailyReview {
  id: string;
  date: string;
  plannedMin: number;
  completedMin: number;
  completionRate: number;
  skippedCount: number;
  delayedCount: number;
  mistakeCount: number;
  reviewEventCount: number;
  blockedBy: BlockedBy[];
  note: string;
  backlogDeltaMin: number;
  createdAt: string;
}

export interface Exam {
  id: string;
  subjectId: string;
  name: string;
  date: string;
  weight: number;
  difficulty: number;
  syllabusChapterIds: string[];
  prepStatus: number;
  kind: AssessmentKind;
  room: string;
  note: string;
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  subjectId: string;
  chapterId: string | null;
  title: string;
  date: string;
  total: number;
  correct: number;
  kind: AssessmentKind;
  durationMin: number | null;
  note: string;
}

export interface Mistake {
  id: string;
  subjectId: string;
  chapterId: string | null;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  type: MistakeType;
  date: string;
  recurrenceCount: number;
  nextReview: string | null;
  resolved: boolean;
  source: string;
  createdAt: string;
}

export interface ReviewEvent {
  id: string;
  chapterId: string;
  subjectId: string;
  date: string;
  recallScore: number;
  outcome: ReviewOutcome;
  intervalDays: number;
  nextDue: string;
  note: string;
}

export interface BacklogItem {
  id: string;
  taskId: string | null;
  subjectId: string;
  chapterId: string | null;
  originalDate: string;
  minutes: number;
  type: TaskType;
  title: string;
  urgency: number;
  weight: number;
  dependencyDepth: number;
  masteryImpact: number;
  score: number;
  classification: 'protect' | 'distribute' | 'defer' | 'drop';
  state: 'open' | 'scheduled' | 'recovered' | 'dropped';
  plannedFor: string | null;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  subjectIds: string[];
  targetTasks: number;
  targetMin: number;
  state: GoalState;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  subjectId: string | null;
  color: string;
  targetPerWeek: number;
  active: boolean;
}

export interface Achievement {
  id: string;
  unlockedAt: string;
  progress: number;
  meta: string;
}

/** Append-only history log: nothing here is ever overwritten. */
export interface DomainEvent {
  id: string;
  at: string;
  type: string;
  entity: string;
  entityId: string;
  payloadJson: string;
}

export interface InsightRecord {
  id: string;
  date: string;
  kind: string;
  text: string;
  evidenceJson: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// User preferences & personal rules (section 26)
// ---------------------------------------------------------------------------

export interface UserRules {
  minDailyMin: number;
  minWeeklyMin: number;
  maxDailyMin: number;
  preferredStudyWindow: 'morning' | 'afternoon' | 'evening' | 'any';
  focusMin: number;
  breakMin: number;
  bufferRatio: number;
  /** 0 = Sunday … 6 = Saturday. */
  restDays: number[];
  weeklyReviewDay: number;
  maxBlockMin: number;
  /** Share of a normal day that recovery work may occupy (0..1). */
  recoveryShareNormal: number;
  /** Share of a recovery day that recovery work may occupy (0..1). */
  recoveryShareRecovery: number;
  /** Days before an assessment at which EXAM MODE is suggested. */
  examModeWindowDays: number;
  reviewIntervals: number[];
  dayStart: string;
  dayEnd: string;
  sleepTargetMin: number;
}

export interface UserPreferences {
  displayName: string;
  theme: 'dark' | 'light';
  rules: UserRules;
}

export interface SettingsRecord {
  key: string;
  valueJson: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Derived (never persisted) types
// ---------------------------------------------------------------------------

export interface TaskReasonsSource {
  coefficient: number | null;
  chapterTitle: string | null;
  daysToExam: number | null;
  mastery: MasteryLevel | null;
  overdueMin: number;
  daysSinceRevision: number | null;
  missingPrerequisites: string[];
}

export interface PriorityBreakdown {
  subjectId: string;
  raw: number;
  normalized: number;
  factors: {
    weight: number;
    weakness: number;
    urgency: number;
    backlog: number;
    revisionDecay: number;
    coefficient: number;
  };
  reasons: string[];
}

export interface PlannedTask
  extends Omit<StudyTask, 'id' | 'createdAt' | 'updatedAt' | 'planId'> {
  /** Deterministic key so regenerating the same plan on the same day yields the same task ids. */
  key: string;
}

export interface DailyPlanResult {
  date: string;
  mode: PlanMode;
  availableMin: number;
  bufferMin: number;
  plannedMin: number;
  tasks: PlannedTask[];
  rationale: string;
  notes: string[];
  allocation: Array<{ subjectId: string; minutes: number; priority: number; reasons: string[] }>;
}

export interface RecoveryDayPlan {
  date: string;
  additions: Array<{ subjectId: string; minutes: number; backlogItemIds: string[] }>;
  totalMin: number;
}

export interface RecoveryPlan {
  mode: RecoveryMode;
  missedDays: number;
  overdueMin: number;
  recoverableMin: number;
  deferMin: number;
  droppedMin: number;
  horizonDays: number;
  days: RecoveryDayPlan[];
  protectedItems: BacklogItem[];
  deferredItems: BacklogItem[];
  droppedItems: BacklogItem[];
  rationale: string;
  warnings: string[];
}
