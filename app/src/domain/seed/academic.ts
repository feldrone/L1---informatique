/**
 * DEFAULT ACADEMIC CONFIGURATION — seed data (spec §46).
 *
 * Source policy of this repository (`CONTRIBUTING.md`, `resources/sources/SOURCES.md`) is respected:
 * every value carries a `provenance` flag and a source reference. Nothing is invented and nothing
 * unverified is presented as official.
 *
 *  verified      → read from an official UBMA document (Catalogue des formations / department announcement)
 *  partial       → module and structure confirmed, some metadata not published
 *  to-confirm    → provisional value that exists so the app is usable; MUST be checked against the
 *                  department's published grid and edited in the Timetable screen (spec §46)
 *  supplementary → repository-produced pedagogical material ("SUPPLEMENTAIRE — NON OFFICIEL")
 *
 * ⚠️ TIMETABLE. The department's 2026/2027 S1 grid files were still placeholders on 2026-09-21 and the
 * room-board reading (source C1) records module names only — no hours, no rooms. The weekly slots
 * below are therefore PROVISIONAL (`to-confirm`): they exist so the planner has a real weekly
 * structure, and they are fully editable in Settings → Timetable. The only room/slot with any
 * documentary support is the Électricité générale TD on Saturday (`partial`: department announcement
 * of 23/10/2025, TD start 25/10/2025) and the "amphi 7, 14h00" reinforced course (announcement 06/11/2025).
 */

import type { ClassKind, Provenance, Semester, UserRules } from '../types';

export const SEED_META = {
  institution: 'Université Badji Mokhtar — Annaba (UBMA)',
  faculty: 'Faculté de Technologie',
  department: "Département d'Informatique",
  level: 'L1',
  track: 'Systèmes Informatiques (SINF)',
  semester: 'S1' as Semester,
  academicYear: '2026/2027',
  timetableProvenance: 'to-confirm' as Provenance,
  timetableNotice:
    "Relevé de salle 2026/2027 (source C1, non officielle) + structure officielle des modules S1. Aucun horaire ni salle n'est publié par le département à ce jour : les créneaux sont provisoires et modifiables.",
  curriculumNotice:
    "Modules, coefficients, crédits et chapitrages issus des sources officielles UBMA consignées dans resources/sources/SOURCES.md.",
  sources: {
    catalogue:
      'resources/sources/SOURCES.md#source-s1--catalogue-des-formations-faculty-of-technology',
    annonces: 'resources/sources/SOURCES.md#source-s2--page-annonces-du-département-dinformatique',
    roomBoard: 'resources/sources/SOURCES.md#source-c1--tableau-de-salle--première-main--non-officiel',
    analyse1:
      'resources/incoming/study-materials/evidence/ubma-si-lmd-2026-09/capture-analyse1-programme-officiel-2020-2021.md',
    algebre1:
      'resources/incoming/study-materials/evidence/ubma-si-lmd-2026-09/capture-algebre1-programme-officiel-2020-2021.md',
    asd1: 'resources/incoming/study-materials/evidence/ubma-si-lmd-2026-09/capture-asd1-programme-officiel-2020-2021.md',
    sm1: 'resources/incoming/study-materials/evidence/ubma-si-lmd-2026-09/capture-sm1-programme-officiel-2020-2021.md',
    programme: 'resources/PROGRAMME.md',
  },
};

interface SeedSubject {
  id: string;
  code: string;
  name: string;
  shortName: string;
  unit: string;
  coefficient: number | null;
  credits: number | null;
  color: string;
  difficulty: number;
  weeklyTargetMin: number;
  aliases: string[];
  provenance: Provenance;
  sourceRef: string;
  active: boolean;
}

/**
 * The eight S1 modules verified in the department's Catalogue des formations
 * (`resources/PROGRAMME.md`, section « Semestre 1 »). Coefficients/credits are only present for
 * Analyse 1 and Algèbre 1 — the PDF extraction lost the others, so they stay `null` (never invented).
 * `weeklyTargetMin` is a personal effort budget (editable), not an official volume horaire.
 */
