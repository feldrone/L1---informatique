/**
 * Repositories: the only place that knows about SQL column names.
 * Everything above this file manipulates domain objects.
 */

import type { DbClient, SqlValue } from './database';
import { nowISO } from '../domain/date';
import type {
  Achievement,
  BacklogItem,
  Chapter,
  CheckIn,
  DailyPlan,
  DailyReview,
  DomainEvent,
  Exam,
  Goal,
  Habit,
  InsightRecord,
  MasteryLevel,
  Mistake,
  QuizAttempt,
  ReviewEvent,
  SettingsRecord,
  StudySession,
  StudyTask,
  Subject,
  UniversityClass,
  UserPreferences,
} from '../domain/types';
import { DEFAULT_RULES } from '../domain/seed/academic';

// ---------------------------------------------------------------------------
// row helpers
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string => (v === null || v === undefined ? fallback : String(v));
const num = (v: unknown, fallback = 0): number => (v === null || v === undefined ? fallback : Number(v));
const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);
const strOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const bool = (v: unknown): boolean => Number(v) === 1;
const boolNum = (v: boolean): number => (v ? 1 : 0);
const json = <T>(v: unknown, fallback: T): T => {
  if (typeof v !== 'string' || v.length === 0) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
};
const dump = (v: unknown): string => JSON.stringify(v ?? null);

// ---------------------------------------------------------------------------
// mappers
// ---------------------------------------------------------------------------

const toSubject = (r: Row): Subject => ({
  id: str(r.id),
  code: str(r.code),
  name: str(r.name),
  shortName: str(r.short_name),
  unit: str(r.unit),
  semester: str(r.semester, 'S1') as Subject['semester'],
  coefficient: numOrNull(r.coefficient),
  credits: numOrNull(r.credits),
  color: str(r.color, '#64748b'),
  difficulty: num(r.difficulty, 3),
  weeklyTargetMin: num(r.weekly_target_min, 120),
  aliases: json<string[]>(r.aliases_json, []),
  provenance: str(r.provenance, 'to-confirm') as Subject['provenance'],
  active: bool(r.active),
  sortOrder: num(r.sort_order),
});

const subjectRow = (s: Subject): Record<string, SqlValue> => ({
  id: s.id,
  code: s.code,
  name: s.name,
  short_name: s.shortName,
  unit: s.unit,
  semester: s.semester,
  coefficient: s.coefficient,
  credits: s.credits,
  color: s.color,
  difficulty: s.difficulty,
  weekly_target_min: s.weeklyTargetMin,
  aliases_json: dump(s.aliases),
  provenance: s.provenance,
  source_ref: (s as Subject & { sourceRef?: string }).sourceRef ?? '',
  active: boolNum(s.active),
  sort_order: s.sortOrder,
});

const toChapter = (r: Row): Chapter => ({
  id: str(r.id),
  subjectId: str(r.subject_id),
  order: num(r.ord),
  title: str(r.title),
  kind: str(r.kind, 'course') as Chapter['kind'],
  prerequisiteIds: json<string[]>(r.prerequisite_ids_json, []),
  expectedMin: num(r.expected_min, 120),
  sourceLabel: str(r.source_label),
  sourceRef: str(r.source_ref),
  mastery: num(r.mastery) as MasteryLevel,
  masteryManual: numOrNull(r.mastery_manual) as MasteryLevel | null,
  confidence: num(r.confidence),
  lastRevisionDate: strOrNull(r.last_revision_date),
  nextRevisionDate: strOrNull(r.next_revision_date),
  reviewIntervalIndex: num(r.review_interval_index),
  notes: str(r.notes),
});

