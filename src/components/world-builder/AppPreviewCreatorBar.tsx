"use client";

import Link from "next/link";
import { ArrowUpRight, Share2, Star, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  creator: string;
  description: string;
  processHref: string;
  className?: string;
};

export function AppPreviewCreatorBar({
  title,
  creator,
  description,
  processHref,
  className,
}: Props) {
  const initial = creator.trim().charAt(0).toUpperCase() || "D";

  return (
    <footer
      className={cn(
        "border-t border-card-border bg-card/80 px-6 py-6 backdrop-blur-md md:px-8 md:py-7",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-strong">{title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <StatPill icon={ThumbsUp} value="102" />
              <StatPill icon={Star} value="78" />
              <StatPill icon={Share2} value="17" />
              <Link
                href={processHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                查看创作过程
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="text-sm font-medium text-ink-strong">{creator}</span>
            <button
              type="button"
              className="rounded-full border border-card-border bg-white/5 px-3 py-1 text-xs text-ink-muted transition hover:border-accent/35 hover:text-ink-strong"
            >
              + 关注
            </button>
          </div>

          <div className="mt-4 max-w-3xl space-y-2 text-sm leading-7 text-ink-muted">
            <p>{description || "暂无项目简介。"}</p>
            <button type="button" className="text-ink-strong underline-offset-2 hover:underline">
              浏览全部
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function StatPill({ icon: Icon, value }: { icon: typeof ThumbsUp; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-white/5 px-3 py-1.5 text-xs text-ink-muted">
      <Icon size={14} />
      {value}
    </span>
  );
}
