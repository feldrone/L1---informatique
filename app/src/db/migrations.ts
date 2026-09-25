/**
 * Schema migrations. Applied in order, each inside a transaction, with the resulting version
 * recorded in `meta`. A migration is never edited after being released — a new one is appended.
 */

import type { Database } from 'sql.js';

export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial-academic-and-planning-core',
    statements: [
      `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
      `CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL);`,
      `CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        short_name TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT '',
        semester TEXT NOT NULL DEFAULT 'S1',
        coefficient REAL,
        credits INTEGER,
        color TEXT NOT NULL,
        difficulty REAL NOT NULL DEFAULT 3,
        weekly_target_min INTEGER NOT NULL DEFAULT 120,
        aliases_json TEXT NOT NULL DEFAULT '[]',
        provenance TEXT NOT NULL DEFAULT 'to-confirm',
        source_ref TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        ord INTEGER NOT NULL DEFAULT 0,
        title TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'course',
        prerequisite_ids_json TEXT NOT NULL DEFAULT '[]',
        expected_min INTEGER NOT NULL DEFAULT 120,
        source_label TEXT NOT NULL DEFAULT '',
        source_ref TEXT NOT NULL DEFAULT '',
        mastery INTEGER NOT NULL DEFAULT 0,
        mastery_manual INTEGER,
        confidence REAL NOT NULL DEFAULT 0,
        last_revision_date TEXT,
        next_revision_date TEXT,
        review_interval_index INTEGER NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT ''
      );`,
      `CREATE TABLE IF NOT EXISTS university_classes (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'CM',
        room TEXT NOT NULL DEFAULT '',
        group_label TEXT NOT NULL DEFAULT '',
        instructor TEXT NOT NULL DEFAULT '',
        week_parity TEXT NOT NULL DEFAULT 'all',
        active INTEGER NOT NULL DEFAULT 1,
        provenance TEXT NOT NULL DEFAULT 'to-confirm',
        note TEXT NOT NULL DEFAULT ''
      );`,
      `CREATE TABLE IF NOT EXISTS daily_plans (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        generated_at TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'normal',
        available_min INTEGER NOT NULL DEFAULT 0,
        buffer_min INTEGER NOT NULL DEFAULT 0,
        planned_min INTEGER NOT NULL DEFAULT 0,
        energy INTEGER NOT NULL DEFAULT 3,
        rationale TEXT NOT NULL DEFAULT '',
        inputs_json TEXT NOT NULL DEFAULT '{}'
      );`,
      `CREATE TABLE IF NOT EXISTS study_tasks (
        id TEXT PRIMARY KEY,
        plan_id TEXT,
        plan_date TEXT NOT NULL,
        subject_id TEXT,
        chapter_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        planned_min INTEGER NOT NULL,
        priority REAL NOT NULL DEFAULT 0,
        priority_label TEXT NOT NULL DEFAULT '',
        reasons_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pending',
        actual_min INTEGER NOT NULL DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        difficulty TEXT,
        note TEXT NOT NULL DEFAULT '',
        origin TEXT NOT NULL DEFAULT 'planner',
        skip_count INTEGER NOT NULL DEFAULT 0,
        defer_count INTEGER NOT NULL DEFAULT 0,
        sort_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS study_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        subject_id TEXT,
        chapter_id TEXT,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_min INTEGER NOT NULL DEFAULT 0,
        effective_min INTEGER NOT NULL DEFAULT 0,
        mode TEXT NOT NULL DEFAULT 'focus',
        interruptions INTEGER NOT NULL DEFAULT 0,
        outcome_rating INTEGER,
        active_recall INTEGER NOT NULL DEFAULT 0,
        recall_score REAL,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS check_ins (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        available_min INTEGER NOT NULL,
        energy INTEGER NOT NULL,
        sleep_quality INTEGER NOT NULL DEFAULT 3,
        urgent_work TEXT NOT NULL DEFAULT '',
        class_note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS daily_reviews (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        planned_min INTEGER NOT NULL DEFAULT 0,
        completed_min INTEGER NOT NULL DEFAULT 0,
        completion_rate REAL NOT NULL DEFAULT 0,
        skipped_count INTEGER NOT NULL DEFAULT 0,
        delayed_count INTEGER NOT NULL DEFAULT 0,
        mistake_count INTEGER NOT NULL DEFAULT 0,
        review_event_count INTEGER NOT NULL DEFAULT 0,
        blocked_by_json TEXT NOT NULL DEFAULT '[]',
        note TEXT NOT NULL DEFAULT '',
        backlog_delta_min INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS exams (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        weight REAL NOT NULL DEFAULT 1,
        difficulty REAL NOT NULL DEFAULT 3,
        syllabus_json TEXT NOT NULL DEFAULT '[]',
        prep_status INTEGER NOT NULL DEFAULT 0,
        kind TEXT NOT NULL DEFAULT 'EMD',
        room TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        chapter_id TEXT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        total INTEGER NOT NULL DEFAULT 0,
        correct INTEGER NOT NULL DEFAULT 0,
        kind TEXT NOT NULL DEFAULT 'QUIZ',
        duration_min INTEGER,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS mistakes (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        chapter_id TEXT,
        question TEXT NOT NULL DEFAULT '',
        user_answer TEXT NOT NULL DEFAULT '',
        correct_answer TEXT NOT NULL DEFAULT '',
        explanation TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'concept',
        date TEXT NOT NULL,
        recurrence_count INTEGER NOT NULL DEFAULT 1,
        next_review TEXT,
        resolved INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS review_events (
        id TEXT PRIMARY KEY,
        chapter_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        date TEXT NOT NULL,
        recall_score REAL NOT NULL DEFAULT 0,
        outcome TEXT NOT NULL,
        interval_days INTEGER NOT NULL DEFAULT 1,
        next_due TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS backlog_items (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        subject_id TEXT NOT NULL,
        chapter_id TEXT,
        original_date TEXT NOT NULL,
        minutes INTEGER NOT NULL DEFAULT 0,
        type TEXT NOT NULL DEFAULT 'COURSE',
        title TEXT NOT NULL DEFAULT '',
        urgency REAL NOT NULL DEFAULT 0,
        weight REAL NOT NULL DEFAULT 0,
        dependency_depth INTEGER NOT NULL DEFAULT 0,
        mastery_impact REAL NOT NULL DEFAULT 0,
        score REAL NOT NULL DEFAULT 0,
        classification TEXT NOT NULL DEFAULT 'distribute',
        state TEXT NOT NULL DEFAULT 'open',
        planned_for TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        deadline TEXT,
        subject_ids_json TEXT NOT NULL DEFAULT '[]',
        target_tasks INTEGER NOT NULL DEFAULT 0,
        target_min INTEGER NOT NULL DEFAULT 0,
        state TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject_id TEXT,
        color TEXT NOT NULL,
        target_per_week INTEGER NOT NULL DEFAULT 3,
        active INTEGER NOT NULL DEFAULT 1
      );`,
      `CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        unlocked_at TEXT NOT NULL,
        progress REAL NOT NULL DEFAULT 0,
        meta_json TEXT NOT NULL DEFAULT '{}'
      );`,
      `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL);`,
    ],
  },
  {
    version: 2,
    name: 'history-log-insights-and-indexes',
    statements: [
      // Append-only history: completed sessions, mastery history, mistakes and reviews are never lost.
      `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        at TEXT NOT NULL,
        type TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}'
      );`,
      `CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        kind TEXT NOT NULL,
        text TEXT NOT NULL,
        evidence_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS mastery_history (
        id TEXT PRIMARY KEY,
        chapter_id TEXT NOT NULL,
        date TEXT NOT NULL,
        from_level INTEGER NOT NULL,
        to_level INTEGER NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        created_at TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_date ON study_tasks(plan_date);`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_status ON study_tasks(status);`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_subject ON study_tasks(subject_id);`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_date ON study_sessions(date);`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_subject ON study_sessions(subject_id);`,
      `CREATE INDEX IF NOT EXISTS idx_backlog_state ON backlog_items(state);`,
      `CREATE INDEX IF NOT EXISTS idx_review_due ON chapters(next_revision_date);`,
      `CREATE INDEX IF NOT EXISTS idx_events_at ON events(at);`,
      `CREATE INDEX IF NOT EXISTS idx_mistakes_subject ON mistakes(subject_id);`,
    ],
  },
  {
    version: 3,
    name: 'progress-intelligence-weekly-review-and-adaptation',
    statements: [
      // Weekly reviews: deterministic summaries persisted so user notes survive reloads.
      `CREATE TABLE IF NOT EXISTS weekly_reviews (
        id TEXT PRIMARY KEY,
        week_start TEXT NOT NULL,
        week_end TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        summary_json TEXT NOT NULL DEFAULT '{}',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );`,
      // Adaptation log: every adaptive suggestion and whether it was applied, for auditability.
      `CREATE TABLE IF NOT EXISTS adaptation_logs (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        kind TEXT NOT NULL,
        text TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        evidence_json TEXT NOT NULL DEFAULT '{}',
        priority INTEGER NOT NULL DEFAULT 0,
        applied INTEGER NOT NULL DEFAULT 0,
        applied_at TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_weekly_reviews_start ON weekly_reviews(week_start);`,
      `CREATE INDEX IF NOT EXISTS idx_adaptation_logs_date ON adaptation_logs(date);`,
      `CREATE INDEX IF NOT EXISTS idx_adaptation_logs_kind ON adaptation_logs(kind);`,
    ],
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce((acc, m) => Math.max(acc, m.version), 0);

export function getSchemaVersion(db: Database): number {
  db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  const result = db.exec(`SELECT value FROM meta WHERE key = 'schema_version'`);
  const raw = result[0]?.values?.[0]?.[0];
  return raw ? Number(raw) : 0;
}

/**
 * Applies every pending migration. Idempotent: running it on an up-to-date database is a no-op.
 * Each migration runs inside its own transaction so a failure cannot leave a half-applied schema.
 */
export function runMigrations(db: Database, logs?: string[]): number {
  const current = getSchemaVersion(db);
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    db.exec('BEGIN');
    try {
      for (const statement of migration.statements) db.exec(statement);
      db.exec(
        `INSERT INTO meta (key, value) VALUES ('schema_version', '${migration.version}')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      );
      db.exec('COMMIT');
      logs?.push(`migration ${migration.version} (${migration.name}) applied`);
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(
        `Migration ${migration.version} (${migration.name}) failed: ${(error as Error).message}`,
      );
    }
  }
  return getSchemaVersion(db);
}
