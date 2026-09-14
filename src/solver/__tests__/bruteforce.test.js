/**
 * The test that matters most.
 *
 * Everything else checks that the solver behaves sensibly. This checks that it is
 * actually right: on ranges short enough to search exhaustively, the answer the
 * dynamic programming gives must equal the best answer that exists. If these pass
 * across a few thousand randomly generated calendars, the claim on the tin holds.
 */
import { describe, it, expect } from 'vitest'
import { buildCalendar } from '../calendar.js'
import { enumerateWindows } from '../windows.js'
import { solveDP } from '../dp.js'
import { bruteForce } from './bruteforce.js'
import { addDays } from '../plainDate.js'

/** A small deterministic generator, so a failure can always be reproduced. */
function mulberry32(seed) {
  return function rng() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Build a random but realistic-looking calendar: a normal working week, a handful
 * of public holidays scattered about, and sometimes blacked-out or pinned days.
 */
function randomCalendar(rng, { days = 30, start = '2026-01-05', holidayRate = 0.08, blackoutRate = 0, pinRate = 0, workPattern } = {}) {
  const holidays = []
  const blackouts = []
  const pinned = []
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i)
    if (rng() < holidayRate) holidays.push({ date, name: `Holiday ${i}`, type: 'public' })
    if (rng() < blackoutRate) blackouts.push(date)
    if (rng() < pinRate) pinned.push(date)
  }
  return buildCalendar({
    range: { start, end: addDays(start, days - 1) },
    workPattern,
    holidays,
    blackouts,
    pinned
  })
}

function dpValue(calendar, opts) {
  const windows = enumerateWindows(calendar, {
    budget: opts.budget,
    minBreakLength: opts.minBreakLength
  })
  return solveDP(calendar, windows, opts)
}

