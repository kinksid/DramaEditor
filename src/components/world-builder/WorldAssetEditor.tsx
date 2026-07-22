"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ImagePlus, MoreVertical, PenLine, Plus, Sparkles, Trash2, X } from "lucide-react";
import { locationTypeLabels } from "@/lib/worldBuilderLabels";
import { MODAL_OVERLAY_80, MODAL_PANEL } from "@/lib/modalTheme";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Character, CharacterChatConfig, Location } from "@/types/worldBuilder";

export const portraitGridClass = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";
export const portraitAspectClass = "aspect-[9/16] w-full";
export const portraitShellClass = "overflow-hidden rounded-[16px] border border-white/10 bg-[#18181B]";
export const landscapeGridClass = "grid grid-cols-1 gap-3 sm:grid-cols-2";
export const landscapeAspectClass = "aspect-[16/9] w-full";

export function AddAssetCard({
  label,
  onClick,
  className,
  aspect = "portrait",
}: {
  label: string;
  onClick: () => void;
  className?: string;
  aspect?: "portrait" | "landscape";
}) {
  const aspectClass = aspect === "landscape" ? landscapeAspectClass : portraitAspectClass;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        aspectClass,
        portraitShellClass,
        "group flex flex-col border-white/10 bg-gradient-to-br from-[#121018] via-[#141014] to-[#1a1218] text-white/55 transition hover:border-white/20 hover:text-white/80",
        className,
      )}
    >
      <span className="flex flex-1 flex-col items-center justify-center gap-3">
        <Plus size={28} strokeWidth={1.25} />
        <span className="text-sm">{label}</span>
      </span>
    </button>
  );
}

function CardMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={rootRef} className="absolute right-3 top-3 z-10">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid size-8 place-items-center rounded-lg bg-black/35 text-white/80 backdrop-blur-sm transition hover:bg-black/55"
        aria-label="更多操作"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 min-w-[108px] overflow-hidden rounded-lg border border-white/10 bg-[#141014] py-1 shadow-soft">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/8"
          >
            <PenLine size={14} /> 编辑
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10"
          >
            <Trash2 size={14} /> 删除
          </button>
        </div>
      )}
    </div>
  );
}

