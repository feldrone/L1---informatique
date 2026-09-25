/**
 * Analytics test-suite (spec add-on §27 + base §44): correctness of every percentage, streak,
 * balance and period statistic, including date-boundary and empty-history edge cases.
 */

import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek, daysBetween, fromISODate, lastNDays, startOfWeek, toISODate } from '../date';
import {
  ACTIVE_DAY_MIN_MINUTES,
  aggregateDay,
  buildTimeline,
  effectiveMinutes,
  pct,
} from './common';
import { computeStreaks, computeConsistency } from './streaks';
import { computeTodayProgress, computePeriodSummary, computeSubjectDistribution, computeWeeklyStats } from './progress';
import { computeHeatmap, levelForTime, levelForPercent, computeHabitMatrix } from './heatmap';
import { computeSubjectBalance } from './balance';
import { generateInsights } from './insights';
import { computeGoalProgress, evaluateAchievements } from './goals';
import { BASE_RULES, makeChapter, makePlan, makeSession, makeSubject, makeTask, makeGoalFixture, T } from './testFixtures';

const analyse = makeSubject();
const algebre = makeSubject({ id: 'sub-algebre1', name: 'Algèbre 1', shortName: 'Algèbre 1', coefficient: 2 });

describe('progress percentage', () => {
  it('computes today progress from real tasks and sessions', () => {
    const tasks = [
      makeTask({ id: 't1', planDate: T.monday, status: 'done', actualMin: 45, plannedMin: 45 }),
      makeTask({ id: 't2', planDate: T.monday, status: 'done', actualMin: 30, plannedMin: 45 }),
      makeTask({ id: 't3', planDate: T.monday, status: 'pending', plannedMin: 30 }),
      makeTask({ id: 't4', planDate: T.monday, status: 'skipped', plannedMin: 30 }),
    ];
    const progress = computeTodayProgress({ date: T.monday, tasks, sessions: [] });
    expect(progress.plannedMin).toBe(150);
    expect(progress.completedMin).toBe(75);
    expect(progress.percent).toBe(50);
    expect(progress.tasksDone).toBe(2);
    expect(progress.tasksTotal).toBe(4);
    expect(progress.tasksSkipped).toBe(1);
    expect(progress.remainingMin).toBe(75);
  });

  it('handles 0 completed tasks, 1 completed task and 100 % completion', () => {
    const zero = computeTodayProgress({
      date: T.monday,
      tasks: [makeTask({ planDate: T.monday, status: 'pending' })],
      sessions: [],
    });
    expect(zero.percent).toBe(0);

    const one = computeTodayProgress({
      date: T.monday,
      tasks: [
        makeTask({ id: 'a', planDate: T.monday, status: 'done', actualMin: 30, plannedMin: 30 }),
        makeTask({ id: 'b', planDate: T.monday, status: 'pending', plannedMin: 30 }),
      ],
      sessions: [],
    });
    expect(one.percent).toBe(50);

    const full = computeTodayProgress({
      date: T.monday,
      tasks: [makeTask({ planDate: T.monday, status: 'done', actualMin: 60, plannedMin: 60 })],
      sessions: [],
    });
    expect(full.percent).toBe(100);
  });

  it('never divides by zero on an empty day', () => {
    const progress = computeTodayProgress({ date: T.monday, tasks: [], sessions: [] });
    expect(progress.percent).toBe(0);
    expect(progress.plannedMin).toBe(0);
  });
});

describe('effective minutes', () => {
  it('weights active work above passive reading and never inflates time', () => {
    const focus = makeSession({ mode: 'focus', activeRecall: true, durationMin: 60, effectiveMin: 0 });
    const open = makeSession({ mode: 'open', activeRecall: false, durationMin: 60, effectiveMin: 0 });
    expect(effectiveMinutes(focus)).toBe(60);
    expect(effectiveMinutes(open)).toBe(36);
    expect(effectiveMinutes(open)).toBeLessThan(60);
  });
});

