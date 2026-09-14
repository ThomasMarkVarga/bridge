/**
 * The share card, drawn on a canvas in the page.
 *
 * It is never uploaded. The image is produced from the plan already on screen,
 * handed to the browser as a file or to the clipboard, and then forgotten.
 *
 * It has to survive being shrunk to a thumbnail in a chat window, so the headline
 * is very large and the year strip is a shape rather than a set of readable dates.
 * Someone glancing at it should get "that is a lot of time off" before they read
 * a single word.
 */
const WIDTH = 1200
const HEIGHT = 630

const THEMES = {
  light: {
    bg: '#faf5ec',
    panel: '#fffefb',
    ink: '#16202b',
    muted: '#4a5a68',
    rule: '#16202b',
    work: '#f3eee2',
    weekend: '#e6e0d4',
    holiday: '#12806f',
    band: '#ffe2d8',
    leave: '#ff6b4a',
    tag: '#ffc845'
  },
  dark: {
    bg: '#121920',
    panel: '#1b242e',
    ink: '#f3efe4',
    muted: '#a8b6c2',
    rule: '#f3efe4',
    work: '#222c37',
    weekend: '#2d3a46',
    holiday: '#2fc7ab',
    band: '#5c2f24',
    leave: '#ff6b4a',
    tag: '#ffc845'
  }
}

/** Deep ink that never flips: the accent fills are the same in both themes. */
const INK_FIXED = '#16202b'

/** A hard offset shadow, drawn as a solid rectangle behind the shape. */
function hardRect(ctx, x, y, w, h, radius, fill, stroke, offset = 6) {
  ctx.fillStyle = stroke
  roundRect(ctx, x + offset, y + offset, w, h, radius)
  ctx.fill()
  ctx.fillStyle = fill
  roundRect(ctx, x, y, w, h, radius)
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = stroke
  roundRect(ctx, x, y, w, h, radius)
  ctx.stroke()
}

/**
 * Split the plan by month, into the days you pay for and the days they unlock.
 *
 * Twelve bars say "here is your year" far faster than 365 tiny squares, and they
 * survive being shrunk to a thumbnail in a chat window, which is the only size
 * this image is ever really seen at.
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

/**
 * Draw the card.
 *
 * @param {object} input
 * @param {import('../solver/solve.js').Plan} input.plan
 * @param {import('../solver/calendar.js').Day[]} input.calendar
 * @param {string} input.countryLabel
 * @param {string} input.periodLabel
 * @param {'light'|'dark'} [input.theme]
 * @param {HTMLCanvasElement} [input.canvas]
 * @returns {HTMLCanvasElement}
 */
export function drawShareCard({ plan, calendar, countryLabel, periodLabel, theme = 'light', canvas }) {
  const c = canvas || document.createElement('canvas')
  const dpr = 2
  c.width = WIDTH * dpr
  c.height = HEIGHT * dpr
  c.style.width = `${WIDTH}px`
  c.style.height = `${HEIGHT}px`

  const ctx = c.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const t = THEMES[theme] || THEMES.light

  const display = (size) => `400 ${size}px 'Archivo Black', 'Public Sans', system-ui, sans-serif`
  const body = (size, weight = 600) =>
    `${weight} ${size}px 'Public Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`

  const write = (str, x, y, font, fill, align = 'left') => {
    ctx.font = font
    ctx.fillStyle = fill
    ctx.textAlign = align
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(str, x, y)
    ctx.textAlign = 'left'
  }

  ctx.fillStyle = t.bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  hardRect(ctx, 32, 32, WIDTH - 72, HEIGHT - 72, 16, t.panel, t.rule, 8)

  const L = 76
  const PANEL_RIGHT = WIDTH - 40

  // A tag, square-cornered on the top left, the shape the page uses everywhere.
  const tagLabel = `${countryLabel} \u00b7 ${periodLabel}`.toUpperCase()
  ctx.font = display(15)
  const tagW = ctx.measureText(tagLabel).width + 30
  tagRect(ctx, L, 72, tagW, 38, t.tag, INK_FIXED)
  write(tagLabel, L + 15, 96, display(15), INK_FIXED)

  // The number, as large as it will go. This is the whole point of the card.
  write(`${plan.totalDaysOff} days off`, L, 206, display(104), t.ink)
  write(
    `from ${plan.leaveSpent} days of leave, in ${plan.breaks.length} ${plan.breaks.length === 1 ? 'break' : 'breaks'}`,
    L,
    252,
    body(31),
    t.muted
  )

  // The multiplier, as a sticker, because it is the line people repeat.
  const ratio = plan.leaveSpent > 0 ? (plan.totalDaysOff / plan.leaveSpent).toFixed(1) : '0'
  const stickW = 250
  const stickX = PANEL_RIGHT - stickW - 36
  hardRect(ctx, stickX, 96, stickW, 118, 14, t.leave, INK_FIXED, 6)
  write(`${ratio}\u00d7`, stickX + stickW / 2, 172, display(62), INK_FIXED, 'center')
  write('DAYS OFF PER DAY BOOKED', stickX + stickW / 2, 199, body(15, 800), INK_FIXED, 'center')

  drawMonthBars(ctx, { calendar, plan, t, L, write, display, body, right: PANEL_RIGHT })

  // A key, so the two halves of each bar are not a guess.
  const keyY = 546
  swatch(ctx, L, keyY - 11, t.leave, t.rule)
  write('days you book', L + 22, keyY, body(16), t.muted)
  swatch(ctx, L + 168, keyY - 11, t.band, t.rule)
  write('days they unlock', L + 190, keyY, body(16), t.muted)

  const longest = plan.breaks.reduce((a, b) => (b.length > (a?.length || 0) ? b : a), null)
  if (longest) {
    write(
      `Longest: ${formatSpan(longest.start, longest.end)}, ${longest.length} days for ${longest.cost} booked`,
      PANEL_RIGHT - 36,
      keyY,
      body(16),
      t.muted,
      'right'
    )
  }

  write('Bridge', L, 578, display(21), t.ink)
  write('Work out which days to book. Nothing leaves your device.', L + 102, 578, body(17), t.muted)

  return c
}

