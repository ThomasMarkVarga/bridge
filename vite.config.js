import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { applyLanguage, pickLanguage, DEFAULT_LANGUAGE } from './worker/language-html.js'

/**
 * Do locally what the Worker does at the edge.
 *
 * The static half of the page is translated by rewriting the document before it
 * is sent, which in production is the Worker's job. Without this the dev server
 * and `vite preview` serve the English prose under a Romanian interface, so the
 * feature is invisible until somebody deploys it, which is not a state worth
 * developing in. Both call the same function, so there is no second rule to
 * keep in step.
 *
 * There is no country here: nothing in front of localhost works out where a
 * visitor is. So this honours ?lang= and otherwise serves English, which is what
 * the edge does for everyone outside Romania and Moldova.
 */
function languageSwap() {
  const swap = (server) => (req, res, next) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname !== '/' && !url.pathname.endsWith('.html')) return next()
    if (url.pathname.startsWith('/countries/')) return next()

    const lang = pickLanguage({ url: url.href, cf: undefined })
    if (lang === DEFAULT_LANGUAGE) return next()

    let fragment = null
    try {
      fragment = readFileSync(resolve(process.cwd(), `public/seo.${lang}.html`), 'utf8')
    } catch {
      return next()
    }

    // Let Vite build the page as it normally would, then rewrite what it wrote.
    const write = res.write.bind(res)
    const end = res.end.bind(res)
    const chunks = []
    res.write = (chunk, ...rest) => {
      chunks.push(Buffer.from(chunk))
      return true
    }
    res.end = (chunk, ...rest) => {
      if (chunk) chunks.push(Buffer.from(chunk))
      const type = res.getHeader('content-type') || ''
      let body = Buffer.concat(chunks)
      if (String(type).includes('text/html')) {
        body = Buffer.from(applyLanguage(body.toString('utf8'), lang, fragment), 'utf8')
        res.setHeader('content-language', lang)
      }
      res.setHeader('content-length', body.length)
      write(body)
      return end()
    }
    next()
  }

  // Registered directly rather than by returning a function. Returning one makes
  // it a post hook, which runs after Vite has already answered the request, and
  // this has to be in place beforehand to wrap the response it writes.
  return {
    name: 'language-swap',
    configureServer(server) {
      server.middlewares.use(swap(server))
    },
    configurePreviewServer(server) {
      server.middlewares.use(swap(server))
    }
  }
}

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

/**
 * Give the dev server a real stylesheet link, the way the build has one.
 *
 * The stylesheets enter through an import in main.jsx, so in production Vite
 * extracts them and puts a render-blocking <link> in the head. In dev it injects
 * them with JavaScript instead, after the module graph has loaded. That was
 * invisible while the body was an empty div, but the page now ships a screenful
 * of prose in the document for crawlers and for readers without JavaScript, and
 * that paints the moment it arrives: unstyled, until the CSS turns up.
 *
 * The ?direct suffix is what makes Vite serve the compiled CSS as text/css
 * rather than as the JavaScript module that injects it. The import in main.jsx
 * stays exactly as it is, so hot reloading still works; this only removes the
 * gap before the first paint.
 */
function devStylesheet() {
  return {
    name: 'dev-stylesheet',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler: () => [
        { tag: 'link', attrs: { rel: 'stylesheet', href: '/src/styles.css?direct' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'stylesheet', href: '/src/showcase.css?direct' }, injectTo: 'head' }
      ]
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stampServiceWorker(), languageSwap(), devStylesheet()],
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
