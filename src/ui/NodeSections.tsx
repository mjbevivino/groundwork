// The parts of a topic that both the side panel and the lesson view show.
// Every control goes through the rules in progress/rules.ts.

import { useId } from 'react'
import type { GroundworkMap, Id, MapNode, Resource } from '../map/types'
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

interface SectionProps {
  node: MapNode
  level: Level
  progress: NodeProgress | undefined
  today: string
  onChange: (next: NodeProgress) => void
}

/** Level buttons, disabled with the reason shown when the rules say no. */
export function LevelSection({
  map,
  node,
  level,
  progress: p,
  today,
  onChange,
  levels,
}: SectionProps & { map: GroundworkMap; levels: Map<Id, Level> }) {
  const reached = level === 'working' || level === 'deep'
  const reviewDue = isReviewDue(p, today)
  const titleOf = (id: Id) => map.nodes.find((n) => n.id === id)?.title ?? id
  const unmet = (node.requires ?? []).filter((id) => {
    const l = levels.get(id)
    return l !== 'working' && l !== 'deep'
  })

  return (
    <section aria-label="Level">
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
    </section>
  )
}

export function ObjectivesSection({
  node,
  progress: p,
  onChange,
}: Pick<SectionProps, 'node' | 'progress' | 'onChange'>) {
  return (
    <section aria-label="Objectives">
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
    </section>
  )
}

/** Evidence so far, a form to add more, and the test-out form on Ready topics. */
export function EvidenceSection({
  node,
  level,
  progress: p,
  today,
  onChange,
}: SectionProps) {
  return (
    <section aria-label="Evidence">
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
    </section>
  )
}

/** Resources as a plain list, or as link cards for the lesson view. */
export function Resources({
  resources,
  cards = false,
}: {
  resources: Resource[] | undefined
  cards?: boolean
}) {
  if (!resources || resources.length === 0) return null
  return (
    <section aria-label="Resources">
      <h3>Resources</h3>
      <ul className={cards ? 'resource-cards' : undefined}>
        {resources.map((r) => (
          <li key={r.title} className={cards ? 'resource-card' : undefined}>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.title}
              </a>
            ) : (
              <span className="resource-title">{r.title}</span>
            )}{' '}
            <span className="hint">
              {cards ? '' : '('}
              {r.kind}
              {r.free && ', free'}
              {cards ? '' : ')'}
            </span>
            {r.note && <div className="hint">{r.note}</div>}
          </li>
        ))}
      </ul>
    </section>
  )
}

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
