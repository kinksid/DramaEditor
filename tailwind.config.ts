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
          tap: "#5b6c8f",
          swipe: "#3d8f6e",
          hold: "#b94a6a",
          choice: "#8a6b5c",
          ending: "#a33b4a",
        },
      },
      fontFamily: {
        sans: ["var(--font-public-sans)", "Public Sans", "system-ui", "sans-serif"],
        display: ["var(--font-instrument-serif)", "Instrument Serif", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 14px 40px rgba(18, 14, 16, 0.08)",
        glow: "0 18px 46px rgba(185, 74, 106, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
