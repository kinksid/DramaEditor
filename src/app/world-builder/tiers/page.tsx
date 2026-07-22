"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Sparkles, Zap } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { cn } from "@/lib/utils";

type Billing = "monthly" | "yearly";

type Plan = {
  id: string;
  name: string;
  badge?: string;
  monthly: number | null;
  credits: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

const plans: Plan[] = [
  {
    id: "free",
    name: "免费版",
    monthly: 0,
    credits: "入门额度",
    description: "本地创作壳，适合体验世界构建与故事图。",
    features: ["本地世界 / 角色 / 地点", "故事图编辑", "DramaTV 浏览与 Remix", "App 数据导出", "模拟视频生成"],
    cta: "免费开始",
    href: "/world-builder/home",
  },
  {
    id: "pro",
    name: "Pro",
    badge: "最受欢迎",
    monthly: 49,
    credits: "3.5K–20K 积分档",
    description: "更快把灵感落到成片，积分永不过期（本地展示）。",
    features: [
      "更高生成额度（接 Provider 后生效）",
      "批量视频 / 参考图任务",
      "优先 LLM 任务配置",
      "版本历史（规划中）",
      "云端素材库（规划中）",
    ],
    cta: "升级 Pro",
    href: "/login",
    highlighted: true,
  },
  {
    id: "ultimate",
    name: "Ultimate",
    monthly: 129,
    credits: "旗舰额度",
    description: "面向高频出片与复杂编排的创作者。",
    features: ["更高并发生成", "高级 Agent 规划任务", "团队项目入口", "优先功能体验", "专属支持通道（占位）"],
    cta: "选择 Ultimate",
    href: "/login",
  },
  {
    id: "max",
    name: "Max",
    monthly: null,
    credits: "定制",
    description: "工作室与发行级权限，按需开通。",
    features: ["团队权限与审核流", "私有模型接口", "自定义 App 数据结构", "专属成功经理", "商务合同结算"],
    cta: "联系开通",
    href: "/world-builder/settings",
  },
];

const whyFeatures = [
  { title: "快速高效", body: "从一句话到世界拆解、故事图与预览，缩短「想到」到「做到」的路径。" },
  { title: "强大工具", body: "LLM / 图像 / 视频分供应商配置，画布、DramaTV Remix 与 App 导出一体。" },
  { title: "专业品质", body: "炭黑电影感壳层、竖屏互动叙事与发布检查，面向短剧制作流程。" },
];

const faqs = [
  {
    q: "积分会过期吗？",
    a: "对照 TapNow：积分永不过期。本页为本地展示壳，真实计费需接入支付后生效。",
  },
  {
    q: "可以先免费使用吗？",
    a: "可以。免费版支持本地世界构建、故事图与 DramaTV Remix，无需付费即可开始。",
  },
  {
    q: "Pro 档位如何选择？",
    a: "TapNow Pro 提供 3.5K–20K 滑杆档位。本地以展示为主，接入支付后按额度解锁。",
  },
];

export default function TiersPage() {
  const [billing, setBilling] = useState<Billing>("yearly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const priceLabel = (plan: Plan) => {
    if (plan.monthly === null) return "定制";
    if (plan.monthly === 0) return "¥0";
    const yearly = Math.round(plan.monthly * 10);
    if (billing === "yearly") {
      return `¥${yearly}`;
    }
    return `¥${plan.monthly}`;
  };

  const periodLabel = useMemo(() => {
    return billing === "yearly" ? "/年" : "/月";
  }, [billing]);

  return (
    <WorldBuilderLayout agentMode="none">
      <div className="min-h-full bg-stage text-ink">
        {/* Hero */}
        <section className="px-6 pb-8 pt-10 text-center md:pt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">价格方案</p>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl tracking-tight text-ink-strong md:text-5xl">
            选择最适合您的套餐
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-ink-muted md:text-base">
            灵活的定价套餐满足您的需求。立即开始使用我们强大的 AI 工具进行创作。
          </p>
        </section>

        {/* Plans */}
        <section className="px-4 pb-14 md:px-6">
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="text-2xl font-semibold text-ink-strong">选择你的套餐</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-ink-muted">
              {"不止额度，更是灵感落地的速度。\n积分永不过期。"}
            </p>

            <div className="mt-6 inline-flex items-center rounded-full border border-card-border bg-white/[0.03] p-1">
              {(
                [
                  { id: "monthly" as const, label: "月付" },
                  { id: "yearly" as const, label: "年付", tip: "更省" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBilling(item.id)}
                  className={cn(
                    "relative rounded-full px-4 py-1.5 text-sm transition",
                    billing === item.id ? "bg-white text-[#0F0F0F]" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {item.label}
                  {"tip" in item && item.tip && billing !== item.id && (
                    <span className="ml-1 text-[10px] text-emerald-300/80">{item.tip}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-5 shadow-2xl",
                  plan.highlighted ? "border-white/35 ring-1 ring-white/20" : "border-card-border",
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#0F0F0F]">
                    {plan.badge}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div className="grid size-9 place-items-center rounded-lg bg-white/5 text-ink">
                    {plan.highlighted ? <Zap size={16} /> : <Sparkles size={16} />}
                  </div>
                  <h3 className="text-lg font-semibold text-ink-strong">{plan.name}</h3>
                </div>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-semibold text-ink-strong">{priceLabel(plan)}</span>
                  {plan.monthly !== null && <span className="pb-1 text-sm text-ink-muted">{periodLabel}</span>}
                </div>
                <p className="mt-1 text-xs text-ink-muted">{plan.credits}</p>
                <p className="mt-3 text-sm leading-6 text-ink-muted">{plan.description}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-ink-muted">
                      <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={cn(
                    "mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                    plan.highlighted
                      ? "bg-white text-[#0F0F0F] hover:bg-white/90"
                      : "border border-white/15 bg-white/5 text-ink-strong hover:bg-white/10",
                  )}
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-4 max-w-6xl text-center text-[11px] text-ink-muted">
            本页对照 TapNow Pricing 的中文信息架构；支付未接入前仅为本地展示，不会产生真实扣费。
          </p>
        </section>

        {/* Why */}
        <section className="border-t border-card-border px-6 py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold text-ink-strong">为什么选择 DramaEditor？</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {whyFeatures.map((item) => (
                <div key={item.title} className="rounded-2xl border border-card-border bg-card p-5">
                  <h3 className="text-base font-semibold text-ink-strong">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="px-6 pb-14">
          <div className="mx-auto grid max-w-6xl gap-4 rounded-2xl border border-card-border bg-gradient-to-br from-[#161218] to-[#0f0f12] p-6 md:grid-cols-2 md:p-8">
            <div>
              <h2 className="text-xl font-semibold text-ink-strong">为什么创作者选择 DramaEditor</h2>
              <p className="mt-2 text-sm text-ink-muted">本地 Studio 对照工程 · 短剧互动叙事工作流</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-card-border bg-black/20 p-4">
                <p className="text-2xl font-semibold text-ink-strong">本地优先</p>
                <p className="mt-1 text-xs text-ink-muted">密钥与项目可留在本机</p>
              </div>
              <div className="rounded-xl border border-card-border bg-black/20 p-4">
                <p className="text-2xl font-semibold text-ink-strong">DramaTV</p>
                <p className="mt-1 text-xs text-ink-muted">灵感流 Remix 到本机项目</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-card-border px-6 py-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-semibold text-ink-strong">常见问题</h2>
            <p className="mt-2 text-center text-sm text-ink-muted">获取答案，开始创作</p>
            <div className="mt-8 space-y-2">
              {faqs.map((item, index) => {
                const open = openFaq === index;
                return (
                  <div key={item.q} className="overflow-hidden rounded-xl border border-card-border bg-card">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : index)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-ink-strong"
                    >
                      {item.q}
                      <ChevronDown size={16} className={cn("shrink-0 text-ink-muted transition", open && "rotate-180")} />
                    </button>
                    {open && <p className="border-t border-card-border px-4 py-3 text-sm leading-6 text-ink-muted">{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </WorldBuilderLayout>
  );
}
