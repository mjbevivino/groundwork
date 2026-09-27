// TypeScript mirror of schema/map.schema.json (groundwork/map@1).
// These types only describe the shape; validate.ts checks real data against
// the schema at runtime. Keep the two in sync when the schema changes.

/** Node, layer and project ids. Always strings, never numbers. */
export type Id = string

/** Target depth: working = build it with docs open; deep = build and debug it unaided. */
export type Depth = 'working' | 'deep'

export type ResourceKind =
  'book' | 'course' | 'docs' | 'video' | 'article' | 'practice' | 'tool'

export interface Resource {
  title: string
  kind: ResourceKind
  url?: string
  free?: boolean
  note?: string
}

export interface Layer {
  id: Id
  title: string
  description?: string
}

export interface MapNode {
  id: Id
  title: string
  /** Id of the layer (lane) this node belongs to. */
  layer: Id
  depth: Depth
  why: string
  /** Stored in progress by position, so reordering is a breaking change. */
  objectives: string[]
  strong_when: string
  /** Hard prerequisites: each must reach working before this node unlocks. */
  requires?: Id[]
  /** Soft links: suggested, never blocking. */
  related?: Id[]
  resources?: Resource[]
  est_hours?: number
  tags?: string[]
}

export interface Project {
  id: Id
  title: string
  description?: string
  requires: Id[]
}

export interface GroundworkMap {
  schema: 'groundwork/map@1'
  id: string
  title: string
  /** Semantic version, e.g. "0.1.0". */
  version: string
  description?: string
  license?: string
  authors?: string[]
  layers: Layer[]
  nodes: MapNode[]
  projects?: Project[]
}
