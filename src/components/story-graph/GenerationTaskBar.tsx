"use client";

import { useMemo } from "react";
import { Loader2, CheckCircle2, XCircle, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { PendingGenerationTask } from "@/lib/generationClient";

/** Bottom generation history strip — TapNow / Studio canvas task rail. */
export function GenerationTaskBar() {
  const pending = useWorldBuilderStore((s) => s.pendingGenerationTasks);
  const nodes = useWorldBuilderStore((s) => s.nodes);
  const selectNode = useWorldBuilderStore((s) => s.selectNode);
  const selectEpisode = useWorldBuilderStore((s) => s.selectEpisode);

  const recentReady = useMemo(() => {
    return nodes
      .filter((n) => n.kind === "scene" && n.data.status === "ready" && n.data.videoUrl)
      .slice(-4)
      .reverse();
  }, [nodes]);

  const items: Array<{
    id: string;
    label: string;
    status: "queued" | "running" | "ready" | "failed";
    onClick?: () => void;
  }> = [
    ...pending.map((task: PendingGenerationTask) => ({
      id: task.taskId,
      label: taskLabel(task),
      status: "running" as const,
      onClick: () => {
        if (task.nodeId) {
          const node = nodes.find((n) => n.id === task.nodeId);
          if (node) {
            selectEpisode(node.data.episodeId);
            selectNode(node.id);
          }
        }
      },
    })),
    ...recentReady.map((node) => ({
      id: `ready-${node.id}`,
      label: node.data.title || "视频就绪",
      status: "ready" as const,
      onClick: () => {
        selectEpisode(node.data.episodeId);
        selectNode(node.id);
      },
    })),
  ].slice(0, 8);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3">
      <div className="pointer-events-auto flex max-w-[min(920px,94%)] items-center gap-2 overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#121016]/92 px-3 py-2 shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="flex shrink-0 items-center gap-1.5 pr-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          <Clapperboard size={12} />
          任务
        </div>
        {items.length === 0 ? (
          <p className="whitespace-nowrap px-2 text-xs text-white/35">暂无生成任务 · 生成视频后会出现在这里</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] transition",
                item.status === "running" && "border-accent/35 bg-accent/15 text-accent",
                item.status === "ready" && "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
                item.status === "failed" && "border-red-400/30 bg-red-500/10 text-red-200",
                item.status === "queued" && "border-white/10 bg-white/5 text-white/60",
              )}
            >
              {item.status === "running" && <Loader2 size={12} className="animate-spin" />}
              {item.status === "ready" && <CheckCircle2 size={12} />}
              {item.status === "failed" && <XCircle size={12} />}
              <span className="max-w-[140px] truncate">{item.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function taskLabel(task: PendingGenerationTask) {
  if (task.kind === "video") return `视频生成 · ${(task.nodeId ?? task.taskId).slice(0, 6)}`;
  if (task.kind === "image") return `参考图 · ${(task.targetEntityId ?? task.taskId).slice(0, 6)}`;
  return task.taskId.slice(0, 10);
}