export const SEED_SUBJECTS: SeedSubject[] = [
  {
    id: 'sub-analyse1',
    code: 'AN1',
    name: 'Analyse 1 (Math analysis 1)',
    shortName: 'Analyse 1',
    unit: 'UEF11',
    coefficient: 4,
    credits: 6,
    color: '#4f7ef7',
    difficulty: 4,
    weeklyTargetMin: 300,
    aliases: ['Math Analysis 1', 'تحليل 1', 'Math analysis 1'],
    provenance: 'partial',
    sourceRef: SEED_META.sources.catalogue,
    active: true,
  },
  {
    id: 'sub-algebre1',
    code: 'AL1',
    name: 'Algèbre 1 (Algebra 1)',
    shortName: 'Algèbre 1',
    unit: 'UEF11',
    coefficient: 2,
    credits: 4,
    color: '#8b5cf6',
    difficulty: 3,
    weeklyTargetMin: 180,
    aliases: ['Algebra 1', 'جبر 1'],
    provenance: 'partial',
    sourceRef: SEED_META.sources.catalogue,
    active: true,
  },
  {
    id: 'sub-asd1',
    code: 'ASD1',
    name: 'Algorithmique et structures de données 1',
    shortName: 'Algorithmique 1',
    unit: 'UEF12',
    coefficient: null,
    credits: null,
    color: '#10b981',
    difficulty: 4,
    weeklyTargetMin: 300,
    aliases: ['Algorithmique 1', 'Algorithmics 1', 'ASD 1'],
    provenance: 'partial',
    sourceRef: SEED_META.sources.catalogue,
    active: true,
  },
  {
    id: 'sub-sm1',
    code: 'SM1',
    name: 'Structure de machine 1',
    shortName: 'Structure machine 1',
    unit: 'UEF12',
    coefficient: null,
    credits: null,
    color: '#f59e0b',
    difficulty: 3,
    weeklyTargetMin: 210,
    aliases: ['Structure Machine 1', 'St.m 1', 'Machine Structure 1'],
    provenance: 'partial',
    sourceRef: SEED_META.sources.catalogue,
    active: true,
  },
  {
    id: 'sub-ll',
    code: 'LL',
    name: 'Logiciels libres (open source)',
    shortName: 'Logiciels libres',
    unit: 'UEM11',
    coefficient: null,
    credits: null,
    color: '#06b6d4',
    difficulty: 2,
    weeklyTargetMin: 120,
    aliases: ['Free Software / Open Source', 'Free software (open source)'],
    provenance: 'partial',
    sourceRef: SEED_META.sources.catalogue,
    active: true,
  },
  {
    id: 'sub-elec',
    code: 'ELEC',
    name: 'Électricité générale (Basic electricity)',
    shortName: 'Électricité',
    unit: 'UED11',
    coefficient: null,
    credits: null,
    color: '#ef4444',
    difficulty: 3,
    weeklyTargetMin: 150,
    aliases: ['Basic electricity', 'كهرباء عامة', 'Physique (relevé de salle, non confirmé)'],
    provenance: 'partial',
    sourceRef: SEED_META.sources.annonces,
    active: true,
  },
  {
    id: 'sub-anglais1',
    code: 'ANG1',
    name: 'Anglais 1 (English)',
    shortName: 'Anglais 1',
    unit: 'UEM11 (à confirmer)',
    coefficient: null,
    credits: null,
    color: '#ec4899',
    difficulty: 2,
    weeklyTargetMin: 90,
    aliases: ['English', 'Anglais'],
    provenance: 'partial',
    sourceRef: SEED_META.sources.annonces,
    active: true,
  },
  {
    id: 'sub-histoire',
    code: 'HIS',
    name: 'Histoire (History)',
    shortName: 'Histoire',
    unit: 'UET11',
    coefficient: null,
    credits: null,
    color: '#94a3b8',
    difficulty: 1,
    weeklyTargetMin: 60,
    aliases: ['History', 'تاريخ'],
    provenance: 'partial',
    sourceRef: SEED_META.sources.catalogue,
    active: true,
  },
];

interface SeedChapter {
  id: string;
  subjectId: string;
  title: string;
  kind: 'course' | 'td' | 'tp' | 'practice';
  prerequisiteIds: string[];
  expectedMin: number;
  sourceLabel: string;
  sourceRef: string;
}

