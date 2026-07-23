"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileUp, Info, ScrollText, Sparkles, X } from "lucide-react";
import { parseCommaList } from "@/lib/worldBuilderProject";
import { MODAL_OVERLAY_80, MODAL_PANEL } from "@/lib/modalTheme";
import { cn } from "@/lib/utils";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type TabId = "details" | "lore";

type Props = {
  open: boolean;
  onClose: () => void;
};

const LORE_MAX = 5000;
const GENRE_MAX = 5;
const TAG_MAX = 10;

function TagEditor({
  label,
  values,
  max,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  max: number;
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const next = draft.trim();
    if (!next || values.includes(next) || values.length >= max) return;
    onChange([...values, next]);
    setDraft("");
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm text-white/55">{label}</span>
        <span className="text-xs text-white/35">
          {values.length}/{max}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(values.filter((item) => item !== tag))}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-white/80 transition hover:border-white/20"
          >
            {tag}
            <X size={12} className="text-white/45" />
          </button>
        ))}
      </div>
      {values.length < max && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder={placeholder}
          className="mt-2 w-full border-0 border-b border-white/15 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/35"
        />
      )}
    </div>
  );
}

export function EditWorldModal({ open, onClose }: Props) {
  const { world, setupDraft, activeProjectId, updateWorld, updateSetupDraft, renameProject, listProjects } =
    useWorldBuilderStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabId>("details");
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [era, setEra] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [lore, setLore] = useState("");
  const [coverImage, setCoverImage] = useState<string | undefined>();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setTab("details");
    const project = listProjects().find((item) => item.id === activeProjectId);
    setTitle(project?.name || setupDraft.worldTitle || world.title);
    setLogline(setupDraft.worldDescription || world.description);
    setEra(setupDraft.tone || world.subtitle || "");
    setGenres(
      parseCommaList(setupDraft.genre).length
        ? parseCommaList(setupDraft.genre)
        : world.genre.slice(0, GENRE_MAX),
    );
    setTags(
      parseCommaList(setupDraft.tags).length ? parseCommaList(setupDraft.tags) : world.tags.slice(0, TAG_MAX),
    );
    setLore(setupDraft.script || "");
    setCoverImage(world.coverImage);
  }, [open, setupDraft, world, activeProjectId, listProjects]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSave = () => {
    const trimmedTitle = title.trim() || "未命名项目";

    updateSetupDraft({
      worldTitle: trimmedTitle,
      worldDescription: logline.trim(),
      tone: era.trim(),
      genre: genres.join(", "),
      tags: tags.join(", "),
      script: lore,
    });

    updateWorld({
      title: trimmedTitle,
      description: logline.trim(),
      subtitle: era.trim() || undefined,
      genre: genres,
      tags,
      coverImage,
    });

    if (activeProjectId) {
      renameProject(activeProjectId, trimmedTitle);
    }

    onClose();
  };

  const handleCoverFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCoverImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className={MODAL_OVERLAY_80} onClick={onClose}>
      <div
        className={cn(MODAL_PANEL, "flex h-[min(720px,calc(100vh-3rem))] w-full max-w-4xl overflow-hidden rounded-2xl")}
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="flex w-[168px] shrink-0 flex-col border-r border-white/10 bg-black/20 px-3 py-4">
          <p className="px-2 text-sm font-semibold text-white/90">编辑世界</p>
          <nav className="mt-4 space-y-1">
            <button
              type="button"
              onClick={() => setTab("details")}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                tab === "details" ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white/80",
              )}
            >
              <Info size={15} />
              详情
            </button>
            <button
              type="button"
              onClick={() => setTab("lore")}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                tab === "lore" ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white/80",
              )}
            >
              <ScrollText size={15} />
              世界观
            </button>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
            <div>
              <h2 className="text-2xl font-semibold text-white">{tab === "details" ? "详情" : "世界观"}</h2>
              <p className="mt-1 text-sm text-white/45">
                {tab === "details"
                  ? "封面、项目名称、简介与世界分类信息。"
                  : "世界观圣经：设定、规则与背景历史。"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg text-white/45 transition hover:bg-white/8 hover:text-white/80"
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {tab === "details" ? (
              <div className="space-y-6">
                <div>
                  <p className="mb-3 text-sm text-white/55">封面</p>
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                    <div
                      className={cn(
                        "relative aspect-[16/9] max-h-[220px] w-full overflow-hidden",
                        coverImage ? "bg-[#121214]" : "de-canvas-surface rounded-none border-0 shadow-none",
                      )}
                    >
                      {coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverImage} alt="" className="size-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-white/10 p-3">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.08]"
                      >
                        <FileUp size={15} />
                        更换
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.08]"
                        onClick={() => window.alert("AI 封面生成即将上线")}
                      >
                        <Sparkles size={15} />
                        AI 生成
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleCoverFile(e.target.files?.[0])}
                      />
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm text-white/55">项目名称</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-2 w-full border-0 border-b border-white/15 bg-transparent py-2 text-sm text-white outline-none focus:border-white/35"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-white/55">一句话简介</span>
                  <textarea
                    value={logline}
                    onChange={(e) => setLogline(e.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none border-0 border-b border-white/15 bg-transparent py-2 text-sm leading-6 text-white outline-none focus:border-white/35"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-white/55">时代背景</span>
                  <input
                    value={era}
                    onChange={(e) => setEra(e.target.value)}
                    placeholder="例如：当代都市 / 近未来"
                    className="mt-2 w-full border-0 border-b border-white/15 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/35"
                  />
                </label>

                <TagEditor
                  label="类型"
                  values={genres}
                  max={GENRE_MAX}
                  onChange={setGenres}
                  placeholder="输入后回车添加类型"
                />

                <TagEditor
                  label="标签"
                  values={tags}
                  max={TAG_MAX}
                  onChange={setTags}
                  placeholder="输入后回车添加标签"
                />
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm text-white/55">世界观圣经</span>
                  <span className="text-xs text-white/35">
                    {lore.length}/{LORE_MAX}
                  </span>
                </div>
                <textarea
                  value={lore}
                  onChange={(e) => setLore(e.target.value.slice(0, LORE_MAX))}
                  rows={18}
                  placeholder="写下世界设定、规则、历史与禁忌…"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/30 focus:border-white/25"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white/85"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-deep"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
