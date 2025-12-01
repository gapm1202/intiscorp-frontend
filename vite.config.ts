import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path' // 👈 1. Importa 'path' de Node

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Open the browser to /login when the dev server starts
    port: 5173,
    open: '/login'
  },
  // 👇 2. Añade esta sección completa
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})