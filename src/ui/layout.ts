import dagre from '@dagrejs/dagre'
import { topologicalOrder } from '../graph/graph'
import type { GroundworkMap, Id } from '../map/types'

// Sizes in React Flow units (pixels at zoom 1).
export const NODE_WIDTH = 190
export const NODE_HEIGHT = 64
export const LANE_LABEL_WIDTH = 150
const COLUMN_GAP = 56
const ROW_GAP = 14
const LANE_PADDING = 18
const LANE_GAP = 10

export interface Point {
  x: number
  y: number
}

export interface Lane {
  id: Id
  title: string
  y: number
  height: number
}

export interface MapLayout {
  /** Top-left corner of each node. */
  positions: Map<Id, Point>
  lanes: Lane[]
  width: number
  height: number
}

/**
 * One horizontal lane per layer, prerequisites to the left of what needs them.
 * Each lane column holds at most `maxRows` nodes; extra nodes move right.
 * dagre orders nodes within a column to reduce edge crossings.
 * Throws if the map has a cycle (check with topologicalOrder first).
 */
export function layoutMap(map: GroundworkMap, maxRows = 3): MapLayout {
  const topo = topologicalOrder(map)
  if (!topo.ok)
    throw new Error(`Cannot lay out a cycle: ${topo.cycle.join(', ')}`)

  const nodeById = new Map(map.nodes.map((n) => [n.id, n]))

  // Columns: first column right of every prerequisite with room in the lane.
  const column = new Map<Id, number>()
  const used = new Map<string, number>() // "lane|column" -> nodes placed
  for (const id of topo.order) {
    const node = nodeById.get(id)!
    let col = Math.max(
      0,
      ...(node.requires ?? []).map((req) => (column.get(req) ?? -1) + 1),
    )
    const key = (c: number) => `${node.layer}|${c}`
    while ((used.get(key(col)) ?? 0) >= maxRows) col++
    column.set(id, col)
    used.set(key(col), (used.get(key(col)) ?? 0) + 1)
  }

  const crossingOrder = dagreOrder(map)

  // Rows: stack each lane column in dagre's vertical order.
  const positions = new Map<Id, Point>()
  const lanes: Lane[] = []
  let top = 0
  let columns = 0
  for (const layer of map.layers) {
    const inLane = map.nodes
      .filter((n) => n.layer === layer.id)
      .map((n) => n.id)
      .sort(
        (a, b) =>
          column.get(a)! - column.get(b)! ||
          crossingOrder.get(a)! - crossingOrder.get(b)!,
      )
    const rowsUsed = new Map<number, number>()
    let rows = 1
    for (const id of inLane) {
      const col = column.get(id)!
      const row = rowsUsed.get(col) ?? 0
      rowsUsed.set(col, row + 1)
      rows = Math.max(rows, row + 1)
      columns = Math.max(columns, col + 1)
      positions.set(id, {
        x: LANE_LABEL_WIDTH + col * (NODE_WIDTH + COLUMN_GAP),
        y: top + LANE_PADDING + row * (NODE_HEIGHT + ROW_GAP),
      })
    }
    const height = 2 * LANE_PADDING + rows * NODE_HEIGHT + (rows - 1) * ROW_GAP
    lanes.push({ id: layer.id, title: layer.title, y: top, height })
    top += height + LANE_GAP
  }

  return {
    positions,
    lanes,
    width: LANE_LABEL_WIDTH + columns * (NODE_WIDTH + COLUMN_GAP),
    height: top - LANE_GAP,
  }
}

/** Each node's vertical position in a left-to-right dagre layout. */
function dagreOrder(map: GroundworkMap): Map<Id, number> {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: ROW_GAP, ranksep: COLUMN_GAP })
  g.setDefaultEdgeLabel(() => ({}))
  for (const n of map.nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const n of map.nodes) {
    for (const req of n.requires ?? []) g.setEdge(req, n.id)
  }
  dagre.layout(g)
  return new Map(map.nodes.map((n) => [n.id, g.node(n.id).y]))
}
