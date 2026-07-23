"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import ReactFlow, {
  Background,
  MiniMap,
  MarkerType,
  Panel,
  SelectionMode,
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
  type OnSelectionChangeParams,
  type Viewport,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Hand,
  LayoutGrid,
  Map as MapIcon,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
} from "lucide-react";
import { NewNodeMenu, type NewNodeKind, type NewNodeMenuVariant } from "@/components/story-graph/NewNodeMenu";
import { NodeActionMenu, type NodeAction } from "@/components/story-graph/NodeActionMenu";
import { EpisodeFrame } from "@/components/story-graph/EpisodeFrame";
import { InteractionNode } from "@/components/story-graph/nodes/InteractionNode";
import { SceneNode } from "@/components/story-graph/nodes/SceneNode";
import { EndingNode } from "@/components/story-graph/nodes/EndingNode";
import { StartNode } from "@/components/story-graph/nodes/StartNode";
import { GenerationTaskBar } from "@/components/story-graph/GenerationTaskBar";
import { NodeFloatingToolbar } from "@/components/story-graph/NodeFloatingToolbar";
import {
  episodeDisplayLabel,
  episodeModuleCaption,
} from "@/lib/episodeBranchLabels";
import {
  FRAME_PAD_X,
  FRAME_PAD_Y_BOTTOM,
  FRAME_PAD_Y_TOP,
  FRAME_SNAP_GAP,
  NODE_SNAP_GAP,
  SCENE_NODE_H,
  computeEpisodeWrapFrame,
  estimateNodeSize,
  findEpisodeAtFlowPoint,
  findEpisodeForNodeDrop,
  frameRectFromNode,
  isValidStoryConnection,
  resolveFrameOverlap,
  resolveNodeOverlap,
  storyNodeRectsFromFlow,
} from "@/lib/storyGraphLayout";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Episode, StoryEdge, StoryNode } from "@/types/worldBuilder";

const nodeTypes: NodeTypes = {
  start: StartNode,
  scene: SceneNode,
  interaction: InteractionNode,
  ending: EndingNode,
  episodeFrame: EpisodeFrame,
};

const edgeColor: Record<string, string> = {
  tap: "#6366f1", swipe: "#22c55e", hold: "#d9468a", rapidTap: "#d946ef", choice: "#8b5cf6", ending: "#e11d48", default: "#94a3b8",
};
const edgeLabel: Record<string, string> = {
  tap: "点击", swipe: "滑动", hold: "长按", rapidTap: "连续点击", choice: "选择", ending: "结局", default: "继续",
};

/** 固定「开始」节点：不可拖、不可删，作为画布默认中心锚点 */
const START_NODE_ID = "__start__";
const START_NODE_POS = { x: 0, y: 360 };
const START_NODE_SIZE = { w: 160, h: 72 };
/** 剧集框从开始节点右侧排布，避免与固定入口重叠 */
const EPISODE_ORIGIN_X = 280;

const episodeFramePosition = (episode: Episode, episodeIndex: number) => {
  if (episode.id === "ep2b") return { x: EPISODE_ORIGIN_X + 1280, y: -40 };
  if (episode.id === "ep2") return { x: EPISODE_ORIGIN_X + 1280, y: 920 };
  if (episode.id === "ep3") return { x: EPISODE_ORIGIN_X + 2560, y: 920 };
  if (episode.id === "ep4") return { x: EPISODE_ORIGIN_X + 3840, y: 920 };
  return { x: EPISODE_ORIGIN_X + episodeIndex * 1280, y: 330 };
};

function centerOnStartNode(
  flow: { setCenter: (x: number, y: number, opts?: { zoom?: number; duration?: number }) => void },
  opts?: { zoom?: number; duration?: number },
) {
  flow.setCenter(
    START_NODE_POS.x + START_NODE_SIZE.w / 2,
    START_NODE_POS.y + START_NODE_SIZE.h / 2,
    { zoom: opts?.zoom ?? 1, duration: opts?.duration ?? 280 },
  );
}

