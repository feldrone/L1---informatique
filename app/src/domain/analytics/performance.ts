/**
 * Performance analytics — Progress Intelligence (Phase 3).
 *
 * Deterministic, transparent metrics derived strictly from stored tasks/sessions/
 * mistakes/quizzes. No estimation, no external calls, no invented baselines.
 *
 * Covers:
 *  - overall performance over a window
 *  - per-subject performance
 *  - per-task-type performance
 *  - focus & interruption metrics
 *  - velocity & trend
 */

import type {
  Chapter,
  Mistake,
  QuizAttempt,
  StudySession,
  StudyTask,
  Subject,
} from '../types';
import type { ISODate } from '../date';
import { addDays, daysBetween } from '../date';
import { effectiveMinutes, mean, pct, sum, type DayAggregate } from './common';

export interface TaskTypePerformance {
  type: StudyTask['type'];
  total: number;
  done: number;
  skipped: number;
  completionRate: number; // 0..100
  totalPlannedMin: number;
  totalActualMin: number;
  avgPlannedMin: number;
  avgActualMin: number;
  efficiency: number; // actual / planned *100
  evidence: string;
}

export interface FocusMetrics {
  totalSessions: number;
  focusSessions: number;
  openSessions: number;
  shortStartSessions: number;
  totalMin: number;
  effectiveMin: number;
  avgDuration: number;
  avgInterruptions: number;
  interruptionRate: number; // interruptions per hour
  avgOutcomeRating: number | null;
  activeRecallSessions: number;
  activeRecallShare: number; // 0..100
  avgRecallScore: number | null;
  outcomeDistribution: {
    rated: number;
    unrated: number;
    avg: number | null;
  };
  evidence: string;
}

export interface VelocityMetrics {
  tasksPerActiveDay: number;
  minutesPerActiveDay: number;
  effectivePerActiveDay: number;
  activeDays: number;
  totalDays: number;
  consistency: number; // active / total
  trend: {
    direction: 'up' | 'down' | 'stable';
    percent: number | null;
    evidence: string;
  };
}

export interface SubjectPerformance {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  tasks: {
    total: number;
    done: number;
    skipped: number;
    completionRate: number;
  };
  time: {
    plannedMin: number;
    actualMin: number;
    effectiveMin: number;
    efficiency: number;
    share: number; // % of total effective
  };
  mastery: {
    avg: number | null;
    chapters: number;
    examReady: number;
    atRisk: number;
  };
  mistakes: {
    open: number;
    total: number;
    recurrenceAvg: number;
  };
  quizzes: {
    accuracy: number | null;
    questions: number;
  };
  trend: {
    completionDelta: number | null;
    timeDelta: number | null;
  };
  evidence: string;
}

export interface PerformanceSummary {
  from: ISODate;
  to: ISODate;
  label: string;
  windowDays: number;
  overall: {
    tasksTotal: number;
    tasksDone: number;
    tasksSkipped: number;
    completionRate: number;
    plannedMin: number;
    actualMin: number;
    effectiveMin: number;
    efficiency: number;
    activeDays: number;
    plannedDays: number;
  };
  byTaskType: TaskTypePerformance[];
  focus: FocusMetrics;
  velocity: VelocityMetrics;
  bySubject: SubjectPerformance[];
  strongestSubject: SubjectPerformance | null;
  weakestSubject: SubjectPerformance | null;
  mostEfficientTaskType: TaskTypePerformance | null;
  leastEfficientTaskType: TaskTypePerformance | null;
  insufficientData: boolean;
}

function buildTaskTypePerformance(tasks: StudyTask[]): TaskTypePerformance[] {
  const types = [...new Set(tasks.map((t) => t.type))].sort();
  return types.map((type) => {
    const list = tasks.filter((t) => t.type === type);
    const total = list.length;
    const done = list.filter((t) => t.status === 'done').length;
    const skipped = list.filter((t) => t.status === 'skipped').length;
    const decided = done + skipped;
    const completionRate = decided === 0 ? 0 : pct(done, decided);
    const totalPlannedMin = sum(list.map((t) => t.plannedMin));
    const totalActualMin = sum(list.filter((t) => t.status === 'done').map((t) => t.actualMin));
    const avgPlannedMin = total === 0 ? 0 : Math.round(totalPlannedMin / total);
    const avgActualMin = done === 0 ? 0 : Math.round(totalActualMin / done);
    const efficiency = totalPlannedMin === 0 ? 0 : Math.round((totalActualMin / totalPlannedMin) * 1000) / 10;
    return {
      type,
      total,
      done,
      skipped,
      completionRate,
      totalPlannedMin,
      totalActualMin,
      avgPlannedMin,
      avgActualMin,
      efficiency,
      evidence: `${done}/${total} done (${completionRate}%), ${totalPlannedMin} planned → ${totalActualMin} actual`,
    };
  });
}

