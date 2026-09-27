import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../progress/store'
import { renderApp, switchTab } from '../test/renderApp'

beforeEach(async () => {
  await db.progress.clear()
})

/** Start with Groundwork as the active project. */
async function withGroundwork() {
  await db.progress.put({
    mapId: 'fde',
    progress: { map: 'fde@0.1.0', active_project: 'groundwork', nodes: {} },
  })
}

const continueBar = () => screen.getByRole('region', { name: 'Continue' })
const unitHeader = (name: RegExp) =>
  screen.getByRole('button', { name, expanded: undefined })
const topicRows = () =>
  [...document.querySelectorAll('.topic-row-id')].map((el) => el.textContent)

describe('Path tab', () => {
  it('is the default tab, with the #1 Next up topic in the Continue bar', async () => {
    await renderApp()
    const tabs = screen.getByRole('navigation', { name: 'Views' })
    expect(within(tabs).getByRole('button', { name: 'Path' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(continueBar()).toHaveTextContent('Start here')
    expect(continueBar()).toHaveTextContent('Computer fluency')
    expect(continueBar()).toHaveTextContent('Leads to 28 later topics')
    // No active project: the whole map is the only scope.
    expect(screen.getByText(/topics done/)).toHaveTextContent(
      '0 of 46 topics done · about 1604 h left',
    )
  })

  it('with Groundwork active, shows exactly its 10 topics in 3 units', async () => {
    await withGroundwork()
    const { user } = await renderApp()
    expect(
      screen.getByRole('button', { name: 'Groundwork path' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/topics done/)).toHaveTextContent(
      '0 of 10 topics done · about 433 h left',
    )

    // The current unit starts open and the rest closed.
    expect(unitHeader(/Unit 1 · Prerequisites/)).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    await user.click(unitHeader(/Unit 2 · Foundations/))
    await user.click(unitHeader(/Unit 3 · Builder core/))
    expect(topicRows()).toEqual([
      'P1', 'P2', 'P3', 'P4', 'P5', '1.3', '2.2', '2.3', '2.5', '2.6',
    ]) // prettier-ignore

    // Whole map widens the scope.
    await user.click(screen.getByRole('button', { name: 'Whole map' }))
    expect(screen.getByText(/topics done/)).toHaveTextContent('0 of 46')
  })

  it('says what a locked topic needs', async () => {
    await renderApp()
    const p2 = screen.getByRole('button', { name: /P2\s*Programming basics/ })
    expect(p2.closest('li')).toHaveTextContent('Needs P1 Computer fluency')
  })
})

describe('Lesson view', () => {
  it('shows a breadcrumb and walks the study order with buttons and ← →', async () => {
    await withGroundwork()
    const { user } = await renderApp()
    await user.click(
      within(continueBar()).getByRole('button', { name: /Open/ }),
    )

    expect(
      screen.getByRole('heading', { level: 2, name: 'Computer fluency' }),
    ).toHaveFocus()
    expect(
      screen.getByText('Unit 1 · Prerequisites · Topic 1 of 5'),
    ).toBeInTheDocument()
    for (const heading of [
      'Why it matters',
      'Objectives',
      'Resources',
      'The strong-when test',
      'Evidence',
      'Level',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }

    await user.click(
      screen.getByRole('button', { name: 'Next: Programming basics →' }),
    )
    expect(
      screen.getByText('Unit 1 · Prerequisites · Topic 2 of 5'),
    ).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Algebra-level math' }),
    ).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Computer fluency' }),
    ).toBeInTheDocument()
  })

  it('marking Working updates the unit bar and the map, and offers the next topic', async () => {
    await withGroundwork()
    const { user, levelOf } = await renderApp()
    expect(unitHeader(/Unit 1 · Prerequisites/)).toHaveTextContent(
      '0 of 5 done',
    )
    await user.click(
      within(continueBar()).getByRole('button', { name: /Open/ }),
    )

    await user.type(screen.getByLabelText('Note'), 'Set up a machine by path')
    await user.click(
      screen.getByRole('button', { name: 'Test out to Working' }),
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Computer fluency is at Working. Next on your path: P2 Programming basics.',
    )
    await user.click(screen.getByRole('button', { name: 'Go to P2 →' }))
    expect(
      screen.getByRole('heading', { level: 2, name: 'Programming basics' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '← Path' }))
    expect(unitHeader(/Unit 1 · Prerequisites/)).toHaveTextContent(
      '1 of 5 done',
    )
    expect(screen.getByText(/topics done/)).toHaveTextContent('1 of 10')

    await switchTab(user, 'Map')
    expect(levelOf('P1')).toContain('Working')
    expect(levelOf('P2')).toContain('Ready')
  })

  it('remembers the last topic opened, so Continue returns to it after a reload', async () => {
    const { user, unmount } = await renderApp()
    await user.click(
      screen.getByRole('button', { name: /P3\s*Algebra-level math/ }),
    )
    await switchTab(user, 'Path') // back to the overview
    expect(continueBar()).toHaveTextContent('Continue')
    expect(continueBar()).toHaveTextContent('Algebra-level math')
    expect(continueBar()).toHaveTextContent('Pick up where you left off.')

    await waitFor(async () =>
      expect((await db.progress.get('fde'))?.progress.last_opened).toBe('P3'),
    )
    unmount()
    await renderApp()
    expect(continueBar()).toHaveTextContent('Algebra-level math')
  })
})
