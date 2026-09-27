import type { GroundworkMap, Id } from '../map/types'
import type { Level } from '../progress/levels'
import type { Suggestion } from '../rank/nextUp'
import { NodeButton } from './NodeButton'

interface NextUpViewProps {
  map: GroundworkMap
  suggestions: Suggestion[]
  levels: Map<Id, Level>
  activeProject: Id | undefined
  selectedId: Id | null
  onSelect: (id: Id) => void
  onPickProject: () => void
}

export function NextUpView({
  map,
  suggestions,
  levels,
  activeProject,
  selectedId,
  onSelect,
  onPickProject,
}: NextUpViewProps) {
  const project = map.projects?.find((p) => p.id === activeProject)
  return (
    <section className="view" aria-labelledby="next-up-heading">
      <h2 id="next-up-heading">Next up</h2>
      <p className="hint">
        {project ? (
          <>Active project: {project.title}. Its path comes first.</>
        ) : (
          <>
            No active project.{' '}
            <button type="button" className="link" onClick={onPickProject}>
              Pick one
            </button>{' '}
            to put its path first.
          </>
        )}
      </p>
      {suggestions.length === 0 ? (
        <p>Nothing is ready right now. Finish something in progress first.</p>
      ) : (
        <ol className="next-up">
          {suggestions.map((s) => {
            const node = map.nodes.find((n) => n.id === s.id)!
            return (
              <li key={s.id}>
                <NodeButton
                  node={node}
                  level={levels.get(s.id) ?? 'locked'}
                  selected={s.id === selectedId}
                  onSelect={onSelect}
                />
                <span className="reason">{s.reason}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
