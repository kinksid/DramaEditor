"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { StoryNode } from "@/types/worldBuilder";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PreviewModal({ open, onClose }: Props) {
  const { episodes, nodes } = useWorldBuilderStore();
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

  const move = (direction: -1 | 1) => {
    const next = episodes[currentIndex + direction];
    if (next) setEpisodeId(next.id);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4 backdrop-blur-sm">
      <div className="grid max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-soft lg:grid-cols-[1fr_330px]">
        <section className="p-6">
          <div className="mb-4 flex items-center justify-between text-ink-strong">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">预览播放</p>
              <h2 className="text-xl font-semibold">预览 · 记忆盗贼</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="关闭预览"
              className="grid size-9 place-items-center rounded-xl hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mx-auto grid aspect-[9/16] max-h-[72vh] w-full max-w-[360px] place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-black">
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
            <button disabled={currentIndex <= 0} onClick={() => move(-1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-35">
              上一集
            </button>
            <button disabled={currentIndex >= episodes.length - 1} onClick={() => move(1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-35">
              下一集
            </button>
          </div>
        </section>
        <aside className="border-l border-slate-200 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold">剧集</h3>
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500">
              {episodes.length}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {episodes.map((episode) => (
              <button
                key={episode.id}
                onClick={() => setEpisodeId(episode.id)}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left text-sm",
                  episode.id === currentEpisode?.id
                    ? "border-pink-200 accent-soft text-accent"
                    : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <span className="mr-2 font-semibold">{(episode.label ?? String(episode.index)).toUpperCase()}</span>
                {episode.title}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
