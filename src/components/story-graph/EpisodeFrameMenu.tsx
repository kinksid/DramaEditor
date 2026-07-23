"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  FolderInput,
  MoreHorizontal,
  PenLine,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

export type EpisodeMenuAction =
  | "highlight"
  | "rename"
  | "copy"
  | "copy-to"
  | "delete";

type EpisodeFrameMenuProps = {
  episodeId: string;
  isHighlight?: boolean;
  onRename: () => void;
  className?: string;
};

export function EpisodeFrameMenu({
  episodeId,
  isHighlight,
  onRename,
  className,
}: EpisodeFrameMenuProps) {
  const [open, setOpen] = useState(false);
  const [copyToOpen, setCopyToOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const updateEpisode = useWorldBuilderStore((s) => s.updateEpisode);
  const deleteEpisode = useWorldBuilderStore((s) => s.deleteEpisode);
  const duplicateEpisode = useWorldBuilderStore((s) => s.duplicateEpisode);
  const copyEpisodeToProject = useWorldBuilderStore((s) => s.copyEpisodeToProject);
  const projects = useWorldBuilderStore((s) => s.projects);
  const activeProjectId = useWorldBuilderStore((s) => s.activeProjectId);
  const otherProjects = projects.filter((p) => p.id !== activeProjectId);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCopyToOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setCopyToOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (action: EpisodeMenuAction) => {
    if (action === "highlight") {
      updateEpisode(episodeId, { highlight: !isHighlight });
      setOpen(false);
      return;
    }
    if (action === "rename") {
      onRename();
      setOpen(false);
      return;
    }
    if (action === "copy") {
      duplicateEpisode(episodeId);
      setOpen(false);
      return;
    }
    if (action === "delete") {
      if (window.confirm("删除该剧集及其内部节点？")) {
        deleteEpisode(episodeId);
      }
      setOpen(false);
      return;
    }
    if (action === "copy-to") {
      setCopyToOpen((v) => !v);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative nodrag nopan", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
          setCopyToOpen(false);
        }}
        className="grid size-7 place-items-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white"
        title="剧集菜单"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[188px] rounded-xl border border-white/10 bg-[#141414]/98 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[11px] text-white/40">剧集</div>
          <div className="my-1 border-t border-white/[0.06]" />
          <div className="px-1">
            <MenuItem
              icon={Star}
              label={isHighlight ? "取消高光" : "设为高光"}
              onClick={() => run("highlight")}
              active={isHighlight}
            />
            <MenuItem icon={PenLine} label="重命名" onClick={() => run("rename")} />
            <MenuItem icon={Copy} label="复制" onClick={() => run("copy")} />
            <div className="relative">
              <MenuItem
                icon={FolderInput}
                label="复制到…"
                onClick={() => run("copy-to")}
              />
              {copyToOpen && (
                <div className="absolute left-full top-0 z-50 ml-1 min-w-[168px] rounded-xl border border-white/10 bg-[#141414]/98 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
                  <div className="px-3 py-1.5 text-[11px] text-white/40">目标项目</div>
                  <div className="my-1 border-t border-white/[0.06]" />
                  <div className="px-1">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-white transition hover:bg-white/[0.06]"
                      onClick={() => {
                        duplicateEpisode(episodeId);
                        setOpen(false);
                        setCopyToOpen(false);
                      }}
                    >
                      当前项目 · 新建副本
                    </button>
                    {otherProjects.length === 0 ? (
                      <p className="px-2.5 py-2 text-[12px] text-white/35">暂无其他项目</p>
                    ) : (
                      otherProjects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-white transition hover:bg-white/[0.06]"
                          onClick={() => {
                            const ok = copyEpisodeToProject(episodeId, project.id);
                            if (ok) {
                              window.alert(`已复制到「${project.name || "未命名项目"}」`);
                            }
                            setOpen(false);
                            setCopyToOpen(false);
                          }}
                        >
                          <span className="truncate">{project.name || "未命名项目"}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="my-1 border-t border-white/[0.06]" />
            <MenuItem
              icon={Trash2}
              label="删除"
              danger
              onClick={() => run("delete")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  active,
}: {
  icon: typeof Star;
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-white/[0.06]",
        danger ? "text-red-300" : "text-white",
        active && "text-amber-300",
      )}
    >
      <Icon size={15} className={cn("shrink-0 opacity-85", active && "fill-amber-300/80")} />
      {label}
    </button>
  );
}
