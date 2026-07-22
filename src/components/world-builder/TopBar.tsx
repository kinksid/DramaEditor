"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Bell, Clapperboard, Home, LayoutGrid, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { TopBarUserMenu } from "@/components/world-builder/TopBarUserMenu";

const TOP_BAR_HEIGHT = "h-14";

function TopBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inspireTab = searchParams.get("tab");
  const [showBorder, setShowBorder] = useState(false);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>("main.overflow-y-auto");
    if (!main) return;

    const update = () => setShowBorder(main.scrollTop > 2);
    update();
    main.addEventListener("scroll", update, { passive: true });
    return () => main.removeEventListener("scroll", update);
  }, [pathname, inspireTab]);

  // Align with https://app.tapnow.ai/home center nav
  const items = [
    {
      key: "home",
      label: "主页",
      href: "/world-builder/home",
      icon: Home,
    },
    {
      key: "workspace",
      label: "工作空间",
      href: "/world-builder/worlds",
      icon: LayoutGrid,
    },
    {
      key: "dramatv",
      label: "DramaTV",
      href: "/world-builder/inspire",
      icon: Clapperboard,
    },
    {
      key: "arena",
      label: "竞技场",
      href: "/world-builder/inspire?tab=events",
      icon: Trophy,
    },
  ];

  const isActive = (key: string) => {
    if (key === "home") return pathname.startsWith("/world-builder/home");
    if (key === "workspace") {
      return (
        pathname.startsWith("/world-builder/worlds") ||
        pathname.startsWith("/worlds") ||
        pathname.startsWith("/world-builder/story-graph") ||
        pathname.startsWith("/world-builder/setup")
      );
    }
    if (key === "dramatv") {
      return (
        (pathname.startsWith("/world-builder/inspire") || pathname.includes("/taptv")) &&
        inspireTab !== "events"
      );
    }
    if (key === "arena") {
      return pathname.startsWith("/world-builder/inspire") && inspireTab === "events";
    }
    return false;
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-40 flex-none text-ink font-medium",
        TOP_BAR_HEIGHT,
      )}
    >
      <div
        className={cn(
          "relative box-border flex h-full items-center bg-sidebar/95 px-4 backdrop-blur-md transition-[border-color] duration-200",
          showBorder ? "border-b border-sidebar-border" : "border-b border-transparent",
        )}
      >
        <div className="relative z-[1] flex h-full w-full min-w-0 items-center">
          <div className="flex h-full min-w-0 flex-1 items-center justify-start gap-2">
            <Link
              href="/world-builder/home"
              className="inline-flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-accent-soft/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="DramaEditor" className="size-8 object-contain" />
              <span className="hidden text-sm font-semibold tracking-tight text-ink-strong sm:inline">
                DramaEditor
              </span>
            </Link>
          </div>

          <nav className="inline-flex h-full shrink-0 items-center justify-center gap-1 p-2 md:gap-2">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.key);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "group relative box-border flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full border-0 px-3 py-2 text-sm font-[400] transition-colors md:px-4 md:text-base",
                    active
                      ? "bg-accent-soft text-ink-strong ring-1 ring-accent/30"
                      : "text-ink-muted hover:bg-white/5 hover:text-ink-strong",
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex h-full min-w-0 flex-1 flex-shrink-0 items-center justify-end gap-1 text-base font-[400]">
            <Link
              href="/world-builder/tiers"
              className={cn(
                "flex items-center justify-end gap-1 whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors hover:bg-white/5 hover:text-ink-strong md:px-4",
                pathname.includes("/tiers") && "bg-white/5 text-ink-strong ring-1 ring-accent/25",
              )}
            >
              价格方案
            </Link>
            <button
              type="button"
              title="Notifications"
              className="relative flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-black/5 hover:text-ink-strong dark:hover:bg-white/5"
            >
              <Bell size={18} strokeWidth={2} />
            </button>
            <TopBarUserMenu />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TopBar() {
  return (
    <Suspense fallback={<div className={cn("fixed top-0 left-0 right-0 z-40", TOP_BAR_HEIGHT)} />}>
      <TopBarInner />
    </Suspense>
  );
}

export const TOP_BAR_OFFSET_CLASS = "pt-14";
