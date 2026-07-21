const baseUrl = "http://10.11.8.22:11434";

async function probe(name, url) {
  const started = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    await response.json();
    return { name, ok: true, ms: Date.now() - started };
  } catch (error) {
    return {
      name,
      ok: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

console.log("parallel probe like bootstrap");
const results = await Promise.all([
  probe("lan", `${baseUrl}/api/tags`),
  probe("local", "http://127.0.0.1:11434/api/tags"),
]);
console.log(results);

console.log("\nchat after warmup");
await fetch(`${baseUrl}/api/tags`);
const started = Date.now();
try {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen3.6:27b",
      stream: false,
      think: false,
      format: "json",
      messages: [{ role: "user", content: 'Reply JSON: {"ok":true}' }],
    }),
    signal: AbortSignal.timeout(120000),
  });
  const data = await response.json();
  console.log("chat ok", Date.now() - started, data.message?.content);
} catch (error) {
  console.log("chat fail", Date.now() - started, error instanceof Error ? error.message : error);
}
