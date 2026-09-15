#!/usr/bin/env node
/**
 * Print a plan on the terminal so the answer can be checked against a real
 * calendar before any of it reaches a screen.
 *
 * Usage: node scripts/report.mjs [COUNTRY] [YEAR] [DAYS] [--sub XX] [--objective total|longest|spread]
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCalendar, selectHolidays } from '../src/solver/calendar.js'
import { solve } from '../src/solver/solve.js'
import { alternatives } from '../src/solver/alternatives.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')))

const country = (positional[0] || 'RO').toUpperCase()
const year = Number(positional[1] || 2026)
const budget = Number(positional[2] || 21)
const subdivision = flag('sub', null)
const objective = flag('objective', undefined)

const data = JSON.parse(readFileSync(resolve(__dirname, `../src/data/holidays/${country.toLowerCase()}.json`), 'utf8'))
const sub = subdivision || data.defaultSubdivision
const holidays = selectHolidays(data.years[String(year)] || [], sub)

const calendar = buildCalendar({
  range: { start: `${year}-01-01`, end: `${year}-12-31` },
  holidays
})

const t0 = performance.now()
const plan = solve(calendar, { budget, objective })
const ms = performance.now() - t0

const OBJ = { spread: 'several proper breaks', longest: 'one long trip', total: 'most days off, any length' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const pretty = (iso) => {
  const [, m, d] = iso.split('-').map(Number)
  const day = calendar.find((c) => c.date === iso)
  return `${DOW[day ? day.dayOfWeek : 1]} ${d} ${MONTHS[m - 1]}`
}

const label = `${data.countryName}${sub ? ` (${(data.subdivisions.find((s) => s.code === sub) || {}).name || sub})` : ''}`
console.log(`\n  ${label} ${year}, ${budget} days of leave`)
console.log(`  ${'-'.repeat(68)}`)

console.log(`  Plan: ${OBJ[plan.objective] || plan.objective}`)

if (!plan.feasible) {
  console.log(`  No plan: ${plan.reason}\n`)
  process.exit(0)
}

console.log(
  `  ${plan.leaveSpent} leave days become ${plan.totalDaysOff} days off, in ${plan.breaks.length} breaks`
)
console.log(
  `  That is ${plan.efficiency.toFixed(2)} days off for every day booked. Solved in ${ms.toFixed(1)}ms.`
)
if (plan.unusedBudget > 0) console.log(`  ${plan.unusedBudget} leave days left unspent.`)
console.log()

for (const b of plan.breaks) {
  console.log(`  ${pretty(b.start)} to ${pretty(b.end)}   ${String(b.length).padStart(2)} days off for ${b.cost} booked  (${b.efficiency.toFixed(1)}x)`)
  console.log(`      book: ${b.leaveDates.map(pretty).join(', ')}`)
  const holidaysInside = calendar
    .slice(b.startIndex, b.endIndex + 1)
    .filter((d) => d.holidayName)
    .map((d) => `${pretty(d.date)} ${d.holidayName}`)
  if (holidaysInside.length) console.log(`      free:  ${holidaysInside.join('; ')}`)
  console.log()
}

console.log(`  Days to request (${plan.leaveDates.length}):`)
console.log(`  ${plan.leaveDates.join(', ')}\n`)

console.log('  What each extra leave day buys:')
const curve = plan.curve
for (let b = 1; b < curve.length; b++) {
  const gain = curve[b].totalDaysOff - curve[b - 1].totalDaysOff
  if (b % 1 === 0 && b <= budget) {
    const bar = '#'.repeat(Math.max(0, gain))
    console.log(`    day ${String(b).padStart(2)}: +${gain} ${bar}`)
  }
}

const alts = alternatives(calendar, { budget, objective }, 2)
if (alts.length) {
  console.log('\n  Other plans that are nearly as good:')
  for (const a of alts) {
    console.log(`    ${a.totalDaysOff} days off in ${a.breaks.length} breaks: ${a.breaks.map((b) => `${pretty(b.start)}-${pretty(b.end)}`).join(', ')}`)
  }
}
console.log()