function CharacterPortraitCard({
  character,
  onOpen,
  onEdit,
  onDelete,
}: {
  character: Character;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = character.age ? `${character.age}` : "未知";

  return (
    <article
      className={cn(portraitAspectClass, portraitShellClass, "flex cursor-pointer flex-col bg-[#0a0a0a] transition hover:border-white/20")}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative flex-[1.35] overflow-hidden bg-[#171717]">
        {character.referenceImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={character.referenceImage} alt={character.name} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center px-4 text-center text-lg text-white/35">{character.name}</div>
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <CardMenu onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold text-white">
          {character.name}
          <span className="ml-2 text-sm font-normal text-white/45">{meta}</span>
        </h3>
        <p className="mt-3 line-clamp-4 flex-1 text-sm leading-6 text-white/55">
          {character.description || "暂无描述"}
        </p>
        {character.role ? (
          <span className="mt-4 inline-flex w-fit rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black">
            {character.role}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function LocationLandscapeCard({
  location,
  onOpen,
  onEdit,
  onDelete,
}: {
  location: Location;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={cn(landscapeAspectClass, portraitShellClass, "relative isolate cursor-pointer transition hover:border-white/20")}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {location.referenceImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={location.referenceImage} alt={location.name} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#171717] via-[#141014] to-[#0a0a0a]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
      <div onClick={(e) => e.stopPropagation()}>
        <CardMenu onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="text-lg font-semibold text-white">{location.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/60">
          {location.description || "暂无描述"}
        </p>
        <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black">
          {locationTypeLabels[location.type]}
        </span>
      </div>
    </article>
  );
}

const defaultChat = (): CharacterChatConfig => ({
  enabled: false,
  personality: "",
  memoryHooks: "",
  relationshipGoals: "",
});

const emptyCharacter: Omit<Character, "id"> = {
  name: "",
  age: undefined,
  role: "",
  description: "",
  chat: defaultChat(),
};

const emptyLocation: Omit<Location, "id"> = {
  name: "",
  type: "Master",
  description: "",
};

type Mode = "characters" | "locations";

export type WorldAssetEditorActions = {
  openAdd: () => void;
};

type Props = {
  mode: Mode;
  storyId?: string;
  onRegisterActions?: (actions: WorldAssetEditorActions) => void;
};

export function WorldAssetEditor({ mode, storyId, onRegisterActions }: Props) {
  const router = useRouter();
  const {
    world,
    episodes,
    characters,
    locations,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useWorldBuilderStore();

  const [characterDraft, setCharacterDraft] = useState<Character | Omit<Character, "id"> | null>(null);
  const [locationDraft, setLocationDraft] = useState<Location | Omit<Location, "id"> | null>(null);

  const openAdd = useCallback(() => {
    if (mode === "characters") setCharacterDraft(emptyCharacter);
    else setLocationDraft(emptyLocation);
  }, [mode]);

  useEffect(() => {
    onRegisterActions?.({ openAdd });
  }, [mode, onRegisterActions, openAdd]);

  const saveCharacter = () => {
    if (!characterDraft?.name.trim()) return;
    if ("id" in characterDraft) updateCharacter(characterDraft.id, characterDraft);
    else addCharacter(characterDraft);
    setCharacterDraft(null);
  };

  const storyTitle = episodes[0]?.title || world.title || "当前故事";

  const buildCharacterFromPrompt = () => {
    if (!characterDraft) return;
    const desc = characterDraft.description.trim();
    if (!desc) return;
    const name = desc.split(/[\n。，,]/)[0]?.trim().slice(0, 32) || "未命名角色";
    addCharacter({
      ...emptyCharacter,
      name,
      description: desc,
      role: characterDraft.role,
      chat: characterDraft.chat ?? defaultChat(),
    });
    setCharacterDraft(null);
  };

  const startBlankCharacter = () => {
    const id = addCharacter({
      ...emptyCharacter,
      name: "Untitled",
      role: "Character",
    });
    setCharacterDraft(null);
    if (storyId) {
      router.push(`/world-builder/stories/${storyId}/characters/${id}`);
    }
  };

  const buildLocationFromPrompt = () => {
    if (!locationDraft) return;
    const desc = locationDraft.description.trim();
    if (!desc) return;
    const name = desc.split(/[\n。，,]/)[0]?.trim().slice(0, 32) || "Untitled";
    addLocation({
      ...emptyLocation,
      name,
      description: desc,
      type: locationDraft.type || "Master",
    });
    setLocationDraft(null);
  };

  const startBlankLocation = () => {
    const id = addLocation({
      ...emptyLocation,
      name: "Untitled",
      type: "Master",
    });
    setLocationDraft(null);
    if (storyId) {
      router.push(`/world-builder/stories/${storyId}/locations/${id}`);
    }
  };

  const saveLocation = () => {
    if (!locationDraft?.name.trim()) return;
    if ("id" in locationDraft) updateLocation(locationDraft.id, locationDraft);
    else addLocation(locationDraft);
    setLocationDraft(null);
  };

  const openCharacterStudio = (characterId: string) => {
    if (!storyId) return;
    router.push(`/world-builder/stories/${storyId}/characters/${characterId}`);
  };

  const openLocationStudio = (locationId: string) => {
    if (!storyId) return;
    router.push(`/world-builder/stories/${storyId}/locations/${locationId}`);
  };

  const chat = characterDraft?.chat ?? defaultChat();
  const patchChat = (patch: Partial<CharacterChatConfig>) => {
    if (!characterDraft) return;
    setCharacterDraft({ ...characterDraft, chat: { ...chat, ...patch } });
  };

  return (
    <>
      {mode === "characters" && (
        <div className={portraitGridClass}>
          {characters.map((character) => (
            <CharacterPortraitCard
              key={character.id}
              character={character}
              onOpen={() => openCharacterStudio(character.id)}
              onEdit={() => openCharacterStudio(character.id)}
              onDelete={() => deleteCharacter(character.id)}
            />
          ))}
          <AddAssetCard label="添加角色" onClick={openAdd} />
        </div>
      )}

      {mode === "locations" && (
        <div className={landscapeGridClass}>
          {locations.map((location) => (
            <LocationLandscapeCard
              key={location.id}
              location={location}
              onOpen={() => openLocationStudio(location.id)}
              onEdit={() => openLocationStudio(location.id)}
              onDelete={() => deleteLocation(location.id)}
            />
          ))}
          <AddAssetCard label="添加地点" onClick={openAdd} aspect="landscape" />
        </div>
      )}

      {characterDraft && (
        <CharacterDraftModal
          storyTitle={storyTitle}
          draft={characterDraft}
          chat={chat}
          onPatch={(patch) => setCharacterDraft({ ...characterDraft, ...patch })}
          onPatchChat={patchChat}
          onClose={() => setCharacterDraft(null)}
          onSave={saveCharacter}
          onBuild={buildCharacterFromPrompt}
          onBlank={startBlankCharacter}
        />
      )}

      {locationDraft && (
        <LocationDraftModal
          storyTitle={storyTitle}
          draft={locationDraft}
          onPatch={(patch) => setLocationDraft({ ...locationDraft, ...patch })}
          onClose={() => setLocationDraft(null)}
          onSave={saveLocation}
          onBuild={buildLocationFromPrompt}
          onBlank={startBlankLocation}
        />
      )}
    </>
  );
}

function CharacterDraftModal({
  storyTitle,
  draft,
  chat,
  onPatch,
  onPatchChat,
  onClose,
  onSave,
  onBuild,
  onBlank,
}: {
  storyTitle: string;
  draft: Character | Omit<Character, "id">;
  chat: CharacterChatConfig;
  onPatch: (patch: Partial<Character>) => void;
  onPatchChat: (patch: Partial<CharacterChatConfig>) => void;
  onClose: () => void;
  onSave: () => void;
  onBuild: () => void;
  onBlank: () => void;
}) {
  const isEdit = "id" in draft;

  return (
    <div className={MODAL_OVERLAY_80} onClick={onClose}>
      <div
        className={cn(MODAL_PANEL, "w-full max-w-2xl rounded-2xl p-6 sm:p-8")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl tracking-tight text-white">
              {isEdit ? "编辑角色" : "创建角色"}
            </h2>
            {!isEdit && (
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
                在 <span className="font-semibold text-white">{storyTitle}</span> 中描述角色，生成设定与参考图。
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-white/45 transition hover:bg-white/8 hover:text-white/80"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {isEdit ? (
          <>
            <div className="mt-6 space-y-3">
              <input
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
                placeholder="姓名"
                value={draft.name}
                onChange={(e) => onPatch({ name: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
                placeholder="角色定位"
                value={draft.role}
                onChange={(e) => onPatch({ role: e.target.value })}
              />
              <textarea
                className="min-h-28 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm leading-6 text-white outline-none focus:border-white/25"
                placeholder="描述"
                value={draft.description}
                onChange={(e) => onPatch({ description: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm text-white/55">
                <input
                  type="checkbox"
                  checked={chat.enabled}
                  onChange={(e) => onPatchChat({ enabled: e.target.checked })}
                />
                启用角色对话配置
              </label>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onSave}
                className="inline-flex items-center gap-2 rounded-full !bg-[#f2f2f2] px-5 py-2 text-sm font-semibold !text-[#111111] transition hover:!bg-white"
              >
                保存
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative mt-8 min-h-[260px] rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => window.alert("AI 角色生成即将上线")}
                  className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08]"
                  aria-label="AI 生成"
                >
                  <Sparkles size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => window.alert("参考图上传即将上线")}
                  className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08]"
                  aria-label="添加参考"
                >
                  <Plus size={16} />
                </button>
              </div>
              <textarea
                value={draft.description}
                onChange={(e) => onPatch({ description: e.target.value })}
                rows={7}
                placeholder="描述角色"
                className="de-modal-surface-field min-h-[180px] w-full resize-none bg-transparent pb-14 text-sm leading-7 text-white outline-none placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={onBuild}
                disabled={!draft.description.trim()}
                className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full !bg-[#f2f2f2] px-4 py-2 text-sm font-semibold !text-[#111111] transition enabled:hover:!bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                创建
                <Sparkles size={14} />
                <ImagePlus size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={onBlank}
              className="mx-auto mt-8 flex items-center gap-1 text-sm text-white/70 transition hover:text-white"
            >
              或从空白角色开始
              <ArrowRight size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LocationDraftModal({
  storyTitle,
  draft,
  onPatch,
  onClose,
  onSave,
  onBuild,
  onBlank,
}: {
  storyTitle: string;
  draft: Location | Omit<Location, "id">;
  onPatch: (patch: Partial<Location>) => void;
  onClose: () => void;
  onSave: () => void;
  onBuild: () => void;
  onBlank: () => void;
}) {
  const isEdit = "id" in draft;

  return (
    <div className={MODAL_OVERLAY_80} onClick={onClose}>
      <div
        className={cn(MODAL_PANEL, "w-full max-w-2xl rounded-2xl p-6 sm:p-8")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl tracking-tight text-white">
              {isEdit ? "编辑地点" : "创建地点"}
            </h2>
            {!isEdit && (
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
                在 <span className="font-semibold text-white">{storyTitle}</span> 中描述地点，生成设定与参考图。
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-white/45 transition hover:bg-white/8 hover:text-white/80"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {isEdit ? (
          <>
            <div className="mt-6 space-y-3">
              <input
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
                placeholder="名称"
                value={draft.name}
                onChange={(e) => onPatch({ name: e.target.value })}
              />
              <select
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
                value={draft.type}
                onChange={(e) => onPatch({ type: e.target.value as Location["type"] })}
              >
                {Object.entries(locationTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-28 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm leading-6 text-white outline-none focus:border-white/25"
                placeholder="描述"
                value={draft.description}
                onChange={(e) => onPatch({ description: e.target.value })}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onSave}
                className="inline-flex items-center gap-2 rounded-full !bg-[#f2f2f2] px-5 py-2 text-sm font-semibold !text-[#111111] transition hover:!bg-white"
              >
                保存
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative mt-8 min-h-[260px] rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => window.alert("AI 地点生成即将上线")}
                  className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08]"
                  aria-label="AI 生成"
                >
                  <Sparkles size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => window.alert("参考图上传即将上线")}
                  className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08]"
                  aria-label="添加参考"
                >
                  <Plus size={16} />
                </button>
              </div>
              <textarea
                value={draft.description}
                onChange={(e) => onPatch({ description: e.target.value })}
                rows={7}
                placeholder="描述地点"
                className="de-modal-surface-field min-h-[180px] w-full resize-none bg-transparent pb-14 text-sm leading-7 text-white outline-none placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={onBuild}
                disabled={!draft.description.trim()}
                className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full !bg-[#f2f2f2] px-4 py-2 text-sm font-semibold !text-[#111111] transition enabled:hover:!bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                创建
                <Sparkles size={14} />
                <ImagePlus size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={onBlank}
              className="mx-auto mt-8 flex items-center gap-1 text-sm text-white/70 transition hover:text-white"
            >
              或从空白地点开始
              <ArrowRight size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
