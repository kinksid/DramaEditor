"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  ImageIcon,
  Loader2,
  PenLine,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { CharacterStudioWorldBuilderPanel } from "@/components/world-builder/CharacterStudioWorldBuilderPanel";
import { locationTypeLabels } from "@/lib/worldBuilderLabels";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Location, LocationProfile } from "@/types/worldBuilder";

type ShotId = "full" | 0 | 1 | 2;

function buildLocationPrompt(location: Location) {
  const profile = location.profile ?? {};
  return [
    location.name,
    locationTypeLabels[location.type],
    location.description,
    profile.placement,
    profile.era,
    profile.materials,
    profile.timeOfDay,
    profile.light,
    profile.atmosphere,
    profile.iconicDetail,
    profile.others,
  ]
    .filter(Boolean)
    .join(", ");
}

function ProfileSection({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: Array<{ label: string; value?: string | number; display?: string }>;
  onEdit: (label: string, value: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <section className="border-b border-white/8 pb-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold tracking-[0.14em] text-white/35">{title}</h3>
        <PenLine size={12} className="text-white/20" />
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            {editing === row.label ? (
              row.label === "Type" ? (
                <select
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    onEdit(row.label, draft);
                    setEditing(null);
                  }}
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none"
                >
                  {Object.entries(locationTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    onEdit(row.label, draft);
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white outline-none"
                />
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditing(row.label);
                  setDraft(row.value ? String(row.value) : "");
                }}
                className="w-full text-left"
              >
                <p className="text-[11px] text-white/35">{row.label}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-white/80 whitespace-pre-wrap">
                  {row.display ?? (row.value ? String(row.value) : "—")}
                </p>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfileTextSection({
  title,
  value,
  placeholder,
  onChange,
}: {
  title: string;
  value?: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  return (
    <section className="border-b border-white/8 pb-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold tracking-[0.14em] text-white/35">{title}</h3>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-white/20 transition hover:text-white/50"
          aria-label={`Edit ${title}`}
        >
          <PenLine size={12} />
        </button>
      </div>
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            onChange(draft);
            setEditing(false);
          }}
          rows={4}
          placeholder={placeholder}
          className="de-modal-surface-field w-full resize-none rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-[13px] leading-5 text-white outline-none placeholder:text-white/25"
        />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="w-full text-left">
          <p className="text-[13px] leading-6 text-white/75 whitespace-pre-wrap">
            {value?.trim() ? value : "—"}
          </p>
        </button>
      )}
    </section>
  );
}

export function LocationStudio({
  storyId,
  locationId,
}: {
  storyId: string;
  locationId: string;
}) {
  const language = useSettingsStore((s) => s.language);
  const zh = language === "zh";
  const {
    world,
    characters,
    locations,
    setupDraft,
    ensureProjectLoaded,
    updateLocation,
    submitReferenceImageGeneration,
    pendingGenerationTasks,
  } = useWorldBuilderStore();

  const location = locations.find((item) => item.id === locationId);
  const profile = location?.profile ?? {};
  const [activeShot, setActiveShot] = useState<ShotId>("full");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<ShotId>("full");

  useEffect(() => {
    ensureProjectLoaded(storyId);
  }, [storyId, ensureProjectLoaded]);

  const isGenerating = useMemo(
    () =>
      generating ||
      pendingGenerationTasks.some(
        (task) => task.targetEntityId === locationId && task.entityType === "location",
      ),
    [generating, pendingGenerationTasks, locationId],
  );

  if (!location) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-white/45">
        {zh ? "地点不存在或尚未加载。" : "Location not found."}
        <Link href={`/world-builder/stories/${storyId}?tab=locations`} className="mt-3 text-accent hover:underline">
          {zh ? "返回地点列表" : "Back to locations"}
        </Link>
      </div>
    );
  }

  const patch = (next: Partial<Location>) => updateLocation(locationId, next);
  const patchProfile = (next: Partial<LocationProfile>) =>
    patch({ profile: { ...profile, ...next } });

  const profileFieldMap: Record<string, keyof LocationProfile | "type"> = {
    Type: "type",
    Placement: "placement",
    Era: "era",
    Materials: "materials",
    "Time of day": "timeOfDay",
    Light: "light",
    Atmosphere: "atmosphere",
    "Iconic detail": "iconicDetail",
  };

  const handleProfileEdit = (label: string, value: string) => {
    const key = profileFieldMap[label];
    if (!key) return;
    if (key === "type") {
      patch({ type: value as Location["type"] });
      return;
    }
    patchProfile({ [key]: value.trim() || undefined });
  };

  const angleImages = location.angleImages ?? [];
  const shots: Array<{ id: ShotId; label: string; url?: string }> = [
    { id: "full", label: "Full Shot", url: location.referenceImage },
    { id: 0, label: "Angle 1", url: angleImages[0] },
    { id: 1, label: "Angle 2", url: angleImages[1] },
    { id: 2, label: "Angle 3", url: angleImages[2] },
  ];

  const activeUrl =
    activeShot === "full" ? location.referenceImage : angleImages[activeShot as number];

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const taskId = await submitReferenceImageGeneration("location", locationId, buildLocationPrompt(location));
      if (!taskId) {
        setGenError(zh ? "生成请求失败，请检查 API / ComfyUI 配置。" : "Generation failed. Check API / ComfyUI settings.");
      }
    } catch (error) {
      setGenError(error instanceof Error ? error.message : zh ? "生成失败" : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpload = (file: File, target: ShotId) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      if (!url) return;
      if (target === "full") {
        patch({ referenceImage: url });
        setActiveShot("full");
        return;
      }
      const next = [...angleImages];
      next[target as number] = url;
      patch({ angleImages: next });
      setActiveShot(target);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteActive = () => {
    if (activeShot === "full") {
      patch({ referenceImage: undefined });
      return;
    }
    const next = [...angleImages];
    while (next.length <= (activeShot as number)) next.push("");
    next[activeShot as number] = "";
    patch({ angleImages: next });
    setActiveShot("full");
  };

  const openUpload = (target: ShotId) => {
    setUploadTarget(target);
    uploadRef.current?.click();
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-[#0a0a0a] text-white">
      <header className="flex shrink-0 items-center gap-1.5 border-b border-white/8 px-5 py-3 text-xs text-white/45">
        <Link href="/world-builder/worlds" className="transition hover:text-white/75">
          {zh ? "我的世界" : "My Worlds"}
        </Link>
        <ChevronRight size={12} />
        <Link href={`/world-builder/stories/${storyId}`} className="transition hover:text-white/75">
          {world.title || (zh ? "未命名世界" : "Untitled World")}
        </Link>
        <ChevronRight size={12} />
        <Link href={`/world-builder/stories/${storyId}?tab=locations`} className="transition hover:text-white/75">
          {zh ? "地点" : "Locations"}
        </Link>
        <ChevronRight size={12} />
        <span className="text-white/75">{location.name || (zh ? "未命名" : "Untitled")}</span>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left profile */}
        <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-white/8 px-5 py-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-white/35">LOCATION</p>
          <div className="mt-2 flex items-start gap-2">
            <input
              value={location.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder={zh ? "未命名" : "Untitled"}
              className="min-w-0 flex-1 bg-transparent font-display text-[26px] leading-tight text-white outline-none placeholder:text-white/25"
            />
            <button
              type="button"
              className="mt-1 grid size-7 shrink-0 place-items-center rounded-md border border-white/10 text-white/40 hover:bg-white/5"
              aria-label="AI suggest"
            >
              <Wand2 size={13} />
            </button>
          </div>

          <div className="mt-6 space-y-0">
            <ProfileSection
              title="IDENTITY"
              rows={[
                { label: "Type", value: location.type, display: locationTypeLabels[location.type] },
                { label: "Placement", value: profile.placement },
              ]}
              onEdit={(label, value) => {
                if (label === "Type") {
                  patch({ type: value as Location["type"] });
                } else {
                  handleProfileEdit(label, value);
                }
              }}
            />
            <ProfileSection
              title="SETTING"
              rows={[
                { label: "Era", value: profile.era },
                { label: "Materials", value: profile.materials },
                { label: "Time of day", value: profile.timeOfDay },
              ]}
              onEdit={handleProfileEdit}
            />
            <ProfileSection
              title="ATMOSPHERE"
              rows={[
                { label: "Light", value: profile.light },
                { label: "Atmosphere", value: profile.atmosphere },
                { label: "Iconic detail", value: profile.iconicDetail },
              ]}
              onEdit={handleProfileEdit}
            />
            <ProfileTextSection
              title="OTHERS"
              value={profile.others}
              placeholder={
                zh
                  ? "Anything else the AI should remember when generating this location."
                  : "Anything else the AI should remember when generating this location."
              }
              onChange={(value) => patchProfile({ others: value.trim() || undefined })}
            />
          </div>
        </aside>

        {/* Center images */}
        <section className="flex min-w-0 flex-1 flex-col bg-[#111111]">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-white/35">IMAGES</p>
            {activeUrl && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openUpload(activeShot)}
                  className="rounded-full border border-white/12 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
                >
                  {zh ? "替换" : "Replace"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteActive}
                  className="inline-flex items-center gap-1 rounded-full border border-white/12 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
                >
                  <Trash2 size={12} />
                  {zh ? "删除" : "Delete"}
                </button>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
            <div
              className={cn(
                "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/8",
                activeUrl ? "bg-[#f4f4f4]" : "bg-[#141414]",
              )}
            >
              {activeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeUrl} alt={location.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-white/15">
                  <ImageIcon size={56} strokeWidth={1} />
                  {!location.referenceImage && (
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {zh ? "生成场景" : "Generate scene"}
                    </button>
                  )}
                </div>
              )}
              {isGenerating && activeUrl && (
                <div className="absolute inset-0 grid place-items-center bg-black/40">
                  <Loader2 size={28} className="animate-spin text-white" />
                </div>
              )}
            </div>
            {genError && <p className="mt-2 text-xs text-red-400">{genError}</p>}

            <div className="mt-4 flex items-end gap-2 overflow-x-auto pb-1">
              {shots.map((shot) => (
                <button
                  key={String(shot.id)}
                  type="button"
                  onClick={() => setActiveShot(shot.id)}
                  className="shrink-0 text-left"
                >
                  <div
                    className={cn(
                      "relative size-[88px] overflow-hidden rounded-lg border bg-[#141414]",
                      activeShot === shot.id ? "border-white" : "border-white/10",
                    )}
                  >
                    {shot.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shot.url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center text-white/20">
                        <ImageIcon size={18} strokeWidth={1} />
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 text-[10px] text-white/45">{shot.label}</p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => openUpload(1)}
                className="mb-5 grid size-[88px] shrink-0 place-items-center rounded-lg border border-dashed border-white/15 text-white/35 hover:border-white/25 hover:text-white/55"
                aria-label="Add angle"
              >
                <Plus size={18} />
              </button>
              <button
                type="button"
                onClick={() => openUpload("full")}
                className="mb-5 grid size-[88px] shrink-0 place-items-center rounded-lg border border-white/10 bg-[#141414] text-white/35 hover:text-white/55"
                aria-label="Upload"
              >
                <Upload size={18} />
              </button>
            </div>
          </div>
        </section>

        <CharacterStudioWorldBuilderPanel
          zh={zh}
          world={world}
          characters={characters}
          locations={locations}
          activeCharacterId=""
          coverImage={world.coverImage}
          hasScript={!!setupDraft.script?.trim()}
          onGenerateImages={handleGenerate}
        />
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file, uploadTarget);
          e.target.value = "";
        }}
      />
    </div>
  );
}
