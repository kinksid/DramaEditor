"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FolderPlus,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { BuildWorldModal } from "@/components/world-builder/BuildWorldModal";
import { FolderStackIllustration } from "@/components/world-builder/FolderStackIllustration";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { dramaPlayAssets } from "@/data/dramaPlayAssets";
import { readSession, type LocalTeam } from "@/lib/authSession";
import { cn } from "@/lib/utils";
import { MODAL_OVERLAY, MODAL_PANEL } from "@/lib/modalTheme";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";

type ScopeTab = "personal" | "team";
type ViewMode = "grid" | "list";
type FilterKind = "all" | "folder" | "project";
type SortBy = "updated" | "created";
type SortOrder = "newest" | "oldest";

type FolderItem = {
  id: string;
  name: string;
  kind: "folder";
  createdAt: string;
  updatedAt: string;
  projectCount: number;
};

type ProjectItem = {
  id: string;
  name: string;
  kind: "project";
  genre: string;
  description: string;
  poster?: string;
  tone?: string;
  createdAt: string;
  updatedAt: string;
  episodeCount: number;
  isSample?: boolean;
  active?: boolean;
};

type LibraryItem = FolderItem | ProjectItem;

const FOLDERS_KEY = "dramaeditor-project-folders";
const FOLDER_MAP_KEY = "dramaeditor-project-folder-map";
const HIDDEN_SAMPLES_KEY = "dramaeditor-hidden-samples";
const SAMPLE_NAMES_KEY = "dramaeditor-sample-names";
const DEMO_STORY_ID = "world-neon-tokyo-noir";

