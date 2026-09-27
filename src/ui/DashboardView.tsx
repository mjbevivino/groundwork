import type { GroundworkMap, Id } from '../map/types'
import type { Level } from '../progress/levels'
import { levelStyle } from './levelStyle'
import { NodeButton } from './NodeButton'

interface DashboardViewProps {
  map: GroundworkMap
  levels: Map<Id, Level>
  needsReview: Set<Id>
  onSelect: (id: Id) => void
}

const LEVELS: Level[] = ['locked', 'ready', 'learning', 'working', 'deep']
const isDone = (level: Level | undefined) =>
  level === 'working' || level === 'deep'
const percent = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 100)

/** Plain counts: where you stand overall, by level, by layer, and what needs review. */
export function DashboardView({
  map,
  levels,
  needsReview,
  onSelect,
}: DashboardViewProps) {
  const total = map.nodes.length
  const done = map.nodes.filter((n) => isDone(levels.get(n.id)))
  const hours = (nodes: typeof map.nodes) =>
    nodes.reduce((sum, n) => sum + (n.est_hours ?? 0), 0)
  const count = (level: Level) =>
    map.nodes.filter((n) => levels.get(n.id) === level).length

  return (
    <section className="view" aria-labelledby="dashboard-heading">
      <h2 id="dashboard-heading">Dashboard</h2>
      <p className="overall">
        <strong>
          {done.length} of {total}
        </strong>{' '}
        topics at Working or Deep ({percent(done.length, total)}%), about{' '}
        {hours(done)} of {hours(map.nodes)} estimated hours.
      </p>

      <div className="dashboard-grid">
        <table>
          <caption>By level</caption>
          <tbody>
            {LEVELS.map((level) => (
              <tr key={level}>
                <th scope="row">
                  <span aria-hidden="true">{levelStyle[level].icon}</span>{' '}
                  {levelStyle[level].label}
                </th>
                <td>{count(level)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table>
          <caption>By layer (Working or Deep)</caption>
          <tbody>
            {map.layers.map((layer) => {
              const inLayer = map.nodes.filter((n) => n.layer === layer.id)
              const doneHere = inLayer.filter((n) => isDone(levels.get(n.id)))
              return (
                <tr key={layer.id}>
                  <th scope="row">{layer.title}</th>
                  <td>
                    {doneHere.length} of {inLayer.length}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h3>Reviews due ({needsReview.size})</h3>
      {needsReview.size === 0 ? (
        <p className="hint">No reviews due.</p>
      ) : (
        <ul className="node-list">
          {map.nodes
            .filter((n) => needsReview.has(n.id))
            .map((n) => (
              <li key={n.id}>
                <NodeButton
                  node={n}
                  level={levels.get(n.id) ?? 'locked'}
                  needsReview
                  onSelect={onSelect}
                />
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}
