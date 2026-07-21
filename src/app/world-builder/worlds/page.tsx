"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, Plus, Search, Sparkles, X } from "lucide-react";
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
  projectId?: string;
};

const sampleCards: WorldCard[] = [
  ...dramaPlayAssets.map((asset) => ({
    title: asset.title,
    genre: asset.genre,
    description: asset.description,
    poster: asset.poster,
    active: false,
  })),
  {
    title: "血色之城",
    genre: "恐怖",
    description: "一座明亮城市隐藏着百年吸血族与人类共存的秘密。",
    tone: "from-ink-strong via-red-950 to-accent",
    active: false,
  },
  {
    title: "春日盟约",
    genre: "爱情",
    description: "外交、孤独与权力在一场王室峰会上相撞。",
    tone: "from-panel via-stone-300 to-accent",
    active: false,
  },
];

const GENRES = ["全部", "古风", "恋爱", "奇幻", "恐怖", "历史", "悬疑", "爱情", "未分类"];

export default function WorldsPage() {
  const router = useRouter();
  const { listProjects, switchProject, deleteProject, activeProjectId } = useWorldBuilderStore();
  const [genre, setGenre] = useState("全部");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  const projects = listProjects();

  const worlds = useMemo(() => {
    const projectCards: WorldCard[] = projects.map((project) => ({
      title: project.name,
      genre: project.setupDraft.genre.split(/[,，]/)[0]?.trim() || "未分类",
      description: project.setupDraft.worldDescription || project.world.description,
      active: project.id === activeProjectId,
      projectId: project.id,
    }));
    const merged = [...projectCards, ...sampleCards];
    return merged.filter(({ title, genre: itemGenre, description }) => {
      return (
        (genre === "全部" || itemGenre === genre) &&
        `${title} ${description}`.toLowerCase().includes(query.toLowerCase())
      );
    });
  }, [genre, query, projects, activeProjectId]);

  const openProject = (card: WorldCard) => {
    if (!card.projectId) {
      router.push("/world-builder/setup");
      return;
    }
    switchProject(card.projectId);
    const target = projects.find((item) => item.id === card.projectId);
    router.push(
      target?.episodes.length
        ? `/world-builder/story-graph?project=${card.projectId}`
        : `/world-builder/setup?project=${card.projectId}`,
    );
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="flex min-h-full flex-col bg-[#0c0a0f] text-white">
        {/* TapNow-like top chrome */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-white/8 text-accent">
              <LayoutGrid size={16} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Workspace</p>
              <h1 className="text-sm font-semibold">世界库 · Canvas Library</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <Search size={14} className="text-white/35" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索世界 / 项目"
                className="w-44 bg-transparent text-sm outline-none placeholder:text-white/30"
              />
            </label>
            <Link
              href="/world-builder/home"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
            >
              <Plus size={15} /> 新建画布
            </Link>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Left genre rail — TapNow-style dock */}
          <aside className="hidden w-44 shrink-0 border-r border-white/8 p-3 md:block">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">筛选</p>
            <div className="mt-2 space-y-1">
              {GENRES.map((item) => (
                <button
                  key={item}
                  onClick={() => setGenre(item)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left text-xs transition",
                    genre === item ? "bg-accent/20 text-accent" : "text-white/50 hover:bg-white/6 hover:text-white/80",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <Link
              href="/world-builder/story-graph"
              className="mt-6 flex items-center gap-2 rounded-xl border border-dashed border-white/12 px-3 py-2.5 text-[11px] text-white/40 hover:border-accent/40 hover:text-accent"
            >
              <Sparkles size={12} /> 进入故事画布
            </Link>
          </aside>

          {/* Canvas board of project tiles */}
          <div className="flex-1 overflow-y-auto p-5">
            <p className="mb-4 text-xs text-white/40">
              单击选中 · 双击打开画布（交互参考 TapNow Canvas Library）
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {worlds.map((card) => {
                const key = `${card.projectId ?? "sample"}-${card.title}`;
                const selected = selectedId === key || card.active;
                return (
                  <article
                    key={key}
                    onClick={() => setSelectedId(key)}
                    onDoubleClick={() => openProject(card)}
                    className={cn(
                      "group relative cursor-pointer overflow-hidden rounded-2xl border bg-[#16141c] shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition",
                      selected ? "border-accent ring-1 ring-accent/40" : "border-white/8 hover:border-white/20",
                    )}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#1a1620]">
                      {card.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.poster}
                          alt={card.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className={cn("h-full w-full bg-gradient-to-br", card.tone ?? "from-[#1a1218] to-[#3d1f2c]")} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <span className="absolute left-3 top-3 rounded-lg bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur">
                        {card.genre}
                      </span>
                      {card.projectId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDelete({ id: card.projectId!, title: card.title });
                          }}
                          className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-black/50 text-white/60 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h2 className="text-base font-semibold tracking-tight">{card.title}</h2>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/55">{card.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/6 px-3 py-2.5 text-[11px] text-white/40">
                      <span>{card.projectId ? (card.active ? "当前项目" : "我的项目") : "示例世界"}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProject(card);
                        }}
                        className="rounded-md px-2 py-1 text-accent hover:bg-accent/15"
                      >
                        打开
                      </button>
                    </div>
                  </article>
                );
              })}

              <Link
                href="/world-builder/home"
                className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-white/15 text-white/35 transition hover:border-accent/50 hover:text-accent hover:bg-accent/5"
              >
                <span className="flex flex-col items-center gap-2 text-sm">
                  <Plus size={22} /> 新建世界画布
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#16141c] p-6 text-white shadow-soft">
            <h2 className="text-lg font-semibold">删除世界？</h2>
            <p className="mt-2 text-sm text-white/50">将删除「{pendingDelete.title}」及其本地故事数据，此操作不可撤销。</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setPendingDelete(null)} className="rounded-xl border border-white/15 px-4 py-2 text-sm">
                取消
              </button>
              <button
                onClick={() => {
                  deleteProject(pendingDelete.id);
                  setPendingDelete(null);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </WorldBuilderLayout>
  );
}
