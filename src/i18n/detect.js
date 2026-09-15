/**
 * Which language to open in.
 *
 * The country comes from the edge, not from a geolocation service. Cloudflare
 * hands the Worker the visitor's country on the request that is already
 * fetching the page, so it costs no extra request and no third party is told
 * anything. That matters more here than it would elsewhere: this app promises
 * nothing about you leaves your device, and calling an IP lookup API to decide
 * what language to greet you in would have broken that on the first paint.
 *
 * Order of precedence, most deliberate first:
 *
 *   1. ?lang=ro          somebody said so, in a link. Also what a crawler sees.
 *   2. bridge.lang       somebody said so, on this device, earlier.
 *   3. <html lang>       stamped by the Worker before the page was sent.
 *   4. English.
 *
 * A guess from an address is only ever a guess. Somebody Romanian reading this
 * in an airport in Vienna gets English, and somebody English living in Cluj
 * gets Romanian, and both are wrong. That is why the switch exists, why its
 * choice is remembered, and why it beats the guess rather than arguing with it.
 */
import { DEFAULT_LANGUAGE, isLanguage } from './core.js'

const STORE_KEY = 'bridge.lang'

/** Countries whose visitors are shown Romanian unless they say otherwise. */
const ROMANIAN_SPEAKING = new Set(['RO', 'MD'])

/** The language a country implies, or null when nothing here speaks to it. */
export function languageForCountry(country) {
  return ROMANIAN_SPEAKING.has(String(country || '').toUpperCase()) ? 'ro' : null
}

export function storedLanguage() {
  try {
    const saved = window.localStorage.getItem(STORE_KEY)
    return isLanguage(saved) ? saved : null
  } catch {
    // Storage can be switched off, and a page that falls over because of that
    // would be a worse bug than showing the wrong language.
    return null
  }
}

export function rememberLanguage(code) {
  try {
    if (isLanguage(code)) window.localStorage.setItem(STORE_KEY, code)
  } catch {
    /* nothing to do, and nothing worth telling anyone about */
  }
}

/** The language to start in. */
export function detectLanguage() {
  const asked = new URLSearchParams(window.location.search).get('lang')
  if (isLanguage(asked)) return asked

  const saved = storedLanguage()
  if (saved) return saved

  const stamped = document.documentElement.getAttribute('lang')
  return isLanguage(stamped) ? stamped : DEFAULT_LANGUAGE
}

export { STORE_KEY }
