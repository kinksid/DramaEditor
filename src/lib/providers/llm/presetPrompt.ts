import type { LlmTaskProfile } from "./taskProfiles";

export type PresetPromptVars = {
  custom?: string;
  image?: string;
  extras?: Record<string, string>;
};

export function expandUserPrompt(
  profile: Pick<LlmTaskProfile, "userPromptTemplate" | "presetMode">,
  vars: PresetPromptVars,
): string {
  const custom = vars.custom?.trim() ?? "";
  const secondary = vars.image?.trim() ?? "";

  if (profile.presetMode === "direct" && custom) {
    return custom;
  }

  let content = profile.userPromptTemplate;
  content = content.replace(/#/g, custom);
  content = content.replace(/@/g, secondary);

  if (vars.extras) {
    for (const [key, value] of Object.entries(vars.extras)) {
      content = content.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
  }

  return content.trim();
}
