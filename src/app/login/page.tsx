"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!referralCode.trim()) return;
    router.push("/world-builder/worlds");
  };

  return (
    <main
      className="min-h-screen bg-[#0c0a0f] text-[#f7f2f4]"
      style={{ fontFamily: '"Public Sans", ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
        <section className="relative hidden overflow-hidden border-r border-[#2a2228] lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_22%,rgba(212,120,147,0.28),transparent_30%),radial-gradient(circle_at_76%_74%,rgba(110,63,84,0.24),transparent_32%)]" />
          <div className="absolute inset-10 rounded-[2.5rem] border border-white/[0.06] bg-[linear-gradient(145deg,rgba(255,255,255,0.06),transparent_45%)]" />
          <div className="relative flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#d47893]">
            <span className="grid size-9 place-items-center rounded-full border border-[#49313b] bg-[#2a1a22]">
              <Sparkles size={16} />
            </span>
            Dreem Creator Studio
          </div>

          <div className="relative max-w-2xl">
            <p className="mb-5 text-sm uppercase tracking-[0.2em] text-[#9a8d93]">A world for every story.</p>
            <h1
              className="text-6xl leading-[0.98] tracking-[-0.035em] xl:text-7xl"
              style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
            >
              把一个念头，
              <br />
              变成可进入的世界。
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[#9a8d93]">
              构建世界、角色与互动故事，并在同一个创作空间里持续完善它们。
            </p>
          </div>

          <p className="relative text-xs tracking-[0.16em] text-[#6f6268]">WORLD · STORY · CHARACTER</p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-14">
          <div className="w-full max-w-md">
            <div className="mb-12 flex items-center gap-3 lg:hidden">
              <span className="grid size-9 place-items-center rounded-full border border-[#49313b] bg-[#2a1a22] text-[#d47893]">
                <Sparkles size={16} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d47893]">Dreem Creator Studio</span>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d47893]">Creator access</p>
            <h2
              className="mt-4 text-4xl tracking-[-0.02em] sm:text-5xl"
              style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
            >
              开始创作
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#9a8d93]">
              输入你的 Creator Studio 推荐码，进入本地创作工作台。
            </p>

            <form onSubmit={handleSubmit} className="mt-10">
              <label htmlFor="referral-code" className="text-sm font-medium text-[#d8cdd1]">
                推荐码
              </label>
              <input
                id="referral-code"
                name="referralCode"
                value={referralCode}
                onChange={(event) => setReferralCode(event.target.value)}
                placeholder="输入推荐码"
                autoComplete="off"
                required
                className="mt-3 h-[52px] w-full rounded-xl border border-[#2a2228] bg-[#161218] px-4 text-sm text-[#f7f2f4] outline-none transition placeholder:text-[#665a5f] focus:border-[#d47893] focus:ring-2 focus:ring-[#d47893]/20"
              />
              <button
                type="submit"
                className="mt-4 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#d47893] px-5 text-sm font-semibold text-[#160f12] transition hover:bg-[#df8da5] focus-visible:outline-[#f7f2f4]"
              >
                进入 Creator Studio
                <ArrowRight size={17} />
              </button>
            </form>

            <p className="mt-6 text-xs leading-5 text-[#6f6268]">
              推荐码仅用于进入当前本地创作壳，不会写入仓库。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
