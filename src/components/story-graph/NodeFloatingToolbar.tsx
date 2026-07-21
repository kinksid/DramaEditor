"use client";

import { useEffect, useState } from "react";
import { useReactFlow } from "reactflow";
import {
  Copy,
  Film,
  MousePointerClick,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type Props = {
  onOpenNode?: () => void;
};

/** TapNow / Studio style contextual toolbar anchored above the selected node. */
export function NodeFloatingToolbar({ onOpenNode }: Props) {
  const selectedNodeId = useWorldBuilderStore((s) => s.selectedNodeId);
  const nodes = useWorldBuilderStore((s) => s.nodes);
  const deleteNode = useWorldBuilderStore((s) => s.deleteNode);
  const duplicateNode = useWorldBuilderStore((s) => s.duplicateNode);
  const addSceneNode = useWorldBuilderStore((s) => s.addSceneNode);
  const addInteractionNode = useWorldBuilderStore((s) => s.addInteractionNode);
  const addEndingNode = useWorldBuilderStore((s) => s.addEndingNode);
  const selectEpisode = useWorldBuilderStore((s) => s.selectEpisode);
  const flow = useReactFlow();
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const node = nodes.find((n) => n.id === selectedNodeId);

  useEffect(() => {
    if (!node?.position || !selectedNodeId) {
      setPos(null);
      return;
    }

    const update = () => {
      try {
        const screen = flow.flowToScreenPosition({
          x: node.position!.x + 140,
          y: node.position!.y - 8,
        });
        const pane = document.querySelector(".react-flow") as HTMLElement | null;
        if (!pane) return;
        const rect = pane.getBoundingClientRect();
        setPos({
          left: screen.x - rect.left,
          top: Math.max(8, screen.y - rect.top - 44),
        });
      } catch {
        setPos(null);
      }
    };

    update();
    const pane = document.querySelector(".react-flow");
    pane?.addEventListener("mousemove", update);
    window.addEventListener("resize", update);
    const timer = window.setInterval(update, 120);
    return () => {
      pane?.removeEventListener("mousemove", update);
      window.removeEventListener("resize", update);
      window.clearInterval(timer);
    };
  }, [flow, node?.position?.x, node?.position?.y, selectedNodeId]);

  if (!node || !pos || !selectedNodeId) return null;

  const episodeId = node.data.episodeId;

  return (
    <div
      className="pointer-events-auto absolute z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/12 bg-[#16141c]/95 px-1.5 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <ToolBtn
        title="编辑"
        onClick={() => onOpenNode?.()}
        icon={<PenLine size={14} />}
      />
      <ToolBtn
        title="复制"
        onClick={() => duplicateNode(selectedNodeId)}
        icon={<Copy size={14} />}
      />
      <span className="mx-0.5 h-4 w-px bg-white/15" />
      <ToolBtn
        title="添加视频节点"
        onClick={() => {
          selectEpisode(episodeId);
          addSceneNode(episodeId);
        }}
        icon={<Film size={14} />}
      />
      <ToolBtn
        title="添加互动节点"
        onClick={() => {
          selectEpisode(episodeId);
          addInteractionNode(episodeId);
        }}
        icon={<MousePointerClick size={14} />}
      />
      <ToolBtn
        title="添加结局"
        onClick={() => {
          selectEpisode(episodeId);
          addEndingNode(episodeId);
        }}
        icon={<Plus size={14} />}
      />
      <span className="mx-0.5 h-4 w-px bg-white/15" />
      <ToolBtn
        title="删除"
        danger
        onClick={() => deleteNode(selectedNodeId)}
        icon={<Trash2 size={14} />}
      />
    </div>
  );
}

function ToolBtn({
  title,
  onClick,
  icon,
  danger,
}: {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={
        danger
          ? "grid size-8 place-items-center rounded-xl text-red-300 hover:bg-red-500/20"
          : "grid size-8 place-items-center rounded-xl text-white/75 hover:bg-white/10 hover:text-white"
      }
    >
      {icon}
    </button>
  );
}
