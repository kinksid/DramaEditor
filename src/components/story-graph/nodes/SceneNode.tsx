"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Film, Settings2 } from "lucide-react";
import { statusLabels } from "@/lib/worldBuilderLabels";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { SceneNodeData } from "@/types/worldBuilder";

type SceneNodeViewData = SceneNodeData & {
  episodeLabel?: string;
  branchLabel?: string;
};

const statusColors: Record<string, string> = {
  empty: "bg-slate-100 text-slate-500",
  draft: "bg-amber-50 text-amber-700",
  generating: "bg-blue-50 text-blue-700",
  ready: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

export function SceneNode({ data, selected }: NodeProps<SceneNodeViewData>) {
  const updateNode = useWorldBuilderStore((s) => s.updateNode);

  return (
    <div className={`group w-[280px] overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${selected ? "border-accent shadow-glow ring-1 ring-accent/20" : "border-slate-200 hover:border-pink-200 hover:shadow-md"}`}>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-slate-400" />

      <div className="relative aspect-[9/16] bg-[linear-gradient(135deg,#1a0f2e,#3d1b4e_48%,#d9468a)]">
        <div className="absolute inset-0 flex items-center justify-center">
          {data.status === "ready" ? (
            <div className="grid size-14 place-items-center rounded-full bg-black/50 backdrop-blur">
              <Film size={24} className="text-white" />
            </div>
          ) : (
            <Film size={28} className="text-white/70" />
          )}
        </div>
        <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[data.status] ?? statusColors.empty}`}>
          {statusLabels[data.status]}
        </span>
        {/* Settings button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Dispatch custom event for canvas to handle
            window.dispatchEvent(new CustomEvent("scene-node-edit", { detail: { id: data.id } }));
          }}
          className="absolute left-2 top-2 grid size-7 place-items-center rounded-lg bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 transition hover:bg-black/60 hover:text-white"
          title="设置"
        >
          <Settings2 size={13} />
        </button>
      </div>

      <div className="p-3">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            {data.episodeLabel ?? "?"}
          </span>
          <span className="text-[10px] text-slate-400">{data.branchLabel ?? "剧情模块"}</span>
        </div>
        <h3 className="line-clamp-1 text-sm font-semibold text-ink-strong">{data.title}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{data.prompt}</p>
      </div>

      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-accent" />
    </div>
  );
}
