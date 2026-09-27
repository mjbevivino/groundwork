import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

// Node clicks use fireEvent.click: user-event also sends mousedown, which
// d3-zoom (inside React Flow) can't handle in jsdom.
describe('App', () => {
  it('renders the product name and no map problems', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Groundwork' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders all 46 nodes in 5 lanes, each level shown as text', () => {
    const { container } = render(<App />)
    expect(container.querySelectorAll('.topic')).toHaveLength(46)
    expect(container.querySelectorAll('.lane')).toHaveLength(5)
    for (const title of ['Prerequisites', 'Foundations', 'Field skills']) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.getAllByText('Ready')).toHaveLength(8)
    expect(screen.getAllByText('Locked')).toHaveLength(38)
  })

  it('opens the panel when a node is clicked, and closes it', async () => {
    const user = userEvent.setup()
    render(<App />)
    fireEvent.click(screen.getByText('Computer fluency'))

    const panel = screen.getByRole('complementary', {
      name: 'P1 Computer fluency',
    })
    expect(
      within(panel).getByRole('heading', { name: 'Computer fluency' }),
    ).toBeInTheDocument()
    expect(within(panel).getByText('Strong when')).toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('closes the panel with Escape', async () => {
    const user = userEvent.setup()
    render(<App />)
    fireEvent.click(screen.getByText('Programming basics'))
    expect(screen.getByRole('complementary')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})
