import http from "node:http";
import https from "node:https";

type RequestJsonOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  label?: string;
  retries?: number;
  delayMs?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  const message = error.message.toLowerCase();
  const code = "code" in error ? String((error as NodeJS.ErrnoException).code ?? "") : "";
  return (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    message.includes("fetch failed") ||
    message.includes("timeout") ||
    message.includes("aborted") ||
    message.includes("network")
  );
}

function requestJsonOnce<T>(url: string, options: RequestJsonOptions): Promise<{ status: number; data: T }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === "https:" ? https : http;
    const body = options.body;

    const req = transport.request(
      url,
      {
        method: options.method ?? "GET",
        headers: options.headers,
        family: 4,
        timeout: options.timeoutMs ?? 30000,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode ?? 0,
              data: raw ? (JSON.parse(raw) as T) : ({} as T),
            });
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

    if (body) req.write(body);
    req.end();
  });
}

export async function requestJson<T>(
  url: string,
  options: RequestJsonOptions = {},
): Promise<{ status: number; data: T }> {
  const retries = options.retries ?? 3;
  const delayMs = options.delayMs ?? 700;
  const label = options.label ?? url;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestJsonOnce<T>(url, options);
    } catch (error) {
      lastError = error;
      const canRetry = attempt < retries && isRetryableError(error);
      if (!canRetry) break;
      console.warn(
        `[LLM] ${label} 连接失败 (${attempt + 1}/${retries + 1}): ${
          error instanceof Error ? error.message : error
        }`,
      );
      await sleep(delayMs * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: Omit<RequestJsonOptions, "method" | "headers" | "body"> = {},
): Promise<Response> {
  const method = init?.method ?? "GET";
  const headers = Object.fromEntries(new Headers(init?.headers).entries());
  const body = typeof init?.body === "string" ? init.body : undefined;

  try {
    const retries = options.retries ?? 2;
    const delayMs = options.delayMs ?? 500;
    const timeoutMs = options.timeoutMs ?? 30000;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetch(url, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        lastError = error;
        if (attempt >= retries || !isRetryableError(error)) break;
        await sleep(delayMs * (attempt + 1));
      }
    }
    throw lastError;
  } catch {
    const { status, data } = await requestJson<unknown>(url, {
      method,
      headers,
      body,
      timeoutMs: options.timeoutMs,
      label: options.label,
      retries: options.retries,
      delayMs: options.delayMs,
    });

    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
