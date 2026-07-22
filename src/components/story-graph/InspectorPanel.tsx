"use client";

import { useMemo, useState } from "react";
import { Copy, Film, Hand, MousePointerClick, Plus, Timer, Trash2, X, Zap } from "lucide-react";
import { actionTypeLabels, statusLabels } from "@/lib/worldBuilderLabels";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { InteractionOption, SceneNodeData, StoryNode } from "@/types/worldBuilder";
import { MODAL_OVERLAY, MODAL_PANEL } from "@/lib/modalTheme";
import { cn } from "@/lib/utils";

export function InspectorPanel() {
  const {
    nodes,
    selectedNodeId,
    updateNode,
    deleteNode,
    duplicateNode,
    addOption,
    updateOption,
    deleteOption,
  } = useWorldBuilderStore();
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <aside className="h-full border-l border-white/8 bg-[#121016] p-5 text-white/90">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">属性面板</p>
        <h2 className="mt-2 text-lg font-semibold text-white">选择一个节点</h2>
        <p className="mt-2 text-sm leading-6 text-white/45">
          点击画布中的视频节点、互动节点或结局节点，即可编辑本地数据。
        </p>
      </aside>
    );
  }

  return (
    <aside className="max-h-[calc(100vh-142px)] overflow-y-auto border-l border-white/8 bg-[#121016] p-5 text-white/90">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">属性面板</p>
      <h2 className="mt-2 text-lg font-semibold capitalize text-white">{nodeKindLabel(selectedNode.kind)}</h2>
      <div className="mt-5">
        {selectedNode.kind === "scene" && <SceneInspector node={selectedNode} />}
        {selectedNode.kind === "interaction" && <InteractionInspector node={selectedNode} />}
        {selectedNode.kind === "ending" && <EndingInspector node={selectedNode} />}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={() => duplicateNode(selectedNode.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 px-3 py-2 text-sm text-white/80 hover:bg-white/8">
          <Copy size={15} /> 复制
        </button>
        <button onClick={() => deleteNode(selectedNode.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/25 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10">
          <Trash2 size={15} /> 删除
        </button>
      </div>
    </aside>
  );

  function SceneInspector({ node }: { node: Extract<StoryNode, { kind: "scene" }> }) {
    const data = node.data;
    const setData = (patch: Partial<SceneNodeData>) => updateNode(node.id, patch);

    return (
      <div className="space-y-4">
        <TextInput label="标题" value={data.title} onChange={(value) => setData({ title: value })} />
        <Textarea label="视频提示词" value={data.prompt} onChange={(value) => setData({ prompt: value })} />
        <TextInput label="首帧参考" value={data.firstFrameRef ?? ""} onChange={(value) => setData({ firstFrameRef: value })} />
        <TextInput label="视频地址" value={data.videoUrl ?? ""} onChange={(value) => setData({ videoUrl: value })} />
        <label className="block">
          <span className="text-sm font-medium">状态</span>
          <select className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white" value={data.status} onChange={(e) => setData({ status: e.target.value as SceneNodeData["status"] })}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => setData({ status: "ready", videoUrl: "mock://black-video" })} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
          <Film size={16} /> 生成模拟视频
        </button>
      </div>
    );
  }

  function InteractionInspector({ node }: { node: Extract<StoryNode, { kind: "interaction" }> }) {
    const data = node.data;
    const [gestureOpen, setGestureOpen] = useState(false);

    return (
      <div className="space-y-4">
        <TextInput label="标题" value={data.title} onChange={(value) => updateNode(node.id, { title: value })} />
        <Textarea label="互动指令" value={data.instruction} onChange={(value) => updateNode(node.id, { instruction: value })} />
        <button
          onClick={() => setGestureOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-glow hover:bg-accent-deep"
        >
          <MousePointerClick size={16} /> 打开自定义手势编辑器
        </button>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">选项</span>
            <button onClick={() => addOption(node.id)} className="inline-flex items-center gap-1 rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-white">
              <Plus size={13} /> 添加
            </button>
          </div>
          <div className="space-y-3">
            {data.options.map((option) => (
              <OptionEditor
                key={option.id}
                option={option}
                nodes={nodes}
                onUpdate={(patch) => updateOption(node.id, option.id, patch)}
                onDelete={() => deleteOption(node.id, option.id)}
              />
            ))}
          </div>
        </div>
        {gestureOpen && (
          <GestureEditorModal
            node={node}
            nodes={nodes}
            onClose={() => setGestureOpen(false)}
            onTitle={(value) => updateNode(node.id, { title: value })}
            onInstruction={(value) => updateNode(node.id, { instruction: value })}
            onAddOption={() => addOption(node.id)}
            onUpdateOption={(optionId, patch) => updateOption(node.id, optionId, patch)}
            onDeleteOption={(optionId) => deleteOption(node.id, optionId)}
          />
        )}
      </div>
    );
  }

  function EndingInspector({ node }: { node: Extract<StoryNode, { kind: "ending" }> }) {
    return (
      <div className="space-y-4">
        <TextInput label="标题" value={node.data.title} onChange={(value) => updateNode(node.id, { title: value })} />
        <label className="block">
          <span className="text-sm font-medium">结局类型</span>
          <select className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white" value={node.data.endingType} onChange={(e) => updateNode(node.id, { endingType: e.target.value as never })}>
            <option>good</option>
            <option>bad</option>
            <option>normal</option>
            <option>secret</option>
          </select>
        </label>
        <Textarea label="结局描述" value={node.data.description} onChange={(value) => updateNode(node.id, { description: value })} />
      </div>
    );
  }
}

function OptionEditor({
  option,
  nodes,
  onUpdate,
  onDelete,
}: {
  option: InteractionOption;
  nodes: StoryNode[];
  onUpdate: (patch: Partial<InteractionOption>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="grid gap-2">
        <TextInput label="选项文案" value={option.label} onChange={(value) => onUpdate({ label: value })} compact />
        <label>
          <span className="text-xs font-medium text-white/45">交互类型</span>
          <select className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white" value={option.actionType} onChange={(e) => onUpdate({ actionType: e.target.value as InteractionOption["actionType"] })}>
            {Object.entries(actionTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <TextInput label="交互参数" value={option.actionValue ?? ""} onChange={(value) => onUpdate({ actionValue: value })} compact />
        <label>
          <span className="text-xs font-medium text-white/45">目标节点</span>
          <select className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white" value={option.targetNodeId ?? ""} onChange={(e) => onUpdate({ targetNodeId: e.target.value })}>
            <option value="">无</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.data.title}
              </option>
            ))}
          </select>
        </label>
        <TextInput label="连线颜色" value={option.color ?? ""} onChange={(value) => onUpdate({ color: value })} compact />
      </div>
      <button onClick={onDelete} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-400/25 bg-transparent px-3 py-2 text-xs text-red-300 hover:bg-red-500/10">
        <Trash2 size={14} /> 删除选项
      </button>
    </div>
  );
}

function TextInput({ label, value, onChange, compact }: { label: string; value: string; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <label className="block">
      <span className={compact ? "text-xs font-medium text-white/45" : "text-sm font-medium text-white/70"}>{label}</span>
      <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-accent/50" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-white/70">{label}</span>
      <textarea className="mt-2 min-h-32 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-6 text-white outline-none focus:border-accent/50" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function nodeKindLabel(kind: StoryNode["kind"]) {
  if (kind === "scene") return "视频节点";
  if (kind === "interaction") return "互动节点";
  return "结局节点";
}

function GestureEditorModal({
  node,
  nodes,
  onClose,
  onTitle,
  onInstruction,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
}: {
  node: Extract<StoryNode, { kind: "interaction" }>;
  nodes: StoryNode[];
  onClose: () => void;
  onTitle: (value: string) => void;
  onInstruction: (value: string) => void;
  onAddOption: () => void;
  onUpdateOption: (optionId: string, patch: Partial<InteractionOption>) => void;
  onDeleteOption: (optionId: string) => void;
}) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>(node.data.options[0]?.id);
  const selectedOption = node.data.options.find((option) => option.id === selectedOptionId) ?? node.data.options[0];
  const sceneTargets = useMemo(() => nodes.filter((item) => item.kind !== "interaction" || item.id !== node.id), [nodes, node.id]);

  const setActionType = (actionType: InteractionOption["actionType"]) => {
    if (!selectedOption) return;
    const defaults: Record<InteractionOption["actionType"], Partial<InteractionOption>> = {
      tap: { actionValue: "(0.50, 0.50)", hotspot: selectedOption.hotspot ?? { x: 0.5, y: 0.5 }, color: "#2f7df6" },
      swipe: { actionValue: "right", hotspot: selectedOption.hotspot ?? { x: 0.5, y: 0.5 }, color: "#15a36b" },
      hold: { actionValue: "1500ms", hotspot: selectedOption.hotspot ?? { x: 0.5, y: 0.5 }, color: "#d9468a" },
      rapidTap: { actionValue: "3x / 1500ms", hotspot: selectedOption.hotspot ?? { x: 0.5, y: 0.5 }, color: "#d946ef" },
      choice: { actionValue: "A", hotspot: selectedOption.hotspot ?? { x: 0.5, y: 0.5 }, color: "#8b5cf6" },
    };
    onUpdateOption(selectedOption.id, { actionType, ...defaults[actionType] });
  };

  const updateHotspot = (x: number, y: number) => {
    if (!selectedOption) return;
    const next = { x: clamp(x), y: clamp(y) };
    onUpdateOption(selectedOption.id, {
      hotspot: next,
      actionValue: selectedOption.actionType === "tap" ? `(${next.x.toFixed(2)}, ${next.y.toFixed(2)})` : selectedOption.actionValue,
    });
  };

  const handlePreviewClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    updateHotspot((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  };

  return (
    <div className={MODAL_OVERLAY}>
      <div className={cn(MODAL_PANEL, "grid max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] lg:grid-cols-[420px_1fr]")}>
        <section className="bg-[#0c0a0f] p-5">
          <div
            onClick={handlePreviewClick}
            className="relative mx-auto aspect-[9/16] max-h-[82vh] overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#120a12,#1a1020_52%,#08060a)] text-white shadow-2xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_18%,rgba(185,74,106,0.28),transparent_18%),linear-gradient(90deg,rgba(255,255,255,0.08),transparent_24%,transparent_76%,rgba(255,255,255,0.07))]" />
            <div className="absolute inset-x-0 top-0 p-5">
              <p className="text-xs text-white/55">互动预览</p>
              <h3 className="mt-1 text-lg font-semibold">{node.data.title}</h3>
            </div>
            <div className="absolute bottom-5 right-5 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold">播放</div>
            {node.data.options.map((option, index) => {
              const point = option.hotspot ?? parseHotspot(option.actionValue) ?? defaultHotspot(index);
              const active = option.id === selectedOption?.id;
              return (
                <button
                  key={option.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedOptionId(option.id);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                  style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
                >
                  <span className={active ? "grid size-14 place-items-center rounded-full border-2 border-accent bg-white/15 shadow-glow backdrop-blur" : "grid size-11 place-items-center rounded-full border border-white/60 bg-black/35 backdrop-blur"}>
                    <MousePointerClick size={22} />
                  </span>
                  <span className="absolute -right-1 -top-2 grid size-6 place-items-center rounded-full bg-accent text-xs font-bold text-white">{index + 1}</span>
                  <span className="mt-1 block max-w-28 rounded-lg bg-black/65 px-2 py-1 text-[11px] font-semibold">{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <label className="block">
                <span className="text-sm font-semibold text-white/90">名称</span>
                <input className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-accent/50" value={node.data.title} onChange={(event) => onTitle(event.target.value)} />
              </label>
            </div>
            <button onClick={onClose} className="grid size-9 place-items-center rounded-xl text-white/70 hover:bg-white/10">
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 border-b border-white/10">
            <button className="border-b-2 border-accent px-2 py-2 text-sm font-semibold text-white">互动</button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">交互类型</p>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <GestureTypeButton active={selectedOption?.actionType === "tap"} icon={MousePointerClick} title="点击" detail="最多 6 个屏幕选项" onClick={() => setActionType("tap")} />
              <GestureTypeButton active={selectedOption?.actionType === "swipe"} icon={Hand} title="滑动" detail="单方向手势" onClick={() => setActionType("swipe")} />
              <GestureTypeButton active={selectedOption?.actionType === "hold"} icon={Timer} title="长按" detail="按住确认" onClick={() => setActionType("hold")} />
              <GestureTypeButton active={selectedOption?.actionType === "rapidTap"} icon={Zap} title="连续点击" detail="时间窗内多次点击" onClick={() => setActionType("rapidTap")} />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">选项 ({node.data.options.length}/6)</p>
              <button
                disabled={node.data.options.length >= 6}
                onClick={() => {
                  onAddOption();
                  window.setTimeout(() => setSelectedOptionId(node.data.options.at(-1)?.id), 0);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/8 disabled:opacity-40"
              >
                <Plus size={15} /> 添加选项
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {node.data.options.map((option, index) => (
                <GestureOptionCard
                  key={option.id}
                  index={index}
                  option={option}
                  active={option.id === selectedOption?.id}
                  nodes={sceneTargets}
                  onSelect={() => setSelectedOptionId(option.id)}
                  onUpdate={(patch) => onUpdateOption(option.id, patch)}
                  onDelete={() => onDeleteOption(option.id)}
                />
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-white/90">互动说明</span>
              <textarea className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-6 text-white outline-none focus:border-accent/50" value={node.data.instruction} onChange={(event) => onInstruction(event.target.value)} />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}

function GestureTypeButton({
  active,
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  icon: typeof MousePointerClick;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={active ? "rounded-xl border border-accent/50 bg-accent/10 p-3 text-left" : "rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/8"}>
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-accent text-white">
          <Icon size={15} />
        </span>
        <span className="font-semibold text-white">{title}</span>
      </div>
      <p className="mt-2 text-xs text-white/45">{detail}</p>
    </button>
  );
}

function GestureOptionCard({
  index,
  option,
  active,
  nodes,
  onSelect,
  onUpdate,
  onDelete,
}: {
  index: number;
  option: InteractionOption;
  active: boolean;
  nodes: StoryNode[];
  onSelect: () => void;
  onUpdate: (patch: Partial<InteractionOption>) => void;
  onDelete: () => void;
}) {
  const point = option.hotspot ?? parseHotspot(option.actionValue) ?? defaultHotspot(index);

  return (
    <button onClick={onSelect} className={active ? "rounded-2xl border border-accent/45 bg-accent/10 p-3 text-left" : "rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/8"}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-accent text-xs font-bold text-white">{index + 1}</span>
          <span className="font-semibold text-white">{actionTypeLabels[option.actionType]}</span>
          <span className="text-xs text-white/40">({point.x.toFixed(2)}, {point.y.toFixed(2)})</span>
        </div>
        <span
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-red-500/15 hover:text-red-300"
        >
          <Trash2 size={15} />
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        <input className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-accent/50" value={option.label} onChange={(event) => onUpdate({ label: event.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="X" value={point.x} onChange={(value) => onUpdate({ hotspot: { x: clamp(value), y: point.y }, actionValue: `(${clamp(value).toFixed(2)}, ${point.y.toFixed(2)})` })} />
          <NumberInput label="Y" value={point.y} onChange={(value) => onUpdate({ hotspot: { x: point.x, y: clamp(value) }, actionValue: `(${point.x.toFixed(2)}, ${clamp(value).toFixed(2)})` })} />
        </div>
        <input className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-accent/50" value={option.actionValue ?? ""} onChange={(event) => onUpdate({ actionValue: event.target.value })} placeholder="交互参数，例如 right / 1500ms / 3x" />
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40">跳转到</span>
          <select className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white" value={option.targetNodeId ?? ""} onChange={(event) => onUpdate({ targetNodeId: event.target.value })}>
            <option value="">未连接</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.data.title}
              </option>
            ))}
          </select>
        </label>
      </div>
    </button>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="text-xs font-semibold text-white/45">{label}</span>
      <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-accent/50" type="number" min={0} max={1} step={0.01} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function parseHotspot(value?: string) {
  const match = value?.match(/([0-9.]+)\s*,\s*([0-9.]+)/);
  if (!match) return undefined;
  return { x: clamp(Number(match[1])), y: clamp(Number(match[2])) };
}

function defaultHotspot(index: number) {
  return { x: 0.5, y: clamp(0.45 + index * 0.18) };
}

function clamp(value: number) {
  if (Number.isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}
