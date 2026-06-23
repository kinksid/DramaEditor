"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Film, PenLine } from "lucide-react";
import { statusLabels } from "@/lib/worldBuilderLabels";
import type { SceneNodeData } from "@/types/worldBuilder";

type SceneNodeViewData = SceneNodeData & {
  episodeLabel?: string;
  branchLabel?: string;
};

export function SceneNode({ data, selected }: NodeProps<SceneNodeViewData>) {
  return (
    <div className={`w-80 rounded-2xl border bg-white shadow-soft ${selected ? "border-accent" : "border-[#d9e1ec]"}`}>
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-slate-400">
            第 {data.episodeLabel ?? "?"} 集 · {data.branchLabel ?? "剧情模块"} · 视频节点
          </p>
          <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-slate-800">{data.title}</h3>
        </div>
        <PenLine size={15} className="text-slate-400" />
      </div>
      <div className="p-4">
        <div className="grid aspect-video place-items-center rounded-2xl bg-[linear-gradient(135deg,#090d16,#283244_48%,#f27d3d)] text-white">
          {data.status === "ready" ? (
            <div className="grid size-12 place-items-center rounded-full bg-black/70">
              <Film size={22} />
            </div>
          ) : (
            <Film size={28} className="opacity-80" />
          )}
        </div>
        <p className="mt-3 line-clamp-4 text-xs leading-5 text-slate-600">{data.prompt}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
            {statusLabels[data.status]}
          </span>
          <span className="text-xs text-slate-400">编辑</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
    </div>
  );
}
