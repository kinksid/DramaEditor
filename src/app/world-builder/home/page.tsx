"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Loader2,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { DecomposePreviewPanel } from "@/components/world-builder/DecomposePreviewPanel";
import { ReferenceChips, ReferenceUploadMenu } from "@/components/world-builder/ReferenceUploadMenu";
import { VisualStylePicker } from "@/components/world-builder/VisualStylePicker";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { dramaPlayAssets } from "@/data/dramaPlayAssets";
import { decomposeStory } from "@/lib/worldBuilderApi";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import { useProviderSettingsStore } from "@/stores/providerSettingsStore";

const sampleWorlds = [
  ...dramaPlayAssets.map((asset) => ({
    title: asset.title,
    genre: asset.genre,
    description: asset.description,
    poster: asset.poster,
    tone: "from-[#1a0f2e] via-[#3d1b4e] to-accent",
    heat: "9.2",
    completion: "68%",
    interactions: "3",
    reason: `因为你喜欢${asset.genre}互动短剧`,
  })),
  {
    title: "绒星宇宙", genre: "奇幻",
    description: "柔软的小生物伙伴漂浮在梦境星球上，展开温柔、轻盈的互动短剧。",
    tone: "from-[#1a0f2e] via-[#2d1b3d] to-accent",
    heat: "8.7", completion: "61%", interactions: "5",
    reason: "因为你常看轻奇幻分支",
  },
  {
    title: "血色之城", genre: "恐怖",
    description: "一座过分明亮的城市隐藏着百年吸血族与人类共存的秘密。",
    tone: "from-[#1a0f2e] via-red-950 to-accent",
    heat: "8.9", completion: "57%", interactions: "4",
    reason: "因为你浏览过惊悚选择",
  },
  {
    title: "黄金时代伊比利亚", genre: "历史",
    description: "17 世纪西班牙的帝国、信仰与阴谋交织成可分支的宫廷故事。",
    tone: "from-accent via-stone-700 to-[#1a0f2e]",
    heat: "8.4", completion: "63%", interactions: "6",
    reason: "因为你偏好高互动剧情",
  },
  {
    title: "最后一条短信", genre: "悬疑",
    description: "一条迟来的消息把观众拖入记忆、愧疚和失踪时间的谜网。",
    tone: "from-[#1a0f2e] via-[#5a3d6e] to-accent",
    heat: "9.0", completion: "66%", interactions: "4",
    reason: "因为你喜欢悬疑反转",
  },
  {
    title: "西溪高中假女友", genre: "剧情",
    description: "不起眼的女生被卷入一段假恋爱关系，选择会改变校园权力结构。",
    tone: "from-panel via-accent-soft to-accent",
    heat: "8.5", completion: "72%", interactions: "3",
    reason: "因为同类校园线完播高",
  },
  {
    title: "雨夜公路追击", genre: "悬疑",
    description: "雨夜高速上，每一次路线选择都决定追捕是否成功。",
    tone: "from-[#1a0f2e] via-[#5a3d6e] to-accent",
    heat: "8.8", completion: "59%", interactions: "5",
    reason: "因为你点过追击题材",
  },
];

type SortMode = "hot" | "completion" | "interactive";

