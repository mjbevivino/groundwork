import { useState } from 'react'
import type { GroundworkMap, Id } from '../map/types'
import type { Level } from '../progress/levels'
import {
  currentUnit,
  unmetPrerequisites,
  type ScopeSummary,
  type Unit,
} from '../rank/path'
import { levelStyle } from './levelStyle'

export interface ContinueTarget {
  id: Id
  reason: string
  /** True when this is the last topic you opened. */
  resume: boolean
}

interface PathViewProps {
  map: GroundworkMap
  levels: Map<Id, Level>
  scopeKind: 'project' | 'all'
  activeProject: Id | undefined
  units: Unit[]
  summary: ScopeSummary
  continueTarget: ContinueTarget | undefined
  onScope: (kind: 'project' | 'all') => void
  onOpen: (id: Id) => void
  onPickProject: () => void
}

/** The guided path: what to do next, then each unit's topics in study order. */
export function PathView({
  map,
  levels,
  scopeKind,
  activeProject,
  units,
  summary,
  continueTarget,
  onScope,
  onOpen,
  onPickProject,
}: PathViewProps) {
  const project = map.projects?.find((p) => p.id === activeProject)
  const current = currentUnit(units)
  const [open, setOpen] = useState(
    () => new Set(current ? [current.layer.id] : []),
  )
  const nodeById = new Map(map.nodes.map((n) => [n.id, n]))
  const titleOf = (id: Id) => nodeById.get(id)?.title ?? id

  function toggle(layerId: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(layerId)) next.delete(layerId)
      else next.add(layerId)
      return next
    })
  }

  return (
    <section className="view path" aria-labelledby="path-heading">
      <div className="reading">
        <h2 id="path-heading">Path</h2>

        {continueTarget && (
          <div className="continue-bar" role="region" aria-label="Continue">
            <div>
              <div className="eyebrow">
                {continueTarget.resume ? 'Continue' : 'Start here'}
              </div>
              <div className="continue-title">
                <span className="hint">{continueTarget.id}</span>{' '}
                {titleOf(continueTarget.id)}{' '}
                <LevelBadge level={levels.get(continueTarget.id)} />
              </div>
              <div className="reason">{continueTarget.reason}</div>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => onOpen(continueTarget.id)}
            >
              {continueTarget.resume ? 'Continue' : 'Open'} →
            </button>
          </div>
        )}

        <div className="scope">
          <div className="segmented" role="group" aria-label="Scope">
            {project && (
              <button
                type="button"
                aria-pressed={scopeKind === 'project'}
                onClick={() => onScope('project')}
              >
                {project.title} path
              </button>
            )}
            <button
              type="button"
              aria-pressed={scopeKind === 'all'}
              onClick={() => onScope('all')}
            >
              Whole map
            </button>
          </div>
          <span className="scope-summary">
            <strong>
              {summary.done} of {summary.total}
            </strong>{' '}
            topics done · about {summary.hoursLeft} h left
          </span>
          {!project && (
            <button type="button" className="link" onClick={onPickProject}>
              Pick a project to focus the path
            </button>
          )}
        </div>

        {units.map((unit) => {
          const expanded = open.has(unit.layer.id)
          const panelId = `unit-${unit.layer.id}`
          return (
            <section key={unit.layer.id} className="unit">
              <h3>
                <button
                  type="button"
                  className="unit-header"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggle(unit.layer.id)}
                >
                  <span className="unit-caret" aria-hidden="true">
                    {expanded ? '▾' : '▸'}
                  </span>
                  <span className="unit-name">
                    Unit {unit.number} · {unit.layer.title}
                  </span>
                  <span className="meter" aria-hidden="true">
                    <span
                      style={{
                        width: `${(unit.done / unit.topics.length) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="unit-count">
                    {unit.done} of {unit.topics.length} done
                  </span>
                </button>
              </h3>
              {expanded && (
                <ol id={panelId} className="unit-topics">
                  {unit.topics.map((id) => {
                    const level = levels.get(id) ?? 'locked'
                    const needs = unmetPrerequisites(map, id, levels)
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className={`topic-row level-${level}`}
                          onClick={() => onOpen(id)}
                        >
                          <span className="topic-row-id">{id}</span>
                          <span className="topic-row-title">{titleOf(id)}</span>
                          <LevelBadge level={level} />
                        </button>
                        {level === 'locked' && needs.length > 0 && (
                          <span className="hint needs">
                            Needs{' '}
                            {needs.map((n) => `${n} ${titleOf(n)}`).join(', ')}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}

export function LevelBadge({ level = 'locked' }: { level?: Level }) {
  const style = levelStyle[level]
  return (
    <span className={`badge level-${level}`}>
      <span aria-hidden="true">{style.icon}</span> {style.label}
    </span>
  )
}
