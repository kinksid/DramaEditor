"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { GitBranch, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { actionTypeLabels } from "@/lib/worldBuilderLabels";
import { cn } from "@/lib/utils";
import type { InteractionNodeData } from "@/types/worldBuilder";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type InteractionNodeViewData = InteractionNodeData & {
  targetTitles?: Record<string, string>;
  episodeLabel?: string;
  branchLabel?: string;
};

const MAX_OPTIONS_HINT = 6;
/** 顶栏高度约值：用于把 target handle 对齐到媒体区中心，避免进线箭头/标签压在缩略图下沿 */
const HEADER_H = 40;
const MEDIA_MT = 4;
const MEDIA_H = 176;
const MEDIA_CENTER_Y = HEADER_H + MEDIA_MT + MEDIA_H / 2;

function isImageUrl(url?: string) {
  if (!url || url.startsWith("mock://")) return false;
  return (
    url.startsWith("data:image") ||
    url.startsWith("blob:") ||
    /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)
  );
}

function offsetCenterY(el: HTMLElement, root: HTMLElement) {
  const rootRect = root.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const scale = rootRect.height > 0 ? root.offsetHeight / rootRect.height : 1;
  return (elRect.top - rootRect.top + elRect.height / 2) * scale;
}

function formatActionLine(option: InteractionNodeData["options"][number]) {
  const action = actionTypeLabels[option.actionType] ?? option.actionType;
  if (option.hotspot) {
    return `${action} (${option.hotspot.x.toFixed(2)}, ${option.hotspot.y.toFixed(2)})`;
  }
  if (option.actionValue) {
    return `${action} · ${option.actionValue}`;
  }
  return `${option.label} · ${action}`;
}

