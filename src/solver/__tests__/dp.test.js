/**
 * Behaviour of the solver on the awkward cases: nothing to spend, more to spend
 * than there are days, every day blocked, days pinned in odd places, unusual
 * working weeks, and ranges that cross a year boundary.
 */
import { describe, it, expect } from 'vitest'
import { buildCalendar, calendarStats, DEFAULT_WORK_PATTERN } from '../calendar.js'
import { enumerateWindows } from '../windows.js'
import { solve } from '../solve.js'
import { alternatives } from '../alternatives.js'
import { TOTAL, LONGEST, SPREAD } from '../objectives.js'
import { addDays } from '../plainDate.js'

/** A plain year with no holidays at all, for isolating behaviour. */
function bareYear(year = 2026, extra = {}) {
  return buildCalendar({ range: { start: `${year}-01-01`, end: `${year}-12-31` }, ...extra })
}

describe('a budget of zero', () => {
  it('reports the baseline instead of crashing', () => {
    const plan = solve(bareYear(), { budget: 0 })
    expect(plan.feasible).toBe(true)
    expect(plan.breaks).toEqual([])
    expect(plan.totalDaysOff).toBe(0)
    expect(plan.leaveSpent).toBe(0)
    expect(plan.unusedBudget).toBe(0)
    expect(plan.leaveDates).toEqual([])
  })

  it('still counts the days the person already has off', () => {
    const plan = solve(bareYear(), { budget: 0 })
    // 2026 has 104 weekend days. Those are off whether or not you book anything.
    expect(plan.stats.freeDays).toBe(104)
    expect(plan.stats.workdays).toBe(261)
  })

  it('keeps a pinned day even with nothing left to spend', () => {
    const cal = bareYear(2026, { pinned: ['2026-06-10'] })
    const plan = solve(cal, { budget: 1 })
    expect(plan.feasible).toBe(true)
    expect(plan.leaveDates).toContain('2026-06-10')
    expect(plan.leaveSpent).toBe(1)
    expect(plan.unusedBudget).toBe(0)
  })
})

describe('a budget larger than the number of working days', () => {
  it('takes everything and never reports negative leftover', () => {
    const cal = buildCalendar({ range: { start: '2026-03-02', end: '2026-03-13' } }) // 2 working weeks
    const plan = solve(cal, { budget: 40, objective: TOTAL })
    expect(plan.feasible).toBe(true)
    expect(plan.totalDaysOff).toBe(12) // the whole range, weekend in the middle included
    expect(plan.leaveSpent).toBe(10)
    expect(plan.unusedBudget).toBe(30)
    expect(plan.unusedBudget).toBeGreaterThanOrEqual(0)
  })

  it('never books more days than exist', () => {
    const plan = solve(bareYear(), { budget: 400, objective: TOTAL })
    expect(plan.leaveSpent).toBeLessThanOrEqual(plan.stats.workdays)
    expect(plan.unusedBudget).toBeGreaterThanOrEqual(0)
    expect(plan.totalDaysOff).toBe(365)
  })
})

describe('when leave cannot be taken', () => {
  it('explains an entirely blacked-out range rather than failing', () => {
    const range = { start: '2026-03-02', end: '2026-03-06' }
    const blackouts = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06']
    const plan = solve(buildCalendar({ range, blackouts }), { budget: 10 })
    expect(plan.feasible).toBe(false)
    expect(plan.reason).toMatch(/blacked-out|blacked out/i)
    expect(plan.reason).not.toMatch(/undefined|NaN|error/i)
  })

  it('explains a working week with no working days in it', () => {
    const cal = buildCalendar({ range: { start: '2026-03-07', end: '2026-03-08' } }) // a weekend
    const plan = solve(cal, { budget: 5 })
    expect(plan.feasible).toBe(false)
    expect(plan.reason).toMatch(/already a day off/i)
  })

  it('says so when pinned days cost more than the allowance', () => {
    const cal = bareYear(2026, { pinned: ['2026-06-01', '2026-06-02', '2026-06-03'] })
    const plan = solve(cal, { budget: 2 })
    expect(plan.feasible).toBe(false)
    expect(plan.reason).toMatch(/already pinned/i)
  })

  it('says so when pinned days will not fit inside the break limit', () => {
    const cal = bareYear(2026, { pinned: ['2026-02-10', '2026-06-10', '2026-10-13'] })
    const plan = solve(cal, { budget: 10, maxBreaks: 1 })
    expect(plan.feasible).toBe(false)
    expect(plan.reason).toMatch(/separate stretches|unpin/i)
  })

  it('never lets a blacked-out day into a plan', () => {
    const blackouts = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05']
    const plan = solve(bareYear(2026, { blackouts }), { budget: 20, objective: TOTAL })
    for (const d of blackouts) expect(plan.leaveDates).not.toContain(d)
  })
})

