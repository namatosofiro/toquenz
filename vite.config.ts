import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// All provider paths proxy to the local proxy server.
// The proxy server holds all API keys — they never reach the browser.
const PROXY_TARGET = 'http://127.0.0.1:3333'
const PROVIDERS    = ['anthropic', 'openai', 'google', 'mistral', 'groq', 'together', 'perplexity', 'xai', 'deepseek', 'cohere']

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(
      PROVIDERS.map(p => [`/${p}`, { target: PROXY_TARGET, changeOrigin: false }])
    ),
  },
  optimizeDeps: {
    exclude: ['@dqbd/tiktoken'],
  },
})
