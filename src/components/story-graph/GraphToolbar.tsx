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
import { cn } from "@/lib/utils";
import { MODAL_OVERLAY, MODAL_PANEL } from "@/lib/modalTheme";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { StoryValidationIssue } from "@/types/worldBuilder";

type Props = {
  onPreview: () => void;
  variant?: "default" | "studio";
  readOnly?: boolean;
  returnHref?: string;
  onCloneProject?: () => void;
};

export function GraphToolbar({
  onPreview,
  variant = "default",
  readOnly = false,
  returnHref,
  onCloneProject,
}: Props) {
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
    activeProjectId,
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
    setNotice("已提交视频生成任务，请稍候...");
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

  const isStudio = variant === "studio";
  const storyTitle = world.title || "未命名故事线";
  const storyDetailHref = activeProjectId
    ? `/world-builder/stories/${activeProjectId}`
    : "/world-builder/worlds";

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      <header
        className={cn(
          "relative flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-2.5",
          isStudio
            ? "border-b border-white/8 bg-[#0a0a0a] text-white"
            : "rounded-3xl border border-pink-100 bg-white px-4 py-3 shadow-soft",
        )}
      >
        {isStudio && !readOnly && (
          <Link
            href={storyDetailHref}
            className="absolute inset-0 z-0 cursor-pointer"
            aria-label="查看故事详情"
          />
        )}
        <div className="relative z-10 min-w-0 pointer-events-none">
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 text-sm",
              isStudio ? "text-white/55" : "text-slate-500",
            )}
          >
            <Link
              href={returnHref ?? "/world-builder/worlds"}
              className={cn("pointer-events-auto", isStudio ? "hover:text-white" : "hover:text-ink-strong")}
            >
              {readOnly && returnHref ? "App 预览" : world.title || "未命名世界"}
            </Link>
            <span>/</span>
            {readOnly ? (
              <span className="pointer-events-auto">创作过程</span>
            ) : (
              <Link
                href={storyDetailHref}
                className={cn("pointer-events-auto", isStudio ? "hover:text-white" : "hover:text-ink-strong")}
              >
                故事线
              </Link>
            )}
            <span>/</span>
            <span className={cn("pointer-events-auto font-semibold", isStudio ? "text-white" : "text-ink-strong")}>
              {storyTitle}
            </span>
            {isStudio && readOnly && (
              <span className="pointer-events-auto rounded-md bg-white/8 px-2 py-0.5 text-[11px] font-medium text-white/55">
                只读
              </span>
            )}
            {isStudio && !readOnly && (
              <>
                <span className="pointer-events-auto rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                  进行中
                </span>
              </>
            )}
          </div>
          {!isStudio && (
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check size={13} /> 已保存
              </span>
              <span>{episodes.length} 集</span>
              <span>{nodes.length} 个节点</span>
              <span>{nodes.filter((node) => node.kind === "scene" && node.data.status === "ready").length} 个视频就绪</span>
            </div>
          )}
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
          {isStudio && readOnly ? (
            <>
              <span className="hidden text-sm text-white/45 sm:inline">只读模式。如需创建请点击</span>
              <button
                type="button"
                onClick={() => onCloneProject?.()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-deep"
              >
                克隆项目
              </button>
              <Link
                href={returnHref ?? "/world-builder/app-preview"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-1.5 text-sm text-white/85 hover:bg-white/8"
              >
                返回预览
              </Link>
            </>
          ) : isStudio ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-white/70 hover:bg-white/8"
              >
                <Check size={15} className="text-emerald-400" />
                已保存
              </button>
              <button
                type="button"
                onClick={() => setIssues(currentIssues)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent/15 px-2.5 py-1.5 text-sm font-medium text-accent"
              >
                <AlertTriangle size={15} />
                {errorCount + warningCount}
              </button>
              <button
                type="button"
                onClick={onPreview}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-1.5 text-sm text-white/85 hover:bg-white/8"
              >
                <Eye size={15} />
                预览
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-white/90"
              >
                <Send size={15} />
                发布
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
        {notice && (
          <div
            className={cn(
              "fixed right-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-soft",
              isStudio ? "border border-white/10 bg-[#161616] text-white" : "border border-slate-200 bg-white",
            )}
          >
            <Check size={16} className="text-emerald-600" />
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className={isStudio ? "text-white/40 hover:text-white/70" : "text-slate-400 hover:text-slate-700"}>
              <X size={15} />
            </button>
          </div>
        )}
        {issues && (
          <div className={MODAL_OVERLAY}>
            <div className={cn(MODAL_PANEL, "w-full max-w-2xl rounded-3xl p-6")}>
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
