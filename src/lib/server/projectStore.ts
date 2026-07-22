import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { SharedWorldBuilderState } from "@/types/worldBuilderSync";

export const PROJECT_DATA_DIR = process.env.PROJECT_DATA_DIR ?? "data/projects";
const STATE_FILE = "_state.json";

const defaultState = (): SharedWorldBuilderState => ({
  revision: 0,
  updatedAt: new Date().toISOString(),
  activeProjectId: "",
  projects: [],
  creationSession: { prompt: "", references: [] },
});

async function stateFilePath() {
  const dir = path.join(process.cwd(), PROJECT_DATA_DIR);
  await mkdir(dir, { recursive: true });
  return path.join(dir, STATE_FILE);
}

export async function readSharedState(): Promise<SharedWorldBuilderState> {
  try {
    const raw = await readFile(await stateFilePath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<SharedWorldBuilderState>;
    return {
      ...defaultState(),
      ...parsed,
      projects: parsed.projects ?? [],
      creationSession: parsed.creationSession ?? { prompt: "", references: [] },
    };
  } catch {
    return defaultState();
  }
}

export type WriteSharedStateResult =
  | { ok: true; state: SharedWorldBuilderState }
  | { ok: false; conflict: SharedWorldBuilderState };

export async function writeSharedState(
  next: Omit<SharedWorldBuilderState, "revision" | "updatedAt"> & {
    revision?: number;
    updatedAt?: string;
  },
  options?: { expectedRevision?: number },
): Promise<WriteSharedStateResult> {
  const current = await readSharedState();
  if (
    options?.expectedRevision !== undefined &&
    options.expectedRevision !== current.revision
  ) {
    return { ok: false, conflict: current };
  }

  const merged: SharedWorldBuilderState = {
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    lastClientId: next.lastClientId,
    activeProjectId: next.activeProjectId,
    projects: next.projects,
    creationSession: next.creationSession,
  };

  const file = await stateFilePath();
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(merged, null, 2), "utf-8");
  await rename(tmp, file);
  return { ok: true, state: merged };
}
