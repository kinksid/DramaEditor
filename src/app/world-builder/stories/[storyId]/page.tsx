"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  GitBranch,
  Play,
  Plus,
  Settings2,
} from "lucide-react";
import { AssetsDock, type AssetTab, type AssetsDockActions } from "@/components/world-builder/AssetsDock";
import { AddAssetCard, portraitGridClass, portraitAspectClass, portraitShellClass } from "@/components/world-builder/WorldAssetEditor";
import { EditWorldModal } from "@/components/world-builder/EditWorldModal";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

const tabs = [
  { id: "overview", label: "概览" },
  { id: "episodes", label: "剧集" },
  { id: "characters", label: "角色" },
  { id: "locations", label: "地点" },
  { id: "videos", label: "视频" },
  { id: "interactions", label: "交互" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const ASSET_TABS = new Set<TabId>(["characters", "locations", "videos", "interactions"]);

export default function StoryProjectPage() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm text-ink-muted">加载中…</div>}>
      <StoryProjectContent />
    </Suspense>
  );
}

function StoryProjectContent() {
  const params = useParams<{ storyId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const storyId = params.storyId;
  const tabParam = searchParams.get("tab");
  const validTabIds = tabs.map((t) => t.id);
  const initialTab = tabParam && validTabIds.includes(tabParam as TabId) ? (tabParam as TabId) : "overview";

  const {
    world,
    episodes,
    nodes,
    activeProjectId,
    ensureProjectLoaded,
    listProjects,
    markProjectOpened,
    addEpisode,
  } = useWorldBuilderStore();

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [missing, setMissing] = useState(false);
  const [editWorldOpen, setEditWorldOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const assetActionsRef = useRef<AssetsDockActions | null>(null);
  const registerAssetActions = useCallback((actions: AssetsDockActions) => {
    assetActionsRef.current = actions;
  }, []);

  useEffect(() => {
    // 旧链接 ?tab=assets → 角色（资产库已由本页 Tabs 覆盖）
    if (tabParam === "assets") {
      setActiveTab("characters");
      router.replace(`/world-builder/stories/${storyId}?tab=characters`, { scroll: false });
      return;
    }
    if (tabParam && validTabIds.includes(tabParam as TabId)) {
      setActiveTab(tabParam as TabId);
    }
  }, [tabParam, storyId, router, validTabIds]);

  useEffect(() => {
    if (!storyId) return;
    const projects = listProjects();
    const byId = projects.find((p) => p.id === storyId);
    const byEpisode = projects.find((p) => p.episodes.some((e) => e.id === storyId));
    const target = byId?.id ?? byEpisode?.id ?? (storyId === activeProjectId ? activeProjectId : undefined);
    if (target) {
      ensureProjectLoaded(target);
      markProjectOpened(target);
      setMissing(false);
    } else if (projects.length && activeProjectId) {
      setMissing(false);
    } else {
      setMissing(!ensureProjectLoaded(storyId));
    }
  }, [storyId, ensureProjectLoaded, listProjects, activeProjectId, markProjectOpened]);

  useEffect(() => {
    if (!activeProjectId) return;
    return () => {
      markProjectOpened(activeProjectId);
    };
  }, [activeProjectId, markProjectOpened]);

  const worldId = activeProjectId || storyId;
  const currentProject = listProjects().find((p) => p.id === worldId);
  const projectName = currentProject?.name || world.title || "未命名项目";
  // 主标题与项目同名（不再用「未命名剧集」）
  const storyTitle = projectName;
  const lastModifiedLabel = useMemo(() => {
    const iso = currentProject?.updatedAt || currentProject?.lastOpenedAt || world.createdAt;
    if (!iso) return "上次修改于 刚刚";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "上次修改于 刚刚";
    const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (sec < 60) return "上次修改于 刚刚";
    const min = Math.floor(sec / 60);
    if (min < 60) return `上次修改于 ${min} 分钟前`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `上次修改于 ${hour} 小时前`;
    const day = Math.floor(hour / 24);
    if (day < 30) return `上次修改于 ${day} 天前`;
    const month = Math.floor(day / 30);
    if (month < 12) return `上次修改于 ${month} 个月前`;
    return `上次修改于 ${Math.floor(month / 12)} 年前`;
  }, [currentProject?.updatedAt, currentProject?.lastOpenedAt, world.createdAt]);
  const storyGraphHref = `/world-builder/story-graph?project=${worldId}`;

  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/world-builder/stories/${storyId}?tab=${tab}`, { scroll: false });
  };

  const handleAddEpisode = () => {
    addEpisode({ title: `第 ${episodes.length + 1} 集`, description: "" });
    selectTab("episodes");
  };

  const tabAddAction =
    activeTab === "episodes"
      ? { label: "添加剧集", onClick: handleAddEpisode }
      : activeTab === "characters"
        ? { label: "添加角色", onClick: () => assetActionsRef.current?.openAdd() }
        : activeTab === "locations"
          ? { label: "添加地点", onClick: () => assetActionsRef.current?.openAdd() }
          : activeTab === "videos"
            ? { label: "添加视频", onClick: () => assetActionsRef.current?.openAdd() }
            : activeTab === "interactions"
              ? { label: "添加交互", onClick: () => assetActionsRef.current?.openAdd() }
              : null;

  if (missing) {
    return (
      <WorldBuilderLayout agentMode="none">
        <div className="grid min-h-[50vh] place-items-center px-6 text-center">
          <div>
            <h1 className="font-display text-3xl text-ink-strong">未找到故事</h1>
            <Link href="/world-builder/worlds" className="mt-4 inline-flex text-sm text-accent">
              返回工作空间
            </Link>
          </div>
        </div>
      </WorldBuilderLayout>
    );
  }

  return (
    <WorldBuilderLayout agentMode="none">
      <main className="min-h-screen bg-stage">
        <section className="bg-stage">
          <div
            className={cn(
              "relative min-h-[320px] overflow-hidden px-6 py-5 text-white",
              !world.coverImage && "de-canvas-surface rounded-none border-0 border-b border-white/10 shadow-none",
              world.coverImage && "bg-[#121214]",
            )}
          >
            {world.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={world.coverImage}
                alt=""
                className="absolute inset-0 z-0 size-full object-cover"
              />
            ) : null}
            {world.coverImage ? (
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
            ) : null}
            <Link
              href={storyGraphHref}
              className="absolute inset-0 z-0 cursor-pointer"
              aria-label="打开故事图"
            />
            <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-between pointer-events-none">
              <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
                <nav className="flex flex-wrap items-center gap-1.5 text-sm text-white/55">
                  <Link
                    href="/world-builder/worlds"
                    className="transition-colors duration-press ease-de-out hover:text-white"
                  >
                    我的工作空间
                  </Link>
                  <ChevronRight size={14} className="text-white/30" />
                  <span className="text-white/90">{storyTitle}</span>
                </nav>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={storyGraphHref}
                    className="btn-cta btn-press inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold"
                  >
                    <GitBranch size={16} /> 故事图
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditWorldOpen(true)}
                    className="btn-press inline-flex items-center rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm font-medium text-white/85 backdrop-blur-sm transition-colors duration-press ease-de-out hover:bg-white/[0.08]"
                  >
                    世界观编辑
                  </button>
                  <Link
                    href={`/world-builder/setup?project=${worldId}`}
                    className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold text-white/85 backdrop-blur-sm transition-colors duration-press ease-de-out hover:bg-white/[0.08]"
                  >
                    <Settings2 size={16} /> 世界设置
                  </Link>
                </div>
              </div>

              <div className="max-w-3xl cursor-pointer">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  资产库
                </p>
                <h1 className="mt-3 font-display text-5xl tracking-tight">{storyTitle}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50" suppressHydrationWarning>
                  {mounted ? lastModifiedLabel : "上次修改于 —"}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {world.genre.concat(world.tags.slice(0, 4)).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs text-white/65"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => selectTab(tab.id)}
                      className={cn(
                        "btn-press shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-[border-color,background-color,color,transform] duration-press ease-de-out",
                        activeTab === tab.id
                          ? "border-white/[0.08] bg-[#2a2a2a] font-semibold text-white"
                          : "border-transparent bg-transparent text-white/50 hover:bg-white/[0.04] hover:text-white/75",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {tabAddAction && (
                  <button
                    type="button"
                    onClick={tabAddAction.onClick}
                    className="btn-cta btn-press inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    <Plus size={14} /> {tabAddAction.label}
                  </button>
                )}
              </div>

              {activeTab === "overview" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <StudioAction
                    href={`/world-builder/story-graph?project=${worldId}`}
                    icon={GitBranch}
                    title="故事图"
                    description="在画布上编辑视频、互动与结局节点。"
                  />
                  <StudioAction
                    href="/world-builder/app-preview"
                    icon={Play}
                    title="预览"
                    description="在手机框中检查互动播放路径。"
                  />
                </div>
              )}

              {activeTab === "episodes" && (
                <div className={portraitGridClass}>
                  {episodes.map((episode) => {
                    const episodeNodes = nodes.filter((node) => node.data.episodeId === episode.id);
                    const hasNodes = episodeNodes.length > 0;
                    const isPublished = episodeNodes.some(
                      (node) => node.kind === "scene" && node.data.status === "ready",
                    );
                    const sceneCover = episodeNodes.find(
                      (node) =>
                        node.kind === "scene" &&
                        (node.data.firstFrameRef || node.data.videoUrl),
                    );
                    const poster =
                      sceneCover?.kind === "scene"
                        ? sceneCover.data.firstFrameRef || sceneCover.data.videoUrl
                        : undefined;
                    return (
                      <Link
                        href={storyGraphHref}
                        key={episode.id}
                        className={cn(
                          "group relative isolate block",
                          portraitAspectClass,
                          portraitShellClass,
                        )}
                      >
                        {poster && !String(poster).startsWith("mock://") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={String(poster)}
                            alt=""
                            className="pointer-events-none absolute inset-0 z-0 size-full object-cover transition-transform duration-press ease-de-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                          />
                        ) : (
                          <div className="de-project-matrix absolute inset-0 z-0 size-full">
                            <div className="de-project-matrix-shine absolute inset-0" aria-hidden />
                          </div>
                        )}
                        <div className="absolute left-3 top-3 z-30 flex flex-wrap gap-1.5">
                          {!isPublished && (
                            <span className="rounded-md bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white/75 backdrop-blur-sm">
                              草稿
                            </span>
                          )}
                          {hasNodes && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white/80 backdrop-blur-sm">
                              <span className="size-1.5 rounded-full bg-signal" />
                              进行中
                            </span>
                          )}
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[42%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] text-white/55">第 {episode.index} 集</p>
                            <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5 text-white">
                              {episode.title}
                            </h3>
                          </div>
                          <span className="shrink-0 text-[11px] text-white/55">
                            {episodeNodes.length} 节点
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                  <AddAssetCard label="添加剧集" onClick={handleAddEpisode} />
                </div>
              )}

              {ASSET_TABS.has(activeTab) && (
                <AssetsDock
                  pageMode
                  projectId={worldId}
                  activeTab={activeTab as AssetTab}
                  onTabChange={(tab) => selectTab(tab as TabId)}
                  onRegisterActions={registerAssetActions}
                />
              )}
          </div>
        </section>
      </main>

      <EditWorldModal
        open={editWorldOpen}
        onClose={() => setEditWorldOpen(false)}
      />
    </WorldBuilderLayout>
  );
}

function StudioAction({
  href,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  href?: string;
  onClick?: () => void;
  icon: typeof GitBranch;
  title: string;
  description: string;
}) {
  const className =
    "btn-press block w-full rounded-xl border border-white/10 bg-card p-4 text-left transition-[border-color,background-color,transform] duration-popover ease-de-out hover:border-white/20 hover:bg-white/[0.03]";
  const inner = (
    <>
      <div className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-white/80">
        <Icon size={18} />
      </div>
      <h2 className="mt-4 font-semibold text-ink-strong">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

