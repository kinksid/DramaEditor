"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GitFork, Plus, Search, Star, UserRound } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { dramaPlayAssets } from "@/data/dramaPlayAssets";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type FeedTab = "staff" | "following" | "hot" | "latest";

type DramaTvCard = {
  id: string;
  title: string;
  genre: string;
  description: string;
  poster?: string;
  video?: string;
  author: string;
  stars: number;
  category: string;
  followed?: boolean;
  staffPick?: boolean;
};

const CATEGORIES = [
  "全部",
  "动画黑客松",
  "精选画布",
  "电视广告",
  "动画",
  "叙事短片",
  "MV",
  "创意",
  "教程",
  "其他",
] as const;

const FEED_TABS: Array<{ id: FeedTab; label: string }> = [
  { id: "staff", label: "编辑精选" },
  { id: "following", label: "关注" },
  { id: "hot", label: "热门推荐" },
  { id: "latest", label: "最新发布" },
];

const genreToCategory: Record<string, string> = {
  古风: "叙事短片",
  恋爱: "叙事短片",
  赛博: "创意",
  悬疑: "叙事短片",
  奇幻: "动画",
};

const categoryAuthors = ["DIDI_OK", "StudioDemo", "CreatorLab", "ArenaLab", "NeonForge", "BeatRoom", "HackLab"];

function mediaSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 3)) % dramaPlayAssets.length;
  }
  return hash;
}

function attachPreviewMedia(card: DramaTvCard): DramaTvCard {
  if (card.poster && card.video) return card;
  const asset = dramaPlayAssets[mediaSeed(card.id) % dramaPlayAssets.length];
  return {
    ...card,
    poster: card.poster ?? asset.poster,
    video: card.video ?? asset.video,
  };
}

const extraCategoryCards: DramaTvCard[] = [
  {
    id: "inspire-hackathon-48h",
    title: "像素迷宫 48h",
    genre: "动画",
    description: "动画黑客松限时命题：循环走廊与手势分支。",
    author: "HackLab",
    stars: 35,
    category: "动画黑客松",
    staffPick: true,
    followed: true,
  },
  {
    id: "inspire-hackathon-rig",
    title: "骨骼绑定挑战",
    genre: "动画",
    description: "角色 turnaround + 三视图互动节点模板。",
    author: "FrameRun",
    stars: 27,
    category: "动画黑客松",
    followed: true,
  },
  {
    id: "inspire-canvas-remix",
    title: "画布 Remix 壳",
    genre: "创意",
    description: "精选画布模板，可一键复制节点结构。",
    author: "CanvasLab",
    stars: 33,
    category: "精选画布",
    staffPick: true,
  },
  {
    id: "inspire-anime-star",
    title: "星尘旅人",
    genre: "奇幻",
    description: "轻奇幻竖屏动画分镜与分支结局。",
    author: "OrbitStudio",
    stars: 44,
    category: "动画",
    staffPick: true,
    followed: true,
  },
  {
    id: "inspire-anime-city",
    title: "浮空邮差",
    genre: "奇幻",
    description: "动画风格城市漫游与收集互动。",
    author: "SkyInk",
    stars: 36,
    category: "动画",
  },
  {
    id: "inspire-other-lab",
    title: "未分类实验场",
    genre: "实验",
    description: "开放题材试玩壳，适合快速验证交互。",
    author: "OpenCanvas",
    stars: 18,
    category: "其他",
    followed: true,
  },
  {
    id: "inspire-other-sketch",
    title: "草稿节点集",
    genre: "实验",
    description: "空白画布 + 预设互动组件组合。",
    author: "SketchRoom",
    stars: 12,
    category: "其他",
  },
];

