import { describe, expect, it } from 'vitest'
import type { GroundworkMap, MapNode } from '../map/types'
import { computeLevels } from './levels'

function node(id: string, requires: string[] = []): MapNode {
  return {
    id,
    title: id,
    layer: 'L',
    depth: 'working',
    why: 'Test.',
    objectives: ['Do it'],
    strong_when: 'Done.',
    requires,
  }
}

const map: GroundworkMap = {
  schema: 'groundwork/map@1',
  id: 'test',
  title: 'Test',
  version: '1.0.0',
  layers: [{ id: 'L', title: 'Layer' }],
  nodes: [node('A'), node('B', ['A']), node('C', ['B'])],
}

describe('computeLevels', () => {
  it('marks roots ready and everything else locked with empty progress', () => {
    expect(computeLevels(map, {})).toEqual(
      new Map([
        ['A', 'ready'],
        ['B', 'locked'],
        ['C', 'locked'],
      ]),
    )
  })

  it('keeps stored levels and unlocks what they satisfy', () => {
    expect(computeLevels(map, { A: 'working', B: 'learning' })).toEqual(
      new Map([
        ['A', 'working'],
        ['B', 'learning'],
        ['C', 'locked'],
      ]),
    )
  })
})
