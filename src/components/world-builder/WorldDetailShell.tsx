"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ChevronRight, ExternalLink, Plus, Upload } from "lucide-react";
import { CharacterCard } from "@/components/world-builder/CharacterCard";
import { LocationCard } from "@/components/world-builder/LocationCard";
import { cn } from "@/lib/utils";
import { MODAL_OVERLAY, MODAL_PANEL } from "@/lib/modalTheme";
import { locationTypeLabels } from "@/lib/worldBuilderLabels";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Character, CharacterChatConfig, Location } from "@/types/worldBuilder";

export type WorldDetailTab = "characters" | "locations" | "storylines";

const tabMeta: Record<WorldDetailTab, string> = {
  characters: "Characters",
  locations: "Locations",
  storylines: "Storylines",
};

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

type WorldDetailShellProps = {
  tab: WorldDetailTab;
};

export function WorldDetailShell({ tab }: WorldDetailShellProps) {
  const params = useParams<{ worldId: string }>();
  const worldId = params.worldId;
  const pathname = usePathname();
  const router = useRouter();
  const {
    world,
    characters,
    locations,
    episodes,
    nodes,
    ensureProjectLoaded,
    listProjects,
    publishStory,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    addLocation,
    updateLocation,
    deleteLocation,
    addEpisode,
  } = useWorldBuilderStore();

  const [characterDraft, setCharacterDraft] = useState<Character | Omit<Character, "id"> | null>(null);
  const [locationDraft, setLocationDraft] = useState<Location | Omit<Location, "id"> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!worldId) return;
    const ok = ensureProjectLoaded(worldId);
    setMissing(!ok);
  }, [worldId, ensureProjectLoaded]);

  const project = listProjects().find((item) => item.id === worldId);

  const published = nodes.some((n) => n.kind === "scene" && n.data.status === "ready");
  const base = `/world-builder/worlds/${worldId}`;

  const saveCharacter = () => {
    if (!characterDraft?.name.trim()) return;
    if ("id" in characterDraft) updateCharacter(characterDraft.id, characterDraft);
    else addCharacter(characterDraft);
    setCharacterDraft(null);
  };

  const saveLocation = () => {
    if (!locationDraft?.name.trim()) return;
    if ("id" in locationDraft) updateLocation(locationDraft.id, locationDraft);
    else addLocation(locationDraft);
    setLocationDraft(null);
  };

  const handlePublish = () => {
    const issues = publishStory();
    setNotice(issues.some((i) => i.severity === "error") ? `发布检查：${issues.length} 项待处理` : "Publish world · 检查通过");
  };

  const handleAddStory = () => {
    addEpisode({ title: `Episode ${episodes.length + 1}`, description: "" });
    router.push(`/world-builder/stories/${worldId}`);
  };

  if (missing) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl text-ink-strong">World not found</h1>
          <p className="mt-2 text-sm text-ink-muted">该世界不在本地项目中。</p>
          <Link href="/world-builder/worlds" className="mt-5 inline-flex rounded-lg bg-ink-strong px-4 py-2 text-sm font-semibold text-white">
            Back to My Worlds
          </Link>
        </div>
      </div>
    );
  }

  const chat = characterDraft?.chat ?? defaultChat();
  const patchChat = (patch: Partial<CharacterChatConfig>) => {
    if (!characterDraft) return;
    setCharacterDraft({ ...characterDraft, chat: { ...chat, ...patch } });
  };

  return (
    <div className="min-h-full bg-stage">
      <section className="relative overflow-hidden border-b border-card-border">
        <div className="relative min-h-[280px] bg-[linear-gradient(135deg,#0a0a0a_0%,#1a1218_45%,#b94a6a_120%)] px-6 py-5 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,120,147,0.35),transparent_36%)]" />
          <div className="relative z-10 flex min-h-[248px] flex-col justify-between">
            <nav className="flex flex-wrap items-center gap-1.5 text-sm text-white/65">
              <Link href="/world-builder/worlds" className="hover:text-white">
                My Worlds
              </Link>
              <ChevronRight size={14} className="text-white/35" />
              <span className="text-white">{world.title || project?.name}</span>
            </nav>

            <div className="max-w-3xl">
              <h1 className="font-display text-5xl tracking-tight">{world.title || project?.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">{world.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[...world.genre, ...world.tags.slice(0, 4)].map((tag) => (
                  <span key={tag} className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs text-white/75">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePublish}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink-strong"
              >
                <Upload size={15} /> Publish world
              </button>
              {published && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200">
                  Published
                </span>
              )}
              <Link
                href={`/world-builder/stories/${worldId}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-white/85 hover:bg-white/16"
              >
                Open story desk <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-6 py-3">
        <div className="flex gap-1">
          {(Object.keys(tabMeta) as WorldDetailTab[]).map((item) => {
            const href = `${base}/${item}`;
            const active = tab === item || (item === "characters" && pathname === base);
            return (
              <Link
                key={item}
                href={href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  active ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-stage hover:text-ink",
                )}
              >
                {tabMeta[item]}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === "characters" && (
            <button
              type="button"
              onClick={() => setCharacterDraft(emptyCharacter)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-strong px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus size={14} /> Add Character
            </button>
          )}
          {tab === "locations" && (
            <button
              type="button"
              onClick={() => setLocationDraft(emptyLocation)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-strong px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus size={14} /> Add Location
            </button>
          )}
          {tab === "storylines" && (
            <button
              type="button"
              onClick={handleAddStory}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-strong px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus size={14} /> Add Story
            </button>
          )}
        </div>
      </div>

      <div className="min-h-screen px-6 pb-10 pt-4">
        {tab === "characters" && (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onEdit={(c) => setCharacterDraft({ ...c, chat: c.chat ?? defaultChat() })}
                onDelete={deleteCharacter}
              />
            ))}
            {!characters.length && (
              <EmptyHint label="Add Character" onClick={() => setCharacterDraft(emptyCharacter)} />
            )}
          </div>
        )}

        {tab === "locations" && (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {locations.map((location) => (
              <LocationCard key={location.id} location={location} onEdit={setLocationDraft} onDelete={deleteLocation} />
            ))}
            {!locations.length && <EmptyHint label="Add Location" onClick={() => setLocationDraft(emptyLocation)} />}
          </div>
        )}

        {tab === "storylines" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {episodes.map((episode) => {
              const count = nodes.filter((n) => n.data.episodeId === episode.id).length;
              const ready = nodes.some(
                (n) => n.data.episodeId === episode.id && n.kind === "scene" && n.data.status === "ready",
              );
              return (
                <Link
                  key={episode.id}
                  href={`/world-builder/stories/${worldId}`}
                  className="group overflow-hidden rounded-xl border border-card-border bg-card shadow-soft transition hover:border-accent/40"
                >
                  <div className="aspect-[9/16] bg-gradient-to-br from-[#121018] to-[#3a1f2c] p-4 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                      Episode {episode.index}
                    </p>
                    <h3 className="mt-3 font-display text-3xl leading-tight">{episode.title}</h3>
                    <p className="mt-auto pt-8 text-xs text-white/55">
                      {count} nodes{ready ? " · Published" : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleAddStory}
              className="grid aspect-[9/16] place-items-center rounded-xl border border-dashed border-card-border text-ink-muted hover:border-accent/50 hover:text-accent"
            >
              <span className="flex flex-col items-center gap-2 text-sm">
                <Plus size={20} /> Add Story
              </span>
            </button>
          </div>
        )}
      </div>

      {notice && (
        <div className="fixed right-5 top-5 z-50 rounded-xl border border-card-border bg-card px-4 py-3 text-sm shadow-soft">
          {notice}
          <button type="button" className="ml-3 text-ink-muted" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      {characterDraft && (
        <div className={MODAL_OVERLAY}>
          <div className={cn(MODAL_PANEL, "w-full max-w-lg rounded-2xl p-5")}>
            <h2 className="text-lg font-semibold">{"id" in characterDraft ? "Edit Character" : "Add Character"}</h2>
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-lg border border-card-border px-3 py-2 text-sm"
                placeholder="Name"
                value={characterDraft.name}
                onChange={(e) => setCharacterDraft({ ...characterDraft, name: e.target.value })}
              />
              <input
                className="rounded-lg border border-card-border px-3 py-2 text-sm"
                placeholder="Role"
                value={characterDraft.role}
                onChange={(e) => setCharacterDraft({ ...characterDraft, role: e.target.value })}
              />
              <textarea
                className="min-h-24 rounded-lg border border-card-border px-3 py-2 text-sm"
                placeholder="Description"
                value={characterDraft.description}
                onChange={(e) => setCharacterDraft({ ...characterDraft, description: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chat.enabled}
                  onChange={(e) => patchChat({ enabled: e.target.checked })}
                />
                Character chat config
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCharacterDraft(null)} className="rounded-lg border border-card-border px-3 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={saveCharacter} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {locationDraft && (
        <div className={MODAL_OVERLAY}>
          <div className={cn(MODAL_PANEL, "w-full max-w-lg rounded-2xl p-5")}>
            <h2 className="text-lg font-semibold">{"id" in locationDraft ? "Edit Location" : "Add Location"}</h2>
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-lg border border-card-border px-3 py-2 text-sm"
                placeholder="Name"
                value={locationDraft.name}
                onChange={(e) => setLocationDraft({ ...locationDraft, name: e.target.value })}
              />
              <select
                className="rounded-lg border border-card-border px-3 py-2 text-sm"
                value={locationDraft.type}
                onChange={(e) =>
                  setLocationDraft({
                    ...locationDraft,
                    type: e.target.value as Location["type"],
                  })
                }
              >
                {Object.entries(locationTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-24 rounded-lg border border-card-border px-3 py-2 text-sm"
                placeholder="Description"
                value={locationDraft.description}
                onChange={(e) => setLocationDraft({ ...locationDraft, description: e.target.value })}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setLocationDraft(null)} className="rounded-lg border border-card-border px-3 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={saveLocation} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyHint({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-[180px] place-items-center rounded-xl border border-dashed border-card-border text-sm text-ink-muted hover:border-accent/50 hover:text-accent"
    >
      <span className="inline-flex items-center gap-2">
        <Plus size={16} /> {label}
      </span>
    </button>
  );
}
