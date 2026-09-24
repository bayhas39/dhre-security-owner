import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  base: './',
  server: { port: 5175, open: false, host: true },
  build: { target: 'es2015', cssCodeSplit: false, assetsInlineLimit: 100000000 }
})
