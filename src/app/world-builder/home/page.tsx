"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ImagePlus,
  Loader2,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { dramaPlayAssets } from "@/data/dramaPlayAssets";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

const sampleWorlds = [
  ...dramaPlayAssets.map((asset) => ({
    title: asset.title,
    genre: asset.genre,
    description: asset.description,
    poster: asset.poster,
    tone: "from-ink-strong via-ink-muted to-accent",
    heat: "热度 9.2",
    completion: "完播 68%",
    interactions: "3 个选择",
  })),
  {
    title: "绒星宇宙",
    genre: "奇幻",
    description:
      "柔软的小生物伙伴漂浮在梦境星球上，展开温柔、轻盈的互动短剧。",
    tone: "from-ink-strong via-ink to-accent",
    heat: "热度 8.7",
    completion: "完播 61%",
    interactions: "5 个选择",
  },
  {
    title: "血色之城",
    genre: "恐怖",
    description:
      "一座过分明亮的城市隐藏着百年吸血族与人类共存的秘密。",
    tone: "from-ink-strong via-red-950 to-accent",
    heat: "热度 8.9",
    completion: "完播 57%",
    interactions: "4 个选择",
  },
  {
    title: "黄金时代伊比利亚",
    genre: "历史",
    description: "17 世纪西班牙的帝国、信仰与阴谋交织成可分支的宫廷故事。",
    tone: "from-accent via-stone-700 to-ink-strong",
    heat: "热度 8.4",
    completion: "完播 63%",
    interactions: "6 个选择",
  },
  {
    title: "最后一条短信",
    genre: "悬疑",
    description: "一条迟来的消息把观众拖入记忆、愧疚和失踪时间的谜网。",
    tone: "from-ink-strong via-ink-muted to-accent",
    heat: "热度 9.0",
    completion: "完播 66%",
    interactions: "4 个选择",
  },
  {
    title: "西溪高中假女友",
    genre: "剧情",
    description: "不起眼的女生被卷入一段假恋爱关系，选择会改变校园权力结构。",
    tone: "from-panel via-accent-soft to-accent",
    heat: "热度 8.5",
    completion: "完播 72%",
    interactions: "3 个选择",
  },
  {
    title: "雨夜公路追击",
    genre: "悬疑",
    description: "雨夜高速上，每一次路线选择都决定追捕是否成功。",
    tone: "from-ink-strong via-ink-muted to-accent",
    heat: "热度 8.8",
    completion: "完播 59%",
    interactions: "5 个选择",
  },
];

export default function StudioHomePage() {
  const { world, updateSetupDraft } = useWorldBuilderStore();
  const [prompt, setPrompt] = useState("一个失忆侦探追捕能偷走记忆的神秘盗贼。");
  const [genre, setGenre] = useState("全部类型");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const worlds = useMemo(() => {
    return sampleWorlds.filter((item) => {
      const matchesGenre = genre === "全部类型" || item.genre === genre;
      const matchesQuery = `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase());
      return matchesGenre && matchesQuery;
    });
  }, [genre, query]);

  const handleCreate = () => {
    setCreating(true);
    updateSetupDraft({ worldDescription: prompt, worldTitle: "未命名世界" });
    window.setTimeout(() => {
      window.location.href = "/world-builder/setup";
    }, 450);
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="min-h-screen bg-stage px-6 py-8">
        <section className="mx-auto flex max-w-3xl flex-col items-center pt-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            互动短剧编辑器 DramaEditor
          </p>
          <h1 className="mt-4 text-5xl font-serif leading-tight tracking-normal text-ink-strong">
            一键生成，可以玩的短剧
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
            One Click, Boundless Stories。面向 App 的树状分支剧情、互动节点、视频节点和多人协作制作平台。
          </p>

          <div className="mt-8 w-full rounded-3xl border border-slate-200 bg-white p-3 shadow-soft">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="你想创建一个怎样的世界？"
              className="min-h-36 w-full resize-none rounded-2xl border-0 bg-transparent px-3 py-3 text-sm leading-6 outline-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <ImagePlus size={14} /> 添加参考
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  自动拆解 <ChevronDown size={14} />
                </button>
                <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  视觉风格 <ChevronDown size={14} />
                </button>
              </div>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-white"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                创建
              </button>
            </div>
          </div>
          <Link href="/world-builder/setup" className="mt-4 text-sm text-slate-500 hover:text-accent">
            或从空白世界开始 <ArrowRight size={14} className="inline" />
          </Link>
        </section>

        <section className="mx-auto mt-14 max-w-6xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            继续观看
          </p>
          <Link
            href="/world-builder/app-preview"
            className="group flex max-w-xl items-center gap-4 rounded-3xl border border-slate-200 bg-white p-3 text-left shadow-soft hover:border-orange-200"
          >
            <div className="grid h-[132px] w-[92px] shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,#090d16,#151b29_45%,#f27d3d)] text-white">
              <Play size={22} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-accent">上次看到 第 1 集 · 互动选择前</p>
              <h2 className="mt-2 truncate text-xl font-semibold text-ink-strong">{world.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{world.description}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[42%] rounded-full bg-accent" />
              </div>
              <p className="mt-2 text-xs text-slate-400">42% 已观看 · 点按继续互动</p>
            </div>
          </Link>
        </section>

        <section className="mx-auto mt-12 max-w-6xl">
          <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <SlidersHorizontal size={15} />
              <select
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                className="min-h-7 bg-transparent outline-none"
              >
                {["全部类型", "奇幻", "恐怖", "历史", "悬疑", "剧情"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <Search size={15} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索世界"
                className="min-h-7 w-44 bg-transparent outline-none"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {worlds.map((item) => (
              <WorldFeedCard key={item.title} {...item} />
            ))}
            <Link
              href="/world-builder/setup"
              className="grid min-h-[240px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-50"
            >
              <span className="flex flex-col items-center gap-3 text-sm font-medium">
                <Plus size={22} /> 未命名世界
              </span>
            </Link>
          </div>
          <div className="py-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">已经到底</p>
            <p className="mt-2 text-sm text-slate-500">继续创建你的互动短剧世界。</p>
          </div>
        </section>
      </div>
    </WorldBuilderLayout>
  );
}

function WorldFeedCard({
  title,
  genre,
  description,
  tone,
  poster,
  heat,
  completion,
  interactions,
}: {
  title: string;
  genre: string;
  description: string;
  tone: string;
  poster?: string;
  heat: string;
  completion: string;
  interactions: string;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-soft hover:border-orange-200">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt={title} className="h-40 w-full object-cover" />
      ) : (
        <div className={cn("h-40 bg-gradient-to-br", tone)} />
      )}
      <div className="p-4">
        <div className="mb-2 inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
          {genre}
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[heat, completion, interactions].map((item) => (
            <span key={item} className="rounded-lg bg-orange-50 px-2 py-1 text-[11px] font-semibold text-accent">
              {item}
            </span>
          ))}
        </div>
        <Link
          href="/world-builder/app-preview"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white"
        >
          <Play size={15} /> 立即预览
        </Link>
      </div>
    </article>
  );
}
