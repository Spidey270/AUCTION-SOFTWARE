/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        war: {
          bg: '#090d16',
          card: '#0f172a',
          cardLight: '#1e293b',
          border: '#334155',
          gold: '#f59e0b',
          cyan: '#06b6d4',
          emerald: '#10b981',
          danger: '#ef4444',
          purple: '#8b5cf6',
          slate: '#64748b'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -2px rgba(6, 182, 212, 0.4)',
        'glow-gold': '0 0 18px -2px rgba(245, 158, 11, 0.45)',
        'glow-danger': '0 0 18px -2px rgba(239, 68, 68, 0.45)',
        'glow-emerald': '0 0 18px -2px rgba(16, 185, 129, 0.45)',
      }
    },
  },
  plugins: [],
}
