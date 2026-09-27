import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the product name', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Groundwork' }),
    ).toBeInTheDocument()
  })

  it('loads and validates the seed map', () => {
    render(<App />)
    expect(screen.getByText(/46 nodes in 5 layers/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
