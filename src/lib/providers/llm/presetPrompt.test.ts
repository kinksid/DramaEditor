import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expandUserPrompt } from "./presetPrompt";

describe("expandUserPrompt", () => {
  it("direct mode returns custom when non-empty", () => {
    const result = expandUserPrompt(
      { userPromptTemplate: "ignored", presetMode: "direct" },
      { custom: "hello world" },
    );
    assert.equal(result, "hello world");
  });

  it("template mode replaces # and @", () => {
    const result = expandUserPrompt(
      { userPromptTemplate: "剧集：#\n剧本：@", presetMode: "template" },
      { custom: "第一集", image: "雨夜街道" },
    );
    assert.equal(result, "剧集：第一集\n剧本：雨夜街道");
  });

  it("template mode with empty custom keeps placeholders replaced as empty", () => {
    const result = expandUserPrompt(
      { userPromptTemplate: "主题：#", presetMode: "template" },
      { custom: "" },
    );
    assert.equal(result, "主题：");
  });
});
