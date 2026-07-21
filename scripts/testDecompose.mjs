import { applyLlmPreset } from "../src/lib/providers/llm/presets.ts";
import { callLlmDecompose, buildDecomposeUserPrompt } from "../src/lib/worldBuilderServer.ts";

await applyLlmPreset("ollama-lan-qwen36");
const prompt = "大唐天宝年间，长安城西市，胡商云集的盛世一隅。";
const userPrompt = buildDecomposeUserPrompt({ prompt, references: [] });
const started = Date.now();
const result = await callLlmDecompose(userPrompt);
console.log("ms:", Date.now() - started);
console.log({
  title: result.worldview.worldTitle,
  genre: result.worldview.genre,
  tone: result.worldview.tone,
  descLen: result.worldview.worldDescription.length,
});
