import type { KeyboardEvent } from 'react'
import type { GroundworkMap, Id } from '../map/types'
import type { Level } from '../progress/levels'
import { NodeButton } from './NodeButton'

interface ListViewProps {
  map: GroundworkMap
  levels: Map<Id, Level>
  needsReview: Set<Id>
  selectedId: Id | null
  onSelect: (id: Id) => void
}

/**
 * The map as a list: every node by layer, with its level, review badge and
 * prerequisites. Tab or the arrow keys move between nodes (Home and End jump
 * to the ends); Enter opens the panel.
 */
export function ListView({
  map,
  levels,
  needsReview,
  selectedId,
  onSelect,
}: ListViewProps) {
  const titleOf = (id: Id) => map.nodes.find((n) => n.id === id)?.title ?? id

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const buttons = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '.node-button',
      ),
    ]
    const current = buttons.indexOf(event.target as HTMLButtonElement)
    if (current === -1) return
    const next = {
      ArrowDown: current + 1,
      ArrowUp: current - 1,
      Home: 0,
      End: buttons.length - 1,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    buttons[Math.max(0, Math.min(buttons.length - 1, next))].focus()
  }

  return (
    <section
      className="view list-view"
      aria-labelledby="list-heading"
      onKeyDown={onKeyDown}
    >
      <h2 id="list-heading">List</h2>
      <p className="hint">
        Every topic, by layer. Use Tab or the arrow keys to move, Enter to open.
      </p>
      {map.layers.map((layer) => (
        <section key={layer.id} aria-labelledby={`layer-${layer.id}`}>
          <h3 id={`layer-${layer.id}`}>{layer.title}</h3>
          <ul className="node-list">
            {map.nodes
              .filter((n) => n.layer === layer.id)
              .map((node) => (
                <li key={node.id}>
                  <NodeButton
                    node={node}
                    level={levels.get(node.id) ?? 'locked'}
                    needsReview={needsReview.has(node.id)}
                    selected={node.id === selectedId}
                    onSelect={onSelect}
                  />
                  <span className="reason">
                    {node.requires && node.requires.length > 0
                      ? `Requires ${node.requires.map((id) => `${id} ${titleOf(id)}`).join(', ')}`
                      : 'No prerequisites'}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </section>
  )
}
