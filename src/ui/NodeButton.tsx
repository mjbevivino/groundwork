import type { Id, MapNode } from '../map/types'
import type { Level } from '../progress/levels'
import { levelStyle } from './levelStyle'

interface NodeButtonProps {
  node: MapNode
  level: Level
  needsReview?: boolean
  selected?: boolean
  onSelect: (id: Id) => void
}

/** A node as one clickable line: id, title, and level as icon plus text. */
export function NodeButton({
  node,
  level,
  needsReview = false,
  selected = false,
  onSelect,
}: NodeButtonProps) {
  const style = levelStyle[level]
  return (
    <button
      type="button"
      className={`node-button level-${level}`}
      aria-pressed={selected}
      aria-label={`${node.id} ${node.title}, ${style.label}${needsReview ? ', needs review' : ''}`}
      onClick={() => onSelect(node.id)}
    >
      <span className="node-button-id">{node.id}</span>
      <span className="node-button-title">{node.title}</span>
      <span className="badge">
        <span aria-hidden="true">{style.icon}</span> {style.label}
      </span>
      {needsReview && <span className="badge review">↻ Needs review</span>}
    </button>
  )
}
