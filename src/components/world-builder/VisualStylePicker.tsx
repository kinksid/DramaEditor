"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

const PRESETS = [
  "雨夜赛博朋克黑色电影",
  "大唐盛世古风写实",
  "霓虹东京悬疑",
  "温暖治愈轻奇幻",
  "高对比度恐怖惊悚",
];

type VisualStylePickerProps = {
  className?: string;
  label?: string;
};

export function VisualStylePicker({ className, label = "视觉风格" }: VisualStylePickerProps) {
  const { creationSession, updateCreationSession } = useWorldBuilderStore();
  const [open, setOpen] = useState(false);
  const current = creationSession.visualStylePreset ?? "";

  const selectPreset = (preset: string) => {
    updateCreationSession({ visualStylePreset: preset });
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition"
      >
        <span className="max-w-[120px] truncate">{current || label}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20"
            aria-label="关闭菜单"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-0 z-30 mb-2 min-w-[220px] overflow-hidden rounded-xl border border-white/15 bg-[#1a0f2e]/95 p-1 shadow-xl backdrop-blur">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => selectPreset(preset)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
              >
                <span>{preset}</span>
                {current === preset && <Check size={12} className="text-accent" />}
              </button>
            ))}
            <div className="border-t border-white/10 p-2">
              <input
                value={current}
                onChange={(e) => updateCreationSession({ visualStylePreset: e.target.value })}
                placeholder="自定义视觉风格"
                className="w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/30"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
