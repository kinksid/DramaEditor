import { readFile } from "fs/promises";
import path from "path";
import type { LlmTaskId, LlmTaskProfile } from "../types";

export type { LlmTaskId, LlmTaskProfile };

export const LLM_TASK_IDS: LlmTaskId[] = [
  "decompose",
  "suggest_chain",
  "reference_analyze",
  "txt2img_prompt",
  "health_check",
];

let defaultProfilesCache: LlmTaskProfile[] | null = null;

export async function loadDefaultLlmTaskProfiles(): Promise<LlmTaskProfile[]> {
  if (defaultProfilesCache) return defaultProfilesCache;
  const relativePath = process.env.LLM_TASK_PROFILES_PATH ?? "config/llm-task-profiles.json";
  const filePath = path.join(process.cwd(), relativePath);
  const raw = await readFile(filePath, "utf8");
  defaultProfilesCache = JSON.parse(raw) as LlmTaskProfile[];
  return defaultProfilesCache;
}

export function profilesToRecord(
  profiles: LlmTaskProfile[],
): Record<LlmTaskId, LlmTaskProfile> {
  return profiles.reduce(
    (acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    },
    {} as Record<LlmTaskId, LlmTaskProfile>,
  );
}

export function mergeTaskProfiles(
  defaults: LlmTaskProfile[],
  overrides?: Partial<Record<LlmTaskId, LlmTaskProfile>>,
): Record<LlmTaskId, LlmTaskProfile> {
  const base = profilesToRecord(defaults);
  if (!overrides) return base;
  for (const id of LLM_TASK_IDS) {
    const patch = overrides[id];
    if (patch) {
      base[id] = { ...base[id], ...patch, id, options: { ...base[id].options, ...patch.options } };
    }
  }
  return base;
}

export function recordToProfileList(
  record: Record<LlmTaskId, LlmTaskProfile>,
): LlmTaskProfile[] {
  return LLM_TASK_IDS.map((id) => record[id]).filter(Boolean);
}

export function clearDefaultProfilesCache() {
  defaultProfilesCache = null;
}
