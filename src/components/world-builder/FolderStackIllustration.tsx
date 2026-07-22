"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

function SheetClusterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={cn("size-3.5", className)}>
      <circle cx="5.5" cy="8.5" r="3.1" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="9.75" cy="6.25" r="2.45" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="10.75" cy="10.1" r="1.95" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function FolderSheet({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "absolute overflow-hidden rounded-[10px] bg-[#c8c8c8] shadow-[0_10px_28px_rgba(0,0,0,0.38)]",
        className,
      )}
      style={style}
    >
      <div className="p-2.5">
        <SheetClusterIcon className="text-black/65" />
      </div>
    </div>
  );
}

/** TapNow-style folder stack with frosted front pocket. */
export function FolderStackIllustration({ className }: { className?: string }) {
  const pocketGradientId = useId();

  return (
    <div className={cn("relative aspect-[0.72] w-[58%] max-w-[148px]", className)}>
      <FolderSheet className="left-[2%] top-[10%] h-[78%] w-[74%] -rotate-[7deg]" />
      <FolderSheet className="left-[12%] top-[4%] h-[78%] w-[74%] -rotate-[2deg]" />
      <FolderSheet className="left-[22%] top-0 h-[78%] w-[74%] rotate-[3deg]" />

      <div className="absolute inset-x-[-6%] bottom-0 top-[34%]">
        <svg
          viewBox="0 0 200 118"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id={pocketGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(34,34,34,0.72)" />
              <stop offset="100%" stopColor="rgba(18,18,18,0.96)" />
            </linearGradient>
          </defs>
          <path
            d="M0 42 C34 18, 66 28, 100 22 C134 16, 166 30, 200 24 L200 118 L0 118 Z"
            fill={`url(#${pocketGradientId})`}
          />
        </svg>
        <div className="absolute inset-0 backdrop-blur-[10px]" />
        <div className="absolute inset-x-[8%] top-[18%] h-px bg-white/10" />
      </div>
    </div>
  );
}
