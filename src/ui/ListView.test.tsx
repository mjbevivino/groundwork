import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { db } from '../progress/store'

beforeEach(async () => {
  await db.progress.clear()
})

async function openList() {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByText('Computer fluency')
  await user.click(
    within(screen.getByRole('navigation', { name: 'Views' })).getByRole(
      'button',
      { name: 'List' },
    ),
  )
  return user
}

const nodeButton = (name: RegExp) => screen.getByRole('button', { name })

describe('List view', () => {
  it('lists all 46 nodes by layer with level and prerequisites', async () => {
    await openList()
    const list = screen.getByRole('region', { name: 'List' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(46)
    for (const layer of ['Prerequisites', 'Foundations', 'Field skills']) {
      expect(
        within(list).getByRole('heading', { name: layer }),
      ).toBeInTheDocument()
    }
    expect(nodeButton(/^P2 Programming basics, Locked$/)).toBeInTheDocument()
    // P2, P4, P5 and 1.5 each require only P1.
    expect(
      within(list).getAllByText('Requires P1 Computer fluency'),
    ).toHaveLength(4)
  })

  it('moves with arrow keys, Home and End', async () => {
    const user = await openList()
    nodeButton(/^P1 /).focus()
    await user.keyboard('{ArrowDown}')
    expect(nodeButton(/^P2 /)).toHaveFocus()
    await user.keyboard('{End}')
    expect(nodeButton(/^4\.12 /)).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(nodeButton(/^4\.12 /)).toHaveFocus()
    await user.keyboard('{Home}{ArrowUp}')
    expect(nodeButton(/^P1 /)).toHaveFocus()
  })

  it('does the P1 test-out from the keyboard alone, and focus returns', async () => {
    const user = await openList()
    nodeButton(/^P1 /).focus()
    await user.keyboard('{Enter}')

    const panel = screen.getByRole('complementary', {
      name: 'P1 Computer fluency',
    })
    expect(
      within(panel).getByRole('heading', { name: 'Computer fluency' }),
    ).toHaveFocus()

    await user.click(within(panel).getByLabelText('Note')) // focus the field
    await user.keyboard('Set up a machine by path{Enter}')
    expect(nodeButton(/^P1 Computer fluency, Working$/)).toBeInTheDocument()
    expect(nodeButton(/^P2 Programming basics, Ready$/)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(nodeButton(/^P1 /)).toHaveFocus()
  })
})
