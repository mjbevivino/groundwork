import { useEffect, useId } from 'react'
import type { GroundworkMap, Id, MapNode } from '../map/types'
import type { Level } from '../progress/levels'
import {
  addEvidence,
  completeReview,
  isReviewDue,
  markDeep,
  markWorking,
  startLearning,
  testOut,
  toggleObjective,
  whyNotDeep,
  whyNotStart,
  whyNotWorking,
} from '../progress/rules'
import type { NodeProgress } from '../progress/types'
import { EvidenceForm } from './EvidenceForm'
import { levelStyle } from './levelStyle'

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
  const unmet = (node.requires ?? []).filter((id) => {
    const l = levels.get(id)
    return l !== 'working' && l !== 'deep'
  })
  const reached = level === 'working' || level === 'deep'

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
      <h2>{node.title}</h2>
      <p>{node.why}</p>

      <h3>Level</h3>
      {level === 'locked' && (
        <p className="hint">
          Locked until these reach Working: {unmet.map(titleOf).join(', ')}.
        </p>
      )}
      <div className="actions">
        {(level === 'locked' || level === 'ready') && (
          <Action
            label="Start learning"
            reason={whyNotStart(level)}
            onClick={() => onChange(startLearning(level, today))}
          />
        )}
        {!reached && (
          <Action
            label="Mark Working"
            reason={whyNotWorking(node, p)}
            onClick={() => onChange(markWorking(node, p!, today))}
          />
        )}
        {level !== 'deep' && (
          <Action
            label="Mark Deep"
            reason={whyNotDeep(p)}
            onClick={() => onChange(markDeep(p!))}
          />
        )}
        {reached && p && (
          <Action
            label="Complete review"
            reason={reviewDue ? null : `Next review is due ${p.next_review}.`}
            onClick={() => onChange(completeReview(p, today))}
          />
        )}
      </div>

      <h3>Objectives</h3>
      {!p && <p className="hint">Start learning to check objectives off.</p>}
      <ul className="checklist">
        {node.objectives.map((objective, i) => (
          <li key={i}>
            <label>
              <input
                type="checkbox"
                checked={p?.objectives_done.includes(i) ?? false}
                disabled={!p}
                onChange={() => onChange(toggleObjective(node, p!, i))}
              />{' '}
              {objective}
            </label>
          </li>
        ))}
      </ul>

      <h3>Strong when</h3>
      <p>{node.strong_when}</p>

      <h3>Evidence</h3>
      {p && p.evidence.length > 0 ? (
        <ul>
          {p.evidence.map((e, i) => (
            <li key={i}>
              {e.type === 'strong_when' ? 'Strong-when test: ' : ''}
              {e.url ? (
                <a href={e.url} target="_blank" rel="noreferrer">
                  {e.note}
                </a>
              ) : (
                e.note
              )}{' '}
              <span className="hint">({e.date})</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">No evidence yet.</p>
      )}
      {p && (
        <EvidenceForm
          today={today}
          submitLabel="Add evidence"
          onSubmit={(e) => onChange(addEvidence(p, e))}
        />
      )}
      {level === 'ready' && (
        <>
          <h3>Test out</h3>
          <p className="hint">
            Already know this? Add evidence and go straight to Working. Every
            objective is marked done.
          </p>
          <EvidenceForm
            today={today}
            submitLabel="Test out to Working"
            onSubmit={(e) => onChange(testOut(node, level, e, today))}
          />
        </>
      )}

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
                <span className="hint">
                  ({r.kind}
                  {r.free && ', free'})
                </span>
                {r.note && <div className="hint">{r.note}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}

/** A level button that is disabled, with the reason shown, when the rules say no. */
function Action({
  label,
  reason,
  onClick,
}: {
  label: string
  reason: string | null
  onClick: () => void
}) {
  const reasonId = useId()
  return (
    <div className="action">
      <button
        type="button"
        disabled={reason !== null}
        aria-describedby={reason ? reasonId : undefined}
        onClick={onClick}
      >
        {label}
      </button>
      {reason && (
        <span id={reasonId} className="hint">
          {reason}
        </span>
      )}
    </div>
  )
}