describe('pinned days', () => {
  it('keeps two pins far apart and spends the rest well', () => {
    const cal = bareYear(2026, { pinned: ['2026-02-11', '2026-09-16'] })
    const plan = solve(cal, { budget: 6, objective: TOTAL })
    expect(plan.feasible).toBe(true)
    expect(plan.leaveDates).toContain('2026-02-11')
    expect(plan.leaveDates).toContain('2026-09-16')
    expect(plan.leaveSpent).toBe(6)
    // Both pins are Wednesdays, so each sits in a break of its own.
    const withPins = plan.breaks.filter((b) => b.pinnedDates.length > 0)
    expect(withPins.length).toBe(2)
  })

  it('treats a pin on a day that is already off as doing nothing', () => {
    const cal = bareYear(2026, { pinned: ['2026-06-06'] }) // a Saturday
    expect(calendarStats(cal).pinnedCost).toBe(0)
    const plan = solve(cal, { budget: 5, objective: TOTAL })
    expect(plan.leaveSpent).toBe(5)
  })

  it('counts leave already booked against the allowance', () => {
    const cal = bareYear(2026, { booked: ['2026-07-07', '2026-07-08'] })
    const plan = solve(cal, { budget: 10, objective: TOTAL })
    expect(plan.leaveSpent).toBe(10)
    expect(plan.leaveDates).toContain('2026-07-07')
    expect(plan.leaveDates).toContain('2026-07-08')
    expect(cal.find((d) => d.date === '2026-07-07').booked).toBe(true)
  })
})

describe('working weeks that are not Monday to Friday', () => {
  it('changes the shape of every bridge on a four-day week', () => {
    const range = { start: '2026-01-01', end: '2026-12-31' }
    const five = buildCalendar({ range, workPattern: DEFAULT_WORK_PATTERN })
    const four = buildCalendar({ range, workPattern: [1, 2, 3, 4] }) // Friday off

    expect(calendarStats(five).workdays).toBe(261)
    expect(calendarStats(four).workdays).toBe(209)

    const planFive = solve(five, { budget: 10, objective: TOTAL })
    const planFour = solve(four, { budget: 10, objective: TOTAL })

    // With Fridays already free, a single Thursday now buys a four-day weekend.
    expect(planFour.totalDaysOff).toBeGreaterThan(planFive.totalDaysOff)
    expect(planFour.leaveDates.every((d) => four.find((x) => x.date === d).dayOfWeek !== 5)).toBe(true)
  })

  it('handles a Tuesday to Saturday retail week', () => {
    const cal = buildCalendar({
      range: { start: '2026-01-01', end: '2026-12-31' },
      workPattern: [2, 3, 4, 5, 6]
    })
    const plan = solve(cal, { budget: 10, objective: TOTAL })
    expect(plan.feasible).toBe(true)
    // Sundays and Mondays are the weekend here, so no leave should land on them.
    for (const d of plan.leaveDates) {
      const dow = cal.find((x) => x.date === d).dayOfWeek
      expect([7, 1]).not.toContain(dow)
    }
  })

  it('copes with someone who works every day', () => {
    const cal = buildCalendar({
      range: { start: '2026-06-01', end: '2026-06-30' },
      workPattern: [1, 2, 3, 4, 5, 6, 7]
    })
    const plan = solve(cal, { budget: 5, objective: TOTAL })
    expect(plan.feasible).toBe(true)
    expect(plan.totalDaysOff).toBe(5) // no free days to bridge to, so five separate days
  })
})

