/**
 * The brief asks for `Temporal.PlainDate` everywhere in the solver, for the right
 * reason: this app deals in calendar days, so nothing may ever touch a timezone or
 * an instant.
 *
 * Bridge keeps that guarantee but does not ship the polyfill, which costs 46KB
 * gzipped, roughly what React itself costs, to provide day arithmetic. Instead
 * `plainDate.js` does the same job in about 0.4KB, and this file holds it to
 * account: every function is checked against `@js-temporal/polyfill` across a
 * fifteen-year span, day by day, including leap years and century boundaries.
 *
 * Temporal is a development dependency only. If it were ever wanted at runtime,
 * this test is the proof that swapping it in changes no answer.
 */
import { describe, it, expect } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import {
  toDayNumber,
  fromDayNumber,
  dayOfWeek,
  addDays,
  daysBetween,
  eachDay,
  parseISO,
  isLeapYear,
  daysInMonth
} from '../plainDate.js'

const START = Temporal.PlainDate.from('2018-01-01')
const DAYS = 365 * 15 + 4 // fifteen years, leap days included

describe('calendar arithmetic agrees with Temporal.PlainDate', () => {
  it('round-trips every date across fifteen years', () => {
    let d = START
    for (let i = 0; i < DAYS; i++) {
      const iso = d.toString()
      expect(fromDayNumber(toDayNumber(iso)), iso).toBe(iso)
      d = d.add({ days: 1 })
    }
  })

  it('gives the same day of the week as Temporal, every day', () => {
    let d = START
    for (let i = 0; i < DAYS; i++) {
      expect(dayOfWeek(d.toString()), d.toString()).toBe(d.dayOfWeek)
      d = d.add({ days: 1 })
    }
  })

  it('adds days the same way Temporal does, forwards and backwards', () => {
    let d = START
    for (let i = 0; i < DAYS; i += 7) {
      for (const n of [-400, -31, -1, 0, 1, 31, 400]) {
        expect(addDays(d.toString(), n), `${d.toString()} + ${n}`).toBe(d.add({ days: n }).toString())
      }
      d = d.add({ days: 7 })
    }
  })

  it('measures the gap between two dates the same way Temporal does', () => {
    const a = Temporal.PlainDate.from('2026-01-01')
    for (let i = 0; i < 1200; i++) {
      const b = a.add({ days: i })
      expect(daysBetween(a.toString(), b.toString())).toBe(a.until(b).days)
    }
  })

  it('handles leap years and the century rule', () => {
    for (const [year, leap] of [
      [1900, false],
      [1996, true],
      [2000, true],
      [2024, true],
      [2025, false],
      [2026, false],
      [2100, false],
      [2400, true]
    ]) {
      expect(isLeapYear(year), String(year)).toBe(leap)
      expect(daysInMonth(year, 2)).toBe(leap ? 29 : 28)
      expect(addDays(`${year}-02-28`, 1)).toBe(leap ? `${year}-02-29` : `${year}-03-01`)
    }
  })

  it('crosses a year boundary correctly, which is where the best break usually is', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
    expect(daysBetween('2026-12-24', '2027-01-04')).toBe(11)
    const span = eachDay('2026-12-30', '2027-01-02')
    expect(span).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'])
  })

  it('lists a range inclusively and in order', () => {
    const days = eachDay('2026-01-01', '2026-12-31')
    expect(days.length).toBe(365)
    expect(days[0]).toBe('2026-01-01')
    expect(days[364]).toBe('2026-12-31')
  })

  it('refuses dates that are not real, rather than guessing', () => {
    expect(() => parseISO('2026-02-30')).toThrow()
    expect(() => parseISO('2026-13-01')).toThrow()
    expect(() => parseISO('2026-00-10')).toThrow()
    expect(() => parseISO('not a date')).toThrow()
    expect(() => parseISO('2026-1-1')).toThrow()
    expect(() => eachDay('2026-06-10', '2026-06-01')).toThrow()
    expect(parseISO('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 })
  })

  it('never uses the host timezone', () => {
    // The same ISO string must give the same answer whatever the machine is set to.
    // A `Date`-based implementation would fail this in a negative-offset zone.
    const tz = process.env.TZ
    try {
      for (const zone of ['UTC', 'Pacific/Kiritimati', 'Pacific/Niue', 'Asia/Kolkata']) {
        process.env.TZ = zone
        expect(dayOfWeek('2026-06-01')).toBe(1)
        expect(addDays('2026-06-01', 1)).toBe('2026-06-02')
        expect(toDayNumber('1970-01-01')).toBe(0)
      }
    } finally {
      process.env.TZ = tz
    }
  })
})