const OFFICIAL_2021 = 'Programme de la matière — UBMA 2020-2021 (classe B)';
const SUPPLEMENTARY = 'SUPPLEMENTAIRE — NON OFFICIEL (thèmes usuels, à confirmer)';

/**
 * Chapters. For modules with an official published chapter list (Analyse 1, Algèbre 1, ASD 1, SM 1)
 * the chapters are transcribed from the UBMA "Programme de la Matière" captures stored in this
 * repository (2020-2021 era, labelled class B — the SINF 2026/2027 wording is not published).
 * For the remaining modules no official chapter list exists, so the repository's own
 * SUPPLEMENTAIRE theme lists are used and flagged as such. `expectedMin` is a personal effort
 * estimate (editable), never an official volume horaire.
 */
export const SEED_CHAPTERS: SeedChapter[] = [
  // --- Analyse 1 (official chapter list, class B) ---
  ['an1-c1', 'Ch I — Le corps des réels (bornes, récurrence, topologie)', []],
  ['an1-c2', 'Ch II — Le corps des nombres complexes', ['an1-c1']],
  ['an1-c3', 'Ch III — Suites de nombres réels', ['an1-c1']],
  ['an1-c4', 'Ch IV — Fonctions réelles : limites et continuité', ['an1-c3']],
  ['an1-c5', 'Ch V — Fonctions dérivables (Rolle, accroissements finis, Taylor)', ['an1-c4']],
  ['an1-c6', 'Ch VI — Fonctions élémentaires (ln, exp, hyperboliques)', ['an1-c4']],
].map(([id, title, prereq], index, arr) => ({
  id: id as string,
  subjectId: 'sub-analyse1',
  title: title as string,
  kind: 'course' as const,
  prerequisiteIds: prereq as string[],
  expectedMin: index === arr.length - 1 ? 180 : 240,
  sourceLabel: OFFICIAL_2021,
  sourceRef: SEED_META.sources.analyse1,
})) as SeedChapter[];

// --- Algèbre 1 (official chapter list, class B) ---
SEED_CHAPTERS.push(
  ...[
    ['al1-c1', 'Ch 1 — Notions de logique (tables de vérité, quantificateurs, raisonnements)', []],
    ['al1-c2', 'Ch 2 — Ensembles et applications (injection, surjection, bijection)', ['al1-c1']],
    ['al1-c3', 'Ch 3 — Relations binaires (ordre, équivalence, classes)', ['al1-c2']],
    ['al1-c4', 'Ch 4 — Structures algébriques (groupes, anneaux, corps)', ['al1-c2']],
    ['al1-c5', "Ch 5 — Anneaux de polynômes (division euclidienne, pgcd, irréductibles)", ['al1-c4']],
  ].map(([id, title, prereq]) => ({
    id: id as string,
    subjectId: 'sub-algebre1',
    title: title as string,
    kind: 'course' as const,
    prerequisiteIds: prereq as string[],
    expectedMin: 200,
    sourceLabel: OFFICIAL_2021,
    sourceRef: SEED_META.sources.algebre1,
  })),
);

// --- ASD 1 (official chapter list, class B) ---
SEED_CHAPTERS.push(
  ...[
    ['asd-c1', "Ch 1 — Introduction à l'algorithmique", []],
    ['asd-c2', 'Ch 2 — Algorithme séquentiel, variables, types (traduction en C)', ['asd-c1']],
    ['asd-c3', 'Ch 3 — Structures conditionnelles (algorithmique et C)', ['asd-c2']],
    ['asd-c4', 'Ch 4 — Les boucles : Tant que, Répéter, Pour', ['asd-c3']],
    ['asd-c5', 'Ch 5 — Tableaux et chaînes de caractères', ['asd-c4']],
    ['asd-c6', 'Ch 6 — Types personnalisés (énumérations, enregistrements)', ['asd-c5']],
  ].map(([id, title, prereq]) => ({
    id: id as string,
    subjectId: 'sub-asd1',
    title: title as string,
    kind: 'course' as const,
    prerequisiteIds: prereq as string[],
    expectedMin: 210,
    sourceLabel: OFFICIAL_2021,
    sourceRef: SEED_META.sources.asd1,
  })),
);

