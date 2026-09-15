/**
 * A birthday is a day that comes round, not a date, so the awkward cases are all
 * about turning it into real dates: the 29th of February, a leave year that does
 * not start in January, and a range that contains the day twice or not at all.
 */
import { describe, it, expect } from 'vitest'
import { isMonthDay, birthdayInYear, birthdayHolidays, toMonthDay, toInputDate } from '../birthday.js'
import { buildCalendar, calendarStats, holidaysLostToWeekends } from '../calendar.js'
import { solve } from '../solve.js'
import { TOTAL } from '../objectives.js'
import { dayOfWeek } from '../plainDate.js'

describe('reading a birthday', () => {
  it('accepts a real month and day', () => {
    expect(isMonthDay('06-14')).toBe(true)
    expect(isMonthDay('01-01')).toBe(true)
    expect(isMonthDay('12-31')).toBe(true)
    expect(isMonthDay('02-29')).toBe(true) // exists in leap years
  })

  it('refuses anything that is not one', () => {
    for (const bad of ['13-01', '00-10', '06-31', '02-30', '6-14', '2026-06-14', '', null, 'birthday']) {
      expect(isMonthDay(bad), String(bad)).toBe(false)
    }
  })

  it('round-trips through a full date', () => {
    expect(toMonthDay('2026-06-14')).toBe('06-14')
    expect(toInputDate('06-14', 2026)).toBe('2026-06-14')
  })
})

describe('the twenty-ninth of February', () => {
  it('lands on the 29th in a leap year', () => {
    expect(birthdayInYear('02-29', 2028)).toBe('2028-02-29')
    expect(birthdayInYear('02-29', 2024)).toBe('2024-02-29')
  })

  it('falls back to the 28th in the three years out of four it does not exist', () => {
    expect(birthdayInYear('02-29', 2026)).toBe('2026-02-28')
    expect(birthdayInYear('02-29', 2027)).toBe('2027-02-28')
    // 2100 is not a leap year, whatever the divisible-by-four rule suggests.
    expect(birthdayInYear('02-29', 2100)).toBe('2100-02-28')
  })

  it('offers a date the picker can actually show', () => {
    expect(toInputDate('02-29', 2026)).toBe('2024-02-29')
  })
})

describe('placing a birthday in a planning range', () => {
  it('finds the one occurrence in a calendar year', () => {
    const days = birthdayHolidays({ start: '2026-01-01', end: '2026-12-31' }, '06-14')
    expect(days.map((d) => d.date)).toEqual(['2026-06-14'])
    expect(days[0].name).toBe('Your birthday')
    expect(days[0].personal).toBe(true)
  })

  it('finds it in a leave year that runs April to March', () => {
    const june = birthdayHolidays({ start: '2026-04-01', end: '2027-03-31' }, '06-14')
    expect(june.map((d) => d.date)).toEqual(['2026-06-14'])

    const february = birthdayHolidays({ start: '2026-04-01', end: '2027-03-31' }, '02-10')
    expect(february.map((d) => d.date)).toEqual(['2027-02-10'])
  })

  it('finds both when a range spans two of them', () => {
    const days = birthdayHolidays({ start: '2026-01-01', end: '2027-12-31' }, '06-14')
    expect(days.map((d) => d.date)).toEqual(['2026-06-14', '2027-06-14'])
  })

  it('finds none when the range misses it', () => {
    expect(birthdayHolidays({ start: '2026-07-01', end: '2026-12-31' }, '06-14')).toEqual([])
  })

  it('returns nothing rather than throwing on a bad value', () => {
    expect(birthdayHolidays({ start: '2026-01-01', end: '2026-12-31' }, 'nope')).toEqual([])
  })
})