describe('the solver finds the genuinely best answer', () => {
  it('matches exhaustive search on 200 random 30-day ranges with 4 days of leave', () => {
    const rng = mulberry32(20260101)
    for (let trial = 0; trial < 200; trial++) {
      const calendar = randomCalendar(rng, { days: 30 })
      const opts = { budget: 4 }
      const dp = dpValue(calendar, opts)
      const bf = bruteForce(calendar, opts)
      expect(
        dp.value,
        `trial ${trial} disagreed: solver ${dp.value}, exhaustive ${bf.value}\n${describeCalendar(calendar)}`
      ).toBe(bf.value)
    }
  })

  it('matches exhaustive search across every budget from 0 to 6', () => {
    const rng = mulberry32(7)
    for (let trial = 0; trial < 40; trial++) {
      const calendar = randomCalendar(rng, { days: 26 })
      for (let budget = 0; budget <= 6; budget++) {
        const dp = dpValue(calendar, { budget })
        const bf = bruteForce(calendar, { budget })
        expect(dp.value, `trial ${trial} budget ${budget}\n${describeCalendar(calendar)}`).toBe(bf.value)
      }
    }
  })

  it('matches exhaustive search when days are blacked out', () => {
    const rng = mulberry32(99)
    for (let trial = 0; trial < 120; trial++) {
      const calendar = randomCalendar(rng, { days: 28, blackoutRate: 0.15 })
      const dp = dpValue(calendar, { budget: 4 })
      const bf = bruteForce(calendar, { budget: 4 })
      expect(dp.value, `trial ${trial}\n${describeCalendar(calendar)}`).toBe(bf.value)
    }
  })

  it('matches exhaustive search when days are pinned', () => {
    const rng = mulberry32(31337)
    for (let trial = 0; trial < 120; trial++) {
      const calendar = randomCalendar(rng, { days: 28, pinRate: 0.1 })
      const pinnedCost = calendar.filter((d) => d.pinned).length
      const budget = 4
      if (pinnedCost > budget) continue
      const free = budget - pinnedCost
      const dp = dpValue(calendar, { budget: free })
      // Exhaustive search is told the same thing: pinned days are already off and
      // already paid for, so only the remaining leave is its to spend.
      const bf = bruteForce(calendar, { budget: free })
      expect(dp.value, `trial ${trial}\n${describeCalendar(calendar)}`).toBe(bf.value)
    }
  })

  it('matches exhaustive search with a cap on the number of breaks', () => {
    const rng = mulberry32(555)
    for (let trial = 0; trial < 120; trial++) {
      const calendar = randomCalendar(rng, { days: 28 })
      for (const maxBreaks of [1, 2, 3]) {
        const dp = dpValue(calendar, { budget: 4, maxBreaks })
        const bf = bruteForce(calendar, { budget: 4, maxBreaks })
        expect(dp.value, `trial ${trial} maxBreaks ${maxBreaks}\n${describeCalendar(calendar)}`).toBe(bf.value)
      }
    }
  })

  it('matches exhaustive search when short breaks are not allowed', () => {
    const rng = mulberry32(24680)
    for (let trial = 0; trial < 120; trial++) {
      const calendar = randomCalendar(rng, { days: 28 })
      for (const minBreakLength of [3, 4, 5]) {
        const dp = dpValue(calendar, { budget: 4, minBreakLength })
        const bf = bruteForce(calendar, { budget: 4, minBreakLength })
        expect(dp.value, `trial ${trial} minBreakLength ${minBreakLength}\n${describeCalendar(calendar)}`).toBe(bf.value)
      }
    }
  })

  it('matches exhaustive search on a four-day working week', () => {
    const rng = mulberry32(4444)
    for (let trial = 0; trial < 120; trial++) {
      const calendar = randomCalendar(rng, { days: 28, workPattern: [1, 2, 3, 4] })
      const dp = dpValue(calendar, { budget: 4 })
      const bf = bruteForce(calendar, { budget: 4 })
      expect(dp.value, `trial ${trial}\n${describeCalendar(calendar)}`).toBe(bf.value)
    }
  })

  it('matches exhaustive search on a Tuesday-to-Saturday week', () => {
    const rng = mulberry32(6060)
    for (let trial = 0; trial < 80; trial++) {
      const calendar = randomCalendar(rng, { days: 28, workPattern: [2, 3, 4, 5, 6] })
      const dp = dpValue(calendar, { budget: 3 })
      const bf = bruteForce(calendar, { budget: 3 })
      expect(dp.value, `trial ${trial}\n${describeCalendar(calendar)}`).toBe(bf.value)
    }
  })

  it('matches exhaustive search with blackouts and pins together', () => {
    const rng = mulberry32(13579)
    for (let trial = 0; trial < 150; trial++) {
      const calendar = randomCalendar(rng, { days: 26, blackoutRate: 0.12, pinRate: 0.08, holidayRate: 0.1 })
      const pinnedCost = calendar.filter((d) => d.pinned).length
      const budget = 4
      if (pinnedCost > budget) continue
      const free = budget - pinnedCost
      const dp = dpValue(calendar, { budget: free })
      const bf = bruteForce(calendar, { budget: free })
      expect(dp.value, `trial ${trial}\n${describeCalendar(calendar)}`).toBe(bf.value)
    }
  })

  it('matches exhaustive search when one long break is required', () => {
    const rng = mulberry32(80808)
    for (let trial = 0; trial < 80; trial++) {
      const calendar = randomCalendar(rng, { days: 26 })
      for (const requireWindowLength of [4, 6, 9]) {
        const windows = enumerateWindows(calendar, { budget: 4 })
        const dp = solveDP(calendar, windows, { budget: 4, requireWindowLength })
        const bf = bruteForce(calendar, { budget: 4, requireWindowLength })
        expect(dp.feasible, `feasibility trial ${trial} len ${requireWindowLength}`).toBe(bf.feasible)
        if (bf.feasible) {
          expect(dp.value, `trial ${trial} requireWindowLength ${requireWindowLength}\n${describeCalendar(calendar)}`).toBe(bf.value)
        }
      }
    }
  })

  it('the reconstructed plan really costs and delivers what the solver claims', () => {
    const rng = mulberry32(2718)
    for (let trial = 0; trial < 200; trial++) {
      const calendar = randomCalendar(rng, { days: 30, blackoutRate: 0.08, pinRate: 0.05 })
      const pinnedCost = calendar.filter((d) => d.pinned).length
      if (pinnedCost > 4) continue
      const budget = 4 - pinnedCost
      const dp = dpValue(calendar, { budget })
      if (!dp.feasible) continue

      const taken = new Set()
      for (const w of dp.chosen) for (const i of w.leaveIdx) taken.add(i)

      // The plan must not spend more than it was given, must not touch a blacked
      // out day, and must cover every day the user pinned.
      expect(taken.size).toBeLessThanOrEqual(budget)
      for (const i of taken) expect(calendar[i].blackout).toBe(false)
      for (const d of calendar) {
        if (!d.pinned) continue
        expect(dp.chosen.some((w) => w.start <= d.index && d.index <= w.end)).toBe(true)
      }

      // And re-scoring the plan from scratch must give the number it reported.
      const { value } = rescore(calendar, taken)
      expect(value).toBe(dp.value)
    }
  })
})

function rescore(calendar, taken) {
  const n = calendar.length
  const off = calendar.map((d, i) => d.isFree || d.pinned || taken.has(i))
  let value = 0
  let i = 0
  while (i < n) {
    if (!off[i]) {
      i++
      continue
    }
    let j = i
    while (j + 1 < n && off[j + 1]) j++
    let earned = false
    for (let k = i; k <= j; k++) if (taken.has(k) || calendar[k].pinned) earned = true
    if (earned) value += j - i + 1
    i = j + 1
  }
  return { value }
}

/** Render a calendar as a single line, so a failing trial can be read at a glance. */
function describeCalendar(calendar) {
  const glyph = (d) => (d.blackout ? 'X' : d.pinned ? 'P' : d.holidayName ? 'H' : d.weekend ? '.' : 'W')
  return `  ${calendar[0].date} ${calendar.map(glyph).join('')}`
}
