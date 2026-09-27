import { describe, expect, it } from 'vitest'
import fdeMapSource from '../../maps/fde.yaml?raw'
import { loadMap } from '../map/load'
import { layoutMap, NODE_HEIGHT, NODE_WIDTH } from './layout'

function seedMap() {
  const result = loadMap(fdeMapSource)
  if (!result.ok) throw new Error('seed map failed to load')
  return result.map
}

describe('layoutMap on the seed map', () => {
  const map = seedMap()
  const layout = layoutMap(map)

  it('makes one lane per layer, in map order', () => {
    expect(layout.lanes.map((l) => l.id)).toEqual(['P', 'L1', 'L2', 'L3', 'L4'])
  })

  it('places every node inside its own lane', () => {
    expect(layout.positions.size).toBe(46)
    for (const node of map.nodes) {
      const { y } = layout.positions.get(node.id)!
      const lane = layout.lanes.find((l) => l.id === node.layer)!
      expect(y).toBeGreaterThanOrEqual(lane.y)
      expect(y + NODE_HEIGHT).toBeLessThanOrEqual(lane.y + lane.height)
    }
  })

  it('puts every node to the right of its prerequisites', () => {
    for (const node of map.nodes) {
      for (const req of node.requires ?? []) {
        expect(layout.positions.get(req)!.x + NODE_WIDTH).toBeLessThan(
          layout.positions.get(node.id)!.x,
        )
      }
    }
  })

  it('never overlaps two nodes', () => {
    const corners = [...layout.positions.values()].map((p) => `${p.x},${p.y}`)
    expect(new Set(corners).size).toBe(corners.length)
  })

  it('stacks at most 3 nodes per lane column', () => {
    const perColumn = new Map<string, number>()
    for (const node of map.nodes) {
      const key = `${node.layer}|${layout.positions.get(node.id)!.x}`
      perColumn.set(key, (perColumn.get(key) ?? 0) + 1)
    }
    expect(Math.max(...perColumn.values())).toBeLessThanOrEqual(3)
  })
})
