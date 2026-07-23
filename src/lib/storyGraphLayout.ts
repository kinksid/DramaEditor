import type { Connection, Node } from "reactflow";
import type { Episode, EpisodeFrameRect, StoryEdge, StoryNode } from "@/types/worldBuilder";

export const FRAME_SNAP_GAP = 48;
/** 节点之间最小缝隙（拖放后挤开） */
export const NODE_SNAP_GAP = 32;
export const NODE_W = 280;
/** Scene：280×(16/9) 预览区 ≈498 + 底部文案区 ≈110 */
export const SCENE_NODE_H = 620;
export const INTERACTION_NODE_BASE_H = 200;
export const INTERACTION_OPTION_H = 40;
export const ENDING_NODE_H = 220;
/** 兼容旧引用：按最高的 scene 估算 */
export const NODE_H = SCENE_NODE_H;
export const FRAME_PAD_X = 96;
export const FRAME_PAD_Y_TOP = 108;
export const FRAME_PAD_Y_BOTTOM = 80;
/** @deprecated 使用上下分开的 padding */
export const FRAME_PAD_Y = FRAME_PAD_Y_TOP;

export type FrameRect = {
  id: string;
  episodeId: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export function estimateNodeSize(node: Pick<StoryNode, "kind" | "data">): { w: number; h: number } {
  if (node.kind === "scene") return { w: NODE_W, h: SCENE_NODE_H };
  if (node.kind === "ending") return { w: 260, h: ENDING_NODE_H };
  const optionCount = Math.max(
    (node.data as { options?: unknown[] }).options?.length ?? 0,
    1,
  );
  return {
    w: NODE_W,
    h: INTERACTION_NODE_BASE_H + optionCount * INTERACTION_OPTION_H,
  };
}

export function frameRectFromNode(node: Node): FrameRect | null {
  if (!node.id.startsWith("frame-")) return null;
  return {
    id: node.id,
    episodeId: node.id.replace("frame-", ""),
    x: node.position.x,
    y: node.position.y,
    w: Number(node.style?.width) || 1160,
    h: Number(node.style?.height) || 720,
  };
}

/** 点是否落在某个剧集框内（取面积最小的包含框） */
export function findEpisodeAtFlowPoint(
  flowPos: { x: number; y: number },
  nodes: Node[],
): string | undefined {
  let best: { episodeId: string; area: number } | undefined;
  for (const node of nodes) {
    const rect = frameRectFromNode(node);
    if (!rect) continue;
    if (
      flowPos.x >= rect.x &&
      flowPos.x <= rect.x + rect.w &&
      flowPos.y >= rect.y &&
      flowPos.y <= rect.y + rect.h
    ) {
      const area = rect.w * rect.h;
      if (!best || area < best.area) best = { episodeId: rect.episodeId, area };
    }
  }
  return best?.episodeId;
}

/** 用节点中心点判断落在哪个剧集框（拖进/拖出归属） */
export function findEpisodeForNodeDrop(
  nodePos: { x: number; y: number },
  nodeSize: { w: number; h: number },
  nodes: Node[],
): string | undefined {
  return findEpisodeAtFlowPoint(
    {
      x: nodePos.x + nodeSize.w / 2,
      y: nodePos.y + nodeSize.h / 2,
    },
    nodes,
  );
}

/** 故事图连线合法性（对齐 Infinite-Canvas canConnect 思路） */
export function isValidStoryConnection(
  connection: Connection,
  storyNodes: StoryNode[],
): boolean {
  const { source, target } = connection;
  if (!source || !target) return false;
  if (source === target) return false;
  if (target.startsWith("frame-") || target === "__start__") return false;
  if (source.startsWith("frame-")) return false;

  if (source === "__start__") {
    const targetNode = storyNodes.find((n) => n.id === target);
    return targetNode?.kind === "scene" || targetNode?.kind === "interaction";
  }

  const sourceNode = storyNodes.find((n) => n.id === source);
  const targetNode = storyNodes.find((n) => n.id === target);
  if (!sourceNode || !targetNode) return false;
  if (sourceNode.kind === "ending") return false;
  return (
    targetNode.kind === "scene" ||
    targetNode.kind === "interaction" ||
    targetNode.kind === "ending"
  );
}

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  gap: number,
) {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

export type NodeRect = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function pushApart(
  self: { x: number; y: number; w: number; h: number },
  other: { x: number; y: number; w: number; h: number },
  gap: number,
): { x: number; y: number } {
  const selfCx = self.x + self.w / 2;
  const selfCy = self.y + self.h / 2;
  const otherCx = other.x + other.w / 2;
  const otherCy = other.y + other.h / 2;
  const dx = selfCx - otherCx;
  const dy = selfCy - otherCy;

  // 按重叠深度选轴：沿更浅方向挤开（大 Scene 盖住矮 Interaction 时优先左右让开）
  const overlapX =
    Math.min(self.x + self.w, other.x + other.w) - Math.max(self.x, other.x);
  const overlapY =
    Math.min(self.y + self.h, other.y + other.h) - Math.max(self.y, other.y);
  const preferX =
    overlapX > 0 && overlapY > 0 ? overlapX <= overlapY : Math.abs(dx) >= Math.abs(dy);

  if (preferX) {
    const dir = dx === 0 ? (self.x >= other.x ? 1 : -1) : dx > 0 ? 1 : -1;
    return {
      x: dir >= 0 ? other.x + other.w + gap : other.x - self.w - gap,
      y: self.y,
    };
  }
  const dir = dy === 0 ? (self.y >= other.y ? 1 : -1) : dy > 0 ? 1 : -1;
  return {
    x: self.x,
    y: dir >= 0 ? other.y + other.h + gap : other.y - self.h - gap,
  };
}

/** 将拖动中的剧集框从重叠中挤开，保留缝隙 */
export function resolveFrameOverlap(
  moving: FrameRect,
  others: FrameRect[],
  gap = FRAME_SNAP_GAP,
): { x: number; y: number } {
  let { x, y } = moving;
  const self = { ...moving, x, y };

  for (const other of others) {
    if (!overlaps(self, other, gap)) continue;
    const next = pushApart(self, other, gap);
    x = next.x;
    y = next.y;
    self.x = x;
    self.y = y;
  }

  return { x, y };
}

/** 将故事节点从重叠中挤开，保留缝隙（多轮，处理链式碰撞） */
export function resolveNodeOverlap(
  moving: NodeRect,
  others: NodeRect[],
  gap = NODE_SNAP_GAP,
  passes = 10,
): { x: number; y: number } {
  let { x, y } = moving;

  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    const self = { ...moving, x, y };
    for (const other of others) {
      if (other.id === moving.id) continue;
      if (!overlaps(self, other, gap)) continue;
      const next = pushApart(self, other, gap);
      if (next.x !== x || next.y !== y) {
        x = next.x;
        y = next.y;
        self.x = x;
        self.y = y;
        moved = true;
      }
    }
    if (!moved) break;
  }

  return { x, y };
}

