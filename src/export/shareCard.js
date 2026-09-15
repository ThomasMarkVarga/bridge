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
import { t as tr } from '../i18n/core.js'
import { counted, formatRange, monthsShort } from '../format.js'

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
  // Deliberately no inline width or height. Setting them pinned the element to
  // 1200px, which is wider than a phone, so the whole page zoomed out to fit the
  // moment the picture appeared. The backing store stays full size; CSS decides
  // how big it is drawn.

  const ctx = c.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const t = THEMES[theme] || THEMES.light

  const display = (size) => `400 ${size}px 'Archivo Black', 'Public Sans', system-ui, sans-serif`
  const body = (size, weight = 600) =>
    `${weight} ${size}px 'Public Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`

  /**
   * The largest size at or below `size` that keeps the text inside `maxWidth`.
   *
   * The card is drawn in whatever language the page is in, and a line that fits
   * in English is not a line that fits anywhere else. The sticker label is
   * "DAYS OFF PER DAY BOOKED" in English and half again as long in Romanian,
   * inside a sticker that is a fixed 250 wide, so it ran off both edges.
   * Measuring is the only thing that holds for a language nobody has added yet.
   */
  const fit = (str, maxWidth, make, size) => {
    let px = size
    ctx.font = make(px)
    while (px > 8 && ctx.measureText(str).width > maxWidth) {
      px -= 1
      ctx.font = make(px)
    }
    return make(px)
  }

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
  // Worked out before the headline is drawn, because the headline has to stop
  // short of it and the amount of room left is not a number worth guessing.
  const stickW = 250
  const stickX = PANEL_RIGHT - stickW - 36

  const headline = counted('daysOff', plan.totalDaysOff)
  write(headline, L, 206, fit(headline, stickX - L - 24, display, 104), t.ink)
  write(
    tr('card.fromLeave', {
      leave: counted('leaveDays', plan.leaveSpent),
      breaks: counted('breaks', plan.breaks.length)
    }),
    L,
    252,
    body(31),
    t.muted
  )

  // The multiplier, as a sticker, because it is the line people repeat.
  const ratio = plan.leaveSpent > 0 ? (plan.totalDaysOff / plan.leaveSpent).toFixed(1) : '0'
  hardRect(ctx, stickX, 96, stickW, 118, 14, t.leave, INK_FIXED, 6)
  write(`${ratio}\u00d7`, stickX + stickW / 2, 172, display(62), INK_FIXED, 'center')
  const perDay = tr('card.perDayBooked')
  write(
    perDay,
    stickX + stickW / 2,
    199,
    fit(perDay, stickW - 20, (px) => body(px, 800), 15),
    INK_FIXED,
    'center'
  )

  drawMonthBars(ctx, { calendar, plan, t, L, write, display, body, right: PANEL_RIGHT })

  // A key, so the two halves of each bar are not a guess.
  //
  // The second swatch is placed after the first label rather than at a fixed
  // offset. The offset used to be 168, which is the width of "days you book"
  // and nothing else: in Romanian the label is "zile pe care le ceri" and the
  // second swatch landed on top of it.
  const keyY = 546
  swatch(ctx, L, keyY - 11, t.leave, t.rule)
  write(tr('card.daysYouBook'), L + 22, keyY, body(16), t.muted)
  ctx.font = body(16)
  const secondSwatchX = L + 22 + ctx.measureText(tr('card.daysYouBook')).width + 28
  swatch(ctx, secondSwatchX, keyY - 11, t.band, t.rule)
  write(tr('card.daysUnlocked'), secondSwatchX + 22, keyY, body(16), t.muted)

  const longest = plan.breaks.reduce((a, b) => (b.length > (a?.length || 0) ? b : a), null)
  if (longest) {
    write(
      tr('card.longest', {
        range: formatRange(longest.start, longest.end),
        days: counted('daysOff', longest.length),
        cost: counted('days', longest.cost)
      }),
      PANEL_RIGHT - 36,
      keyY,
      fit(
        tr('card.longest', {
          range: formatRange(longest.start, longest.end),
          days: counted('daysOff', longest.length),
          cost: counted('days', longest.cost)
        }),
        PANEL_RIGHT - 36 - (secondSwatchX + 22 + ctx.measureText(tr('card.daysUnlocked')).width + 24),
        body,
        16
      ),
      t.muted,
      'right'
    )
  }

  write('BridgeDays', L, 578, display(21), t.ink)
  ctx.font = display(21)
  const taglineX = L + ctx.measureText('BridgeDays').width + 14
  const tagline = tr('card.tagline')
  write(tagline, taglineX, 578, fit(tagline, PANEL_RIGHT - taglineX - 36, body, 17), t.muted)

  return c
}

function drawMonthBars(ctx, { calendar, plan, t, L, write, display, body, right }) {
  const MONTHS = monthsShort()
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

/** Turn the canvas into a file the browser saves. */
export function downloadCard(canvas, filename = 'bridge.png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(tr('card.imageFailed')))
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
    throw new Error(tr('card.copyUnsupported'))
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error(tr('card.imageFailed'))
  await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
}

/**
 * Wording for a post. Plain, specific, and no jargon: the numbers do the work.
 */
export function shareText({ plan, countryLabel, periodLabel }) {
  const longest = plan.breaks.reduce((a, b) => (b.length > (a?.length || 0) ? b : a), null)
  const ratio = plan.leaveSpent > 0 ? (plan.totalDaysOff / plan.leaveSpent).toFixed(1) : '0'
  const lines = [
    tr('card.shareLine1', {
      count: plan.leaveSpent,
      leave: counted('leaveDays', plan.leaveSpent),
      off: counted('daysOff', plan.totalDaysOff),
      period: periodLabel
    }),
    tr('card.shareLine2', { ratio })
  ]
  if (longest) {
    lines.push(
      tr('card.shareBest', {
        range: formatRange(longest.start, longest.end),
        off: counted('daysOff', longest.length),
        cost: counted('days', longest.cost)
      })
    )
  }
  lines.push(tr('card.shareFooter', { country: countryLabel }))
  return lines.join('\n')
}

/** Alt text, so the image is not a dead end for anyone. */
export function shareCardAlt({ plan, countryLabel, periodLabel }) {
  const ratio = plan.leaveSpent > 0 ? (plan.totalDaysOff / plan.leaveSpent).toFixed(1) : '0'
  return tr('card.alt', {
    leave: counted('leaveDays', plan.leaveSpent),
    off: counted('daysOff', plan.totalDaysOff),
    period: periodLabel,
    country: countryLabel,
    breaks: counted('breaks', plan.breaks.length),
    ratio
  })
}
