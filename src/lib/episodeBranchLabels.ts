import type { Episode, StoryEdge, StoryNode } from "@/types/worldBuilder";

export type EpisodeBranchMeta = {
  /** 分支编号，如 1 / 2a / 2b */
  label: string;
  depth: number;
  /** 同层并列时为 true */
  isParallel: boolean;
  moduleType: "main" | "branch";
  /** 大纲/排序用 */
  order: number;
};

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function episodeSortKey(episode: Episode, nodes: StoryNode[]): [number, number, number] {
  const y =
    episode.frame?.y ??
    nodes
      .filter((n) => n.data.episodeId === episode.id && n.position)
      .reduce((min, n) => Math.min(min, n.position!.y), Number.POSITIVE_INFINITY);
  const x =
    episode.frame?.x ??
    nodes
      .filter((n) => n.data.episodeId === episode.id && n.position)
      .reduce((min, n) => Math.min(min, n.position!.x), Number.POSITIVE_INFINITY);
  return [
    Number.isFinite(y) ? y : episode.index * 1000,
    Number.isFinite(x) ? x : episode.index * 1000,
    episode.index,
  ];
}

function compareKeys(a: [number, number, number], b: [number, number, number]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function hasLink(
  id: string,
  children: Map<string, Set<string>>,
  parents: Map<string, Set<string>>,
): boolean {
  return (children.get(id)?.size ?? 0) > 0 || (parents.get(id)?.size ?? 0) > 0;
}

/** 从一个根集出发，给可达子图赋相对深度（根=1） */
function assignReachableDepths(
  rootId: string,
  children: Map<string, Set<string>>,
  parents: Map<string, Set<string>>,
): Map<string, number> {
  const depth = new Map<string, number>([[rootId, 1]]);
  const queue = [rootId];
  const seen = new Set<string>([rootId]);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const child of children.get(cur) ?? []) {
      if (!seen.has(child)) {
        seen.add(child);
        queue.push(child);
      }
    }
  }

  let changed = true;
  let guard = 0;
  while (changed && guard++ < seen.size + 4) {
    changed = false;
    for (const id of seen) {
      if (id === rootId) continue;
      const ps = [...(parents.get(id) ?? [])].filter((p) => seen.has(p));
      if (ps.length === 0) continue;
      if (ps.some((p) => !depth.has(p))) continue;
      const next = Math.max(...ps.map((p) => depth.get(p)!)) + 1;
      if (depth.get(id) !== next) {
        depth.set(id, next);
        changed = true;
      }
    }
  }
  return depth;
}

