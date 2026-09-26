/**
 * Settings — bilingual, with language selector and onboarding replay.
 */

import { useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Field, ProvenanceBadge, Select, StatTile, TextArea, cx } from '../components/primitives';
import { useStore, useStudy } from '../../state/provider';
import { useI18n } from '../../i18n';
import { LanguageSelector } from '../components/languageSelector';
import { MASTERY_TEXT } from '../lookups';
import type { Chapter, Goal, Habit, Subject, UniversityClass, UserRules } from '../../domain/types';

type Tab = 'rules' | 'academics' | 'timetable' | 'goals' | 'data';

const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function SettingsScreen({ onOpenOnboarding }: { onOpenOnboarding?: () => void }) {
  const { state, theme, toggleTheme } = useStudy();
  const { t, lang, resetOnboarding } = useI18n();
  const store = useStore();
  const [tab, setTab] = useState<Tab>('rules');
  const [rules, setRules] = useState<UserRules>(store.planningRules());
  const [displayName, setDisplayName] = useState(state.snapshot.preferences.displayName);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importReport, setImportReport] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const DAYS = lang === 'ar' ? DAYS_AR : DAYS_EN;

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
    const currentLang = state.snapshot.preferences.language ?? 'en';
    store.savePreferences({ displayName, theme, language: currentLang, rules: next });
    setSavedAt(new Date().toISOString().slice(11, 19));
  };

  const saveProfile = () => {
    const currentLang = state.snapshot.preferences.language ?? 'en';
    store.savePreferences({ displayName, theme, language: currentLang, rules });
    setSavedAt(new Date().toISOString().slice(11, 19));
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t('settings.title')}</h1>
          <p className="text-xs text-text-muted">{t('settings.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && <Badge tone="success">saved {savedAt}</Badge>}
          {onOpenOnboarding && (
            <Button size="sm" variant="ghost" onClick={onOpenOnboarding}>
              {t('settings.replayTutorial')}
            </Button>
          )}
        </div>
      </header>

      <Card title={t('settings.language')} subtitle={t('settings.languageDesc')}>
        <LanguageSelector variant="settings" />
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              resetOnboarding();
              onOpenOnboarding?.();
            }}
          >
            {t('common.replay')}
          </Button>
        </div>
      </Card>

      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-1.5">
        {(
          [
            ['rules', t('settings.profile')],
            ['academics', t('settings.subjects')],
            ['timetable', t('settings.timetable')],
            ['goals', t('settings.goals')],
            ['data', t('settings.data')],
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
          <Card title={t('settings.profile')} subtitle={t('settings.profile')}>
            <Field label={t('settings.displayName')}>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                onBlur={saveProfile}
                className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm"
              />
            </Field>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-text-muted">{t('settings.theme')}</span>
              <Button size="sm" variant="secondary" onClick={toggleTheme}>
                {theme === 'dark' ? t('header.themeDark') : t('header.themeLight')} — switch
              </Button>
            </div>
            <div className="mt-3">
              <Button size="sm" variant="primary" onClick={saveProfile}>
                {t('settings.save')}
              </Button>
            </div>
          </Card>

          <Card title={t('settings.dailyLimits')} subtitle={t('settings.dailyLimits')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('form.availableTime')}>
                <input type="number" min={10} value={rules.minDailyMin} onChange={(e) => save({ minDailyMin: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" />
              </Field>
              <Field label={t('settings.dailyLimits')}>
                <input type="number" min={60} value={rules.maxDailyMin} onChange={(e) => save({ maxDailyMin: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" />
              </Field>
              <Field label={t('week.planned')}>
                <input type="number" min={60} step={30} value={rules.minWeeklyMin} onChange={(e) => save({ minWeeklyMin: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" />
              </Field>
              <Field label={t('form.plannedMin')}>
                <input type="number" min={20} value={rules.maxBlockMin} onChange={(e) => save({ maxBlockMin: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" />
              </Field>
            </div>
          </Card>

          <Card title={t('settings.focusRevision')} subtitle={t('settings.focusRevision')}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t('focus.focusLength')}>
                <input type="number" min={10} value={rules.focusMin} onChange={(e) => save({ focusMin: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" />
              </Field>
              <Field label={t('focus.breakLength')}>
                <input type="number" min={1} value={rules.breakMin} onChange={(e) => save({ breakMin: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" />
              </Field>
              <Field label={t('form.date')}>
                <input type="number" step={15} value={rules.sleepTargetMin} onChange={(e) => save({ sleepTargetMin: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" />
              </Field>
            </div>
          </Card>

          <Card title={t('settings.timetable')} subtitle={t('settings.timetable')}>
            <p className="mb-2 text-xs text-text-muted">{t('week.consistency')}</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((day, index) => {
                const active = rules.restDays.includes(index);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={active}
                    onClick={() => save({ restDays: active ? rules.restDays.filter((d) => d !== index) : [...rules.restDays, index].sort() })}
                    className={cx('min-h-8 rounded-full border px-3 py-1.5 text-xs transition', active ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:text-text')}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {tab === 'academics' && (
        <div className="space-y-4">
          <Card title={t('settings.subjects')} subtitle={t('settings.subjects')}>
            <ul className="space-y-3">
              {subjects.map((subject) => (
                <li key={subject.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input type="color" value={subject.color} onChange={(e) => store.saveSubject({ ...subject, color: e.target.value })} className="h-7 w-7 rounded border border-border bg-transparent" aria-label={subject.name} />
                      <span className="text-sm font-medium">{subject.name}</span>
                      <ProvenanceBadge provenance={subject.provenance} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title={t('subjects.title')} subtitle={t('subjects.subtitle')}>
            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {state.snapshot.chapters.map((chapter) => (
                <ChapterRow key={chapter.id} chapter={chapter} subjects={subjects} onSave={(next) => store.saveChapter(next)} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'timetable' && (
        <Card title={t('settings.timetable')} subtitle={t('settings.timetable')}>
          <ul className="space-y-2">
            {[...classes].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)).map((slot) => (
              <ClassRow key={slot.id} slot={slot} subjects={subjects} onSave={(next) => store.saveClass(next)} onDelete={() => store.deleteClass(slot.id)} />
            ))}
          </ul>
        </Card>
      )}

      {tab === 'goals' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={t('settings.goals')} subtitle={t('settings.goals')}>
            <ul className="space-y-3">
              {goals.map((goal) => (
                <GoalRow key={goal.id} goal={goal} onSave={(next) => store.saveGoal(next)} />
              ))}
              {goals.length === 0 && <li className="text-sm text-text-muted">{t('common.noData')}</li>}
            </ul>
          </Card>
          <Card title={t('settings.habits')} subtitle={t('settings.habits')}>
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
          <Card title={t('settings.data')} subtitle={t('settings.data')}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label={t('nav.subjects')} value={counts.subjects} />
              <StatTile label={t('nav.subjects')} value={counts.chapters} />
              <StatTile label={t('dashboard.tasksCompleted')} value={counts.tasks} />
              <StatTile label={t('glossary.focus')} value={counts.sessions} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => store.downloadExport('json')}>{t('settings.export')} JSON</Button>
              <Button size="sm" variant="secondary" onClick={() => store.downloadExport('csv')}>{t('settings.export')} CSV</Button>
              <Button size="sm" variant="secondary" onClick={() => store.downloadDatabase()}>{t('settings.export')} SQLite</Button>
            </div>
          </Card>

          <Card title={t('settings.data')} subtitle={t('settings.data')}>
            <Field label={t('form.note')}>
              <TextArea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"subjects": [...]}' />
            </Field>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const text = await file.text(); setImportText(text); }} />
              <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>{t('form.add')} file</Button>
              <Button size="sm" variant="primary" disabled={importText.trim().length === 0} onClick={async () => { try { const report = await store.importJson(importText); setImportReport(`${report.imported} imported, ${report.errors.length} errors`); } catch (err) { setImportReport(`Failed: ${(err as Error).message}`); } }}>{t('settings.import')}</Button>
            </div>
            {importReport && <p className="mt-2 text-xs text-text-muted">{importReport}</p>}
          </Card>

          <Card title={t('settings.dangerZone')} subtitle={t('settings.dangerZone')}>
            {!confirmReset ? (
              <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>{t('settings.reset')}</Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-danger">{t('common.confirm')}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" onClick={() => { store.resetAll(); setConfirmReset(false); }}>{t('common.confirm')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>{t('common.cancel')}</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function ChapterRow({ chapter, subjects, onSave }: { chapter: Chapter; subjects: Subject[]; onSave: (chapter: Chapter) => void }) {
  const subject = subjects.find((s) => s.id === chapter.subjectId);
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: subject?.color }} />
          {chapter.title}
        </span>
        <span className="text-[11px] text-text-muted">{MASTERY_TEXT[chapter.mastery]}</span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <Field label="Title">
          <input value={chapter.title} onChange={(e) => onSave({ ...chapter, title: e.target.value })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" />
        </Field>
        <Field label="Minutes">
          <input type="number" step={15} value={chapter.expectedMin} onChange={(e) => onSave({ ...chapter, expectedMin: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" />
        </Field>
        <Field label="Mastery">
          <Select value={chapter.mastery} onChange={(e) => onSave({ ...chapter, mastery: Number(e.target.value) as Chapter['mastery'] })}>
            {[0, 1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} — {MASTERY_TEXT[level]}</option>)}
          </Select>
        </Field>
      </div>
    </div>
  );
}

function ClassRow({ slot, subjects, onSave, onDelete }: { slot: UniversityClass; subjects: Subject[]; onSave: (slot: UniversityClass) => void; onDelete: () => void }) {
  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select value={slot.subjectId} onChange={(e) => onSave({ ...slot, subjectId: e.target.value })} className="max-w-48">
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.shortName}</option>)}
          </Select>
          <Select value={slot.kind} onChange={(e) => onSave({ ...slot, kind: e.target.value as UniversityClass['kind'] })} className="max-w-24">
            {(['CM', 'TD', 'TP', 'EXAM'] as const).map((k) => <option key={k} value={k}>{k}</option>)}
          </Select>
          <ProvenanceBadge provenance={slot.provenance} />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-text-muted"><input type="checkbox" checked={slot.active} onChange={(e) => onSave({ ...slot, active: e.target.checked })} />active</label>
          <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-5">
        <Field label="Day"><Select value={slot.dayOfWeek} onChange={(e) => onSave({ ...slot, dayOfWeek: Number(e.target.value) })}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=><option key={d} value={i}>{d}</option>)}</Select></Field>
        <Field label="Start"><input type="time" value={slot.startTime} onChange={(e) => onSave({ ...slot, startTime: e.target.value })} className="w-full min-w-0 rounded-xl border border-border bg-surface-sunken px-2 py-2 text-sm" /></Field>
        <Field label="End"><input type="time" value={slot.endTime} onChange={(e) => onSave({ ...slot, endTime: e.target.value })} className="w-full min-w-0 rounded-xl border border-border bg-surface-sunken px-2 py-2 text-sm" /></Field>
        <Field label="Room"><input value={slot.room} onChange={(e) => onSave({ ...slot, room: e.target.value })} className="w-full rounded-xl border border-border bg-surface-sunken px-2 py-2 text-sm" /></Field>
        <Field label="Group"><input value={slot.groupLabel} onChange={(e) => onSave({ ...slot, groupLabel: e.target.value })} className="w-full rounded-xl border border-border bg-surface-sunken px-2 py-2 text-sm" /></Field>
      </div>
    </li>
  );
}

function GoalRow({ goal, onSave }: { goal: Goal; onSave: (goal: Goal) => void }) {
  return (
    <li className="rounded-xl border border-border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Title"><input value={goal.title} onChange={(e) => onSave({ ...goal, title: e.target.value })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" /></Field>
        <Field label="Deadline"><input type="date" value={goal.deadline ?? ''} onChange={(e) => onSave({ ...goal, deadline: e.target.value || null })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" /></Field>
      </div>
    </li>
  );
}

function HabitRow({ habit, subjects, onSave }: { habit: Habit; subjects: Subject[]; onSave: (habit: Habit) => void }) {
  return (
    <li className="rounded-xl border border-border p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <Field label="Name"><input value={habit.name} onChange={(e) => onSave({ ...habit, name: e.target.value })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" /></Field>
        <Field label="Colour"><input type="color" value={habit.color} onChange={(e) => onSave({ ...habit, color: e.target.value })} className="h-10 w-full rounded-xl border border-border bg-transparent" /></Field>
        <Field label="Target"><input type="number" min={1} max={7} value={habit.targetPerWeek} onChange={(e) => onSave({ ...habit, targetPerWeek: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm" /></Field>
        <Field label="Subject"><Select value={habit.subjectId ?? ''} onChange={(e) => onSave({ ...habit, subjectId: e.target.value || null })}><option value="">Any</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.shortName}</option>)}</Select></Field>
      </div>
    </li>
  );
}
