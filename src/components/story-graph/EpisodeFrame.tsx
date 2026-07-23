"use client";

import { useEffect, useRef, useState } from "react";
import { NodeResizer, type NodeProps } from "reactflow";
import "@reactflow/node-resizer/dist/style.css";
import { Star } from "lucide-react";
import type { Episode } from "@/types/worldBuilder";
import { episodeDisplayLabel } from "@/lib/episodeBranchLabels";
import { EpisodeFrameMenu } from "@/components/story-graph/EpisodeFrameMenu";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

export function EpisodeFrame({ id, data, selected }: NodeProps<Episode>) {
  const updateEpisode = useWorldBuilderStore((s) => s.updateEpisode);
  const episode = data;
  const label = episodeDisplayLabel(episode);
  const isHighlight = Boolean(episode.highlight);
  const episodeId = id.replace(/^frame-/, "");
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(episode.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!renaming) setDraft(episode.title);
  }, [episode.title, renaming]);

  useEffect(() => {
    if (!renaming) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [renaming]);

  const commitRename = () => {
    const next = draft.trim().slice(0, 80);
    if (next && next !== episode.title) {
      updateEpisode(episodeId, { title: next });
    } else {
      setDraft(episode.title);
    }
    setRenaming(false);
  };

  return (
    <>
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={480}
        minHeight={360}
        color="rgba(255,255,255,0.14)"
        lineClassName="!border-white/[0.1]"
        handleClassName="!h-2.5 !w-2.5 !rounded-[3px] !border-2 !border-white/35 !bg-neutral-900"
        onResizeEnd={(_event, params) => {
          updateEpisode(episodeId, {
            frame: {
              x: params.x,
              y: params.y,
              width: params.width,
              height: params.height,
            },
          });
        }}
      />
      <div
        className={`pointer-events-none flex h-full w-full flex-col rounded-[20px] border transition-[border-color,box-shadow,background-color] duration-popover ease-de-out ${
          selected
            ? "border-white/[0.1] bg-white/[0.02] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
            : isHighlight
              ? "border-white/[0.08] bg-white/[0.015]"
              : "border-white/[0.04] bg-white/[0.01]"
        }`}
      >
        {/* 参考 Infinite-Canvas：徽章 + 标题 + … 菜单 */}
        <div className="pointer-events-auto flex items-center gap-2 px-4 pb-2 pt-3">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {isHighlight && <Star size={10} className="fill-amber-300 text-amber-300" />}
            {label}
          </span>

          {renaming ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(episode.title);
                  setRenaming(false);
                }
                e.stopPropagation();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="nodrag nopan min-w-0 flex-1 rounded-md border border-white/[0.08] bg-black/50 px-2 py-1 text-sm font-medium text-white outline-none focus:border-white/25"
            />
          ) : (
            <button
              type="button"
              className="nodrag nopan min-w-0 flex-1 truncate text-left text-sm font-medium text-white/90 hover:text-white"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setRenaming(true);
              }}
              title="双击重命名"
            >
              {episode.title || "未命名剧集"}
            </button>
          )}

          <EpisodeFrameMenu
            episodeId={episodeId}
            isHighlight={isHighlight}
            onRename={() => setRenaming(true)}
          />
        </div>
      </div>
    </>
  );
}
