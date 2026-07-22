import type { AccountTab } from "@/components/world-builder/AccountManagement";

export const ACCOUNT_MODAL_EVENT = "dramaeditor-account-modal";

export function openAccountModal(tab: AccountTab = "recharge") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACCOUNT_MODAL_EVENT, { detail: { tab, open: true } }));
}

export function closeAccountModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACCOUNT_MODAL_EVENT, { detail: { open: false } }));
}
