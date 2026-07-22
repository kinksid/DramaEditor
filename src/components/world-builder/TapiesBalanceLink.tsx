"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSessionPoints } from "@/hooks/useSessionPoints";

type Props = {
  className?: string;
  variant?: "canvas" | "modal";
  onClick?: () => void;
};

function TapiesClusterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={cn("size-4 shrink-0", className)}>
      <circle cx="5.5" cy="8.5" r="3.25" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="9.75" cy="6.25" r="2.55" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="10.75" cy="10.1" r="2.05" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

/** Real-time points balance; links to home recharge flow by default. */
export function TapiesBalanceLink({ className, variant = "canvas", onClick }: Props) {
  const points = useSessionPoints();

  const content =
    variant === "canvas" ? (
      <>
        <TapiesClusterIcon />
        <span>{points.toLocaleString()}</span>
      </>
    ) : (
      <>
        <span>{points.toLocaleString()}</span>
        <span className="text-white/45">积分</span>
      </>
    );

  const baseClass = cn(
    "inline-flex items-center gap-1.5 whitespace-nowrap transition",
    variant === "canvas" &&
      "rounded-lg bg-[#2a2a2a] px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-[#333333]",
    variant === "modal" &&
      "rounded-lg px-2 py-1 text-lg font-semibold text-white hover:bg-white/5",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClass} title="查看积分与充值">
        {content}
      </button>
    );
  }

  return (
    <Link
      href="/world-builder/account?tab=recharge"
      className={baseClass}
      title="查看积分与充值"
    >
      {content}
    </Link>
  );
}
