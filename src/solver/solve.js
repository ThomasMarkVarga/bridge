/**
 * The solver's front door: take a calendar and what the person has to spend, give
 * back the breaks to book.
 */
import { calendarStats, holidaysLostToWeekends } from './calendar.js'
import { enumerateWindows, longestWindowLength } from './windows.js'
import { solveDP } from './dp.js'
import {
  TOTAL,
  LONGEST,
  SPREAD,
  windowConstraints,
  isObjective,
  DEFAULT_OBJECTIVE,
  DEFAULT_MIN_BREAK_LENGTH,
  DEFAULT_LONG_BREAK_MIN_LEVERAGE
} from './objectives.js'

/**
 * @typedef {object} Break
 * @property {string} start          ISO date of the first day off
 * @property {string} end            ISO date of the last day off
 * @property {number} length         days in the break, weekends and holidays included
 * @property {number} cost           days of leave it takes
 * @property {string[]} leaveDates   the days to actually request
 * @property {string[]} pinnedDates  days inside it the user fixed themselves
 * @property {number} efficiency     days off per day of leave
 * @property {number} startIndex
 * @property {number} endIndex
 */

/**
 * @typedef {object} Plan
 * @property {boolean} feasible
 * @property {string} [reason]          why there is no plan, in plain words
 * @property {Break[]} breaks
 * @property {number} leaveSpent
 * @property {number} totalDaysOff      days across the breaks that were booked
 * @property {number} efficiency
 * @property {number} unusedBudget
 * @property {string[]} leaveDates      every day to request, in order
 * @property {{budget: number, totalDaysOff: number}[]} curve
 * @property {object} stats
 */

/**
 * Solve for the best set of breaks.
 *
 * @param {import('./calendar.js').Day[]} calendar
 * @param {object} options
 * @param {number} options.budget                days of leave available
 * @param {string} [options.objective]
 * @param {number} [options.minBreakLength]      for the "several proper breaks" objective
 * @param {number|null} [options.maxBreaks]
 * @param {boolean} [options.weekendHolidaysGivenBack]  employer hands back holidays that fall on a day off
 * @param {number} [options.maxWindowLength]
 * @param {number[]} [options.excludeWindowSpans] internal, used by `alternatives`
 * @returns {Plan}
 */
export function solve(calendar, options = {}) {
  const objective = isObjective(options.objective) ? options.objective : DEFAULT_OBJECTIVE
  const stats = calendarStats(calendar)

  const allowance = Math.max(0, Math.floor(options.budget ?? 0))
  const givenBack = options.weekendHolidaysGivenBack ? holidaysLostToWeekends(calendar).length : 0
  const budget = allowance + givenBack

  // Leave the user has already committed by pinning days is spent before the
  // solver gets to choose anything.
  const pinnedCost = stats.pinnedCost
  const freeBudget = budget - pinnedCost

  const baseCurve = []
  const emptyPlan = (reason) => ({
    feasible: false,
    reason,
    breaks: [],
    leaveSpent: 0,
    totalDaysOff: 0,
    efficiency: 0,
    unusedBudget: budget,
    leaveDates: [],
    curve: baseCurve,
    objective,
    stats: { ...stats, budget, allowance, givenBack, pinnedCost }
  })

  if (calendar.length === 0) return emptyPlan('That date range has no days in it.')

  if (freeBudget < 0) {
    return emptyPlan(
      `The days you have already pinned come to ${pinnedCost}, which is more than the ${budget} you have to spend.`
    )
  }

  const constraints = windowConstraints(objective, options)
  const windows = enumerateWindows(calendar, {
    budget: freeBudget,
    maxWindowLength: options.maxWindowLength,
    ...constraints
  })

  const maxBreaks = options.maxBreaks == null ? null : Math.max(0, Math.floor(options.maxBreaks))
  const dpOptions = { budget: freeBudget, maxBreaks }

  let result
  if (objective === LONGEST) {
    const leverage = Number.isFinite(options.longBreakMinLeverage)
      ? options.longBreakMinLeverage
      : DEFAULT_LONG_BREAK_MIN_LEVERAGE
    result = solveLongest(calendar, windows, dpOptions, leverage)
  } else {
    result = solveDP(calendar, windows, dpOptions)
  }

  if (!result.feasible) {
    return emptyPlan(explainInfeasible(calendar, stats, maxBreaks, objective))
  }

  // Having leave to spend and nowhere to spend it is not a plan, it is a problem
  // the person needs told about. A budget of zero is different: that genuinely has
  // no answer to give, and saying so would be noise.
  if (result.chosen.length === 0 && budget > 0) {
    return emptyPlan(explainInfeasible(calendar, stats, maxBreaks, objective))
  }

  // The curve people want to read is "what would each extra day of leave buy me",
  // which is the plain question, so it is always drawn for the default objective
  // rather than whichever one is selected. Otherwise it would be full of gaps.
  const curveWindows =
    objective === TOTAL ? windows : enumerateWindows(calendar, { budget: freeBudget, maxWindowLength: options.maxWindowLength })
  const curveRun = objective === TOTAL ? result : solveDP(calendar, curveWindows, { budget: freeBudget, maxBreaks })
  const curve = (curveRun.curve || []).map((v, b) => ({
    budget: b + pinnedCost,
    totalDaysOff: v == null ? 0 : v
  }))

  const breaks = result.chosen.map((w) => toBreak(calendar, w))
  const leaveDates = breaks.flatMap((b) => b.leaveDates).sort()
  const leaveSpent = pinnedCost + result.spent
  const totalDaysOff = result.value

  return {
    feasible: true,
    breaks,
    leaveSpent,
    totalDaysOff,
    efficiency: leaveSpent > 0 ? totalDaysOff / leaveSpent : 0,
    unusedBudget: budget - leaveSpent,
    leaveDates,
    curve,
    objective,
    stats: { ...stats, budget, allowance, givenBack, pinnedCost }
  }
}

