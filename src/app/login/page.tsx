"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, KeyRound, Sparkles } from "lucide-react";

const SESSION_KEY = "dreem-studio-session";

export default function LoginPage() {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const code = referralCode.trim();
    if (code.length < 4) {
      setError("请输入至少 4 位推荐码（本地轻量校验）。");
      return;
    }
    setSubmitting(true);
    setError(null);
    const session = {
      referralCode: code,
      email: email.trim() || undefined,
      signedInAt: new Date().toISOString(),
      mode: "local-shell",
    };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.setTimeout(() => {
      router.push("/world-builder/home");
    }, 350);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0c0a0f] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(155deg,#0c0a0f_0%,#1a1218_48%,#3d1f2c_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(190,90,120,0.18),transparent_50%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-200/70">
          Dreem Creator Studio
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">进入创作台</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          轻量登录壳：使用推荐码进入本地 Creator Home。不对接真实 OAuth；会话仅存于本机。
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4 rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur-md">
          <label className="block">
            <span className="text-xs font-medium text-white/60">推荐码</span>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-3">
              <KeyRound size={16} className="text-rose-200/70" />
              <input
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="例如 DREEM-XXXX"
                className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/30"
                autoComplete="off"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-white/60">邮箱（可选）</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.example"
              className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/30"
            />
          </label>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-60"
          >
            <Sparkles size={16} />
            {submitting ? "进入中…" : "进入 Studio"}
            <ArrowRight size={16} />
          </button>
        </form>

        <Link href="/world-builder/home" className="mt-6 text-center text-sm text-white/40 hover:text-rose-200">
          跳过登录，直接进入 Creator Home
        </Link>
      </div>
    </main>
  );
}
