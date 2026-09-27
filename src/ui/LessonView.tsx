import { useEffect, useRef, useState } from 'react'
import type { GroundworkMap, Id, MapNode } from '../map/types'
import type { Level } from '../progress/levels'
import { isReviewDue, startLearning, whyNotStart } from '../progress/rules'
import type { NodeProgress } from '../progress/types'
import { locate, neighbors, nextToStudy, type Unit } from '../rank/path'
import {
  EvidenceSection,
  LevelSection,
  ObjectivesSection,
  Resources,
} from './NodeSections'
import { LevelBadge } from './PathView'

interface LessonViewProps {
  map: GroundworkMap
  node: MapNode
  levels: Map<Id, Level>
  progress: NodeProgress | undefined
  today: string
  /** The study order this lesson walks, and its units (for the breadcrumb). */
  order: Id[]
  units: Unit[]
  onChange: (next: NodeProgress) => void
  onOpen: (id: Id) => void
  onBack: () => void
}

/** One topic as a full, readable page. Previous and Next walk the study order. */
export function LessonView({
  map,
  node,
  levels,
  progress: p,
  today,
  order,
  units,
  onChange,
  onOpen,
  onBack,
}: LessonViewProps) {
  const level = levels.get(node.id) ?? 'locked'
  const { prev, next } = neighbors(order, node.id)
  const place = locate(units, node.id)
  const titleOf = (id: Id) => map.nodes.find((n) => n.id === id)?.title ?? id
  // Set when a change in this lesson takes the topic to Working.
  const [reachedWorking, setReachedWorking] = useState(false)
  const offer = reachedWorking ? nextToStudy(order, node.id, levels) : undefined

  function change(nextProgress: NodeProgress) {
    if (nextProgress.level === 'working' && p?.level !== 'working') {
      setReachedWorking(true)
    }
    onChange(nextProgress)
  }

  // Land on the title, so screen readers announce the new lesson.
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  // ← and → walk the study order, unless you're typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return
      }
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable]')) return
      if (event.key === 'ArrowLeft' && prev) onOpen(prev)
      if (event.key === 'ArrowRight' && next) onOpen(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, onOpen])

  return (
    <article className="view lesson" aria-labelledby="lesson-title">
      <div className="reading">
        <div className="lesson-top">
          <button type="button" className="link" onClick={onBack}>
            ← Path
          </button>
          {place && (
            <span className="breadcrumb">
              Unit {place.unit.number} · {place.unit.layer.title} · Topic{' '}
              {place.position} of {place.unit.topics.length}
            </span>
          )}
        </div>

        {reachedWorking && (
          <div className="offer" role="status">
            <span>
              ✓ {node.title} is at Working.
              {offer
                ? ` Next on your path: ${offer} ${titleOf(offer)}.`
                : ' That was the last open topic on this path.'}
            </span>
            {offer && (
              <button
                type="button"
                className="primary"
                onClick={() => onOpen(offer)}
              >
                Go to {offer} →
              </button>
            )}
          </div>
        )}

        <header className="lesson-header">
          <div className="hint">
            {node.id} · <LevelBadge level={level} />
            {isReviewDue(p, today) && (
              <span className="badge review">↻ Needs review</span>
            )}
            {node.est_hours !== undefined && ` · about ${node.est_hours} h`}
          </div>
          <h2 id="lesson-title" ref={heading} tabIndex={-1}>
            {node.title}
          </h2>
          {level === 'ready' && (
            <button
              type="button"
              className="primary"
              disabled={whyNotStart(level) !== null}
              onClick={() => change(startLearning(level, today))}
            >
              Start learning
            </button>
          )}
        </header>

        <section aria-label="Why it matters">
          <h3>Why it matters</h3>
          <p>{node.why}</p>
        </section>

        <ObjectivesSection node={node} progress={p} onChange={change} />
        <Resources resources={node.resources} cards />

        <section aria-label="Strong when" className="strong-when">
          <h3>The strong-when test</h3>
          <p>{node.strong_when}</p>
        </section>

        <EvidenceSection
          node={node}
          level={level}
          progress={p}
          today={today}
          onChange={change}
        />
        <LevelSection
          map={map}
          node={node}
          level={level}
          levels={levels}
          progress={p}
          today={today}
          onChange={change}
        />

        <nav className="lesson-nav" aria-label="Previous and next topic">
          {prev ? (
            <button type="button" onClick={() => onOpen(prev)}>
              ← Previous: {titleOf(prev)}
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button type="button" onClick={() => onOpen(next)}>
              Next: {titleOf(next)} →
            </button>
          )}
        </nav>
      </div>
    </article>
  )
}
