"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { WorldPromptComposer } from "@/components/world-builder/WorldPromptComposer";
import { useCreateWorldFromPrompt } from "@/hooks/useCreateWorldFromPrompt";
import { cn } from "@/lib/utils";
import { MODAL_OVERLAY, MODAL_PANEL } from "@/lib/modalTheme";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type BuildWorldModalProps = {
  open: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
};

type Step = "choose" | "prompt";

export function BuildWorldModal({ open, onClose, onProjectCreated }: BuildWorldModalProps) {
  const router = useRouter();
  const creationSession = useWorldBuilderStore((state) => state.creationSession);
  const createProjectFromSession = useWorldBuilderStore((state) => state.createProjectFromSession);
  const updateCreationSession = useWorldBuilderStore((state) => state.updateCreationSession);

  const [step, setStep] = useState<Step>("choose");
  const [creatingBlank, setCreatingBlank] = useState(false);
  const [prompt, setPrompt] = useState(
    creationSession.prompt || "大唐天宝年间，长安城西市，胡商云集、灯火彻夜不熄的盛世一隅。",
  );

  const { createFromPrompt, creating, error, warning } = useCreateWorldFromPrompt({
    onSuccess: (projectId) => {
      onProjectCreated?.(projectId);
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      setStep("choose");
      setPrompt(creationSession.prompt || "大唐天宝年间，长安城西市，胡商云集、灯火彻夜不熄的盛世一隅。");
    }
  }, [open, creationSession.prompt]);

  useEffect(() => {
    updateCreationSession({ prompt });
  }, [prompt, updateCreationSession]);

  if (!open) return null;

  const handleBlankCanvas = () => {
    if (creatingBlank || creating) return;
    setCreatingBlank(true);
    const projectId = createProjectFromSession();
    onProjectCreated?.(projectId);
    onClose();
    router.push(`/world-builder/story-graph?project=${projectId}`);
  };

  const handleStartBlankWorld = () => {
    if (creatingBlank || creating) return;
    setCreatingBlank(true);
    updateCreationSession({ prompt });
    const projectId = createProjectFromSession();
    onProjectCreated?.(projectId);
    onClose();
    router.push(`/world-builder/setup?project=${projectId}`);
  };

  const handleCreate = () => {
    void createFromPrompt(prompt);
  };

  return (
    <div className={MODAL_OVERLAY}>
      <div className={cn(MODAL_PANEL, "w-full max-w-3xl overflow-hidden rounded-2xl")}>
        <div className="flex items-start justify-between gap-4 border-b border-card-border px-6 py-5">
          <div className={cn("min-w-0 flex-1", step === "prompt" && "text-center")}>
            {step === "prompt" && (
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="mb-2 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-accent"
              >
                <ArrowLeft size={14} /> 返回
              </button>
            )}
            <h2 className="font-display text-3xl tracking-tight text-ink-strong">
              {step === "choose" ? "创建世界" : "一句话建世界"}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {step === "choose"
                ? "用一句话描述创意，或从空白故事图开始编排。"
                : "描述你想要的，或者从空白画布开始。"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-accent-soft hover:text-accent"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {step === "choose" ? (
          <div className="grid gap-3 p-6 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStep("prompt")}
              className="rounded-xl border border-card-border bg-stage px-5 py-6 text-left transition hover:border-accent/40 hover:bg-accent-soft/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">提示词</p>
              <h3 className="mt-2 text-lg font-semibold text-ink-strong">一句话建世界</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">从灵感提示词拆解世界观、角色与地点。</p>
            </button>
            <button
              type="button"
              onClick={handleBlankCanvas}
              disabled={creatingBlank}
              className="rounded-xl border border-card-border bg-stage px-5 py-6 text-left transition hover:border-accent/40 hover:bg-accent-soft/40 disabled:opacity-60"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">空白</p>
              <h3 className="mt-2 flex items-center gap-2 text-lg font-semibold text-ink-strong">
                空白画布
                {creatingBlank && <Loader2 size={16} className="animate-spin text-accent" />}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">直接进入故事图，从零编排分支剧情。</p>
            </button>
          </div>
        ) : (
          <div className="px-6 pb-8 pt-2">
            <div className="mx-auto max-w-2xl text-center">
              <WorldPromptComposer
                variant="modal"
                prompt={prompt}
                onPromptChange={setPrompt}
                onCreate={handleCreate}
                onBlank={handleStartBlankWorld}
                creating={creating || creatingBlank}
                error={error}
                warning={warning}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
