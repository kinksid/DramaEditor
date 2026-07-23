"use client";

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { DecomposePreviewPanel } from "@/components/world-builder/DecomposePreviewPanel";
import { ReferenceChips, ReferenceUploadMenu } from "@/components/world-builder/ReferenceUploadMenu";
import { VisualStylePicker } from "@/components/world-builder/VisualStylePicker";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type Props = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onCreate: () => void;
  onBlank?: () => void;
  creating?: boolean;
  error?: string | null;
  warning?: string | null;
  showBlankLink?: boolean;
  variant?: "hero" | "modal";
  className?: string;
};

export function WorldPromptComposer({
  prompt,
  onPromptChange,
  onCreate,
  onBlank,
  creating = false,
  error,
  warning,
  showBlankLink = true,
  variant = "hero",
  className,
}: Props) {
  const { t } = useI18n();
  const { creationSession, removeReference } = useWorldBuilderStore();
  const isModal = variant === "modal";

  return (
    <div className={cn("w-full", isModal && "text-center", className)}>
      <div
        className={cn(
          "rounded-2xl border p-3",
          isModal
            ? "border-card-border bg-stage text-left"
            : "border-white/15 bg-white/10 backdrop-blur",
        )}
      >
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={
            isModal
              ? "例如：女孩继承了祖母的图书馆，其中一本书是活的……"
              : t("home.promptPlaceholder")
          }
          className={cn(
            "min-h-28 w-full resize-none rounded-xl border-0 bg-transparent px-3 py-3 text-sm leading-6 outline-none",
            isModal
              ? "text-ink placeholder:text-ink-muted/60"
              : "text-white placeholder:text-white/40",
          )}
        />
        <ReferenceChips references={creationSession.references} onRemove={removeReference} />
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 border-t pt-3",
            isModal ? "border-card-border" : "border-white/10",
          )}
        >
          <div className="flex flex-wrap gap-2">
            <ReferenceUploadMenu label={t("home.addRef")} />
            <DecomposePreviewPanel prompt={prompt} label={t("home.autoSplit")} />
            <VisualStylePicker label={t("home.visualStyle")} />
          </div>
          <button
            type="button"
            onClick={onCreate}
            disabled={creating || !prompt.trim()}
            className="btn-cta btn-press inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold disabled:opacity-40"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {t("home.createBtn")}
          </button>
        </div>
        {error && <p className="mt-2 text-left text-xs text-red-500">{error}</p>}
        {warning && <p className="mt-2 text-left text-xs text-amber-600">{warning}</p>}
        {creationSession.lastDecompose && (
          <p className={cn("mt-2 text-left text-xs", isModal ? "text-ink-muted" : "text-white/50")}>
            已应用拆解草稿：{creationSession.lastDecompose.worldview.worldTitle}
          </p>
        )}
      </div>
      {showBlankLink && onBlank && (
        <button
          type="button"
          onClick={onBlank}
          disabled={creating}
          className={cn(
            "mt-5 inline-flex items-center gap-2 text-sm transition disabled:opacity-50",
            isModal ? "text-ink-muted hover:text-accent" : "text-white/40 hover:text-accent",
          )}
        >
          {t("home.orStartBlank")} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
