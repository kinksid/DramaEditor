"use client";

import { Copy, Flag, GitBranch, PenLine, Trash2, Video } from "lucide-react";

export type NodeAction =
  | "edit"
  | "duplicate"
  | "delete"
  | "add-scene"
  | "add-interaction"
  | "add-ending";

type NodeActionMenuProps = {
  x: number;
  y: number;
  onPick: (action: NodeAction) => void;
  onCancel?: () => void;
};

const items: Array<{ id: NodeAction; label: string; icon: typeof PenLine; danger?: boolean }> = [
  { id: "edit", label: "编辑", icon: PenLine },
  { id: "duplicate", label: "复制", icon: Copy },
  { id: "add-scene", label: "添加下游视频", icon: Video },
  { id: "add-interaction", label: "添加下游交互", icon: GitBranch },
  { id: "add-ending", label: "添加下游结局", icon: Flag },
  { id: "delete", label: "删除", icon: Trash2, danger: true },
];

/** 节点右键操作菜单（对照 Infinite-Canvas 节点菜单，与空白创建菜单分离） */
export function NodeActionMenu({ x, y, onPick, onCancel }: NodeActionMenuProps) {
  return (
    <div
      data-ctx-menu
      className="fixed z-[200] min-w-[188px] rounded-xl border border-white/10 bg-[#141414]/98 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm"
      style={{ left: x, top: y }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="px-3 py-1.5 text-[11px] text-white/40">节点</div>
      <div className="my-1 border-t border-white/[0.06]" />
      <div className="px-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-white/[0.06] ${
                item.danger ? "text-red-300" : "text-white"
              }`}
            >
              <Icon size={15} className="shrink-0 opacity-85" />
              {item.label}
            </button>
          );
        })}
      </div>
      {onCancel && (
        <button type="button" className="sr-only" onClick={onCancel} aria-label="关闭菜单" />
      )}
    </div>
  );
}
