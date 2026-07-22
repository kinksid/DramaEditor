"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { WorldBuilderLayout } from "@/components/world-builder/WorldBuilderLayout";
import { openAccountModal } from "@/lib/accountModal";
import type { AccountTab } from "@/components/world-builder/AccountManagement";
import { VALID_ACCOUNT_TABS } from "@/components/world-builder/AccountManagement";

/** Legacy /account route → stay on home and open the account modal. */
function AccountRedirect() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const tab = search.get("tab") as AccountTab | null;
    const next = tab && VALID_ACCOUNT_TABS.includes(tab) ? tab : "recharge";
    router.replace("/world-builder/home");
    // open after navigation so AccountModalHost is mounted
    window.setTimeout(() => openAccountModal(next), 50);
  }, [router, search]);

  return (
    <div className="grid min-h-[40vh] place-items-center text-sm text-ink-muted">
      正在打开账户管理…
    </div>
  );
}

export default function AccountPage() {
  return (
    <WorldBuilderLayout agentMode="none">
      <Suspense
        fallback={
          <div className="grid min-h-[40vh] place-items-center text-sm text-ink-muted">Loading…</div>
        }
      >
        <AccountRedirect />
      </Suspense>
    </WorldBuilderLayout>
  );
}
