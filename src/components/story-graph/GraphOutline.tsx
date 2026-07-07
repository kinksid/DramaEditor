"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Box, FileText, ExternalLink, Film, GitBranch, MousePointerClick, UserRound, UsersRound, X, Check, Sparkles, Loader2, Trash2, ImagePlus, MapPin, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { dramaPlayAssets } from "@/data/dramaPlayAssets";
import { locationTypeLabels, statusLabels } from "@/lib/worldBuilderLabels";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import type { Episode, StoryNode } from "@/types/worldBuilder";

type PanelTab = "assets" | "outline";

export function GraphOutline() {
  const { episodes, nodes, selectedEpisodeId, selectedNodeId, selectEpisode, selectNode, setupDraft, updateSetupDraft, deleteEpisode, characters, locations, updateNode } = useWorldBuilderStore();
  const [tab, setTab] = useState<PanelTab>("outline");
  const [scriptOpen, setScriptOpen] = useState(false);
  const [scriptDraft, setScriptDraft] = useState(setupDraft.script);

  /* AICON-style: one-click script analysis */
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    characters: { name: string; role: string }[];
    scenes: { title: string; prompt: string }[];
    interactions: { title: string; instruction: string }[];
    episodes: { title: string }[];
  } | null>(null);

  const handleScriptAnalyze = () => {
    setAnalyzing(true);
    const text = scriptDraft.trim();
    if (!text) { setAnalyzing(false); return; }

    const lines = text.split("\n").filter((l) => l.trim());
    const chars: { name: string; role: string }[] = [];
    const sceneList: { title: string; prompt: string }[] = [];
    const interactions: { title: string; instruction: string }[] = [];
    const episodeList: { title: string }[] = [];

    let currentScene = "";
    let currentPrompt = "";

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.includes("：") || trimmed.includes("，") && (trimmed.length < 30)) {
        const parts = trimmed.split(/[：，,]/);
        if (parts.length >= 2 && !trimmed.startsWith("第") && !trimmed.startsWith("场")) {
          const name = parts[0].replace(/[\d.、\-—\s]/g, "").trim();
          if (name.length >= 2 && name.length <= 8 && !name.includes("外景") && !name.includes("内景")) {
            if (!chars.find((c) => c.name === name)) chars.push({ name, role: parts.slice(1).join(" · ").trim() || "角色" });
          }
        }
      }
      if (trimmed.startsWith("第") && trimmed.includes("场")) {
        if (currentScene) sceneList.push({ title: currentScene, prompt: currentPrompt || currentScene });
        currentScene = trimmed;
        currentPrompt = "";
      } else if (trimmed.startsWith("外景") || trimmed.startsWith("内景")) {
        currentPrompt += (currentPrompt ? " " : "") + trimmed;
      }
    });
    if (currentScene) sceneList.push({ title: currentScene, prompt: currentPrompt || currentScene });

    if (sceneList.length > 0) {
      const chunks = Math.max(1, Math.ceil(sceneList.length / 4));
      for (let i = 0; i < sceneList.length; i += chunks) {
        const episodeScenes = sceneList.slice(i, i + chunks);
        episodeList.push({ title: episodeScenes[0]?.title.replace(/第.*场/, "").trim() || `剧集 ${Math.floor(i / chunks) + 1}` });
      }
    }
    episodeList.forEach((ep, idx) => { if (idx < episodeList.length - 1) interactions.push({ title: `${ep.title} · 选择分支`, instruction: `在"${ep.title}"结束后，用户选择下一步方向` }); });

    if (chars.length === 0) chars.push({ name: "主角", role: "主要角色" });
    if (episodeList.length === 0) episodeList.push({ title: "第一集" });

    setTimeout(() => {
      setAnalysisResult({ characters: chars, scenes: sceneList.length > 0 ? sceneList : [{ title: "场景 1", prompt: text.slice(0, 100) }], interactions, episodes: episodeList });
      setAnalyzing(false);
    }, 600);
  };

  const applyAnalysis = () => {
    if (!analysisResult) return;
    const st = useWorldBuilderStore.getState();
    analysisResult.characters.forEach((c) => { if (!st.characters.find((ch) => ch.name === c.name)) st.addCharacter({ name: c.name, role: c.role, description: `${c.name} - ${c.role}` }); });
    analysisResult.episodes.forEach((ep, epIdx) => {
      st.addEpisode({ title: ep.title });
      setTimeout(() => {
        const updated = useWorldBuilderStore.getState();
        const epId = updated.episodes[updated.episodes.length - 1]?.id;
        if (!epId) return;
        const startIdx = epIdx * Math.max(1, Math.ceil(analysisResult.scenes.length / analysisResult.episodes.length));
        const endIdx = Math.min(startIdx + Math.ceil(analysisResult.scenes.length / analysisResult.episodes.length), analysisResult.scenes.length);
        for (let i = startIdx; i < endIdx; i++) {
          const scene = analysisResult.scenes[i];
          if (scene) {
            updated.addSceneNode(epId);
            setTimeout(() => { const nds = useWorldBuilderStore.getState().nodes; const l = nds[nds.length - 1]; if (l && l.kind === "scene") useWorldBuilderStore.getState().updateNode(l.id, { title: scene.title, prompt: scene.prompt }); }, 30);
          }
        }
        const interaction = analysisResult.interactions[epIdx];
        if (interaction) setTimeout(() => { const snds = useWorldBuilderStore.getState().nodes.filter((n) => n.data.episodeId === epId && n.kind === "scene"); const tid = snds.length > 1 ? snds[1]?.id : snds[0]?.id; const st2 = useWorldBuilderStore.getState(); st2.addInteractionNode(epId); setTimeout(() => { const ints = useWorldBuilderStore.getState().nodes.filter((n) => n.kind === "interaction" && n.data.episodeId === epId); const li = ints[ints.length - 1]; if (li) { useWorldBuilderStore.getState().updateNode(li.id, { title: interaction.title, instruction: interaction.instruction }); if (tid) useWorldBuilderStore.getState().addOption(li.id); } }, 50); }, 100);
      }, 30);
    });
    setAnalysisResult(null); setScriptOpen(false);
  };

  /* Selected node for asset tab */
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <aside className="hidden min-h-0 border-r border-slate-200 bg-white xl:flex xl:w-[278px] xl:flex-col">
      <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
        <button onClick={() => setTab("assets")} className={cn("py-4 font-semibold", tab === "assets" ? "border-b-2 border-ink text-ink" : "text-slate-400")}>素材</button>
        <button onClick={() => setTab("outline")} className={cn("py-4 font-semibold", tab === "outline" ? "border-b-2 border-ink text-ink" : "text-slate-400")}>大纲</button>
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        {tab === "outline" ? (
          <div className="space-y-1 px-2">
            {episodes.map((episode) => (
              <EpisodeOutline key={episode.id} episode={episode} nodes={nodes.filter((n) => n.data.episodeId === episode.id)}
                active={episode.id === selectedEpisodeId} onSelectEpisode={() => selectEpisode(episode.id)}
                onSelectNode={(id) => { selectEpisode(episode.id); selectNode(id); }}
                onDelete={() => deleteEpisode(episode.id)} />
            ))}
          </div>
        ) : (
          <div className="space-y-3 px-3">
            {/* Asset tab — show content based on selected node type */}
            {selectedNode ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {selectedNode.kind === "scene" ? "视频节点素材" : selectedNode.kind === "interaction" ? "互动节点素材" : "结局节点素材"}
                </p>
                {selectedNode.kind === "scene" && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Drama Play 素材 · 拖到画布或点击套用</p>
                    {dramaPlayAssets.map((a) => (
                      <button key={a.id} onClick={() => updateNode(selectedNode.id, { videoUrl: a.video, firstFrameRef: a.poster, status: "ready" })}
                        className="flex w-full items-center gap-2 rounded-xl border border-slate-200 p-2 text-left hover:bg-accent-soft transition">
                        <Play size={14} className="text-accent shrink-0" />
                        <div className="min-w-0"><p className="truncate text-xs font-semibold">{a.title}</p><p className="text-[10px] text-slate-400">{a.genre}</p></div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedNode.kind === "interaction" && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">可用角色 · 拖到画布</p>
                    {characters.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                        <UserRound size={14} className="text-accent shrink-0" />
                        <div className="min-w-0"><p className="truncate text-xs font-semibold">{c.name}</p><p className="text-[10px] text-slate-400">{c.role}</p></div>
                      </div>
                    ))}
                    <p className="text-xs text-slate-500 pt-2">可用地点</p>
                    {locations.map((l) => (
                      <div key={l.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                        <MapPin size={14} className="text-accent shrink-0" />
                        <div className="min-w-0"><p className="truncate text-xs font-semibold">{l.name}</p><p className="text-[10px] text-slate-400">{locationTypeLabels[l.type]}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedNode.kind === "ending" && (
                  <div className="text-xs text-slate-400 text-center py-8">选择视频或互动节点以查看素材</div>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                <ImagePlus size={24} className="mx-auto mb-2 opacity-40" />
                <p>点击一个节点查看对应素材</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 p-4">
        <p className="text-xs font-semibold">剧本</p>
        <button onClick={() => { setScriptDraft(setupDraft.script); setScriptOpen(true); }} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"><FileText size={15} /> 查看完整剧本</button>
        <p className="mt-5 text-xs font-semibold">故事线</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">编剧定分支，交互连节点，视频补素材，导演发布检查。</p>
        <Link href="/world-builder" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white">返回世界构建器 <ExternalLink size={14} /></Link>
      </div>

      {/* Script Analysis Modal */}
      {scriptOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-3xl bg-white shadow-soft flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">剧本</p><h2 className="mt-2 text-xl font-semibold">完整剧本 · 一键拆分</h2><p className="mt-1 text-sm text-slate-500">粘贴或编辑剧本，AI 智能拆分为角色、场景和剧集结构</p></div>
              <div className="flex items-center gap-2">
                <button onClick={handleScriptAnalyze} disabled={analyzing} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-accent-deep disabled:opacity-60">{analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{analyzing ? "分析中..." : "一键拆分"}</button>
                <button onClick={() => { setScriptOpen(false); setAnalysisResult(null); }} className="grid size-9 place-items-center rounded-xl hover:bg-slate-100"><X size={18} /></button>
              </div>
            </div>
            <div className="grid gap-0 flex-1 min-h-0 lg:grid-cols-[1fr_380px]">
              <textarea className="h-full min-h-[480px] resize-none border-r border-slate-100 bg-slate-50 p-6 font-mono text-sm leading-7 outline-none" value={scriptDraft} onChange={(e) => { setScriptDraft(e.target.value); updateSetupDraft({ script: e.target.value }); }} placeholder="在此粘贴完整剧本，每场用 第X场 标记..." />
              <div className="overflow-y-auto p-6">
                {analysisResult ? (
                  <div className="space-y-5">
                    <div><h3 className="text-sm font-semibold flex items-center gap-2"><UserRound size={14} className="text-accent" /> 角色提取 ({analysisResult.characters.length})</h3>
                      <div className="mt-2 space-y-1">{analysisResult.characters.map((c, i) => (<div key={i} className="flex items-center gap-2 rounded-lg bg-accent-soft/50 px-3 py-2 text-xs"><span className="font-semibold">{c.name}</span><span className="text-slate-400">·</span><span className="text-slate-500">{c.role}</span></div>))}</div></div>
                    <div><h3 className="text-sm font-semibold flex items-center gap-2"><Film size={14} className="text-accent" /> 场景识别 ({analysisResult.scenes.length})</h3>
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">{analysisResult.scenes.map((s, i) => (<div key={i} className="rounded-lg border border-slate-100 px-3 py-1.5 text-[11px]"><span className="font-semibold">{s.title}</span>{s.prompt && <p className="mt-0.5 text-slate-400 line-clamp-1">{s.prompt}</p>}</div>))}</div></div>
                    <div><h3 className="text-sm font-semibold flex items-center gap-2"><MousePointerClick size={14} className="text-accent" /> 互动节点 ({analysisResult.interactions.length})</h3>
                      <div className="mt-2 space-y-1">{analysisResult.interactions.map((o, i) => (<div key={i} className="rounded-lg border border-slate-100 px-3 py-1.5 text-[11px]">{o.title}</div>))}</div></div>
                    <div><h3 className="text-sm font-semibold flex items-center gap-2"><GitBranch size={14} className="text-accent" /> 剧集结构 ({analysisResult.episodes.length})</h3>
                      <div className="mt-2 space-y-1">{analysisResult.episodes.map((e, i) => (<div key={i} className="rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-semibold">第 {i + 1} 集 · {e.title}</div>))}</div></div>
                    <button onClick={applyAnalysis} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-ink-strong"><Sparkles size={16} /> 应用到故事线</button>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-400"><Sparkles size={32} className="mb-3 opacity-40" /><p className="text-sm font-medium">点击"一键拆分"按钮</p><p className="mt-1 text-xs">AI 将自动分析剧本，提取角色、场景、互动和剧集结构</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function EpisodeOutline({ episode, nodes, active, onSelectEpisode, onSelectNode, onDelete }: { episode: Episode; nodes: StoryNode[]; active: boolean; onSelectEpisode: () => void; onSelectNode: (id: string) => void; onDelete: () => void }) {
  const { updateEpisode } = useWorldBuilderStore();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(episode.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const startRename = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); setRenameValue(episode.title); setRenaming(true); setTimeout(() => inputRef.current?.focus(), 50); };
  const submitRename = () => { const t = renameValue.trim(); if (t && t !== episode.title) updateEpisode(episode.id, { title: t }); setRenaming(false); };
  const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); if (confirm(`确定删除「${episode.title}」吗？该集下的节点也会一并删除。`)) onDelete(); };

  return (
    <div className={cn("rounded-xl border border-transparent group/ep", active && "border-pink-100 bg-accent-soft/70")}>
      <button onClick={onSelectEpisode} className={cn("flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs", active ? "text-ink" : "text-slate-700 hover:bg-slate-50")}>
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("grid h-5 min-w-5 shrink-0 place-items-center rounded-md px-1 text-[11px] font-semibold", active ? "bg-white text-accent" : "bg-slate-100 text-slate-500")}>{(episode.label ?? String(episode.index)).toUpperCase()}</span>
          {renaming ? (
            <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input ref={inputRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setRenaming(false); }} onBlur={submitRename} className="min-w-0 w-24 rounded-md border border-pink-200 px-1.5 py-0.5 text-[11px] font-semibold outline-none" />
              <button onClick={submitRename} className="grid size-4 place-items-center rounded text-emerald-600 hover:bg-emerald-50"><Check size={10} /></button>
            </span>
          ) : (
            <span className="truncate font-semibold cursor-text hover:text-accent" onDoubleClick={startRename} title="双击重命名">{episode.title}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-400">{nodes.length} 节点</span>
          <button onClick={handleDelete} className="grid size-5 place-items-center rounded-md text-slate-300 opacity-0 group-hover/ep:opacity-100 hover:text-red-500 hover:bg-red-50 transition" title="删除剧集"><Trash2 size={11} /></button>
        </div>
      </button>
      {active && (
        <div className="pb-2 pl-8 pr-2">
          {nodes.map((node) => (
            <button key={node.id} onClick={() => onSelectNode(node.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-500 hover:bg-white hover:text-ink">
              {node.kind === "scene" && <Film size={12} />}{node.kind === "interaction" && <MousePointerClick size={12} />}{node.kind === "ending" && <GitBranch size={12} />}
              <span className="truncate">{node.data.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
