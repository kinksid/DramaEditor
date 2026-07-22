"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CircleHelp,
  Coins,
  Copy,
  FileText,
  Gift,
  Info,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Package,
  Plug2,
  RefreshCw,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  addPoints,
  clearSession,
  readSession,
  updateSession,
  type LocalSession,
} from "@/lib/authSession";
import { ACCOUNT_MODAL_EVENT } from "@/lib/accountModal";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import { MODAL_OVERLAY_90, MODAL_PANEL } from "@/lib/modalTheme";
import { ApiCustomSettingsPanel } from "@/components/world-builder/ApiCustomSettingsPanel";

export type AccountTab =
  | "plans"
  | "gifts"
  | "recharge"
  | "team"
  | "rewards"
  | "bills"
  | "usage"
  | "personal"
  | "teamSettings"
  | "helpGuide"
  | "apiSettings"
  | "helpAgent";

export const VALID_ACCOUNT_TABS: AccountTab[] = [
  "plans",
  "gifts",
  "recharge",
  "team",
  "rewards",
  "bills",
  "usage",
  "personal",
  "teamSettings",
  "helpGuide",
  "apiSettings",
  "helpAgent",
];

type NavItem = {
  id: AccountTab;
  label: string;
  icon: typeof Settings;
  info?: boolean;
};

type AccountManagementProps = {
  open: boolean;
  onClose: () => void;
  initialTab?: AccountTab;
};