// --- Structure de machine 1 (official chapter list, class B) ---
SEED_CHAPTERS.push(
  ...[
    ['sm1-c1', 'Ch 1 — Introduction générale', []],
    ['sm1-c2', 'Ch 2 — Systèmes de numération et conversions', ['sm1-c1']],
    ['sm1-c3', "Ch 3 — Représentation de l'information (CA1/CA2, IEEE 754, Gray, DCB)", ['sm1-c2']],
    ['sm1-c4', "Ch 4 — Algèbre de Boole (Karnaugh, Quine-McCluskey)", ['sm1-c2']],
  ].map(([id, title, prereq]) => ({
    id: id as string,
    subjectId: 'sub-sm1',
    title: title as string,
    kind: 'course' as const,
    prerequisiteIds: prereq as string[],
    expectedMin: 240,
    sourceLabel: OFFICIAL_2021,
    sourceRef: SEED_META.sources.sm1,
  })),
);

// --- Modules without a published chapter list → repository SUPPLEMENTAIRE themes ---
const supplementary = (
  subjectId: string,
  rows: Array<[string, string]>,
  expectedMin = 120,
): SeedChapter[] =>
  rows.map(([id, title]) => ({
    id,
    subjectId,
    title,
    kind: 'course' as const,
    prerequisiteIds: [],
    expectedMin,
    sourceLabel: SUPPLEMENTARY,
    sourceRef: SEED_META.sources.programme,
  }));

SEED_CHAPTERS.push(
  ...supplementary('sub-ll', [
    ['ll-c1', 'Culture du logiciel libre : GNU/Linux, licences (GPL, MIT, BSD…)'],
    ['ll-c2', 'Terminal : navigation, fichiers, droits, éditeurs de texte'],
    ['ll-c3', 'Distributions, gestion de paquets et outils de développement (gcc, Git)'],
  ]),
  ...supplementary('sub-elec', [
    ['el-c1', 'Grandeurs électriques, unités SI, loi d’Ohm et puissance'],
    ['el-c2', 'Circuits série/parallèle, diviseurs, lois de Kirchhoff'],
    ['el-c3', 'Condensateur et bobine : régimes transitoires RC / RL'],
    ['el-c4', 'Régime sinusoïdal : efficace, déphasage, résonance RLC'],
  ]),
  ...supplementary(
    'sub-anglais1',
    [
      ['an-c1', 'Core CS vocabulary (technical English)'],
      ['an-c2', 'Grammar for technical English'],
      ['an-c3', 'Reading documentation & writing short technical texts'],
    ],
    90,
  ),
  // Histoire: no published content at all in the consulted sources → no chapter is invented.
);

interface SeedClass {
  id: string;
  subjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  kind: ClassKind;
  room: string;
  groupLabel: string;
  provenance: Provenance;
  note?: string;
}

/**
 * Provisional weekly grid (Sunday–Thursday + Saturday; Friday is the faculty weekend).
 * Session COUNTS that are documented are respected: Analyse 1 = 2 CM + 2 TD, Algèbre 1 = 1 CM + 1 TD.
 * Times and rooms are placeholders (`to-confirm`) except where a department announcement supports them.
 */
