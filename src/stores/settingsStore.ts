"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "zh" | "en";
export type Theme = "light" | "dark";

type SettingsState = {
  language: Language;
  theme: Theme;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: "zh",
      theme: "light",
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
    }),
    {
      name: "drama-editor-settings",
      version: 2,
    },
  ),
);
