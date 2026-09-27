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
import type { NodeProgress, Progress } from './progress/types'
import { useProgress } from './progress/useProgress'
import { MapView } from './ui/MapView'
import { NodePanel } from './ui/NodePanel'
import { ProgressFileButtons } from './ui/ProgressFileButtons'

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

function Workspace({ map }: { map: GroundworkMap }) {
  const { progress, update, error } = useProgress(map)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const today = isoDate(new Date())
  const notices = [...(error ? [error] : []), ...importErrors]

  return (
    <main className="app">
      <header className="app-header">
        <h1>Groundwork</h1>
        <p>{map.title}</p>
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
        <MapScreen
          map={map}
          progress={progress}
          today={today}
          onChange={(id, next) =>
            update((prev) => ({
              ...prev,
              nodes: { ...prev.nodes, [id]: next },
            }))
          }
        />
      ) : (
        <p className="problems status">Loading your progress…</p>
      )}
    </main>
  )
}

interface MapScreenProps {
  map: GroundworkMap
  progress: Progress
  today: string
  onChange: (id: Id, next: NodeProgress) => void
}

function MapScreen({ map, progress, today, onChange }: MapScreenProps) {
  const [selectedId, setSelectedId] = useState<Id | null>(null)
  const close = useCallback(() => setSelectedId(null), [])

  // Locked and ready are recomputed from the map every time progress changes.
  const levels = useMemo(
    () => computeLevels(map, levelsOf(progress.nodes)),
    [map, progress.nodes],
  )
  const needsReview = useMemo(
    () =>
      new Set(
        Object.keys(progress.nodes).filter((id) =>
          isReviewDue(progress.nodes[id], today),
        ),
      ),
    [progress.nodes, today],
  )
  const selected = map.nodes.find((n) => n.id === selectedId)

  return (
    <div className="app-body">
      <MapView
        map={map}
        levels={levels}
        needsReview={needsReview}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {selected && (
        <NodePanel
          key={selected.id}
          map={map}
          node={selected}
          levels={levels}
          progress={progress.nodes[selected.id]}
          today={today}
          onChange={(next) => onChange(selected.id, next)}
          onClose={close}
        />
      )}
    </div>
  )
}

export default App
