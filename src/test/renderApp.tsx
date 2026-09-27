import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

type Tab = 'Path' | 'Map' | 'List' | 'Next up' | 'Projects' | 'Dashboard'

/**
 * Render the app, wait for saved progress to load (the Path tab appears),
 * then switch to `tab`. Returns the render result, a user-event instance,
 * and a helper that reads a node's level from the map.
 */
export async function renderApp(tab: Tab = 'Path') {
  const user = userEvent.setup()
  const view = render(<App />)
  await screen.findByRole('heading', { level: 2, name: 'Path' })
  if (tab !== 'Path') await switchTab(user, tab)
  const levelOf = (id: string) =>
    view.container.querySelector(`[data-id="${id}"] .topic-level`)?.textContent
  return { ...view, user, levelOf }
}

export async function switchTab(
  user: ReturnType<typeof userEvent.setup>,
  tab: Tab,
) {
  await user.click(
    within(screen.getByRole('navigation', { name: 'Views' })).getByRole(
      'button',
      { name: tab },
    ),
  )
}