const chapterRow = (c: Chapter): Record<string, SqlValue> => ({
  id: c.id,
  subject_id: c.subjectId,
  ord: c.order,
  title: c.title,
  kind: c.kind,
  prerequisite_ids_json: dump(c.prerequisiteIds),
  expected_min: c.expectedMin,
  source_label: c.sourceLabel,
  source_ref: c.sourceRef,
  mastery: c.mastery,
  mastery_manual: c.masteryManual,
  confidence: c.confidence,
  last_revision_date: c.lastRevisionDate,
  next_revision_date: c.nextRevisionDate,
  review_interval_index: c.reviewIntervalIndex,
  notes: c.notes,
});

const toUniversityClass = (r: Row): UniversityClass => ({
  id: str(r.id),
  subjectId: str(r.subject_id),
  dayOfWeek: num(r.day_of_week),
  startTime: str(r.start_time),
  endTime: str(r.end_time),
  kind: str(r.kind, 'CM') as UniversityClass['kind'],
  room: str(r.room),
  groupLabel: str(r.group_label),
  instructor: str(r.instructor),
  weekParity: str(r.week_parity, 'all') as UniversityClass['weekParity'],
  active: bool(r.active),
  provenance: str(r.provenance, 'to-confirm') as UniversityClass['provenance'],
});

const universityClassRow = (c: UniversityClass): Record<string, SqlValue> => ({
  id: c.id,
  subject_id: c.subjectId,
  day_of_week: c.dayOfWeek,
  start_time: c.startTime,
  end_time: c.endTime,
  kind: c.kind,
  room: c.room,
  group_label: c.groupLabel,
  instructor: c.instructor,
  week_parity: c.weekParity,
  active: boolNum(c.active),
  provenance: c.provenance,
});

const toTask = (r: Row): StudyTask => ({
  id: str(r.id),
  planId: strOrNull(r.plan_id),
  planDate: str(r.plan_date),
  subjectId: strOrNull(r.subject_id),
  chapterId: strOrNull(r.chapter_id),
  type: str(r.type) as StudyTask['type'],
  title: str(r.title),
  plannedMin: num(r.planned_min),
  priority: num(r.priority),
  priorityLabel: str(r.priority_label),
  reasons: json<string[]>(r.reasons_json, []),
  status: str(r.status, 'pending') as StudyTask['status'],
  actualMin: num(r.actual_min),
  startedAt: strOrNull(r.started_at),
  completedAt: strOrNull(r.completed_at),
  difficulty: strOrNull(r.difficulty) as StudyTask['difficulty'],
  note: str(r.note),
  origin: str(r.origin, 'planner') as StudyTask['origin'],
  skipCount: num(r.skip_count),
  deferCount: num(r.defer_count),
  createdAt: str(r.created_at),
  updatedAt: str(r.updated_at),
});

const taskRow = (t: StudyTask): Record<string, SqlValue> => ({
  id: t.id,
  plan_id: t.planId,
  plan_date: t.planDate,
  subject_id: t.subjectId,
  chapter_id: t.chapterId,
  type: t.type,
  title: t.title,
  planned_min: t.plannedMin,
  priority: t.priority,
  priority_label: t.priorityLabel,
  reasons_json: dump(t.reasons),
  status: t.status,
  actual_min: t.actualMin,
  started_at: t.startedAt,
  completed_at: t.completedAt,
  difficulty: t.difficulty,
  note: t.note,
  origin: t.origin,
  skip_count: t.skipCount,
  defer_count: t.deferCount,
  sort_index: 0,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
});

const toSession = (r: Row): StudySession => ({
  id: str(r.id),
  taskId: strOrNull(r.task_id),
  subjectId: strOrNull(r.subject_id),
  chapterId: strOrNull(r.chapter_id),
  date: str(r.date),
  startTime: str(r.start_time),
  endTime: str(r.end_time),
  durationMin: num(r.duration_min),
  effectiveMin: num(r.effective_min),
  mode: str(r.mode, 'focus') as StudySession['mode'],
  interruptions: num(r.interruptions),
  outcomeRating: numOrNull(r.outcome_rating),
  activeRecall: bool(r.active_recall),
  recallScore: numOrNull(r.recall_score),
  note: str(r.note),
  createdAt: str(r.created_at),
});

