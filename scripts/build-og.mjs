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
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
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

const INK = '#16202b'
const MUTED = '#4a5a68'
const TAG = '#ffc845'
const LEAVE = '#ff6b4a'
const BAND = '#ffe2d8'
const WEEKEND = '#e6e0d4'
const HOLIDAY = '#12806f'
const WORK = '#f3eee2'
const BG = '#faf5ec'
const CARD = '#fffefb'

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
  // The hard offset shadow, drawn as a solid rectangle behind the panel.
  parts.push(`<rect x="46" y="46" width="${WIDTH - 80}" height="${HEIGHT - 80}" rx="14" fill="${INK}"/>`)
  parts.push(
    `<rect x="40" y="40" width="${WIDTH - 80}" height="${HEIGHT - 80}" rx="14" fill="${CARD}" stroke="${INK}" stroke-width="3"/>`
  )

  const PAD = 80

  parts.push(
    `<text x="${PAD}" y="172" font-family="'Archivo Black'" font-size="96" fill="${INK}">` +
      `${plan.totalDaysOff} days off</text>`
  )
  parts.push(
    `<text x="${PAD}" y="218" font-family="'Public Sans'" font-size="34" font-weight="500" fill="${MUTED}">` +
      `from ${plan.leaveSpent} days of leave, in ${plan.breaks.length} breaks</text>`
  )
  parts.push(
    `<text x="${PAD}" y="268" font-family="'Archivo Black'" font-size="22" fill="${INK}">` +
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
    if (inBreak.has(i)) fill = leave.has(day.date) ? LEAVE : BAND

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
      `<text x="${PAD}" y="${HEIGHT - 122}" font-family="'Public Sans'" font-size="24" font-weight="500" fill="${MUTED}">` +
        `Longest stretch: ${esc(span)}, ${longest.length} days off for ${longest.cost} booked</text>`
    )
  }

  parts.push(
    `<line x1="${PAD}" y1="${HEIGHT - 100}" x2="${WIDTH - PAD}" y2="${HEIGHT - 100}" stroke="${INK}" stroke-width="2"/>`
  )
  parts.push(
    `<text x="${PAD}" y="${HEIGHT - 64}" font-family="'Archivo Black'" font-size="24" fill="${INK}">Bridge</text>`
  )
  parts.push(
    `<text x="${PAD + 128}" y="${HEIGHT - 64}" font-family="'Public Sans'" font-size="21" fill="${MUTED}">` +
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

  // Decompress the very woff2 files the site serves, so the card and the page
  // share a typeface and the build needs nothing installed on this machine.
  //
  // They are written to disk and passed as paths rather than as buffers: this
  // version of resvg silently ignores `fontBuffers` and falls back to a default
  // face, which is how the headline quietly came out in the wrong font once.
  const scratch = join(tmpdir(), 'bridge-og-fonts')
  mkdirSync(scratch, { recursive: true })
  const fontFiles = []
  for (const [name, file] of [
    ['PublicSans.ttf', 'public/fonts/public-sans-latin-wght-normal.woff2'],
    ['ArchivoBlack.ttf', 'public/fonts/archivo-black-latin-400-normal.woff2']
  ]) {
    const ttf = Buffer.from(await wawoff.decompress(readFileSync(resolve(ROOT, file))))
    const out = join(scratch, name)
    writeFileSync(out, ttf)
    fontFiles.push(out)
  }

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH },
    font: { fontFiles, defaultFontFamily: 'Public Sans', loadSystemFonts: false }
  })
  const png = resvg.render().asPng()
  rmSync(scratch, { recursive: true, force: true })

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
