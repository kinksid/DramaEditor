"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import {
  seedCharacters,
  seedEpisodes,
  seedLocations,
  seedSetupDraft,
  seedStoryEdges,
  seedStoryNodes,
  seedWorld,
} from "@/data/seedWorld";
import {
  buildBlankProject,
  buildProjectFromDecompose,
  cloneWorldProject,
  emptyCreationSession,
  parseCommaList,
  projectToWorkspace,
  syncProjectsFromWorkspace,
} from "@/lib/worldBuilderProject";
import {
  getOrCreateSyncClientId,
  pullSharedState,
  pushSharedState,
} from "@/lib/worldBuilderSyncClient";
import type { SharedWorldBuilderState } from "@/types/worldBuilderSync";
import { analyzeScript, buildStoryGraphFromAnalysis } from "@/lib/scriptAnalysis";
import { applyEpisodeBranchLabels } from "@/lib/episodeBranchLabels";
import { layoutConnectedStoryGraph } from "@/lib/storyGraphLayout";
import {
  collectReferenceImageUrls,
  applyCompletedTaskToState,
  markNodeGenerating,
  markNodeGenerationFailed,
} from "@/lib/worldBuilderGeneration";
import {
  pollGenerationTaskApi,
  submitImageGenerationApi,
  submitVideoGenerationApi,
  type PendingGenerationTask,
} from "@/lib/generationClient";
import type {
  Character,
  CreationReference,
  CreationSession,
  DecomposeResult,
  Episode,
  InteractionNodeData,
  InteractionOption,
  Location,
  SceneNodeData,
  SetupDraft,
  StoryEdge,
  StoryNode,
  World,
  WorldProject,
  EndingNodeData,
  StoryValidationIssue,
  CanvasPosition,
  ThirdPartyWorkflowTarget,
} from "@/types/worldBuilder";

const STORE_VERSION = 6;

/** 过大的 data URL 不进 localStorage，避免 QuotaExceeded 拖垮页面 */
const stripHeavyDataUrl = (value?: string) => {
  if (!value) return value;
  if (value.startsWith("data:") && value.length > 24_000) return undefined;
  return value;
};

const slimProjectForPersist = <T extends WorldProject>(project: T): T =>
  ({
    ...project,
    world: {
      ...project.world,
      coverImage: stripHeavyDataUrl(project.world.coverImage),
    },
    characters: project.characters.map((c) => ({
      ...c,
      referenceImage: stripHeavyDataUrl(c.referenceImage),
      previewImage: stripHeavyDataUrl(c.previewImage),
      turnaroundImages: c.turnaroundImages?.map((img) => stripHeavyDataUrl(img) ?? ""),
    })),
    locations: project.locations.map((l) => ({
      ...l,
      referenceImage: stripHeavyDataUrl(l.referenceImage),
      angleImages: l.angleImages?.map((img) => stripHeavyDataUrl(img) ?? ""),
    })),
    nodes: project.nodes.map((node) => {
      if (node.kind === "scene") {
        return {
          ...node,
          data: {
            ...node.data,
            firstFrameRef: stripHeavyDataUrl(node.data.firstFrameRef),
            videoUrl: stripHeavyDataUrl(node.data.videoUrl),
            generationHistory: undefined,
          },
        };
      }
      if (node.kind === "interaction") {
        return {
          ...node,
          data: {
            ...node.data,
            firstFrameRef: stripHeavyDataUrl(node.data.firstFrameRef),
            lastFrameRef: stripHeavyDataUrl(node.data.lastFrameRef),
            loopVideoUrl: stripHeavyDataUrl(node.data.loopVideoUrl),
            generationHistory: undefined,
          },
        };
      }
      return node;
    }),
    references: (project.references ?? []).map((ref) => ({
      ...ref,
      url: stripHeavyDataUrl(ref.url) ?? ref.url,
    })),
  }) as T;

const safePersistStorage = createJSONStorage(() => ({
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // 配额满：尝试瘦身后写入；仍失败则放弃持久化，避免抛穿 React
      try {
        const parsed = JSON.parse(value) as { state?: PersistedWorldBuilderState };
        if (parsed?.state) {
          const slim = {
            ...parsed,
            state: {
              ...parsed.state,
              world: {
                ...parsed.state.world,
                coverImage: stripHeavyDataUrl(parsed.state.world?.coverImage),
              },
              projects: (parsed.state.projects ?? []).map((p) => slimProjectForPersist(p)),
              characters: (parsed.state.characters ?? []).map((c) => ({
                ...c,
                referenceImage: stripHeavyDataUrl(c.referenceImage),
                previewImage: stripHeavyDataUrl(c.previewImage),
              })),
              locations: (parsed.state.locations ?? []).map((l) => ({
                ...l,
                referenceImage: stripHeavyDataUrl(l.referenceImage),
              })),
              nodes: slimProjectForPersist({
                id: "tmp",
                name: "",
                createdAt: "",
                updatedAt: "",
                setupDraft: parsed.state.setupDraft!,
                characters: [],
                locations: [],
                episodes: parsed.state.episodes ?? [],
                nodes: parsed.state.nodes ?? [],
                edges: parsed.state.edges ?? [],
                world: parsed.state.world!,
                references: [],
                decomposeStatus: "idle" as const,
              }).nodes,
            },
          };
          localStorage.setItem(name, JSON.stringify(slim));
          return;
        }
      } catch {
        /* ignore */
      }
      console.warn("[persist] localStorage quota exceeded; skip write for", name);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
}));

