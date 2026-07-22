"use client";

import { useState } from "react";
import { Check, Copy, Key, Server, Shield, Terminal } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";

const endpoints = [
  {
    method: "GET",
    path: "/v1/projects/{projectId}",
    desc: "获取项目信息和故事数据",
    curl: `curl -X GET "https://api.dramaplay.dev/v1/projects/proj_abc123" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "project": {
    "id": "proj_abc123",
    "name": "霓虹东京迷案",
    "world": { "title": "...", "description": "..." },
    "episodes": 5,
    "nodes": 15,
    "createdAt": "2026-06-23"
  }
}`,
  },
  {
    method: "POST",
    path: "/v1/projects/{projectId}/story",
    desc: "导入/更新故事分集树状结构",
    curl: `curl -X POST "https://api.dramaplay.dev/v1/projects/proj_abc123/story" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "episodes": [...],
    "nodes": [...],
    "edges": [...]
  }'`,
    response: `{
  "success": true,
  "message": "已导入 5 个剧集，15 个节点，11 条连线"
}`,
  },
  {
    method: "GET",
    path: "/v1/projects/{projectId}/export/app",
    desc: "导出适用于 DramaPlay iOS App 的播放数据",
    curl: `curl -X GET "https://api.dramaplay.dev/v1/projects/proj_abc123/export/app" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "schemaVersion": 1,
  "appTarget": "DramaPlay iOS",
  "exportedAt": "2026-07-04T...",
  "episodes": [
    {
      "id": "ep1",
      "title": "雨中幽灵",
      "nodes": [ ... ],
      "edges": [ ... ]
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/v1/projects/{projectId}/validate",
    desc: "校验故事结构的完整性和可发布性",
    curl: `curl -X GET "https://api.dramaplay.dev/v1/projects/proj_abc123/validate" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "valid": true,
  "score": 92,
  "issues": [
    { "severity": "warning", "title": "第3集缺少互动节点" }
  ]
}`,
  },
  {
    method: "POST",
    path: "/v1/generate/video",
    desc: "提交视频生成任务（异步处理）",
    curl: `curl -X POST "https://api.dramaplay.dev/v1/generate/video" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "雨夜东京街头的追猎场景",
    "style": "cyberpunk-noir",
    "duration": 5,
    "aspectRatio": "9:16"
  }'`,
    response: `{
  "taskId": "task_xyz789",
  "status": "queued",
  "estimatedTime": "~30s"
}`,
  },
  {
    method: "GET",
    path: "/v1/generate/task/{taskId}",
    desc: "查询视频生成任务状态",
    curl: `curl -X GET "https://api.dramaplay.dev/v1/generate/task/task_xyz789" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "taskId": "task_xyz789",
  "status": "completed",
  "videoUrl": "https://cdn.dramaplay.dev/videos/..."
}`,
  },
];

export default function ApiPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* */ }
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="mx-auto max-w-4xl px-6 py-6">

        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white">
                <Terminal size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Seedance API</h2>
                <p className="text-sm text-slate-500">REST API 接口 · Bearer Token 认证</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <Server size={18} className="text-slate-400" />
              <p className="mt-2 text-xs font-medium text-slate-500">Base URL</p>
              <code className="mt-1 block text-sm font-mono font-semibold text-slate-800 break-all">
                https://api.dramaplay.dev
              </code>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <Key size={18} className="text-slate-400" />
              <p className="mt-2 text-xs font-medium text-slate-500">认证</p>
              <code className="mt-1 block text-sm font-mono font-semibold text-slate-800">
                Bearer Token
              </code>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <Shield size={18} className="text-slate-400" />
              <p className="mt-2 text-xs font-medium text-slate-500">速率限制</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">60 req/min</p>
              <p className="text-xs text-slate-400">生成接口: 5 req/min</p>
            </div>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mt-4 space-y-4">
          {endpoints.map((ep, idx) => (
            <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase text-white ${ep.method === "GET" ? "bg-emerald-600" : ep.method === "POST" ? "bg-blue-600" : "bg-slate-600"}`}>
                    {ep.method}
                  </span>
                  <code className="truncate text-sm font-mono font-semibold text-slate-800">{ep.path}</code>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{ep.desc}</span>
              </div>

              {/* cURL */}
              <div className="relative bg-slate-900 px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">cURL</span>
                  <button
                    onClick={() => copyText(ep.curl, `curl-${idx}`)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  >
                    {copied === `curl-${idx}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copied === `curl-${idx}` ? "已复制" : "复制"}
                  </button>
                </div>
                <pre className="overflow-x-auto text-xs font-mono leading-6 text-emerald-300">
                  <code>{ep.curl}</code>
                </pre>
              </div>

              {/* Response */}
              <div className="relative bg-slate-950 px-6 py-4 rounded-b-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Response</span>
                  <button
                    onClick={() => copyText(ep.response, `resp-${idx}`)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  >
                    {copied === `resp-${idx}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copied === `resp-${idx}` ? "已复制" : "复制"}
                  </button>
                </div>
                <pre className="overflow-x-auto text-xs font-mono leading-6 text-slate-300 max-h-[240px] overflow-y-auto">
                  <code>{ep.response}</code>
                </pre>
              </div>
            </div>
          ))}
        </section>
      </div>
    </WorldBuilderLayout>
  );
}
