import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { patchZimageTxt2ImgWorkflow, isZimageTxt2ImgWorkflow } from "./zimageTxt2Img";

describe("zimageTxt2Img", () => {
  const config = {
    label: "test",
    workflowFile: "workflows/文生图Zimage.json",
    nodes: {
      promptText: "30",
      fluxResolution: "24",
      widthInt: "4",
      heightInt: "29",
      saveImage: "19",
    },
    fluxResolutionClassType: "FluxResolutionNode",
    defaults: {
      aspectRatio: "9:16 (Slim Vertical)",
      width: 1080,
      height: 1920,
    },
    aspectRatioFallback: ["16:9 (Widescreen)"],
    timeouts: { historyMs: 900000, pollIntervalMs: 3000 },
  };

  const workflow = {
    "30": { class_type: "Text", inputs: { text: "old" } },
    "24": { class_type: "FluxResolutionNode", inputs: { aspect_ratio: "1:1" } },
    "4": { class_type: "Int", inputs: { Number: 512 } },
    "29": { class_type: "Int", inputs: { Number: 768 } },
    "19": { class_type: "SaveImage", inputs: {} },
  };

  it("detects zimage workflow path", () => {
    assert.equal(isZimageTxt2ImgWorkflow("workflows/文生图Zimage.json"), true);
    assert.equal(isZimageTxt2ImgWorkflow("workflows/txt2img.json"), false);
  });

  it("patches prompt, aspect ratio, width and height nodes", () => {
    const patched = patchZimageTxt2ImgWorkflow(
      workflow,
      {
        prompt: "赛博朋克雨夜街道",
        aspectRatio: "16:9 (Widescreen)",
        width: 1280,
        height: 720,
      },
      config,
    ) as Record<string, { inputs: Record<string, unknown> }>;

    assert.equal(patched["30"].inputs.text, "赛博朋克雨夜街道");
    assert.equal(patched["24"].inputs.aspect_ratio, "16:9 (Widescreen)");
    assert.equal(patched["4"].inputs.Number, 1280);
    assert.equal(patched["29"].inputs.Number, 720);
  });
});
