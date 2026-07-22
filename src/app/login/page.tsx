"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginModal } from "@/components/world-builder/LoginModal";
import { readSession } from "@/lib/authSession";

/** Standalone /login — opens the same TapNow-style modal; any fill enters the app. */
export default function LoginPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (readSession()) {
      router.replace("/world-builder/home");
    }
  }, [router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-stage">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-[18%] h-72 w-52 rotate-[-10deg] rounded-3xl bg-accent/20" />
        <div className="absolute right-[6%] top-[12%] h-80 w-48 rotate-[8deg] rounded-3xl bg-[#3d2848]/50" />
        <div className="absolute bottom-[10%] left-[22%] h-64 w-44 rotate-[4deg] rounded-3xl bg-[#2a1830]/60" />
        <div className="absolute bottom-[18%] right-[18%] h-56 w-40 rotate-[-6deg] rounded-3xl bg-accent/10" />
      </div>
      <div className="absolute left-6 top-5 z-10 flex items-center gap-2 text-ink-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="size-7 object-contain" />
        <span className="text-sm font-semibold">DramaEditor</span>
      </div>
      <LoginModal
        open={open}
        onClose={() => {
          setOpen(false);
          router.push("/world-builder/home");
        }}
        onSuccess={() => router.push("/world-builder/home")}
      />
    </main>
  );
}