export function StoryGraphCanvas({
  onOpenNode,
  readOnly = false,
}: {
  onOpenNode?: () => void;
  readOnly?: boolean;
}) {
  const {
    episodes, nodes, edges, selectedEpisodeId, suppressAutoStartEdge,
    selectNode, selectEpisode, connectNodes, updateNode, updateEpisode,
    updateNodePosition, updateNodePositions, autoLayoutEpisodes,
    syncEpisodeBranchLabels, deleteEdges,
  } = useWorldBuilderStore();

  // 打开画布 / 拓扑变化后同步 2a/2b 分支编号
  useEffect(() => {
    syncEpisodeBranchLabels();
  }, [episodes.length, nodes.length, edges, syncEpisodeBranchLabels]);

  /** 按子节点紧包剧集框并写回 store */
  const syncEpisodeFrameWrap = (episodeId: string) => {
    const st = useWorldBuilderStore.getState();
    const siblings = st.nodes.filter((n) => n.data.episodeId === episodeId);
    const wrap = computeEpisodeWrapFrame(siblings, undefined, { tight: true });
    if (wrap) st.updateEpisode(episodeId, { frame: wrap });
  };

  const [mode, setMode] = useState<"select" | "pan">("select");
  const [spacePan, setSpacePan] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [connectMenu, setConnectMenu] = useState<{
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    sourceNodeId: string;
    sourceHandle?: string | null;
  } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    flowX: number;
    flowY: number;
    variant: NewNodeMenuVariant;
    episodeId?: string;
  } | null>(null);
  const [nodeMenu, setNodeMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  /** 递增后通知交互层刷新落点（创建节点用） */
  const menuPlaceRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const framePrevPos = useRef<Record<string, { x: number; y: number }>>({});
  const connectSession = useRef<{ sourceNodeId: string; sourceHandle?: string | null } | null>(null);
  const connectSucceeded = useRef(false);
  /**
   * 打开菜单的那一次手势往往会接着触发 pane click / document click。
   * 置 true 后消费掉下一次空白关闭，避免「一松手就关」。
   */
  const skipNextPaneClickRef = useRef(false);
  const selectedIdsRef = useRef<string[]>([]);
  const selectedEdgeIdsRef = useRef<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const zoomPreviewRef = useRef<{ active: boolean; viewport?: Viewport }>({ active: false });
  const panActive = mode === "pan" || spacePan;

  const clearEdgeSelection = () => {
    selectedEdgeIdsRef.current = [];
    setSelectedEdgeIds([]);
  };

  const markMenuGesture = () => {
    // 仅用于「会附带 pane click」的手势（连线松手 / 右键 / 双击）
    skipNextPaneClickRef.current = true;
    window.setTimeout(() => {
      skipNextPaneClickRef.current = false;
    }, 400);
  };

  const dismissAllMenus = () => {
    setConnectMenu(null);
    setCtxMenu(null);
    setNodeMenu(null);
  };

  const flowNodes = useMemo<Node[]>(() => {
    const output: Node[] = [];

    episodes.forEach((episode, episodeIndex) => {
      const episodeNodes = nodes.filter((n) => n.data.episodeId === episode.id);
      const targetTitles = Object.fromEntries(nodes.map((i) => [i.id, i.data.title]));
      const defaultFrame = episodeFramePosition(episode, episodeIndex);
      // 有节点时必须包住子节点（与手动 frame 取并集，避免旧坐标锁死导致溢出）
      const wrapped = computeEpisodeWrapFrame(episodeNodes, episode.frame, { tight: false });
      const fx = wrapped?.x ?? episode.frame?.x ?? defaultFrame.x;
      const fy = wrapped?.y ?? episode.frame?.y ?? defaultFrame.y;
      const fw = wrapped?.width ?? episode.frame?.width ?? 720;
      const fh =
        wrapped?.height ??
        episode.frame?.height ??
        SCENE_NODE_H + FRAME_PAD_Y_TOP + FRAME_PAD_Y_BOTTOM + 40;

      output.push({
        id: `frame-${episode.id}`, type: "episodeFrame",
        position: { x: fx, y: fy }, data: episode,
        draggable: true, selectable: true,
        style: {
          width: fw,
          height: fh,
          // 选中剧集框抬升，避免被 flowNodes 重算打回 -1
          zIndex: selectedFrameId === `frame-${episode.id}` ? 3 : -1,
        },
      });

      episodeNodes.forEach((node, idx) => {
        const pos = node.position ?? {
          x: fx + FRAME_PAD_X,
          y: fy + FRAME_PAD_Y_TOP + idx * 40,
        };
        const meta = {
          episodeLabel: episodeDisplayLabel(episode),
          episodeTitle: episode.title,
          branchLabel: episodeModuleCaption(episode),
        };
        output.push({
          id: node.id, type: node.kind,
          data: node.kind === "interaction" ? { ...node.data, targetTitles, ...meta } : { ...node.data, ...meta },
          position: pos, zIndex: 5,
        });
      });
    });

    // 固定 Start 节点：画布原点锚点，不随剧集移动
    output.unshift({
      id: START_NODE_ID,
      type: "start",
      position: { ...START_NODE_POS },
      data: { label: "开始" },
      draggable: false,
      selectable: true,
      deletable: false,
      zIndex: 6,
    });

    return output;
  }, [episodes, nodes, selectedFrameId]);

  const [canvasNodes, setCanvasNodes] = useState<Node[]>(flowNodes);
  // 受控 nodes：只在 store 语义变化时同步，并保留 RF 已测量的 width/height，
  // 避免「flowNodes 新引用 → setNodes → dimensions change → 再 setNodes」死循环。
  const storeNodesSig = useMemo(
    () =>
      [
        selectedFrameId ?? "",
        ...episodes.map(
          (e) =>
            `${e.id}:${e.label ?? ""}:${e.frame?.x ?? ""}:${e.frame?.y ?? ""}:${e.frame?.width ?? ""}:${e.frame?.height ?? ""}`,
        ),
        ...nodes.map((n) => {
          const d = n.data as { title?: string; options?: { id: string }[] };
          const opt = n.kind === "interaction" ? (d.options?.map((o) => o.id).join(",") ?? "") : "";
          return `${n.id}:${n.kind}:${n.position?.x ?? ""}:${n.position?.y ?? ""}:${d.title ?? ""}:${opt}`;
        }),
      ].join("|"),
    [episodes, nodes, selectedFrameId],
  );
  useEffect(() => {
    setCanvasNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return flowNodes.map((n) => {
        const old = prevById.get(n.id);
        if (!old) return n;
        return {
          ...n,
          width: old.width,
          height: old.height,
          selected: old.selected,
          position: n.position,
          data: n.data,
          style: n.style,
          zIndex: n.zIndex,
        };
      });
    });
    // storeNodesSig 变了才跑；flowNodes 闭包取最新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeNodesSig]);

  const flowEdges = useMemo<Edge[]>(() => {
    const nodeIds = new Set<string>([START_NODE_ID, ...nodes.map((n) => n.id)]);
    const mapped: Edge[] = [];

    edges.forEach((edge: StoryEdge) => {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
      const sourceNode = nodes.find((n) => n.id === edge.source);
      let sourceHandle: string | undefined;
      if (sourceNode?.kind === "interaction") {
        const valid = new Set(sourceNode.data.options.map((opt) => opt.id));
        const preferred =
          (edge.sourceHandle && valid.has(edge.sourceHandle) ? edge.sourceHandle : undefined) ??
          sourceNode.data.options.find((opt) => opt.targetNodeId === edge.target)?.id;
        // 仅在 handle 确实存在时挂 sourceHandle；否则走默认出线口，避免 RF 崩溃
        if (preferred && valid.has(preferred)) sourceHandle = preferred;
      }
      const c = edgeColor[edge.actionType ?? "default"];
      const selected = selectedEdgeIds.includes(edge.id);
      // 默认「继续」边不显示标签，避免短连线时「续…」压在目标节点缩略图上
      const actionLabel = edge.actionType
        ? edgeLabel[edge.actionType] ?? edge.label
        : edge.label && edge.label !== "继续"
          ? edge.label
          : undefined;
      mapped.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...(sourceHandle ? { sourceHandle } : {}),
        type: "straight",
        ...(actionLabel ? { label: actionLabel } : {}),
        animated: Boolean(edge.actionType),
        deletable: true,
        selected,
        interactionWidth: 24,
        markerEnd: { type: MarkerType.ArrowClosed, color: selected ? "var(--tw-accent-deep)" : c },
        style: {
          stroke: selected ? "var(--tw-accent-deep)" : c,
          strokeWidth: selected ? 3.4 : edge.actionType ? 2.8 : 2,
          strokeDasharray: edge.actionType ? undefined : "6 5",
        },
        ...(actionLabel
          ? {
              labelStyle: {
                fill: selected ? "var(--tw-accent-deep)" : "#e2e8f0",
                fontWeight: 600,
                fontSize: 12,
              },
              labelBgStyle: { fill: selected ? "#1e1b2e" : "#16141c", fillOpacity: 0.92 },
            }
          : {}),
      });
    });

    // 若没有 Start 边，自动连到第一集第一个节点（用户删过开始边后不再合成）
    const hasStartEdge = mapped.some((edge) => edge.source === START_NODE_ID);
    if (!hasStartEdge && !suppressAutoStartEdge && episodes[0]) {
      const entry = nodes
        .filter((n) => n.data.episodeId === episodes[0].id)
        .sort((a, b) => (a.position?.x ?? 0) - (b.position?.x ?? 0))[0];
      if (entry) {
        const selected = selectedEdgeIds.includes("__start_edge__");
        mapped.unshift({
          id: "__start_edge__",
          source: START_NODE_ID,
          target: entry.id,
          type: "straight",
          label: "开始",
          animated: false,
          deletable: true,
          selected,
          interactionWidth: 24,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: selected ? "var(--tw-accent-deep)" : "#94a3b8",
          },
          style: {
            stroke: selected ? "var(--tw-accent-deep)" : "#94a3b8",
            strokeWidth: selected ? 3.4 : 2,
            strokeDasharray: "6 5",
          },
          labelStyle: { fill: selected ? "var(--tw-accent-deep)" : "#e2e8f0", fontWeight: 600, fontSize: 12 },
          labelBgStyle: { fill: selected ? "#1e1b2e" : "#16141c", fillOpacity: 0.92 },
        });
      }
    }
    return mapped;
  }, [edges, nodes, episodes, suppressAutoStartEdge, selectedEdgeIds]);

  const handleConnect = (c: Connection) => {
    if (!isValidStoryConnection(c, nodes)) return;
    if (c.source && c.target && !c.target.startsWith("frame-")) {
      connectSucceeded.current = true;
      connectNodes(c.source, c.target, "继续", undefined, c.sourceHandle);
    }
  };

  const handleSelectionChange = ({ nodes: selected, edges: selectedEdges }: OnSelectionChangeParams) => {
    const eids = selectedEdges.map((edge) => edge.id);
    selectedEdgeIdsRef.current = eids;
    setSelectedEdgeIds((prev) =>
      prev.length === eids.length && prev.every((id, i) => id === eids[i]) ? prev : eids,
    );

    const ids = selected
      .map((n) => n.id)
      .filter((id) => !id.startsWith("frame-") && id !== START_NODE_ID);
    selectedIdsRef.current = ids;
    const current = useWorldBuilderStore.getState().selectedNodeId;
    if (ids.length === 1) {
      if (current !== ids[0]) selectNode(ids[0]);
      return;
    }
    // 空选不在此清空：selectionOnDrag 松手常会短暂报空选，导致工具栏/菜单「一松就关」。
    // 取消选中只走空白 onPaneClick。
  };

  const handleConnectStart: OnConnectStart = (_, params) => {
    if (
      params.handleType === "source" &&
      params.nodeId &&
      !params.nodeId.startsWith("frame-")
    ) {
      connectSession.current = {
        sourceNodeId: params.nodeId,
        sourceHandle: params.handleId,
      };
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
    // 连线松手会触发 pane click，消费掉下一次空白关闭
    markMenuGesture();
    setCtxMenu(null);
    setNodeMenu(null);
    setConnectMenu({
      x: clientX - rect.left,
      y: clientY - rect.top,
      clientX,
      clientY,
      sourceNodeId: session.sourceNodeId,
      sourceHandle: session.sourceHandle,
    });
  };
  const handleNodesChange = (changes: NodeChange[]) => {
    // 固定开始节点：忽略位移 / 删除类变更
    const safe = changes.filter((change) => {
      if (!("id" in change) || change.id !== START_NODE_ID) return true;
      if (change.type === "position" || change.type === "remove") return false;
      return true;
    });
    if (!safe.length) return;
    setCanvasNodes((cur) => applyNodeChanges(safe, cur));
  };

  // RF StoreUpdater 对回调 props 做 useEffect(setState)；引用必须跨渲染稳定
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const isValidConnection = useCallback(
    (c: Connection) => isValidStoryConnection(c, nodesRef.current),
    [],
  );
  type RfHandlers = {
    onConnectStart: OnConnectStart;
    onConnectEnd: OnConnectEnd;
    onSelectionChange: (args: OnSelectionChangeParams) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onConnect?: (c: Connection) => void;
    onNodeDragStart: (...args: Parameters<NonNullable<ComponentProps<typeof ReactFlow>["onNodeDragStart"]>>) => void;
    onNodeDrag: (...args: Parameters<NonNullable<ComponentProps<typeof ReactFlow>["onNodeDrag"]>>) => void;
    onNodeDragStop: (...args: Parameters<NonNullable<ComponentProps<typeof ReactFlow>["onNodeDragStop"]>>) => void;
    onEdgesDelete: (deleted: Edge[]) => void;
  };
  const rfHandlerRef = useRef<Partial<RfHandlers>>({});
  rfHandlerRef.current.onConnectStart = handleConnectStart;
  rfHandlerRef.current.onConnectEnd = handleConnectEnd;
  rfHandlerRef.current.onSelectionChange = handleSelectionChange;
  rfHandlerRef.current.onNodesChange = handleNodesChange;
  rfHandlerRef.current.onConnect = readOnly ? undefined : handleConnect;

  const onConnectStartStable = useCallback<OnConnectStart>((...args) => {
    rfHandlerRef.current.onConnectStart?.(...args);
  }, []);
  const onConnectEndStable = useCallback<OnConnectEnd>((...args) => {
    rfHandlerRef.current.onConnectEnd?.(...args);
  }, []);
  const onSelectionChangeStable = useCallback((args: OnSelectionChangeParams) => {
    rfHandlerRef.current.onSelectionChange?.(args);
  }, []);
  const onNodesChangeStable = useCallback((changes: NodeChange[]) => {
    rfHandlerRef.current.onNodesChange?.(changes);
  }, []);
  const onConnectStable = useCallback((c: Connection) => {
    rfHandlerRef.current.onConnect?.(c);
  }, []);
  const onNodeDragStartStable = useCallback<NonNullable<ComponentProps<typeof ReactFlow>["onNodeDragStart"]>>((...args) => {
    rfHandlerRef.current.onNodeDragStart?.(...args);
  }, []);
  const onNodeDragStable = useCallback<NonNullable<ComponentProps<typeof ReactFlow>["onNodeDrag"]>>((...args) => {
    rfHandlerRef.current.onNodeDrag?.(...args);
  }, []);
  const onNodeDragStopStable = useCallback<NonNullable<ComponentProps<typeof ReactFlow>["onNodeDragStop"]>>((...args) => {
    rfHandlerRef.current.onNodeDragStop?.(...args);
  }, []);
  const onEdgesDeleteStable = useCallback((deleted: Edge[]) => {
    rfHandlerRef.current.onEdgesDelete?.(deleted);
  }, []);
  const panOnDragSelect = useMemo(() => [1, 2] as number[], []);
  const panOnDragAll = useMemo(() => [0, 1, 2] as number[], []);
  const selectionKeyCode = useMemo(() => ["Control", "Meta"], []);
  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  rfHandlerRef.current.onEdgesDelete = (deleted) => {
    if (readOnly) return;
    deleteEdges(deleted.map((edge) => edge.id));
    clearEdgeSelection();
  };
  rfHandlerRef.current.onNodeDragStart = (_, node) => {
          if (node.id.startsWith("frame-")) framePrevPos.current[node.id] = { x: node.position.x, y: node.position.y };
        };
  rfHandlerRef.current.onNodeDrag = (_, node, nodesNow) => {
          if (readOnly) return;
          if (node.id.startsWith("frame-")) {
            const moving = frameRectFromNode(node);
            if (!moving) return;
            const others = (nodesNow ?? canvasNodes)
              .map(frameRectFromNode)
              .filter((rect): rect is NonNullable<ReturnType<typeof frameRectFromNode>> =>
                rect != null && rect.id !== node.id,
              );
            const resolved = resolveFrameOverlap(moving, others, FRAME_SNAP_GAP);
            if (resolved.x === node.position.x && resolved.y === node.position.y) return;
            setCanvasNodes((cur) =>
              cur.map((cn) =>
                cn.id === node.id ? { ...cn, position: { x: resolved.x, y: resolved.y } } : cn,
              ),
            );
            return;
          }
          if (node.id === START_NODE_ID) return;
          const storyNode = nodes.find((n) => n.id === node.id);
          if (!storyNode) return;
          const size = estimateNodeSize(storyNode);
          const flowList = nodesNow ?? canvasNodes;
          const others = storyNodeRectsFromFlow(flowList, nodes, node.id);
          const resolved = resolveNodeOverlap(
            { id: node.id, x: node.position.x, y: node.position.y, w: size.w, h: size.h },
            others,
            NODE_SNAP_GAP,
          );
          const episodeId = storyNode.data.episodeId;
          const canLeaveWrapper =
            storyNode.kind === "scene" || storyNode.kind === "interaction";
          // 可拖出：拖动中保持原框尺寸（避免框跟着缩小导致误判新建剧集）
          if (canLeaveWrapper) {
            setCanvasNodes((cur) =>
              cur.map((cn) =>
                cn.id === node.id ? { ...cn, position: { x: resolved.x, y: resolved.y } } : cn,
              ),
            );
            return;
          }
          // 结局：仍随节点紧包
          const wrapSiblings = nodes
            .filter((n) => n.data.episodeId === episodeId)
            .map((n) =>
              n.id === node.id ? ({ ...n, position: resolved } as StoryNode) : n,
            );
          const wrap = computeEpisodeWrapFrame(wrapSiblings, undefined, { tight: true });
          setCanvasNodes((cur) =>
            cur.map((cn) => {
              if (cn.id === node.id) {
                return { ...cn, position: { x: resolved.x, y: resolved.y } };
              }
              if (wrap && cn.id === `frame-${episodeId}`) {
                return {
                  ...cn,
                  position: { x: wrap.x, y: wrap.y },
                  style: { ...cn.style, width: wrap.width, height: wrap.height },
                };
              }
              return cn;
            }),
          );
        };
  rfHandlerRef.current.onNodeDragStop = (_, node) => {
          if (readOnly) return;
          if (node.id === START_NODE_ID) return;
          if (node.id.startsWith("frame-")) {
            const episodeId = node.id.replace("frame-", "");
            const prev = framePrevPos.current[node.id];
            if (!prev) return;
            const moving = frameRectFromNode(node);
            if (!moving) return;
            const others = canvasNodes
              .map(frameRectFromNode)
              .filter((rect): rect is NonNullable<ReturnType<typeof frameRectFromNode>> =>
                rect != null && rect.id !== node.id,
              );
            const snapped = resolveFrameOverlap(moving, others, FRAME_SNAP_GAP);
            const dx = snapped.x - prev.x;
            const dy = snapped.y - prev.y;
            const nextW = moving.w;
            const nextH = moving.h;
            // 持久化剧集框位置，允许空框/有内容框自由摆放
            updateEpisode(episodeId, {
              frame: { x: snapped.x, y: snapped.y, width: nextW, height: nextH },
            });
            if (dx !== 0 || dy !== 0) {
              setCanvasNodes((cur) =>
                cur.map((cn) => {
                  if (cn.id === node.id) {
                    return {
                      ...cn,
                      position: { x: snapped.x, y: snapped.y },
                      style: { ...cn.style, width: nextW, height: nextH },
                    };
                  }
                  if (cn.id.startsWith("frame-") || cn.id === START_NODE_ID) return cn;
                  const epN = nodes.find((n) => n.id === cn.id);
                  if (epN?.data.episodeId === episodeId) {
                    return { ...cn, position: { x: (cn.position.x || 0) + dx, y: (cn.position.y || 0) + dy } };
                  }
                  return cn;
                }),
              );
              const episodeNodes = nodes.filter((n) => n.data.episodeId === episodeId);
              const positions = episodeNodes.map((n) => ({
                id: n.id,
                position: { x: (n.position?.x ?? 0) + dx, y: (n.position?.y ?? 0) + dy },
              }));
              if (positions.length) useWorldBuilderStore.getState().updateNodePositions(positions);
            }
            return;
          }

          // 普通节点：挤开重叠 → 视频/交互可按落点拖进 / 拖出剧集框
          const storyNode = nodes.find((n) => n.id === node.id);
          if (!storyNode) return;
          const size = estimateNodeSize(storyNode);
          const others = storyNodeRectsFromFlow(canvasNodes, nodes, node.id);
          let nextPos = resolveNodeOverlap(
            { id: node.id, x: node.position.x, y: node.position.y, w: size.w, h: size.h },
            others,
            NODE_SNAP_GAP,
          );
          const prevEpisodeId = storyNode.data.episodeId;
          const canReparent =
            storyNode.kind === "scene" || storyNode.kind === "interaction";
          const dropEpisodeId = canReparent
            ? findEpisodeForNodeDrop(nextPos, size, canvasNodes)
            : prevEpisodeId;

          if (canReparent && !dropEpisodeId) {
            // 拖出框外 → 新建一集并收纳该节点
            const st = useWorldBuilderStore.getState();
            const newEpisodeId = st.addEpisode({
              title: `第 ${st.episodes.length + 1} 集`,
              description: "",
              label: String(st.episodes.length + 1),
            });
            updateNode(node.id, { episodeId: newEpisodeId });
            updateNodePosition(node.id, nextPos);
            setCanvasNodes((cur) =>
              cur.map((cn) => (cn.id === node.id ? { ...cn, position: nextPos } : cn)),
            );
            syncEpisodeFrameWrap(prevEpisodeId);
            syncEpisodeFrameWrap(newEpisodeId);
            selectEpisode(newEpisodeId);
            return;
          }

          if (canReparent && dropEpisodeId && dropEpisodeId !== prevEpisodeId) {
            // 拖进另一集 → 改归属；目标框随节点包住
            const targetOthers = storyNodeRectsFromFlow(canvasNodes, nodes, node.id).filter(
              (rect) => {
                const sn = nodes.find((n) => n.id === rect.id);
                return sn?.data.episodeId === dropEpisodeId;
              },
            );
            nextPos = resolveNodeOverlap(
              { id: node.id, x: nextPos.x, y: nextPos.y, w: size.w, h: size.h },
              targetOthers,
              NODE_SNAP_GAP,
            );
            setCanvasNodes((cur) =>
              cur.map((cn) => (cn.id === node.id ? { ...cn, position: nextPos } : cn)),
            );
            updateNode(node.id, { episodeId: dropEpisodeId });
            updateNodePosition(node.id, nextPos);
            syncEpisodeFrameWrap(prevEpisodeId);
            syncEpisodeFrameWrap(dropEpisodeId);
            selectEpisode(dropEpisodeId);
            return;
          }

          // 仍在原集（或结局不可换集）：挤开后落位，并持久化剧集框紧包
          const siblings = nodes
            .filter((n) => n.data.episodeId === prevEpisodeId)
            .map((n) =>
              n.id === node.id ? ({ ...n, position: nextPos } as StoryNode) : n,
            );
          const wrap = computeEpisodeWrapFrame(siblings, undefined, { tight: true });
          setCanvasNodes((cur) =>
            cur.map((cn) => {
              if (cn.id === node.id) return { ...cn, position: nextPos };
              if (wrap && cn.id === `frame-${prevEpisodeId}`) {
                return {
                  ...cn,
                  position: { x: wrap.x, y: wrap.y },
                  style: { ...cn.style, width: wrap.width, height: wrap.height },
                };
              }
              return cn;
            }),
          );
          updateNodePosition(node.id, nextPos);
          if (wrap) updateEpisode(prevEpisodeId, { frame: wrap });
        };


  return (
    <div className="relative size-full overflow-hidden bg-[#050505]">
      <ReactFlow
        nodes={canvasNodes} edges={flowEdges} nodeTypes={nodeTypes}
        minZoom={0.18} maxZoom={2}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        edgesUpdatable={false}
        edgesFocusable={!readOnly}
        elementsSelectable
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
        // Infinite-Canvas：中键/右键平移；空格或 Hand 时左键也可平移；Ctrl/Cmd+拖框选
        panOnDrag={panActive ? panOnDragAll : panOnDragSelect}
        selectionOnDrag={!panActive && mode === "select"}
        selectionMode={SelectionMode.Partial}
        selectionKeyCode={selectionKeyCode}
        multiSelectionKeyCode={selectionKeyCode}
        deleteKeyCode={null}
        connectOnClick={false}
        isValidConnection={isValidConnection}
        onConnectStart={onConnectStartStable}
        onConnectEnd={onConnectEndStable}
        onSelectionChange={onSelectionChangeStable}
        onNodesChange={onNodesChangeStable}
        onConnect={onConnectStable}
        onEdgesDelete={onEdgesDeleteStable}
        onNodeDragStart={onNodeDragStartStable}
        onNodeDrag={onNodeDragStable}
        onNodeDragStop={onNodeDragStopStable}
        onEdgeClick={
          readOnly
            ? undefined
            : (event, edge) => {
                event.stopPropagation();
                selectedEdgeIdsRef.current = [edge.id];
                setSelectedEdgeIds([edge.id]);
                selectNode(undefined);
                selectedIdsRef.current = [];
              }
        }
        onNodeDoubleClick={(_, node) => {
          if (readOnly || node.id.startsWith("frame-") || node.id === START_NODE_ID) return;
          const episodeId = (node.data as StoryNode["data"] | undefined)?.episodeId;
          if (!episodeId) return;
          selectEpisode(episodeId);
          selectNode(node.id);
          onOpenNode?.();
        }}
        onNodeClick={(_, node) => {
          if (node.id === START_NODE_ID) {
            selectNode(undefined);
            setNodeMenu(null);
            return;
          }
          if (node.id.startsWith("frame-")) {
            const episodeId = node.id.replace("frame-", "");
            selectEpisode(episodeId);
            selectNode(undefined);
            setNodeMenu(null);
            setSelectedFrameId(node.id);
            clearEdgeSelection();
            return;
          }
          selectEpisode((node.data as StoryNode["data"]).episodeId);
          selectNode(node.id);
          setSelectedFrameId(null);
          clearEdgeSelection();
          // 左键只选中 + 悬浮工具栏；右键才出 NodeActionMenu，避免两套菜单重叠
          if (!readOnly) {
            setConnectMenu(null);
            setCtxMenu(null);
            setNodeMenu(null);
          }
        }}
        onPaneClick={(event) => {
          // 打开菜单 / 连线松手附带的那一次 pane click 直接吞掉
          if (skipNextPaneClickRef.current) {
            skipNextPaneClickRef.current = false;
            return;
          }
          const target = event.target as HTMLElement | null;
          // 点到节点/菜单/连线时不关（部分版本会误触 pane click）
          if (
            target?.closest(".react-flow__node") ||
            target?.closest(".react-flow__edge") ||
            target?.closest("[data-ctx-menu]") ||
            target?.closest(".react-flow__panel") ||
            target?.closest(".react-flow__minimap")
          ) {
            return;
          }
          dismissAllMenus();
          clearEdgeSelection();
          setSelectedFrameId(null);
          selectNode(undefined);
        }}
        proOptions={proOptions}
      >
        <Background color="rgba(255,255,255,0.1)" gap={18} size={1} />
        <InitialFitOnce />
        <CanvasFocusResponder />
        <CanvasControls
          mode={mode}
          setMode={setMode}
          onAutoLayout={autoLayoutEpisodes}
          readOnly={readOnly}
          zoomPreviewRef={zoomPreviewRef}
        />
        {!readOnly && (
          <CanvasInteractions
            onOpenNode={onOpenNode}
            selectedIdsRef={selectedIdsRef}
            selectedEdgeIdsRef={selectedEdgeIdsRef}
            onClearEdgeSelection={clearEdgeSelection}
            onDropActiveChange={setDropActive}
            spacePan={spacePan}
            setSpacePan={setSpacePan}
            zoomPreviewRef={zoomPreviewRef}
            menuPlaceRef={menuPlaceRef}
            ctxMenu={ctxMenu}
            setCtxMenu={setCtxMenu}
            nodeMenu={nodeMenu}
            setNodeMenu={setNodeMenu}
            markMenuGesture={markMenuGesture}
            dismissAllMenus={dismissAllMenus}
          />
        )}
        {!readOnly && (
          <ConnectionDropMenu
            connectMenu={connectMenu}
            onClose={() => setConnectMenu(null)}
          />
        )}
        {!readOnly && !nodeMenu && (
          <NodeFloatingToolbar
            onOpenNode={() => {
              setNodeMenu(null);
              setCtxMenu(null);
              onOpenNode?.();
            }}
          />
        )}
      </ReactFlow>
      {dropActive && (
        <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-accent/10 backdrop-blur-[1px]">
          <div className="rounded-2xl border border-white/[0.06] bg-[#141414]/95 px-6 py-4 text-sm font-medium text-white shadow-soft backdrop-blur-md">
            拖放素材到故事图 · 松手后按落点归属剧集
          </div>
        </div>
      )}
      {!readOnly && <GenerationTaskBar />}
    </div>
  );
}

