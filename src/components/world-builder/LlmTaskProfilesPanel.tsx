"use client";

import { useState } from "react";
import { ChevronDown, Loader2, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LlmTaskId, LlmTaskProfile } from "@/lib/providers/types";
import { useProviderSettingsStore } from "@/stores/providerSettingsStore";

const EDITABLE_TASK_IDS: LlmTaskId[] = [
  "decompose",
  "suggest_chain",
  "reference_analyze",
  "txt2img_prompt",
];

type ActionFeedback = { message: string; kind: "success" | "error" };

type Props = {
  profiles: LlmTaskProfile[];
  onFeedback: (feedback: ActionFeedback) => void;
};

export function LlmTaskProfilesPanel({ profiles, onFeedback }: Props) {
  const {
    llmTaskProfiles,
    setLlmTaskProfile,
    testProvider,
    restoreDefaultTask,
    saveToServer,
  } = useProviderSettingsStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ decompose: true });
  const [testingTask, setTestingTask] = useState<LlmTaskId | null>(null);
  const [restoringTask, setRestoringTask] = useState<LlmTaskId | null>(null);

  const getProfile = (id: LlmTaskId): LlmTaskProfile => {
    return llmTaskProfiles[id] ?? profiles.find((item) => item.id === id)!;
  };

  const updateProfile = (id: LlmTaskId, patch: Partial<LlmTaskProfile>) => {
    const current = getProfile(id);
    setLlmTaskProfile(id, {
      ...current,
      ...patch,
      options: { ...current.options, ...patch.options },
    });
  };

  const handleTestTask = async (taskId: LlmTaskId) => {
    setTestingTask(taskId);
    try {
      await saveToServer({ llmTaskProfiles });
      const result = await testProvider("llm", { llmTaskId: taskId });
      const parts = [result.message];
      if (result.content) parts.push(`输出: ${result.content.slice(0, 200)}`);
      if (result.thinking) parts.push(`思考: ${result.thinking.slice(0, 120)}`);
      onFeedback({ message: parts.join(" · "), kind: "success" });
    } catch (error) {
      onFeedback({
        message: error instanceof Error ? error.message : "任务测试失败",
        kind: "error",
      });
    } finally {
      setTestingTask(null);
    }
  };

  const handleRestore = async (taskId: LlmTaskId) => {
    setRestoringTask(taskId);
    try {
      await restoreDefaultTask(taskId);
      onFeedback({ message: `已恢复 ${getProfile(taskId).label} 默认配置`, kind: "success" });
    } catch (error) {
      onFeedback({
        message: error instanceof Error ? error.message : "恢复默认失败",
        kind: "error",
      });
    } finally {
      setRestoringTask(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">LLM 任务提示词</h3>
        <p className="mt-1 text-xs text-slate-500">
          按 LAN-API 规范配置各任务的 system 与提示词定义。占位符：<code className="rounded bg-slate-100 px-1">#</code> = 主输入，<code className="rounded bg-slate-100 px-1">@</code> = 次要输入。
        </p>
      </div>

      {EDITABLE_TASK_IDS.map((taskId) => {
        const profile = getProfile(taskId);
        if (!profile) return null;
        const isOpen = expanded[taskId] ?? false;

        return (
          <div key={taskId} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded((state) => ({ ...state, [taskId]: !isOpen }))}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">{profile.label}</p>
                <p className="text-xs text-slate-500">{profile.description}</p>
              </div>
              <ChevronDown size={16} className={cn("text-slate-400 transition", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-slate-100 px-4 py-4">
                <label>
                  <span className="text-xs font-medium text-slate-600">System 提示词</span>
                  <textarea
                    value={profile.systemPrompt}
                    onChange={(e) => updateProfile(taskId, { systemPrompt: e.target.value })}
                    className="mt-1.5 min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs leading-5"
                  />
                </label>

                <label>
                  <span className="text-xs font-medium text-slate-600">提示词定义（user 模板）</span>
                  <textarea
                    value={profile.userPromptTemplate}
                    onChange={(e) => updateProfile(taskId, { userPromptTemplate: e.target.value })}
                    className="mt-1.5 min-h-16 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs leading-5"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-3">
                  <label>
                    <span className="text-xs font-medium text-slate-600">展开模式</span>
                    <select
                      value={profile.presetMode}
                      onChange={(e) =>
                        updateProfile(taskId, { presetMode: e.target.value as LlmTaskProfile["presetMode"] })
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <option value="direct">direct（直接用主输入）</option>
                      <option value="template">template（# / @ 替换）</option>
                    </select>
                  </label>
                  <label>
                    <span className="text-xs font-medium text-slate-600">输出格式</span>
                    <select
                      value={profile.responseFormat}
                      onChange={(e) =>
                        updateProfile(taskId, {
                          responseFormat: e.target.value as LlmTaskProfile["responseFormat"],
                        })
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <option value="json">json</option>
                      <option value="text">text</option>
                    </select>
                  </label>
                  <label className="flex items-end gap-2 pb-1 text-xs">
                    <input
                      type="checkbox"
                      checked={profile.think}
                      onChange={(e) => updateProfile(taskId, { think: e.target.checked })}
                    />
                    Thinking 模式
                  </label>
                </div>

                {taskId === "txt2img_prompt" && (
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={profile.enabled === true}
                      onChange={(e) => updateProfile(taskId, { enabled: e.target.checked })}
                    />
                    生成图像前启用 LLM 扩写提示词
                  </label>
                )}

                <details className="rounded-xl border border-dashed border-slate-200 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate-600">高级参数 (options)</summary>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {(["temperature", "top_k", "top_p", "min_p", "num_predict", "seed"] as const).map((key) => (
                      <label key={key}>
                        <span className="text-[10px] text-slate-500">{key}</span>
                        <input
                          type="number"
                          step={key === "temperature" || key === "top_p" || key === "min_p" ? 0.01 : 1}
                          value={profile.options[key] ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateProfile(taskId, {
                              options: {
                                ...profile.options,
                                [key]: value === "" ? undefined : Number(value),
                              },
                            });
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                        />
                      </label>
                    ))}
                  </div>
                </details>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleTestTask(taskId)}
                    disabled={testingTask === taskId}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60"
                  >
                    {testingTask === taskId ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Zap size={12} />
                    )}
                    测试此任务
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRestore(taskId)}
                    disabled={restoringTask === taskId}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {restoringTask === taskId ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RotateCcw size={12} />
                    )}
                    恢复默认
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
