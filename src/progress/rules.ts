// Level rules: pure functions over one node's progress. Each `whyNot*`
// returns null when a change is allowed, or a reason the UI can show.
// Each transition throws if its `whyNot*` would refuse, so the UI can't
// skip a rule by accident.

import type { Levels } from '../graph/graph'
import type { Id, MapNode } from '../map/types'
import type { Level } from './levels'
import type { Evidence, NodeProgress } from './types'

/** Days to the next review: after Working, after the first review, then every review after. */
export const REVIEW_INTERVALS = [7, 21, 60] as const

// ---------------------------------------------------------------- dates

/** Add calendar days to an ISO date (YYYY-MM-DD). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** A local calendar date as YYYY-MM-DD. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ---------------------------------------------------------------- checks

export function whyNotStart(level: Level): string | null {
  if (level === 'ready') return null
  if (level === 'locked') return 'Finish its prerequisites first.'
  return 'Already started.'
}

export function whyNotWorking(
  node: MapNode,
  p: NodeProgress | undefined,
): string | null {
  if (p?.level !== 'learning') {
    return 'Only a node in Learning can move to Working.'
  }
  const done = p.objectives_done.length
  const total = node.objectives.length
  if (done < total) return `Check every objective (${done} of ${total} done).`
  if (p.evidence.length === 0) return 'Add at least one piece of evidence.'
  return null
}

export function whyNotTestOut(
  level: Level,
  evidence: Evidence | undefined,
): string | null {
  if (level !== 'ready') return 'Test out is only possible from Ready.'
  if (!evidence) return 'Add evidence that you can already do this.'
  return null
}

export function whyNotDeep(p: NodeProgress | undefined): string | null {
  if (p?.level !== 'working') return 'Reach Working first.'
  if (!p.evidence.some((e) => e.type === 'strong_when')) {
    return 'Add evidence that you passed the strong-when test.'
  }
  return null
}

/** A review is due on or after `next_review`. Only Working and Deep have reviews. */
export function isReviewDue(
  p: NodeProgress | undefined,
  today: string,
): boolean {
  return (
    (p?.level === 'working' || p?.level === 'deep') &&
    p.next_review !== undefined &&
    today >= p.next_review
  )
}

// ---------------------------------------------------------------- transitions

export function startLearning(level: Level, today: string): NodeProgress {
  refuse(whyNotStart(level))
  return {
    level: 'learning',
    objectives_done: [],
    evidence: [],
    started: today,
  }
}

/** Check or uncheck one objective. Never changes the level. */
export function toggleObjective(
  node: MapNode,
  p: NodeProgress,
  index: number,
): NodeProgress {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= node.objectives.length
  ) {
    throw new Error(`Node ${node.id} has no objective ${index}.`)
  }
  const done = p.objectives_done.includes(index)
    ? p.objectives_done.filter((i) => i !== index)
    : [...p.objectives_done, index].sort((a, b) => a - b)
  return { ...p, objectives_done: done }
}

export function addEvidence(p: NodeProgress, evidence: Evidence): NodeProgress {
  return { ...p, evidence: [...p.evidence, evidence] }
}

export function markWorking(
  node: MapNode,
  p: NodeProgress,
  today: string,
): NodeProgress {
  refuse(whyNotWorking(node, p))
  return reachWorking(p, today)
}

/** From Ready straight to Working: every objective is marked done. */
export function testOut(
  node: MapNode,
  level: Level,
  evidence: Evidence,
  today: string,
): NodeProgress {
  refuse(whyNotTestOut(level, evidence))
  return reachWorking(
    {
      level: 'learning',
      objectives_done: node.objectives.map((_, i) => i),
      evidence: [evidence],
      started: today,
    },
    today,
  )
}

export function markDeep(p: NodeProgress): NodeProgress {
  refuse(whyNotDeep(p))
  return { ...p, level: 'deep' }
}

export function completeReview(p: NodeProgress, today: string): NodeProgress {
  const reviews = (p.reviews_done ?? 0) + 1
  const days = REVIEW_INTERVALS[Math.min(reviews, REVIEW_INTERVALS.length - 1)]
  return { ...p, reviews_done: reviews, next_review: addDays(today, days) }
}

/** Stored progress reduced to the levels the graph functions need. */
export function levelsOf(nodes: Record<Id, NodeProgress>): Levels {
  return Object.fromEntries(
    Object.entries(nodes).map(([id, p]) => [id, p.level]),
  )
}

// ---------------------------------------------------------------- helpers

function reachWorking(p: NodeProgress, today: string): NodeProgress {
  return {
    ...p,
    level: 'working',
    reached_working: today,
    next_review: addDays(today, REVIEW_INTERVALS[0]),
    reviews_done: 0,
  }
}

function refuse(reason: string | null): void {
  if (reason !== null) throw new Error(reason)
}
