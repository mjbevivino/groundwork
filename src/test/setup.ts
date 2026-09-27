import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest globals are off, so Testing Library can't register its own cleanup.
// Unmount rendered components after every test so tests don't see each other.
afterEach(() => {
  cleanup()
})
