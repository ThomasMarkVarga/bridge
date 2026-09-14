/**
 * An exhaustive solver, used only by the tests.
 *
 * This tries literally every combination of days you could book and keeps the best
 * one. It is far too slow for real use, which is the whole reason the dynamic
 * programming solver exists, but on a short range it is obviously correct, and
 * that makes it the yardstick the real solver is measured against.
 */
import { WORKDAY } from '../calendar.js'

/**
 * Score one particular choice of days to book, using exactly the same definition
 * of a break that the app shows the user: a run of days off that you had a hand in
 * creating, counted end to end.
 *
 * @param {import('../calendar.js').Day[]} calendar
 * @param {Set<number>} taken indices of working days booked as leave
 */
export function scoreSelection(calendar, taken) {
  const n = calendar.length
  const off = new Array(n)
  for (let i = 0; i < n; i++) off[i] = calendar[i].isFree || calendar[i].pinned || taken.has(i)

  const runs = []
  let i = 0
  while (i < n) {
    if (!off[i]) {
      i++
      continue
    }
    let j = i
    while (j + 1 < n && off[j + 1]) j++
    // A run only counts as a break if you did something to make it: booked a day
    // inside it, or pinned one. A plain weekend is not a break you booked.
    let earned = false
    for (let k = i; k <= j; k++) {
      if (taken.has(k) || calendar[k].pinned) {
        earned = true
        break
      }
    }
    if (earned) runs.push({ start: i, end: j, length: j - i + 1 })
    i = j + 1
  }

  return {
    runs,
    value: runs.reduce((s, r) => s + r.length, 0),
    breakCount: runs.length
  }
}

/**
 * Exhaustive search over every set of working days that could be booked.
 *
 * @param {import('../calendar.js').Day[]} calendar
 * @param {object} opts
 * @param {number} opts.budget
 * @param {number|null} [opts.maxBreaks]
 * @param {number} [opts.minBreakLength]
 * @param {number} [opts.requireWindowLength]
 * @returns {{value: number, best: number[]|null, feasible: boolean}}
 */
export function bruteForce(calendar, opts) {
  const budget = opts.budget
  const maxBreaks = opts.maxBreaks ?? null
  const minBreakLength = opts.minBreakLength ?? 0
  const requireWindowLength = opts.requireWindowLength ?? 0

  // Only working days that are not blacked out can be booked.
  const candidates = []
  for (let i = 0; i < calendar.length; i++) {
    if (calendar[i].kind === WORKDAY) candidates.push(i)
  }

  let bestValue = -1
  let bestSet = null

  const chosen = []
  const taken = new Set()

  const consider = () => {
    const { runs, value, breakCount } = scoreSelection(calendar, taken)
    if (maxBreaks != null && breakCount > maxBreaks) return
    if (minBreakLength > 0) {
      // Short breaks are not allowed, unless the user pinned a day inside them:
      // those are off whatever happens.
      for (const r of runs) {
        if (r.length >= minBreakLength) continue
        let pinnedInside = false
        for (let k = r.start; k <= r.end; k++) {
          if (calendar[k].pinned) {
            pinnedInside = true
            break
          }
        }
        if (!pinnedInside) return
      }
    }
    if (requireWindowLength > 0 && !runs.some((r) => r.length >= requireWindowLength)) return
    if (value > bestValue) {
      bestValue = value
      bestSet = [...taken].sort((a, b) => a - b)
    }
  }

  const recurse = (from) => {
    consider()
    if (chosen.length >= budget) return
    for (let ci = from; ci < candidates.length; ci++) {
      const idx = candidates[ci]
      chosen.push(idx)
      taken.add(idx)
      recurse(ci + 1)
      taken.delete(idx)
      chosen.pop()
    }
  }

  recurse(0)

  return { value: bestValue < 0 ? 0 : bestValue, best: bestSet, feasible: bestValue >= 0 }
}
