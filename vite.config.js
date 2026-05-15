/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/**'],
  },
  // Use relative asset paths in production so CSS/JS still load under nested routes/proxy contexts.
  base: './',

  plugins: [react()],

  // 🔥 FIX for "global is not defined"
  define: {
    global: 'window',
  },

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://13.50.25.162:8080',
        changeOrigin: true
      },
      '/ws': {
        target: 'http://13.50.25.162:8080',
        changeOrigin: true,
        ws: true
      }
    }
  }
})