export default function StudioHomePage() {
  const router = useRouter();
  const { t } = useI18n();
  const {
    creationSession,
    updateCreationSession,
    removeReference,
    createProjectFromSession,
    listProjects,
    activeProjectId,
    switchProject,
  } = useWorldBuilderStore();

  const [prompt, setPrompt] = useState(
    creationSession.prompt || "大唐天宝年间，长安城西市，胡商云集、灯火彻夜不熄的盛世一隅。",
  );
  const [genre, setGenre] = useState("全部类型");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("hot");
  const [hiddenTitles, setHiddenTitles] = useState<string[]>([]);
  const lastHiddenTitle = hiddenTitles.at(-1);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createWarning, setCreateWarning] = useState<string | null>(null);
  const selectedLlmPresetId = useProviderSettingsStore((state) => state.selectedLlmPresetId);

  useEffect(() => {
    updateCreationSession({ prompt });
  }, [prompt, updateCreationSession]);

  const projects = listProjects();
  const continueProject = projects.find((item) => item.id === activeProjectId) ?? projects[0];

  const worlds = useMemo(() => {
    const filtered = sampleWorlds.filter((item) => {
      const matchesGenre = genre === "全部类型" || item.genre === genre;
      const matchesQuery = `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase());
      return matchesGenre && matchesQuery && !hiddenTitles.includes(item.title);
    });
    return [...filtered].sort((a, b) => metricValue(b, sortMode) - metricValue(a, sortMode));
  }, [genre, hiddenTitles, query, sortMode]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    setCreateWarning(null);
    updateCreationSession({ prompt });
    try {
      await useProviderSettingsStore.getState().loadFromServer();

      const canReusePreview =
        creationSession.lastDecompose &&
        creationSession.prompt.trim() === prompt.trim();

      let result = canReusePreview ? creationSession.lastDecompose : null;
      let warning: string | undefined;
      let source = canReusePreview ? "preview" : "";

      if (!result) {
        const response = await decomposeStory({
          prompt,
          visualStyle: creationSession.visualStylePreset,
          references: creationSession.references,
          llmPresetId: selectedLlmPresetId || undefined,
        });
        result = response.result;
        warning = response.warning;
        source = response.source;
      }

      if (source === "fallback") {
        setCreateWarning(
          warning ??
            "LLM 不可用，仅填入原始描述。请在 Settings 选择可用的 LLM 预设，或确认 Ollama 已启动。",
        );
      }

      const projectId = createProjectFromSession({ decomposeResult: result });
      router.push(`/world-builder/setup?project=${projectId}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleStartBlank = () => {
    updateCreationSession({ prompt });
    const projectId = createProjectFromSession();
    router.push(`/world-builder/setup?project=${projectId}`);
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="min-h-screen">

        <section className="mx-auto max-w-6xl px-6 pt-14">
          <div className="overflow-hidden rounded-[28px] border border-pink-100 bg-white shadow-soft">
            <div className="relative min-h-[360px] bg-[radial-gradient(circle_at_18%_18%,rgba(217,70,138,0.35),transparent_32%),radial-gradient(circle_at_82%_6%,rgba(255,255,255,0.12),transparent_30%),linear-gradient(135deg,#1a0f2e,#3d1b4e_48%,#d9468a)] p-10 text-white">
              <div className="relative z-10 mx-auto max-w-3xl text-center pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
                  Your Agentic Creative Canvas
                </p>
                <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
                  {t("home.heading")}
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/60">
                  {t("home.subtitle")}
                </p>

                <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t("home.promptPlaceholder")}
                    className="min-h-28 w-full resize-none rounded-xl border-0 bg-transparent px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/40"
                  />
                  <ReferenceChips
                    references={creationSession.references}
                    onRemove={removeReference}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                    <div className="flex flex-wrap gap-2">
                      <ReferenceUploadMenu label={t("home.addRef")} />
                      <DecomposePreviewPanel prompt={prompt} label={t("home.autoSplit")} />
                      <VisualStylePicker label={t("home.visualStyle")} />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCreate()}
                      disabled={creating || !prompt.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-white shadow-glow hover:bg-accent-deep transition disabled:opacity-60"
                    >
                      {creating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {t("home.createBtn")}
                    </button>
                  </div>
                  {createError && (
                    <p className="mt-2 text-left text-xs text-red-300">{createError}</p>
                  )}
                  {createWarning && (
                    <p className="mt-2 text-left text-xs text-amber-200">{createWarning}</p>
                  )}
                  {creationSession.lastDecompose && (
                    <p className="mt-2 text-left text-xs text-white/50">
                      已应用拆解草稿：{creationSession.lastDecompose.worldview.worldTitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleStartBlank}
                  className="mt-5 inline-flex items-center gap-2 text-sm text-white/40 hover:text-accent transition"
                >
                  {t("home.orStartBlank")} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 mx-auto max-w-6xl px-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {t("home.continueWatching")}
          </p>
          {continueProject ? (
            <button
              type="button"
              onClick={() => {
                switchProject(continueProject.id);
                router.push(`/world-builder/setup?project=${continueProject.id}`);
              }}
              className="group flex max-w-xl items-center gap-4 rounded-3xl border border-pink-100 bg-white p-3 text-left shadow-soft hover:border-pink-300 transition w-full"
            >
              <div className="grid h-[120px] w-[84px] shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,#1a0f2e,#2d1b3d_45%,#d9468a)] text-white">
                <Play size={22} fill="currentColor" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-accent">{t("home.resumeWatch")}</p>
                <h2 className="mt-2 truncate text-xl font-semibold text-ink-strong">{continueProject.name}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                  {continueProject.setupDraft.worldDescription || continueProject.world.description}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${Math.min(100, Math.round((continueProject.characters.length + continueProject.locations.length) * 8 + (continueProject.setupDraft.script ? 20 : 0)))}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(continueProject.updatedAt).toLocaleDateString()} · {t("home.watchedPercent")}
                </p>
              </div>
            </button>
          ) : (
            <p className="text-sm text-slate-500">暂无项目，点击创建开始新世界。</p>
          )}
        </section>

        <section className="mx-auto mt-10 max-w-6xl px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("home.recommended")}</p>
              <h2 className="mt-1 text-2xl font-semibold text-ink-strong">{t("home.forYou")}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm shadow-sm">
                <Sparkles size={15} className="text-accent" />
                <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="bg-transparent outline-none text-sm">
                  <option value="hot">{t("home.hotFirst")}</option>
                  <option value="completion">{t("home.completionFirst")}</option>
                  <option value="interactive">{t("home.interactiveFirst")}</option>
                </select>
              </label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm shadow-sm">
                <SlidersHorizontal size={15} className="text-accent" />
                <select value={genre} onChange={(e) => setGenre(e.target.value)} className="bg-transparent outline-none text-sm">
                  {["全部类型", "奇幻", "恐怖", "历史", "悬疑", "剧情"].map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm shadow-sm">
                <Search size={15} className="text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("home.searchWorlds")} className="w-40 bg-transparent outline-none text-sm" />
              </label>
            </div>
          </div>

          {lastHiddenTitle && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-pink-100 bg-accent-soft px-4 py-3 text-sm text-accent">
              <span>{t("home.reducedRec")}「{lastHiddenTitle}」</span>
              <button onClick={() => setHiddenTitles((titles) => titles.slice(0, -1))} className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-ink-strong shadow-sm hover:bg-pink-50">
                {t("home.undo")}
              </button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {worlds.map((item) => (
              <WorldFeedCard key={item.title} {...item} onHide={() => setHiddenTitles((titles) => [...titles, item.title])} />
            ))}
            {worlds.length === 0 && (
              <div className="grid min-h-[240px] place-items-center rounded-3xl border border-pink-100 bg-white p-6 text-center shadow-soft md:col-span-2 xl:col-span-3">
                <Sparkles className="mx-auto text-accent" size={24} />
                <h3 className="mt-3 text-lg font-semibold text-ink-strong">{t("home.restoreTitle")}</h3>
                <p className="mt-2 text-sm text-slate-500">{t("home.restoreDesc")}</p>
                <button onClick={() => setHiddenTitles([])} className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep">
                  {t("home.restoreAll")}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleStartBlank}
              className="grid min-h-[240px] place-items-center rounded-3xl border border-dashed border-pink-200 bg-white text-slate-500 hover:border-accent hover:bg-accent-soft"
            >
              <span className="flex flex-col items-center gap-3 text-sm font-medium"><Plus size={22} /> 未命名世界</span>
            </button>
          </div>
          <div className="py-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("home.endOfList")}</p>
            <p className="mt-2 text-sm text-slate-500">{t("home.keepCreating")}</p>
          </div>
        </section>
      </div>
    </WorldBuilderLayout>
  );
}

function metricValue(item: { heat: string; completion: string; interactions: string }, sortMode: SortMode) {
  if (sortMode === "completion") return Number(item.completion.match(/\d+/)?.[0] ?? 0);
  if (sortMode === "interactive") return Number(item.interactions.match(/\d+/)?.[0] ?? 0);
  return Number(item.heat.match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
}

function WorldFeedCard({
  title, genre, description, poster, heat, completion, interactions, reason, onHide,
}: {
  title: string; genre: string; description: string; poster?: string;
  heat: string; completion: string; interactions: string; reason: string; onHide: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-soft hover:shadow-md hover:border-pink-300 transition-all">
      {poster ? (
        <img src={poster} alt={title} className="h-44 w-full object-cover" />
      ) : (
        <div className="relative h-44 bg-[linear-gradient(135deg,#1a0f2e,#3d1b4e_48%,#d9468a)]">
          <div className="absolute inset-0 dot-matrix opacity-20" />
          <Play size={24} fill="white" className="absolute right-3 bottom-3 text-white/60 group-hover:text-white transition" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">{genre}</span>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>热度 {heat}</span>
            <span className="w-px h-3 bg-slate-200" />
            <span>完播 {completion}</span>
            <span className="w-px h-3 bg-slate-200" />
            <span>{interactions} 选项</span>
          </div>
        </div>
        <h2 className="text-lg font-bold text-ink-strong">{title}</h2>
        <p className="mt-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500">{reason}</p>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{description}</p>
        <div className="mt-4 flex gap-2">
          <Link href="/world-builder/app-preview" className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-ink-strong transition">
            <Play size={13} /> 预览
          </Link>
          <button onClick={onHide} className="rounded-xl border border-pink-100 px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 transition">
            不感兴趣
          </button>
        </div>
      </div>
    </article>
  );
}
