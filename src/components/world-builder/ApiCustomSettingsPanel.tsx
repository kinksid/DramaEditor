"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { useProviderSettingsStore } from "@/stores/providerSettingsStore";
import { cn } from "@/lib/utils";
import type { PublicProviderConfig } from "@/lib/providers/types";

type ProviderTab = "llm" | "image" | "video";
type Feedback = { message: string; kind: "success" | "error" } | null;

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-[#151515] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25";
const labelClass = "block text-sm text-white/55";

function isSuccessMessage(message: string) {
  return /成功|正常|已保存|已恢复|连接正常|执行成功/.test(message);
}

export function ApiCustomSettingsPanel({ zh }: { zh: boolean }) {
  const {
    selectedLlmPresetId,
    setSelectedLlmPresetId,
    llmApiKey,
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

  const [tab, setTab] = useState<ProviderTab>("llm");
  const [draft, setDraft] = useState<PublicProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingCharacter, setTestingCharacter] = useState(false);
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [showImageKey, setShowImageKey] = useState(false);
  const [showVideoKey, setShowVideoKey] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [characterFeedback, setCharacterFeedback] = useState<Feedback>(null);

  useEffect(() => {
    setLoading(true);
    loadFromServer()
      .then(() => {
        const current = useProviderSettingsStore.getState().config;
        setDraft(current);
        if (current?.llm.presetId) setSelectedLlmPresetId(current.llm.presetId);
      })
      .catch((error) =>
        setFeedback({
          message: error instanceof Error ? error.message : zh ? "加载配置失败" : "Load failed",
          kind: "error",
        }),
      )
      .finally(() => setLoading(false));
  }, [loadFromServer, setSelectedLlmPresetId, zh]);

  const updateDraft = (patch: Partial<PublicProviderConfig>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const handleSelectLlmPreset = (presetId: string) => {
    setSelectedLlmPresetId(presetId);
    const preset = draft?.llm.presets?.find((item) => item.id === presetId);
    if (!preset || !draft) return;
    updateDraft({
      llm: {
        ...draft.llm,
        provider: preset.provider,
        model: preset.model,
        presetId,
      },
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await saveToServer({
        llmPresetId: selectedLlmPresetId || undefined,
        llmTaskProfiles,
        llm: {
          provider: draft.llm.provider,
          baseUrl: draft.llm.baseUrl,
          model: draft.llm.model,
          think: draft.llm.think,
        },
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
      setFeedback({ message: zh ? "供应商配置已保存" : "Settings saved", kind: "success" });
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : zh ? "保存失败" : "Save failed",
        kind: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (imageEndpoint?: "general" | "character") => {
    if (imageEndpoint === "character") {
      setTestingCharacter(true);
      setCharacterFeedback(null);
    } else {
      setTesting(true);
      setFeedback(null);
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
      const payload = { message: result.message, kind: "success" as const };
      if (imageEndpoint === "character") setCharacterFeedback(payload);
      else setFeedback(payload);
    } catch (error) {
      const payload = {
        message: error instanceof Error ? error.message : zh ? "连接测试失败" : "Test failed",
        kind: "error" as const,
      };
      if (imageEndpoint === "character") setCharacterFeedback(payload);
      else setFeedback(payload);
    } finally {
      if (imageEndpoint === "character") setTestingCharacter(false);
      else setTesting(false);
    }
  };

  const activeLlmPreset = draft?.llm.presets?.find((item) => item.id === selectedLlmPresetId);
  const llmReady = Boolean(activeLlmPreset?.available);
  const imageReady = Boolean(draft?.image.hasApiKey || draft?.image.provider === "comfyui");
  const videoReady = Boolean(
    draft?.video.hasApiKey || draft?.video.provider === "comfyui" || draft?.enableMockGeneration,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">{zh ? "API 自定义设置" : "API Settings"}</h2>
          <p className="mt-2 text-sm text-white/45">
            {zh
              ? "分通道配置 LLM / 图像 / 视频；密钥仅存本地与服务端运行时，页面不回显明文。"
              : "Configure LLM / image / video channels; keys stay local + server runtime."}
          </p>
        </div>
        <Link
          href="/world-builder/settings"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/65 transition hover:bg-white/5 hover:text-white"
        >
          {zh ? "完整设置页" : "Full settings"}
          <ExternalLink size={12} />
        </Link>
      </div>

      {!loading && draft && (
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {(
            [
              {
                id: "llm" as const,
                label: "LLM",
                detail: activeLlmPreset?.label ?? draft.llm.provider,
                ready: llmReady,
              },
              {
                id: "image" as const,
                label: zh ? "图像" : "Image",
                detail: draft.image.provider,
                ready: imageReady,
              },
              {
                id: "video" as const,
                label: zh ? "视频" : "Video",
                detail: draft.video.provider,
                ready: videoReady,
              },
            ] as const
          ).map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => setTab(channel.id)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition",
                tab === channel.id
                  ? "border-white/25 bg-white/10"
                  : "border-white/10 bg-[#151515] hover:border-white/18",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-white">{channel.label}</span>
                <span
                  className={cn(
                    "size-2 rounded-full",
                    channel.ready ? "bg-emerald-400" : "bg-amber-400/80",
                  )}
                />
              </div>
              <p className="mt-1 truncate text-[11px] text-white/45">{channel.detail}</p>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-[#1a1a1a] p-5">
        {loading || !draft ? (
          <div className="flex items-center gap-2 text-sm text-white/45">
            <Loader2 size={16} className="animate-spin" />
            {zh ? "加载配置中…" : "Loading…"}
          </div>
        ) : (
          <>
            {tab === "llm" && (
              <>
                <label className={labelClass}>
                  {zh ? "LLM 接入点（预设）" : "LLM preset"}
                  <select
                    className={fieldClass}
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
                  <div className="rounded-xl border border-white/8 bg-black/25 px-4 py-3 text-xs text-white/55">
                    <p>
                      {zh ? "状态" : "Status"}：
                      <span className={activeLlmPreset.available ? "text-emerald-400" : "text-red-400"}>
                        {activeLlmPreset.available
                          ? zh
                            ? "可用"
                            : "Available"
                          : zh
                            ? "不可用"
                            : "Unavailable"}
                      </span>
                      {activeLlmPreset.latencyMs ? ` · ${activeLlmPreset.latencyMs}ms` : ""}
                      {activeLlmPreset.error ? ` · ${activeLlmPreset.error}` : ""}
                    </p>
                    <p className="mt-1 break-all">
                      {draft.llm.provider} · {draft.llm.model}
                    </p>
                    <p className="mt-1 break-all text-white/35">{draft.llm.baseUrl}</p>
                  </div>
                )}
                <SecretInput
                  label={zh ? "LLM API Key（可选，OpenAI 兼容）" : "LLM API Key (optional)"}
                  value={llmApiKey}
                  onChange={setLlmApiKey}
                  show={showLlmKey}
                  onToggle={() => setShowLlmKey((v) => !v)}
                  placeholder={
                    draft.llm.hasApiKey
                      ? zh
                        ? "已配置（留空不变）"
                        : "Configured"
                      : zh
                        ? "本地 Ollama 可留空"
                        : "Leave empty for local Ollama"
                  }
                />
              </>
            )}

            {tab === "image" && (
              <>
                <label className={labelClass}>
                  {zh ? "图像供应商" : "Image provider"}
                  <select
                    className={fieldClass}
                    value={draft.image.provider}
                    onChange={(e) =>
                      updateDraft({
                        image: {
                          ...draft.image,
                          provider: e.target.value as PublicProviderConfig["image"]["provider"],
                        },
                      })
                    }
                  >
                    <option value="comfyui">ComfyUI（{zh ? "局域网" : "LAN"}）</option>
                    <option value="seedance">Seedance / DramaPlay</option>
                  </select>
                </label>

                {draft.image.provider === "comfyui" && (
                  <div className="space-y-3 rounded-xl border border-white/8 bg-black/25 p-4">
                    <p className="text-sm font-medium text-white">{zh ? "本地 ComfyUI" : "Local ComfyUI"}</p>
                    <label className={labelClass}>
                      Base URL
                      <input
                        className={cn(fieldClass, "font-mono")}
                        value={draft.image.baseUrl}
                        onChange={(e) => updateDraft({ image: { ...draft.image, baseUrl: e.target.value } })}
                        placeholder="http://127.0.0.1:8188"
                      />
                    </label>
                    <label className={labelClass}>
                      txt2img workflow
                      <input
                        className={cn(fieldClass, "font-mono text-xs")}
                        value={draft.image.comfyWorkflowTxt2Img}
                        onChange={(e) =>
                          updateDraft({ image: { ...draft.image, comfyWorkflowTxt2Img: e.target.value } })
                        }
                      />
                    </label>
                    <label className={labelClass}>
                      img2img workflow
                      <input
                        className={cn(fieldClass, "font-mono text-xs")}
                        value={draft.image.comfyWorkflowImg2Img}
                        onChange={(e) =>
                          updateDraft({ image: { ...draft.image, comfyWorkflowImg2Img: e.target.value } })
                        }
                      />
                    </label>
                  </div>
                )}

                {draft.image.provider === "comfyui" && (
                  <div className="space-y-3 rounded-xl border border-accent/25 bg-accent/5 p-4">
                    <p className="text-sm font-medium text-white">{zh ? "角色设定 ComfyUI（可选）" : "Character ComfyUI"}</p>
                    <label className={labelClass}>
                      {zh ? "角色 Base URL" : "Character Base URL"}
                      <input
                        className={cn(fieldClass, "font-mono")}
                        value={draft.image.comfyCharacterBaseUrl}
                        onChange={(e) =>
                          updateDraft({ image: { ...draft.image, comfyCharacterBaseUrl: e.target.value } })
                        }
                      />
                    </label>
                    <label className={labelClass}>
                      {zh ? "角色 workflow" : "Character workflow"}
                      <input
                        className={cn(fieldClass, "font-mono text-xs")}
                        value={draft.image.comfyWorkflowCharacter}
                        onChange={(e) =>
                          updateDraft({ image: { ...draft.image, comfyWorkflowCharacter: e.target.value } })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTest("character")}
                      disabled={testingCharacter}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/75 hover:bg-white/5 disabled:opacity-50"
                    >
                      {testingCharacter ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      {zh ? "测试角色 ComfyUI" : "Test character ComfyUI"}
                    </button>
                    {characterFeedback && <FeedbackLine feedback={characterFeedback} />}
                  </div>
                )}

                {draft.image.provider === "seedance" && (
                  <label className={labelClass}>
                    Base URL
                    <input
                      className={cn(fieldClass, "font-mono")}
                      value={draft.image.baseUrl}
                      onChange={(e) => updateDraft({ image: { ...draft.image, baseUrl: e.target.value } })}
                    />
                  </label>
                )}

                <SecretInput
                  label="API Key"
                  value={imageApiKey}
                  onChange={setImageApiKey}
                  show={showImageKey}
                  onToggle={() => setShowImageKey((v) => !v)}
                  placeholder={draft.image.hasApiKey ? (zh ? "已配置（留空不变）" : "Configured") : "Seedance API Key"}
                />
              </>
            )}

            {tab === "video" && (
              <>
                <label className={labelClass}>
                  {zh ? "视频供应商" : "Video provider"}
                  <select
                    className={fieldClass}
                    value={draft.video.provider}
                    onChange={(e) =>
                      updateDraft({
                        video: {
                          ...draft.video,
                          provider: e.target.value as PublicProviderConfig["video"]["provider"],
                        },
                      })
                    }
                  >
                    <option value="seedance">Seedance / DramaPlay</option>
                    <option value="comfyui">ComfyUI（{zh ? "局域网" : "LAN"}）</option>
                    <option value="mock">Mock（{zh ? "离线开发" : "offline"}）</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Base URL
                  <input
                    className={cn(fieldClass, "font-mono")}
                    value={draft.video.baseUrl}
                    onChange={(e) => updateDraft({ video: { ...draft.video, baseUrl: e.target.value } })}
                    placeholder="http://127.0.0.1:8188"
                  />
                </label>
                <label className={labelClass}>
                  txt2video workflow
                  <input
                    className={cn(fieldClass, "font-mono text-xs")}
                    value={draft.video.comfyWorkflowTxt2Video}
                    onChange={(e) =>
                      updateDraft({ video: { ...draft.video, comfyWorkflowTxt2Video: e.target.value } })
                    }
                  />
                </label>
                <label className={labelClass}>
                  img2video workflow
                  <input
                    className={cn(fieldClass, "font-mono text-xs")}
                    value={draft.video.comfyWorkflowImg2Video}
                    onChange={(e) =>
                      updateDraft({ video: { ...draft.video, comfyWorkflowImg2Video: e.target.value } })
                    }
                  />
                </label>
                <SecretInput
                  label="API Key"
                  value={videoApiKey}
                  onChange={setVideoApiKey}
                  show={showVideoKey}
                  onToggle={() => setShowVideoKey((v) => !v)}
                  placeholder={draft.video.hasApiKey ? (zh ? "已配置（留空不变）" : "Configured") : "Seedance API Key"}
                />
                <label className="flex items-center gap-2 text-sm text-white/55">
                  <input
                    type="checkbox"
                    checked={draft.enableMockGeneration}
                    onChange={(e) => updateDraft({ enableMockGeneration: e.target.checked })}
                  />
                  {zh ? "无 API Key 时启用 Mock 降级" : "Enable mock fallback without API key"}
                </label>
              </>
            )}

            <div className="flex flex-wrap gap-2 border-t border-white/8 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {zh ? "保存配置" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => handleTest()}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-lg border border-white/12 px-4 py-2 text-sm text-white/75 hover:bg-white/5 disabled:opacity-50"
              >
                {testing ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                {zh ? "测试连接" : "Test"}
              </button>
            </div>
            {feedback && <FeedbackLine feedback={feedback} />}
          </>
        )}
      </div>
    </div>
  );
}

function SecretInput({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  return (
    <label className={labelClass}>
      {label}
      <div className="mt-2 flex gap-2">
        <input
          type={show ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldClass, "font-mono")}
        />
        <button
          type="button"
          onClick={onToggle}
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/45 hover:bg-white/5"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      className={cn(
        "text-sm",
        feedback.kind === "success" || isSuccessMessage(feedback.message) ? "text-emerald-400" : "text-red-400",
      )}
    >
      {feedback.message}
    </p>
  );
}
