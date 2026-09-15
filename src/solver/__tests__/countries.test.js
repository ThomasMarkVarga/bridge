/**
 * Checks against real holiday calendars.
 *
 * These are the cases where a wrong date would quietly produce a wrong plan:
 * Orthodox Easter moving by weeks between years, British substitute bank holidays,
 * American observed days, and German states that simply do not share a calendar.
 */
import { describe, it, expect } from 'vitest'
import ro from '../../data/holidays/ro.json'
import gb from '../../data/holidays/gb.json'
import us from '../../data/holidays/us.json'
import de from '../../data/holidays/de.json'
import index from '../../data/holidays/index.json'
import { buildCalendar, selectHolidays, calendarStats } from '../calendar.js'
import { solve } from '../solve.js'
import { TOTAL } from '../objectives.js'
import { dayOfWeek } from '../plainDate.js'

/** Dates of the holidays that apply to a given region, for one year. */
const datesFor = (data, year, sub = undefined) =>
  selectHolidays(data.years[String(year)], sub === undefined ? data.defaultSubdivision : sub).map((h) => h.date)

const nameOn = (data, year, date, sub = undefined) =>
  selectHolidays(data.years[String(year)], sub === undefined ? data.defaultSubdivision : sub)
    .filter((h) => h.date === date)
    .map((h) => h.nameEn || h.name)

function yearPlan(data, year, budget, opts = {}) {
  const sub = opts.subdivision === undefined ? data.defaultSubdivision : opts.subdivision
  const calendar = buildCalendar({
    range: { start: `${year}-01-01`, end: `${year}-12-31` },
    workPattern: opts.workPattern,
    holidays: selectHolidays(data.years[String(year)], sub)
  })
  return { calendar, plan: solve(calendar, { budget, ...opts }) }
}

describe('Romania', () => {
  it('has all seventeen public holiday days in 2026, including the two added in 2024', () => {
    const dates = datesFor(ro, 2026)
    expect(dates).toEqual([
      '2026-01-01',
      '2026-01-02', // the second day of the New Year, which is a separate day off
      '2026-01-06', // Epiphany, made a public holiday in 2024
      '2026-01-07', // Saint John the Baptist, likewise
      '2026-01-24',
      '2026-04-10',
      '2026-04-12',
      '2026-04-13',
      '2026-05-01',
      '2026-05-31',
      '2026-06-01',
      '2026-06-01', // Whit Monday and Children's Day land on the same date
      '2026-08-15',
      '2026-11-30',
      '2026-12-01',
      '2026-12-25',
      '2026-12-26'
    ])
  })

  it('places Orthodox Easter correctly in 2026 and moves it in 2027', () => {
    expect(nameOn(ro, 2026, '2026-04-12')).toContain('Easter Sunday')
    expect(nameOn(ro, 2027, '2027-05-02')).toContain('Easter Sunday')
    // Orthodox Easter is 12 April 2026 and 2 May 2027: twenty days later, not the
    // five weeks the brief estimated. Good Friday and Whit Monday move with it.
    expect(nameOn(ro, 2026, '2026-04-10')).toContain('Good Friday')
    expect(nameOn(ro, 2027, '2027-04-30')).toContain('Good Friday')
    expect(nameOn(ro, 2026, '2026-06-01')).toContain('Whit Monday')
    expect(nameOn(ro, 2027, '2027-06-21')).toContain('Whit Monday')
  })

  it('does not invent the ad hoc bridge days the government declares each year', () => {
    // Romania announces extra days around some holidays by government decision,
    // often only weeks ahead. None of those may appear here: a date nobody has
    // announced yet would be a guess presented as a fact.
    const dates = datesFor(ro, 2026)
    expect(dates).not.toContain('2026-01-05')
    expect(dates).not.toContain('2026-04-11')
    expect(ro.notes).toBeDefined()
  })

  it('turns 21 days of leave into six substantial breaks', () => {
    const { plan } = yearPlan(ro, 2026, 21)
    expect(plan.feasible).toBe(true)
    expect(plan.breaks.length).toBe(6)
    expect(plan.totalDaysOff).toBe(54)
    expect(plan.leaveSpent).toBe(21)
    expect(plan.efficiency).toBeCloseTo(2.57, 1)
    // The early-June bridge is the one the whole idea rests on: four days booked
    // around Whit Monday and Children's Day buys nine days off.
    const june = plan.breaks.find((b) => b.start <= '2026-06-01' && b.end >= '2026-06-01')
    expect(june).toBeTruthy()
    expect(june.length).toBe(9)
    expect(june.cost).toBe(4)
  })
})