const sessionRow = (s: StudySession): Record<string, SqlValue> => ({
  id: s.id,
  task_id: s.taskId,
  subject_id: s.subjectId,
  chapter_id: s.chapterId,
  date: s.date,
  start_time: s.startTime,
  end_time: s.endTime,
  duration_min: s.durationMin,
  effective_min: s.effectiveMin,
  mode: s.mode,
  interruptions: s.interruptions,
  outcome_rating: s.outcomeRating,
  active_recall: boolNum(s.activeRecall),
  recall_score: s.recallScore,
  note: s.note,
  created_at: s.createdAt,
});

const toPlan = (r: Row): DailyPlan => ({
  id: str(r.id),
  date: str(r.date),
  generatedAt: str(r.generated_at),
  mode: str(r.mode, 'normal') as DailyPlan['mode'],
  availableMin: num(r.available_min),
  bufferMin: num(r.buffer_min),
  plannedMin: num(r.planned_min),
  energy: num(r.energy, 3) as DailyPlan['energy'],
  rationale: str(r.rationale),
  inputsJson: str(r.inputs_json, '{}'),
});

const planRow = (p: DailyPlan): Record<string, SqlValue> => ({
  id: p.id,
  date: p.date,
  generated_at: p.generatedAt,
  mode: p.mode,
  available_min: p.availableMin,
  buffer_min: p.bufferMin,
  planned_min: p.plannedMin,
  energy: p.energy,
  rationale: p.rationale,
  inputs_json: p.inputsJson,
});

const toCheckIn = (r: Row): CheckIn => ({
  id: str(r.id),
  date: str(r.date),
  availableMin: num(r.available_min),
  energy: num(r.energy, 3) as CheckIn['energy'],
  sleepQuality: num(r.sleep_quality, 3),
  urgentWork: str(r.urgent_work),
  classNote: str(r.class_note),
  createdAt: str(r.created_at),
});

const checkInRow = (c: CheckIn): Record<string, SqlValue> => ({
  id: c.id,
  date: c.date,
  available_min: c.availableMin,
  energy: c.energy,
  sleep_quality: c.sleepQuality,
  urgent_work: c.urgentWork,
  class_note: c.classNote,
  created_at: c.createdAt,
});

const toDailyReview = (r: Row): DailyReview => ({
  id: str(r.id),
  date: str(r.date),
  plannedMin: num(r.planned_min),
  completedMin: num(r.completed_min),
  completionRate: num(r.completion_rate),
  skippedCount: num(r.skipped_count),
  delayedCount: num(r.delayed_count),
  mistakeCount: num(r.mistake_count),
  reviewEventCount: num(r.review_event_count),
  blockedBy: json<DailyReview['blockedBy']>(r.blocked_by_json, []),
  note: str(r.note),
  backlogDeltaMin: num(r.backlog_delta_min),
  createdAt: str(r.created_at),
});

const dailyReviewRow = (d: DailyReview): Record<string, SqlValue> => ({
  id: d.id,
  date: d.date,
  planned_min: d.plannedMin,
  completed_min: d.completedMin,
  completion_rate: d.completionRate,
  skipped_count: d.skippedCount,
  delayed_count: d.delayedCount,
  mistake_count: d.mistakeCount,
  review_event_count: d.reviewEventCount,
  blocked_by_json: dump(d.blockedBy),
  note: d.note,
  backlog_delta_min: d.backlogDeltaMin,
  created_at: d.createdAt,
});

const toExam = (r: Row): Exam => ({
  id: str(r.id),
  subjectId: str(r.subject_id),
  name: str(r.name),
  date: str(r.date),
  weight: num(r.weight, 1),
  difficulty: num(r.difficulty, 3),
  syllabusChapterIds: json<string[]>(r.syllabus_json, []),
  prepStatus: num(r.prep_status),
  kind: str(r.kind, 'EMD') as Exam['kind'],
  room: str(r.room),
  note: str(r.note),
  createdAt: str(r.created_at),
});

