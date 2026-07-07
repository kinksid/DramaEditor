"use client";

import { useState } from "react";
import { Check, Copy, Download, Eye, EyeOff, Key, RotateCcw, Smartphone } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useI18n();
  const { world, exportAppJson, exportStoryJson, resetWorld } = useWorldBuilderStore();
  const [apiKey, setApiKey] = useState("sk-drama-••••••••••••••••••••••••");
  const [showKey, setShowKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState("https://api.dramaplay.dev/v1");
  const [bundleId, setBundleId] = useState("com.dramaplay.app");
  const [entryMode, setEntryMode] = useState("episode-list");
  const [videoStrategy, setVideoStrategy] = useState("remote");
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const downloadAppJson = () => {
    const blob = new Blob([exportAppJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "drama-play-app-story.json"; a.click();
    URL.revokeObjectURL(url);
    setNotice(t("settings.noticeExported"));
  };

  const downloadBackup = () => {
    const blob = new Blob([exportStoryJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "drama-editor-production-backup.json"; a.click();
    URL.revokeObjectURL(url);
    setNotice(t("settings.noticeBackup"));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="mx-auto max-w-4xl px-6 py-6">

        {/* API Key */}
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white">
                <Key size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("settings.apiKey")}</h2>
                <p className="text-sm text-slate-500">{t("settings.apiKeyDesc")}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">{t("settings.apiBaseUrl")}</label>
              <div className="mt-2 flex items-center gap-2">
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm" />
                <button onClick={() => copyToClipboard(baseUrl, "url")}
                  className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                  {copied === "url" ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t("settings.apiKeyLabel")}</label>
              <div className="mt-2 flex items-center gap-2">
                <input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm" />
                <button onClick={() => setShowKey(!showKey)}
                  className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => copyToClipboard(apiKey, "key")}
                  className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                  {copied === "key" ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* App Export */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white">
                <Smartphone size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("settings.appExport")}</h2>
                <p className="text-sm text-slate-500">{t("settings.appExportDesc")}</p>
              </div>
            </div>
          </div>
          <div className="p-6 grid gap-4 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-slate-700">{t("settings.storyName")}</span>
              <input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm" value={world.title} readOnly />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">{t("settings.bundleId")}</span>
              <input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm" value={bundleId} onChange={(e) => setBundleId(e.target.value)} />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">{t("settings.entryMode")}</span>
              <select className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm" value={entryMode} onChange={(e) => setEntryMode(e.target.value)}>
                <option value="episode-list">剧集列表 / Episode List</option>
                <option value="resume-last">继续上次播放 / Resume Last</option>
                <option value="single-story">单故事入口 / Single Story</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">{t("settings.videoStrategy")}</span>
              <select className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm" value={videoStrategy} onChange={(e) => setVideoStrategy(e.target.value)}>
                <option value="remote">远程 URL / Remote URL</option>
                <option value="bundle">随 App 打包 / Bundle</option>
                <option value="hybrid">混合模式 / Hybrid</option>
              </select>
            </label>
          </div>
        </section>

        {/* Data Operations */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white">
                <Download size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("settings.dataOps")}</h2>
                <p className="text-sm text-slate-500">{t("settings.dataOpsDesc")}</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-3">
              <button onClick={downloadAppJson} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                <Smartphone size={16} /> {t("settings.exportApp")}
              </button>
              <button onClick={downloadBackup} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Download size={16} /> {t("settings.exportBackup")}
              </button>
              <button onClick={resetWorld} className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                <RotateCcw size={16} /> {t("settings.resetProject")}
              </button>
            </div>
            {notice && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
                <Check size={16} /> {notice}
              </div>
            )}
          </div>
        </section>
      </div>
    </WorldBuilderLayout>
  );
}
