import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite-plugin-singlefile removed for the same reason as the main dashboard:
// inlining everything into one HTML file blocks code splitting and delays
// first paint. Recharts now loads as its own cached chunk.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5175, open: false, host: true },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