export const SEED_TIMETABLE: SeedClass[] = [
  // Sunday
  cls('sun-1', 'sub-analyse1', 0, '08:00', '09:30', 'CM', '', 'Groupe A+B', 'to-confirm'),
  cls('sun-2', 'sub-asd1', 0, '09:45', '11:15', 'CM', '', 'Groupe A+B', 'to-confirm'),
  cls('sun-3', 'sub-ll', 0, '11:30', '13:00', 'CM', 'En ligne', 'Groupes A/B', 'partial', 'Cours en ligne confirmé (annonces 25 et 27/09/2025).'),
  // Monday
  cls('mon-1', 'sub-sm1', 1, '08:00', '09:30', 'CM', '', 'Groupe A+B', 'to-confirm'),
  cls('mon-2', 'sub-analyse1', 1, '09:45', '11:15', 'TD', '', 'Groupe', 'to-confirm'),
  cls('mon-3', 'sub-algebre1', 1, '11:30', '12:30', 'CM', '', 'Groupe A+B', 'to-confirm'),
  // Tuesday
  cls('tue-1', 'sub-analyse1', 2, '08:00', '09:30', 'CM', '', 'Groupe A+B', 'to-confirm'),
  cls('tue-2', 'sub-asd1', 2, '09:45', '11:15', 'TD', '', 'Groupe', 'to-confirm'),
  cls('tue-3', 'sub-histoire', 2, '13:30', '14:30', 'CM', '', 'Groupe A+B', 'to-confirm'),
  // Wednesday
  cls('wed-1', 'sub-elec', 3, '08:00', '09:30', 'CM', 'Amphi 7', 'Groupe A', 'partial', 'Cours renforcé en amphi 7 à 14h00 annoncé le 06/11/2025 (horaire ici provisoire).'),
  cls('wed-2', 'sub-asd1', 3, '09:45', '11:15', 'TP', 'En ligne', 'Groupe', 'partial', 'TP C relevé au tableau de salle 2026/2027 (source C1, non officielle).'),
  cls('wed-3', 'sub-algebre1', 3, '11:30', '12:30', 'TD', '', 'Groupe', 'to-confirm'),
  // Thursday
  cls('thu-1', 'sub-sm1', 4, '08:00', '09:30', 'TD', '', 'Groupe', 'to-confirm'),
  cls('thu-2', 'sub-analyse1', 4, '09:45', '11:15', 'TD', '', 'Groupe', 'to-confirm'),
  cls('thu-3', 'sub-anglais1', 4, '11:30', '12:30', 'CM', 'En ligne', 'L1 SI', 'partial', 'Cours d’anglais en ligne confirmé (annonce du 25/11/2025) ; créneau provisoire.'),
  // Saturday
  cls('sat-1', 'sub-elec', 6, '09:00', '10:00', 'TD', '', 'Groupe', 'partial', 'TD Électricité générale : démarrage un samedi (annonce du 23/10/2025).'),
];

function cls(
  id: string,
  subjectId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  kind: ClassKind,
  room: string,
  groupLabel: string,
  provenance: Provenance,
  note?: string,
): SeedClass {
  const entry: SeedClass = {
    id,
    subjectId,
    dayOfWeek,
    startTime,
    endTime,
    kind,
    room,
    groupLabel,
    provenance,
  };
  if (note) entry.note = note;
  return entry;
}

/** Habits powering the circular habit matrix. Editable; nothing here is a statistic. */
export const SEED_HABITS = [
  { id: 'habit-recall', name: 'Active recall', subjectId: null, color: '#22d3ee', targetPerWeek: 5 },
  { id: 'habit-exercises', name: 'Exercises (TD)', subjectId: null, color: '#34d399', targetPerWeek: 5 },
  { id: 'habit-practice', name: 'Practice (TP / coding)', subjectId: null, color: '#a78bfa', targetPerWeek: 3 },
  { id: 'habit-revision', name: 'Spaced revision', subjectId: null, color: '#fbbf24', targetPerWeek: 4 },
  { id: 'habit-course', name: 'Course work', subjectId: null, color: '#60a5fa', targetPerWeek: 4 },
];

export const DEFAULT_RULES: UserRules = {
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

/** A single editable long-term goal. Progress is computed from real stored work (starts at 0 %). */
export const SEED_GOALS = [
  {
    id: 'goal-s1-coverage',
    title: 'Semester 1 coverage — all chapters studied and revised',
    description:
      'Study every chapter of the eight S1 modules, then reach mastery ≥ 3 (practiced) on each one. Target hours = sum of the chapter effort estimates; adjust in Settings.',
    deadline: null as string | null,
    subjectIds: SEED_SUBJECTS.map((s) => s.id),
    targetTasks: SEED_CHAPTERS.length,
    targetMin: SEED_CHAPTERS.reduce((acc, c) => acc + c.expectedMin, 0),
    state: 'active' as const,
  },
];