function relativeZh(iso?: string) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return "编辑于 几秒前";
  const min = Math.floor(sec / 60);
  if (min < 60) return `编辑于 ${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `编辑于 ${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `编辑于 ${day} 天前`;
  const month = Math.floor(day / 30);
  if (month < 12) return `编辑于 ${month} 个月前`;
  return `编辑于 ${Math.floor(month / 12)} 年前`;
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function readFolders(): FolderItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FOLDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FolderItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFolders(folders: FolderItem[]) {
  window.localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

function readFolderMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FOLDER_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeFolderMap(map: Record<string, string>) {
  window.localStorage.setItem(FOLDER_MAP_KEY, JSON.stringify(map));
}

function readHiddenSamples(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_SAMPLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHiddenSamples(ids: string[]) {
  window.localStorage.setItem(HIDDEN_SAMPLES_KEY, JSON.stringify(ids));
}

function readSampleNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SAMPLE_NAMES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSampleNames(map: Record<string, string>) {
  window.localStorage.setItem(SAMPLE_NAMES_KEY, JSON.stringify(map));
}

export default function WorldsPage() {
  return (
    <Suspense fallback={<div className="grid min-h-[40vh] place-items-center text-sm text-ink-muted">加载工作空间…</div>}>
      <WorldsPageContent />
    </Suspense>
  );
}

function WorldsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFolderId = searchParams.get("folder");
  const {
    listProjects,
    switchProject,
    deleteProject,
    renameProject,
    cloneProject,
    createProjectFromSession,
    activeProjectId,
    hasHydrated,
  } = useWorldBuilderStore();
  const projects = listProjects();

  const [scope, setScope] = useState<ScopeTab>("personal");
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [filterKind, setFilterKind] = useState<FilterKind>("all");
  const [sortBy, setSortBy] = useState<SortBy>("updated");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  // 文件夹/样例名来自 localStorage：首屏保持空，挂载后再灌入，避免 SSR/CSR 文本不一致
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [folderMap, setFolderMap] = useState<Record<string, string>>({});
  const [teams, setTeams] = useState<LocalTeam[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
    isSample?: boolean;
    kind?: "project" | "folder";
  } | null>(null);
  const [pendingRename, setPendingRename] = useState<{
    id: string;
    title: string;
    isSample?: boolean;
    kind: "project" | "folder";
  } | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [cardMenuId, setCardMenuId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hiddenSamples, setHiddenSamples] = useState<string[]>([]);
  const [sampleNames, setSampleNames] = useState<Record<string, string>>({});
  const [libraryReady, setLibraryReady] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardMenuId) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-project-card-menu]")) return;
      setCardMenuId(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCardMenuId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [cardMenuId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let next = readFolders();
    if (!next.length) {
      const now = new Date().toISOString();
      next = [
        {
          id: "folder-default",
          name: "未命名文件夹",
          kind: "folder",
          createdAt: now,
          updatedAt: now,
          projectCount: 0,
        },
      ];
      writeFolders(next);
    }
    setFolders(next);
    setFolderMap(readFolderMap());
    setHiddenSamples(readHiddenSamples());
    setSampleNames(readSampleNames());
    setTeams(readSession()?.teams ?? []);
    setLibraryReady(true);
    const sync = () => setTeams(readSession()?.teams ?? []);
    window.addEventListener("dramaeditor-session", sync);
    return () => window.removeEventListener("dramaeditor-session", sync);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
      if (!(e.target as HTMLElement).closest("[data-project-card-menu]")) setCardMenuId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const sampleProjects: ProjectItem[] = useMemo(
    () =>
      [
        ...dramaPlayAssets.map((asset, index) => ({
          id: `sample-${asset.id ?? index}`,
          name: asset.title,
          kind: "project" as const,
          genre: asset.genre,
          description: asset.description,
          poster: asset.poster,
          createdAt: "2025-12-15T12:04:00.000Z",
          updatedAt: "2025-12-15T12:04:00.000Z",
          episodeCount: 1,
          isSample: true,
        })),
        {
          id: "sample-blood-city",
          name: "血色之城",
          kind: "project" as const,
          genre: "恐怖",
          description: "一座明亮城市隐藏着百年吸血族与人类共存的秘密。",
          tone: "from-[#1a1218] via-red-950 to-[#b94a6a]",
          createdAt: "2026-01-08T10:00:00.000Z",
          updatedAt: "2026-03-01T10:00:00.000Z",
          episodeCount: 0,
          isSample: true,
        },
        {
          id: "sample-spring",
          name: "春日盟约",
          kind: "project" as const,
          genre: "爱情",
          description: "外交、孤独与权力在一场王室峰会上相撞。",
          tone: "from-[#f4f1f2] via-stone-300 to-[#b94a6a]",
          createdAt: "2026-02-14T10:00:00.000Z",
          updatedAt: "2026-04-20T10:00:00.000Z",
          episodeCount: 0,
          isSample: true,
        },
      ]
        .filter((item) => !hiddenSamples.includes(item.id))
        .map((item) => ({
          ...item,
          name: sampleNames[item.id] || item.name,
        })),
    [hiddenSamples, sampleNames],
  );

  const activeFolder = useMemo(
    () => (activeFolderId ? folders.find((folder) => folder.id === activeFolderId) : undefined),
    [activeFolderId, folders],
  );

  const foldersWithCounts = useMemo(
    () =>
      folders.map((folder) => ({
        ...folder,
        projectCount: Object.values(folderMap).filter((folderId) => folderId === folder.id).length,
      })),
    [folders, folderMap],
  );

  const items = useMemo(() => {
    // SSR 与首屏 CSR 都先空列表；store + localStorage 就绪后再渲染，消除 hydration 项目名错位
    if (!hasHydrated || !libraryReady) {
      return [] as LibraryItem[];
    }
    if (scope === "team") {
      return [] as LibraryItem[];
    }

    const projectItems: ProjectItem[] = projects.map((project) => ({
      id: project.id,
      name: project.name,
      kind: "project",
      genre: project.setupDraft?.genre?.split(/[,，]/)[0]?.trim() || "未分类",
      description: project.setupDraft?.worldDescription || project.world?.description || "",
      poster: project.world?.coverImage,
      createdAt: project.createdAt,
      // 默认「按最近修改」优先用最后打开/退出时间，使刚退出的项目排在「测试」等之前
      updatedAt: project.lastOpenedAt || project.updatedAt,
      episodeCount: project.episodes?.length ?? 0,
      active: project.id === activeProjectId,
    }));

    let next: LibraryItem[];

    if (activeFolderId) {
      next = projectItems.filter((project) => folderMap[project.id] === activeFolderId);
    } else {
      next = [...foldersWithCounts, ...projectItems, ...sampleProjects];
    }

    if (!activeFolderId) {
      if (filterKind === "folder") next = next.filter((i) => i.kind === "folder");
      if (filterKind === "project") next = next.filter((i) => i.kind === "project");
    }

    const q = query.trim().toLowerCase();
    if (q) {
      next = next.filter((item) => {
        if (item.kind === "folder") return item.name.toLowerCase().includes(q);
        return `${item.name} ${item.description} ${item.genre}`.toLowerCase().includes(q);
      });
    }

    next.sort((a, b) => {
      // folders first (left of grid after 新建项目), then by time
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      const aKey = sortBy === "created" ? a.createdAt : a.updatedAt;
      const bKey = sortBy === "created" ? b.createdAt : b.updatedAt;
      const av = new Date(aKey).getTime() || 0;
      const bv = new Date(bKey).getTime() || 0;
      return sortOrder === "newest" ? bv - av : av - bv;
    });

    return next;
  }, [
    hasHydrated,
    libraryReady,
    scope,
    foldersWithCounts,
    folderMap,
    activeFolderId,
    projects,
    sampleProjects,
    filterKind,
    query,
    sortBy,
    sortOrder,
    activeProjectId,
  ]);

  const filterLabel =
    filterKind === "folder" ? "仅文件夹" : filterKind === "project" ? "仅项目" : "显示全部";

  const createFolder = () => {
    const now = new Date().toISOString();
    const folder: FolderItem = {
      id: `folder-${Date.now().toString(36)}`,
      name: "未命名文件夹",
      kind: "folder",
      createdAt: now,
      updatedAt: now,
      projectCount: 0,
    };
    const next = [folder, ...folders];
    setFolders(next);
    writeFolders(next);
  };

  const assignProjectToFolder = (projectId: string) => {
    if (!activeFolderId) return;
    const next = { ...folderMap, [projectId]: activeFolderId };
    setFolderMap(next);
    writeFolderMap(next);
  };

  const openItem = (item: LibraryItem) => {
    if (item.kind === "folder") {
      router.push(`/world-builder/worlds?folder=${item.id}`);
      return;
    }
    if (item.isSample) {
      router.push(`/world-builder/stories/${DEMO_STORY_ID}`);
      return;
    }
    switchProject(item.id);
    router.push(`/world-builder/stories/${item.id}`);
  };

  const openRename = (item: {
    id: string;
    name: string;
    isSample?: boolean;
    kind?: "project" | "folder";
  }) => {
    setCardMenuId(null);
    setPendingRename({
      id: item.id,
      title: item.name,
      isSample: item.isSample,
      kind: item.kind ?? "project",
    });
    setRenameDraft(item.name);
  };

  const confirmRename = () => {
    if (!pendingRename) return;
    const next = renameDraft.trim().slice(0, 60);
    if (!next) return;
    if (pendingRename.kind === "folder") {
      const updated = folders.map((folder) =>
        folder.id === pendingRename.id
          ? { ...folder, name: next, updatedAt: new Date().toISOString() }
          : folder,
      );
      setFolders(updated);
      writeFolders(updated);
    } else if (pendingRename.isSample) {
      const updated = { ...sampleNames, [pendingRename.id]: next };
      setSampleNames(updated);
      writeSampleNames(updated);
    } else {
      renameProject(pendingRename.id, next);
    }
    setPendingRename(null);
    setNotice("已重命名");
  };

  const handleCopyProject = (item: ProjectItem) => {
    setCardMenuId(null);
    if (item.isSample) {
      const createdId = createProjectFromSession();
      if (createdId) {
        renameProject(createdId, `${item.name} 副本`);
        setNotice(`已复制「${item.name}」`);
      }
      return;
    }
    const clonedId = cloneProject(item.id);
    if (clonedId) setNotice(`已复制「${item.name}」`);
  };

  const handleDeleteRequest = (item: {
    id: string;
    name: string;
    isSample?: boolean;
    kind?: "project" | "folder";
  }) => {
    setCardMenuId(null);
    setPendingDelete({
      id: item.id,
      title: item.name,
      isSample: item.isSample,
      kind: item.kind ?? "project",
    });
  };

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="min-h-full bg-stage text-ink">
        {/* TapNow-style toolbar */}
        <div className="flex flex-col gap-y-2 px-8 pt-6 sm:pt-8 md:flex-row md:items-start md:justify-between pb-2">
          <div className="flex flex-col gap-2">
            {activeFolder && (
              <nav className="flex items-center gap-1.5 text-sm text-ink-muted">
                <button
                  type="button"
                  onClick={() => router.push("/world-builder/worlds")}
                  className="hover:text-accent"
                >
                  个人
                </button>
                <ChevronRight size={14} />
                <span className="font-medium text-ink-strong">{activeFolder.name}</span>
              </nav>
            )}
            <div className="flex items-center gap-6 text-sm">
            {(
              [
                { id: "personal" as const, label: "个人" },
                { id: "team" as const, label: "团队项目" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id)}
                className={cn(
                  "relative pb-2 font-medium transition",
                  scope === tab.id ? "text-ink-strong" : "text-ink-muted hover:text-ink",
                )}
              >
                {tab.label}
                {scope === tab.id && (
                  <span className="absolute inset-x-0 bottom-0 h-px bg-accent" />
                )}
              </button>
            ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-9 items-center gap-2 rounded-full border border-card-border bg-panel px-3 text-sm text-ink-muted">
              <Search size={14} className="text-ink-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索"
                className="w-28 bg-transparent outline-none placeholder:text-ink-muted sm:w-36"
              />
            </label>

            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-card-border bg-panel px-3 text-sm text-ink hover:bg-white/5"
              >
                {filterLabel}
                <ChevronDown size={14} className="text-ink-muted" />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-52 overflow-hidden rounded-xl border border-card-border bg-card py-1.5 shadow-2xl">
                  <MenuSection title="筛选">
                    <MenuCheck
                      label="显示全部"
                      active={filterKind === "all"}
                      onClick={() => setFilterKind("all")}
                    />
                    <MenuCheck
                      label="仅文件夹"
                      active={filterKind === "folder"}
                      onClick={() => setFilterKind("folder")}
                    />
                    <MenuCheck
                      label="仅项目"
                      active={filterKind === "project"}
                      onClick={() => setFilterKind("project")}
                    />
                  </MenuSection>
                  <div className="my-1.5 h-px bg-white/10" />
                  <MenuSection title="排序方式">
                    <MenuCheck
                      label="按最近修改"
                      active={sortBy === "updated"}
                      onClick={() => setSortBy("updated")}
                    />
                    <MenuCheck
                      label="按创建日期"
                      active={sortBy === "created"}
                      onClick={() => setSortBy("created")}
                    />
                  </MenuSection>
                  <div className="my-1.5 h-px bg-white/10" />
                  <MenuSection title="顺序">
                    <MenuCheck
                      label="最新优先"
                      active={sortOrder === "newest"}
                      onClick={() => setSortOrder("newest")}
                    />
                    <MenuCheck
                      label="最早优先"
                      active={sortOrder === "oldest"}
                      onClick={() => setSortOrder("oldest")}
                    />
                  </MenuSection>
                </div>
              )}
            </div>

            <div className="inline-flex h-9 overflow-hidden rounded-lg border border-card-border bg-panel">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={cn(
                  "grid w-9 place-items-center text-ink-muted transition",
                  view === "grid" && "bg-accent-soft text-ink-strong",
                )}
                aria-label="网格视图"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "grid w-9 place-items-center text-ink-muted transition",
                  view === "list" && "bg-accent-soft text-ink-strong",
                )}
                aria-label="列表视图"
              >
                <List size={15} />
              </button>
            </div>

            <span className="mx-0.5 hidden h-5 w-px bg-white/10 sm:block" />

            <button
              type="button"
              onClick={createFolder}
              className="grid size-9 place-items-center rounded-lg border border-card-border bg-panel text-ink-muted hover:bg-accent-soft/50 hover:text-ink-strong"
              title="新建文件夹"
            >
              <FolderPlus size={16} />
            </button>

            <button
              type="button"
              onClick={() => setBuildOpen(true)}
              className="btn-cta btn-press inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold"
            >
              <Plus size={15} />
              新建项目
            </button>
          </div>
        </div>

        <div className="flex justify-center px-3 py-4 md:px-5 md:py-5">
          {scope === "team" ? (
            <div className="w-full max-w-[1020px] rounded-2xl border border-dashed border-card-border bg-card px-6 py-16 text-center">
              <p className="text-sm text-ink-muted">
                {teams.length
                  ? `已加入团队：${teams.map((t) => t.name).join("、")}。云端团队项目尚未同步。`
                  : "暂无团队项目。可在头像菜单中创建团队。"}
              </p>
              <button
                type="button"
                onClick={() => setBuildOpen(true)}
                className="btn-cta btn-press mt-4 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold"
              >
                <Plus size={14} /> 新建项目
              </button>
            </div>
          ) : view === "grid" ? (
            <div className="grid w-full max-w-[1020px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {/* TapNow: 新建项目 fixed first */}
              <button
                type="button"
                onClick={() => setBuildOpen(true)}
                className="group flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[16px] border border-transparent bg-[#18181B] transition hover:border-white/30"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#ffffff] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="block">
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="#000000"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="text-sm font-medium text-white/90">新建项目</span>
              </button>

              {items.map((item) =>
                item.kind === "folder" ? (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openItem(item);
                      }
                    }}
                    className="group relative isolate aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-[16px] border border-transparent bg-[#18181B] text-left text-white transition hover:border-white/30"
                  >
                    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
                      <FolderStackIllustration />
                    </div>
                    <ProjectCardMenu
                      open={cardMenuId === item.id}
                      onToggle={(e) => {
                        e.stopPropagation();
                        setCardMenuId((current) => (current === item.id ? null : item.id));
                      }}
                      onRename={() => openRename({ id: item.id, name: item.name, kind: "folder" })}
                      onCopy={null}
                      onDelete={() => handleDeleteRequest({ id: item.id, name: item.name, kind: "folder" })}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[42%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 z-30 p-3">
                      <h2 className="truncate text-sm font-semibold leading-5 text-white">{item.name}</h2>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-white/55">
                        <span className="truncate">{relativeZh(item.updatedAt)}</span>
                        <span className="shrink-0">{item.projectCount} 个项目</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <article
                    key={item.id}
                    onClick={() => openItem(item)}
                    className={cn(
                      "group relative isolate aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-[16px] border bg-[#18181B] transition",
                      item.active
                        ? "border-accent/40 ring-1 ring-accent/25"
                        : "border-transparent hover:border-white/30",
                    )}
                  >
                    {item.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.poster}
                        alt={item.name}
                        className="pointer-events-none absolute inset-0 z-0 size-full object-cover transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    ) : (
                      <div className="de-project-matrix absolute inset-0 z-0 size-full">
                        <div className="de-project-matrix-shine absolute inset-0" aria-hidden />
                      </div>
                    )}
                    <ProjectCardMenu
                      open={cardMenuId === item.id}
                      onToggle={(e) => {
                        e.stopPropagation();
                        setCardMenuId((current) => (current === item.id ? null : item.id));
                      }}
                      onRename={() =>
                        openRename({
                          id: item.id,
                          name: item.name,
                          isSample: item.isSample,
                          kind: "project",
                        })
                      }
                      onCopy={() => handleCopyProject(item)}
                      onDelete={() =>
                        handleDeleteRequest({
                          id: item.id,
                          name: item.name,
                          isSample: item.isSample,
                          kind: "project",
                        })
                      }
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[42%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-ink-muted" suppressHydrationWarning>
                          {item.genre}
                        </p>
                        <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5 text-white">{item.name}</h2>
                      </div>
                      <span className="shrink-0 text-[11px] text-ink-muted">{item.episodeCount} 集</span>
                    </div>
                  </article>
                ),
              )}
              {!items.length && (
                <div className="col-span-full rounded-xl border border-dashed border-card-border py-10 text-center text-sm text-ink-muted">
                  {activeFolder ? "文件夹内暂无项目，点击「新建项目」开始创作。" : "当前筛选下暂无内容。"}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-[1020px] overflow-hidden rounded-2xl border border-card-border bg-card">
              <div className="grid grid-cols-[72px_minmax(140px,1.4fr)_80px_minmax(90px,1fr)_140px_140px] gap-3 border-b border-card-border px-4 py-3 text-xs text-ink-muted">
                <span>预览</span>
                <span>名称</span>
                <span>类型</span>
                <span>内容</span>
                <span>创建时间</span>
                <span>最近更新</span>
              </div>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className="grid w-full grid-cols-[72px_minmax(140px,1.4fr)_80px_minmax(90px,1fr)_140px_140px] items-center gap-3 border-b border-white/5 px-4 py-3 text-left text-sm transition hover:bg-white/[0.03] last:border-b-0"
                >
                  <span className="flex aspect-[9/16] w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-panel">
                    {item.kind === "folder" ? (
                      <FolderPlus size={18} className="text-ink-muted" />
                    ) : item.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.poster} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="de-project-matrix block h-full w-full" />
                    )}
                  </span>
                  <span className="truncate font-medium text-ink-strong">{item.name}</span>
                  <span className="text-ink-muted">{item.kind === "folder" ? "文件夹" : "项目"}</span>
                  <span className="truncate text-ink-muted">
                    {item.kind === "folder"
                      ? `${item.projectCount} 个项目`
                      : `${item.episodeCount} 集 · ${item.genre}`}
                  </span>
                  <span className="text-xs text-ink-muted">{formatDateTime(item.createdAt)}</span>
                  <span className="text-xs text-ink-muted">{relativeZh(item.updatedAt)}</span>
                </button>
              ))}
              {!items.length && (
                <div className="px-4 py-14 text-center text-sm text-ink-muted">暂无内容</div>
              )}
            </div>
          )}
        </div>
      </div>

      <BuildWorldModal
        open={buildOpen}
        onClose={() => setBuildOpen(false)}
        onProjectCreated={assignProjectToFolder}
      />

      {pendingRename && (
        <div className={MODAL_OVERLAY} onClick={() => setPendingRename(null)}>
          <div
            className={cn(MODAL_PANEL, "w-full max-w-md rounded-2xl p-6 text-ink")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink-strong">
                {pendingRename.kind === "folder" ? "重命名文件夹" : "重命名项目"}
              </h2>
              <button
                type="button"
                onClick={() => setPendingRename(null)}
                className="grid size-8 place-items-center rounded-full text-ink-muted transition hover:bg-white/5 hover:text-ink-strong"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>
            <label className="mt-4 block">
              <span className="text-xs text-ink-muted">名称</span>
              <input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmRename();
                  }
                }}
                maxLength={60}
                className="mt-2 w-full rounded-xl border border-card-border bg-panel px-3 py-2.5 text-sm text-ink-strong outline-none focus:border-accent"
              />
            </label>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingRename(null)}
                className="flex-1 rounded-full border border-card-border bg-panel px-4 py-2.5 text-sm font-medium text-ink-strong transition hover:bg-white/5"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmRename}
                disabled={!renameDraft.trim()}
                className="flex-1 rounded-full bg-ink-strong px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className={MODAL_OVERLAY} onClick={() => setPendingDelete(null)}>
          <div
            className={cn(MODAL_PANEL, "w-full max-w-md rounded-2xl p-6 text-ink")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink-strong">
                {pendingDelete.kind === "folder" ? "删除文件夹" : "删除项目"}
              </h2>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="grid size-8 place-items-center rounded-full text-ink-muted transition hover:bg-white/5 hover:text-ink-strong"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-4 text-base font-medium text-ink-strong">「{pendingDelete.title}」</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              {pendingDelete.kind === "folder"
                ? "文件夹将被删除，其中的项目会回到工作空间根目录。此操作无法撤销。"
                : "该项目将被永久删除，此操作无法撤销。"}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-full border border-card-border bg-panel px-4 py-2.5 text-sm font-medium text-ink-strong transition hover:bg-white/5"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingDelete.kind === "folder") {
                    const nextFolders = folders.filter((folder) => folder.id !== pendingDelete.id);
                    setFolders(nextFolders);
                    writeFolders(nextFolders);
                    const nextMap = { ...folderMap };
                    Object.keys(nextMap).forEach((projectId) => {
                      if (nextMap[projectId] === pendingDelete.id) delete nextMap[projectId];
                    });
                    setFolderMap(nextMap);
                    writeFolderMap(nextMap);
                    if (activeFolderId === pendingDelete.id) {
                      router.push("/world-builder/worlds");
                    }
                    setNotice("已删除文件夹");
                  } else if (pendingDelete.isSample) {
                    const next = [...hiddenSamples, pendingDelete.id];
                    setHiddenSamples(next);
                    writeHiddenSamples(next);
                    setNotice("已从工作空间隐藏");
                  } else {
                    deleteProject(pendingDelete.id);
                    setNotice("已删除项目");
                  }
                  setPendingDelete(null);
                }}
                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed bottom-6 right-6 z-[60] rounded-xl border border-card-border bg-card px-4 py-3 text-sm text-ink-strong shadow-2xl">
          {notice}
        </div>
      )}
    </WorldBuilderLayout>
  );
}

