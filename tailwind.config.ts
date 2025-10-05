import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors (from PRD)
        brand: {
          DEFAULT: '#1F6FEB',
          50: '#EFF5FF',
          100: '#DBE7FF',
          200: '#BDD5FF',
          300: '#91BBFF',
          400: '#5E9AFF',
          500: '#3B7FFF',
          600: '#1F6FEB',
          700: '#1A5FD0',
          800: '#144EA9',
          900: '#0F3B82',
        },
        // Semantic colors (from PRD)
        success: {
          DEFAULT: '#16A34A',
          50: '#F0FDF4',
          100: '#DCFCE7',
          600: '#16A34A',
          700: '#15803D',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          600: '#F59E0B',
          700: '#D97706',
        },
        error: {
          DEFAULT: '#DC2626',
          50: '#FEF2F2',
          100: '#FEE2E2',
          600: '#DC2626',
          700: '#B91C1C',
        },
        // UI colors (from PRD)
        surface: '#FFFFFF',
        background: '#F7F7F9',
        border: '#E5E7EB',
        focus: '#2563EB',
        // Text colors (from PRD)
        text: {
          DEFAULT: '#0F172A',
          muted: '#475569',
        },
        // Legacy primary alias (for compatibility)
        primary: {
          50: '#EFF5FF',
          100: '#DBE7FF',
          200: '#BDD5FF',
          300: '#91BBFF',
          400: '#5E9AFF',
          500: '#3B7FFF',
          600: '#1F6FEB',
          700: '#1A5FD0',
          800: '#144EA9',
          900: '#0F3B82',
        },
      },
      borderRadius: {
        'card': '16px',
        'input': '12px',
      },
      spacing: {
        'card': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-in-out',
        'scale-in': 'scaleIn 250ms ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