describe('streaks and missed-day detection', () => {
  const plan = (date: string) => makePlan({ date });
  const days = buildTimeline({
    from: addDays(T.monday, -9),
    to: T.monday,
    plans: lastNDays(T.monday, 10).map(plan),
    tasks: [
      // active run: 6 days, then a missed day, then 2 active days
      ...lastNDays(T.monday, 10).map((date, index) =>
        makeTask({
          id: `t-${date}`,
          planDate: date,
          status: index === 6 ? 'skipped' : 'done',
          actualMin: index === 6 ? 0 : 40,
          plannedMin: 40,
        }),
      ),
    ],
    sessions: [],
  });

  it('reports current streak, longest streak and missed days without punishment', () => {
    const streaks = computeStreaks(days, T.monday);
    expect(streaks.missedDays).toBe(1);
    expect(streaks.longestStreak).toBeGreaterThanOrEqual(5);
    expect(streaks.currentStreak).toBe(3);
    expect(streaks.recoveryStreak).toBeGreaterThanOrEqual(2);
    expect(streaks.missedYesterday).toBe(false);
  });

  it('does not break the streak while today is still unfinished', () => {
    const onlyYesterday = buildTimeline({
      from: addDays(T.monday, -2),
      to: T.monday,
      plans: [makePlan({ date: addDays(T.monday, -1) }), makePlan({ date: T.monday })],
      tasks: [makeTask({ planDate: addDays(T.monday, -1), status: 'done', actualMin: 30 })],
      sessions: [],
    });
    const streaks = computeStreaks(onlyYesterday, T.monday);
    expect(streaks.currentStreak).toBe(1);
    expect(streaks.missedToday).toBe(false);
    expect(streaks.todayPending).toBe(true);
  });

  it('counts a day as active from effective minutes alone', () => {
    const day = aggregateDay({
      date: T.monday,
      tasks: [],
      sessions: [makeSession({ date: T.monday, durationMin: 30, effectiveMin: ACTIVE_DAY_MIN_MINUTES })],
      plan: null,
    });
    expect(day.active).toBe(true);
  });

  it('handles an empty history / new user', () => {
    const streaks = computeStreaks([], T.monday);
    expect(streaks.currentStreak).toBe(0);
    expect(streaks.longestStreak).toBe(0);
    expect(streaks.totalActiveDays).toBe(0);
    expect(streaks.lastActiveDate).toBeNull();
  });
});

