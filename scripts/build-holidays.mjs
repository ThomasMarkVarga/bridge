#!/usr/bin/env node
/**
 * Build-time holiday data generator.
 *
 * Runs `date-holidays` ONCE, here, and writes static JSON into src/data/holidays/.
 * `date-holidays` must never reach the client bundle: it is roughly a megabyte of
 * rules and the app only ever needs a few hundred dates.
 *
 * Output is committed to the repo so a build is reproducible and a human can diff
 * what changed when the library is upgraded.
 *
 * Usage: npm run holidays
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Holidays = require('date-holidays')
const LIB_VERSION = require('date-holidays/package.json').version

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(ROOT, 'src/data/holidays')

/** Years to cover: current year and the next two. */
const THIS_YEAR = new Date().getUTCFullYear()
const YEARS = [THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2]

/**
 * The country set. Deliberately small: a country is only here if the
 * `date-holidays` output has been checked against the official calendar.
 *
 * subdivisions: 'all'  -> emit every subdivision the library knows
 *               false  -> country-level only
 * nationalFrom: use this subdivision as the country-level set instead of the
 *               library's own country-level output (documented per country).
 * requireSubdivision: the UI preselects `defaultSubdivision` and makes the choice
 *               explicit, because a country-level answer would mislead.
 */
const COUNTRIES = [
  { code: 'RO', name: 'Romania', subdivisions: false },
  {
    code: 'GB',
    name: 'United Kingdom',
    subdivisions: 'all',
    only: ['ENG', 'SCT', 'WLS', 'NIR'],
    subdivisionLabel: 'Nation',
    requireSubdivision: true,
    defaultSubdivision: 'ENG',
    nationalFrom: 'ENG',
    notes: [
      'The country-level list in date-holidays leaves out the late-August bank holiday that England, Wales and Northern Ireland all observe, so Bridge always uses a nation here rather than a UK-wide list.',
      'Scotland and Northern Ireland have genuinely different bank holidays. Pick your nation.'
    ]
  },
  {
    code: 'DE',
    name: 'Germany',
    subdivisions: 'all',
    subdivisionLabel: 'Bundesland',
    requireSubdivision: true,
    defaultSubdivision: 'BY',
    notes: [
      'Christmas Eve and New Year’s Eve are listed here as bank holidays, but they are not statutory public holidays in any Bundesland. Some employers give them, some give a half day, some give neither. Check your contract.',
      'Assumption in Bayern and Corpus Christi in Sachsen and Thüringen apply only in some municipalities, not across the whole Bundesland.'
    ]
  },
  { code: 'FR', name: 'France', subdivisions: false },
  {
    code: 'ES',
    name: 'Spain',
    subdivisions: 'all',
    subdivisionLabel: 'Region',
    requireSubdivision: true,
    defaultSubdivision: 'MD',
    notes: ['Spanish towns add two local holidays of their own each year. Those are not in this data.']
  },
  {
    code: 'IT',
    name: 'Italy',
    subdivisions: false,
    notes: ['Italian towns observe their own patron saint day, which is not in this data.']
  },
  {
    code: 'NL',
    name: 'Netherlands',
    subdivisions: false,
    notes: ['Good Friday and Liberation Day are days off at some Dutch employers and not others. Check your contract.']
  },
  { code: 'PL', name: 'Poland', subdivisions: false },
  {
    code: 'US',
    name: 'United States',
    subdivisions: 'all',
    subdivisionLabel: 'State',
    defaultSubdivision: null,
    notes: [
      'These are federal holidays. Private employers in the United States do not have to give any of them off, and most give fewer.'
    ]
  },
  { code: 'CA', name: 'Canada', subdivisions: 'all', subdivisionLabel: 'Province', requireSubdivision: true, defaultSubdivision: 'ON' },
  { code: 'AU', name: 'Australia', subdivisions: 'all', subdivisionLabel: 'State', requireSubdivision: true, defaultSubdivision: 'NSW' }
]

/** Holiday types kept in the main layer. Observances go in their own, off by default. */
const OFF_TYPES = new Set(['public', 'bank'])

/**
 * Region code standing for "the user picked no subdivision". Kept in the same
 * regions list as real subdivisions so runtime filtering is a single membership
 * test: applies(h, sub) === !h.regions || h.regions.includes(sub ?? '*')
 */
const NO_SUBDIVISION = '*'

/** @param {string|Date} v */
function isoDate(v) {
  if (typeof v === 'string') return v.slice(0, 10)
  const d = new Date(v)
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0')
  ].join('-')
}

/** Add n days to an ISO date string, staying in UTC so no zone can shift it. */
function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDate(new Date(Date.UTC(y, m - 1, d) + n * 86400000))
}

/**
 * How many calendar days the holiday covers. date-holidays encodes multi-day
 * holidays (Romania's two-day New Year, rule "01-01 P2DT") as a single entry with
 * a start and an end instant. Expand them so the calendar sees every day.
 */