function ProjectCardMenu({
  open,
  onToggle,
  onRename,
  onCopy,
  onDelete,
}: {
  open: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onRename: () => void;
  onCopy: (() => void) | null;
  onDelete: () => void;
}) {
  return (
    <div className="absolute right-2 top-2 z-40" data-project-card-menu>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "grid size-8 place-items-center rounded-lg bg-black/55 text-white/85 backdrop-blur-sm transition hover:bg-black/70",
          open && "bg-black/70",
        )}
        aria-label="项目选项"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[132px] overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c] py-1 shadow-2xl">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-white/90 transition hover:bg-white/8"
          >
            <Pencil size={14} className="text-white/55" />
            重命名
          </button>
          {onCopy && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-white/90 transition hover:bg-white/8"
            >
              <Copy size={14} className="text-white/55" />
              复制
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#F87171] transition hover:bg-red-500/10"
          >
            <Trash2 size={14} />
            删除
          </button>
        </div>
      )}
    </div>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-1.5">
      <p className="px-2 py-1 text-[11px] text-ink-muted">{title}</p>
      {children}
    </div>
  );
}

function MenuCheck({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-white/5"
    >
      <span className="grid size-4 place-items-center">
        {active ? <Check size={13} className="text-ink-strong" /> : null}
      </span>
      {label}
    </button>
  );
}
