/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  // Aquí le dices a Tailwind qué archivos escanear
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Lee todos los archivos de React
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5061f7',
          600: '#4453e6'
        },
        accent: {
          green: '#10b981',
          yellow: '#f59e0b'
        },
        surface: '#f8fafc',
        panel: '#ffffff',
        muted: '#94a3b8',
        subtle: '#f1f5f9'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial']
      },
      borderRadius: {
        xl: '0.75rem'
      },
      boxShadow: {
        card: '0 6px 18px rgba(15, 23, 42, 0.06)'
      }
    },
  },
  plugins: [],
}