import { load as parseYaml } from 'js-yaml'
import { validateMap, type ValidationResult } from './validate'

export type { MapError } from './validate'
export type LoadResult = ValidationResult

/**
 * Parse a map from YAML text and validate it against the schema.
 * Never throws: YAML syntax errors come back as errors, like schema errors.
 */
export function loadMap(source: string): LoadResult {
  let data: unknown
  try {
    data = parseYaml(source)
  } catch (error) {
    // js-yaml throws YAMLException (a subclass of Error) with line and column.
    const detail = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      errors: [{ path: '', message: `YAML syntax error: ${detail}` }],
    }
  }
  return validateMap(data)
}
