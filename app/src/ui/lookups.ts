/** Shared lookups + small formatting helpers used by several screens. */

import { useMemo } from 'react';
import { useStudy } from '../state/provider';
import { formatMinutes } from '../domain/date';

export interface SubjectLookupEntry {
  name: string;
  shortName: string;
  color: string;
}

export function useLookups() {
  const { state } = useStudy();
  const subjects = state.snapshot.subjects;

  return useMemo(() => {
    const subjectLookup = new Map<string, SubjectLookupEntry>(
      subjects.map((s) => [s.id, { name: s.name, shortName: s.shortName, color: s.color }]),
    );
    const chapterLookup = new Map<string, string>(state.snapshot.chapters.map((c) => [c.id, c.title]));
    const chapterById = new Map(state.snapshot.chapters.map((c) => [c.id, c]));
    const subjectById = new Map(subjects.map((s) => [s.id, s]));
    return { subjectLookup, chapterLookup, chapterById, subjectById };
  }, [subjects, state.snapshot.chapters]);
}

export const MASTERY_TEXT: Record<number, string> = {
  0: 'Not started',
  1: 'Seen',
  2: 'Understood',
  3: 'Practised',
  4: 'Confident',
  5: 'Exam-ready',
};

export function hhmm(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatRange(from: string, to: string): string {
  return `${from} → ${to}`;
}

export { formatMinutes };
