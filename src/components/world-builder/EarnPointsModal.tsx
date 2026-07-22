"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Link2, X } from "lucide-react";
import { addPoints, readSession } from "@/lib/authSession";
import { MODAL_OVERLAY_80, MODAL_PANEL } from "@/lib/modalTheme";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded px-1 py-0.5 bg-accent/25 text-accent">{children}</span>
  );
}

export function EarnPointsModal({ open, onClose, onChanged }: Props) {
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const zh = language === "zh";
  const [copied, setCopied] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const inviteCode = useMemo(() => {
    if (!open) return "LOCAL-DEMO";
    return readSession()?.referralCode || "LOCAL-DEMO";
  }, [open]);

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/login?ref=${encodeURIComponent(inviteCode)}`;
  }, [inviteCode]);

  if (!open) return null;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      // ignore
    }
    setCopied(true);
    addPoints(5);
    onChanged?.();
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={MODAL_OVERLAY_80}>
      <div className={cn(MODAL_PANEL, "relative max-h-[min(92vh,820px)] w-full max-w-[720px] overflow-y-auto rounded-2xl p-6 text-ink sm:p-7")}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-ink-muted hover:bg-accent-soft/50 hover:text-ink-strong"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 className="pr-10 text-xl font-semibold tracking-tight text-ink-strong sm:text-2xl">
          {zh ? "赚取积分" : "Earn points"}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          {zh ? "一起来赚取积分吧！🎉" : "Let's earn points together! 🎉"}
        </p>

        {/* Top task cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="relative flex min-h-[168px] flex-col overflow-hidden rounded-2xl border border-accent/25 bg-[linear-gradient(145deg,var(--tw-accent-soft)_0%,var(--tw-card)_60%,var(--tw-stage)_100%)] p-4">
            <p className="text-sm font-semibold text-white">
              {zh ? "在 DramaTV 上发布" : "Publish on DramaTV"}
            </p>
            <p className="mt-2 flex-1 text-xs leading-5 text-ink-muted">
              {zh
                ? "把你的作品发布到 DramaTV 后将会获得大量奖励支持，若作品 70% 以上由 DramaEditor 完成，最高可获得 2w 积分的奖励。"
                : "Publish to DramaTV for rewards. If over 70% is made with DramaEditor, earn up to 20k points."}
            </p>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/world-builder/inspire");
                }}
                className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-deep"
              >
                {zh ? "发布" : "Publish"}
              </button>
            </div>
          </div>

          <div className="relative flex min-h-[168px] flex-col overflow-hidden rounded-2xl border border-accent/30 bg-[linear-gradient(145deg,var(--tw-accent-soft)_0%,var(--tw-card)_60%,var(--tw-stage)_100%)] p-4">
            <div className="mb-2 grid size-8 place-items-center rounded-lg bg-ink-strong">
              <DiscordMark />
            </div>
            <p className="text-sm font-semibold text-white">
              {zh ? "加入我们的 Discord" : "Join our Discord"}
            </p>
            <p className="mt-2 flex-1 text-xs leading-5 text-ink-muted">
              {zh
                ? "加入我们的 Discord 服务器，填写验证表单后，可在 7 天内获得 100 积分。"
                : "Join Discord, complete verification, and receive 100 points within 7 days."}
            </p>
            <div className="mt-3 flex justify-end">
              <a
                href="https://discord.com/"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-deep"
              >
                {zh ? "加入" : "Join"}
              </a>
            </div>
          </div>
        </div>

        {/* Invite friends */}
        <div className="mt-4 rounded-2xl border border-card-border bg-panel/80 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">{zh ? "邀请好友" : "Invite Friends"}</h3>
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="text-xs font-medium text-accent-deep hover:text-accent"
            >
              {zh ? "查看邀请明细" : "View invite details"}
            </button>
          </div>

          {detailsOpen && (
            <div className="mt-3 rounded-xl border border-card-border bg-stage px-3 py-2 text-xs text-ink-muted">
              {zh
                ? "本地演示：复制链接会模拟发放 5 积分。邀请明细仅存本机。"
                : "Local demo: copying the link awards 5 points. Invite history stays on this device."}
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <Bell size={12} />
              {zh ? "规则" : "Rules"}
            </div>
            <ul className="space-y-2 text-xs leading-5 text-ink-muted">
              <li>
                {zh ? (
                  <>
                    复制下方链接邀请好友注册：你和好友都会获得 <Highlight>5 积分</Highlight>。
                  </>
                ) : (
                  <>
                    Copy the link below to invite friends: you and your friend both get{" "}
                    <Highlight>5 points</Highlight>.
                  </>
                )}
              </li>
              <li>
                {zh ? (
                  <>
                    好友在 <Highlight>3 天内</Highlight> 订阅任意套餐：你和好友都会获得{" "}
                    <Highlight>100 积分</Highlight>。
                  </>
                ) : (
                  <>
                    If a friend subscribes within <Highlight>3 days</Highlight>, you both get{" "}
                    <Highlight>100 points</Highlight>.
                  </>
                )}
              </li>
              <li>
                {zh ? (
                  <>
                    最多可邀请 <Highlight>20 名</Highlight> 好友，奖励将在 <Highlight>1 天内</Highlight>{" "}
                    到账并永久有效。
                  </>
                ) : (
                  <>
                    Invite up to <Highlight>20 friends</Highlight>. Rewards arrive within{" "}
                    <Highlight>1 day</Highlight> and stay permanent.
                  </>
                )}
              </li>
              <li className="text-ink-muted">
                {zh
                  ? "小提醒：奖励仅在好友成功注册，完成订阅（未退款）时生效。请勿自邀或使用其他不正当方式参与哦~"
                  : "Reminder: Rewards apply only after successful registration and subscription (no refunds). No self-invites."}
              </li>
            </ul>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div
              className={cn(
                "min-w-0 flex-1 truncate rounded-xl border border-card-border bg-stage px-3 py-2.5 text-xs text-ink-muted",
              )}
              title={inviteLink}
            >
              {inviteLink || "…"}
            </div>
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white hover:bg-accent-deep"
            >
              <Link2 size={14} />
              {copied ? (zh ? "已复制" : "Copied") : zh ? "复制链接" : "Copy link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscordMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden>
      <path d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.07.07 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.3 18.3 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.08.08 0 0 0-.079-.037A19.7 19.7 0 0 0 3.677 4.37a.09.09 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.08.08 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.08.08 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.08.08 0 0 1-.008-.128c.126-.095.252-.192.372-.291a.07.07 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.07.07 0 0 1 .079.009c.12.098.245.198.373.292a.08.08 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.08.08 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.08.08 0 0 0 .084.028 19.8 19.8 0 0 0 6.002-3.03.08.08 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.028ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}
