import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 8765, strictPort: true, host: true },
  preview: { port: 8765, strictPort: true, host: true },
  build: {
    target: 'es2020',
    // Holiday JSON is fetched at runtime from this origin, never inlined.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom']
        }
      }
    }
  }
})
