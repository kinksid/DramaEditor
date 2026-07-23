"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChevronDown,
  Gauge,
  List,
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
  badge,
}: {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  /** 图1：铃铛右上角浅蓝色提示点 */
  badge?: "dot";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="btn-press group relative grid size-8 place-items-center rounded-lg text-white/50 transition-colors duration-press ease-de-out hover:bg-white/[0.08] hover:text-white/90"
    >
      <Icon size={16} strokeWidth={1.75} />
      {badge === "dot" && (
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 size-[6px] rounded-full bg-sky-400 shadow-[0_0_0_1.5px_#0a0a0a]"
        />
      )}
      <span className="pointer-events-none absolute -bottom-9 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#1a1a1a] px-2.5 py-1 text-[11px] font-medium text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.45)] group-hover:block">
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
        "btn-press absolute bottom-6 right-6 z-30 grid size-14 place-items-center rounded-full",
        "border border-white/[0.06] bg-[#141414]/95 text-white shadow-[0_10px_40px_rgba(0,0,0,0.55)] backdrop-blur-md",
        "transition-colors duration-press ease-de-out hover:border-white/15 hover:bg-[#1a1a1a] de-agent-fab-pulse",
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
        "flex h-full shrink-0 flex-col border-l border-white/[0.04] bg-[#0a0a0a] text-white/90",
        isFloating
          ? "fixed right-0 top-14 z-50 w-[min(400px,92vw)] de-agent-panel-slide-in shadow-[-16px_0_48px_rgba(0,0,0,0.55)]"
          : "hidden w-[min(360px,32vw)] xl:flex",
      )}
    >
      {/* Header — 图1：列表 + 新建对话 ▾ · 铃铛(蓝点) / 用量 / 新对话 / 收起 */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.04] px-3 py-2.5">
        <button
          type="button"
          className="btn-press inline-flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-medium text-white/90 hover:bg-white/[0.04]"
        >
          <List size={16} strokeWidth={1.75} className="shrink-0 text-white/55" />
          <span className="truncate">新建对话</span>
          <ChevronDown size={14} className="shrink-0 text-white/40" />
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <AgentHeaderAction label="新功能" icon={Bell} badge="dot" />
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
        <h2 className="text-[26px] font-semibold leading-snug tracking-tight text-white">
          Hi {displayName}！
          <br />
          <span className="text-white/55">今天一起创作点什么？</span>
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                className="btn-press rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3.5 text-left transition-[border-color,background-color,transform] duration-popover ease-de-out hover:border-white/12 hover:bg-white/[0.06]"
              >
                <span className="grid size-8 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.05] text-white/70">
                  <Icon size={15} />
                </span>
                <span className="mt-3 block text-[13px] font-medium leading-snug text-white/85">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
        {reply && (
          <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/70">
            {reply}
          </div>
        )}
        <div className="mt-6 space-y-1.5 text-[11px] text-white/35">
          <p>已构建剧集 · {episodes.length} 项</p>
          <p>已构建节点 · {nodes.length} 项</p>
          <p>
            已生成视频 · {readySceneCount}/{sceneCount} 项
          </p>
        </div>
      </div>

      <div className="border-t border-white/[0.04] p-4">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#121212] p-3",
            composerGlow && "de-agent-composer-glow",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="描述创意或需求，/ 使用技能，@ 引用参考"
            className="relative w-full resize-none bg-transparent text-sm text-white/85 outline-none placeholder:text-white/30"
          />
          <div className="relative mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="btn-press grid size-8 place-items-center rounded-lg text-white/45 hover:bg-white/[0.08]"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                className="btn-press inline-flex items-center gap-1 rounded-full border border-white/[0.06] px-2.5 py-1 text-[11px] text-white/45 hover:bg-white/[0.06]"
              >
                手动确认
                <ChevronDown size={12} />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="btn-press inline-flex items-center gap-1 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-[11px] text-white/55 hover:bg-white/[0.06]"
              >
                Kimi 2.6
                <ChevronDown size={12} />
              </button>
              <button
                type="button"
                className="btn-press grid size-8 place-items-center rounded-lg text-white/45 hover:bg-white/[0.08]"
              >
                <Mic size={15} />
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSuggest(input.trim() || undefined)}
                className="btn-cta btn-press grid size-8 place-items-center rounded-full disabled:opacity-50"
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
            className="btn-press inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] px-3 py-2 text-xs text-white/70 transition-colors duration-press ease-de-out hover:bg-white/[0.06] disabled:opacity-50"
          >
            <Sparkles size={13} />
            建链建议
          </button>
          <button
            type="button"
            onClick={generateAllMockVideos}
            className="btn-press inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] px-3 py-2 text-xs text-white/70 transition-colors duration-press ease-de-out hover:bg-white/[0.06]"
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
