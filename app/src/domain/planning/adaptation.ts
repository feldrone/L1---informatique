/**
 * Adaptive study planning — Progress Intelligence (Phase 3).
 *
 * Deterministic adaptation engine: given behaviour signals, subject health,
 * chapter profiles, weekly reviews and performance, it produces explainable
 * recommendations that can be applied to planning rules or to the next day's
 * plan.
 *
 * No fake AI, no external API. Every suggestion carries evidence and a
 * transparent reason. The planner itself remains pure — this module only
 * proposes adjustments; the store decides whether to apply them.
 */

import type { UserRules } from '../types';
import type { ISODate } from '../date';
import type { BehaviourSignals } from './types';
import type { SubjectHealth } from '../analytics/subjectHealth';
import type { ChapterProfile } from '../analytics/chapterProfile';
import type { WeeklyReview } from '../analytics/weeklyReview';
import type { PerformanceSummary } from '../analytics/performance';
import { sum } from '../analytics/common';

export type AdaptationKind =
  | 'reduce-block-size'
  | 'increase-challenge'
  | 'focus-subject'
  | 'prerequisite-repair'
  | 'adjust-recovery'
  | 'rest-day'
  | 'buffer'
  | 'exam-focus'
  | 'anti-procrastination'
  | 'recall-boost'
  | 'reduce-scope'
  | 'balance';

export interface AdaptationSuggestion {
  id: string;
  kind: AdaptationKind;
  text: string;
  reason: string;
  evidence: string;
  impact: 'high' | 'medium' | 'low';
  priority: number; // higher = more urgent
  actionable: boolean;
  suggestedChange?: {
    field: keyof UserRules;
    from: number | string | number[] | boolean;
    to: number | string | number[] | boolean;
    explanation: string;
  };
  subjectId?: string;
  chapterId?: string;
  evidenceSampleSize: number;
}

export interface AdaptationPlan {
  date: ISODate;
  generatedAt: string;
  suggestions: AdaptationSuggestion[];
  adjustedRules: UserRules | null;
  rationale: string;
  evidence: {
    behaviourSample: number;
    healthSample: number;
    chapterSample: number;
    weeklySample: number;
    performanceSample: number;
    insufficientData: boolean;
  };
}

export interface AdaptationInput {
  date: ISODate;
  rules: UserRules;
  behaviour: BehaviourSignals;
  subjectHealth: SubjectHealth[];
  chapterProfiles: ChapterProfile[];
  weeklyReviews: WeeklyReview[];
  performance: PerformanceSummary;
  today: ISODate;
}

