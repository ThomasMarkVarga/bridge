/**
 * The service worker, so the page works with the wifi off.
 *
 * Two rules, and they are the whole file:
 *
 *   1. It only ever touches requests to this origin. A request anywhere else is
 *      passed straight through untouched, because there are none and there never
 *      should be. This worker cannot become a way to talk to a third party.
 *   2. The app shell is cached on install and served from cache first. Everything
 *      else is cached as it is fetched, so a country's holiday dates are there the
 *      next time even if the network is not.
 *
 * Updating: a new build changes CACHE, the new worker installs alongside the old
 * one, takes over as soon as it is ready, and deletes every older cache.
 */

// Stamped with the build id at build time (see vite.config.js). A new build gets a
// new cache, the new worker installs alongside the old one, takes over, and deletes
// every older cache. In development the placeholder is left as it is.
const CACHE = 'bridge-__BUILD_ID__'

/** Cached up front so a cold start with no network still renders. */
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/fonts/public-sans-latin-wght-normal.woff2',
  '/fonts/archivo-black-latin-400-normal.woff2'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll fails the whole install if any one file is missing, so each is
      // added on its own and a miss is survivable.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Anything not served by this site is none of this worker's business.
  if (url.origin !== self.location.origin) return

  // Navigations: try the network so an update is picked up, fall back to the
  // cached shell when there is nothing to talk to.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html').then((hit) => hit || caches.match('/')))
    )
    return
  }

  // Everything else: cache first, because the assets are content-hashed and the
  // holiday files change only when the app is rebuilt.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit
      return fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(
          () =>
            // Offline and never seen before. Say so properly rather than resolving
            // to nothing, which would surface as an opaque network error.
            new Response('This file is not available offline yet. Reload once while connected.', {
              status: 504,
              statusText: 'Offline',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            })
        )
    })
  )
})

// Lets the page ask a waiting worker to take over immediately.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})
