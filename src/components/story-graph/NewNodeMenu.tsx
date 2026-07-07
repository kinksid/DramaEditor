"use client";

import { Film, Flag, MousePointerClick, X } from "lucide-react";

type NewNodeMenuProps = {
  x: number;
  y: number;
  onPick: (kind: "scene" | "interaction" | "ending") => void;
  onCancel: () => void;
};

export function NewNodeMenu({ x, y, onPick, onCancel }: NewNodeMenuProps) {
  return (
    <div
      data-ctx-menu
      className="absolute z-50 min-w-[168px] rounded-2xl border border-pink-100 bg-white p-2 shadow-soft"
      style={{ left: x, top: y }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        新建节点
      </div>
      <button
        type="button"
        onClick={() => onPick("scene")}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent-soft"
      >
        <Film size={16} className="text-accent" />
        视频节点
      </button>
      <button
        type="button"
        onClick={() => onPick("interaction")}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent-soft"
      >
        <MousePointerClick size={16} className="text-accent" />
        互动节点
      </button>
      <button
        type="button"
        onClick={() => onPick("ending")}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent-soft"
      >
        <Flag size={16} className="text-branch-ending" />
        结局节点
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-slate-50"
      >
        <X size={16} />
        取消
      </button>
    </div>
  );
}
