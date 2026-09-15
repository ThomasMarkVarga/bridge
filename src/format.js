/**
 * Turning dates and counts into something a person would say out loud.
 *
 * All of it is calendar arithmetic on ISO strings, so nothing here can be
 * shifted by a timezone. Month and weekday names follow the page's language,
 * and the separator in a range is part of the translation rather than a hard
 * coded "to": English says "30 May to 7 June" and Romanian says "30 mai - 7
 * iunie", and neither is a good default for the other.
 *
 * The names are read at call time rather than captured at import, because the
 * language can change while the page is open and a calendar drawn before the
 * switch must not keep the old month names.
 */
import { dayOfWeek } from './solver/plainDate.js'
import { getLanguage, t } from './i18n/core.js'
import { CALENDAR_NAMES } from './i18n/calendarNames.js'

const names = () => CALENDAR_NAMES[getLanguage()] || CALENDAR_NAMES.en

export const months = () => names().months
export const monthsShort = () => names().monthsShort
export const weekdays = () => names().weekdays
export const weekdaysShort = () => names().weekdaysShort
export const weekdaysInitial = () => names().weekdaysInitial

/** One month's name, from a 1-based number. */
export const monthName = (month, { short = false } = {}) =>
  (short ? monthsShort() : months())[month - 1]

const parts = (iso) => ({
  year: Number(iso.slice(0, 4)),
  month: Number(iso.slice(5, 7)),
  day: Number(iso.slice(8, 10))
})

/** "6 June" or "6 June 2026" when the year matters. */
export function formatDate(iso, { withYear = false, short = false } = {}) {
  const { year, month, day } = parts(iso)
  const name = monthName(month, { short })
  return withYear ? `${day} ${name} ${year}` : `${day} ${name}`
}

/** "Mon 6 Jun" */
export function formatDayShort(iso) {
  const { month, day } = parts(iso)
  return `${weekdaysShort()[dayOfWeek(iso) - 1]} ${day} ${monthsShort()[month - 1]}`
}

export function weekdayName(iso) {
  return weekdays()[dayOfWeek(iso) - 1]
}

/**
 * "30 May to 7 June", collapsing the month when both ends share it, and adding
 * years only when the span crosses one.
 */
export function formatRange(start, end) {
  const a = parts(start)
  const b = parts(end)
  const join = t('format.rangeSeparator')
  if (start === end) return formatDate(start)
  if (a.year !== b.year) {
    return `${formatDate(start, { withYear: true })} ${join} ${formatDate(end, { withYear: true })}`
  }
  if (a.month === b.month) return `${a.day} ${join} ${b.day} ${monthName(a.month)}`
  return `${formatDate(start)} ${join} ${formatDate(end)}`
}

/** A list of dates as someone would paste into an email. */
export function formatDayList(dates) {
  return dates.map((d) => formatDate(d, { short: true })).join(', ')
}

/** ISO dates, one per line, for a system that wants them plain. */
export function formatIsoList(dates) {
  return dates.join('\n')
}

/**
 * A count with the right form of its noun.
 *
 * This replaced a `plural(n, 'day', 'days')` helper. Two forms is an English
 * assumption, and picking between them by asking whether the number is 1 is the
 * other one: Romanian wants "21 de zile" and there was no way to say that.
 * @param {string} unit a units.* key
 * @param {number} count
 */
export const counted = (unit, count) => t(`units.${unit}`, { count })

/** The sentence at the top of the page, for a screen reader. */
export function headlineSentence(plan) {
  if (!plan.feasible) return null
  return t('headline.sentence', {
    count: plan.leaveSpent,
    leave: counted('leaveDays', plan.leaveSpent),
    off: counted('daysOff', plan.totalDaysOff),
    breaks: counted('breaks', plan.breaks.length)
  })
}

/** "2.6 days off for every day you book." */
export function ratioSentence(plan) {
  if (!plan.feasible || plan.leaveSpent === 0) return null
  return t('headline.ratioSentence', { ratio: (plan.totalDaysOff / plan.leaveSpent).toFixed(1) })
}

/** The planning period, named. */
export function periodLabel(range) {
  const a = parts(range.start)
  const b = parts(range.end)
  const wholeYear = range.start === `${a.year}-01-01` && range.end === `${a.year}-12-31`
  if (wholeYear) return String(a.year)
  const join = t('format.rangeSeparator')
  const short = monthsShort()
  if (a.year === b.year) return `${short[a.month - 1]} ${join} ${short[b.month - 1]} ${a.year}`
  return `${short[a.month - 1]} ${a.year} ${join} ${short[b.month - 1]} ${b.year}`
}
