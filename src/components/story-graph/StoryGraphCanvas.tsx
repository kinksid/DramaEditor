"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  MarkerType,
  Panel,
  applyNodeChanges,
  useReactFlow,
  useViewport,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeTypes,
  type OnConnectEnd,
  type OnConnectStart,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Hand,
  LayoutGrid,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
} from "lucide-react";
import { NewNodeMenu } from "@/components/story-graph/NewNodeMenu";
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
  tap: "#6366f1", swipe: "#22c55e", hold: "#d9468a", rapidTap: "#d946ef", choice: "#8b5cf6", ending: "#e11d48", default: "#94a3b8",
};
const edgeLabel: Record<string, string> = {
  tap: "点击", swipe: "滑动", hold: "长按", rapidTap: "连续点击", choice: "选择", ending: "结局", default: "继续",
};

const SNAP_GAP = 40; // pixel gap between snapped containers

const episodeFramePosition = (episode: Episode, episodeIndex: number) => {
  if (episode.id === "ep2b") return { x: 1280, y: -40 };
  if (episode.id === "ep2") return { x: 1280, y: 700 };
  if (episode.id === "ep3") return { x: 2560, y: 700 };
  if (episode.id === "ep4") return { x: 3840, y: 700 };
  return { x: episodeIndex * 1280, y: 330 };
};

