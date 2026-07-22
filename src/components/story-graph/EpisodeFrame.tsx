import type { Episode } from "@/types/worldBuilder";

export function EpisodeFrame({ episode, selected }: { episode: Episode; selected?: boolean }) {
  const isBranch = episode.label?.toLowerCase().includes("b");
  return (
    <div
      className={`pointer-events-none flex h-full flex-col rounded-[24px] border-2 p-5 transition-all ${
        selected
          ? "border-accent bg-accent-soft/20 shadow-[0_0_0_2px_rgba(139,92,246,0.18)]"
          : isBranch
            ? "border-pink-100/60 bg-accent-soft/10"
            : "border-slate-200/50 bg-accent-soft/5"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
        第 {episode.index} 集 · {isBranch ? "分支剧情" : "主线剧情"}
      </p>
      <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-white/90">{episode.title}</h3>
    </div>
  );
}
