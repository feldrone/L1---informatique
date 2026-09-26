/**
 * Application store — the single consistent data layer (spec add-on §20).
 *
 * Reads live in memory (small dataset), writes go through the SQLite repository, and every mutation
 * refreshes the affected slices and notifies subscribers, so the progress ring, subject ring, streak,
 * heatmap and charts all update without a page reload.
 *
 * History is append-only: completing a task inserts a StudySession and a DomainEvent, skipping a task
 * moves it into the backlog, and mastery changes are recorded in `mastery_history`.
 */

import type { BrowserDatabaseHandle } from '../db/browser';
import { Repository } from '../db/repo';
import { applySeed, isSeeded } from '../db/seed';
import { nowISO, nowTimeHHMM, todayISO, addDays, daysBetween, type ISODate } from '../domain/date';
import { stableId, uid } from '../domain/ids';
import type {
  AdaptationLog,
  BacklogItem,
  BlockedBy,
  Chapter,
  CheckIn,
  DailyPlan,
  DailyReview,
  EnergyLevel,
  Exam,
  Goal,
  Habit,
  Achievement,
  InsightRecord,
  MasteryLevel,
  Mistake,
  PlanMode,
  QuizAttempt,
  RecoveryPlan,
  ReviewEvent,
  StudySession,
  StudyTask,
  Subject,
  TaskDifficulty,
  UniversityClass,
  UserPreferences,
  UserRules,
  WeeklyReviewRecord,
} from '../domain/types';
import { generateDailyPlan } from '../domain/planning/planner';
import { backlogFromTasks, classifyMissedWork, generateRecoveryPlan } from '../domain/planning/recovery';
import { countMissedDays, deriveBehaviourSignals } from '../domain/planning/behaviour';
import { collectMasterySignals, estimateMastery, effectiveMastery } from '../domain/planning/mastery';
import { assessRecall, scheduleReview } from '../domain/planning/revision';
import type { PlanningContext } from '../domain/planning/types';
import { generateInsights } from '../domain/analytics/insights';
import { evaluateAchievements } from '../domain/analytics/goals';

export interface Snapshot {
  subjects: Subject[];
  chapters: Chapter[];
  timetable: UniversityClass[];
  plans: DailyPlan[];
  tasks: StudyTask[];
  sessions: StudySession[];
  checkIns: CheckIn[];
  reviews: DailyReview[];
  exams: Exam[];
  quizzes: QuizAttempt[];
  mistakes: Mistake[];
  reviewEvents: ReviewEvent[];
  backlog: BacklogItem[];
  goals: Goal[];
  habits: Habit[];
  achievements: Achievement[];
  insights: InsightRecord[];
  weeklyReviews: WeeklyReviewRecord[];
  adaptationLogs: AdaptationLog[];
  preferences: UserPreferences;
}

export type StoreStatus = 'loading' | 'ready' | 'error';

export interface StoreState {
  status: StoreStatus;
  error: string | null;
  snapshot: Snapshot;
  /** Monotonic revision: changes on every mutation, used to memoise derived analytics. */
  revision: number;
  /** True when persistence to IndexedDB reported at least one successful flush. */
  flushCount: number;
}

const EMPTY_SNAPSHOT: Snapshot = {
  subjects: [],
  chapters: [],
  timetable: [],
  plans: [],
  tasks: [],
  sessions: [],
  checkIns: [],
  reviews: [],
  exams: [],
  quizzes: [],
  mistakes: [],
  reviewEvents: [],
  backlog: [],
  goals: [],
  habits: [],
  achievements: [],
  insights: [],
  weeklyReviews: [],
  adaptationLogs: [],
  preferences: { displayName: 'L1 SINF', theme: 'dark', language: 'en' as const, rules: {
    minDailyMin: 60,
    minWeeklyMin: 600,
    maxDailyMin: 300,
    preferredStudyWindow: 'morning',
    focusMin: 50,
    breakMin: 10,
    bufferRatio: 0.18,
    restDays: [5],
    weeklyReviewDay: 6,
    maxBlockMin: 60,
    recoveryShareNormal: 0.35,
    recoveryShareRecovery: 0.6,
    examModeWindowDays: 7,
    reviewIntervals: [1, 3, 7, 14, 30],
    dayStart: '08:00',
    dayEnd: '22:00',
    sleepTargetMin: 450,
  } },
};

export class StudyStore {
  private state: StoreState = {
    status: 'loading',
    error: null,
    snapshot: EMPTY_SNAPSHOT,
    revision: 0,
    flushCount: 0,
  };

  private listeners = new Set<() => void>();
  private repo: Repository | null = null;
  private handle: BrowserDatabaseHandle | null = null;

