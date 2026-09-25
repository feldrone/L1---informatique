/**
 * Subject priority engine (spec §7).
 *
 *   priority = weight × weakness × urgency × backlog_factor × revision_decay
 *
 * All multipliers are configurable. Scores are normalised to 0..100 for display and always come
 * with a plain-language explanation — the UI never presents them as scientific truth.
 */

import type { Chapter, Exam, StudySession, StudyTask, Subject } from '../types';
import { daysBetween, round1, type ISODate } from '../date';
import { DEFAULT_INTERVALS } from './revision';

export interface PriorityConfig {
  weightFactor: number;
  weaknessWeight: number;
  urgencyWeight: number;
  backlogWeight: number;
  revisionDecayWeight: number;
  /** Weeks over which urgency fades; an exam in N days contributes exp(-N/urgencyHalfLifeDays). */
  urgencyHalfLifeDays: number;
  /** Highest level used for the weakness computation (mastery scale is 0..5). */
  masteryMax: number;
}

export const DEFAULT_PRIORITY_CONFIG: PriorityConfig = {
  weightFactor: 0.8,
  weaknessWeight: 0.9,
  urgencyWeight: 1.1,
  backlogWeight: 0.8,
  revisionDecayWeight: 0.6,
  urgencyHalfLifeDays: 6,
  masteryMax: 5,
};

export interface PriorityInput {
  date: ISODate;
  subjects: Subject[];
  chapters: Chapter[];
  exams: Exam[];
  sessions: StudySession[];
  overdueTasks: StudyTask[];
  config?: Partial<PriorityConfig>;
}

export interface SubjectPriority {
  subjectId: string;
  raw: number;
  normalized: number;
  factors: {
    coefficient: number;
    weight: number;
    weakness: number;
    urgency: number;
    backlog: number;
    revisionDecay: number;
  };
  /** 0..1 — average mastery across the subject's chapters (null when the subject has none). */
  averageMastery: number | null;
  overdueMin: number;
  daysToExam: number | null;
  reasons: string[];
}

function clampFactor(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeSubjectPriorities(input: PriorityInput): SubjectPriority[] {
  const config: PriorityConfig = { ...DEFAULT_PRIORITY_CONFIG, ...(input.config ?? {}) };
  const activeSubjects = input.subjects.filter((s) => s.active);
  const coefficients = activeSubjects.map((s) => s.coefficient ?? 2);
  const maxCoef = Math.max(...coefficients, 1);

  const results: SubjectPriority[] = activeSubjects.map((subject) => {
    const reasons: string[] = [];
    const coefficient = subject.coefficient ?? 2;
    const weight = clampFactor(0.6 + config.weightFactor * (coefficient / maxCoef), 0.4, 1.6);
    if (subject.coefficient !== null && subject.coefficient >= 3) {
      reasons.push(`High coefficient (${subject.coefficient})`);
    }

    const chapters = input.chapters.filter((c) => c.subjectId === subject.id);
    const avgMastery =
      chapters.length === 0
        ? null
        : chapters.reduce((acc, c) => acc + c.mastery, 0) / chapters.length;
    // Unknown chapter structure (no published programme) is treated as mid-weakness rather than
    // "perfect", so a subject without chapters is not deprioritised by accident.
    const masteryRatio = (avgMastery ?? 2) / config.masteryMax;
    const weakness = clampFactor(1 + config.weaknessWeight * (1 - masteryRatio), 1, 2);
    if (avgMastery !== null && avgMastery < 2.5 && chapters.length > 0) {
      reasons.push(`Weak mastery (average ${round1(avgMastery)}/5 over ${chapters.length} chapters)`);
    }

    const subjectExams = input.exams
      .filter((e) => e.subjectId === subject.id && e.date >= input.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    const daysToExam = subjectExams.length > 0 ? daysBetween(input.date, subjectExams[0].date) : null;
    const urgency =
      daysToExam === null
        ? 1
        : clampFactor(
            1 + config.urgencyWeight * Math.exp(-daysToExam / config.urgencyHalfLifeDays),
            1,
            2.8,
          );
    if (daysToExam !== null && daysToExam <= 14) {
      reasons.push(`${subjectExams[0].name || 'Assessment'} in ${daysToExam} day(s)`);
    }

    const overdueMin = input.overdueTasks
      .filter((t) => t.subjectId === subject.id)
      .reduce((acc, t) => acc + t.plannedMin, 0);
    const backlogScale = Math.max(60, subject.weeklyTargetMin * 0.5);
    const backlog = clampFactor(1 + config.backlogWeight * (overdueMin / backlogScale), 1, 2.2);
    if (overdueMin >= 45) reasons.push(`${overdueMin} min overdue`);

    const subjectChapters = chapters;
    const interval = DEFAULT_INTERVALS[Math.min(2, DEFAULT_INTERVALS.length - 1)];
    let decay = 1;
    for (const chapter of subjectChapters) {
      const reference = chapter.lastRevisionDate;
      if (!reference) {
        if (chapter.mastery > 0) decay = Math.max(decay, 1 + config.revisionDecayWeight * 0.8);
        continue;
      }
      const elapsed = daysBetween(reference, input.date);
      const ratio = clampFactor(elapsed / interval, 0, 2);
      decay = Math.max(decay, 1 + config.revisionDecayWeight * ratio);
    }
    const subjectSessions = input.sessions.filter((s) => s.subjectId === subject.id);
    if (subjectSessions.length === 0 && chapters.some((c) => c.mastery > 0)) {
      decay = Math.max(decay, 1 + config.revisionDecayWeight);
    }
    if (decay > 1.3 && subjectChapters.length > 0) reasons.push('Revision due / weak retention window');

    const raw = weight * weakness * urgency * backlog * decay;
    return {
      subjectId: subject.id,
      raw,
      normalized: 0,
      factors: { coefficient, weight, weakness, urgency, backlog, revisionDecay: decay },
      averageMastery: avgMastery,
      overdueMin,
      daysToExam,
      reasons: reasons.length > 0 ? reasons : ['Baseline priority — no pressure detected'],
    };
  });

  const maxRaw = Math.max(...results.map((r) => r.raw), 0.0001);
  return results
    .map((r) => ({ ...r, normalized: round1((r.raw / maxRaw) * 100) }))
    .sort((a, b) => b.raw - a.raw);
}

export function priorityLabel(normalized: number): string {
  if (normalized >= 80) return 'Critical';
  if (normalized >= 60) return 'High';
  if (normalized >= 40) return 'Medium';
  if (normalized >= 20) return 'Low';
  return 'Background';
}

/** Simple explanation block used by the dashboard ("High priority because: …"). */
export function explainPriority(priority: SubjectPriority): string[] {
  return priority.reasons.slice(0, 4);
}
