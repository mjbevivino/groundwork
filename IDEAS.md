# Ideas parking lot

Anything that isn't the current milestone goes here, not into the code.

## From the spec (v2 and later)

- Sign in with GitHub, and sync progress across devices (FastAPI + Postgres)
- Review queue on spaced intervals; session log page; weekly review page
- Evidence helper: paste a GitHub link and show the repo or commit title
- Public profile of mastered nodes with evidence, usable as a portfolio page
- In-app map editor that writes valid YAML
- v3: "Quiz me" and "explain it differently" with the Claude API, with evals and a usage cap
- Map gallery with forking; cohorts and a mentor view; Anki export; calendar study blocks

## New ideas

- Precompile the Ajv validator at build time (Ajv standalone code) to drop Ajv from the bundle: it adds about 195 kB (M1)
- Split the bundle (React Flow and Ajv load in one 690 kB chunk; Vite warns above 500 kB) (M3)
- Re-fit or pan the map when the node panel opens; it covers the right-hand columns until you pan (M5)
