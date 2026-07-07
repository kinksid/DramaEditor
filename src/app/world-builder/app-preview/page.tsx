"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ChevronsUp,
  Download,
  Film,
  GitBranch,
  Heart,
  MessageCircle,
  Play,
  RotateCcw,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { dramaPlayAssets } from "@/data/dramaPlayAssets";
import { actionTypeLabels, statusLabels } from "@/lib/worldBuilderLabels";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { StoryNode } from "@/types/worldBuilder";

export default function AppPreviewPage() {
  const { world, episodes, nodes, edges, exportAppJson, generateAllMockVideos, updateNode, selectedNodeId } = useWorldBuilderStore();
  const [episodeId, setEpisodeId] = useState(episodes[0]?.id ?? "");
  const episodeNodes = useMemo(() => nodes.filter((node) => node.data.episodeId === episodeId), [episodeId, nodes]);
  const firstPlayable = episodeNodes.find((node) => node.kind === "scene") ?? episodeNodes[0];
  const [activeNodeId, setActiveNodeId] = useState(firstPlayable?.id ?? "");
  const activeNode = nodes.find((node) => node.id === activeNodeId && node.data.episodeId === episodeId) ?? firstPlayable;
  const currentEpisode = episodes.find((episode) => episode.id === episodeId) ?? episodes[0];
  const nextEpisode = episodes.find((episode) => episode.index > (currentEpisode?.index ?? 0));

  /* DramaPlay apply modal */
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyTargetEpisodeId, setApplyTargetEpisodeId] = useState("");
  const [applyNotice, setApplyNotice] = useState<string | null>(null);

  useEffect(() => { if (!episodeId && episodes[0]) setEpisodeId(episodes[0].id); }, [episodeId, episodes]);
  useEffect(() => { if (!activeNode && firstPlayable) setActiveNodeId(firstPlayable.id); }, [activeNode, firstPlayable]);

  const downloadAppJson = () => {
    const blob = new Blob([exportAppJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "drama-play-app-story.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const jumpToEpisode = (nextEpisodeId: string) => { setEpisodeId(nextEpisodeId); const nextNode = nodes.find((n) => n.data.episodeId === nextEpisodeId && n.kind === "scene"); setActiveNodeId(nextNode?.id ?? ""); };
  const chooseTarget = (targetNodeId?: string) => { if (!targetNodeId) return; const target = nodes.find((n) => n.id === targetNodeId); if (!target) return; setEpisodeId(target.data.episodeId); setActiveNodeId(target.id); };

  const openApplyModal = (epId: string) => { setApplyTargetEpisodeId(epId); setApplyModalOpen(true); };
  const applyDramaAsset = (asset: typeof dramaPlayAssets[number]) => {
    const scenesInEpisode = nodes.filter((n) => n.data.episodeId === applyTargetEpisodeId && n.kind === "scene");
    const target = scenesInEpisode[0];
    if (!target) { setApplyNotice("请先在该剧集中创建视频节点"); return; }
    updateNode(target.id, { title: target.data.title === "未命名视频节点" ? asset.title : target.data.title, videoUrl: asset.video, firstFrameRef: asset.poster, status: "ready" });
    setApplyModalOpen(false);
    setApplyNotice(`已将《${asset.title}》套用至「${target.data.title}」`);
    setTimeout(() => setApplyNotice(null), 3000);
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <main className="grid min-h-screen gap-5 bg-stage p-5 xl:grid-cols-[1fr_410px]">
        <section className="rounded-[2rem] border border-pink-100 bg-white p-5 shadow-soft">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Link href="/world-builder/stories/the-memory-thief" className="hover:text-ink-strong">记忆盗贼</Link>
                <span>/</span><span>App 预览</span>
              </div>
              <h1 className="mt-2 text-3xl font-semibold">iOS 互动播放验收</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={generateAllMockVideos} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"><Film size={16} /> 生成模拟视频</button>
              <button onClick={downloadAppJson} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"><Download size={16} /> 导出 App 数据</button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500">剧集列表</h2>
              {episodes.map((episode) => {
                const readyCount = nodes.filter((n) => n.data.episodeId === episode.id && n.kind === "scene" && n.data.status === "ready").length;
                const totalScenes = nodes.filter((n) => n.data.episodeId === episode.id && n.kind === "scene").length;
                return (
                  <button key={episode.id} onClick={() => jumpToEpisode(episode.id)}
                    className={cn("w-full rounded-2xl border p-4 text-left", episode.id === episodeId ? "border-pink-200 bg-accent-soft" : "border-slate-200 bg-white hover:bg-slate-50")}>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">第 {(episode.label ?? String(episode.index)).toUpperCase()} 集</p>
                    <h3 className="mt-1 text-sm font-semibold">{episode.title}</h3>
                    <p className="mt-2 text-xs text-slate-500">{readyCount}/{totalScenes} 视频就绪</p>
                    <button onClick={(e) => { e.stopPropagation(); openApplyModal(episode.id); }}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 text-[10px] font-semibold text-accent hover:bg-pink-200">
                      <Film size={9} /> 套用素材
                    </button>
                  </button>
                );
              })}
            </aside>

            <section className="phone-preview-bg relative grid place-items-center rounded-3xl border border-pink-100 bg-[radial-gradient(circle_at_top,#fce7f3,#eef2f7_42%,#d8dee9)] p-6">
              <div className="absolute inset-0 dot-matrix rounded-3xl pointer-events-none" />
              <div className="relative w-full max-w-[393px] rounded-[3rem] border-[12px] border-[#17181c] bg-[#17181c] shadow-2xl">
                <div className="absolute left-1/2 top-2 z-20 h-7 w-32 -translate-x-1/2 rounded-full bg-[#17181c]" />
                <div className="absolute inset-x-16 top-0 z-30 h-1 rounded-b-full bg-white/12" />
                <div className="aspect-[393/852] overflow-hidden rounded-[2.2rem] bg-black text-white">
                  <PhoneScreen node={activeNode} worldTitle={world.title} nextEpisodeTitle={nextEpisode?.title} onChoose={chooseTarget} />
                </div>
                <div className="absolute inset-x-24 bottom-2 z-20 h-1 rounded-full bg-white/35" />
              </div>
            </section>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-pink-100 bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold tracking-[0.16em] text-accent">播放路径</p>
            <h2 className="mt-2 text-xl font-semibold">{currentEpisode?.title ?? "未选择剧集"}</h2>
            <div className="mt-4 space-y-2">
              {episodeNodes.map((node) => (
                <button key={node.id} onClick={() => setActiveNodeId(node.id)}
                  className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm", node.id === activeNode?.id ? "border-pink-200 bg-accent-soft text-accent" : "border-slate-200 hover:bg-slate-50")}>
                  <span className="min-w-0"><span className="block truncate font-semibold">{node.data.title}</span><span className="mt-1 block text-xs text-slate-500">{nodeKindLabel(node)}</span></span>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-pink-100 bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold tracking-[0.16em] text-accent">分支连接</p>
            <h2 className="mt-2 text-xl font-semibold">连接线</h2>
            <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto">
              {edges.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">还没有连接线。</p> :
                edges.map((edge) => {
                  const s = nodes.find((n) => n.id === edge.source);
                  const t = nodes.find((n) => n.id === edge.target);
                  return <div key={edge.id} className="rounded-2xl border border-slate-200 p-3 text-sm"><div className="flex items-center gap-2 text-slate-500"><GitBranch size={14} /><span>{edge.actionType ? actionTypeLabels[edge.actionType as keyof typeof actionTypeLabels] ?? "结局" : "继续"}</span></div><p className="mt-2 leading-6">{s?.data.title ?? edge.source} → {t?.data.title ?? edge.target}</p></div>;
                })
              }
            </div>
          </div>
        </aside>
      </main>

      {/* DramaPlay Apply Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">套用素材</p>
                <h2 className="mt-2 text-xl font-semibold">Drama Play 素材库</h2>
                <p className="mt-1 text-sm text-slate-500">选择素材套用至当前剧集的视频节点</p>
              </div>
              <button onClick={() => setApplyModalOpen(false)} className="grid size-9 place-items-center rounded-xl hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {dramaPlayAssets.map((asset) => (
                <article key={asset.id} className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
                  <video src={asset.video} poster={asset.poster} controls className="aspect-video w-full bg-black object-cover" />
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{asset.title}</h3>
                      <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">本地视频</span>
                    </div>
                    <p className="text-xs text-slate-500">{asset.genre} · {asset.source}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{asset.description}</p>
                    <button onClick={() => applyDramaAsset(asset)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-deep">
                      <Film size={13} /> 套用到剧集视频节点
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {applyNotice && (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-700 shadow-soft">{applyNotice}</div>
      )}
    </WorldBuilderLayout>
  );
}

function PhoneScreen({ node, worldTitle, nextEpisodeTitle, onChoose, }: { node?: StoryNode; worldTitle: string; nextEpisodeTitle?: string; onChoose: (targetNodeId?: string) => void; }) {
  if (!node) return (<div className="grid h-full place-items-center px-8 text-center"><div><Smartphone className="mx-auto text-white/45" size={36} /><h2 className="mt-4 text-lg font-semibold">空剧集</h2><p className="mt-2 text-sm leading-6 text-white/50">添加视频节点后即可预览。</p></div></div>);

  if (node.kind === "interaction") return (
    <div className="relative flex h-full flex-col justify-between bg-[linear-gradient(160deg,#1a0f2e,#2d1b3d_48%,#d9468a)] p-5">
      {node.data.loopVideoUrl && <video src={node.data.loopVideoUrl} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-55" />}
      <div className="relative z-10"><p className="text-xs uppercase tracking-[0.18em] text-white/45">{worldTitle}</p><h2 className="mt-3 text-2xl font-semibold">{node.data.title}</h2><p className="mt-3 text-sm leading-6 text-white/68">{node.data.instruction}</p></div>
      <SocialActionRail compact likes="18.6k" comments={`${node.data.options.length} 选项`} />
      <div className="relative z-10 space-y-2 pr-14">
        {node.data.options.map((o) => (<button key={o.id} onClick={() => onChoose(o.targetNodeId)} className="flex w-full items-center justify-between rounded-2xl bg-white/92 px-4 py-3 text-left text-sm font-semibold text-ink-strong"><span>{o.label}<span className="mt-1 block text-xs font-normal text-slate-500">{actionTypeLabels[o.actionType]} {o.actionValue}</span></span><ChevronRight size={17} /></button>))}
      </div>
    </div>
  );

  if (node.kind === "ending") return (
    <div className="flex h-full flex-col justify-between bg-[linear-gradient(160deg,#1f1111,#3a1720_48%,#e11d48)] p-5">
      <div className="flex justify-between text-xs text-white/55"><span>{worldTitle}</span><span>{node.data.endingType}</span></div>
      <div><CheckCircle2 size={34} className="text-white/75" /><h2 className="mt-4 text-3xl font-semibold">{node.data.title}</h2><p className="mt-3 text-sm leading-6 text-white/70">{node.data.description}</p></div>
      <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink-strong"><RotateCcw size={16} /> 重新开始</button>
    </div>
  );

  return (
    <div className="relative flex h-full flex-col justify-between bg-[linear-gradient(160deg,#1a0f2e,#151b29_45%,#d9468a)] p-5">
      {node.data.videoUrl && !node.data.videoUrl.startsWith("mock://") && <video src={node.data.videoUrl} autoPlay muted loop playsInline controls className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/70" />
      <SocialActionRail likes="32.8k" comments="892" />
      <div className="relative z-10 flex items-center justify-between text-xs text-white/75"><span>{worldTitle}</span><span>{statusLabels[node.data.status]}</span></div>
      <div className="relative z-10 mr-14 rounded-3xl border border-white/12 bg-black/40 p-5 backdrop-blur"><div className="mb-4 flex items-center gap-2 text-white/75"><Play size={18} /><span className="text-sm font-semibold">{node.data.videoUrl?.startsWith("mock://") ? "模拟视频" : "本地视频"}</span></div><h2 className="text-2xl font-semibold">{node.data.title}</h2><p className="mt-3 line-clamp-6 text-sm leading-6 text-white/65">{node.data.prompt}</p></div>
      <div className="relative z-10 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/72 backdrop-blur"><span>{nextEpisodeTitle ? `上滑续看 · ${nextEpisodeTitle}` : "向后继续播放"}</span>{nextEpisodeTitle ? <ChevronsUp size={16} /> : <ArrowLeft size={16} className="rotate-180" />}</div>
    </div>
  );
}

function SocialActionRail({ likes, comments, compact = false }: { likes: string; comments: string; compact?: boolean }) {
  return (<div className={cn("absolute right-4 z-20 flex flex-col items-center gap-4", compact ? "bottom-32" : "bottom-24")}><ActionBtn icon={Heart} label={likes} title="收藏" /><ActionBtn icon={MessageCircle} label={comments} title="评论" /><ActionBtn icon={Share2} label="分享" title="分享" /></div>);
}
function ActionBtn({ icon: Icon, label, title }: { icon: typeof Heart; label: string; title: string }) {
  return (<button title={title} className="flex w-12 flex-col items-center gap-1 text-white drop-shadow"><span className="grid h-11 w-11 place-items-center rounded-full bg-black/35 backdrop-blur"><Icon size={21} fill="currentColor" strokeWidth={1.8} /></span><span className="w-full truncate text-center text-[10px] font-semibold">{label}</span></button>);
}

function nodeKindLabel(node: StoryNode) { if (node.kind === "scene") return `视频节点 · ${statusLabels[node.data.status]}`; if (node.kind === "interaction") return `${node.data.options.length} 个互动选项`; return `${node.data.endingType} 结局`; }