function buildFocusMetrics(sessions: StudySession[]): FocusMetrics {
  const totalSessions = sessions.length;
  const focusSessions = sessions.filter((s) => s.mode === 'focus').length;
  const openSessions = sessions.filter((s) => s.mode === 'open').length;
  const shortStartSessions = sessions.filter((s) => s.mode === 'short-start').length;
  const totalMin = sum(sessions.map((s) => s.durationMin));
  const effectiveMin = sum(sessions.map((s) => effectiveMinutes(s)));
  const avgDuration = totalSessions === 0 ? 0 : Math.round(totalMin / totalSessions);
  const totalInterruptions = sum(sessions.map((s) => s.interruptions));
  const avgInterruptions = totalSessions === 0 ? 0 : Math.round((totalInterruptions / totalSessions) * 10) / 10;
  const interruptionRate = totalMin === 0 ? 0 : Math.round((totalInterruptions / (totalMin / 60)) * 10) / 10;
  const rated = sessions.filter((s) => s.outcomeRating !== null);
  const avgOutcomeRating =
    rated.length === 0 ? null : Math.round((sum(rated.map((s) => s.outcomeRating as number)) / rated.length) * 10) / 10;
  const activeRecallSessions = sessions.filter((s) => s.activeRecall).length;
  const activeRecallShare = totalSessions === 0 ? 0 : Math.round((activeRecallSessions / totalSessions) * 1000) / 10;
  const recallScores = sessions.filter((s) => s.recallScore !== null).map((s) => s.recallScore as number);
  const avgRecallScore = recallScores.length === 0 ? null : Math.round(mean(recallScores) * 100) / 100;

  return {
    totalSessions,
    focusSessions,
    openSessions,
    shortStartSessions,
    totalMin,
    effectiveMin,
    avgDuration,
    avgInterruptions,
    interruptionRate,
    avgOutcomeRating,
    activeRecallSessions,
    activeRecallShare,
    avgRecallScore,
    outcomeDistribution: {
      rated: rated.length,
      unrated: totalSessions - rated.length,
      avg: avgOutcomeRating,
    },
    evidence:
      totalSessions === 0
        ? 'No sessions recorded'
        : `${totalSessions} session(s), ${effectiveMin} effective / ${totalMin} total, ${avgInterruptions} avg interruptions, ${activeRecallShare}% active recall`,
  };
}

function buildVelocityMetrics(days: DayAggregate[], from: ISODate, to: ISODate, previousDays?: DayAggregate[]): VelocityMetrics {
  const window = days.filter((d) => d.date >= from && d.date <= to);
  const activeDays = window.filter((d) => d.active).length;
  const totalDays = window.length;
  const totalTasksDone = sum(window.map((d) => d.completedTaskCount));
  const totalEffective = sum(window.map((d) => d.effectiveMin));
  const totalCompletedMin = sum(window.map((d) => d.completedMin));

  const tasksPerActiveDay = activeDays === 0 ? 0 : Math.round((totalTasksDone / activeDays) * 10) / 10;
  const minutesPerActiveDay = activeDays === 0 ? 0 : Math.round(totalCompletedMin / activeDays);
  const effectivePerActiveDay = activeDays === 0 ? 0 : Math.round(totalEffective / activeDays);
  const consistency = totalDays === 0 ? 0 : Math.round((activeDays / totalDays) * 1000) / 10;

  let trend: VelocityMetrics['trend'] = {
    direction: 'stable',
    percent: null,
    evidence: 'No previous period for comparison',
  };
  if (previousDays && previousDays.length > 0) {
    const prevActive = previousDays.filter((d) => d.active).length;
    const prevEffective = sum(previousDays.map((d) => d.effectiveMin));
    const prevAvg = prevActive === 0 ? 0 : prevEffective / prevActive;
    const currAvg = activeDays === 0 ? 0 : totalEffective / activeDays;
    if (prevAvg > 0) {
      const delta = Math.round(((currAvg - prevAvg) / prevAvg) * 1000) / 10;
      trend = {
        direction: delta > 10 ? 'up' : delta < -10 ? 'down' : 'stable',
        percent: delta,
        evidence: `${currAvg.toFixed(0)} effective min/active day now vs ${prevAvg.toFixed(0)} before (${prevActive} active days in previous window)`,
      };
    }
  }

  return {
    tasksPerActiveDay,
    minutesPerActiveDay,
    effectivePerActiveDay,
    activeDays,
    totalDays,
    consistency,
    trend,
  };
}

