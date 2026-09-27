import { describe, expect, it } from 'vitest'
import fdeMapSource from '../../maps/fde.yaml?raw'
import { loadMap } from './load'

// A minimal valid map. `nodes` is raw YAML so tests can write ids unquoted.
function mapYaml(nodes: string): string {
  return `
schema: groundwork/map@1
id: test
title: Test map
version: "1.0.0"
layers:
  - id: L2
    title: Builder core
nodes:
${nodes}
`
}

function nodeYaml(id: string, title: string, extra = ''): string {
  return `
  - id: ${id}
    title: ${title}
    layer: L2
    depth: working
    why: Because.
    objectives: [Do the thing]
    strong_when: You can do the thing.${extra}`
}

function errorsFor(source: string) {
  const result = loadMap(source)
  if (result.ok) throw new Error('expected the map to fail validation')
  return result.errors
}

describe('loadMap', () => {
  it('loads the seed map with 46 nodes, 5 layers and 5 projects', () => {
    const result = loadMap(fdeMapSource)
    if (!result.ok)
      throw new Error(result.errors.map((e) => e.message).join('\n'))
    expect(result.map.nodes).toHaveLength(46)
    expect(result.map.layers).toHaveLength(5)
    expect(result.map.projects).toHaveLength(5)
    for (const node of result.map.nodes) expect(typeof node.id).toBe('string')
  })

  it('accepts a quoted "2.10" next to "2.1"', () => {
    const source = mapYaml(
      nodeYaml('"2.1"', 'Version control') + nodeYaml('"2.10"', 'Deployment'),
    )
    expect(loadMap(source).ok).toBe(true)
  })

  it('rejects an unquoted 2.10 id and names the node', () => {
    const source = mapYaml(
      nodeYaml('"2.1"', 'Version control') + nodeYaml('2.10', 'Deployment'),
    )
    const errors = errorsFor(source)
    expect(errors).toHaveLength(1)
    expect(errors[0].path).toBe('/nodes/1/id')
    expect(errors[0].message).toContain('Node "Deployment"')
    expect(errors[0].message).toContain('the number 2.1')
    expect(errors[0].message).toContain('quotes')
  })

  it('rejects an unquoted id in requires and names the requiring node', () => {
    const source = mapYaml(
      nodeYaml('"2.1"', 'Version control') +
        nodeYaml('"2.2"', 'Testing', '\n    requires: [2.1]'),
    )
    const errors = errorsFor(source)
    expect(errors).toHaveLength(1)
    expect(errors[0].path).toBe('/nodes/1/requires/0')
    expect(errors[0].message).toMatch(/^Node "Testing" .*requires\[0\]: /)
  })

  it('names the node and field when a required field is missing', () => {
    const source = mapYaml(`
  - id: "2.1"
    title: Version control
    layer: L2
    depth: working
    objectives: [Commit]
    strong_when: You can commit.`)
    const [error] = errorsFor(source)
    expect(error.message).toBe(
      'Node "Version control" (#1, id "2.1"): missing required field "why"',
    )
  })

  it('names unknown fields and lists allowed values', () => {
    const source = mapYaml(
      nodeYaml('"2.1"', 'Version control', '\n    difficulty: hard').replace(
        'depth: working',
        'depth: shallow',
      ),
    )
    const messages = errorsFor(source).map((e) => e.message)
    expect(messages).toContain(
      'Node "Version control" (#1, id "2.1"): unknown field "difficulty"',
    )
    expect(messages).toContain(
      'Node "Version control" (#1, id "2.1"), depth: must be one of "working", "deep", but got "shallow"',
    )
  })

  it('reports YAML syntax errors instead of throwing', () => {
    const [error] = errorsFor('nodes: [unclosed')
    expect(error.path).toBe('')
    expect(error.message).toMatch(/^YAML syntax error: /)
  })

  it('reports an empty file as a readable error', () => {
    const [error] = errorsFor('')
    expect(error.message).toMatch(/^YAML syntax error: .*empty/)
  })

  it('reports a map that is not an object', () => {
    const [error] = errorsFor('- just\n- a list')
    expect(error.message).toBe('Map: must be an object, but got a list')
  })
})