describe('the United Kingdom', () => {
  it('adds a substitute Monday when Boxing Day falls on a Saturday', () => {
    // 26 December 2026 is a Saturday, so the bank holiday moves to Monday the 28th.
    expect(dayOfWeek('2026-12-26')).toBe(6)
    const subs = selectHolidays(gb.years['2026'], 'ENG').filter((h) => h.substitute)
    expect(subs.map((h) => h.date)).toContain('2026-12-28')
    expect(dayOfWeek('2026-12-28')).toBe(1)
  })

  it('keeps the late-August bank holiday that the country-level data leaves out', () => {
    // This is the bug that made BridgeDays use a nation rather than a UK-wide list.
    expect(datesFor(gb, 2026, 'ENG')).toContain('2026-08-31')
    expect(datesFor(gb, 2026, 'WLS')).toContain('2026-08-31')
    expect(datesFor(gb, 2026, 'NIR')).toContain('2026-08-31')
    expect(gb.requireSubdivision).toBe(true)
    expect(gb.defaultSubdivision).toBe('ENG')
  })

  it('gives Scotland a different calendar from England', () => {
    const eng = datesFor(gb, 2026, 'ENG')
    const sct = datesFor(gb, 2026, 'SCT')
    expect(sct).toContain('2026-01-02') // Scotland keeps the second of January
    expect(eng).not.toContain('2026-01-02')
    expect(sct).toContain('2026-08-03') // and takes its summer holiday in early August
    expect(sct).not.toContain('2026-08-31')
    expect(sct).not.toContain('2026-04-06') // no Easter Monday in Scotland
    expect(eng).toContain('2026-04-06')
  })

  it('gives Northern Ireland its own days again', () => {
    const nir = datesFor(gb, 2026, 'NIR')
    expect(nir).toContain('2026-03-17') // Saint Patrick's Day
    expect(nir).toContain('2026-07-13') // the Twelfth, substituted from the Sunday
  })

  it('produces a sensible plan for England in 2026', () => {
    const { plan } = yearPlan(gb, 2026, 25, { subdivision: 'ENG' })
    expect(plan.feasible).toBe(true)
    expect(plan.leaveSpent).toBe(25)
    expect(plan.efficiency).toBeGreaterThan(2)
    const christmas = plan.breaks.find((b) => b.start <= '2026-12-25' && b.end >= '2026-12-25')
    expect(christmas).toBeTruthy()
  })
})

describe('the United States', () => {
  it('shifts Independence Day to the Friday when the Fourth is a Saturday', () => {
    expect(dayOfWeek('2026-07-04')).toBe(6)
    const observed = selectHolidays(us.years['2026'], null).filter((h) => h.date === '2026-07-03')
    expect(observed.length).toBe(1)
    expect(observed[0].substitute).toBe(true)
  })

  it('has the federal holidays and says plainly that they are federal', () => {
    const dates = datesFor(us, 2026, null)
    for (const d of ['2026-01-01', '2026-01-19', '2026-05-25', '2026-06-19', '2026-09-07', '2026-11-26', '2026-12-25']) {
      expect(dates).toContain(d)
    }
    expect(us.notes.join(' ')).toMatch(/federal/i)
  })

  it('counts the observed day as the day off, not the Saturday', () => {
    const { calendar } = yearPlan(us, 2026, 15, { subdivision: null })
    expect(calendar.find((d) => d.date === '2026-07-03').isFree).toBe(true)
    expect(calendar.find((d) => d.date === '2026-07-03').holidaySubstitute).toBe(true)
  })
})

describe('Germany', () => {
  it('gives Bayern and Berlin genuinely different calendars', () => {
    const by = datesFor(de, 2026, 'BY')
    const be = datesFor(de, 2026, 'BE')

    expect(by).toContain('2026-01-06') // Epiphany, in the south only
    expect(be).not.toContain('2026-01-06')
    expect(by).toContain('2026-06-04') // Corpus Christi
    expect(be).not.toContain('2026-06-04')
    expect(by).toContain('2026-11-01') // All Saints
    expect(be).not.toContain('2026-11-01')
    expect(be).toContain('2026-03-08') // International Women's Day, Berlin only
    expect(by).not.toContain('2026-03-08')

    expect(by.length).toBeGreaterThan(be.length)
  })

  it('shares the nationwide days between every Bundesland', () => {
    const codes = de.subdivisions.map((s) => s.code)
    expect(codes.length).toBe(16)
    for (const code of codes) {
      const dates = datesFor(de, 2026, code)
      expect(dates).toContain('2026-01-01')
      expect(dates).toContain('2026-10-03') // Day of German Unity
      expect(dates).toContain('2026-12-25')
    }
  })

  it('warns that Christmas Eve and New Year’s Eve are not really public holidays', () => {
    const all = selectHolidays(de.years['2026'], 'BY')
    const xmasEve = all.find((h) => h.date === '2026-12-24')
    expect(xmasEve.type).toBe('bank')
    expect(de.notes.join(' ')).toMatch(/Christmas Eve/i)
    expect(de.notes.join(' ')).toMatch(/contract/i)
  })

  it('gives Bayern more time off than Berlin for the same leave', () => {
    const byPlan = yearPlan(de, 2026, 20, { subdivision: 'BY', objective: TOTAL }).plan
    const bePlan = yearPlan(de, 2026, 20, { subdivision: 'BE', objective: TOTAL }).plan
    expect(byPlan.totalDaysOff).toBeGreaterThanOrEqual(bePlan.totalDaysOff)
  })
})

