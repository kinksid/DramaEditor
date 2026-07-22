"use client";

import { GitBranch, LayoutGrid, Star, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export type NewNodeKind = "episode" | "highlight" | "scene" | "interaction" | "ending";

export type NewNodeMenuVariant = "canvas" | "frame" | "connect";

type MenuItem = {
  id: NewNodeKind;
  label: string;
  icon: typeof LayoutGrid;
  enabled: boolean;
};

type NewNodeMenuProps = {
  x: number;
  y: number;
  variant?: NewNodeMenuVariant;
  onPick: (kind: NewNodeKind) => void;
  onCancel?: () => void;
};

export function NewNodeMenu({ x, y, variant = "canvas", onPick, onCancel }: NewNodeMenuProps) {
  const primary: MenuItem[] = [
    {
      id: "episode",
      label: "Episode",
      icon: LayoutGrid,
      enabled: variant === "canvas",
    },
    {
      id: "highlight",
      label: "Highlight",
      icon: Star,
      enabled: variant === "canvas" || variant === "frame",
    },
  ];

  const secondary: MenuItem[] = [
    {
      id: "scene",
      label: "Video",
      icon: Video,
      enabled: variant === "frame" || variant === "connect",
    },
    {
      id: "interaction",
      label: "Interaction",
      icon: GitBranch,
      enabled: variant === "frame" || variant === "connect",
    },
  ];

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        disabled={!item.enabled}
        onClick={() => item.enabled && onPick(item.id)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition",
          item.enabled
            ? "text-white hover:bg-white/[0.06]"
            : "cursor-default text-white/30",
        )}
      >
        <Icon size={15} className={cn("shrink-0", item.enabled ? "text-white/85" : "text-white/25")} />
        {item.label}
      </button>
    );
  };

  return (
    <div
      data-ctx-menu
      className="absolute z-50 min-w-[168px] rounded-xl border border-white/10 bg-[#141414]/98 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm"
      style={{ left: x, top: y }}
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="px-3 py-1.5 text-[11px] text-white/40">Add node</div>
      <div className="my-1 border-t border-white/[0.06]" />
      <div className="px-1">{primary.map(renderItem)}</div>
      <div className="my-1 border-t border-white/[0.06]" />
      <div className="px-1">{secondary.map(renderItem)}</div>
      {onCancel && (
        <button type="button" className="sr-only" onClick={onCancel} aria-label="Close menu" />
      )}
    </div>
  );
}
