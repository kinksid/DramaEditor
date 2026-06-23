"use client";

import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  MarkerType,
  Panel,
  useReactFlow,
  useViewport,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { Hand, LayoutGrid, Maximize2, Minus, MousePointer2, Plus, RotateCcw } from "lucide-react";
import { EpisodeFrame } from "@/components/story-graph/EpisodeFrame";
import { InteractionNode } from "@/components/story-graph/nodes/InteractionNode";
import { SceneNode } from "@/components/story-graph/nodes/SceneNode";
import { EndingNode } from "@/components/story-graph/nodes/EndingNode";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Episode, StoryEdge, StoryNode } from "@/types/worldBuilder";

const nodeTypes: NodeTypes = {
  scene: SceneNode,
  interaction: InteractionNode,
  ending: EndingNode,
  episodeFrame: ({ data, selected }) => <EpisodeFrame episode={data as Episode} selected={selected} />,
};

const edgeColor: Record<string, string> = {
  tap: "#3b82f6",
  swipe: "#22c55e",
  hold: "#f97316",
  rapidTap: "#d946ef",
  choice: "#a855f7",
  ending: "#ef4444",
  default: "#94a3b8",
};

const edgeLabel: Record<string, string> = {
  tap: "点击",
  swipe: "滑动",
  hold: "长按",
  rapidTap: "连续点击",
  choice: "选择",
  ending: "结局",
  default: "继续",
};

const episodeFramePosition = (episode: Episode, episodeIndex: number) => {
  if (episode.id === "ep2b") return { x: 1280, y: -40 };
  if (episode.id === "ep2") return { x: 1280, y: 700 };
  if (episode.id === "ep3") return { x: 2560, y: 700 };
  if (episode.id === "ep4") return { x: 3840, y: 700 };
  return { x: episodeIndex * 1280, y: 330 };
};

export function StoryGraphCanvas({ onOpenNode }: { onOpenNode?: () => void }) {
  const {
    episodes,
    nodes,
    edges,
    selectedEpisodeId,
    selectNode,
    selectEpisode,
    connectNodes,
    updateNodePositions,
    autoLayoutEpisodes,
    addSceneNode,
  } = useWorldBuilderStore();
  const [mode, setMode] = useState<"select" | "pan">("select");

  const flowNodes = useMemo<Node[]>(() => {
    const output: Node[] = [];
    episodes.forEach((episode, episodeIndex) => {
      const frame = episodeFramePosition(episode, episodeIndex);
      const frameX = frame.x;
      const frameY = frame.y;
      output.push({
        id: `frame-${episode.id}`,
        type: "episodeFrame",
        position: { x: frameX, y: frameY },
        data: episode,
        draggable: false,
        selectable: true,
        style: { width: 1160, height: 620, zIndex: -1 },
      });

      const episodeNodes = nodes.filter((node) => node.data.episodeId === episode.id);
      const targetTitles = Object.fromEntries(nodes.map((item) => [item.id, item.data.title]));
      episodeNodes.forEach((node, nodeIndex) => {
        const episodeMeta = {
          episodeLabel: episode.label ?? String(episode.index),
          episodeTitle: episode.title,
          branchLabel: episode.label?.toUpperCase().includes("B") ? "分支剧情" : "主线剧情",
        };
        output.push({
          id: node.id,
          type: node.kind,
          data: node.kind === "interaction" ? { ...node.data, targetTitles, ...episodeMeta } : { ...node.data, ...episodeMeta },
          position: node.position ?? {
            x: frameX + 140 + nodeIndex * 390,
            y: frameY + 150,
          },
          zIndex: 5,
        });
      });
    });
    return output;
  }, [episodes, nodes]);

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge: StoryEdge) => {
        const color = edgeColor[edge.actionType ?? "default"];
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          label: edge.actionType ? edgeLabel[edge.actionType] ?? edge.label : edge.label || "继续",
          animated: Boolean(edge.actionType),
          markerEnd: { type: MarkerType.ArrowClosed, color },
          pathOptions: { borderRadius: 18, offset: 36 },
          style: { stroke: color, strokeWidth: edge.actionType ? 2.8 : 2, strokeDasharray: edge.actionType ? undefined : "6 5" },
          labelStyle: { fill: "#334155", fontWeight: 600, fontSize: 12 },
          labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
        };
      }),
    [edges],
  );

  const handleConnect = (connection: Connection) => {
    if (connection.source && connection.target) {
      connectNodes(connection.source, connection.target);
    }
  };

  const handleNodesChange = (changes: NodeChange[]) => {
    const positions = changes.reduce<Array<{ id: string; position: { x: number; y: number } }>>(
      (acc, change) => {
        if (
          change.type === "position" &&
          change.position &&
          !change.id.startsWith("frame-")
        ) {
          acc.push({ id: change.id, position: change.position });
        }
        return acc;
      },
      [],
    );

    if (positions.length) {
      updateNodePositions(positions);
    }
  };

  return (
    <div className="h-full min-h-[720px] overflow-hidden bg-white">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        minZoom={0.18}
        maxZoom={2}
        nodesDraggable={mode === "select"}
        panOnDrag={mode === "pan"}
        selectionOnDrag={mode === "select"}
        onNodesChange={handleNodesChange}
        onNodeClick={(_, node) => {
          if (node.id.startsWith("frame-")) {
            selectEpisode(node.id.replace("frame-", ""));
            selectNode(undefined);
            return;
          }
          selectEpisode((node.data as StoryNode["data"]).episodeId);
          selectNode(node.id);
          onOpenNode?.();
        }}
        onPaneClick={() => selectNode(undefined)}
        onConnect={handleConnect}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d7dde8" gap={18} size={1} />
        <FocusSelectedEpisode episodes={episodes} selectedEpisodeId={selectedEpisodeId} />
        <Panel position="top-left" className="!m-4">
          <button
            onClick={() => addSceneNode()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-accent-soft"
          >
            <Plus size={16} /> 添加节点
          </button>
        </Panel>
        <CanvasControls mode={mode} setMode={setMode} onAutoLayout={autoLayoutEpisodes} />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={3}
          className="!bottom-5 !right-5 !h-[112px] !w-[180px] !rounded-2xl !border !border-slate-200 !bg-white/95 !shadow-soft"
        />
      </ReactFlow>
    </div>
  );
}