export function analyzeAdaptationNeeds(input: AdaptationInput): AdaptationSuggestion[] {
  const { rules, behaviour, subjectHealth, chapterProfiles, weeklyReviews, performance } = input;
  const suggestions: AdaptationSuggestion[] = [];

  const latestWeekly = weeklyReviews[0] ?? null;
  const criticalSubjects = subjectHealth.filter((h) => h.label === 'critical' || h.label === 'at-risk');
  const overdueChapters = chapterProfiles.filter((p) => (p.reviews.overdueDays ?? 0) > 0);
  const blockedChapters = chapterProfiles.filter((p) => p.prerequisites.isBlocked);

  // 1. Overshoot → reduce block size
  if (behaviour.overshootRatio > 0.3) {
    const from = rules.maxBlockMin;
    const to = Math.max(20, Math.round(from * 0.7));
    suggestions.push({
      id: 'adapt-overshoot',
      kind: 'reduce-block-size',
      text: `Sessions run ${Math.round(behaviour.overshootRatio * 100)}% over estimate — reduce max block to ${to} min`,
      reason: 'Consistent overshoot indicates tasks are too large or estimates too optimistic; shorter blocks improve completion',
      evidence: `Median overshoot ${Math.round(behaviour.overshootRatio * 100)}% over last 14 days, ${behaviour.sessionsLast7d} sessions in last 7 days`,
      impact: 'high',
      priority: 90,
      actionable: true,
      suggestedChange: {
        field: 'maxBlockMin',
        from,
        to,
        explanation: `Reduce from ${from} to ${to} min to match actual duration pattern`,
      },
      evidenceSampleSize: behaviour.sessionsLast7d,
    });
  }

  // 2. Undershoot → increase challenge
  if (behaviour.undershootRatio > 0.25 && behaviour.sessionsLast7d >= 3) {
    const from = rules.maxBlockMin;
    const to = Math.min(90, Math.round(from * 1.2));
    suggestions.push({
      id: 'adapt-undershoot',
      kind: 'increase-challenge',
      text: `Tasks finish ${Math.round(behaviour.undershootRatio * 100)}% early — raise challenge to ${to} min blocks`,
      reason: 'Consistent undershoot suggests capacity for more demanding work',
      evidence: `Median undershoot ${Math.round(behaviour.undershootRatio * 100)}% over last 14 days, completion ${Math.round(behaviour.completionRate7d * 100)}%`,
      impact: 'medium',
      priority: 50,
      actionable: true,
      suggestedChange: {
        field: 'maxBlockMin',
        from,
        to,
        explanation: `Increase from ${from} to ${to} min — you finish early consistently`,
      },
      evidenceSampleSize: behaviour.sessionsLast7d,
    });
  }

  // 3. Skipped subjects → anti-procrastination
  for (const [subjectId, skipCount] of Object.entries(behaviour.skipCountBySubject)) {
    if (skipCount >= 2) {
      const health = subjectHealth.find((h) => h.subjectId === subjectId);
      suggestions.push({
        id: `adapt-skip-${subjectId}`,
        kind: 'anti-procrastination',
        text: `${health?.shortName ?? subjectId} skipped ${skipCount} times — use 10-min start blocks`,
        reason: 'Repeated skips indicate initiation barrier, not lack of ability — shrinking first block removes it',
        evidence: `${skipCount} skips in last 14 days for ${health?.shortName ?? subjectId}, completion ${health?.stats.completionRate ?? 'n/a'}%`,
        impact: 'high',
        priority: 85,
        actionable: true,
        subjectId,
        evidenceSampleSize: skipCount,
      });
    }
  }

  // 4. Struggling subjects → focus
  for (const subjectId of behaviour.strugglingSubjectIds) {
    const health = subjectHealth.find((h) => h.subjectId === subjectId);
    suggestions.push({
      id: `adapt-struggle-${subjectId}`,
      kind: 'focus-subject',
      text: `${health?.shortName ?? subjectId} shows low outcome ratings — add prerequisite review`,
      reason: 'Low outcome ratings suggest gaps in prerequisites or need for different task type',
      evidence: `Outcome rating low for ${health?.shortName ?? subjectId}, avg outcome ${behaviour.averageOutcomeRating ?? 'n/a'}, health score ${health?.score ?? 'n/a'}`,
      impact: 'high',
      priority: 80,
      actionable: true,
      subjectId,
      evidenceSampleSize: 1,
    });
  }

  // 5. Critical subjects → focus
  for (const health of criticalSubjects.slice(0, 3)) {
    suggestions.push({
      id: `adapt-critical-${health.subjectId}`,
      kind: 'focus-subject',
      text: `${health.shortName} health ${health.score}/100 (${health.label}) — prioritize this week`,
      reason: health.factors
        .filter((f) => f.value < 0.5)
        .map((f) => f.label)
        .join(', ') || 'Low health factors',
      evidence: health.evidence.sentence,
      impact: 'high',
      priority: 88,
      actionable: true,
      subjectId: health.subjectId,
      evidenceSampleSize: health.evidence.sampleSize,
    });
  }

  // 6. Blocked chapters → prerequisite repair
  for (const profile of blockedChapters.slice(0, 2)) {
    suggestions.push({
      id: `adapt-prereq-${profile.chapterId}`,
      kind: 'prerequisite-repair',
      text: `${profile.title} blocked by prerequisites — secure ${profile.prerequisites.unmetChapters.map((c) => c.title).join(', ')}`,
      reason: 'Chapter has unmet prerequisites with mastery <2 — prerequisite review unlocks progress',
      evidence: `Prerequisites: ${profile.prerequisites.unmetChapters.map((c) => `${c.title} (mastery ${c.mastery})`).join('; ')}`,
      impact: 'high',
      priority: 82,
      actionable: true,
      chapterId: profile.chapterId,
      subjectId: profile.subjectId,
      evidenceSampleSize: profile.prerequisites.unmet,
    });
  }

  // 7. Overdue revisions → recall boost
  if (overdueChapters.length >= 3) {
    suggestions.push({
      id: 'adapt-recall-boost',
      kind: 'recall-boost',
      text: `${overdueChapters.length} chapters overdue for revision — add 2 recall blocks daily`,
      reason: 'Spaced review overdue — recall decays without retrieval practice',
      evidence: `${overdueChapters.length} overdue, most overdue ${Math.max(...overdueChapters.map((c) => c.reviews.overdueDays ?? 0))} days`,
      impact: 'high',
      priority: 75,
      actionable: true,
      evidenceSampleSize: overdueChapters.length,
    });
  }

  // 8. Low completion → reduce scope
  if (performance.overall.completionRate < 60 && performance.overall.tasksTotal >= 5) {
    const from = rules.maxDailyMin;
    const to = Math.max(rules.minDailyMin, Math.round(from * 0.8));
    suggestions.push({
      id: 'adapt-reduce-scope',
      kind: 'reduce-scope',
      text: `Completion ${performance.overall.completionRate}% — reduce daily max from ${from} to ${to} min`,
      reason: 'Low completion suggests overload — smaller daily scope improves adherence and reduces backlog',
      evidence: `${performance.overall.completionRate}% completion over ${performance.windowDays} days, ${performance.overall.tasksTotal} tasks`,
      impact: 'high',
      priority: 87,
      actionable: true,
      suggestedChange: {
        field: 'maxDailyMin',
        from,
        to,
        explanation: `Reduce daily max from ${from} to ${to} to improve completion`,
      },
      evidenceSampleSize: performance.overall.tasksTotal,
    });
  }

  // 9. Backlog growing → adjust recovery
  if (latestWeekly && latestWeekly.stats.backlogDelta > 60) {
    const from = rules.recoveryShareNormal;
    const to = Math.min(0.5, Math.round((from + 0.1) * 100) / 100);
    suggestions.push({
      id: 'adapt-recovery',
      kind: 'adjust-recovery',
      text: `Backlog grew +${latestWeekly.stats.backlogDelta} min — increase recovery share to ${Math.round(to * 100)}%`,
      reason: 'Backlog growth indicates recovery capacity too low for missed work',
      evidence: `Backlog delta +${latestWeekly.stats.backlogDelta} min this week, ${performance.overall.tasksTotal} tasks`,
      impact: 'medium',
      priority: 70,
      actionable: true,
      suggestedChange: {
        field: 'recoveryShareNormal',
        from,
        to,
        explanation: `Increase recovery share from ${Math.round(from * 100)}% to ${Math.round(to * 100)}% to catch up`,
      },
      evidenceSampleSize: 1,
    });
  }

  // 10. Buffer too low / high interruptions → increase buffer
  if (performance.focus.interruptionRate >= 2 || performance.focus.avgInterruptions >= 2) {
    const from = rules.bufferRatio;
    const to = Math.min(0.3, Math.round((from + 0.05) * 100) / 100);
    suggestions.push({
      id: 'adapt-buffer',
      kind: 'buffer',
      text: `High interruptions (${performance.focus.avgInterruptions} avg) — increase buffer to ${Math.round(to * 100)}%`,
      reason: 'Interruptions reduce effective time — larger buffer prevents over-scheduling',
      evidence: `${performance.focus.avgInterruptions} avg interruptions, ${performance.focus.interruptionRate}/hour over ${performance.focus.totalSessions} session(s)`,
      impact: 'medium',
      priority: 60,
      actionable: true,
      suggestedChange: {
        field: 'bufferRatio',
        from,
        to,
        explanation: `Increase buffer from ${Math.round(from * 100)}% to ${Math.round(to * 100)}% to absorb interruptions`,
      },
      evidenceSampleSize: performance.focus.totalSessions,
    });
  }

  // 11. Exam proximity → exam focus
  const upcomingExam = (() => {
    // find subject with exam in next 14 days and low health
    for (const health of subjectHealth) {
      const examFactor = health.factors.find((f) => f.key === 'exam');
      if (examFactor && examFactor.evidence.includes('in')) {
        // parse days from evidence? Better to use direct exam data, but we have health evidence
        // We'll check if exam evidence says "in Xd"
        const match = examFactor.evidence.match(/in (\d+)d/);
        if (match) {
          const days = Number(match[1]);
          if (days <= 14) return { health, days };
        }
      }
    }
    return null;
  })();

  if (upcomingExam) {
    suggestions.push({
      id: `adapt-exam-${upcomingExam.health.subjectId}`,
      kind: 'exam-focus',
      text: `Exam in ${upcomingExam.days}d for ${upcomingExam.health.shortName} — switch to exam mode early`,
      reason: 'Exam approaching with health <80 needs timed practice and recall prioritization',
      evidence: upcomingExam.health.factors.find((f) => f.key === 'exam')?.evidence ?? 'Exam upcoming',
      impact: 'high',
      priority: 92,
      actionable: true,
      subjectId: upcomingExam.health.subjectId,
      evidenceSampleSize: 1,
    });
  }

  // 12. Balance off → balance
  const lowBalanceSubjects = subjectHealth.filter((h) => {
    const bf = h.factors.find((f) => f.key === 'balance');
    return bf && bf.value < 0.5;
  });
  if (lowBalanceSubjects.length > 0) {
    for (const health of lowBalanceSubjects.slice(0, 2)) {
      suggestions.push({
        id: `adapt-balance-${health.subjectId}`,
        kind: 'balance',
        text: `${health.shortName} balance off — adjust estimates or task types`,
        reason: 'Effective time far from planned suggests estimates or task mix needs adjustment',
        evidence: health.factors.find((f) => f.key === 'balance')?.evidence ?? '',
        impact: 'medium',
        priority: 55,
        actionable: true,
        subjectId: health.subjectId,
        evidenceSampleSize: health.evidence.sampleSize,
      });
    }
  }

  // 13. Rest day overload (if active days 7/7 and completion dropping)
  if (performance.velocity.activeDays === 7 && performance.overall.completionRate < 70) {
    suggestions.push({
      id: 'adapt-rest',
      kind: 'rest-day',
      text: '7 active days but completion dropping — consider protecting a rest day',
      reason: 'No rest day reduces long-term consistency; protected rest improves recovery',
      evidence: `7 active days, completion ${performance.overall.completionRate}%, avg ${performance.velocity.effectivePerActiveDay} effective min/day`,
      impact: 'medium',
      priority: 45,
      actionable: false,
      evidenceSampleSize: performance.velocity.activeDays,
    });
  }

  // Sort by priority descending
  suggestions.sort((a, b) => b.priority - a.priority);

  // Deduplicate by id
  const seen = new Set<string>();
  const deduped: AdaptationSuggestion[] = [];
  for (const s of suggestions) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      deduped.push(s);
    }
  }

  return deduped;
}

