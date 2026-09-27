import { topologicalOrder } from '../graph/graph'
import type { GroundworkMap, Id } from '../map/types'
import type { Level } from '../progress/levels'
import { projectPath } from '../rank/nextUp'
import { NodeButton } from './NodeButton'

interface ProjectsViewProps {
  map: GroundworkMap
  levels: Map<Id, Level>
  activeProject: Id | undefined
  selectedId: Id | null
  onActivate: (projectId: Id) => void
  onSelect: (id: Id) => void
}

const isDone = (level: Level | undefined) =>
  level === 'working' || level === 'deep'

export function ProjectsView({
  map,
  levels,
  activeProject,
  selectedId,
  onActivate,
  onSelect,
}: ProjectsViewProps) {
  const projects = map.projects ?? []
  const active = projects.find((p) => p.id === activeProject)
  const topo = topologicalOrder(map)
  const order = topo.ok ? topo.order : map.nodes.map((n) => n.id)

  return (
    <section className="view" aria-labelledby="projects-heading">
      <h2 id="projects-heading">Projects</h2>
      <fieldset className="projects">
        <legend>Active project (Next up puts its path first)</legend>
        {projects.map((project) => {
          const path = projectPath(map, project.id)
          const done = [...path].filter((id) => isDone(levels.get(id))).length
          return (
            <label key={project.id} className="project-option">
              <input
                type="radio"
                name="active-project"
                checked={project.id === activeProject}
                onChange={() => onActivate(project.id)}
              />
              <span>
                <strong>{project.title}</strong>{' '}
                <span className="hint">
                  {done} of {path.size} topics on its path at Working or Deep
                </span>
                {project.description && (
                  <span className="hint project-description">
                    {project.description}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </fieldset>

      {active ? (
        <>
          <h3>Path to {active.title}</h3>
          <p className="hint">
            Every topic it depends on, in an order that respects prerequisites.
            ★ marks the topics the project needs directly.
          </p>
          <ol className="node-list">
            {order
              .filter((id) => projectPath(map, active.id).has(id))
              .map((id) => (
                <li key={id}>
                  <NodeButton
                    node={map.nodes.find((n) => n.id === id)!}
                    level={levels.get(id) ?? 'locked'}
                    selected={id === selectedId}
                    onSelect={onSelect}
                  />
                  {active.requires.includes(id) && (
                    <span className="reason">★ Needed directly</span>
                  )}
                </li>
              ))}
          </ol>
        </>
      ) : (
        <p>Pick a project to see its path.</p>
      )}
    </section>
  )
}