const examRow = (e: Exam): Record<string, SqlValue> => ({
  id: e.id,
  subject_id: e.subjectId,
  name: e.name,
  date: e.date,
  weight: e.weight,
  difficulty: e.difficulty,
  syllabus_json: dump(e.syllabusChapterIds),
  prep_status: e.prepStatus,
  kind: e.kind,
  room: e.room,
  note: e.note,
  created_at: e.createdAt,
});

const toQuiz = (r: Row): QuizAttempt => ({
  id: str(r.id),
  subjectId: str(r.subject_id),
  chapterId: strOrNull(r.chapter_id),
  title: str(r.title),
  date: str(r.date),
  total: num(r.total),
  correct: num(r.correct),
  kind: str(r.kind, 'QUIZ') as QuizAttempt['kind'],
  durationMin: numOrNull(r.duration_min),
  note: str(r.note),
});

const quizRow = (q: QuizAttempt): Record<string, SqlValue> => ({
  id: q.id,
  subject_id: q.subjectId,
  chapter_id: q.chapterId,
  title: q.title,
  date: q.date,
  total: q.total,
  correct: q.correct,
  kind: q.kind,
  duration_min: q.durationMin,
  note: q.note,
  created_at: nowISO(),
});

const toMistake = (r: Row): Mistake => ({
  id: str(r.id),
  subjectId: str(r.subject_id),
  chapterId: strOrNull(r.chapter_id),
  question: str(r.question),
  userAnswer: str(r.user_answer),
  correctAnswer: str(r.correct_answer),
  explanation: str(r.explanation),
  type: str(r.type, 'concept') as Mistake['type'],
  date: str(r.date),
  recurrenceCount: num(r.recurrence_count, 1),
  nextReview: strOrNull(r.next_review),
  resolved: bool(r.resolved),
  source: str(r.source),
  createdAt: str(r.created_at),
});

const mistakeRow = (m: Mistake): Record<string, SqlValue> => ({
  id: m.id,
  subject_id: m.subjectId,
  chapter_id: m.chapterId,
  question: m.question,
  user_answer: m.userAnswer,
  correct_answer: m.correctAnswer,
  explanation: m.explanation,
  type: m.type,
  date: m.date,
  recurrence_count: m.recurrenceCount,
  next_review: m.nextReview,
  resolved: boolNum(m.resolved),
  source: m.source,
  created_at: m.createdAt,
});

const toReviewEvent = (r: Row): ReviewEvent => ({
  id: str(r.id),
  chapterId: str(r.chapter_id),
  subjectId: str(r.subject_id),
  date: str(r.date),
  recallScore: num(r.recall_score),
  outcome: str(r.outcome, 'partial') as ReviewEvent['outcome'],
  intervalDays: num(r.interval_days, 1),
  nextDue: str(r.next_due),
  note: str(r.note),
});

const reviewEventRow = (e: ReviewEvent): Record<string, SqlValue> => ({
  id: e.id,
  chapter_id: e.chapterId,
  subject_id: e.subjectId,
  date: e.date,
  recall_score: e.recallScore,
  outcome: e.outcome,
  interval_days: e.intervalDays,
  next_due: e.nextDue,
  note: e.note,
  created_at: nowISO(),
});

const toBacklog = (r: Row): BacklogItem => ({
  id: str(r.id),
  taskId: strOrNull(r.task_id),
  subjectId: str(r.subject_id),
  chapterId: strOrNull(r.chapter_id),
  originalDate: str(r.original_date),
  minutes: num(r.minutes),
  type: str(r.type, 'COURSE') as BacklogItem['type'],
  title: str(r.title),
  urgency: num(r.urgency),
  weight: num(r.weight),
  dependencyDepth: num(r.dependency_depth),
  masteryImpact: num(r.mastery_impact),
  score: num(r.score),
  classification: str(r.classification, 'distribute') as BacklogItem['classification'],
  state: str(r.state, 'open') as BacklogItem['state'],
  plannedFor: strOrNull(r.planned_for),
  createdAt: str(r.created_at),
});

