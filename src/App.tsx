import { useCallback, useMemo, useState } from 'react'
import fdeMapSource from '../maps/fde.yaml?raw'
import {
  checkReferences,
  findDuplicateIds,
  topologicalOrder,
} from './graph/graph'
import { loadMap } from './map/load'
import type { GroundworkMap, Id } from './map/types'
import { computeLevels } from './progress/levels'
import { isoDate, isReviewDue, levelsOf } from './progress/rules'
import type { Progress } from './progress/types'
import { useProgress } from './progress/useProgress'
import { nextUp } from './rank/nextUp'
import { DashboardView } from './ui/DashboardView'
import { MapView } from './ui/MapView'
import { NextUpView } from './ui/NextUpView'
import { NodePanel } from './ui/NodePanel'
import { ProgressFileButtons } from './ui/ProgressFileButtons'
import { ProjectsView } from './ui/ProjectsView'

/** Everything that stops a map from being shown, as readable messages. */
function mapProblems(map: GroundworkMap): string[] {
  const problems = checkReferences(map).map(
    (i) =>
      `${i.source === 'node' ? 'Node' : 'Project'} "${i.from}", ${i.field}: no ${i.field === 'layer' ? 'layer' : 'node'} has id "${i.missing}"`,
  )
  for (const id of findDuplicateIds(map)) {
    problems.push(`Node id "${id}" is used more than once`)
  }
  if (problems.length === 0) {
    const order = topologicalOrder(map)
    if (!order.ok) {
      problems.push(`Prerequisites form a cycle: ${order.cycle.join(' → ')}`)
    }
  }
  return problems
}

// Parse and check once, when the module loads.
const loaded = loadMap(fdeMapSource)
const problems = loaded.ok
  ? mapProblems(loaded.map)
  : loaded.errors.map((e) => e.message)

function App() {
  if (loaded.ok && problems.length === 0) return <Workspace map={loaded.map} />
  return (
    <main className="app">
      <header className="app-header">
        <h1>Groundwork</h1>
      </header>
      <section className="problems status" role="alert">
        <p>The map has {problems.length} problem(s):</p>
        <ul className="errors">
          {problems.map((message, i) => (
            <li key={i}>{message}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}

type View = 'map' | 'next' | 'projects' | 'dashboard'

const VIEWS: { id: View; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'next', label: 'Next up' },
  { id: 'projects', label: 'Projects' },
  { id: 'dashboard', label: 'Dashboard' },
]

function Workspace({ map }: { map: GroundworkMap }) {
  const { progress, update, error } = useProgress(map)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [view, setView] = useState<View>('map')
  const today = isoDate(new Date())
  const notices = [...(error ? [error] : []), ...importErrors]

  return (
    <main className="app">
      <header className="app-header">
        <h1>Groundwork</h1>
        <p>{map.title}</p>
        <nav className="views" aria-label="Views">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-current={view === v.id ? 'page' : undefined}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>
        {progress && (
          <ProgressFileButtons
            map={map}
            progress={progress}
            today={today}
            onImport={(imported) => {
              setImportErrors([])
              update(() => imported)
            }}
            onErrors={setImportErrors}
          />
        )}
      </header>
      {notices.length > 0 && (
        <section className="notice" role="alert">
          <ul className="errors">
            {notices.map((message, i) => (
              <li key={i}>{message}</li>
            ))}
          </ul>
          {importErrors.length > 0 && (
            <button type="button" onClick={() => setImportErrors([])}>
              Dismiss
            </button>
          )}
        </section>
      )}
      {progress ? (
        <Workbench
          map={map}
          view={view}
          onView={setView}
          progress={progress}
          today={today}
          update={update}
        />
      ) : (
        <p className="problems status">Loading your progress…</p>
      )}
    </main>
  )
}

interface WorkbenchProps {
  map: GroundworkMap
  view: View
  onView: (view: View) => void
  progress: Progress
  today: string
  update: (change: (prev: Progress) => Progress) => void
}

/** The current view, with the node panel beside it when a node is selected. */
function Workbench({
  map,
  view,
  onView,
  progress,
  today,
  update,
}: WorkbenchProps) {
  const [selectedId, setSelectedId] = useState<Id | null>(null)
  const close = useCallback(() => setSelectedId(null), [])

  // Locked and ready are recomputed from the map every time progress changes.
  const stored = useMemo(() => levelsOf(progress.nodes), [progress.nodes])
  const levels = useMemo(() => computeLevels(map, stored), [map, stored])
  const needsReview = useMemo(
    () =>
      new Set(
        Object.keys(progress.nodes).filter((id) =>
          isReviewDue(progress.nodes[id], today),
        ),
      ),
    [progress.nodes, today],
  )
  const suggestions = useMemo(
    () => nextUp(map, stored, progress.active_project),
    [map, stored, progress.active_project],
  )
  const selected = map.nodes.find((n) => n.id === selectedId)

  return (
    <div className="app-body">
      {view === 'map' && (
        <MapView
          map={map}
          levels={levels}
          needsReview={needsReview}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}
      {view === 'next' && (
        <NextUpView
          map={map}
          suggestions={suggestions}
          levels={levels}
          activeProject={progress.active_project}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPickProject={() => onView('projects')}
        />
      )}
      {view === 'projects' && (
        <ProjectsView
          map={map}
          levels={levels}
          activeProject={progress.active_project}
          selectedId={selectedId}
          onActivate={(id) =>
            update((prev) => ({ ...prev, active_project: id }))
          }
          onSelect={setSelectedId}
        />
      )}
      {view === 'dashboard' && (
        <DashboardView
          map={map}
          levels={levels}
          needsReview={needsReview}
          onSelect={setSelectedId}
        />
      )}
      {selected && (
        <NodePanel
          key={selected.id}
          map={map}
          node={selected}
          levels={levels}
          progress={progress.nodes[selected.id]}
          today={today}
          onChange={(next) =>
            update((prev) => ({
              ...prev,
              nodes: { ...prev.nodes, [selected.id]: next },
            }))
          }
          onClose={close}
        />
      )}
    </div>
  )
}

export default App
