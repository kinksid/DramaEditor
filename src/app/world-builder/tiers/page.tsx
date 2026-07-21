"use client";

import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";

const tiers = [
  {
    name: "Creator",
    price: "当前",
    icon: <Sparkles size={22} />,
    features: ["本地世界构建", "故事图编辑", "App 数据导出", "模拟视频生成"],
  },
  {
    name: "Studio",
    price: "升级",
    icon: <Zap size={22} />,
    features: ["批量视频生成", "多人协作", "云端素材库", "版本历史"],
  },
  {
    name: "Production",
    price: "联系开通",
    icon: <Crown size={22} />,
    features: ["团队权限", "发行审核", "自定义应用数据结构", "私有模型接口"],
  },
];

export default function TiersPage() {
  return (
    <WorldBuilderLayout agentMode="none">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft">
          <p className="text-xs font-semibold tracking-[0.16em] text-accent">制作等级</p>
          <h1 className="mt-2 text-4xl font-semibold">创作者权益</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            管理互动短剧编辑器的生成能力、制作额度、团队权限和面向 App 的发布权限。
          </p>
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {tiers.map((tier) => (
            <article key={tier.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">{tier.icon}</div>
              <h2 className="mt-5 text-xl font-semibold">{tier.name}</h2>
              <p className="mt-2 text-sm font-medium text-accent">{tier.price}</p>
              <div className="mt-5 space-y-3">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check size={15} className="text-emerald-500" />
                    {feature}
                  </div>
                ))}
              </div>
              <button className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                {tier.name === "Creator" ? "当前等级" : "查看详情"}
              </button>
            </article>
          ))}
        </div>
      </div>
    </WorldBuilderLayout>
  );
}