const backlogRow = (b: BacklogItem): Record<string, SqlValue> => ({
  id: b.id,
  task_id: b.taskId,
  subject_id: b.subjectId,
  chapter_id: b.chapterId,
  original_date: b.originalDate,
  minutes: b.minutes,
  type: b.type,
  title: b.title,
  urgency: b.urgency,
  weight: b.weight,
  dependency_depth: b.dependencyDepth,
  mastery_impact: b.masteryImpact,
  score: b.score,
  classification: b.classification,
  state: b.state,
  planned_for: b.plannedFor,
  created_at: b.createdAt,
});

const toGoal = (r: Row): Goal => ({
  id: str(r.id),
  title: str(r.title),
  description: str(r.description),
  deadline: strOrNull(r.deadline),
  subjectIds: json<string[]>(r.subject_ids_json, []),
  targetTasks: num(r.target_tasks),
  targetMin: num(r.target_min),
  state: str(r.state, 'active') as Goal['state'],
  createdAt: str(r.created_at),
});

const goalRow = (g: Goal): Record<string, SqlValue> => ({
  id: g.id,
  title: g.title,
  description: g.description,
  deadline: g.deadline,
  subject_ids_json: dump(g.subjectIds),
  target_tasks: g.targetTasks,
  target_min: g.targetMin,
  state: g.state,
  created_at: g.createdAt,
});

const toHabit = (r: Row): Habit => ({
  id: str(r.id),
  name: str(r.name),
  subjectId: strOrNull(r.subject_id),
  color: str(r.color, '#64748b'),
  targetPerWeek: num(r.target_per_week, 3),
  active: bool(r.active),
});

const habitRow = (h: Habit): Record<string, SqlValue> => ({
  id: h.id,
  name: h.name,
  subject_id: h.subjectId,
  color: h.color,
  target_per_week: h.targetPerWeek,
  active: boolNum(h.active),
});

const toEvent = (r: Row): DomainEvent => ({
  id: str(r.id),
  at: str(r.at),
  type: str(r.type),
  entity: str(r.entity),
  entityId: str(r.entity_id),
  payloadJson: str(r.payload_json, '{}'),
});

// ---------------------------------------------------------------------------
// repository
// ---------------------------------------------------------------------------

export class Repository {
  constructor(readonly client: DbClient) {}

  /** Groups several repository writes into one SQLite transaction (nested calls join the outer one). */
  transaction<T>(fn: () => T): T {
    return this.client.transaction(fn);
  }

  // -- meta & preferences --------------------------------------------------
  getSetting(key: string): string | null {
    const row = this.client.get<{ value_json: string }>(
      `SELECT value_json FROM settings WHERE key = ?`,
      [key],
    );
    return row ? row.value_json : null;
  }

  getSettings(): SettingsRecord[] {
    return this.client.all<Row>(`SELECT * FROM settings`).map((r) => ({
      key: str(r.key),
      valueJson: str(r.value_json),
      updatedAt: str(r.updated_at),
    }));
  }

  setSetting(key: string, value: unknown): void {
    this.client.upsert(
      'settings',
      { key, value_json: dump(value), updated_at: nowISO() },
      'key',
    );
  }

