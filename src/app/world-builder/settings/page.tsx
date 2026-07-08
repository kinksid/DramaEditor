"use client";

import { useEffect, useState } from "react";
import { Check, Download, Eye, EyeOff, Key, Loader2, RotateCcw, Smartphone, Zap } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import { useProviderSettingsStore } from "@/stores/providerSettingsStore";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { PublicProviderConfig } from "@/lib/providers/types";

type ProviderTab = "llm" | "image" | "video";

export default function SettingsPage() {
  const { t } = useI18n();
  const { world, exportAppJson, exportStoryJson, resetWorld } = useWorldBuilderStore();
  const {
    config,
    selectedLlmPresetId,
    setSelectedLlmPresetId,
    imageApiKey,
    videoApiKey,
    setLlmApiKey,
    setImageApiKey,
    setVideoApiKey,
    loadFromServer,
    saveToServer,
    testProvider,
  } = useProviderSettingsStore();

  const [showAdvancedLlm, setShowAdvancedLlm] = useState(false);

  const [tab, setTab] = useState<ProviderTab>("llm");
  const [showImageKey, setShowImageKey] = useState(false);
  const [showVideoKey, setShowVideoKey] = useState(false);
  const [draft, setDraft] = useState<PublicProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [bundleId, setBundleId] = useState("com.dramaplay.app");
  const [entryMode, setEntryMode] = useState("episode-list");
  const [videoStrategy, setVideoStrategy] = useState("remote");
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadFromServer()
      .then(() => {
        const current = useProviderSettingsStore.getState().config;
        setDraft(current);
        if (current?.llm.presetId) {
          setSelectedLlmPresetId(current.llm.presetId);
        }
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "加载配置失败"))
      .finally(() => setLoading(false));
  }, [loadFromServer, setSelectedLlmPresetId]);

  useEffect(() => {
    if (config && !draft) setDraft(config);
  }, [config, draft]);

  const downloadAppJson = () => {
    const blob = new Blob([exportAppJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drama-play-app-story.json";
    a.click();
    URL.revokeObjectURL(url);
    setNotice(t("settings.noticeExported"));
  };

  const downloadBackup = () => {
    const blob = new Blob([exportStoryJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drama-editor-production-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    setNotice(t("settings.noticeBackup"));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* fallback */
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveProviders = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await saveToServer({
        llmPresetId: selectedLlmPresetId || undefined,
        image: {
          provider: draft.image.provider,
          baseUrl: draft.image.baseUrl,
          comfyWorkflowTxt2Img: draft.image.comfyWorkflowTxt2Img,
          comfyWorkflowImg2Img: draft.image.comfyWorkflowImg2Img,
        },
        video: {
          provider: draft.video.provider,
          baseUrl: draft.video.baseUrl,
          comfyWorkflowTxt2Video: draft.video.comfyWorkflowTxt2Video,
          comfyWorkflowImg2Video: draft.video.comfyWorkflowImg2Video,
        },
        enableMockGeneration: draft.enableMockGeneration,
      });
      setDraft(saved);
      setNotice("供应商配置已保存");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectLlmPreset = (presetId: string) => {
    setSelectedLlmPresetId(presetId);
    const preset = draft?.llm.presets?.find((item) => item.id === presetId);
    if (!preset || !draft) return;
    setDraft({
      ...draft,
      llm: {
        ...draft.llm,
        provider: preset.provider,
        model: preset.model,
        presetId,
      },
    });
  };

  const activeLlmPreset = draft?.llm.presets?.find((item) => item.id === selectedLlmPresetId);

  const handleTest = async () => {
    setTesting(true);
    try {
      const message = await testProvider(tab);
      setNotice(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "连接测试失败");
    } finally {
      setTesting(false);
    }
  };

  const updateDraft = (patch: Partial<PublicProviderConfig>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white">
                <Key size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">AI 供应商配置</h2>
                <p className="text-sm text-slate-500">LLM / 图像 / 视频 分供应商独立配置，密钥仅存本地与服务端运行时</p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 px-6 pt-4">
            <div className="flex gap-2">
              {(["llm", "image", "video"] as ProviderTab[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={cn(
                    "rounded-t-xl px-4 py-2 text-sm font-medium",
                    tab === item ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50",
                  )}
                >
                  {item === "llm" ? "LLM" : item === "image" ? "图像" : "视频"}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-4">
            {loading || !draft ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> 加载配置中...
              </div>
            ) : (
              <>
                {tab === "llm" && (
                  <>
                    <label>
                      <span className="text-sm font-medium text-slate-700">LLM 接入点</span>
                      <select
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"
                        value={selectedLlmPresetId}
                        onChange={(e) => handleSelectLlmPreset(e.target.value)}
                      >
                        {(draft.llm.presets ?? []).map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.available ? "●" : "○"} {preset.label} ({preset.model})
                          </option>
                        ))}
                      </select>
                    </label>
                    {activeLlmPreset && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <p>
                          状态：
                          <span className={activeLlmPreset.available ? "text-emerald-600" : "text-red-600"}>
                            {activeLlmPreset.available ? "可用" : "不可用"}
                          </span>
                          {activeLlmPreset.latencyMs ? ` · ${activeLlmPreset.latencyMs}ms` : ""}
                        </p>
                        {activeLlmPreset.error && (
                          <p className="mt-1 text-xs text-red-600">{activeLlmPreset.error}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">
                          用于：创意拆解、Canvas 建链建议
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAdvancedLlm(!showAdvancedLlm)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      {showAdvancedLlm ? "收起高级设置" : "展开高级设置"}
                    </button>
                    {showAdvancedLlm && (
                      <div className="space-y-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                        <p>Provider: {draft.llm.provider}</p>
                        <p className="break-all">Base URL: {draft.llm.baseUrl}</p>
                        <p>Model: {draft.llm.model}</p>
                        <p>Think: {draft.llm.think === false ? "关闭" : "默认"}</p>
                      </div>
                    )}
                  </>
                )}

                {tab === "image" && (
                  <>
                    <SelectField
                      label="图像供应商"
                      value={draft.image.provider}
                      options={[
                        { value: "comfyui", label: "ComfyUI（局域网）" },
                        { value: "seedance", label: "Seedance / DramaPlay" },
                      ]}
                      onChange={(value) =>
                        updateDraft({
                          image: { ...draft.image, provider: value as PublicProviderConfig["image"]["provider"] },
                        })
                      }
                    />
                    <TextField
                      label="Base URL"
                      value={draft.image.baseUrl}
                      onChange={(value) => updateDraft({ image: { ...draft.image, baseUrl: value } })}
                    />
                    <TextField
                      label="ComfyUI txt2img workflow"
                      value={draft.image.comfyWorkflowTxt2Img}
                      onChange={(value) =>
                        updateDraft({ image: { ...draft.image, comfyWorkflowTxt2Img: value } })
                      }
                    />
                    <TextField
                      label="ComfyUI img2img workflow"
                      value={draft.image.comfyWorkflowImg2Img}
                      onChange={(value) =>
                        updateDraft({ image: { ...draft.image, comfyWorkflowImg2Img: value } })
                      }
                    />
                    <SecretField
                      label="API Key"
                      value={imageApiKey}
                      onChange={setImageApiKey}
                      show={showImageKey}
                      onToggleShow={() => setShowImageKey(!showImageKey)}
                      placeholder={draft.image.hasApiKey ? "已配置（留空保持不变）" : "Seedance API Key"}
                    />
                  </>
                )}

                {tab === "video" && (
                  <>
                    <SelectField
                      label="视频供应商"
                      value={draft.video.provider}
                      options={[
                        { value: "seedance", label: "Seedance / DramaPlay" },
                        { value: "comfyui", label: "ComfyUI（局域网）" },
                        { value: "mock", label: "Mock（离线开发）" },
                      ]}
                      onChange={(value) =>
                        updateDraft({
                          video: { ...draft.video, provider: value as PublicProviderConfig["video"]["provider"] },
                        })
                      }
                    />
                    <TextField
                      label="Base URL"
                      value={draft.video.baseUrl}
                      onChange={(value) => updateDraft({ video: { ...draft.video, baseUrl: value } })}
                    />
                    <TextField
                      label="ComfyUI txt2video workflow"
                      value={draft.video.comfyWorkflowTxt2Video}
                      onChange={(value) =>
                        updateDraft({ video: { ...draft.video, comfyWorkflowTxt2Video: value } })
                      }
                    />
                    <TextField
                      label="ComfyUI img2video workflow"
                      value={draft.video.comfyWorkflowImg2Video}
                      onChange={(value) =>
                        updateDraft({ video: { ...draft.video, comfyWorkflowImg2Video: value } })
                      }
                    />
                    <SecretField
                      label="API Key"
                      value={videoApiKey}
                      onChange={setVideoApiKey}
                      show={showVideoKey}
                      onToggleShow={() => setShowVideoKey(!showVideoKey)}
                      placeholder={draft.video.hasApiKey ? "已配置（留空保持不变）" : "Seedance API Key"}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.enableMockGeneration}
                        onChange={(e) => updateDraft({ enableMockGeneration: e.target.checked })}
                      />
                      无 API Key 时启用 Mock 降级（开发模式）
                    </label>
                  </>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={handleSaveProviders}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    保存配置
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
                  >
                    {testing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    测试连接
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

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
            {copied && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                已复制 {copied}
              </div>
            )}
          </div>
        </section>
      </div>
    </WorldBuilderLayout>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SecretField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <input
          type={show ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}
