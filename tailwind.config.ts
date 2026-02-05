import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Theme-aware colors
        'theme-primary': 'var(--bg-primary)',
        'theme-secondary': 'var(--bg-secondary)',
        'theme-tertiary': 'var(--bg-tertiary)',
        'theme-card': 'var(--bg-card)',
        'accent': 'var(--accent-primary)',
      },
      textColor: {
        'theme-primary': 'var(--text-primary)',
        'theme-secondary': 'var(--text-secondary)',
        'theme-tertiary': 'var(--text-tertiary)',
        'theme-muted': 'var(--text-muted)',
        'accent': 'var(--accent-primary)',
      },
      backgroundColor: {
        'theme-primary': 'var(--bg-primary)',
        'theme-secondary': 'var(--bg-secondary)',
        'theme-tertiary': 'var(--bg-tertiary)',
        'theme-card': 'var(--bg-card)',
      },
      borderColor: {
        'theme-primary': 'var(--border-primary)',
        'theme-secondary': 'var(--border-secondary)',
        'theme-tertiary': 'var(--border-tertiary)',
      },
      boxShadow: {
        'theme': 'var(--shadow-md)',
        'theme-accent': 'var(--shadow-accent)',
      },
    },
  },
  plugins: [],
} satisfies Config;
