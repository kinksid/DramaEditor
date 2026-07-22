"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { addTeam } from "@/lib/authSession";
import { MODAL_OVERLAY_80, MODAL_PANEL } from "@/lib/modalTheme";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export function CreateTeamModal({ open, onClose, onCreated }: Props) {
  const language = useSettingsStore((s) => s.language);
  const zh = language === "zh";
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 50) {
      setError(zh ? "团队名称长度需在 1-50 个字符之间" : "Team name must be 1-50 characters");
      return;
    }
    addTeam(trimmed);
    setName("");
    setError("");
    onCreated?.();
    onClose();
  };

  return (
    <div className={MODAL_OVERLAY_80}>
      <div className={cn(MODAL_PANEL, "relative w-full max-w-md rounded-2xl p-6 text-ink")}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-ink-muted hover:bg-accent-soft/50 hover:text-ink-strong"
        >
          <X size={16} />
        </button>
        <h2 className="text-lg font-semibold">{zh ? "创建团队" : "Create Team"}</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {zh ? "新团队将拥有独立的工作空间" : "The new team will have its own workspace"}
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm text-ink-muted">{zh ? "团队名称" : "Team Name"}</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value.slice(0, 50));
                setError("");
              }}
              placeholder={zh ? "请输入团队名称" : "Enter team name"}
              className="mt-1.5 w-full rounded-full border border-card-border bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-ink-muted focus:border-white/30"
              autoFocus
            />
          </label>
          {error && <p className="text-xs text-[#F87171]">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm text-ink-muted hover:text-white"
            >
              {zh ? "取消" : "Cancel"}
            </button>
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
            >
              {zh ? "创建" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
