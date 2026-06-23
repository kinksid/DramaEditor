"use client";

import Link from "next/link";
import { Boxes, Film, Gift, Home, Map, Settings, Smartphone, Sparkles, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { label: "首页", href: "/world-builder/home", icon: Home, enabled: true },
  { label: "世界", href: "/world-builder/worlds", icon: Sparkles, enabled: true },
  { label: "故事图", href: "/world-builder/story-graph", icon: Map, enabled: true },
  { label: "App 预览", href: "/world-builder/app-preview", icon: Smartphone, enabled: true },
  { label: "素材", href: "/world-builder/assets", icon: Film, enabled: true },
  { label: "SD 2.0", href: "/world-builder/tiers", icon: Gift, enabled: true },
  { label: "设置", href: "/world-builder/settings", icon: Settings, enabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[78px] shrink-0 flex-col items-center border-r border-slate-200 bg-white px-3 py-5">
      <div className="mb-8 grid size-11 place-items-center rounded-2xl bg-accent text-white shadow-soft">
        <Boxes size={22} />
      </div>
      <nav className="flex w-full flex-1 flex-col gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.enabled &&
            (pathname === item.href ||
              (item.href.includes("story-graph") && pathname.includes("story-graph")) ||
              (item.href.includes("app-preview") && pathname.includes("app-preview")) ||
              (item.href.includes("assets") && pathname.includes("assets")) ||
              (item.href.includes("tiers") && pathname.includes("tiers")) ||
              (item.href.includes("settings") && pathname.includes("settings")) ||
              (item.href.includes("worlds") && pathname.includes("worlds")));
          const content = (
            <span
              title={item.label}
              className={cn(
                "grid size-12 place-items-center rounded-2xl text-slate-400 transition",
                active && "bg-orange-50 text-accent",
                item.enabled && !active && "hover:bg-slate-100 hover:text-slate-700",
                !item.enabled && "cursor-not-allowed opacity-50",
              )}
            >
              <Icon size={21} />
            </span>
          );
          return item.enabled ? (
            <Link key={item.label} href={item.href} aria-label={item.label}>
              {content}
            </Link>
          ) : (
            <div key={item.label}>{content}</div>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <a
          href="https://discord.gg/fsqDMxZsQ"
          target="_blank"
          className="grid size-11 place-items-center rounded-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Discord"
        >
          <UsersRound size={19} />
        </a>
      </div>
    </aside>
  );
}
