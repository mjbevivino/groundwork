import { useCallback, useMemo, useState } from 'react'
import fdeMapSource from '../maps/fde.yaml?raw'
import {
  checkReferences,
  findDuplicateIds,
  topologicalOrder,
} from './graph/graph'
import { loadMap } from './map/load'
import type { GroundworkMap, Id } from './map/types'
import { computeLevels } from './progress/levels'
import { isoDate, isReviewDue, levelsOf } from './progress/rules'
import type { NodeProgress, Progress } from './progress/types'
import { useProgress } from './progress/useProgress'
import { nextUp, projectPath } from './rank/nextUp'
import { scopeSummary, studyOrder, units } from './rank/path'
import { DashboardView } from './ui/DashboardView'
import { LessonView } from './ui/LessonView'
import { ListView } from './ui/ListView'
import { MapView } from './ui/MapView'
import { NextUpView } from './ui/NextUpView'
import { NodePanel } from './ui/NodePanel'
import { PathView, type ContinueTarget } from './ui/PathView'
import { ProgressFileButtons } from './ui/ProgressFileButtons'
import { ProjectsView } from './ui/ProjectsView'

/** Everything that stops a map from being shown, as readable messages. */
function mapProblems(map: GroundworkMap): string[] {
  const problems = checkReferences(map).map(
    (i) =>
      `${i.source === 'node' ? 'Node' : 'Project'} "${i.from}", ${i.field}: no ${i.field === 'layer' ? 'layer' : 'node'} has id "${i.missing}"`,
  )
  for (const id of findDuplicateIds(map)) {
    problems.push(`Node id "${id}" is used more than once`)
  }
  if (problems.length === 0) {
    const order = topologicalOrder(map)
    if (!order.ok) {
      problems.push(`Prerequisites form a cycle: ${order.cycle.join(' → ')}`)
    }
  }
  return problems
}

// Parse and check once, when the module loads.
const loaded = loadMap(fdeMapSource)
const problems = loaded.ok
  ? mapProblems(loaded.map)
  : loaded.errors.map((e) => e.message)

