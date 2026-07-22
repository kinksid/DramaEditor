"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function WorldLocationsPage() {
  const params = useParams<{ worldId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params.worldId) {
      router.replace(`/world-builder/stories/${params.worldId}?tab=locations`);
    }
  }, [params.worldId, router]);

  return <div className="grid min-h-[40vh] place-items-center text-sm text-ink-muted">正在跳转…</div>;
}
