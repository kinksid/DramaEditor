/**
 * Provider API smoke test - run against local dev server
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
    console.log(`✓ ${name}`, JSON.stringify(detail).slice(0, 120));
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`✗ ${name}: ${error.message}`);
  }
}

await test("GET providers/config", async () => {
  const { status, json } = await req("GET", "/api/world-builder/providers/config");
  if (status !== 200) throw new Error(`status ${status}`);
  if (!json.llm?.provider) throw new Error("missing llm.provider");
  return { llm: json.llm.provider, video: json.video.provider, mock: json.enableMockGeneration };
});

await test("PUT providers/config video=mock", async () => {
  const { status, json } = await req("PUT", "/api/world-builder/providers/config", {
    video: { provider: "mock" },
    enableMockGeneration: true,
  });
  if (status !== 200) throw new Error(`status ${status}`);
  if (json.video?.provider !== "mock") throw new Error(`expected mock got ${json.video?.provider}`);
  return { video: json.video.provider };
});

await test("POST generate/video mock", async () => {
  const { status, json } = await req("POST", "/api/world-builder/generate/video", {
    nodeId: "test-node-1",
    prompt: "测试视频场景",
    duration: 5,
  });
  if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
  if (!json.taskId) throw new Error("no taskId");
  return { taskId: json.taskId };
});

const videoTaskId = results.at(-1)?.detail?.taskId;

await test("GET generate/task poll video", async () => {
  if (!videoTaskId) throw new Error("no video task from prior test");
  for (let i = 0; i < 15; i++) {
    const { status, json } = await req("GET", `/api/world-builder/generate/task/${videoTaskId}`);
    if (status !== 200) throw new Error(`status ${status}`);
    if (json.status === "completed" && json.videoUrl) {
      return { status: json.status, videoUrl: json.videoUrl };
    }
    if (json.status === "failed") throw new Error(json.error ?? "task failed");
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("timeout waiting for video task");
});

await test("PUT image provider seedance mock path", async () => {
  await req("PUT", "/api/world-builder/providers/config", {
    image: { provider: "seedance" },
    enableMockGeneration: true,
  });
  const { status, json } = await req("POST", "/api/world-builder/generate/image", {
    prompt: "角色参考图测试",
    targetField: "referenceImage",
    targetEntityId: "char-1",
  });
  if (status !== 200) throw new Error(`status ${status}: ${JSON.stringify(json)}`);
  if (!json.taskId) throw new Error("no taskId");
  const taskId = json.taskId;
  for (let i = 0; i < 15; i++) {
    const poll = await req("GET", `/api/world-builder/generate/task/${taskId}`);
    if (poll.json.status === "completed") {
      return { taskId, imageUrl: poll.json.imageUrl ?? poll.json.resultUrl };
    }
    if (poll.json.status === "failed") throw new Error(poll.json.error ?? "image failed");
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("image task timeout");
});

await test("POST decompose fallback", async () => {
  const { status, json } = await req("POST", "/api/world-builder/decompose", {
    prompt: "赛博朋克侦探故事",
    useFallback: true,
  });
  if (status !== 200) throw new Error(`status ${status}`);
  if (!json.result?.worldview) throw new Error("no worldview");
  return { source: json.source, title: json.result.worldview.worldTitle };
});

await test("POST agent suggest-chain fallback tolerant", async () => {
  const { status, json } = await req("POST", "/api/world-builder/agent/suggest-chain", {
    script: "第一场：主角进入雨夜街道。第二场：发现线索。",
    episodeTitle: "第一集",
  });
  // May fail if Ollama unavailable - record status
  return { status, hasNodes: Array.isArray(json.nodes), error: json.error };
});

await test("POST providers/test llm", async () => {
  const { status, json } = await req("POST", "/api/world-builder/providers/test", { target: "llm" });
  return { status, message: json.message, error: json.error };
});

const failed = results.filter((r) => !r.ok);
console.log("\n--- SUMMARY ---");
console.log(`Passed: ${results.length - failed.length}/${results.length}`);
if (failed.length) {
  console.log("Failed:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
