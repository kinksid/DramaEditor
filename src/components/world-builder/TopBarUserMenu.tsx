"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Gift,
  Globe,
  Infinity as InfinityIcon,
  LogOut,
  Plus,
  Settings,
  UserRound,
} from "lucide-react";
import {
  clearSession,
  profileIdFromSession,
  readSession,
  type LocalSession,
} from "@/lib/authSession";
import { openAccountModal } from "@/lib/accountModal";
import { LoginModal } from "@/components/world-builder/LoginModal";
import { EarnPointsModal } from "@/components/world-builder/EarnPointsModal";
import { CreateTeamModal } from "@/components/world-builder/CreateTeamModal";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";

export function TopBarUserMenu() {
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const zh = language === "zh";
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [earnOpen, setEarnOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [session, setSession] = useState<LocalSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("dramaeditor-session", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("dramaeditor-session", sync);
    };
  }, []);

  const displayName = useMemo(() => {
    if (session?.displayName) return session.displayName;
    if (session?.email) return session.email.split("@")[0];
    if (session?.referralCode) return session.referralCode.slice(0, 12);
    return "New Tapper";
  }, [session]);

  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || "N";
  const profileId = profileIdFromSession(session);
  const points = session?.points ?? 0;

  const signOut = () => {
    clearSession();
    setSession(null);
    setOpen(false);
  };

  const closeAll = () => {
    setOpen(false);
    setLangOpen(false);
    setHelpOpen(false);
  };

  if (!session) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="btn-accent inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold shadow-soft transition"
        >
          {zh ? "免费体验" : "Get Started"}
        </button>
        <LoginModal
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSuccess={() => setSession(readSession())}
        />
      </>
    );
  }

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setLangOpen(false);
          setHelpOpen(false);
        }}
        className={cn(
          "flex max-w-[min(220px,calc(100vw-12rem))] items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-2 transition-colors",
          "border-black/[0.07] bg-black/[0.04] hover:bg-black/[0.06]",
          "dark:border-white/[0.08] dark:bg-white/5 dark:hover:bg-white/[0.08]",
          open && "bg-black/[0.06] dark:bg-white/[0.08]",
        )}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white">
          {avatarLetter}
        </span>
        <span className="hidden max-w-[88px] truncate text-sm font-[400] text-ink-strong sm:inline">
          {displayName}
        </span>
        <ChevronDown size={14} className="shrink-0 text-ink-muted opacity-70" />
      </button>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-white">
        {avatarLetter}
      </span>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeAll} />
          <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] overflow-visible rounded-2xl border border-card-border bg-card p-2 text-ink shadow-soft backdrop-blur-xl">
            <div className="flex items-center gap-2.5 px-2 py-2">
              <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-white">
                {avatarLetter}
              </span>
              <p className="truncate text-sm font-semibold text-ink-strong">{displayName}</p>
            </div>

            {/* FREE 额度卡 */}
            <div className="mt-1 rounded-xl bg-accent-soft/60 px-3 py-2.5 dark:bg-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-strong">◎ {points}</span>
                <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  FREE
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-accent-deep">
                <span className="inline-flex items-center gap-1">
                  {zh ? "无额度限制" : "No Limit"}
                  <CircleHelp size={12} className="opacity-70" />
                </span>
                <InfinityIcon size={14} />
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent" />
              <button
                type="button"
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-accent-deep hover:opacity-80"
                onClick={() => {
                  closeAll();
                  setTeamOpen(true);
                }}
              >
                <Plus size={12} />
                {zh ? "创建团队" : "Create Team"}
              </button>
              {(session.teams?.length ?? 0) > 0 && (
                <p className="mt-1.5 text-[11px] text-ink-muted">
                  {zh ? "已加入的团队" : "Joined teams"}:{" "}
                  {session.teams!.map((t) => t.name).join(" · ")}
                </p>
              )}
            </div>

            <div className="my-2 h-px bg-card-border" />

            <MenuRow
              icon={UserRound}
              label={zh ? "个人主页" : "My Portfolio"}
              href={`/world-builder/profile/${profileId}`}
              onClick={closeAll}
            />

            {/* 语言子菜单 */}
            <div className="relative">
              <button
                type="button"
                className={menuRowClass}
                onMouseEnter={() => {
                  setLangOpen(true);
                  setHelpOpen(false);
                }}
                onClick={() => setLangOpen((v) => !v)}
              >
                <Globe size={16} />
                <span className="flex-1 text-left">{zh ? "简体中文" : "English"}</span>
                <ChevronRight size={14} className="opacity-50" />
              </button>
              {langOpen && (
                <div
                  className="absolute right-full top-0 z-10 mr-1.5 w-40 rounded-xl border border-card-border bg-card p-1.5 shadow-soft"
                  onMouseLeave={() => setLangOpen(false)}
                >
                  {(
                    [
                      { id: "en" as const, label: "English" },
                      { id: "zh" as const, label: "简体中文" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(menuRowClass, language === item.id && "bg-accent-soft text-ink-strong")}
                      onClick={() => {
                        setLanguage(item.id);
                        setLangOpen(false);
                      }}
                    >
                      <span className="flex-1 text-left">{item.label}</span>
                      {language === item.id && <Check size={14} className="text-accent" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className={menuRowClass}
              onClick={() => {
                closeAll();
                setEarnOpen(true);
              }}
            >
              <Gift size={16} />
              <span className="flex-1 text-left">{zh ? "赚取积分" : "Earn points"}</span>
            </button>

            <button
              type="button"
              className={menuRowClass}
              onClick={() => {
                closeAll();
                openAccountModal("recharge");
              }}
            >
              <Settings size={16} />
              <span className="flex-1 text-left">{zh ? "账户管理" : "My Account"}</span>
            </button>

            <div className="my-2 h-px bg-card-border" />

            <MenuRow
              icon={Briefcase}
              label={zh ? "合作中心" : "Partnership Center"}
              href="/world-builder/partnership"
              onClick={closeAll}
            />

            {/* 帮助中心 */}
            <div className="relative">
              <button
                type="button"
                className={menuRowClass}
                onMouseEnter={() => {
                  setHelpOpen(true);
                  setLangOpen(false);
                }}
                onClick={() => setHelpOpen((v) => !v)}
              >
                <CircleHelp size={16} />
                <span className="flex-1 text-left">{zh ? "帮助中心" : "Help Center"}</span>
                <ChevronRight size={14} className="opacity-50" />
              </button>
              {helpOpen && (
                <div
                  className="absolute right-full top-0 z-10 mr-1.5 w-44 rounded-xl border border-card-border bg-card p-1.5 shadow-soft"
                  onMouseLeave={() => setHelpOpen(false)}
                >
                  {(
                    [
                      { label: zh ? "联系我们" : "Contact Us", section: "contact" },
                      { label: zh ? "使用教程" : "User Guide", section: "guide" },
                      { label: zh ? "快捷键" : "Keyboard Shortcuts", section: "shortcuts" },
                      { label: zh ? "反馈问题" : "Report an Issue", section: "feedback" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.section}
                      type="button"
                      className={menuRowClass}
                      onClick={() => {
                        closeAll();
                        router.push(`/world-builder/help?section=${item.section}`);
                      }}
                    >
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={signOut} className={cn(menuRowClass, "text-[#F87171]")}>
              <LogOut size={16} />
              <span className="flex-1 text-left">{zh ? "登出账号" : "Sign Out"}</span>
            </button>
          </div>
        </>
      )}

      <EarnPointsModal
        open={earnOpen}
        onClose={() => setEarnOpen(false)}
        onChanged={() => setSession(readSession())}
      />
      <CreateTeamModal
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
        onCreated={() => setSession(readSession())}
      />
    </div>
  );
}

const menuRowClass =
  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-muted transition hover:bg-accent-soft/50 hover:text-ink-strong";

function MenuRow({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: typeof Settings;
  label: string;
  href: string;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className={menuRowClass}>
      <Icon size={16} />
      <span className="flex-1 text-left">{label}</span>
    </Link>
  );
}