export function StoryGraphCanvas({ onOpenNode }: { onOpenNode?: () => void }) {
  const {
    episodes, nodes, edges, selectedEpisodeId,
    selectNode, selectEpisode, connectNodes, updateNodePosition, updateNodePositions, autoLayoutEpisodes,
  } = useWorldBuilderStore();
  const [mode, setMode] = useState<"select" | "pan">("select");
  const [connectMenu, setConnectMenu] = useState<{
    x: number;
    y: number;
    flowX: number;
    flowY: number;
    sourceNodeId: string;
  } | null>(null);
  const framePrevPos = useRef<Record<string, { x: number; y: number }>>({});
  const connectSession = useRef<{ sourceNodeId: string } | null>(null);
  const connectSucceeded = useRef(false);

  const nodeW = 280, nodeH = 380, padX = 120, padY = 130;

  const flowNodes = useMemo<Node[]>(() => {
    const output: Node[] = [];
    episodes.forEach((episode) => {
      const episodeNodes = nodes.filter((n) => n.data.episodeId === episode.id);
      const targetTitles = Object.fromEntries(nodes.map((i) => [i.id, i.data.title]));

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      episodeNodes.forEach((n) => {
        const p = n.position;
        if (p) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x + nodeW); maxY = Math.max(maxY, p.y + nodeH); }
      });
      const hasNodes = episodeNodes.length > 0 && Number.isFinite(minX);
      const fx = hasNodes ? minX - padX : episodeFramePosition(episode, 0).x;
      const fy = hasNodes ? minY - padY : episodeFramePosition(episode, 0).y;
      const fw = hasNodes ? Math.max(640, maxX - minX + padX * 2) : 1160;
      const fh = hasNodes ? Math.max(520, maxY - minY + padY * 2) : 620;

      output.push({
        id: `frame-${episode.id}`, type: "episodeFrame",
        position: { x: fx, y: fy }, data: episode,
        draggable: true, selectable: true,
        style: { width: fw, height: fh, zIndex: -1 },
      });

      episodeNodes.forEach((node, idx) => {
        const pos = node.position ?? { x: fx + 160 + idx * 390, y: fy + 150 };
        const meta = {
          episodeLabel: episode.label ?? String(episode.index),
          episodeTitle: episode.title,
          branchLabel: episode.label?.toUpperCase().includes("B") ? "分支剧情" : "主线剧情",
        };
        output.push({
          id: node.id, type: node.kind,
          data: node.kind === "interaction" ? { ...node.data, targetTitles, ...meta } : { ...node.data, ...meta },
          position: pos, zIndex: 5,
        });
      });
    });
    return output;
  }, [episodes, nodes]);

  const [canvasNodes, setCanvasNodes] = useState<Node[]>(flowNodes);
  useEffect(() => { setCanvasNodes(flowNodes); }, [flowNodes]);

  const flowEdges = useMemo<Edge[]>(() =>
    edges.map((edge: StoryEdge) => {
      const c = edgeColor[edge.actionType ?? "default"];
      return {
        id: edge.id, source: edge.source, target: edge.target, type: "smoothstep",
        label: edge.actionType ? edgeLabel[edge.actionType] ?? edge.label : edge.label || "继续",
        animated: Boolean(edge.actionType),
        markerEnd: { type: MarkerType.ArrowClosed, color: c },
        pathOptions: { borderRadius: 18, offset: 36 },
        style: { stroke: c, strokeWidth: edge.actionType ? 2.8 : 2, strokeDasharray: edge.actionType ? undefined : "6 5" },
        labelStyle: { fill: "#334155", fontWeight: 600, fontSize: 12 },
        labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
      };
    }),
  [edges]);

  const handleConnect = (c: Connection) => {
    if (c.source && c.target) {
      connectSucceeded.current = true;
      connectNodes(c.source, c.target);
    }
  };

  const handleConnectStart: OnConnectStart = (_, params) => {
    if (params.handleType === "source" && params.nodeId && !params.nodeId.startsWith("frame-")) {
      connectSession.current = { sourceNodeId: params.nodeId };
      connectSucceeded.current = false;
      setConnectMenu(null);
    }
  };

  const handleConnectEnd: OnConnectEnd = (event) => {
    const session = connectSession.current;
    connectSession.current = null;
    if (!session || connectSucceeded.current) return;

    const clientX = "clientX" in event ? event.clientX : 0;
    const clientY = "clientY" in event ? event.clientY : 0;
    const pane = document.querySelector(".react-flow__pane") as HTMLElement | null;
    if (!pane) return;

    const rect = pane.getBoundingClientRect();
    setConnectMenu({
      x: clientX - rect.left,
      y: clientY - rect.top,
      flowX: clientX,
      flowY: clientY,
      sourceNodeId: session.sourceNodeId,
    });
  };
  const handleNodesChange = (changes: NodeChange[]) => setCanvasNodes((cur) => applyNodeChanges(changes, cur));

  /* Snap frame position to other frames */
  const snapFrame = (frameId: string, x: number, y: number, frameW: number, frameH: number) => {
    let sx = x, sy = y;
    const threshold = 30;
    const allFrames = canvasNodes.filter((n) => n.id.startsWith("frame-") && n.id !== frameId);

    allFrames.forEach((f) => {
      const fw = (f.style?.width as number) || 1160;
      const fh = (f.style?.height as number) || 620;

      // Snap right edge to left edge (my right → your left)
      if (Math.abs(x + frameW - f.position.x) < threshold && Math.abs(y - f.position.y) < fh) sx = f.position.x - frameW - SNAP_GAP;
      // Snap left edge to right edge
      if (Math.abs(x - (f.position.x + fw)) < threshold && Math.abs(y - f.position.y) < fh) sx = f.position.x + fw + SNAP_GAP;
      // Snap bottom edge to top edge
      if (Math.abs(y + frameH - f.position.y) < threshold && Math.abs(x - f.position.x) < fw) sy = f.position.y - frameH - SNAP_GAP;
      // Snap top edge to bottom edge
      if (Math.abs(y - (f.position.y + fh)) < threshold && Math.abs(x - f.position.x) < fw) sy = f.position.y + fh + SNAP_GAP;
    });

    return { x: sx, y: sy };
  };

  return (
    <div className="h-full min-h-[720px] overflow-hidden bg-white dark:bg-[#1a1a2e]">
      <ReactFlow
        nodes={canvasNodes} edges={flowEdges} nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.16 }} minZoom={0.18} maxZoom={2}
        nodesDraggable nodesConnectable
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
        panOnDrag={mode === "pan" ? [0, 1] : [1]}
        selectionOnDrag={mode === "select"}
        selectionKeyCode="Shift"
        connectOnClick={false}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onNodesChange={handleNodesChange}
        onNodeDragStart={(_, node) => {
          if (node.id.startsWith("frame-")) framePrevPos.current[node.id] = { x: node.position.x, y: node.position.y };
        }}
        onNodeDragStop={(_, node) => {
          if (node.id.startsWith("frame-")) {
            const episodeId = node.id.replace("frame-", "");
            const prev = framePrevPos.current[node.id];
            if (!prev) return;
            // Apply magnetic snap
            const fw = (node.style?.width as number) || 800;
            const fh = (node.style?.height as number) || 600;
            const snapped = snapFrame(node.id, node.position.x, node.position.y, fw, fh);
            const dx = snapped.x - prev.x;
            const dy = snapped.y - prev.y;
            if (dx !== 0 || dy !== 0) {
              // Update frame position + move children
              setCanvasNodes((cur) =>
                cur.map((cn) => {
                  if (cn.id === node.id) return { ...cn, position: { x: snapped.x, y: snapped.y } };
                  if (cn.id.startsWith("frame-")) return cn;
                  const epN = nodes.find((n) => n.id === cn.id);
                  if (epN?.data.episodeId === episodeId) return { ...cn, position: { x: (cn.position.x || 0) + dx, y: (cn.position.y || 0) + dy } };
                  return cn;
                }),
              );
              const episodeNodes = nodes.filter((n) => n.data.episodeId === episodeId);
              const positions = episodeNodes.map((n) => ({ id: n.id, position: { x: (n.position?.x ?? 0) + dx, y: (n.position?.y ?? 0) + dy } }));
              useWorldBuilderStore.getState().updateNodePositions(positions);
            }
          } else {
            updateNodePosition(node.id, node.position);
          }
        }}
        onNodeDoubleClick={(_, node) => {
          if (node.id.startsWith("frame-")) return;
          selectEpisode((node.data as StoryNode["data"]).episodeId);
          selectNode(node.id);
          onOpenNode?.();
        }}
        onNodeClick={(_, node) => {
          if (node.id.startsWith("frame-")) { selectEpisode(node.id.replace("frame-", "")); selectNode(undefined); return; }
          selectEpisode((node.data as StoryNode["data"]).episodeId);
          selectNode(node.id);
        }}
        onPaneClick={() => {
          setConnectMenu(null);
          selectNode(undefined);
        }}
        onConnect={handleConnect}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d9468a" gap={20} size={0.8} style={{ opacity: 0.12 }} />
        <FocusSelectedEpisode episodes={episodes} selectedEpisodeId={selectedEpisodeId} />
        <CanvasControls mode={mode} setMode={setMode} onAutoLayout={autoLayoutEpisodes} />
        <CanvasInteractions onOpenNode={onOpenNode} />
        <ConnectionDropMenu connectMenu={connectMenu} onClose={() => setConnectMenu(null)} />
        <MiniMap pannable zoomable nodeStrokeWidth={3}
          className="!bottom-5 !right-5 !h-[112px] !w-[180px] !rounded-2xl !border !border-slate-200 !bg-white/95 !shadow-soft" />
      </ReactFlow>
    </div>
  );
}

