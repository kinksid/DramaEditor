"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Film, Settings2 } from "lucide-react";
import { statusLabels } from "@/lib/worldBuilderLabels";
import { cn } from "@/lib/utils";
import type { SceneNodeData } from "@/types/worldBuilder";

type SceneNodeViewData = SceneNodeData & {
  episodeLabel?: string;
  branchLabel?: string;
};

const statusColors: Record<string, string> = {
  empty: "border-white/[0.08] bg-black/55 text-white/65",
  draft: "border-white/[0.08] bg-black/55 text-amber-200/90",
  generating: "border-white/[0.08] bg-black/55 text-sky-200/90",
  ready: "border-white/[0.08] bg-black/55 text-emerald-200/90",
  failed: "border-white/[0.08] bg-black/55 text-red-200/90",
};

export function SceneNode({ data, selected }: NodeProps<SceneNodeViewData>) {
  const previewUrl = data.firstFrameRef || data.videoUrl;
  const hasImagePreview =
    Boolean(previewUrl) &&
    !previewUrl!.startsWith("mock://") &&
    (previewUrl!.startsWith("data:image") ||
      /\.(png|jpe?g|webp|gif)(\?|$)/i.test(previewUrl!) ||
      previewUrl!.startsWith("blob:"));

  return (
    <div
      className={cn(
        "group w-[280px] overflow-hidden rounded-2xl border bg-[#0c0c0e] text-white shadow-sm",
        "transition-[border-color,box-shadow] duration-popover ease-de-out",
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
        className="relative aspect-[9/16] cursor-pointer overflow-hidden bg-[#121214]"
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("scene-node-edit", { detail: { id: data.id } }));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("scene-node-edit", { detail: { id: data.id } }));
          }
        }}
      >
        {hasImagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="pointer-events-none absolute inset-0 size-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className="de-canvas-surface absolute inset-0 rounded-none border-0 shadow-none"
            aria-hidden
          />
        )}

        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
          {!hasImagePreview &&
            (data.status === "ready" ? (
              <div className="grid size-14 place-items-center rounded-full border border-white/[0.08] bg-black/45 text-white backdrop-blur-sm">
                <Film size={22} />
              </div>
            ) : (
              <Film size={26} className="text-white/40" />
            ))}
        </div>

        <span
          className={cn(
            "pointer-events-none absolute right-2 top-2 z-[1] rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
            statusColors[data.status] ?? statusColors.empty,
          )}
        >
          {statusLabels[data.status]}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("scene-node-edit", { detail: { id: data.id } }));
          }}
          className="btn-press absolute left-2 top-2 z-[1] grid size-7 place-items-center rounded-lg border border-white/[0.06] bg-black/45 text-white/65 opacity-0 backdrop-blur-sm transition-[opacity,background-color,transform] duration-press ease-de-out group-hover:opacity-100 hover:bg-black/60 hover:text-white"
          title="设置"
        >
          <Settings2 size={13} />
        </button>
      </div>

      <div className="border-t border-white/[0.04] px-3 py-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
            {data.episodeLabel ?? "?"}
          </span>
          <span className="text-[10px] text-white/40">{data.branchLabel ?? "剧情模块"}</span>
        </div>
        <h3 className="line-clamp-1 text-sm font-semibold text-white">{data.title}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/45">{data.prompt}</p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3.5 !w-3.5 !cursor-crosshair !border-2 !border-[#0c0c0e] !bg-white/55"
      />
    </div>
  );
}
