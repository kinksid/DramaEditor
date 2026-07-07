"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { MousePointerClick } from "lucide-react";
import { actionTypeLabels } from "@/lib/worldBuilderLabels";
import type { InteractionNodeData } from "@/types/worldBuilder";

type InteractionNodeViewData = InteractionNodeData & {
  targetTitles?: Record<string, string>;
  episodeLabel?: string;
  branchLabel?: string;
};

const actionDotColors: Record<string, string> = {
  tap: "bg-blue-500",
  swipe: "bg-emerald-500",
  hold: "bg-pink-500",
  rapidTap: "bg-purple-500",
  choice: "bg-violet-500",
};

export function InteractionNode({ data, selected }: NodeProps<InteractionNodeViewData>) {
  return (
    <div className={`group w-[280px] overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${selected ? "border-accent shadow-glow ring-1 ring-accent/20" : "border-slate-200 hover:border-pink-200 hover:shadow-md"}`}>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-slate-400" />

      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-accent-soft/50 to-white px-3 py-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            {data.episodeLabel ?? "?"}
          </span>
          <span className="text-[10px] text-slate-400">{data.branchLabel ?? "剧情模块"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MousePointerClick size={14} className="text-accent shrink-0" />
          <h3 className="line-clamp-1 text-sm font-semibold text-ink-strong">{data.title}</h3>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{data.instruction}</p>
      </div>

      {/* Options list */}
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">选项 {data.options.length}</span>
        </div>
        <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
          {data.options.map((option) => (
            <div key={option.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-[11px] transition hover:bg-slate-50">
              <span className={`h-2 w-2 shrink-0 rounded-full ${actionDotColors[option.actionType] ?? "bg-slate-400"}`} />
              <span className="truncate font-medium text-ink">{option.label}</span>
              <span className="shrink-0 text-[10px] text-slate-400">{actionTypeLabels[option.actionType]}</span>
              {option.targetNodeId ? (
                <span className="shrink-0 text-[10px] text-slate-300">→ {data.targetTitles?.[option.targetNodeId] ?? "?"}</span>
              ) : (
                <span className="shrink-0 text-[10px] text-red-400">未连接</span>
              )}
            </div>
          ))}
          {data.options.length === 0 && (
            <div className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 py-3 text-[10px] text-slate-400">
              <MousePointerClick size={11} /> 待添加选项
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-accent" />
    </div>
  );
}