function FocusSelectedEpisode({
  episodes,
  selectedEpisodeId,
}: {
  episodes: Episode[];
  selectedEpisodeId: string;
}) {
  const flow = useReactFlow();

  useEffect(() => {
    const episodeIndex = Math.max(episodes.findIndex((episode) => episode.id === selectedEpisodeId), 0);
    const episode = episodes[episodeIndex];
    if (!episode) return;
    const frame = episodeFramePosition(episode, episodeIndex);
    flow.setCenter(frame.x + 580, frame.y + 310, { zoom: 0.68, duration: 420 });
  }, [episodes, flow, selectedEpisodeId]);

  return null;
}

function CanvasControls({
  mode,
  setMode,
  onAutoLayout,
}: {
  mode: "select" | "pan";
  setMode: (mode: "select" | "pan") => void;
  onAutoLayout: () => void;
}) {
  const flow = useReactFlow();
  const viewport = useViewport();
  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <Panel position="bottom-left" className="!m-5">
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-soft backdrop-blur">
        <button
          onClick={() => setMode("select")}
          title="选择节点"
          className={cn(
            "grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100",
            mode === "select" && "bg-orange-50 text-accent",
          )}
        >
          <MousePointer2 size={17} />
        </button>
        <button
          onClick={() => setMode("pan")}
          title="拖动画布"
          className={cn(
            "grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100",
            mode === "pan" && "bg-orange-50 text-accent",
          )}
        >
          <Hand size={17} />
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          onClick={() => flow.zoomOut({ duration: 180 })}
          title="缩小"
          className="grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <Minus size={17} />
        </button>
        <button
          onClick={() => flow.setViewport({ x: 80, y: 120, zoom: 1 }, { duration: 220 })}
          title="1:1 显示"
          className="min-w-16 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          {zoomPercent}%
        </button>
        <button
          onClick={() => flow.zoomIn({ duration: 180 })}
          title="放大"
          className="grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <Plus size={17} />
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          onClick={() => flow.fitView({ padding: 0.16, duration: 260 })}
          title="适配视图"
          className="grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <Maximize2 size={16} />
        </button>
        <button
          onClick={onAutoLayout}
          title="自动整理剧集"
          className="grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <LayoutGrid size={16} />
        </button>
        <button
          onClick={() => flow.setViewport({ x: 80, y: 120, zoom: 1 }, { duration: 220 })}
          title="回到 1:1"
          className="grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </Panel>
  );
}