/* === CanvasInteractions: menus + drop + shortcuts（对齐 Infinite-Canvas） === */
function CanvasInteractions({
  onOpenNode,
  selectedIdsRef,
  selectedEdgeIdsRef,
  onClearEdgeSelection,
  onDropActiveChange,
  spacePan,
  setSpacePan,
  zoomPreviewRef,
  menuPlaceRef,
  ctxMenu,
  setCtxMenu,
  nodeMenu,
  setNodeMenu,
  markMenuGesture,
  dismissAllMenus,
}: {
  onOpenNode?: () => void;
  selectedIdsRef: MutableRefObject<string[]>;
  selectedEdgeIdsRef: MutableRefObject<string[]>;
  onClearEdgeSelection: () => void;
  onDropActiveChange: (active: boolean) => void;
  spacePan: boolean;
  setSpacePan: (v: boolean) => void;
  zoomPreviewRef: MutableRefObject<{ active: boolean; viewport?: Viewport }>;
  menuPlaceRef: MutableRefObject<{ x: number; y: number }>;
  ctxMenu: {
    x: number;
    y: number;
    flowX: number;
    flowY: number;
    variant: NewNodeMenuVariant;
    episodeId?: string;
  } | null;
  setCtxMenu: Dispatch<
    SetStateAction<{
      x: number;
      y: number;
      flowX: number;
      flowY: number;
      variant: NewNodeMenuVariant;
      episodeId?: string;
    } | null>
  >;
  nodeMenu: { x: number; y: number; nodeId: string } | null;
  setNodeMenu: Dispatch<SetStateAction<{ x: number; y: number; nodeId: string } | null>>;
  markMenuGesture: () => void;
  dismissAllMenus: () => void;
}) {
  const { selectNode, deleteEdges } = useWorldBuilderStore();
  const flow = useReactFlow();
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const dropActiveRef = useRef(false);
  const clipboardRef = useRef<{
    items: Array<{ nodeId: string; offsetX: number; offsetY: number }>;
    edges: StoryEdge[];
  }>({ items: [], edges: [] });

  useEffect(() => {
    const el = document.querySelector(".react-flow__pane") as HTMLElement | null;
    if (!el) return;
    const rf = () => flowRef.current;

    const openCreateMenu = (clientX: number, clientY: number) => {
      const pos = rf().screenToFlowPosition({ x: clientX, y: clientY });
      menuPlaceRef.current = pos;
      const episodeId = findEpisodeAtFlowPoint(pos, rf().getNodes());
      const variant: NewNodeMenuVariant = episodeId ? "frame" : "canvas";
      if (episodeId) useWorldBuilderStore.getState().selectEpisode(episodeId);
      markMenuGesture();
      setNodeMenu(null);
      setCtxMenu({
        x: clientX,
        y: clientY,
        flowX: pos.x,
        flowY: pos.y,
        variant,
        episodeId,
      });
    };

    /* Right-click：节点 → 操作菜单；空白 → 创建菜单 */
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(".react-flow__controls") ||
        target.closest(".react-flow__minimap") ||
        target.closest("[data-ctx-menu]")
      ) {
        return;
      }

      e.preventDefault();
      const pos = rf().screenToFlowPosition({ x: e.clientX, y: e.clientY });
      menuPlaceRef.current = pos;

      const nodeEl = target.closest(".react-flow__node") as HTMLElement | null;
      const nodeId = nodeEl?.getAttribute("data-id");
      if (nodeId && !nodeId.startsWith("frame-") && nodeId !== START_NODE_ID) {
        selectNode(nodeId);
        markMenuGesture();
        setCtxMenu(null);
        setNodeMenu({
          x: e.clientX,
          y: e.clientY,
          nodeId,
        });
        return;
      }

      openCreateMenu(e.clientX, e.clientY);
    };

    /* Double-click on pane → menu */
    const onDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeEl = target.closest(".react-flow__node") as HTMLElement | null;
      const nodeId = nodeEl?.getAttribute("data-id");
      if (nodeId && !nodeId.startsWith("frame-") && nodeId !== START_NODE_ID) {
        return;
      }
      openCreateMenu(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      menuPlaceRef.current = rf().screenToFlowPosition({ x: e.clientX, y: e.clientY });
    };

    /* Drop overlay + 落点归属 */
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      dropActiveRef.current = true;
      onDropActiveChange(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.target === el) {
        dropActiveRef.current = false;
        onDropActiveChange(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dropActiveRef.current = false;
      onDropActiveChange(false);
      const raw =
        e.dataTransfer?.getData("application/drama-asset") ||
        e.dataTransfer?.getData("text/plain");
      if (!raw) return;
      try {
        const asset = (JSON.parse(raw.startsWith("{") ? raw : "{}") as {
          kind?: string;
          title?: string;
          prompt?: string;
          instruction?: string;
          videoUrl?: string;
          poster?: string;
          referenceImage?: string;
          nodeId?: string;
        });
        if (!asset.kind && !asset.title) return;
        const pos = rf().screenToFlowPosition({ x: e.clientX, y: e.clientY });
        menuPlaceRef.current = pos;
        const st = useWorldBuilderStore.getState();
        const dropEpisodeId =
          findEpisodeAtFlowPoint(pos, rf().getNodes()) ?? st.selectedEpisodeId ?? st.episodes[0]?.id;
        if (dropEpisodeId) st.selectEpisode(dropEpisodeId);

        // 已有节点：移动位置 + 改归属
        if (asset.nodeId) {
          const existing = st.nodes.find((n) => n.id === asset.nodeId);
          if (existing) {
            st.updateNodePosition(asset.nodeId, pos);
            if (dropEpisodeId && existing.data.episodeId !== dropEpisodeId) {
              st.updateNode(asset.nodeId, { episodeId: dropEpisodeId });
            }
            st.selectNode(asset.nodeId);
            return;
          }
        }

        const kind = asset.kind ?? "video";
        if (kind === "interaction") {
          st.addInteractionNode(dropEpisodeId);
          setTimeout(() => {
            const updated = useWorldBuilderStore.getState().nodes;
            const latest = updated[updated.length - 1];
            if (!latest) return;
            useWorldBuilderStore.getState().updateNodePosition(latest.id, pos);
            useWorldBuilderStore.getState().updateNode(latest.id, {
              title: asset.title ?? "未命名互动节点",
              instruction: asset.instruction ?? asset.prompt ?? "",
            });
          }, 50);
          return;
        }

        st.addSceneNode(dropEpisodeId);
        setTimeout(() => {
          const updated = useWorldBuilderStore.getState().nodes;
          const latest = updated[updated.length - 1];
          if (!latest) return;
          const isChar = kind === "character";
          const isLoc = kind === "location";
          useWorldBuilderStore.getState().updateNodePosition(latest.id, pos);
          useWorldBuilderStore.getState().updateNode(latest.id, {
            title:
              asset.title ??
              (isChar ? "角色场景" : isLoc ? "地点场景" : "新视频节点"),
            prompt:
              asset.prompt ??
              (isChar
                ? `以角色「${asset.title}」为主角的场景`
                : isLoc
                  ? `场景地点「${asset.title}」`
                  : asset.title ?? ""),
            videoUrl: asset.videoUrl,
            firstFrameRef: asset.poster ?? asset.referenceImage,
            status: asset.videoUrl
              ? "ready"
              : asset.referenceImage || asset.poster
                ? "draft"
                : "empty",
          });
        }, 50);
      } catch { /* */ }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.key === "Escape") {
        dismissAllMenus();
        return;
      }

      // Space：按住临时平移（松开恢复）
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setSpacePan(true);
      }

      // Z：全局预览（fit all）切换
      if (e.key === "z" || e.key === "Z") {
        if (e.ctrlKey || e.metaKey) {
          // handled below as undo/redo
        } else {
          e.preventDefault();
          if (zoomPreviewRef.current.active && zoomPreviewRef.current.viewport) {
            rf().setViewport(zoomPreviewRef.current.viewport, { duration: 260 });
            zoomPreviewRef.current = { active: false };
          } else {
            zoomPreviewRef.current = { active: true, viewport: rf().getViewport() };
            rf().fitView({ padding: 0.16, duration: 280 });
          }
          return;
        }
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const st = useWorldBuilderStore.getState();
        const edgeIds = selectedEdgeIdsRef.current;
        const ids = (
          selectedIdsRef.current.length > 0
            ? selectedIdsRef.current
            : st.selectedNodeId
              ? [st.selectedNodeId]
              : []
        ).filter((id) => id !== START_NODE_ID && !id.startsWith("frame-"));
        if (!edgeIds.length && !ids.length) return;
        e.preventDefault();
        // 边与节点可同时删除，避免框选后只删边的竞态
        if (edgeIds.length) {
          deleteEdges(edgeIds);
          onClearEdgeSelection();
        }
        if (ids.length) {
          ids.forEach((id) => st.deleteNode(id));
          selectedIdsRef.current = [];
          selectNode(undefined);
        }
      }

      // Ctrl/Cmd+C 复制选中（含内部边）
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const st = useWorldBuilderStore.getState();
        const ids =
          selectedIdsRef.current.length > 0
            ? selectedIdsRef.current
            : st.selectedNodeId
              ? [st.selectedNodeId]
              : [];
        const selected = st.nodes.filter((n) => ids.includes(n.id));
        if (!selected.length) return;
        e.preventDefault();
        const idSet = new Set(ids);
        const minX = Math.min(...selected.map((n) => n.position?.x ?? 0));
        const minY = Math.min(...selected.map((n) => n.position?.y ?? 0));
        clipboardRef.current = {
          items: selected.map((n) => ({
            nodeId: n.id,
            offsetX: (n.position?.x ?? 0) - minX,
            offsetY: (n.position?.y ?? 0) - minY,
          })),
          edges: st.edges.filter((edge) => idSet.has(edge.source) && idSet.has(edge.target)),
        };
      }

      // Ctrl/Cmd+V 粘贴到指针附近
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (!clipboardRef.current.items.length) return;
        e.preventDefault();
        const st = useWorldBuilderStore.getState();
        const base = menuPlaceRef.current;
        st.pushHistory();
        const idMap = new Map<string, string>();
        clipboardRef.current.items.forEach((item) => {
          if (!st.nodes.some((n) => n.id === item.nodeId)) return;
          useWorldBuilderStore.getState().duplicateNode(item.nodeId);
          const createdId = useWorldBuilderStore.getState().selectedNodeId;
          if (!createdId) return;
          idMap.set(item.nodeId, createdId);
          useWorldBuilderStore.getState().updateNodePosition(createdId, {
            x: base.x + item.offsetX,
            y: base.y + item.offsetY,
          });
        });
        clipboardRef.current.edges.forEach((edge) => {
          const s = idMap.get(edge.source);
          const t = idMap.get(edge.target);
          if (s && t) {
            useWorldBuilderStore.getState().connectNodes(s, t, edge.label, edge.actionType, edge.sourceHandle);
          }
        });
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useWorldBuilderStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        useWorldBuilderStore.getState().redo();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePan(false);
      }
    };

    el.addEventListener("contextmenu", onContextMenu);
    el.addEventListener("dblclick", onDblClick);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      el.removeEventListener("contextmenu", onContextMenu);
      el.removeEventListener("dblclick", onDblClick);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      if (dropActiveRef.current) {
        dropActiveRef.current = false;
        onDropActiveChange(false);
      }
    };
  }, [
    selectNode,
    onDropActiveChange,
    setSpacePan,
    selectedIdsRef,
    zoomPreviewRef,
    menuPlaceRef,
    setCtxMenu,
    setNodeMenu,
    markMenuGesture,
    dismissAllMenus,
    selectedEdgeIdsRef,
    onClearEdgeSelection,
    deleteEdges,
  ]);

  const createNodeAtMenu = (kind: NewNodeKind) => {
    const st = useWorldBuilderStore.getState();
    const pos = menuPlaceRef.current;
    const episodeId = ctxMenu?.episodeId ?? st.selectedEpisodeId;
    setCtxMenu(null);

    if (kind === "episode") {
      const title = `第 ${st.episodes.length + 1} 集`;
      st.addEpisode({ title, description: "", label: String(st.episodes.length + 1) });
      // 在落点创建占位视频，让剧集框出现在鼠标位置
      setTimeout(() => {
        const latest = useWorldBuilderStore.getState();
        const ep = latest.episodes[latest.episodes.length - 1];
        if (!ep) return;
        latest.selectEpisode(ep.id);
        latest.addSceneNode(ep.id);
        setTimeout(() => {
          const nodesNow = useWorldBuilderStore.getState().nodes;
          const scene = nodesNow[nodesNow.length - 1];
          if (!scene) return;
          useWorldBuilderStore.getState().updateNodePosition(scene.id, {
            x: pos.x + FRAME_PAD_X,
            y: pos.y + FRAME_PAD_Y_TOP,
          });
        }, 40);
      }, 40);
      return;
    }

    const placeLatestNode = (patch?: Record<string, unknown>) => {
      setTimeout(() => {
        const updated = useWorldBuilderStore.getState().nodes;
        const latest = updated[updated.length - 1];
        if (!latest) return;
        useWorldBuilderStore.getState().updateNodePosition(latest.id, pos);
        if (patch) useWorldBuilderStore.getState().updateNode(latest.id, patch);
      }, 50);
    };

    if (kind === "highlight") {
      // 框外 Highlight：新建剧集 + 高光片段
      if (!episodeId) {
        st.addEpisode({
          title: `高光 ${st.episodes.length + 1}`,
          description: "",
          label: `${st.episodes.length + 1}`,
        });
        setTimeout(() => {
          const latest = useWorldBuilderStore.getState();
          const ep = latest.episodes[latest.episodes.length - 1];
          if (!ep) return;
          latest.selectEpisode(ep.id);
          latest.addSceneNode(ep.id);
          setTimeout(() => {
            const nodesNow = useWorldBuilderStore.getState().nodes;
            const scene = nodesNow[nodesNow.length - 1];
            if (!scene) return;
            useWorldBuilderStore.getState().updateNodePosition(scene.id, {
              x: pos.x + FRAME_PAD_X,
              y: pos.y + FRAME_PAD_Y_TOP,
            });
            useWorldBuilderStore.getState().updateNode(scene.id, {
              title: "高光片段",
              prompt: "本集高光片段。",
              clipKind: "highlight",
            });
          }, 40);
        }, 40);
        return;
      }
      st.selectEpisode(episodeId);
      st.addSceneNode(episodeId);
      placeLatestNode({
        title: "高光片段",
        prompt: "本集高光片段。",
        clipKind: "highlight",
      });
      return;
    }

    if (kind === "scene") {
      if (episodeId) st.selectEpisode(episodeId);
      st.addSceneNode(episodeId);
      placeLatestNode({ clipKind: "scene" });
      return;
    }

    if (kind === "interaction") {
      if (episodeId) st.selectEpisode(episodeId);
      st.addInteractionNode(episodeId);
      placeLatestNode();
      return;
    }

    st.addEndingNode(episodeId);
    placeLatestNode();
  };

  const handleNodeAction = (action: NodeAction) => {
    if (!nodeMenu) return;
    const st = useWorldBuilderStore.getState();
    const nodeId = nodeMenu.nodeId;
    const source = st.nodes.find((n) => n.id === nodeId);
    setNodeMenu(null);
    if (!source) return;

    if (action === "edit") {
      selectNode(nodeId);
      setCtxMenu(null);
      onOpenNode?.();
      return;
    }
    if (action === "duplicate") {
      st.duplicateNode(nodeId);
      return;
    }
    if (action === "delete") {
      st.deleteNode(nodeId);
      selectNode(undefined);
      return;
    }

    const pos = {
      x: (source.position?.x ?? 0) + 360,
      y: source.position?.y ?? 0,
    };
    const episodeId = source.data.episodeId;
    st.selectEpisode(episodeId);
    if (action === "add-scene") st.addSceneNode(episodeId);
    else if (action === "add-interaction") st.addInteractionNode(episodeId);
    else st.addEndingNode(episodeId);

    setTimeout(() => {
      const latest = useWorldBuilderStore.getState().nodes.at(-1);
      if (!latest) return;
      useWorldBuilderStore.getState().updateNodePosition(latest.id, pos);
      useWorldBuilderStore.getState().connectNodes(nodeId, latest.id, "继续");
    }, 40);
  };

  const menuLayer =
    typeof document === "undefined"
      ? null
      : createPortal(
          <>
            {ctxMenu && (
              <NewNodeMenu
                x={ctxMenu.x}
                y={ctxMenu.y}
                variant={ctxMenu.variant}
                onPick={createNodeAtMenu}
                onCancel={() => setCtxMenu(null)}
              />
            )}
            {nodeMenu && (
              <NodeActionMenu
                x={nodeMenu.x}
                y={nodeMenu.y}
                onPick={handleNodeAction}
                onCancel={() => setNodeMenu(null)}
              />
            )}
          </>,
          document.body,
        );

  return menuLayer;
}

