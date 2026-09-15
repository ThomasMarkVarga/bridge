/**
 * The guards that stop a translated page rotting quietly.
 *
 * A missing key shows an English sentence in the middle of a Romanian page, and
 * a wrong plural form shows "21 zile" where a Romanian speaker expects "21 de
 * zile". Neither throws, so neither gets noticed without a test.
 */
import { describe, it, expect } from 'vitest'
import en from '../en.js'
import ro from '../ro.js'
import { pluralCategory, pluralForm } from '../plural.js'
import { CALENDAR_NAMES } from '../calendarNames.js'

const LANGS = { en, ro }

describe('the dictionaries', () => {
  it('has enough in them that an empty file cannot pass', () => {
    expect(Object.keys(en).length).toBeGreaterThan(150)
  })

  it('cover exactly the same keys', () => {
    const inEn = Object.keys(en).sort()
    const inRo = Object.keys(ro).sort()
    expect(inRo.filter((k) => !en[k] && en[k] !== ''), 'in ro.js but not en.js').toEqual([])
    expect(inEn.filter((k) => ro[k] === undefined), 'in en.js but missing from ro.js').toEqual([])
  })

  it('agree on which entries are counted', () => {
    const mismatched = Object.keys(en).filter(
      (key) => (typeof en[key] === 'string') !== (typeof ro[key] === 'string')
    )
    expect(mismatched, 'a plural entry in one language and a plain string in the other').toEqual([])
  })

  it('give Romanian all three plural forms wherever a count is involved', () => {
    const missing = Object.entries(ro)
      .filter(([, value]) => typeof value === 'object')
      .filter(([, value]) => !('one' in value && 'few' in value && 'other' in value))
      .map(([key]) => key)
    expect(missing, 'Romanian needs one, few and other').toEqual([])
  })

  it('use the same placeholders in both languages', () => {
    const names = (entry) => {
      const text = typeof entry === 'string' ? entry : Object.values(entry).join(' ')
      return [...new Set((text.match(/\{(\w+)\}/g) || []).map((m) => m.slice(1, -1)))].sort()
    }
    const wrong = []
    for (const key of Object.keys(en)) {
      const a = names(en[key])
      const b = names(ro[key])
      // `count` may legitimately appear in only some plural forms of a language.
      const strip = (list) => list.filter((n) => n !== 'count')
      if (strip(a).join() !== strip(b).join()) wrong.push(`${key}: en [${a}] vs ro [${b}]`)
    }
    expect(wrong, 'a placeholder that exists in one language and not the other').toEqual([])
  })

  it('never leave a placeholder unspelled in a way that would print braces', () => {
    for (const [lang, dict] of Object.entries(LANGS)) {
      for (const [key, entry] of Object.entries(dict)) {
        const text = typeof entry === 'string' ? entry : Object.values(entry).join(' ')
        // A stray brace that is not a whole {placeholder} would survive to the page.
        const stray = text.replace(/\{\w+\}/g, '').match(/[{}]/)
        expect(stray, `${lang}.${key} has a stray brace`).toBe(null)
      }
    }
  })
})

describe('Romanian spelling', () => {
  /*
   * The comma-below letters are U+0218 and U+021B. The cedilla versions at
   * U+015E and U+0162 come from older Windows codepages, look almost identical,
   * and are the giveaway that nobody Romanian read the page.
   */
  const CEDILLA = /[ŞşŢţ]/

  it('uses comma-below s and t, not the cedilla lookalikes', () => {
    const offenders = []
    for (const [key, entry] of Object.entries(ro)) {
      const text = typeof entry === 'string' ? entry : Object.values(entry).join(' ')
      if (CEDILLA.test(text)) offenders.push(key)
    }
    for (const [key, list] of Object.entries(CALENDAR_NAMES.ro)) {
      if (list.some((name) => CEDILLA.test(name))) offenders.push(`calendarNames.${key}`)
    }
    expect(offenders).toEqual([])
  })

  it('writes months and weekdays in lower case, as Romanian does', () => {
    const all = [...CALENDAR_NAMES.ro.months, ...CALENDAR_NAMES.ro.weekdays]
    expect(all.filter((name) => name[0] !== name[0].toLowerCase())).toEqual([])
  })

  it('keeps English months capitalised', () => {
    const all = [...CALENDAR_NAMES.en.months, ...CALENDAR_NAMES.en.weekdays]
    expect(all.filter((name) => name[0] !== name[0].toUpperCase())).toEqual([])
  })
})

describe('plural categories', () => {
  it('splits English into one and other', () => {
    expect(pluralCategory('en', 1)).toBe('one')
    expect(pluralCategory('en', 0)).toBe('other')
    expect(pluralCategory('en', 21)).toBe('other')
  })

  it('follows the Romanian rule, including where "de" appears', () => {
    const cases = [
      [0, 'few'],
      [1, 'one'],
      [2, 'few'],
      [12, 'few'],
      [19, 'few'],
      [20, 'other'],
      [21, 'other'],
      [99, 'other'],
      [100, 'other'],
      [101, 'few'],
      [112, 'few'],
      [119, 'few'],
      [120, 'other'],
      [121, 'other'],
      [201, 'few']
    ]
    for (const [n, expected] of cases) {
      expect(pluralCategory('ro', n), `${n} should be ${expected}`).toBe(expected)
    }
  })

  it('puts "de" in front of the noun from twenty upwards', () => {
    const days = ro['units.days']
    expect(pluralForm('ro', days, 1)).toBe('{count} zi')
    expect(pluralForm('ro', days, 3)).toBe('{count} zile')
    expect(pluralForm('ro', days, 21)).toBe('{count} de zile')
    expect(pluralForm('ro', days, 101)).toBe('{count} zile')
  })
})
