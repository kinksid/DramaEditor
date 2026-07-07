"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  Download,
  Eye,
  RotateCcw,
  Send,
  Smartphone,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { StoryValidationIssue } from "@/types/worldBuilder";

type Props = {
  onPreview: () => void;
};

export function GraphToolbar({ onPreview }: Props) {
  const {
    world,
    episodes,
    nodes,
    selectedEpisodeId,
    selectEpisode,
    resetWorld,
    saveToLocal,
    validateStory,
    publishStory,
    generateAllMockVideos,
    exportStoryJson,
    exportAppJson,
    exportThirdPartyWorkflow,
    importStoryJson,
  } = useWorldBuilderStore();
  const [issues, setIssues] = useState<StoryValidationIssue[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const currentIssues = useMemo(() => validateStory(), [validateStory, nodes, episodes]);
  const errorCount = currentIssues.filter((issue) => issue.severity === "error").length;
  const warningCount = currentIssues.filter((issue) => issue.severity === "warning").length;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadAppJson = () => {
    const blob = new Blob([exportAppJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "drama-play-app-story.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("已导出 App 播放数据");
  };

  const downloadStoryJson = () => {
    const blob = new Blob([exportStoryJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "story-world.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    saveToLocal();
    setNotice("已保存到本地浏览器");
  };

  const handleGenerateVideos = () => {
    generateAllMockVideos();
    setNotice("所有视频节点已生成模拟视频");
  };

  const handlePublish = () => {
    const result = publishStory();
    setIssues(result);
    if (!result.some((issue) => issue.severity === "error")) {
      setNotice("发布检查通过，故事线已标记为可发布");
    }
  };

  const copyWorkflow = async (target: "tapnow" | "libtv") => {
    await copyText(exportThirdPartyWorkflow(target));
    setNotice(`已复制 ${target === "tapnow" ? "TapNow" : "LibTV"} 工作流数据`);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importStoryJson(reader.result as string);
      setNotice(result.message);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-pink-100 bg-white px-4 py-3 shadow-soft">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href="/world-builder/home" className="hover:text-ink-strong">
              互动短剧编辑器 DramaEditor
            </Link>
            <span>/</span>
            <span>{world.title}</span>
            <span>/</span>
            <span className="font-semibold text-ink-strong">树状分支剧情</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <Check size={13} /> 已保存
            </span>
            <span>{episodes.length} 集</span>
            <span>{nodes.length} 个节点</span>
            <span>{nodes.filter((node) => node.kind === "scene" && node.data.status === "ready").length} 个视频就绪</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={selectedEpisodeId} onChange={(e) => selectEpisode(e.target.value)}>
            {episodes.map((episode) => (
              <option key={episode.id} value={episode.id}>
                第 {episode.label ?? episode.index} 集：{episode.title}
              </option>
            ))}
          </select>
          <button onClick={() => setIssues(currentIssues)} className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
            <AlertTriangle size={16} /> {errorCount + warningCount}
          </button>
          <button onClick={onPreview} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            <Eye size={16} /> 预览
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            <Check size={16} /> 保存
          </button>
          <button onClick={handlePublish} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            <Send size={16} /> 发布
          </button>
          <button onClick={handleGenerateVideos} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            <Wand2 size={16} /> 生成视频
          </button>
          <Link href="/world-builder/app-preview" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            <Smartphone size={16} /> App 预览
          </Link>

          {/* Import / Export group */}
          <button onClick={handleImport} className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-deep" title="导入故事数据">
            <Upload size={16} /> 导入
          </button>
          <button onClick={downloadStoryJson} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" title="导出故事数据">
            <Download size={17} />
          </button>
          <button onClick={downloadAppJson} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" title="导出 App 数据">
            <Smartphone size={17} />
          </button>
          <button onClick={() => copyWorkflow("tapnow")} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" title="复制 TapNow 工作流">
            <ClipboardCopy size={17} />
          </button>
          <button onClick={resetWorld} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" title="重置世界">
            <RotateCcw size={17} />
          </button>
        </div>
        {notice && (
          <div className="fixed right-5 top-5 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-soft">
            <Check size={16} className="text-emerald-600" />
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-700">
              <X size={15} />
            </button>
          </div>
        )}
        {issues && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">发布检查</p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {issues.length ? "需要处理的制作项" : "故事线已可发布"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {issues.length
                      ? `发现 ${issues.filter((issue) => issue.severity === "error").length} 个错误、${issues.filter((issue) => issue.severity === "warning").length} 个提醒。`
                      : "节点、分支和视频状态已满足 App 导出要求。"}
                  </p>
                </div>
                <button onClick={() => setIssues(null)} className="grid size-9 place-items-center rounded-xl hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto">
                {issues.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                    可以发布，也可以继续导出 App 数据给 iOS 播放器使用。
                  </div>
                ) : (
                  issues.map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => {
                        if (issue.episodeId) selectEpisode(issue.episodeId);
                        setIssues(null);
                      }}
                      className="w-full rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className={issue.severity === "error" ? "text-red-600" : "text-pink-600"}>
                          {issue.severity === "error" ? "错误" : "提醒"}
                        </span>
                        <span className="font-semibold">{issue.title}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{issue.detail}</p>
                    </button>
                  ))
                )}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setIssues(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">
                  关闭
                </button>
                <button onClick={downloadAppJson} className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
                  导出 App 数据
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}