function ConnectionDropMenu({
  connectMenu,
  onClose,
}: {
  connectMenu: {
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    sourceNodeId: string;
    sourceHandle?: string | null;
  } | null;
  onClose: () => void;
}) {
  const flow = useReactFlow();
  const createConnectedNode = useWorldBuilderStore((state) => state.createConnectedNode);
  const connectNodes = useWorldBuilderStore((state) => state.connectNodes);

  if (!connectMenu) return null;

  const dropFlow = flow.screenToFlowPosition({
    x: connectMenu.clientX,
    y: connectMenu.clientY,
  });
  const episodeId = findEpisodeAtFlowPoint(dropFlow, flow.getNodes());
  const variant: NewNodeMenuVariant = episodeId ? "frame" : "canvas";

  const handlePick = (kind: NewNodeKind) => {
    const position = { x: dropFlow.x, y: dropFlow.y - 40 };

    if (kind === "episode" || (kind === "highlight" && !episodeId)) {
      const st = useWorldBuilderStore.getState();
      const title =
        kind === "highlight"
          ? `高光 ${st.episodes.length + 1}`
          : `第 ${st.episodes.length + 1} 集`;
      st.addEpisode({ title, description: "", label: String(st.episodes.length + 1) });
      setTimeout(() => {
        const latest = useWorldBuilderStore.getState();
        const ep = latest.episodes[latest.episodes.length - 1];
        if (!ep) return;
        latest.selectEpisode(ep.id);
        latest.addSceneNode(ep.id);
        setTimeout(() => {
          const nodesNow = useWorldBuilderStore.getState().nodes;
          const scene = nodesNow[nodesNow.length - 1];
          if (!scene) return;
          useWorldBuilderStore.getState().updateNodePosition(scene.id, {
            x: position.x + FRAME_PAD_X,
            y: position.y + FRAME_PAD_Y_TOP,
          });
          if (kind === "highlight") {
            useWorldBuilderStore.getState().updateNode(scene.id, {
              title: "高光片段",
              clipKind: "highlight",
            });
          }
          connectNodes(
            connectMenu.sourceNodeId,
            scene.id,
            kind === "highlight" ? "高光" : "继续",
            undefined,
            connectMenu.sourceHandle,
          );
        }, 40);
      }, 40);
      onClose();
      return;
    }

    if (episodeId) {
      useWorldBuilderStore.getState().selectEpisode(episodeId);
    }

    const nodeKind = kind === "interaction" ? "interaction" : "scene";
    const newId = createConnectedNode(
      connectMenu.sourceNodeId,
      nodeKind,
      position,
      connectMenu.sourceHandle,
    );
    if (newId && kind === "highlight") {
      useWorldBuilderStore.getState().updateNode(newId, {
        title: "高光片段",
        clipKind: "highlight",
      });
    }
    onClose();
  };

  return createPortal(
    <NewNodeMenu
      x={connectMenu.clientX}
      y={connectMenu.clientY}
      variant={variant}
      onPick={handlePick}
      onCancel={onClose}
    />,
    document.body,
  );
}

