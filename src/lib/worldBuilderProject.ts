import type {
  Character,
  CreationSession,
  DecomposeResult,
  Location,
  SetupDraft,
  World,
  WorldProject,
} from "@/types/worldBuilder";
import { v4 as uuidv4 } from "uuid";

export const emptyCreationSession = (): CreationSession => ({
  prompt: "",
  references: [],
});

export function parseCommaList(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function decomposeToSetupDraft(
  decompose: DecomposeResult,
  session?: Pick<CreationSession, "visualStylePreset">,
): SetupDraft {
  const visualStyle =
    decompose.worldview.visualStyle ||
    session?.visualStylePreset ||
  "";
  return {
    worldTitle: decompose.worldview.worldTitle || "未命名世界",
    genre: decompose.worldview.genre,
    tags: decompose.worldview.tags,
    tone: decompose.worldview.tone,
    visualStyle,
    worldDescription: decompose.worldview.worldDescription,
    script: decompose.script,
  };
}

export function decomposeToWorld(
  projectId: string,
  setupDraft: SetupDraft,
): World {
  return {
    id: projectId,
    title: setupDraft.worldTitle,
    description: setupDraft.worldDescription,
    genre: parseCommaList(setupDraft.genre),
    tags: parseCommaList(setupDraft.tags),
    createdAt: new Date().toISOString(),
  };
}

export function withIds<T extends Omit<Character, "id"> | Omit<Location, "id">>(
  items: T[],
): (T & { id: string })[] {
  return items.map((item) => ({ ...item, id: uuidv4() }));
}

export function buildProjectFromDecompose(
  decompose: DecomposeResult,
  session: CreationSession,
): WorldProject {
  const projectId = uuidv4();
  const now = new Date().toISOString();
  const setupDraft = decomposeToSetupDraft(decompose, session);
  const world = decomposeToWorld(projectId, setupDraft);

  return {
    id: projectId,
    name: setupDraft.worldTitle,
    createdAt: now,
    updatedAt: now,
    setupDraft,
    characters: withIds(decompose.characters),
    locations: withIds(decompose.locations),
    episodes: [],
    nodes: [],
    edges: [],
    world,
    references: structuredClone(session.references),
    decomposeStatus: "done",
  };
}

export function buildBlankProject(
  session: CreationSession,
  title = "未命名世界",
): WorldProject {
  const projectId = uuidv4();
  const now = new Date().toISOString();
  const setupDraft: SetupDraft = {
    worldTitle: title,
    genre: "",
    tags: "",
    worldDescription: session.prompt,
    tone: "",
    visualStyle: session.visualStylePreset ?? "",
    script: "",
  };

  return {
    id: projectId,
    name: title,
    createdAt: now,
    updatedAt: now,
    setupDraft,
    characters: [],
    locations: [],
    episodes: [],
    nodes: [],
    edges: [],
    world: decomposeToWorld(projectId, setupDraft),
    references: structuredClone(session.references),
    decomposeStatus: "idle",
  };
}

export function cloneWorldProject(source: WorldProject): WorldProject {
  const projectId = uuidv4();
  const now = new Date().toISOString();
  const baseName = source.name || source.world.title || "未命名世界";
  const cloneTitle = baseName.includes("（克隆）") ? `${baseName} 副本` : `${baseName}（克隆）`;
  const cloned = structuredClone(source);

  cloned.id = projectId;
  cloned.name = cloneTitle;
  cloned.createdAt = now;
  cloned.updatedAt = now;
  cloned.world = {
    ...cloned.world,
    id: projectId,
    title: cloneTitle,
    createdAt: now,
  };
  cloned.setupDraft = {
    ...cloned.setupDraft,
    worldTitle: cloneTitle,
  };
  return cloned;
}

export function projectToWorkspace(project: WorldProject) {
  return {
    world: structuredClone(project.world),
    characters: structuredClone(project.characters),
    locations: structuredClone(project.locations),
    episodes: structuredClone(project.episodes),
    nodes: structuredClone(project.nodes),
    edges: structuredClone(project.edges),
    setupDraft: structuredClone(project.setupDraft),
    selectedEpisodeId: project.episodes[0]?.id ?? "",
    selectedNodeId: undefined as string | undefined,
  };
}

export function workspaceToProject(
  project: WorldProject,
  state: {
    world: World;
    characters: Character[];
    locations: Location[];
    episodes: WorldProject["episodes"];
    nodes: WorldProject["nodes"];
    edges: WorldProject["edges"];
    setupDraft: SetupDraft;
  },
): WorldProject {
  return {
    ...project,
    name: state.setupDraft.worldTitle || state.world.title,
    updatedAt: new Date().toISOString(),
    world: structuredClone(state.world),
    characters: structuredClone(state.characters),
    locations: structuredClone(state.locations),
    episodes: structuredClone(state.episodes),
    nodes: structuredClone(state.nodes),
    edges: structuredClone(state.edges),
    setupDraft: structuredClone(state.setupDraft),
  };
}

export function syncProjectsFromWorkspace(
  projects: WorldProject[],
  activeProjectId: string | undefined,
  state: {
    world: World;
    characters: Character[];
    locations: Location[];
    episodes: WorldProject["episodes"];
    nodes: WorldProject["nodes"];
    edges: WorldProject["edges"];
    setupDraft: SetupDraft;
  },
): WorldProject[] {
  if (!activeProjectId) return projects;
  const index = projects.findIndex((project) => project.id === activeProjectId);
  if (index < 0) return projects;
  const next = [...projects];
  next[index] = workspaceToProject(projects[index], state);
  return next;
}
