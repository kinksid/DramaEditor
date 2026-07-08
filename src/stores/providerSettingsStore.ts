"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProviderConfigPatch, PublicProviderConfig } from "@/lib/providers/types";

type ProviderSettingsState = {
  config: PublicProviderConfig | null;
  selectedLlmPresetId: string;
  llmApiKey: string;
  imageApiKey: string;
  videoApiKey: string;
  setSelectedLlmPresetId: (id: string) => void;
  setLlmApiKey: (key: string) => void;
  setImageApiKey: (key: string) => void;
  setVideoApiKey: (key: string) => void;
  loadFromServer: () => Promise<void>;
  saveToServer: (patch: ProviderConfigPatch) => Promise<PublicProviderConfig>;
  testProvider: (target: "llm" | "image" | "video") => Promise<string>;
};

export const useProviderSettingsStore = create<ProviderSettingsState>()(
  persist(
    (set, get) => ({
      config: null,
      selectedLlmPresetId: "",
      llmApiKey: "",
      imageApiKey: "",
      videoApiKey: "",
      setSelectedLlmPresetId: (selectedLlmPresetId) => set({ selectedLlmPresetId }),
      setLlmApiKey: (llmApiKey) => set({ llmApiKey }),
      setImageApiKey: (imageApiKey) => set({ imageApiKey }),
      setVideoApiKey: (videoApiKey) => set({ videoApiKey }),
      loadFromServer: async () => {
        const response = await fetch("/api/world-builder/providers/config");
        if (!response.ok) throw new Error("无法加载供应商配置");
        const config = (await response.json()) as PublicProviderConfig;
        const state = get();
        const presetId =
          state.selectedLlmPresetId ||
          config.llm.presetId ||
          config.llm.presets?.find((item) => item.available)?.id ||
          "";

        if (presetId && presetId !== config.llm.presetId) {
          const restore = await fetch("/api/world-builder/providers/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ llmPresetId: presetId }),
          });
          if (restore.ok) {
            const restored = (await restore.json()) as PublicProviderConfig;
            set({ config: restored, selectedLlmPresetId: presetId });
            return;
          }
        }

        set({
          config,
          selectedLlmPresetId: config.llm.presetId ?? presetId,
        });
      },
      saveToServer: async (patch) => {
        const state = get();
        const llmPatch = patch.llm ? { ...patch.llm } : undefined;
        const imagePatch = patch.image ? { ...patch.image } : undefined;
        const videoPatch = patch.video ? { ...patch.video } : undefined;
        if (llmPatch && state.llmApiKey) llmPatch.apiKey = state.llmApiKey;
        if (imagePatch && state.imageApiKey) imagePatch.apiKey = state.imageApiKey;
        if (videoPatch && state.videoApiKey) videoPatch.apiKey = state.videoApiKey;

        const body: ProviderConfigPatch = {
          ...patch,
          llmPresetId: patch.llmPresetId ?? (state.selectedLlmPresetId || undefined),
          llm: llmPatch,
          image: imagePatch,
          video: videoPatch,
        };
        const response = await fetch("/api/world-builder/providers/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "保存失败");
        }
        const config = (await response.json()) as PublicProviderConfig;
        set({
          config,
          selectedLlmPresetId: config.llm.presetId ?? state.selectedLlmPresetId,
        });
        return config;
      },
      testProvider: async (target) => {
        const state = get();
        const response = await fetch("/api/world-builder/providers/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target,
            llmPresetId: state.selectedLlmPresetId || undefined,
            llmApiKey: state.llmApiKey || undefined,
            imageApiKey: state.imageApiKey || undefined,
            videoApiKey: state.videoApiKey || undefined,
          }),
        });
        const data = (await response.json()) as { message?: string; error?: string };
        if (!response.ok) throw new Error(data.error ?? "连接测试失败");
        return data.message ?? "连接正常";
      },
    }),
    {
      name: "drama-editor-provider-settings",
      version: 2,
      partialize: (state) => ({
        selectedLlmPresetId: state.selectedLlmPresetId,
        llmApiKey: state.llmApiKey,
        imageApiKey: state.imageApiKey,
        videoApiKey: state.videoApiKey,
      }),
    },
  ),
);
