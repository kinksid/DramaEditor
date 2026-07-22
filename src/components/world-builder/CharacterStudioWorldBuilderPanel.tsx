"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  History,
  PanelRightClose,
  Plus,
  SendHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Character, Location, World } from "@/types/worldBuilder";

type BuilderMessage =
  | { kind: "text"; text: string }
  | { kind: "check"; label: string; detail?: string; thumbnail?: string; expandable?: boolean }
  | {
      kind: "action";
      id: string;
      text: string;
      primary: string;
      secondary: string;
      selection?: string;
    };

type Props = {
  zh: boolean;
  world: World;
  characters: Character[];
  locations: Location[];
  activeCharacterId: string;
  coverImage?: string;
  hasScript: boolean;
  onGenerateImages?: () => void;
  onGenerateStory?: () => void;
};

export function CharacterStudioWorldBuilderPanel({
  zh,
  world,
  characters,
  locations,
  activeCharacterId,
  coverImage,
  hasScript,
  onGenerateImages,
  onGenerateStory,
}: Props) {
  const [chatInput, setChatInput] = useState("");
  const [imageChoice, setImageChoice] = useState<string | null>(null);
  const [storyChoice, setStoryChoice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ cover: true });

  const activeCharacter = characters.find((item) => item.id === activeCharacterId);

  const messages = useMemo<BuilderMessage[]>(() => {
    const items: BuilderMessage[] = [
      {
        kind: "text",
        text: zh
          ? "世界、角色、故事板与节点视频将在后台生成。你可以随时点击浏览；卡片会在完成后自动更新。"
          : "Your world, cast, storyboard, and node videos will generate in the background. Click around any time; cards will flip as they finish.",
      },
      {
        kind: "check",
        label: zh ? "已构建世界设定 + 识别角色 / 地点" : "Built world spec + detected cast / locations",
      },
    ];

    if (coverImage || world.coverImage) {
      items.push({
        kind: "check",
        label: zh ? "已生成世界封面" : "Built World Cover",
        thumbnail: coverImage || world.coverImage,
        expandable: true,
      });
    }

    if (hasScript) {
      items.push({
        kind: "check",
        label: zh ? "已起草源剧本" : "Drafted source script",
        expandable: true,
      });
    }

    if (characters.length > 0 || locations.length > 0) {
      items.push({
        kind: "text",
        text: zh
          ? "世界已播种 — 请审阅并确认角色与地点以继续。"
          : "World seeded — review and confirm your characters and locations to continue.",
      });
    }

    for (const character of characters.slice(0, 4)) {
      items.push({
        kind: "check",
        label: zh ? `已构建角色：${character.name || "Untitled"}` : `Built character: ${character.name || "Untitled"}`,
        expandable: true,
      });
    }

    for (const location of locations.slice(0, 4)) {
      items.push({
        kind: "check",
        label: zh ? `已构建地点：${location.name}` : `Built location: ${location.name}`,
        expandable: true,
      });
    }

    if (characters.length > 0 || locations.length > 0) {
      items.push({
        kind: "text",
        text: zh
          ? "角色与地点设定已就绪。接下来是图像与故事生成。"
          : "Character and location specs are ready. Image and story generation are next.",
      });
      items.push({
        kind: "action",
        id: "images",
        text: zh
          ? "角色与地点已就绪。需要我生成参考图吗？"
          : "Your characters and locations are ready. Want me to generate their reference images?",
        primary: zh ? "生成图像" : "Generate images",
        secondary: zh ? "暂不" : "Not now",
        selection: imageChoice ?? undefined,
      });
      items.push({
        kind: "action",
        id: "story",
        text: zh
          ? "准备好生成故事剧本、剧集拆分与场景提示词了吗？"
          : "Ready to generate the story script, episode breakdown, and scene prompts?",
        primary: zh ? "生成故事" : "Generate story",
        secondary: zh ? "暂不" : "Not now",
        selection: storyChoice ?? undefined,
      });
    }

    if (activeCharacter && !characters.some((c) => c.referenceImage)) {
      items.unshift({
        kind: "text",
        text: zh
          ? `正在编辑「${activeCharacter.name || "Untitled"}」。在左侧填写设定，在 Face 面板生成参考图。`
          : `Editing "${activeCharacter.name || "Untitled"}". Fill specs on the left, generate references in the Face panel.`,
      });
    }

    return items;
  }, [
    zh,
    world.coverImage,
    coverImage,
    hasScript,
    characters,
    locations,
    activeCharacter,
    imageChoice,
    storyChoice,
  ]);

  const hasProgress = characters.length > 0 || locations.length > 0 || !!world.coverImage;

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/8 bg-[#0c0c0c]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
            World builder
          </p>
          <button
            type="button"
            className="mt-0.5 flex max-w-[180px] items-center gap-1 truncate text-xs text-white/75"
          >
            <span className="truncate">
              {zh ? "新对话" : "New Conversation"}
            </span>
            <ChevronDown size={12} className="shrink-0 opacity-50" />
          </button>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <button type="button" className="grid size-8 place-items-center rounded-lg text-white/45 hover:bg-white/5">
            <Plus size={15} />
          </button>
          <button type="button" className="grid size-8 place-items-center rounded-lg text-white/45 hover:bg-white/5">
            <History size={15} />
          </button>
          <button type="button" className="grid size-8 place-items-center rounded-lg text-white/45 hover:bg-white/5">
            <PanelRightClose size={15} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {!hasProgress ? (
          <p className="px-2 text-center text-sm leading-6 text-white/35">
            {zh ? "开始对话，继续构建你的世界。" : "Start a conversation to build out your world."}
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              if (message.kind === "text") {
                return (
                  <p key={index} className="text-[13px] leading-6 text-white/55">
                    {message.text}
                  </p>
                );
              }

              if (message.kind === "check") {
                const key = `${message.label}-${index}`;
                const isOpen = expanded[key] ?? false;
                return (
                  <div
                    key={key}
                    className="overflow-hidden rounded-xl border border-white/8 bg-[#141414]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        message.expandable
                          ? setExpanded((prev) => ({ ...prev, [key]: !isOpen }))
                          : undefined
                      }
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
                    >
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-white/35" />
                      <span className="min-w-0 flex-1 text-[13px] leading-5 text-white/75">{message.label}</span>
                      {message.expandable && (
                        <ChevronRight
                          size={14}
                          className={cn("mt-0.5 shrink-0 text-white/30 transition", isOpen && "rotate-90")}
                        />
                      )}
                    </button>
                    {message.thumbnail && isOpen && (
                      <div className="border-t border-white/8 px-3 pb-3 pt-2">
                        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={message.thumbnail} alt="" className="aspect-video w-full object-cover" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={message.id} className="rounded-xl border border-white/8 bg-[#141414] p-3">
                  <p className="text-[13px] leading-6 text-white/60">{message.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (message.id === "images") {
                          setImageChoice(message.primary);
                          onGenerateImages?.();
                        } else {
                          setStoryChoice(message.primary);
                          onGenerateStory?.();
                        }
                      }}
                      className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/[0.08]"
                    >
                      {message.primary}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (message.id === "images") setImageChoice(message.secondary);
                        else setStoryChoice(message.secondary);
                      }}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/45 transition hover:text-white/70"
                    >
                      {message.secondary}
                    </button>
                  </div>
                  {message.selection && (
                    <p className="mt-2 text-[11px] text-white/30">
                      {zh ? `你选择了「${message.selection}」` : `You selected '${message.selection}'`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/8 p-3">
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-3">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value.slice(0, 30000))}
            rows={3}
            placeholder={zh ? "继续构建…" : "Continue building..."}
            className="de-modal-surface-field w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/30"
          />
          <div className="mt-2 flex items-center justify-between">
            <button type="button" className="grid size-8 place-items-center rounded-lg text-white/45 hover:bg-white/5">
              <Plus size={16} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tabular-nums text-white/30">
                {chatInput.length.toLocaleString()} / 30,000
              </span>
              <button
                type="button"
                disabled={!chatInput.trim()}
                className="grid size-8 place-items-center rounded-lg bg-white/10 text-white transition disabled:opacity-30"
              >
                <SendHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
