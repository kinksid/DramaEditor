"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitFork, Play, Search, Tv } from "lucide-react";
import { useMemo, useState } from "react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { dramaPlayAssets } from "@/data/dramaPlayAssets";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type InspireCard = {
  id: string;
  title: string;
  genre: string;
  description: string;
  poster?: string;
  author: string;
  remixCount: string;
};

const inspireCards: InspireCard[] = [
  ...dramaPlayAssets.map((asset, index) => ({
    id: asset.id,
    title: asset.title,
    genre: asset.genre,
    description: asset.description,
    poster: asset.poster,
    author: ["Studio Demo", "TapTV Remix", "Creator Lab"][index % 3],
    remixCount: `${12 + index * 7}`,
  })),
  {
    id: "inspire-neon",
    title: "霓虹记忆交易",
    genre: "赛博",
    description: "一座用记忆换取身份的城市。公开节点配方：角色一致性 → 分支互动 → 双结局。",
    author: "Community",
    remixCount: "48",
  },
  {
    id: "inspire-rain",
    title: "雨夜追击分镜",
    genre: "悬疑",
    description: "TapTV 式可 Remix 工作流：雨夜公路、手势互动、秘密结局三节点骨架。",
    author: "Storycraft",
    remixCount: "31",
  },
];

export default function InspirePage() {
  const router = useRouter();
  const { updateCreationSession, createProjectFromSession } = useWorldBuilderStore();
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("全部");
  const [busyId, setBusyId] = useState<string | null>(null);

  const cards = useMemo(() => {
    return inspireCards.filter((item) => {
      const hitGenre = genre === "全部" || item.genre === genre;
      const hitQuery = `${item.title} ${item.description} ${item.author}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return hitGenre && hitQuery;
    });
  }, [genre, query]);

  const remix = (card: InspireCard) => {
    setBusyId(card.id);
    updateCreationSession({
      prompt: `${card.title}\n\n${card.description}\n\n[Remix from TapTV-style inspire · ${card.author}]`,
      visualStylePreset: "电影写实",
    });
    const projectId = createProjectFromSession();
    const st = useWorldBuilderStore.getState();
    st.updateSetupDraft({
      worldTitle: `${card.title}（Remix）`,
      worldDescription: card.description,
      visualStyle: "电影写实",
      genre: card.genre,
    });
    st.updateWorld({ title: `${card.title}（Remix）`, description: card.description });
    router.push(`/world-builder/setup?project=${projectId}`);
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="flex min-h-full flex-col bg-[#0c0a0f] text-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-white/8 text-accent">
              <Tv size={16} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">TapTV · Local Shell</p>
              <h1 className="text-sm font-semibold">灵感画布 · 浏览与 Remix</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <Search size={14} className="text-white/35" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索灵感 / 作者"
                className="w-44 bg-transparent text-sm outline-none placeholder:text-white/30"
              />
            </label>
            <Link
              href="/world-builder/home"
              className="rounded-xl border border-white/12 px-3 py-2 text-xs text-white/55 hover:text-white"
            >
              返回创作首页
            </Link>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-44 shrink-0 border-r border-white/8 p-3 md:block">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">频道</p>
            <div className="mt-2 space-y-1">
              {["全部", "古风", "恋爱", "奇幻", "悬疑", "赛博", "剧情"].map((item) => (
                <button
                  key={item}
                  onClick={() => setGenre(item)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left text-xs transition",
                    genre === item ? "bg-accent/20 text-accent" : "text-white/50 hover:bg-white/6",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <p className="mt-6 px-2 text-[10px] leading-4 text-white/30">
              本地壳：对照 TapTV 浏览/Remix。不接真实社交发布（待你确认 C4）。
            </p>
          </aside>

          <div className="flex-1 overflow-y-auto p-5">
            <p className="mb-4 text-xs text-white/40">
              对照 <span className="text-white/60">app.tapnow.ai/home/taptv</span>：公开画布流 → 学习配方 → Remix 到本机项目。
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <article
                  key={card.id}
                  className="group overflow-hidden rounded-2xl border border-white/8 bg-[#16141c] shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition hover:border-accent/35"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#1a1620]">
                    {card.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.poster}
                        alt={card.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-gradient-to-br from-[#1a1218] to-[#3d1f2c]">
                        <Play className="text-white/35" size={28} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                    <span className="absolute left-3 top-3 rounded-lg bg-black/45 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
                      {card.genre}
                    </span>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h2 className="text-base font-semibold">{card.title}</h2>
                      <p className="mt-1 text-[11px] text-white/55">
                        {card.author} · {card.remixCount} Remix
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-xs leading-5 text-white/45">{card.description}</p>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === card.id}
                        onClick={() => remix(card)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-deep disabled:opacity-60"
                      >
                        <GitFork size={13} />
                        {busyId === card.id ? "Remix 中…" : "Remix 到本机"}
                      </button>
                      <Link
                        href="/world-builder/app-preview"
                        className="inline-flex items-center justify-center rounded-xl border border-white/12 px-3 py-2 text-xs text-white/60 hover:bg-white/6"
                      >
                        预览
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorldBuilderLayout>
  );
}
