"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  GitBranch,
  MousePointerClick,
  PenLine,
  Play,
  Plus,
  Send,
  Settings2,
  Trash2,
} from "lucide-react";
import { AddAssetCard, portraitGridClass, portraitAspectClass, portraitShellClass, WorldAssetEditor, type WorldAssetEditorActions } from "@/components/world-builder/WorldAssetEditor";
import { EditWorldModal } from "@/components/world-builder/EditWorldModal";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

const tabs = [
  { id: "overview", label: "概览" },
  { id: "episodes", label: "剧集" },
  { id: "characters", label: "角色" },
  { id: "locations", label: "地点" },
  { id: "interactions", label: "交互" },
] as const;

type TabId = (typeof tabs)[number]["id"];

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
    characters,
    locations,
    episodes,
    nodes,
    edges,
    activeProjectId,
    ensureProjectLoaded,
    listProjects,
    validateStory,
    publishStory,
    addEpisode,
    addInteractionNode,
    deleteNode,
  } = useWorldBuilderStore();

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [missing, setMissing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editWorldOpen, setEditWorldOpen] = useState(false);
  const assetActionsRef = useRef<WorldAssetEditorActions | null>(null);
  const registerAssetActions = useCallback((actions: WorldAssetEditorActions) => {
    assetActionsRef.current = actions;
  }, []);

  useEffect(() => {
    if (tabParam === "assets") {
      setActiveTab("overview");
      router.replace(`/world-builder/stories/${storyId}?tab=overview`, { scroll: false });
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
      setMissing(false);
    } else if (projects.length && activeProjectId) {
      setMissing(false);
    } else {
      setMissing(!ensureProjectLoaded(storyId));
    }
  }, [storyId, ensureProjectLoaded, listProjects, activeProjectId]);

  const interactionNodes = useMemo(
    () => nodes.filter((node) => node.kind === "interaction"),
    [nodes],
  );
  const issues = useMemo(() => validateStory(), [validateStory, nodes, edges, episodes]);
  const readyScenes = nodes.filter((node) => node.kind === "scene" && node.data.status === "ready").length;
  const sceneCount = nodes.filter((node) => node.kind === "scene").length;
  const interactionCount = nodes.filter((node) => node.kind === "interaction").length;
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const worldId = activeProjectId || storyId;
  const storyTitle = episodes[0]?.title || world.title || "未命名故事";
  const storyGraphHref = `/world-builder/story-graph?project=${worldId}`;

  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/world-builder/stories/${storyId}?tab=${tab}`, { scroll: false });
  };

  const handlePublish = () => {
    const result = publishStory();
    setNotice(
      result.some((i) => i.severity === "error")
        ? `发布检查：${result.length} 项待处理`
        : "发布检查通过",
    );
  };

  const handleAddEpisode = () => {
    addEpisode({ title: `第 ${episodes.length + 1} 集`, description: "" });
    selectTab("episodes");
  };

  const handleAddInteraction = () => {
    addInteractionNode();
    router.push(storyGraphHref);
  };

  const tabAddAction =
    activeTab === "episodes"
      ? { label: "添加剧集", onClick: handleAddEpisode }
      : activeTab === "characters"
        ? { label: "添加角色", onClick: () => assetActionsRef.current?.openAdd() }
        : activeTab === "locations"
          ? { label: "添加地点", onClick: () => assetActionsRef.current?.openAdd() }
          : activeTab === "interactions"
            ? { label: "添加交互", onClick: handleAddInteraction }
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
          <div className="relative min-h-[320px] bg-[linear-gradient(135deg,#0a0a0a_0%,#161218_42%,#b94a6a_115%)] px-6 py-5 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(212,120,147,0.28),transparent_34%)]" />
            <Link
              href={storyGraphHref}
              className="absolute inset-0 z-0 cursor-pointer"
              aria-label="打开故事图"
            />
            <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-between pointer-events-none">
              <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
                <nav className="flex flex-wrap items-center gap-1.5 text-sm text-white/65">
                  <Link href="/world-builder/worlds" className="hover:text-white">
                    我的工作空间
                  </Link>
                  <ChevronRight size={14} className="text-white/35" />
                  <span className="text-white">{world.title}</span>
                  <ChevronRight size={14} className="text-white/35" />
                  <span className="text-white">{storyTitle}</span>
                </nav>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={storyGraphHref}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
                  >
                    <GitBranch size={16} /> 故事图
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditWorldOpen(true)}
                    className="inline-flex items-center rounded-lg bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1a1a1a]"
                  >
                    世界观编辑
                  </button>
                  <Link
                    href={`/world-builder/setup?project=${worldId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1a1a1a]"
                  >
                    <Settings2 size={16} /> 世界设置
                  </Link>
                </div>
              </div>

              <div className="max-w-3xl cursor-pointer">
                <p className="text-xs font-semibold tracking-[0.18em] text-white/55">{world.title}</p>
                <h1 className="mt-3 font-display text-5xl tracking-tight">{storyTitle}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">{world.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {world.genre.concat(world.tags.slice(0, 4)).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs text-white/75">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 xl:grid-cols-[1fr_320px]">
            <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => selectTab(tab.id)}
                      className={cn(
                        "shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition",
                        activeTab === tab.id
                          ? "border-white/20 bg-[#2a2a2a] font-semibold text-white"
                          : "border-white/10 bg-transparent text-white/50 hover:border-white/15 hover:bg-white/[0.03] hover:text-white/75",
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
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-deep"
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
                    return (
                      <Link
                        href={storyGraphHref}
                        key={episode.id}
                        className={cn(
                          portraitAspectClass,
                          portraitShellClass,
                          "group block transition hover:border-white/20",
                        )}
                      >
                        <div className="relative flex h-full flex-col justify-between bg-gradient-to-br from-[#121018] via-[#1a1218] to-[#3a1f2c] p-4 text-white">
                          <div className="flex flex-wrap gap-2">
                            {!isPublished && (
                              <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-white/70">
                                草稿
                              </span>
                            )}
                            {hasNodes && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-200">
                                <span className="size-1.5 rounded-full bg-amber-400" />
                                进行中
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                              第 {episode.index} 集
                            </p>
                            <h3 className="mt-2 font-display text-2xl leading-tight">{episode.title}</h3>
                            <p className="mt-2 text-xs text-white/55">{episodeNodes.length} 个节点</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  <AddAssetCard label="添加剧集" onClick={handleAddEpisode} />
                </div>
              )}

              {activeTab === "characters" && (
                <WorldAssetEditor mode="characters" storyId={storyId} onRegisterActions={registerAssetActions} />
              )}
              {activeTab === "locations" && (
                <WorldAssetEditor mode="locations" storyId={storyId} onRegisterActions={registerAssetActions} />
              )}

              {activeTab === "interactions" && (
                <div className={portraitGridClass}>
                  {interactionNodes.map((node) => (
                    <article
                      key={node.id}
                      className="group rounded-xl border border-card-border bg-card p-4 hover:border-accent/35"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                          <MousePointerClick size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted">交互节点</p>
                          <h2 className="mt-1 text-lg font-semibold text-ink-strong">{node.data.title}</h2>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">{node.data.instruction}</p>
                          <p className="mt-3 text-xs text-ink-muted">{node.data.options.length} 个选项</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Link
                          href={storyGraphHref}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-stage px-3 py-2 text-sm text-ink-muted transition hover:border-accent/35 hover:text-ink-strong"
                        >
                          <PenLine size={14} /> 编辑
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteNode(node.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-stage px-3 py-2 text-sm text-red-400 transition hover:border-red-400/40 hover:bg-red-500/10"
                        >
                          <Trash2 size={14} /> 删除
                        </button>
                      </div>
                    </article>
                  ))}
                  <AddAssetCard label="添加交互" onClick={handleAddInteraction} />
                </div>
              )}
            </div>

            <aside className="xl:sticky xl:top-20 xl:self-start">
              <div className="p-1">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-white">
                    <Bot size={18} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-ink-strong">助手</h2>
                    <p className="text-xs text-ink-muted">发布检查与发布引导</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <CheckRow done={characters.length > 0} label={`${characters.length} 个角色`} />
                  <CheckRow done={locations.length > 0} label={`${locations.length} 个地点`} />
                  <CheckRow done={episodes.length > 0} label={`${episodes.length} 集剧集`} />
                  <CheckRow done={interactionCount > 0} label={`${interactionCount} 个互动`} />
                  <CheckRow
                    done={readyScenes === sceneCount && sceneCount > 0}
                    label={`${readyScenes}/${sceneCount} 视频就绪`}
                  />
                </div>
                <p className="mt-4 text-sm leading-6 text-ink-muted">
                  {errorCount > 0
                    ? `还有 ${errorCount} 个错误需修复后才能发布。`
                    : warningCount > 0
                      ? `可发布，但有 ${warningCount} 条提醒。`
                      : "所有检查已通过。"}
                </p>
                <button
                  type="button"
                  onClick={handlePublish}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-deep"
                >
                  <Send size={15} /> 发布剧集
                </button>
              </div>
            </aside>
          </div>
        </section>
      </main>

      {notice && (
        <div className="fixed right-5 top-5 z-50 rounded-xl border border-card-border bg-card px-4 py-3 text-sm shadow-soft">
          {notice}
          <button type="button" className="ml-3 text-ink-muted" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
      <EditWorldModal
        open={editWorldOpen}
        onClose={() => setEditWorldOpen(false)}
        episodeId={episodes[0]?.id}
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
    "rounded-xl border border-card-border bg-card p-4 text-left hover:border-accent/35 block w-full";
  const inner = (
    <>
      <div className="grid size-10 place-items-center rounded-lg bg-accent-soft text-accent">
        <Icon size={18} />
      </div>
      <h2 className="mt-4 font-semibold">{title}</h2>
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

function CheckRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-1 py-2">
      <span className="text-ink-muted">{label}</span>
      {done ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-accent" />}
    </div>
  );
}