  // ---- store plumbing ----------------------------------------------------
  getState = (): StoreState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setState(patch: Partial<StoreState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  private bump(snapshot?: Partial<Snapshot>): void {
    this.setState({
      snapshot: snapshot ? { ...this.state.snapshot, ...snapshot } : this.reloadSlice(),
      revision: this.state.revision + 1,
    });
  }

  private reloadSlice(): Snapshot {
    const repo = this.repo;
    if (!repo) return this.state.snapshot;
    return loadSnapshot(repo);
  }

  // ---- lifecycle ---------------------------------------------------------
  async init(handle: BrowserDatabaseHandle): Promise<void> {
    try {
      this.handle = handle;
      this.repo = new Repository(handle);
      if (!isSeeded(this.repo)) applySeed(this.repo);
      this.runDailyMaintenance(todayISO());
      this.setState({
        status: 'ready',
        error: null,
        snapshot: loadSnapshot(this.repo),
        revision: this.state.revision + 1,
      });
    } catch (error) {
      this.setState({ status: 'error', error: (error as Error).message });
    }
  }

  /** A database opened outside the browser (tests, tooling). */
  async initWithClient(client: BrowserDatabaseHandle): Promise<void> {
    await this.init(client);
  }

  /**
   * Persists immediately without awaiting. Called after history-append operations (completed task,
   * logged session, skip, recovery, recall, import) so a reload right after the action keeps it.
   */
  private persistNow(): void {
    void this.handle?.flush().catch(() => undefined);
  }

  async flush(): Promise<void> {
    if (this.handle) await this.handle.flush();
    this.setState({ flushCount: this.handle ? this.handle.flushCount() : 0 });
  }

  get repository(): Repository {
    if (!this.repo) throw new Error('Store is not initialised yet');
    return this.repo;
  }

  // ---- maintenance -------------------------------------------------------
  /**
   * Runs once per session (and once per day roll-over): turns unfinished past tasks into backlog items,
   * refreshes insights and unlocks achievements from real thresholds only.
   */
  runDailyMaintenance(today: ISODate): void {
    const repo = this.repository;
    const tasks = repo.listTasks();
    const missed = tasks.filter(
      (t) =>
        t.planDate < today &&
        (t.status === 'pending' || t.status === 'skipped' || t.status === 'rescheduled' || t.status === 'paused'),
    );
    if (missed.length > 0) {
      const existing = new Map(repo.listBacklog().map((b) => [b.taskId ?? b.id, b]));
      const fresh = backlogFromTasks(missed, today).filter((item) => !existing.has(item.taskId ?? item.id));
      if (fresh.length > 0) repo.upsertBacklogItems(fresh);
      const dropIds = tasks.filter((t) => t.planDate < today && t.status !== 'done').map((t) => t.id);
      for (const id of dropIds) {
        const task = tasks.find((t) => t.id === id);
        if (task) repo.upsertTask({ ...task, status: 'deferred', updatedAt: nowISO() });
      }
    }

    // recovery scoring preview (kept in the backlog row so the UI can sort by real impact)
    const backlog = repo.listBacklog();
    if (backlog.length > 0) {
      const subjects = repo.listSubjects();
      const chapters = repo.listChapters();
      const exams = repo.listExams();
      const classified = classifyMissedWork({
        date: today,
        missedDays: countMissedDays({ date: today, tasks }),
        overdueTasks: tasks.filter((t) => t.planDate < today && t.status !== 'done'),
        backlog,
        subjects,
        chapters,
        exams,
        rules: repo.loadPreferences().rules,
        todayCapacityMin: 0,
      });
      repo.upsertBacklogItems(
        classified.map((c) => ({ ...c.item, score: c.score, classification: c.classification })),
      );
    }

    this.refreshInsights(today);
    this.refreshAchievements(today);
  }

  refreshInsights(today: ISODate): InsightRecord[] {
    const repo = this.repository;
    const snapshot = loadSnapshot(repo);
    const insights = generateInsights({
      today,
      days: buildDayWindows(snapshot, today),
      tasks: snapshot.tasks,
      sessions: snapshot.sessions,
      subjects: snapshot.subjects,
      chapters: snapshot.chapters,
      exams: snapshot.exams,
      quizzes: snapshot.quizzes.map((q) => ({ subjectId: q.subjectId, date: q.date, correct: q.correct, total: q.total })),
      backlogOpenMin: snapshot.backlog.filter((b) => b.state === 'open').reduce((a, b) => a + b.minutes, 0),
      previousBacklogOpenMin: null,
    });
    repo.replaceInsightsForDate(
      today,
      insights.map((i) => ({
        id: `${today}-${i.id}`,
        date: today,
        kind: i.kind,
        text: i.text,
        evidenceJson: JSON.stringify({ evidence: i.evidence, sampleSize: i.sampleSize }),
      })),
    );
    return repo.listInsights();
  }

  refreshAchievements(today: ISODate): void {
    const repo = this.repository;
    const snapshot = loadSnapshot(repo);
    const days = buildDayWindows(snapshot, today);
    const activeDays = days.filter((d) => d.completedTaskCount > 0).length;
    let longest = 0;
    let run = 0;
    for (const day of days) {
      if (day.completedTaskCount > 0) {
        run += 1;
        longest = Math.max(longest, run);
      } else if (day.hadPlan) run = 0;
    }
    const evaluated = evaluateAchievements(
      {
        days,
        tasks: snapshot.tasks,
        sessions: snapshot.sessions,
        chapters: snapshot.chapters,
        subjects: snapshot.subjects,
        goals: snapshot.goals,
        today,
        streaks: {
          currentStreak: run,
          longestStreak: longest,
          totalActiveDays: activeDays,
          recoveryStreak: 0,
        },
      },
      repo.listAchievements(),
      nowISO(),
    );
    for (const item of evaluated) {
      if (item.unlocked && item.unlockedAt) {
        const existing = repo.listAchievements().find((a) => a.id === item.definition.id);
        if (!existing) repo.unlockAchievement(item.definition.id, item.unlockedAt, item.progress);
      }
    }
  }

  // ---- planning ----------------------------------------------------------
  buildPlanningContext(date: ISODate, snapshot = this.state.snapshot): PlanningContext {
    const rules = snapshot.preferences.rules;
    const checkIn = snapshot.checkIns.find((c) => c.date === date);
    const overdueTasks = snapshot.tasks.filter(
      (t) =>
        t.planDate < date &&
        (t.status === 'pending' || t.status === 'skipped' || t.status === 'paused' || t.status === 'rescheduled'),
    );
    return {
      date,
      now: nowISO(),
      subjects: snapshot.subjects,
      chapters: snapshot.chapters,
      timetable: snapshot.timetable,
      exams: snapshot.exams.filter((e) => e.date >= date),
      overdueTasks,
      backlog: snapshot.backlog.filter((b) => b.state === 'open' || b.state === 'scheduled'),
      sessions: snapshot.sessions,
      recentTasks: snapshot.tasks,
      checkIn: checkIn
        ? {
            availableMin: checkIn.availableMin,
            energy: checkIn.energy,
            sleepQuality: checkIn.sleepQuality,
            urgentWork: checkIn.urgentWork,
          }
        : {
            availableMin: Math.max(rules.minDailyMin, Math.round(rules.maxDailyMin * 0.8)),
            energy: 3,
            sleepQuality: 3,
            urgentWork: '',
          },
      rules,
      behaviour: deriveBehaviourSignals({ date, tasks: snapshot.tasks, sessions: snapshot.sessions }),
      missedDays: countMissedDays({ date, tasks: snapshot.tasks }),
    };
  }

  /** Generates (or regenerates) the plan of a date and persists it without destroying history. */
  generatePlan(date: ISODate): { plan: DailyPlan; tasks: StudyTask[] } {
    const repo = this.repository;
    const snapshot = this.state.snapshot;
    const ctx = this.buildPlanningContext(date, snapshot);
    const result = generateDailyPlan(ctx);

    const existing = repo.listTasksByDate(date);
    const protectedTasks = existing.filter(
      (t) => t.status === 'done' || t.status === 'skipped' || t.status === 'running' || t.status === 'paused',
    );
    const protectedIds = new Set(protectedTasks.map((t) => t.id));

    const planId = stableId('plan', date);
    const plan: DailyPlan = {
      id: planId,
      date,
      generatedAt: nowISO(),
      mode: result.mode as PlanMode,
      availableMin: result.availableMin,
      bufferMin: result.bufferMin,
      plannedMin: result.plannedMin,
      energy: ctx.checkIn.energy,
      rationale: result.rationale,
      inputsJson: JSON.stringify({
        mode: result.mode,
        missedDays: ctx.missedDays,
        notes: result.notes,
        allocation: result.allocation,
        behaviour: ctx.behaviour,
        freeWindows: result.freeWindows,
      }),
    };

    const carriedOver = protectedTasks.map((t) => t.id);
    repo.transaction(() => {
      repo.savePlan(plan);
      // remove stale pending tasks of that date (they are replaced by the fresh plan)
      for (const task of existing) {
        if (!protectedIds.has(task.id)) repo.client.delete('study_tasks', task.id);
      }
      for (const draft of result.tasks) {
        const id = stableId('task', date, draft.key);
        if (protectedIds.has(id)) continue;
        repo.upsertTask({
          id,
          planId: plan.id,
          planDate: date,
          subjectId: draft.subjectId,
          chapterId: draft.chapterId,
          type: draft.type,
          title: draft.title,
          plannedMin: draft.plannedMin,
          priority: draft.priority,
          priorityLabel: draft.priorityLabel,
          reasons: draft.reasons,
          status: 'pending',
          actualMin: 0,
          startedAt: null,
          completedAt: null,
          difficulty: null,
          note: draft.note,
          origin: draft.origin,
          skipCount: 0,
          deferCount: 0,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
      }
    });
    void carriedOver;
    this.bump();
    return { plan, tasks: repo.listTasksByDate(date) };
  }

  // ---- check-in & review -------------------------------------------------
  saveCheckIn(input: {
    date: ISODate;
    availableMin: number;
    energy: EnergyLevel;
    sleepQuality: number;
    urgentWork: string;
    classNote: string;
  }): void {
    const repo = this.repository;
    const existing = repo.getCheckIn(input.date);
    const checkIn: CheckIn = {
      id: existing?.id ?? uid('checkin'),
      date: input.date,
      availableMin: input.availableMin,
      energy: input.energy,
      sleepQuality: input.sleepQuality,
      urgentWork: input.urgentWork,
      classNote: input.classNote,
      createdAt: existing?.createdAt ?? nowISO(),
    };
    repo.saveCheckIn(checkIn);
    repo.appendEvent({
      id: uid('ev'),
      type: 'checkin.saved',
      entity: 'check_ins',
      entityId: checkIn.id,
      payloadJson: JSON.stringify(input),
    });
    this.generatePlan(input.date);
  }

  saveDailyReview(input: {
    date: ISODate;
    blockedBy: BlockedBy[];
    note: string;
  }): DailyReview {
    const repo = this.repository;
    const tasks = repo.listTasksByDate(input.date);
    const done = tasks.filter((t) => t.status === 'done');
    const plannedMin = tasks.reduce((acc, t) => acc + t.plannedMin, 0);
    const completedMin = done.reduce((acc, t) => acc + t.actualMin, 0);
    const backlogDelta = repo
      .listBacklog()
      .filter((b) => b.originalDate === input.date)
      .reduce((acc, b) => acc + b.minutes, 0);
    const review: DailyReview = {
      id: stableId('review', input.date),
      date: input.date,
      plannedMin,
      completedMin,
      completionRate: plannedMin === 0 ? 0 : Math.round((completedMin / plannedMin) * 1000) / 10,
      skippedCount: tasks.filter((t) => t.status === 'skipped').length,
      delayedCount: tasks.filter((t) => t.status === 'pending').length,
      mistakeCount: repo.listMistakes().filter((m) => m.date === input.date).length,
      reviewEventCount: repo.listReviewEvents().filter((r) => r.date === input.date).length,
      blockedBy: input.blockedBy,
      note: input.note,
      backlogDeltaMin: backlogDelta,
      createdAt: nowISO(),
    };
    repo.saveDailyReview(review);
    repo.appendEvent({
      id: uid('ev'),
      type: 'review.saved',
      entity: 'daily_reviews',
      entityId: review.id,
      payloadJson: JSON.stringify(input),
    });
    this.refreshInsights(input.date);
    this.bump();
    return review;
  }

  // ---- task lifecycle ----------------------------------------------------
  startTask(taskId: string): void {
    const repo = this.repository;
    const task = this.findTask(taskId);
    if (!task) return;
    repo.upsertTask({ ...task, status: 'running', startedAt: nowISO(), updatedAt: nowISO() });
    this.bump();
  }

  pauseTask(taskId: string): void {
    const repo = this.repository;
    const task = this.findTask(taskId);
    if (!task) return;
    repo.upsertTask({ ...task, status: 'paused', updatedAt: nowISO() });
    this.bump();
  }

  /** Completes a task: records the session, the event, mastery movement and the review schedule. */
  completeTask(
    taskId: string,
    input: { actualMin?: number; difficulty?: TaskDifficulty | null; note?: string; activeRecall?: boolean; recallScore?: number | null } = {},
  ): void {
    const repo = this.repository;
    const task = this.findTask(taskId);
    if (!task) return;
    const actualMin = Math.max(1, Math.round(input.actualMin ?? task.plannedMin));
    const now = nowISO();
    const startTime = task.startedAt ? task.startedAt.slice(11, 16) : nowTimeHHMM();
    const endTime = addMinutesToTime(startTime, actualMin);
    const chapter = task.chapterId ? repo.listChapters().find((c) => c.id === task.chapterId) ?? null : null;
    const isRecallTask = input.activeRecall ?? (task.type === 'REVISION' || task.type === 'MEMORY');

    const session: StudySession = {
      id: uid('session'),
      taskId: task.id,
      subjectId: task.subjectId,
      chapterId: task.chapterId,
      date: task.planDate,
      startTime,
      endTime,
      durationMin: actualMin,
      effectiveMin: Math.round(actualMin * (isRecallTask ? 1 : task.type === 'COURSE' ? 0.85 : 0.95)),
      mode: 'focus',
      interruptions: 0,
      outcomeRating: null,
      activeRecall: isRecallTask,
      recallScore: input.recallScore ?? null,
      note: input.note ?? '',
      createdAt: now,
    };

    repo.transaction(() => {
      repo.upsertTask({
        ...task,
        status: 'done',
        actualMin,
        difficulty: input.difficulty ?? task.difficulty,
        note: input.note ?? task.note,
        completedAt: now,
        updatedAt: now,
      });
      repo.insertSession(session);
      repo.appendEvent({
        id: uid('ev'),
        type: 'task.completed',
        entity: 'study_tasks',
        entityId: task.id,
        payloadJson: JSON.stringify({ actualMin, type: task.type, subjectId: task.subjectId }),
      });
      // backlog item recovered
      const backlogItem = repo.listBacklog().find((b) => b.taskId === task.id && b.state !== 'recovered');
      if (backlogItem) repo.upsertBacklogItem({ ...backlogItem, state: 'recovered' });
    });

    // mastery + spaced review (only when the task targets a chapter)
    if (chapter) {
      this.refreshChapterMastery(chapter.id, task.planDate);
      if (isRecallTask) {
        this.recordRecall(chapter.id, input.recallScore ?? (task.type === 'MEMORY' ? 0.7 : 0.6), {
          date: task.planDate,
          note: `Recall during “${task.title}”`,
          sessionId: session.id,
        });
      } else if (chapter.lastRevisionDate === null) {
        repo.updateChapterReview(chapter.id, task.planDate, addDays(task.planDate, repo.loadPreferences().rules.reviewIntervals[0]), 0);
      }
    }
    this.persistNow();
    this.bump();
  }

  skipTask(taskId: string, reason = ''): void {
    const repo = this.repository;
    const task = this.findTask(taskId);
    if (!task) return;
    repo.transaction(() => {
      repo.upsertTask({
        ...task,
        status: 'skipped',
        skipCount: task.skipCount + 1,
        note: reason || task.note,
        updatedAt: nowISO(),
      });
      const backlogItem: BacklogItem = {
        id: `bl-${task.id}`,
        taskId: task.id,
        subjectId: task.subjectId ?? 'sub-unknown',
        chapterId: task.chapterId,
        originalDate: task.planDate,
        minutes: task.plannedMin,
        type: task.type,
        title: task.title,
        urgency: 0,
        weight: 0,
        dependencyDepth: 0,
        masteryImpact: 0,
        score: 0,
        classification: 'distribute',
        state: 'open',
        plannedFor: null,
        createdAt: nowISO(),
      };
      repo.upsertBacklogItem(backlogItem);
      repo.appendEvent({
        id: uid('ev'),
        type: 'task.skipped',
        entity: 'study_tasks',
        entityId: task.id,
        payloadJson: JSON.stringify({ reason }),
      });
    });
    this.persistNow();
    this.bump();
  }

  rescheduleTask(taskId: string, toDate: ISODate): void {
    const repo = this.repository;
    const task = this.findTask(taskId);
    if (!task) return;
    repo.upsertTask({
      ...task,
      planDate: toDate,
      status: 'pending',
      deferCount: task.deferCount + 1,
      updatedAt: nowISO(),
    });
    repo.appendEvent({
      id: uid('ev'),
      type: 'task.rescheduled',
      entity: 'study_tasks',
      entityId: task.id,
      payloadJson: JSON.stringify({ from: task.planDate, to: toDate }),
    });
    this.bump();
  }

  rateTask(taskId: string, difficulty: TaskDifficulty, note = ''): void {
    const repo = this.repository;
    const task = this.findTask(taskId);
    if (!task) return;
    repo.upsertTask({ ...task, difficulty, note: note || task.note, updatedAt: nowISO() });
    this.bump();
  }

  addTaskNote(taskId: string, note: string): void {
    const repo = this.repository;
    const task = this.findTask(taskId);
    if (!task) return;
    repo.upsertTask({ ...task, note, updatedAt: nowISO() });
    this.bump();
  }

  /** Append-only mastery change log for a chapter (manual or estimated). */
  masteryHistory(chapterId: string): Array<{ date: string; from: number; to: number; source: string }> {
    return this.repository.listMasteryHistory(chapterId).map((row) => ({
      date: row.date,
      from: row.fromLevel,
      to: row.toLevel,
      source: row.source,
    }));
  }

  /** Anti-procrastination: shrink a task to a 10-minute start block instead of failing to begin. */
  shortStartTask(taskId: string): void {
    const repo = this.repository;
    const task = this.findTask(taskId);
    if (!task) return;
    const plannedMin = Math.min(10, Math.max(5, task.plannedMin));
    repo.upsertTask({
      ...task,
      plannedMin,
      note: task.note || 'Reduced to a 10-minute start block (anti-procrastination).',
      updatedAt: nowISO(),
    });
    repo.appendEvent({
      id: uid('ev'),
      type: 'task.short-start',
      entity: 'study_tasks',
      entityId: task.id,
      payloadJson: JSON.stringify({ from: task.plannedMin, to: plannedMin }),
    });
    this.bump();
  }

  /** Splits an oversized task into consecutive blocks no longer than the configured maximum block. */
  splitTask(taskId: string): void {
    const repo = this.repository;
    const task = this.findTask(taskId);
    if (!task) return;
    const maxBlock = Math.max(15, this.state.snapshot.preferences.rules.maxBlockMin);
    if (task.plannedMin <= maxBlock) return;
    const blocks: number[] = [];
    let remaining = task.plannedMin;
    while (remaining > maxBlock * 1.2) {
      blocks.push(maxBlock);
      remaining -= maxBlock;
    }
    if (remaining > 0) blocks.push(Math.round(remaining));
    const now = nowISO();
    repo.transaction(() => {
      blocks.forEach((minutes, index) => {
        const block: StudyTask = {
          ...task,
          id: index === 0 ? task.id : uid('task-block'),
          title: `${task.title} — block ${index + 1}/${blocks.length}`,
          plannedMin: minutes,
          note: index === 0 ? task.note : 'Split block created from an oversized task.',
          status: 'pending',
          startedAt: null,
          completedAt: null,
          actualMin: 0,
          createdAt: index === 0 ? task.createdAt : now,
          updatedAt: now,
        };
        repo.upsertTask(block);
      });
      repo.appendEvent({
        id: uid('ev'),
        type: 'task.split',
        entity: 'study_tasks',
        entityId: task.id,
        payloadJson: JSON.stringify({ blocks: blocks.length }),
      });
    });
    this.bump();
  }

  /** Open focus session logged from the timer (may or may not be attached to a task). */
  logFocusSession(input: {
    taskId: string | null;
    durationMin: number;
    interruptions: number;
    outcomeRating: number | null;
    activeRecall: boolean;
    recallScore: number | null;
    note: string;
    subjectId?: string | null;
    chapterId?: string | null;
    date?: ISODate;
  }): void {
    const repo = this.repository;
    const task = input.taskId ? this.findTask(input.taskId) : null;
    const date = input.date ?? task?.planDate ?? todayISO();
    const start = nowTimeHHMM();
    const session: StudySession = {
      id: uid('session'),
      taskId: input.taskId,
      subjectId: input.subjectId ?? task?.subjectId ?? null,
      chapterId: input.chapterId ?? task?.chapterId ?? null,
      date,
      startTime: start,
      endTime: addMinutesToTime(start, input.durationMin),
      durationMin: input.durationMin,
      effectiveMin: Math.round(input.durationMin * (input.activeRecall ? 1 : 0.9)),
      mode: 'focus',
      interruptions: input.interruptions,
      outcomeRating: input.outcomeRating,
      activeRecall: input.activeRecall,
      recallScore: input.recallScore,
      note: input.note,
      createdAt: nowISO(),
    };
    repo.transaction(() => {
      repo.insertSession(session);
      repo.appendEvent({
        id: uid('ev'),
        type: 'session.logged',
        entity: 'study_sessions',
        entityId: session.id,
        payloadJson: JSON.stringify({ durationMin: input.durationMin, interruptions: input.interruptions }),
      });
      if (task) {
        repo.upsertTask({
          ...task,
          status: 'paused',
          actualMin: task.actualMin + input.durationMin,
          startedAt: task.startedAt ?? nowISO(),
          updatedAt: nowISO(),
        });
      }
    });
    this.persistNow();
    this.bump();
  }

  // ---- recovery ----------------------------------------------------------
  buildRecoveryPlan(preset: 'auto' | 'today' | '3d' | '7d' | 'rebuild' = 'auto'): RecoveryPlan {
    const snapshot = this.state.snapshot;
    const today = todayISO();
    const checkIn = snapshot.checkIns.find((c) => c.date === today);
    return generateRecoveryPlan({
      date: today,
      missedDays: countMissedDays({ date: today, tasks: snapshot.tasks }),
      overdueTasks: snapshot.tasks.filter((t) => t.planDate < today && t.status !== 'done'),
      backlog: snapshot.backlog.filter((b) => b.state === 'open' || b.state === 'scheduled'),
      subjects: snapshot.subjects,
      chapters: snapshot.chapters,
      exams: snapshot.exams,
      rules: snapshot.preferences.rules,
      todayCapacityMin: checkIn
        ? checkIn.availableMin
        : Math.max(snapshot.preferences.rules.minDailyMin, Math.round(snapshot.preferences.rules.maxDailyMin * 0.6)),
      preset,
    });
  }

  /** Applies a recovery plan: schedules backlog items and creates the recovery tasks for today. */
  applyRecoveryPlan(plan: RecoveryPlan): void {
    const repo = this.repository;
    const today = todayISO();
    repo.transaction(() => {
      for (const day of plan.days) {
        for (const addition of day.additions) {
          for (const itemId of addition.backlogItemIds) {
            const item = repo.listBacklog().find((b) => b.id === itemId);
            if (item) repo.upsertBacklogItem({ ...item, state: 'scheduled', plannedFor: day.date });
          }
          if (day.date === today && addition.minutes >= 15) {
            const subject = this.state.snapshot.subjects.find((s) => s.id === addition.subjectId);
            const items = repo.listBacklog().filter((b) => addition.backlogItemIds.includes(b.id));
            const chapterId = items.find((i) => i.chapterId)?.chapterId ?? null;
            const id = stableId('task', today, 'recovery', addition.subjectId, items.map((i) => i.id).join(','));
            const existing = repo.listTasksByDate(today).find((t) => t.id === id);
            if (!existing) {
              const chapter = chapterId ? repo.listChapters().find((c) => c.id === chapterId) ?? null : null;
              repo.upsertTask({
                id,
                planId: null,
                planDate: today,
                subjectId: addition.subjectId,
                chapterId,
                type: 'RECOVERY',
                title: `Recovery — ${chapter ? chapter.title : subject?.shortName ?? 'Missed work'}`,
                plannedMin: Math.min(45, addition.minutes),
                priority: 70,
                priorityLabel: 'High',
                reasons: ['Recovery plan accepted', `${items.length} overdue item(s)`],
                status: 'pending',
                actualMin: 0,
                startedAt: null,
                completedAt: null,
                difficulty: null,
                note: 'Recovery block — reschedule honestly if it does not fit.',
                origin: 'recovery',
                skipCount: 0,
                deferCount: 0,
                createdAt: nowISO(),
                updatedAt: nowISO(),
              });
            }
          }
        }
      }
      repo.appendEvent({
        id: uid('ev'),
        type: 'recovery.applied',
        entity: 'backlog_items',
        entityId: plan.mode,
        payloadJson: JSON.stringify({
          mode: plan.mode,
          horizonDays: plan.horizonDays,
          recoverableMin: plan.recoverableMin,
          deferMin: plan.deferMin,
          droppedMin: plan.droppedMin,
        }),
      });
      for (const item of plan.droppedItems) {
        const stored = repo.listBacklog().find((b) => b.id === item.id);
        if (stored) repo.upsertBacklogItem({ ...stored, state: 'dropped' });
      }
    });
    this.persistNow();
    this.bump();
  }

  // ---- mastery & revision ------------------------------------------------
  setChapterMastery(chapterId: string, level: MasteryLevel, manual: boolean): void {
    const repo = this.repository;
    const chapter = repo.listChapters().find((c) => c.id === chapterId);
    if (!chapter) return;
    repo.transaction(() => {
      repo.updateChapterMastery(chapterId, level, manual ? level : null, chapter.confidence);
      repo.recordMasteryChange(chapterId, todayISO(), chapter.mastery, level, manual ? 'manual' : 'estimated');
      repo.appendEvent({
        id: uid('ev'),
        type: 'mastery.changed',
        entity: 'chapters',
        entityId: chapterId,
        payloadJson: JSON.stringify({ from: chapter.mastery, to: level, manual }),
      });
    });
    this.bump();
  }

  /** Recomputes the mastery proposal for a chapter from stored evidence (never silently applied). */
  refreshChapterMastery(chapterId: string, date: ISODate): MasteryLevel {
    const repo = this.repository;
    const chapter = repo.listChapters().find((c) => c.id === chapterId);
    if (!chapter) return 0;
    const tasks = repo.listTasks();
    const sessions = repo.listSessions();
    const quizzes = repo.listQuizzes().filter((q) => q.chapterId === chapterId && q.total > 0);
    const quizAccuracy = quizzes.length === 0 ? null : quizzes.reduce((a, q) => a + q.correct / q.total, 0) / quizzes.length;
    const quizSamples = quizzes.reduce((a, q) => a + q.total, 0);
    const signals = collectMasterySignals({
      chapter,
      tasks,
      sessions,
      quizAccuracy,
      quizSamples,
      mistakesOpen: repo.listMistakes().filter((m) => m.chapterId === chapterId && !m.resolved).length,
      date,
    });
    const estimate = estimateMastery(signals, chapter.mastery);
    if (chapter.masteryManual === null && estimate.level !== chapter.mastery) {
      // Targeted update: a full-row upsert would overwrite review dates read before this call.
      repo.updateChapterMastery(chapterId, estimate.level, null, estimate.confidence);
      repo.recordMasteryChange(chapterId, date, chapter.mastery, estimate.level, 'estimated');
    } else if (chapter.masteryManual !== null && chapter.mastery !== chapter.masteryManual) {
      repo.updateChapterMastery(chapterId, chapter.masteryManual, chapter.masteryManual, chapter.confidence);
    }
    return effectiveMastery(repo.listChapters().find((c) => c.id === chapterId) ?? chapter);
  }

  recordRecall(
    chapterId: string,
    score: number,
    meta: { date?: ISODate; note?: string; sessionId?: string } = {},
  ): void {
    const repo = this.repository;
    const chapter = repo.listChapters().find((c) => c.id === chapterId);
    if (!chapter) return;
    const date = meta.date ?? todayISO();
    const result = scheduleReview({
      chapter,
      date,
      recallScore: score,
      intervals: repo.loadPreferences().rules.reviewIntervals,
      eventId: uid('review'),
    });
    repo.transaction(() => {
      repo.updateChapterReview(chapterId, date, result.nextDue, result.index);
      repo.insertReviewEvent({ ...result.event, note: meta.note ?? '' });
      // failed recall lowers the stored mastery (evidence, not punishment)
      const assessment = assessRecall(score);
      if (assessment.outcome === 'fail' && chapter.mastery > 1) {
        const next = Math.max(1, chapter.mastery - 1) as MasteryLevel;
        repo.updateChapterMastery(chapterId, next, chapter.masteryManual, chapter.confidence);
        repo.recordMasteryChange(chapterId, date, chapter.mastery, next, 'recall-failure');
      }
    });
    this.persistNow();
    this.bump();
  }

  // ---- mistakes, quizzes, exams -----------------------------------------
  addMistake(input: Omit<Mistake, 'id' | 'createdAt' | 'recurrenceCount' | 'resolved'> & {
    recurrenceCount?: number;
  }): void {
    const repo = this.repository;
    const existing = repo
      .listMistakes()
      .find(
        (m) =>
          m.chapterId === input.chapterId &&
          m.question.trim().toLowerCase() === input.question.trim().toLowerCase() &&
          !m.resolved,
      );
    if (existing) {
      repo.upsertMistake({
        ...existing,
        recurrenceCount: existing.recurrenceCount + 1,
        nextReview: addDays(input.date, 1),
      });
    } else {
      repo.upsertMistake({
        id: uid('mistake'),
        recurrenceCount: input.recurrenceCount ?? 1,
        resolved: false,
        createdAt: nowISO(),
        ...input,
      });
    }
    repo.appendEvent({
      id: uid('ev'),
      type: 'mistake.recorded',
      entity: 'mistakes',
      entityId: input.chapterId ?? '',
      payloadJson: JSON.stringify({ type: input.type, subjectId: input.subjectId }),
    });
    this.persistNow();
    this.bump();
  }

  resolveMistake(id: string, resolved: boolean): void {
    const repo = this.repository;
    const mistake = repo.listMistakes().find((m) => m.id === id);
    if (!mistake) return;
    repo.upsertMistake({ ...mistake, resolved, nextReview: resolved ? null : mistake.nextReview });
    this.persistNow();
    this.bump();
  }

  addQuizAttempt(input: Omit<QuizAttempt, 'id'>): void {
    const repo = this.repository;
    repo.insertQuiz({ ...input, id: uid('quiz') });
    repo.appendEvent({
      id: uid('ev'),
      type: 'quiz.recorded',
      entity: 'quizzes',
      entityId: input.chapterId ?? '',
      payloadJson: JSON.stringify({ correct: input.correct, total: input.total }),
    });
    if (input.chapterId) this.refreshChapterMastery(input.chapterId, input.date);
    this.persistNow();
    this.bump();
  }

  saveExam(exam: Omit<Exam, 'createdAt'> & { createdAt?: string }): void {
    const repo = this.repository;
    repo.upsertExam({ createdAt: nowISO(), ...exam });
    this.persistNow();
    this.bump();
  }

  deleteExam(id: string): void {
    this.repository.deleteExam(id);
    this.bump();
  }

  // ---- curriculum editing -----------------------------------------------
  saveSubject(subject: Subject): void {
    this.repository.upsertSubject(subject);
    this.bump();
  }

  saveChapter(chapter: Chapter): void {
    this.repository.upsertChapter(chapter);
    this.bump();
  }

  saveClass(universityClass: UniversityClass): void {
    this.repository.upsertUniversityClass(universityClass);
    this.bump();
  }

  deleteClass(id: string): void {
    this.repository.deleteUniversityClass(id);
    this.bump();
  }

  saveGoal(goal: Goal): void {
    this.repository.upsertGoal(goal);
    this.bump();
  }

  saveHabit(habit: Habit): void {
    this.repository.upsertHabit(habit);
    this.bump();
  }

  savePreferences(preferences: UserPreferences): void {
    this.repository.savePreferences(preferences);
    this.bump();
  }

  // ---- Phase 3: weekly reviews & adaptation logs --------------------------
  saveWeeklyReview(record: import('../domain/types').WeeklyReviewRecord): void {
    this.repository.upsertWeeklyReview(record);
    this.persistNow();
    this.bump();
  }

  saveAdaptationLog(log: import('../domain/types').AdaptationLog): void {
    this.repository.upsertAdaptationLog(log);
    this.persistNow();
    this.bump();
  }

  applyAdaptation(id: string): void {
    this.repository.markAdaptationApplied(id, nowISO());
    this.persistNow();
    this.bump();
  }

  logAdaptationSuggestions(
    suggestions: Array<{
      kind: string;
      text: string;
      reason: string;
      evidence: string;
      priority: number;
    }>,
    date: ISODate,
  ): void {
    const repo = this.repository;
    repo.transaction(() => {
      for (const s of suggestions) {
        repo.upsertAdaptationLog({
          id: uid('adapt'),
          date,
          kind: s.kind,
          text: s.text,
          reason: s.reason,
          evidenceJson: JSON.stringify({ evidence: s.evidence }),
          priority: s.priority,
          applied: false,
          appliedAt: null,
          createdAt: nowISO(),
        });
      }
    });
    this.persistNow();
    this.bump();
  }

  // ---- data portability --------------------------------------------------
  // ---- convenience helpers used by screens --------------------------------
  /** Current planning rules (personal rules live in preferences so they stay editable + exportable). */
  planningRules(): UserRules {
    return this.state.snapshot.preferences.rules;
  }

  /** True when at least one real record exists — used to show honest empty states. */
  get hasHistory(): boolean {
    const s = this.state.snapshot;
    return s.tasks.length > 0 || s.sessions.length > 0 || s.plans.length > 0;
  }

  /** Generates a plan for several consecutive days (weekly planning) without touching existing days. */
  generateDays(fromDate: ISODate, count = 7): void {
    for (let i = 0; i < count; i += 1) this.generatePlan(addDays(fromDate, i));
  }

  /** Manual task, for work the planner cannot know about. */
  addManualTask(input: {
    date: ISODate;
    title: string;
    type: StudyTask['type'];
    plannedMin: number;
    subjectId: string | null;
    chapterId: string | null;
    note?: string;
  }): StudyTask {
    const repo = this.repository;
    const now = nowISO();
    const task: StudyTask = {
      id: uid('task'),
      planId: repo.getPlan(input.date)?.id ?? null,
      planDate: input.date,
      subjectId: input.subjectId,
      chapterId: input.chapterId,
      type: input.type,
      title: input.title.trim() || 'Study task',
      plannedMin: Math.max(5, Math.round(input.plannedMin)),
      priority: 50,
      priorityLabel: 'medium',
      reasons: ['Added manually — not generated by the planner.'],
      status: 'pending',
      actualMin: 0,
      startedAt: null,
      completedAt: null,
      difficulty: null,
      note: input.note ?? '',
      origin: 'manual',
      skipCount: 0,
      deferCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    repo.upsertTask(task);
    repo.appendEvent({ id: uid('ev'), type: 'task.added', entity: 'study_tasks', entityId: task.id, payloadJson: JSON.stringify({ manual: true }) });
    this.bump();
    return task;
  }

  /** Browser-side download of a portable backup (JSON / CSV). No-op outside a DOM. */
  downloadExport(format: 'json' | 'csv'): void {
    if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;
    const isJson = format === 'json';
    const payload = isJson ? this.exportJson() : this.exportCsv();
    const blob = new Blob([payload], { type: isJson ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `study-performance-${todayISO()}.${isJson ? 'json' : 'csv'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  /** Full database file (SQLite bytes) as a downloadable backup. */
  downloadDatabase(): void {
    if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;
    const bytes = this.exportDatabaseBytes();
    const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `study-performance-${todayISO()}.sqlite`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  exportJson(): string {
    const snapshot = this.state.snapshot;
    return JSON.stringify(
      {
        format: 'study-performance-system',
        version: 1,
        exportedAt: nowISO(),
        data: snapshot,
      },
      null,
      2,
    );
  }

  exportCsv(): string {
    const rows: string[] = ['date,subject,type,title,planned_min,actual_min,status,origin'];
    for (const task of this.state.snapshot.tasks) {
      const subject = this.state.snapshot.subjects.find((s) => s.id === task.subjectId)?.shortName ?? '';
      rows.push(
        [
          task.planDate,
          csvCell(subject),
          task.type,
          csvCell(task.title),
          task.plannedMin,
          task.actualMin,
          task.status,
          task.origin,
        ].join(','),
      );
    }
    rows.push('');
    rows.push('date,subject,start,end,duration_min,effective_min,active_recall,interruptions');
    for (const session of this.state.snapshot.sessions) {
      const subject = this.state.snapshot.subjects.find((s) => s.id === session.subjectId)?.shortName ?? '';
      rows.push(
        [
          session.date,
          csvCell(subject),
          session.startTime,
          session.endTime,
          session.durationMin,
          session.effectiveMin,
          session.activeRecall ? 1 : 0,
          session.interruptions,
        ].join(','),
      );
    }
    return rows.join('\n');
  }

  /** Raw database backup (SQLite bytes) — restorable without any external service. */
  exportDatabaseBytes(): Uint8Array {
    return this.repository.client.exportBytes();
  }

  async importJson(payload: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    let parsed: { data?: Partial<Snapshot> } | null = null;
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      return { imported: 0, errors: [`Invalid JSON: ${(error as Error).message}`] };
    }
    const data = parsed?.data;
    if (!data || typeof data !== 'object') {
      return { imported: 0, errors: ['Missing "data" object — expected an export produced by this app.'] };
    }
    const repo = this.repository;
    let counted = 0;
    /**
     * Backup files are user-supplied, so each list is validated before it is written:
     * usable rows are imported, junk rows are reported and skipped.
     */
    const rows = <T>(value: unknown, group: string): T[] => {
      if (value === undefined || value === null) return [];
      if (!Array.isArray(value)) {
        errors.push(`"${group}" is not a list — skipped.`);
        return [];
      }
      const valid: T[] = [];
      let skipped = 0;
      for (const row of value) {
        const id = (row as { id?: unknown } | null)?.id;
        if (row !== null && typeof row === 'object' && typeof id === 'string' && id.length > 0) {
          valid.push(row as T);
        } else {
          skipped += 1;
        }
      }
      if (skipped > 0) errors.push(`${skipped} invalid record(s) in "${group}" were skipped.`);
      counted += valid.length;
      return valid;
    };

    try {
      repo.transaction(() => {
        rows<Subject>(data.subjects, 'subjects').forEach((s) => repo.upsertSubject(s));
        rows<Chapter>(data.chapters, 'chapters').forEach((c) => repo.upsertChapter(c));
        rows<UniversityClass>(data.timetable, 'timetable').forEach((c) => repo.upsertUniversityClass(c));
        rows<StudyTask>(data.tasks, 'tasks').forEach((t) => repo.upsertTask(t));
        // Sessions use an upsert so restoring a backup over existing history is repeatable.
        rows<StudySession>(data.sessions, 'sessions').forEach((s) => repo.upsertSession(s));
        rows<Exam>(data.exams, 'exams').forEach((e) => repo.upsertExam(e));
        rows<Mistake>(data.mistakes, 'mistakes').forEach((m) => repo.upsertMistake(m));
        rows<Goal>(data.goals, 'goals').forEach((g) => repo.upsertGoal(g));
        rows<Habit>(data.habits, 'habits').forEach((h) => repo.upsertHabit(h));
        if (data.preferences) repo.savePreferences(data.preferences);
      });
      imported = counted;
    } catch (error) {
      // The transaction rolled back, so nothing was written: say so instead of leaving the user
      // staring at a button that appears to do nothing.
      return {
        imported: 0,
        errors: [...errors, `Import failed: ${(error as Error).message}. Nothing was changed.`],
      };
    }
    this.bump();
    return { imported, errors };
  }

  resetAll(): void {
    this.repository.wipe();
    applySeed(this.repository);
    this.setState({ snapshot: this.repository ? loadSnapshot(this.repository) : EMPTY_SNAPSHOT, revision: this.state.revision + 1 });
    this.persistNow();
  }

  // ---- helpers -----------------------------------------------------------
  private findTask(taskId: string): StudyTask | null {
    return this.repository.client.get<Record<string, unknown>>(`SELECT * FROM study_tasks WHERE id = ?`, [taskId])
      ? this.state.snapshot.tasks.find((t) => t.id === taskId) ?? null
      : null;
  }
}

// ---------------------------------------------------------------------------
// pure helpers
// ---------------------------------------------------------------------------

export function loadSnapshot(repo: Repository): Snapshot {
  return {
    subjects: repo.listSubjects(),
    chapters: repo.listChapters(),
    timetable: repo.listUniversityClasses(),
    plans: repo.listPlans(),
    tasks: repo.listTasks(),
    sessions: repo.listSessions(),
    checkIns: repo.listCheckIns(),
    reviews: repo.listDailyReviews(),
    exams: repo.listExams(),
    quizzes: repo.listQuizzes(),
    mistakes: repo.listMistakes(),
    reviewEvents: repo.listReviewEvents(),
    backlog: repo.listBacklog(),
    goals: repo.listGoals(),
    habits: repo.listHabits(),
    achievements: repo.listAchievements(),
    insights: repo.listInsights(),
    weeklyReviews: repo.listWeeklyReviews(),
    adaptationLogs: repo.listAdaptationLogs(),
    preferences: repo.loadPreferences(),
  };
}

function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const outH = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const outM = String(total % 60).padStart(2, '0');
  return `${outH}:${outM}`;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Minimal day aggregation used by store-side insight/achievement refreshes. */
export function buildDayWindows(snapshot: Snapshot, today: ISODate) {
  const dates: ISODate[] = [];
  const first = snapshot.tasks.reduce<ISODate | null>(
    (acc, t) => (acc === null || t.planDate < acc ? t.planDate : acc),
    null,
  );
  const start = first && daysBetween(first, today) < 400 ? first : addDays(today, -120);
  for (let d = start; d <= today; d = addDays(d, 1)) dates.push(d);
  return dates.map((date) => {
    const tasks = snapshot.tasks.filter((t) => t.planDate === date);
    const sessions = snapshot.sessions.filter((s) => s.date === date);
    const completedTasks = tasks.filter((t) => t.status === 'done');
    const decided = tasks.filter((t) => t.status === 'done' || t.status === 'skipped');
    const effective = sessions.reduce((acc, s) => acc + (s.effectiveMin || s.durationMin), 0);
    const hadPlan = snapshot.plans.some((p) => p.date === date) || tasks.length > 0;
    return {
      date,
      plannedMin: tasks.reduce((acc, t) => acc + t.plannedMin, 0),
      completedMin: completedTasks.reduce((acc, t) => acc + t.actualMin, 0),
      effectiveMin: effective,
      tasks,
      completedTasks,
      skippedTasks: tasks.filter((t) => t.status === 'skipped'),
      sessions,
      hadPlan,
      completedTaskCount: completedTasks.length,
      totalTaskCount: tasks.length,
      completionRate: decided.length === 0 ? (completedTasks.length > 0 ? 1 : 0) : completedTasks.length / decided.length,
      active: completedTasks.length > 0 || effective >= 20,
      missed: hadPlan && completedTasks.length === 0,
    };
  });
}
