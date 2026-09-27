# Groundwork

Groundwork turns a curriculum into an interactive map of topics, prerequisites and proof. This repo is **v1 Local**: a single-user web app with no backend, built in one weekend (about 10 hours).

Everything needed for v1 is summarized below.

## Who you're working with

The owner is building this to learn and to get a tool he'll use daily. He's a data analyst moving toward forward-deployed engineering: strong in SQL, Excel and Power BI, comfortable in Python, new to TypeScript and React. The first time a TypeScript or React idea comes up, explain it in two or three sentences.

## How we work: weekend mode

The goal is a working v1 in about 10 hours. **You write all the code; the owner reviews it.** Building is how he learns: no quizzes, no gates, and no stopping just so he can learn.

1. Before each milestone, give a 2–3 line primer: what we're building and the key idea.
2. Work one milestone at a time, in small steps. Commit after each step, with a clear message. Push at the end of each milestone.
3. Before each step, say in one line what you're about to do. After it, summarize what changed in two or three lines.
4. A milestone is done only when its "Done when" check passes and `npm run lint`, `npm test` and `npm run build` all pass. Say so explicitly.
5. After each milestone, give a recap of five lines at most: what got built, the file that matters most, and the one concept worth knowing. Then keep going.
6. Don't ask permission for routine steps. Stop only at checkpoints the owner names, or when something needs his decision; then give the options with your recommendation.
7. At the end of each session, append one to three lines to `SESSION_LOG.md`: date, milestone, what was learned, what's stuck.
8. Don't build beyond the current milestone. Park ideas in `IDEAS.md`.
9. Watch the clock. If a milestone runs past its budget by half, stop and offer the cut list below.

## Stack (installed and verified)

- React 19, TypeScript 6 (strict, no `any`), Vite 8
- `@xyflow/react` 12 (React Flow) for the graph: import `@xyflow/react/dist/style.css`, and give the flow container an explicit height or it renders blank
- `@dagrejs/dagre` 3 for layout: `dagre.graphlib.Graph`, then `dagre.layout(g)`. Run it per lane or with `rankdir: 'LR'`
- `js-yaml` 5 (ships its own types) to parse; `ajv` 8 via `import Ajv2020 from 'ajv/dist/2020'` plus `ajv-formats`, because the schema is JSON Schema 2020-12
- `dexie` 4 for IndexedDB (M5)
- Vitest 5, Testing Library and jsdom. Globals are off, so import `describe`, `it` and `expect` from `vitest`. Cleanup runs in `src/test/setup.ts`
- oxlint for linting, Prettier for formatting (no semicolons, single quotes), GitHub Actions CI

Commands: `npm run dev`, `npm test`, `npm run test:watch`, `npm run lint`, `npm run format`, `npm run build`.

The seed map is already wired in: `import fdeMapSource from '../maps/fde.yaml?raw'` (see `src/App.tsx`).

## Layout

```
maps/fde.yaml              seed map: 46 nodes in 5 layers, 5 projects
schema/map.schema.json     the map format
progress.example.json      what exported progress looks like
src/
  App.tsx                  M0 placeholder; becomes the app shell
  test/setup.ts            test setup
  map/       types.ts, load.ts, validate.ts          M1
  graph/     graph.ts, graph.test.ts                 M2 (pure functions, no React)
  progress/  rules.ts, store.ts                      M4, M5
  rank/      nextUp.ts, nextUp.test.ts               M6 (pure functions, no React)
  ui/        MapView, NodePanel, NextUp, Dashboard, Projects, ListView
```

## Domain rules

- **Levels:** `locked`, `ready`, `learning`, `working`, `deep`. `locked` and `ready` are computed from prerequisites and never stored. Stored progress only holds `learning`, `working` or `deep`; a missing node means not started.
- **Unlock:** a node is `ready` when every id in its `requires` is at `working` or `deep`. `related` never blocks anything.
- **Working:** every objective checked, plus at least one evidence item `{type, url, note, date}`.
- **Deep:** at least one evidence item with `type: "strong_when"`, meaning the strong-when test was passed.
- **Test out:** from `ready`, a node can jump straight to `working` with evidence. All its objectives are marked done.
- **Reviews:** on reaching `working`, set `next_review` to 7 days out; each completed review extends it to 21 days, then 60. An overdue review shows a "Needs review" badge. Never demote automatically.
- **Next up:** candidates are ready nodes not yet started, plus nodes in `learning`. Rank by:
  1. relevant to the active project (required by it, or a prerequisite of something it requires, at any depth);
  2. more downstream nodes unlocked (transitively);
  3. earlier position in the map file;
  4. fewer `est_hours`.

  Show the top five, each with a one-line reason.

- **Ids are strings.** Quote them in YAML: unquoted `2.10` parses as the number 2.1 and silently collides with node `"2.1"`.

## Milestones and time budget (about 10 hours)

| #   | Milestone                                                                                                                                  | Budget | Done when                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Repo setup                                                                                                                                 | Done   | Scaffold, dependencies, tests, lint, Prettier and CI are in place and pass                                                                                                                                                            |
| M1  | Map format: TypeScript types that mirror the schema, a loader, Ajv validation with readable errors                                         | 1 h    | The seed map loads with 46 nodes, and a map with an unquoted `2.10` gives an error that names the node                                                                                                                                |
| M2  | Graph logic in `src/graph/graph.ts`: reference checks, cycle detection, topological order, ready set for given progress, downstream counts | 1.5 h  | Tests pass for: the seed map (no cycles, 8 nodes with no prerequisites: P1, P3, P6, P7, 4.1, 4.4, 4.7, 4.11); a missing id; a two-node cycle; and a cycle error that names only the nodes on the cycle, not the ones downstream of it |
| M3  | Map view: a lane per layer, dagre layout, color plus icon by level, locked nodes dimmed                                                    | 2.5 h  | All 46 nodes render readably in 5 lanes, and clicking one opens the panel                                                                                                                                                             |
| M4  | Node panel, plus level rules in `src/progress/rules.ts`                                                                                    | 1.5 h  | Rule tests pass: no Working without all objectives and evidence; test out only from `ready`; Deep needs `strong_when` evidence                                                                                                        |
| M5  | Save progress with Dexie, plus JSON export and import                                                                                      | 1 h    | Progress survives a reload, and an export-then-import test round-trips exactly                                                                                                                                                        |
| M6  | Next up, Projects view, Dashboard                                                                                                          | 1 h    | With empty progress and active project `groundwork`, Next up is exactly `P1, P3, 4.4, 4.1, 4.7`. With P1 to P5 at `working`, it's exactly `2.5, 2.3, 1.3, 2.2, 1.5`. Each ranking rule has a test                                     |
| M7  | List view, keyboard navigation, README, GitHub Pages deploy                                                                                | 1 h    | The list view does everything the map does, and the live link works                                                                                                                                                                   |

**Cut list, if behind (in this order):** dashboard charts become plain counts; the Projects view becomes a filter on the map; the GitHub Pages deploy waits; accessibility scan and Playwright test wait for v1.1. Never cut the tests for M2, M4 and M6.

**Freeze rule:** if v1 isn't done after about 12 hours of work, or by 2026-10-31, stop at the last finished milestone and switch to the Ledger project.

## Guardrails

- No backend, sign-in, AI calls or map editor in v1.
- No personal or employer data in the repo. Real progress lives in the browser; only `progress.example.json` is committed, and `.gitignore` blocks other `progress*.json` files.
- Accessibility: show every level with an icon and text, never color alone. Anything the graph can do must also be possible from the list view.
- Keep `src/graph` and `src/rank` free of React so they can be tested on their own.
