"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowUp,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Film,
  Hand,
  Images,
  Info,
  Link2,
  MousePointerClick,
  RotateCcw,
  Smartphone,
  Sparkles,
  Timer,
  Trash2,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { actionTypeLabels } from "@/lib/worldBuilderLabels";
import { cn } from "@/lib/utils";
import { MODAL_OVERLAY, MODAL_PANEL } from "@/lib/modalTheme";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type {
  Character,
  InteractionOption,
  Location,
  SceneNodeData,
  StoryNode,
} from "@/types/worldBuilder";

type EditTab = "video" | "interaction";

const VIDEO_MODELS = [
  { id: "seedance-2.0-fast", label: "Seedance 2.0 Fast" },
  { id: "seedance-2.0", label: "Seedance 2.0" },
  { id: "kling-1.6", label: "Kling 1.6" },
] as const;

const ASPECTS = ["9:16", "16:9", "1:1"] as const;
const DURATIONS = [4, 5, 8] as const;

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
    submitNodeFrame,
    submitInteractionLoopVideo,
    applyGenerationHistory,
  } = useWorldBuilderStore();
  const node = nodes.find((item) => item.id === selectedNodeId);
  const [tab, setTab] = useState<EditTab>("video");
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>();

  // 打开/切换节点时：互动默认互动页，视频/结局默认视频页
  useEffect(() => {
    if (!node) return;
    setTab(node.kind === "interaction" ? "interaction" : "video");
    setSelectedOptionId(undefined);
  }, [node?.id, node?.kind]);

  if (!open || !node) return null;

  // 结局仅视频页；视频/互动节点可切换（视频节点的「互动」页为说明，不混用手势编辑器）
  const activeTab: EditTab = node.kind === "ending" ? "video" : tab;

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
      return;
    }
    if (node.kind === "interaction") {
      // 互动：首尾帧 → 数秒无缝循环（无首帧时先走帧菜单生成）
      if (!node.data.firstFrameRef) return;
      await submitInteractionLoopVideo(node.id);
    }
  };

  const handleResetMedia = () => {
    if (node.kind === "scene") {
      updateNode(node.id, {
        videoUrl: undefined,
        firstFrameRef: undefined,
        lastFrameRef: undefined,
        status: "draft",
      });
    }
    if (node.kind === "interaction") {
      updateNode(node.id, {
        loopVideoUrl: undefined,
        firstFrameRef: undefined,
        lastFrameRef: undefined,
      });
      node.data.options.forEach((option, index) => {
        const point = defaultHotspot(index);
        updateOption(node.id, option.id, {
          hotspot: point,
          actionValue:
            option.actionType === "tap"
              ? `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`
              : option.actionValue,
        });
      });
    }
  };

  const handleDownloadNode = () => {
    downloadJson(`${node.id}.json`, JSON.stringify(node, null, 2));
  };

  /** 仅互动节点显示「互动」页签，避免视频节点与互动节点混淆 */
  const isInteractionNode = node.kind === "interaction";
  const isVideoNode = node.kind === "scene";

  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div
        className={cn(
          MODAL_PANEL,
          "grid max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[28px] lg:grid-cols-[470px_1fr]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <PreviewPane
          node={node}
          selectedOptionId={selectedOptionId}
          onSelectOption={setSelectedOptionId}
          onMoveHotspot={updateOptionHotspot}
          onUpload={handleUpload}
          onDownload={handleDownloadNode}
          onReset={handleResetMedia}
        />

        <section className="overflow-y-auto bg-[#0c0c0e] p-6 text-white">
          <div className="flex items-start gap-4">
            <label className="block min-w-0 flex-1">
              <span className="text-xs font-medium text-white/45">Name</span>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition-[border-color] duration-150 ease-de-out focus:border-white/30"
                value={node.data.title}
                placeholder={
                  isVideoNode
                    ? "未命名视频节点"
                    : isInteractionNode
                      ? "未命名互动节点"
                      : "未命名结局"
                }
                onChange={(event) => updateNode(node.id, { title: event.target.value })}
              />
            </label>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭节点编辑器"
              className="btn-press grid size-9 place-items-center rounded-xl text-white/55 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* 视频 / 互动节点均保留双页签（图1）；结局仅视频生成 */}
          {node.kind !== "ending" ? (
            <div className="mt-4 flex gap-5 border-b border-white/10 text-sm">
              <button
                type="button"
                onClick={() => setTab("video")}
                className={cn(
                  "border-b-2 px-1 py-3 transition-colors duration-150 ease-de-out",
                  activeTab === "video"
                    ? "border-white font-semibold text-white"
                    : "border-transparent text-white/45 hover:text-white/70",
                )}
              >
                视频生成
              </button>
              <button
                type="button"
                onClick={() => setTab("interaction")}
                className={cn(
                  "border-b-2 px-1 py-3 transition-colors duration-150 ease-de-out",
                  activeTab === "interaction"
                    ? "border-white font-semibold text-white"
                    : "border-transparent text-white/45 hover:text-white/70",
                )}
              >
                互动
              </button>
            </div>
          ) : (
            <div className="mt-4 flex gap-5 border-b border-white/10 text-sm">
              <span className="border-b-2 border-white px-1 py-3 font-semibold text-white">
                视频生成
              </span>
            </div>
          )}

          {activeTab === "video" && (
            <>
              <MentionsSection
                characters={characters}
                locations={locations}
                mentionedCharacterIds={
                  node.kind === "ending" ? [] : (node.data.mentionedCharacterIds ?? [])
                }
                mentionedLocationIds={
                  node.kind === "ending" ? [] : (node.data.mentionedLocationIds ?? [])
                }
                onToggleCharacter={(id) => {
                  if (node.kind === "ending") return;
                  const cur = new Set(node.data.mentionedCharacterIds ?? []);
                  if (cur.has(id)) cur.delete(id);
                  else cur.add(id);
                  updateNode(node.id, { mentionedCharacterIds: [...cur] });
                }}
                onToggleLocation={(id) => {
                  if (node.kind === "ending") return;
                  const cur = new Set(node.data.mentionedLocationIds ?? []);
                  if (cur.has(id)) cur.delete(id);
                  else cur.add(id);
                  updateNode(node.id, { mentionedLocationIds: [...cur] });
                }}
              />
              <VideoGenerationEditor
                node={node}
                characters={characters}
                locations={locations}
                nodes={nodes}
                onUpdate={(patch) => updateNode(node.id, patch)}
                onGenerate={handleGenerate}
                onGenerateFrame={(field) => submitNodeFrame(node.id, field)}
                onApplyHistory={(entryId) => applyGenerationHistory(node.id, entryId)}
              />
            </>
          )}

          {activeTab === "interaction" && isInteractionNode && (
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

          {activeTab === "interaction" && isVideoNode && (
            <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-8 text-center">
              <MousePointerClick size={22} className="mx-auto text-white/35" />
              <p className="mt-3 text-sm font-medium text-white/80">互动配置属于互动节点</p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/40">
                本页是视频节点：生成镜头与连续性。选项、热区与分支请在画布上的互动节点中编辑。
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MentionsSection({
  characters,
  locations,
  mentionedCharacterIds,
  mentionedLocationIds,
  onToggleCharacter,
  onToggleLocation,
}: {
  characters: Character[];
  locations: Location[];
  mentionedCharacterIds: string[];
  mentionedLocationIds: string[];
  onToggleCharacter: (id: string) => void;
  onToggleLocation: (id: string) => void;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          <Info size={12} className="opacity-70" />
          Mentions
        </p>
        <Link
          href="/world-builder"
          className="inline-flex items-center gap-1 text-xs font-medium text-white/70 transition hover:text-accent"
        >
          Open World Builder <ExternalLink size={12} />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs text-white/40">Characters</p>
          <div className="flex flex-wrap gap-2">
            {characters.length === 0 && (
              <span className="text-xs text-white/35">Type @ to mention</span>
            )}
            {characters.map((c) => {
              const selected = mentionedCharacterIds.includes(c.id);
              const img = c.previewImage || c.referenceImage;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggleCharacter(c.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition",
                    selected
                      ? "border-white/35 bg-white/12"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20",
                  )}
                >
                  <span className="relative size-8 overflow-hidden rounded-lg bg-white/10">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center text-[10px] text-white/50">
                        {c.name.slice(0, 1)}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-white">{c.name}</span>
                    {c.role && (
                      <span className="block truncate text-[10px] text-white/40">{c.role}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-white/40">Locations</p>
          <div className="flex flex-wrap gap-2">
            {locations.length === 0 && (
              <span className="text-xs text-white/35">Type @ to mention</span>
            )}
            {locations.map((loc) => {
              const selected = mentionedLocationIds.includes(loc.id);
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => onToggleLocation(loc.id)}
                  className={cn(
                    "btn-press rounded-xl border px-2.5 py-1.5 text-xs",
                    selected
                      ? "border-white/35 bg-white/12 text-white"
                      : "border-white/10 text-white/60 hover:border-white/20",
                  )}
                >
                  {loc.name}
                </button>
              );
            })}
            {locations.length > 0 && mentionedLocationIds.length === 0 && (
              <span className="self-center text-xs text-white/30">Type @ to mention</span>
            )}
          </div>
        </div>
      </div>
    </section>
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
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    optionId: string;
    pointerId: number;
    moved: boolean;
    origin: { x: number; y: number };
    point: { x: number; y: number };
    el: HTMLElement;
    rect: DOMRect;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const detachDragListeners = useRef<(() => void) | null>(null);

  const previewUrl =
    node.kind === "scene"
      ? node.data.videoUrl ?? node.data.firstFrameRef
      : node.kind === "interaction"
        ? node.data.loopVideoUrl && !node.data.loopVideoUrl.startsWith("mock://")
          ? node.data.loopVideoUrl
          : node.data.firstFrameRef ?? node.data.lastFrameRef
        : undefined;
  const hasPlayablePreview = Boolean(previewUrl && !previewUrl.startsWith("mock://"));
  const isLoopVideo =
    isInteraction &&
    Boolean(node.data.loopVideoUrl && !node.data.loopVideoUrl.startsWith("mock://"));

  useEffect(() => {
    return () => {
      detachDragListeners.current?.();
      detachDragListeners.current = null;
      dragRef.current = null;
    };
  }, []);

  const pointFromClient = (clientX: number, clientY: number, rect?: DOMRect) => {
    const box = rect ?? stageRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || box.height <= 0) return { x: 0.5, y: 0.5 };
    return {
      x: clamp((clientX - box.left) / box.width),
      y: clamp((clientY - box.top) / box.height),
    };
  };

  const applyMarkerPos = (
    el: HTMLElement,
    point: { x: number; y: number },
    rect: DOMRect,
  ) => {
    // 拖动中只改 transform（合成层），松手再写 store，避免每帧重渲染
    el.style.transform = `translate3d(${point.x * rect.width}px, ${point.y * rect.height}px, 0) translate(-50%, -50%)`;
  };

  const handleStageClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isInteraction || !activeOptionId || suppressClickRef.current) return;
    if (dragRef.current) return;
    onMoveHotspot(activeOptionId, pointFromClient(event.clientX, event.clientY));
  };

  const endDrag = (commit: boolean) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    detachDragListeners.current?.();
    detachDragListeners.current = null;
    try {
      drag.el.releasePointerCapture(drag.pointerId);
    } catch {
      /* already released */
    }
    drag.el.style.willChange = "";
    drag.el.style.cursor = "";
    if (drag.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    onSelectOption(drag.optionId);
    if (commit && drag.moved) {
      onMoveHotspot(drag.optionId, drag.point);
    } else {
      // 未移动或取消：还原到拖动前坐标
      drag.el.style.left = `${drag.origin.x * 100}%`;
      drag.el.style.top = `${drag.origin.y * 100}%`;
      drag.el.style.transform = "translate(-50%, -50%)";
    }
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
    <section className="relative bg-[#08080a] p-5">
      <div className="absolute left-5 top-5 z-10 flex gap-2">
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="video/*,image/*"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-press inline-flex items-center gap-2 rounded-lg border border-white/45 bg-black/40 px-3 py-2 text-sm font-semibold text-white backdrop-blur"
        >
          <Upload size={15} /> 上传
        </button>
      </div>
      <div className="absolute right-5 top-5 z-10 flex gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="btn-press grid size-9 place-items-center rounded-lg border border-white/35 bg-black/40 text-white"
        >
          <Download size={16} />
        </button>
        <button
          type="button"
          onClick={onReset}
          className="btn-press grid size-9 place-items-center rounded-lg border border-white/35 bg-black/40 text-white"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div
        ref={stageRef}
        onClick={isInteraction ? handleStageClick : undefined}
        className={cn(
          "relative mx-auto aspect-[9/16] max-h-[82vh] overflow-hidden rounded-2xl border border-white/10 bg-[#121214] text-white",
          isInteraction && "cursor-crosshair",
        )}
      >
        {hasPlayablePreview &&
          (previewUrl?.startsWith("data:image") || /\.(png|jpe?g|webp)(\?|$)/i.test(previewUrl ?? "") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="节点预览"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <video
              src={previewUrl}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="absolute inset-0 h-full w-full object-cover"
            />
          ))}
        {!hasPlayablePreview && (
          <div className="de-project-matrix pointer-events-none absolute inset-0" aria-hidden>
            <div className="de-project-matrix-shine absolute inset-0" />
          </div>
        )}
        {!isInteraction && (
          <div className="absolute bottom-4 right-4 z-[1]">
            <button
              type="button"
              className="btn-press grid size-10 place-items-center rounded-full border border-white/12 bg-black/55 text-white backdrop-blur"
              title="播放"
            >
              <Film size={18} />
            </button>
          </div>
        )}
        {isLoopVideo && (
          <div className="pointer-events-none absolute left-3 top-3 z-[1] rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur">
            Loop · {node.data.durationSec ?? 4}s
          </div>
        )}
        {isInteraction && !hasPlayablePreview && (
          <div className="pointer-events-none absolute inset-0 z-[1] grid place-items-center px-8 text-center text-sm text-white/45">
            设置首尾帧并生成循环视频后，可在此放置互动选项
          </div>
        )}
        {options.map((option, index) => {
          const point = option.hotspot ?? parseHotspot(option.actionValue) ?? defaultHotspot(index);
          const active = option.id === activeOptionId;
          return (
            <button
              key={option.id}
              type="button"
              data-hotspot={option.id}
              className={cn(
                "absolute left-0 top-0 z-[2] touch-none text-center select-none",
                "cursor-grab active:cursor-grabbing",
              )}
              style={{
                // 初始用 % 定位；拖动开始后改成 px translate3d（applyMarkerPos）
                left: `${point.x * 100}%`,
                top: `${point.y * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                event.preventDefault();
                const stage = stageRef.current;
                if (!stage) return;
                const rect = stage.getBoundingClientRect();
                const el = event.currentTarget;
                const pointerId = event.pointerId;
                el.setPointerCapture(pointerId);
                el.style.willChange = "transform";
                el.style.left = "0px";
                el.style.top = "0px";
                dragRef.current = {
                  optionId: option.id,
                  pointerId,
                  moved: false,
                  origin: point,
                  point,
                  el,
                  rect,
                };
                // 按下时保持原点，避免抓取瞬间跳动；位移后再跟随指针
                applyMarkerPos(el, point, rect);

                const onMove = (ev: PointerEvent) => {
                  const drag = dragRef.current;
                  if (!drag || ev.pointerId !== drag.pointerId) return;
                  const nextPoint = pointFromClient(ev.clientX, ev.clientY, drag.rect);
                  if (
                    Math.abs(nextPoint.x - drag.origin.x) > 0.004 ||
                    Math.abs(nextPoint.y - drag.origin.y) > 0.004
                  ) {
                    drag.moved = true;
                  }
                  drag.point = nextPoint;
                  applyMarkerPos(drag.el, nextPoint, drag.rect);
                };
                const onUp = (ev: PointerEvent) => {
                  if (dragRef.current?.pointerId === ev.pointerId) endDrag(true);
                };
                const onCancel = (ev: PointerEvent) => {
                  if (dragRef.current?.pointerId === ev.pointerId) endDrag(false);
                };
                window.addEventListener("pointermove", onMove, { passive: true });
                window.addEventListener("pointerup", onUp);
                window.addEventListener("pointercancel", onCancel);
                detachDragListeners.current = () => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                  window.removeEventListener("pointercancel", onCancel);
                };
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (suppressClickRef.current) return;
                onSelectOption(option.id);
              }}
            >
              <span
                className={
                  active
                    ? "grid size-14 place-items-center rounded-full border-2 border-white/80 bg-white/12 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur"
                    : "grid size-11 place-items-center rounded-full border border-white/50 bg-black/40 backdrop-blur"
                }
              >
                <MousePointerClick size={22} />
              </span>
              <span className="absolute -right-1 -top-2 grid size-6 place-items-center rounded-full bg-sky-200 text-xs font-bold text-neutral-900">
                {index + 1}
              </span>
              <span className="mt-1 block max-w-28 truncate rounded-lg bg-black/65 px-2 py-1 text-[11px] font-semibold text-white">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function VideoGenerationEditor({
  node,
  characters,
  locations,
  nodes,
  onUpdate,
  onGenerate,
  onGenerateFrame,
  onApplyHistory,
}: {
  node: StoryNode;
  characters: Character[];
  locations: Location[];
  nodes: StoryNode[];
  onUpdate: (patch: Partial<SceneNodeData & { instruction?: string }>) => void;
  onGenerate: () => void | Promise<void>;
  onGenerateFrame: (field: "firstFrameRef" | "lastFrameRef") => Promise<string | null>;
  onApplyHistory: (entryId: string) => void;
}) {
  const firstRef =
    node.kind === "scene" || node.kind === "interaction" ? node.data.firstFrameRef : undefined;
  const lastRef =
    node.kind === "scene" || node.kind === "interaction" ? node.data.lastFrameRef : undefined;
  const prompt =
    node.kind === "scene"
      ? node.data.prompt
      : node.kind === "interaction"
        ? node.data.instruction
        : node.data.description;
  const history =
    node.kind === "scene" || node.kind === "interaction"
      ? node.data.generationHistory
      : undefined;
  const isGenerating =
    (node.kind === "scene" && node.data.status === "generating") ||
    ((node.kind === "scene" || node.kind === "interaction") &&
      Boolean(node.data.activeGenerationTaskId));
  const model =
    (node.kind === "scene" || node.kind === "interaction"
      ? node.data.videoModel
      : undefined) ?? "seedance-2.0-fast";
  const aspect =
    (node.kind === "scene" || node.kind === "interaction"
      ? node.data.aspectRatio
      : undefined) ?? "9:16";
  const duration =
    (node.kind === "scene" || node.kind === "interaction"
      ? node.data.durationSec
      : undefined) ?? 4;

  const setPrompt = (value: string) => {
    if (node.kind === "scene") onUpdate({ prompt: value });
    else if (node.kind === "interaction") onUpdate({ instruction: value });
  };

  const insertMention = (name: string) => {
    const token = `@${name} `;
    setPrompt(`${prompt}${prompt.endsWith(" ") || !prompt ? "" : " "}${token}`);
  };

  const mentionedNames = useMemo(() => {
    if (node.kind === "ending") return [];
    const ids = node.data.mentionedCharacterIds ?? [];
    return characters.filter((c) => ids.includes(c.id)).map((c) => c.name);
  }, [characters, node]);

  const libraryAssets = useMemo(() => {
    const items: Array<{ id: string; label: string; url: string; tag?: string }> = [];
    characters.forEach((c) => {
      const url = c.previewImage || c.referenceImage;
      if (url) items.push({ id: `char-${c.id}`, label: c.name, url, tag: "Character" });
    });
    locations.forEach((loc) => {
      if (loc.referenceImage) {
        items.push({
          id: `loc-${loc.id}`,
          label: loc.name,
          url: loc.referenceImage,
          tag: "Location",
        });
      }
    });
    nodes.forEach((n) => {
      if (n.kind === "scene" || n.kind === "interaction") {
        if (n.data.firstFrameRef) {
          items.push({
            id: `${n.id}-first`,
            label: n.data.title,
            url: n.data.firstFrameRef,
            tag: "First frame",
          });
        }
        if (n.data.lastFrameRef) {
          items.push({
            id: `${n.id}-last`,
            label: n.data.title,
            url: n.data.lastFrameRef,
            tag: "Last frame",
          });
        }
      }
    });
    return items.slice(0, 24);
  }, [characters, locations, nodes]);

  const setFrame = (field: "firstFrameRef" | "lastFrameRef", url?: string) => {
    if (field === "firstFrameRef") {
      onUpdate({
        firstFrameRef: url,
        // 互动循环：设首帧时若无尾帧则同步，保证可无缝 loop
        ...(node.kind === "interaction" && url && !lastRef ? { lastFrameRef: url } : {}),
      });
      return;
    }
    onUpdate({ lastFrameRef: url });
  };

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Video Prompt
        </p>
        <p className="text-xs text-white/35">
          {isGenerating
            ? "生成中..."
            : node.kind === "scene"
              ? `状态 · ${node.data.status}`
              : "首尾帧 → 循环视频"}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        {/* First / Last frames */}
        <div className="mb-3 flex gap-3">
          <FrameSlot
            label="First"
            src={firstRef}
            libraryAssets={libraryAssets}
            siblingSrc={lastRef}
            siblingLabel="Last frame"
            generating={isGenerating}
            onSet={(url) => setFrame("firstFrameRef", url)}
            onGenerate={() => void onGenerateFrame("firstFrameRef")}
            onMatchSibling={() => lastRef && setFrame("firstFrameRef", lastRef)}
          />
          <FrameSlot
            label="Last"
            src={lastRef}
            libraryAssets={libraryAssets}
            siblingSrc={firstRef}
            siblingLabel="First frame"
            generating={isGenerating}
            onSet={(url) => setFrame("lastFrameRef", url)}
            onGenerate={() => void onGenerateFrame("lastFrameRef")}
            onMatchSibling={() => firstRef && setFrame("lastFrameRef", firstRef)}
          />
        </div>
        {node.kind === "interaction" && (
          <p className="mb-3 text-[11px] leading-relaxed text-white/35">
            互动节点用首尾帧生成 {duration}s 无缝循环视频；建议首尾一致或极近，仅保留微动作。
          </p>
        )}

        {mentionedNames.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {mentionedNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => insertMention(name)}
                className="btn-press rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/85"
              >
                @{name}
              </button>
            ))}
          </div>
        )}

        <textarea
          className="min-h-[220px] w-full resize-none border-0 bg-transparent text-sm leading-7 text-white/90 outline-none placeholder:text-white/30"
          value={prompt}
          placeholder={
            node.kind === "scene"
              ? "描述这段视频的剧情动作、构图、镜头运动和连续性要求。"
              : node.kind === "interaction"
                ? "描述循环镜头的微动作、构图与氛围（首尾帧需可无缝衔接）。"
                : "描述结局画面与情绪。"
          }
          onChange={(event) => setPrompt(event.target.value)}
        />

        {/* Bottom toolbar — Template / Model / Aspect / Duration / Generate */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <ToolbarSelect
            icon={<Wand2 size={14} />}
            label="Template"
            value="default"
            options={[{ id: "default", label: "Template" }]}
            onChange={() => undefined}
          />
          <ToolbarSelect
            icon={<Sparkles size={14} />}
            label="Model"
            value={model}
            options={VIDEO_MODELS.map((m) => ({ id: m.id, label: m.label }))}
            onChange={(id) => onUpdate({ videoModel: id })}
          />
          <ToolbarSelect
            icon={<Smartphone size={14} />}
            label="Aspect"
            value={aspect}
            options={ASPECTS.map((a) => ({ id: a, label: a }))}
            onChange={(id) =>
              onUpdate({ aspectRatio: id as "9:16" | "16:9" | "1:1" })
            }
          />
          <ToolbarSelect
            icon={<Clock size={14} />}
            label="Duration"
            value={String(duration)}
            options={DURATIONS.map((d) => ({ id: String(d), label: `${d}s` }))}
            onChange={(id) =>
              onUpdate({ durationSec: Number(id) as 4 | 5 | 8 })
            }
          />
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => void onGenerate()}
              disabled={
                isGenerating ||
                !prompt.trim() ||
                (node.kind === "interaction" && !firstRef)
              }
              title={
                node.kind === "interaction" && !firstRef
                  ? "请先设置或生成首帧"
                  : node.kind === "interaction"
                    ? "生成循环视频"
                    : "生成视频"
              }
              className="btn-press grid size-11 place-items-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.12)] hover:bg-white/92 disabled:opacity-40"
            >
              <ArrowUp size={17} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {history && history.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
            生成历史
          </p>
          <div className="space-y-2">
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onApplyHistory(entry.id)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-left text-xs text-white/70 transition hover:bg-white/[0.04]"
              >
                <span className="line-clamp-1">{entry.prompt}</span>
                <span className="shrink-0 text-white/35">
                  {entry.kind} · {entry.provider}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function FrameSlot({
  label,
  src,
  libraryAssets,
  siblingSrc,
  siblingLabel,
  generating,
  onSet,
  onGenerate,
  onMatchSibling,
}: {
  label: string;
  src?: string;
  libraryAssets: Array<{ id: string; label: string; url: string; tag?: string }>;
  siblingSrc?: string;
  siblingLabel?: string;
  generating?: boolean;
  onSet: (url?: string) => void;
  onGenerate: () => void;
  onMatchSibling: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <div ref={rootRef} className="relative flex w-[76px] flex-col items-center">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") onSet(reader.result);
          };
          reader.readAsDataURL(file);
          e.target.value = "";
          setMenuOpen(false);
        }}
      />
      <button
        type="button"
        disabled={generating}
        onClick={() => setMenuOpen((v) => !v)}
        className="flex size-[72px] items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/[0.04] transition hover:border-white/30 disabled:opacity-50"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-white/40">
            <Sparkles size={16} />
            <span className="text-[10px]">生成</span>
          </span>
        )}
      </button>
      <span className="mt-1.5 text-[11px] font-medium text-white/55">{label}</span>

      {menuOpen && (
        <div className="absolute left-0 top-[78px] z-30 min-w-[220px] overflow-hidden rounded-xl border border-white/12 bg-[#16141c] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
          <FrameMenuItem
            icon={<Upload size={14} />}
            label="Upload image"
            onClick={() => fileRef.current?.click()}
          />
          <FrameMenuItem
            icon={<Images size={14} />}
            label="Choose from library"
            onClick={() => setLibraryOpen((v) => !v)}
          />
          {libraryOpen && (
            <div className="max-h-40 overflow-y-auto border-y border-white/8 px-1 py-1">
              {libraryAssets.length === 0 ? (
                <p className="px-2 py-2 text-[11px] text-white/40">暂无可用资产</p>
              ) : (
                libraryAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      onSet(asset.url);
                      setMenuOpen(false);
                      setLibraryOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.06]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt="" className="size-7 rounded object-cover" />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-white/75">
                      {asset.label}
                    </span>
                    {asset.tag && (
                      <span className="shrink-0 text-[9px] text-white/35">{asset.tag}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
          {siblingSrc && (
            <button
              type="button"
              onClick={() => {
                onMatchSibling();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/80 hover:bg-white/[0.06]"
            >
              <Link2 size={14} className="shrink-0 opacity-70" />
              <span className="min-w-0 flex-1 truncate">
                {libraryAssets.find((a) => a.url === siblingSrc)?.label ?? "Linked frame"}
              </span>
              <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                {siblingLabel ?? "Link"}
              </span>
            </button>
          )}
          <div className="my-1 border-t border-white/8" />
          <FrameMenuItem
            icon={<Sparkles size={14} />}
            label={src ? "Regenerate frame" : "Generate frame"}
            onClick={() => {
              onGenerate();
              setMenuOpen(false);
            }}
          />
          {src && (
            <>
              <FrameMenuItem
                icon={<Eye size={14} />}
                label="View full size"
                onClick={() => {
                  setPreviewOpen(true);
                  setMenuOpen(false);
                }}
              />
              <FrameMenuItem
                icon={<Trash2 size={14} />}
                label="Remove"
                danger
                onClick={() => {
                  onSet(undefined);
                  setMenuOpen(false);
                }}
              />
            </>
          )}
        </div>
      )}

      {previewOpen && src && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreviewOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function FrameMenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] transition hover:bg-white/[0.06]",
        danger ? "text-red-300" : "text-white/85",
      )}
    >
      <span className="opacity-70">{icon}</span>
      {label}
    </button>
  );
}

function ToolbarSelect({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (id: string) => void;
}) {
  const current = options.find((o) => o.id === value)?.label ?? label;
  return (
    <label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/75 transition hover:border-white/20">
      <span className="opacity-70">{icon}</span>
      <span className="max-w-[9rem] truncate font-medium">{current}</span>
      <ChevronDown size={12} className="opacity-50" />
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
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
  const active =
    node.data.options.find((option) => option.id === selectedOptionId) ?? node.data.options[0];
  const targets = useMemo(() => nodes.filter((item) => item.id !== node.id), [nodes, node.id]);

  const setActionType = (type: InteractionOption["actionType"]) => {
    if (!active) return;
    const defaults: Record<InteractionOption["actionType"], Partial<InteractionOption>> = {
      tap: {
        actionValue: "(0.50, 0.50)",
        color: "#2f7df6",
        hotspot: active.hotspot ?? { x: 0.5, y: 0.5 },
      },
      swipe: {
        actionValue: "right",
        color: "#15a36b",
        hotspot: active.hotspot ?? { x: 0.5, y: 0.5 },
      },
      hold: {
        actionValue: "1500ms",
        color: "#d9468a",
        hotspot: active.hotspot ?? { x: 0.5, y: 0.5 },
      },
      rapidTap: {
        actionValue: "3x / 1500ms",
        color: "#d946ef",
        hotspot: active.hotspot ?? { x: 0.5, y: 0.5 },
      },
      choice: {
        actionValue: "A",
        color: "#8b5cf6",
        hotspot: active.hotspot ?? { x: 0.5, y: 0.5 },
      },
    };
    onUpdateOption(active.id, { actionType: type, ...defaults[type] });
  };

  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">交互类型</p>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <GestureTypeButton
          active={active?.actionType === "tap"}
          icon={MousePointerClick}
          title="点击"
          detail="最多 6 个屏幕选项"
          onClick={() => setActionType("tap")}
        />
        <GestureTypeButton
          active={active?.actionType === "swipe"}
          icon={Hand}
          title="滑动"
          detail="单方向手势"
          onClick={() => setActionType("swipe")}
        />
        <GestureTypeButton
          active={active?.actionType === "hold"}
          icon={Timer}
          title="长按"
          detail="按住确认"
          onClick={() => setActionType("hold")}
        />
        <GestureTypeButton
          active={active?.actionType === "rapidTap"}
          icon={Zap}
          title="连续点击"
          detail="时间窗多次点击"
          onClick={() => setActionType("rapidTap")}
        />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
          选项 ({node.data.options.length}/6)
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGenerate}
            className="rounded-xl border border-accent/30 bg-accent/15 px-3 py-2 text-sm font-semibold text-accent"
          >
            生成循环视频
          </button>
          <button
            type="button"
            disabled={node.data.options.length >= 6}
            onClick={onAddOption}
            className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 disabled:opacity-40"
          >
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition",
        active ? "border-white/40 bg-white/[0.06]" : "border-white/10 hover:bg-white/[0.04]",
      )}
    >
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
    <div
      onClick={onSelect}
      className={cn(
        "rounded-2xl border p-3",
        active ? "border-white/35 bg-white/[0.04]" : "border-white/10",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-sky-500 text-xs font-bold text-white">
            {index + 1}
          </span>
          <span className="font-semibold text-white">{actionTypeLabels[option.actionType]}</span>
          <span className="text-xs text-white/40">
            ({point.x.toFixed(2)}, {point.y.toFixed(2)})
          </span>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-red-500/15 hover:text-red-300"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        <input
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          value={option.label}
          onChange={(event) => onUpdate({ label: event.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="X"
            value={point.x}
            onChange={(value) =>
              onUpdate({
                hotspot: { x: clamp(value), y: point.y },
                actionValue: `(${clamp(value).toFixed(2)}, ${point.y.toFixed(2)})`,
              })
            }
          />
          <NumberInput
            label="Y"
            value={point.y}
            onChange={(value) =>
              onUpdate({
                hotspot: { x: point.x, y: clamp(value) },
                actionValue: `(${point.x.toFixed(2)}, ${clamp(value).toFixed(2)})`,
              })
            }
          />
        </div>
        <input
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          value={option.actionValue ?? ""}
          onChange={(event) => onUpdate({ actionValue: event.target.value })}
        />
        <select
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          value={option.targetNodeId ?? ""}
          onChange={(event) => onUpdate({ targetNodeId: event.target.value })}
        >
          <option value="">未连接</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.data.title}
            </option>
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

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="text-xs font-semibold text-white/40">{label}</span>
      <input
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
        type="number"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
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
