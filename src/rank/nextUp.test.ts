import { describe, expect, it } from 'vitest'
import fdeMapSource from '../../maps/fde.yaml?raw'
import type { Levels } from '../graph/graph'
import { loadMap } from '../map/load'
import type { GroundworkMap, Layer, MapNode } from '../map/types'
import { nextUp, projectPath } from './nextUp'

function seedMap(): GroundworkMap {
  const result = loadMap(fdeMapSource)
  if (!result.ok) throw new Error('seed map failed to load')
  return result.map
}

function node(
  id: string,
  opts: { requires?: string[]; layer?: string; hours?: number } = {},
): MapNode {
  return {
    id,
    title: `Node ${id}`,
    layer: opts.layer ?? 'A',
    depth: 'working',
    why: 'Test.',
    objectives: ['Do it'],
    strong_when: 'Done.',
    requires: opts.requires ?? [],
    ...(opts.hours !== undefined && { est_hours: opts.hours }),
  }
}

function makeMap(
  nodes: MapNode[],
  layers: Layer[] = [{ id: 'A', title: 'A' }],
) {
  const map: GroundworkMap = {
    schema: 'groundwork/map@1',
    id: 'test',
    title: 'Test',
    version: '1.0.0',
    layers,
    nodes,
    projects: [{ id: 'proj', title: 'The project', requires: ['GOAL'] }],
  }
  return map
}

const ids = (map: GroundworkMap, levels: Levels, project?: string) =>
  nextUp(map, levels, project).map((s) => s.id)

describe('nextUp on the seed map (the M6 done-when check)', () => {
  const map = seedMap()

  it('with empty progress and project groundwork: P1, P3, 4.4, 4.1, 4.7', () => {
    expect(ids(map, {}, 'groundwork')).toEqual([
      'P1',
      'P3',
      '4.4',
      '4.1',
      '4.7',
    ])
  })

  it('with P1 to P5 at working: 2.5, 2.3, 1.3, 2.2, 1.5', () => {
    const levels: Levels = {
      P1: 'working',
      P2: 'working',
      P3: 'working',
      P4: 'working',
      P5: 'working',
    }
    expect(ids(map, levels, 'groundwork')).toEqual([
      '2.5',
      '2.3',
      '1.3',
      '2.2',
      '1.5',
    ])
  })

  it('gives each suggestion a one-line reason', () => {
    const suggestions = nextUp(map, {}, 'groundwork')
    expect(suggestions[0].reason).toBe(
      'On the path to Groundwork, leads to 28 later topics',
    )
    for (const s of suggestions) expect(s.reason).not.toContain('\n')
  })
})

describe('candidates', () => {
  it('are ready nodes not yet started, plus nodes in Learning', () => {
    const map = makeMap([
      node('R'),
      node('L'),
      node('W'),
      node('D'),
      node('LOCKED', { requires: ['L'] }),
    ])
    const levels: Levels = { L: 'learning', W: 'working', D: 'deep' }
    expect(new Set(ids(map, levels))).toEqual(new Set(['R', 'L']))
    expect(nextUp(map, levels).find((s) => s.id === 'L')!.reason).toMatch(
      /^In progress/,
    )
  })

  it('returns at most five', () => {
    const map = makeMap(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((id) => node(id)),
    )
    expect(ids(map, {})).toHaveLength(5)
  })
})

describe('ranking rules', () => {
  it('1. puts nodes on the active project path first, at any depth', () => {
    // DEEP is two steps below GOAL; BIG unlocks more but is off the path.
    const map = makeMap([
      node('BIG'),
      node('X', { requires: ['BIG'] }),
      node('Y', { requires: ['BIG'] }),
      node('DEEP'),
      node('MID', { requires: ['DEEP'] }),
      node('GOAL', { requires: ['MID'] }),
    ])
    expect(projectPath(map, 'proj')).toEqual(new Set(['GOAL', 'MID', 'DEEP']))
    expect(ids(map, {}, 'proj')[0]).toBe('DEEP')
    expect(ids(map, {})[0]).toBe('BIG') // no active project: rule 1 is off
  })

  it('2. then more downstream nodes, counted transitively', () => {
    // ONE leads to 1 node; CHAIN leads to 2 through a chain.
    const map = makeMap([
      node('ONE'),
      node('ONE_NEXT', { requires: ['ONE'] }),
      node('CHAIN'),
      node('C1', { requires: ['CHAIN'] }),
      node('C2', { requires: ['C1'] }),
    ])
    expect(ids(map, {})).toEqual(['CHAIN', 'ONE'])
  })

  it('3. then earlier layer in the map file', () => {
    const layers = [
      { id: 'FIRST', title: 'First' },
      { id: 'SECOND', title: 'Second' },
    ]
    const map = makeMap(
      [
        node('LATE', { layer: 'SECOND', hours: 1 }),
        node('EARLY', { layer: 'FIRST', hours: 99 }),
      ],
      layers,
    )
    expect(ids(map, {})).toEqual(['EARLY', 'LATE'])
  })

  it('4. then fewer est_hours, with missing hours last', () => {
    const map = makeMap([
      node('NONE'),
      node('LONG', { hours: 40 }),
      node('SHORT', { hours: 5 }),
    ])
    expect(ids(map, {})).toEqual(['SHORT', 'LONG', 'NONE'])
  })

  it('breaks any remaining tie by position in the file', () => {
    const map = makeMap([node('B', { hours: 5 }), node('A', { hours: 5 })])
    expect(ids(map, {})).toEqual(['B', 'A'])
  })
})
