import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      surface: {
        DEFAULT: 'var(--surface)',
        raised: 'var(--surface-raised)',
        sunken: 'var(--surface-sunken)',
      },
      border: {
        DEFAULT: 'var(--border)',
      },
      text: {
        primary: 'var(--text-primary)',
        muted: 'var(--text-muted)',
      },
      brand: {
        DEFAULT: 'var(--brand)',
        hover: 'var(--brand-hover)',
        on: 'var(--on-brand)',
      },
      highlight: {
        DEFAULT: 'var(--highlight)',
      },
      accent: {
        DEFAULT: 'var(--accent)',
      },
      sla: {
        'on-track': 'var(--sla-on-track)',
        'due-soon': 'var(--sla-due-soon)',
        overdue: 'var(--sla-overdue)',
        paused: 'var(--sla-paused)',
      },
      info: {
        DEFAULT: 'var(--info)',
      },
    },
    fontFamily: {
      serif: ['var(--font-serif)', 'var(--font-serif-hi)', 'Georgia', 'serif'],
      sans: ['var(--font-sans)', 'var(--font-sans-hi)', 'sans-serif'],
      mono: ['var(--font-mono)', 'monospace'],
    },
    borderRadius: {
      none: '0px',
      xs: 'var(--radius-xs)',
      sm: 'var(--radius-sm)',
      DEFAULT: 'var(--radius-sm)',
      md: 'var(--radius-md)',
    },
    boxShadow: {
      none: 'var(--shadow-none)',
      subtle: 'var(--shadow-subtle)',
      overlay: 'var(--shadow-overlay)',
    },
    extend: {
      spacing: {
        'shell-sidebar': 'var(--spacing-sidebar)',
        'shell-topbar': 'var(--spacing-topbar)',
      },
    },
  },
  plugins: [],
};

export default config;

