/**
 * Your birthday, if your employer gives it to you.
 *
 * A birthday is not a date, it is a day that comes round every year, so it is
 * stored as a month and a day and turned into real dates for whatever range is
 * being planned. A leave year running April to March contains exactly one of
 * them; a two-year range contains two.
 *
 * Once it exists as a date it is an ordinary free day as far as the solver is
 * concerned: a day off you did not pay for, exactly like a public holiday, and
 * therefore something a break can be built around.
 */
import { isLeapYear, format, parseISO } from './plainDate.js'

/** `MM-DD`, the way a recurring day is written. */
const MONTH_DAY = /^(\d{2})-(\d{2})$/

/**
 * Is this a month and day that exists in some year?
 * The 29th of February counts: it exists in leap years and is handled below.
 * @param {string} monthDay
 */
export function isMonthDay(monthDay) {
  const m = MONTH_DAY.exec(monthDay || '')
  if (!m) return false
  const month = Number(m[1])
  const day = Number(m[2])
  if (month < 1 || month > 12 || day < 1) return false
  // Checked against a leap year, so the 29th of February is allowed through.
  const maxima = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= maxima[month - 1]
}

/**
 * The date a birthday falls on in a given year.
 *
 * Someone born on the 29th of February has no birthday at all in three years out
 * of four. Employers land on different answers for that and there is no standard
 * one, so Bridge takes the 28th, which keeps the day in the month it belongs to,
 * and says so plainly in the interface rather than deciding quietly.
 *
 * @param {string} monthDay `MM-DD`
 * @param {number} year
 * @returns {string} ISO date
 */
export function birthdayInYear(monthDay, year) {
  if (!isMonthDay(monthDay)) throw new RangeError(`not a month and day: ${monthDay}`)
  const month = Number(monthDay.slice(0, 2))
  const day = Number(monthDay.slice(3, 5))
  if (month === 2 && day === 29 && !isLeapYear(year)) return format(year, 2, 28)
  return format(year, month, day)
}

/**
 * Every occurrence of a birthday inside a planning range, as holiday entries the
 * calendar builder understands.
 *
 * `personal` marks them as yours rather than the country's, which keeps them out
 * of anything that counts public holidays: the headline sentence, and the
 * employer rule about holidays that land on a weekend.
 *
 * @param {{start: string, end: string}} range
 * @param {string} monthDay
 * @returns {{date: string, name: string, type: string, personal: boolean}[]}
 */
export function birthdayHolidays(range, monthDay) {
  if (!isMonthDay(monthDay)) return []
  parseISO(range.start)
  parseISO(range.end)

  const first = Number(range.start.slice(0, 4))
  const last = Number(range.end.slice(0, 4))
  const out = []

  for (let year = first; year <= last; year++) {
    const date = birthdayInYear(monthDay, year)
    if (date < range.start || date > range.end) continue
    out.push({ date, name: 'Your birthday', type: 'public', personal: true })
  }

  return out
}

/** Turn a full ISO date into the `MM-DD` the setting stores. */
export function toMonthDay(iso) {
  parseISO(iso)
  return iso.slice(5)
}

/**
 * A date input needs a real year to show anything, so pair the stored month and
 * day with a year that actually has that day in it.
 * @param {string} monthDay
 * @param {number} nearYear
 */
export function toInputDate(monthDay, nearYear) {
  if (!isMonthDay(monthDay)) return ''
  if (monthDay === '02-29') {
    // Walk back to a leap year so the 29th is selectable at all.
    let y = nearYear
    while (!isLeapYear(y)) y -= 1
    return format(y, 2, 29)
  }
  return `${nearYear}-${monthDay}`
}