  loadPreferences(): UserPreferences {
    const raw = this.getSetting('preferences');
    const fallback: UserPreferences = { displayName: 'L1 SINF', theme: 'dark', rules: DEFAULT_RULES };
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return {
        displayName: parsed.displayName ?? fallback.displayName,
        theme: parsed.theme === 'light' ? 'light' : 'dark',
        rules: { ...DEFAULT_RULES, ...(parsed.rules ?? {}) },
      };
    } catch {
      return fallback;
    }
  }

  savePreferences(prefs: UserPreferences): void {
    this.setSetting('preferences', prefs);
  }

  // -- subjects ------------------------------------------------------------
  listSubjects(includeInactive = true): Subject[] {
    const rows = this.client.all<Row>(
      includeInactive
        ? `SELECT * FROM subjects ORDER BY sort_order, name`
        : `SELECT * FROM subjects WHERE active = 1 ORDER BY sort_order, name`,
    );
    return rows.map(toSubject);
  }

  upsertSubject(subject: Subject): void {
    this.client.upsert('subjects', subjectRow(subject));
  }

  // -- chapters ------------------------------------------------------------
  listChapters(): Chapter[] {
    return this.client.all<Row>(`SELECT * FROM chapters ORDER BY subject_id, ord`).map(toChapter);
  }

  upsertChapter(chapter: Chapter): void {
    this.client.upsert('chapters', chapterRow(chapter));
  }

  updateChapterMastery(
    chapterId: string,
    level: MasteryLevel,
    manual: MasteryLevel | null,
    confidence: number,
  ): void {
    this.client.update('chapters', chapterId, {
      mastery: level,
      mastery_manual: manual,
      confidence,
    });
  }

  updateChapterReview(
    chapterId: string,
    lastRevisionDate: string,
    nextRevisionDate: string,
    reviewIntervalIndex: number,
  ): void {
    this.client.update('chapters', chapterId, {
      last_revision_date: lastRevisionDate,
      next_revision_date: nextRevisionDate,
      review_interval_index: reviewIntervalIndex,
    });
  }

  recordMasteryChange(
    chapterId: string,
    date: string,
    fromLevel: MasteryLevel,
    toLevel: MasteryLevel,
    source: string,
  ): void {
    this.client.insert('mastery_history', {
      id: `mh-${chapterId}-${date}-${fromLevel}-${toLevel}-${Math.random().toString(36).slice(2, 7)}`,
      chapter_id: chapterId,
      date,
      from_level: fromLevel,
      to_level: toLevel,
      source,
      created_at: nowISO(),
    });
  }

  listMasteryHistory(chapterId?: string): Array<{
    id: string;
    chapterId: string;
    date: string;
    fromLevel: number;
    toLevel: number;
    source: string;
  }> {
    const rows = chapterId
      ? this.client.all<Row>(`SELECT * FROM mastery_history WHERE chapter_id = ? ORDER BY date`, [
          chapterId,
        ])
      : this.client.all<Row>(`SELECT * FROM mastery_history ORDER BY date`);
    return rows.map((r) => ({
      id: str(r.id),
      chapterId: str(r.chapter_id),
      date: str(r.date),
      fromLevel: num(r.from_level),
      toLevel: num(r.to_level),
      source: str(r.source),
    }));
  }

  // -- timetable -----------------------------------------------------------
  listUniversityClasses(): UniversityClass[] {
    return this.client
      .all<Row>(`SELECT * FROM university_classes ORDER BY day_of_week, start_time`)
      .map(toUniversityClass);
  }

  upsertUniversityClass(c: UniversityClass): void {
    this.client.upsert('university_classes', universityClassRow(c));
  }

  deleteUniversityClass(id: string): void {
    this.client.delete('university_classes', id);
  }

  // -- plans & tasks -------------------------------------------------------
  getPlan(date: string): DailyPlan | null {
    const row = this.client.get<Row>(`SELECT * FROM daily_plans WHERE date = ?`, [date]);
    return row ? toPlan(row) : null;
  }

  listPlans(): DailyPlan[] {
    return this.client.all<Row>(`SELECT * FROM daily_plans ORDER BY date`).map(toPlan);
  }

  savePlan(plan: DailyPlan): void {
    this.client.upsert('daily_plans', planRow(plan));
  }

  listTasks(): StudyTask[] {
    return this.client.all<Row>(`SELECT * FROM study_tasks ORDER BY plan_date, sort_index, id`).map(toTask);
  }

  listTasksByDate(date: string): StudyTask[] {
    return this.client
      .all<Row>(`SELECT * FROM study_tasks WHERE plan_date = ? ORDER BY sort_index, id`, [date])
      .map(toTask);
  }

  listOpenTasksBefore(date: string): StudyTask[] {
    return this.client
      .all<Row>(
        `SELECT * FROM study_tasks
          WHERE plan_date < ? AND status IN ('pending','paused','running','skipped','deferred','rescheduled')
          ORDER BY plan_date`,
        [date],
      )
      .map(toTask);
  }

  upsertTask(task: StudyTask): void {
    this.client.upsert('study_tasks', taskRow(task));
  }

  upsertTasks(tasks: StudyTask[]): void {
    this.client.transaction(() => {
      for (const t of tasks) this.client.upsert('study_tasks', taskRow(t));
    });
  }

  // -- sessions ------------------------------------------------------------
  listSessions(): StudySession[] {
    return this.client
      .all<Row>(`SELECT * FROM study_sessions ORDER BY date, start_time`)
      .map(toSession);
  }

  insertSession(session: StudySession): void {
    this.client.insert('study_sessions', sessionRow(session));
  }

  // -- check-ins & reviews -------------------------------------------------
  listCheckIns(): CheckIn[] {
    return this.client.all<Row>(`SELECT * FROM check_ins ORDER BY date`).map(toCheckIn);
  }

  getCheckIn(date: string): CheckIn | null {
    const row = this.client.get<Row>(`SELECT * FROM check_ins WHERE date = ?`, [date]);
    return row ? toCheckIn(row) : null;
  }

  saveCheckIn(checkIn: CheckIn): void {
    this.client.upsert('check_ins', checkInRow(checkIn), 'date');
  }

  listDailyReviews(): DailyReview[] {
    return this.client.all<Row>(`SELECT * FROM daily_reviews ORDER BY date`).map(toDailyReview);
  }

  saveDailyReview(review: DailyReview): void {
    this.client.upsert('daily_reviews', dailyReviewRow(review), 'date');
  }

  // -- exams ---------------------------------------------------------------
  listExams(): Exam[] {
    return this.client.all<Row>(`SELECT * FROM exams ORDER BY date`).map(toExam);
  }

  upsertExam(exam: Exam): void {
    this.client.upsert('exams', examRow(exam));
  }

  deleteExam(id: string): void {
    this.client.delete('exams', id);
  }

  // -- quizzes, mistakes, reviews -----------------------------------------
  listQuizzes(): QuizAttempt[] {
    return this.client.all<Row>(`SELECT * FROM quizzes ORDER BY date`).map(toQuiz);
  }

  insertQuiz(quiz: QuizAttempt): void {
    this.client.insert('quizzes', quizRow(quiz));
  }

  listMistakes(): Mistake[] {
    return this.client.all<Row>(`SELECT * FROM mistakes ORDER BY date DESC`).map(toMistake);
  }

  upsertMistake(mistake: Mistake): void {
    this.client.upsert('mistakes', mistakeRow(mistake));
  }

  listReviewEvents(): ReviewEvent[] {
    return this.client.all<Row>(`SELECT * FROM review_events ORDER BY date`).map(toReviewEvent);
  }

  insertReviewEvent(event: ReviewEvent): void {
    this.client.insert('review_events', reviewEventRow(event));
  }

  // -- backlog -------------------------------------------------------------
  listBacklog(): BacklogItem[] {
    return this.client.all<Row>(`SELECT * FROM backlog_items ORDER BY score DESC`).map(toBacklog);
  }

  upsertBacklogItem(item: BacklogItem): void {
    this.client.upsert('backlog_items', backlogRow(item));
  }

  upsertBacklogItems(items: BacklogItem[]): void {
    this.client.transaction(() => {
      for (const item of items) this.client.upsert('backlog_items', backlogRow(item));
    });
  }

  // -- goals, habits, achievements ----------------------------------------
  listGoals(): Goal[] {
    return this.client.all<Row>(`SELECT * FROM goals ORDER BY created_at`).map(toGoal);
  }

  upsertGoal(goal: Goal): void {
    this.client.upsert('goals', goalRow(goal));
  }

  deleteGoal(id: string): void {
    this.client.delete('goals', id);
  }

  listHabits(): Habit[] {
    return this.client.all<Row>(`SELECT * FROM habits`).map(toHabit);
  }

  upsertHabit(habit: Habit): void {
    this.client.upsert('habits', habitRow(habit));
  }

  listAchievements(): Achievement[] {
    return this.client.all<Row>(`SELECT * FROM achievements`).map((r) => ({
      id: str(r.id),
      unlockedAt: str(r.unlocked_at),
      progress: num(r.progress),
      meta: str(r.meta_json, '{}'),
    }));
  }

  unlockAchievement(id: string, at: string, progress: number, meta: unknown = {}): void {
    this.client.upsert('achievements', {
      id,
      unlocked_at: at,
      progress,
      meta_json: dump(meta),
    });
  }

  // -- insights & events ---------------------------------------------------
  listInsights(): InsightRecord[] {
    return this.client.all<Row>(`SELECT * FROM insights ORDER BY date DESC, created_at DESC`).map((r) => ({
      id: str(r.id),
      date: str(r.date),
      kind: str(r.kind),
      text: str(r.text),
      evidenceJson: str(r.evidence_json, '{}'),
      createdAt: str(r.created_at),
    }));
  }

  replaceInsightsForDate(date: string, insights: Array<Omit<InsightRecord, 'createdAt'>>): void {
    this.client.transaction(() => {
      this.client.run(`DELETE FROM insights WHERE date = ?`, [date]);
      for (const insight of insights) {
        this.client.insert('insights', {
          id: insight.id,
          date: insight.date,
          kind: insight.kind,
          text: insight.text,
          evidence_json: insight.evidenceJson,
          created_at: nowISO(),
        });
      }
    });
  }

  appendEvent(event: Omit<DomainEvent, 'at'> & { at?: string }): void {
    this.client.insert('events', {
      id: event.id,
      at: event.at ?? nowISO(),
      type: event.type,
      entity: event.entity,
      entity_id: event.entityId,
      payload_json: event.payloadJson,
    });
  }

  listEvents(): DomainEvent[] {
    return this.client.all<Row>(`SELECT * FROM events ORDER BY at`).map(toEvent);
  }

  // -- maintenance ---------------------------------------------------------
  wipe(): void {
    const tables = [
      'events',
      'insights',
      'mastery_history',
      'achievements',
      'habits',
      'goals',
      'backlog_items',
      'review_events',
      'mistakes',
      'quizzes',
      'exams',
      'daily_reviews',
      'check_ins',
      'study_sessions',
      'study_tasks',
      'daily_plans',
      'university_classes',
      'chapters',
      'subjects',
      'settings',
      'preferences',
    ];
    this.client.transaction(() => {
      for (const table of tables) this.client.run(`DELETE FROM ${table}`);
    });
  }

  countAll(): Record<string, number> {
    const tables = [
      'subjects',
      'chapters',
      'university_classes',
      'daily_plans',
      'study_tasks',
      'study_sessions',
      'check_ins',
      'daily_reviews',
      'exams',
      'quizzes',
      'mistakes',
      'review_events',
      'backlog_items',
      'goals',
      'habits',
      'achievements',
      'events',
    ];
    const out: Record<string, number> = {};
    for (const t of tables) out[t] = this.client.count(t);
    return out;
  }
}

export type { SqlValue };
