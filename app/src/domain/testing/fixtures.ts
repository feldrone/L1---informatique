/**
 * Deterministic fixtures for the planning/analytics test-suite.
 * They mirror the shape of real seeded data (L1 SINF) without depending on the database.
 */

import type {
  BacklogItem,
  Chapter,
  CheckIn,
  DailyPlan,
  Exam,
  StudySession,
  StudyTask,
  Subject,
  UniversityClass,
  UserRules,
} from '../types';
import { addDays, dayOfWeek, type ISODate } from '../date';
import type { BehaviourSignals, PlanningContext, RecoveryInput } from '../planning/types';

export const T = {
  monday: '2026-10-05',
  tuesday: '2026-10-06',
  wednesday: '2026-10-07',
  thursday: '2026-10-08',
  saturday: '2026-10-10',
  sunday: '2026-10-11',
} as const;

export const BASE_RULES: UserRules = {
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
};

export function makeSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: 'sub-analyse1',
    code: 'AN1',
    name: 'Analyse 1',
    shortName: 'Analyse 1',
    unit: 'UEF11',
    semester: 'S1',
    coefficient: 4,
    credits: 6,
    color: '#4f7ef7',
    difficulty: 4,
    weeklyTargetMin: 300,
    aliases: [],
    provenance: 'partial',
    active: true,
    sortOrder: 0,
    ...overrides,
  };
}

export function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'an1-c1',
    subjectId: 'sub-analyse1',
    order: 0,
    title: 'Ch I — Le corps des réels',
    kind: 'course',
    prerequisiteIds: [],
    expectedMin: 240,
    sourceLabel: 'Programme de la matière — UBMA 2020-2021',
    sourceRef: 'resources/...',
    mastery: 0,
    masteryManual: null,
    confidence: 0,
    lastRevisionDate: null,
    nextRevisionDate: null,
    reviewIntervalIndex: 0,
    notes: '',
    ...overrides,
  };
}

export function makeTask(overrides: Partial<StudyTask> = {}): StudyTask {
  const planDate = overrides.planDate ?? T.monday;
  return {
    id: overrides.id ?? `task-${planDate}-${Math.random().toString(36).slice(2, 7)}`,
    planId: null,
    planDate,
    subjectId: 'sub-analyse1',
    chapterId: 'an1-c1',
    type: 'COURSE',
    title: 'Study & summarise',
    plannedMin: 45,
    priority: 50,
    priorityLabel: 'Medium',
    reasons: [],
    status: 'pending',
    actualMin: 0,
    startedAt: null,
    completedAt: null,
    difficulty: null,
    note: '',
    origin: 'planner',
    skipCount: 0,
    deferCount: 0,
    createdAt: `${planDate}T08:00:00.000Z`,
    updatedAt: `${planDate}T08:00:00.000Z`,
    ...overrides,
  };
}

export function makeSession(overrides: Partial<StudySession> = {}): StudySession {
  const date = overrides.date ?? T.monday;
  return {
    id: overrides.id ?? `session-${date}-${Math.random().toString(36).slice(2, 7)}`,
    taskId: null,
    subjectId: 'sub-analyse1',
    chapterId: 'an1-c1',
    date,
    startTime: '09:00',
    endTime: '10:00',
    durationMin: 60,
    effectiveMin: 55,
    mode: 'focus',
    interruptions: 0,
    outcomeRating: null,
    activeRecall: false,
    recallScore: null,
    note: '',
    createdAt: `${date}T10:00:00.000Z`,
    ...overrides,
  };
}

export function makeExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: 'exam-an1',
    subjectId: 'sub-analyse1',
    name: 'EMD Analyse 1',
    date: T.thursday,
    weight: 1,
    difficulty: 3,
    syllabusChapterIds: [],
    prepStatus: 0,
    kind: 'EMD',
    room: '',
    note: '',
    createdAt: '2026-09-25T08:00:00.000Z',
    ...overrides,
  };
}

