#!/usr/bin/env node
/**
 * The social preview image, generated at build time.
 *
 * It uses the real solver against the real holiday data, so the numbers on the
 * card are the numbers the app actually produces rather than a mock-up that
 * quietly goes stale. The typeface is the same Inter the site serves, decompressed
 * from the woff2 we ship, so the build needs nothing from the machine it runs on
 * and produces the same bytes anywhere.
 *
 * Usage: npm run og
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import wawoff from 'wawoff2'

import { buildCalendar, selectHolidays } from '../src/solver/calendar.js'
import { solve } from '../src/solver/solve.js'
import { dayOfWeek } from '../src/solver/plainDate.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const WIDTH = 1200
const HEIGHT = 630

// The example on the card. Romania is the one the pitch is built around.
const COUNTRY = 'RO'
const BUDGET = 21

const INK = '#10403c'
const MUTED = '#40566b'
const TEAL = '#0f766e'
const LEAVE = '#b03a08'
const LEAVE_SOFT = '#fde3d3'
const WEEKEND = '#dbe7ea'
const HOLIDAY = '#cfe9e4'
const WORK = '#f4faf9'
const BG = '#f0fdfa'
const CARD = '#ffffff'

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function pickYear(data) {
  const years = Object.keys(data.years).map(Number).sort((a, b) => a - b)
  const now = new Date().getUTCFullYear()
  return years.includes(now + 1) ? now + 1 : years[years.length - 1]
}

function buildSvg({ plan, calendar, countryName, year }) {
  const parts = []
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>`)
  parts.push(`<rect x="40" y="40" width="${WIDTH - 80}" height="${HEIGHT - 80}" rx="20" fill="${CARD}"/>`)

  const PAD = 80

  parts.push(
    `<text x="${PAD}" y="168" font-family="Inter" font-size="112" font-weight="800" fill="${INK}">` +
      `${plan.totalDaysOff} days off</text>`
  )
  parts.push(
    `<text x="${PAD}" y="218" font-family="Inter" font-size="34" font-weight="500" fill="${MUTED}">` +
      `from ${plan.leaveSpent} days of leave, in ${plan.breaks.length} breaks</text>`
  )
  parts.push(
    `<text x="${PAD}" y="268" font-family="Inter" font-size="26" font-weight="600" fill="${TEAL}">` +
      `${esc(countryName)} · ${year}</text>`
  )

  // The year as a shape: seven rows of days, one column per week.
  const leave = new Set(plan.leaveDates)
  const inBreak = new Set()
  for (const b of plan.breaks) for (let i = b.startIndex; i <= b.endIndex; i++) inBreak.add(i)

  const startOffset = dayOfWeek(calendar[0].date) - 1
  const weeks = Math.ceil((startOffset + calendar.length) / 7)
  const gap = 3
  const cell = Math.floor((WIDTH - PAD * 2 - (weeks - 1) * gap) / weeks)
  const gridTop = 320

  for (let i = 0; i < calendar.length; i++) {
    const day = calendar[i]
    const slot = startOffset + i
    const col = Math.floor(slot / 7)
    const row = slot % 7
    const x = PAD + col * (cell + gap)
    const y = gridTop + row * (cell + gap)

    let fill = WORK
    if (day.isFree) fill = day.holidayName ? HOLIDAY : WEEKEND
    if (inBreak.has(i)) fill = leave.has(day.date) ? LEAVE : LEAVE_SOFT

    parts.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${fill}"/>`)
    if (inBreak.has(i) && !leave.has(day.date)) {
      parts.push(
        `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="none" stroke="${LEAVE}" stroke-width="1"/>`
      )
    }
  }

  const longest = plan.breaks.reduce((a, b) => (b.length > (a?.length || 0) ? b : a), null)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (longest) {
    const sd = Number(longest.start.slice(8))
    const sm = MONTHS[Number(longest.start.slice(5, 7)) - 1]
    const ed = Number(longest.end.slice(8))
    const em = MONTHS[Number(longest.end.slice(5, 7)) - 1]
    const span = sm === em ? `${sd}–${ed} ${em}` : `${sd} ${sm} – ${ed} ${em}`
    parts.push(
      `<text x="${PAD}" y="${HEIGHT - 122}" font-family="Inter" font-size="24" font-weight="500" fill="${MUTED}">` +
        `Longest stretch: ${esc(span)}, ${longest.length} days off for ${longest.cost} booked</text>`
    )
  }

  parts.push(
    `<line x1="${PAD}" y1="${HEIGHT - 100}" x2="${WIDTH - PAD}" y2="${HEIGHT - 100}" stroke="#c9e4e0" stroke-width="1"/>`
  )
  parts.push(
    `<text x="${PAD}" y="${HEIGHT - 64}" font-family="Inter" font-size="24" font-weight="700" fill="${INK}">Bridge</text>`
  )
  parts.push(
    `<text x="${PAD + 92}" y="${HEIGHT - 64}" font-family="Inter" font-size="22" font-weight="400" fill="${MUTED}">` +
      `Work out which days to book. Nothing leaves your device.</text>`
  )

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${parts.join('')}</svg>`
}

async function main() {
  const data = JSON.parse(readFileSync(resolve(ROOT, `src/data/holidays/${COUNTRY.toLowerCase()}.json`), 'utf8'))
  const year = pickYear(data)
  const holidays = selectHolidays(data.years[String(year)], data.defaultSubdivision)
  const calendar = buildCalendar({ range: { start: `${year}-01-01`, end: `${year}-12-31` }, holidays })
  const plan = solve(calendar, { budget: BUDGET })

  if (!plan.feasible) throw new Error('the example plan is not solvable, so the card would be wrong')

  const svg = buildSvg({ plan, calendar, countryName: data.countryName, year })

  // Decompress the very woff2 the site serves, so the card and the page share a
  // typeface and the build depends on nothing installed on this machine.
  const woff2 = readFileSync(resolve(ROOT, 'public/fonts/inter-latin-wght-normal.woff2'))
  const ttf = Buffer.from(await wawoff.decompress(woff2))

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
    font: { fontBuffers: [ttf], defaultFontFamily: 'Inter', loadSystemFonts: false }
  })
  const png = resvg.render().asPng()

  mkdirSync(resolve(ROOT, 'public'), { recursive: true })
  writeFileSync(resolve(ROOT, 'public/og.png'), png)

  const alt =
    `A calendar of ${year} for ${data.countryName} with ${plan.breaks.length} breaks marked, ` +
    `above the words ${plan.totalDaysOff} days off from ${plan.leaveSpent} days of leave.`
  writeFileSync(resolve(ROOT, 'public/og.alt.txt'), alt + '\n', 'utf8')

  console.log(`og.png  ${Math.round(png.length / 1024)}KB  ${data.countryName} ${year}: ${plan.leaveSpent} -> ${plan.totalDaysOff} days off in ${plan.breaks.length} breaks`)
  console.log(`alt: ${alt}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
