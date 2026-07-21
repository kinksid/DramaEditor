"use client";

import { useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import Link from "next/link";
import {
  ArrowUp,
  Download,
  ExternalLink,
  Film,
  Hand,
  ImagePlus,
  MousePointerClick,
  RotateCcw,
  Timer,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { actionTypeLabels } from "@/lib/worldBuilderLabels";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { InteractionOption, SceneNodeData, StoryNode } from "@/types/worldBuilder";

type EditTab = "video" | "interaction";

export function NodeEditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    characters,
    locations,
    nodes,
    selectedNodeId,
    updateNode,
    updateOption,
    addOption,
    deleteOption,
    submitVideoGeneration,
    submitSceneFirstFrame,
    applyGenerationHistory,
  } = useWorldBuilderStore();
  const node = nodes.find((item) => item.id === selectedNodeId);
  const [tab, setTab] = useState<EditTab>("video");
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>();

  if (!open || !node) return null;

  const activeTab: EditTab = node.kind === "interaction" ? tab === "video" ? "interaction" : tab : "video";

  const updateOptionHotspot = (optionId: string, point: { x: number; y: number }) => {
    if (node.kind !== "interaction") return;
    const option = node.data.options.find((item) => item.id === optionId);
    const patch: Partial<InteractionOption> = { hotspot: point };
    if (!option || option.actionType === "tap") {
      patch.actionValue = `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
    }
    updateOption(node.id, optionId, patch);
  };

  const handleUpload = (dataUrl: string) => {
    if (node.kind === "scene") {
      updateNode(node.id, {
        videoUrl: dataUrl,
        firstFrameRef: node.data.firstFrameRef ?? dataUrl,
        status: "ready",
      });
    }
    if (node.kind === "interaction") {
      updateNode(node.id, {
        loopVideoUrl: dataUrl,
        firstFrameRef: node.data.firstFrameRef ?? dataUrl,
        lastFrameRef: dataUrl,
      });
    }
  };

  const handleGenerate = async () => {
    if (node.kind === "scene") {
      await submitVideoGeneration(node.id);
    }
    if (node.kind === "interaction") {
      updateNode(node.id, {
        loopVideoUrl: node.data.loopVideoUrl ?? `mock://loop/${node.id}`,
      });
    }
  };

  const handleGenerateFirstFrame = async () => {
    if (node.kind === "scene") {
      await submitSceneFirstFrame(node.id);
    }
  };

  const handleResetMedia = () => {
    if (node.kind === "scene") {
      updateNode(node.id, { videoUrl: undefined, firstFrameRef: undefined, status: "draft" });
    }
    if (node.kind === "interaction") {
      updateNode(node.id, { loopVideoUrl: undefined, firstFrameRef: undefined, lastFrameRef: undefined });
      node.data.options.forEach((option, index) => {
        const point = defaultHotspot(index);
        updateOption(node.id, option.id, {
          hotspot: point,
          actionValue: option.actionType === "tap" ? `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})` : option.actionValue,
        });
      });
    }
  };

  const handleDownloadNode = () => {
    downloadJson(`${node.id}.json`, JSON.stringify(node, null, 2));
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-5 backdrop-blur-sm">
      <div className="grid max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[28px] bg-white shadow-2xl lg:grid-cols-[470px_1fr]">
        <PreviewPane
          node={node}
          selectedOptionId={selectedOptionId}
          onSelectOption={setSelectedOptionId}
          onMoveHotspot={updateOptionHotspot}
          onUpload={handleUpload}
          onDownload={handleDownloadNode}
          onReset={handleResetMedia}
        />

        <section className="overflow-y-auto p-6">
          <div className="flex items-start gap-4">
            <label className="block min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink">名称</span>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                value={node.data.title}
                onChange={(event) => updateNode(node.id, { title: event.target.value })}
              />
            </label>
            <button
              onClick={onClose}
              aria-label="关闭节点编辑器"
              className="grid size-9 place-items-center rounded-xl hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 flex gap-5 border-b border-slate-200 text-sm">
            <button
              onClick={() => setTab("video")}
              className={cn("border-b-2 px-1 py-3", activeTab === "video" ? "border-ink font-semibold text-ink" : "border-transparent text-slate-500")}
            >
              视频生成
            </button>
            <button
              onClick={() => setTab("interaction")}
              disabled={node.kind !== "interaction"}
              className={cn("border-b-2 px-1 py-3", activeTab === "interaction" ? "border-ink font-semibold text-ink" : "border-transparent text-slate-500", node.kind !== "interaction" && "opacity-40")}
            >
              互动
            </button>
          </div>

          <section className="mt-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold tracking-[0.12em] text-ink">引用资产</p>
              <Link href="/world-builder" className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-accent">
                打开世界构建器 <ExternalLink size={13} />
              </Link>
            </div>
            <div className="grid overflow-hidden rounded-xl border border-slate-200 md:grid-cols-2">
              <MentionBox title="角色" items={characters.map((item) => item.name)} />
              <MentionBox title="地点" items={locations.map((item) => item.name)} />
            </div>
          </section>

          {activeTab === "video" && (
            <VideoGenerationEditor
              node={node}
              onUpdate={(patch) => updateNode(node.id, patch)}
              onGenerate={handleGenerate}
              onGenerateFirstFrame={handleGenerateFirstFrame}
              onApplyHistory={(entryId) => applyGenerationHistory(node.id, entryId)}
            />
          )}

          {activeTab === "interaction" && node.kind === "interaction" && (
            <InteractionGestureEditor
              node={node}
              nodes={nodes}
              selectedOptionId={selectedOptionId}
              onSelectOption={setSelectedOptionId}
              onAddOption={() => addOption(node.id)}
              onUpdateOption={(optionId, patch) => updateOption(node.id, optionId, patch)}
              onDeleteOption={(optionId) => deleteOption(node.id, optionId)}
              onGenerate={handleGenerate}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function PreviewPane({
  node,
  selectedOptionId,
  onSelectOption,
  onMoveHotspot,
  onUpload,
  onDownload,
  onReset,
}: {
  node: StoryNode;
  selectedOptionId?: string;
  onSelectOption: (id: string) => void;
  onMoveHotspot: (optionId: string, point: { x: number; y: number }) => void;
  onUpload: (dataUrl: string) => void;
  onDownload: () => void;
  onReset: () => void;
}) {
  const isInteraction = node.kind === "interaction";
  const options = isInteraction ? node.data.options : [];
  const activeOptionId = selectedOptionId ?? options[0]?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = node.kind === "scene" ? node.data.videoUrl : node.kind === "interaction" ? node.data.loopVideoUrl : undefined;
  const hasPlayablePreview = Boolean(previewUrl && !previewUrl.startsWith("mock://"));

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isInteraction || !activeOptionId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onMoveHotspot(activeOptionId, {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onUpload(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <section className="relative bg-[#f3f6fa] p-5">
      <div className="absolute left-5 top-5 z-10 flex gap-2">
        <input ref={fileInputRef} className="hidden" type="file" accept="video/*,image/*" onChange={handleFileChange} />
        <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-black/65 px-3 py-2 text-sm font-semibold text-white">
          <Upload size={15} /> 上传
        </button>
      </div>
      <div className="absolute right-5 top-5 z-10 flex gap-2">
        <button onClick={onDownload} className="grid size-9 place-items-center rounded-lg bg-black/45 text-white"><Download size={16} /></button>
        <button onClick={onReset} className="grid size-9 place-items-center rounded-lg bg-black/45 text-white"><RotateCcw size={16} /></button>
      </div>
      <div
        onClick={handleClick}
        className="relative mx-auto aspect-[9/16] max-h-[82vh] overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#07111f,#172136_50%,#02040a)] text-white"
      >
        {hasPlayablePreview && (
          previewUrl?.startsWith("data:image") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="节点预览" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <video src={previewUrl} autoPlay muted loop playsInline controls className="absolute inset-0 h-full w-full object-cover" />
          )
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_14%,rgba(56,189,248,0.28),transparent_18%),linear-gradient(90deg,rgba(255,255,255,0.08),transparent_28%,transparent_72%,rgba(255,255,255,0.08))]" />
        {!isInteraction && (
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="h-1 rounded-full bg-white/25">
              <div className="h-full w-2/5 rounded-full bg-accent" />
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs">
              <button className="grid size-9 place-items-center rounded-lg bg-white/15"><Film size={17} /></button>
              <span>0:01 / 0:05</span>
            </div>
          </div>
        )}
        {isInteraction && options.length === 0 && (
          <div className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-slate-300">
            上传循环视频后即可放置互动选项
          </div>
        )}
        {options.map((option, index) => {
          const point = option.hotspot ?? parseHotspot(option.actionValue) ?? defaultHotspot(index);
          const active = option.id === activeOptionId;
          return (
            <button
              key={option.id}
              onClick={(event) => {
                event.stopPropagation();
                onSelectOption(option.id);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            >
              <span className={active ? "grid size-14 place-items-center rounded-full border-2 border-sky-400 bg-white/15 shadow-glow backdrop-blur" : "grid size-11 place-items-center rounded-full border border-white/60 bg-black/35 backdrop-blur"}>
                <MousePointerClick size={22} />
              </span>
              <span className="absolute -right-1 -top-2 grid size-6 place-items-center rounded-full bg-sky-500 text-xs font-bold text-white">{index + 1}</span>
              <span className="mt-1 block max-w-28 rounded-lg bg-black/65 px-2 py-1 text-[11px] font-semibold">{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MentionBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-slate-200 p-4 first:border-r">
      <p className="text-xs font-semibold">{title}</p>
      <p className="mt-2 text-xs text-slate-500">输入 @ 可引用</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {items.slice(0, 3).map((item) => (
          <span key={item} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{item}</span>
        ))}
      </div>
    </div>
  );
}

function VideoGenerationEditor({
  node,
  onUpdate,
  onGenerate,
  onGenerateFirstFrame,
  onApplyHistory,
}: {
  node: StoryNode;
  onUpdate: (patch: Partial<SceneNodeData>) => void;
  onGenerate: () => void | Promise<void>;
  onGenerateFirstFrame: () => void | Promise<void>;
  onApplyHistory: (entryId: string) => void;
}) {
  const prompt = node.kind === "scene" ? node.data.prompt : node.kind === "interaction" ? node.data.instruction : node.data.description;
  const history =
    node.kind === "scene"
      ? node.data.generationHistory
      : node.kind === "interaction"
        ? node.data.generationHistory
        : undefined;
  const isGenerating = node.kind === "scene" && node.data.status === "generating";

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold tracking-[0.12em] text-ink">视频提示词</p>
        <p className="text-xs text-slate-500">
          {isGenerating ? "生成中..." : node.kind === "scene" ? `状态 · ${node.data.status}` : "互动节点"}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 p-4">
        <button
          type="button"
          onClick={onGenerateFirstFrame}
          disabled={node.kind !== "scene" || isGenerating}
          className="grid size-14 place-items-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          title="生成首帧"
        >
          <ImagePlus size={22} />
        </button>
        <div className="my-4 border-t border-dashed border-slate-200" />
        <textarea
          className="min-h-[360px] w-full resize-none border-0 text-sm leading-7 outline-none"
          value={prompt}
          onChange={(event) => {
            if (node.kind === "scene") onUpdate({ prompt: event.target.value });
          }}
          readOnly={node.kind !== "scene"}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 px-3 py-2">角色参考已注入</span>
            <span className="rounded-full border border-slate-200 px-3 py-2">5s</span>
            <span className="rounded-full border border-slate-200 px-3 py-2">9:16</span>
          </div>
          <button
            onClick={() => void onGenerate()}
            disabled={isGenerating}
            className="grid size-10 place-items-center rounded-xl bg-ink text-white disabled:opacity-50"
          >
            <ArrowUp size={17} />
          </button>
        </div>
      </div>
      {history && history.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-ink">生成历史</p>
          <div className="space-y-2">
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onApplyHistory(entry.id)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-xs hover:bg-slate-50"
              >
                <span className="line-clamp-1">{entry.prompt}</span>
                <span className="shrink-0 text-slate-400">{entry.kind} · {entry.provider}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function InteractionGestureEditor({
  node,
  nodes,
  selectedOptionId,
  onSelectOption,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onGenerate,
}: {
  node: Extract<StoryNode, { kind: "interaction" }>;
  nodes: StoryNode[];
  selectedOptionId?: string;
  onSelectOption: (id: string) => void;
  onAddOption: () => void;
  onUpdateOption: (optionId: string, patch: Partial<InteractionOption>) => void;
  onDeleteOption: (optionId: string) => void;
  onGenerate: () => void;
}) {
  const active = node.data.options.find((option) => option.id === selectedOptionId) ?? node.data.options[0];
  const targets = useMemo(() => nodes.filter((item) => item.id !== node.id), [nodes, node.id]);

  const setActionType = (type: InteractionOption["actionType"]) => {
    if (!active) return;
    const defaults: Record<InteractionOption["actionType"], Partial<InteractionOption>> = {
      tap: { actionValue: "(0.50, 0.50)", color: "#2f7df6", hotspot: active.hotspot ?? { x: 0.5, y: 0.5 } },
      swipe: { actionValue: "right", color: "#15a36b", hotspot: active.hotspot ?? { x: 0.5, y: 0.5 } },
      hold: { actionValue: "1500ms", color: "#d9468a", hotspot: active.hotspot ?? { x: 0.5, y: 0.5 } },
      rapidTap: { actionValue: "3x / 1500ms", color: "#d946ef", hotspot: active.hotspot ?? { x: 0.5, y: 0.5 } },
      choice: { actionValue: "A", color: "#8b5cf6", hotspot: active.hotspot ?? { x: 0.5, y: 0.5 } },
    };
    onUpdateOption(active.id, { actionType: type, ...defaults[type] });
  };

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">交互类型</p>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <GestureTypeButton active={active?.actionType === "tap"} icon={MousePointerClick} title="点击" detail="最多 6 个屏幕选项" onClick={() => setActionType("tap")} />
        <GestureTypeButton active={active?.actionType === "swipe"} icon={Hand} title="滑动" detail="单方向手势" onClick={() => setActionType("swipe")} />
        <GestureTypeButton active={active?.actionType === "hold"} icon={Timer} title="长按" detail="按住确认" onClick={() => setActionType("hold")} />
        <GestureTypeButton active={active?.actionType === "rapidTap"} icon={Zap} title="连续点击" detail="时间窗多次点击" onClick={() => setActionType("rapidTap")} />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">选项 ({node.data.options.length}/6)</p>
        <div className="flex gap-2">
          <button onClick={onGenerate} className="rounded-xl border border-pink-200 accent-soft px-3 py-2 text-sm font-semibold text-accent">
            生成循环视频
          </button>
          <button disabled={node.data.options.length >= 6} onClick={onAddOption} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">
            添加选项
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {node.data.options.map((option, index) => (
          <GestureOptionEditor
            key={option.id}
            option={option}
            index={index}
            active={option.id === active?.id}
            targets={targets}
            onSelect={() => onSelectOption(option.id)}
            onUpdate={(patch) => onUpdateOption(option.id, patch)}
            onDelete={() => onDeleteOption(option.id)}
          />
        ))}
      </div>
    </section>
  );
}

function GestureTypeButton({
  active,
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  active?: boolean;
  icon: typeof MousePointerClick;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={cn("rounded-xl border p-3 text-left", active ? "border-ink" : "border-slate-200 hover:bg-slate-50")}>
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-accent text-white">
          <Icon size={15} />
        </span>
        <span className="font-semibold">{title}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </button>
  );
}

function GestureOptionEditor({
  option,
  index,
  active,
  targets,
  onSelect,
  onUpdate,
  onDelete,
}: {
  option: InteractionOption;
  index: number;
  active: boolean;
  targets: StoryNode[];
  onSelect: () => void;
  onUpdate: (patch: Partial<InteractionOption>) => void;
  onDelete: () => void;
}) {
  const point = option.hotspot ?? parseHotspot(option.actionValue) ?? defaultHotspot(index);

  return (
    <div onClick={onSelect} className={cn("rounded-2xl border p-3", active ? "border-ink" : "border-slate-200")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-sky-500 text-xs font-bold text-white">{index + 1}</span>
          <span className="font-semibold">{actionTypeLabels[option.actionType]}</span>
          <span className="text-xs text-slate-500">({point.x.toFixed(2)}, {point.y.toFixed(2)})</span>
        </div>
        <button onClick={(event) => { event.stopPropagation(); onDelete(); }} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={option.label} onChange={(event) => onUpdate({ label: event.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="X" value={point.x} onChange={(value) => onUpdate({ hotspot: { x: clamp(value), y: point.y }, actionValue: `(${clamp(value).toFixed(2)}, ${point.y.toFixed(2)})` })} />
          <NumberInput label="Y" value={point.y} onChange={(value) => onUpdate({ hotspot: { x: point.x, y: clamp(value) }, actionValue: `(${point.x.toFixed(2)}, ${clamp(value).toFixed(2)})` })} />
        </div>
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={option.actionValue ?? ""} onChange={(event) => onUpdate({ actionValue: event.target.value })} />
        <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={option.targetNodeId ?? ""} onChange={(event) => onUpdate({ targetNodeId: event.target.value })}>
          <option value="">未连接</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>{target.data.title}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" type="number" min={0} max={1} step={0.01} value={value} onChange={(event) => onChange(Number(event.target.value))} />
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
