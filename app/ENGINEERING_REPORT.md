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

1. ~~No real-browser execution available in this environment~~ — **superseded by §12**: a real
   Chromium (153.0.8010.0) was launched and the whole surface was driven in it. Non-Chromium engines
   (Firefox/WebKit) and physical devices remain unverified; see §12.3.
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

## 12. Phase 2 — real-browser verification and fixes

Everything in this section was measured on a running application, not inferred from source. The QA
harness lived outside the repository (`/home/user/.qa-browser`) and is not part of the deliverable.

### 12.1 Environment and method

- **Browser: Chromium 153.0.8010.0**, headless, launched from the npm-bundled binary
  `@sparticuz/chromium@153.0.0` and driven by `playwright-core@1.63.0`. NSS/NSPR libraries shipped in
  the same package (`al2023.tar.br`) were exposed through `LD_LIBRARY_PATH`.
- The `@sparticuz` default arguments include `--single-process` and `--disable-site-isolation-trials`.
  Those were **dropped** for QA (clean flag set: `--no-sandbox --disable-dev-shm-usage --headless=new
  --disable-gpu …`) because they make separate browser contexts share storage — see §12.4.
- Application under test: Vite dev server (`npm run dev`, `http://127.0.0.1:5173`), React 19 in
  `StrictMode`, real WASM SQLite in the browser.
- **136 page loads**: 12 screens × 6 viewports (360×800, 390×844, 412×915 with
  `isMobile`+`hasTouch`; 1280×720, 1440×900, 1920×1080) plus the interaction, accessibility, timer,
  percentage and persistence runs.
- 37 screenshots were captured (Dashboard, Today, Weekly plan, Subjects, Analytics, Recovery Center,
  day-inspection drawer, mobile Dashboard/Today/Analytics, light theme) for before/after comparison.
  They are QA artefacts and are deliberately **not** committed.

### 12.2 Defects found in the browser and fixed

**P0 — data loss / silent failure**

1. **A task completed and then reloaded within the write debounce was lost.** Fixed by serialising
   every browser-database write through one chain, clearing the debounce on an explicit flush
   (350 ms → 120 ms) and forcing a flush after each of the ten mutating store methods. Verified:
   completing a task and navigating 80 ms later keeps the session (visible in Analytics); five
   rapid completions followed by an immediate reload keep `2/2`; closing and reopening the profile
   keeps `2/2`.
2. **Restoring your own backup failed silently.** Sessions were inserted instead of upserted, so a
   backup containing an already-present session raised `UNIQUE constraint failed:
   study_sessions.id`; the transaction rolled back, the error escaped `importJson` and the interface
   showed an empty report — the button appeared to do nothing. Fixed with `upsertSession`, per-group
   row validation, and a returned report (`Nothing imported. …` / `Import failed: … Nothing was
   changed.`). Verified in the browser: importing the same backup twice reports
   `63 record(s) imported successfully.` both times, 0 page errors. Three regression tests were added
   (`tests 95 → 98`).

**P1 — broken core behaviour**

3. **The quick-complete dialog was dead code**: task cards never requested it, so the modal could not
   be opened. Wired through `TaskList.onRequestComplete` on Today. Verified: dialog opens, saves, ring
   `0 % → 57 %`, tiles `1/2 · 20m logged · 19m effective`, Analytics and the streak update with no
   reload.
4. **The modal and the day drawer trapped input**: no Escape, no focus handling, backdrop clicks
   swallowed. Fixed with one `useDialogBehavior` hook (Escape, backdrop click, focus in, focus
   restore, Tab trap, scroll lock). Verified: Escape closes both, focus lands inside and returns.
5. **Focus timer**: the phase change happened inside a `setRemaining` updater (impure updater, unsafe
   under `StrictMode` double-invocation) and a finished focus block displayed a full `50:00` next to
   “Session finished”. The transition is now derived in an effect and a finished block keeps `00:00`.
   Verified with a fake clock: `49:30` → break `10:00` → ready `50:00` → finished `00:00`, saving
   records 50 m in Today, 0 console warnings.
6. **Progress-ring inset text crossed the ring stroke** (measured up to **28 px** past the inner
   radius on desktop and 19 px on mobile; the Analytics caption was clipped vertically). The inset is
   now padded to the circle, the numeral is smaller and the caption sits under the ring; each ring
   also states what its percentage is a percentage *of* (“of planned time” / “of decided tasks”),
   because the two rings legitimately measure different things. Verified with a text-range geometry
   audit: **0 crossings** on all four rings at 390×844 and 1440×900.
7. **The Dashboard “Today’s tasks” card contradicted itself** — header “All planned work handled”
   beside “No study task planned” and a button that would have regenerated finished work. The empty
   state now distinguishes a completed plan from a missing one.

**P2 — significant UX / accessibility**

8. **Horizontal overflow was masked by `body { overflow-x: hidden }`** (measured document width
   661 px at a 360 px viewport). The mask was removed and the real causes fixed (`min-w-0` on cards,
   hero, settings inputs and chart scrollers; `max-width: 100%` on media). Verified: 0 overflowing
   screens across all 6 viewports.
9. **Sub-32 px touch targets** (chips, tabs, heatmap cells, month navigation) were raised to ≥32 px;
   the audit now reports none under 32 px on mobile.
10. **Contrast**: filled accent buttons and badges were white on `#6C93F5` = **2.95:1**; light-theme
    accent text on `--color-accent-soft` was 4.26:1 and success text 3.49:1. Added an `--color-on-accent`
    ink token (dark ink `#08122a` = 6.3:1 on the dark accent; white = 5.6:1 on the deepened light
    accent `#3357bd`) and deepened light-theme `--color-success` to `#0b7a4b`. Verified by an automated
    audit: **0 text nodes below WCAG AA** across 10 screens in dark and 5 screens in light.
