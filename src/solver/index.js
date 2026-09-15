/**
 * BridgeDays's solver. Pure JavaScript, no DOM, no React, no network.
 *
 * Typical use:
 *
 *   const calendar = buildCalendar({ range, workPattern, holidays })
 *   const plan = solve(calendar, { budget: 21 })
 *   plan.leaveDates  // the days to request
 */
export {
  buildCalendar,
  selectHolidays,
  calendarStats,
  holidaysLostToWeekends,
  indexByDate,
  normaliseDates,
  inRange,
  FREE,
  WORKDAY,
  BLACKOUT,
  PINNED,
  DEFAULT_WORK_PATTERN
} from './calendar.js'

export { enumerateWindows, bucketByEnd, longestWindowLength } from './windows.js'
export { solveDP } from './dp.js'
export { solve } from './solve.js'
export { alternatives } from './alternatives.js'
export {
  TOTAL,
  LONGEST,
  SPREAD,
  OBJECTIVES,
  OBJECTIVE_LABELS,
  DEFAULT_MIN_BREAK_LENGTH,
  isObjective
} from './objectives.js'
export * as plainDate from './plainDate.js'
