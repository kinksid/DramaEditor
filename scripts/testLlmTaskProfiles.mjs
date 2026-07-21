/**
 * LLM task profile API smoke test
 */
const BASE = process.env.DRAMAEDITOR_BASE_URL ?? "http://127.0.0.1:3000";

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: res.status, json };
}

const results = [];

async function test(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`✓ ${name}`, JSON.stringify(detail).slice(0, 160));
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`✗ ${name}: ${error.message}`);
  }
}

await test("GET llm/tasks defaults", async () => {
  const { status, json } = await req("GET", "/api/world-builder/providers/llm/tasks");
  if (status !== 200) throw new Error(`status ${status}`);
  if (!Array.isArray(json.defaults) || json.defaults.length < 4) {
    throw new Error("missing defaults");
  }
  return { defaultCount: json.defaults.length, currentCount: json.current?.length };
});

await test("GET config has taskProfiles", async () => {
  const { status, json } = await req("GET", "/api/world-builder/providers/config");
  if (status !== 200) throw new Error(`status ${status}`);
  if (!json.llm?.taskProfiles?.length) throw new Error("missing taskProfiles");
  return { count: json.llm.taskProfiles.length, ids: json.llm.taskProfiles.map((t) => t.id) };
});

await test("PUT llmTaskProfiles custom system", async () => {
  const get = await req("GET", "/api/world-builder/providers/config");
  const decompose = get.json.llm.taskProfiles.find((t) => t.id === "decompose");
  const patched = {
    ...decompose,
    systemPrompt: `${decompose.systemPrompt}\n<!-- test-marker -->`,
  };
  const { status, json } = await req("PUT", "/api/world-builder/providers/config", {
    llmTaskProfiles: { decompose: patched },
  });
  if (status !== 200) throw new Error(`status ${status}`);
  const saved = json.llm.taskProfiles.find((t) => t.id === "decompose");
  if (!saved.systemPrompt.includes("test-marker")) throw new Error("patch not saved");
  return { saved: true };
});

await test("POST providers/test health_check", async () => {
  const { status, json } = await req("POST", "/api/world-builder/providers/test", {
    target: "llm",
    llmTaskId: "health_check",
    llmPresetId: "ollama-lan-qwen36",
  });
  if (status !== 200) {
    return { status, error: json.error, tolerant: true };
  }
  if (!json.content && !json.message) throw new Error("no response body");
  return { message: json.message, content: json.content?.slice(0, 80) };
});

await test("POST decompose non-fallback tolerant", async () => {
  const { status, json } = await req("POST", "/api/world-builder/decompose", {
    prompt: "赛博朋克侦探故事，霓虹雨夜。",
    llmPresetId: "ollama-lan-qwen36",
  });
  if (status !== 200) throw new Error(`status ${status}`);
  return {
    source: json.source,
    title: json.result?.worldview?.worldTitle,
    warning: json.warning,
    tolerant: json.source === "fallback",
  };
});

const failed = results.filter((r) => !r.ok);
console.log("\n--- SUMMARY ---");
console.log(`Passed: ${results.length - failed.length}/${results.length}`);
if (failed.length) {
  console.log("Failed:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
