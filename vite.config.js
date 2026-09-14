import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Stamp the service worker with a build id derived from what was actually built.
 *
 * Without this the cache name never changes, so a returning visitor could sit on an
 * old shell indefinitely. Hashing the emitted asset names means the id changes when
 * and only when the output does, which is what makes the update path work: a new
 * build installs a new worker, it takes over, and every older cache is deleted.
 */
function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist')
      const swPath = join(outDir, 'sw.js')

      let names = []
      try {
        const assetsDir = join(outDir, 'assets')
        names = readdirSync(assetsDir)
          .filter((f) => statSync(join(assetsDir, f)).isFile())
          .sort()
      } catch {
        names = []
      }

      const buildId = createHash('sha256').update(names.join('\n')).digest('hex').slice(0, 12)

      let sw
      try {
        sw = readFileSync(swPath, 'utf8')
      } catch {
        return // no service worker in this build, nothing to stamp
      }

      if (!sw.includes('__BUILD_ID__')) return
      writeFileSync(swPath, sw.replace(/__BUILD_ID__/g, buildId), 'utf8')
      this.info?.(`service worker cache: bridge-${buildId}`)
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stampServiceWorker()],
  server: {
    port: 8765,
    strictPort: true,
    host: true,
    // Tunnelling the dev server (ngrok, Cloudflare, LocalTunnel) sends a Host
    // header Vite rejects by default as a DNS-rebinding guard. These subdomains
    // are allowed so a phone can open the real thing; everything else still is
    // not, which keeps the guard doing its job.
    allowedHosts: ['localhost', '.ngrok-free.app', '.ngrok.io', '.ngrok.app', '.trycloudflare.com', '.loca.lt']
  },
  preview: {
    port: 8765,
    strictPort: true,
    host: true,
    allowedHosts: ['localhost', '.ngrok-free.app', '.ngrok.io', '.ngrok.app', '.trycloudflare.com', '.loca.lt']
  },
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
