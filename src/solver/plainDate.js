/**
 * Calendar-day arithmetic. No timezones, no instants, no `Date`.
 *
 * Bridge only ever deals in calendar days: "the 4th of June" means the same thing
 * to everyone who reads the plan, wherever they are. So every date here is an ISO
 * `YYYY-MM-DD` string, and all arithmetic goes through a day number: the count of
 * days since 1970-01-01, which is exact for every Gregorian date.
 *
 * The conversion is Howard Hinnant's days-from-civil algorithm, which is exact and
 * branch-free for the proleptic Gregorian calendar.
 *
 * This module is a drop-in for the slice of `Temporal.PlainDate` the solver needs.
 * `plainDate.test.js` checks every function against `@js-temporal/polyfill` across
 * a multi-year span, so the two are provably identical over the range Bridge uses.
 * The polyfill costs 46KB gzipped; this file costs about 0.4KB. If Temporal is ever
 * wanted at runtime instead, it is this one file that changes.
 *
 * @see https://howardhinnant.github.io/date_algorithms.html
 */

const DAYS_PER_ERA = 146097
const EPOCH_SHIFT = 719468 // days between 0000-03-01 and 1970-01-01

/** Integer floor division, correct for negative numerators. */
const fdiv = (a, b) => Math.floor(a / b)

/**
 * Parse an ISO date string into its parts. Throws on anything that is not a real
 * calendar date, so a bad URL parameter fails loudly here rather than silently
 * producing a plan for the wrong days.
 * @param {string} iso
 * @returns {{year: number, month: number, day: number}}
 */
export function parseISO(iso) {
  if (typeof iso !== 'string') throw new TypeError(`date must be a string, got ${typeof iso}`)
  const m = /^(-?\d{4,6})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) throw new RangeError(`not an ISO date: ${iso}`)
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12) throw new RangeError(`month out of range: ${iso}`)
  if (day < 1 || day > daysInMonth(year, month)) throw new RangeError(`day out of range: ${iso}`)
  return { year, month, day }
}

/** @param {number} year @param {number} month @returns {number} */
export function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31
}

/** @param {number} year */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Days since 1970-01-01. Accepts an ISO string or already-parsed parts.
 * @param {string|{year:number,month:number,day:number}} date
 * @returns {number}
 */
export function toDayNumber(date) {
  const { year, month, day } = typeof date === 'string' ? parseISO(date) : date
  const y = year - (month <= 2 ? 1 : 0)
  const era = fdiv(y >= 0 ? y : y - 399, 400)
  const yoe = y - era * 400 // [0, 399]
  const doy = fdiv(153 * (month + (month > 2 ? -3 : 9)) + 2, 5) + day - 1 // [0, 365]
  const doe = yoe * 365 + fdiv(yoe, 4) - fdiv(yoe, 100) + doy // [0, 146096]
  return era * DAYS_PER_ERA + doe - EPOCH_SHIFT
}

/**
 * Inverse of {@link toDayNumber}.
 * @param {number} n
 * @returns {string} ISO date
 */
export function fromDayNumber(n) {
  const z = n + EPOCH_SHIFT
  const era = fdiv(z >= 0 ? z : z - (DAYS_PER_ERA - 1), DAYS_PER_ERA)
  const doe = z - era * DAYS_PER_ERA // [0, 146096]
  const yoe = fdiv(doe - fdiv(doe, 1460) + fdiv(doe, 36524) - fdiv(doe, DAYS_PER_ERA - 1), 365)
  const y = yoe + era * 400
  const doy = doe - (365 * yoe + fdiv(yoe, 4) - fdiv(yoe, 100))
  const mp = fdiv(5 * doy + 2, 153)
  const day = doy - fdiv(153 * mp + 2, 5) + 1
  const month = mp + (mp < 10 ? 3 : -9)
  return format(y + (month <= 2 ? 1 : 0), month, day)
}

/** @returns {string} zero-padded ISO date */
export function format(year, month, day) {
  const y = year < 0 ? '-' + String(-year).padStart(4, '0') : String(year).padStart(4, '0')
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * ISO day of week: Monday is 1, Sunday is 7. Day number 0 (1970-01-01) is a Thursday.
 * @param {string|number} date ISO string or day number
 */
export function dayOfWeek(date) {
  const n = typeof date === 'number' ? date : toDayNumber(date)
  return ((((n + 3) % 7) + 7) % 7) + 1
}

/** @param {string} iso @param {number} n @returns {string} */
export function addDays(iso, n) {
  return fromDayNumber(toDayNumber(iso) + n)
}

/** Whole days from `a` to `b`; negative if `b` is earlier. */
export function daysBetween(a, b) {
  return toDayNumber(b) - toDayNumber(a)
}

/** @param {string} a @param {string} b @returns {number} -1, 0 or 1 */
export function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Every ISO date from `start` to `end`, both ends included. */
export function eachDay(start, end) {
  const from = toDayNumber(start)
  const to = toDayNumber(end)
  if (to < from) throw new RangeError(`range ends before it starts: ${start} to ${end}`)
  const out = new Array(to - from + 1)
  for (let n = from; n <= to; n++) out[n - from] = fromDayNumber(n)
  return out
}
