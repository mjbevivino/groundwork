import fdeMapSource from '../maps/fde.yaml?raw'
import { loadMap } from './map/load'

// Parse and validate once, when the module loads. M3 replaces the page
// with the map view.
const result = loadMap(fdeMapSource)

function App() {
  return (
    <main className="app">
      <h1>Groundwork</h1>
      <p>Your curriculum as a map of topics, prerequisites and proof.</p>
      {result.ok ? (
        <p className="status">
          Loaded “{result.map.title}”: {result.map.nodes.length} nodes in{' '}
          {result.map.layers.length} layers, {result.map.projects?.length ?? 0}{' '}
          projects.
        </p>
      ) : (
        <section className="status" role="alert">
          <p>The map has {result.errors.length} problem(s):</p>
          <ul className="errors">
            {result.errors.map((error, i) => (
              <li key={i}>{error.message}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

export default App
