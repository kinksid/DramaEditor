import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertComfyApiWorkflow,
  patchCharacterTurnaroundWorkflow,
} from "./characterTurnaround";

describe("characterTurnaround", () => {
  const apiWorkflow = {
    "28": { class_type: "CR Text", inputs: { text: "default" } },
    "12": { class_type: "LoadImage", inputs: { image: "old.png" } },
    "2": { class_type: "KSampler", inputs: { seed: 1 } },
    "26": { class_type: "llama_cpp_instruct_adv", inputs: { seed: 1 } },
    "33": { class_type: "llama_cpp_instruct_adv", inputs: { seed: 1 } },
    "4": { class_type: "SaveImage", inputs: { filename_prefix: "out" } },
  };

  it("patches prompt, control image, and seeds", () => {
    const patched = patchCharacterTurnaroundWorkflow(apiWorkflow, {
      prompt: "赛博朋克女黑客",
      controlImageFilename: "ref.png",
      seed: 42,
    });

    assert.deepEqual(patched["28"], { class_type: "CR Text", inputs: { text: "赛博朋克女黑客" } });
    assert.deepEqual(patched["12"], { class_type: "LoadImage", inputs: { image: "ref.png" } });
    assert.deepEqual(patched["2"], { class_type: "KSampler", inputs: { seed: 42 } });
    assert.deepEqual(patched["26"], { class_type: "llama_cpp_instruct_adv", inputs: { seed: 42 } });
    assert.deepEqual(patched["33"], { class_type: "llama_cpp_instruct_adv", inputs: { seed: 43 } });
  });

  it("rejects UI format workflow", () => {
    assert.throws(
      () => assertComfyApiWorkflow({ nodes: [{ id: 1, type: "SaveImage" }] }, "workflows/x.json"),
      /UI 格式/,
    );
  });
});