function spanDays(h) {
  const n = Math.round((new Date(h.end) - new Date(h.start)) / 86400000)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

/** Read one variant (country, or country plus subdivision) for one year, in both languages. */
function readVariant(code, sub, year) {
  const local = new Holidays()
  const en = new Holidays()
  if (sub) {
    local.init(code, sub)
    en.init(code, sub)
  } else {
    local.init(code)
    en.init(code)
  }
  en.setLanguages('en')

  const a = local.getHolidays(year) || []
  const b = en.getHolidays(year) || []
  if (a.length !== b.length) {
    throw new Error(`language pass mismatch for ${code}${sub ? '-' + sub : ''} ${year}: ${a.length} vs ${b.length}`)
  }

  const out = []
  for (let i = 0; i < a.length; i++) {
    const h = a[i]
    const start = isoDate(h.date)
    const span = spanDays(h)
    for (let d = 0; d < span; d++) {
      out.push({
        date: addDays(start, d),
        name: h.name,
        nameEn: b[i].name,
        type: h.type,
        substitute: Boolean(h.substitute)
      })
    }
  }
  return out
}

/** Stable identity for merging the same holiday across subdivisions. */
const keyOf = (h) => `${h.date}|${h.name}|${h.type}|${h.substitute ? 1 : 0}`

function buildCountry(cfg) {
  const probe = new Holidays()
  const statesMap = cfg.subdivisions === 'all' ? probe.getStates(cfg.code) || {} : {}
  let subCodes = Object.keys(statesMap)
  if (cfg.only) subCodes = subCodes.filter((c) => cfg.only.includes(c))
  const subdivisions = subCodes.map((c) => ({ code: c, name: statesMap[c] }))

  const years = {}
  const observances = {}

  for (const year of YEARS) {
    // Every variant is treated the same way, including the country-level one,
    // which is recorded under NO_SUBDIVISION. A holiday is only "everywhere" if
    // every variant actually returned it. Scotland, for one, has neither Easter
    // Monday nor the late-August bank holiday, so the UK-wide list must not claim
    // those apply to every nation.
    const variants = [[NO_SUBDIVISION, cfg.nationalFrom || null], ...subCodes.map((sc) => [sc, sc])]
    const allVariantCodes = variants.map(([code]) => code)

    /** @type {Map<string, {h: object, regions: Set<string>}>} */
    const merged = new Map()
    for (const [variantCode, initArg] of variants) {
      for (const h of readVariant(cfg.code, initArg, year)) {
        const k = keyOf(h)
        const hit = merged.get(k)
        if (hit) hit.regions.add(variantCode)
        else merged.set(k, { h, regions: new Set([variantCode]) })
      }
    }

    const rows = []
    const obsRows = []
    for (const { h, regions } of merged.values()) {
      const everywhere = regions.size === allVariantCodes.length
      const row = { date: h.date, name: h.name }
      if (h.nameEn && h.nameEn !== h.name) row.nameEn = h.nameEn
      row.type = h.type
      if (h.substitute) row.substitute = true
      if (!everywhere) row.regions = [...regions].sort()
      ;(OFF_TYPES.has(h.type) ? rows : obsRows).push(row)
    }

    const byDate = (x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : x.name < y.name ? -1 : 1)
    years[year] = rows.sort(byDate)
    observances[year] = obsRows.sort(byDate)
  }

  return {
    country: cfg.code,
    countryName: cfg.name,
    subdivisionLabel: cfg.subdivisionLabel || null,
    requireSubdivision: Boolean(cfg.requireSubdivision),
    defaultSubdivision: cfg.defaultSubdivision ?? null,
    subdivisions,
    notes: cfg.notes || [],
    years,
    observances,
    source: {
      library: 'date-holidays',
      version: LIB_VERSION,
      url: 'https://github.com/commenthol/date-holidays'
    },
    generatedAt: new Date().toISOString()
  }
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const index = []
  let total = 0

  for (const cfg of COUNTRIES) {
    const data = buildCountry(cfg)
    const file = resolve(OUT_DIR, `${cfg.code.toLowerCase()}.json`)
    writeFileSync(file, JSON.stringify(data, null, 1) + '\n', 'utf8')
    const bytes = readFileSync(file).length
    total += bytes
    const counts = YEARS.map((y) => `${y}:${data.years[y].length}`).join('  ')
    console.log(
      `${cfg.code}  ${String(Math.round(bytes / 1024)).padStart(4)}KB  subs:${String(data.subdivisions.length).padStart(2)}  ${counts}`
    )
    index.push({
      code: cfg.code,
      name: cfg.name,
      subdivisionLabel: data.subdivisionLabel,
      requireSubdivision: data.requireSubdivision,
      defaultSubdivision: data.defaultSubdivision,
      subdivisions: data.subdivisions
    })
  }

  writeFileSync(
    resolve(OUT_DIR, 'index.json'),
    JSON.stringify(
      {
        countries: index,
        years: YEARS,
        generatedAt: new Date().toISOString(),
        source: {
          library: 'date-holidays',
          version: LIB_VERSION,
          url: 'https://github.com/commenthol/date-holidays'
        }
      },
      null,
      1
    ) + '\n',
    'utf8'
  )

  console.log(`\n${COUNTRIES.length} countries + index.json, ${Math.round(total / 1024)}KB total, years ${YEARS.join(', ')}`)
}

main()
