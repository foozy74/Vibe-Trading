import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--glass-border)",
        background: "var(--bg-surface)",
        foreground: "var(--text-primary)",
        teal: {
          DEFAULT: "var(--teal)",
          dim: "var(--teal-dim)",
          glow: "var(--teal-glow)",
        },
        blue: {
          DEFAULT: "var(--blue)",
          dim: "var(--blue-dim)",
          glow: "var(--blue-glow)",
        },
        purple: {
          DEFAULT: "var(--purple)",
          dim: "var(--purple-dim)",
          glow: "var(--purple-glow)",
        },
        accent: {
          teal: "var(--teal)",
          blue: "var(--blue)",
          purple: "var(--purple)",
        },
        glass: {
          bg: "var(--glass-bg)",
          border: "var(--glass-border)",
        },
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
        },
        danger: "#ef4444",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        display: ["var(--font-display)", "Outfit", "sans-serif"],
        mono: ["var(--font-mono)", "Geist Mono", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