/* === CanvasInteractions: double-click + long-press menu + drop === */
function CanvasInteractions({ onOpenNode }: { onOpenNode?: () => void }) {
  const { selectNode, addSceneNode, addInteractionNode, addEndingNode } = useWorldBuilderStore();
  const flow = useReactFlow();
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);
  const lastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressNode = useRef<string | null>(null);

  useEffect(() => {
    const el = document.querySelector(".react-flow__pane") as HTMLElement | null;
    if (!el) return;

    /* Double-click on pane → menu */
    const onDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".react-flow__node")) return;
      const rect = el.getBoundingClientRect();
      const pos = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      lastPos.current = pos;
      setCtxMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, flowX: pos.x, flowY: pos.y });
    };

    /* Long-press on node → same menu */
    const onMouseDown = (e: MouseEvent) => {
      const nodeEl = (e.target as HTMLElement).closest(".react-flow__node") as HTMLElement | null;
      if (!nodeEl) return;
      const nodeId = nodeEl.getAttribute("data-id");
      if (!nodeId || nodeId.startsWith("frame-")) return;
      longPressNode.current = nodeId;
      longPressTimer.current = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const pos = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
        lastPos.current = pos;
        selectNode(nodeId);
        setCtxMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, flowX: pos.x, flowY: pos.y });
        longPressNode.current = null;
      }, 500);
    };
    const onMouseUp = () => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    };
    const onMouseMove = () => {
      // Cancel long-press if mouse moves significantly
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    };

    /* Drop from assets */
    const onDragOver = (e: DragEvent) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer?.getData("application/drama-asset");
      if (!raw) return;
      try {
        const asset = JSON.parse(raw);
        const pos = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const st = useWorldBuilderStore.getState();
        st.addSceneNode(st.selectedEpisodeId);
        setTimeout(() => {
          const updated = useWorldBuilderStore.getState().nodes;
          const latest = updated[updated.length - 1];
          if (latest) {
            useWorldBuilderStore.getState().updateNodePosition(latest.id, pos);
            if (asset.title) useWorldBuilderStore.getState().updateNode(latest.id, { title: asset.title });
            if (asset.prompt) useWorldBuilderStore.getState().updateNode(latest.id, { prompt: asset.prompt });
          }
        }, 50);
      } catch { /* */ }
    };
    const onClick = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-ctx-menu]")) setCtxMenu(null); };

    /* Keyboard: Delete + Ctrl+Z */
    const onKeyDown = (e: KeyboardEvent) => {
      // Delete selected node
      if (e.key === "Delete" || e.key === "Backspace") {
        const st = useWorldBuilderStore.getState();
        if (st.selectedNodeId) {
          e.preventDefault();
          st.pushHistory();
          st.deleteNode(st.selectedNodeId);
        }
      }
      // Ctrl+Z undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useWorldBuilderStore.getState().undo();
      }
      // Ctrl+Shift+Z or Ctrl+Y redo
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        useWorldBuilderStore.getState().redo();
      }
    };

    el.addEventListener("dblclick", onDblClick);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("drop", onDrop);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      el.removeEventListener("dblclick", onDblClick);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("drop", onDrop);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [flow, selectNode]);

  const createNodeAtMenu = (kind: "scene" | "interaction" | "ending") => {
    const st = useWorldBuilderStore.getState();
    const pos = lastPos.current;
    setCtxMenu(null);
    const create = kind === "scene" ? st.addSceneNode : kind === "interaction" ? st.addInteractionNode : st.addEndingNode;
    create();
    setTimeout(() => {
      const updated = useWorldBuilderStore.getState().nodes;
      const latest = updated[updated.length - 1];
      if (latest) useWorldBuilderStore.getState().updateNodePosition(latest.id, pos);
    }, 50);
  };

  if (!ctxMenu) return null;
  return (
    <NewNodeMenu
      x={ctxMenu.x}
      y={ctxMenu.y}
      onPick={createNodeAtMenu}
      onCancel={() => setCtxMenu(null)}
    />
  );
}

