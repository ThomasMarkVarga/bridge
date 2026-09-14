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
import { toDayNumber, dayOfWeek } from '../solver/plainDate.js'

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
  ctx.scale(dpr, dpr)
  const t = THEMES[theme] || THEMES.light

  ctx.fillStyle = t.bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const display = (size) => `400 ${size}px 'Archivo Black', 'Public Sans', system-ui, sans-serif`
  const body = (size, weight = 500) =>
    `${weight} ${size}px 'Public Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`

  const PAD = 64

  // The outlined panel the whole card sits in.
  hardRect(ctx, 28, 28, WIDTH - 66, HEIGHT - 66, 14, t.panel, t.rule, 6)

  ctx.textBaseline = 'alphabetic'

  // A sticker, exactly like the ones on the page.
  ctx.font = body(20, 800)
  const stickerText = 'NO SIGN-UP · NOTHING LEAVES YOUR DEVICE'
  const stickerW = ctx.measureText(stickerText).width + 36
  hardRect(ctx, PAD, 62, stickerW, 40, 8, t.tag, INK_FIXED, 3)
  ctx.fillStyle = INK_FIXED
  ctx.fillText(stickerText, PAD + 18, 89)

  // The number, as large as it will go. This is the whole point of the card.
  ctx.fillStyle = t.ink
  ctx.font = display(104)
  const headline = `${plan.totalDaysOff} days off`
  ctx.fillText(headline, PAD, 196)

  ctx.font = body(34, 600)
  ctx.fillStyle = t.muted
  const breaks = plan.breaks.length === 1 ? '1 break' : `${plan.breaks.length} breaks`
  ctx.fillText(`from ${plan.leaveSpent} days of leave, in ${breaks}`, PAD, 246)

  ctx.font = body(26, 800)
  ctx.fillStyle = t.ink
  ctx.fillText(`${countryLabel} · ${periodLabel}`, PAD, 292)

  // The year as a shape: 7 rows of days, one column per week.
  drawYearStrip(ctx, { calendar, plan, theme: t, x: PAD, y: 328, width: WIDTH - PAD * 2, height: 150 })

  // The longest break, named, because that is the thing people react to.
  const longest = plan.breaks.reduce((a, b) => (b.length > (a?.length || 0) ? b : a), null)
  if (longest) {
    ctx.font = body(24, 600)
    ctx.fillStyle = t.muted
    const label = `Longest stretch: ${formatSpan(longest.start, longest.end)} · ${longest.length} days for ${longest.cost} booked`
    ctx.fillText(label, PAD, HEIGHT - 96)
  }

  ctx.font = display(26)
  ctx.fillStyle = t.ink
  ctx.fillText('Bridge', PAD, HEIGHT - 56)
  ctx.font = body(21, 600)
  ctx.fillStyle = t.muted
  ctx.fillText('Work out which days to book.', PAD + 130, HEIGHT - 56)

  return c
}

/**
 * Seven rows, one column per week, so a break reads as a solid vertical block and
 * a run of them reads as a rhythm across the year.
 */
function drawYearStrip(ctx, { calendar, plan, theme, x, y, width, height }) {
  if (!calendar.length) return

  const leave = new Set(plan.leaveDates)
  const inBreak = new Set()
  for (const b of plan.breaks) {
    for (let i = b.startIndex; i <= b.endIndex; i++) inBreak.add(i)
  }

  const first = calendar[0]
  const startOffset = dayOfWeek(first.date) - 1 // Monday is column 0
  const totalSlots = startOffset + calendar.length
  const weeks = Math.ceil(totalSlots / 7)

  const gap = 2
  const cell = Math.min((width - (weeks - 1) * gap) / weeks, (height - 6 * gap) / 7)
  const gridW = weeks * cell + (weeks - 1) * gap
  const originX = x + (width - gridW) / 2

  for (let i = 0; i < calendar.length; i++) {
    const day = calendar[i]
    const slot = startOffset + i
    const col = Math.floor(slot / 7)
    const row = slot % 7

    const cx = originX + col * (cell + gap)
    const cy = y + row * (cell + gap)

    let fill = theme.work
    if (day.isFree) fill = day.holidayName ? theme.holiday : theme.weekend
    if (inBreak.has(i)) fill = theme.band
    if (leave.has(day.date)) fill = theme.leave

    ctx.fillStyle = fill
    roundRect(ctx, cx, cy, cell, cell, Math.min(3, cell / 4))
    ctx.fill()

    // Every day you actually book is outlined, so the pattern of bookings reads
    // even when the picture is shrunk to a thumbnail.
    if (leave.has(day.date)) {
      ctx.strokeStyle = INK_FIXED
      ctx.lineWidth = 1.5
      roundRect(ctx, cx, cy, cell, cell, Math.min(3, cell / 4))
      ctx.stroke()
    }
  }
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
  return (
    `A calendar of ${periodLabel} for ${countryLabel}, with ${plan.breaks.length} ` +
    `${plan.breaks.length === 1 ? 'break' : 'breaks'} marked. ` +
    `${plan.leaveSpent} days of leave become ${plan.totalDaysOff} days off.`
  )
}
