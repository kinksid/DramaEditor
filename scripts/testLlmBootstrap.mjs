import { bootstrapLlmPresets, getLlmPresetStatuses } from "../src/lib/providers/llm/presets.ts";

const result = await bootstrapLlmPresets({ force: true });
console.log("active:", result.activePresetId);
for (const preset of getLlmPresetStatuses()) {
  console.log(
    `${preset.id}: available=${preset.available} latency=${preset.latencyMs ?? "-"} error=${preset.error ?? "-"}`,
  );
}
