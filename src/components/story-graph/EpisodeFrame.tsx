import type { Episode } from "@/types/worldBuilder";

export function EpisodeFrame({ episode, selected }: { episode: Episode; selected?: boolean }) {
  return (
    <div
      className={`h-full rounded-[26px] border bg-white/60 p-4 ${
        selected ? "border-accent shadow-[0_0_0_3px_rgba(242,125,61,0.16)]" : "border-slate-200"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        第 {(episode.label ?? String(episode.index)).toUpperCase()} 集 · {episode.label?.toLowerCase().includes("b") ? "分支剧情模块" : "主线剧情模块"}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-slate-800">{episode.title}</h3>
    </div>
  );
}
