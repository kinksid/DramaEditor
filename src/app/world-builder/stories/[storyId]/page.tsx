"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Film,
  GitBranch,
  LayoutDashboard,
  MonitorPlay,
  Play,
  RotateCcw,
  Send,
  Settings2,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { actionTypeLabels, statusLabels } from "@/lib/worldBuilderLabels";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

const tabs = ["总览", "剧集", "角色", "地点", "App 数据"] as const;

export default function StoryProjectPage() {
  const {
    world,
    characters,
    locations,
    episodes,
    nodes,
    edges,
    resetWorld,
    generateAllMockVideos,
    validateStory,
    publishStory,
    exportAppJson,
  } = useWorldBuilderStore();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("总览");
  const issues = useMemo(() => validateStory(), [validateStory, nodes, edges, episodes]);
  const readyScenes = nodes.filter((node) => node.kind === "scene" && node.data.status === "ready").length;
  const sceneCount = nodes.filter((node) => node.kind === "scene").length;
  const interactionCount = nodes.filter((node) => node.kind === "interaction").length;
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  const downloadAppJson = () => {
    const blob = new Blob([exportAppJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "drama-play-app-story.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <main className="min-h-screen bg-stage p-5">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
          <div className="relative min-h-[340px] bg-[linear-gradient(135deg,#09111f_0%,#162338_38%,#ec6f38_100%)] px-7 py-6 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(56,189,248,0.32),transparent_32%),radial-gradient(circle_at_78%_20%,rgba(244,114,182,0.34),transparent_30%)]" />
            <div className="relative z-10 flex h-full min-h-[300px] flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Link href="/world-builder/home" className="hover:text-white">创作工作台</Link>
                  <span>/</span>
                  <span>{world.title}</span>
                  <span>/</span>
                  <span className="text-white">记忆盗贼</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={generateAllMockVideos}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2 text-sm font-medium backdrop-blur hover:bg-white/20"
                  >
                    <Sparkles size={16} /> 生成全部视频
                  </button>
                  <button
                    onClick={downloadAppJson}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink-strong"
                  >
                    <Smartphone size={16} /> 导出 App 数据
                  </button>
                </div>
              </div>

              <div className="max-w-3xl">
                <p className="text-xs font-semibold tracking-[0.18em] text-white/55">霓虹东京迷案世界</p>
                <h1 className="mt-3 text-5xl font-semibold tracking-normal">记忆盗贼</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">
                  {world.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {world.genre.concat(world.tags.slice(0, 4)).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs text-white/75">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="剧集" value={episodes.length} />
                <Metric label="视频节点" value={sceneCount} />
                <Metric label="互动节点" value={interactionCount} />
                <Metric label="就绪视频" value={`${readyScenes}/${sceneCount}`} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 xl:grid-cols-[1fr_340px]">
            <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "rounded-xl px-4 py-2 text-sm font-medium text-slate-500",
                        activeTab === tab && "bg-white text-ink-strong shadow-sm",
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/world-builder/story-graph" className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-glow hover:bg-accent-deep">
                    <GitBranch size={16} /> 继续编辑故事图
                  </Link>
                  <Link href="/world-builder/setup" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium">
                    <Settings2 size={16} /> 世界设置
                  </Link>
                </div>
              </div>

              {activeTab === "总览" && (
                <div className="grid gap-4 md:grid-cols-3">
                  <StudioAction href="/world-builder/story-graph" icon={GitBranch} title="无限故事画布" description="按集整理视频、互动、结局节点，拖拽连接分支。" />
                  <StudioAction href="/world-builder" icon={LayoutDashboard} title="世界资料库" description="编辑角色、地点、故事线，作为 App 内容源。" />
                  <StudioAction href="/world-builder/app-preview" icon={MonitorPlay} title="竖屏预览" description="用模拟视频快速检查互动播放路径。" />
                </div>
              )}

              {activeTab === "剧集" && (
                <div className="space-y-3">
                  {episodes.map((episode) => {
                    const episodeNodes = nodes.filter((node) => node.data.episodeId === episode.id);
                    return (
                      <Link
                        href="/world-builder/story-graph"
                        key={episode.id}
                        className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-pink-200 hover:bg-accent-soft/40"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">第 {(episode.label ?? String(episode.index)).toUpperCase()} 集</p>
                            <h2 className="mt-1 text-lg font-semibold">{episode.title}</h2>
                          </div>
                          <ArrowRight size={18} className="text-slate-400" />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {episodeNodes.map((node) => (
                            <span key={node.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              {node.kind === "scene" ? "视频" : node.kind === "interaction" ? "互动" : "结局"} · {node.data.title}
                            </span>
                          ))}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {activeTab === "角色" && (
                <div className="grid gap-3 md:grid-cols-2">
                  {characters.map((character) => (
                    <InfoCard key={character.id} title={character.name} eyebrow={character.role} body={character.description} />
                  ))}
                </div>
              )}

              {activeTab === "地点" && (
                <div className="grid gap-3 md:grid-cols-2">
                  {locations.map((location) => (
                    <InfoCard key={location.id} title={location.name} eyebrow={location.type} body={location.description} />
                  ))}
                </div>
              )}

              {activeTab === "App 数据" && (
                <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
                  <div className="rounded-2xl border border-slate-200 bg-ink-strong p-4 text-xs leading-6 text-slate-200">
                    <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap">{exportAppJson()}</pre>
                  </div>
                  <div className="space-y-3">
                    <button onClick={downloadAppJson} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink-strong px-4 py-3 text-sm font-semibold text-white">
                      <Download size={16} /> 下载 App 数据
                    </button>
                    <button onClick={publishStory} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">
                      <Send size={16} /> 发布前检查
                    </button>
                    <button onClick={resetWorld} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 px-4 py-3 text-sm font-semibold text-red-600">
                      <RotateCcw size={16} /> 重置世界
                    </button>
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center gap-2">
                  {errorCount === 0 ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-red-600" />}
                  <h2 className="font-semibold">App 发布检查</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <CheckRow done={characters.length > 0} label={`${characters.length} 个角色`} />
                  <CheckRow done={locations.length > 0} label={`${locations.length} 个地点`} />
                  <CheckRow done={episodes.length > 0} label={`${episodes.length} 个剧集`} />
                  <CheckRow done={interactionCount > 0} label={`${interactionCount} 个互动节点`} />
                  <CheckRow done={readyScenes === sceneCount && sceneCount > 0} label={`${readyScenes}/${sceneCount} 视频就绪`} />
                </div>
                <div className="mt-4 rounded-2xl bg-white p-3 text-sm text-slate-500">
                  {errorCount > 0
                    ? `还有 ${errorCount} 个错误需要处理，建议进入故事图逐项修复。`
                    : warningCount > 0
                      ? `可发布，但还有 ${warningCount} 个提醒。`
                      : "全部检查通过，可以导出给 iOS 播放器。"}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">制作工具</h2>
                <div className="mt-3 grid gap-2">
                  <ToolButton href="/world-builder/app-preview" icon={Play} label="打开预览播放器" />
                  <ToolButton href="/world-builder/story-graph" icon={Film} label="批量生成模拟视频" onClick={generateAllMockVideos} />
                  <ToolButton href="/world-builder" icon={Users} label="管理角色地点" />
                  <ToolButton href="/world-builder/settings" icon={Smartphone} label="App 导出设置" />
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </WorldBuilderLayout>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StudioAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof GitBranch;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-pink-200 hover:bg-accent-soft/40">
      <div className="grid size-10 place-items-center rounded-xl accent-soft text-accent">
        <Icon size={18} />
      </div>
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}

function InfoCard({ title, eyebrow, body }: { title: string; eyebrow: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      <h2 className="mt-2 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}

function CheckRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
      <span className="text-slate-600">{label}</span>
      {done ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-pink-600" />}
    </div>
  );
}

function ToolButton({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: typeof Play;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium hover:bg-slate-50"
    >
      <span className="inline-flex items-center gap-2">
        <Icon size={16} /> {label}
      </span>
      <ArrowRight size={15} className="text-slate-400" />
    </Link>
  );
}
