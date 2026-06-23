import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stage: "#f6f2ee",
        panel: "#fffaf5",
        ink: {
          DEFAULT: "#151b29",
          muted: "#344052",
          strong: "#090d16",
        },
        accent: {
          DEFAULT: "#f27d3d",
          deep: "#c9551d",
          soft: "#fff1e8",
        },
        branch: {
          tap: "#2f7df6",
          swipe: "#15a36b",
          hold: "#f27d3d",
          choice: "#8b5cf6",
          ending: "#e5484d",
        },
      },
      boxShadow: {
        soft: "0 14px 40px rgba(21, 27, 41, 0.08)",
        glow: "0 18px 46px rgba(242, 125, 61, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
