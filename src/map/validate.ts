import Ajv2020, { type ErrorObject } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import mapSchema from '../../schema/map.schema.json'
import type { GroundworkMap } from './types'

/** One problem with a map, phrased for a person to read. */
export interface MapError {
  /** JSON pointer to the bad value, e.g. "/nodes/12/id". Empty for the whole map. */
  path: string
  message: string
}

export type ValidationResult =
  { ok: true; map: GroundworkMap } | { ok: false; errors: MapError[] }

// Compile once at import time; every call reuses the compiled validator.
const ajv = new Ajv2020({ allErrors: true })
addFormats(ajv)
const validateSchema = ajv.compile<GroundworkMap>(mapSchema)

/**
 * Check parsed map data against schema/map.schema.json.
 * Referential integrity and cycles are checked later, in src/graph.
 */
export function validateMap(data: unknown): ValidationResult {
  if (validateSchema(data)) return { ok: true, map: data }
  const errors = (validateSchema.errors ?? []).map((error) => ({
    path: error.instancePath,
    message: describeError(error, data),
  }))
  return { ok: false, errors }
}

const collections = {
  nodes: 'Node',
  layers: 'Layer',
  projects: 'Project',
} as const

function describeError(error: ErrorObject, data: unknown): string {
  const segments = error.instancePath
    .split('/')
    .slice(1)
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))

  let where = 'Map'
  let field = segments

  // "/nodes/12/..." → name the node by title and id, not just its index.
  const [collection, index, ...rest] = segments
  if (collection in collections && index !== undefined && /^\d+$/.test(index)) {
    const kind = collections[collection as keyof typeof collections]
    const item = valueAt(data, [collection, index])
    where = `${kind} ${describeItem(item, Number(index))}`
    field = rest
  }

  const value = valueAt(data, segments)
  const subject = field.length > 0 ? `${where}, ${formatField(field)}` : where
  return `${subject}: ${describeProblem(error, value)}`
}

/** e.g. `"Programming basics" (#2, id "P2")`, or `#13 (id 2.1, a number)` if untitled. */
function describeItem(item: unknown, index: number): string {
  const position = `#${index + 1}`
  if (!isRecord(item)) return position
  const id = item.id === undefined ? undefined : formatId(item.id)
  const details = [position, id && `id ${id}`].filter(Boolean).join(', ')
  return typeof item.title === 'string'
    ? `"${item.title}" (${details})`
    : details
}

function formatId(id: unknown): string {
  return typeof id === 'string' ? `"${id}"` : `${String(id)}, a ${typeof id}`
}

/** ["requires", "0"] → "requires[0]"; ["resources", "1", "url"] → "resources[1].url" */
function formatField(segments: string[]): string {
  return segments
    .map((s, i) => (/^\d+$/.test(s) ? `[${s}]` : i === 0 ? s : `.${s}`))
    .join('')
}

function describeProblem(error: ErrorObject, value: unknown): string {
  const { params } = error
  switch (error.keyword) {
    case 'type':
      if (params.type === 'string' && typeof value === 'number') {
        return (
          `must be a string, but YAML read it as the number ${value}. ` +
          `Put quotes around ids so they stay strings (write "2.10", not 2.10).`
        )
      }
      return `must be a ${params.type}, but got ${describeValue(value)}`
    case 'required':
      return `missing required field "${params.missingProperty}"`
    case 'additionalProperties':
      return `unknown field "${params.additionalProperty}"`
    case 'enum':
      return `must be one of ${(params.allowedValues as unknown[])
        .map((v) => JSON.stringify(v))
        .join(', ')}, but got ${describeValue(value)}`
    case 'const':
      return `must be ${JSON.stringify(params.allowedValue)}, but got ${describeValue(value)}`
    default:
      return error.message ?? 'is invalid'
  }
}

function describeValue(value: unknown): string {
  if (value === null) return 'nothing (null)'
  if (Array.isArray(value)) return 'a list'
  if (typeof value === 'object') return 'an object'
  return JSON.stringify(value)
}

function valueAt(data: unknown, segments: string[]): unknown {
  let current = data
  for (const segment of segments) {
    if (Array.isArray(current)) current = current[Number(segment)]
    else if (isRecord(current)) current = current[segment]
    else return undefined
  }
  return current
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
