/**
 * First-run seeding of the verified academic configuration (spec §46, §5).
 * Idempotent: only runs when the database has no subjects yet. Nothing here fabricates history —
 * tasks, sessions, mastery, streaks and analytics all start empty.
 */

import type { Repository } from './repo';
import {
  DEFAULT_RULES,
  SEED_CHAPTERS,
  SEED_GOALS,
  SEED_HABITS,
  SEED_META,
  SEED_SUBJECTS,
  SEED_TIMETABLE,
} from '../domain/seed/academic';
import { nowISO } from '../domain/date';
import type { Chapter, Subject, UniversityClass } from '../domain/types';

export function isSeeded(repo: Repository): boolean {
  return repo.client.count('subjects') > 0;
}

export function applySeed(repo: Repository): void {
  if (isSeeded(repo)) return;

  repo.client.transaction(() => {
    SEED_SUBJECTS.forEach((s, index) => {
      const subject: Subject = {
        id: s.id,
        code: s.code,
        name: s.name,
        shortName: s.shortName,
        unit: s.unit,
        semester: 'S1',
        coefficient: s.coefficient,
        credits: s.credits,
        color: s.color,
        difficulty: s.difficulty,
        weeklyTargetMin: s.weeklyTargetMin,
        aliases: s.aliases,
        provenance: s.provenance,
        active: s.active,
        sortOrder: index,
      };
      repo.upsertSubject(subject);
      // keep the source reference in settings so the UI can display data provenance
      repo.setSetting(`source:subject:${s.id}`, { ref: s.sourceRef, provenance: s.provenance });
    });

    SEED_CHAPTERS.forEach((c, index) => {
      const chapter: Chapter = {
        id: c.id,
        subjectId: c.subjectId,
        order: index,
        title: c.title,
        kind: c.kind,
        prerequisiteIds: c.prerequisiteIds,
        expectedMin: c.expectedMin,
        sourceLabel: c.sourceLabel,
        sourceRef: c.sourceRef,
        mastery: 0,
        masteryManual: null,
        confidence: 0,
        lastRevisionDate: null,
        nextRevisionDate: null,
        reviewIntervalIndex: 0,
        notes: '',
      };
      repo.upsertChapter(chapter);
    });

    SEED_TIMETABLE.forEach((c) => {
      const universityClass: UniversityClass = {
        id: c.id,
        subjectId: c.subjectId,
        dayOfWeek: c.dayOfWeek,
        startTime: c.startTime,
        endTime: c.endTime,
        kind: c.kind,
        room: c.room,
        groupLabel: c.groupLabel,
        instructor: '',
        weekParity: 'all',
        active: true,
        provenance: c.provenance,
      };
      repo.upsertUniversityClass(universityClass);
      if (c.note) {
        repo.setSetting(`source:class:${c.id}`, { note: c.note, provenance: c.provenance });
      }
    });

    SEED_HABITS.forEach((h) => {
      repo.upsertHabit({ ...h, active: true, subjectId: h.subjectId });
    });

    SEED_GOALS.forEach((g) => {
      repo.upsertGoal({ ...g, createdAt: nowISO() });
    });

    repo.savePreferences({ displayName: 'L1 SINF', theme: 'dark', language: 'en', rules: DEFAULT_RULES });
    repo.setSetting('academic:meta', SEED_META);
    repo.setSetting('seed:version', 1);
  });
}

export { SEED_META };
