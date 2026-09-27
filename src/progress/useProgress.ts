import { useCallback, useEffect, useRef, useState } from 'react'
import type { GroundworkMap } from '../map/types'
import { emptyProgress } from './rules'
import { loadProgress, saveProgress } from './store'
import type { Progress } from './types'

/**
 * Progress for a map, loaded from IndexedDB and saved after every change.
 * `progress` is null until the first load finishes.
 */
export function useProgress(map: GroundworkMap) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Only save changes made after loading, never the loaded value itself.
  const changed = useRef(false)

  useEffect(() => {
    let live = true
    loadProgress(map).then(
      (loaded) => live && setProgress(loaded),
      (e: unknown) => {
        if (!live) return
        setError(
          `Couldn't load saved progress, so changes won't be saved: ${message(e)}`,
        )
        setProgress(emptyProgress(map))
      },
    )
    return () => {
      live = false
    }
  }, [map])

  useEffect(() => {
    if (!progress || !changed.current) return
    saveProgress(map, progress).catch((e: unknown) =>
      setError(`Couldn't save progress: ${message(e)}`),
    )
  }, [map, progress])

  /** Change progress; the new value is saved automatically. */
  const update = useCallback((change: (prev: Progress) => Progress) => {
    changed.current = true
    setProgress((prev) => (prev ? change(prev) : prev))
  }, [])

  return { progress, update, error }
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
