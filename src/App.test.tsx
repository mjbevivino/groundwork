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

  it('takes P1 from Ready to Working and unlocks its dependents', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const levelOf = (id: string) =>
      container.querySelector(`[data-id="${id}"] .topic-level`)?.textContent

    expect(levelOf('P2')).toContain('Locked')
    fireEvent.click(screen.getByText('Computer fluency'))
    const panel = screen.getByRole('complementary')
    const button = (name: string) => within(panel).getByRole('button', { name })

    await user.click(button('Start learning'))
    expect(button('Mark Working')).toBeDisabled()
    expect(within(panel).getByText(/0 of 4 done/)).toBeInTheDocument()

    for (const box of within(panel).getAllByRole('checkbox')) {
      await user.click(box)
    }
    expect(button('Mark Working')).toBeDisabled()
    expect(
      within(panel).getByText(/Add at least one piece of evidence/),
    ).toBeInTheDocument()

    await user.type(
      within(panel).getByLabelText('Note'),
      'Installed tools by path',
    )
    await user.click(button('Add evidence'))
    await user.click(button('Mark Working'))

    expect(levelOf('P1')).toContain('Working')
    for (const id of ['P2', 'P4', 'P5', '1.5'])
      expect(levelOf(id)).toContain('Ready')
    expect(button('Mark Deep')).toBeDisabled()
    expect(
      within(panel).getByText(
        /Add evidence that you passed the strong-when test/,
      ),
    ).toBeInTheDocument()
  })

  it('tests out of a ready node straight to Working', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    fireEvent.click(screen.getByText('Algebra-level math'))
    const panel = screen.getByRole('complementary')

    await user.type(
      within(panel).getByLabelText('Note'),
      'Aced a practice exam',
    )
    await user.click(
      within(panel).getByRole('button', { name: 'Test out to Working' }),
    )

    for (const box of within(panel).getAllByRole('checkbox'))
      expect(box).toBeChecked()
    const levelOf = (id: string) =>
      container.querySelector(`[data-id="${id}"] .topic-level`)?.textContent
    expect(levelOf('P3')).toContain('Working')
    expect(levelOf('1.4')).toContain('Ready')
    expect(levelOf('3.1')).toContain('Ready')
  })

  it('explains why a locked node cannot start', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Programming basics'))
    const panel = screen.getByRole('complementary')
    expect(
      within(panel).getByRole('button', { name: 'Start learning' }),
    ).toBeDisabled()
    expect(
      within(panel).getByText(
        /Locked until these reach Working: Computer fluency/,
      ),
    ).toBeInTheDocument()
    for (const box of within(panel).getAllByRole('checkbox'))
      expect(box).toBeDisabled()
    expect(within(panel).queryByText('Test out')).not.toBeInTheDocument()
  })
})
