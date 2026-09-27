import { beforeEach, describe, expect, it } from 'vitest'
import fdeMapSource from '../../maps/fde.yaml?raw'
import { loadMap } from '../map/load'
import { testOut } from './rules'
import { db, loadProgress, saveProgress } from './store'
import type { Progress } from './types'

const loaded = loadMap(fdeMapSource)
if (!loaded.ok) throw new Error('seed map failed to load')
const map = loaded.map
const p1 = map.nodes.find((n) => n.id === 'P1')!

beforeEach(async () => {
  await db.progress.clear()
})

describe('progress store', () => {
  it('returns empty progress when nothing is saved', async () => {
    expect(await loadProgress(map)).toEqual({ map: 'fde@0.1.0', nodes: {} })
  })

  it('saves and loads progress unchanged, even after reopening the database', async () => {
    const evidence = {
      type: 'objective' as const,
      note: 'Did it',
      date: '2026-10-01',
    }
    const progress: Progress = {
      map: 'fde@0.1.0',
      active_project: 'groundwork',
      nodes: { P1: testOut(p1, 'ready', evidence, '2026-10-01') },
    }
    await saveProgress(map, progress)

    db.close()
    await db.open()
    expect(await loadProgress(map)).toEqual(progress)
  })

  it('replaces, not merges, on save', async () => {
    await saveProgress(map, {
      map: 'fde@0.1.0',
      nodes: {
        P1: testOut(
          p1,
          'ready',
          { type: 'objective', note: 'x', date: '2026-10-01' },
          '2026-10-01',
        ),
      },
    })
    await saveProgress(map, { map: 'fde@0.1.0', nodes: {} })
    expect((await loadProgress(map)).nodes).toEqual({})
  })
})
