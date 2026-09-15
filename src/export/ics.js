/**
 * Calendar files, written in the browser.
 *
 * Nothing is uploaded and nothing is generated on a server: the text below is
 * assembled from the plan already on screen and handed to the browser as a file.
 *
 * Two shapes, because two different things want them. One event per break is what
 * a person wants in their own calendar. One event per booked day is what some HR
 * systems read, because they count days rather than stretches.
 */
import { addDays } from '../solver/plainDate.js'
import { t } from '../i18n/core.js'
import { counted } from '../format.js'

/** RFC 5545 wants CRLF, always. */
const CRLF = '\r\n'

/** Strip the dashes: 2026-06-01 becomes 20260601. */
const compact = (iso) => iso.replace(/-/g, '')

/** Escape the characters that mean something in a calendar file. */
function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Fold long lines to 75 octets, as the spec requires. Folding counts bytes rather
 * than characters, so a Romanian holiday name does not break a calendar import.
 */
function fold(line) {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line

  const out = []
  let current = ''
  let currentBytes = 0
  let limit = 75

  for (const char of line) {
    const size = new TextEncoder().encode(char).length
    if (currentBytes + size > limit) {
      out.push(current)
      current = ' ' + char
      currentBytes = 1 + size
      limit = 75
    } else {
      current += char
      currentBytes += size
    }
  }
  if (current) out.push(current)
  return out.join(CRLF)
}

/** A stable identifier, derived from the content rather than from a random source. */
function uid(parts) {
  let hash = 2166136261
  const text = parts.join('|')
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `${(hash >>> 0).toString(36)}-${compact(parts[0] || '')}@bridge.local`
}

function stamp(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * @typedef {object} IcsEvent
 * @property {string} start  ISO date, inclusive
 * @property {string} end    ISO date, inclusive
 * @property {string} summary
 * @property {string} [description]
 */

/** Wrap events into a complete calendar. */
function calendar(events, { name = t('ics.calendarName') } = {}) {
  const dtstamp = stamp()
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BridgeDays//Leave planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`
  ]

  for (const ev of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid([ev.start, ev.end, ev.summary])}`,
      `DTSTAMP:${dtstamp}`,
      // An all-day event's end is exclusive, so it is the day after the last day.
      `DTSTART;VALUE=DATE:${compact(ev.start)}`,
      `DTEND;VALUE=DATE:${compact(addDays(ev.end, 1))}`,
      `SUMMARY:${escapeText(ev.summary)}`
    )
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`)
    lines.push('TRANSP:TRANSPARENT', 'END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.map(fold).join(CRLF) + CRLF
}

/** Plain-language description of a single break. */
function describeBreak(brk) {
  const per = brk.cost > 0 ? (brk.length / brk.cost).toFixed(1) : null
  const parts = [
    t('ics.breakDescription', {
      off: counted('daysOff', brk.length),
      leave: counted('leaveDays', brk.cost)
    }),
    per ? t('ics.perDay', { ratio: per }) : null,
    '',
    t('ics.daysToRequest'),
    ...brk.leaveDates.map((d) => `  ${d}`),
    '',
    t('ics.plannedWith')
  ]
  return parts.filter((p) => p !== null).join('\n')
}

/**
 * One all-day event per break.
 * @param {object[]} breaks
 */
export function breaksToIcs(breaks, { name = t('ics.calendarName') } = {}) {
  const events = breaks.map((b) => ({
    start: b.start,
    end: b.end,
    summary: t('ics.breakSummary', { days: counted('days', b.length) }),
    description: describeBreak(b)
  }))
  return calendar(events, { name })
}

/** A single break, on its own, because people book one break at a time. */
export function breakToIcs(brk) {
  return breaksToIcs([brk], { name: t('ics.singleBreakName', { date: brk.start }) })
}

/**
 * One all-day event per booked day, for systems that read a calendar and count
 * days rather than stretches.
 * @param {string[]} leaveDates
 */
export function leaveDaysToIcs(leaveDates, { name = t('ics.leaveCalendarName') } = {}) {
  const events = leaveDates.map((d) => ({
    start: d,
    end: d,
    summary: t('ics.annualLeave'),
    description: t('ics.annualLeaveDescription')
  }))
  return calendar(events, { name })
}

/** Hand a generated file to the browser. Nothing leaves the machine. */
export function downloadIcs(text, filename) {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export { calendar as buildCalendarFile }