describe('a leave year that is not a calendar year', () => {
  it('plans across April to March and uses holidays from both years', () => {
    const holidays = [
      { date: '2026-12-25', name: 'Christmas Day', type: 'public' },
      { date: '2026-12-26', name: 'Boxing Day', type: 'public' },
      { date: '2027-01-01', name: "New Year's Day", type: 'public' }
    ]
    const cal = buildCalendar({ range: { start: '2026-04-01', end: '2027-03-31' }, holidays })
    expect(cal.length).toBe(365)
    expect(cal[0].date).toBe('2026-04-01')
    expect(cal[cal.length - 1].date).toBe('2027-03-31')
    expect(cal.find((d) => d.date === '2026-12-25').isFree).toBe(true)
    expect(cal.find((d) => d.date === '2027-01-01').isFree).toBe(true)

    const plan = solve(cal, { budget: 10 })
    expect(plan.feasible).toBe(true)
    // The Christmas to New Year bridge spans the year boundary, which is the whole
    // reason a leave year that is not a calendar year has to work.
    const bridging = plan.breaks.find((b) => b.start <= '2026-12-25' && b.end >= '2027-01-01')
    expect(bridging).toBeTruthy()
    expect(bridging.length).toBeGreaterThanOrEqual(10)
  })

  it('handles a range of a single day', () => {
    const cal = buildCalendar({ range: { start: '2026-06-10', end: '2026-06-10' } })
    expect(cal.length).toBe(1)
    const plan = solve(cal, { budget: 5, objective: TOTAL })
    expect(plan.feasible).toBe(true)
    expect(plan.totalDaysOff).toBe(1)
    expect(plan.leaveSpent).toBe(1)
  })
})

describe('the employer rule about holidays on a weekend', () => {
  it('is off by default and adds days when switched on', () => {
    const holidays = [
      { date: '2026-08-15', name: 'On a Saturday', type: 'public' },
      { date: '2026-11-01', name: 'On a Sunday', type: 'public' }
    ]
    const cal = buildCalendar({ range: { start: '2026-01-01', end: '2026-12-31' }, holidays })

    const off = solve(cal, { budget: 10, objective: TOTAL })
    const on = solve(cal, { budget: 10, objective: TOTAL, weekendHolidaysGivenBack: true })

    expect(off.stats.givenBack).toBe(0)
    expect(on.stats.givenBack).toBe(2)
    expect(on.stats.budget).toBe(12)
    expect(on.leaveSpent).toBeGreaterThan(off.leaveSpent)
  })
})

describe('caps and floors', () => {
  it('never returns more breaks than allowed', () => {
    for (const maxBreaks of [1, 2, 5]) {
      const plan = solve(bareYear(), { budget: 20, maxBreaks, objective: TOTAL })
      expect(plan.feasible).toBe(true)
      expect(plan.breaks.length).toBeLessThanOrEqual(maxBreaks)
    }
  })

  it('never returns a break shorter than asked for', () => {
    for (const minBreakLength of [4, 7, 10]) {
      const plan = solve(bareYear(), { budget: 20, objective: SPREAD, minBreakLength })
      expect(plan.feasible).toBe(true)
      for (const b of plan.breaks) expect(b.length).toBeGreaterThanOrEqual(minBreakLength)
    }
  })

  it('puts most of the leave into one stretch when asked for a long trip', () => {
    const plan = solve(bareYear(), { budget: 15, objective: LONGEST })
    expect(plan.feasible).toBe(true)
    const longest = Math.max(...plan.breaks.map((b) => b.length))
    expect(longest).toBeGreaterThanOrEqual(9)
    // And it must not swallow the whole allowance in one unbroken block.
    expect(longest / plan.breaks.find((b) => b.length === longest).cost).toBeGreaterThanOrEqual(1.8)
  })
})

