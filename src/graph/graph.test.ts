import { describe, expect, it } from 'vitest'
import fdeMapSource from '../../maps/fde.yaml?raw'
import { loadMap } from '../map/load'
import type { GroundworkMap, Id, MapNode, Project } from '../map/types'
import {
  allPrerequisites,
  checkReferences,
  downstreamCounts,
  findDuplicateIds,
  readyNodes,
  topologicalOrder,
  type Levels,
} from './graph'

// ---------------------------------------------------------------- fixtures

function node(id: Id, requires: Id[] = [], related: Id[] = []): MapNode {
  return {
    id,
    title: `Node ${id}`,
    layer: 'L',
    depth: 'working',
    why: 'Test.',
    objectives: ['Do it'],
    strong_when: 'You did it.',
    requires,
    related,
  }
}

function makeMap(nodes: MapNode[], projects: Project[] = []): GroundworkMap {
  return {
    schema: 'groundwork/map@1',
    id: 'test',
    title: 'Test',
    version: '1.0.0',
    layers: [{ id: 'L', title: 'Layer' }],
    nodes,
    projects,
  }
}

function seedMap(): GroundworkMap {
  const result = loadMap(fdeMapSource)
  if (!result.ok) throw new Error('seed map failed to load')
  return result.map
}

// Chain: A <- B <- C (B requires A, C requires B).
const chain = makeMap([node('A'), node('B', ['A']), node('C', ['B'])])

// Diamond: B and C require A; D requires B and C.
const diamond = makeMap([
  node('A'),
  node('B', ['A']),
  node('C', ['A']),
  node('D', ['B', 'C']),
])

/** Checks that `order` holds every node once, each after all its requires. */
function expectValidOrder(map: GroundworkMap, order: Id[]) {
  expect([...order].sort()).toEqual(map.nodes.map((n) => n.id).sort())
  const position = new Map(order.map((id, i) => [id, i]))
  for (const n of map.nodes) {
    for (const req of n.requires ?? []) {
      expect(position.get(req)).toBeLessThan(position.get(n.id)!)
    }
  }
}

// ---------------------------------------------------------------- seed map

describe('the seed map', () => {
  const map = seedMap()

  it('has no missing references and no duplicate ids', () => {
    expect(checkReferences(map)).toEqual([])
    expect(findDuplicateIds(map)).toEqual([])
  })

  it('has no cycles, and orders all 46 nodes', () => {
    const result = topologicalOrder(map)
    if (!result.ok) throw new Error(`cycle: ${result.cycle.join(' -> ')}`)
    expect(result.order).toHaveLength(46)
    expectValidOrder(map, result.order)
  })

  it('has exactly 8 nodes with no prerequisites, all ready with empty progress', () => {
    expect(readyNodes(map, {})).toEqual(
      new Set(['P1', 'P3', 'P6', 'P7', '4.1', '4.4', '4.7', '4.11']),
    )
  })

  it('unlocks the right nodes when P1 to P5 are at working', () => {
    const levels: Levels = {
      P1: 'working',
      P2: 'working',
      P3: 'working',
      P4: 'working',
      P5: 'working',
    }
    // Not started, and every requires is in P1 to P5. Grouped by layer.
    // prettier-ignore
    const expected = [
      'P6', 'P7',
      '1.1', '1.2', '1.3', '1.4', '1.5', '1.7',
      '2.1', '2.2', '2.3', '2.5',
      '3.1', '3.3',
      '4.1', '4.4', '4.7', '4.11',
    ]
    expect(readyNodes(map, levels)).toEqual(new Set(expected))
  })

  it('counts downstream nodes for a few known cases', () => {
    const counts = downstreamCounts(map)
    expect(counts.size).toBe(46)
    expect(counts.get('4.4')).toBe(3) // 4.5, 4.6, and 4.10 via 4.5
    expect(counts.get('4.1')).toBe(2) // 4.2, 4.3
    expect(counts.get('P7')).toBe(1) // 4.12
    expect(counts.get('3.10')).toBe(0)
  })

  it('finds every prerequisite of the groundwork project', () => {
    const groundwork = map.projects!.find((p) => p.id === 'groundwork')!
    expect(allPrerequisites(map, groundwork.requires)).toEqual(
      new Set(['P1', 'P2', 'P3', 'P4', 'P5', '2.5']),
    )
  })
})

// ---------------------------------------------------------------- references

describe('checkReferences', () => {
  it('reports a missing id in requires, naming the node', () => {
    const map = makeMap([node('A'), node('B', ['A', 'Z'])])
    expect(checkReferences(map)).toEqual([
      { source: 'node', from: 'B', field: 'requires', missing: 'Z' },
    ])
  })

  it('reports missing ids in related, layer and project requires', () => {
    const badLayer = { ...node('C'), layer: 'NOPE' }
    const map = makeMap(
      [node('A'), node('B', [], ['Y']), badLayer],
      [{ id: 'proj', title: 'Project', requires: ['A', 'X'] }],
    )
    const issues = checkReferences(map)
    expect(issues).toHaveLength(3)
    expect(issues).toContainEqual({
      source: 'node',
      from: 'B',
      field: 'related',
      missing: 'Y',
    })
    expect(issues).toContainEqual({
      source: 'node',
      from: 'C',
      field: 'layer',
      missing: 'NOPE',
    })
    expect(issues).toContainEqual({
      source: 'project',
      from: 'proj',
      field: 'requires',
      missing: 'X',
    })
  })
})

