import { v4 as uuidv4 } from "uuid";
import type { Episode, StoryEdge, StoryNode } from "@/types/worldBuilder";

export type ScriptAnalysis = {
  characters: { name: string; role: string }[];
  scenes: { title: string; prompt: string }[];
  interactions: { title: string; instruction: string }[];
  episodes: { title: string }[];
};

const episodeFramePosition = (episodeIndex: number) => ({
  x: episodeIndex * 1280,
  y: 330,
});

const defaultNodePosition = (episodeIndex: number, nodeIndex: number) => {
  const frame = episodeFramePosition(episodeIndex);
  return {
    x: frame.x + 140 + nodeIndex * 390,
    y: frame.y + 150,
  };
};

export function analyzeScript(text: string): ScriptAnalysis {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      characters: [{ name: "主角", role: "主要角色" }],
      scenes: [{ title: "场景 1", prompt: "待补充场景描述" }],
      interactions: [],
      episodes: [{ title: "第一集" }],
    };
  }

  const lines = trimmed.split("\n").filter((line) => line.trim());
  const characters: { name: string; role: string }[] = [];
  const scenes: { title: string; prompt: string }[] = [];
  const interactions: { title: string; instruction: string }[] = [];
  const episodes: { title: string }[] = [];

  let currentScene = "";
  let currentPrompt = "";

  lines.forEach((line) => {
    const value = line.trim();
    if ((value.includes("：") || value.includes("，")) && value.length < 30) {
      const parts = value.split(/[：，,]/);
      if (parts.length >= 2 && !value.startsWith("第") && !value.startsWith("场")) {
        const name = parts[0].replace(/[\d.、\-—\s]/g, "").trim();
        if (name.length >= 2 && name.length <= 8 && !name.includes("外景") && !name.includes("内景")) {
          if (!characters.find((item) => item.name === name)) {
            characters.push({ name, role: parts.slice(1).join(" · ").trim() || "角色" });
          }
        }
      }
    }
    if (value.startsWith("第") && value.includes("场")) {
      if (currentScene) {
        scenes.push({ title: currentScene, prompt: currentPrompt || currentScene });
      }
      currentScene = value;
      currentPrompt = "";
    } else if (value.startsWith("外景") || value.startsWith("内景")) {
      currentPrompt += (currentPrompt ? " " : "") + value;
    }
  });

  if (currentScene) {
    scenes.push({ title: currentScene, prompt: currentPrompt || currentScene });
  }

  const sceneList =
    scenes.length > 0 ? scenes : [{ title: "场景 1", prompt: trimmed.slice(0, 200) }];

  if (sceneList.length > 0) {
    const chunks = Math.max(1, Math.ceil(sceneList.length / 4));
    for (let i = 0; i < sceneList.length; i += chunks) {
      const episodeScenes = sceneList.slice(i, i + chunks);
      episodes.push({
        title:
          episodeScenes[0]?.title.replace(/第.*场/, "").trim() ||
          `剧集 ${Math.floor(i / chunks) + 1}`,
      });
    }
  }

  episodes.forEach((episode, index) => {
    if (index < episodes.length - 1) {
      interactions.push({
        title: `${episode.title} · 选择分支`,
        instruction: `在「${episode.title}」结束后，用户选择下一步方向`,
      });
    }
  });

  if (characters.length === 0) {
    characters.push({ name: "主角", role: "主要角色" });
  }
  if (episodes.length === 0) {
    episodes.push({ title: "第一集" });
  }

  return { characters, scenes: sceneList, interactions, episodes };
}

export function buildStoryGraphFromAnalysis(analysis: ScriptAnalysis): {
  episodes: Episode[];
  nodes: StoryNode[];
  edges: StoryEdge[];
} {
  const episodes: Episode[] = [];
  const nodes: StoryNode[] = [];
  const edges: StoryEdge[] = [];

  const scenesPerEpisode = Math.max(
    1,
    Math.ceil(analysis.scenes.length / Math.max(analysis.episodes.length, 1)),
  );

  analysis.episodes.forEach((episodeInput, episodeIndex) => {
    const episodeId = `ep-${uuidv4()}`;
    episodes.push({
      id: episodeId,
      index: episodeIndex + 1,
      label: String(episodeIndex + 1),
      title: episodeInput.title,
    });

    const startIdx = episodeIndex * scenesPerEpisode;
    const episodeScenes = analysis.scenes.slice(startIdx, startIdx + scenesPerEpisode);
    const sceneNodes: StoryNode[] = [];

    episodeScenes.forEach((scene, sceneIndex) => {
      const sceneId = `scene-${uuidv4()}`;
      sceneNodes.push({
        id: sceneId,
        kind: "scene",
        data: {
          id: sceneId,
          episodeId,
          title: scene.title,
          prompt: scene.prompt,
          status: "draft",
        },
        position: defaultNodePosition(episodeIndex, sceneIndex),
      });
    });

    if (sceneNodes.length === 0) {
      const sceneId = `scene-${uuidv4()}`;
      sceneNodes.push({
        id: sceneId,
        kind: "scene",
        data: {
          id: sceneId,
          episodeId,
          title: `${episodeInput.title} · 开场`,
          prompt: episodeInput.title,
          status: "draft",
        },
        position: defaultNodePosition(episodeIndex, 0),
      });
    }

    nodes.push(...sceneNodes);

    for (let i = 0; i < sceneNodes.length - 1; i += 1) {
      const source = sceneNodes[i];
      const target = sceneNodes[i + 1];
      edges.push({
        id: `edge-${uuidv4()}`,
        source: source.id,
        target: target.id,
        label: "继续",
      });
    }

    const interaction = analysis.interactions[episodeIndex];
    if (interaction) {
      const interactionId = `interaction-${uuidv4()}`;
      const optionId = uuidv4();
      const lastScene = sceneNodes[sceneNodes.length - 1];

      nodes.push({
        id: interactionId,
        kind: "interaction",
        data: {
          id: interactionId,
          episodeId,
          title: interaction.title,
          instruction: interaction.instruction,
          options: [
            {
              id: optionId,
              label: "继续",
              actionType: "tap",
              actionValue: "(0.50, 0.50)",
              color: "#3b82f6",
              hotspot: { x: 0.5, y: 0.5 },
            },
          ],
        },
        position: defaultNodePosition(episodeIndex, sceneNodes.length),
      });

      edges.push({
        id: `edge-${uuidv4()}`,
        source: lastScene.id,
        target: interactionId,
        label: "继续",
      });
    }
  });

  return { episodes, nodes, edges };
}

export function mergeCharactersFromAnalysis(
  existing: { name: string }[],
  discovered: { name: string; role: string }[],
) {
  const merged = [...existing];
  discovered.forEach((item) => {
    if (!merged.find((character) => character.name === item.name)) {
      merged.push(item);
    }
  });
  return merged;
}