/** 按节点连线拓扑生成并列分支标签（1、2a/2b、3a…） */
export function computeEpisodeBranchLabels(
  episodes: Episode[],
  nodes: StoryNode[],
  edges: StoryEdge[],
): Map<string, EpisodeBranchMeta> {
  const result = new Map<string, EpisodeBranchMeta>();
  if (episodes.length === 0) return result;

  const nodeEpisode = new Map<string, string>();
  for (const node of nodes) {
    nodeEpisode.set(node.id, node.data.episodeId);
  }

  const children = new Map<string, Set<string>>();
  const parents = new Map<string, Set<string>>();
  for (const ep of episodes) {
    children.set(ep.id, new Set());
    parents.set(ep.id, new Set());
  }

  const link = (src?: string, tgt?: string) => {
    if (!src || !tgt || src === tgt) return;
    if (!children.has(src) || !children.has(tgt)) return;
    children.get(src)!.add(tgt);
    parents.get(tgt)!.add(src);
  };

  const startTargets = new Set<string>();
  for (const edge of edges) {
    if (edge.source === "__start__") {
      const tgt = nodeEpisode.get(edge.target);
      if (tgt) startTargets.add(tgt);
      continue;
    }
    link(nodeEpisode.get(edge.source), nodeEpisode.get(edge.target));
  }

  for (const node of nodes) {
    if (node.kind !== "interaction") continue;
    for (const option of node.data.options) {
      if (!option.targetNodeId) continue;
      link(node.data.episodeId, nodeEpisode.get(option.targetNodeId));
    }
  }

  const linked = episodes.filter((ep) => hasLink(ep.id, children, parents));
  const isolates = episodes
    .filter((ep) => !hasLink(ep.id, children, parents))
    .sort((a, b) => a.index - b.index);

  const absoluteDepth = new Map<string, number>();
  let depthOffset = 0;

  const componentRoots: Episode[] = [];
  if (startTargets.size > 0) {
    for (const ep of episodes) {
      if (startTargets.has(ep.id)) componentRoots.push(ep);
    }
  }
  // 主线：入度为 0 且有连线的剧集（排除已作为 start 根的）
  const zeroInLinked = linked
    .filter((ep) => (parents.get(ep.id)?.size ?? 0) === 0)
    .sort((a, b) => compareKeys(episodeSortKey(a, nodes), episodeSortKey(b, nodes)));
  for (const ep of zeroInLinked) {
    if (!componentRoots.some((r) => r.id === ep.id)) componentRoots.push(ep);
  }
  if (componentRoots.length === 0 && linked.length > 0) {
    componentRoots.push(
      [...linked].sort((a, b) =>
        compareKeys(episodeSortKey(a, nodes), episodeSortKey(b, nodes)),
      )[0]!,
    );
  }

  // 多个「森林根」若彼此不可达，按组件依次偏移；同一主根下的并列子节点共享深度
  const assigned = new Set<string>();
  // 先处理从 start / 第一个零入度根可达的主组件
  const primaryRoot = componentRoots[0];
  if (primaryRoot) {
    const relative = assignReachableDepths(primaryRoot.id, children, parents);
    // 若有多个并列主根（少见），把它们并到 depth 1
    for (const root of componentRoots) {
      if (relative.has(root.id)) continue;
      // 另一棵树：稍后处理
    }
    let maxRel = 0;
    for (const [id, d] of relative) {
      absoluteDepth.set(id, d + depthOffset);
      assigned.add(id);
      maxRel = Math.max(maxRel, d);
    }
    // 并列主根（同时零入度且均指向主故事）— 若 relative 未包含，说明是另一组件
    depthOffset += maxRel;
  }

  for (const root of componentRoots.slice(primaryRoot ? 1 : 0)) {
    if (assigned.has(root.id)) continue;
    const relative = assignReachableDepths(root.id, children, parents);
    let maxRel = 0;
    for (const [id, d] of relative) {
      if (assigned.has(id)) continue;
      absoluteDepth.set(id, d + depthOffset);
      assigned.add(id);
      maxRel = Math.max(maxRel, d);
    }
    depthOffset += maxRel;
  }

  // 仍未赋值的连通节点（环等）
  for (const ep of linked) {
    if (assigned.has(ep.id)) continue;
    absoluteDepth.set(ep.id, ++depthOffset);
    assigned.add(ep.id);
  }

  for (const ep of isolates) {
    absoluteDepth.set(ep.id, ++depthOffset);
    assigned.add(ep.id);
  }

  const byDepth = new Map<number, Episode[]>();
  for (const ep of episodes) {
    const d = absoluteDepth.get(ep.id) ?? ep.index;
    const list = byDepth.get(d) ?? [];
    list.push(ep);
    byDepth.set(d, list);
  }

  let order = 0;
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  for (const d of depths) {
    const group = (byDepth.get(d) ?? []).sort((a, b) =>
      compareKeys(episodeSortKey(a, nodes), episodeSortKey(b, nodes)),
    );
    const parallel = group.length > 1;
    group.forEach((ep, i) => {
      const suffix = parallel ? LETTERS[i] ?? String(i + 1) : "";
      const label = `${d}${suffix}`;
      result.set(ep.id, {
        label,
        depth: d,
        isParallel: parallel,
        moduleType: !parallel || i === 0 ? "main" : "branch",
        order: order++,
      });
    });
  }

  return result;
}

