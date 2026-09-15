/**
 * The exact solver.
 *
 * This is dynamic programming over candidate windows, not a heuristic and not a
 * greedy pass. For the sizes BridgeDays deals with (a year of days, a few dozen days
 * of leave) the problem is small enough to solve properly, and the whole point of
 * the app is that the answer it gives is the best one available.
 *
 * `dp[d][b][k][f]` is the best total break length achievable using days up to
 * index `d`, spending at most `b` days of leave, in at most `k` breaks, where `f`
 * records whether a window long enough to satisfy the "one long break" objective
 * has been taken yet.
 *
 * The `k` and `f` dimensions collapse to size 1 unless they are actually in use,
 * so the common case stays a plain two-dimensional table.
 */
import { bucketByEnd } from './windows.js'

/** Marks a state that cannot be reached. Every real value is zero or more. */
const UNREACHABLE = -1

/**
 * @typedef {object} DPResult
 * @property {boolean} feasible
 * @property {number} value                    total length of the chosen breaks
 * @property {import('./windows.js').Window[]} chosen
 * @property {number[]} curve                  best value for every budget 0..budget
 * @property {number} spent                    leave days the chosen windows cost
 */

/**
 * @param {import('./calendar.js').Day[]} calendar
 * @param {import('./windows.js').Window[]} windows
 * @param {object} opts
 * @param {number} opts.budget                 leave days available to spend here
 * @param {number|null} [opts.maxBreaks]       cap on the number of separate breaks
 * @param {number} [opts.requireWindowLength]  require one chosen window at least this long
 * @returns {DPResult}
 */
export function solveDP(calendar, windows, opts) {
  assignIds(windows)
  const n = calendar.length
  const budget = Math.max(0, Math.floor(opts.budget || 0))
  const maxBreaks = opts.maxBreaks == null ? null : Math.max(0, Math.floor(opts.maxBreaks))
  const requireLen = opts.requireWindowLength || 0

  const NB = budget + 1
  const NK = maxBreaks == null ? 1 : maxBreaks + 1
  const NF = requireLen > 0 ? 2 : 1

  // Two leading slots so `start - 2` is always addressable, even for a window
  // that begins on day 0 or day 1.
  const ROWS = n + 2
  const rowSize = NB * NK * NF
  const size = ROWS * rowSize

  const dp = new Int32Array(size).fill(UNREACHABLE)
  // What produced each state: -1 for "day not in any break", otherwise a window id.
  const choice = new Int32Array(size).fill(-1)

  const at = (d, b, k, f) => ((d + 2) * NB + b) * NK * NF + k * NF + f

  // Before the range starts, nothing is spent and nothing is achieved.
  for (let d = -2; d <= -1; d++) {
    for (let b = 0; b < NB; b++) {
      for (let k = 0; k < NK; k++) dp[at(d, b, k, 0)] = 0
    }
  }

  const endingAt = bucketByEnd(windows, n)
  const kStep = maxBreaks == null ? 0 : 1

  for (let d = 0; d < n; d++) {
    const day = calendar[d]
    // A day the user pinned is off no matter what, so it has to sit inside one of
    // the chosen breaks. Leaving it outside every break is not a legal plan.
    const mustBeCovered = day.pinned
    const bucket = endingAt[d]

    for (let b = 0; b < NB; b++) {
      for (let k = 0; k < NK; k++) {
        for (let f = 0; f < NF; f++) {
          let best = UNREACHABLE
          let bestChoice = -1

          if (!mustBeCovered) {
            const carry = dp[at(d - 1, b, k, f)]
            if (carry > best) {
              best = carry
              bestChoice = -1
            }
          }

          for (let wi = 0; wi < bucket.length; wi++) {
            const w = bucket[wi]
            if (w.cost > b) continue
            if (kStep && k < 1) continue
            // Taking this window satisfies the long-break requirement, so the
            // state before it may or may not have satisfied it already.
            const satisfies = NF === 2 && w.length >= requireLen
            if (satisfies) {
              // A window this long always lands in the satisfied state, so it can
              // never produce f === 0, and it can be reached from either.
              if (f === 0) continue
              const a = dp[at(w.start - 2, b - w.cost, k - kStep, 0)]
              const c = dp[at(w.start - 2, b - w.cost, k - kStep, 1)]
              const prev = a > c ? a : c
              if (prev !== UNREACHABLE && prev + w.length > best) {
                best = prev + w.length
                bestChoice = w.id
              }
              continue
            }
            const prev = dp[at(w.start - 2, b - w.cost, k - kStep, f)]
            if (prev === UNREACHABLE) continue
            const cand = prev + w.length
            if (cand > best) {
              best = cand
              bestChoice = w.id
            }
          }

          dp[at(d, b, k, f)] = best
          choice[at(d, b, k, f)] = bestChoice
        }
      }
    }
  }

  const lastK = NK - 1
  const lastF = NF - 1
  const finalRow = n - 1

  /** Best value for every budget, which is the diminishing-returns curve. */
  const curve = new Array(NB)
  for (let b = 0; b < NB; b++) {
    const v = dp[at(finalRow, b, lastK, lastF)]
    curve[b] = v === UNREACHABLE ? null : v
  }

  const value = dp[at(finalRow, budget, lastK, lastF)]
  if (value === UNREACHABLE) {
    return { feasible: false, value: 0, chosen: [], curve, spent: 0 }
  }

  // Walk the table backwards to recover which windows were taken.
  /** @type {import('./windows.js').Window[]} */
  const chosen = []
  let d = finalRow
  let b = budget
  let k = lastK
  let f = lastF
  let spent = 0

  while (d >= 0) {
    const id = choice[at(d, b, k, f)]
    if (id === -1) {
      d -= 1
      continue
    }
    const w = windows[id]
    chosen.push(w)
    spent += w.cost
    const satisfies = NF === 2 && w.length >= requireLen
    const nextB = b - w.cost
    const nextK = k - kStep
    let nextF = f
    if (satisfies && f === 1) {
      // Pick whichever predecessor the table actually came from.
      const a = dp[at(w.start - 2, nextB, nextK, 0)]
      const c = dp[at(w.start - 2, nextB, nextK, 1)]
      nextF = a >= c ? 0 : 1
    }
    d = w.start - 2
    b = nextB
    k = nextK
    f = nextF
  }

  chosen.reverse()
  return { feasible: true, value, chosen, curve, spent }
}

/**
 * Give every window a stable id, which is how the table refers back to them.
 * @param {import('./windows.js').Window[]} windows
 */
export function assignIds(windows) {
  for (let i = 0; i < windows.length; i++) windows[i].id = i
  return windows
}

export { UNREACHABLE }
