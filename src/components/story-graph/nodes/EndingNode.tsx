"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { CheckCircle2, Flag, HeartCrack, ShieldAlert, Star } from "lucide-react";
import type { EndingNodeData } from "@/types/worldBuilder";

type EndingNodeViewData = EndingNodeData & {
  episodeLabel?: string;
  branchLabel?: string;
};

const endingStyle: Record<string, { icon: typeof Flag; label: string; gradient: string; dot: string }> = {
  good: { icon: Star, label: "好结局", gradient: "from-emerald-50 to-white", dot: "bg-emerald-500" },
  bad: { icon: HeartCrack, label: "坏结局", gradient: "from-red-50 to-white", dot: "bg-red-500" },
  normal: { icon: CheckCircle2, label: "普通结局", gradient: "from-slate-50 to-white", dot: "bg-slate-500" },
  secret: { icon: ShieldAlert, label: "隐藏结局", gradient: "from-violet-50 to-white", dot: "bg-violet-500" },
};

export function EndingNode({ data, selected }: NodeProps<EndingNodeViewData>) {
  const style = endingStyle[data.endingType] ?? endingStyle.normal;
  const { icon: Icon, label, gradient, dot } = style;

  return (
    <div className={`group w-[260px] overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${selected ? "border-accent shadow-glow ring-1 ring-accent/20" : "border-slate-200 hover:border-pink-200 hover:shadow-md"}`}>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-branch-ending" />

      <div className={`bg-gradient-to-br ${gradient} p-3`}>
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-white shadow-sm">
            <Icon size={16} className="text-ink-muted" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              <span className="text-[10px] font-semibold text-slate-500">{label}</span>
            </div>
            <h3 className="line-clamp-1 text-sm font-semibold text-ink-strong">{data.title}</h3>
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            {data.episodeLabel ?? "?"}
          </span>
          <span className="text-[10px] text-slate-400">{data.branchLabel ?? "剧情模块"}</span>
        </div>
        <p className="line-clamp-3 text-[11px] leading-5 text-slate-500">{data.description}</p>
      </div>
    </div>
  );
}
