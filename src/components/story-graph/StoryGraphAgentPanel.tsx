"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChevronDown,
  Gauge,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  PanelRightClose,
  Palette,
  Plus,
  SendHorizontal,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { openAccountModal } from "@/lib/accountModal";
import { readSession } from "@/lib/authSession";
import { suggestNodeChainApi } from "@/lib/generationClient";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

const suggestions = [
  {
    icon: Palette,
    title: "把这个项目的风格做成 Skill",
    prompt: "请把这个项目的风格沉淀成可复用的 Skill 方案，包含视觉、叙事与节点编排偏好。",
  },
  {
    icon: MessageSquare,
    title: "体验 Brainstorm 模式设计人物关系",
    prompt: "🧠 头脑风暴 请用 Brainstorm 模式帮我设计人物关系与冲突线。",
  },
];

type PanelProps = {
  mode?: "docked" | "floating";
  animateEntry?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
};

function AgentHeaderAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group relative grid size-8 place-items-center rounded-lg text-white/40 transition hover:bg-white/8 hover:text-white/70"
    >
      <Icon size={16} strokeWidth={1.75} />
      <span className="pointer-events-none absolute -bottom-9 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2a2a2a] px-2.5 py-1 text-[11px] font-medium text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.45)] group-hover:block">
        {label}
      </span>
    </button>
  );
}

export function StoryGraphAgentFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="打开 AI 助手"
      className={cn(
        "absolute bottom-6 right-6 z-30 grid size-14 place-items-center rounded-full",
        "border border-white/12 bg-[#161616] text-white shadow-[0_10px_40px_rgba(0,0,0,0.55)]",
        "transition hover:border-accent/45 hover:bg-[#1c1c1c] de-agent-fab-pulse",
      )}
    >
      <AgentOrbIcon />
    </button>
  );
}

export function StoryGraphAgentPanel({
  mode = "docked",
  animateEntry = false,
  onMinimize,
  onClose,
}: PanelProps) {
  const {
    episodes,
    nodes,
    setupDraft,
    selectedEpisodeId,
    createSuggestedNodes,
    generateAllMockVideos,
  } = useWorldBuilderStore();
  const [displayName, setDisplayName] = useState("创作者");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [composerGlow, setComposerGlow] = useState(animateEntry);

  const currentEpisode = episodes.find((item) => item.id === selectedEpisodeId);
  const sceneCount = nodes.filter((node) => node.kind === "scene").length;
  const readySceneCount = nodes.filter((node) => node.kind === "scene" && node.data.status === "ready").length;
  const isFloating = mode === "floating";

  useEffect(() => {
    const session = readSession();
    if (session?.displayName) setDisplayName(session.displayName.split("@")[0] ?? session.displayName);
    else if (session?.email) setDisplayName(session.email.split("@")[0] ?? "创作者");
  }, []);

  useEffect(() => {
    if (!animateEntry) return;
    setComposerGlow(true);
    const timer = window.setTimeout(() => setComposerGlow(false), 1300);
    return () => window.clearTimeout(timer);
  }, [animateEntry]);

  const handleSuggest = async (prompt?: string) => {
    setLoading(true);
    setReply(null);
    try {
      if (setupDraft.script.trim()) {
        const result = await suggestNodeChainApi({
          script: setupDraft.script,
          episodeTitle: currentEpisode?.title,
        });
        createSuggestedNodes(result.nodes);
        setReply(result.summary);
        return;
      }
      setReply(
        prompt ??
          `当前项目有 ${episodes.length} 集、${nodes.length} 个节点，${readySceneCount}/${sceneCount} 个视频就绪。可在左侧素材坞拖放素材，或在画布上添加节点。`,
      );
    } catch (error) {
      setReply(error instanceof Error ? error.message : "助手暂时不可用");
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-l border-white/8 bg-[#0a0a0a] text-white/90",
        isFloating
          ? "fixed right-0 top-14 z-50 w-[min(400px,92vw)] de-agent-panel-slide-in shadow-[-16px_0_48px_rgba(0,0,0,0.55)]"
          : "hidden w-[min(360px,32vw)] xl:flex",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
        <button type="button" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90">
          新建对话
          <ChevronDown size={14} className="text-white/40" />
        </button>
        <div className="flex items-center gap-1">
          <AgentHeaderAction label="新功能" icon={Bell} />
          <AgentHeaderAction
            label="用量统计"
            icon={Gauge}
            onClick={() => openAccountModal("usage")}
          />
          <AgentHeaderAction label="聊天记录" icon={MessageSquarePlus} />
          <AgentHeaderAction
            label="收起对话"
            icon={PanelRightClose}
            onClick={isFloating ? onClose : onMinimize}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-8">
        <h2 className="text-[26px] font-semibold leading-snug text-white">
          Hi {displayName}！
          <br />
          今天一起创作点什么？
        </h2>
        <div className="mt-6 grid gap-2 sm:grid-cols-1">
          {suggestions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  setInput(item.prompt);
                  void handleSuggest(item.prompt);
                }}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/8 text-white/70">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-white/85">{item.title}</span>
                    <span className="mt-1 block line-clamp-2 text-xs leading-5 text-white/45">{item.prompt}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {reply && (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white/70">
            {reply}
          </div>
        )}
        <div className="mt-5 space-y-2 text-xs text-white/40">
          <p>已构建剧集 · {episodes.length} 项</p>
          <p>已构建节点 · {nodes.length} 项</p>
          <p>
            已生成视频 · {readySceneCount}/{sceneCount} 项
          </p>
        </div>
      </div>

      <div className="border-t border-white/8 p-4">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-white/10 bg-[#121212] p-3 transition-shadow",
            composerGlow && "de-agent-composer-glow",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-80"
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="描述创意或需求，/ 使用技能，🔍 添加画布内容， @ 引用参考或使用插件"
            className="relative w-full resize-none bg-transparent text-sm text-white/85 outline-none placeholder:text-white/30"
          />
          <div className="relative mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button type="button" className="grid size-8 place-items-center rounded-lg text-white/45 hover:bg-white/8">
                <Plus size={16} />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/45"
              >
                手动确认
                <ChevronDown size={12} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/55"
              >
                Kimi 2.6
                <ChevronDown size={12} />
              </button>
              <button type="button" className="grid size-8 place-items-center rounded-lg text-white/45 hover:bg-white/8">
                <Mic size={15} />
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSuggest(input.trim() || undefined)}
                className="grid size-8 place-items-center rounded-full bg-white text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <SendHorizontal size={15} />}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void handleSuggest()}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/8 disabled:opacity-50"
          >
            <Sparkles size={13} />
            建链建议
          </button>
          <button
            type="button"
            onClick={generateAllMockVideos}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/8"
          >
            批量生成
          </button>
        </div>
      </div>
    </aside>
  );
}

function AgentOrbIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="text-white/90">
      <rect x="5" y="4" width="5" height="16" rx="1.2" transform="rotate(-24 12 12)" fill="currentColor" opacity="0.95" />
      <rect x="10" y="4" width="5" height="16" rx="1.2" transform="rotate(-24 12 12)" fill="currentColor" opacity="0.72" />
      <rect x="15" y="4" width="5" height="16" rx="1.2" transform="rotate(-24 12 12)" fill="currentColor" opacity="0.48" />
    </svg>
  );
}
