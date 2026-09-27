import { useEffect } from 'react'
import type { GroundworkMap, Id, MapNode } from '../map/types'
import type { Level } from '../progress/levels'
import { levelStyle } from './levelStyle'

interface NodePanelProps {
  map: GroundworkMap
  node: MapNode
  levels: Map<Id, Level>
  onClose: () => void
}

/** Details for one node. Read-only in M3; M4 adds progress controls. */
export function NodePanel({ map, node, levels, onClose }: NodePanelProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const level = levelStyle[levels.get(node.id) ?? 'locked']
  const titleOf = (id: Id) => map.nodes.find((n) => n.id === id)?.title ?? id

  return (
    <aside className="node-panel" aria-label={`${node.id} ${node.title}`}>
      <div className="panel-top">
        <span>
          {node.id} · <span aria-hidden="true">{level.icon}</span> {level.label}
          {node.est_hours !== undefined && ` · about ${node.est_hours} h`}
        </span>
        <button type="button" className="panel-close" onClick={onClose}>
          Close
        </button>
      </div>
      <h2>{node.title}</h2>
      <p>{node.why}</p>

      <h3>Objectives</h3>
      <ul>
        {node.objectives.map((objective) => (
          <li key={objective}>{objective}</li>
        ))}
      </ul>

      <h3>Strong when</h3>
      <p>{node.strong_when}</p>

      {node.requires && node.requires.length > 0 && (
        <>
          <h3>Requires</h3>
          <ul>
            {node.requires.map((id) => {
              const req = levelStyle[levels.get(id) ?? 'locked']
              return (
                <li key={id}>
                  {id} {titleOf(id)} ({req.label})
                </li>
              )
            })}
          </ul>
        </>
      )}

      {node.resources && node.resources.length > 0 && (
        <>
          <h3>Resources</h3>
          <ul>
            {node.resources.map((r) => (
              <li key={r.title}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                ) : (
                  r.title
                )}{' '}
                ({r.kind})
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
