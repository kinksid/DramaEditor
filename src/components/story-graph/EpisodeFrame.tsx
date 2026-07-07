import type { Episode } from "@/types/worldBuilder";

export function EpisodeFrame({ episode, selected }: { episode: Episode; selected?: boolean }) {
  const isBranch = episode.label?.toLowerCase().includes("b");
  return (
    <div
      className={`h-full rounded-[24px] border-2 p-5 transition-all ${
        selected
          ? "border-accent bg-accent-soft/20 shadow-[0_0_0_2px_rgba(217,70,138,0.12)]"
          : isBranch
            ? "border-pink-100/60 bg-accent-soft/10"
            : "border-slate-200/50 bg-accent-soft/5"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {(episode.label ?? String(episode.index)).toUpperCase()} · {isBranch ? "分支剧情" : "主线剧情"}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-ink-muted">{episode.title}</h3>
    </div>
  );
}