export function makeClass(overrides: Partial<UniversityClass> = {}): UniversityClass {
  return {
    id: overrides.id ?? `class-${Math.random().toString(36).slice(2, 7)}`,
    subjectId: 'sub-analyse1',
    dayOfWeek: dayOfWeek(T.monday),
    startTime: '08:00',
    endTime: '09:30',
    kind: 'CM',
    room: '',
    groupLabel: '',
    instructor: '',
    weekParity: 'all',
    active: true,
    provenance: 'to-confirm',
    ...overrides,
  };
}

export function makePlan(overrides: Partial<DailyPlan> = {}): DailyPlan {
  return {
    id: `plan-${overrides.date ?? T.monday}`,
    date: T.monday,
    generatedAt: '2026-10-05T07:00:00.000Z',
    mode: 'normal',
    availableMin: 240,
    bufferMin: 40,
    plannedMin: 200,
    energy: 3,
    rationale: '',
    inputsJson: '{}',
    ...overrides,
  };
}

export const NEUTRAL_BEHAVIOUR: BehaviourSignals = {
  completionRate7d: 0.8,
  overshootRatio: 0,
  undershootRatio: 0,
  skipCountBySubject: {},
  strugglingSubjectIds: [],
  averageOutcomeRating: 3,
  sessionsLast7d: 4,
};

export function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: 'checkin-1',
    date: T.monday,
    availableMin: 240,
    energy: 4,
    sleepQuality: 4,
    urgentWork: '',
    classNote: '',
    createdAt: '2026-10-05T07:00:00.000Z',
    ...overrides,
  };
}

export function makeContext(overrides: Partial<PlanningContext> = {}): PlanningContext {
  const date = overrides.date ?? T.monday;
  return {
    date,
    now: `${date}T07:30:00.000Z`,
    subjects: [makeSubject()],
    chapters: [makeChapter()],
    timetable: [],
    exams: [],
    overdueTasks: [],
    backlog: [],
    sessions: [],
    recentTasks: [],
    checkIn: makeCheckIn({ date }),
    rules: BASE_RULES,
    behaviour: NEUTRAL_BEHAVIOUR,
    missedDays: 0,
    ...overrides,
  };
}

export function makeBacklogItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: overrides.id ?? `bl-${Math.random().toString(36).slice(2, 7)}`,
    taskId: null,
    subjectId: 'sub-analyse1',
    chapterId: 'an1-c1',
    originalDate: addDays(T.monday, -2),
    minutes: 45,
    type: 'COURSE',
    title: 'Missed course work',
    urgency: 0,
    weight: 0,
    dependencyDepth: 0,
    masteryImpact: 0,
    score: 0,
    classification: 'distribute',
    state: 'open',
    plannedFor: null,
    createdAt: '2026-10-03T08:00:00.000Z',
    ...overrides,
  };
}

export function makeRecoveryInput(overrides: Partial<RecoveryInput> = {}): RecoveryInput {
  return {
    date: T.monday,
    missedDays: 1,
    overdueTasks: [],
    backlog: [],
    subjects: [makeSubject()],
    chapters: [makeChapter()],
    exams: [],
    rules: BASE_RULES,
    todayCapacityMin: 180,
    preset: 'auto',
    ...overrides,
  };
}

/** Builds `n` consecutive completed days of study ending at `end` (exclusive). */
export function makeHistoryDays(params: {
  end: ISODate;
  days: number;
  minutesPerDay: number;
  subjectId?: string;
  chapterId?: string;
}): { tasks: StudyTask[]; sessions: StudySession[] } {
  const tasks: StudyTask[] = [];
  const sessions: StudySession[] = [];
  for (let i = 1; i <= params.days; i += 1) {
    const date = addDays(params.end, -i);
    tasks.push(
      makeTask({
        id: `hist-task-${date}`,
        planDate: date,
        subjectId: params.subjectId ?? 'sub-analyse1',
        chapterId: params.chapterId ?? 'an1-c1',
        status: 'done',
        actualMin: params.minutesPerDay,
        plannedMin: params.minutesPerDay,
      }),
    );
    sessions.push(
      makeSession({
        id: `hist-session-${date}`,
        date,
        subjectId: params.subjectId ?? 'sub-analyse1',
        chapterId: params.chapterId ?? 'an1-c1',
        durationMin: params.minutesPerDay,
        effectiveMin: params.minutesPerDay,
      }),
    );
  }
  return { tasks, sessions };
}
