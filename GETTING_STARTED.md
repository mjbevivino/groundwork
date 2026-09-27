# Getting started

This repo is ready to build. M0 (setup) is done and verified: lint, formatting, tests and the production build all pass from a clean install. You start the weekend at M1.

## 1. Before the weekend (about 30 minutes)

Build on the computer you'll view the app on (your Mac or your Windows desktop). That keeps the browser and the dev server on the same machine.

| Tool                                             | Check                                                             | Install                                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Node.js 22.12 or newer (the current LTS is fine) | `node --version`                                                  | [nodejs.org](https://nodejs.org)                                                                         |
| Git                                              | `git --version`                                                   | [git-scm.com](https://git-scm.com/downloads). On Windows, Git for Windows also lets Claude Code use Bash |
| VS Code                                          | Open the folder, then accept the recommended extensions it offers | [code.visualstudio.com](https://code.visualstudio.com)                                                   |
| Claude Code                                      | `claude --version`                                                | See below                                                                                                |

**Install Claude Code** (it needs a Pro, Max, Team, Enterprise or Console account):

- macOS: `curl -fsSL https://claude.ai/install.sh | bash`
- Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`

Then open a new terminal and run `claude --version`. If the command isn't found, the install folder isn't on your PATH yet; see Anthropic's [setup docs](https://code.claude.com/docs/en/setup).

## 2. First run (about 10 minutes)

```bash
cd groundwork
npm install
npm test          # 2 tests pass
npm run dev       # open the URL it prints; you should see "46 nodes found"
```

Then put it on GitHub (keep the repo private until v1 works):

```bash
git init
git add .
git commit -m "M0: scaffold, seed map and CI"
git branch -M main
git remote add origin https://github.com/<you>/groundwork.git
git push -u origin main
```

Open the repo's **Actions** tab and confirm the CI run passes.

## 3. The weekend plan (about 10 hours)

| Day   | Block     | Milestones                                                          | Budget |
| ----- | --------- | ------------------------------------------------------------------- | ------ |
| Day 1 | Morning   | M1 map loading and validation, then M2 graph logic (yours to write) | 2.5 h  |
| Day 1 | Afternoon | M3 map view                                                         | 2.5 h  |
| Day 2 | Morning   | M4 node panel and rules, then M5 saving progress                    | 2.5 h  |
| Day 2 | Afternoon | M6 next up and dashboard, then M7 list view and deploy              | 2 h    |

Take a real break between blocks. If you're past about 12 hours total, stop at the last finished milestone. The cut list in CLAUDE.md says what to drop first.

## 4. Prompts to paste into Claude Code

Start Claude Code in the repo folder with `claude`.

**Start of every session**

> Read CLAUDE.md and SESSION_LOG.md. We're on M_. Give me the plan in three to five steps before writing any code.

**M1**

> Start M1. Write TypeScript types that mirror schema/map.schema.json, a loader for maps/fde.yaml, and Ajv validation with readable error messages. Add tests for the done-when check.

**M2 (you write the code)**

> Start M2. Write failing tests in src/graph/graph.test.ts that cover the done-when check, then stop. I'll write graph.ts myself.

**M3**

> Start M3. Build the map view with React Flow and dagre: one lane per layer, color plus an icon for each level, locked nodes dimmed. Show me the first working version before polishing it.

**M4**

> Start M4. Put the level rules in src/progress/rules.ts with tests first, then build the node panel.

**M5**

> Start M5. Save progress with Dexie, and add JSON export and import with a round-trip test.

**M6**

> Start M6. Write nextUp.ts with a test for each ranking rule and for the two expected answers in CLAUDE.md, then build the Next up, Projects and Dashboard views.

**M7**

> Start M7. Add the list view and keyboard navigation, write the README to the repo standard, and deploy to GitHub Pages.

**End of every session**

> Update SESSION_LOG.md, commit, and tell me exactly where we stopped.

**When a milestone runs long**

> We're over budget on this milestone. Show me the cut-list options.

## 5. How to review what Claude writes

1. **Run it first.** Does the feature work in the browser?
2. **Read the tests before the code.** They tell you what the code promises.
3. **Read the files the walkthrough names**, and ignore the rest for now.
4. **Ask why.** "Why this approach instead of X?" is the fastest way to learn the code.
5. **Explain one piece back.** If you can't, ask for a simpler version.

## 6. If something breaks

| Symptom                                               | Fix                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `claude` isn't recognized after installing            | Open a new terminal. If it still fails, the install folder isn't on your PATH (see the setup docs) |
| The map area renders blank                            | React Flow needs `@xyflow/react/dist/style.css` imported and a container with an explicit height   |
| Ajv complains about the `draft/2020-12` schema        | Import Ajv from `ajv/dist/2020`, not `ajv`                                                         |
| Node `2.10` goes missing or collides with `2.1`       | An id is unquoted in the YAML. Quote it                                                            |
| `npm run format:check` fails on Windows only          | Line endings. `.gitattributes` forces LF; run `npm run format` once, then commit                   |
| Engine or syntax errors on `npm install`              | Your Node is too old. Install the current LTS                                                      |
| The GitHub Pages site loads without styles or scripts | Set `base: '/groundwork/'` in `vite.config.ts`                                                     |

## 7. After v1

- Tag the release: `git tag v1.0.0 && git push --tags`.
- Import your real starting point: test out of what you already know, with evidence.
- Move on to Ledger. v2 ideas go in IDEAS.md.
