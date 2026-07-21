import type {
  SharedWorldBuilderPushBody,
  SharedWorldBuilderState,
} from "@/types/worldBuilderSync";

const SYNC_URL = "/api/world-builder/projects/sync";

export type PullSyncResult =
  | { status: "unchanged" }
  | { status: "updated"; state: SharedWorldBuilderState };

export async function pullSharedState(revision: number): Promise<PullSyncResult> {
  const response = await fetch(`${SYNC_URL}?revision=${revision}`, {
    cache: "no-store",
  });

  if (response.status === 304) {
    return { status: "unchanged" };
  }

  if (!response.ok) {
    throw new Error(`拉取同步数据失败 (${response.status})`);
  }

  const state = (await response.json()) as SharedWorldBuilderState;
  return { status: "updated", state };
}

export type PushSyncResult =
  | { ok: true; state: SharedWorldBuilderState }
  | { ok: false; conflict: SharedWorldBuilderState };

export async function pushSharedState(body: SharedWorldBuilderPushBody): Promise<PushSyncResult> {
  const response = await fetch(SYNC_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 409) {
    const conflict = (await response.json()) as SharedWorldBuilderState;
    return { ok: false, conflict };
  }

  if (!response.ok) {
    throw new Error(`推送同步数据失败 (${response.status})`);
  }

  const state = (await response.json()) as SharedWorldBuilderState;
  return { ok: true, state };
}

export function getOrCreateSyncClientId(): string {
  if (typeof window === "undefined") return "server";
  const key = "drama-sync-client-id";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}
