"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Loader2,
  PenLine,
  Plus,
  RefreshCw,
  Sparkles,
  Upload,
  UserRound,
  Wand2,
} from "lucide-react";
import { CharacterStudioWorldBuilderPanel } from "@/components/world-builder/CharacterStudioWorldBuilderPanel";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Character, CharacterProfile } from "@/types/worldBuilder";

const visualTabs = ["Face", "Body", "Mood", "Outfit", "Stickers", "Others"] as const;
type VisualTab = (typeof visualTabs)[number];

const roleOptions = ["Character", "Protagonist", "Antagonist", "Supporting", "NPC"];

const visualEmptyCopy: Record<
  VisualTab,
  { title: string; titleZh: string; description: string; descriptionZh: string; cols: number; rows: number; aspect: "square" | "tall" }
> = {
  Face: {
    title: "Build a head turnaround",
    titleZh: "生成头部三视图",
    description: "Three angles of the face. Used as the canonical reference for downstream gens.",
    descriptionZh: "三个角度的面部参考，用作下游生成的标准参考。",
    cols: 3,
    rows: 1,
    aspect: "square",
  },
  Body: {
    title: "Build a body turnaround",
    titleZh: "生成全身三视图",
    description: "Front, three quarter, and back to keep videos on model.",
    descriptionZh: "正面、四分之三与背面，保证下游视频角色一致。",
    cols: 3,
    rows: 1,
    aspect: "tall",
  },
  Mood: {
    title: "Build an expression set",
    titleZh: "生成表情组",
    description: "Six moods that give scenes performance to draw from.",
    descriptionZh: "六种情绪表情，供场景表演取用。",
    cols: 3,
    rows: 2,
    aspect: "square",
  },
  Outfit: {
    title: "Add an outfit",
    titleZh: "添加服装",
    description: "Dress the character. Add as many alternates as the story needs.",
    descriptionZh: "为角色搭配服装；可按剧情添加多套造型。",
    cols: 3,
    rows: 1,
    aspect: "tall",
  },
  Stickers: {
    title: "Add a sticker",
    titleZh: "添加贴纸",
    description: "Stylized cut-outs of the character. Add as many as you like.",
    descriptionZh: "角色风格化剪贴；可任意添加。",
    cols: 3,
    rows: 1,
    aspect: "square",
  },
  Others: {
    title: "Add a reference",
    titleZh: "添加参考",
    description: "Anything else that helps keep this character on model.",
    descriptionZh: "其他有助于保持角色一致性的参考。",
    cols: 3,
    rows: 1,
    aspect: "square",
  },
};

function normalizeRole(role?: string) {
  const value = (role ?? "").trim();
  if (!value) return "Character";
  const map: Record<string, string> = {
    主角: "Protagonist",
    反派: "Antagonist",
    配角: "Supporting",
    路人: "NPC",
    protagonist: "Protagonist",
    antagonist: "Antagonist",
    supporting: "Supporting",
    npc: "NPC",
    character: "Character",
  };
  return map[value.toLowerCase()] ?? map[value] ?? (roleOptions.includes(value) ? value : "Character");
}

function buildCharacterPrompt(character: Character) {
  const profile = character.profile ?? {};
  const parts = [
    character.name,
    character.role,
    character.description,
    profile.tagline,
    profile.personality,
    profile.profession,
    profile.gender,
    profile.ethnicity,
    profile.skin,
    profile.face,
    profile.eyes,
    profile.hair,
    profile.looksLike,
    profile.figure,
    profile.height,
    profile.movement,
    profile.silhouette,
    profile.palette,
    profile.materials,
    profile.signaturePiece,
    profile.body,
    profile.wardrobe,
    profile.vibe,
  ].filter(Boolean);
  return parts.join(", ") || character.name || "character portrait";
}

