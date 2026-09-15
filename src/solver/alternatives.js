/**
 * Other plans worth looking at.
 *
 * The best plan is one answer, not the only reasonable one. Someone might not want
 * the week the solver picked, so BridgeDays offers a few genuinely different shapes.
 *
 * "Different" has to mean different breaks, not the same break shifted by a day.
 * Each alternative is produced by refusing one of the breaks the previous plan
 * chose and solving again from scratch, and any result too close to a plan already
 * on the list is dropped.
 */
import { solve } from './solve.js'
import { buildCalendar } from './calendar.js'

/** Two plans count as the same if they share this share of their leave dates. */
const SAME_PLAN_OVERLAP = 0.7

/**
 * @param {import('./calendar.js').Day[]} calendar
 * @param {object} options  the same options `solve` takes
 * @param {number} [n]      how many alternatives to return, the best plan aside
 * @returns {import('./solve.js').Plan[]}
 */
export function alternatives(calendar, options = {}, n = 3) {
  const base = solve(calendar, options)
  if (!base.feasible || base.breaks.length === 0) return []

  /** @type {import('./solve.js').Plan[]} */
  const found = []
  const seen = [signature(base)]

  // Try refusing each break the best plan chose. Blacking out one working day
  // inside a break is enough to force a different shape there, and because the
  // solver re-runs from scratch the rest of the year is re-planned around it.
  const queue = base.breaks
    .map((b) => b.leaveDates)
    .filter((dates) => dates.length > 0)
    .sort((a, b) => b.length - a.length)

  for (const leaveDates of queue) {
    if (found.length >= n) break
    const blocked = [...(options.blackouts || []), ...leaveDates]
    const candidate = solve(rebuild(calendar, blocked), { ...options })
    if (!candidate.feasible || candidate.breaks.length === 0) continue

    const sig = signature(candidate)
    if (seen.some((s) => overlap(s, sig) > SAME_PLAN_OVERLAP)) continue

    seen.push(sig)
    found.push({ ...candidate, avoided: leaveDates.slice() })
  }

  return found.sort((a, b) => b.totalDaysOff - a.totalDaysOff)
}

/**
 * Rebuild a calendar with extra blacked-out days, keeping everything else.
 * Working from the day list rather than the original inputs keeps this honest:
 * whatever the caller classified, we preserve.
 */
function rebuild(calendar, extraBlackouts) {
  const block = new Set(extraBlackouts)
  return calendar.map((d) => {
    if (!block.has(d.date) || !d.isWorkday || d.pinned) return d
    return { ...d, kind: 'blackout', blackout: true }
  })
}

/** The set of days a plan asks you to book. */
function signature(plan) {
  return new Set(plan.leaveDates)
}

/** Jaccard overlap between two plans' leave dates. */
function overlap(a, b) {
  if (a.size === 0 && b.size === 0) return 1
  let shared = 0
  for (const d of a) if (b.has(d)) shared++
  return shared / (a.size + b.size - shared)
}

export { buildCalendar }