describe('the numbers the interface shows', () => {
  it('reports a curve covering every budget up to the allowance', () => {
    const plan = solve(bareYear(), { budget: 12, objective: TOTAL })
    expect(plan.curve.length).toBe(13)
    expect(plan.curve[0]).toEqual({ budget: 0, totalDaysOff: 0 })
    for (let i = 1; i < plan.curve.length; i++) {
      expect(plan.curve[i].totalDaysOff).toBeGreaterThanOrEqual(plan.curve[i - 1].totalDaysOff)
    }
  })

  it('has a curve that never rises, because the best days go first', () => {
    const plan = solve(bareYear(), { budget: 20, objective: TOTAL })
    const gains = []
    for (let i = 1; i < plan.curve.length; i++) {
      gains.push(plan.curve[i].totalDaysOff - plan.curve[i - 1].totalDaysOff)
    }
    for (let i = 1; i < gains.length; i++) expect(gains[i]).toBeLessThanOrEqual(gains[i - 1])
  })

  it('adds up: the breaks account for every day and every day booked', () => {
    const plan = solve(bareYear(), { budget: 18 })
    const summed = plan.breaks.reduce((s, b) => s + b.length, 0)
    const cost = plan.breaks.reduce((s, b) => s + b.cost, 0)
    expect(summed).toBe(plan.totalDaysOff)
    expect(cost).toBe(plan.leaveSpent)
    expect(plan.leaveDates.length).toBe(plan.leaveSpent)
    expect(new Set(plan.leaveDates).size).toBe(plan.leaveDates.length)
  })

  it('returns breaks in date order, none of them touching', () => {
    const plan = solve(bareYear(), { budget: 25, objective: TOTAL })
    for (let i = 1; i < plan.breaks.length; i++) {
      expect(plan.breaks[i].start > plan.breaks[i - 1].end).toBe(true)
      // There must be at least one working day between two breaks, or they would
      // have been a single longer break.
      expect(addDays(plan.breaks[i - 1].end, 1) < plan.breaks[i].start).toBe(true)
    }
  })
})

describe('other plans worth looking at', () => {
  it('offers alternatives that swap whole breaks, not shift them by a day', () => {
    // A year with holidays in it, because in a year with none every plan is the
    // same plan wearing different dates, and there is nothing to offer.
    const holidays = [
      { date: '2026-04-03', name: 'Good Friday', type: 'public' },
      { date: '2026-04-06', name: 'Easter Monday', type: 'public' },
      { date: '2026-05-01', name: 'May Day', type: 'public' },
      { date: '2026-08-31', name: 'Late summer', type: 'public' },
      { date: '2026-12-25', name: 'Christmas Day', type: 'public' },
      { date: '2026-12-28', name: 'Boxing Day', type: 'public' }
    ]
    const cal = buildCalendar({ range: { start: '2026-01-01', end: '2026-12-31' }, holidays })
    const alts = alternatives(cal, { budget: 15 }, 3)
    const base = solve(cal, { budget: 15 })
    expect(alts.length).toBeGreaterThan(0)
    for (const alt of alts) {
      const shared = alt.leaveDates.filter((d) => base.leaveDates.includes(d)).length
      const union = new Set([...alt.leaveDates, ...base.leaveDates]).size
      expect(shared / union).toBeLessThanOrEqual(0.7)
      expect(alt.totalDaysOff).toBeLessThanOrEqual(base.totalDaysOff)
    }
  })

  it('returns nothing rather than nonsense when there is no room to differ', () => {
    const cal = buildCalendar({ range: { start: '2026-03-02', end: '2026-03-06' } })
    expect(alternatives(cal, { budget: 5 }, 3)).toEqual([])
  })
})

describe('speed', () => {
  it('solves a full year well inside the budget for feeling instant', () => {
    const cal = bareYear()
    const runs = []
    for (let i = 0; i < 5; i++) {
      const t = performance.now()
      solve(cal, { budget: 40, objective: TOTAL })
      runs.push(performance.now() - t)
    }
    const median = runs.sort((a, b) => a - b)[2]
    expect(median).toBeLessThan(200)
  })

  it('keeps the candidate set small enough to solve exactly', () => {
    const cal = bareYear()
    const windows = enumerateWindows(cal, { budget: 40 })
    // Without the maximality prune this would be in the hundreds of thousands.
    expect(windows.length).toBeLessThan(20000)
    expect(windows.length).toBeGreaterThan(50)
  })
})
