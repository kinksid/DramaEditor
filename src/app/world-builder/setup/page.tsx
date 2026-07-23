"use client";

import { Suspense } from "react";
import SetupPageContent from "./SetupPageContent";

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-white/45">加载项目中…</div>}>
      <SetupPageContent />
    </Suspense>
  );
}
