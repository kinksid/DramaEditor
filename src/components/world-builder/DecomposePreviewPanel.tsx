"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { decomposeStory, filterDecomposePreview } from "@/lib/worldBuilderApi";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import { useProviderSettingsStore } from "@/stores/providerSettingsStore";
import type { DecomposePreviewMode, DecomposeResult } from "@/types/worldBuilder";

const MODE_OPTIONS: { id: DecomposePreviewMode; label: string }[] = [
  { id: "all", label: "全部预览" },
  { id: "worldview", label: "预览世界观" },
  { id: "characters", label: "预览角色场景" },
  { id: "script", label: "预览剧本" },
];

type DecomposePreviewPanelProps = {
  prompt: string;
  label?: string;
};

export function DecomposePreviewPanel({ prompt, label = "自动拆解" }: DecomposePreviewPanelProps) {
  const { creationSession, setDecomposePreview } = useWorldBuilderStore();
  const selectedLlmPresetId = useProviderSettingsStore((state) => state.selectedLlmPresetId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<DecomposePreviewMode>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [preview, setPreview] = useState<DecomposeResult | null>(null);

  const runDecompose = async (nextMode: DecomposePreviewMode) => {
    setMode(nextMode);
    setMenuOpen(false);
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const { result, warning: apiWarning } = await decomposeStory({
        prompt,
        visualStyle: creationSession.visualStylePreset,
        references: creationSession.references,
        llmPresetId: selectedLlmPresetId || undefined,
      });
      setPreview(result);
      setWarning(apiWarning ?? null);
      setPanelOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "拆解失败");
    } finally {
      setLoading(false);
    }
  };

  const applyPreview = () => {
    if (!preview) return;
    setDecomposePreview(preview);
    setPanelOpen(false);
  };

  const filtered = preview ? filterDecomposePreview(preview, mode) : null;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {label}
          <ChevronDown size={14} />
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20"
              aria-label="关闭菜单"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute bottom-full left-0 z-30 mb-2 min-w-[160px] overflow-hidden rounded-xl border border-white/15 bg-[#1a0f2e]/95 p-1 shadow-xl backdrop-blur">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => void runDecompose(option.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {error && <p className="mt-1 text-[10px] text-red-300">{error}</p>}

      {panelOpen && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">自动拆解预览</p>
                <h3 className="mt-1 text-lg font-semibold text-ink-strong">
                  {MODE_OPTIONS.find((item) => item.id === mode)?.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[58vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
              {warning && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{warning}</p>
              )}

              {filtered?.worldview && (
                <section>
                  <h4 className="font-semibold text-ink-strong">世界观</h4>
                  <div className="mt-2 space-y-1 rounded-2xl bg-slate-50 p-3 text-slate-600">
                    <p><span className="text-slate-400">标题：</span>{filtered.worldview.worldTitle}</p>
                    <p><span className="text-slate-400">类型：</span>{filtered.worldview.genre}</p>
                    <p><span className="text-slate-400">标签：</span>{filtered.worldview.tags}</p>
                    <p><span className="text-slate-400">基调：</span>{filtered.worldview.tone}</p>
                    <p><span className="text-slate-400">视觉：</span>{filtered.worldview.visualStyle}</p>
                    <p className="whitespace-pre-wrap">{filtered.worldview.worldDescription}</p>
                  </div>
                </section>
              )}

              {(filtered?.characters || filtered?.locations) && (
                <section>
                  <h4 className="font-semibold text-ink-strong">角色与场景</h4>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-400">角色</p>
                      <ul className="mt-2 space-y-2">
                        {(filtered.characters ?? []).map((item) => (
                          <li key={`${item.name}-${item.role}`}>
                            <p className="font-medium">{item.name} · {item.role}</p>
                            <p className="text-xs text-slate-500">{item.description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-400">地点</p>
                      <ul className="mt-2 space-y-2">
                        {(filtered.locations ?? []).map((item) => (
                          <li key={`${item.name}-${item.type}`}>
                            <p className="font-medium">{item.name} · {item.type}</p>
                            <p className="text-xs text-slate-500">{item.description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              {filtered?.script && (
                <section>
                  <h4 className="font-semibold text-ink-strong">拆分剧本</h4>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-2xl bg-slate-50 p-3 text-xs leading-6 text-slate-600 whitespace-pre-wrap">
                    {filtered.script}
                  </pre>
                </section>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={applyPreview}
                className={cn(
                  "rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep",
                )}
              >
                应用到草稿
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
