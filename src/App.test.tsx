import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import exampleSource from '../progress.example.json?raw'
import { db } from './progress/store'
import { renderApp as renderMapTab } from './test/renderApp'

beforeEach(async () => {
  vi.restoreAllMocks()
  await db.progress.clear()
})

/** The app on the Map tab, once saved progress has loaded. */
const renderApp = () => renderMapTab('Map')

/** Open a node's panel. fireEvent.click, not user-event: user-event also
 * sends mousedown, which d3-zoom (inside React Flow) can't handle in jsdom. */
function openNode(title: string) {
  fireEvent.click(screen.getByText(title))
  return screen.getByRole('complementary')
}

async function savedLevel(id: string) {
  return (await db.progress.get('fde'))?.progress.nodes[id]?.level
}

describe('App: map and panel', () => {
  it('renders the product name and no map problems', async () => {
    await renderApp()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Groundwork' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders all 46 nodes in 5 lanes, each level shown as text', async () => {
    const { container } = await renderApp()
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
    await renderApp()
    const panel = openNode('Computer fluency')
    expect(panel).toHaveAccessibleName('P1 Computer fluency')
    expect(
      within(panel).getByRole('heading', { name: 'Computer fluency' }),
    ).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('closes the panel with Escape', async () => {
    const user = userEvent.setup()
    await renderApp()
    openNode('Programming basics')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('explains why a locked node cannot start', async () => {
    await renderApp()
    const panel = openNode('Programming basics')
    expect(
      within(panel).getByRole('button', { name: 'Start learning' }),
    ).toBeDisabled()
    expect(
      within(panel).getByText(
        /Locked until these reach Working: Computer fluency/,
      ),
    ).toBeInTheDocument()
    for (const box of within(panel).getAllByRole('checkbox')) {
      expect(box).toBeDisabled()
    }
    expect(within(panel).queryByText('Test out')).not.toBeInTheDocument()
  })
})

describe('App: progress', () => {
  it('takes P1 from Ready to Working, unlocks its dependents, and survives a reload', async () => {
    const user = userEvent.setup()
    const { levelOf, unmount } = await renderApp()
    expect(levelOf('P2')).toContain('Locked')

    const panel = openNode('Computer fluency')
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
    for (const id of ['P2', 'P4', 'P5', '1.5']) {
      expect(levelOf(id)).toContain('Ready')
    }
    expect(button('Mark Deep')).toBeDisabled()
    expect(
      within(panel).getByText(
        /Add evidence that you passed the strong-when test/,
      ),
    ).toBeInTheDocument()

    // Reload: wait for the save, unmount, and start the app again.
    await waitFor(async () => expect(await savedLevel('P1')).toBe('working'))
    unmount()
    const reloaded = await renderApp()
    expect(reloaded.levelOf('P1')).toContain('Working')
    expect(reloaded.levelOf('P2')).toContain('Ready')
  })

  it('tests out of a ready node straight to Working', async () => {
    const user = userEvent.setup()
    const { levelOf } = await renderApp()
    const panel = openNode('Algebra-level math')

    await user.type(
      within(panel).getByLabelText('Note'),
      'Aced a practice exam',
    )
    await user.click(
      within(panel).getByRole('button', { name: 'Test out to Working' }),
    )

    for (const box of within(panel).getAllByRole('checkbox')) {
      expect(box).toBeChecked()
    }
    expect(levelOf('P3')).toContain('Working')
    expect(levelOf('1.4')).toContain('Ready')
    expect(levelOf('3.1')).toContain('Ready')
  })

  it('imports a progress file after confirmation and saves it', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { levelOf } = await renderApp()

    const file = new File([exampleSource], 'progress.json', {
      type: 'application/json',
    })
    await user.upload(screen.getByLabelText('Progress file to import'), file)

    await waitFor(() => expect(levelOf('P1')).toContain('Working'))
    expect(levelOf('2.3')).toContain('Learning')
    await waitFor(async () => expect(await savedLevel('P5')).toBe('working'))
  })

  it('shows import errors and changes nothing', async () => {
    const user = userEvent.setup()
    const { levelOf } = await renderApp()
    const file = new File(['{"map":"other@1.0.0","nodes":{}}'], 'bad.json', {
      type: 'application/json',
    })
    await user.upload(screen.getByLabelText('Progress file to import'), file)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This progress is for map "other@1.0.0", not "fde".',
    )
    expect(levelOf('P1')).toContain('Ready')
  })
})