export function generateAdaptationPlan(input: AdaptationInput): AdaptationPlan {
  const suggestions = analyzeAdaptationNeeds(input);
  const { rules, behaviour, subjectHealth, chapterProfiles, weeklyReviews, performance } = input;

  const behaviourSample = behaviour.sessionsLast7d;
  const healthSample = sum(subjectHealth.map((h) => h.evidence.sampleSize));
  const chapterSample = chapterProfiles.length;
  const weeklySample = weeklyReviews.length;
  const performanceSample = performance.overall.tasksTotal;
  const insufficientData = behaviourSample < 2 && healthSample < 3 && performanceSample < 3;

  // Build adjusted rules if there are actionable rule changes
  let adjustedRules: UserRules | null = null;
  const ruleChanges = suggestions.filter((s) => s.suggestedChange).map((s) => s.suggestedChange!);

  if (ruleChanges.length > 0) {
    adjustedRules = { ...rules };
    for (const change of ruleChanges) {
      // Apply highest priority change per field (first occurrence wins after sorting)
      const field = change.field as keyof UserRules;
      if ((adjustedRules as unknown as Record<string, unknown>)[field] === change.from) {
        (adjustedRules as unknown as Record<string, unknown>)[field] = change.to;
      }
    }
  }

  const topSuggestion = suggestions[0];
  const rationale = insufficientData
    ? 'Not enough data yet — at least 3 days of real activity needed for adaptive recommendations. Keep logging sessions.'
    : suggestions.length === 0
      ? `No adaptation needed — completion ${performance.overall.completionRate}%, ${performance.velocity.activeDays} active day(s), health stable. Maintain current rules.`
      : `Top priority: ${topSuggestion.text}. ${suggestions.length} adaptation(s) suggested based on ${behaviourSample} recent session(s), ${healthSample} health data point(s), ${performanceSample} task(s).`;

  return {
    date: input.date,
    generatedAt: new Date().toISOString(),
    suggestions,
    adjustedRules,
    rationale,
    evidence: {
      behaviourSample,
      healthSample,
      chapterSample,
      weeklySample,
      performanceSample,
      insufficientData,
    },
  };
}