11. On desktop the hero card was stretched to the height of the neighbouring task list, leaving about
    200 px of empty card. `items-start` on the section restored natural heights.

### 12.3 VERIFIED

- **Console / network**: 0 console errors, 0 console warnings, 0 page errors and 0 failed requests
  across all 136 page loads and every interaction run.
- **Layout**: no horizontal overflow on any of the 12 screens at 360/390/412/1280/1440/1920.
- **Navigation and flows (38 assertions, all passing)**: all 10 rail links; Start → Focus timer with
  the task persisted as running; pause; quick-complete; add-task modal; skip → backlog item visible
  in Recovery Center; Recovery Center MODE A with 45 m overdue → accept → Today gains
  `Recovery — Ch I — Le corps des réels (bornes, récurrence, topologie)` (type `recovery`, High, 35 m);
  day-inspection drawer with real data and Escape to close; daily check-in save + plan regeneration;
  end-of-day review with blocker chip “Fatigue”; focus session with distraction logged and saved;
  browser Back returning to `/analytics`.
- **Arithmetic (12 checks, all passing)**: with known inputs the Today ring reports logged minutes,
  planned minutes, task counts and `round(100 × logged / planned)` correctly at 0, 1, 25, 50, 75 and
  100 minutes logged; the same numbers appear in the day drawer; the Analytics ring matches
  decided-task completion (100 % when every planned task is decided); a heatmap cell reads
  `2026-09-25: 30 min` for a 30-minute session. Inspected values came from temporary profiles that
  were discarded afterwards.
- **Persistence**: a completion 80 ms before navigating survives; five rapid writes survive an
  immediate reload; data survives closing and reopening the profile; a second, separate profile
  starts empty (`0/2` tasks, `0m` logged) — i.e. no fabricated history and no cross-profile leak.
- **Accessibility**: first Tab stop is “Skip to content”; visible focus (`2px solid rgb(108,147,245)`);
  Enter activates a focused control; Escape closes the quick-complete dialog and the drawer; focus
  moves into the dialog and is restored; 3 charts expose textual summaries; **0** controls and **0**
  buttons without an accessible name; status is always conveyed in text, never by colour alone;
  Recovery Center and Settings are reachable by keyboard only.
- **Load and responsiveness** (Vite dev server, first navigation, 1440×900): TTFB 3 ms, DOMContentLoaded
  184–228 ms, first contentful paint 240–304 ms, app shell interactive 542–772 ms, local database ready
  562–799 ms, with one long task of 221–354 ms during startup (WASM SQLite + first render).
- **Interaction latency**: the quick-complete dialog appears **19 ms** after the click; after saving,
  every dependent widget has already updated by the next animation frame (< 16 ms).
- **Analytics recomputation**: changing range/screen puts the recomputed ring in the DOM in **31–49 ms**.
- **Animation sampling** (`requestAnimationFrame` deltas at 390×844): ring count-up, drawer opening and
  modal opening — 71, 153 and 236 samples — average 16.6–16.7 ms, p95 16.7–16.8 ms, worst frame
  16.8 ms, **0 frames over 33 ms** (display cadence). Under a **4× CPU throttle**: average 21.5 ms
  (≈47 fps), p95 16.7 ms, worst frame 250 ms, 8 frames over 33 ms, and two long tasks of 103 ms and
  121 ms on mount.
- **Empty states and data honesty**: a brand-new profile shows 0 sessions, 0 completions, no streak,
  an empty heatmap, `Not enough data yet.` for consistency, and the day drawer for an unplanned day
  states that nothing was planned rather than showing invented numbers.

### 12.4 NOT VERIFIED

- Non-Chromium engines (Firefox, WebKit) and real devices. Mobile layouts were emulated through
  `isMobile`/`hasTouch` viewports, not a physical phone; iOS Safari specifics are untested.
- Performance from a production build. Every number above comes from the Vite dev server (uncompressed,
  module-by-module modules). The production bundle is 509 kB JS (146.75 kB gzip) + 33 kB CSS
  (6.79 kB gzip); no production Lighthouse/Core Web Vitals run was performed.
- Frames under heavy concurrency (e.g. recomputing analytics while a chart animates). Only isolated
  animation samples and single interactions were measured; no frame trace was taken during a
  deliberately saturated workload.
- The light theme was screenshot-reviewed on 5 screens (Dashboard, Today, Weekly plan, Analytics,
  Settings) and contrast-audited programmatically on those 5; the remaining screens were audited in
  dark mode only.
- Screen-reader output (NVDA/JAWS/VoiceOver): accessibility was verified structurally and
  behaviourally, not with an actual screen reader.
- Long-horizon adaptation quality over a semester — out of reach of any test-suite.

### 12.5 LIMITATIONS of the verification itself

- The percentage matrix (0 → 100 %) needed task/session records that a fresh profile does not have, so
  they were injected through the app's own JSON import inside throwaway browser profiles. No fake
  history was written to the repository or to any real profile, the profiles were deleted, and the
  application's own screens were then audited against the values that were actually imported.
- One accessibility assertion (“skip link is the first Tab stop”) reports a failure when it runs after
  other steps in the same page session, because focus state carries over between steps. Run on its own,
  the first Tab stop is the skip link. This is a limitation of that assertion, not a defect.
- The browser binary is a serverless-oriented Chromium build. Its default `--single-process` flag made
  separate Playwright contexts share storage, which first looked like a data-integrity bug; with a
  clean flag set the second profile is empty. Any future QA on this binary must not use the package's
  default arguments.
