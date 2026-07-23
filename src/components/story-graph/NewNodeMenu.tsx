"use client";

import { Flag, GitBranch, LayoutGrid, Star, Video } from "lucide-react";

export type NewNodeKind = "episode" | "highlight" | "scene" | "interaction" | "ending";

/** canvas=剧集框外；frame=剧集框内 */
export type NewNodeMenuVariant = "canvas" | "frame";

type MenuItem = {
  id: NewNodeKind;
  label: string;
  icon: typeof LayoutGrid;
};

type NewNodeMenuProps = {
  x: number;
  y: number;
  variant?: NewNodeMenuVariant;
  onPick: (kind: NewNodeKind) => void;
  onCancel?: () => void;
};

export function NewNodeMenu({ x, y, variant = "canvas", onPick, onCancel }: NewNodeMenuProps) {
  // 框外：Episode / Highlight；框内：Video / Interaction / Ending
  const items: MenuItem[] =
    variant === "frame"
      ? [
          { id: "scene", label: "视频", icon: Video },
          { id: "interaction", label: "交互", icon: GitBranch },
          { id: "ending", label: "结局", icon: Flag },
        ]
      : [
          { id: "episode", label: "剧集", icon: LayoutGrid },
          { id: "highlight", label: "高光", icon: Star },
        ];

  return (
    <div
      data-ctx-menu
      className="fixed z-[200] min-w-[168px] rounded-xl border border-white/10 bg-[#141414]/98 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm"
      style={{ left: x, top: y }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="px-3 py-1.5 text-[11px] text-white/40">添加节点</div>
      <div className="my-1 border-t border-white/[0.06]" />
      <div className="px-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-white transition hover:bg-white/[0.06]"
            >
              <Icon size={15} className="shrink-0 text-white/85" />
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
