"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { decomposeStory } from "@/lib/worldBuilderApi";
import { useWorldBuilderStore } from "@/stores/worldBuilderStore";
import { useProviderSettingsStore } from "@/stores/providerSettingsStore";

type Options = {
  onSuccess?: (projectId: string) => void;
  redirectToSetup?: boolean;
};

export function useCreateWorldFromPrompt(options: Options = {}) {
  const router = useRouter();
  const { redirectToSetup = true, onSuccess } = options;
  const {
    creationSession,
    updateCreationSession,
    createProjectFromSession,
  } = useWorldBuilderStore();
  const selectedLlmPresetId = useProviderSettingsStore((state) => state.selectedLlmPresetId);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const createFromPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) {
        setError("请先输入世界描述");
        return null;
      }

      setCreating(true);
      setError(null);
      setWarning(null);
      updateCreationSession({ prompt: trimmed });

      try {
        await useProviderSettingsStore.getState().loadFromServer();

        const canReusePreview =
          creationSession.lastDecompose && creationSession.prompt.trim() === trimmed;

        let result = canReusePreview ? creationSession.lastDecompose : null;
        let source = canReusePreview ? "preview" : "";
        let decomposeWarning: string | undefined;

        if (!result) {
          const response = await decomposeStory({
            prompt: trimmed,
            visualStyle: creationSession.visualStylePreset,
            references: creationSession.references,
            llmPresetId: selectedLlmPresetId || undefined,
          });
          result = response.result;
          decomposeWarning = response.warning;
          source = response.source;
        }

        if (source === "fallback") {
          setWarning(
            decomposeWarning ??
              "LLM 不可用，仅填入原始描述。请在设置中选择可用的 LLM 预设，或确认 Ollama 已启动。",
          );
        }

        const projectId = createProjectFromSession({ decomposeResult: result });
        onSuccess?.(projectId);
        if (redirectToSetup) {
          router.push(`/world-builder/setup?project=${projectId}`);
        }
        return projectId;
      } catch (err) {
        setError(err instanceof Error ? err.message : "创建失败");
        return null;
      } finally {
        setCreating(false);
      }
    },
    [
      creationSession.lastDecompose,
      creationSession.prompt,
      creationSession.references,
      creationSession.visualStylePreset,
      createProjectFromSession,
      onSuccess,
      redirectToSetup,
      router,
      selectedLlmPresetId,
      updateCreationSession,
    ],
  );

  return { createFromPrompt, creating, error, warning, setError, setWarning };
}
