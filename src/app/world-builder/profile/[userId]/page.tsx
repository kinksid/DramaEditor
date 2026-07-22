"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  Images,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
} from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import {
  profileIdFromSession,
  readSession,
  updateSession,
  type LocalSession,
} from "@/lib/authSession";
import { openAccountModal } from "@/lib/accountModal";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type MainTab = "portfolio" | "stars";
type WorkTab = "works" | "series";

export default function CreatorProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = typeof params?.userId === "string" ? params.userId : "creator";
  const language = useSettingsStore((s) => s.language);
  const zh = language === "zh";
  const projects = useWorldBuilderStore((s) => s.projects);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("portfolio");
  const [workTab, setWorkTab] = useState<WorkTab>("works");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "published">("all");
  const [shareHint, setShareHint] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener("dramaeditor-session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("dramaeditor-session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const sortedProjects = useMemo(() => {
    return [...(projects ?? [])].sort((a, b) => {
      const ta = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
  }, [projects]);

  const displayName = useMemo(() => {
    if (session?.displayName) return session.displayName;
    if (session?.email) return session.email.split("@")[0];
    if (session?.referralCode) return session.referralCode;
    return userId || "Creator";
  }, [session, userId]);

  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || "N";
  const bio =
    session?.bio?.trim() ||
    (zh ? "我正在把想象力变成现实。" : "I am turning imagination into reality.");
  const featuredIds = session?.featuredProjectIds ?? [];
  const featuredProjects = sortedProjects.filter((p) => featuredIds.includes(p.id)).slice(0, 3);
  const visibleProjects =
    filter === "published"
      ? sortedProjects.filter((p) => p.nodes?.some((n) => n.kind === "scene" && n.data.status === "ready"))
      : sortedProjects;

  const onCoverChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateSession({ coverImage: reader.result });
        setSession(readSession());
      }
    };
    reader.readAsDataURL(file);
  };

  const shareProfile = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareHint(zh ? "链接已复制" : "Link copied");
    } catch {
      setShareHint(url);
    }
    window.setTimeout(() => setShareHint(""), 1800);
  };

  const addFeatured = () => {
    const next = sortedProjects.find((p) => !featuredIds.includes(p.id));
    if (!next) {
      router.push("/world-builder/worlds");
      return;
    }
    updateSession({ featuredProjectIds: [...featuredIds, next.id].slice(0, 3) });
    setSession(readSession());
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="min-h-full bg-stage text-ink">
        {/* Cover / hero */}
        <div className="relative h-[220px] w-full overflow-hidden bg-panel sm:h-[260px]">
          {session?.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.coverImage} alt="" className="h-full w-full object-cover opacity-70" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,var(--tw-accent-soft)_0%,var(--tw-stage)_70%)]" />
          )}
          <div className="absolute inset-0 grid place-items-center">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="inline-flex flex-col items-center gap-2 rounded-xl px-4 py-3 text-ink-muted transition hover:bg-accent-soft/50 hover:text-ink-strong"
            >
              <span className="grid size-10 place-items-center rounded-full border border-card-border bg-card/80">
                <RefreshCw size={16} />
              </span>
              <span className="text-sm">{zh ? "更换背景图片" : "Change Background Image"}</span>
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 pt-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
          {/* Left profile card */}
          <aside className="relative z-[1] -mt-16 lg:-mt-20">
            <div className="rounded-2xl border border-card-border bg-card p-5 shadow-2xl">
              <div className="relative mx-auto w-fit">
                <div className="grid size-[108px] place-items-center rounded-full bg-accent text-4xl font-semibold text-white">
                  {avatarLetter}
                </div>
                <button
                  type="button"
                  onClick={() => openAccountModal("personal")}
                  className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full border border-card-border bg-card text-ink hover:text-ink-strong"
                  title={zh ? "编辑资料" : "Edit profile"}
                >
                  <Pencil size={13} />
                </button>
              </div>

              <h1 className="mt-4 truncate text-center text-xl font-semibold tracking-tight text-ink-strong">
                {displayName}
              </h1>
              <p className="mt-2 text-center text-sm leading-6 text-ink-muted">{bio}</p>

              <div className="mt-5 grid grid-cols-3 gap-2 border-y border-card-border py-4 text-center">
                <Stat value={session?.following ?? 0} label={zh ? "已关注" : "Following"} />
                <Stat value={session?.followers ?? 0} label={zh ? "粉丝" : "Followers"} />
                <Stat value={session?.favorites ?? 0} label={zh ? "收藏" : "Stars"} />
              </div>

              <button
                type="button"
                onClick={shareProfile}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-panel py-2.5 text-sm text-ink transition hover:bg-ink-strong"
              >
                <Share2 size={15} />
                {shareHint || (zh ? "分享" : "Share")}
              </button>

              <p className="mt-3 text-center text-[11px] text-ink-muted">@{profileIdFromSession(session) || userId}</p>
            </div>
          </aside>

          {/* Main column */}
          <section className="min-w-0 pt-4 lg:pt-6">
            <div className="flex items-center gap-6 border-b border-card-border text-sm">
              <TabButton
                active={mainTab === "portfolio"}
                onClick={() => setMainTab("portfolio")}
                label={zh ? "我的作品集" : "My Portfolio"}
              />
              <TabButton
                active={mainTab === "stars"}
                onClick={() => setMainTab("stars")}
                label={
                  <span className="inline-flex items-center gap-1.5">
                    {zh ? "我的收藏" : "My Favorites"}
                    <Lock size={12} className="opacity-50" />
                  </span>
                }
              />
            </div>

            {mainTab === "stars" ? (
              <div className="mt-10 rounded-2xl border border-dashed border-card-border bg-card px-6 py-16 text-center">
                <p className="text-sm text-ink-muted">
                  {zh ? "收藏夹为空，去 DramaTV 探索作品吧。" : "Your collection is empty. Explore DramaTV."}
                </p>
                <Link
                  href="/world-builder/inspire"
                  className="mt-4 inline-flex rounded-lg bg-ink-strong px-4 py-2 text-sm text-white hover:opacity-90"
                >
                  {zh ? "探索 DramaTV" : "Explore DramaTV"}
                </Link>
              </div>
            ) : (
              <>
                {/* Featured */}
                <div className="mt-6">
                  <h2 className="text-sm font-medium text-ink">
                    {zh ? `代表作 (${featuredProjects.length}/3)` : `Featured (${featuredProjects.length}/3)`}
                  </h2>
                  {featuredProjects.length === 0 ? (
                    <div className="mt-3 flex min-h-[180px] flex-col items-center justify-center rounded-2xl bg-card px-6 py-10 text-center">
                      <Images size={36} className="text-ink-muted" />
                      <p className="mt-3 max-w-sm text-sm text-ink-muted">
                        {zh
                          ? "向全世界展示你最得意的创作。"
                          : "Show the world your proudest creations."}
                      </p>
                      <button
                        type="button"
                        onClick={addFeatured}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-ink-strong px-3.5 py-2 text-sm text-white hover:opacity-90"
                      >
                        <Plus size={14} />
                        {zh ? "添加代表作" : "Add Featured"}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {featuredProjects.map((p) => (
                        <Link
                          key={p.id}
                          href={`/world-builder/stories/${p.id}`}
                          className="overflow-hidden rounded-xl border border-card-border bg-card transition hover:border-white/20"
                        >
                          <div className="aspect-[4/3] bg-panel">
                            {p.world?.coverImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.world.coverImage} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <p className="truncate px-3 py-2 text-sm text-ink">{p.name}</p>
                        </Link>
                      ))}
                      {featuredProjects.length < 3 && (
                        <button
                          type="button"
                          onClick={addFeatured}
                          className="grid min-h-[140px] place-items-center rounded-xl border border-dashed border-card-border text-sm text-ink-muted hover:border-white/25 hover:text-ink-muted"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Plus size={14} />
                            {zh ? "添加代表作" : "Add Featured"}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Works list */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-sm">
                    <button
                      type="button"
                      onClick={() => setWorkTab("works")}
                      className={cn(
                        "pb-1",
                        workTab === "works" ? "text-ink-strong" : "text-ink-muted hover:text-ink-muted",
                      )}
                    >
                      {zh ? `作品 (${visibleProjects.length})` : `Works (${visibleProjects.length})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkTab("series")}
                      className={cn(
                        "pb-1",
                        workTab === "series" ? "text-ink-strong" : "text-ink-muted hover:text-ink-muted",
                      )}
                    >
                      {zh ? "系列 (0)" : "Series (0)"}
                    </button>
                  </div>

                  <div className="relative" ref={filterRef}>
                    <button
                      type="button"
                      onClick={() => setFilterOpen((v) => !v)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-card-border bg-panel px-2.5 text-xs text-ink-muted"
                    >
                      {filter === "all" ? (zh ? "全部" : "All") : zh ? "已发布" : "Published"}
                      <ChevronDown size={13} />
                    </button>
                    {filterOpen && (
                      <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-32 rounded-xl border border-card-border bg-card p-1 shadow-2xl">
                        {(
                          [
                            { id: "all" as const, label: zh ? "全部" : "All" },
                            { id: "published" as const, label: zh ? "已发布" : "Published" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-ink-muted hover:bg-white/5"
                            onClick={() => {
                              setFilter(opt.id);
                              setFilterOpen(false);
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {workTab === "series" ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-card-border py-14 text-center text-sm text-ink-muted">
                    {zh ? "暂无系列" : "No series yet"}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Link
                      href="/world-builder/worlds"
                      className="grid aspect-[4/3] place-items-center rounded-xl border border-card-border bg-card text-ink-muted transition hover:border-accent/40 hover:text-ink-strong"
                    >
                      <span className="flex flex-col items-center gap-2 text-sm">
                        <Plus size={28} />
                        {zh ? "发布作品" : "Publish Work"}
                      </span>
                    </Link>
                    {visibleProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/world-builder/stories/${project.id}`}
                        className="group overflow-hidden rounded-xl border border-card-border bg-card transition hover:border-white/20"
                      >
                        <div className="relative aspect-[4/3] bg-panel">
                          {project.world?.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={project.world.coverImage}
                              alt={project.name}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-[#2a1a22] to-[#111]" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="truncate text-sm font-medium text-white">{project.name}</p>
                            <p className="mt-0.5 truncate text-xs text-white/70">
                              {project.episodes?.length ?? 0} {zh ? "集" : "eps"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </WorldBuilderLayout>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-base font-semibold text-ink-strong">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">{label}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative pb-3 font-medium transition",
        active ? "text-ink-strong" : "text-ink-muted hover:text-ink-muted",
      )}
    >
      {label}
      {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />}
    </button>
  );
}