/* === 首次进入以「开始」节点为画布中心 === */
function InitialFitOnce() {
  const flow = useReactFlow();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const t = window.setTimeout(() => {
      centerOnStartNode(flow, { zoom: 0.85, duration: 280 });
    }, 80);
    return () => window.clearTimeout(t);
  }, [flow]);
  return null;
}

/* === 大纲/列表请求画布定位 === */
function CanvasFocusResponder() {
  const flow = useReactFlow();
  const canvasFocusRequest = useWorldBuilderStore((s) => s.canvasFocusRequest);
  const lastNonce = useRef(0);

  useEffect(() => {
    const { kind, id, nonce } = canvasFocusRequest;
    if (!id || nonce === 0 || nonce === lastNonce.current) return;
    lastNonce.current = nonce;

    if (kind === "node") {
      const node = flow.getNodes().find((n) => n.id === id);
      if (!node) return;
      const size = estimateNodeSize({
        kind: (node.type as StoryNode["kind"]) || "scene",
        data: node.data as StoryNode["data"],
      });
      flow.setCenter(node.position.x + size.w / 2, node.position.y + size.h / 2, {
        zoom: Math.max(flow.getZoom(), 0.75),
        duration: 380,
      });
      return;
    }

    const frameNode = flow.getNodes().find((n) => n.id === `frame-${id}`);
    if (!frameNode) return;
    const w = Number(frameNode.style?.width) || 800;
    const h = Number(frameNode.style?.height) || 600;
    flow.setCenter(frameNode.position.x + w / 2, frameNode.position.y + h / 2, {
      zoom: 0.68,
      duration: 420,
    });
  }, [flow, canvasFocusRequest]);

  return null;
}

