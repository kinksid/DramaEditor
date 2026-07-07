"use client";

import { useState } from "react";
import Link from "next/link";
import { Film, Gift, Globe, Home, Map, Moon, Settings, Smartphone, Sparkles, Sun, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settingsStore";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const items = [
    { label: t("nav.home"), href: "/world-builder/home", icon: Home },
    { label: t("nav.worlds"), href: "/world-builder/worlds", icon: Sparkles },
    { label: "故事线", href: "/world-builder/story-graph", icon: Map },
    { label: t("nav.assets"), href: "/world-builder/assets", icon: Film },
    { label: t("nav.appPreview"), href: "/world-builder/app-preview", icon: Smartphone },
  ];

  const bottomItems = [
    { label: t("nav.sd20"), href: "/world-builder/tiers", icon: Gift },
    { label: t("nav.settings"), href: "/world-builder/settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (pathname === href) return true;
    const slug = href.split("/").pop() ?? "";
    return pathname.includes(slug);
  };

  const toggleLanguage = () => {
    setLanguage(language === "zh" ? "en" : "zh");
  };

  return (
    <aside className="flex h-screen w-[78px] shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar px-3 py-5">
      <Link href="/world-builder/home" className="mb-8 grid size-11 place-items-center rounded-2xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="DramaEditor" className="h-full w-full object-contain" />
      </Link>
      <nav className="flex w-full flex-1 flex-col gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "grid size-12 place-items-center rounded-2xl text-slate-400 transition",
                active && "bg-accent-soft text-accent",
                !active && "hover:bg-pink-50 hover:text-accent",
              )}
            >
              <Icon size={21} />
            </Link>
          );
        })}
      </nav>

      {/* Bottom area: SD 2.0, Settings, Language, User */}
      <div className="mt-auto flex w-full flex-col items-center gap-2 border-t border-pink-100 pt-4">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "grid size-11 place-items-center rounded-2xl text-slate-400 transition",
                active && "bg-accent-soft text-accent",
                !active && "hover:bg-pink-50 hover:text-accent",
              )}
            >
              <Icon size={19} />
            </Link>
          );
        })}

        <button
          onClick={toggleTheme}
          title={theme === "light" ? "切换暗黑模式" : "Switch to Light"}
          className="grid size-11 place-items-center rounded-2xl text-slate-400 hover:bg-pink-50 hover:text-accent transition"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button
          onClick={toggleLanguage}
          title={language === "zh" ? "English" : "中文"}
          className="grid size-11 place-items-center rounded-2xl text-slate-400 hover:bg-pink-50 hover:text-accent transition"
        >
          <Globe size={18} />
          <span className="text-[9px] font-bold mt-0.5">{language === "zh" ? "EN" : "中"}</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="grid size-11 place-items-center rounded-2xl hover:bg-pink-50 transition"
            title="User"
          >
            <div className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent">
              <UserRound size={16} />
            </div>
          </button>
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute bottom-full left-0 z-50 mb-2 w-44 rounded-2xl border border-pink-100 bg-white p-2 shadow-soft">
                <div className="rounded-xl bg-pink-50 px-3 py-2 text-xs text-accent font-medium">
                  Creator
                </div>
                <Link
                  href="/world-builder/settings"
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-600 hover:bg-pink-50"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings size={14} />
                  {t("nav.settings")}
                </Link>
                <a
                  href="https://discord.gg/fsqDMxZsQ"
                  target="_blank"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-600 hover:bg-pink-50"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Globe size={14} />
                  Discord
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
