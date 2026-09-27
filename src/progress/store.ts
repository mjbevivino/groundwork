import { Dexie, type EntityTable } from 'dexie'
import type { GroundworkMap } from '../map/types'
import { emptyProgress } from './rules'
import type { Progress } from './types'

/** One row per map, keyed by map id so a new map version keeps your progress. */
interface SavedProgress {
  mapId: string
  progress: Progress
}

export const db = new Dexie('groundwork') as Dexie & {
  progress: EntityTable<SavedProgress, 'mapId'>
}
db.version(1).stores({ progress: 'mapId' })

/** Saved progress for a map, or empty progress if nothing is saved yet. */
export async function loadProgress(map: GroundworkMap): Promise<Progress> {
  const row = await db.progress.get(map.id)
  return row?.progress ?? emptyProgress(map)
}

/** Replace the saved progress for a map. */
export async function saveProgress(
  map: GroundworkMap,
  progress: Progress,
): Promise<void> {
  await db.progress.put({ mapId: map.id, progress })
}
