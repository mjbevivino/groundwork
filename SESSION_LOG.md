# Session log

One to three lines per session: date, milestone, what was learned, what's stuck.

- 2026-09-26 · M0 · Scaffold generated and verified: lint, format, tests and build pass from a clean install. Seed map wired in (46 nodes). Next: M1.
- 2026-09-27 · M1 · Map types, Ajv validation and loader done; 11 tests pass. Errors name the node by title, since an unquoted id like 2.10 can't be trusted to identify it. js-yaml 5 rejects empty input as a syntax error. Set up this Mac (Node 26, gh) and pushed to GitHub. Next: M2 (the owner's).
- 2026-09-27 · M2–M5 · Graph logic, map view (lanes, level icons), level rules and full panel, Dexie save plus JSON export/import. 80 tests; P1 → Working → dependents unlock → survives reload, checked in real Chrome. Next: M6 (Next up, Projects, Dashboard).
- 2026-09-27 · M6–M7 · Next up ranking (a test per rule; both exact answers pass), Projects, Dashboard, keyboard list view, map pans clear of the panel, README, Pages deploy. Published as a new public repo with cleaned history; the full history stays private in groundwork-dev.
- 2026-09-27 · M8 (v1.1) · Path tab is now the default: Continue bar, project/whole-map scope, units with progress bars, full-page lessons with prev/next and ← →, last topic remembered; map highlights prerequisites and dependents. One pure studyOrder drives it all. 118 tests.
