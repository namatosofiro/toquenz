import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All /api/anthropic/* requests go to the local proxy server.
      // The proxy server holds the API key — it never reaches the browser.
      '/api/anthropic': {
        target:      'http://127.0.0.1:3333',
        changeOrigin: false,
        rewrite:     (path) => path.replace(/^\/api\/anthropic/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@dqbd/tiktoken'],
  },
})
