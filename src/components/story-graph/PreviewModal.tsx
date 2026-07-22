"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MODAL_OVERLAY, MODAL_PANEL } from "@/lib/modalTheme";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { StoryNode } from "@/types/worldBuilder";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PreviewModal({ open, onClose }: Props) {
  const { episodes, nodes, world } = useWorldBuilderStore();
  const [episodeId, setEpisodeId] = useState(episodes[0]?.id);

  if (!open) return null;

  const currentEpisode = episodes.find((episode) => episode.id === episodeId) ?? episodes[0];
  const readyScenes = nodes.filter(
    (node): node is Extract<StoryNode, { kind: "scene" }> =>
      node.kind === "scene" &&
      node.data.episodeId === currentEpisode?.id &&
      node.data.status === "ready",
  );
  const currentIndex = episodes.findIndex((episode) => episode.id === currentEpisode?.id);
  const episodeSerial = currentEpisode?.index ?? (currentIndex >= 0 ? currentIndex + 1 : 1);

  const move = (direction: -1 | 1) => {
    const next = episodes[currentIndex + direction];
    if (next) setEpisodeId(next.id);
  };

  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="预览播放"
        onClick={(e) => e.stopPropagation()}
        className={cn(MODAL_PANEL, "grid max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl lg:grid-cols-[1fr_330px]")}
      >
        <section className="p-6">
          <div className="mb-4 flex items-center justify-between text-ink-strong">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">预览播放</p>
              <h2 className="text-xl font-semibold">预览 · {world.title || "未命名故事"}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭预览"
              className="grid size-9 place-items-center rounded-xl text-ink-muted transition hover:bg-white/10 hover:text-ink-strong"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mx-auto grid aspect-[9/16] max-h-[72vh] w-full max-w-[360px] place-items-center overflow-hidden rounded-2xl border border-card-border bg-black">
            {readyScenes.length ? (
              <div className="relative flex h-full w-full flex-col justify-between bg-[linear-gradient(160deg,#090d16,#151b29_35%,#d9468a)] p-6 text-white">
                {readyScenes[0].data.videoUrl && !readyScenes[0].data.videoUrl.startsWith("mock://") && (
                  <video src={readyScenes[0].data.videoUrl} autoPlay muted loop playsInline controls className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
                <p className="relative z-10 text-sm font-semibold">{readyScenes[0].data.title}</p>
                <div className="relative z-10 rounded-2xl bg-black/55 p-4 text-sm leading-6 text-white/80 backdrop-blur">
                  {readyScenes[0].data.videoUrl?.startsWith("mock://") ? "模拟视频占位" : "本地视频预览"}
                </div>
              </div>
            ) : (
              <div className="px-8 text-center text-white">
                <h3 className="text-lg font-semibold">空剧集</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  至少添加一个已生成视频的场景，才能开始预览。
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => move(-1)}
              className="rounded-xl border border-card-border px-4 py-2 text-sm text-ink-muted disabled:opacity-35"
            >
              上一集
            </button>
            <button
              type="button"
              disabled={currentIndex >= episodes.length - 1}
              onClick={() => move(1)}
              className="rounded-xl border border-card-border px-4 py-2 text-sm text-ink-muted disabled:opacity-35"
            >
              下一集
            </button>
          </div>
        </section>
        <aside className="border-l border-card-border p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-ink-strong">剧集</h3>
            <span className="rounded-lg border border-card-border bg-white/5 px-2 py-1 text-xs text-ink-muted">
              第 {episodeSerial} 集
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {episodes.map((episode, index) => (
              <button
                key={episode.id}
                type="button"
                onClick={() => setEpisodeId(episode.id)}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left text-sm",
                  episode.id === currentEpisode?.id
                    ? "border-accent/40 bg-accent-soft text-accent"
                    : "border-card-border text-ink-muted hover:bg-white/5",
                )}
              >
                <span className="mr-2 font-semibold text-ink-strong">
                  {episode.index ?? index + 1}
                </span>
                {episode.title}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
