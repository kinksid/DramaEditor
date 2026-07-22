"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { useSettingsStore } from "@/stores/settingsStore";

export default function PartnershipPage() {
  const language = useSettingsStore((s) => s.language);
  const zh = language === "zh";

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center gap-2">
          <Briefcase size={20} className="text-ink-muted" />
          <h1 className="text-2xl font-semibold tracking-tight text-ink-strong">
            {zh ? "合作中心" : "Partnership Center"}
          </h1>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          {zh ? "活动申请与合作入口（本地壳层）。" : "Events and partnership applications (local shell)."}
        </p>

        <div className="mt-8 rounded-2xl border border-dashed border-card-border bg-card px-6 py-10 text-center">
          <p className="text-sm text-ink-muted">
            {zh ? "暂无申请记录" : "No applications yet"}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
            >
              {zh ? "开始申请" : "Start Application"}
            </button>
            <Link
              href="/world-builder/tiers"
              className="rounded-full border border-card-border px-4 py-2 text-sm text-ink-muted hover:text-ink-strong"
            >
              {zh ? "查看价格方案" : "View pricing"}
            </Link>
          </div>
        </div>
      </div>
    </WorldBuilderLayout>
  );
}
