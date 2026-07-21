"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { dramaPlayAssets } from "@/data/dramaPlayAssets";
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
  { title: "血色之城", genre: "恐怖", description: "一座明亮城市隐藏着百年吸血族与人类共存的秘密。", tone: "from-ink-strong via-red-950 to-accent", active: false },
  { title: "春日盟约", genre: "爱情", description: "外交、孤独与权力在一场王室峰会上相撞。", tone: "from-panel via-stone-300 to-accent", active: false },
];

export default function WorldsPage() {
  const router = useRouter();
  const { listProjects, switchProject, deleteProject, activeProjectId } = useWorldBuilderStore();
  const [genre, setGenre] = useState("全部类型");
  const [query, setQuery] = useState("");
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
        (genre === "全部类型" || itemGenre === genre) &&
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
    router.push(`/world-builder/worlds/${card.projectId}`);
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteProject(pendingDelete.id);
    setPendingDelete(null);
  };

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
          <Link href="/world-builder/home" className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
            <Plus size={16} /> 新建世界
          </Link>
        </section>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <SlidersHorizontal size={15} />
            <select value={genre} onChange={(event) => setGenre(event.target.value)} className="bg-transparent outline-none">
              {["全部类型", "古风", "恋爱", "奇幻", "恐怖", "历史", "悬疑", "爱情", "未分类"].map((item) => (
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
          {worlds.map(({ title, genre: itemGenre, description, poster, active, projectId }) => (
            <article
              key={`${projectId ?? "sample"}-${title}`}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft hover:border-pink-200"
            >
              <button
                type="button"
                onClick={() => openProject({ title, genre: itemGenre, description, active, poster, projectId })}
                className="block w-full text-left"
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
                    {projectId && !active && <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">我的项目</span>}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{description}</p>
                </div>
              </button>

              {projectId && (
                <button
                  type="button"
                  aria-label={`删除世界「${title}」`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPendingDelete({ id: projectId, title });
                  }}
                  className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full border border-white/30 bg-black/40 text-white shadow-sm backdrop-blur transition hover:bg-red-500/90 hover:border-red-300"
                >
                  <X size={16} />
                </button>
              )}
            </article>
          ))}
        </div>
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-3xl border border-pink-100 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-ink-strong">确认删除世界？</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              将永久删除「{pendingDelete.title}」及其设定、角色、地点与故事图数据，此操作无法撤销。
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
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
