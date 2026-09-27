import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest globals are off, so Testing Library can't register its own cleanup.
// Unmount rendered components after every test so tests don't see each other.
afterEach(() => {
  cleanup()
})

// jsdom has no layout engine. React Flow measures nodes with ResizeObserver
// and offsetWidth/Height, and reads zoom from DOMMatrixReadOnly; these
// stand-ins let it render in tests (as React Flow's testing guide suggests).
class ResizeObserverStub {
  private callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe(target: Element) {
    const { offsetWidth: width, offsetHeight: height } = target as HTMLElement
    const contentRect = { x: 0, y: 0, width, height } as DOMRectReadOnly
    this.callback(
      [{ target, contentRect } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    )
  }
  unobserve() {}
  disconnect() {}
}

class DOMMatrixReadOnlyStub {
  m22: number
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([\d.]+)\)/)?.[1]
    this.m22 = scale === undefined ? 1 : Number(scale)
  }
}

globalThis.ResizeObserver ??= ResizeObserverStub
globalThis.DOMMatrixReadOnly ??=
  DOMMatrixReadOnlyStub as unknown as typeof DOMMatrixReadOnly

Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: {
    get(this: HTMLElement) {
      return parseFloat(this.style.height) || 1
    },
  },
  offsetWidth: {
    get(this: HTMLElement) {
      return parseFloat(this.style.width) || 1
    },
  },
})
