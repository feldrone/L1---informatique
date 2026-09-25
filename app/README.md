# Personal Study Performance System — L1 Systèmes Informatiques (UBMA Annaba)

A local-first, offline-capable web application that runs the daily loop
**PLAN → EXECUTE → RECORD → EVALUATE → ADAPT → RECOVER → PLAN AGAIN** for a first-year
Computer Systems (L1 SI / SINF) student.

It answers four questions at all times:

1. What do I do today?
2. Why that, and how long?
3. What am I behind on?
4. What should be recovered first?

## Commands

```bash
cd app
npm install        # once
npm run dev        # dev server on 0.0.0.0:5173
npm test           # full test-suite (vitest)
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production bundle in dist/
npm run preview    # serve the production build on 0.0.0.0:4173
```

No backend service is required. All data lives in a SQLite database compiled to WebAssembly
(`sql.js`) persisted to IndexedDB, with a rolling backup of the previous flush.

## Architecture

```
src/
  domain/                pure, deterministic logic (no React, no DB)
    types.ts             18 persisted entities + derived types
    date.ts ids.ts       ISO-date helpers, stable id generation
    seed/academic.ts     the ONLY place where academic data lives (subjects, chapters, classes, habits, rules, goals)
    planning/            planner, priority engine, behaviour signals, mastery estimator, spaced review, recovery modes A–D
    analytics/           progress, streaks/consistency, heatmap, balance, insights, goals/achievements
    testing/fixtures.ts  deterministic fixtures shared by the test-suites
  db/
    migrations.ts        versioned schema (v1 core, v2 history + indexes)
    database.ts          DbClient wrapper over sql.js (exec/all/get/run/insert/upsert/update/delete/count/transaction/exportBytes)
    browser.ts           IndexedDB persistence + wasm loading + debounced flush
    repo.ts              typed Repository over the schema
    seed.ts              idempotent seeding of the academic configuration
  state/
    store.ts             StudyStore: the single state layer (subscribe/getState, planning, task lifecycle, recovery, mastery, import/export)
    analytics.ts         computeAnalytics(snapshot, today, period) → one derived bundle for every chart
    provider.tsx         React context, hooks, day roll-over, theme, error boundary
  ui/
    components/          primitives (Card/Button/Badge/Modal/…), charts (rings, bars, heatmap, habit matrix, timeline), task card, focus timer, day drawer
    screens/             the twelve screens
    router.ts            hash router (no dependency)
```

**Data flow**: screens call store actions → the store writes through the Repository inside a
transaction → the snapshot slice is reloaded and a monotonic `revision` is bumped → `useSyncExternalStore`
re-renders → analytics are recomputed with `useMemo`. Nothing derived is persisted, so a chart can
never disagree with the stored records.

## Data-integrity rules encoded in the code

- Brand-new databases contain **zero** statistics: no sessions, no completions, no streak.
  Charts render honest empty states instead of placeholder numbers.
- A day counts as *active* only from 20 effective minutes; passive reading is weighted below active work.
- A day still in progress is never reported as *missed* (`missedToday === false`).
- Consistency is presented as preparation regularity, never as intelligence, grade or rank.
- Skipping moves work to the backlog; archiving only happens in recovery mode D after a long interruption.
- Mastery never jumps to *Exam-ready* from a single success; failed recall lowers it by at most one level.
- Import validates every row and reports invalid ones instead of writing partial garbage.

## Academic data provenance

Subjects, coefficients, chapters and timetable slots carry a provenance badge
(`verified` / `partial` / `to-confirm` / `supplementary`). Provisional values are editable in
Settings and are never presented as official. See the repository root documentation
(`resources/`, `S1/`, `notes/`) for the sources behind each value.

## Known limitations

- The interface is shipped in English (the seed data uses the French module names).
- Timetable slots are provisional (`to-confirm`) until the faculty publishes the official grid.
- No backend sync: data is per-browser-profile; use the JSON/CSV/SQLite export to move it.
- Charts are SVG/CSS driven; very long ranges (a full year) render up to ~366 cells per heatmap.
