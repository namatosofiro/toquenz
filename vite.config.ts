import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/anthropic': { target: 'http://127.0.0.1:3333', changeOrigin: false },
      '/openai':    { target: 'http://127.0.0.1:3333', changeOrigin: false },
    },
  },
  optimizeDeps: {
    exclude: ['@dqbd/tiktoken'],
  },
})
