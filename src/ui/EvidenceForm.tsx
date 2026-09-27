import { useId, useState, type FormEvent } from 'react'
import type { Evidence, EvidenceType } from '../progress/types'

interface EvidenceFormProps {
  today: string
  submitLabel: string
  onSubmit: (evidence: Evidence) => void
}

/** Collects one evidence item: what kind, an optional link and a note. */
export function EvidenceForm({
  today,
  submitLabel,
  onSubmit,
}: EvidenceFormProps) {
  const id = useId()
  const [type, setType] = useState<EvidenceType>('objective')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = url.trim()
    onSubmit({
      type,
      ...(trimmed && { url: trimmed }),
      note: note.trim(),
      date: today,
    })
    setUrl('')
    setNote('')
  }

  return (
    <form className="evidence-form" onSubmit={submit}>
      <label htmlFor={`${id}-type`}>Kind</label>
      <select
        id={`${id}-type`}
        value={type}
        onChange={(e) => setType(e.target.value as EvidenceType)}
      >
        <option value="objective">Work that shows the objectives</option>
        <option value="strong_when">Passed the strong-when test</option>
      </select>
      <label htmlFor={`${id}-url`}>Link (optional)</label>
      <input
        id={`${id}-url`}
        type="url"
        placeholder="https://github.com/…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <label htmlFor={`${id}-note`}>Note</label>
      <input
        id={`${id}-note`}
        required
        placeholder="What you built or showed"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button type="submit" disabled={note.trim() === ''}>
        {submitLabel}
      </button>
    </form>
  )
}
