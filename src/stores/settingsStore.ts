"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "zh" | "en";
export type Theme = "light" | "dark";

type SettingsState = {
  language: Language;
  theme: Theme;
  apiBaseUrl: string;
  apiKey: string;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setApiBaseUrl: (url: string) => void;
  setApiKey: (key: string) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: "zh",
      theme: "light",
      apiBaseUrl: "https://api.dramaplay.dev/v1",
      apiKey: "",
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
      setApiBaseUrl: (apiBaseUrl) => set({ apiBaseUrl }),
      setApiKey: (apiKey) => set({ apiKey }),
    }),
    {
      name: "drama-editor-settings",
      version: 3,
    },
  ),
);
