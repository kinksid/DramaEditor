import { cn } from "@/lib/utils";

/** 全站弹窗：TapNow 近黑面板 + 细白描边（见 .cursor/rules/design-system.mdc） */
export const MODAL_OVERLAY_FROSTED =
  "de-modal-overlay-frosted de-modal-z-80 fixed inset-0 flex items-center justify-center p-4 sm:p-6";
export const MODAL_OVERLAY = "de-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6";
export const MODAL_OVERLAY_70 = "de-modal-overlay de-modal-z-70 fixed inset-0 flex items-center justify-center p-4 sm:p-6";
export const MODAL_OVERLAY_80 = "de-modal-overlay de-modal-z-80 fixed inset-0 flex items-center justify-center p-4 sm:p-6";
export const MODAL_OVERLAY_90 = "de-modal-overlay de-modal-z-90 fixed inset-0 flex items-center justify-center p-4 sm:p-6";
export const MODAL_SCRIM = "de-modal-scrim fixed inset-0";
export const MODAL_PANEL = "de-modal-panel";
export const MODAL_DRAWER = "de-modal-drawer";

export function modalPanel(maxWidth?: string, className?: string) {
  return cn(MODAL_PANEL, maxWidth, className);
}
