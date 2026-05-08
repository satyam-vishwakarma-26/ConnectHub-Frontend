import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
      '/api/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/api/oauth2': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/api/rooms': {
        target: 'http://127.0.0.1:8082',
        changeOrigin: true
      },
      '/api/messages': {
        target: 'http://127.0.0.1:8083',
        changeOrigin: true
      },
      '/api/presence': {
        target: 'http://127.0.0.1:8085',
        changeOrigin: true
      },
      '/api/notifications': {
        target: 'http://127.0.0.1:8087',
        changeOrigin: true
      },
      '/api/admin': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true
      },
      '/api/payments': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      },
      '/ws': {
        target: 'http://127.0.0.1:8086',
        changeOrigin: true,
        ws: true
      }
    }
  }
})