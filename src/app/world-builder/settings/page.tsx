"use client";

import { useEffect, useState } from "react";
import { Check, Download, Eye, EyeOff, Key, Loader2, RotateCcw, Smartphone, XCircle, Zap } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import { useProviderSettingsStore } from "@/stores/providerSettingsStore";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { PublicProviderConfig } from "@/lib/providers/types";
import { LlmTaskProfilesPanel } from "@/components/world-builder/LlmTaskProfilesPanel";

type ProviderTab = "llm" | "image" | "video";
type ActionFeedback = { message: string; kind: "success" | "error" } | null;

function isSuccessMessage(message: string) {
  return /成功|正常|已保存|已恢复|已导出|已复制|完成|连接正常|执行成功/.test(message);
}

function isZimageWorkflowPath(workflowPath: string) {
  return workflowPath.replace(/\\/g, "/").includes("文生图Zimage");
}

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
    llmTaskProfiles,
  } = useProviderSettingsStore();

  const [showAdvancedLlm, setShowAdvancedLlm] = useState(false);

  const [tab, setTab] = useState<ProviderTab>("llm");
  const [showImageKey, setShowImageKey] = useState(false);
  const [showVideoKey, setShowVideoKey] = useState(false);
  const [draft, setDraft] = useState<PublicProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingCharacter, setTestingCharacter] = useState(false);
  const [bundleId, setBundleId] = useState("com.dramaplay.app");
  const [entryMode, setEntryMode] = useState("episode-list");
  const [videoStrategy, setVideoStrategy] = useState("remote");
  const [providerFeedback, setProviderFeedback] = useState<ActionFeedback>(null);
  const [characterFeedback, setCharacterFeedback] = useState<ActionFeedback>(null);
  const [llmFeedback, setLlmFeedback] = useState<ActionFeedback>(null);
  const [dataFeedback, setDataFeedback] = useState<ActionFeedback>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [zimageAspectRatios, setZimageAspectRatios] = useState<string[]>([]);
  const [zimageOptionsSource, setZimageOptionsSource] = useState<string>("");
  const [loadingZimageOptions, setLoadingZimageOptions] = useState(false);

  const setScopedNotice = (
    scope: "provider" | "character" | "llm" | "data",
    message: string,
    kind?: "success" | "error",
  ) => {
    const resolvedKind = kind ?? (isSuccessMessage(message) ? "success" : "error");
    const feedback = { message, kind: resolvedKind };
    if (scope === "provider") setProviderFeedback(feedback);
    else if (scope === "character") setCharacterFeedback(feedback);
    else if (scope === "llm") setLlmFeedback(feedback);
    else setDataFeedback(feedback);
  };

  useEffect(() => {
    loadFromServer()
      .then(() => {
        const current = useProviderSettingsStore.getState().config;
        setDraft(current);
        if (current?.llm.presetId) {
          setSelectedLlmPresetId(current.llm.presetId);
        }
      })
      .catch((error) =>
        setScopedNotice("provider", error instanceof Error ? error.message : "加载配置失败", "error"),
      )
      .finally(() => setLoading(false));
  }, [loadFromServer, setSelectedLlmPresetId]);

  useEffect(() => {
    if (config && !draft) setDraft(config);
  }, [config, draft]);

  useEffect(() => {
    if (tab !== "image" || !draft?.image.baseUrl) return;
    if (!isZimageWorkflowPath(draft.image.comfyWorkflowTxt2Img)) {
      setZimageAspectRatios([]);
      setZimageOptionsSource("");
      return;
    }

    const params = new URLSearchParams({
      baseUrl: draft.image.baseUrl,
      workflow: draft.image.comfyWorkflowTxt2Img,
    });
    setLoadingZimageOptions(true);
    fetch(`/api/world-builder/providers/comfy/zimage-options?${params}`)
      .then(async (response) => {
        const data = (await response.json()) as {
          supported?: boolean;
          aspectRatios?: string[];
          source?: string;
        };
        if (!data.supported || !data.aspectRatios?.length) return;
        const ratios = [...data.aspectRatios];
        const current = draft.image.comfyZimageAspectRatio;
        if (current && !ratios.includes(current)) {
          ratios.unshift(current);
        }
        setZimageAspectRatios(ratios);
        setZimageOptionsSource(data.source ?? "");
      })
      .catch(() => {
        setZimageAspectRatios([]);
        setZimageOptionsSource("");
      })
      .finally(() => setLoadingZimageOptions(false));
  }, [tab, draft?.image.baseUrl, draft?.image.comfyWorkflowTxt2Img, draft?.image.comfyZimageAspectRatio]);

  const downloadAppJson = () => {
    const blob = new Blob([exportAppJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drama-play-app-story.json";
    a.click();
    URL.revokeObjectURL(url);
    setScopedNotice("data", t("settings.noticeExported"));
  };

  const downloadBackup = () => {
    const blob = new Blob([exportStoryJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drama-editor-production-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    setScopedNotice("data", t("settings.noticeBackup"));
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
        llmTaskProfiles,
        image: {
          provider: draft.image.provider,
          baseUrl: draft.image.baseUrl,
          comfyWorkflowTxt2Img: draft.image.comfyWorkflowTxt2Img,
          comfyWorkflowImg2Img: draft.image.comfyWorkflowImg2Img,
          comfyZimageAspectRatio: draft.image.comfyZimageAspectRatio,
          comfyZimageWidth: draft.image.comfyZimageWidth,
          comfyZimageHeight: draft.image.comfyZimageHeight,
          comfyCharacterBaseUrl: draft.image.comfyCharacterBaseUrl,
          comfyWorkflowCharacter: draft.image.comfyWorkflowCharacter,
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
      setScopedNotice("provider", "供应商配置已保存", "success");
    } catch (error) {
      setScopedNotice("provider", error instanceof Error ? error.message : "保存失败", "error");
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

  const handleTest = async (imageEndpoint?: "general" | "character") => {
    const feedbackScope = imageEndpoint === "character" ? "character" : "provider";
    if (imageEndpoint === "character") {
      setTestingCharacter(true);
      setCharacterFeedback(null);
    } else {
      setTesting(true);
      setProviderFeedback(null);
    }
    try {
      const result = await testProvider(tab, {
        imageEndpoint,
        imageConfig:
          tab === "image" && draft
            ? {
                provider: draft.image.provider,
                baseUrl: draft.image.baseUrl,
                comfyWorkflowTxt2Img: draft.image.comfyWorkflowTxt2Img,
                comfyWorkflowImg2Img: draft.image.comfyWorkflowImg2Img,
                comfyZimageAspectRatio: draft.image.comfyZimageAspectRatio,
                comfyZimageWidth: draft.image.comfyZimageWidth,
                comfyZimageHeight: draft.image.comfyZimageHeight,
                comfyCharacterBaseUrl: draft.image.comfyCharacterBaseUrl,
                comfyWorkflowCharacter: draft.image.comfyWorkflowCharacter,
              }
            : undefined,
      });
      setScopedNotice(feedbackScope, result.message, "success");
    } catch (error) {
      setScopedNotice(
        feedbackScope,
        error instanceof Error ? error.message : "连接测试失败",
        "error",
      );
    } finally {
      if (imageEndpoint === "character") {
        setTestingCharacter(false);
      } else {
        setTesting(false);
      }
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
                          用于：创意拆解、Canvas 建链、参考图分析、文生图扩写
                        </p>
                      </div>
                    )}
                    <LlmTaskProfilesPanel
                      profiles={draft.llm.taskProfiles ?? []}
                      onFeedback={(feedback) => setLlmFeedback(feedback)}
                    />
                    {llmFeedback && <InlineFeedback feedback={llmFeedback} />}
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

                    {draft.image.provider === "comfyui" && (
                      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">场景图像（本机）</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            用于场景首帧、地点参考图等常规 txt2img / img2img 生成。
                          </p>
                        </div>
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

                        {isZimageWorkflowPath(draft.image.comfyWorkflowTxt2Img) && (
                          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800">Z-Image 文生图参数</h4>
                              <p className="mt-1 text-xs text-slate-500">
                                对应 workflow 节点：Text(30) · FluxResolution(24) · Int 宽(4) · Int 高(29)
                                {loadingZimageOptions && " · 正在从 ComfyUI 读取比例预设…"}
                                {!loadingZimageOptions && zimageOptionsSource && (
                                  <> · 比例列表来源：{zimageOptionsSource === "comfyui" ? "ComfyUI 节点" : "本地预设"}</>
                                )}
                              </p>
                            </div>
                            <SelectField
                              label="FluxResolution · aspect_ratio"
                              value={draft.image.comfyZimageAspectRatio}
                              options={
                                zimageAspectRatios.length > 0
                                  ? zimageAspectRatios.map((ratio) => ({ value: ratio, label: ratio }))
                                  : [
                                      {
                                        value: draft.image.comfyZimageAspectRatio,
                                        label: draft.image.comfyZimageAspectRatio,
                                      },
                                    ]
                              }
                              onChange={(value) =>
                                updateDraft({ image: { ...draft.image, comfyZimageAspectRatio: value } })
                              }
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <NumberField
                                label="Int · 宽（节点 4）"
                                value={draft.image.comfyZimageWidth}
                                onChange={(value) =>
                                  updateDraft({ image: { ...draft.image, comfyZimageWidth: value } })
                                }
                              />
                              <NumberField
                                label="Int · 高（节点 29）"
                                value={draft.image.comfyZimageHeight}
                                onChange={(value) =>
                                  updateDraft({ image: { ...draft.image, comfyZimageHeight: value } })
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {draft.image.provider === "comfyui" && (
                      <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                        <div>
                          <h3 className="text-sm font-semibold text-indigo-900">角色设定工作流（远程）</h3>
                          <p className="mt-1 text-xs text-indigo-700/80">
                            角色三视图参考图走独立 ComfyUI 实例与工作流，可与本机场景图像分开部署。
                          </p>
                        </div>
                        <TextField
                          label="角色设定 Base URL"
                          value={draft.image.comfyCharacterBaseUrl}
                          onChange={(value) =>
                            updateDraft({ image: { ...draft.image, comfyCharacterBaseUrl: value } })
                          }
                        />
                        <TextField
                          label="角色设定 workflow"
                          value={draft.image.comfyWorkflowCharacter}
                          onChange={(value) =>
                            updateDraft({ image: { ...draft.image, comfyWorkflowCharacter: value } })
                          }
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleTest("character")}
                            disabled={testingCharacter}
                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-50 disabled:opacity-60"
                          >
                            {testingCharacter ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Zap size={16} />
                            )}
                            测试角色设定连接
                          </button>
                          {characterFeedback && <InlineFeedback feedback={characterFeedback} compact />}
                        </div>
                      </div>
                    )}

                    {draft.image.provider === "seedance" && (
                      <TextField
                        label="Base URL"
                        value={draft.image.baseUrl}
                        onChange={(value) => updateDraft({ image: { ...draft.image, baseUrl: value } })}
                      />
                    )}

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

                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleSaveProviders}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      保存配置
                    </button>
                    <button
                      onClick={() => handleTest()}
                      disabled={testing}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
                    >
                      {testing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                      测试连接
                    </button>
                  </div>
                  {providerFeedback && <InlineFeedback feedback={providerFeedback} />}
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
            {dataFeedback && (
              <div className="mt-4">
                <InlineFeedback feedback={dataFeedback} />
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

function InlineFeedback({
  feedback,
  compact = false,
}: {
  feedback: ActionFeedback;
  compact?: boolean;
}) {
  if (!feedback) return null;
  const isSuccess = feedback.kind === "success";
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-start gap-2 rounded-xl border px-4 py-2.5 text-sm",
        compact ? "flex-1 min-w-[12rem]" : "w-full",
        isSuccess
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-red-100 bg-red-50 text-red-700",
      )}
    >
      {isSuccess ? <Check size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
      <span className="break-words">{feedback.message}</span>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        min={64}
        step={8}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm"
      />
    </label>
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
