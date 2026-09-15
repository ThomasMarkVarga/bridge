/**
 * The parts that write words outside React.
 *
 * The calendar file and the share card are built by plain modules rather than
 * components, so they read the language from i18n/core.js rather than from a
 * hook. That is easy to get wrong in a way nothing else notices: the page goes
 * Romanian, the file somebody downloads stays English, and the only way to find
 * out is to open the file.
 *
 * These also pin the plural agreement in a real sentence rather than in
 * isolation, which is where it actually has to hold.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { setLanguage } from '../core.js'
import { shareText, shareCardAlt } from '../../export/shareCard.js'
import { breaksToIcs, leaveDaysToIcs } from '../../export/ics.js'

const plan = {
  feasible: true,
  leaveSpent: 21,
  totalDaysOff: 54,
  breaks: [
    { start: '2026-01-01', end: '2026-01-11', length: 11, cost: 3, leaveDates: ['2026-01-02'], pinnedDates: [] }
  ]
}

afterEach(() => setLanguage('en'))

describe('text generated outside React', () => {
  it('writes the share text in Romanian', () => {
    setLanguage('ro')
    const text = shareText({ plan, countryLabel: 'România', periodLabel: '2026' })
    expect(text).toContain('21 de zile de concediu')
    expect(text).toContain('54 de zile libere')
    expect(text).toContain('Calculat cu BridgeDays')
    // The giveaway that only half of it was translated.
    expect(text).not.toMatch(/\b(days|leave|become|booked)\b/)
  })

  it('writes the image description in Romanian', () => {
    setLanguage('ro')
    const alt = shareCardAlt({ plan, countryLabel: 'România', periodLabel: '2026' })
    expect(alt).toContain('zile libere')
    expect(alt).not.toMatch(/\b(days off|for every day)\b/)
  })

  /**
   * A calendar file folds any line past 75 octets and continues it after a
   * space, so "Planificat" can arrive as "Plani" and " ficat". Unfold first,
   * the way a calendar application does, or the assertion is really testing
   * where the line happened to break.
   */
  const unfold = (ics) => ics.replace(/\r?\n /g, '')

  it('writes the calendar file in Romanian', () => {
    setLanguage('ro')
    const ics = unfold(breaksToIcs(plan.breaks))
    expect(ics).toContain('Concediu')
    expect(ics).toContain('Planificat cu BridgeDays')
    expect(ics).not.toContain('Time off')
    expect(unfold(leaveDaysToIcs(['2026-01-02']))).toContain('Concediu de odihnă')
  })

  it('still writes English when that is the language', () => {
    setLanguage('en')
    const text = shareText({ plan, countryLabel: 'Romania', periodLabel: '2026' })
    expect(text).toContain('21 leave days')
    expect(text).toContain('54 days off')
    expect(breaksToIcs(plan.breaks)).toContain('Time off')
  })

  it('agrees the noun with the number, in a whole sentence', () => {
    setLanguage('ro')
    const one = shareText({
      plan: { ...plan, leaveSpent: 1, totalDaysOff: 3, breaks: plan.breaks },
      countryLabel: 'România',
      periodLabel: '2026'
    })
    expect(one).toContain('1 zi de concediu devine 3 zile libere')

    const few = shareText({
      plan: { ...plan, leaveSpent: 3, totalDaysOff: 12 },
      countryLabel: 'România',
      periodLabel: '2026'
    })
    expect(few).toContain('3 zile de concediu devin 12 zile libere')

    // Twenty is where "de" appears, and where a two-form translation breaks.
    const many = shareText({
      plan: { ...plan, leaveSpent: 20, totalDaysOff: 100 },
      countryLabel: 'România',
      periodLabel: '2026'
    })
    expect(many).toContain('20 de zile de concediu devin 100 de zile libere')
  })
})