/* === CanvasControls：工具条 + 右侧小地图（缩小 1/3，可隐藏） === */
function CanvasControls({
  mode,
  setMode,
  onAutoLayout,
  readOnly = false,
  zoomPreviewRef,
}: {
  mode: "select" | "pan";
  setMode: (m: "select" | "pan") => void;
  onAutoLayout: () => void;
  readOnly?: boolean;
  zoomPreviewRef: MutableRefObject<{ active: boolean; viewport?: Viewport }>;
}) {
  const flow = useReactFlow();
  const vp = useViewport();
  const zp = Math.round(vp.zoom * 100);
  const [showMinimap, setShowMinimap] = useState(true);

  const toggleZoomPreview = () => {
    if (zoomPreviewRef.current.active && zoomPreviewRef.current.viewport) {
      flow.setViewport(zoomPreviewRef.current.viewport, { duration: 260 });
      zoomPreviewRef.current = { active: false };
      return;
    }
    zoomPreviewRef.current = { active: true, viewport: flow.getViewport() };
    flow.fitView({ padding: 0.16, duration: 280 });
  };

  return (
    <Panel position="bottom-left" className="!m-5">
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-[#141414]/90 p-1 shadow-soft backdrop-blur-md">
          <button onClick={() => setMode("select")} title="选择 · Ctrl/Cmd 多选框选" className={cn("btn-press grid size-9 place-items-center rounded-full text-white/65 transition-colors duration-press ease-de-out hover:bg-white/10", mode === "select" && "bg-white/12 text-white")}><MousePointer2 size={17} /></button>
          <button onClick={() => setMode("pan")} title="拖动 · 空格临时平移" className={cn("btn-press grid size-9 place-items-center rounded-full text-white/65 transition-colors duration-press ease-de-out hover:bg-white/10", mode === "pan" && "bg-white/12 text-white")}><Hand size={17} /></button>
          <span className="mx-1 h-6 w-px bg-white/15" />
          <button onClick={() => flow.zoomOut({ duration: 180 })} className="btn-press grid size-9 place-items-center rounded-full text-white/65 hover:bg-white/10"><Minus size={17} /></button>
          <button onClick={() => centerOnStartNode(flow, { zoom: 1, duration: 220 })} className="min-w-14 rounded-full px-2 py-2 text-sm font-semibold text-white/80">{zp}%</button>
          <button onClick={() => flow.zoomIn({ duration: 180 })} className="btn-press grid size-9 place-items-center rounded-full text-white/65 hover:bg-white/10"><Plus size={17} /></button>
          <span className="mx-1 h-6 w-px bg-white/15" />
          <button onClick={toggleZoomPreview} title="全局预览 (Z)" className="btn-press grid size-9 place-items-center rounded-full text-white/65 hover:bg-white/10"><Maximize2 size={16} /></button>
          {!readOnly && (
            <button
              type="button"
              title="整理已连接节点与剧集框，拉直连线"
              onClick={() => {
                onAutoLayout();
                window.setTimeout(() => {
                  flow.fitView({ padding: 0.18, duration: 320 });
                }, 40);
              }}
              className="btn-press grid size-9 place-items-center rounded-full text-white/65 hover:bg-white/10"
            >
              <LayoutGrid size={16} />
            </button>
          )}
          <button
            type="button"
            title="回到开始节点"
            onClick={() => centerOnStartNode(flow, { zoom: 1, duration: 220 })}
            className="btn-press grid size-9 place-items-center rounded-full text-white/65 hover:bg-white/10"
          >
            <RotateCcw size={16} />
          </button>
          <span className="mx-1 h-6 w-px bg-white/15" />
          <button
            type="button"
            onClick={() => setShowMinimap((v) => !v)}
            title={showMinimap ? "隐藏小地图" : "显示小地图"}
            className={cn(
              "btn-press grid size-9 place-items-center rounded-full text-white/65 hover:bg-white/10",
              showMinimap && "bg-white/12 text-white",
            )}
          >
            <MapIcon size={16} />
          </button>
        </div>
        {showMinimap && (
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#141414]/90 shadow-soft backdrop-blur-md">
            <MiniMap
              pannable
              zoomable
              nodeStrokeWidth={2}
              style={{ width: 120, height: 75 }}
              className="!static !m-0 !h-[75px] !w-[120px] !bg-transparent"
            />
          </div>
        )}
      </div>
    </Panel>
  );
}
