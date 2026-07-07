"use client";

import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { dramaPlayAssets } from "@/data/dramaPlayAssets";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type WorldCard = {
  title: string;
  genre: string;
  description: string;
  active: boolean;
  tone?: string;
  poster?: string;
};

const worlds: WorldCard[] = [
  { title: "记忆盗贼", genre: "悬疑", description: "雨夜东京里，一名侦探追捕能偷走记忆的神秘罪犯。", tone: "from-ink-strong via-ink-muted to-accent", active: true },
  ...dramaPlayAssets.map((asset) => ({
    title: asset.title,
    genre: asset.genre,
    description: asset.description,
    poster: asset.poster,
    active: false,
  })),
  { title: "血色之城", genre: "恐怖", description: "一座明亮城市隐藏着百年吸血族与人类共存的秘密。", tone: "from-ink-strong via-red-950 to-accent", active: false },
  { title: "春日盟约", genre: "爱情", description: "外交、孤独与权力在一场王室峰会上相撞。", tone: "from-panel via-stone-300 to-accent", active: false },
];

export default function WorldsPage() {
  const { world } = useWorldBuilderStore();
  const [genre, setGenre] = useState("全部类型");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      worlds.filter(({ title, genre: itemGenre, description }) => {
        return (
          (genre === "全部类型" || itemGenre === genre) &&
          `${title} ${description}`.toLowerCase().includes(query.toLowerCase())
        );
      }),
    [genre, query],
  );

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <section className="relative overflow-hidden flex flex-wrap items-end justify-between gap-4 rounded-[28px] border border-pink-100 bg-white p-6 shadow-soft">
          <div className="absolute inset-0 dot-matrix pointer-events-none" />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">世界库</p>
            <h1 className="mt-2 text-3xl font-semibold">世界库</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              管理所有可继续制作、可生成故事或可发布到 App 的世界。
            </p>
          </div>
          <Link href="/world-builder/setup" className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
            <Plus size={16} /> 新建世界
          </Link>
        </section>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <SlidersHorizontal size={15} />
            <select value={genre} onChange={(event) => setGenre(event.target.value)} className="bg-transparent outline-none">
              {["全部类型", "古风", "恋爱", "奇幻", "恐怖", "历史", "悬疑", "爱情"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <Search size={15} className="text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索世界" className="w-48 bg-transparent outline-none" />
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ title, genre: itemGenre, description, tone, poster, active }) => (
            <Link
              key={title}
              href={active ? "/world-builder" : "/world-builder/setup"}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft hover:border-pink-200"
            >
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt={title} className="h-48 w-full object-cover" />
              ) : (
                <div className="relative h-48 bg-[linear-gradient(135deg,#1a0f2e,#3d1b4e_48%,#d9468a)]">
                  <div className="absolute inset-0 dot-matrix opacity-25" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{itemGenre}</span>
                  {active && <span className="rounded-lg bg-accent-soft px-2 py-1 text-[10px] font-semibold text-accent">继续制作</span>}
                </div>
                <h2 className="mt-3 text-lg font-semibold">{active ? world.title : title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{active ? world.description : description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </WorldBuilderLayout>
  );
}
