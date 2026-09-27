import type { Level } from '../progress/levels'

/** How each level looks. Always shown as icon plus text, never color alone. */
export const levelStyle: Record<Level, { label: string; icon: string }> = {
  locked: { label: 'Locked', icon: '🔒' },
  ready: { label: 'Ready', icon: '○' },
  learning: { label: 'Learning', icon: '◐' },
  working: { label: 'Working', icon: '●' },
  deep: { label: 'Deep', icon: '★' },
}
