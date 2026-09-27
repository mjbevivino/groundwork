// M2: the owner's file. Pure functions over a validated map; no React.
// Signatures and doc comments are the contract that graph.test.ts checks.
// Change them if you like, and update the tests to match.

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
export function checkReferences(_map: GroundworkMap): ReferenceIssue[] {
  throw new Error('Not implemented (M2)')
}

/** Node ids that appear more than once, each listed once. Empty if all are unique. */
export function findDuplicateIds(_map: GroundworkMap): Id[] {
  throw new Error('Not implemented (M2)')
}

/**
 * All node ids, ordered so every node comes after everything in its `requires`.
 * If `requires` links form a cycle, returns `ok: false` with the ids of the
 * nodes on one cycle, and only those. `related` links never count.
 * Assumes checkReferences found no issues.
 */
export function topologicalOrder(_map: GroundworkMap): TopologicalResult {
  throw new Error('Not implemented (M2)')
}

/**
 * Ids of nodes at level `ready`: not started, and every id in `requires`
 * is at `working` or `deep`. `related` never blocks.
 */
export function readyNodes(_map: GroundworkMap, _levels: Levels): Set<Id> {
  throw new Error('Not implemented (M2)')
}

/**
 * For every node, how many distinct nodes depend on it through `requires`,
 * directly or indirectly. Every node has an entry, 0 if nothing depends on it.
 */
export function downstreamCounts(_map: GroundworkMap): Map<Id, number> {
  throw new Error('Not implemented (M2)')
}

/**
 * Every node that at least one of `ids` requires, directly or indirectly.
 * An id from `ids` is included only if another one of them requires it.
 */
export function allPrerequisites(_map: GroundworkMap, _ids: Id[]): Set<Id> {
  throw new Error('Not implemented (M2)')
}