/** 从 React Flow 节点列表收集可碰撞的故事节点矩形 */
export function storyNodeRectsFromFlow(
  flowNodes: Node[],
  storyNodes: StoryNode[],
  excludeId?: string,
): NodeRect[] {
  const byId = new Map(storyNodes.map((n) => [n.id, n]));
  const rects: NodeRect[] = [];
  for (const cn of flowNodes) {
    if (cn.id === excludeId || cn.id.startsWith("frame-") || cn.id === "__start__") continue;
    const sn = byId.get(cn.id);
    if (!sn) continue;
    const size = estimateNodeSize(sn);
    rects.push({
      id: cn.id,
      x: cn.position.x,
      y: cn.position.y,
      w: size.w,
      h: size.h,
    });
  }
  return rects;
}

/**
 * 根据子节点包围盒计算剧集框；若已有 frame 则取并集（至少包住节点，可保留用户放大）。
 * tight=true 时始终紧贴节点（拖动节点后跟随）。
 */
export function computeEpisodeWrapFrame(
  episodeNodes: StoryNode[],
  existing?: EpisodeFrameRect,
  options?: { tight?: boolean; minW?: number; minH?: number },
): EpisodeFrameRect | null {
  const minW = options?.minW ?? 640;
  const minH = options?.minH ?? SCENE_NODE_H + FRAME_PAD_Y_TOP + FRAME_PAD_Y_BOTTOM;
  const tight = options?.tight ?? false;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of episodeNodes) {
    const p = n.position;
    if (!p) continue;
    const size = estimateNodeSize(n);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + size.w);
    maxY = Math.max(maxY, p.y + size.h);
  }
  if (!Number.isFinite(minX)) return existing ? { ...existing } : null;

  const auto: EpisodeFrameRect = {
    x: minX - FRAME_PAD_X,
    y: minY - FRAME_PAD_Y_TOP,
    width: Math.max(minW, maxX - minX + FRAME_PAD_X * 2),
    height: Math.max(minH, maxY - minY + FRAME_PAD_Y_TOP + FRAME_PAD_Y_BOTTOM),
  };

  if (!existing || tight) return auto;

  const x1 = Math.min(existing.x, auto.x);
  const y1 = Math.min(existing.y, auto.y);
  const x2 = Math.max(existing.x + existing.width, auto.x + auto.width);
  const y2 = Math.max(existing.y + existing.height, auto.y + auto.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** 把子节点钳制在剧集框内（含 padding） */
export function clampNodeInsideFrame(
  nodePos: { x: number; y: number },
  frame: FrameRect,
  nodeW = NODE_W,
  nodeH = SCENE_NODE_H,
  padX = FRAME_PAD_X,
  padTop = FRAME_PAD_Y_TOP,
  padBottom = FRAME_PAD_Y_BOTTOM,
) {
  const minX = frame.x + padX;
  const minY = frame.y + padTop;
  const maxX = frame.x + frame.w - padX - nodeW;
  const maxY = frame.y + frame.h - padBottom - nodeH;
  return {
    x: Math.min(Math.max(nodePos.x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(nodePos.y, minY), Math.max(minY, maxY)),
  };
}

const LAYOUT_COL_GAP = 140;
const LAYOUT_ROW_GAP = 72;
const LAYOUT_ORIGIN_X = 280;
const LAYOUT_START_ID = "__start__";

/**
 * 按连线拓扑整理已连接节点：从「开始」向右分层，分支纵向错开；
 * 并重算各剧集 wrapper 紧包框。未连接节点排在下方。
 */
export function layoutConnectedStoryGraph(
  episodes: Episode[],
  nodes: StoryNode[],
  edges: StoryEdge[],
  options?: { startY?: number },
): { nodes: StoryNode[]; episodes: Episode[] } {
  if (!nodes.length) {
    return { nodes, episodes };
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  const ensure = (id: string) => {
    if (!adj.has(id)) adj.set(id, []);
    if (!parents.has(id)) parents.set(id, []);
  };
  ensure(LAYOUT_START_ID);
  for (const n of nodes) ensure(n.id);

  const link = (source: string, target: string) => {
    if (!nodeMap.has(target)) return;
    if (source !== LAYOUT_START_ID && !nodeMap.has(source)) return;
    ensure(source);
    ensure(target);
    const outs = adj.get(source)!;
    if (!outs.includes(target)) outs.push(target);
    const ins = parents.get(target)!;
    if (!ins.includes(source)) ins.push(source);
  };

  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    if (edge.target.startsWith("frame-")) continue;
    link(edge.source, edge.target);
  }
  for (const node of nodes) {
    if (node.kind !== "interaction") continue;
    for (const opt of node.data.options) {
      if (opt.targetNodeId) link(node.id, opt.targetNodeId);
    }
  }

  // 无开始边时：连到第一集第一个节点，保证主线可布局
  if ((adj.get(LAYOUT_START_ID)?.length ?? 0) === 0 && episodes[0]) {
    const entry = nodes
      .filter((n) => n.data.episodeId === episodes[0]!.id)
      .sort((a, b) => (a.position?.x ?? 0) - (b.position?.x ?? 0))[0];
    if (entry) link(LAYOUT_START_ID, entry.id);
  }

  // 从 start 的最短路径分层（遇环跳过已访问，避免死循环）
  const depth = new Map<string, number>();
  depth.set(LAYOUT_START_ID, 0);
  const queue = [LAYOUT_START_ID];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = depth.get(cur) ?? 0;
    for (const next of adj.get(cur) ?? []) {
      if (depth.has(next)) continue;
      depth.set(next, d + 1);
      queue.push(next);
    }
  }

  const connected = new Set(
    [...depth.keys()].filter((id) => id !== LAYOUT_START_ID && nodeMap.has(id)),
  );

  // 按层收集，子节点顺序：sourceHandle / 首次出现顺序
  const layers = new Map<number, string[]>();
  for (const id of connected) {
    const d = depth.get(id) ?? 1;
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(id);
  }

  const orderIndex = new Map<string, number>();
  let ord = 0;
  const visitOrder = (id: string) => {
    if (orderIndex.has(id)) return;
    orderIndex.set(id, ord++);
    for (const next of adj.get(id) ?? []) visitOrder(next);
  };
  visitOrder(LAYOUT_START_ID);

  const lane = new Map<string, number>();
  const sortedDepths = [...layers.keys()].sort((a, b) => a - b);
  for (const d of sortedDepths) {
    const ids = layers.get(d)!;
    ids.sort((a, b) => {
      const pa = parents.get(a) ?? [];
      const pb = parents.get(b) ?? [];
      const laneA =
        pa.reduce((s, p) => s + (lane.get(p) ?? orderIndex.get(p) ?? 0), 0) /
        Math.max(pa.length, 1);
      const laneB =
        pb.reduce((s, p) => s + (lane.get(p) ?? orderIndex.get(p) ?? 0), 0) /
        Math.max(pb.length, 1);
      if (laneA !== laneB) return laneA - laneB;
      return (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0);
    });
    ids.forEach((id, i) => lane.set(id, i));
  }

  const startY = options?.startY ?? 360;
  const positions = new Map<string, { x: number; y: number }>();

  for (const d of sortedDepths) {
    const ids = layers.get(d)!;
    const sizes = ids.map((id) => estimateNodeSize(nodeMap.get(id)!));
    const totalH =
      sizes.reduce((sum, s) => sum + s.h, 0) + LAYOUT_ROW_GAP * Math.max(ids.length - 1, 0);
    let y = startY + 36 - totalH / 2;
    const x = LAYOUT_ORIGIN_X + (d - 1) * (NODE_W + LAYOUT_COL_GAP);
    ids.forEach((id, i) => {
      positions.set(id, { x, y });
      y += sizes[i]!.h + LAYOUT_ROW_GAP;
    });
  }

  // 未连接节点：放在已布局内容下方
  const unconnected = nodes.filter((n) => !connected.has(n.id));
  let orphanY = startY + 36;
  for (const id of connected) {
    const pos = positions.get(id)!;
    const h = estimateNodeSize(nodeMap.get(id)!).h;
    orphanY = Math.max(orphanY, pos.y + h);
  }
  orphanY += 200;
  let orphanX = LAYOUT_ORIGIN_X;
  for (const node of unconnected) {
    const size = estimateNodeSize(node);
    positions.set(node.id, { x: orphanX, y: orphanY });
    orphanX += size.w + LAYOUT_COL_GAP;
  }

  const laidOutNodes = nodes.map((node) => {
    const pos = positions.get(node.id);
    return pos ? ({ ...node, position: pos } as StoryNode) : node;
  });

  // 剧集 wrapper：有节点的紧包；空集保留原 frame 或按 episode 次序占位
  const laidOutEpisodes = episodes.map((episode, episodeIndex) => {
    const siblings = laidOutNodes.filter((n) => n.data.episodeId === episode.id);
    const wrap = computeEpisodeWrapFrame(siblings, undefined, { tight: true });
    if (wrap) return { ...episode, frame: wrap };
    if (siblings.length === 0) {
      // 空框：排在主布局下方一排
      return {
        ...episode,
        frame: {
          x: LAYOUT_ORIGIN_X + episodeIndex * 720,
          y: orphanY + 160,
          width: 640,
          height: SCENE_NODE_H + FRAME_PAD_Y_TOP + FRAME_PAD_Y_BOTTOM,
        },
      };
    }
    return episode;
  });

  return { nodes: laidOutNodes, episodes: laidOutEpisodes };
}
