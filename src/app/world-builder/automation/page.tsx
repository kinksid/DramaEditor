"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  Download,
  Loader2,
  Play,
  Sparkles,
  Terminal,
} from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import type { DreemBlueprint, DreemIntent } from "@/lib/dreemAutoAgent";

type FlowResponse = {
  intent: DreemIntent;
  blueprint: DreemBlueprint;
  code?: string;
  error?: string;
};

const EXAMPLES = [
  "帮我采集网页上的新闻标题",
  "批量整理 Downloads 里的 PDF 文件",
  "调用多个 API 端点并聚合结果",
];

export default function AutomationPage() {
  const [query, setQuery] = useState(EXAMPLES[0]);
  const [flow, setFlow] = useState<FlowResponse | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<"analyze" | "generate" | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const callFlowApi = async (
    generate: boolean,
    nextParams: Record<string, string> = params,
  ) => {
    setLoading(generate ? "generate" : "analyze");
    setError("");
    try {
      const response = await fetch("/api/world-builder/agent/dreem-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, params: nextParams, generate }),
      });
      const payload = (await response.json()) as FlowResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "工作流请求失败");
      }
      setFlow(payload);
      if (!generate) {
        setParams(
          Object.fromEntries(
            payload.blueprint.parameters.map((parameter) => [
              parameter.key,
              parameter.defaultValue ?? "",
            ]),
          ),
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "工作流请求失败");
    } finally {
      setLoading(null);
    }
  };

  const analyze = (event: FormEvent) => {
    event.preventDefault();
    void callFlowApi(false);
  };

  const copyCode = async () => {
    if (!flow?.code) return;
    await navigator.clipboard.writeText(flow.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadCode = () => {
    if (!flow?.code) return;
    const blob = new Blob([flow.code], { type: "text/x-python;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${flow.intent.blueprintId}.py`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="mx-auto max-w-6xl px-6 py-7">
        <header className="overflow-hidden rounded-3xl border border-pink-100 bg-white">
          <div className="relative px-7 py-7">
            <div className="dot-matrix absolute inset-0" />
            <div className="relative flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                  <Sparkles size={13} />
                  Dreem-AutoAgent
                </div>
                <h1 className="text-2xl font-bold text-ink-strong">
                  用自然语言组合自动化工作流
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  描述目标，Dreem 会匹配蓝图、展示执行节点，并生成可审查的 Python
                  脚本。脚本仅供下载，不会在服务器上执行。
                </p>
              </div>
              <div className="grid size-14 place-items-center rounded-2xl bg-slate-950 text-pink-300 shadow-lg">
                <Bot size={28} />
              </div>
            </div>
          </div>

          <form onSubmit={analyze} className="border-t border-pink-100 p-5">
            <div className="flex gap-3">
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                rows={2}
                maxLength={4000}
                className="min-h-[70px] min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-ink-strong placeholder:text-slate-400"
                placeholder="例如：帮我采集网页上的新闻标题"
              />
              <button
                type="submit"
                disabled={Boolean(loading) || !query.trim()}
                className="inline-flex w-32 shrink-0 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === "analyze" ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Sparkles size={17} />
                )}
                解析意图
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className="rounded-full border border-pink-100 px-3 py-1.5 text-xs text-slate-500 transition hover:border-pink-200 hover:bg-pink-50 hover:text-accent"
                >
                  {example}
                </button>
              ))}
            </div>
          </form>
        </header>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {flow && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                      推荐蓝图
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-ink-strong">
                      {flow.blueprint.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {flow.blueprint.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {flow.intent.usedFallback
                      ? "默认推荐"
                      : `匹配度 ${Math.round(flow.intent.confidence * 100)}%`}
                  </span>
                </div>

                <div className="mt-6 overflow-x-auto pb-2">
                  <div className="flex min-w-max items-center">
                    {flow.blueprint.nodes.map((node, index) => (
                      <div key={node.id} className="flex items-center">
                        <div className="w-36 rounded-2xl border border-pink-100 bg-slate-50 p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                            {node.type === "start"
                              ? "输入"
                              : node.type === "end"
                                ? "输出"
                                : "动作"}
                          </span>
                          <p className="mt-1 text-xs font-semibold leading-5 text-ink-strong">
                            {node.label}
                          </p>
                          {node.tool && (
                            <code className="mt-1 block text-[10px] text-slate-400">
                              {node.tool}
                            </code>
                          )}
                        </div>
                        {index < flow.blueprint.nodes.length - 1 && (
                          <ArrowRight size={18} className="mx-2 text-pink-300" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
                    <Play size={16} />
                  </div>
                  <div>
                    <h2 className="font-bold text-ink-strong">配置节点参数</h2>
                    <p className="text-xs text-slate-500">
                      必填参数会在生成前校验，值会安全编码进脚本。
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {flow.blueprint.parameters.map((parameter) => (
                    <label
                      key={parameter.key}
                      className={parameter.kind === "lines" ? "md:col-span-2" : ""}
                    >
                      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                        {parameter.label}
                        {parameter.required && <span className="ml-1 text-accent">*</span>}
                      </span>
                      {parameter.kind === "lines" ? (
                        <textarea
                          rows={4}
                          value={params[parameter.key] ?? ""}
                          onChange={(event) =>
                            setParams((current) => ({
                              ...current,
                              [parameter.key]: event.target.value,
                            }))
                          }
                          placeholder={parameter.placeholder}
                          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-ink-strong"
                        />
                      ) : (
                        <input
                          value={params[parameter.key] ?? ""}
                          onChange={(event) =>
                            setParams((current) => ({
                              ...current,
                              [parameter.key]: event.target.value,
                            }))
                          }
                          placeholder={parameter.placeholder}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-ink-strong"
                        />
                      )}
                      {parameter.help && (
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {parameter.help}
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => void callFlowApi(true)}
                  disabled={Boolean(loading)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading === "generate" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Terminal size={16} />
                  )}
                  生成可运行脚本
                </button>
              </section>
            </div>

            <aside className="min-w-0 rounded-3xl border border-slate-800 bg-slate-950 text-white xl:sticky xl:top-7 xl:h-[calc(100vh-3.5rem)]">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold">生成结果</p>
                  <p className="text-[11px] text-slate-500">
                    {flow.code ? `${flow.intent.blueprintId}.py` : "等待配置"}
                  </p>
                </div>
                {flow.code && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void copyCode()}
                      title="复制代码"
                      className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={downloadCode}
                      title="下载脚本"
                      className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                )}
              </div>
              <pre className="h-[calc(100%-73px)] overflow-auto p-5 text-xs leading-6 text-slate-300">
                <code>
                  {flow.code ??
                    "# 填写蓝图参数后生成脚本\n\n# 为了安全，Dreem 不会在应用服务器中\n# 执行生成代码或自动安装依赖。"}
                </code>
              </pre>
            </aside>
          </div>
        )}
      </div>
    </WorldBuilderLayout>
  );
}
