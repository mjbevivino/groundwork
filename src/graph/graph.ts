// Graph logic over a validated map: pure functions, no React.
// Edges point from a prerequisite to the nodes that require it.

import type { GroundworkMap, Id } from '../map/types'

/** Progress levels that can be stored. A node missing from `Levels` is not started. */
export type StartedLevel = 'learning' | 'working' | 'deep'
export type Levels = Readonly<Record<Id, StartedLevel>>

/** A reference to an id that doesn't exist in the map. */
export interface ReferenceIssue {
  /** Whether the bad reference is on a node or a project. */
  source: 'node' | 'project'
  /** Id of the node or project that holds the bad reference. */
  from: Id
  /** The field holding it: a node's `layer`, `requires` or `related`, or a project's `requires`. */
  field: 'layer' | 'requires' | 'related'
  /** The id that was referenced but doesn't exist. */
  missing: Id
}

export type TopologicalResult =
  { ok: true; order: Id[] } | { ok: false; cycle: Id[] }

/**
 * Every reference that points at a missing node or layer: node `layer`,
 * node `requires` and `related`, and project `requires`. Empty if all are valid.
 */
export function checkReferences(map: GroundworkMap): ReferenceIssue[] {
  const nodeIds = new Set(map.nodes.map((n) => n.id))
  const layerIds = new Set(map.layers.map((l) => l.id))
  const issues: ReferenceIssue[] = []

  for (const node of map.nodes) {
    const from = node.id
    if (!layerIds.has(node.layer)) {
      issues.push({ source: 'node', from, field: 'layer', missing: node.layer })
    }
    for (const field of ['requires', 'related'] as const) {
      for (const id of node[field] ?? []) {
        if (!nodeIds.has(id))
          issues.push({ source: 'node', from, field, missing: id })
      }
    }
  }
  for (const project of map.projects ?? []) {
    for (const id of project.requires) {
      if (!nodeIds.has(id)) {
        issues.push({
          source: 'project',
          from: project.id,
          field: 'requires',
          missing: id,
        })
      }
    }
  }
  return issues
}

/** Node ids that appear more than once, each listed once. Empty if all are unique. */
export function findDuplicateIds(map: GroundworkMap): Id[] {
  const seen = new Set<Id>()
  const duplicates = new Set<Id>()
  for (const { id } of map.nodes) {
    if (seen.has(id)) duplicates.add(id)
    seen.add(id)
  }
  return [...duplicates]
}

/**
 * All node ids, ordered so every node comes after everything in its `requires`.
 * If `requires` links form a cycle, returns `ok: false` with the ids of the
 * nodes on one cycle, and only those. `related` links never count.
 * Assumes checkReferences found no issues.
 */
export function topologicalOrder(map: GroundworkMap): TopologicalResult {
  const { requiresOf, dependentsOf } = buildIndex(map)

  // Kahn's algorithm: repeatedly take a node whose prerequisites are all placed.
  // Starting from map order keeps the result stable for the same file.
  const waitingOn = new Map<Id, number>()
  for (const [id, reqs] of requiresOf) waitingOn.set(id, reqs.length)
  const queue = map.nodes
    .map((n) => n.id)
    .filter((id) => waitingOn.get(id) === 0)
  const order: Id[] = []

  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]
    order.push(id)
    for (const dependent of dependentsOf.get(id) ?? []) {
      const left = waitingOn.get(dependent)! - 1
      waitingOn.set(dependent, left)
      if (left === 0) queue.push(dependent)
    }
  }

  if (order.length === requiresOf.size) return { ok: true, order }
  return { ok: false, cycle: findCycle(requiresOf, new Set(order)) }
}

/**
 * Every unplaced node is on a cycle or downstream of one, so each has an
 * unplaced prerequisite. Following those prerequisites must eventually
 * revisit a node; the path from that node onward is exactly one cycle.
 */
function findCycle(requiresOf: Map<Id, Id[]>, placed: Set<Id>): Id[] {
  const unplaced = (id: Id) => !placed.has(id)
  const path: Id[] = []
  const indexInPath = new Map<Id, number>()
  let current = [...requiresOf.keys()].find(unplaced)!

  while (!indexInPath.has(current)) {
    indexInPath.set(current, path.length)
    path.push(current)
    current = requiresOf.get(current)!.find(unplaced)!
  }
  // The path walks against the arrows; reverse it to read prerequisite-first.
  return path.slice(indexInPath.get(current)).reverse()
}

/**
 * Ids of nodes at level `ready`: not started, and every id in `requires`
 * is at `working` or `deep`. `related` never blocks.
 */
export function readyNodes(map: GroundworkMap, levels: Levels): Set<Id> {
  const isMet = (id: Id) => levels[id] === 'working' || levels[id] === 'deep'
  return new Set(
    map.nodes
      .filter(
        (n) => levels[n.id] === undefined && (n.requires ?? []).every(isMet),
      )
      .map((n) => n.id),
  )
}

/**
 * For every node, how many distinct nodes depend on it through `requires`,
 * directly or indirectly. Every node has an entry, 0 if nothing depends on it.
 */
export function downstreamCounts(map: GroundworkMap): Map<Id, number> {
  const { dependentsOf } = buildIndex(map)
  return new Map(
    map.nodes.map((n) => [n.id, reachable(dependentsOf, [n.id]).size]),
  )
}

/**
 * Every node that at least one of `ids` requires, directly or indirectly.
 * An id from `ids` is included only if another one of them requires it.
 */
export function allPrerequisites(map: GroundworkMap, ids: Id[]): Set<Id> {
  return reachable(buildIndex(map).requiresOf, ids)
}

// ---------------------------------------------------------------- helpers

/** `requires` links indexed both ways, keeping only ids that exist in the map. */
function buildIndex(map: GroundworkMap) {
  const requiresOf = new Map<Id, Id[]>()
  const dependentsOf = new Map<Id, Id[]>()
  for (const node of map.nodes) {
    requiresOf.set(node.id, [])
    dependentsOf.set(node.id, [])
  }
  for (const node of map.nodes) {
    for (const req of node.requires ?? []) {
      if (!requiresOf.has(req)) continue
      requiresOf.get(node.id)!.push(req)
      dependentsOf.get(req)!.push(node.id)
    }
  }
  return { requiresOf, dependentsOf }
}

/**
 * Every id reachable from `starts` by following `edges` one or more steps.
 * A start is included only if it's reachable from another start (or itself).
 */
function reachable(edges: Map<Id, Id[]>, starts: Id[]): Set<Id> {
  const found = new Set<Id>()
  const stack = starts.flatMap((id) => edges.get(id) ?? [])
  while (stack.length > 0) {
    const id = stack.pop()!
    if (found.has(id)) continue
    found.add(id)
    stack.push(...(edges.get(id) ?? []))
  }
  return found
}
