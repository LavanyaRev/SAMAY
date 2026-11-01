import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        white: "#FFFFFF",
        black: "#000000",
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          sunken: "var(--surface-sunken)",
        },
        border: {
          DEFAULT: "var(--border)",
        },
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
        },
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          on: "var(--on-brand)",
        },
        highlight: {
          DEFAULT: "var(--highlight)",
        },
        accent: {
          DEFAULT: "var(--accent)",
        },
        sla: {
          "on-track": "var(--sla-on-track)",
          "due-soon": "var(--sla-due-soon)",
          overdue: "var(--sla-overdue)",
          paused: "var(--sla-paused)",
        },
        info: {
          DEFAULT: "var(--info)",
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "Inter",
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        serif: [
          '"Plus Jakarta Sans"',
          "Inter",
          "var(--font-serif)",
          "Georgia",
          "serif",
        ],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
      },
      boxShadow: {
        subtle: "var(--shadow-subtle)",
        overlay: "var(--shadow-overlay)",
      },
      spacing: {
        "shell-sidebar": "var(--spacing-sidebar)",
        "shell-topbar": "var(--spacing-topbar)",
      },
    },
  },
  plugins: [],
};

export default config;