export function applyEpisodeBranchLabels(
  episodes: Episode[],
  nodes: StoryNode[],
  edges: StoryEdge[],
): Episode[] {
  const meta = computeEpisodeBranchLabels(episodes, nodes, edges);
  let changed = false;
  const next = episodes.map((ep) => {
    const m = meta.get(ep.id);
    if (!m || ep.label === m.label) return ep;
    changed = true;
    return { ...ep, label: m.label };
  });
  return changed ? next : episodes;
}

export function sortEpisodesByBranch(
  episodes: Episode[],
  nodes: StoryNode[],
  edges: StoryEdge[],
): Episode[] {
  const meta = computeEpisodeBranchLabels(episodes, nodes, edges);
  return [...episodes].sort((a, b) => {
    const oa = meta.get(a.id)?.order ?? a.index;
    const ob = meta.get(b.id)?.order ?? b.index;
    return oa - ob;
  });
}

/** 构建剧集级有向邻接（用于连通判定） */
function buildEpisodeAdjacency(
  episodes: Episode[],
  nodes: StoryNode[],
  edges: StoryEdge[],
) {
  const nodeEpisode = new Map<string, string>();
  for (const node of nodes) nodeEpisode.set(node.id, node.data.episodeId);

  const children = new Map<string, Set<string>>();
  const parents = new Map<string, Set<string>>();
  for (const ep of episodes) {
    children.set(ep.id, new Set());
    parents.set(ep.id, new Set());
  }
  const link = (src?: string, tgt?: string) => {
    if (!src || !tgt || src === tgt) return;
    if (!children.has(src) || !children.has(tgt)) return;
    children.get(src)!.add(tgt);
    parents.get(tgt)!.add(src);
  };

  const startTargets = new Set<string>();
  for (const edge of edges) {
    if (edge.source === "__start__") {
      const tgt = nodeEpisode.get(edge.target);
      if (tgt) startTargets.add(tgt);
      continue;
    }
    link(nodeEpisode.get(edge.source), nodeEpisode.get(edge.target));
  }
  for (const node of nodes) {
    if (node.kind !== "interaction") continue;
    for (const option of node.data.options) {
      if (!option.targetNodeId) continue;
      link(node.data.episodeId, nodeEpisode.get(option.targetNodeId));
    }
  }
  return { children, parents, startTargets };
}

/**
 * 大纲分栏：主线连通分量 vs 未连接剧集
 * （未与 Start / 主根所在连通图相连的剧集归入 Unconnected）
 */
export function partitionEpisodesByConnection(
  episodes: Episode[],
  nodes: StoryNode[],
  edges: StoryEdge[],
): { connected: Episode[]; unconnected: Episode[] } {
  if (episodes.length === 0) return { connected: [], unconnected: [] };

  const { children, parents, startTargets } = buildEpisodeAdjacency(episodes, nodes, edges);
  const undirected = new Map<string, Set<string>>();
  for (const ep of episodes) undirected.set(ep.id, new Set());
  for (const [src, set] of children) {
    for (const tgt of set) {
      undirected.get(src)?.add(tgt);
      undirected.get(tgt)?.add(src);
    }
  }

  let seed: string | undefined = [...startTargets][0];
  if (!seed) {
    const zeroIn = episodes.find(
      (ep) => (parents.get(ep.id)?.size ?? 0) === 0 && (children.get(ep.id)?.size ?? 0) > 0,
    );
    seed = zeroIn?.id ?? episodes[0]?.id;
  }
  if (!seed) return { connected: [], unconnected: episodes };

  const reachable = new Set<string>([seed]);
  const queue = [seed];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of undirected.get(cur) ?? []) {
      if (reachable.has(next)) continue;
      reachable.add(next);
      queue.push(next);
    }
  }

  const mainIds = new Set<string>();
  for (const id of reachable) {
    if (hasLink(id, children, parents) || startTargets.has(id)) mainIds.add(id);
  }
  // 无任何连线时：第一集归主线，其余未连接
  if (mainIds.size === 0) {
    const first = [...episodes].sort((a, b) => a.index - b.index)[0];
    if (first) mainIds.add(first.id);
  }

  return {
    connected: sortEpisodesByBranch(
      episodes.filter((ep) => mainIds.has(ep.id)),
      nodes,
      edges,
    ),
    unconnected: episodes
      .filter((ep) => !mainIds.has(ep.id))
      .sort((a, b) => a.index - b.index),
  };
}

