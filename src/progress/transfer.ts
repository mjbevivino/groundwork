// JSON export and import of progress. Import checks the file against the
// map before anything is replaced, and explains every problem it finds.

import type { GroundworkMap } from '../map/types'
import type { Progress } from './types'

export type ImportResult =
  { ok: true; progress: Progress } | { ok: false; errors: string[] }

/** Progress as pretty-printed JSON, ready to save as a file. */
export function exportProgress(progress: Progress): string {
  return `${JSON.stringify(progress, null, 2)}\n`
}

/** A file name the repo's .gitignore already blocks (progress*.json). */
export function exportFileName(map: GroundworkMap, today: string): string {
  return `progress-${map.id}-${today}.json`
}

const STARTED = ['learning', 'working', 'deep']
const EVIDENCE_TYPES = ['objective', 'strong_when']
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Parse and check an exported progress file against `map`. */
export function importProgress(text: string, map: GroundworkMap): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { ok: false, errors: [`Not valid JSON: ${detail}`] }
  }
  if (!isRecord(data)) {
    return { ok: false, errors: ['The file must contain a JSON object.'] }
  }

  const errors: string[] = []
  const mapId = typeof data.map === 'string' ? data.map.split('@')[0] : null
  if (mapId !== map.id) {
    errors.push(
      `This progress is for map "${String(data.map)}", not "${map.id}".`,
    )
  }
  if (
    data.last_opened !== undefined &&
    !map.nodes.some((n) => n.id === data.last_opened)
  ) {
    errors.push(`last_opened "${String(data.last_opened)}" is not in the map.`)
  }
  if (!isRecord(data.nodes)) {
    errors.push('"nodes" must be an object keyed by node id.')
    return { ok: false, errors }
  }

  const nodeById = new Map(map.nodes.map((n) => [n.id, n]))
  for (const [id, p] of Object.entries(data.nodes)) {
    const where = `Node "${id}"`
    const node = nodeById.get(id)
    if (!node) {
      errors.push(`${where} is not in the map.`)
      continue
    }
    if (!isRecord(p)) {
      errors.push(`${where} must be an object.`)
      continue
    }
    if (typeof p.level !== 'string' || !STARTED.includes(p.level)) {
      errors.push(
        `${where}: level must be learning, working or deep (locked and ready are never stored).`,
      )
    }
    if (
      !Array.isArray(p.objectives_done) ||
      !p.objectives_done.every(
        (i) => Number.isInteger(i) && i >= 0 && i < node.objectives.length,
      )
    ) {
      errors.push(
        `${where}: objectives_done must list objective numbers from 0 to ${node.objectives.length - 1}.`,
      )
    }
    if (!Array.isArray(p.evidence)) {
      errors.push(`${where}: evidence must be a list.`)
    } else {
      p.evidence.forEach((e, i) => {
        const bad =
          !isRecord(e) ||
          typeof e.type !== 'string' ||
          !EVIDENCE_TYPES.includes(e.type) ||
          typeof e.note !== 'string' ||
          typeof e.date !== 'string' ||
          !DATE.test(e.date) ||
          (e.url !== undefined && typeof e.url !== 'string')
        if (bad) {
          errors.push(
            `${where}, evidence ${i + 1}: needs type (objective or strong_when), note, and date (YYYY-MM-DD); url is optional.`,
          )
        }
      })
    }
    for (const field of ['started', 'reached_working', 'next_review']) {
      const value = p[field]
      if ((field === 'started' || value !== undefined) && !isDate(value)) {
        errors.push(`${where}: ${field} must be a date (YYYY-MM-DD).`)
      }
    }
  }

  // Checked field by field above; the cast only names the shape.
  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, progress: data as unknown as Progress }
}

function isDate(value: unknown): boolean {
  return typeof value === 'string' && DATE.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
