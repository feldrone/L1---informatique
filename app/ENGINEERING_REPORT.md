# FINAL ENGINEERING REPORT — Personal Study Performance System (L1 SI, UBMA Annaba)

Branch: `arena/01a0d904-l1-informatique` · Application root: `app/`
Every claim below was verified by running the command shown in the same row. Anything not executed is
listed under **Known limitations / not verified**.

---

## 1. Stack (exact, as installed and executed)

| Layer | Choice | Version |
|---|---|---|
| Language | TypeScript (strict, `noUnusedLocals`, `noUnusedParameters`) | 5.9.3 |
| UI | React + React DOM | 19.3.0 |
| Build | Vite + `@vitejs/plugin-react` | 7.3.6 / 5.2.0 |
| Styling | Tailwind CSS v4 (CSS-first `@theme`, `@custom-variant dark`) via `@tailwindcss/vite` | 4.x |
| Storage | SQLite compiled to WebAssembly (`sql.js`), persisted to IndexedDB | 1.13.0 |
| Tests | Vitest | 3.2.7 |
| Backend | **none** — local-first SPA, offline-capable | — |

No additional dependency was introduced for charts, routing, state or dates: rings/heatmap/bars are
hand-written SVG+CSS, routing is a 40-line hash router, state uses `useSyncExternalStore`.

Node used for verification: v22.22.3 · npm 10.9.8.

## 2. Exact commands

```bash
cd app
npm install        # one-off; 163 packages
npm run dev        # dev server, 0.0.0.0:5173
npm test           # vitest run  -> full suite
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit && vite build  -> dist/
npm run preview    # serve dist/ on 0.0.0.0:4173
```

## 3. Architecture

```
domain/   pure deterministic logic, no React and no DB access
  types.ts (27 exported interfaces) · date.ts · ids.ts
  seed/academic.ts        the ONLY source of academic data (subjects, chapters, classes, habits, rules, goals)
  planning/               planner · priority · behaviour · mastery · revision · recovery
  analytics/              common · progress · streaks/consistency · heatmap · balance · insights · goals/achievements
db/       migrations (v1 + v2, 22 tables, 9 indexes) · DbClient over sql.js · Repository · seed · browser persistence
state/    StudyStore (single state layer) · computeAnalytics (derived bundle) · React provider/hooks
ui/       components (primitives, charts, task card, focus timer, day drawer) · screens (12) · hash router
```

**Data flow**: screen → store action → SQLite transaction → slice reload + monotonic `revision` bump →
`useSyncExternalStore` re-render → analytics recomputed with `useMemo`. Derived values are never
persisted, so a chart cannot disagree with the stored records. History is append-only
(`events`, `mastery_history`, `study_sessions`); nothing is deleted by normal use.

## 4. Screens implemented (12 core + shell)

Dashboard · Today · Weekly plan · Subjects · Subject detail · Chapter detail · Focus timer ·
Recovery center · Exams · Analytics · Mistakes · Settings.
Plus: application shell with side rail (desktop) / bottom bar (mobile), calendar **day inspection
drawer**, check-in card, end-of-day review card, quick-complete modal, add-task modal.

Mobile dashboard order follows the specification: progress ring → tasks → timer shortcut → streak →
subject balance → weekly chart → calendar.

## 5. Planning algorithm (verified in code + tests)

```
freeWindows   = day bounds − active class slots (15-min transition after each class)
availableMin  = min(check-in answer, rules.maxDailyMin, freeMinutes)      // classes always subtracted
bufferMin     = round(availableMin × rules.bufferRatio)   (default 0.18)  // never fills 100 %
usableMin     = availableMin − bufferMin
mode          = minimum-viable  if energy ≤ 1 or usableMin < 60
              | recovery         if missedDays ≥ 1
              | exam             if an exam is within rules.examModeWindowDays (default 7)
              | normal           otherwise
```
Task block length is capped by `rules.maxBlockMin` (60 min default); longer work is split; skipped
tasks shrink to a 10-minute start block; repeated overshoot raises future estimates by ≤ 15 %.

**Subject priority** (multiplicative, transparent, no fake precision):

