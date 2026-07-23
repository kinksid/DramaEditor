import { v4 as uuidv4 } from "uuid";
import type { PendingGenerationTask } from "@/lib/generationClient";
import type {
  Character,
  GenerationHistoryEntry,
  Location,
  StoryNode,
} from "@/types/worldBuilder";

export function collectReferenceImageUrls(characters: Character[], locations: Location[]) {
  return [...characters, ...locations]
    .map((item) => item.referenceImage)
    .filter((url): url is string => Boolean(url && !url.startsWith("mock://")));
}

export function appendGenerationHistory(
  history: GenerationHistoryEntry[] | undefined,
  entry: Omit<GenerationHistoryEntry, "id" | "createdAt">,
): GenerationHistoryEntry[] {
  return [
    {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...entry,
    },
    ...(history ?? []),
  ].slice(0, 12);
}

export function applyCompletedTaskToState(
  state: {
    nodes: StoryNode[];
    characters: Character[];
    locations: Location[];
  },
  task: PendingGenerationTask,
  resultUrl: string,
) {
  const historyEntry = {
    kind: task.kind,
    provider: task.provider ?? "unknown",
    prompt: task.prompt,
    url: resultUrl,
  } as const;

  let nodes = state.nodes;
  let characters = state.characters;
  let locations = state.locations;

  if (task.nodeId) {
    nodes = nodes.map((node) => {
      if (node.id !== task.nodeId) return node;
      if (node.kind === "scene") {
        const patch: Partial<typeof node.data> = {
          activeGenerationTaskId: undefined,
          generationHistory: appendGenerationHistory(node.data.generationHistory, historyEntry),
        };
        if (task.targetField === "firstFrameRef") {
          patch.firstFrameRef = resultUrl;
          if (!node.data.lastFrameRef) patch.lastFrameRef = resultUrl;
        } else if (task.targetField === "lastFrameRef") {
          patch.lastFrameRef = resultUrl;
        } else {
          patch.videoUrl = resultUrl;
          patch.status = "ready";
        }
        return { ...node, data: { ...node.data, ...patch } };
      }
      if (node.kind === "interaction") {
        const patch: Partial<typeof node.data> = {
          activeGenerationTaskId: undefined,
          generationHistory: appendGenerationHistory(node.data.generationHistory, historyEntry),
        };
        if (task.targetField === "firstFrameRef") {
          patch.firstFrameRef = resultUrl;
          // 互动循环默认首尾同帧，便于无缝 loop
          if (!node.data.lastFrameRef) patch.lastFrameRef = resultUrl;
        } else if (task.targetField === "lastFrameRef") {
          patch.lastFrameRef = resultUrl;
        } else if (task.targetField === "loopVideoUrl" || task.kind === "video") {
          patch.loopVideoUrl = resultUrl;
        }
        return { ...node, data: { ...node.data, ...patch } };
      }
      return node;
    });
  }

  if (task.targetField === "referenceImage" && task.targetEntityId) {
    if (task.entityType === "character") {
      characters = characters.map((item) =>
        item.id === task.targetEntityId ? { ...item, referenceImage: resultUrl } : item,
      );
    }
    if (task.entityType === "location") {
      locations = locations.map((item) =>
        item.id === task.targetEntityId ? { ...item, referenceImage: resultUrl } : item,
      );
    }
  }

  return { nodes, characters, locations };
}

export function markNodeGenerating(nodes: StoryNode[], nodeId: string, taskId: string) {
  return nodes.map((node) => {
    if (node.id !== nodeId) return node;
    if (node.kind === "scene") {
      return {
        ...node,
        data: {
          ...node.data,
          status: "generating" as const,
          activeGenerationTaskId: taskId,
        },
      };
    }
    if (node.kind === "interaction") {
      return {
        ...node,
        data: {
          ...node.data,
          activeGenerationTaskId: taskId,
        },
      };
    }
    return node;
  });
}

export function markNodeGenerationFailed(nodes: StoryNode[], nodeId: string) {
  return nodes.map((node) => {
    if (node.id !== nodeId || node.kind !== "scene") return node;
    return {
      ...node,
      data: {
        ...node.data,
        status: "failed" as const,
        activeGenerationTaskId: undefined,
      },
    };
  });
}
