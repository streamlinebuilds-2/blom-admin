import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5173,
    strictPort: false,
    open: false
  },
  preview: {
    port: 4173,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})