export function episodeDisplayLabel(episode: Episode, fallbackIndex?: number): string {
  return episode.label?.trim() || String(fallbackIndex ?? episode.index);
}

/** 大纲分栏键：从标签提取主序号（2a/2b → "2"，4 → "4"） */
export function episodeLabelGroupKey(episode: Episode): string {
  const label = episodeDisplayLabel(episode);
  const match = label.match(/^(\d+)/);
  return match?.[1] ?? label;
}

export function episodeModuleCaption(episode: Episode): string {
  const label = episode.label?.toLowerCase() ?? "";
  if (/[b-z]$/.test(label)) return "分支剧情";
  return "主线剧情";
}

export type EpisodeOutlineTreeItem = {
  episode: Episode;
  depth: number;
  /** 同层是否为最后一个兄弟（决定竖线是否到底） */
  isLastSibling: boolean;
  /** 祖先层是否继续向下画竖线；长度 === depth */
  guides: boolean[];
};

/** 大纲树：按剧集连线生成缩进与分栏引导线 */
export function buildEpisodeOutlineTree(
  connected: Episode[],
  nodes: StoryNode[],
  edges: StoryEdge[],
): EpisodeOutlineTreeItem[] {
  if (connected.length === 0) return [];

  const { children, parents } = buildEpisodeAdjacency(connected, nodes, edges);
  const connectedIds = new Set(connected.map((ep) => ep.id));
  const meta = computeEpisodeBranchLabels(connected, nodes, edges);
  const orderOf = (id: string) => meta.get(id)?.order ?? 0;
  const byId = new Map(connected.map((ep) => [ep.id, ep]));

  const childEpisodes = (id: string) =>
    [...(children.get(id) ?? [])]
      .filter((cid) => connectedIds.has(cid))
      .map((cid) => byId.get(cid)!)
      .filter(Boolean)
      .sort((a, b) => orderOf(a.id) - orderOf(b.id));

  const roots = connected
    .filter((ep) => {
      const ps = [...(parents.get(ep.id) ?? [])].filter((p) => connectedIds.has(p));
      return ps.length === 0;
    })
    .sort((a, b) => orderOf(a.id) - orderOf(b.id));

  const seedRoots = roots.length > 0 ? roots : [connected[0]!];
  const items: EpisodeOutlineTreeItem[] = [];
  const visited = new Set<string>();

  const walk = (
    ep: Episode,
    depth: number,
    guides: boolean[],
    siblings: Episode[],
    index: number,
  ) => {
    if (visited.has(ep.id)) return;
    visited.add(ep.id);
    const isLastSibling = index === siblings.length - 1;
    items.push({ episode: ep, depth, isLastSibling, guides });
    const kids = childEpisodes(ep.id);
    kids.forEach((kid, i) => {
      walk(kid, depth + 1, [...guides, !isLastSibling], kids, i);
    });
  };

  seedRoots.forEach((root, i) => walk(root, 0, [], seedRoots, i));

  for (const ep of connected) {
    if (!visited.has(ep.id)) {
      items.push({ episode: ep, depth: 0, isLastSibling: true, guides: [] });
    }
  }

  return items;
}
