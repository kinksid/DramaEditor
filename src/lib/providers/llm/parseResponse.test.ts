import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveOllamaContent } from "./parseResponse";

describe("resolveOllamaContent", () => {
  it("prefers content when present", () => {
    const result = resolveOllamaContent({
      content: '{"ok":true}',
      thinking: "internal",
    });
    assert.equal(result.content, '{"ok":true}');
    assert.equal(result.thinking, "internal");
  });

  it("falls back to thinking when content empty", () => {
    const result = resolveOllamaContent({
      content: "",
      thinking: "fallback text",
    });
    assert.equal(result.content, "fallback text");
  });
});
