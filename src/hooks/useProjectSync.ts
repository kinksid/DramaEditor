"use client";

import { useEffect } from "react";
import { syncProjectsFromWorkspace } from "@/lib/worldBuilderProject";
import { useWorldBuilderStore, type WorldBuilderState } from "@/stores/worldBuilderStore";

const SYNC_POLL_MS = 2500;

function syncFingerprint(state: WorldBuilderState) {
  const projects = syncProjectsFromWorkspace(
    state.projects,
    state.activeProjectId,
    {
      world: state.world,
      characters: state.characters,
      locations: state.locations,
      episodes: state.episodes,
      nodes: state.nodes,
      edges: state.edges,
      setupDraft: state.setupDraft,
    },
  );
  return JSON.stringify({
    activeProjectId: state.activeProjectId,
    projects,
    creationSession: state.creationSession,
  });
}

export function useProjectSync() {
  const hasHydrated = useWorldBuilderStore((state) => state.hasHydrated);
  const syncInitialized = useWorldBuilderStore((state) => state.syncInitialized);
  const initServerSync = useWorldBuilderStore((state) => state.initServerSync);
  const pullFromServer = useWorldBuilderStore((state) => state.pullFromServer);
  const schedulePush = useWorldBuilderStore((state) => state.schedulePush);

  useEffect(() => {
    if (!hasHydrated || syncInitialized) return;
    void initServerSync();
  }, [hasHydrated, syncInitialized, initServerSync]);

  useEffect(() => {
    if (!hasHydrated || !syncInitialized) return;

    const pollTimer = setInterval(() => {
      void pullFromServer();
    }, SYNC_POLL_MS);

    const unsub = useWorldBuilderStore.subscribe((state, prev) => {
      if (state._remoteApplying || prev._remoteApplying) return;
      if (syncFingerprint(state) !== syncFingerprint(prev)) {
        schedulePush();
      }
    });

    return () => {
      clearInterval(pollTimer);
      unsub();
    };
  }, [hasHydrated, syncInitialized, pullFromServer, schedulePush]);
}
