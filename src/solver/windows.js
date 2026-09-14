/**
 * Candidate break enumeration.
 *
 * A window is a run of consecutive days that would all be off if you booked it.
 * Its value is its whole length, weekends and public holidays included, because
 * that is what a break actually feels like. Its cost is only the working days
 * inside it that you would have to spend leave on.
 */
import { WORKDAY } from './calendar.js'

/**
 * @typedef {object} Window
 * @property {number} start        index of the first day
 * @property {number} end          index of the last day
 * @property {number} length       end - start + 1, the value of the window
 * @property {number} cost         working days inside that cost leave
 * @property {number[]} leaveIdx   indices of those working days
 * @property {boolean} hasPinned   covers at least one day the user forced off
 */

/**
 * A day is already off, at no extra cost, if it is free (weekend or public
 * holiday) or the user has pinned it.
 * @param {import('./calendar.js').Day} d
 */
const isOffAlready = (d) => d.isFree || d.pinned

/**
 * Enumerate every candidate break, pruned to the maximal ones.
 *
 * Two rules do the pruning:
 *
 * 1. A window must be *maximal*: the day before it and the day after it must be
 *    working days that stay worked (or the edge of the range). If a free day sits
 *    next to a window, extending over it costs nothing and adds a day, so the
 *    longer window always dominates and the shorter one can be dropped. This is
 *    what keeps the candidate set in the low thousands rather than the tens of
 *    thousands.
 *
 * 2. A window must cost at least one day of leave, or cover a pinned day. A run of
 *    days you get off anyway is not a break you booked, and counting it would
 *    inflate the headline number until it meant nothing.
 *
 * @param {import('./calendar.js').Day[]} calendar
 * @param {object} [opts]
 * @param {number} [opts.budget]           drop windows that cost more than this
 * @param {number} [opts.maxWindowLength]  ceiling on break length, if ever needed
 * @param {number} [opts.minBreakLength]   drop shorter windows (pinned ones are kept)
 * @returns {Window[]}
 */
export function enumerateWindows(calendar, opts = {}) {
  const n = calendar.length
  const budget = Number.isFinite(opts.budget) ? opts.budget : Infinity
  const maxLen = Number.isFinite(opts.maxWindowLength) ? opts.maxWindowLength : Infinity
  const minLen = Number.isFinite(opts.minBreakLength) ? opts.minBreakLength : 0

  /** @type {Window[]} */
  const windows = []

  for (let i = 0; i < n; i++) {
    // A window cannot start on a day the user has blacked out.
    if (calendar[i].blackout) continue
    // Maximality on the left: the day before must be a working day that stays
    // worked, or the start of the range.
    if (i > 0 && isOffAlready(calendar[i - 1])) continue

    let cost = 0
    let hasPinned = false
    /** @type {number[]} */
    const leaveIdx = []

    for (let j = i; j < n; j++) {
      const day = calendar[j]
      if (day.blackout) break // cannot extend through a day that is off limits
      if (day.kind === WORKDAY) {
        cost++
        if (cost > budget) break
        leaveIdx.push(j)
      }
      if (day.pinned) hasPinned = true

      const length = j - i + 1
      if (length > maxLen) break

      // Maximality on the right.
      if (j + 1 < n && isOffAlready(calendar[j + 1])) continue

      // A run that costs nothing and holds no pinned day is just a weekend.
      if (cost === 0 && !hasPinned) continue

      // Short windows are dropped when the user asked for decent-length breaks,
      // but never a window that carries a day they pinned: that day is off
      // whatever happens, so some window has to cover it.
      if (length < minLen && !hasPinned) continue

      windows.push({ start: i, end: j, length, cost, leaveIdx: leaveIdx.slice(), hasPinned })
    }
  }

  return windows
}

/**
 * Bucket windows by the day they end on, which is how the solver walks them.
 * @param {Window[]} windows
 * @param {number} n
 * @returns {Window[][]}
 */
export function bucketByEnd(windows, n) {
  const buckets = Array.from({ length: n }, () => [])
  for (const w of windows) buckets[w.end].push(w)
  return buckets
}

/** The longest window in a candidate set, or 0 if there are none. */
export function longestWindowLength(windows) {
  let best = 0
  for (const w of windows) if (w.length > best) best = w.length
  return best
}