/** TapNow-style account management modal (not a full page). */
export function AccountManagement({ open, onClose, initialTab = "recharge" }: AccountManagementProps) {
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const zh = language === "zh";

  const [tab, setTab] = useState<AccountTab>(initialTab);
  const [session, setSession] = useState<LocalSession | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab(VALID_ACCOUNT_TABS.includes(initialTab) ? initialTab : "recharge");
    setSession(readSession());
  }, [open, initialTab]);

  useEffect(() => {
    const sync = () => setSession(readSession());
    window.addEventListener("dramaeditor-session", sync);
    return () => window.removeEventListener("dramaeditor-session", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectTab = (id: AccountTab) => setTab(id);

  const signOut = () => {
    clearSession();
    onClose();
    router.push("/world-builder/home");
  };

  if (!open) return null;

  const displayName = session?.displayName || "New Tapper";
  const points = session?.points ?? 0;
  const letter = displayName.trim().charAt(0).toUpperCase() || "N";
  const teamId = session?.teamId || "C131429012026Hbzcwn";
  const teamName = zh ? `${displayName}的团队` : `${displayName}'s Team`;
  const email = session?.email;

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: zh ? "订阅和充值" : "Subscription",
      items: [
        { id: "plans", label: zh ? "订阅套餐" : "Plans", icon: LayoutGrid },
        { id: "gifts", label: zh ? "礼包超市" : "Gift Market", icon: ShoppingBag, info: true },
        { id: "recharge", label: zh ? "充值积分" : "Top up", icon: Coins },
      ],
    },
    {
      title: zh ? "权益和账单" : "Benefits & Billing",
      items: [
        { id: "team", label: zh ? "团队权益" : "Team Benefits", icon: Users },
        { id: "rewards", label: zh ? "奖励中心" : "Rewards", icon: Gift },
        { id: "bills", label: zh ? "账单记录" : "Billing", icon: FileText },
        { id: "usage", label: zh ? "用量看板" : "Usage", icon: BarChart3 },
      ],
    },
    {
      title: zh ? "通用设置" : "General",
      items: [
        { id: "personal", label: zh ? "个人设置" : "Personal", icon: Settings },
        { id: "teamSettings", label: zh ? "团队设置" : "Team Settings", icon: Package, info: true },
      ],
    },
    {
      title: zh ? "帮助与支持" : "Help",
      items: [
        { id: "helpGuide", label: zh ? "使用教程" : "Tutorials", icon: CircleHelp },
        { id: "apiSettings", label: zh ? "API自定义设置" : "API Settings", icon: Plug2 },
        { id: "helpAgent", label: zh ? "Agent 教程" : "Agent Guide", icon: BookOpen },
      ],
    },
  ];

  return (
    <div className={MODAL_OVERLAY_90} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={zh ? "账户管理" : "Account"}
        data-theme="dark"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          MODAL_PANEL,
          "dark flex h-[min(860px,92vh)] w-full max-w-[1080px] overflow-hidden rounded-2xl text-[#E8E8E8]",
        )}
      >
        <aside className="flex w-[210px] shrink-0 flex-col border-r border-white/8 bg-[#1a1a1a] sm:w-[230px]">
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {navGroups.map((group) => (
              <div key={group.title} className="mb-4">
                <p className="mb-1.5 px-2 text-[11px] text-white/35">{group.title}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectTab(item.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition",
                          active
                            ? "border border-white/25 bg-white/[0.04] text-white"
                            : "border border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/85",
                        )}
                      >
                        <Icon size={15} className="shrink-0 opacity-80" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.info && <Info size={12} className="opacity-40" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 px-3 py-3">
            <div className="mb-2 flex items-center gap-1.5 px-2 text-xs text-white/35">
              <RefreshCw size={12} />
              v2.11.5
            </div>
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-[#F87171] hover:bg-red-500/10"
            >
              <LogOut size={15} />
              {zh ? "登出账号" : "Sign out"}
            </button>
          </div>
        </aside>

        <div className="relative min-w-0 flex-1 overflow-y-auto bg-[#121212]">
          <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
            {tab === "recharge" && (
              <button
                type="button"
                className="inline-flex items-baseline gap-1 rounded-lg px-2 py-1 text-lg font-semibold text-white transition hover:bg-white/5"
                title={zh ? "当前积分余额" : "Current points balance"}
              >
                <span>{points.toLocaleString()}</span>
                <span className="text-sm font-normal text-white/45">{zh ? "积分" : "Points"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-6 pr-12 sm:px-8">
            {!session ? (
              <div className="grid min-h-[40vh] place-items-center text-sm text-white/45">
                {zh ? "请先登录后再管理账户。" : "Sign in to manage your account."}
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white"
                >
                  {zh ? "关闭" : "Close"}
                </button>
              </div>
            ) : (
              <>
                {tab === "plans" && <PlansPanel zh={zh} onSubscribe={() => selectTab("team")} />}
                {tab === "gifts" && (
                  <EmptyPanel
                    title={zh ? "礼包超市" : "Gift Market"}
                    body={zh ? "礼包上架中，敬请期待（本地占位）。" : "Gift packs coming soon."}
                  />
                )}
                {tab === "recharge" && (
                  <RechargePanel
                    zh={zh}
                    name={displayName}
                    email={email}
                    letter={letter}
                    onRecharged={() => setSession(readSession())}
                  />
                )}
                {tab === "team" && (
                  <TeamBenefitsPanel
                    zh={zh}
                    points={points}
                    teamName={teamName}
                    teamId={teamId}
                    onRecharge={() => selectTab("recharge")}
                    onUpgrade={() => selectTab("plans")}
                  />
                )}
                {tab === "rewards" && (
                  <EmptyPanel
                    title={zh ? "奖励中心" : "Reward Center"}
                    body={zh ? "暂无进行中的奖励活动。" : "No active reward campaigns."}
                  />
                )}
                {tab === "bills" && <BillsPanel zh={zh} />}
                {tab === "usage" && (
                  <UsagePanel
                    zh={zh}
                    name={displayName}
                    letter={letter}
                    teamName={teamName}
                    points={points}
                  />
                )}
                {tab === "personal" && (
                  <PersonalPanel
                    zh={zh}
                    session={session}
                    language={language}
                    setLanguage={setLanguage}
                    onSaved={() => setSession(readSession())}
                  />
                )}
                {tab === "teamSettings" && (
                  <EmptyPanel
                    title={zh ? "团队设置" : "Team Settings"}
                    body={zh ? "团队权限与成员管理（本地占位）。" : "Team members & permissions (placeholder)."}
                  />
                )}
                {tab === "helpGuide" && (
                  <EmptyPanel
                    title={zh ? "使用教程" : "Tutorials"}
                    body={
                      zh
                        ? "从主页创建世界，在工作空间管理项目，在 DramaTV 浏览灵感。"
                        : "Create worlds on Home, manage projects in Workspace, browse DramaTV."
                    }
                    ctaLabel={zh ? "打开帮助中心" : "Open Help Center"}
                    onCta={() => {
                      onClose();
                      router.push("/world-builder/help");
                    }}
                  />
                )}
                {tab === "apiSettings" && <ApiCustomSettingsPanel zh={zh} />}
                {tab === "helpAgent" && (
                  <EmptyPanel
                    title={zh ? "Agent 教程" : "Agent Guide"}
                    body={
                      zh
                        ? "在世界详情与故事图中使用 Agent 辅助拆解与建链。"
                        : "Use Agent assist on world detail and story graph."
                    }
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mount once under layout — listens for openAccountModal events. */
export function AccountModalHost() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AccountTab>("recharge");

  useEffect(() => {
    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean; tab?: AccountTab }>).detail;
      if (!detail) return;
      if (detail.open === false) {
        setOpen(false);
        return;
      }
      if (detail.tab && VALID_ACCOUNT_TABS.includes(detail.tab)) setTab(detail.tab);
      setOpen(true);
    };
    window.addEventListener(ACCOUNT_MODAL_EVENT, onEvent);
    return () => window.removeEventListener(ACCOUNT_MODAL_EVENT, onEvent);
  }, []);

  return <AccountManagement open={open} onClose={() => setOpen(false)} initialTab={tab} />;
}

function EmptyPanel({
  title,
  body,
  ctaLabel,
  onCta,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl pt-10 text-center">
      <h2 className="text-xl font-semibold text-ink-strong">{title}</h2>
      <p className="mt-3 text-sm text-ink-muted">{body}</p>
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function PersonalPanel({
  zh,
  session,
  language,
  setLanguage,
  onSaved,
}: {
  zh: boolean;
  session: LocalSession;
  language: "zh" | "en";
  setLanguage: (l: "zh" | "en") => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(session.displayName || "");
  const [bio, setBio] = useState(session.bio || "I am turning imagination into reality.");
  const [social, setSocial] = useState(session.socialLink || "");
  const [country, setCountry] = useState(session.country || "");
  const [city, setCity] = useState(session.city || "");
  const [profession, setProfession] = useState(session.profession || "");
  const [showJoin, setShowJoin] = useState(session.showJoinDate !== false);
  const [saved, setSaved] = useState(false);
  const letter = (name || "N").charAt(0).toUpperCase();

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    updateSession({
      displayName: name.trim().slice(0, 30),
      bio: bio.slice(0, 200),
      socialLink: social.trim(),
      country,
      city,
      profession: profession.trim(),
      showJoinDate: showJoin,
    });
    onSaved();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <form onSubmit={onSave} className="mx-auto max-w-3xl">
      <h2 className="text-xl font-semibold text-ink-strong">{zh ? "个人简介" : "Profile"}</h2>
      <div className="mt-8 flex flex-col gap-8 sm:flex-row">
        <div className="grid size-28 shrink-0 place-items-center rounded-full bg-accent text-4xl font-semibold text-white">
          {letter}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <Field label={zh ? "用户名" : "Username"} required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 30))}
              className={inputClass}
            />
          </Field>
          <Field label={zh ? "个人简介" : "Bio"}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              rows={3}
              className={cn(inputClass, "rounded-xl")}
            />
          </Field>
          <Field label={zh ? "社交媒体" : "Social"}>
            <div className="relative">
              <input
                value={social}
                onChange={(e) => setSocial(e.target.value)}
                placeholder={zh ? "在此粘贴社交主页链接" : "Paste social profile URL"}
                className={cn(inputClass, "pr-10")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">+</span>
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={zh ? "国家 / 地区" : "Country / Region"}>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
                <option value="">{zh ? "请选择" : "Select"}</option>
                <option value="CN">中国</option>
                <option value="US">United States</option>
                <option value="JP">日本</option>
                <option value="SG">Singapore</option>
              </select>
            </Field>
            <Field label={zh ? "城市" : "City"}>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
                placeholder={zh ? "城市" : "City"}
              />
            </Field>
          </div>
          <Field label={zh ? "身份 / 职业" : "Profession"}>
            <input
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder={zh ? "写点什么，让大家更了解你" : "Tell others about yourself"}
              className={inputClass}
            />
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-card-border bg-card px-3 py-2.5">
            <span className="text-sm text-ink-muted">{zh ? "显示入驻时间" : "Show join date"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={showJoin}
              onClick={() => setShowJoin((v) => !v)}
              className={cn(
                "relative h-6 w-11 rounded-full transition",
                showJoin ? "bg-accent" : "bg-white/15",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white transition",
                  showJoin ? "left-[22px]" : "left-0.5",
                )}
              />
            </button>
          </div>
          <Field label={zh ? "语言" : "Language"}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "zh" | "en")}
              className={inputClass}
            >
              <option value="zh">简体中文</option>
              <option value="en">English</option>
            </select>
          </Field>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
            >
              {saved ? (zh ? "已保存" : "Saved") : zh ? "保存" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function RechargePanel({
  zh,
  name,
  email,
  letter,
  onRecharged,
}: {
  zh: boolean;
  name: string;
  email?: string;
  letter: string;
  onRecharged: () => void;
}) {
  const presets = [1000, 2000, 3000, 5000, 10000];
  const [amount, setAmount] = useState(3000);
  const pay = (amount / 100).toFixed(0);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-[#3B82F6] text-lg font-semibold text-white">
            {letter}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{name}</p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/55">
                {zh ? "免费版" : "Free"}
              </span>
            </div>
            {email && <p className="mt-0.5 text-xs text-white/40">{email}</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#1a1a1a] p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          {zh ? "充值积分（随用随充）" : "Top up points"}
          <Info size={14} className="text-white/35" />
        </h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="text-sm text-white/50">{zh ? "选择充值积分数量" : "Select amount"}</p>
            <p className="mt-3 text-3xl font-semibold text-[#60A5FA]">
              {amount.toLocaleString()} {zh ? "积分" : "points"}
            </p>
            <input
              type="range"
              min={500}
              max={500000}
              step={100}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-4 w-full accent-[#3B82F6]"
            />
            <div className="mt-1 flex justify-between text-[11px] text-white/35">
              <span>{zh ? "500 积分" : "500 points"}</span>
              <span>{zh ? "500,000 积分" : "500,000 points"}</span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.min(500000, Math.max(500, Number(e.target.value) || 500)))}
              className={cn(inputClass, "mt-3")}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs transition",
                    amount === p
                      ? "border-[#3B82F6] bg-[#3B82F6]/25 text-white"
                      : "border-white/10 text-white/55 hover:border-white/25",
                  )}
                >
                  {p.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col rounded-xl border border-white/10 bg-[#101010] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">{zh ? "获得积分" : "Receive"}</span>
              <span className="text-lg font-semibold text-[#60A5FA]">{amount.toLocaleString()}</span>
            </div>
            <p className="mt-2 text-xs text-white/40">
              {zh ? "当前汇率 $1 = 100 积分" : "Rate $1 = 100 points"}
            </p>
            <div className="mt-6 flex items-end justify-between">
              <span className="text-sm text-white/50">{zh ? "需支付金额" : "Amount due"}</span>
              <span className="text-3xl font-semibold text-white">${pay}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                addPoints(amount);
                onRecharged();
              }}
              className="mt-auto w-full rounded-xl bg-[#3B82F6] py-3 text-sm font-semibold text-white hover:bg-[#2563EB]"
            >
              {zh ? "立即充值" : "Top up now"}
            </button>
            <p className="mt-2 text-center text-[11px] text-white/30">
              {zh ? "本地演示：点击后直接增加余额，不产生真实支付。" : "Local demo: adds balance instantly, no real payment."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamBenefitsPanel({
  zh,
  points,
  teamName,
  teamId,
  onRecharge,
  onUpgrade,
}: {
  zh: boolean;
  points: number;
  teamName: string;
  teamId: string;
  onRecharge: () => void;
  onUpgrade: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-card-border bg-card">
        <Row
          title={`${zh ? "积分余额" : "Points balance"}: ${points}`}
          sub={zh ? "当前汇率 $1=100 积分，升级套餐解锁超值充值汇率" : "Rate $1=100 points · upgrade for better rates"}
          action={
            <button type="button" onClick={onRecharge} className={ghostBtn}>
              {zh ? "充值" : "Top up"}
            </button>
          }
        />
        <Row
          title={zh ? "免费版" : "Free plan"}
          sub={zh ? "升级订阅套餐解锁全功能，为专业创作加速" : "Upgrade to unlock full features"}
          action={
            <button type="button" onClick={onUpgrade} className={ghostBtn}>
              {zh ? "升级" : "Upgrade"}
            </button>
          }
        />
        <Row
          title={`${zh ? "你的团队" : "Your team"}: ${teamName}`}
          sub={`${zh ? "团队ID" : "Team ID"}: ${teamId}`}
          action={
            <button
              type="button"
              className={ghostBtn}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(teamId);
                } catch {
                  // ignore
                }
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              }}
            >
              <Copy size={13} />
              {copied ? (zh ? "已复制" : "Copied") : zh ? "复制团队ID" : "Copy Team ID"}
            </button>
          }
        />
      </div>
      <h3 className="mt-8 text-sm font-medium text-ink-strong">{zh ? "配额信息" : "Quota"}</h3>
      <div className="mt-3 grid min-h-[160px] place-items-center rounded-2xl border border-card-border bg-card text-sm text-ink-muted">
        {zh ? "暂无配额信息" : "No quota information"}
      </div>
    </div>
  );
}

function BillsPanel({ zh }: { zh: boolean }) {
  const [sub, setSub] = useState<"bills" | "tx">("bills");
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-card-border bg-card p-1 text-sm">
          <button
            type="button"
            onClick={() => setSub("bills")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5",
              sub === "bills" ? "bg-panel text-ink-strong" : "text-ink-muted",
            )}
          >
            <FileText size={14} />
            {zh ? "账单" : "Bills"}
          </button>
          <button
            type="button"
            onClick={() => setSub("tx")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5",
              sub === "tx" ? "bg-panel text-ink-strong" : "text-ink-muted",
            )}
          >
            <Wallet size={14} />
            {zh ? "交易记录" : "Transactions"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-card-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-strong">{zh ? "账单详情" : "Billing details"}</h2>
            <button type="button" className="mt-1 text-xs text-accent-deep hover:underline">
              {zh ? "如何开具增值税发票？" : "How to issue a VAT invoice?"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs text-ink-muted">
              <MessageSquare size={13} />
              {zh ? "反馈问题" : "Feedback"}
            </button>
            <button type="button" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white">
              {zh ? "开商业发票" : "Business invoice"}
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-card-border">
          <div className="grid grid-cols-5 gap-2 border-b border-card-border bg-stage px-3 py-2 text-xs text-ink-muted">
            <span>{zh ? "账单ID" : "Bill ID"}</span>
            <span>{zh ? "交易时间" : "Time"}</span>
            <span>{zh ? "消费内容" : "Item"}</span>
            <span>{zh ? "金额" : "Amount"}</span>
            <span>{zh ? "状态" : "Status"}</span>
          </div>
          <div className="grid place-items-center px-4 py-16 text-center">
            <FileText size={40} className="text-ink-strong/20" />
            <p className="mt-3 text-sm text-ink-muted">{zh ? "暂无账单数据" : "No billing data yet"}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {zh ? "您还没有任何交易记录" : "You don't have any transaction records yet"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsagePanel({
  zh,
  name,
  letter,
  teamName,
  points,
}: {
  zh: boolean;
  name: string;
  letter: string;
  teamName: string;
  points: number;
}) {
  const [mode, setMode] = useState<"total" | "agent">("total");
  const [grain, setGrain] = useState<"day" | "week" | "sum">("day");
  const cells = useMemo(() => {
    // deterministic pseudo activity from points
    return Array.from({ length: 53 * 7 }, (_, i) => {
      const seed = (i * 17 + points * 3) % 11;
      if (seed < 7) return 0;
      if (seed < 9) return 1;
      if (seed < 10) return 2;
      return 3;
    });
  }, [points]);

  const months = zh
    ? ["8月", "9月", "10月", "11月", "12月", "1月", "2月", "3月", "4月", "5月", "6月", "7月"]
    : ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

  const stats = [
    { value: Math.max(points, 1200).toLocaleString(), label: zh ? "总消耗积分" : "Total points" },
    { value: "316", label: zh ? "单日峰值" : "Daily peak" },
    { value: "23", label: zh ? "周均消耗积分" : "Weekly avg points" },
    { value: "8", label: zh ? "活跃天数" : "Active days" },
    { value: "1", label: zh ? "最长连续活跃天数" : "Longest streak" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col items-center text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-panel text-lg font-semibold text-ink-strong">
          {letter}
        </span>
        <h2 className="mt-3 text-xl font-semibold text-ink-strong">{zh ? "积分用量" : "Points usage"}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {teamName} · {zh ? "最近 365 天" : "Last 365 days"}
        </p>
        <div className="mt-4 inline-flex rounded-full border border-card-border bg-card p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("total")}
            className={cn("rounded-full px-3 py-1.5", mode === "total" ? "bg-panel text-ink-strong" : "text-ink-muted")}
          >
            {zh ? "总用量" : "Total"}
          </button>
          <button
            type="button"
            onClick={() => setMode("agent")}
            className={cn("rounded-full px-3 py-1.5", mode === "agent" ? "bg-panel text-ink-strong" : "text-ink-muted")}
          >
            {zh ? "Agent 用量" : "Agent"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-card-border bg-card p-4 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-xl font-semibold text-ink-strong">{s.value}</p>
            <p className="mt-1 text-[11px] text-ink-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-card-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-ink-strong">{zh ? "积分活动" : "Points activity"}</h3>
          <div className="inline-flex rounded-lg border border-card-border p-0.5 text-xs">
            {(
              [
                { id: "day" as const, label: zh ? "每日" : "Daily" },
                { id: "week" as const, label: zh ? "每周" : "Weekly" },
                { id: "sum" as const, label: zh ? "累计" : "Total" },
              ] as const
            ).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGrain(g.id)}
                className={cn(
                  "rounded-md px-2.5 py-1",
                  grain === g.id ? "bg-accent-soft text-ink-strong" : "text-ink-muted",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex justify-between px-1 text-[10px] text-ink-muted">
          {months.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-flow-col grid-rows-7 gap-[3px]">
          {cells.map((level, i) => (
            <span
              key={i}
              className={cn(
                "size-[10px] rounded-[2px] sm:size-[11px]",
                level === 0 && "bg-white/[0.06]",
                level === 1 && "bg-accent/30",
                level === 2 && "bg-accent/55",
                level === 3 && "bg-accent",
              )}
              title={mode === "agent" ? "Agent" : "Total"}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-muted">
          {zh ? `${name} · 本地演示热力图` : `${name} · local demo heatmap`}
        </p>
      </div>
    </div>
  );
}

function PlansPanel({ zh, onSubscribe }: { zh: boolean; onSubscribe: () => void }) {
  const [cycle, setCycle] = useState<"month" | "year" | "enterprise">("year");
  const plans = [
    {
      id: "basic",
      name: "BASIC",
      desc: zh ? "适合初次探索 AI 创作" : "For first explorers",
      price: cycle === "year" ? 8.25 : 15,
      strike: 15,
      yearly: 99,
      credits: "2K",
    },
    {
      id: "pro",
      name: "PRO",
      badge: zh ? "最受欢迎" : "Popular",
      desc: zh ? "适合持续产出的创作者" : "For active creators",
      price: cycle === "year" ? 26.95 : 49,
      strike: 49,
      yearly: 323,
      credits: "3.5K–20K",
      hot: true,
    },
    {
      id: "ultimate",
      name: "ULTIMATE",
      desc: zh ? "适合高频出片团队" : "For high-volume teams",
      price: cycle === "year" ? 70.95 : 129,
      strike: 129,
      yearly: 851,
      credits: "旗舰",
    },
    {
      id: "max",
      name: "MAX",
      badge: zh ? "最佳性价比" : "Best value",
      desc: zh ? "企业定制额度与权限" : "Enterprise custom",
      price: null as number | null,
      strike: null as number | null,
      yearly: null as number | null,
      credits: zh ? "定制" : "Custom",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-semibold text-ink-strong">{zh ? "选择你的套餐" : "Choose your plan"}</h2>
      <p className="mt-2 text-sm text-ink-muted">
        {zh
          ? "不止额度，更是灵感落地的速度。积分永不过期。"
          : "Not just quota — the speed from idea to shipping. Credits never expire."}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(
          [
            { id: "month" as const, label: zh ? "连续包月 40% OFF" : "Monthly 40% OFF" },
            { id: "year" as const, label: zh ? "连续包年 45% OFF" : "Yearly 45% OFF" },
            { id: "enterprise" as const, label: zh ? "企业版" : "Enterprise" },
          ] as const
        ).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCycle(c.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              cycle === c.id ? "bg-accent text-white" : "bg-panel text-ink-muted hover:text-ink",
            )}
          >
            {c.label}
          </button>
        ))}
        <span className="ml-auto rounded-lg border border-card-border px-2.5 py-1 text-xs text-ink-muted">
          {zh ? "展示币种: USD" : "Currency: USD"}
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex flex-col rounded-2xl border bg-card p-4",
              p.hot ? "border-accent/50" : "border-card-border",
            )}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-ink-strong">{p.name}</h3>
              {p.badge && (
                <span className="rounded-md bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent">
                  {p.badge}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-ink-muted">{p.desc}</p>
            <div className="mt-4">
              {p.price == null ? (
                <p className="text-2xl font-semibold text-ink-strong">{zh ? "联系我们" : "Contact"}</p>
              ) : (
                <>
                  <p className="text-3xl font-semibold text-ink-strong">
                    ${p.price}
                    <span className="ml-1 text-sm font-normal text-ink-muted line-through">
                      ${p.strike} /{zh ? "月" : "mo"}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {cycle === "year"
                      ? zh
                        ? `按年支付，年付总价 $${p.yearly}`
                        : `Billed yearly · $${p.yearly}/yr`
                      : zh
                        ? "按月支付"
                        : "Billed monthly"}
                  </p>
                </>
              )}
            </div>
            <div className="mt-4 space-y-1 text-xs text-ink-muted">
              <p>
                {zh ? "每月积分" : "Monthly credits"} · {p.credits}
              </p>
              <p>{zh ? "额外充值" : "Top-up bonus"} · {p.hot ? "+10%" : "—"}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                updateSession({ planId: p.id as LocalSession["planId"] });
                onSubscribe();
              }}
              className="mt-auto w-full rounded-xl bg-ink-strong py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {zh ? "订阅" : "Subscribe"}
            </button>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-ink-muted">
        {zh ? "使用以下方式安全支付（本地演示，不产生真实扣款）" : "Secure payment methods (local demo, no real charge)"}
      </p>
    </div>
  );
}

function Row({
  title,
  sub,
  action,
}: {
  title: string;
  sub: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-5 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-strong">{title}</p>
        <p className="mt-1 text-xs text-ink-muted">{sub}</p>
      </div>
      {action}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-muted">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#151515] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25";

const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#1a1a1a] px-3 py-1.5 text-xs text-white/75 hover:bg-white/5";
