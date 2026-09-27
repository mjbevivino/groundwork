import { useEffect, useRef } from 'react'
import type { GroundworkMap, Id, MapNode } from '../map/types'
import type { Level } from '../progress/levels'
import { isReviewDue } from '../progress/rules'
import type { NodeProgress } from '../progress/types'
import { levelStyle } from './levelStyle'
import {
  EvidenceSection,
  LevelSection,
  ObjectivesSection,
  Resources,
} from './NodeSections'

interface NodePanelProps {
  map: GroundworkMap
  node: MapNode
  levels: Map<Id, Level>
  progress: NodeProgress | undefined
  today: string
  onChange: (next: NodeProgress) => void
  onClose: () => void
}

/** Everything about one node, and the controls to move it through the levels. */
export function NodePanel({
  map,
  node,
  levels,
  progress: p,
  today,
  onChange,
  onClose,
}: NodePanelProps) {
  // Move focus into the panel when it opens, and back where it was on close,
  // so keyboard users land on the details and return to their place.
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const previous = document.activeElement
    heading.current?.focus()
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus()
      }
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const level = levels.get(node.id) ?? 'locked'
  const style = levelStyle[level]
  const reviewDue = isReviewDue(p, today)
  const titleOf = (id: Id) => map.nodes.find((n) => n.id === id)?.title ?? id

  return (
    <aside className="node-panel" aria-label={`${node.id} ${node.title}`}>
      <div className="panel-top">
        <span>
          {node.id} ·{' '}
          <span className={`badge level-${level}`}>
            <span aria-hidden="true">{style.icon}</span> {style.label}
          </span>
          {reviewDue && <span className="badge review">↻ Needs review</span>}
          {node.est_hours !== undefined && ` · about ${node.est_hours} h`}
        </span>
        <button type="button" className="panel-close" onClick={onClose}>
          Close
        </button>
      </div>
      <h2 ref={heading} tabIndex={-1}>
        {node.title}
      </h2>
      <p>{node.why}</p>

      <LevelSection
        map={map}
        node={node}
        level={level}
        levels={levels}
        progress={p}
        today={today}
        onChange={onChange}
      />
      <ObjectivesSection node={node} progress={p} onChange={onChange} />

      <h3>Strong when</h3>
      <p>{node.strong_when}</p>

      <EvidenceSection
        node={node}
        level={level}
        progress={p}
        today={today}
        onChange={onChange}
      />

      {node.requires && node.requires.length > 0 && (
        <>
          <h3>Requires</h3>
          <ul>
            {node.requires.map((id) => (
              <li key={id}>
                {id} {titleOf(id)} (
                {levelStyle[levels.get(id) ?? 'locked'].label})
              </li>
            ))}
          </ul>
        </>
      )}

      <Resources resources={node.resources} />
    </aside>
  )
}