export function applyAdaptationsToRules(rules: UserRules, suggestions: AdaptationSuggestion[]): { rules: UserRules; applied: AdaptationSuggestion[]; rationale: string } {
  const applied: AdaptationSuggestion[] = [];
  let newRules = { ...rules };

  for (const suggestion of suggestions) {
    if (!suggestion.actionable || !suggestion.suggestedChange) continue;
    const field = suggestion.suggestedChange.field as keyof UserRules;
    const current = (newRules as unknown as Record<string, unknown>)[field];
    if (current === suggestion.suggestedChange.from) {
      (newRules as unknown as Record<string, unknown>)[field] = suggestion.suggestedChange.to;
      applied.push(suggestion);
    }
  }

  const rationale =
    applied.length === 0
      ? 'No rule changes applied — either already at suggested values or no actionable suggestions.'
      : `Applied ${applied.length} adaptation(s): ${applied.map((s) => `${String(s.suggestedChange?.field)} ${String(s.suggestedChange?.from)}→${String(s.suggestedChange?.to)}`).join(', ')}. Rationale: ${applied.map((s) => s.reason).join('; ')}`;

  return { rules: newRules, applied, rationale };
}

export function getHighPriorityAdaptations(plan: AdaptationPlan, limit = 3): AdaptationSuggestion[] {
  return [...plan.suggestions].sort((a, b) => b.priority - a.priority).slice(0, limit);
}

export function getAdaptationsBySubject(plan: AdaptationPlan, subjectId: string): AdaptationSuggestion[] {
  return plan.suggestions.filter((s) => s.subjectId === subjectId);
}

export function getAdaptationsByChapter(plan: AdaptationPlan, chapterId: string): AdaptationSuggestion[] {
  return plan.suggestions.filter((s) => s.chapterId === chapterId);
}