function ConnectionDropMenu({
  connectMenu,
  onClose,
}: {
  connectMenu: {
    x: number;
    y: number;
    flowX: number;
    flowY: number;
    sourceNodeId: string;
  } | null;
  onClose: () => void;
}) {
  const flow = useReactFlow();
  const createConnectedNode = useWorldBuilderStore((state) => state.createConnectedNode);

  if (!connectMenu) return null;

  const handlePick = (kind: "scene" | "interaction" | "ending") => {
    const position = flow.screenToFlowPosition({
      x: connectMenu.flowX,
      y: connectMenu.flowY,
    });
    createConnectedNode(connectMenu.sourceNodeId, kind, {
      x: position.x,
      y: position.y - 120,
    });
    onClose();
  };

  return (
    <NewNodeMenu
      x={connectMenu.x}
      y={connectMenu.y}
      onPick={handlePick}
      onCancel={onClose}
    />
  );
}

/* === FocusSelectedEpisode === */
function FocusSelectedEpisode({ episodes, selectedEpisodeId }: { episodes: Episode[]; selectedEpisodeId: string }) {
  const flow = useReactFlow();
  useEffect(() => {
    const episode = episodes.find((ep) => ep.id === selectedEpisodeId);
    if (!episode) return;
    const frameNode = flow.getNodes().find((n) => n.id === `frame-${episode.id}`);
    if (frameNode) {
      const w = (frameNode.style?.width as number) || 800;
      const h = (frameNode.style?.height as number) || 600;
      flow.setCenter(frameNode.position.x + w / 2, frameNode.position.y + h / 2, { zoom: 0.68, duration: 420 });
    }
  }, [episodes, flow, selectedEpisodeId]);
  return null;
}

/* === CanvasControls === */
function CanvasControls({ mode, setMode, onAutoLayout }: { mode: "select" | "pan"; setMode: (m: "select" | "pan") => void; onAutoLayout: () => void }) {
  const flow = useReactFlow();
  const vp = useViewport();
  const zp = Math.round(vp.zoom * 100);
  return (
    <Panel position="bottom-left" className="!m-5">
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-soft backdrop-blur">
        <button onClick={() => setMode("select")} title="选择" className={cn("grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100", mode === "select" && "bg-accent-soft text-accent")}><MousePointer2 size={17} /></button>
        <button onClick={() => setMode("pan")} title="拖动" className={cn("grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100", mode === "pan" && "bg-accent-soft text-accent")}><Hand size={17} /></button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button onClick={() => flow.zoomOut({ duration: 180 })} className="grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"><Minus size={17} /></button>
        <button onClick={() => flow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 220 })} className="min-w-14 rounded-xl px-2 py-2 text-sm font-semibold text-slate-700">{zp}%</button>
        <button onClick={() => flow.zoomIn({ duration: 180 })} className="grid size-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"><Plus size={17} /></button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button onClick={() => flow.fitView({ padding: 0.16, duration: 260 })} className="grid size-9 place-items-center rounded-xl text-slate-600"><Maximize2 size={16} /></button>
        <button onClick={onAutoLayout} className="grid size-9 place-items-center rounded-xl text-slate-600"><LayoutGrid size={16} /></button>
        <button onClick={() => flow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 220 })} className="grid size-9 place-items-center rounded-xl text-slate-600"><RotateCcw size={16} /></button>
      </div>
    </Panel>
  );
}
