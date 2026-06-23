"use client";

import { useState } from "react";
import { Check, Download, RotateCcw, Smartphone } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

export default function SettingsPage() {
  const { world, exportAppJson, exportStoryJson, resetWorld } = useWorldBuilderStore();
  const [bundleId, setBundleId] = useState("com.dramaplay.app");
  const [entryMode, setEntryMode] = useState("episode-list");
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

  const downloadBackup = () => {
    const blob = new Blob([exportStoryJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "drama-editor-production-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("已导出制作备份");
  };

  return (
    <WorldBuilderLayout>
      <div className="mx-auto max-w-5xl px-6 py-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-xs font-semibold tracking-[0.16em] text-accent">设置</p>
          <h1 className="mt-2 text-3xl font-semibold">制作与导出设置</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            配置导出给 iOS 互动影游 App 的基础参数。当前设置保存在页面状态中，后续可以接入项目配置文件。
          </p>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">App 目标</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium">故事名称</span>
              <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" value={world.title} readOnly />
            </label>
            <label>
              <span className="text-sm font-medium">应用包名</span>
              <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" value={bundleId} onChange={(event) => setBundleId(event.target.value)} />
            </label>
            <label>
              <span className="text-sm font-medium">App 入口模式</span>
              <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" value={entryMode} onChange={(event) => setEntryMode(event.target.value)}>
                <option value="episode-list">剧集列表</option>
                <option value="resume-last">继续上次播放</option>
                <option value="single-story">单故事入口</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">视频资源策略</span>
              <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" defaultValue="remote">
                <option value="remote">远程 URL</option>
                <option value="bundle">随 App 打包</option>
                <option value="hybrid">混合模式</option>
              </select>
            </label>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">平台动作</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={downloadAppJson} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
              <Smartphone size={16} /> 导出 App 数据
            </button>
            <button onClick={downloadBackup} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
              <Download size={16} /> 导出制作备份
            </button>
            <button onClick={resetWorld} className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
              <RotateCcw size={16} /> 重置本地项目
            </button>
          </div>
          {notice && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <Check size={16} /> {notice}
            </div>
          )}
        </section>
      </div>
    </WorldBuilderLayout>
  );
}