const rawDramaTvCards: DramaTvCard[] = [
  ...dramaPlayAssets.map((asset, index) => ({
    id: asset.id,
    title: asset.title,
    genre: asset.genre,
    description: asset.description,
    poster: asset.poster,
    video: asset.video,
    author: categoryAuthors[index % categoryAuthors.length],
    stars: 78 - index * 11,
    category: genreToCategory[asset.genre] ?? "其他",
    followed: index % 2 === 0,
    staffPick: index === 0,
  })),
  ...extraCategoryCards,
  {
    id: "inspire-neon",
    title: "霓虹记忆交易",
    genre: "赛博",
    description: "一座用记忆换取身份的城市。",
    author: "NeonForge",
    stars: 48,
    category: "创意",
    staffPick: true,
  },
  {
    id: "inspire-rain",
    title: "雨夜追击分镜",
    genre: "悬疑",
    description: "雨夜公路、手势互动、秘密结局。",
    author: "Storycraft",
    stars: 31,
    category: "叙事短片",
    followed: true,
  },
  {
    id: "inspire-court",
    title: "宫墙回响",
    genre: "古风",
    description: "竖屏宫廷支线与双结局。",
    author: "ArenaLab",
    stars: 22,
    category: "精选画布",
  },
  {
    id: "inspire-mv",
    title: "心跳节拍 MV",
    genre: "恋爱",
    description: "竖屏 MV 节奏分镜 Remix。",
    author: "BeatRoom",
    stars: 56,
    category: "MV",
    staffPick: true,
  },
  {
    id: "inspire-ad",
    title: "能量饮料 15s",
    genre: "创意",
    description: "电视广告节奏剪辑壳。",
    author: "AdStudio",
    stars: 41,
    category: "电视广告",
  },
  {
    id: "inspire-tut",
    title: "分支互动入门",
    genre: "教程",
    description: "从单集到互动节点的本地教程卡。",
    author: "DramaSchool",
    stars: 19,
    category: "教程",
    followed: true,
  },
  {
    id: "inspire-ad-splash",
    title: "城市霓虹 15s",
    genre: "创意",
    description: "竖屏品牌短片节奏模板。",
    author: "AdStudio",
    stars: 38,
    category: "电视广告",
    followed: true,
  },
  {
    id: "inspire-mv-night",
    title: "午夜电台 MV",
    genre: "恋爱",
    description: "Lo-fi 竖屏 MV 分镜与节拍标记。",
    author: "NightBeat",
    stars: 49,
    category: "MV",
  },
  {
    id: "inspire-tut-branch",
    title: "互动节点速查",
    genre: "教程",
    description: "Tap / Swipe / Choice 节点对照示例。",
    author: "DramaSchool",
    stars: 24,
    category: "教程",
    staffPick: true,
  },
];

const dramaTvCards: DramaTvCard[] = rawDramaTvCards.map(attachPreviewMedia);

function InspirePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEvents = searchParams.get("tab") === "events";
  const { updateCreationSession, createProjectFromSession } = useWorldBuilderStore();
  const [feedTab, setFeedTab] = useState<FeedTab>("staff");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("全部");
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const cards = useMemo(() => {
    const source = isEvents
      ? dramaTvCards.filter((item) => item.category === "教程" || item.staffPick)
      : dramaTvCards;

    const matchCategoryAndQuery = (item: DramaTvCard) => {
      const hitCategory = category === "全部" || item.category === category;
      const q = query.toLowerCase();
      const hitQuery = `${item.title} ${item.author} ${item.description}`.toLowerCase().includes(q);
      return hitCategory && hitQuery;
    };

    let list = source.filter(matchCategoryAndQuery);

    if (!isEvents) {
      if (feedTab === "staff") {
        const staff = list.filter((item) => item.staffPick);
        list = staff.length ? staff : list;
      }
      if (feedTab === "following") {
        const followed = list.filter((item) => item.followed);
        list = followed.length ? followed : list;
      }
      if (feedTab === "hot") list = [...list].sort((a, b) => b.stars - a.stars);
      if (feedTab === "latest") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [feedTab, category, query, isEvents]);

  const remix = (card: DramaTvCard) => {
    setBusyId(card.id);
    updateCreationSession({
      prompt: `${card.title}\n\n${card.description}\n\n[Get Recipe / Remix from DramaTV · @${card.author}]`,
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
      <div className="min-h-full bg-stage text-ink">
        {!isEvents && (
        <header className="sticky top-0 z-20 bg-stage/92 pb-3 pt-3 backdrop-blur-xl">
          <div className="flex justify-center px-3 md:px-5">
            <div className="w-full max-w-[1020px]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-5">
                  {FEED_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFeedTab(tab.id)}
                      className={cn(
                        "relative pb-2 text-sm font-[400] transition-colors",
                        feedTab === tab.id ? "text-ink-strong" : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {tab.label}
                      {feedTab === tab.id && (
                        <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <label className="flex w-44 items-center gap-2 rounded-full border border-white/[0.07] bg-white/5 px-3 py-2 text-sm md:w-52">
                    <Search size={14} className="shrink-0 text-ink-muted" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="搜索"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted"
                    />
                  </label>
                  <Link
                    href="/world-builder/home"
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-deep"
                  >
                    <Plus size={14} /> 发布作品
                  </Link>
                </div>
              </div>

              <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-0.5">
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-[400] transition-colors",
                      category === item
                        ? "bg-accent text-white"
                        : "bg-transparent text-ink-muted hover:bg-white/5 hover:text-ink",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>
        )}

        {/* Grid — centered 4-column DramaTV cards */}
        <div className="flex justify-center px-3 py-4 md:px-5 md:py-5">
          <div className="grid w-full max-w-[1020px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((card, index) => (
              <div key={card.id}>
                <DramaTvCardView
                  card={card}
                  index={index}
                  hovered={hoveredId === card.id}
                  busy={busyId === card.id}
                  onHover={setHoveredId}
                  onRemix={() => remix(card)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorldBuilderLayout>
  );
}

export default function InspirePage() {
  return (
    <Suspense
      fallback={
        <WorldBuilderLayout agentMode="none">
          <div className="min-h-full bg-stage" />
        </WorldBuilderLayout>
      }
    >
      <InspirePageInner />
    </Suspense>
  );
}

function DramaTvCardView({
  card,
  index,
  hovered,
  busy,
  onHover,
  onRemix,
}: {
  card: DramaTvCard;
  index: number;
  hovered: boolean;
  busy: boolean;
  onHover: (id: string | null) => void;
  onRemix: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !card.video) return;
    if (hovered) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [hovered, card.video]);

  return (
    <article
      onMouseEnter={() => onHover(card.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        "group/video relative isolate aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-[16px] border border-transparent bg-[#18181B]",
        "transition hover:border-white/30",
      )}
    >
      {card.video ? (
        <video
          ref={videoRef}
          src={card.video}
          poster={card.poster}
          muted
          playsInline
          loop
          preload={index < 4 ? "metadata" : "none"}
          className={cn(
            "pointer-events-none absolute inset-0 z-0 size-full object-cover transition-opacity duration-300",
            card.poster && !hovered ? "opacity-0" : "opacity-100",
          )}
        />
      ) : null}

      {card.poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.poster}
          alt=""
          decoding="async"
          className={cn(
            "pointer-events-none absolute inset-0 z-[1] size-full object-cover transition-opacity duration-300",
            hovered && card.video ? "opacity-0" : "opacity-100",
          )}
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#1a1218] via-[#241820] to-[#3d1f2c]" />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[42%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-ink-muted">@{card.author}</p>
          <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5 text-white">{card.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs text-ink-muted">
          <Star size={13} className={cn(card.staffPick && "fill-white/70")} />
          <span>{card.stars}</span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-40 flex translate-y-2 items-center justify-center gap-2 p-3 opacity-0 transition duration-200 group-hover/video:translate-y-0 group-hover/video:opacity-100">
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onRemix();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#0F0F0F] shadow-lg hover:bg-white/90 disabled:opacity-60"
        >
          <GitFork size={13} />
          {busy ? "…" : "Get Recipe"}
        </button>
        <Link
          href="/world-builder/app-preview"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-black/70"
        >
          <UserRound size={12} /> Preview
        </Link>
      </div>
    </article>
  );
}