function App() {
  if (loaded.ok && problems.length === 0) return <Workspace map={loaded.map} />
  return (
    <main className="app">
      <header className="app-header">
        <h1>Groundwork</h1>
      </header>
      <section className="problems status" role="alert">
        <p>The map has {problems.length} problem(s):</p>
        <ul className="errors">
          {problems.map((message, i) => (
            <li key={i}>{message}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}

type View = 'path' | 'map' | 'list' | 'next' | 'projects' | 'dashboard'

const VIEWS: { id: View; label: string }[] = [
  { id: 'path', label: 'Path' },
  { id: 'map', label: 'Map' },
  { id: 'list', label: 'List' },
  { id: 'next', label: 'Next up' },
  { id: 'projects', label: 'Projects' },
  { id: 'dashboard', label: 'Dashboard' },
]

function Workspace({ map }: { map: GroundworkMap }) {
  const { progress, update, error } = useProgress(map)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [view, setView] = useState<View>('path')
  // The topic open as a full-page lesson in the Path tab, if any.
  const [lessonId, setLessonId] = useState<Id | null>(null)
  const today = isoDate(new Date())
  const notices = [...(error ? [error] : []), ...importErrors]

  return (
    <main className="app">
      <header className="app-header">
        <h1>Groundwork</h1>
        <p>{map.title}</p>
        <nav className="views" aria-label="Views">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-current={view === v.id ? 'page' : undefined}
              onClick={() => {
                setView(v.id)
                // The Path tab always returns to the path overview.
                if (v.id === 'path') setLessonId(null)
              }}
            >
              {v.label}
            </button>
          ))}
        </nav>
        {progress && (
          <ProgressFileButtons
            map={map}
            progress={progress}
            today={today}
            onImport={(imported) => {
              setImportErrors([])
              update(() => imported)
            }}
            onErrors={setImportErrors}
          />
        )}
      </header>
      {notices.length > 0 && (
        <section className="notice" role="alert">
          <ul className="errors">
            {notices.map((message, i) => (
              <li key={i}>{message}</li>
            ))}
          </ul>
          {importErrors.length > 0 && (
            <button type="button" onClick={() => setImportErrors([])}>
              Dismiss
            </button>
          )}
        </section>
      )}
      {progress ? (
        <Workbench
          map={map}
          view={view}
          onView={setView}
          lessonId={lessonId}
          onLesson={setLessonId}
          progress={progress}
          today={today}
          update={update}
        />
      ) : (
        <p className="problems status">Loading your progress…</p>
      )}
    </main>
  )
}

interface WorkbenchProps {
  map: GroundworkMap
  view: View
  onView: (view: View) => void
  lessonId: Id | null
  onLesson: (id: Id | null) => void
  progress: Progress
  today: string
  update: (change: (prev: Progress) => Progress) => void
}

/** The current view, with the node panel beside it when a node is selected. */
function Workbench({
  map,
  view,
  onView,
  lessonId,
  onLesson,
  progress,
  today,
  update,
}: WorkbenchProps) {
  const [selectedId, setSelectedId] = useState<Id | null>(null)
  const [scopeChoice, setScopeChoice] = useState<'project' | 'all' | null>(null)
  const close = useCallback(() => setSelectedId(null), [])

  // Locked and ready are recomputed from the map every time progress changes.
  const stored = useMemo(() => levelsOf(progress.nodes), [progress.nodes])
  const levels = useMemo(() => computeLevels(map, stored), [map, stored])
  const needsReview = useMemo(
    () =>
      new Set(
        Object.keys(progress.nodes).filter((id) =>
          isReviewDue(progress.nodes[id], today),
        ),
      ),
    [progress.nodes, today],
  )
  const suggestions = useMemo(
    () => nextUp(map, stored, progress.active_project),
    [map, stored, progress.active_project],
  )
  const selected = map.nodes.find((n) => n.id === selectedId)

  // The Path tab: one study order, scoped to the active project or the map.
  const project = map.projects?.find((p) => p.id === progress.active_project)
  const scopeKind = project ? (scopeChoice ?? 'project') : 'all'
  const fullOrder = useMemo(() => studyOrder(map), [map])
  const pathOrder = useMemo(
    () =>
      project && scopeKind === 'project'
        ? studyOrder(map, projectPath(map, project.id))
        : fullOrder,
    [map, fullOrder, project, scopeKind],
  )
  const pathUnits = units(map, pathOrder, levels)
  // A lesson outside the current scope walks the whole map instead.
  const lessonOrder =
    lessonId && !pathOrder.includes(lessonId) ? fullOrder : pathOrder
  const lessonUnits =
    lessonOrder === pathOrder ? pathUnits : units(map, fullOrder, levels)
  const lesson = map.nodes.find((n) => n.id === lessonId)

  const last = progress.last_opened
  const lastLevel = last ? levels.get(last) : undefined
  const continueTarget: ContinueTarget | undefined =
    last && lastLevel && lastLevel !== 'working' && lastLevel !== 'deep'
      ? { id: last, reason: 'Pick up where you left off.', resume: true }
      : suggestions[0] && { ...suggestions[0], resume: false }

  function openLesson(id: Id) {
    onLesson(id)
    onView('path')
    update((prev) => ({ ...prev, last_opened: id }))
  }

  function changeNode(id: Id, next: NodeProgress) {
    update((prev) => ({ ...prev, nodes: { ...prev.nodes, [id]: next } }))
  }

  return (
    <div className="app-body">
      {view === 'path' && lesson && (
        <LessonView
          key={lesson.id}
          map={map}
          node={lesson}
          levels={levels}
          progress={progress.nodes[lesson.id]}
          today={today}
          order={lessonOrder}
          units={lessonUnits}
          onChange={(next) => changeNode(lesson.id, next)}
          onOpen={openLesson}
          onBack={() => onLesson(null)}
        />
      )}
      {view === 'path' && !lesson && (
        <PathView
          key={`${scopeKind}:${project?.id ?? ''}`}
          map={map}
          levels={levels}
          scopeKind={scopeKind}
          activeProject={project?.id}
          units={pathUnits}
          summary={scopeSummary(map, pathOrder, levels)}
          continueTarget={continueTarget}
          onScope={setScopeChoice}
          onOpen={openLesson}
          onPickProject={() => onView('projects')}
        />
      )}
      {view === 'map' && (
        <MapView
          map={map}
          levels={levels}
          needsReview={needsReview}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}
      {view === 'list' && (
        <ListView
          map={map}
          levels={levels}
          needsReview={needsReview}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}
      {view === 'next' && (
        <NextUpView
          map={map}
          suggestions={suggestions}
          levels={levels}
          activeProject={progress.active_project}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPickProject={() => onView('projects')}
        />
      )}
      {view === 'projects' && (
        <ProjectsView
          map={map}
          levels={levels}
          activeProject={progress.active_project}
          selectedId={selectedId}
          onActivate={(id) =>
            update((prev) => ({ ...prev, active_project: id }))
          }
          onSelect={setSelectedId}
        />
      )}
      {view === 'dashboard' && (
        <DashboardView
          map={map}
          levels={levels}
          needsReview={needsReview}
          onSelect={setSelectedId}
        />
      )}
      {selected && view !== 'path' && (
        <NodePanel
          key={selected.id}
          map={map}
          node={selected}
          levels={levels}
          progress={progress.nodes[selected.id]}
          today={today}
          onChange={(next) => changeNode(selected.id, next)}
          onClose={close}
        />
      )}
    </div>
  )
}

export default App