describe('consistency score', () => {
  const days = buildTimeline({
    from: addDays(T.monday, -6),
    to: T.monday,
    plans: lastNDays(T.monday, 7).map((d) => makePlan({ date: d })),
    tasks: lastNDays(T.monday, 7).flatMap((d, i) => [
      makeTask({ id: `a-${d}`, planDate: d, status: 'done', actualMin: 45, plannedMin: 45 }),
      makeTask({ id: `b-${d}`, planDate: d, status: i % 3 === 0 ? 'skipped' : 'done', actualMin: 45, plannedMin: 45 }),
    ]),
    sessions: [],
  });

  it('is transparent: every factor is exposed with its weight and contribution', () => {
    const consistency = computeConsistency({ days, today: T.monday, windowDays: 7 });
    expect(consistency.factors).toHaveLength(5);
    const totalWeight = consistency.factors.reduce((acc, f) => acc + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
    expect(consistency.score).toBeGreaterThan(0);
    expect(consistency.score).toBeLessThanOrEqual(100);
    expect(consistency.insufficientData).toBe(false);
    expect(consistency.sentence).toMatch(/behaviour/i);
  });

  it('flags insufficient data for a brand-new user', () => {
    const consistency = computeConsistency({ days: [], today: T.monday, windowDays: 7 });
    expect(consistency.insufficientData).toBe(true);
    expect(consistency.score).toBe(0);
  });
});

describe('subject distribution and balance', () => {
  const tasks = [
    makeTask({ id: 't1', planDate: T.monday, subjectId: analyse.id, status: 'done', actualMin: 60, plannedMin: 60 }),
    makeTask({
      id: 't2',
      planDate: T.monday,
      subjectId: algebre.id,
      status: 'done',
      actualMin: 30,
      plannedMin: 60,
    }),
    makeTask({ id: 't3', planDate: T.monday, subjectId: algebre.id, status: 'skipped', plannedMin: 30 }),
  ];
  const sessions = [
    makeSession({ date: T.monday, subjectId: analyse.id, durationMin: 60, effectiveMin: 60 }),
    makeSession({ id: 's2', date: T.monday, subjectId: algebre.id, durationMin: 30, effectiveMin: 30 }),
  ];

  it('computes per-subject shares that sum to ~100 %', () => {
    const distribution = computeSubjectDistribution({
      date: T.monday,
      tasks,
      sessions,
      subjects: [analyse, algebre],
    });
    expect(distribution).toHaveLength(2);
    const shareSum = distribution.reduce((acc, d) => acc + d.share, 0);
    expect(shareSum).toBeCloseTo(100, 0);
    expect(distribution[0].subjectId).toBe(analyse.id);
    expect(distribution[0].completionPercent).toBe(100);
    expect(distribution[1].completionPercent).toBeCloseTo(33.3, 1);
  });

  it('reports neglect factually with the measured percentage', () => {
    const days = buildTimeline({
      from: addDays(T.monday, -13),
      to: T.monday,
      plans: lastNDays(T.monday, 14).map((d) => makePlan({ date: d })),
      tasks: [
        ...lastNDays(T.monday, 14).map((d) =>
          makeTask({ id: `an-${d}`, planDate: d, subjectId: analyse.id, status: 'done', actualMin: 60, plannedMin: 60 }),
        ),
        ...lastNDays(T.monday, 14).map((d) =>
          makeTask({ id: `al-${d}`, planDate: d, subjectId: algebre.id, status: 'skipped', plannedMin: 60 }),
        ),
      ],
      sessions: lastNDays(T.monday, 14).map((d) =>
        makeSession({ id: `s-${d}`, date: d, subjectId: analyse.id, durationMin: 60, effectiveMin: 60 }),
      ),
    });

    const balance = computeSubjectBalance({
      subjects: [analyse, algebre],
      tasks: days.flatMap((d) => d.tasks),
      sessions: days.flatMap((d) => d.sessions),
      days,
      today: T.monday,
      windowDays: 14,
    });
    const algebreEntry = balance.find((b) => b.subjectId === algebre.id);
    expect(algebreEntry?.neglected).toBe(true);
    expect(algebreEntry?.warning).toMatch(/less study time than planned/);
    expect(algebreEntry?.completionPercent).toBe(0);
    const analyseEntry = balance.find((b) => b.subjectId === analyse.id);
    expect(analyseEntry?.neglected).toBe(false);
  });
});

describe('weekly and period statistics', () => {
  const from = startOfWeek(T.monday);
  const tasks = [
    makeTask({ id: 'w1', planDate: T.monday, status: 'done', actualMin: 90, plannedMin: 90 }),
    makeTask({ id: 'w2', planDate: T.tuesday, status: 'done', actualMin: 30, plannedMin: 60 }),
    makeTask({ id: 'w3', planDate: T.wednesday, status: 'skipped', plannedMin: 60 }),
  ];
  const days = buildTimeline({ from, to: addDays(from, 6), plans: [], tasks, sessions: [] });

  it('builds a Monday-first weekly series with planned vs actual', () => {
    const stats = computeWeeklyStats({
      days,
      from,
      to: addDays(from, 6),
      rules: BASE_RULES,
      sessions: [],
    });
    expect(stats.days).toHaveLength(7);
    expect(stats.days[0].date).toBe(from);
    expect(stats.plannedTotal).toBe(210);
    expect(stats.actualTotal).toBe(120);
    expect(stats.bestDay?.date).toBe(T.monday);
    expect(stats.weakestDay).toBeDefined();
    expect(stats.averageDailyMin).toBe(Math.round(120 / 7));
  });

  it('computes a monthly-style period summary with trend vs previous period', () => {
    const longFrom = addDays(T.monday, -29);
    const longDays = buildTimeline({
      from: addDays(T.monday, -59),
      to: T.monday,
      plans: [],
      tasks: [
        ...lastNDays(T.monday, 30).map((d, i) =>
          makeTask({ id: `p-${d}`, planDate: d, status: i % 5 === 4 ? 'skipped' : 'done', actualMin: 120, plannedMin: 120 }),
        ),
        ...Array.from({ length: 30 }, (_, i) => addDays(T.monday, -59 + i)).map((d) =>
          makeTask({ id: `q-${d}`, planDate: d, status: 'done', actualMin: 60, plannedMin: 60 }),
        ),
      ],
      sessions: [],
    });

    const summary = computePeriodSummary({
      from: longFrom,
      to: T.monday,
      label: '30 days',
      today: T.monday,
      days: longDays,
      subjects: [analyse],
      tasks: longDays.flatMap((d) => d.tasks),
      sessions: [],
      previous: { from: addDays(longFrom, -30), to: addDays(longFrom, -1) },
    });

    expect(summary.totalMin).toBeGreaterThan(0);
    expect(summary.completionRate).toBeGreaterThan(0);
    expect(summary.completionRate).toBeLessThanOrEqual(100);
    expect(summary.trendPercent).not.toBeNull();
    expect(summary.strongestDay).not.toBeNull();
    expect(summary.subjectDistribution.length).toBeGreaterThan(0);
  });

  it('handles a completely empty period (new user) without NaN', () => {
    const summary = computePeriodSummary({
      from: addDays(T.monday, -29),
      to: T.monday,
      label: '30 days',
      today: T.monday,
      days: [],
      subjects: [analyse],
      tasks: [],
      sessions: [],
    });
    expect(summary.totalMin).toBe(0);
    expect(summary.completionRate).toBe(0);
    expect(summary.insufficientData).toBe(true);
    expect(Number.isNaN(summary.averageDailyMin)).toBe(false);
  });
});

describe('heatmap', () => {
  it('maps study time to the documented intensity scale', () => {
    expect(levelForTime(0)).toBe(0);
    expect(levelForTime(30)).toBe(1);
    expect(levelForTime(90)).toBe(2);
    expect(levelForTime(180)).toBe(3);
    expect(levelForTime(300)).toBe(4);
    expect(levelForTime(400)).toBe(5);
    expect(levelForPercent(99)).toBe(4);
    expect(levelForPercent(100)).toBe(5);
  });

  it('produces an empty grid for an empty history (no fake activity)', () => {
    const days = buildTimeline({ from: addDays(T.monday, -6), to: T.monday, plans: [], tasks: [], sessions: [] });
    const cells = computeHeatmap({ days, metric: 'time', sessions: [], tasks: [] });
    expect(cells).toHaveLength(7);
    expect(cells.every((c) => c.level === 0 && c.value === 0)).toBe(true);
  });

  it('uses real stored sessions for the revision metric', () => {
    const days = buildTimeline({
      from: addDays(T.monday, -2),
      to: T.monday,
      plans: [],
      tasks: [],
      sessions: [makeSession({ date: T.monday, activeRecall: true })],
    });
    const cells = computeHeatmap({
      days,
      metric: 'revision',
      sessions: [makeSession({ date: T.monday, activeRecall: true })],
      tasks: [],
    });
    expect(cells[2].value).toBe(1);
    expect(cells[2].level).toBeGreaterThan(0);
    expect(cells[0].value).toBe(0);
  });

  it('builds the circular habit matrix from real tasks', () => {
    const habits = [{ id: 'habit-recall', name: 'Active recall', color: '#22d3ee' }];
    const days = buildTimeline({
      from: addDays(T.monday, -1),
      to: T.monday,
      plans: [],
      tasks: [
        makeTask({ id: 'r1', planDate: T.monday, type: 'REVISION', status: 'done', actualMin: 25 }),
        makeTask({ id: 'r2', planDate: addDays(T.monday, -1), type: 'REVISION', status: 'skipped', plannedMin: 25 }),
      ],
      sessions: [],
    });
    const matrix = computeHabitMatrix({
      days,
      habits,
      tasks: days.flatMap((d) => d.tasks),
      sessions: [],
      maxComfortableMin: 300,
    });
    expect(matrix).toHaveLength(2);
    expect(matrix[0].status).toBe('missed');
    expect(matrix[1].slices[0].done).toBe(true);
  });
});

describe('insights', () => {
  it('says "Not enough data yet." for a new user instead of inventing a conclusion', () => {
    const insights = generateInsights({
      today: T.monday,
      days: [],
      tasks: [],
      sessions: [],
      subjects: [analyse],
      chapters: [],
      exams: [],
      quizzes: [],
      backlogOpenMin: 0,
      previousBacklogOpenMin: null,
    });
    expect(insights).toHaveLength(1);
    expect(insights[0].text).toBe('Not enough data yet.');
    expect(insights[0].kind).toBe('empty');
  });

  it('states the evidence behind every insight', () => {
    const from = addDays(T.monday, -29);
    const tasks = [
      ...lastNDays(T.monday, 30).map((d) =>
        makeTask({ id: `x-${d}`, planDate: d, subjectId: analyse.id, status: 'done', actualMin: 90, plannedMin: 90 }),
      ),
      ...Array.from({ length: 30 }, (_, i) => addDays(T.monday, -59 + i)).map((d) =>
        makeTask({ id: `y-${d}`, planDate: d, subjectId: analyse.id, status: 'done', actualMin: 45, plannedMin: 45 }),
      ),
    ];
    const days = buildTimeline({ from: addDays(T.monday, -59), to: T.monday, plans: [], tasks, sessions: [] });
    const insights = generateInsights({
      today: T.monday,
      days,
      tasks,
      sessions: lastNDays(T.monday, 30).map((d) =>
        makeSession({ id: `s-${d}`, date: d, durationMin: 90, effectiveMin: 90 }),
      ),
      subjects: [analyse],
      chapters: [makeChapter({ mastery: 3, lastRevisionDate: from })],
      exams: [],
      quizzes: [],
      backlogOpenMin: 60,
      previousBacklogOpenMin: 180,
    });
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.every((i) => i.evidence.length > 0)).toBe(true);
    expect(insights.some((i) => i.kind === 'trend')).toBe(true);
    expect(insights.some((i) => i.kind === 'backlog')).toBe(true);
  });
});

