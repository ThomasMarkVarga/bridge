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

/**
 * Break the plan down by month, split into the days you pay for and the days you
 * get for free. A twelve-bar chart says "here is your year" far faster than 365
 * tiny squares, and it survives being shrunk to a social thumbnail.
 */
function byMonth(calendar, plan) {
  const months = Array.from({ length: 12 }, () => ({ booked: 0, free: 0 }))
  const leave = new Set(plan.leaveDates)
  for (const b of plan.breaks) {
    for (let i = b.startIndex; i <= b.endIndex; i++) {
      const day = calendar[i]
      const m = Number(day.date.slice(5, 7)) - 1
      if (leave.has(day.date)) months[m].booked++
      else months[m].free++
    }
  }
  return months
}

function buildSvg({ plan, calendar, countryName, year }) {
  const p = []
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const text = (x, y, size, fill, content, family = 'Public Sans', weight = 600, anchor = 'start') =>
    `<text x="${x}" y="${y}" font-family="'${family}'" font-size="${size}"` +
    (family === 'Public Sans' ? ` font-weight="${weight}"` : '') +
    ` fill="${fill}" text-anchor="${anchor}">${content}</text>`

  /** A filled shape with a hard offset shadow and an ink outline. */
  const block = (x, y, w, h, r, fill, offset = 6) =>
    `<rect x="${x + offset}" y="${y + offset}" width="${w}" height="${h}" rx="${r}" fill="${INK}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${INK}" stroke-width="3"/>`

  p.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>`)
  p.push(block(32, 32, WIDTH - 72, HEIGHT - 72, 16, CARD, 8))

  const L = 76
  const PANEL_RIGHT = WIDTH - 32 - 8

  // A tag, square-cornered on the top left, the same shape the page uses.
  const tagLabel = `${esc(countryName)} \u00b7 ${year}`.toUpperCase()
  const tagW = tagLabel.length * 10.6 + 30
  p.push(
    `<path d="M${L} ${72} h${tagW - 8} a8 8 0 0 1 8 8 v22 a8 8 0 0 1 -8 8 h-${tagW - 16} a8 8 0 0 1 -8 -8 v-30 z"` +
      ` transform="translate(4,4)" fill="${INK}"/>`
  )
  p.push(
    `<path d="M${L} ${72} h${tagW - 8} a8 8 0 0 1 8 8 v22 a8 8 0 0 1 -8 8 h-${tagW - 16} a8 8 0 0 1 -8 -8 v-30 z"` +
      ` fill="${TAG}" stroke="${INK}" stroke-width="3"/>`
  )
  p.push(text(L + 15, 96, 15, INK, tagLabel, 'Archivo Black'))

  // The number, as large as it will go. This is the whole point of the card.
  p.push(text(L, 206, 104, INK, `${plan.totalDaysOff} days off`, 'Archivo Black'))
  p.push(
    text(L, 252, 31, MUTED, `from ${plan.leaveSpent} days of leave, in ${plan.breaks.length} breaks`, 'Public Sans', 600)
  )

  // The multiplier, as a sticker, because it is the line people repeat.
  const ratio = plan.leaveSpent > 0 ? (plan.totalDaysOff / plan.leaveSpent).toFixed(1) : '0'
  const stickW = 250
  const stickX = PANEL_RIGHT - stickW - 36
  p.push(block(stickX, 96, stickW, 118, 14, LEAVE, 6))
  p.push(text(stickX + stickW / 2, 172, 62, INK, `${ratio}\u00d7`, 'Archivo Black', 400, 'middle'))
  p.push(text(stickX + stickW / 2, 199, 15, INK, 'DAYS OFF PER DAY BOOKED', 'Public Sans', 800, 'middle'))

  // Twelve bars, one per month, stacked: the days you pay for at the bottom and
  // the weekends and holidays they unlock stacked on top.
  const months = byMonth(calendar, plan)
  const peak = Math.max(1, ...months.map((m) => m.booked + m.free))
  const chartTop = 296
  const chartBottom = 486
  const chartH = chartBottom - chartTop
  const gap = 13
  const barW = Math.floor((WIDTH - L * 2 - gap * 11) / 12)

  p.push(
    `<line x1="${L}" y1="${chartBottom + 2}" x2="${L + 12 * barW + 11 * gap}" y2="${chartBottom + 2}" stroke="${INK}" stroke-width="3"/>`
  )

  for (let m = 0; m < 12; m++) {
    const x = L + m * (barW + gap)
    const total = months[m].booked + months[m].free
    const label = MONTHS[m]

    if (total === 0) {
      // An empty month still gets a mark, so the gaps in the year are visible.
      p.push(`<rect x="${x}" y="${chartBottom - 6}" width="${barW}" height="6" rx="2" fill="${WEEKEND}"/>`)
    } else {
      const h = Math.max(14, Math.round((total / peak) * chartH))
      const bookedH = Math.round((months[m].booked / total) * h)
      const y = chartBottom - h
      p.push(`<rect x="${x + 4}" y="${y + 4}" width="${barW}" height="${h}" rx="6" fill="${INK}"/>`)
      p.push(`<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="6" fill="${BAND}"/>`)
      p.push(
        `<path d="M${x} ${chartBottom - bookedH} h${barW} v${bookedH - 6} a6 6 0 0 1 -6 6 h-${barW - 12} a6 6 0 0 1 -6 -6 z" fill="${LEAVE}"/>`
      )
      p.push(`<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="6" fill="none" stroke="${INK}" stroke-width="3"/>`)
      p.push(text(x + barW / 2, y - 12, 19, INK, String(total), 'Archivo Black', 400, 'middle'))
    }
    p.push(text(x + barW / 2, chartBottom + 26, 16, MUTED, label, 'Public Sans', 800, 'middle'))
  }

  // A key, so the two halves of each bar are not a guess.
  const keyY = 546
  p.push(`<rect x="${L}" y="${keyY - 11}" width="14" height="14" rx="3" fill="${LEAVE}" stroke="${INK}" stroke-width="2"/>`)
  p.push(text(L + 22, keyY, 16, MUTED, 'days you book', 'Public Sans', 600))
  p.push(`<rect x="${L + 168}" y="${keyY - 11}" width="14" height="14" rx="3" fill="${BAND}" stroke="${INK}" stroke-width="2"/>`)
  p.push(text(L + 190, keyY, 16, MUTED, 'days they unlock', 'Public Sans', 600))

  const longest = plan.breaks.reduce((a, b) => (b.length > (a?.length || 0) ? b : a), null)
  if (longest) {
    const sd = Number(longest.start.slice(8))
    const sm = MONTHS[Number(longest.start.slice(5, 7)) - 1]
    const ed = Number(longest.end.slice(8))
    const em = MONTHS[Number(longest.end.slice(5, 7)) - 1]
    const span = sm === em ? `${sd}\u2013${ed} ${em}` : `${sd} ${sm} \u2013 ${ed} ${em}`
    p.push(
      text(
        PANEL_RIGHT - 36,
        keyY,
        16,
        MUTED,
        `Longest: ${esc(span)}, ${longest.length} days for ${longest.cost} booked`,
        'Public Sans',
        600,
        'end'
      )
    )
  }

  p.push(text(L, 578, 21, INK, 'BridgeDays', 'Archivo Black'))
  p.push(text(L + 102, 578, 17, MUTED, 'Work out which days to book. Nothing leaves your device.', 'Public Sans', 600))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${p.join('')}</svg>`
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
    `${plan.totalDaysOff} days off from ${plan.leaveSpent} days of leave in ${year}, for ` +
    `${data.countryName}, across ${plan.breaks.length} breaks. A bar for each month shows how ` +
    `many days off it holds, split into the days you book and the weekends and holidays they unlock.`
  writeFileSync(resolve(ROOT, 'public/og.alt.txt'), alt + '\n', 'utf8')

  console.log(`og.png  ${Math.round(png.length / 1024)}KB  ${data.countryName} ${year}: ${plan.leaveSpent} -> ${plan.totalDaysOff} days off in ${plan.breaks.length} breaks`)
  console.log(`alt: ${alt}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