export function computePerformance(input: {
  from: ISODate;
  to: ISODate;
  label: string;
  days: DayAggregate[];
  tasks: StudyTask[];
  sessions: StudySession[];
  subjects: Subject[];
  chapters: Chapter[];
  mistakes: Mistake[];
  quizzes: QuizAttempt[];
  previous?: { from: ISODate; to: ISODate };
}): PerformanceSummary {
  const { from, to, label, days, tasks, sessions, subjects, chapters, mistakes, quizzes } = input;
  const windowDays = Math.max(1, daysBetween(from, to) + 1);

  const windowTasks = tasks.filter((t) => t.planDate >= from && t.planDate <= to);
  const windowSessions = sessions.filter((s) => s.date >= from && s.date <= to);
  const windowMistakes = mistakes.filter((m) => m.date >= from && m.date <= to);
  void windowMistakes; // used in per-subject breakdown

  const tasksTotal = windowTasks.filter((t) => t.status !== 'deferred').length;
  const tasksDone = windowTasks.filter((t) => t.status === 'done').length;
  const tasksSkipped = windowTasks.filter((t) => t.status === 'skipped').length;
  const decided = tasksDone + tasksSkipped;
  const completionRate = decided === 0 ? 0 : pct(tasksDone, decided);
  const plannedMin = sum(windowTasks.map((t) => t.plannedMin));
  const actualMin = sum(windowTasks.filter((t) => t.status === 'done').map((t) => t.actualMin));
  const effectiveMin = sum(windowSessions.map((s) => effectiveMinutes(s)));
  const efficiency = plannedMin === 0 ? 0 : Math.round((actualMin / plannedMin) * 1000) / 10;
  const activeDays = days.filter((d) => d.date >= from && d.date <= to && d.active).length;
  const plannedDays = days.filter((d) => d.date >= from && d.date <= to && d.hadPlan).length;

  const byTaskType = buildTaskTypePerformance(windowTasks);
  const focus = buildFocusMetrics(windowSessions);

  const previousDays = input.previous
    ? days.filter((d) => d.date >= input.previous!.from && d.date <= input.previous!.to)
    : undefined;
  const velocity = buildVelocityMetrics(days, from, to, previousDays);

  const totalEffective = effectiveMin;

  const bySubject: SubjectPerformance[] = subjects
    .filter((s) => s.active)
    .map((subject) => {
      const subjTasks = windowTasks.filter((t) => t.subjectId === subject.id);
      const subjSessions = windowSessions.filter((s) => s.subjectId === subject.id);
      const subjChapters = chapters.filter((c) => c.subjectId === subject.id);
      const subjMistakes = mistakes.filter((m) => m.subjectId === subject.id);
      const subjQuizzes = quizzes.filter((q) => q.subjectId === subject.id);

      const subjTotal = subjTasks.filter((t) => t.status !== 'deferred').length;
      const subjDone = subjTasks.filter((t) => t.status === 'done').length;
      const subjSkipped = subjTasks.filter((t) => t.status === 'skipped').length;
      const subjDecided = subjDone + subjSkipped;
      const subjCompletion = subjDecided === 0 ? 0 : pct(subjDone, subjDecided);

      const subjPlanned = sum(subjTasks.map((t) => t.plannedMin));
      const subjActual = sum(subjTasks.filter((t) => t.status === 'done').map((t) => t.actualMin));
      const subjEffective = sum(subjSessions.map((s) => effectiveMinutes(s)));
      const subjEfficiency = subjPlanned === 0 ? 0 : Math.round((subjActual / subjPlanned) * 1000) / 10;
      const share = totalEffective === 0 ? 0 : Math.round((subjEffective / totalEffective) * 1000) / 10;

      const masteryAvg =
        subjChapters.length === 0 ? null : Math.round((sum(subjChapters.map((c) => c.mastery)) / subjChapters.length) * 100) / 100;
      const examReady = subjChapters.filter((c) => c.mastery === 5).length;
      const atRisk = subjChapters.filter((c) => c.mastery <= 1 && c.masteryManual === null).length;

      const openMistakes = subjMistakes.filter((m) => !m.resolved).length;
      const recurrenceAvg =
        subjMistakes.length === 0 ? 0 : Math.round((sum(subjMistakes.map((m) => m.recurrenceCount)) / subjMistakes.length) * 10) / 10;

      const quizQuestions = sum(subjQuizzes.map((q) => q.total));
      const quizCorrect = sum(subjQuizzes.map((q) => q.correct));
      const quizAccuracy = quizQuestions === 0 ? null : Math.round((quizCorrect / quizQuestions) * 1000) / 10;

      // trend vs previous
      let completionDelta: number | null = null;
      let timeDelta: number | null = null;
      if (input.previous) {
        const prevTasks = tasks.filter((t) => t.subjectId === subject.id && t.planDate >= input.previous!.from && t.planDate <= input.previous!.to);
        const prevDone = prevTasks.filter((t) => t.status === 'done').length;
        const prevDecided = prevDone + prevTasks.filter((t) => t.status === 'skipped').length;
        const prevCompletion = prevDecided === 0 ? null : pct(prevDone, prevDecided);
        if (prevCompletion !== null) completionDelta = Math.round((subjCompletion - prevCompletion) * 10) / 10;

        const prevSessions = sessions.filter((s) => s.subjectId === subject.id && s.date >= input.previous!.from && s.date <= input.previous!.to);
        const prevEffective = sum(prevSessions.map((s) => effectiveMinutes(s)));
        if (prevEffective > 0) timeDelta = Math.round(((subjEffective - prevEffective) / prevEffective) * 1000) / 10;
      }

      return {
        subjectId: subject.id,
        name: subject.name,
        shortName: subject.shortName,
        color: subject.color,
        tasks: {
          total: subjTotal,
          done: subjDone,
          skipped: subjSkipped,
          completionRate: subjCompletion,
        },
        time: {
          plannedMin: subjPlanned,
          actualMin: subjActual,
          effectiveMin: subjEffective,
          efficiency: subjEfficiency,
          share,
        },
        mastery: {
          avg: masteryAvg,
          chapters: subjChapters.length,
          examReady,
          atRisk,
        },
        mistakes: {
          open: openMistakes,
          total: subjMistakes.length,
          recurrenceAvg,
        },
        quizzes: {
          accuracy: quizAccuracy,
          questions: quizQuestions,
        },
        trend: {
          completionDelta,
          timeDelta,
        },
        evidence: `${subjDone}/${subjTotal} tasks (${subjCompletion}%), ${subjEffective} effective min (${share}% of total), mastery avg ${masteryAvg ?? 'n/a'}`,
      };
    })
    .filter((s) => s.tasks.total > 0 || s.time.effectiveMin > 0)
    .sort((a, b) => b.time.effectiveMin - a.time.effectiveMin);

  const strongestSubject = bySubject.length > 0 ? [...bySubject].sort((a, b) => b.tasks.completionRate - a.tasks.completionRate)[0] : null;
  const weakestSubject = bySubject.length > 0 ? [...bySubject].sort((a, b) => a.tasks.completionRate - b.tasks.completionRate)[0] : null;

  const mostEfficientTaskType =
    byTaskType.length > 0 ? [...byTaskType].sort((a, b) => b.efficiency - a.efficiency)[0] : null;
  const leastEfficientTaskType =
    byTaskType.length > 0 ? [...byTaskType].sort((a, b) => a.efficiency - b.efficiency)[0] : null;

  const insufficientData = tasksTotal < 3 && windowSessions.length < 2;

  return {
    from,
    to,
    label,
    windowDays,
    overall: {
      tasksTotal,
      tasksDone,
      tasksSkipped,
      completionRate,
      plannedMin,
      actualMin,
      effectiveMin,
      efficiency,
      activeDays,
      plannedDays,
    },
    byTaskType,
    focus,
    velocity,
    bySubject,
    strongestSubject,
    weakestSubject,
    mostEfficientTaskType,
    leastEfficientTaskType,
    insufficientData,
  };
}

export function computeCurrentWeekPerformance(input: {
  today: ISODate;
  days: DayAggregate[];
  tasks: StudyTask[];
  sessions: StudySession[];
  subjects: Subject[];
  chapters: Chapter[];
  mistakes: Mistake[];
  quizzes: QuizAttempt[];
}): PerformanceSummary {
  const weekStart = addDays(input.today, -((new Date(`${input.today}T12:00:00`).getDay() + 6) % 7));
  const weekEnd = addDays(weekStart, 6);
  const prevStart = addDays(weekStart, -7);
  const prevEnd = addDays(weekStart, -1);
  return computePerformance({
    from: weekStart,
    to: weekEnd,
    label: `Week ${weekStart} → ${weekEnd}`,
    days: input.days,
    tasks: input.tasks,
    sessions: input.sessions,
    subjects: input.subjects,
    chapters: input.chapters,
    mistakes: input.mistakes,
    quizzes: input.quizzes,
    previous: { from: prevStart, to: prevEnd },
  });
}
