import fdeMapSource from '../maps/fde.yaml?raw'

// M0 placeholder. M1 replaces this with a real loader (src/map/load.ts)
// that parses and validates the map; M3 replaces the page with the map view.
// Node ids are quoted in the YAML; layer and project ids are not.
const nodeCount = (fdeMapSource.match(/^ {2}- id: "/gm) ?? []).length

function App() {
  return (
    <main className="app">
      <h1>Groundwork</h1>
      <p>Your curriculum as a map of topics, prerequisites and proof.</p>
      <p className="status">
        M0 complete. The FDE map file is wired in ({nodeCount} nodes found).
        Next: M1, loading and validating the map.
      </p>
    </main>
  )
}

export default App
