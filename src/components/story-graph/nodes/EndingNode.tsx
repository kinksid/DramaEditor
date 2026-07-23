"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { CheckCircle2, Flag, HeartCrack, ShieldAlert, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EndingNodeData } from "@/types/worldBuilder";

type EndingNodeViewData = EndingNodeData & {
  episodeLabel?: string;
  branchLabel?: string;
};

const endingStyle: Record<
  string,
  { icon: typeof Flag; label: string; accent: string; dot: string }
> = {
  good: {
    icon: Star,
    label: "好结局",
    accent: "text-emerald-300/90",
    dot: "bg-emerald-400/80",
  },
  bad: {
    icon: HeartCrack,
    label: "坏结局",
    accent: "text-red-300/90",
    dot: "bg-red-400/80",
  },
  normal: {
    icon: CheckCircle2,
    label: "普通结局",
    accent: "text-white/70",
    dot: "bg-white/45",
  },
  secret: {
    icon: ShieldAlert,
    label: "隐藏结局",
    accent: "text-violet-300/90",
    dot: "bg-violet-400/80",
  },
};

export function EndingNode({ data, selected }: NodeProps<EndingNodeViewData>) {
  const style = endingStyle[data.endingType] ?? endingStyle.normal;
  const { icon: Icon, label, accent, dot } = style;

  const openEdit = () => {
    window.dispatchEvent(new CustomEvent("scene-node-edit", { detail: { id: data.id } }));
  };

  return (
    <div
      className={cn(
        "group w-[260px] overflow-hidden rounded-2xl border bg-[#0c0c0e] text-white shadow-sm",
        "transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        selected
          ? "border-white/14 shadow-[0_12px_32px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06]"
          : "border-white/[0.06] hover:border-white/12",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-[#0c0c0e] !bg-white/45"
      />

      <div
        role="button"
        tabIndex={0}
        title="点击进入"
        className="cursor-pointer border-b border-white/[0.04] px-3 py-3"
        onClick={(e) => {
          e.stopPropagation();
          openEdit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            openEdit();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.04]">
            <Icon size={16} className={accent} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              <span className="text-[10px] font-semibold text-white/45">{label}</span>
            </div>
            <h3 className="line-clamp-1 text-sm font-semibold text-white">{data.title}</h3>
          </div>
        </div>
      </div>

      <div className="px-3 py-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
            {data.episodeLabel ?? "?"}
          </span>
          <span className="text-[10px] text-white/40">{data.branchLabel ?? "剧情模块"}</span>
        </div>
        <p className="line-clamp-3 text-[11px] leading-5 text-white/45">{data.description}</p>
      </div>
    </div>
  );
}
