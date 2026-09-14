/**
 * Day classification: turn a planning range plus the user's situation into a flat
 * array of days, each labelled with what it costs to have off.
 *
 * Nothing here knows about React, the DOM, or how a plan is chosen.
 */
import { eachDay, dayOfWeek, toDayNumber } from './plainDate.js'

/** A day that is already off and costs nothing: a weekend or a public holiday. */
export const FREE = 'free'
/** A working day. Having it off costs one day of leave. */
export const WORKDAY = 'workday'
/** A working day the user has said they cannot take off. Never chosen. */
export const BLACKOUT = 'blackout'
/** A day the user has forced off. Costs leave if it was a working day. Always in the plan. */
export const PINNED = 'pinned'

/** Monday to Friday, the default working week. */
export const DEFAULT_WORK_PATTERN = [1, 2, 3, 4, 5]

/**
 * @typedef {object} Day
 * @property {string} date         ISO `YYYY-MM-DD`
 * @property {number} index        position in the calendar array
 * @property {number} dayOfWeek    1 (Monday) to 7 (Sunday)
 * @property {'free'|'workday'|'blackout'|'pinned'} kind
 * @property {boolean} isFree      off already, at no cost (weekend or holiday)
 * @property {boolean} isWorkday   a working day under the user's pattern
 * @property {boolean} blackout    user marked it unavailable
 * @property {boolean} pinned      user forced it off
 * @property {boolean} booked      pinned because leave is already booked or taken
 * @property {boolean} weekend     non-working under the work pattern
 * @property {string} [holidayName]
 * @property {string} [holidayNameEn]
 * @property {boolean} [holidaySubstitute]
 * @property {string} [label]
 */

/**
 * @typedef {object} HolidayInput
 * @property {string} date
 * @property {string} name
 * @property {string} [nameEn]
 * @property {string} [type]
 * @property {boolean} [substitute]
 * @property {string[]|null} [regions]
 */

/**
 * Select the holidays that actually apply to a person, given their region.
 *
 * `regions` absent means the holiday applies everywhere in the country. Otherwise
 * it lists the subdivisions that observe it, where `'*'` stands for "no subdivision
 * chosen", so a single membership test covers both cases.
 *
 * @param {HolidayInput[]} holidays
 * @param {string|null} [subdivision]
 * @param {{types?: string[]}} [opts]
 */
export function selectHolidays(holidays, subdivision = null, opts = {}) {
  const types = new Set(opts.types || ['public', 'bank'])
  const key = subdivision || '*'
  return holidays.filter(
    (h) => (!h.type || types.has(h.type)) && (!h.regions || h.regions.includes(key))
  )
}

/**
 * Build the day-by-day calendar the solver works on.
 *
 * @param {object} input
 * @param {{start: string, end: string}} input.range        inclusive ISO bounds
 * @param {number[]} [input.workPattern]                    ISO weekday numbers that are working days
 * @param {HolidayInput[]} [input.holidays]                 already filtered by region and type
 * @param {string[]} [input.blackouts]                      ISO dates the user cannot take
 * @param {string[]} [input.pinned]                         ISO dates the user forces off
 * @param {string[]} [input.booked]                         ISO dates of leave already booked or taken
 * @returns {Day[]}
 */
export function buildCalendar({
  range,
  workPattern = DEFAULT_WORK_PATTERN,
  holidays = [],
  blackouts = [],
  pinned = [],
  booked = []
}) {
  if (!range || !range.start || !range.end) throw new TypeError('range with start and end is required')

  const working = new Set(workPattern)
  if (working.size === 0) {
    // Not an error: someone with no working days has every day off already.
    // The solver handles it; it just has nothing to buy.
  }
  for (const d of working) {
    if (!Number.isInteger(d) || d < 1 || d > 7) throw new RangeError(`work pattern days must be 1-7, got ${d}`)
  }

  /** @type {Map<string, HolidayInput[]>} */
  const byDate = new Map()
  for (const h of holidays) {
    const list = byDate.get(h.date)
    if (list) list.push(h)
    else byDate.set(h.date, [h])
  }

  const blackoutSet = new Set(blackouts)
  const bookedSet = new Set(booked)
  const pinnedSet = new Set([...pinned, ...booked])

  const dates = eachDay(range.start, range.end)
  /** @type {Day[]} */
  const days = new Array(dates.length)

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const dow = dayOfWeek(date)
    const weekend = !working.has(dow)
    const hs = byDate.get(date)
    const isHoliday = Boolean(hs && hs.length)

    // A holiday only buys you anything if it lands on a day you would have worked.
    const isFree = weekend || isHoliday
    const isWorkday = !isFree

    // A blackout on a day that is already free is meaningless, so it is ignored.
    // Blacking out a day you were never going to work would only confuse the plan.
    const blackout = isWorkday && blackoutSet.has(date)
    // Pinning a day that is already free is likewise a no-op: it is off regardless.
    const pin = isWorkday && !blackout && pinnedSet.has(date)

    /** @type {Day} */
    const day = {
      date,
      index: i,
      dayOfWeek: dow,
      kind: pin ? PINNED : blackout ? BLACKOUT : isFree ? FREE : WORKDAY,
      isFree,
      isWorkday,
      weekend,
      blackout,
      pinned: pin,
      booked: pin && bookedSet.has(date)
    }

    if (isHoliday) {
      day.holidayName = hs.map((h) => h.name).join(' / ')
      const en = hs.map((h) => h.nameEn || h.name).join(' / ')
      if (en !== day.holidayName) day.holidayNameEn = en
      if (hs.some((h) => h.substitute)) day.holidaySubstitute = true
      day.label = day.holidayName
    } else if (weekend) {
      day.label = 'Weekend'
    }

    days[i] = day
  }

  return days
}

/**
 * Public holidays that fall on a day the user was not going to work anyway.
 *
 * Some employers hand one of these back as an extra day of leave. Bridge does not
 * assume that: it is a switch the user turns on, because it depends entirely on
 * their contract.
 *
 * @param {Day[]} calendar
 * @returns {Day[]}
 */
export function holidaysLostToWeekends(calendar) {
  return calendar.filter((d) => d.weekend && d.holidayName && !d.holidaySubstitute)
}

/**
 * Counts a person would recognise: working days in the range, days already free,
 * and how many days of leave the pinned days have already committed.
 * @param {Day[]} calendar
 */
export function calendarStats(calendar) {
  let workdays = 0
  let freeDays = 0
  let blackoutDays = 0
  let pinnedCost = 0
  let holidayCount = 0

  for (const d of calendar) {
    if (d.isFree) freeDays++
    else workdays++
    if (d.blackout) blackoutDays++
    if (d.pinned) pinnedCost++
    if (d.holidayName) holidayCount++
  }

  return {
    totalDays: calendar.length,
    workdays,
    freeDays,
    blackoutDays,
    pinnedCost,
    holidayCount,
    holidaysOnNonWorkingDays: holidaysLostToWeekends(calendar).length
  }
}

/** Index a calendar by ISO date for quick lookups. */
export function indexByDate(calendar) {
  const m = new Map()
  for (const d of calendar) m.set(d.date, d)
  return m
}

/** Sort ISO dates ascending, dropping duplicates. */
export function normaliseDates(dates) {
  return [...new Set(dates || [])].sort()
}

/** True when `date` lies inside the calendar's range. */
export function inRange(calendar, date) {
  if (!calendar.length) return false
  const n = toDayNumber(date)
  return n >= toDayNumber(calendar[0].date) && n <= toDayNumber(calendar[calendar.length - 1].date)
}