export type WorldBuilderState = {
  world: World;
  characters: Character[];
  locations: Location[];
  episodes: Episode[];
  nodes: StoryNode[];
  edges: StoryEdge[];
  selectedNodeId?: string;
  selectedEpisodeId: string;
  setupDraft: SetupDraft;
  lastSavedAt?: string;
  lastPublishedAt?: string;
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  loadSeedData: () => void;
  saveToLocal: () => void;
  resetWorld: () => void;
  generateAllMockVideos: () => void;
  submitVideoGeneration: (nodeId: string) => Promise<string | null>;
  submitReferenceImageGeneration: (
    entityType: "character" | "location",
    entityId: string,
    prompt: string,
  ) => Promise<string | null>;
  submitSceneFirstFrame: (nodeId: string) => Promise<string | null>;
  /** 生成/重绘节点首帧或尾帧 */
  submitNodeFrame: (
    nodeId: string,
    field: "firstFrameRef" | "lastFrameRef",
  ) => Promise<string | null>;
  /** 互动节点：用首尾帧生成数秒循环视频 */
  submitInteractionLoopVideo: (nodeId: string) => Promise<string | null>;
  pollGenerationTasks: () => Promise<void>;
  resetStaleGenerationStates: () => void;
  applyGenerationHistory: (nodeId: string, entryId: string) => void;
  createSuggestedNodes: (
    suggestions: Array<{ kind: string; title: string; promptOrInstruction?: string }>,
  ) => void;
  pendingGenerationTasks: PendingGenerationTask[];
  validateStory: () => StoryValidationIssue[];
  publishStory: () => StoryValidationIssue[];
  updateWorld: (world: Partial<World>) => void;
  updateSetupDraft: (draft: Partial<SetupDraft>) => void;
  addCharacter: (character: Omit<Character, "id">) => string;
  updateCharacter: (id: string, character: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  addLocation: (location: Omit<Location, "id">) => string;
  updateLocation: (id: string, location: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
  addEpisode: (episode: Omit<Episode, "id" | "index">) => string;
  updateEpisode: (id: string, episode: Partial<Episode>) => void;
  deleteEpisode: (id: string) => void;
  /** 复制整集（含节点与集内连线） */
  duplicateEpisode: (id: string) => string | null;
  /** 将整集复制到其他项目 */
  copyEpisodeToProject: (episodeId: string, projectId: string) => boolean;
  /** 按连线拓扑同步并列分支标签（2a/2b） */
  syncEpisodeBranchLabels: () => void;
  addSceneNode: (episodeId?: string) => void;
  addInteractionNode: (episodeId?: string) => void;
  addEndingNode: (episodeId?: string) => void;
  updateNode: (
    id: string,
    data: Partial<SceneNodeData | InteractionNodeData | EndingNodeData>,
  ) => void;
  updateNodePosition: (id: string, position: CanvasPosition) => void;
  updateNodePositions: (positions: Array<{ id: string; position: CanvasPosition }>) => void;
  autoLayoutEpisodes: () => void;
  deleteNode: (id: string) => void;
  /** 删除连线；同步清理 interaction option.targetNodeId */
  deleteEdges: (ids: string[]) => void;
  /** 为 true 时不自动合成「开始→第一集」连线（用户删过开始边后） */
  suppressAutoStartEdge: boolean;
  duplicateNode: (id: string) => void;
  addOption: (nodeId: string) => void;
  updateOption: (nodeId: string, optionId: string, option: Partial<InteractionOption>) => void;
  deleteOption: (nodeId: string, optionId: string) => void;
  connectNodes: (
    source: string,
    target: string,
    label?: string,
    actionType?: StoryEdge["actionType"],
    sourceHandle?: string | null,
  ) => void;
  createConnectedNode: (
    sourceNodeId: string,
    kind: StoryNode["kind"],
    position: CanvasPosition,
    sourceHandle?: string | null,
  ) => string | null;
  selectNode: (id?: string) => void;
  selectEpisode: (id: string) => void;
  /** 大纲点击：选中并请求画布定位（可重复点击同一项） */
  canvasFocusRequest: { kind: "episode" | "node"; id: string; nonce: number };
  requestCanvasFocus: (kind: "episode" | "node", id: string) => void;
  exportStoryJson: () => string;
  exportAppJson: () => string;
  exportThirdPartyWorkflow: (target: ThirdPartyWorkflowTarget) => string;
  importStoryJson: (jsonStr: string) => { success: boolean; message: string };
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  historyIndex: number;
  historyLength: number;
  projects: WorldProject[];
  activeProjectId: string;
  creationSession: CreationSession;
  updateCreationSession: (patch: Partial<CreationSession>) => void;
  addReference: (reference: CreationReference) => void;
  removeReference: (id: string) => void;
  updateReference: (id: string, patch: Partial<CreationReference>) => void;
  setDecomposePreview: (result: DecomposeResult) => void;
  createProjectFromSession: (options?: { decomposeResult?: DecomposeResult }) => string;
  cloneProject: (sourceProjectId?: string) => string | null;
  renameProject: (id: string, name: string) => void;
  switchProject: (id: string) => void;
  markProjectOpened: (id?: string) => void;
  deleteProject: (id: string) => void;
  listProjects: () => WorldProject[];
  commitSetupToWorld: () => void;
  generateStoryGraphFromScript: (options?: { force?: boolean }) => boolean;
  ensureProjectLoaded: (projectId?: string) => boolean;
  serverRevision: number;
  syncClientId: string;
  syncInitialized: boolean;
  _remoteApplying: boolean;
  initServerSync: () => Promise<void>;
  pullFromServer: () => Promise<void>;
  schedulePush: () => void;
  pushToServer: (force?: boolean) => Promise<void>;
};

type PersistedWorldBuilderState = Pick<
  WorldBuilderState,
  | "world"
  | "characters"
  | "locations"
  | "episodes"
  | "nodes"
  | "edges"
  | "selectedEpisodeId"
  | "setupDraft"
  | "lastSavedAt"
  | "lastPublishedAt"
  | "projects"
  | "activeProjectId"
  | "creationSession"
>;

const cloneSeed = () => ({
  world: structuredClone(seedWorld),
  characters: structuredClone(seedCharacters),
  locations: structuredClone(seedLocations),
  episodes: structuredClone(seedEpisodes),
  nodes: structuredClone(seedStoryNodes),
  edges: structuredClone(seedStoryEdges),
  selectedNodeId: undefined,
  selectedEpisodeId: seedEpisodes[0].id,
  setupDraft: structuredClone(seedSetupDraft),
  lastSavedAt: undefined,
  lastPublishedAt: undefined,
});

/** 与画布固定「开始」节点对齐：剧集从右侧排布 */
const EPISODE_ORIGIN_X = 280;

const episodeFramePosition = (episode: Episode, episodeIndex: number) => {
  // 单集框高度约 800px，纵向错开避免默认重叠
  if (episode.id === "ep2b") return { x: EPISODE_ORIGIN_X + 1280, y: -40 };
  if (episode.id === "ep2") return { x: EPISODE_ORIGIN_X + 1280, y: 920 };
  if (episode.id === "ep3") return { x: EPISODE_ORIGIN_X + 2560, y: 920 };
  if (episode.id === "ep4") return { x: EPISODE_ORIGIN_X + 3840, y: 920 };
  return {
    x: EPISODE_ORIGIN_X + episodeIndex * 1280,
    y: 330,
  };
};

const defaultNodePosition = (
  episode: Episode,
  episodeIndex: number,
  nodeIndex: number,
): CanvasPosition => {
  const frame = episodeFramePosition(episode, episodeIndex);
  return {
    x: frame.x + 96 + nodeIndex * 390,
    y: frame.y + 108,
  };
};

const withAutoLayout = (episodes: Episode[], nodes: StoryNode[]) =>
  nodes.map((node) => {
    if (node.position) return node;
    const episodeIndex = Math.max(episodes.findIndex((episode) => episode.id === node.data.episodeId), 0);
    const episode = episodes[episodeIndex] ?? episodes[0];
    const siblings = nodes.filter((item) => item.data.episodeId === node.data.episodeId);
    const nodeIndex = Math.max(
      siblings.findIndex((item) => item.id === node.id),
      0,
    );
    return {
      ...node,
      position: defaultNodePosition(episode, episodeIndex, nodeIndex),
    } as StoryNode;
  });

const buildSeedProject = (): WorldProject => {
  const seed = cloneSeed();
  const now = seed.world.createdAt;
  return {
    id: seed.world.id,
    name: seed.world.title,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    setupDraft: seed.setupDraft,
    characters: seed.characters,
    locations: seed.locations,
    episodes: seed.episodes,
    nodes: withAutoLayout(seed.episodes, seed.nodes),
    edges: seed.edges,
    world: seed.world,
    references: [],
    decomposeStatus: "idle",
  };
};

const seedPersistedState = (): PersistedWorldBuilderState => {
  const seedProject = buildSeedProject();
  return {
    world: seedProject.world,
    characters: seedProject.characters,
    locations: seedProject.locations,
    episodes: seedProject.episodes,
    nodes: seedProject.nodes,
    edges: seedProject.edges,
    selectedEpisodeId: seedProject.episodes[0]?.id ?? "",
    setupDraft: seedProject.setupDraft,
    lastSavedAt: undefined,
    lastPublishedAt: undefined,
    projects: [seedProject],
    activeProjectId: seedProject.id,
    creationSession: emptyCreationSession(),
  };
};

const workspaceSlice = (state: WorldBuilderState) => ({
  world: state.world,
  characters: state.characters,
  locations: state.locations,
  episodes: state.episodes,
  nodes: state.nodes,
  edges: state.edges,
  setupDraft: state.setupDraft,
});

const MAX_HISTORY = 50;
const PUSH_DEBOUNCE_MS = 1500;
let pushDebounceTimer: ReturnType<typeof setTimeout> | null = null;

type HistorySnapshot = Pick<
  WorldBuilderState,
  "world" | "characters" | "locations" | "episodes" | "nodes" | "edges" | "setupDraft"
>;

const takeSnapshot = (state: WorldBuilderState): HistorySnapshot => ({
  world: structuredClone(state.world),
  characters: structuredClone(state.characters),
  locations: structuredClone(state.locations),
  episodes: structuredClone(state.episodes),
  nodes: structuredClone(state.nodes),
  edges: structuredClone(state.edges),
  setupDraft: structuredClone(state.setupDraft),
});

const restoreSnapshot = (state: WorldBuilderState, snap: HistorySnapshot) => ({
  ...state,
  ...snap,
  nodes: withAutoLayout(snap.episodes, snap.nodes),
});

export const useWorldBuilderStore = create<WorldBuilderState>()(
  persist(
    (set, get) => {
      const seedProject = buildSeedProject();
      const seedWorkspace = projectToWorkspace(seedProject);
      return {
      ...seedWorkspace,
      projects: [seedProject],
      activeProjectId: seedProject.id,
      creationSession: emptyCreationSession(),
      hasHydrated: false,
      serverRevision: 0,
      syncClientId: "",
      syncInitialized: false,
      _remoteApplying: false,
      historyIndex: -1,
      historyLength: 0,
      suppressAutoStartEdge: false,
      canvasFocusRequest: { kind: "episode" as const, id: "", nonce: 0 },
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      pushHistory: () => {
        const state = get();
        const snap = takeSnapshot(state);
        set((s) => ({
          // @ts-ignore — history is managed internally, not persisted
          _history: [...((s as any)._history ?? []).slice(-MAX_HISTORY), snap],
          historyIndex: Math.min(((s as any)._history?.length ?? 0), MAX_HISTORY - 1),
          historyLength: Math.min(((s as any)._history?.length ?? 0) + 1, MAX_HISTORY),
        }));
      },
      undo: () => {
        const state = get() as any;
        const history: HistorySnapshot[] = state._history ?? [];
        if (history.length === 0) return;
        const idx = state.historyIndex;
        if (idx < 0) {
          set({ historyIndex: history.length - 1, historyLength: history.length });
          return;
        }
        const targetIdx = idx > 0 ? idx - 1 : history.length - 1;
        const snap = history[targetIdx];
        if (snap) {
          set((s) => restoreSnapshot(s, snap));
          set({ historyIndex: targetIdx, historyLength: history.length });
        }
      },
      redo: () => {
        const state = get() as any;
        const history: HistorySnapshot[] = state._history ?? [];
        if (history.length === 0) return;
        const idx = state.historyIndex;
        if (idx < 0 || idx >= history.length - 1) {
          // At newest, can't redo — restore from seed as last resort
          return;
        }
        const targetIdx = idx + 1;
        const snap = history[targetIdx];
        if (snap) {
          set((s) => restoreSnapshot(s, snap));
          set({ historyIndex: targetIdx, historyLength: history.length });
        }
      },
      loadSeedData: () => set(() => {
        const seedProject = buildSeedProject();
        return {
          ...projectToWorkspace(seedProject),
          projects: [seedProject],
          activeProjectId: seedProject.id,
        };
      }),
      saveToLocal: () => set({ lastSavedAt: new Date().toISOString() }),
      resetWorld: () => set(() => {
        const seedProject = buildSeedProject();
        return {
          ...projectToWorkspace(seedProject),
          projects: [seedProject],
          activeProjectId: seedProject.id,
        };
      }),
      generateAllMockVideos: () => {
        const scenes = get().nodes.filter((node) => node.kind === "scene");
        void (async () => {
          for (const scene of scenes) {
            if (scene.kind !== "scene") continue;
            if (scene.data.status === "ready" && scene.data.videoUrl) continue;
            await get().submitVideoGeneration(scene.id);
          }
        })();
      },
      pendingGenerationTasks: [],
      submitVideoGeneration: async (nodeId) => {
        const state = get();
        const node = state.nodes.find((item) => item.id === nodeId && item.kind === "scene");
        if (!node || node.kind !== "scene") return null;
        if (!node.data.prompt.trim()) return null;

        const referenceImageUrls = collectReferenceImageUrls(state.characters, state.locations);
        try {
          const { taskId } = await submitVideoGenerationApi({
            nodeId,
            prompt: node.data.prompt,
            style: state.setupDraft.visualStyle,
            duration: node.data.durationSec ?? 5,
            aspectRatio: node.data.aspectRatio ?? "9:16",
            firstFrameRef: node.data.firstFrameRef,
            referenceImageUrls,
          });
          const task: PendingGenerationTask = {
            taskId,
            kind: "video",
            nodeId,
            targetField: "videoUrl",
            prompt: node.data.prompt,
          };
          set((current) => ({
            nodes: markNodeGenerating(current.nodes, nodeId, taskId),
            pendingGenerationTasks: [...current.pendingGenerationTasks, task],
          }));
          return taskId;
        } catch {
          set((current) => ({ nodes: markNodeGenerationFailed(current.nodes, nodeId) }));
          return null;
        }
      },
      submitReferenceImageGeneration: async (entityType, entityId, prompt) => {
        const state = get();
        const entity =
          entityType === "character"
            ? state.characters.find((item) => item.id === entityId)
            : state.locations.find((item) => item.id === entityId);
        if (!entity || !prompt.trim()) return null;

        try {
          const { taskId } = await submitImageGenerationApi({
            prompt,
            style: state.setupDraft.visualStyle,
            targetField: "referenceImage",
            targetEntityId: entityId,
            entityType,
          });
          const task: PendingGenerationTask = {
            taskId,
            kind: "image",
            targetField: "referenceImage",
            targetEntityId: entityId,
            entityType,
            prompt,
          };
          set((current) => ({
            pendingGenerationTasks: [...current.pendingGenerationTasks, task],
          }));
          return taskId;
        } catch {
          return null;
        }
      },
      submitSceneFirstFrame: async (nodeId) => get().submitNodeFrame(nodeId, "firstFrameRef"),
      submitNodeFrame: async (nodeId, field) => {
        const state = get();
        const node = state.nodes.find((item) => item.id === nodeId);
        if (!node || (node.kind !== "scene" && node.kind !== "interaction")) return null;

        const basePrompt =
          node.kind === "scene" ? node.data.prompt : node.data.instruction;
        if (!basePrompt.trim()) return null;

        const isLast = field === "lastFrameRef";
        const framePrompt = isLast
          ? `${basePrompt}\n\nStill keyframe for the LAST frame of a seamless ${node.data.durationSec ?? 4}s loop. Match the first frame composition exactly; only allow micro subject motion readiness. No UI, no captions.`
          : `${basePrompt}\n\nStill keyframe for the FIRST frame of a seamless ${node.data.durationSec ?? 4}s loop. Locked camera, cinematic still. No UI, no captions.`;

        const referenceImageUrls = collectReferenceImageUrls(state.characters, state.locations);
        const referenceImageUrl =
          (isLast ? node.data.firstFrameRef : undefined) ??
          referenceImageUrls[0];

        try {
          const { taskId } = await submitImageGenerationApi({
            nodeId,
            prompt: framePrompt,
            style: state.setupDraft.visualStyle,
            referenceImageUrl,
            aspectRatio: node.data.aspectRatio ?? "9:16",
            targetField: field,
          });
          const task: PendingGenerationTask = {
            taskId,
            kind: "image",
            nodeId,
            targetField: field,
            prompt: framePrompt,
          };
          set((current) => ({
            nodes: markNodeGenerating(current.nodes, nodeId, taskId),
            pendingGenerationTasks: [...current.pendingGenerationTasks, task],
          }));
          return taskId;
        } catch {
          if (node.kind === "scene") {
            set((current) => ({ nodes: markNodeGenerationFailed(current.nodes, nodeId) }));
          }
          return null;
        }
      },
      submitInteractionLoopVideo: async (nodeId) => {
        const state = get();
        const node = state.nodes.find((item) => item.id === nodeId && item.kind === "interaction");
        if (!node || node.kind !== "interaction") return null;

        const first = node.data.firstFrameRef;
        if (!first) return null;
        const last = node.data.lastFrameRef ?? first;
        const duration = node.data.durationSec ?? 4;
        const prompt = [
          node.data.instruction.trim() || "Subtle living still for a seamless loop.",
          "Locked off camera. No pan, tilt, zoom, or camera breathing.",
          "Only micro movements (blink, breath, fingers). Environment fully static.",
          "The first and last frames must match exactly so the clip loops seamlessly.",
          "Forbidden: UI, captions, camera motion, zoom, composition changes.",
        ].join(" ");

        const referenceImageUrls = collectReferenceImageUrls(state.characters, state.locations);
        try {
          const { taskId } = await submitVideoGenerationApi({
            nodeId,
            prompt,
            style: state.setupDraft.visualStyle,
            duration,
            aspectRatio: node.data.aspectRatio ?? "9:16",
            firstFrameRef: first,
            lastFrameRef: last,
            referenceImageUrls,
          });
          const task: PendingGenerationTask = {
            taskId,
            kind: "video",
            nodeId,
            targetField: "loopVideoUrl",
            prompt,
          };
          set((current) => ({
            nodes: markNodeGenerating(current.nodes, nodeId, taskId),
            pendingGenerationTasks: [...current.pendingGenerationTasks, task],
          }));
          // 若尚未设尾帧，写回与首帧一致，保证 UI 与循环语义一致
          if (!node.data.lastFrameRef) {
            set((current) => ({
              nodes: current.nodes.map((n) =>
                n.id === nodeId && n.kind === "interaction"
                  ? { ...n, data: { ...n.data, lastFrameRef: first } }
                  : n,
              ),
            }));
          }
          return taskId;
        } catch {
          // mock 回退：本地无 API 时仍给出可预览循环占位
          const mockUrl = `mock://loop/${nodeId}/${Date.now()}`;
          set((current) => ({
            nodes: current.nodes.map((n) =>
              n.id === nodeId && n.kind === "interaction"
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      loopVideoUrl: mockUrl,
                      lastFrameRef: last,
                      activeGenerationTaskId: undefined,
                      generationHistory: [
                        {
                          id: `hist-${Date.now()}`,
                          kind: "video" as const,
                          provider: "mock",
                          prompt,
                          url: mockUrl,
                          createdAt: new Date().toISOString(),
                        },
                        ...(n.data.generationHistory ?? []),
                      ].slice(0, 12),
                    },
                  }
                : n,
            ),
          }));
          return null;
        }
      },
      pollGenerationTasks: async () => {
        const pending = get().pendingGenerationTasks;
        if (pending.length === 0) {
          return;
        }

        const remaining: PendingGenerationTask[] = [];
        let nodes = get().nodes;
        let characters = get().characters;
        let locations = get().locations;

        for (const task of pending) {
          try {
            const result = await pollGenerationTaskApi(task.taskId);
            if (result.status === "completed") {
              const url = result.resultUrl ?? result.videoUrl ?? result.imageUrl;
              if (url) {
                const applied = applyCompletedTaskToState(
                  { nodes, characters, locations },
                  task,
                  url,
                );
                nodes = applied.nodes;
                characters = applied.characters;
                locations = applied.locations;
                continue;
              }
              if (task.nodeId) {
                nodes = markNodeGenerationFailed(nodes, task.nodeId);
              }
              continue;
            }
            if (result.status === "failed") {
              if (task.nodeId) {
                nodes = markNodeGenerationFailed(nodes, task.nodeId);
              }
              continue;
            }
            remaining.push(task);
          } catch {
            remaining.push(task);
          }
        }

        set({ nodes, characters, locations, pendingGenerationTasks: remaining, lastSavedAt: new Date().toISOString() });
      },
      resetStaleGenerationStates: () =>
        set((state) => ({
          pendingGenerationTasks: [],
          nodes: state.nodes.map((node) => {
            if (node.kind === "scene" && (node.data.status === "generating" || node.data.activeGenerationTaskId)) {
              return {
                ...node,
                data: {
                  ...node.data,
                  status: node.data.videoUrl ? "ready" : "draft",
                  activeGenerationTaskId: undefined,
                },
              };
            }
            if (node.kind === "interaction" && node.data.activeGenerationTaskId) {
              return {
                ...node,
                data: { ...node.data, activeGenerationTaskId: undefined },
              };
            }
            return node;
          }),
        })),
      applyGenerationHistory: (nodeId, entryId) => {
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.id !== nodeId) return node;
            const history =
              node.kind === "scene"
                ? node.data.generationHistory
                : node.kind === "interaction"
                  ? node.data.generationHistory
                  : undefined;
            const entry = history?.find((item) => item.id === entryId);
            if (!entry) return node;
            if (node.kind === "scene") {
              return {
                ...node,
                data: {
                  ...node.data,
                  videoUrl: entry.kind === "video" ? entry.url : node.data.videoUrl,
                  firstFrameRef: entry.kind === "image" ? entry.url : node.data.firstFrameRef,
                  status: entry.kind === "video" ? "ready" : node.data.status,
                },
              };
            }
            if (node.kind === "interaction") {
              return {
                ...node,
                data: {
                  ...node.data,
                  loopVideoUrl: entry.url,
                },
              };
            }
            return node;
          }),
        }));
      },
      createSuggestedNodes: (suggestions) => {
        const episodeId = get().selectedEpisodeId || get().episodes[0]?.id;
        if (!episodeId) return;

        let lastNodeId: string | undefined;
        suggestions.forEach((suggestion, index) => {
          if (suggestion.kind === "scene") {
            get().addSceneNode(episodeId);
            const createdId = get().selectedNodeId;
            const created = get().nodes.find((node) => node.id === createdId);
            if (created?.kind === "scene") {
              get().updateNode(created.id, {
                title: suggestion.title,
                prompt: suggestion.promptOrInstruction ?? suggestion.title,
              });
              if (lastNodeId) {
                get().connectNodes(lastNodeId, created.id, "继续");
              }
              lastNodeId = created.id;
            }
          } else if (suggestion.kind === "interaction") {
            get().addInteractionNode(episodeId);
            const createdId = get().selectedNodeId;
            const created = get().nodes.find((node) => node.id === createdId);
            if (created?.kind === "interaction") {
              get().updateNode(created.id, {
                title: suggestion.title,
                instruction: suggestion.promptOrInstruction ?? suggestion.title,
              });
              if (lastNodeId) {
                get().connectNodes(lastNodeId, created.id, "互动");
              }
              lastNodeId = created.id;
            }
          } else if (suggestion.kind === "ending") {
            get().addEndingNode(episodeId);
            const createdId = get().selectedNodeId;
            const created = get().nodes.find((node) => node.id === createdId);
            if (created?.kind === "ending") {
              get().updateNode(created.id, {
                title: suggestion.title,
                description: suggestion.promptOrInstruction ?? suggestion.title,
              });
              if (lastNodeId) {
                get().connectNodes(lastNodeId, created.id, "结局", "ending");
              }
              lastNodeId = created.id;
            }
          }
          if (index === suggestions.length - 1) {
            get().selectNode(lastNodeId);
          }
        });
      },
      validateStory: () => {
        const state = get();
        const issues: StoryValidationIssue[] = [];
        const nodeIds = new Set(state.nodes.map((node) => node.id));

        state.episodes.forEach((episode) => {
          const episodeNodes = state.nodes.filter((node) => node.data.episodeId === episode.id);
          if (episodeNodes.length === 0) {
            issues.push({
              id: `episode-empty-${episode.id}`,
              severity: "error",
              title: `第 ${episode.index} 集没有节点`,
              detail: "每一集至少需要一个视频节点和一个互动节点，App 才能播放完整流程。",
              episodeId: episode.id,
            });
          }
          if (!episodeNodes.some((node) => node.kind === "scene")) {
            issues.push({
              id: `episode-no-scene-${episode.id}`,
              severity: "error",
              title: `第 ${episode.index} 集缺少视频节点`,
              detail: "互动影游 App 需要至少一个可播放的视频节点作为入口。",
              episodeId: episode.id,
            });
          }
          if (!episodeNodes.some((node) => node.kind === "interaction")) {
            issues.push({
              id: `episode-no-interaction-${episode.id}`,
              severity: "warning",
              title: `第 ${episode.index} 集缺少互动节点`,
              detail: "没有互动节点时，这一集会退化为线性短剧。",
              episodeId: episode.id,
            });
          }
        });

        state.nodes.forEach((node) => {
          if (node.kind === "scene") {
            if (!node.data.prompt.trim()) {
              issues.push({
                id: `scene-empty-prompt-${node.id}`,
                severity: "error",
                title: "视频节点缺少 Prompt",
                detail: `${node.data.title} 需要视频生成描述。`,
                nodeId: node.id,
                episodeId: node.data.episodeId,
              });
            }
            if (node.data.status !== "ready") {
              issues.push({
                id: `scene-not-ready-${node.id}`,
                severity: "warning",
                title: "视频节点尚未就绪",
                detail: `${node.data.title} 当前状态为 ${node.data.status}，预览和 App 导出会使用占位视频。`,
                nodeId: node.id,
                episodeId: node.data.episodeId,
              });
            }
          }

          if (node.kind === "interaction") {
            if (node.data.options.length === 0) {
              issues.push({
                id: `interaction-no-option-${node.id}`,
                severity: "error",
                title: "互动节点缺少选项",
                detail: `${node.data.title} 至少需要一个选项才能分支到后续节点。`,
                nodeId: node.id,
                episodeId: node.data.episodeId,
              });
            }
            node.data.options.forEach((option) => {
              if (!option.targetNodeId || !nodeIds.has(option.targetNodeId)) {
                issues.push({
                  id: `option-no-target-${option.id}`,
                  severity: "warning",
                  title: "互动选项未连接目标节点",
                  detail: `${node.data.title} 的「${option.label}」没有有效目标节点。`,
                  nodeId: node.id,
                  episodeId: node.data.episodeId,
                });
              }
            });
          }
        });

        return issues;
      },
      publishStory: () => {
        const issues = get().validateStory();
        if (!issues.some((issue) => issue.severity === "error")) {
          set({
            lastPublishedAt: new Date().toISOString(),
            lastSavedAt: new Date().toISOString(),
          });
        }
        return issues;
      },
      updateWorld: (world) =>
        set((state) => ({ world: { ...state.world, ...world } })),
      updateSetupDraft: (draft) =>
        set((state) => ({
          setupDraft: { ...state.setupDraft, ...draft },
        })),
      addCharacter: (character) => {
        get().pushHistory();
        const id = uuidv4();
        set((state) => ({
          characters: [{ ...character, id }, ...state.characters],
        }));
        return id;
      },
      updateCharacter: (id, character) =>
        set((state) => ({
          characters: state.characters.map((item) =>
            item.id === id ? { ...item, ...character } : item,
          ),
        })),
      deleteCharacter: (id) => {
        get().pushHistory();
        set((state) => ({
          characters: state.characters.filter((item) => item.id !== id),
        }));
      },
      addLocation: (location) => {
        get().pushHistory();
        const id = uuidv4();
        set((state) => ({
          locations: [{ ...location, id }, ...state.locations],
        }));
        return id;
      },
      updateLocation: (id, location) =>
        set((state) => ({
          locations: state.locations.map((item) =>
            item.id === id ? { ...item, ...location } : item,
          ),
        })),
      deleteLocation: (id) => {
        get().pushHistory();
        set((state) => ({
          locations: state.locations.filter((item) => item.id !== id),
        }));
      },
      addEpisode: (episode) => {
        get().pushHistory();
        const id = uuidv4();
        set((state) => ({
          episodes: applyEpisodeBranchLabels(
            [
              ...state.episodes,
              { ...episode, id, index: state.episodes.length + 1 },
            ],
            state.nodes,
            state.edges,
          ),
        }));
        return id;
      },
      updateEpisode: (id, episode) =>
        set((state) => ({
          episodes: state.episodes.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...episode,
                  frame: episode.frame
                    ? { ...item.frame, ...episode.frame }
                    : item.frame,
                }
              : item,
          ),
        })),
      syncEpisodeBranchLabels: () =>
        set((state) => {
          const episodes = applyEpisodeBranchLabels(state.episodes, state.nodes, state.edges);
          return episodes === state.episodes ? state : { episodes };
        }),
      deleteEpisode: (id) => {
        get().pushHistory();
        set((state) => {
          const nodes = state.nodes.filter((node) => node.data.episodeId !== id);
          const nodeIds = new Set(nodes.map((n) => n.id));
          const edges = state.edges.filter(
            (edge) =>
              (edge.source === "__start__" || nodeIds.has(edge.source)) &&
              nodeIds.has(edge.target),
          );
          const episodes = applyEpisodeBranchLabels(
            state.episodes
              .filter((episode) => episode.id !== id)
              .map((episode, index) => ({ ...episode, index: index + 1 })),
            nodes,
            edges,
          );
          return {
            episodes,
            nodes,
            edges,
            selectedEpisodeId:
              state.selectedEpisodeId === id
                ? episodes[0]?.id ?? "ep1"
                : state.selectedEpisodeId,
          };
        });
      },
      duplicateEpisode: (id) => {
        const state = get();
        const source = state.episodes.find((episode) => episode.id === id);
        if (!source) return null;
        get().pushHistory();
        const newEpisodeId = uuidv4();
        const sourceNodes = state.nodes.filter((node) => node.data.episodeId === id);
        const idMap = new Map<string, string>();
        for (const node of sourceNodes) {
          idMap.set(node.id, `${node.kind}-${uuidv4()}`);
        }
        const offset = 48;
        const clonedNodes: StoryNode[] = sourceNodes.map((node) => {
          const nextId = idMap.get(node.id)!;
          const cloned = structuredClone(node) as StoryNode;
          cloned.id = nextId;
          cloned.data = { ...cloned.data, id: nextId, episodeId: newEpisodeId };
          cloned.position = {
            x: (node.position?.x ?? 0) + offset,
            y: (node.position?.y ?? 0) + offset,
          };
          if (cloned.kind === "interaction") {
            cloned.data.options = cloned.data.options.map((option) => ({
              ...option,
              id: uuidv4(),
              targetNodeId: option.targetNodeId
                ? idMap.get(option.targetNodeId) ?? option.targetNodeId
                : undefined,
            }));
          }
          return cloned;
        });
        const sourceNodeIds = new Set(sourceNodes.map((node) => node.id));
        const clonedEdges: StoryEdge[] = state.edges
          .filter(
            (edge) =>
              sourceNodeIds.has(edge.source) && sourceNodeIds.has(edge.target),
          )
          .map((edge) => ({
            ...edge,
            id: `edge-${uuidv4()}`,
            source: idMap.get(edge.source)!,
            target: idMap.get(edge.target)!,
            sourceHandle: edge.sourceHandle
              ? undefined // remapped via option ids already new; keep unbound handle
              : undefined,
          }));
        // Re-bind sourceHandle after option id remap when possible by matching target
        const reboundEdges = clonedEdges.map((edge) => {
          const src = clonedNodes.find((n) => n.id === edge.source);
          if (src?.kind !== "interaction") return edge;
          const opt = src.data.options.find((o) => o.targetNodeId === edge.target);
          return opt ? { ...edge, sourceHandle: opt.id, label: opt.label || edge.label } : edge;
        });

        set((current) => {
          const episodes = applyEpisodeBranchLabels(
            [
              ...current.episodes,
              {
                ...source,
                id: newEpisodeId,
                index: current.episodes.length + 1,
                title: `${source.title} 副本`,
                highlight: source.highlight,
                frame: source.frame
                  ? {
                      ...source.frame,
                      x: source.frame.x + offset,
                      y: source.frame.y + offset,
                    }
                  : undefined,
              },
            ],
            [...current.nodes, ...clonedNodes],
            [...current.edges, ...reboundEdges],
          );
          return {
            episodes,
            nodes: [...current.nodes, ...clonedNodes],
            edges: [...current.edges, ...reboundEdges],
            selectedEpisodeId: newEpisodeId,
          };
        });
        return newEpisodeId;
      },
      copyEpisodeToProject: (episodeId, projectId) => {
        const state = get();
        if (projectId === state.activeProjectId) {
          return Boolean(get().duplicateEpisode(episodeId));
        }
        const sourceEpisode = state.episodes.find((episode) => episode.id === episodeId);
        if (!sourceEpisode) return false;
        const sourceNodes = state.nodes.filter((node) => node.data.episodeId === episodeId);
        const sourceNodeIds = new Set(sourceNodes.map((node) => node.id));
        const sourceEdges = state.edges.filter(
          (edge) => sourceNodeIds.has(edge.source) && sourceNodeIds.has(edge.target),
        );

        const syncedProjects = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        );
        const targetIndex = syncedProjects.findIndex((item) => item.id === projectId);
        if (targetIndex < 0) return false;

        get().pushHistory();
        const newEpisodeId = uuidv4();
        const idMap = new Map<string, string>();
        for (const node of sourceNodes) {
          idMap.set(node.id, `${node.kind}-${uuidv4()}`);
        }
        const clonedNodes: StoryNode[] = sourceNodes.map((node) => {
          const nextId = idMap.get(node.id)!;
          const cloned = structuredClone(node) as StoryNode;
          cloned.id = nextId;
          cloned.data = { ...cloned.data, id: nextId, episodeId: newEpisodeId };
          if (cloned.kind === "interaction") {
            cloned.data.options = cloned.data.options.map((option) => ({
              ...option,
              id: uuidv4(),
              targetNodeId: option.targetNodeId
                ? idMap.get(option.targetNodeId) ?? undefined
                : undefined,
            }));
          }
          return cloned;
        });
        const clonedEdges: StoryEdge[] = sourceEdges.map((edge) => {
          const source = idMap.get(edge.source)!;
          const target = idMap.get(edge.target)!;
          const srcNode = clonedNodes.find((n) => n.id === source);
          const opt =
            srcNode?.kind === "interaction"
              ? srcNode.data.options.find((o) => o.targetNodeId === target)
              : undefined;
          return {
            ...edge,
            id: `edge-${uuidv4()}`,
            source,
            target,
            sourceHandle: opt?.id,
            label: opt?.label || edge.label,
          };
        });

        const target = syncedProjects[targetIndex];
        const nextEpisodes = applyEpisodeBranchLabels(
          [
            ...target.episodes,
            {
              ...sourceEpisode,
              id: newEpisodeId,
              index: target.episodes.length + 1,
              title: `${sourceEpisode.title} 副本`,
            },
          ],
          [...target.nodes, ...clonedNodes],
          [...target.edges, ...clonedEdges],
        );
        const now = new Date().toISOString();
        const updated: WorldProject = {
          ...target,
          updatedAt: now,
          episodes: nextEpisodes,
          nodes: [...target.nodes, ...clonedNodes],
          edges: [...target.edges, ...clonedEdges],
        };
        const nextProjects = [...syncedProjects];
        nextProjects[targetIndex] = updated;
        set({ projects: nextProjects });
        return true;
      },
      addSceneNode: (episodeId) => {
        get().pushHistory();
        set((state) => {
          const id = `scene-${uuidv4()}`;
          const targetEpisodeId = episodeId ?? state.selectedEpisodeId;
          const episodeIndex = Math.max(state.episodes.findIndex((episode) => episode.id === targetEpisodeId), 0);
          const episode = state.episodes[episodeIndex] ?? state.episodes[0];
          const nodeIndex = state.nodes.filter((node) => node.data.episodeId === targetEpisodeId).length;
          return {
            nodes: [
              ...state.nodes,
              {
                id,
                kind: "scene",
                data: {
                  id,
                  episodeId: targetEpisodeId,
                  title: "未命名视频节点",
                  prompt: "描述这一段视频的剧情动作、构图、镜头运动和连续性要求。",
                  status: "empty",
                },
                position: defaultNodePosition(episode, episodeIndex, nodeIndex),
              },
            ],
            selectedNodeId: id,
          };
        });
      },
      addInteractionNode: (episodeId) => {
        get().pushHistory();
        set((state) => {
          const id = `interaction-${uuidv4()}`;
          const targetEpisodeId = episodeId ?? state.selectedEpisodeId;
          const episodeIndex = Math.max(state.episodes.findIndex((episode) => episode.id === targetEpisodeId), 0);
          const episode = state.episodes[episodeIndex] ?? state.episodes[0];
          const nodeIndex = state.nodes.filter((node) => node.data.episodeId === targetEpisodeId).length;
          return {
            nodes: [
              ...state.nodes,
              {
                id,
                kind: "interaction",
                data: {
                  id,
                  episodeId: targetEpisodeId,
                  title: "未命名互动节点",
                  instruction:
                    "Locked off camera. Only micro movements (blink, breath). Environment fully static. The first and last frames must match exactly so the clip loops seamlessly. Forbidden: UI, captions, camera motion.",
                  aspectRatio: "9:16",
                  durationSec: 4,
                  videoModel: "seedance-2.0-fast",
                  options: [
                    {
                      id: uuidv4(),
                      label: "选项 A",
                      actionType: "tap",
                      actionValue: "(0.35, 0.50)",
                      color: "#2f7df6",
                      hotspot: { x: 0.35, y: 0.5 },
                    },
                    {
                      id: uuidv4(),
                      label: "选项 B",
                      actionType: "tap",
                      actionValue: "(0.65, 0.50)",
                      color: "#22c55e",
                      hotspot: { x: 0.65, y: 0.5 },
                    },
                  ],
                },
                position: defaultNodePosition(episode, episodeIndex, nodeIndex),
              },
            ],
            selectedNodeId: id,
          };
        });
      },
      addEndingNode: (episodeId) => {
        get().pushHistory();
        set((state) => {
          const id = `ending-${uuidv4()}`;
          const targetEpisodeId = episodeId ?? state.selectedEpisodeId;
          const episodeIndex = Math.max(state.episodes.findIndex((episode) => episode.id === targetEpisodeId), 0);
          const episode = state.episodes[episodeIndex] ?? state.episodes[0];
          const nodeIndex = state.nodes.filter((node) => node.data.episodeId === targetEpisodeId).length;
          return {
            nodes: [
              ...state.nodes,
              {
                id,
                kind: "ending",
                data: {
                  id,
                  episodeId: targetEpisodeId,
                  title: "未命名结局节点",
                  endingType: "normal",
                  description: "描述这条分支的结局、情绪落点和 App 播放后的状态。",
                },
                position: defaultNodePosition(episode, episodeIndex, nodeIndex),
              },
            ],
            selectedNodeId: id,
          };
        });
      },
      updateNode: (id, data) => {
        get().pushHistory();
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...data } as StoryNode["data"] }
              : node,
          ) as StoryNode[],
        }));
      },
      updateNodePosition: (id, position) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? ({ ...node, position } as StoryNode) : node,
          ),
        })),
      updateNodePositions: (positions) => {
        get().pushHistory();
        set((state) => {
          const positionMap = new Map(positions.map((item) => [item.id, item.position]));
          return {
            nodes: state.nodes.map((node) => {
              const position = positionMap.get(node.id);
              return position ? ({ ...node, position } as StoryNode) : node;
            }),
          };
        });
      },
      autoLayoutEpisodes: () => {
        get().pushHistory();
        set((state) => {
          const laid = layoutConnectedStoryGraph(state.episodes, state.nodes, state.edges, {
            startY: 360,
          });
          return {
            nodes: laid.nodes,
            episodes: applyEpisodeBranchLabels(laid.episodes, laid.nodes, state.edges),
            lastSavedAt: new Date().toISOString(),
          };
        });
      },
      deleteNode: (id) => {
        // 固定入口节点不可删
        if (id === "__start__") return;
        get().pushHistory();
        set((state) => {
          const nodes = state.nodes.filter((node) => node.id !== id);
          const edges = state.edges.filter((edge) => edge.source !== id && edge.target !== id);
          return {
            nodes,
            edges,
            episodes: applyEpisodeBranchLabels(state.episodes, nodes, edges),
            selectedNodeId: state.selectedNodeId === id ? undefined : state.selectedNodeId,
          };
        });
      },
      deleteEdges: (ids) => {
        const unique = [...new Set(ids.filter(Boolean))];
        if (!unique.length) return;
        const idSet = new Set(unique);
        const dropSyntheticStart = idSet.has("__start_edge__");
        get().pushHistory();
        set((state) => {
          const removingStart =
            dropSyntheticStart ||
            state.edges.some((edge) => idSet.has(edge.id) && edge.source === "__start__");
          const removed = state.edges.filter(
            (edge) =>
              idSet.has(edge.id) || (dropSyntheticStart && edge.source === "__start__"),
          );
          if (!removed.length && !dropSyntheticStart) return state;

          const edges = state.edges.filter(
            (edge) =>
              !idSet.has(edge.id) && !(dropSyntheticStart && edge.source === "__start__"),
          );

          const nodes = state.nodes.map((node) => {
            if (node.kind !== "interaction") return node;
            let changed = false;
            const options = node.data.options.map((opt) => {
              const hit = removed.some(
                (edge) =>
                  edge.source === node.id &&
                  ((edge.sourceHandle != null && edge.sourceHandle === opt.id) ||
                    ((edge.sourceHandle == null || edge.sourceHandle === "") &&
                      opt.targetNodeId === edge.target)),
              );
              if (!hit) return opt;
              changed = true;
              return { ...opt, targetNodeId: undefined };
            });
            if (!changed) return node;
            return { ...node, data: { ...node.data, options } };
          });

          return {
            nodes,
            edges,
            suppressAutoStartEdge: removingStart ? true : state.suppressAutoStartEdge,
            episodes: applyEpisodeBranchLabels(state.episodes, nodes, edges),
          };
        });
      },
      duplicateNode: (id) =>
        set((state) => {
          const node = state.nodes.find((item) => item.id === id);
          if (!node) return state;
          const nextId = `${node.kind}-${uuidv4()}`;
          const duplicated = structuredClone(node) as StoryNode;
          duplicated.id = nextId;
          duplicated.data.id = nextId;
          duplicated.data.title = `${duplicated.data.title} 副本`;
          duplicated.position = {
            x: (node.position?.x ?? 0) + 36,
            y: (node.position?.y ?? 0) + 36,
          };
          return {
            nodes: [...state.nodes, duplicated],
            selectedNodeId: nextId,
          };
        }),
      addOption: (nodeId) =>
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.id !== nodeId || node.kind !== "interaction") return node;
            return {
              ...node,
              data: {
                ...node.data,
                options: [
                  ...node.data.options,
                  {
                    id: uuidv4(),
                    label: "新互动选项",
                    actionType: "tap",
                    actionValue: "(0.50, 0.50)",
                    color: "#2f7df6",
                    hotspot: { x: 0.5, y: 0.5 },
                  },
                ],
              },
            };
          }),
        })),
      updateOption: (nodeId, optionId, option) =>
        set((state) => {
          const nodes = state.nodes.map((node) => {
            if (node.id !== nodeId || node.kind !== "interaction") return node;
            return {
              ...node,
              data: {
                ...node.data,
                options: node.data.options.map((item) =>
                  item.id === optionId ? { ...item, ...option } : item,
                ),
              },
            };
          });
          return {
            nodes,
            episodes: applyEpisodeBranchLabels(state.episodes, nodes, state.edges),
          };
        }),
      deleteOption: (nodeId, optionId) =>
        set((state) => {
          const nodes = state.nodes.map((node) => {
            if (node.id !== nodeId || node.kind !== "interaction") return node;
            return {
              ...node,
              data: {
                ...node.data,
                options: node.data.options.filter((item) => item.id !== optionId),
              },
            };
          });
          return {
            nodes,
            episodes: applyEpisodeBranchLabels(state.episodes, nodes, state.edges),
          };
        }),
      connectNodes: (source, target, label = "继续", actionType, sourceHandle) => {
        if (source === "__start__") {
          get().pushHistory();
          set((state) => {
            const withoutStart = state.edges.filter((edge) => edge.source !== "__start__");
            const edges = [
              ...withoutStart,
              { id: `edge-${uuidv4()}`, source: "__start__", target, label: "开始", sourceHandle: undefined },
            ];
            return {
              edges,
              suppressAutoStartEdge: false,
              episodes: applyEpisodeBranchLabels(state.episodes, state.nodes, edges),
            };
          });
          return;
        }
        get().pushHistory();
        set((state) => {
          const sourceNode = state.nodes.find((node) => node.id === source);
          let boundHandle = sourceHandle ?? undefined;
          const nodes = state.nodes.map((node) => {
            if (node.id !== source || node.kind !== "interaction") return node;
            const byHandle = sourceHandle
              ? node.data.options.find((item) => item.id === sourceHandle)
              : undefined;
            const option = byHandle ?? node.data.options.find((item) => !item.targetNodeId);
            if (!option) return node;
            boundHandle = option.id;
            return {
              ...node,
              data: {
                ...node.data,
                options: node.data.options.map((item) =>
                  item.id === option.id ? { ...item, targetNodeId: target } : item,
                ),
              },
            };
          });
          const edgeExists = state.edges.some(
            (edge) =>
              edge.source === source &&
              edge.target === target &&
              (boundHandle ? edge.sourceHandle === boundHandle : true),
          );
          const inferredAction =
            actionType ??
            (sourceNode?.kind === "interaction" && boundHandle
              ? sourceNode.data.options.find((item) => item.id === boundHandle)?.actionType
              : undefined);
          const edges = edgeExists
            ? state.edges
            : [
                ...state.edges,
                {
                  id: `edge-${uuidv4()}`,
                  source,
                  target,
                  label,
                  actionType: inferredAction,
                  sourceHandle: boundHandle,
                },
              ];
          return {
            nodes,
            edges,
            episodes: applyEpisodeBranchLabels(state.episodes, nodes, edges),
          };
        });
      },
      createConnectedNode: (sourceNodeId, kind, position, sourceHandle) => {
        const state = get();
        const sourceNode = state.nodes.find((node) => node.id === sourceNodeId);
        if (!sourceNode && sourceNodeId !== "__start__") return null;

        get().pushHistory();
        const targetEpisodeId =
          sourceNode?.data.episodeId ?? state.selectedEpisodeId ?? state.episodes[0]?.id;
        const episodeIndex = Math.max(
          state.episodes.findIndex((episode) => episode.id === targetEpisodeId),
          0,
        );
        const episode = state.episodes[episodeIndex] ?? state.episodes[0];
        if (!episode) return null;

        const nodeIndex = state.nodes.filter((node) => node.data.episodeId === targetEpisodeId).length;
        const fallbackPosition = defaultNodePosition(episode, episodeIndex, nodeIndex);
        const nextPosition = {
          x: position.x || fallbackPosition.x,
          y: position.y || fallbackPosition.y,
        };

        let createdId = "";
        set((current) => {
          if (kind === "scene") {
            const id = `scene-${uuidv4()}`;
            createdId = id;
            const newNode: StoryNode = {
              id,
              kind: "scene",
              data: {
                id,
                episodeId: targetEpisodeId,
                title: "未命名视频节点",
                prompt: "描述这一段视频的剧情动作、构图、镜头运动和连续性要求。",
                status: "empty",
              },
              position: nextPosition,
            };
            const nodes = [...current.nodes, newNode];
            const edges = [
              ...current.edges.filter((edge) =>
                sourceNodeId === "__start__" ? edge.source !== "__start__" : true,
              ),
              {
                id: `edge-${uuidv4()}`,
                source: sourceNodeId,
                target: id,
                label: sourceNodeId === "__start__" ? "开始" : "继续",
                sourceHandle: sourceHandle ?? undefined,
              },
            ];
            const nextState = {
              ...current,
              nodes,
              edges,
              selectedNodeId: id,
              selectedEpisodeId: targetEpisodeId,
              suppressAutoStartEdge:
                sourceNodeId === "__start__" ? false : current.suppressAutoStartEdge,
            };
            return {
              ...nextState,
              projects: syncProjectsFromWorkspace(
                current.projects,
                current.activeProjectId,
                workspaceSlice(nextState),
              ),
            };
          }

          if (kind === "interaction") {
            const id = `interaction-${uuidv4()}`;
            createdId = id;
            const newNode: StoryNode = {
              id,
              kind: "interaction",
              data: {
                id,
                episodeId: targetEpisodeId,
                title: "未命名互动节点",
                instruction:
                  "Locked off camera. Only micro movements (blink, breath). Environment fully static. The first and last frames must match exactly so the clip loops seamlessly. Forbidden: UI, captions, camera motion.",
                aspectRatio: "9:16",
                durationSec: 4,
                videoModel: "seedance-2.0-fast",
                options: [
                  {
                    id: uuidv4(),
                    label: "选项 A",
                    actionType: "tap",
                    actionValue: "(0.35, 0.50)",
                    color: "#2f7df6",
                    hotspot: { x: 0.35, y: 0.5 },
                  },
                  {
                    id: uuidv4(),
                    label: "选项 B",
                    actionType: "tap",
                    actionValue: "(0.65, 0.50)",
                    color: "#22c55e",
                    hotspot: { x: 0.65, y: 0.5 },
                  },
                ],
              },
              position: nextPosition,
            };
            const nodes = [...current.nodes, newNode];
            const edges = [
              ...current.edges.filter((edge) =>
                sourceNodeId === "__start__" ? edge.source !== "__start__" : true,
              ),
              {
                id: `edge-${uuidv4()}`,
                source: sourceNodeId,
                target: id,
                label: sourceNodeId === "__start__" ? "开始" : "继续",
                sourceHandle: sourceHandle ?? undefined,
              },
            ];
            const nextState = {
              ...current,
              nodes,
              edges,
              selectedNodeId: id,
              selectedEpisodeId: targetEpisodeId,
              suppressAutoStartEdge:
                sourceNodeId === "__start__" ? false : current.suppressAutoStartEdge,
            };
            return {
              ...nextState,
              projects: syncProjectsFromWorkspace(
                current.projects,
                current.activeProjectId,
                workspaceSlice(nextState),
              ),
            };
          }

          const id = `ending-${uuidv4()}`;
          createdId = id;
          const newNode: StoryNode = {
            id,
            kind: "ending",
            data: {
              id,
              episodeId: targetEpisodeId,
              title: "未命名结局节点",
              endingType: "normal",
              description: "描述这条分支的结局、情绪落点和 App 播放后的状态。",
            },
            position: nextPosition,
          };
          const nodes = [...current.nodes, newNode];
          const edges = [
            ...current.edges.filter((edge) =>
              sourceNodeId === "__start__" ? edge.source !== "__start__" : true,
            ),
            {
              id: `edge-${uuidv4()}`,
              source: sourceNodeId,
              target: id,
              label: "结局",
              actionType: "ending" as const,
              sourceHandle: sourceHandle ?? undefined,
            },
          ];

          const nodesWithOption =
            sourceNode?.kind === "interaction"
              ? nodes.map((node) => {
                  if (node.id !== sourceNodeId || node.kind !== "interaction") return node;
                  const option =
                    (sourceHandle
                      ? node.data.options.find((item) => item.id === sourceHandle)
                      : undefined) ?? node.data.options.find((item) => !item.targetNodeId);
                  if (!option) return node;
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      options: node.data.options.map((item) =>
                        item.id === option.id ? { ...item, targetNodeId: id } : item,
                      ),
                    },
                  };
                })
              : nodes;

          const nextState = {
            ...current,
            nodes: nodesWithOption,
            edges,
            selectedNodeId: id,
            selectedEpisodeId: targetEpisodeId,
            suppressAutoStartEdge:
              sourceNodeId === "__start__" ? false : current.suppressAutoStartEdge,
          };
          return {
            ...nextState,
            projects: syncProjectsFromWorkspace(
              current.projects,
              current.activeProjectId,
              workspaceSlice(nextState),
            ),
          };
        });

        if (sourceNode?.kind === "interaction" && kind !== "ending" && createdId) {
          const latest = get().nodes.find((node) => node.id === sourceNodeId);
          if (latest?.kind === "interaction") {
            const option =
              (sourceHandle
                ? latest.data.options.find((item) => item.id === sourceHandle)
                : undefined) ?? latest.data.options.find((item) => !item.targetNodeId);
            if (option) {
              get().updateOption(sourceNodeId, option.id, { targetNodeId: createdId });
            } else {
              get().addOption(sourceNodeId);
              const refreshed = get().nodes.find((node) => node.id === sourceNodeId);
              if (refreshed?.kind === "interaction") {
                const lastOption = refreshed.data.options[refreshed.data.options.length - 1];
                if (lastOption) {
                  get().updateOption(sourceNodeId, lastOption.id, {
                    targetNodeId: createdId,
                    label: "继续",
                  });
                }
              }
            }
          }
        }

        return createdId || null;
      },
      selectNode: (id) => set({ selectedNodeId: id }),
      selectEpisode: (id) => set({ selectedEpisodeId: id }),
      requestCanvasFocus: (kind, id) =>
        set((state) => {
          if (kind === "episode") {
            return {
              selectedEpisodeId: id,
              selectedNodeId: undefined,
              canvasFocusRequest: {
                kind: "episode",
                id,
                nonce: state.canvasFocusRequest.nonce + 1,
              },
            };
          }
          const node = state.nodes.find((item) => item.id === id);
          return {
            selectedNodeId: id,
            selectedEpisodeId: node?.data.episodeId ?? state.selectedEpisodeId,
            canvasFocusRequest: {
              kind: "node",
              id,
              nonce: state.canvasFocusRequest.nonce + 1,
            },
          };
        }),
      exportStoryJson: () => {
        const state = get();
        return JSON.stringify(
          {
            world: state.world,
            characters: state.characters,
            locations: state.locations,
            episodes: state.episodes.map((episode) => ({
              ...episode,
              nodes: state.nodes.filter((node) => node.data.episodeId === episode.id),
              edges: state.edges.filter((edge) => {
                const source = state.nodes.find((node) => node.id === edge.source);
                return source?.data.episodeId === episode.id;
              }),
            })),
          },
          null,
          2,
        );
      },
      exportAppJson: () => {
        const state = get();
        return JSON.stringify(
          {
            schemaVersion: 1,
            appTarget: "DramaPlay iOS Interactive Drama",
            exportedAt: new Date().toISOString(),
            world: state.world,
            characters: state.characters,
            locations: state.locations,
            episodes: state.episodes.map((episode) => {
              const episodeNodes = state.nodes.filter((node) => node.data.episodeId === episode.id);
              const episodeNodeIds = new Set(episodeNodes.map((node) => node.id));
              return {
                id: episode.id,
                index: episode.index,
                title: episode.title,
                nodes: episodeNodes.map((node) => {
                  if (node.kind === "scene") {
                    return {
                      id: node.id,
                      type: "video",
                      title: node.data.title,
                      prompt: node.data.prompt,
                      videoUrl: node.data.videoUrl ?? null,
                      firstFrameRef: node.data.firstFrameRef ?? null,
                      status: node.data.status,
                    };
                  }
                  if (node.kind === "interaction") {
                    return {
                      id: node.id,
                      type: "interaction",
                      title: node.data.title,
                      instruction: node.data.instruction,
                      loopVideoUrl: node.data.loopVideoUrl ?? null,
                      firstFrameRef: node.data.firstFrameRef ?? null,
                      lastFrameRef: node.data.lastFrameRef ?? null,
                      options: node.data.options.map((option) => ({
                        id: option.id,
                        label: option.label,
                        actionType: option.actionType,
                        actionValue: option.actionValue ?? null,
                        targetNodeId: option.targetNodeId ?? null,
                        color: option.color ?? null,
                        hotspot: option.hotspot ?? null,
                      })),
                    };
                  }
                  return {
                    id: node.id,
                    type: "ending",
                    title: node.data.title,
                    endingType: node.data.endingType,
                    description: node.data.description,
                  };
                }),
                edges: state.edges.filter(
                  (edge) => episodeNodeIds.has(edge.source) || episodeNodeIds.has(edge.target),
                ),
              };
            }),
          },
          null,
          2,
        );
      },
      exportThirdPartyWorkflow: (target) => {
        const state = get();
        const workflowName = target === "tapnow" ? "TapNow 互动短剧工作流" : "LibTV 分支播放工作流";
        return JSON.stringify(
          {
            workflow: workflowName,
            target,
            copiedAt: new Date().toISOString(),
            project: {
              name: "互动短剧编辑器 DramaEditor",
              slogan: "一键生成，可以玩的短剧 One Click, Boundless Stories",
              worldId: state.world.id,
              title: state.world.title,
            },
            roles: [
              { id: "writer", name: "编剧", permissions: ["编辑世界观", "编辑剧本", "调整分支"] },
              { id: "director", name: "导演", permissions: ["审核镜头", "调整节奏", "发布检查"] },
              { id: "interaction", name: "交互设计", permissions: ["编辑互动节点", "连接目标节点", "导出 App 数据"] },
              { id: "video", name: "视频制作", permissions: ["生成视频", "上传视频 URL", "管理首帧参考"] },
            ],
            episodes: state.episodes.map((episode) => {
              const episodeNodes = state.nodes.filter((node) => node.data.episodeId === episode.id);
              return {
                id: episode.id,
                label: episode.label ?? String(episode.index),
                title: episode.title,
                moduleType: episode.label?.toLowerCase().includes("b") ? "branch" : "main",
                nodes: episodeNodes.map((node) => ({
                  id: node.id,
                  kind: node.kind,
                  title: node.data.title,
                  position: node.position ?? null,
                  payload: node.data,
                })),
                connections: state.edges.filter((edge) =>
                  episodeNodes.some((node) => node.id === edge.source || node.id === edge.target),
                ),
              };
            }),
          },
          null,
          2,
        );
      },
      updateCreationSession: (patch) =>
        set((state) => ({
          creationSession: { ...state.creationSession, ...patch },
        })),
      addReference: (reference) =>
        set((state) => ({
          creationSession: {
            ...state.creationSession,
            references: [...state.creationSession.references, reference],
          },
        })),
      removeReference: (id) =>
        set((state) => ({
          creationSession: {
            ...state.creationSession,
            references: state.creationSession.references.filter((item) => item.id !== id),
          },
        })),
      updateReference: (id, patch) =>
        set((state) => ({
          creationSession: {
            ...state.creationSession,
            references: state.creationSession.references.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          },
        })),
      setDecomposePreview: (result) =>
        set((state) => ({
          creationSession: { ...state.creationSession, lastDecompose: result },
        })),
      createProjectFromSession: (options) => {
        const state = get();
        const session = {
          ...state.creationSession,
          prompt: state.creationSession.prompt,
        };
        const project = options?.decomposeResult
          ? buildProjectFromDecompose(options.decomposeResult, session)
          : buildBlankProject(session);
        const syncedProjects = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        );
        set({
          projects: [...syncedProjects, project],
          activeProjectId: project.id,
          ...projectToWorkspace(project),
        });
        return project.id;
      },
      cloneProject: (sourceProjectId) => {
        const state = get();
        const syncedProjects = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        );
        const sourceId = sourceProjectId ?? state.activeProjectId;
        const source = syncedProjects.find((item) => item.id === sourceId);
        if (!source) return null;
        const cloned = cloneWorldProject(source);
        set({
          projects: [...syncedProjects, cloned],
          activeProjectId: cloned.id,
          ...projectToWorkspace(cloned),
        });
        return cloned.id;
      },
      renameProject: (id, name) => {
        const trimmed = name.trim().slice(0, 60);
        if (!trimmed) return;
        const state = get();
        const syncedProjects = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        );
        const index = syncedProjects.findIndex((item) => item.id === id);
        if (index < 0) return;
        const now = new Date().toISOString();
        const updated: WorldProject = {
          ...syncedProjects[index],
          name: trimmed,
          updatedAt: now,
          world: { ...syncedProjects[index].world, title: trimmed },
          setupDraft: { ...syncedProjects[index].setupDraft, worldTitle: trimmed },
        };
        const nextProjects = [...syncedProjects];
        nextProjects[index] = updated;
        if (state.activeProjectId === id) {
          set({
            projects: nextProjects,
            ...projectToWorkspace(updated),
          });
          return;
        }
        set({ projects: nextProjects });
      },
      switchProject: (id) => {
        const state = get();
        const now = new Date().toISOString();
        const syncedProjects = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        );
        const project = syncedProjects.find((item) => item.id === id);
        if (!project) return;
        const nextProjects = syncedProjects.map((item) =>
          item.id === id ? { ...item, lastOpenedAt: now } : item,
        );
        set({
          projects: nextProjects,
          activeProjectId: id,
          ...projectToWorkspace({ ...project, lastOpenedAt: now }),
        });
      },
      markProjectOpened: (id) => {
        const state = get();
        const targetId = id ?? state.activeProjectId;
        if (!targetId) return;
        const now = new Date().toISOString();
        const syncedProjects = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        );
        if (!syncedProjects.some((item) => item.id === targetId)) return;
        set({
          projects: syncedProjects.map((item) =>
            item.id === targetId ? { ...item, lastOpenedAt: now } : item,
          ),
        });
      },
      deleteProject: (id) => {
        const state = get();
        const syncedProjects = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        );
        const nextProjects = syncedProjects.filter((item) => item.id !== id);
        if (nextProjects.length === syncedProjects.length) return;

        if (state.activeProjectId === id) {
          const fallback = nextProjects[0];
          if (fallback) {
            set({
              projects: nextProjects,
              activeProjectId: fallback.id,
              ...projectToWorkspace(fallback),
            });
          } else {
            const blank = buildBlankProject(state.creationSession);
            set({
              projects: [],
              activeProjectId: "",
              ...projectToWorkspace(blank),
            });
          }
          return;
        }

        set({ projects: nextProjects });
      },
      listProjects: () => {
        const state = get();
        const synced = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        );
        const recency = (project: WorldProject) =>
          new Date(project.lastOpenedAt || project.updatedAt).getTime() || 0;
        return [...synced].sort((a, b) => recency(b) - recency(a));
      },
      commitSetupToWorld: () => {
        const state = get();
        const genre = parseCommaList(state.setupDraft.genre);
        const tags = parseCommaList(state.setupDraft.tags);
        set((current) => {
          const nextWorld = {
            ...current.world,
            title: current.setupDraft.worldTitle,
            description: current.setupDraft.worldDescription,
            genre: genre.length > 0 ? genre : current.world.genre,
            tags: tags.length > 0 ? tags : current.world.tags,
          };
          const syncedProjects = syncProjectsFromWorkspace(
            current.projects,
            current.activeProjectId,
            {
              ...workspaceSlice(current),
              world: nextWorld,
            },
          );
          return {
            world: nextWorld,
            projects: syncedProjects,
            lastSavedAt: new Date().toISOString(),
          };
        });
        get().generateStoryGraphFromScript();
      },
      generateStoryGraphFromScript: (options) => {
        const state = get();
        if (!options?.force && state.episodes.length > 0) {
          return false;
        }
        const script = state.setupDraft.script.trim();
        if (!script) {
          return false;
        }

        const analysis = analyzeScript(script);
        const graph = buildStoryGraphFromAnalysis(analysis);

        const existingNames = new Set(state.characters.map((item) => item.name));
        const newCharacters = analysis.characters
          .filter((item) => !existingNames.has(item.name))
          .map((item) => ({
            id: uuidv4(),
            name: item.name,
            role: item.role,
            description: `${item.name} - ${item.role}`,
          }));

        set((current) => {
          const nextState = {
            ...current,
            characters: [...newCharacters, ...current.characters],
            episodes: graph.episodes,
            nodes: withAutoLayout(graph.episodes, graph.nodes),
            edges: graph.edges,
            selectedEpisodeId: graph.episodes[0]?.id ?? "",
            selectedNodeId: undefined,
            lastSavedAt: new Date().toISOString(),
          };
          return {
            ...nextState,
            projects: syncProjectsFromWorkspace(
              current.projects,
              current.activeProjectId,
              workspaceSlice(nextState),
            ),
          };
        });
        return true;
      },
      ensureProjectLoaded: (projectId) => {
        const state = get();
        const targetId = projectId ?? state.activeProjectId;
        if (!targetId) return false;
        if (state.activeProjectId === targetId) return true;
        const project = state.projects.find((item) => item.id === targetId);
        if (!project) return false;
        get().switchProject(targetId);
        return true;
      },
      initServerSync: async () => {
        if (get().syncInitialized) return;
        const clientId = getOrCreateSyncClientId();
        set({ syncClientId: clientId });

        const applySharedState = (shared: SharedWorldBuilderState) => {
          const state = get();
          const activeId = shared.activeProjectId || shared.projects[0]?.id || "";
          const project =
            shared.projects.find((item) => item.id === activeId) ?? shared.projects[0];

          if (!project) {
            set({
              _remoteApplying: true,
              projects: structuredClone(shared.projects),
              activeProjectId: activeId,
              creationSession: structuredClone(shared.creationSession),
              serverRevision: shared.revision,
            });
            queueMicrotask(() => set({ _remoteApplying: false }));
            return;
          }

          const workspace = projectToWorkspace(project);
          const selectedNodeId =
            state.selectedNodeId && workspace.nodes.some((node) => node.id === state.selectedNodeId)
              ? state.selectedNodeId
              : undefined;
          const selectedEpisodeId = workspace.episodes.some(
            (episode) => episode.id === state.selectedEpisodeId,
          )
            ? state.selectedEpisodeId
            : workspace.selectedEpisodeId;

          set({
            _remoteApplying: true,
            projects: structuredClone(shared.projects),
            activeProjectId: activeId,
            creationSession: structuredClone(shared.creationSession),
            serverRevision: shared.revision,
            ...workspace,
            selectedNodeId,
            selectedEpisodeId,
          });
          queueMicrotask(() => set({ _remoteApplying: false }));
        };

        try {
          const result = await pullSharedState(get().serverRevision);
          const local = get();

          if (result.status === "updated") {
            const server = result.state;
            if (server.revision === 0 && local.projects.length > 0) {
              await get().pushToServer(true);
            } else if (server.revision > 0) {
              applySharedState(server);
            }
          } else if (local.projects.length > 0 && local.serverRevision === 0) {
            await get().pushToServer(true);
          }
        } catch (error) {
          console.warn("[sync] init failed", error);
        }

        set({ syncInitialized: true });
      },
      pullFromServer: async () => {
        if (!get().syncInitialized || get()._remoteApplying) return;

        const applySharedState = (shared: SharedWorldBuilderState) => {
          const state = get();
          const activeId = shared.activeProjectId || shared.projects[0]?.id || "";
          const project =
            shared.projects.find((item) => item.id === activeId) ?? shared.projects[0];

          if (!project) {
            set({
              _remoteApplying: true,
              projects: structuredClone(shared.projects),
              activeProjectId: activeId,
              creationSession: structuredClone(shared.creationSession),
              serverRevision: shared.revision,
            });
            queueMicrotask(() => set({ _remoteApplying: false }));
            return;
          }

          const workspace = projectToWorkspace(project);
          const selectedNodeId =
            state.selectedNodeId && workspace.nodes.some((node) => node.id === state.selectedNodeId)
              ? state.selectedNodeId
              : undefined;
          const selectedEpisodeId = workspace.episodes.some(
            (episode) => episode.id === state.selectedEpisodeId,
          )
            ? state.selectedEpisodeId
            : workspace.selectedEpisodeId;

          set({
            _remoteApplying: true,
            projects: structuredClone(shared.projects),
            activeProjectId: activeId,
            creationSession: structuredClone(shared.creationSession),
            serverRevision: shared.revision,
            ...workspace,
            selectedNodeId,
            selectedEpisodeId,
          });
          queueMicrotask(() => set({ _remoteApplying: false }));
        };

        try {
          const result = await pullSharedState(get().serverRevision);
          if (result.status !== "updated") return;
          const server = result.state;
          if (server.revision === get().serverRevision) return;
          applySharedState(server);
        } catch (error) {
          console.warn("[sync] pull failed", error);
        }
      },
      schedulePush: () => {
        if (!get().syncInitialized || get()._remoteApplying) return;
        if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
        pushDebounceTimer = setTimeout(() => {
          pushDebounceTimer = null;
          void get().pushToServer();
        }, PUSH_DEBOUNCE_MS);
      },
      pushToServer: async (force = false) => {
        const state = get();
        if (!state.syncInitialized) return;
        if (state._remoteApplying && !force) return;

        const clientId = state.syncClientId || getOrCreateSyncClientId();
        const projects = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        );

        const applySharedState = (shared: SharedWorldBuilderState) => {
          const current = get();
          const activeId = shared.activeProjectId || shared.projects[0]?.id || "";
          const project =
            shared.projects.find((item) => item.id === activeId) ?? shared.projects[0];

          if (!project) {
            set({
              _remoteApplying: true,
              projects: structuredClone(shared.projects),
              activeProjectId: activeId,
              creationSession: structuredClone(shared.creationSession),
              serverRevision: shared.revision,
              syncClientId: clientId,
            });
            queueMicrotask(() => set({ _remoteApplying: false }));
            return;
          }

          const workspace = projectToWorkspace(project);
          const selectedNodeId =
            current.selectedNodeId &&
            workspace.nodes.some((node) => node.id === current.selectedNodeId)
              ? current.selectedNodeId
              : undefined;
          const selectedEpisodeId = workspace.episodes.some(
            (episode) => episode.id === current.selectedEpisodeId,
          )
            ? current.selectedEpisodeId
            : workspace.selectedEpisodeId;

          set({
            _remoteApplying: true,
            projects: structuredClone(shared.projects),
            activeProjectId: activeId,
            creationSession: structuredClone(shared.creationSession),
            serverRevision: shared.revision,
            syncClientId: clientId,
            ...workspace,
            selectedNodeId,
            selectedEpisodeId,
          });
          queueMicrotask(() => set({ _remoteApplying: false }));
        };

        try {
          const result = await pushSharedState({
            expectedRevision: state.serverRevision,
            clientId,
            activeProjectId: state.activeProjectId,
            projects,
            creationSession: state.creationSession,
          });

          if (result.ok) {
            set({ serverRevision: result.state.revision, syncClientId: clientId });
          } else {
            applySharedState(result.conflict);
          }
        } catch (error) {
          console.warn("[sync] push failed", error);
        }
      },
      importStoryJson: (jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (!parsed.episodes || !Array.isArray(parsed.episodes)) {
            return { success: false, message: "JSON 格式无效：缺少 episodes 数组" };
          }

          const state = get();
          const importedEpisodes: Episode[] = [];
          const importedNodes: StoryNode[] = [];
          const importedEdges: StoryEdge[] = [];

          // Import episodes and their nodes/edges
          parsed.episodes.forEach((ep: any, epIndex: number) => {
            const epId = ep.id ?? `ep-import-${uuidv4()}`;
            const episode: Episode = {
              id: epId,
              index: epIndex + 1,
              label: ep.label ?? String(epIndex + 1),
              title: ep.title ?? `导入剧集 ${epIndex + 1}`,
              description: ep.description,
            };
            importedEpisodes.push(episode);

            // Import nodes
            if (Array.isArray(ep.nodes)) {
              ep.nodes.forEach((node: any, nodeIndex: number) => {
                const nodeKind = node.kind || node.type === "video" ? "scene" : node.type === "interaction" ? "interaction" : node.kind || "scene";
                const nodeId = node.id ?? `${nodeKind}-${uuidv4()}`;
                const pos = defaultNodePosition(episode, epIndex, nodeIndex);

                if (nodeKind === "interaction") {
                  importedNodes.push({
                    id: nodeId,
                    kind: "interaction",
                    data: {
                      id: nodeId,
                      episodeId: epId,
                      title: node.title || node.data?.title || "互动节点",
                      instruction: node.instruction || node.data?.instruction || "",
                      loopVideoUrl: node.loopVideoUrl || node.data?.loopVideoUrl,
                      firstFrameRef: node.firstFrameRef || node.data?.firstFrameRef,
                      lastFrameRef: node.lastFrameRef || node.data?.lastFrameRef,
                      options: (node.options || node.data?.options || []).map((opt: any) => ({
                        id: opt.id ?? uuidv4(),
                        label: opt.label ?? "选项",
                        actionType: opt.actionType ?? "tap",
                        actionValue: opt.actionValue,
                        targetNodeId: opt.targetNodeId,
                        color: opt.color,
                        hotspot: opt.hotspot,
                      })),
                    },
                    position: node.position ?? pos,
                  });
                } else if (nodeKind === "ending") {
                  importedNodes.push({
                    id: nodeId,
                    kind: "ending",
                    data: {
                      id: nodeId,
                      episodeId: epId,
                      title: node.title || node.data?.title || "结局节点",
                      endingType: node.endingType || node.data?.endingType || "normal",
                      description: node.description || node.data?.description || "",
                    },
                    position: node.position ?? pos,
                  });
                } else {
                  importedNodes.push({
                    id: nodeId,
                    kind: "scene",
                    data: {
                      id: nodeId,
                      episodeId: epId,
                      title: node.title || node.data?.title || "视频节点",
                      prompt: node.prompt || node.data?.prompt || "",
                      videoUrl: node.videoUrl || node.data?.videoUrl,
                      firstFrameRef: node.firstFrameRef || node.data?.firstFrameRef,
                      status: (node.status || node.data?.status || "draft") as SceneNodeData["status"],
                    },
                    position: node.position ?? pos,
                  });
                }
              });
            }

            // Import edges
            if (Array.isArray(ep.edges)) {
              ep.edges.forEach((edge: any) => {
                importedEdges.push({
                  id: edge.id ?? `edge-${uuidv4()}`,
                  source: edge.source,
                  target: edge.target,
                  label: edge.label ?? "继续",
                  actionType: edge.actionType,
                });
              });
            }

            // Handle global edges array
            if (Array.isArray(parsed.edges)) {
              parsed.edges.forEach((edge: any) => {
                importedEdges.push({
                  id: edge.id ?? `edge-${uuidv4()}`,
                  source: edge.source,
                  target: edge.target,
                  label: edge.label ?? "继续",
                  actionType: edge.actionType,
                });
              });
            }
          });

          // Update setupDraft script if available
          const script = parsed.setupDraft?.script || parsed.script || "";

          set((current) => {
            const nextState = {
              ...current,
              episodes: importedEpisodes.length > 0 ? importedEpisodes : current.episodes,
              nodes: withAutoLayout(
                importedEpisodes.length > 0 ? importedEpisodes : current.episodes,
                importedNodes.length > 0 ? importedNodes : current.nodes,
              ),
              edges: importedEdges.length > 0 ? importedEdges : current.edges,
              selectedEpisodeId: importedEpisodes[0]?.id ?? current.selectedEpisodeId,
              setupDraft: {
                ...current.setupDraft,
                script: script || current.setupDraft.script,
                worldTitle: parsed.world?.title ?? current.setupDraft.worldTitle,
                worldDescription:
                  parsed.world?.description ?? current.setupDraft.worldDescription,
              },
              lastSavedAt: new Date().toISOString(),
            };
            return {
              ...nextState,
              projects: syncProjectsFromWorkspace(
                current.projects,
                current.activeProjectId,
                workspaceSlice(nextState),
              ),
            };
          });

          return {
            success: true,
            message: `已导入 ${importedEpisodes.length} 个剧集、${importedNodes.length} 个节点、${importedEdges.length} 条连线`,
          };
        } catch {
          return { success: false, message: "JSON 解析失败，请检查文件格式" };
        }
      },
    };
    },
    {
      name: "drama-world-builder",
      version: STORE_VERSION,
      storage: safePersistStorage,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<PersistedWorldBuilderState> & Record<string, unknown> | undefined;
        if (!state) return seedPersistedState();

        if (version < 6) {
          const hasBranchEpisode = state.episodes?.some((episode) => episode.id === "ep2b");
          const hasHotspots = state.nodes?.some((node) =>
            node.kind === "interaction" && node.data.options.some((option) => option.hotspot),
          );
          if (!hasBranchEpisode || !hasHotspots) {
            return seedPersistedState();
          }
          const legacyProject: WorldProject = {
            id: state.world?.id ?? seedWorld.id,
            name: state.setupDraft?.worldTitle ?? state.world?.title ?? seedWorld.title,
            createdAt: state.world?.createdAt ?? seedWorld.createdAt,
            updatedAt: state.lastSavedAt ?? state.world?.createdAt ?? seedWorld.createdAt,
            setupDraft: state.setupDraft ?? structuredClone(seedSetupDraft),
            characters: state.characters ?? structuredClone(seedCharacters),
            locations: state.locations ?? structuredClone(seedLocations),
            episodes: state.episodes ?? structuredClone(seedEpisodes),
            nodes: withAutoLayout(
              state.episodes ?? seedEpisodes,
              state.nodes ?? seedStoryNodes,
            ),
            edges: state.edges ?? structuredClone(seedStoryEdges),
            world: state.world ?? structuredClone(seedWorld),
            references: [],
            decomposeStatus: "idle",
          };
          return {
            world: legacyProject.world,
            characters: legacyProject.characters,
            locations: legacyProject.locations,
            episodes: legacyProject.episodes,
            nodes: legacyProject.nodes,
            edges: legacyProject.edges,
            selectedEpisodeId: state.selectedEpisodeId ?? legacyProject.episodes[0]?.id ?? "",
            setupDraft: legacyProject.setupDraft,
            lastSavedAt: state.lastSavedAt,
            lastPublishedAt: state.lastPublishedAt,
            projects: [legacyProject],
            activeProjectId: legacyProject.id,
            creationSession: emptyCreationSession(),
          };
        }

        return {
          ...seedPersistedState(),
          ...state,
          projects: state.projects ?? seedPersistedState().projects,
          activeProjectId: state.activeProjectId ?? seedPersistedState().activeProjectId,
          creationSession: state.creationSession ?? emptyCreationSession(),
        };
      },
      partialize: (state) => {
        const projects = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        ).map((project) => slimProjectForPersist(project));
        const active = slimProjectForPersist({
          id: state.activeProjectId,
          name: state.world.title,
          createdAt: state.world.createdAt,
          updatedAt: state.lastSavedAt ?? state.world.createdAt,
          setupDraft: state.setupDraft,
          characters: state.characters,
          locations: state.locations,
          episodes: state.episodes,
          nodes: state.nodes,
          edges: state.edges,
          world: state.world,
          references: [],
          decomposeStatus: "idle" as const,
        });
        return {
          world: active.world,
          characters: active.characters,
          locations: active.locations,
          episodes: active.episodes,
          nodes: active.nodes,
          edges: active.edges,
          selectedEpisodeId: state.selectedEpisodeId,
          setupDraft: state.setupDraft,
          lastSavedAt: state.lastSavedAt,
          lastPublishedAt: state.lastPublishedAt,
          projects,
          activeProjectId: state.activeProjectId,
          creationSession: state.creationSession,
        };
      },
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
