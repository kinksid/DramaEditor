"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  emptyCreationSession,
  parseCommaList,
  projectToWorkspace,
  syncProjectsFromWorkspace,
} from "@/lib/worldBuilderProject";
import { analyzeScript, buildStoryGraphFromAnalysis } from "@/lib/scriptAnalysis";
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

type WorldBuilderState = {
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
  addCharacter: (character: Omit<Character, "id">) => void;
  updateCharacter: (id: string, character: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  addLocation: (location: Omit<Location, "id">) => void;
  updateLocation: (id: string, location: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
  addEpisode: (episode: Omit<Episode, "id" | "index">) => void;
  updateEpisode: (id: string, episode: Partial<Episode>) => void;
  deleteEpisode: (id: string) => void;
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
  duplicateNode: (id: string) => void;
  addOption: (nodeId: string) => void;
  updateOption: (nodeId: string, optionId: string, option: Partial<InteractionOption>) => void;
  deleteOption: (nodeId: string, optionId: string) => void;
  connectNodes: (source: string, target: string, label?: string, actionType?: StoryEdge["actionType"]) => void;
  createConnectedNode: (
    sourceNodeId: string,
    kind: StoryNode["kind"],
    position: CanvasPosition,
  ) => string | null;
  selectNode: (id?: string) => void;
  selectEpisode: (id: string) => void;
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
  switchProject: (id: string) => void;
  listProjects: () => WorldProject[];
  commitSetupToWorld: () => void;
  generateStoryGraphFromScript: (options?: { force?: boolean }) => boolean;
  ensureProjectLoaded: (projectId?: string) => boolean;
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

const episodeFramePosition = (episode: Episode, episodeIndex: number) => {
  if (episode.id === "ep2b") return { x: 1280, y: -40 };
  if (episode.id === "ep2") return { x: 1280, y: 700 };
  if (episode.id === "ep3") return { x: 2560, y: 700 };
  if (episode.id === "ep4") return { x: 3840, y: 700 };
  return {
    x: episodeIndex * 1280,
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
    x: frame.x + 140 + nodeIndex * 390,
    y: frame.y + 150,
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
      historyIndex: -1,
      historyLength: 0,
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
            duration: 5,
            aspectRatio: "9:16",
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
      submitSceneFirstFrame: async (nodeId) => {
        const state = get();
        const node = state.nodes.find((item) => item.id === nodeId && item.kind === "scene");
        if (!node || node.kind !== "scene" || !node.data.prompt.trim()) return null;

        const referenceImageUrls = collectReferenceImageUrls(state.characters, state.locations);
        try {
          const { taskId } = await submitImageGenerationApi({
            nodeId,
            prompt: node.data.prompt,
            style: state.setupDraft.visualStyle,
            referenceImageUrl: referenceImageUrls[0],
            targetField: "firstFrameRef",
          });
          const task: PendingGenerationTask = {
            taskId,
            kind: "image",
            nodeId,
            targetField: "firstFrameRef",
            prompt: node.data.prompt,
          };
          set((current) => ({
            nodes: markNodeGenerating(current.nodes, nodeId, taskId),
            pendingGenerationTasks: [...current.pendingGenerationTasks, task],
          }));
          return taskId;
        } catch {
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
        set((state) => ({
          characters: [{ ...character, id: uuidv4() }, ...state.characters],
        }));
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
        set((state) => ({
          locations: [{ ...location, id: uuidv4() }, ...state.locations],
        }));
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
        set((state) => ({
          episodes: [
            ...state.episodes,
            { ...episode, id: uuidv4(), index: state.episodes.length + 1 },
          ],
        }));
      },
      updateEpisode: (id, episode) =>
        set((state) => ({
          episodes: state.episodes.map((item) =>
            item.id === id ? { ...item, ...episode } : item,
          ),
        })),
      deleteEpisode: (id) => {
        get().pushHistory();
        set((state) => ({
          episodes: state.episodes
            .filter((episode) => episode.id !== id)
            .map((episode, index) => ({ ...episode, index: index + 1 })),
          nodes: state.nodes.filter((node) => node.data.episodeId !== id),
          selectedEpisodeId:
            state.selectedEpisodeId === id
              ? state.episodes.find((episode) => episode.id !== id)?.id ?? "ep1"
              : state.selectedEpisodeId,
        }));
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
                  instruction: "描述互动限制、用户动作和触发后的剧情结果。",
                  options: [],
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
      autoLayoutEpisodes: () =>
        set((state) => ({
          nodes: state.nodes.map((node) => {
            const episodeIndex = Math.max(state.episodes.findIndex((episode) => episode.id === node.data.episodeId), 0);
            const episode = state.episodes[episodeIndex] ?? state.episodes[0];
            const siblings = state.nodes.filter((item) => item.data.episodeId === node.data.episodeId);
            const nodeIndex = Math.max(
              siblings.findIndex((item) => item.id === node.id),
              0,
            );
            return {
              ...node,
              position: defaultNodePosition(episode, episodeIndex, nodeIndex),
            } as StoryNode;
          }),
          lastSavedAt: new Date().toISOString(),
        })),
      deleteNode: (id) => {
        get().pushHistory();
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
          selectedNodeId: state.selectedNodeId === id ? undefined : state.selectedNodeId,
        }));
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
        set((state) => ({
          nodes: state.nodes.map((node) => {
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
          }),
        })),
      deleteOption: (nodeId, optionId) =>
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.id !== nodeId || node.kind !== "interaction") return node;
            return {
              ...node,
              data: {
                ...node.data,
                options: node.data.options.filter((item) => item.id !== optionId),
              },
            };
          }),
        })),
      connectNodes: (source, target, label = "继续", actionType) => {
        get().pushHistory();
        set((state) => {
          const sourceNode = state.nodes.find((node) => node.id === source);
          const nodes = state.nodes.map((node) => {
            if (node.id !== source || node.kind !== "interaction") return node;
            const option = node.data.options.find((item) => !item.targetNodeId);
            if (!option) return node;
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
          const edgeExists = state.edges.some((edge) => edge.source === source && edge.target === target);
          return {
            nodes,
            edges: edgeExists
              ? state.edges
              : [...state.edges, { id: `edge-${uuidv4()}`, source, target, label, actionType }],
          };
        });
      },
      createConnectedNode: (sourceNodeId, kind, position) => {
        const state = get();
        const sourceNode = state.nodes.find((node) => node.id === sourceNodeId);
        if (!sourceNode) return null;

        get().pushHistory();
        const targetEpisodeId = sourceNode.data.episodeId;
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
              ...current.edges,
              { id: `edge-${uuidv4()}`, source: sourceNodeId, target: id, label: "继续" },
            ];
            const nextState = {
              ...current,
              nodes,
              edges,
              selectedNodeId: id,
              selectedEpisodeId: targetEpisodeId,
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
                instruction: "描述互动限制、用户动作和触发后的剧情结果。",
                options: [],
              },
              position: nextPosition,
            };
            const nodes = [...current.nodes, newNode];
            const edges = [
              ...current.edges,
              { id: `edge-${uuidv4()}`, source: sourceNodeId, target: id, label: "继续" },
            ];
            const nextState = {
              ...current,
              nodes,
              edges,
              selectedNodeId: id,
              selectedEpisodeId: targetEpisodeId,
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
            ...current.edges,
            {
              id: `edge-${uuidv4()}`,
              source: sourceNodeId,
              target: id,
              label: "结局",
              actionType: "ending" as const,
            },
          ];

          const nodesWithOption =
            sourceNode.kind === "interaction"
              ? nodes.map((node) => {
                  if (node.id !== sourceNodeId || node.kind !== "interaction") return node;
                  const option = node.data.options.find((item) => !item.targetNodeId);
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

        if (sourceNode.kind === "interaction" && kind !== "ending") {
          const latest = get().nodes.find((node) => node.id === sourceNodeId);
          if (latest?.kind === "interaction") {
            const option = latest.data.options.find((item) => !item.targetNodeId);
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
      switchProject: (id) => {
        const state = get();
        const syncedProjects = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        );
        const project = syncedProjects.find((item) => item.id === id);
        if (!project) return;
        set({
          projects: syncedProjects,
          activeProjectId: id,
          ...projectToWorkspace(project),
        });
      },
      listProjects: () => {
        const state = get();
        const synced = syncProjectsFromWorkspace(
          state.projects,
          state.activeProjectId,
          workspaceSlice(state),
        );
        return [...synced].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
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

          set({
            episodes: importedEpisodes.length > 0 ? importedEpisodes : state.episodes,
            nodes: withAutoLayout(
              importedEpisodes.length > 0 ? importedEpisodes : state.episodes,
              importedNodes.length > 0 ? importedNodes : state.nodes,
            ),
            edges: importedEdges.length > 0 ? importedEdges : state.edges,
            selectedEpisodeId: importedEpisodes[0]?.id ?? state.selectedEpisodeId,
            setupDraft: {
              ...state.setupDraft,
              script: script || state.setupDraft.script,
              worldTitle: parsed.world?.title ?? state.setupDraft.worldTitle,
              worldDescription: parsed.world?.description ?? state.setupDraft.worldDescription,
            },
            lastSavedAt: new Date().toISOString(),
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
        );
        return {
          world: state.world,
          characters: state.characters,
          locations: state.locations,
          episodes: state.episodes,
          nodes: state.nodes,
          edges: state.edges,
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
