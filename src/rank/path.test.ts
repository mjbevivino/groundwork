import { describe, expect, it } from 'vitest'
import fdeMapSource from '../../maps/fde.yaml?raw'
import type { Levels } from '../graph/graph'
import { loadMap } from '../map/load'
import type { GroundworkMap, MapNode } from '../map/types'
import { computeLevels } from '../progress/levels'
import {
  currentUnit,
  locate,
  neighbors,
  nextToStudy,
  scopeIds,
  scopeSummary,
  studyOrder,
  units,
  unmetPrerequisites,
} from './path'

function seedMap(): GroundworkMap {
  const result = loadMap(fdeMapSource)
  if (!result.ok) throw new Error('seed map failed to load')
  return result.map
}

const map = seedMap()
const groundwork = scopeIds(map, { kind: 'project', projectId: 'groundwork' })
const levelsFor = (stored: Levels) => computeLevels(map, stored)
const P1_TO_P5: Levels = {
  P1: 'working',
  P2: 'working',
  P3: 'working',
  P4: 'working',
  P5: 'working',
}

/** Every topic comes after all its prerequisites that are also in `order`. */
function expectPrerequisitesFirst(m: GroundworkMap, order: string[]) {
  const position = new Map(order.map((id, i) => [id, i]))
  for (const id of order) {
    const node = m.nodes.find((n) => n.id === id)!
    for (const req of node.requires ?? []) {
      if (position.has(req)) {
        expect(position.get(req)).toBeLessThan(position.get(id)!)
      }
    }
  }
}

describe('study order', () => {
  it('puts every topic after its prerequisites, across the whole map', () => {
    const order = studyOrder(map)
    expect(order).toHaveLength(46)
    expect(new Set(order).size).toBe(46)
    expectPrerequisitesFirst(map, order)
  })

  it('keeps prerequisites first within the Groundwork scope too', () => {
    expectPrerequisitesFirst(map, studyOrder(map, groundwork))
  })

  it('goes unit by unit, and in map order within a unit when nothing blocks', () => {
    const order = studyOrder(map)
    const layerIndex = (id: string) =>
      map.layers.findIndex(
        (l) => l.id === map.nodes.find((n) => n.id === id)!.layer,
      )
    const layers = order.map(layerIndex)
    expect(layers).toEqual([...layers].sort((a, b) => a - b))
    expect(order.slice(0, 7)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
      'P6',
      'P7',
    ])
  })

  it('moves a prerequisite ahead of a topic listed before it in the file', () => {
    const node = (id: string, requires: string[] = []): MapNode => ({
      id,
      title: id,
      layer: 'L',
      depth: 'working',
      why: 'Test.',
      objectives: ['Do it'],
      strong_when: 'Done.',
      requires,
    })
    const small: GroundworkMap = {
      schema: 'groundwork/map@1',
      id: 'test',
      title: 'Test',
      version: '1.0.0',
      layers: [{ id: 'L', title: 'Layer' }],
      nodes: [node('LATER', ['BASE']), node('OTHER'), node('BASE')],
    }
    expect(studyOrder(small)).toEqual(['OTHER', 'BASE', 'LATER'])
  })
})

describe('scope', () => {
  it('covers exactly the 10 topics on the Groundwork path, in study order', () => {
    expect(studyOrder(map, groundwork)).toEqual([
      'P1', 'P2', 'P3', 'P4', 'P5', '1.3', '2.2', '2.3', '2.5', '2.6',
    ]) // prettier-ignore
  })

  it('covers all 46 topics for the whole map, and nothing for an unknown project', () => {
    expect(scopeIds(map, { kind: 'all' }).size).toBe(46)
    expect(scopeIds(map, { kind: 'project', projectId: 'nope' }).size).toBe(0)
  })

  it('sums topics done and hours left', () => {
    const order = studyOrder(map, groundwork)
    expect(scopeSummary(map, order, levelsFor({}))).toEqual({
      done: 0,
      total: 10,
      hoursLeft: 433,
    })
    // P1 to P5 are 10 + 60 + 30 + 15 + 8 = 123 hours.
    expect(scopeSummary(map, order, levelsFor(P1_TO_P5))).toEqual({
      done: 5,
      total: 10,
      hoursLeft: 310,
    })
  })
})

describe('units', () => {
  const order = studyOrder(map, groundwork)

  it('groups the scope by layer, numbering only non-empty units', () => {
    const all = units(map, order, levelsFor({}))
    expect(all.map((u) => [u.number, u.layer.id, u.topics.length])).toEqual([
      [1, 'P', 5],
      [2, 'L1', 1],
      [3, 'L2', 4],
    ])
  })

  it('counts done topics and finds the current unit', () => {
    expect(currentUnit(units(map, order, levelsFor({})))!.layer.id).toBe('P')
    const after = units(map, order, levelsFor(P1_TO_P5))
    expect(after[0].done).toBe(5)
    expect(currentUnit(after)!.layer.id).toBe('L1')
  })

  it('locates a topic for the breadcrumb', () => {
    const all = units(map, order, levelsFor({}))
    const found = locate(all, 'P2')!
    expect([found.unit.number, found.unit.layer.title, found.position]).toEqual(
      [1, 'Prerequisites', 2],
    )
    expect(locate(all, '4.1')).toBeUndefined()
  })
})

describe('moving along the path', () => {
  const order = studyOrder(map, groundwork)

  it('finds previous and next in study order', () => {
    expect(neighbors(order, 'P1')).toEqual({ prev: undefined, next: 'P2' })
    expect(neighbors(order, '2.6')).toEqual({ prev: '2.5', next: undefined })
  })

  it('offers the next topic you can work on now', () => {
    // After P1 reaches Working, P2 unlocks and is next.
    expect(nextToStudy(order, 'P1', levelsFor({ P1: 'working' }))).toBe('P2')
    // With nothing done, P2 is locked, so the next workable topic is P3.
    expect(nextToStudy(order, 'P1', levelsFor({}))).toBe('P3')
    expect(nextToStudy(order, '2.6', levelsFor({}))).toBeUndefined()
  })

  it('lists what a locked topic still needs', () => {
    expect(
      unmetPrerequisites(map, '1.3', levelsFor({ P2: 'working' })),
    ).toEqual(['P3'])
    expect(unmetPrerequisites(map, 'P1', levelsFor({}))).toEqual([])
  })
})
