"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { MousePointerClick, PenLine, Plus } from "lucide-react";
import { actionTypeLabels } from "@/lib/worldBuilderLabels";
import type { InteractionNodeData } from "@/types/worldBuilder";

type InteractionNodeViewData = InteractionNodeData & {
  targetTitles?: Record<string, string>;
  episodeLabel?: string;
  branchLabel?: string;
};

export function InteractionNode({ data, selected }: NodeProps<InteractionNodeViewData>) {
  return (
    <div className={`w-80 rounded-2xl border bg-white shadow-soft ${selected ? "border-accent shadow-glow" : "border-[#d9e1ec]"}`}>
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
            <MousePointerClick size={13} className="text-accent" />
            第 {data.episodeLabel ?? "?"} 集 · {data.branchLabel ?? "剧情模块"} · 互动节点
          </p>
          <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-slate-800">{data.title}</h3>
        </div>
        <PenLine size={15} className="text-slate-400" />
      </div>
      <div className="p-4">
        <div className="grid aspect-video place-items-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400">
          <span className="inline-flex items-center gap-1 text-xs">
            <PenLine size={13} /> 设置互动
          </span>
        </div>
        <p className="mt-3 line-clamp-4 text-xs leading-5 text-slate-600">{data.instruction}</p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-500">选项</p>
          <p className="text-[11px] text-slate-400">
            {data.options.length}/{Math.max(data.options.length, 1)}
          </p>
        </div>
        <div className="mt-2 space-y-2">
          {data.options.map((option) => (
            <div key={option.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-2 font-medium text-ink">
                  <span className="grid size-5 shrink-0 place-items-center rounded-md bg-blue-50 text-[10px] text-branch-tap">
                    {option.actionType === "tap" ? "点" : option.actionType === "swipe" ? "滑" : option.actionType === "hold" ? "按" : option.actionType === "rapidTap" ? "连" : "选"}
                  </span>
                  <span className="truncate">{option.label}</span>
                </span>
                <span className="shrink-0 text-slate-400">{actionTypeLabels[option.actionType]}</span>
              </div>
              <p className="mt-1 truncate pl-7 text-[11px] text-slate-400">
                → {option.targetNodeId ? data.targetTitles?.[option.targetNodeId] ?? option.targetNodeId : "未连接"}
              </p>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500">
              <Plus size={13} /> 添加选项
            </div>
            <div className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500">
              <PenLine size={12} /> 编辑
            </div>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
    </div>
  );
}
