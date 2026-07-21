"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Route } from "lucide-react";
import { CharacterCard } from "@/components/world-builder/CharacterCard";
import { LocationCard } from "@/components/world-builder/LocationCard";
import { cn } from "@/lib/utils";
import { locationTypeLabels } from "@/lib/worldBuilderLabels";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Character, Location } from "@/types/worldBuilder";

type Tab = "Characters" | "Locations" | "Storylines";

const tabLabels: Record<Tab, string> = {
  Characters: "角色",
  Locations: "地点",
  Storylines: "故事线",
};

const emptyCharacter: Omit<Character, "id"> = {
  name: "",
  age: undefined,
  role: "",
  description: "",
};

const emptyLocation: Omit<Location, "id"> = {
  name: "",
  type: "Master",
  description: "",
};

export function WorldTabs() {
  const [tab, setTab] = useState<Tab>("Characters");
  const [characterDraft, setCharacterDraft] = useState<Character | Omit<Character, "id"> | null>(null);
  const [locationDraft, setLocationDraft] = useState<Location | Omit<Location, "id"> | null>(null);
  const {
    characters,
    locations,
    episodes,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useWorldBuilderStore();

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

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-soft">
          {(["Characters", "Locations", "Storylines"] as Tab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition",
                tab === item && "bg-ink text-white",
              )}
            >
              {tabLabels[item]}
            </button>
          ))}
        </div>
        {tab === "Characters" && (
          <button onClick={() => setCharacterDraft(emptyCharacter)} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
            <Plus size={16} /> 添加角色
          </button>
        )}
        {tab === "Locations" && (
          <button onClick={() => setLocationDraft(emptyLocation)} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
            <Plus size={16} /> 添加地点
          </button>
        )}
      </div>

      {tab === "Characters" && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {characters.map((character) => (
            <CharacterCard key={character.id} character={character} onEdit={setCharacterDraft} onDelete={deleteCharacter} />
          ))}
        </div>
      )}

      {tab === "Locations" && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {locations.map((location) => (
            <LocationCard key={location.id} location={location} onEdit={setLocationDraft} onDelete={deleteLocation} />
          ))}
        </div>
      )}

      {tab === "Storylines" && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {episodes.map((episode) => (
            <Link key={episode.id} href="/world-builder/story-graph" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft hover:border-pink-200">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Route size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">第 {episode.index} 集</p>
                  <h3 className="font-semibold">{episode.title}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {characterDraft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-strong/35 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">角色信息</h2>
            <div className="mt-5 grid gap-3">
              <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder="角色名" value={characterDraft.name} onChange={(e) => setCharacterDraft({ ...characterDraft, name: e.target.value })} />
              <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder="年龄" type="number" value={characterDraft.age ?? ""} onChange={(e) => setCharacterDraft({ ...characterDraft, age: e.target.value ? Number(e.target.value) : undefined })} />
              <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder="身份 / 戏剧功能" value={characterDraft.role} onChange={(e) => setCharacterDraft({ ...characterDraft, role: e.target.value })} />
              <textarea className="min-h-28 rounded-xl border border-slate-200 px-3 py-2" placeholder="角色描述" value={characterDraft.description} onChange={(e) => setCharacterDraft({ ...characterDraft, description: e.target.value })} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setCharacterDraft(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">取消</button>
              <button onClick={saveCharacter} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">保存</button>
            </div>
          </div>
        </div>
      )}

      {locationDraft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-strong/35 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">地点信息</h2>
            <div className="mt-5 grid gap-3">
              <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder="地点名" value={locationDraft.name} onChange={(e) => setLocationDraft({ ...locationDraft, name: e.target.value })} />
              <select className="rounded-xl border border-slate-200 px-3 py-2" value={locationDraft.type} onChange={(e) => setLocationDraft({ ...locationDraft, type: e.target.value as Location["type"] })}>
                {Object.entries(locationTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <textarea className="min-h-28 rounded-xl border border-slate-200 px-3 py-2" placeholder="地点描述" value={locationDraft.description} onChange={(e) => setLocationDraft({ ...locationDraft, description: e.target.value })} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setLocationDraft(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">取消</button>
              <button onClick={saveLocation} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">保存</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