/**
 * "One long break": make the single longest stretch as long as it can be, then
 * spend whatever is left on the best remaining breaks.
 *
 * Done exactly, by requiring one window of the target length and letting the same
 * table handle the rest. If the longest window cannot fit into a legal plan (a cap
 * on the number of breaks can do that), it steps down to the next length.
 */
function solveLongest(calendar, windows, dpOptions, minLeverage) {
  // Only stretches that are decent value are allowed to be "the long one".
  // Otherwise the answer is always to spend the whole allowance on one unbroken
  // block of bought days, which is long but is not a holiday anybody wants.
  const eligible = windows.filter((w) => w.length / Math.max(w.cost, 1) >= minLeverage)
  const pool = eligible.length ? eligible : windows
  const lengths = [...new Set(pool.map((w) => w.length))].sort((a, b) => b - a)
  for (const target of lengths) {
    const run = solveDP(calendar, windows, { ...dpOptions, requireWindowLength: target })
    if (run.feasible) return run
  }
  // No window at all, so fall through to the plain solve, which will report the
  // baseline or say why nothing is possible.
  return solveDP(calendar, windows, dpOptions)
}

/** Turn a solver window into something a person can read and act on. */
function toBreak(calendar, w) {
  const days = calendar.slice(w.start, w.end + 1)
  // Days the user pinned still have to be requested and still cost leave. They
  // are only free to the solver because they were paid for before it started.
  const leaveDates = days.filter((d) => d.isWorkday && !d.blackout).map((d) => d.date)
  const pinnedDates = days.filter((d) => d.pinned).map((d) => d.date)
  const cost = leaveDates.length
  return {
    start: calendar[w.start].date,
    end: calendar[w.end].date,
    startIndex: w.start,
    endIndex: w.end,
    length: w.length,
    cost,
    leaveDates,
    pinnedDates,
    efficiency: cost > 0 ? w.length / cost : Infinity
  }
}

/** Say what went wrong in words someone can act on. */
function explainInfeasible(calendar, stats, maxBreaks, objective) {
  const pinnedDays = calendar.filter((d) => d.pinned)
  if (pinnedDays.length && maxBreaks != null) {
    return `You have pinned ${pinnedDays.length} days that fall in more than ${maxBreaks} separate stretches, so they cannot all fit inside ${maxBreaks} breaks. Raise the limit or unpin some days.`
  }
  if (stats.workdays === 0) {
    return 'Every day in this range is already a day off, so there is nothing to book.'
  }
  if (stats.blackoutDays >= stats.workdays) {
    return 'Every working day in this range is blacked out, so there is no leave to book. Clear some blacked-out days to see a plan.'
  }
  if (objective !== 'total') {
    return 'Nothing fits those settings. Try the plain "most time off" option, or ask for shorter breaks.'
  }
  return 'No plan fits those settings.'
}

export { TOTAL, LONGEST, SPREAD, DEFAULT_OBJECTIVE, DEFAULT_MIN_BREAK_LENGTH, longestWindowLength }
