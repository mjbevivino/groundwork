import { useCallback, useState } from 'react'
import fdeMapSource from '../maps/fde.yaml?raw'
import {
  checkReferences,
  findDuplicateIds,
  topologicalOrder,
} from './graph/graph'
import { loadMap } from './map/load'
import type { GroundworkMap, Id } from './map/types'
import { computeLevels } from './progress/levels'
import { MapView } from './ui/MapView'
import { NodePanel } from './ui/NodePanel'

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
  return (
    <main className="app">
      <header className="app-header">
        <h1>Groundwork</h1>
        {loaded.ok && <p>{loaded.map.title}</p>}
      </header>
      {loaded.ok && problems.length === 0 ? (
        <MapScreen map={loaded.map} />
      ) : (
        <section className="problems status" role="alert">
          <p>The map has {problems.length} problem(s):</p>
          <ul className="errors">
            {problems.map((message, i) => (
              <li key={i}>{message}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function MapScreen({ map }: { map: GroundworkMap }) {
  // Progress arrives in M4/M5; until then every node is ready or locked.
  const [levels] = useState(() => computeLevels(map, {}))
  const [selectedId, setSelectedId] = useState<Id | null>(null)
  const close = useCallback(() => setSelectedId(null), [])
  const selected = map.nodes.find((n) => n.id === selectedId)

  return (
    <div className="app-body">
      <MapView
        map={map}
        levels={levels}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {selected && (
        <NodePanel map={map} node={selected} levels={levels} onClose={close} />
      )}
    </div>
  )
}

export default App