function ProfileSection({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: Array<{ label: string; value?: string | number }>;
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
          <div key={row.label} className="group">
            {editing === row.label ? (
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
                <p className="mt-0.5 text-[13px] leading-5 text-white/80">
                  {row.value ? String(row.value) : "—"}
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

export function CharacterStudio({
  storyId,
  characterId,
}: {
  storyId: string;
  characterId: string;
}) {
  const language = useSettingsStore((s) => s.language);
  const zh = language === "zh";
  const {
    world,
    characters,
    locations,
    setupDraft,
    ensureProjectLoaded,
    updateCharacter,
    submitReferenceImageGeneration,
    pendingGenerationTasks,
  } = useWorldBuilderStore();

  const character = characters.find((item) => item.id === characterId);
  const profile = character?.profile ?? {};
  const [visualTab, setVisualTab] = useState<VisualTab>("Face");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [resolvedStoryId, setResolvedStoryId] = useState(storyId);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureProjectLoaded(storyId);
    const state = useWorldBuilderStore.getState();
    const inStory = state.characters.some((item) => item.id === characterId);
    if (inStory) {
      setResolvedStoryId(storyId);
      return;
    }
    const host = state.listProjects().find((project) =>
      project.characters.some((item) => item.id === characterId),
    );
    if (host) {
      ensureProjectLoaded(host.id);
      setResolvedStoryId(host.id);
    }
  }, [storyId, characterId, ensureProjectLoaded]);

  const isGenerating = useMemo(
    () =>
      generating ||
      pendingGenerationTasks.some(
        (task) => task.targetEntityId === characterId && task.entityType === "character",
      ),
    [generating, pendingGenerationTasks, characterId],
  );

  if (!character) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-white/45">
        {zh ? "角色不存在或尚未加载。" : "Character not found."}
        <Link href={`/world-builder/stories/${storyId}?tab=characters`} className="mt-3 text-accent hover:underline">
          {zh ? "返回角色列表" : "Back to characters"}
        </Link>
      </div>
    );
  }

  const patch = (next: Partial<Character>) => updateCharacter(characterId, next);
  const patchProfile = (next: Partial<CharacterProfile>) =>
    patch({ profile: { ...profile, ...next } });

  const profileFieldMap: Record<string, keyof CharacterProfile | "age"> = {
    Age: "age",
    Gender: "gender",
    Ethnicity: "ethnicity",
    Personality: "personality",
    Profession: "profession",
    Voice: "voiceStyle",
    Catchphrase: "catchphrase",
    "Never Says": "neverSays",
    Habits: "habits",
    Era: "era",
    Society: "society",
    Vibe: "vibe",
    "Home Base": "homeBase",
    Form: "form",
    Skin: "skin",
    Face: "face",
    Eyes: "eyes",
    Hair: "hair",
    "Looks Like": "looksLike",
    "Distinguishing Mark": "distinguishingMark",
    Figure: "figure",
    Height: "height",
    Movement: "movement",
    "Body Mark": "bodyMark",
    Silhouette: "silhouette",
    Palette: "palette",
    Materials: "materials",
    "Signature Piece": "signaturePiece",
  };

  const handleProfileEdit = (label: string, value: string) => {
    const key = profileFieldMap[label];
    if (!key) return;
    if (key === "age") {
      const age = value.trim() ? Number(value) : undefined;
      patch({ age: Number.isFinite(age) ? age : undefined });
      return;
    }
    patchProfile({ [key]: value.trim() || undefined });
  };

  const handleGenerateFace = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const taskId = await submitReferenceImageGeneration("character", characterId, buildCharacterPrompt(character));
      if (!taskId) {
        setGenError(zh ? "生成请求失败，请检查 API / ComfyUI 配置。" : "Generation failed. Check API / ComfyUI settings.");
      }
    } catch (error) {
      setGenError(error instanceof Error ? error.message : zh ? "生成失败" : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadFace = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      if (!url) return;
      const existing = character.turnaroundImages ?? [];
      const next = [...existing, url].slice(0, 3);
      patch({
        referenceImage: character.referenceImage || url,
        previewImage: character.previewImage || url,
        turnaroundImages: next,
      });
    };
    reader.readAsDataURL(file);
  };

  const previewUrl = character.previewImage || character.referenceImage;
  const faceSlots = character.turnaroundImages?.length
    ? [...character.turnaroundImages, ...Array(3)].slice(0, 3)
    : character.referenceImage
      ? [character.referenceImage, character.referenceImage, character.referenceImage]
      : [null, null, null];
  const hasFaceImages = faceSlots.some(Boolean);
  const roleValue = normalizeRole(character.role);
  const emptyCopy = visualEmptyCopy[visualTab];

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-[#0a0a0a] text-white">
      <header className="flex shrink-0 items-center gap-1.5 border-b border-white/8 px-5 py-3 text-xs text-white/45">
        <Link href="/world-builder/worlds" className="transition hover:text-white/75">
          {zh ? "我的世界" : "My Worlds"}
        </Link>
        <ChevronRight size={12} />
        <Link href={`/world-builder/stories/${resolvedStoryId}`} className="transition hover:text-white/75">
          {world.title || (zh ? "未命名世界" : "Untitled World")}
        </Link>
        <ChevronRight size={12} />
        <Link href={`/world-builder/stories/${resolvedStoryId}?tab=characters`} className="transition hover:text-white/75">
          {zh ? "角色" : "Characters"}
        </Link>
        <ChevronRight size={12} />
        <span className="text-white/75">{character.name || (zh ? "未命名" : "Untitled")}</span>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left profile — Studio w-[360px] */}
        <aside className="w-[360px] shrink-0 overflow-y-auto border-r border-white/8 px-5 py-5">
          <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.03]">
            <div className="h-16 bg-gradient-to-br from-[#2a1a22] via-[#181018] to-[#0c0c0c]" />
            <div className="px-5 pb-5">
              <div className="-mt-10 mb-2 flex items-end justify-between gap-2">
                <div className="grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#141414] shadow-lg">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <UserRound size={28} className="text-white/25" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 pb-0.5">
                  <select
                    value={roleValue}
                    onChange={(e) => patch({ role: e.target.value })}
                    className="rounded-md border border-white/10 bg-[#141414] px-2 py-1 text-[11px] text-white/70 outline-none"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-md border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                    aria-label="AI suggest"
                  >
                    <Wand2 size={13} />
                  </button>
                </div>
              </div>

              <input
                value={character.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={zh ? "未命名" : "Untitled"}
                className="h-11 w-full border-b border-transparent bg-transparent font-display text-[36px] font-semibold leading-none tracking-tight text-white outline-none placeholder:text-white/25 focus:border-white/20"
              />
              <input
                value={profile.tagline ?? ""}
                onChange={(e) => patchProfile({ tagline: e.target.value })}
                placeholder="Their north star, in one line."
                className="mt-2 w-full bg-transparent text-sm italic leading-relaxed text-white/55 outline-none placeholder:text-white/25"
              />
            </div>
          </div>

          <button
            type="button"
            className="mt-4 flex w-full items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/5 px-3 py-2.5 text-[13px] text-rose-200 transition hover:bg-rose-500/10"
          >
            <Plus size={14} />
            {zh ? "添加声音" : "Add voice"}
          </button>

          <div className="mt-6 space-y-0">
            <ProfileSection
              title="IDENTITY"
              rows={[
                { label: "Age", value: character.age },
                { label: "Gender", value: profile.gender },
                { label: "Ethnicity", value: profile.ethnicity },
              ]}
              onEdit={handleProfileEdit}
            />
            <ProfileSection
              title="PERSONALITY"
              rows={[
                { label: "Personality", value: profile.personality },
                { label: "Profession", value: profile.profession },
                { label: "Voice", value: profile.voiceStyle },
                { label: "Catchphrase", value: profile.catchphrase },
                { label: "Never Says", value: profile.neverSays },
                { label: "Habits", value: profile.habits },
              ]}
              onEdit={handleProfileEdit}
            />
            <ProfileSection
              title="BACKGROUND"
              rows={[
                { label: "Era", value: profile.era },
                { label: "Society", value: profile.society },
                { label: "Vibe", value: profile.vibe },
                { label: "Home Base", value: profile.homeBase },
              ]}
              onEdit={handleProfileEdit}
            />
            <ProfileSection
              title="FORM"
              rows={[{ label: "Form", value: profile.form }]}
              onEdit={handleProfileEdit}
            />
            <ProfileSection
              title="PHYSICAL"
              rows={[
                { label: "Skin", value: profile.skin },
                { label: "Face", value: profile.face },
                { label: "Eyes", value: profile.eyes },
                { label: "Hair", value: profile.hair },
                { label: "Looks Like", value: profile.looksLike },
                { label: "Distinguishing Mark", value: profile.distinguishingMark },
              ]}
              onEdit={handleProfileEdit}
            />
            <ProfileSection
              title="BODY"
              rows={[
                { label: "Figure", value: profile.figure ?? profile.body },
                { label: "Height", value: profile.height },
                { label: "Movement", value: profile.movement },
                { label: "Body Mark", value: profile.bodyMark },
              ]}
              onEdit={handleProfileEdit}
            />
            <ProfileSection
              title="WARDROBE"
              rows={[
                { label: "Silhouette", value: profile.silhouette ?? profile.wardrobe },
                { label: "Palette", value: profile.palette },
                { label: "Materials", value: profile.materials },
                { label: "Signature Piece", value: profile.signaturePiece },
              ]}
              onEdit={handleProfileEdit}
            />
            <ProfileTextSection
              title="OTHERS"
              value={profile.others}
              placeholder={zh ? "其他需要 AI 记住的细节…" : "Anything else the AI should remember…"}
              onChange={(value) => patchProfile({ others: value.trim() || undefined })}
            />
          </div>
        </aside>

        {/* Center preview */}
        <section className="flex min-w-0 flex-1 items-stretch justify-center bg-[#111111] p-4 sm:p-6">
          <div
            className={cn(
              "relative flex h-full w-full max-w-[520px] items-center justify-center overflow-hidden rounded-xl border border-white/8",
              previewUrl ? "bg-[#f4f4f4]" : "bg-gradient-to-b from-[#181818] to-[#101010]",
            )}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={character.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="grid size-full place-items-center text-white/15">
                <UserRound size={120} strokeWidth={0.75} />
              </div>
            )}
          </div>
        </section>

        {/* Visual tabs */}
        <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/8 bg-[#0a0a0a]">
          <div className="flex shrink-0 gap-5 overflow-x-auto border-b border-white/8 px-4 pt-4 text-[11px]">
            {visualTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setVisualTab(tab)}
                className={cn(
                  "shrink-0 border-b-2 pb-3 transition",
                  visualTab === tab
                    ? "border-white text-white"
                    : "border-transparent text-white/35 hover:text-white/65",
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {visualTab === "Face" && hasFaceImages ? (
              <div>
                <div className="mb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateFace}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/75 hover:bg-white/5 disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    {zh ? "重新生成" : "Regenerate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => uploadRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/75 hover:bg-white/5"
                  >
                    <Upload size={12} />
                    {zh ? "替换" : "Replace"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {faceSlots.map((url, index) => (
                    <div
                      key={index}
                      className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-[#141414]"
                    >
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center text-white/15">
                          <UserRound size={24} strokeWidth={1} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/12 bg-[#111111] p-4">
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${emptyCopy.cols}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: emptyCopy.cols * emptyCopy.rows }).map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "rounded-xl border border-white/8 bg-white/[0.02]",
                        emptyCopy.aspect === "tall" ? "aspect-[3/4]" : "aspect-square",
                      )}
                    />
                  ))}
                </div>
                <h3 className="mt-4 text-sm font-medium text-white">
                  {zh ? emptyCopy.titleZh : emptyCopy.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-white/40">
                  {zh ? emptyCopy.descriptionZh : emptyCopy.description}
                </p>
                {visualTab === "Face" && genError && <p className="mt-2 text-xs text-red-400">{genError}</p>}
                {visualTab === "Face" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateFace}
                      disabled={isGenerating}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {zh ? "生成" : "Generate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => uploadRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/5"
                    >
                      <Upload size={14} />
                      {zh ? "上传" : "Upload"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadFace(file);
              e.target.value = "";
            }}
          />
        </aside>

        <CharacterStudioWorldBuilderPanel
          zh={zh}
          world={world}
          characters={characters}
          locations={locations}
          activeCharacterId={characterId}
          coverImage={world.coverImage}
          hasScript={!!setupDraft.script?.trim()}
          onGenerateImages={handleGenerateFace}
        />
      </div>
    </div>
  );
}
