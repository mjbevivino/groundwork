import { describe, expect, it } from 'vitest'
import type { MapNode } from '../map/types'
import {
  addDays,
  addEvidence,
  completeReview,
  isReviewDue,
  levelsOf,
  markDeep,
  markWorking,
  startLearning,
  testOut,
  toggleObjective,
  whyNotDeep,
  whyNotStart,
  whyNotTestOut,
  whyNotWorking,
} from './rules'
import type { Evidence, NodeProgress } from './types'

const node: MapNode = {
  id: 'P1',
  title: 'Computer fluency',
  layer: 'P',
  depth: 'working',
  why: 'Test.',
  objectives: ['One', 'Two', 'Three'],
  strong_when: 'You can do it unaided.',
}

const TODAY = '2026-10-01'
const work: Evidence = {
  type: 'objective',
  url: 'https://x.dev',
  note: 'Built it',
  date: TODAY,
}
const strong: Evidence = {
  type: 'strong_when',
  note: 'Passed the test',
  date: TODAY,
}

function learning(overrides: Partial<NodeProgress> = {}): NodeProgress {
  return {
    level: 'learning',
    objectives_done: [],
    evidence: [],
    started: TODAY,
    ...overrides,
  }
}

/** A node at working, reached today. */
function working(): NodeProgress {
  return markWorking(
    node,
    learning({ objectives_done: [0, 1, 2], evidence: [work] }),
    TODAY,
  )
}

describe('addDays', () => {
  it('adds calendar days across month and year ends', () => {
    expect(addDays('2026-10-01', 7)).toBe('2026-10-08')
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
  })
})

describe('starting', () => {
  it('starts learning only from ready', () => {
    expect(whyNotStart('ready')).toBeNull()
    expect(whyNotStart('locked')).toMatch(/prerequisites/)
    expect(whyNotStart('learning')).toMatch(/already started/i)
    expect(startLearning('ready', TODAY)).toEqual(learning())
    expect(() => startLearning('locked', TODAY)).toThrow()
  })
})

describe('objectives and evidence', () => {
  it('toggles an objective on and off, keeping indexes sorted', () => {
    const p = toggleObjective(node, toggleObjective(node, learning(), 2), 0)
    expect(p.objectives_done).toEqual([0, 2])
    expect(toggleObjective(node, p, 2).objectives_done).toEqual([0])
  })

  it('rejects an objective index the node does not have', () => {
    expect(() => toggleObjective(node, learning(), 3)).toThrow()
  })

  it('appends evidence without changing the level', () => {
    const p = addEvidence(learning(), work)
    expect(p.evidence).toEqual([work])
    expect(p.level).toBe('learning')
  })
})

describe('Working', () => {
  it('is not allowed without every objective checked', () => {
    const p = learning({ objectives_done: [0, 1], evidence: [work] })
    expect(whyNotWorking(node, p)).toMatch(/2 of 3/)
    expect(() => markWorking(node, p, TODAY)).toThrow()
  })

  it('is not allowed without evidence', () => {
    const p = learning({ objectives_done: [0, 1, 2] })
    expect(whyNotWorking(node, p)).toMatch(/evidence/)
    expect(() => markWorking(node, p, TODAY)).toThrow()
  })

  it('is not allowed from ready, locked or a higher level', () => {
    expect(whyNotWorking(node, undefined)).toMatch(/Learning/)
    expect(whyNotWorking(node, working())).toMatch(/Learning/)
  })

  it('with all objectives and evidence, sets working and a review 7 days out', () => {
    const p = learning({ objectives_done: [0, 1, 2], evidence: [work] })
    expect(whyNotWorking(node, p)).toBeNull()
    expect(markWorking(node, p, TODAY)).toEqual({
      ...p,
      level: 'working',
      reached_working: TODAY,
      next_review: '2026-10-08',
      reviews_done: 0,
    })
  })
})

describe('test out', () => {
  it('is allowed only from ready', () => {
    expect(whyNotTestOut('ready', work)).toBeNull()
    for (const level of ['locked', 'learning', 'working', 'deep'] as const) {
      expect(whyNotTestOut(level, work)).toMatch(/Ready/)
      expect(() => testOut(node, level, work, TODAY)).toThrow()
    }
  })

  it('needs evidence', () => {
    expect(whyNotTestOut('ready', undefined)).toMatch(/evidence/)
  })

  it('jumps to working with every objective done and the evidence kept', () => {
    expect(testOut(node, 'ready', work, TODAY)).toEqual({
      level: 'working',
      objectives_done: [0, 1, 2],
      evidence: [work],
      started: TODAY,
      reached_working: TODAY,
      next_review: '2026-10-08',
      reviews_done: 0,
    })
  })
})

describe('Deep', () => {
  it('needs strong_when evidence; objective evidence is not enough', () => {
    const p = working()
    expect(whyNotDeep(p)).toMatch(/strong-when/)
    expect(() => markDeep(p)).toThrow()
    const withStrong = addEvidence(p, strong)
    expect(whyNotDeep(withStrong)).toBeNull()
    expect(markDeep(withStrong).level).toBe('deep')
  })

  it('needs Working first, even with strong_when evidence', () => {
    const p = learning({ evidence: [strong] })
    expect(whyNotDeep(p)).toMatch(/Working/)
    expect(whyNotDeep(undefined)).toMatch(/Working/)
  })
})

describe('reviews', () => {
  it('is due on or after next_review, never before', () => {
    const p = working() // next_review 2026-10-08
    expect(isReviewDue(p, '2026-10-07')).toBe(false)
    expect(isReviewDue(p, '2026-10-08')).toBe(true)
    expect(isReviewDue(p, '2026-11-30')).toBe(true)
    expect(isReviewDue(learning(), '2027-01-01')).toBe(false)
  })

  it('extends to 21 days, then 60, then stays at 60', () => {
    const r1 = completeReview(working(), '2026-10-08')
    expect(r1).toMatchObject({ next_review: '2026-10-29', reviews_done: 1 })
    const r2 = completeReview(r1, '2026-10-29')
    expect(r2).toMatchObject({ next_review: '2026-12-28', reviews_done: 2 })
    const r3 = completeReview(r2, '2026-12-28')
    expect(r3).toMatchObject({ next_review: '2027-02-26', reviews_done: 3 })
  })

  it('never demotes: an overdue review or an unchecked objective keeps the level', () => {
    const p = working()
    expect(isReviewDue(p, '2027-06-01')).toBe(true)
    expect(p.level).toBe('working')
    expect(toggleObjective(node, p, 0).level).toBe('working')
  })
})

describe('levelsOf', () => {
  it('reduces stored progress to levels for the graph', () => {
    expect(levelsOf({ P1: working(), P2: learning() })).toEqual({
      P1: 'working',
      P2: 'learning',
    })
  })
})
