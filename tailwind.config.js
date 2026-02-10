/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern professional palette
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          DEFAULT: '#4f46e5',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81'
        },
        accent: {
          green: '#10b981',
          yellow: '#f59e0b',
          red: '#ef4444',
          cyan: '#06b6d4'
        },
        // Surfaces for light mode
        surface: {
          DEFAULT: '#f8fafc',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0'
        },
        // Sidebar dark theme
        sidebar: {
          DEFAULT: '#1e293b',
          dark: '#0f172a',
          light: '#334155',
          border: 'rgba(255,255,255,0.08)'
        },
        panel: '#ffffff',
        muted: '#64748b',
        subtle: '#f1f5f9'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
      },
      fontSize: {
        // Compact typography scale
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'xs': ['0.6875rem', { lineHeight: '1rem' }],
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'base': ['0.875rem', { lineHeight: '1.375rem' }],
        'lg': ['1rem', { lineHeight: '1.5rem' }],
        'xl': ['1.125rem', { lineHeight: '1.625rem' }],
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '3xl': ['1.5rem', { lineHeight: '2rem' }]
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        'lg': '0.625rem',
        'xl': '0.75rem',
        '2xl': '1rem'
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'inner-soft': 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
        'sidebar': '4px 0 15px -3px rgba(0, 0, 0, 0.1)'
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        }
      },
      transitionDuration: {
        '150': '150ms',
        '250': '250ms'
      }
    },
  },
  plugins: [],
}