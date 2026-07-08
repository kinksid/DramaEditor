const baseUrl = process.env.OLLAMA_URL ?? "http://10.11.8.22:11434";
const model = process.env.OLLAMA_MODEL ?? "qwen3.6:27b";
const probeTimeoutMs = Number(process.env.PROBE_TIMEOUT_MS ?? 10000);

console.log(`Testing ${baseUrl} (probe timeout ${probeTimeoutMs}ms)`);

for (let i = 1; i <= 5; i += 1) {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(probeTimeoutMs),
    });
    const data = await response.json();
    console.log(`tags #${i}: ok ${Date.now() - started}ms (${data.models?.length ?? 0} models)`);
  } catch (error) {
    console.log(`tags #${i}: fail ${Date.now() - started}ms`, error instanceof Error ? error.message : error);
  }
}

const chatStarted = Date.now();
try {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      format: "json",
      messages: [{ role: "user", content: 'Reply JSON: {"ok":true}' }],
    }),
    signal: AbortSignal.timeout(120000),
  });
  const data = await response.json();
  console.log(`chat: ${response.status} ${Date.now() - chatStarted}ms`, data.message?.content?.slice(0, 120));
} catch (error) {
  console.log(`chat: fail ${Date.now() - chatStarted}ms`, error instanceof Error ? error.message : error);
}
