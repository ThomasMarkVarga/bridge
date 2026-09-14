/**
 * Turning dates and counts into something a person would say out loud.
 *
 * All of it is calendar arithmetic on ISO strings, so nothing here can be shifted
 * by a timezone. Month and weekday names are English, matching the page language.
 */
import { dayOfWeek } from './solver/plainDate.js'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const parts = (iso) => ({
  year: Number(iso.slice(0, 4)),
  month: Number(iso.slice(5, 7)),
  day: Number(iso.slice(8, 10))
})

/** "6 June" or "6 June 2026" when the year matters. */
export function formatDate(iso, { withYear = false, short = false } = {}) {
  const { year, month, day } = parts(iso)
  const name = short ? MONTHS_SHORT[month - 1] : MONTHS[month - 1]
  return withYear ? `${day} ${name} ${year}` : `${day} ${name}`
}

/** "Mon 6 Jun" */
export function formatDayShort(iso) {
  const { month, day } = parts(iso)
  return `${WEEKDAYS_SHORT[dayOfWeek(iso) - 1]} ${day} ${MONTHS_SHORT[month - 1]}`
}

export function weekdayName(iso) {
  return WEEKDAYS[dayOfWeek(iso) - 1]
}

/**
 * "30 May to 7 June", collapsing the month when both ends share it, and adding
 * years only when the span crosses one.
 */
export function formatRange(start, end) {
  const a = parts(start)
  const b = parts(end)
  if (start === end) return formatDate(start)
  if (a.year !== b.year) return `${formatDate(start, { withYear: true })} to ${formatDate(end, { withYear: true })}`
  if (a.month === b.month) return `${a.day} to ${b.day} ${MONTHS[a.month - 1]}`
  return `${formatDate(start)} to ${formatDate(end)}`
}

/** A list of dates as someone would paste into an email. */
export function formatDayList(dates) {
  return dates.map((d) => formatDate(d, { short: true })).join(', ')
}

/** ISO dates, one per line, for a system that wants them plain. */
export function formatIsoList(dates) {
  return dates.join('\n')
}

/** "1 day" or "3 days", never "1 days". */
export function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`
}

/** The sentence at the top of the page. */
export function headlineSentence(plan) {
  if (!plan.feasible) return null
  const breaks = plural(plan.breaks.length, 'break', 'breaks')
  return `${plural(plan.leaveSpent, 'leave day', 'leave days')} become ${plan.totalDaysOff} days off, in ${breaks}`
}

/** "2.6 days off for every day you book." */
export function ratioSentence(plan) {
  if (!plan.feasible || plan.leaveSpent === 0) return null
  return `${(plan.totalDaysOff / plan.leaveSpent).toFixed(1)} days off for every day you book`
}

/** The planning period, named. */
export function periodLabel(range) {
  const a = parts(range.start)
  const b = parts(range.end)
  const wholeYear = range.start === `${a.year}-01-01` && range.end === `${a.year}-12-31`
  if (wholeYear) return String(a.year)
  if (a.year === b.year) return `${MONTHS_SHORT[a.month - 1]} to ${MONTHS_SHORT[b.month - 1]} ${a.year}`
  return `${MONTHS_SHORT[a.month - 1]} ${a.year} to ${MONTHS_SHORT[b.month - 1]} ${b.year}`
}

export { MONTHS, MONTHS_SHORT, WEEKDAYS, WEEKDAYS_SHORT }