describe('a birthday in the plan', () => {
  const range = { start: '2026-01-01', end: '2026-12-31' }

  it('becomes a free day, so leave around it goes further', () => {
    // 10 June 2026 is a Wednesday: the most expensive kind of day to bridge.
    expect(dayOfWeek('2026-06-10')).toBe(3)

    const without = buildCalendar({ range })
    const with_ = buildCalendar({ range, holidays: birthdayHolidays(range, '06-10') })

    expect(calendarStats(without).workdays).toBe(261)
    expect(calendarStats(with_).workdays).toBe(260)

    const day = with_.find((d) => d.date === '2026-06-10')
    expect(day.isFree).toBe(true)
    expect(day.holidayName).toBe('Your birthday')
    expect(day.personal).toBe(true)
  })

  it('turns two days of leave into a proper break that was not there before', () => {
    // A midweek birthday is the one worth having. Thursday and Friday either side
    // of a free Wednesday make a five-day run; without it, two days of leave
    // cannot reach five anywhere in a plain year.
    const without = solve(buildCalendar({ range }), { budget: 2 })
    const withIt = solve(buildCalendar({ range, holidays: birthdayHolidays(range, '06-10') }), { budget: 2 })

    expect(without.feasible).toBe(false)
    expect(withIt.feasible).toBe(true)
    expect(withIt.totalDaysOff).toBe(5)

    const around = withIt.breaks.find((b) => b.start <= '2026-06-10' && b.end >= '2026-06-10')
    expect(around).toBeTruthy()
    expect(around.length).toBe(5)
    expect(around.cost).toBe(2)
    // Two days either before or after the birthday reach five; the solver may take
    // whichever pair it likes, but never the birthday itself, which is free.
    expect(around.leaveDates).not.toContain('2026-06-10')
    expect(
      around.leaveDates.every((d) => d === '2026-06-08' || d === '2026-06-09') ||
        around.leaveDates.every((d) => d === '2026-06-11' || d === '2026-06-12')
    ).toBe(true)
  })

  it('does not attract leave when a plain long weekend is better value', () => {
    // Chasing the highest total still prefers an isolated Friday, which returns
    // three days for one. That is correct arithmetic, and it is why the default
    // objective is not that one.
    const calendar = buildCalendar({ range, holidays: birthdayHolidays(range, '06-10') })
    const plan = solve(calendar, { budget: 2, objective: TOTAL })
    expect(plan.totalDaysOff).toBe(6)
    expect(plan.breaks.every((b) => b.length === 3)).toBe(true)
  })

  it('buys nothing when it falls on a day you were not working anyway', () => {
    // 13 June 2026 is a Saturday.
    expect(dayOfWeek('2026-06-13')).toBe(6)
    const calendar = buildCalendar({ range, holidays: birthdayHolidays(range, '06-13') })
    expect(calendarStats(calendar).workdays).toBe(261)
  })

  it('is never handed back by the employer rule for holidays on a weekend', () => {
    // That rule is about public holidays. Claiming a day back for a birthday
    // nobody was working anyway would be inventing an entitlement.
    const calendar = buildCalendar({ range, holidays: birthdayHolidays(range, '06-13') })
    expect(holidaysLostToWeekends(calendar)).toEqual([])
    const plan = solve(calendar, { budget: 5, weekendHolidaysGivenBack: true })
    expect(plan.stats.givenBack).toBe(0)
  })

  it('is counted apart from the country’s public holidays', () => {
    const holidays = [
      { date: '2026-05-01', name: 'Labour Day', type: 'public' },
      ...birthdayHolidays(range, '06-10')
    ]
    const stats = calendarStats(buildCalendar({ range, holidays }))
    expect(stats.holidayCount).toBe(2)
    expect(stats.personalDays).toBe(1)
    expect(stats.publicHolidayCount).toBe(1)
  })

  it('can be pinned or ruled out like any other day', () => {
    const calendar = buildCalendar({
      range,
      holidays: birthdayHolidays(range, '06-10'),
      blackouts: ['2026-06-11']
    })
    expect(calendar.find((d) => d.date === '2026-06-11').blackout).toBe(true)
    const plan = solve(calendar, { budget: 5, objective: TOTAL })
    expect(plan.leaveDates).not.toContain('2026-06-11')
  })
})
