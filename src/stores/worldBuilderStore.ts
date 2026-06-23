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
import type {
  Character,
  Episode,
  InteractionNodeData,
  InteractionOption,
  Location,
  SceneNodeData,
  SetupDraft,
  StoryEdge,
  StoryNode,
  World,
  EndingNodeData,
  StoryValidationIssue,
  CanvasPosition,
  ThirdPartyWorkflowTarget,
} from "@/types/worldBuilder";

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
  selectNode: (id?: string) => void;
  selectEpisode: (id: string) => void;
  exportStoryJson: () => string;
  exportAppJson: () => string;
  exportThirdPartyWorkflow: (target: ThirdPartyWorkflowTarget) => string;
};

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

export const useWorldBuilderStore = create<WorldBuilderState>()(
  persist(
    (set, get) => ({
      ...cloneSeed(),
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      loadSeedData: () => set(() => {
        const seed = cloneSeed();
        return {
          ...seed,
          nodes: withAutoLayout(seed.episodes, seed.nodes),
        };
      }),
      saveToLocal: () => set({ lastSavedAt: new Date().toISOString() }),
      resetWorld: () => set(() => {
        const seed = cloneSeed();
        return {
          ...seed,
          nodes: withAutoLayout(seed.episodes, seed.nodes),
        };
      }),
      generateAllMockVideos: () =>
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.kind !== "scene") return node;
            return {
              ...node,
              data: {
                ...node.data,
                status: "ready",
                videoUrl: node.data.videoUrl ?? `mock://video/${node.id}`,
              },
            };
          }),
          lastSavedAt: new Date().toISOString(),
        })),
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
      addCharacter: (character) =>
        set((state) => ({
          characters: [{ ...character, id: uuidv4() }, ...state.characters],
        })),
      updateCharacter: (id, character) =>
        set((state) => ({
          characters: state.characters.map((item) =>
            item.id === id ? { ...item, ...character } : item,
          ),
        })),
      deleteCharacter: (id) =>
        set((state) => ({
          characters: state.characters.filter((item) => item.id !== id),
        })),
      addLocation: (location) =>
        set((state) => ({
          locations: [{ ...location, id: uuidv4() }, ...state.locations],
        })),
      updateLocation: (id, location) =>
        set((state) => ({
          locations: state.locations.map((item) =>
            item.id === id ? { ...item, ...location } : item,
          ),
        })),
      deleteLocation: (id) =>
        set((state) => ({
          locations: state.locations.filter((item) => item.id !== id),
        })),
      addEpisode: (episode) =>
        set((state) => ({
          episodes: [
            ...state.episodes,
            { ...episode, id: uuidv4(), index: state.episodes.length + 1 },
          ],
        })),
      updateEpisode: (id, episode) =>
        set((state) => ({
          episodes: state.episodes.map((item) =>
            item.id === id ? { ...item, ...episode } : item,
          ),
        })),
      deleteEpisode: (id) =>
        set((state) => ({
          episodes: state.episodes
            .filter((episode) => episode.id !== id)
            .map((episode, index) => ({ ...episode, index: index + 1 })),
          nodes: state.nodes.filter((node) => node.data.episodeId !== id),
          selectedEpisodeId:
            state.selectedEpisodeId === id
              ? state.episodes.find((episode) => episode.id !== id)?.id ?? "ep1"
              : state.selectedEpisodeId,
        })),
      addSceneNode: (episodeId) =>
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
        }),
      addInteractionNode: (episodeId) =>
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
        }),
      addEndingNode: (episodeId) =>
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
        }),
      updateNode: (id, data) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...data } as StoryNode["data"] }
              : node,
          ) as StoryNode[],
        })),
      updateNodePosition: (id, position) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? ({ ...node, position } as StoryNode) : node,
          ),
        })),
      updateNodePositions: (positions) =>
        set((state) => {
          const positionMap = new Map(positions.map((item) => [item.id, item.position]));
          return {
            nodes: state.nodes.map((node) => {
              const position = positionMap.get(node.id);
              return position ? ({ ...node, position } as StoryNode) : node;
            }),
          };
        }),
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
      deleteNode: (id) =>
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
          selectedNodeId: state.selectedNodeId === id ? undefined : state.selectedNodeId,
        })),
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
      connectNodes: (source, target, label = "继续", actionType) =>
        set((state) => ({
          edges: [
            ...state.edges,
            { id: `edge-${uuidv4()}`, source, target, label, actionType },
          ],
        })),
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
    }),
    {
      name: "drama-world-builder",
      partialize: (state) => ({
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
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
