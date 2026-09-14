/**
 * The URL is the state. There is no store and no server.
 *
 * Everything that makes a plan lives in the hash, so a link reproduces exactly
 * what the sender saw, and the back button undoes a change. The hash is used
 * rather than the query string because a hash is never sent to a server, not even
 * in a request log, and a leave plan is nobody's business before it is approved.
 *
 * The format is short and readable on purpose, so a suspicious person can look at
 * their own link and see that it holds dates and nothing else:
 *
 *   #c=RO&d=21&y=2026&o=spread
 *   #c=DE&r=BY&d=30&y=2026&o=longest&w=1234&p=2026-06-01,2026-06-02
 */
import { DEFAULT_WORK_PATTERN } from '../solver/calendar.js'
import { SPREAD, isObjective, DEFAULT_MIN_BREAK_LENGTH } from '../solver/objectives.js'

/** @typedef {object} AppState */

export const DEFAULT_STATE = Object.freeze({
  country: 'RO',
  subdivision: null,
  days: 21,
  year: new Date().getFullYear(),
  /** null means "the whole of `year`". */
  range: null,
  objective: SPREAD,
  minBreakLength: DEFAULT_MIN_BREAK_LENGTH,
  maxBreaks: null,
  workPattern: DEFAULT_WORK_PATTERN,
  weekendHolidaysGivenBack: false,
  includeObservances: false,
  pinned: [],
  blackouts: [],
  booked: []
})

const ISO = /^\d{4}-\d{2}-\d{2}$/
const listOf = (v) => (v ? v.split(',').filter((d) => ISO.test(d)) : [])
const clampInt = (v, lo, hi, fallback) => {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback
}

/**
 * Read state out of a hash string. Anything unrecognised is ignored rather than
 * throwing, because a truncated link pasted into a chat window should still open
 * something sensible instead of an error page.
 * @param {string} hash
 */
export function decodeState(hash = '') {
  const raw = hash.replace(/^#/, '')
  const q = new URLSearchParams(raw)
  const state = { ...DEFAULT_STATE }

  const c = (q.get('c') || '').toUpperCase()
  if (/^[A-Z]{2}$/.test(c)) state.country = c

  const r = q.get('r')
  if (r && /^[A-Z0-9-]{1,6}$/i.test(r)) state.subdivision = r.toUpperCase()

  state.days = clampInt(q.get('d'), 0, 365, DEFAULT_STATE.days)

  const thisYear = new Date().getFullYear()
  state.year = clampInt(q.get('y'), thisYear - 1, thisYear + 5, thisYear)

  const o = q.get('o')
  if (isObjective(o)) state.objective = o

  state.minBreakLength = clampInt(q.get('k'), 1, 60, DEFAULT_STATE.minBreakLength)

  const mb = q.get('mb')
  state.maxBreaks = mb === null || mb === '' ? null : clampInt(mb, 1, 60, null)

  // Work pattern is the ISO weekday digits that are working days: "1234" is a
  // four-day week ending on Thursday.
  const w = q.get('w')
  if (w && /^[1-7]{0,7}$/.test(w)) {
    const days = [...new Set(w.split('').map(Number))].sort()
    state.workPattern = days
  }

  state.weekendHolidaysGivenBack = q.get('gb') === '1'
  state.includeObservances = q.get('ob') === '1'

  state.pinned = listOf(q.get('p'))
  state.blackouts = listOf(q.get('x'))
  state.booked = listOf(q.get('b'))

  const rs = q.get('rs')
  const re = q.get('re')
  if (ISO.test(rs || '') && ISO.test(re || '') && rs <= re) state.range = { start: rs, end: re }

  return state
}

/**
 * Write state into a hash. Values equal to the default are left out, which keeps
 * the common link short enough to read at a glance.
 * @param {object} state
 */
export function encodeState(state) {
  const q = new URLSearchParams()
  const put = (key, value, fallback) => {
    if (value === undefined || value === null || value === fallback) return
    q.set(key, String(value))
  }

  put('c', state.country, undefined)
  put('r', state.subdivision, null)
  put('d', state.days, undefined)
  put('y', state.year, undefined)
  put('o', state.objective, DEFAULT_STATE.objective)
  if (state.objective === SPREAD) put('k', state.minBreakLength, DEFAULT_STATE.minBreakLength)
  put('mb', state.maxBreaks, null)

  const pattern = (state.workPattern || DEFAULT_WORK_PATTERN).join('')
  if (pattern !== DEFAULT_WORK_PATTERN.join('')) q.set('w', pattern)

  if (state.weekendHolidaysGivenBack) q.set('gb', '1')
  if (state.includeObservances) q.set('ob', '1')
  if (state.pinned?.length) q.set('p', [...state.pinned].sort().join(','))
  if (state.blackouts?.length) q.set('x', [...state.blackouts].sort().join(','))
  if (state.booked?.length) q.set('b', [...state.booked].sort().join(','))
  if (state.range) {
    q.set('rs', state.range.start)
    q.set('re', state.range.end)
  }

  return '#' + q.toString()
}

/** The full shareable link for a state. */
export function permalink(state, base = window.location.href) {
  const url = new URL(base)
  url.hash = encodeState(state)
  return url.toString()
}

/**
 * Push a new state into history without reloading. Replacing rather than pushing
 * is used for continuous changes like dragging a slider, so the back button steps
 * through decisions rather than keystrokes.
 */
export function writeState(state, { replace = false } = {}) {
  const hash = encodeState(state)
  if (hash === window.location.hash) return
  const url = window.location.pathname + window.location.search + hash
  if (replace) window.history.replaceState(null, '', url)
  else window.history.pushState(null, '', url)
}

export function readState() {
  return decodeState(window.location.hash)
}

/**
 * The one thing that may be remembered on this device, and only if asked for.
 * Country and allowance, nothing else. No plan, no dates, no identifier.
 */
const REMEMBER_KEY = 'bridge.remember'

export function loadRemembered() {
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (!v || typeof v !== 'object') return null
    const out = {}
    if (/^[A-Z]{2}$/.test(v.country || '')) out.country = v.country
    if (typeof v.subdivision === 'string' || v.subdivision === null) out.subdivision = v.subdivision
    if (Number.isFinite(v.days)) out.days = Math.min(365, Math.max(0, v.days))
    return Object.keys(out).length ? out : null
  } catch {
    return null
  }
}

export function saveRemembered(state) {
  try {
    window.localStorage.setItem(
      REMEMBER_KEY,
      JSON.stringify({ country: state.country, subdivision: state.subdivision, days: state.days })
    )
    return true
  } catch {
    return false
  }
}

export function forgetRemembered() {
  try {
    window.localStorage.removeItem(REMEMBER_KEY)
    return true
  } catch {
    return false
  }
}

export function isRemembering() {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== null
  } catch {
    return false
  }
}

/** The planning range a state implies. */
export function rangeOf(state) {
  return state.range || { start: `${state.year}-01-01`, end: `${state.year}-12-31` }
}