describe('when the calendar is kind or unkind', () => {
  it('finds the big bridge when Christmas and New Year are both midweek', () => {
    // 25 December 2025 and 1 January 2026 are both Thursdays, the best possible
    // shape: a handful of days covers a fortnight.
    expect(dayOfWeek('2025-12-25')).toBe(4)
    expect(dayOfWeek('2026-01-01')).toBe(4)
    const holidays = [
      { date: '2025-12-25', name: 'Christmas Day', type: 'public' },
      { date: '2025-12-26', name: 'Boxing Day', type: 'public' },
      { date: '2026-01-01', name: "New Year's Day", type: 'public' }
    ]
    const calendar = buildCalendar({ range: { start: '2025-12-01', end: '2026-01-31' }, holidays })

    // Four days, booked on the 29th, 30th, 31st and the 2nd, join Christmas to the
    // new year: eleven days off from Christmas Day to Sunday the 4th.
    const plan = solve(calendar, { budget: 4 })
    expect(plan.feasible).toBe(true)
    expect(plan.breaks.length).toBe(1)
    const bridge = plan.breaks[0]
    expect(bridge.start).toBe('2025-12-25')
    expect(bridge.end).toBe('2026-01-04')
    expect(bridge.length).toBe(11)
    expect(bridge.cost).toBe(4)
    expect(bridge.leaveDates).toEqual(['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-02'])
    expect(bridge.efficiency).toBeCloseTo(2.75, 2)
  })

  it('gets less out of a year where holidays fall on Saturdays', () => {
    const range = { start: '2026-01-01', end: '2026-12-31' }
    // Four holidays on Wednesdays against the same four on Saturdays.
    const midweek = ['2026-02-04', '2026-03-04', '2026-09-02', '2026-10-07']
    const saturdays = ['2026-02-07', '2026-03-07', '2026-09-05', '2026-10-10']
    for (const d of midweek) expect(dayOfWeek(d)).toBe(3)
    for (const d of saturdays) expect(dayOfWeek(d)).toBe(6)

    const mk = (dates) =>
      buildCalendar({ range, holidays: dates.map((date) => ({ date, name: 'Holiday', type: 'public' })) })

    const good = mk(midweek)
    const bad = mk(saturdays)

    // A holiday on a Saturday buys nothing: it is a day you already had off.
    expect(calendarStats(good).workdays).toBe(257)
    expect(calendarStats(bad).workdays).toBe(261)
    expect(calendarStats(bad).holidaysOnNonWorkingDays).toBe(4)

    const goodPlan = solve(good, { budget: 10 })
    const badPlan = solve(bad, { budget: 10 })
    expect(goodPlan.totalDaysOff).toBeGreaterThan(badPlan.totalDaysOff)
    expect(goodPlan.efficiency).toBeGreaterThan(badPlan.efficiency)

    // Chasing the highest total instead ignores midweek holidays altogether,
    // because a lone Friday returns three days for one and a Wednesday holiday
    // cannot beat that. The two years then look identical, which is true of the
    // total and misleading about the year.
    const goodTotal = solve(good, { budget: 10, objective: TOTAL })
    const badTotal = solve(bad, { budget: 10, objective: TOTAL })
    expect(goodTotal.totalDaysOff).toBe(badTotal.totalDaysOff)
  })
})

describe('the shipped data set', () => {
  it('lists every country in the index with its regions', () => {
    expect(index.countries.length).toBe(11)
    const codes = index.countries.map((c) => c.code)
    expect(codes).toEqual(['RO', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'PL', 'US', 'CA', 'AU'])
    for (const c of index.countries) {
      if (c.requireSubdivision) {
        expect(c.subdivisions.length).toBeGreaterThan(0)
        expect(c.defaultSubdivision).toBeTruthy()
      }
    }
  })

  it('records where every date came from and when', () => {
    for (const data of [ro, gb, us, de]) {
      expect(data.source.library).toBe('date-holidays')
      expect(data.source.version).toMatch(/^\d+\.\d+\.\d+/)
      expect(Date.parse(data.generatedAt)).not.toBeNaN()
      expect(Object.keys(data.years).length).toBe(3)
    }
  })

  it('ships only days people actually get off, with observances kept separate', () => {
    for (const data of [ro, gb, us, de]) {
      for (const year of Object.keys(data.years)) {
        for (const h of data.years[year]) expect(['public', 'bank']).toContain(h.type)
        for (const h of data.observances[year]) expect(['public', 'bank']).not.toContain(h.type)
      }
    }
    // Romania's Mother's Day is an observance, not a day off.
    expect(ro.observances['2026'].some((h) => h.date === '2026-03-08')).toBe(true)
    expect(ro.years['2026'].some((h) => h.date === '2026-03-08')).toBe(false)
  })

  it('has valid, sorted dates everywhere', () => {
    for (const data of [ro, gb, us, de]) {
      for (const year of Object.keys(data.years)) {
        const list = data.years[year]
        for (const h of list) {
          expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
          expect(h.date.slice(0, 4)).toBe(year)
          expect(typeof h.name).toBe('string')
          expect(h.name.length).toBeGreaterThan(0)
        }
        const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1)).map((h) => h.date)
        expect(list.map((h) => h.date)).toEqual(sorted)
      }
    }
  })
})
