/**
 * Holiday data loading.
 *
 * The country list is small enough to ship with the app. Each country's dates are
 * fetched on demand, from this origin, as a static file. There is no API here and
 * no third party: the request goes to the same server that served the page, and
 * the service worker caches it so the second visit needs no request at all.
 */
import index from './holidays/index.json'

/** Every country BridgeDays has checked data for. */
export const COUNTRIES = index.countries
export const DATA_YEARS = index.years
export const DATA_SOURCE = index.source
export const DATA_GENERATED_AT = index.generatedAt

/** @type {Map<string, Promise<object>>} */
const cache = new Map()

/**
 * Load one country's holidays. Repeated calls share one request.
 * @param {string} code ISO country code
 * @returns {Promise<object>}
 */
export function loadCountry(code) {
  const key = String(code || '').toUpperCase()
  if (!COUNTRIES.some((c) => c.code === key)) {
    return Promise.reject(new Error(`No holiday data for ${key}.`))
  }
  if (!cache.has(key)) {
    // Vite turns this into a hashed asset URL on this origin.
    const url = new URL(`./holidays/${key.toLowerCase()}.json`, import.meta.url)
    cache.set(
      key,
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`Could not load the holiday dates for ${key}.`)
          return r.json()
        })
        .catch((err) => {
          cache.delete(key)
          throw err
        })
    )
  }
  return cache.get(key)
}

/** Country metadata from the bundled index, without a fetch. */
export function countryInfo(code) {
  return COUNTRIES.find((c) => c.code === String(code || '').toUpperCase()) || null
}

/** Human name for a subdivision code. */
export function subdivisionName(code, sub) {
  const c = countryInfo(code)
  if (!c || !sub) return null
  const hit = c.subdivisions.find((s) => s.code === sub)
  return hit ? hit.name : sub
}

/**
 * The holidays that apply, across however many calendar years a range touches.
 * @param {object} data       a loaded country file
 * @param {{start: string, end: string}} range
 * @param {string|null} subdivision
 * @param {boolean} includeObservances
 */
export function holidaysForRange(data, range, subdivision, includeObservances = false) {
  const first = Number(range.start.slice(0, 4))
  const last = Number(range.end.slice(0, 4))
  const out = []
  const missing = []

  for (let y = first; y <= last; y++) {
    const key = String(y)
    const rows = data.years[key]
    if (!rows) {
      missing.push(y)
      continue
    }
    out.push(...rows)
    if (includeObservances && data.observances[key]) out.push(...data.observances[key])
  }

  const inRange = out.filter((h) => h.date >= range.start && h.date <= range.end)
  return { holidays: inRange, missingYears: missing }
}

/** Years this dataset can answer for. */
export function yearsAvailable(data) {
  return Object.keys(data.years)
    .map(Number)
    .sort((a, b) => a - b)
}
