"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Flag } from "lucide-react";
import type { EndingNodeData } from "@/types/worldBuilder";

type EndingNodeViewData = EndingNodeData & {
  episodeLabel?: string;
  branchLabel?: string;
};

export function EndingNode({ data, selected }: NodeProps<EndingNodeViewData>) {
  return (
    <div className={`w-72 rounded-2xl border bg-white p-4 shadow-soft ${selected ? "border-branch-ending" : "border-[#d9e1ec]"}`}>
      <Handle type="target" position={Position.Left} className="!bg-branch-ending" />
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-red-50 text-branch-ending">
          <Flag size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-branch-ending">
            第 {data.episodeLabel ?? "?"} 集 · {data.branchLabel ?? "剧情模块"} · {endingTypeLabel(data.endingType)}
          </p>
          <h3 className="text-sm font-semibold">{data.title}</h3>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">{data.description}</p>
    </div>
  );
}

function endingTypeLabel(type: EndingNodeData["endingType"]) {
  if (type === "good") return "好结局";
  if (type === "bad") return "坏结局";
  if (type === "secret") return "隐藏结局";
  return "普通结局";
}
