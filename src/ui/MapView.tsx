import {
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMemo } from 'react'
import type { GroundworkMap, Id, MapNode } from '../map/types'
import type { Level } from '../progress/levels'
import { layoutMap, NODE_HEIGHT, NODE_WIDTH } from './layout'
import { levelStyle } from './levelStyle'

type TopicFlowNode = Node<
  { node: MapNode; level: Level; needsReview: boolean },
  'topic'
>
type LaneFlowNode = Node<{ title: string }, 'lane'>

interface MapViewProps {
  map: GroundworkMap
  levels: Map<Id, Level>
  /** Nodes whose review is due, shown with a badge. */
  needsReview: Set<Id>
  selectedId: Id | null
  onSelect: (id: Id) => void
}

export function MapView({
  map,
  levels,
  needsReview,
  selectedId,
  onSelect,
}: MapViewProps) {
  const layout = useMemo(() => layoutMap(map), [map])

  const nodes = useMemo(() => {
    const lanes: LaneFlowNode[] = layout.lanes.map((lane) => ({
      id: `lane:${lane.id}`,
      type: 'lane',
      position: { x: 0, y: lane.y },
      width: layout.width,
      height: lane.height,
      data: { title: lane.title },
      selectable: false,
      draggable: false,
      focusable: false,
      zIndex: -1,
    }))
    const topics: TopicFlowNode[] = map.nodes.map((node) => {
      const level = levels.get(node.id) ?? 'locked'
      const review = needsReview.has(node.id)
      return {
        id: node.id,
        type: 'topic',
        position: layout.positions.get(node.id)!,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: { node, level, needsReview: review },
        selected: node.id === selectedId,
        ariaLabel: `${node.id} ${node.title}, ${levelStyle[level].label}${review ? ', needs review' : ''}`,
      }
    })
    return [...lanes, ...topics]
  }, [map, levels, needsReview, layout, selectedId])

  const edges = useMemo<Edge[]>(
    () =>
      map.nodes.flatMap((node) =>
        (node.requires ?? []).map((req) => ({
          id: `${req}->${node.id}`,
          source: req,
          target: node.id,
          markerEnd: { type: MarkerType.ArrowClosed },
        })),
      ),
    [map],
  )

  return (
    <div className="map-view">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          if (node.type === 'topic') onSelect(node.id)
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        colorMode="system"
        fitView
        fitViewOptions={{ padding: 0.05 }}
        minZoom={0.2}
      >
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

function TopicNode({ data, selected }: NodeProps<TopicFlowNode>) {
  const { node, level, needsReview } = data
  const style = levelStyle[level]
  return (
    <div className={`topic level-${level}${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div className="topic-meta">
        <span className="topic-id">
          {node.id}
          {needsReview && <span className="topic-review"> ↻ Needs review</span>}
        </span>
        <span className="topic-level">
          <span aria-hidden="true">{style.icon}</span> {style.label}
        </span>
      </div>
      <div className="topic-title">{node.title}</div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  )
}

function LaneNode({ data }: NodeProps<LaneFlowNode>) {
  return (
    <div className="lane">
      <span className="lane-title">{data.title}</span>
    </div>
  )
}

const nodeTypes = { topic: TopicNode, lane: LaneNode } satisfies NodeTypes
