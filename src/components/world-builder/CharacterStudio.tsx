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
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureProjectLoaded(storyId);
  }, [storyId, ensureProjectLoaded]);

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
      const next = [...existing, url].slice(0, 4);
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
    ? [...character.turnaroundImages, ...Array(4)].slice(0, 4)
    : character.referenceImage
      ? [character.referenceImage, character.referenceImage, character.referenceImage, character.referenceImage]
      : [null, null, null, null];
  const hasFaceImages = faceSlots.some(Boolean);

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
        <Link href={`/world-builder/stories/${storyId}?tab=characters`} className="transition hover:text-white/75">
          {zh ? "角色" : "Characters"}
        </Link>
        <ChevronRight size={12} />
        <span className="text-white/75">{character.name || (zh ? "未命名" : "Untitled")}</span>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left profile */}
        <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-white/8 px-5 py-5">
          <div className="flex gap-3">
            <div className="grid size-[52px] shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="size-full object-cover" />
              ) : (
                <UserRound size={20} className="text-white/25" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <input
                value={character.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={zh ? "未命名" : "Untitled"}
                className="w-full bg-transparent font-display text-[26px] leading-tight text-white outline-none placeholder:text-white/25"
              />
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={character.role || "Character"}
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
                  className="grid size-7 place-items-center rounded-md border border-white/10 text-white/40 hover:bg-white/5"
                  aria-label="AI suggest"
                >
                  <Wand2 size={13} />
                </button>
              </div>
              <input
                value={profile.tagline ?? ""}
                onChange={(e) => patchProfile({ tagline: e.target.value })}
                placeholder={zh ? "Their north star, in one line." : "Their north star, in one line."}
                className="mt-2 w-full bg-transparent text-[12px] italic leading-5 text-white/40 outline-none placeholder:text-white/25"
              />
            </div>
          </div>

          <button
            type="button"
            className="mt-5 flex w-full items-center gap-2 rounded-xl border border-dashed border-white/12 px-3 py-2.5 text-[13px] text-white/45 transition hover:border-white/20 hover:text-white/65"
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
              ]}
              onEdit={handleProfileEdit}
            />
            <ProfileTextSection
              title="WARDROBE"
              value={profile.wardrobe}
              placeholder={zh ? "服装、配饰与标志性单品…" : "Outfit, palette, signature pieces…"}
              onChange={(value) => patchProfile({ wardrobe: value.trim() || undefined })}
            />
            <ProfileTextSection
              title="BODY"
              value={profile.body}
              placeholder={zh ? "体态、站姿与动作习惯…" : "Build, posture, movement…"}
              onChange={(value) => patchProfile({ body: value.trim() || undefined })}
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
            {visualTab === "Face" ? (
              hasFaceImages ? (
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
                  <div className="grid grid-cols-2 gap-2">
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
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-xl border border-white/8 bg-white/[0.02]"
                      />
                    ))}
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-white">
                    {zh ? "生成头部三视图" : "Build a head turnaround"}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-white/40">
                    {zh
                      ? "四个角度的面部参考，用作下游生成的标准参考。"
                      : "Four angles of the face. Used as the canonical reference for downstream gens."}
                  </p>
                  {genError && <p className="mt-2 text-xs text-red-400">{genError}</p>}
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
                </div>
              )
            ) : (
              <div className="grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-white/10 bg-[#111111] text-sm text-white/35">
                {visualTab} · {zh ? "即将上线" : "Coming soon"}
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
