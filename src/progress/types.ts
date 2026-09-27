// Stored progress, mirroring progress.example.json. Only started nodes appear
// in `nodes`; locked and ready are computed from the map, never stored.

import type { StartedLevel } from '../graph/graph'
import type { Id } from '../map/types'

/** `objective`: work that shows the objectives; `strong_when`: passed the strong-when test. */
export type EvidenceType = 'objective' | 'strong_when'

export interface Evidence {
  type: EvidenceType
  url?: string
  note: string
  /** ISO date, YYYY-MM-DD. */
  date: string
}

export interface NodeProgress {
  level: StartedLevel
  /** Indexes into the node's `objectives`. */
  objectives_done: number[]
  evidence: Evidence[]
  started: string
  reached_working?: string
  next_review?: string
  reviews_done?: number
  notes?: string
}

export interface Milestone {
  id: string
  title: string
  due: string
  requires_projects: Id[]
}

export interface Session {
  date: string
  minutes: number
  nodes: Id[]
  milestone?: string
  note?: string
}

export interface Progress {
  /** Map id and version, e.g. "fde@0.1.0". */
  map: string
  active_project?: Id
  milestones?: Milestone[]
  nodes: Record<Id, NodeProgress>
  sessions?: Session[]
}
