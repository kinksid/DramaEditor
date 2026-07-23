"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Play } from "lucide-react";

/** 故事入口：固定锚点，不可拖拽 / 不可删除 */
export function StartNode(_props: NodeProps) {
  return (
    <div className="group relative flex w-[160px] cursor-default flex-col gap-1.5 rounded-xl border border-accent/35 bg-[#1a1a1a] px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-accent/15 text-accent">
          <Play size={12} className="fill-current" />
        </span>
        <span className="text-sm font-medium text-white">开始</span>
      </div>
      <p className="text-[11px] leading-relaxed text-white/45">故事入口，连接到第一集视频。</p>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3.5 !w-3.5 !border-2 !border-white !bg-accent !cursor-crosshair"
      />
    </div>
  );
}
