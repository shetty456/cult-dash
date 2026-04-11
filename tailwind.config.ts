import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cult: {
          bg:     '#1a1a1a',
          card:   '#2d2d2d',
          border: '#3a3a3a',
          green:  '#10b981',
          'green-light': '#4ade80',
          yellow: '#f59e0b',
          red:    '#ef4444',
          orange: '#f97316',
          muted:  '#9ca3af',
          dim:    '#6b7280',
        },
      },
    },
  },
  plugins: [],
};
export default config;