describe('findDuplicateIds', () => {
  it('lists each repeated id once', () => {
    const map = makeMap([node('2.1'), node('2.1'), node('2.1'), node('2.2')])
    expect(findDuplicateIds(map)).toEqual(['2.1'])
  })
})

// ---------------------------------------------------------------- order and cycles

describe('topologicalOrder', () => {
  it('orders a chain and a diamond', () => {
    for (const map of [chain, diamond]) {
      const result = topologicalOrder(map)
      if (!result.ok) throw new Error('unexpected cycle')
      expectValidOrder(map, result.order)
    }
  })

  it('reports a two-node cycle', () => {
    const map = makeMap([node('A', ['B']), node('B', ['A'])])
    const result = topologicalOrder(map)
    expect(result.ok).toBe(false)
    if (!result.ok) expect([...result.cycle].sort()).toEqual(['A', 'B'])
  })

  it('reports a node that requires itself', () => {
    const map = makeMap([node('A', ['A']), node('B')])
    const result = topologicalOrder(map)
    expect(result).toEqual({ ok: false, cycle: ['A'] })
  })

  it('names only the nodes on the cycle, not those upstream or downstream', () => {
    // UP -> B <-> C -> DOWN: B and C require each other, B requires UP,
    // and DOWN requires C.
    const map = makeMap([
      node('UP'),
      node('B', ['UP', 'C']),
      node('C', ['B']),
      node('DOWN', ['C']),
    ])
    const result = topologicalOrder(map)
    expect(result.ok).toBe(false)
    if (!result.ok) expect([...result.cycle].sort()).toEqual(['B', 'C'])
  })

  it('ignores related links, even when they loop', () => {
    const map = makeMap([node('A', [], ['B']), node('B', [], ['A'])])
    expect(topologicalOrder(map).ok).toBe(true)
  })
})

// ---------------------------------------------------------------- ready set

describe('readyNodes', () => {
  it('with empty progress, only nodes without requires are ready', () => {
    expect(readyNodes(chain, {})).toEqual(new Set(['A']))
  })

  it('unlocks a node when its requires are at working or deep', () => {
    expect(readyNodes(diamond, { A: 'deep', B: 'working', C: 'deep' })).toEqual(
      new Set(['D']),
    )
  })

  it('keeps a node locked when a requirement is only at learning', () => {
    expect(readyNodes(chain, { A: 'learning' })).toEqual(new Set())
  })

  it('keeps a node locked until every requirement is met', () => {
    expect(readyNodes(diamond, { A: 'working', B: 'working' })).toEqual(
      new Set(['C']),
    )
  })

  it('never includes nodes that are already started', () => {
    const map = makeMap([node('A'), node('B'), node('C'), node('D')])
    expect(readyNodes(map, { A: 'learning', B: 'working', C: 'deep' })).toEqual(
      new Set(['D']),
    )
  })

  it('never lets related links block', () => {
    const map = makeMap([node('A'), node('B', [], ['A'])])
    expect(readyNodes(map, {})).toEqual(new Set(['A', 'B']))
  })
})

// ---------------------------------------------------------------- reachability

describe('downstreamCounts', () => {
  it('counts direct and indirect dependents in a chain', () => {
    expect(downstreamCounts(chain)).toEqual(
      new Map([
        ['A', 2],
        ['B', 1],
        ['C', 0],
      ]),
    )
  })

  it('counts each dependent once in a diamond', () => {
    expect(downstreamCounts(diamond)).toEqual(
      new Map([
        ['A', 3],
        ['B', 1],
        ['C', 1],
        ['D', 0],
      ]),
    )
  })

  it('ignores related links', () => {
    const map = makeMap([node('A'), node('B', [], ['A'])])
    expect(downstreamCounts(map).get('A')).toBe(0)
  })
})

describe('allPrerequisites', () => {
  it('follows requires at any depth', () => {
    expect(allPrerequisites(chain, ['C'])).toEqual(new Set(['A', 'B']))
    expect(allPrerequisites(diamond, ['D'])).toEqual(new Set(['A', 'B', 'C']))
  })

  it('includes a given id only when another given id requires it', () => {
    expect(allPrerequisites(chain, ['B', 'C'])).toEqual(new Set(['A', 'B']))
  })

  it('is empty for nodes without requires, and ignores related links', () => {
    const map = makeMap([node('A'), node('B', [], ['A'])])
    expect(allPrerequisites(map, ['A', 'B'])).toEqual(new Set())
  })
})
