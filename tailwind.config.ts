import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      colors: {
        background: '#0F0A1E',
        surface: '#1A1035',
        'surface-elevated': '#221445',
        primary: { DEFAULT: '#7C3AED', light: '#A855F7' },
        'rupee-gold': '#D4A847',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        text: '#F1F0F5',
        'text-muted': '#7B7A8E',
      },
    },
  },
  plugins: [],
};
export default config;
