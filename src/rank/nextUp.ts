// Next up: what to study now. Pure functions, no React.

import {
  allPrerequisites,
  downstreamCounts,
  readyNodes,
  type Levels,
} from '../graph/graph'
import type { GroundworkMap, Id } from '../map/types'

export interface Suggestion {
  id: Id
  /** One line on why this node is here. */
  reason: string
}

/**
 * Every node a project depends on: the nodes it requires, plus their
 * prerequisites at any depth.
 */
export function projectPath(map: GroundworkMap, projectId: Id): Set<Id> {
  const project = map.projects?.find((p) => p.id === projectId)
  if (!project) return new Set()
  return new Set([
    ...project.requires,
    ...allPrerequisites(map, project.requires),
  ])
}

/**
 * The top `limit` nodes to work on. Candidates are ready nodes not yet
 * started, plus nodes in Learning. Ranked by, in order:
 *   1. on the active project's path;
 *   2. more downstream nodes (unlocked, transitively);
 *   3. earlier layer in the map file;
 *   4. fewer est_hours (missing hours sort last);
 * with the node's position in the file as the final tie-break.
 */
export function nextUp(
  map: GroundworkMap,
  levels: Levels,
  activeProject?: Id,
  limit = 5,
): Suggestion[] {
  const ready = readyNodes(map, levels)
  const project = map.projects?.find((p) => p.id === activeProject)
  const path = project ? projectPath(map, project.id) : new Set<Id>()
  const downstream = downstreamCounts(map)
  const layerIndex = new Map(map.layers.map((l, i) => [l.id, i]))

  const candidates = map.nodes
    .map((node, position) => ({
      node,
      position,
      learning: levels[node.id] === 'learning',
      onPath: path.has(node.id),
      unlocks: downstream.get(node.id) ?? 0,
      layer: layerIndex.get(node.layer) ?? Infinity,
      hours: node.est_hours ?? Infinity,
    }))
    .filter((c) => c.learning || ready.has(c.node.id))

  candidates.sort(
    (a, b) =>
      Number(b.onPath) - Number(a.onPath) ||
      b.unlocks - a.unlocks ||
      a.layer - b.layer ||
      a.hours - b.hours ||
      a.position - b.position,
  )

  return candidates.slice(0, limit).map((c) => {
    const parts: string[] = []
    if (c.learning) parts.push('In progress')
    if (c.onPath && project) {
      parts.push(
        project.requires.includes(c.node.id)
          ? `Needed for ${project.title}`
          : `On the path to ${project.title}`,
      )
    }
    if (c.unlocks > 0) {
      parts.push(
        `leads to ${c.unlocks} later topic${c.unlocks === 1 ? '' : 's'}`,
      )
    }
    if (parts.length === 0 && c.node.est_hours !== undefined) {
      parts.push(`About ${c.node.est_hours} h of work`)
    }
    if (parts.length === 0) parts.push('Ready to start')
    const reason = parts.join(', ')
    return { id: c.node.id, reason: reason[0].toUpperCase() + reason.slice(1) }
  })
}
