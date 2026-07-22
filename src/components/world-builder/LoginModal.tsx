"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, Phone, X } from "lucide-react";
import { writeSession } from "@/lib/authSession";
import { MODAL_OVERLAY_FROSTED, MODAL_PANEL } from "@/lib/modalTheme";
import { cn } from "@/lib/utils";

type Step = "identity" | "password";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const [step, setStep] = useState<Step>("identity");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const finish = (nextEmail?: string) => {
    setSubmitting(true);
    const resolved =
      (nextEmail || email).trim() ||
      `creator${Math.floor(Math.random() * 9000 + 1000)}@local.dev`;
    writeSession({ email: resolved });
    window.setTimeout(() => {
      setSubmitting(false);
      setStep("identity");
      setPassword("");
      onSuccess();
      onClose();
    }, 200);
  };

  const onIdentityContinue = (event: FormEvent) => {
    event.preventDefault();
    // Any fill (even empty) proceeds — random local shell login
    if (!email.trim()) {
      setEmail(`creator${Math.floor(Math.random() * 9000 + 1000)}@local.dev`);
    }
    setStep("password");
  };

  const onPasswordContinue = (event: FormEvent) => {
    event.preventDefault();
    finish(email);
  };

  const quickLogin = (mode: "google" | "phone") => {
    const fake =
      mode === "google"
        ? `google.user${Math.floor(Math.random() * 99)}@gmail.com`
        : `phone${Math.floor(Math.random() * 90000000 + 10000000)}@sms.local`;
    setEmail(fake);
    finish(fake);
  };

  return createPortal(
    <div className={MODAL_OVERLAY_FROSTED} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="登录或注册"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          MODAL_PANEL,
          "relative mx-auto w-full max-w-[400px] rounded-[22px] px-6 pb-6 pt-5 text-ink shadow-glow",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-ink-muted hover:bg-accent-soft/50 hover:text-ink-strong"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center pt-2 text-center">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="size-7 object-contain" />
            <span className="text-lg font-semibold tracking-tight">DramaEditor</span>
          </div>

          {step === "identity" ? (
            <>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">登录或注册</h2>
              <p className="mt-2 text-sm text-ink-muted">让创意成真</p>
            </>
          ) : (
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">输入您的密码</h2>
          )}
        </div>

        {step === "identity" ? (
          <form onSubmit={onIdentityContinue} className="mt-7 space-y-3">
            <button
              type="button"
              onClick={() => quickLogin("google")}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-card-border bg-transparent px-4 py-3 text-sm font-medium text-ink transition hover:bg-accent-soft/40"
            >
              <GoogleMark />
              使用Google继续
            </button>
            <button
              type="button"
              onClick={() => quickLogin("phone")}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-card-border bg-transparent px-4 py-3 text-sm font-medium text-ink transition hover:bg-accent-soft/40"
            >
              <Phone size={16} />
              使用手机号继续
            </button>

            <div className="relative py-2 text-center text-xs text-ink-muted">
              <span className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
              <span className="relative bg-card px-3">或</span>
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="电子邮件地址"
              className="w-full rounded-full border border-card-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-ink-muted focus:border-white/30"
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-60"
            >
              {submitting ? "进入中…" : "继续"}
            </button>
          </form>
        ) : (
          <form onSubmit={onPasswordContinue} className="mt-7 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">邮箱</span>
                <button
                  type="button"
                  className="text-accent-deep hover:text-accent"
                  onClick={() => setStep("identity")}
                >
                  编辑
                </button>
              </div>
              <div className="mt-1.5 rounded-xl border border-card-border bg-white/[0.03] px-3 py-2.5 text-sm text-ink">
                {email || "creator@local.dev"}
              </div>
            </div>

            <label className="block">
              <span className="text-sm text-ink-muted">密码</span>
              <div className="mt-1.5 flex items-center rounded-full border border-card-border bg-transparent px-3">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink-muted"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="grid size-8 place-items-center text-ink-muted hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-60"
            >
              {submitting ? "进入中…" : "继续"}
            </button>
            <button type="button" className="w-full text-center text-sm text-ink-muted hover:text-ink-muted">
              忘记密码？
            </button>

            <div className="relative py-1 text-center text-xs text-ink-muted">
              <span className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
              <span className="relative bg-card px-3">或</span>
            </div>
            <button
              type="button"
              onClick={() => quickLogin("google")}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-card-border bg-panel px-4 py-3 text-sm font-medium text-ink transition hover:bg-accent-soft/40"
            >
              <GoogleMark />
              使用 Google 继续
            </button>
          </form>
        )}

        <label className="mt-5 flex items-start gap-2 text-left text-[11px] leading-5 text-ink-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className={cn("mt-0.5 size-3.5 rounded border-white/20 accent-[var(--tw-accent)]")}
          />
          <span>
            注册即表示您同意我们的{" "}
            <span className="underline underline-offset-2">服务条款</span>
            {" | "}
            <span className="underline underline-offset-2">社区准则</span>
            {" | "}
            <span className="underline underline-offset-2">隐私政策</span>
          </span>
        </label>
      </div>
    </div>,
    document.body,
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.99-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
