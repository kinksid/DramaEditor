"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LlmTaskId, LlmTaskProfile, ProviderConfigPatch, PublicProviderConfig } from "@/lib/providers/types";

type ProviderSettingsState = {
  config: PublicProviderConfig | null;
  selectedLlmPresetId: string;
  llmTaskProfiles: Partial<Record<LlmTaskId, LlmTaskProfile>>;
  llmApiKey: string;
  imageApiKey: string;
  videoApiKey: string;
  setSelectedLlmPresetId: (id: string) => void;
  setLlmTaskProfile: (id: LlmTaskId, profile: LlmTaskProfile) => void;
  setLlmTaskProfiles: (profiles: Partial<Record<LlmTaskId, LlmTaskProfile>>) => void;
  setLlmApiKey: (key: string) => void;
  setImageApiKey: (key: string) => void;
  setVideoApiKey: (key: string) => void;
  loadFromServer: () => Promise<void>;
  saveToServer: (patch: ProviderConfigPatch) => Promise<PublicProviderConfig>;
  testProvider: (
    target: "llm" | "image" | "video",
    options?: {
      llmTaskId?: LlmTaskId;
      imageEndpoint?: "general" | "character";
      imageConfig?: Partial<PublicProviderConfig["image"]>;
    },
  ) => Promise<{ message: string; content?: string; thinking?: string }>;
  restoreDefaultTask: (taskId: LlmTaskId) => Promise<LlmTaskProfile>;
};

export const useProviderSettingsStore = create<ProviderSettingsState>()(
  persist(
    (set, get) => ({
      config: null,
      selectedLlmPresetId: "",
      llmTaskProfiles: {},
      llmApiKey: "",
      imageApiKey: "",
      videoApiKey: "",
      setSelectedLlmPresetId: (selectedLlmPresetId) => set({ selectedLlmPresetId }),
      setLlmTaskProfile: (id, profile) =>
        set((state) => ({
          llmTaskProfiles: { ...state.llmTaskProfiles, [id]: profile },
        })),
      setLlmTaskProfiles: (profiles) => set({ llmTaskProfiles: profiles }),
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

        const taskProfilesFromServer = (config.llm.taskProfiles ?? []).reduce(
          (acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          },
          {} as Partial<Record<LlmTaskId, LlmTaskProfile>>,
        );

        if (presetId && presetId !== config.llm.presetId) {
          const restore = await fetch("/api/world-builder/providers/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              llmPresetId: presetId,
              llmTaskProfiles: state.llmTaskProfiles,
            }),
          });
          if (restore.ok) {
            const restored = (await restore.json()) as PublicProviderConfig;
            set({
              config: restored,
              selectedLlmPresetId: presetId,
              llmTaskProfiles: taskProfilesFromServer,
            });
            return;
          }
        }

        set({
          config,
          selectedLlmPresetId: config.llm.presetId ?? presetId,
          llmTaskProfiles: Object.keys(state.llmTaskProfiles).length
            ? state.llmTaskProfiles
            : taskProfilesFromServer,
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
          llmTaskProfiles: patch.llmTaskProfiles ?? state.llmTaskProfiles,
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
      testProvider: async (target, options) => {
        const state = get();
        const response = await fetch("/api/world-builder/providers/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target,
            llmPresetId: state.selectedLlmPresetId || undefined,
            llmTaskId: options?.llmTaskId,
            llmApiKey: state.llmApiKey || undefined,
            imageApiKey: state.imageApiKey || undefined,
            imageEndpoint: options?.imageEndpoint,
            imageConfig: options?.imageConfig,
            videoApiKey: state.videoApiKey || undefined,
          }),
        });
        const data = (await response.json()) as {
          message?: string;
          content?: string;
          thinking?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "连接测试失败");
        return {
          message: data.message ?? "连接正常",
          content: data.content,
          thinking: data.thinking,
        };
      },
      restoreDefaultTask: async (taskId) => {
        const response = await fetch("/api/world-builder/providers/llm/tasks");
        if (!response.ok) throw new Error("无法加载默认任务配置");
        const data = (await response.json()) as { defaults: LlmTaskProfile[] };
        const defaultProfile = data.defaults.find((item) => item.id === taskId);
        if (!defaultProfile) throw new Error(`未找到默认任务: ${taskId}`);
        get().setLlmTaskProfile(taskId, defaultProfile);
        return defaultProfile;
      },
    }),
    {
      name: "drama-editor-provider-settings",
      version: 3,
      partialize: (state) => ({
        selectedLlmPresetId: state.selectedLlmPresetId,
        llmTaskProfiles: state.llmTaskProfiles,
        llmApiKey: state.llmApiKey,
        imageApiKey: state.imageApiKey,
        videoApiKey: state.videoApiKey,
      }),
    },
  ),
);
