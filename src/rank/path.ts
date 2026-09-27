// The guided path: study order, scope, units and neighbors. Pure functions,
// no React. Everything the Path tab and lesson view show comes from the one
// study order computed here.

import type { GroundworkMap, Id, Layer } from '../map/types'
import type { Level } from '../progress/levels'
import { projectPath } from './nextUp'

/** Which topics the path covers: one project's path, or the whole map. */
export type Scope = { kind: 'project'; projectId: Id } | { kind: 'all' }

/** A layer's topics within the scope, in study order. */
export interface Unit {
  layer: Layer
  /** 1-based position among the scope's non-empty units. */
  number: number
  topics: Id[]
  done: number
}

export interface ScopeSummary {
  done: number
  total: number
  /** Estimated hours for topics not yet at Working or Deep. */
  hoursLeft: number
}

const isDone = (level: Level | undefined) =>
  level === 'working' || level === 'deep'

/** The topic ids a scope covers. An unknown project covers nothing. */
export function scopeIds(map: GroundworkMap, scope: Scope): Set<Id> {
  return scope.kind === 'all'
    ? new Set(map.nodes.map((n) => n.id))
    : projectPath(map, scope.projectId)
}

/**
 * Every topic in the order to study it: a topic always comes after its
 * prerequisites; among topics that are free to go next, the earlier layer
 * wins, then the earlier position in the map file. With `scope`, only those
 * topics are kept (dropping topics never breaks the order).
 */
export function studyOrder(map: GroundworkMap, scope?: Set<Id>): Id[] {
  const layerIndex = new Map(map.layers.map((l, i) => [l.id, i]))
  const known = new Set(map.nodes.map((n) => n.id))
  const waiting = new Map(
    map.nodes.map((n) => [
      n.id,
      new Set((n.requires ?? []).filter((id) => known.has(id))),
    ]),
  )
  const rank = new Map(
    map.nodes.map((n, position) => [
      n.id,
      [layerIndex.get(n.layer) ?? Infinity, position] as const,
    ]),
  )
  const before = (a: Id, b: Id) => {
    const [la, pa] = rank.get(a)!
    const [lb, pb] = rank.get(b)!
    return la - lb || pa - pb
  }

  const order: Id[] = []
  const placed = new Set<Id>()
  while (order.length < map.nodes.length) {
    const free = map.nodes
      .map((n) => n.id)
      .filter(
        (id) =>
          !placed.has(id) && [...waiting.get(id)!].every((r) => placed.has(r)),
      )
    // A cycle leaves nothing free; place the rest in map order so the
    // result stays complete (the app reports cycles before this runs).
    const next = free.length > 0 ? free.sort(before)[0] : undefined
    const id = next ?? map.nodes.find((n) => !placed.has(n.id))!.id
    order.push(id)
    placed.add(id)
  }
  return scope ? order.filter((id) => scope.has(id)) : order
}

/** Split a study order into units, one per layer that has topics in it. */
export function units(
  map: GroundworkMap,
  order: Id[],
  levels: Map<Id, Level>,
): Unit[] {
  const layerOf = new Map(map.nodes.map((n) => [n.id, n.layer]))
  return map.layers
    .map((layer) => {
      const topics = order.filter((id) => layerOf.get(id) === layer.id)
      const done = topics.filter((id) => isDone(levels.get(id))).length
      return { layer, topics, done }
    })
    .filter((u) => u.topics.length > 0)
    .map((u, i) => ({ ...u, number: i + 1 }))
}

/** The first unit with topics left to finish; the last unit if all are done. */
export function currentUnit(all: Unit[]): Unit | undefined {
  return all.find((u) => u.done < u.topics.length) ?? all.at(-1)
}

export function scopeSummary(
  map: GroundworkMap,
  order: Id[],
  levels: Map<Id, Level>,
): ScopeSummary {
  const nodeById = new Map(map.nodes.map((n) => [n.id, n]))
  const left = order.filter((id) => !isDone(levels.get(id)))
  return {
    done: order.length - left.length,
    total: order.length,
    hoursLeft: left.reduce(
      (sum, id) => sum + (nodeById.get(id)?.est_hours ?? 0),
      0,
    ),
  }
}

/** Where a topic sits: its unit, and its 1-based position in that unit. */
export function locate(
  all: Unit[],
  id: Id,
): { unit: Unit; position: number } | undefined {
  for (const unit of all) {
    const i = unit.topics.indexOf(id)
    if (i !== -1) return { unit, position: i + 1 }
  }
  return undefined
}

/** The topics before and after `id` in a study order. */
export function neighbors(order: Id[], id: Id): { prev?: Id; next?: Id } {
  const i = order.indexOf(id)
  if (i === -1) return {}
  return { prev: order[i - 1], next: order[i + 1] }
}

/** The first topic after `id` in study order that you can work on now. */
export function nextToStudy(
  order: Id[],
  id: Id,
  levels: Map<Id, Level>,
): Id | undefined {
  const rest = order.slice(order.indexOf(id) + 1)
  return rest.find((t) => {
    const level = levels.get(t)
    return level === 'ready' || level === 'learning'
  })
}

/** The prerequisites of `id` not yet at Working or Deep, in map order. */
export function unmetPrerequisites(
  map: GroundworkMap,
  id: Id,
  levels: Map<Id, Level>,
): Id[] {
  const node = map.nodes.find((n) => n.id === id)
  return (node?.requires ?? []).filter((req) => !isDone(levels.get(req)))
}