function drawMonthBars(ctx, { calendar, plan, t, L, write, display, body, right }) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const months = byMonth(calendar, plan)
  const peak = Math.max(1, ...months.map((m) => m.booked + m.free))

  const chartBottom = 486
  const chartH = 190
  const gap = 13
  const barW = Math.floor((WIDTH - L * 2 - gap * 11) / 12)

  ctx.strokeStyle = t.rule
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(L, chartBottom + 2)
  ctx.lineTo(L + 12 * barW + 11 * gap, chartBottom + 2)
  ctx.stroke()

  for (let m = 0; m < 12; m++) {
    const x = L + m * (barW + gap)
    const total = months[m].booked + months[m].free

    if (total === 0) {
      // An empty month still gets a mark, so the gaps in the year are visible.
      ctx.fillStyle = t.weekend
      roundRect(ctx, x, chartBottom - 6, barW, 6, 2)
      ctx.fill()
    } else {
      const h = Math.max(14, Math.round((total / peak) * chartH))
      const bookedH = Math.round((months[m].booked / total) * h)
      const y = chartBottom - h

      ctx.fillStyle = t.rule
      roundRect(ctx, x + 4, y + 4, barW, h, 6)
      ctx.fill()

      ctx.fillStyle = t.band
      roundRect(ctx, x, y, barW, h, 6)
      ctx.fill()

      // The days you pay for, stacked at the bottom of the bar.
      ctx.save()
      roundRect(ctx, x, y, barW, h, 6)
      ctx.clip()
      ctx.fillStyle = t.leave
      ctx.fillRect(x, chartBottom - bookedH, barW, bookedH)
      ctx.restore()

      ctx.strokeStyle = t.rule
      ctx.lineWidth = 3
      roundRect(ctx, x, y, barW, h, 6)
      ctx.stroke()

      write(String(total), x + barW / 2, y - 12, display(19), t.ink, 'center')
    }
    write(MONTHS[m], x + barW / 2, chartBottom + 26, body(16, 800), t.muted, 'center')
  }
}

/** The luggage-tag silhouette: rounded everywhere except the top left. */
function tagRect(ctx, x, y, w, h, fill, stroke) {
  const r = 8
  const path = () => {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.closePath()
  }
  ctx.save()
  ctx.translate(4, 4)
  path()
  ctx.fillStyle = stroke
  ctx.fill()
  ctx.restore()
  path()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = stroke
  ctx.stroke()
}

function swatch(ctx, x, y, fill, stroke) {
  roundRect(ctx, x, y, 14, 14, 3)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = stroke
  ctx.stroke()
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatSpan(start, end) {
  const [, sm, sd] = start.split('-').map(Number)
  const [, em, ed] = end.split('-').map(Number)
  if (sm === em) return `${sd}–${ed} ${MONTHS[em - 1]}`
  return `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]}`
}

/** Turn the canvas into a file the browser saves. */
export function downloadCard(canvas, filename = 'bridge.png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The image could not be created.'))
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      resolve()
    }, 'image/png')
  })
}

/** Put the image straight on the clipboard where the browser allows it. */
export async function copyCardToClipboard(canvas) {
  if (!navigator.clipboard || typeof window.ClipboardItem !== 'function') {
    throw new Error('This browser will not let a page copy an image. Use Save image instead.')
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('The image could not be created.')
  await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
}

/**
 * Wording for a post. Plain, specific, and no jargon: the numbers do the work.
 */
export function shareText({ plan, countryLabel, periodLabel }) {
  const longest = plan.breaks.reduce((a, b) => (b.length > (a?.length || 0) ? b : a), null)
  const ratio = plan.leaveSpent > 0 ? (plan.totalDaysOff / plan.leaveSpent).toFixed(1) : '0'
  const lines = [
    `${plan.leaveSpent} days of leave become ${plan.totalDaysOff} days off in ${periodLabel}.`,
    `That is ${ratio} days off for every day I book.`
  ]
  if (longest) {
    lines.push(
      `The best one: ${formatSpan(longest.start, longest.end)}, ${longest.length} days off for ${longest.cost} booked.`
    )
  }
  lines.push(`Worked out with Bridge for ${countryLabel}.`)
  return lines.join('\n')
}

/** Alt text, so the image is not a dead end for anyone. */
export function shareCardAlt({ plan, countryLabel, periodLabel }) {
  const ratio = plan.leaveSpent > 0 ? (plan.totalDaysOff / plan.leaveSpent).toFixed(1) : '0'
  return (
    `${plan.leaveSpent} days of leave become ${plan.totalDaysOff} days off in ${periodLabel}, for ` +
    `${countryLabel}, across ${plan.breaks.length} ${plan.breaks.length === 1 ? 'break' : 'breaks'}, ` +
    `which is ${ratio} days off for every day booked. A bar for each month shows how many days off ` +
    `it holds, split into the days you book and the weekends and holidays they unlock.`
  )
}
