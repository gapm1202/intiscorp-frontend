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
    port: 8088,
    open: '/login',
    proxy: {
      '/api': {
        target: 'http://localhost:35421',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:35421',
        changeOrigin: true,
        secure: false
      },
      '/public': {
        target: 'http://localhost:35421',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // 👇 2. Añade esta sección completa
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})