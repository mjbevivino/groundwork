import { useRef, type ChangeEvent } from 'react'
import type { GroundworkMap } from '../map/types'
import {
  exportFileName,
  exportProgress,
  importProgress,
} from '../progress/transfer'
import type { Progress } from '../progress/types'

interface ProgressFileButtonsProps {
  map: GroundworkMap
  progress: Progress
  today: string
  onImport: (progress: Progress) => void
  onErrors: (errors: string[]) => void
}

/** Export progress to a JSON file, or replace it from one. */
export function ProgressFileButtons({
  map,
  progress,
  today,
  onImport,
  onErrors,
}: ProgressFileButtonsProps) {
  const fileInput = useRef<HTMLInputElement>(null)

  function download() {
    const blob = new Blob([exportProgress(progress)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = exportFileName(map, today)
    link.click()
    URL.revokeObjectURL(url)
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // lets the same file be chosen again
    if (!file) return
    const result = importProgress(await file.text(), map)
    if (!result.ok) {
      onErrors(result.errors)
    } else if (
      window.confirm('Replace your current progress with this file?')
    ) {
      onImport(result.progress)
    }
  }

  return (
    <div className="file-buttons">
      <button type="button" onClick={download}>
        Export progress
      </button>
      <button type="button" onClick={() => fileInput.current?.click()}>
        Import progress
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Progress file to import"
        onChange={upload}
      />
    </div>
  )
}
