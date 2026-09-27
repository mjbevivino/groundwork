import { readyNodes, type Levels, type StartedLevel } from '../graph/graph'
import type { GroundworkMap, Id } from '../map/types'

/** Every level a node can show. `locked` and `ready` are computed, never stored. */
export type Level = 'locked' | 'ready' | StartedLevel

/** The level of every node: its stored level if started, else ready or locked. */
export function computeLevels(
  map: GroundworkMap,
  levels: Levels,
): Map<Id, Level> {
  const ready = readyNodes(map, levels)
  return new Map(
    map.nodes.map((n) => [
      n.id,
      levels[n.id] ?? (ready.has(n.id) ? 'ready' : 'locked'),
    ]),
  )
}
