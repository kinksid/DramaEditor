"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Download, PenLine, Radio, RotateCcw, Upload, X } from "lucide-react";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { StoryValidationIssue } from "@/types/worldBuilder";

export function WorldHero() {
  const { world, characters, locations, episodes, resetWorld, publishStory, exportAppJson } =
    useWorldBuilderStore();
  const [issues, setIssues] = useState<StoryValidationIssue[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const downloadAppJson = () => {
    const blob = new Blob([exportAppJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "drama-play-app-story.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("已导出 App 数据");
  };

  const handlePublish = () => {
    const result = publishStory();
    setIssues(result);
    if (!result.some((issue) => issue.severity === "error")) {
      setNotice("发布检查通过");
    }
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
      <div className="relative min-h-[310px] bg-[radial-gradient(circle_at_18%_18%,rgba(242,125,61,0.48),transparent_28%),radial-gradient(circle_at_82%_6%,rgba(255,255,255,0.12),transparent_30%),linear-gradient(135deg,#090d16,#283244_48%,#f27d3d)] p-8 text-white">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs backdrop-blur">
            <Radio size={14} />
            世界封面
          </div>
          <h1 className="text-5xl font-semibold tracking-normal">{world.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">{world.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[...world.genre, ...world.tags].map((tag) => (
              <span key={tag} className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
            <Calendar size={15} /> {world.createdAt}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-2">{characters.length} 个角色</span>
          <span className="rounded-full bg-slate-100 px-3 py-2">{locations.length} 个地点</span>
          <span className="rounded-full bg-slate-100 px-3 py-2">{episodes.length} 条故事线</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/world-builder/setup" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            <PenLine size={16} /> 编辑世界
          </Link>
          <button onClick={resetWorld} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            <RotateCcw size={16} /> 重置世界
          </button>
          <button onClick={downloadAppJson} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            <Download size={16} /> 导出 App 数据
          </button>
          <button onClick={handlePublish} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-orange-600">
            <Upload size={16} /> 发布
          </button>
        </div>
      </div>
      {notice && (
        <div className="fixed right-5 top-5 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-soft">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-700">
            <X size={15} />
          </button>
        </div>
      )}
      {issues && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">发布检查</p>
                <h2 className="mt-2 text-xl font-semibold">
                  {issues.some((issue) => issue.severity === "error") ? "发布前需要修正" : "可以发布"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {issues.length ? `发现 ${issues.length} 个制作项。` : "当前故事线可用于 App 制作流程。"}
                </p>
              </div>
              <button onClick={() => setIssues(null)} className="grid size-9 place-items-center rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 max-h-80 space-y-3 overflow-y-auto">
              {issues.length ? (
                issues.map((issue) => (
                  <div key={issue.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className={issue.severity === "error" ? "text-sm font-semibold text-red-600" : "text-sm font-semibold text-orange-600"}>
                      {issue.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{issue.detail}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                  发布检查通过，可以导出 App 数据或继续进入故事图编辑。
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setIssues(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">
                关闭
              </button>
              <Link href="/world-builder/story-graph" className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
                打开故事图
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