describe('goals and achievements', () => {
  it('computes goal progress from real work and reports required weekly minutes', () => {
    const goal = makeGoalFixture({ targetTasks: 10, targetMin: 1000, deadline: addDays(T.monday, 30) });
    const chapters = [
      makeChapter({ id: 'c1', mastery: 3 }),
      makeChapter({ id: 'c2', mastery: 4 }),
      makeChapter({ id: 'c3', mastery: 1 }),
    ];
    const tasks = Array.from({ length: 4 }, (_, i) =>
      makeTask({ id: `g-${i}`, planDate: addDays(T.monday, -i - 1), chapterId: 'c1', status: 'done', actualMin: 60 }),
    );
    const progress = computeGoalProgress({
      goal,
      chapters,
      tasks,
      sessions: [],
      today: T.monday,
    });
    expect(progress.completedTasks).toBeGreaterThanOrEqual(4);
    expect(progress.percent).toBeGreaterThan(0);
    expect(progress.percent).toBeLessThanOrEqual(100);
    expect(progress.deadlineDaysLeft).toBe(30);
    expect(progress.requiredWeeklyMin).toBeGreaterThan(0);
    expect(progress.onTrack).not.toBeNull();
  });

  it('unlocks achievements only from real thresholds', () => {
    const tasks = Array.from({ length: 100 }, (_, i) =>
      makeTask({ id: `t-${i}`, planDate: T.monday, status: 'done', actualMin: 30 }),
    );
    const days = buildTimeline({ from: T.monday, to: T.monday, plans: [], tasks, sessions: [] });
    const evaluated = evaluateAchievements(
      {
        days,
        tasks,
        sessions: [],
        chapters: [],
        subjects: [analyse],
        goals: [],
        today: T.monday,
        streaks: { currentStreak: 3, longestStreak: 8, totalActiveDays: 31, recoveryStreak: 2 },
      },
      [],
      `${T.monday}T20:00:00.000Z`,
    );
    const hundred = evaluated.find((e) => e.definition.id === '100-completed-tasks');
    expect(hundred?.unlocked).toBe(true);
    const hours = evaluated.find((e) => e.definition.id === '50-study-hours');
    expect(hours).toBeDefined();
    expect(evaluated.every((e) => e.progress >= 0 && e.progress <= 1)).toBe(true);
  });
});

