import { describe, expect, it } from 'vitest'
import exampleSource from '../../progress.example.json?raw'
import fdeMapSource from '../../maps/fde.yaml?raw'
import { loadMap } from '../map/load'
import {
  completeReview,
  startLearning,
  testOut,
  toggleObjective,
} from './rules'
import { exportFileName, exportProgress, importProgress } from './transfer'
import type { Progress } from './types'

const loaded = loadMap(fdeMapSource)
if (!loaded.ok) throw new Error('seed map failed to load')
const map = loaded.map
const nodeOf = (id: string) => map.nodes.find((n) => n.id === id)!

/** Progress that exercises every field, built with the real rules. */
function richProgress(): Progress {
  const p1 = testOut(
    nodeOf('P1'),
    'ready',
    {
      type: 'objective',
      url: 'https://github.com/you/dotfiles',
      note: 'Set up a machine',
      date: '2026-10-01',
    },
    '2026-10-01',
  )
  return {
    map: 'fde@0.1.0',
    active_project: 'groundwork',
    last_opened: 'P3',
    milestones: [
      {
        id: 'gate',
        title: 'Foundation live',
        due: '2026-12-31',
        requires_projects: ['ledger'],
      },
    ],
    nodes: {
      P1: completeReview(p1, '2026-10-08'),
      P3: toggleObjective(
        nodeOf('P3'),
        startLearning('ready', '2026-10-02'),
        1,
      ),
    },
    sessions: [
      { date: '2026-10-04', minutes: 60, nodes: ['P1'], note: 'Good session' },
    ],
  }
}

function errorsFor(value: unknown): string[] {
  const result = importProgress(JSON.stringify(value), map)
  if (result.ok) throw new Error('expected the import to fail')
  return result.errors
}

describe('export and import', () => {
  it('round-trips exactly: export, import, export gives the same progress and text', () => {
    const progress = richProgress()
    const text = exportProgress(progress)
    const result = importProgress(text, map)
    if (!result.ok) throw new Error(result.errors.join('\n'))
    expect(result.progress).toEqual(progress)
    expect(exportProgress(result.progress)).toBe(text)
  })

  it('round-trips empty progress', () => {
    const empty: Progress = { map: 'fde@0.1.0', nodes: {} }
    const result = importProgress(exportProgress(empty), map)
    expect(result).toEqual({ ok: true, progress: empty })
  })

  it('imports progress.example.json', () => {
    const result = importProgress(exampleSource, map)
    if (!result.ok) throw new Error(result.errors.join('\n'))
    expect(Object.keys(result.progress.nodes)).toEqual([
      'P1',
      'P2',
      'P5',
      '2.3',
    ])
  })

  it('names an export file that .gitignore already blocks', () => {
    expect(exportFileName(map, '2026-10-01')).toBe(
      'progress-fde-2026-10-01.json',
    )
  })
})

describe('import errors', () => {
  it('rejects text that is not JSON', () => {
    const result = importProgress('{ nope', map)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toMatch(/^Not valid JSON/)
  })

  it('rejects a last_opened topic that is not in the map', () => {
    expect(
      errorsFor({ map: 'fde@0.1.0', last_opened: 'Z9', nodes: {} }),
    ).toEqual(['last_opened "Z9" is not in the map.'])
  })

  it('rejects progress for a different map', () => {
    expect(errorsFor({ map: 'other@1.0.0', nodes: {} })[0]).toMatch(
      /for map "other@1.0.0", not "fde"/,
    )
  })

  it('rejects unknown nodes and stored locked or ready levels', () => {
    const base = { objectives_done: [], evidence: [], started: '2026-10-01' }
    const errors = errorsFor({
      map: 'fde@0.1.0',
      nodes: {
        Z9: { ...base, level: 'learning' },
        P1: { ...base, level: 'ready' },
      },
    })
    expect(errors).toEqual([
      'Node "Z9" is not in the map.',
      'Node "P1": level must be learning, working or deep (locked and ready are never stored).',
    ])
  })

  it('rejects objective numbers the node does not have, and bad evidence and dates', () => {
    const errors = errorsFor({
      map: 'fde@0.1.0',
      nodes: {
        P1: {
          level: 'learning',
          objectives_done: [0, 4],
          evidence: [{ type: 'guess', note: 'x', date: '2026-10-01' }],
          started: 'yesterday',
        },
      },
    })
    expect(errors).toHaveLength(3)
    expect(errors[0]).toMatch(/objectives_done .* 0 to 3/)
    expect(errors[1]).toMatch(/evidence 1/)
    expect(errors[2]).toMatch(/started must be a date/)
  })
})
