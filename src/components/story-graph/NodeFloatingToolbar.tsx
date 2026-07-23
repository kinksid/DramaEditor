"use client";

import { useEffect, useState } from "react";
import { useReactFlow, useViewport } from "reactflow";
import { Copy, PenLine, Trash2 } from "lucide-react";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type Props = {
  onOpenNode?: () => void;
};

/**
 * 左键选中后的悬浮工具栏：仅编辑 / 复制 / 删除。
 * 「添加下游」统一走右键 NodeActionMenu，避免两套菜单语义冲突。
 */
export function NodeFloatingToolbar({ onOpenNode }: Props) {
  const selectedNodeId = useWorldBuilderStore((s) => s.selectedNodeId);
  const nodes = useWorldBuilderStore((s) => s.nodes);
  const deleteNode = useWorldBuilderStore((s) => s.deleteNode);
  const duplicateNode = useWorldBuilderStore((s) => s.duplicateNode);
  const flow = useReactFlow();
  const viewport = useViewport();
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const node = nodes.find((n) => n.id === selectedNodeId);

  useEffect(() => {
    if (!node?.position || !selectedNodeId) {
      setPos(null);
      return;
    }

    try {
      const screen = flow.flowToScreenPosition({
        x: node.position.x + 140,
        y: node.position.y - 8,
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
  }, [
    flow,
    node?.position?.x,
    node?.position?.y,
    selectedNodeId,
    viewport.x,
    viewport.y,
    viewport.zoom,
  ]);

  if (!node || !pos || !selectedNodeId) return null;

  return (
    <div
      className="pointer-events-auto absolute z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/[0.06] bg-[#16141c]/95 px-1.5 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <ToolBtn title="编辑" onClick={() => onOpenNode?.()} icon={<PenLine size={14} />} />
      <ToolBtn
        title="复制"
        onClick={() => duplicateNode(selectedNodeId)}
        icon={<Copy size={14} />}
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
          ? "grid size-8 place-items-center rounded-xl text-red-300 transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-red-500/20 active:scale-[0.97]"
          : "grid size-8 place-items-center rounded-xl text-white/75 transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/10 hover:text-white active:scale-[0.97]"
      }
    >
      {icon}
    </button>
  );
}