describe('date boundaries and timezone handling', () => {
  it('round-trips local dates without UTC slippage', () => {
    for (const iso of ['2026-01-01', '2026-03-29', '2026-06-15', '2026-10-05', '2026-12-31']) {
      expect(toISODate(fromISODate(iso))).toBe(iso);
    }
  });

  it('does arithmetic across DST transitions and month ends', () => {
    // Europe/Paris switches on 2026-03-29 (spring) and 2026-10-25 (autumn)
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('treats the midnight boundary correctly when aggregating a day', () => {
    const late = makeSession({ date: T.monday, startTime: '23:30', endTime: '23:59', durationMin: 29, effectiveMin: 25 });
    const afterMidnight = makeSession({
      id: 's2',
      date: T.tuesday,
      startTime: '00:05',
      endTime: '00:45',
      durationMin: 40,
      effectiveMin: 40,
    });
    const monday = aggregateDay({ date: T.monday, tasks: [], sessions: [late, afterMidnight], plan: null });
    const tuesday = aggregateDay({ date: T.tuesday, tasks: [], sessions: [late, afterMidnight], plan: null });
    expect(monday.effectiveMin).toBe(25);
    expect(tuesday.effectiveMin).toBe(40);
    expect(dayOfWeek(T.monday)).toBe(1);
  });

  it('builds week ranges starting on Monday', () => {
    expect(startOfWeek(T.sunday)).toBe(addDays(T.sunday, -6));
    expect(startOfWeek(T.monday)).toBe(T.monday);
    expect(lastNDays(T.monday, 3)).toEqual([addDays(T.monday, -2), addDays(T.monday, -1), T.monday]);
  });

  it('never returns NaN percentages', () => {
    expect(pct(0, 0)).toBe(0);
    expect(pct(1, 3)).toBeCloseTo(33.3, 1);
  });
});
