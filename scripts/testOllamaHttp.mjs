import http from "node:http";

function httpJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method ?? "GET",
        headers: options.headers,
        family: 4,
        timeout: options.timeout ?? 120000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

const baseUrl = "http://10.11.8.22:11434";

console.log("http tags");
console.log(await httpJson(`${baseUrl}/api/tags`));

console.log("http chat");
const started = Date.now();
const chat = await httpJson(`${baseUrl}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "qwen3.6:27b",
    stream: false,
    think: false,
    format: "json",
    messages: [{ role: "user", content: 'Reply JSON: {"ok":true}' }],
  }),
  timeout: 120000,
});
console.log(Date.now() - started, chat.status, chat.data.message?.content?.slice(0, 120));
