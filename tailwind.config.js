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
        primary: {
          DEFAULT: 'var(--color-primary, #2563EB)',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2563EB',
          600: '#1d4ed8',
          700: '#1e40af',
        },
        app: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          text: 'var(--color-text)',
          muted: 'var(--color-muted)',
          border: 'var(--color-border)',
        },
        status: {
          present: '#16A34A',
          absent: '#DC2626',
          late: '#F59E0B',
          leave: '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        urdu: ['Noto Nastaliq Urdu', 'Inter', 'serif'],
      },
    },
  },
  plugins: [],
}
