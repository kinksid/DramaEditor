import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stage: "var(--tw-stage)",
        panel: "var(--tw-panel)",
        ink: {
          DEFAULT: "var(--tw-ink)",
          muted: "var(--tw-ink-muted)",
          strong: "var(--tw-ink-strong)",
        },
        accent: {
          DEFAULT: "var(--tw-accent)",
          deep: "var(--tw-accent-deep)",
          soft: "var(--tw-accent-soft)",
        },
        sidebar: "var(--tw-sidebar)",
        "sidebar-border": "var(--tw-sidebar-border)",
        card: "var(--tw-card)",
        "card-border": "var(--tw-card-border)",
        branch: {
          tap: "#6366f1",
          swipe: "#22c55e",
          hold: "#d9468a",
          choice: "#8b5cf6",
          ending: "#e11d48",
        },
      },
      boxShadow: {
        soft: "0 14px 40px rgba(45, 27, 61, 0.08)",
        glow: "0 18px 46px rgba(217, 70, 138, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
