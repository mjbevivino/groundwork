import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { db } from '../progress/store'

beforeEach(async () => {
  await db.progress.clear()
})

async function renderApp() {
  render(<App />)
  await screen.findByText('Computer fluency')
  return userEvent.setup()
}

const views = () => screen.getByRole('navigation', { name: 'Views' })

describe('Next up, Projects and Dashboard views', () => {
  it('ranks the groundwork path first once it is the active project', async () => {
    const user = await renderApp()
    await user.click(within(views()).getByRole('button', { name: 'Next up' }))
    expect(screen.getByText(/No active project/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pick one' }))
    await user.click(screen.getByRole('radio', { name: /Groundwork/ }))
    expect(
      screen.getByRole('heading', { name: 'Path to Groundwork' }),
    ).toBeInTheDocument()

    await user.click(within(views()).getByRole('button', { name: 'Next up' }))
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(
      items.map((li) => li.querySelector('.node-button-id')?.textContent),
    ).toEqual(['P1', 'P3', '4.4', '4.1', '4.7'])
    expect(items[0]).toHaveTextContent(
      'On the path to Groundwork, leads to 28 later topics',
    )
    await waitFor(async () =>
      expect((await db.progress.get('fde'))?.progress.active_project).toBe(
        'groundwork',
      ),
    )
  })

  it('opens the node panel from Next up', async () => {
    const user = await renderApp()
    await user.click(within(views()).getByRole('button', { name: 'Next up' }))
    await user.click(
      screen.getByRole('button', { name: /P1 Computer fluency/ }),
    )
    expect(
      screen.getByRole('complementary', { name: 'P1 Computer fluency' }),
    ).toBeInTheDocument()
  })

  it('shows plain counts on the dashboard', async () => {
    const user = await renderApp()
    await user.click(within(views()).getByRole('button', { name: 'Dashboard' }))
    expect(
      screen.getByText(/topics at Working or Deep \(0%\)/),
    ).toBeInTheDocument()
    const byLevel = screen.getByRole('table', { name: 'By level' })
    expect(
      within(byLevel).getByRole('row', { name: /Ready 8/ }),
    ).toBeInTheDocument()
    expect(
      within(byLevel).getByRole('row', { name: /Locked 38/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('No reviews due.')).toBeInTheDocument()
  })
})
