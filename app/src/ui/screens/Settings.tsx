/**
 * Settings — every academic value and personal rule is editable here, so the app never hard-codes
 * data that the faculty may publish differently. Provenance is always visible next to a value.
 */

import { useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Field, ProvenanceBadge, Select, StatTile, TextArea, cx } from '../components/primitives';
import { useStore, useStudy } from '../../state/provider';
import { MASTERY_TEXT } from '../lookups';
import type { Chapter, Goal, Habit, Subject, UniversityClass, UserRules } from '../../domain/types';

type Tab = 'rules' | 'academics' | 'timetable' | 'goals' | 'data';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function SettingsScreen() {
  const { state, theme, toggleTheme } = useStudy();
  const store = useStore();
  const [tab, setTab] = useState<Tab>('rules');
  const [rules, setRules] = useState<UserRules>(store.planningRules());
  const [displayName, setDisplayName] = useState(state.snapshot.preferences.displayName);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importReport, setImportReport] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const subjects = state.snapshot.subjects;
  const classes = state.snapshot.timetable;
  const goals = state.snapshot.goals;
  const habits = state.snapshot.habits;

  const counts = useMemo(() => {
    const snapshot = state.snapshot;
    return {
      subjects: snapshot.subjects.length,
      chapters: snapshot.chapters.length,
      classes: snapshot.timetable.length,
      tasks: snapshot.tasks.length,
      sessions: snapshot.sessions.length,
      mistakes: snapshot.mistakes.length,
      events: snapshot.insights.length,
    };
  }, [state.snapshot]);

  const save = (patch: Partial<UserRules> = {}) => {
    const next = { ...rules, ...patch };
    setRules(next);
    store.savePreferences({ displayName, theme, rules: next });
    setSavedAt(new Date().toISOString().slice(11, 19));
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-xs text-text-muted">
            Timetable, subjects, coefficients, chapters, rules and goals are all editable — nothing academic is hard-coded
            in the interface.
          </p>
        </div>
        {savedAt && <Badge tone="success">saved {savedAt}</Badge>}
      </header>

      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-1.5">
        {(
          [
            ['rules', 'Personal rules'],
            ['academics', 'Subjects & chapters'],
            ['timetable', 'Timetable'],
            ['goals', 'Goals & habits'],
            ['data', 'Data & portability'],
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cx(
              'min-h-8 rounded-full border px-3 py-1.5 text-xs transition',
              tab === id ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:text-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'rules' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Profile" subtitle="Stored locally with your data">
            <Field label="Display name">
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                onBlur={() => store.savePreferences({ displayName, theme, rules })}
                className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
              />
            </Field>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-text-muted">Theme</span>
              <Button size="sm" variant="secondary" onClick={toggleTheme}>
                {theme === 'dark' ? 'Dark (default)' : 'Light'} — switch
              </Button>
            </div>
          </Card>

          <Card title="Daily limits" subtitle="The planner never fills 100 % of your availability">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Minimum daily study (min)" hint="Used for the minimum viable day">
                <input
                  type="number"
                  min={10}
                  value={rules.minDailyMin}
                  onChange={(event) => save({ minDailyMin: Number(event.target.value) })}
                  className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Maximum daily study (min)" hint="Hard ceiling, buffer excluded">
                <input
                  type="number"
                  min={60}
                  value={rules.maxDailyMin}
                  onChange={(event) => save({ maxDailyMin: Number(event.target.value) })}
                  className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Weekly minimum (min)">
                <input
                  type="number"
                  min={60}
                  step={30}
                  value={rules.minWeeklyMin}
                  onChange={(event) => save({ minWeeklyMin: Number(event.target.value) })}
                  className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Maximum block length (min)" hint="Longer tasks are split">
                <input
                  type="number"
                  min={20}
                  value={rules.maxBlockMin}
                  onChange={(event) => save({ maxBlockMin: Number(event.target.value) })}
                  className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Buffer ratio" hint="Share of the day kept free (0.18 = 18 %)">
                <input
                  type="number"
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={rules.bufferRatio}
                  onChange={(event) => save({ bufferRatio: Number(event.target.value) })}
                  className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Preferred study window">
                <Select
                  value={rules.preferredStudyWindow}
                  onChange={(event) => save({ preferredStudyWindow: event.target.value as UserRules['preferredStudyWindow'] })}
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="any">Any</option>
                </Select>
              </Field>
            </div>
          </Card>

          <Card title="Focus & revision" subtitle="Pomodoro defaults and spaced-review intervals">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Focus length (min)">
                <input
                  type="number"
                  min={10}
                  value={rules.focusMin}
                  onChange={(event) => save({ focusMin: Number(event.target.value) })}
                  className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Break length (min)">
                <input
                  type="number"
                  min={1}
                  value={rules.breakMin}
                  onChange={(event) => save({ breakMin: Number(event.target.value) })}
                  className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Sleep target (minutes)" hint="Used by the day-window calculation">
                <input
                  type="number"
                  step={15}
                  value={rules.sleepTargetMin}
                  onChange={(event) => save({ sleepTargetMin: Number(event.target.value) })}
                  className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                />
              </Field>
            </div>
            <Field label="Review intervals (days, comma separated)">
              <input
                value={rules.reviewIntervals.join(', ')}
                onChange={(event) => {
                  const parsed = event.target.value
                    .split(',')
                    .map((value) => Number(value.trim()))
                    .filter((value) => Number.isFinite(value) && value > 0);
                  if (parsed.length > 0) save({ reviewIntervals: parsed });
                }}
                className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
              />
            </Field>
          </Card>

          <Card title="Week shape" subtitle="Rest days are respected by the planner">
            <p className="mb-2 text-xs text-text-muted">Rest days (no automatic planning):</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((day, index) => {
                const active = rules.restDays.includes(index);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      save({
                        restDays: active ? rules.restDays.filter((d) => d !== index) : [...rules.restDays, index].sort(),
                      })
                    }
                    className={cx(
                      'min-h-8 rounded-full border px-3 py-1.5 text-xs transition',
                      active ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:text-text',
                    )}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Weekly review day">
                <Select value={rules.weeklyReviewDay} onChange={(event) => save({ weeklyReviewDay: Number(event.target.value) })}>
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Exam mode window (days before exam)" hint="Earlier planning focus">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={rules.examModeWindowDays}
                  onChange={(event) => save({ examModeWindowDays: Number(event.target.value) })}
                  className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Day bounds">
                <div className="flex min-w-0 gap-2">
                  <input
                    type="time"
                    value={rules.dayStart}
                    onChange={(event) => save({ dayStart: event.target.value })}
                    className="w-full min-w-0 rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={rules.dayEnd}
                    onChange={(event) => save({ dayEnd: event.target.value })}
                    className="w-full min-w-0 rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                  />
                </div>
              </Field>
            </div>
          </Card>
        </div>
      )}

      {tab === 'academics' && (
        <div className="space-y-4">
          <Card title="Subjects" subtitle="Coefficients, credits and weekly targets stay editable — provenance is preserved">
            <ul className="space-y-3">
              {subjects.map((subject) => (
                <li key={subject.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={subject.color}
                        onChange={(event) => store.saveSubject({ ...subject, color: event.target.value })}
                        className="h-7 w-7 rounded border border-border bg-transparent"
                        aria-label={`Colour for ${subject.name}`}
                      />
                      <span className="text-sm font-medium">{subject.name}</span>
                      <ProvenanceBadge provenance={subject.provenance} />
                      {!subject.active && <Badge tone="neutral">inactive</Badge>}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-text-muted">
                      <input
                        type="checkbox"
                        checked={subject.active}
                        onChange={(event) => store.saveSubject({ ...subject, active: event.target.checked })}
                      />
                      active
                    </label>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    <Field label="Coefficient" hint="blank = not published">
                      <input
                        type="number"
                        step={0.5}
                        value={subject.coefficient ?? ''}
                        onChange={(event) =>
                          store.saveSubject({
                            ...subject,
                            coefficient: event.target.value === '' ? null : Number(event.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Credits">
                      <input
                        type="number"
                        value={subject.credits ?? ''}
                        onChange={(event) =>
                          store.saveSubject({ ...subject, credits: event.target.value === '' ? null : Number(event.target.value) })
                        }
                        className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Weekly target (min)">
                      <input
                        type="number"
                        step={15}
                        value={subject.weeklyTargetMin}
                        onChange={(event) => store.saveSubject({ ...subject, weeklyTargetMin: Number(event.target.value) })}
                        className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Self-declared difficulty (1-5)">
                      <Select
                        value={subject.difficulty}
                        onChange={(event) => store.saveSubject({ ...subject, difficulty: Number(event.target.value) })}
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Chapters" subtitle="Mastery can be adjusted manually; the estimator then only proposes">
            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {state.snapshot.chapters.map((chapter) => (
                <ChapterRow key={chapter.id} chapter={chapter} subjects={subjects} onSave={(next) => store.saveChapter(next)} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'timetable' && (
        <div className="space-y-4">
          <Card
            title="Weekly timetable"
            subtitle="Provisional slots are marked “to confirm” — replace them with the official timetable when it is published"
          >
            <ul className="space-y-2">
              {[...classes]
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
                .map((slot) => (
                  <ClassRow
                    key={slot.id}
                    slot={slot}
                    subjects={subjects}
                    onSave={(next) => store.saveClass(next)}
                    onDelete={() => store.deleteClass(slot.id)}
                  />
                ))}
            </ul>
            <Button
              className="mt-3"
              size="sm"
              variant="secondary"
              onClick={() =>
                store.saveClass({
                  id: `class-${Date.now()}`,
                  subjectId: subjects[0]?.id ?? '',
                  dayOfWeek: 0,
                  startTime: '08:00',
                  endTime: '09:30',
                  kind: 'CM',
                  room: '',
                  groupLabel: '',
                  instructor: '',
                  weekParity: 'all',
                  active: true,
                  provenance: 'to-confirm',
                })
              }
            >
              Add class slot
            </Button>
          </Card>
          <Card title="Class time is always subtracted" subtitle="How the planner uses the timetable">
            <ul className="space-y-1.5 text-xs text-text-muted">
              <li>• Free windows are computed from your day bounds minus every active class slot on that weekday.</li>
              <li>• Available minutes = min(your check-in answer, daily maximum, real free time).</li>
              <li>• When classes exist, the plan carries an explicit note so you know why the day is shorter.</li>
            </ul>
          </Card>
        </div>
      )}

      {tab === 'goals' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Long-term goals" subtitle="Progress is computed from completed work only">
            <ul className="space-y-3">
              {goals.map((goal) => (
                <GoalRow key={goal.id} goal={goal} onSave={(next) => store.saveGoal(next)} />
              ))}
              {goals.length === 0 && <li className="text-sm text-text-muted">No goal yet.</li>}
            </ul>
            <Button
              className="mt-3"
              size="sm"
              variant="secondary"
              onClick={() =>
                store.saveGoal({
                  id: `goal-${Date.now()}`,
                  title: 'New semester goal',
                  description: '',
                  deadline: null,
                  subjectIds: [],
                  targetTasks: 60,
                  targetMin: 3600,
                  state: 'active',
                  createdAt: new Date().toISOString(),
                })
              }
            >
              Add goal
            </Button>
          </Card>

          <Card title="Habits" subtitle="Tracked as real check-offs; the habit matrix shows stored data only">
            <ul className="space-y-2">
              {habits.map((habit) => (
                <HabitRow key={habit.id} habit={habit} subjects={subjects} onSave={(next) => store.saveHabit(next)} />
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'data' && (
        <div className="space-y-4">
          <Card title="Local-first storage" subtitle="SQLite in your browser — no external service is required">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="Subjects" value={counts.subjects} />
              <StatTile label="Chapters" value={counts.chapters} />
              <StatTile label="Tasks" value={counts.tasks} />
              <StatTile label="Sessions" value={counts.sessions} />
              <StatTile label="Timetable slots" value={counts.classes} />
              <StatTile label="Mistakes" value={counts.mistakes} />
              <StatTile label="Insights stored" value={counts.events} />
              <StatTile label="Flushes" value={state.flushCount} hint="writes persisted" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => store.downloadExport('json')}>
                Download JSON backup
              </Button>
              <Button size="sm" variant="secondary" onClick={() => store.downloadExport('csv')}>
                Download CSV (tasks & sessions)
              </Button>
              <Button size="sm" variant="secondary" onClick={() => store.downloadDatabase()}>
                Download SQLite file
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void store.flush()}>
                Persist now
              </Button>
            </div>
          </Card>

          <Card title="Restore / import" subtitle="Import merges records; completed sessions are never destroyed">
            <Field label="Paste a JSON backup">
              <TextArea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder='{"subjects": […], "tasks": […]}' />
            </Field>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  setImportText(text);
                }}
              />
              <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
                Choose file…
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={importText.trim().length === 0}
                onClick={async () => {
                  try {
                    const report = await store.importJson(importText);
                    setImportReport(
                      report.errors.length === 0
                        ? `${report.imported} record(s) imported successfully.`
                        : report.errors.length > 0 && report.imported === 0
                          ? `Nothing imported. ${report.errors.slice(0, 3).join('; ')}`
                          : `${report.imported} record(s) imported, ${report.errors.length} error(s): ${report.errors.slice(0, 3).join('; ')}`,
                    );
                  } catch (error) {
                    setImportReport(`Import failed: ${(error as Error).message}`);
                  }
                }}
              >
                Import backup
              </Button>
            </div>
            {importReport && <p className="mt-2 text-xs text-text-muted">{importReport}</p>}
            <p className="mt-2 text-[11px] text-text-muted">
              The parser validates every record before writing. Unknown fields are ignored, invalid rows are reported and
              skipped instead of corrupting your history.
            </p>
          </Card>

          <Card title="Danger zone" subtitle="Reset is explicit and never silent">
            {!confirmReset ? (
              <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>
                Reset all data…
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-danger">
                  This deletes tasks, sessions, mistakes and plans, and re-seeds the academic configuration. Export a
                  backup first — the action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      store.resetAll();
                      setConfirmReset(false);
                    }}
                  >
                    Yes, reset everything
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card title="Data integrity" subtitle="What this app will never do">
            <ul className="space-y-1.5 text-xs text-text-muted">
              <li>• No fabricated statistics: charts read only stored tasks, sessions, reviews and mistakes.</li>
              <li>• No fake streaks: a day without recorded work is not counted as active.</li>
              <li>• No silent deletions: skipping moves work to the backlog, archiving requires a long interruption.</li>
              <li>• No rank or grade prediction, and no medical or psychological claims.</li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function ChapterRow({
  chapter,
  subjects,
  onSave,
}: {
  chapter: Chapter;
  subjects: Subject[];
  onSave: (chapter: Chapter) => void;
}) {
  const subject = subjects.find((s) => s.id === chapter.subjectId);
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: subject?.color }} />
          {chapter.title}
        </span>
        <span className="flex items-center gap-2 text-[11px] text-text-muted">
          {MASTERY_TEXT[chapter.mastery]}
          {chapter.masteryManual !== null && <Badge tone="accent">manual</Badge>}
        </span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <Field label="Title">
          <input
            value={chapter.title}
            onChange={(event) => onSave({ ...chapter, title: event.target.value })}
            className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Expected minutes">
          <input
            type="number"
            step={15}
            value={chapter.expectedMin}
            onChange={(event) => onSave({ ...chapter, expectedMin: Number(event.target.value) })}
            className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Mastery">
          <Select value={chapter.mastery} onChange={(event) => onSave({ ...chapter, mastery: Number(event.target.value) as Chapter['mastery'] })}>
            {[0, 1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {level} — {MASTERY_TEXT[level]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );
}

function ClassRow({
  slot,
  subjects,
  onSave,
  onDelete,
}: {
  slot: UniversityClass;
  subjects: Subject[];
  onSave: (slot: UniversityClass) => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select
            value={slot.subjectId}
            onChange={(event) => onSave({ ...slot, subjectId: event.target.value })}
            className="max-w-48"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.shortName}
              </option>
            ))}
          </Select>
          <Select value={slot.kind} onChange={(event) => onSave({ ...slot, kind: event.target.value as UniversityClass['kind'] })} className="max-w-24">
            {(['CM', 'TD', 'TP', 'EXAM'] as const).map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </Select>
          <ProvenanceBadge provenance={slot.provenance} />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <input type="checkbox" checked={slot.active} onChange={(event) => onSave({ ...slot, active: event.target.checked })} />
            active
          </label>
          <Button size="sm" variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-5">
        <Field label="Day">
          <Select value={slot.dayOfWeek} onChange={(event) => onSave({ ...slot, dayOfWeek: Number(event.target.value) })}>
            {DAYS.map((day, index) => (
              <option key={day} value={index}>
                {day.slice(0, 3)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start">
          <input
            type="time"
            value={slot.startTime}
            onChange={(event) => onSave({ ...slot, startTime: event.target.value })}
            className="w-full min-w-0 rounded-xl border border-border bg-surface-sunken px-2 py-2 text-sm"
          />
        </Field>
        <Field label="End">
          <input
            type="time"
            value={slot.endTime}
            onChange={(event) => onSave({ ...slot, endTime: event.target.value })}
            className="w-full min-w-0 rounded-xl border border-border bg-surface-sunken px-2 py-2 text-sm"
          />
        </Field>
        <Field label="Room / amphi">
          <input
            value={slot.room}
            onChange={(event) => onSave({ ...slot, room: event.target.value })}
            className="w-full rounded-xl border border-border bg-surface-sunken px-2 py-2 text-sm"
          />
        </Field>
        <Field label="Group">
          <input
            value={slot.groupLabel}
            onChange={(event) => onSave({ ...slot, groupLabel: event.target.value })}
            className="w-full rounded-xl border border-border bg-surface-sunken px-2 py-2 text-sm"
          />
        </Field>
      </div>
    </li>
  );
}

function GoalRow({ goal, onSave }: { goal: Goal; onSave: (goal: Goal) => void }) {
  return (
    <li className="rounded-xl border border-border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Title">
          <input
            value={goal.title}
            onChange={(event) => onSave({ ...goal, title: event.target.value })}
            className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Deadline">
          <input
            type="date"
            value={goal.deadline ?? ''}
            onChange={(event) => onSave({ ...goal, deadline: event.target.value || null })}
            className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Target tasks">
          <input
            type="number"
            value={goal.targetTasks}
            onChange={(event) => onSave({ ...goal, targetTasks: Number(event.target.value) })}
            className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Target minutes">
          <input
            type="number"
            step={60}
            value={goal.targetMin}
            onChange={(event) => onSave({ ...goal, targetMin: Number(event.target.value) })}
            className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
          />
        </Field>
        <Field label="State">
          <Select value={goal.state} onChange={(event) => onSave({ ...goal, state: event.target.value as Goal['state'] })}>
            {(['active', 'achieved', 'archived'] as const).map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <input
            value={goal.description}
            onChange={(event) => onSave({ ...goal, description: event.target.value })}
            className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
          />
        </Field>
      </div>
    </li>
  );
}

function HabitRow({
  habit,
  subjects,
  onSave,
}: {
  habit: Habit;
  subjects: Subject[];
  onSave: (habit: Habit) => void;
}) {
  return (
    <li className="rounded-xl border border-border p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <Field label="Name">
          <input
            value={habit.name}
            onChange={(event) => onSave({ ...habit, name: event.target.value })}
            className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Colour">
          <input
            type="color"
            value={habit.color}
            onChange={(event) => onSave({ ...habit, color: event.target.value })}
            className="h-10 w-full rounded-xl border border-border bg-transparent"
          />
        </Field>
        <Field label="Target per week">
          <input
            type="number"
            min={1}
            max={7}
            value={habit.targetPerWeek}
            onChange={(event) => onSave({ ...habit, targetPerWeek: Number(event.target.value) })}
            className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Linked subject">
          <Select value={habit.subjectId ?? ''} onChange={(event) => onSave({ ...habit, subjectId: event.target.value || null })}>
            <option value="">Any</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.shortName}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-text-muted">
        <input type="checkbox" checked={habit.active} onChange={(event) => onSave({ ...habit, active: event.target.checked })} />
        active
      </label>
    </li>
  );
}