export function InteractionNode({ id, data, selected }: NodeProps<InteractionNodeViewData>) {
  const addOption = useWorldBuilderStore((state) => state.addOption);
  const options = data.options;
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [handleTops, setHandleTops] = useState<Record<string, number>>({});

  const previewUrl = data.firstFrameRef || data.lastFrameRef || data.loopVideoUrl;
  const hasImagePreview = isImageUrl(previewUrl);
  const durationSec = data.durationSec ?? 4;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const next: Record<string, number> = {};
    for (const option of options) {
      const el = optionRefs.current[option.id];
      if (!el) continue;
      next[option.id] = offsetCenterY(el, root);
    }
    // 亚像素抖动会触发无限 setState → Maximum update depth
    setHandleTops((prev) => {
      const keys = Object.keys(next);
      if (
        keys.length === Object.keys(prev).length &&
        keys.every((k) => Math.abs((prev[k] ?? 0) - next[k]) < 0.75)
      ) {
        return prev;
      }
      return next;
    });
  }, [options, data.instruction, data.title, previewUrl, durationSec]);

  const openEdit = () => {
    window.dispatchEvent(new CustomEvent("scene-node-edit", { detail: { id } }));
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "group relative w-[280px] overflow-visible rounded-2xl border bg-[#0c0c0e] text-white shadow-sm",
        "transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        selected
          ? "border-white/14 shadow-[0_12px_32px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06]"
          : "border-white/[0.06] hover:border-white/12",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-[#0c0c0e] !bg-white/50"
        style={{ top: MEDIA_CENTER_Y }}
      />

      {/* Header */}
      <div className="flex h-10 items-center gap-2 px-3">
        <GitBranch size={14} className="shrink-0 text-white/80" strokeWidth={2} />
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight text-white">
          {data.title || "未命名互动"}
        </h3>
        <button
          type="button"
          className="btn-press nodrag nopan grid size-6 shrink-0 place-items-center rounded-full text-white/45 transition-[color,background-color,transform] duration-press ease-de-out hover:bg-white/8 hover:text-white/80"
          title="更多"
          onClick={(e) => {
            e.stopPropagation();
            openEdit();
          }}
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Media — 点击进入编辑 */}
      <div
        role="button"
        tabIndex={0}
        title="点击进入"
        className="relative mx-3 mt-1 h-[176px] cursor-pointer overflow-hidden rounded-xl bg-[#121214]"
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
        {hasImagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="pointer-events-none absolute inset-0 size-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="de-canvas-surface pointer-events-none absolute inset-0 rounded-none border-0 shadow-none" aria-hidden />
        )}
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/90 backdrop-blur-sm">
          {durationSec}s
        </span>
      </div>

      {/* Description */}
      <p className="mx-3 mt-2.5 line-clamp-2 text-[11px] leading-[1.45] text-white/45">
        {data.instruction || "描述互动限制、用户动作和触发后的剧情结果。"}
      </p>

      {/* Options */}
      <div className="mx-3 mt-3 border-t border-white/[0.06] pt-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-medium tracking-wide text-white/40">选项</span>
          <span className="text-[10px] tabular-nums text-white/35">
            {options.length}/{MAX_OPTIONS_HINT}
          </span>
        </div>

        <div className="space-y-1">
          {options.map((option, index) => {
            const destination = option.targetNodeId
              ? data.targetTitles?.[option.targetNodeId] ?? "已连接"
              : "未连接";
            return (
              <div
                key={option.id}
                ref={(el) => {
                  optionRefs.current[option.id] = el;
                }}
                className="relative flex min-h-[44px] items-start gap-2 rounded-lg px-1 py-1.5 pr-2 transition-colors duration-150 ease-de-out hover:bg-white/[0.04]"
              >
                <span className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full bg-sky-200 text-[10px] font-semibold text-neutral-900">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold leading-tight text-white">
                    {formatActionLine(option)}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 truncate text-[11px] leading-tight",
                      option.targetNodeId ? "text-white/40" : "text-white/30",
                    )}
                  >
                    → {destination}
                  </div>
                </div>
              </div>
            );
          })}

          {options.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/12 py-3 text-center text-[10px] text-white/35">
              待添加选项
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-2.5">
        <button
          type="button"
          className="btn-press nodrag nopan flex h-8 flex-1 items-center justify-center gap-1 rounded-full border border-white/[0.08] bg-transparent text-[12px] font-medium text-white/70 transition-[border-color,background-color,color,transform] duration-press ease-de-out hover:border-white/16 hover:bg-white/[0.04] hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            addOption(id);
          }}
        >
          <Plus size={13} strokeWidth={2.25} />
          添加选项
        </button>
        <button
          type="button"
          className="btn-press nodrag nopan inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium text-white/55 transition-[color,background-color,transform] duration-press ease-de-out hover:bg-white/[0.04] hover:text-white/85"
          onClick={(e) => {
            e.stopPropagation();
            openEdit();
          }}
        >
          <Pencil size={12} />
          编辑
        </button>
      </div>

      {/* 默认出线口：兼容旧边；有选项时隐藏，避免压在缩略图右侧 */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!h-3.5 !w-3.5 !cursor-crosshair !border !border-white/25 !bg-[#1a1a1c]",
          options.length > 0 && "!pointer-events-none !opacity-0",
        )}
        style={{
          top:
            options.length > 0
              ? (handleTops[options[0].id] ?? MEDIA_CENTER_Y)
              : MEDIA_CENTER_Y,
        }}
      />

      {/* 每选项出线口（+ 样式） */}
      {options.map((option) => {
        const connected = Boolean(option.targetNodeId);
        return (
          <Handle
            key={option.id}
            type="source"
            position={Position.Right}
            id={option.id}
            title={option.label}
            className={cn(
              "!flex !h-5 !w-5 !cursor-crosshair !items-center !justify-center !rounded-md !border !text-white/70",
              connected
                ? "!border-sky-400/60 !bg-sky-500/25 !text-sky-100"
                : "!border-white/20 !bg-[#141416] !text-white/55",
            )}
            style={{
              top: handleTops[option.id] ?? "50%",
              right: -10,
            }}
          >
            {!connected ? <Plus size={10} strokeWidth={2.5} className="pointer-events-none" /> : null}
          </Handle>
        );
      })}
    </div>
  );
}