```
weight        = clamp(0.6 + 0.8 × coefficient / maxCoefficient, 0.4, 1.6)
weakness      = clamp(1 + 0.9 × (1 − avgMastery / 5), 1, 2)        // no chapters ⇒ mid-weakness, not "perfect"
urgency       = clamp(1 + 1.1 × exp(−daysToExam / 6), 1, 2.8)      // 6-day half-life
backlog       = clamp(1 + 0.8 × overdueMin / max(60, weeklyTarget/2), 1, 2.2)
revisionDecay = 1 + 0.6 × min(elapsedDays / interval, 2)
priority      = weight × weakness × urgency × backlog × revisionDecay
```
Every factor also emits a human sentence ("High coefficient (4)", "Weak mastery (average 1.3/5 over
6 chapters)", "Assessment in 3 day(s)", "120 min overdue", "Revision due / weak retention window").

**Mastery 0–5** (Not started → Seen → Understood → Practised → Confident → Exam-ready) is estimated
from recorded evidence (sessions, active recall, quiz accuracy, open mistakes, difficulty feedback).
One success never promotes a chapter to Exam-ready; manual overrides are stored separately and only
proposed against, never silently overwritten. A failed recall lowers mastery by at most one level.

**Spaced review** uses intervals `1 / 3 / 7 / 14 / 30` days (editable). Only a recorded recall attempt
moves the schedule: pass stretches it, fail brings the chapter back sooner. Passive reading is not
counted as revision.

## 6. Recovery algorithm (modes A–D)

```
missedDays ≤ 1 → A   normal planning
missedDays ≤ 3 → B   controlled backlog reduction
missedDays ≤ 7 → C   emergency catch-up
otherwise      → D   reset & rebuild
daily budget   = A min(todayCapacity|0.35×maxDaily, 90) · B min(0.45×maxDaily, 120) · C min(0.40×maxDaily, 150) · D min(0.35×maxDaily, 120)
capacity       = budget × horizonDays × (A 1.0 | B 0.9 | C 0.75 | D 0.6)     // deeper interruption ⇒ more room for the normal routine
classification = protect (score ≥ 0.62) · distribute (≥ 0.35) · defer (≥ 0.18) · drop (mode D, ≥ 14 days overdue, score < 0.5, non-revision)
```
Overdue minutes are conserved: `recoverable + deferred + archived = overdue`. Recovery blocks are
written to **today only**; the rest of the horizon is planned normally. Nothing is deleted — archived
items remain in storage and recoverable minutes never exceed the daily maximum. A missed day never
doubles the next day's workload (asserted in tests).

## 7. Database schema (SQLite, migrations v1 + v2)

22 tables: `meta`, `preferences`, `subjects`, `chapters`, `university_classes`, `daily_plans`,
`study_tasks`, `study_sessions`, `check_ins`, `daily_reviews`, `exams`, `quizzes`, `mistakes`,
`review_events`, `backlog_items`, `goals`, `habits`, `achievements`, `settings` (v1) +
`events`, `insights`, `mastery_history` (v2) with 9 indexes. Migrations are versioned and idempotent;
seeding runs once and never duplicates rows (tested).

Persistence: the database bytes are flushed to IndexedDB (debounced 350 ms, plus on
`visibilitychange`/`pagehide`) with a rolling one-slot backup of the previous flush. A single shared
connection per page load prevents a stale handle from overwriting newer data.

## 8. Tests and results

`cd app && npx vitest run` → **6 files, 95 tests, all passing (exit 0)**

| Suite | Tests | Covers |
|---|---|---|
| `domain/planning/planner.test.ts` | 16 | spec §45 cases 1–15 (normal day, 1/3/7 missed days, exam in 3 days, weak high-weight subject, large backlog, very limited time, unexpected class, simultaneous deadlines, repeated skip, faster than estimate, repeated overshoot, minimum viable day, exam mode) + determinism |
| `domain/planning/engine.test.ts` | 14 | priority factors, behaviour signals, mastery estimator, spaced review, recovery modes A–D incl. mode-D archiving |
| `domain/analytics/analytics.test.ts` | 28 | progress %, effective minutes, streaks/longest/recovery streak, missed-day detection, consistency transparency, distribution, weekly/monthly stats, heatmap levels, habit matrix, balance, insights, goals; edge cases: 0 tasks, 0 completed, 1 completed, 100 %, partial completion, empty history, new user, midnight boundary, DST spring/autumn, year rollover |
| `db/db.test.ts` | 7 | migrations idempotency, seeding once, repository round-trips, backup/restore, wipe |
| `state/store.test.ts` | 15 | real in-memory SQLite: seeding, **zero fabricated history**, plan generation (buffer, block caps, reasons, rest day), regeneration preserving completed work, task lifecycle → session → analytics, skip → backlog, split/short-start, recovery plan + application, mastery never auto-mastered, recall downgrade, JSON export/import round-trip, invalid-import reporting, CSV, SQLite bytes |
| `ui/screens/screens.test.tsx` | 15 | server-side render of all 12 screens from the real store (no throw, no `NaN`/`undefined%`), honest empty states, dashboard update after completing a task, planner rationale and recovery mode visible |

