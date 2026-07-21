"use client";

import { useRef, useState } from "react";
import {
  Camera, Film, ImagePlus, MapPin, MousePointerClick,
  PenLine, Plus, Search, Trash2, Upload, UserRound, Wand2, X, ZoomIn,
} from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { setDramaAssetDragData } from "@/lib/dramaAssetDrag";
import { cn } from "@/lib/utils";
import { locationTypeLabels, statusLabels } from "@/lib/worldBuilderLabels";
import { uploadReference } from "@/lib/worldBuilderApi";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Character, InteractionNodeData, Location, SceneNodeData, StoryNode } from "@/types/worldBuilder";
import type { ReactNode } from "react";
import Link from "next/link";

type AssetTab = "characters" | "locations" | "videos" | "interactions" | "references";

const tabInfo: Record<AssetTab, { label: string; icon: typeof UserRound }> = {
  characters: { label: "角色参考", icon: UserRound },
  locations: { label: "地点参考", icon: MapPin },
  videos: { label: "视频节点", icon: Film },
  interactions: { label: "交互节点", icon: MousePointerClick },
  references: { label: "世界参考", icon: ImagePlus },
};

export default function AssetsPage() {
  const [tab, setTab] = useState<AssetTab>("characters");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const {
    characters, locations, nodes,
    addCharacter, updateCharacter, deleteCharacter,
    addLocation, updateLocation, deleteLocation,
    updateNode, addSceneNode, addInteractionNode,
    generateAllMockVideos,
    submitReferenceImageGeneration,
  } = useWorldBuilderStore();

  const scenes = nodes.filter((n) => n.kind === "scene");
  const interactions = nodes.filter((n) => n.kind === "interaction");

  /* === Edit panel state === */
  const [panel, setPanel] = useState<{
    mode: "char" | "loc" | "video" | "interaction";
    id?: string;
  } | null>(null);

  const [charForm, setCharForm] = useState<Character>({ id: "", name: "", role: "", description: "" });
  const [locForm, setLocForm] = useState<Location>({ id: "", name: "", type: "Master", description: "" });
  const [videoForm, setVideoForm] = useState<{ id: string; title: string; prompt: string; videoUrl: string; status: SceneNodeData["status"] }>({ id: "", title: "", prompt: "", videoUrl: "", status: "empty" });
  const [intForm, setIntForm] = useState<{ id: string; title: string; instruction: string }>({ id: "", title: "", instruction: "" });
  const [preview, setPreview] = useState<{ src: string; alt: string; kind?: "image" | "video" } | null>(null);
  const cardUploadTargetRef = useRef<{ type: "character" | "location"; id: string } | null>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);

  const openCharPanel = (c?: Character) => { setCharForm(c ?? { id: "", name: "", role: "", description: "" }); setPanel({ mode: "char", id: c?.id }); };
  const openLocPanel = (l?: Location) => { setLocForm(l ?? { id: "", name: "", type: "Master", description: "" }); setPanel({ mode: "loc", id: l?.id }); };
  const openVideoPanel = (s: StoryNode & { kind: "scene" }) => {
    setVideoForm({ id: s.id, title: s.data.title, prompt: s.data.prompt, videoUrl: s.data.videoUrl ?? "", status: s.data.status });
    setPanel({ mode: "video", id: s.id });
  };
  const openIntPanel = (n: StoryNode & { kind: "interaction" }) => {
    setIntForm({ id: n.id, title: n.data.title, instruction: n.data.instruction });
    setPanel({ mode: "interaction", id: n.id });
  };

  /* Save handlers */
  const saveChar = () => {
    if (!charForm.name.trim()) return;
    if (panel?.id) updateCharacter(panel.id, charForm);
    else addCharacter({ name: charForm.name, age: charForm.age, role: charForm.role, description: charForm.description, referenceImage: charForm.referenceImage });
    setPanel(null);
  };
  const saveLoc = () => {
    if (!locForm.name.trim()) return;
    if (panel?.id) updateLocation(panel.id, locForm);
    else addLocation({ name: locForm.name, type: locForm.type, description: locForm.description, referenceImage: locForm.referenceImage });
    setPanel(null);
  };
  const saveVideo = () => {
    if (!videoForm.title.trim() || !panel?.id) return;
    updateNode(panel.id, { title: videoForm.title, prompt: videoForm.prompt, videoUrl: videoForm.videoUrl || undefined, status: videoForm.status });
    setPanel(null);
  };
  const saveInt = () => {
    if (!intForm.title.trim() || !panel?.id) return;
    updateNode(panel.id, { title: intForm.title, instruction: intForm.instruction });
    setPanel(null);
  };

  const handleGenerateReference = async (entityType: "character" | "location", entity: Character | Location) => {
    const prompt = `${entity.name}，${"role" in entity ? entity.role : ""} ${entity.description || "参考图"}`.trim();
    const taskId = await submitReferenceImageGeneration(entityType, entity.id, prompt);
    setNotice(taskId ? `已提交「${entity.name}」参考图生成任务` : `「${entity.name}」参考图生成失败`);
  };

  const handleImage = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result !== "string") return;
      if (panel?.mode === "char") setCharForm((f) => ({ ...f, referenceImage: r.result as string }));
      if (panel?.mode === "loc") setLocForm((f) => ({ ...f, referenceImage: r.result as string }));
    };
    r.readAsDataURL(file);
  };

  const triggerCardUpload = (type: "character" | "location", id: string) => {
    cardUploadTargetRef.current = { type, id };
    cardFileInputRef.current?.click();
  };

  const applyReferenceImage = (
    type: "character" | "location",
    id: string,
    referenceImage: string,
    name: string,
  ) => {
    if (type === "character") updateCharacter(id, { referenceImage });
    else updateLocation(id, { referenceImage });
    setNotice(`已更新「${name}」参考图`);
  };

  const handleCardImageUpload = async (file: File) => {
    const target = cardUploadTargetRef.current;
    if (!target) return;

    const entity =
      target.type === "character"
        ? characters.find((item) => item.id === target.id)
        : locations.find((item) => item.id === target.id);
    const entityName = entity?.name ?? "素材";

    try {
      const uploaded = await uploadReference(file, "assets");
      if (uploaded.kind === "image") {
        applyReferenceImage(target.type, target.id, uploaded.url, entityName);
        return;
      }
    } catch {
      /* fallback to local data URL */
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      applyReferenceImage(target.type, target.id, reader.result, entityName);
    };
    reader.readAsDataURL(file);
  };

  const handlePreviewAreaClick = (
    referenceImage: string | undefined,
    alt: string,
    uploadTarget?: { type: "character" | "location"; id: string },
  ) => {
    if (referenceImage) {
      setPreview({ src: referenceImage, alt, kind: "image" });
      return;
    }
    if (uploadTarget) triggerCardUpload(uploadTarget.type, uploadTarget.id);
  };

  /* Filters */
  const filteredChars = characters.filter((c) => `${c.name} ${c.role} ${c.description}`.toLowerCase().includes(query.toLowerCase()));
  const filteredLocs = locations.filter((l) => `${l.name} ${l.description}`.toLowerCase().includes(query.toLowerCase()));
  const filteredScenes = scenes.filter((s) => `${s.data.title} ${s.data.prompt}`.toLowerCase().includes(query.toLowerCase()));
  const filteredInts = interactions.filter((n) => `${n.data.title} ${n.data.instruction}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <WorldBuilderLayout agentMode="none">
      <input
        ref={cardFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleCardImageUpload(file);
          e.target.value = "";
        }}
      />
      <div className="flex min-h-full flex-col bg-[#0c0a0f] text-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Asset Dock</p>
            <h1 className="text-sm font-semibold">素材库 · 可拖入故事画布</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <Search size={14} className="text-white/35" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索素材"
                className="w-44 bg-transparent text-sm outline-none placeholder:text-white/30"
              />
            </label>
            <button
              onClick={generateAllMockVideos}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/10"
            >
              <Wand2 size={15} /> 批量生成
            </button>
            <Link
              href="/world-builder/story-graph"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              <Film size={15} /> 打开画布投放
            </Link>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-44 shrink-0 border-r border-white/8 p-3 md:block">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">类别</p>
            <div className="mt-2 space-y-1">
              {(Object.keys(tabInfo) as AssetTab[]).map((key) => {
                const { label, icon: Icon } = tabInfo[key];
                const count =
                  key === "characters"
                    ? characters.length
                    : key === "locations"
                      ? locations.length
                      : key === "videos"
                        ? scenes.length
                        : key === "interactions"
                          ? interactions.length
                          : 0;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition",
                      tab === key ? "bg-accent/20 text-accent" : "text-white/50 hover:bg-white/6 hover:text-white/80",
                    )}
                  >
                    <Icon size={14} />
                    <span className="flex-1">{label}</span>
                    <span className="text-[10px] opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-6 px-2 text-[10px] leading-4 text-white/30">
              拖拽卡片到故事图画布空白处，即可生成节点（TapNow 式投放）。
            </p>
          </aside>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-4 flex flex-wrap gap-1 md:hidden">
              {(Object.keys(tabInfo) as AssetTab[]).map((key) => {
                const { label, icon: Icon } = tabInfo[key];
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs",
                      tab === key ? "bg-accent text-white" : "bg-white/6 text-white/55",
                    )}
                  >
                    <Icon size={13} /> {label}
                  </button>
                );
              })}
            </div>

        {/* === Characters === */}
        {tab === "characters" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredChars.map((c) => (
              <article
                key={c.id}
                draggable
                onDragStart={(e) =>
                  setDramaAssetDragData(e.dataTransfer, {
                    kind: "character",
                    title: c.name,
                    prompt: `${c.name} · ${c.role} · ${c.description}`,
                    characterId: c.id,
                    referenceImage: c.referenceImage,
                  })
                }
                className="group cursor-grab overflow-hidden rounded-2xl border border-white/10 bg-[#16141c] shadow-soft active:cursor-grabbing hover:border-accent/40 transition-all"
              >
                <AssetPreviewFrame
                  imageUrl={c.referenceImage}
                  alt={c.name}
                  placeholder={<Camera size={40} />}
                  emptyHint="点击上传参考图"
                  filledHint="点击预览"
                  onAreaClick={() =>
                    handlePreviewAreaClick(c.referenceImage, c.name, {
                      type: "character",
                      id: c.id,
                    })
                  }
                >
                  <AssetCardActions>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleGenerateReference("character", c);
                      }}
                      className="grid size-8 place-items-center rounded-lg bg-accent/90 text-white hover:bg-accent"
                      title="AI 生成参考图"
                    >
                      <Wand2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCharPanel(c);
                      }}
                      className="grid size-8 place-items-center rounded-lg bg-white/90 text-ink hover:bg-white"
                    >
                      <PenLine size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCharacter(c.id);
                        setNotice(`已删除「${c.name}」`);
                      }}
                      className="grid size-8 place-items-center rounded-lg bg-red-500/90 text-white hover:bg-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </AssetCardActions>
                </AssetPreviewFrame>
                <div className="p-4">
                  <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">{c.role || "未设定"}</span>
                  <h3 className="mt-2 text-lg font-semibold text-white">{c.name}</h3>
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-white/50">{c.description}</p>
                  {c.age && <p className="mt-2 text-xs text-white/35">{c.age} 岁</p>}
                </div>
              </article>
            ))}
            <button onClick={() => openCharPanel()} className="grid min-h-[320px] place-items-center rounded-2xl border-2 border-dashed border-white/15 text-white/35 hover:border-accent hover:text-accent hover:bg-accent/5 transition">
              <span className="flex flex-col items-center gap-3"><Plus size={28} />添加角色</span>
            </button>
          </div>
        )}

        {/* === Locations === */}
        {tab === "locations" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredLocs.map((l) => (
              <article
                key={l.id}
                draggable
                onDragStart={(e) =>
                  setDramaAssetDragData(e.dataTransfer, {
                    kind: "location",
                    title: l.name,
                    prompt: `${l.name} · ${l.description}`,
                    locationId: l.id,
                    referenceImage: l.referenceImage,
                  })
                }
                className="group cursor-grab overflow-hidden rounded-2xl border border-white/10 bg-[#16141c] shadow-soft active:cursor-grabbing hover:border-accent/40 transition-all"
              >
                <AssetPreviewFrame
                  imageUrl={l.referenceImage}
                  alt={l.name}
                  gradient="bg-[linear-gradient(135deg,#1a0f2e,#2d1b3d_48%,#5a3d6e)]"
                  placeholder={<MapPin size={40} />}
                  emptyHint="点击上传参考图"
                  filledHint="点击预览"
                  onAreaClick={() =>
                    handlePreviewAreaClick(l.referenceImage, l.name, {
                      type: "location",
                      id: l.id,
                    })
                  }
                >
                  <AssetCardActions>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleGenerateReference("location", l);
                      }}
                      className="grid size-8 place-items-center rounded-lg bg-accent/90 text-white hover:bg-accent"
                      title="AI 生成参考图"
                    >
                      <Wand2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLocPanel(l);
                      }}
                      className="grid size-8 place-items-center rounded-lg bg-white/90 text-ink hover:bg-white"
                    >
                      <PenLine size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLocation(l.id);
                        setNotice(`已删除「${l.name}」`);
                      }}
                      className="grid size-8 place-items-center rounded-lg bg-red-500/90 text-white hover:bg-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </AssetCardActions>
                </AssetPreviewFrame>
                <div className="p-4">
                  <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">{locationTypeLabels[l.type]}</span>
                  <h3 className="mt-2 text-lg font-semibold text-white">{l.name}</h3>
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-white/50">{l.description}</p>
                </div>
              </article>
            ))}
            <button onClick={() => openLocPanel()} className="grid min-h-[320px] place-items-center rounded-2xl border-2 border-dashed border-white/15 text-white/35 hover:border-accent hover:text-accent hover:bg-accent/5 transition">
              <span className="flex flex-col items-center gap-3"><Plus size={28} />添加地点</span>
            </button>
          </div>
        )}

        {/* === Videos === */}
        {tab === "videos" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredScenes.map((s) => (
              <article
                key={s.id}
                draggable
                onDragStart={(e) =>
                  setDramaAssetDragData(e.dataTransfer, {
                    kind: "video",
                    title: s.data.title,
                    prompt: s.data.prompt,
                    videoUrl: s.data.videoUrl,
                    poster: s.data.firstFrameRef,
                  })
                }
                className="group cursor-grab overflow-hidden rounded-2xl border border-white/10 bg-[#16141c] shadow-soft active:cursor-grabbing hover:border-accent/40 transition-all"
              >
                <div className="relative aspect-[9/16] bg-[linear-gradient(135deg,#1a0f2e,#3d1b4e_48%,#b94a6a)]">
                  {s.data.videoUrl ? (
                    <video src={s.data.videoUrl} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/40"><Film size={36} /></div>
                  )}
                  <span className={cn("absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    s.data.status === "ready" ? "bg-emerald-500/90 text-white" : s.data.status === "generating" ? "bg-blue-500/90 text-white" : "bg-white/90 text-slate-700")}>{statusLabels[s.data.status]}</span>
                  <div className="absolute bottom-0 right-0 z-10 p-3 opacity-0 transition group-hover:opacity-100">
                    <AssetCardActions>
                      <button onClick={() => openVideoPanel(s as StoryNode & { kind: "scene" })} className="grid size-8 place-items-center rounded-lg bg-white/90 text-ink hover:bg-white"><PenLine size={14} /></button>
                      <button onClick={() => { useWorldBuilderStore.getState().deleteNode(s.id); setNotice(`已删除「${s.data.title}」`); }} className="grid size-8 place-items-center rounded-lg bg-red-500/90 text-white hover:bg-red-600"><Trash2 size={14} /></button>
                    </AssetCardActions>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white">{s.data.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/50">{s.data.prompt}</p>
                </div>
              </article>
            ))}
            <button onClick={() => addSceneNode()} className="grid min-h-[400px] place-items-center rounded-2xl border-2 border-dashed border-white/15 text-white/35 hover:border-accent hover:text-accent hover:bg-accent/5 transition">
              <span className="flex flex-col items-center gap-3"><Plus size={28} />添加视频节点</span>
            </button>
          </div>
        )}

        {/* === Interactions === */}
        {tab === "interactions" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredInts.map((n) => (
              <article key={n.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#16141c] shadow-soft hover:border-accent/40 transition-all">
                <div className="bg-[linear-gradient(135deg,#1a0f2e,#2d1b3d,#3d1b4e)] p-5 text-white">
                  <MousePointerClick size={24} className="text-accent" />
                  <h3 className="mt-3 text-lg font-semibold">{n.data.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">{n.data.instruction}</p>
                  <p className="mt-3 text-xs text-white/40">{(n.data as InteractionNodeData).options.length} 个选项</p>
                </div>
                <div className="flex justify-end gap-1 p-3 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openIntPanel(n as StoryNode & { kind: "interaction" })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/8"><PenLine size={12} /> 编辑</button>
                  <button onClick={() => { useWorldBuilderStore.getState().deleteNode(n.id); setNotice(`已删除「${n.data.title}」`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"><Trash2 size={12} /> 删除</button>
                </div>
              </article>
            ))}
            <button onClick={() => addInteractionNode()} className="grid min-h-[200px] place-items-center rounded-2xl border-2 border-dashed border-white/15 text-white/35 hover:border-accent hover:text-accent hover:bg-accent/5 transition">
              <span className="flex flex-col items-center gap-3"><Plus size={28} />添加交互节点</span>
            </button>
          </div>
        )}

        {/* === References === */}
        {tab === "references" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#16141c] shadow-soft">
              <div className="relative aspect-[4/3] bg-[linear-gradient(135deg,#1a0f2e,#3d1b4e_48%,#b94a6a)] flex items-center justify-center"><ImagePlus size={40} className="text-white/40" /></div>
              <div className="p-4"><h3 className="font-semibold text-white">世界封面</h3><p className="mt-1 text-sm text-white/50">App 首页、故事详情页和分享卡片</p></div>
            </article>
            <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#16141c] shadow-soft">
              <div className="relative aspect-[4/3] bg-[linear-gradient(135deg,#2d1b3d,#1a0f2e_48%,#3d1b4e)] flex items-center justify-center"><Wand2 size={40} className="text-white/40" /></div>
              <div className="p-4"><h3 className="font-semibold text-white">风格参考板</h3><p className="mt-1 text-sm text-white/50">统一视觉风格，确保生成内容一致性</p></div>
            </article>
            <button className="grid min-h-[280px] place-items-center rounded-2xl border-2 border-dashed border-white/15 text-white/35 hover:border-accent hover:text-accent hover:bg-accent/5 transition">
              <span className="flex flex-col items-center gap-3"><Plus size={28} />添加参考</span>
            </button>
          </div>
        )}

        {notice && (
          <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-400/30 bg-[#16141c] px-4 py-3 text-sm text-emerald-300 shadow-soft" onClick={() => setNotice(null)}>{notice}</div>
        )}
          </div>
        </div>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute right-6 top-6 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="关闭预览"
          >
            <X size={20} />
          </button>
          <div
            className="relative max-h-[90vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {preview.kind === "video" ? (
              <video
                src={preview.src}
                controls
                autoPlay
                className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
              />
            ) : (
              <img
                src={preview.src}
                alt={preview.alt}
                className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            )}
            <p className="mt-3 text-center text-sm text-white/80">{preview.alt}</p>
          </div>
        </div>
      )}

      {/* === Slide-in Edit Panel === */}
      {panel && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm" onClick={() => setPanel(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <h2 className="text-lg font-semibold">
                {panel.mode === "char" ? (panel.id ? "编辑角色" : "新建角色") :
                 panel.mode === "loc" ? (panel.id ? "编辑地点" : "新建地点") :
                 panel.mode === "video" ? "编辑视频节点" : "编辑交互节点"}
              </h2>
              <button onClick={() => setPanel(null)} className="grid size-9 place-items-center rounded-xl hover:bg-slate-50"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">

              {/* Character Form */}
              {panel.mode === "char" && (
                <>
                  {/* Avatar upload */}
                  <div className="flex justify-center">
                    <label className="relative cursor-pointer">
                      {charForm.referenceImage ? (
                        <img src={charForm.referenceImage} alt="" className="h-36 w-36 rounded-3xl object-cover border-2 border-pink-100" />
                      ) : (
                        <div className="grid h-36 w-36 place-items-center rounded-3xl border-2 border-dashed border-pink-200 bg-accent-soft/30 text-accent">
                          <Camera size={32} />
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-accent text-white shadow"><Upload size={14} /></span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
                    </label>
                  </div>
                  <label className="block"><span className="text-sm font-medium text-slate-700">角色名</span>
                    <input className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-accent" value={charForm.name} onChange={(e) => setCharForm({ ...charForm, name: e.target.value })} placeholder="输入角色名" /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="text-sm font-medium text-slate-700">年龄</span>
                      <input className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-accent" type="number" value={charForm.age ?? ""} onChange={(e) => setCharForm({ ...charForm, age: e.target.value ? Number(e.target.value) : undefined })} placeholder="可选" /></label>
                    <label className="block"><span className="text-sm font-medium text-slate-700">身份</span>
                      <input className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-accent" value={charForm.role} onChange={(e) => setCharForm({ ...charForm, role: e.target.value })} placeholder="如：主角、反派" /></label>
                  </div>
                  <label className="block"><span className="text-sm font-medium text-slate-700">角色描述</span>
                    <textarea className="mt-1.5 min-h-36 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-accent" value={charForm.description} onChange={(e) => setCharForm({ ...charForm, description: e.target.value })} placeholder="外貌、性格、背景故事..." /></label>
                </>
              )}

              {/* Location Form */}
              {panel.mode === "loc" && (
                <>
                  <div className="flex justify-center">
                    <label className="relative cursor-pointer">
                      {locForm.referenceImage ? (
                        <img src={locForm.referenceImage} alt="" className="h-36 w-36 rounded-3xl object-cover border-2 border-pink-100" />
                      ) : (
                        <div className="grid h-36 w-36 place-items-center rounded-3xl border-2 border-dashed border-pink-200 bg-accent-soft/30 text-accent">
                          <MapPin size={32} />
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-accent text-white shadow"><Upload size={14} /></span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
                    </label>
                  </div>
                  <label className="block"><span className="text-sm font-medium text-slate-700">地点名</span>
                    <input className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-accent" value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} placeholder="输入地点名" /></label>
                  <label className="block"><span className="text-sm font-medium text-slate-700">类型</span>
                    <select className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-accent" value={locForm.type} onChange={(e) => setLocForm({ ...locForm, type: e.target.value as Location["type"] })}>
                      {Object.entries(locationTypeLabels).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                    </select></label>
                  <label className="block"><span className="text-sm font-medium text-slate-700">描述</span>
                    <textarea className="mt-1.5 min-h-36 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-accent" value={locForm.description} onChange={(e) => setLocForm({ ...locForm, description: e.target.value })} placeholder="场景氛围、空间构造..." /></label>
                </>
              )}

              {/* Video Form */}
              {panel.mode === "video" && (
                <>
                  <label className="block"><span className="text-sm font-medium text-slate-700">标题</span>
                    <input className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-accent" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} /></label>
                  <label className="block"><span className="text-sm font-medium text-slate-700">视频提示词</span>
                    <textarea className="mt-1.5 min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-accent" value={videoForm.prompt} onChange={(e) => setVideoForm({ ...videoForm, prompt: e.target.value })} /></label>
                  <label className="block"><span className="text-sm font-medium text-slate-700">视频 URL</span>
                    <input className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-accent" value={videoForm.videoUrl} onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })} placeholder="https://..." /></label>
                  <label className="block"><span className="text-sm font-medium text-slate-700">状态</span>
                    <select className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-accent" value={videoForm.status} onChange={(e) => setVideoForm({ ...videoForm, status: e.target.value as SceneNodeData["status"] })}>
                      {Object.entries(statusLabels).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                    </select></label>
                </>
              )}

              {/* Interaction Form */}
              {panel.mode === "interaction" && (
                <>
                  <label className="block"><span className="text-sm font-medium text-slate-700">标题</span>
                    <input className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-accent" value={intForm.title} onChange={(e) => setIntForm({ ...intForm, title: e.target.value })} /></label>
                  <label className="block"><span className="text-sm font-medium text-slate-700">互动指令</span>
                    <textarea className="mt-1.5 min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-accent" value={intForm.instruction} onChange={(e) => setIntForm({ ...intForm, instruction: e.target.value })} placeholder="描述用户互动方式和剧情结果..." /></label>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button onClick={() => setPanel(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">取消</button>
                <button onClick={panel.mode === "char" ? saveChar : panel.mode === "loc" ? saveLoc : panel.mode === "video" ? saveVideo : saveInt}
                  className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-deep">{panel.id ? "保存" : "创建"}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </WorldBuilderLayout>
  );
}

function AssetCardActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-1 rounded-xl bg-gradient-to-t from-black/40 to-transparent p-1">
      {children}
    </div>
  );
}

function AssetPreviewFrame({
  imageUrl,
  alt,
  placeholder,
  emptyHint,
  filledHint,
  onAreaClick,
  gradient = "bg-[linear-gradient(135deg,#1a0f2e,#3d1b4e_48%,#d9468a)]",
  aspectClass = "aspect-[4/3]",
  children,
}: {
  imageUrl?: string;
  alt: string;
  placeholder: ReactNode;
  emptyHint: string;
  filledHint: string;
  onAreaClick: () => void;
  gradient?: string;
  aspectClass?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden", aspectClass, gradient)}>
      <button
        type="button"
        onClick={onAreaClick}
        title={imageUrl ? filledHint : emptyHint}
        className="group/preview relative z-0 block h-full w-full cursor-pointer text-left"
      >
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover/preview:bg-black/20 group-hover/preview:opacity-100">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
                <ZoomIn size={14} /> {filledHint}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-full items-center justify-center text-white/40">{placeholder}</div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover/preview:bg-black/15 group-hover/preview:opacity-100">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
                <Upload size={14} /> {emptyHint}
              </span>
            </div>
          </>
        )}
      </button>
      {children && (
        <div className="absolute bottom-0 right-0 z-10 p-3 opacity-0 transition group-hover:opacity-100">
          {children}
        </div>
      )}
    </div>
  );
}