Other verified results:

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 (no diagnostics) |
| `npm run build` | exit 0 — `dist/` : JS 506 kB (145 kB gz), CSS 33 kB (6.7 kB gz), sql.js isolated in a separate chunk, `sql-wasm.wasm` 658 kB emitted |
| `npm run dev` | HTTP 200 on `0.0.0.0:5173`; `sql.js` pre-bundle 200; `/node_modules/sql.js/dist/sql-wasm.wasm` 200 with `content-type: application/wasm` |
| Browser asset check | `?url` wasm import resolves and is served with the MIME type required by `WebAssembly.instantiateStreaming` |

## 9. Data-integrity guarantees (enforced, tested)

- A brand-new database contains **zero** statistics: 0 sessions, 0 completions, 0 streak, empty
  heatmap, `consistency.insufficientData = true`, insight `Not enough data yet.`
- A day in progress is never reported as missed (`missedToday === false`); a day counts as active from
  20 effective minutes; passive reading is weighted below active recall.
- Consistency is labelled as preparation regularity, never intelligence, grade or rank. No rank or
  grade prediction anywhere in the app; no medical or psychological claims.
- Skipping → backlog; archiving only in mode D after a long interruption; import runs in one
  transaction and reports invalid rows instead of writing partial garbage.
- Academic data lives only in `domain/seed/academic.ts`, every row carries a provenance badge
  (`verified` / `partial` / `to-confirm` / `supplementary`) and is editable in Settings.

## 10. Known limitations (not verified / out of scope)

1. **No real-browser execution available in this environment** (Playwright browser download failed).
   Therefore: 60 FPS animation smoothness, actual horizontal-overflow behaviour, real keyboard tab
   order, and pixel-level responsive layout were verified by code review (CSS transforms with
   GPU-friendly durations, `prefers-reduced-motion` support, `overflow-x-auto` + `min-w-0` containers,
   `tabIndex`/`role`/`aria-label`s on interactive SVG) and by server-side rendering of every screen —
   **not** by running a browser. `npm run dev` serves the app (HTTP 200) and all runtime assets
   resolve, but a human visual pass is still recommended.
2. Analytics recompute from the full snapshot after each mutation. This is exact and instant at the
   scale of a semester (hundreds of rows); it has not been benchmarked for tens of thousands of rows.
3. No backend sync/multi-device support. Data is per browser profile; portability is via
   JSON/CSV/SQLite export/import. No external service is required for any basic function.
4. Timetable slots are provisional (`to-confirm`) waiting for the official 2026/27 grid; all 8 S1
   modules, their coefficients/credits and 27 chapters are seeded with provenance, but values marked
   `to-confirm`/`partial` must be checked against the faculty documents.
5. The interface is in English; module/chapter names are in French, as published.
6. Notifications are in-app only (dashboard "Revision due" / "Backlog detected" / "Priority now"
   panels). No browser push notification is sent, which trivially satisfies the no-spam rule.
7. Long-horizon adaptation quality (does the plan actually improve results over a semester?) is a
   product outcome, not something a test-suite can verify; the system optimises preparation,
   coverage, revision, practice and consistency and never promises a rank.

## 11. Git state

- Branch `arena/01a0d904-l1-informatique`, based on `b7b5b21` (`main` untouched).
- Commits: `70d0316` (feature), `e751cdc` (single DB handle + targeted chapter updates), `605bbe5`
  (mobile dashboard order). `git status --short --branch` clean, `git diff --check` reports nothing.
- No force-push, no rebase, no reset, no deletion of pre-existing content.
