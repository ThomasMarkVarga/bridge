#!/usr/bin/env node
/**
 * The same preview, rendered out as a real animated file.
 *
 * The wall on vibe-coding.fans animates its previews with CSS, and the version
 * in bridgedays-preview.html is built that way. This is the fallback for
 * anywhere that needs a picture instead: a README, a tweet, a directory listing
 * that will not run stylesheets.
 *
 * It is not a screen recording. The geometry is the geometry the browser
 * measured off the real preview, and the keyframes below are the keyframes in
 * the stylesheet, replayed here with the same cubic-bezier. So the two cannot
 * drift into looking like different animations, and every frame is vector-sharp
 * rather than a resampled screenshot.
 *
 * Usage: node featured-preview/make-gif.mjs
 * Needs: ffmpeg on PATH. Everything else is already a dev dependency.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { Resvg } from '@resvg/resvg-js'
import wawoff from 'wawoff2'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const W = 339
const H = 184
const SCALE = 2 // the card is shown at 339 wide, so this is the retina copy
const LOOP = 7 // seconds, matching --bd-loop
const FPS = 25 // 25 divides into GIF centiseconds exactly: 4cs a frame, no drift

const INK = '#16202b'
const PAPER = '#fffefb'
const SAND = '#e6e0d4'
const CORAL = '#ff6b4a'
const BAND = '#ffe2d8'
const SEA = '#12806f'
const SUN = '#ffc845'
const MUTED = '#4a5a68'

/* ---------------------------------------------------------------- easing --
 * cubic-bezier(.2, .8, .2, 1), solved the way a browser solves it: Newton on
 * the x curve to recover the parameter, then read y off it.
 */
function cubicBezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a
  const B = (a, b) => 3 * b - 6 * a
  const C = (a) => 3 * a
  const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a)

  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const d = slope(t, x1, x2)
      if (d === 0) break
      const err = calc(t, x1, x2) - x
      if (Math.abs(err) < 1e-7) break
      t -= err / d
    }
    return calc(t, y1, y2)
  }
}

const EASE = cubicBezier(0.2, 0.8, 0.2, 1)

/**
 * Read a set of keyframes at a given percentage through the loop. The timing
 * function applies within each pair of adjacent stops, which is what the
 * browser does when it is declared on the element rather than per keyframe.
 */
function track(stops, pct) {
  const p = Math.max(0, Math.min(100, pct))
  let i = 0
  while (i < stops.length - 2 && stops[i + 1].at <= p) i++
  const a = stops[i]
  const b = stops[i + 1]
  const span = b.at - a.at
  const local = span <= 0 ? 1 : (p - a.at) / span
  const e = EASE(local)
  const out = {}
  for (const key of Object.keys(a.v)) out[key] = a.v[key] + (b.v[key] - a.v[key]) * e
  return out
}

// The keyframes, transcribed from the stylesheet.
const HIDDEN = { o: 0, ty: 5, s: 0.86 }
const SHOWN = { o: 1, ty: 0, s: 1 }
/** One set per booked day, staggering the arrival but not the exit. */
const book = (enterFrom, enterTo) => [
  { at: 0, v: HIDDEN },
  { at: enterFrom, v: HIDDEN },
  { at: enterTo, v: SHOWN },
  { at: 90, v: SHOWN },
  { at: 95, v: HIDDEN },
  { at: 100, v: HIDDEN }
]
const BOOK = [book(6, 12), book(9, 15), book(12, 18)]
const SPAN = [
  { at: 0, v: { sx: 0, o: 1 } },
  { at: 22, v: { sx: 0, o: 1 } },
  { at: 40, v: { sx: 1, o: 1 } },
  { at: 90, v: { sx: 1, o: 1 } },
  { at: 95, v: { sx: 1, o: 0 } },
  { at: 100, v: { sx: 1, o: 0 } }
]
const GAIN = [
  { at: 0, v: { o: 0, s: 0.9 } },
  { at: 44, v: { o: 0, s: 0.9 } },
  { at: 51, v: { o: 1, s: 1 } },
  { at: 90, v: { o: 1, s: 1 } },
  { at: 95, v: { o: 0, s: 0.9 } },
  { at: 100, v: { o: 0, s: 0.9 } }
]
// steps(1, end): it holds, then it is gone. No fade.
const cost = (pct) => (pct < 45 || pct >= 95 ? 1 : 0)

/* -------------------------------------------------------------- geometry --
 * Measured off the rendered preview rather than recomputed from the CSS, so
 * there is one layout rather than two that have to agree.
 */
const STRIP = { x: 14.39, y: 52.2, w: 310.22, h: 40 }
const COL = 34.8 // pitch: 31.8 wide with a 3px gap
const DAY_W = 31.8
const SPAN_BOX = { x: STRIP.x - 4, y: STRIP.y - 5, w: STRIP.w + 8, h: STRIP.h + 10 }
const LABEL_MID = 64.2 // centre of the 12px line box in every day
const DOT_Y = 84.2 // centre of the 4px dot
const DATES = { x: 14.39, mid: 120.8, size: 10.5 }
const BADGE = { x: 219.17, y: 109.8, w: 105.44, h: 22 }
const BADGE_TEXT = { x: BADGE.x + 10, mid: 120.8 }

const DAYS = [
  { n: '28', kind: 'weekend' },
  { n: '29', kind: 'weekend' },
  { n: '30', kind: 'holiday' },
  { n: '1', kind: 'holiday' },
  { n: '2', kind: 'booked', i: 0 },
  { n: '3', kind: 'booked', i: 1 },
  { n: '4', kind: 'booked', i: 2 },
  { n: '5', kind: 'weekend' },
  { n: '6', kind: 'weekend' }
]

/* ------------------------------------------------------------------ svg ---- */

const n = (v) => Number(v.toFixed(3))

/** A border sits inside the box; an SVG stroke straddles the path. Inset it. */
function box(x, y, w, h, r, fill, stroke, sw) {
  const h2 = sw / 2
  return (
    `<rect x="${n(x + h2)}" y="${n(y + h2)}" width="${n(w - sw)}" height="${n(h - sw)}" ` +
    `rx="${n(Math.max(0, r - h2))}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  )
}
/** box-shadow 2px 2px 0 0: the same shape, offset, underneath. */
const shadow = (x, y, w, h, r) =>
  `<rect x="${n(x + 2)}" y="${n(y + 2)}" width="${n(w)}" height="${n(h)}" rx="${r}" fill="${INK}"/>`

/**
 * Digits centred on their cap height rather than on the font's baseline box,
 * which is what the eye reads as centred.
 */
const CAP = 0.36
const text = (x, mid, size, weight, fill, content, anchor = 'start', tracking = 0) =>
  `<text x="${n(x)}" y="${n(mid + size * CAP)}" font-family="Public Sans" font-size="${size}" ` +
  `font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"` +
  (tracking ? ` letter-spacing="${tracking}"` : '') +
  `>${content}</text>`

function frame(time) {
  const pct = (t) => ((((t % LOOP) + LOOP) % LOOP) / LOOP) * 100
  const p = []

  p.push(
    `<rect width="${W}" height="${H}" fill="${PAPER}"/>`,
    `<rect width="${W}" height="${H}" fill="url(#grid)"/>`
  )

  // The span, behind the days, growing from its left edge.
  const s = track(SPAN, pct(time))
  if (s.sx > 0.001 && s.o > 0.002) {
    const ox = SPAN_BOX.x
    const oy = SPAN_BOX.y + SPAN_BOX.h / 2
    p.push(
      `<g opacity="${n(s.o)}" transform="translate(${n(ox)} ${n(oy)}) scale(${n(s.sx)} 1) translate(${n(-ox)} ${n(-oy)})">`,
      shadow(SPAN_BOX.x, SPAN_BOX.y, SPAN_BOX.w, SPAN_BOX.h, 9),
      box(SPAN_BOX.x, SPAN_BOX.y, SPAN_BOX.w, SPAN_BOX.h, 9, BAND, INK, 2),
      `</g>`
    )
  }

  DAYS.forEach((day, idx) => {
    const x = STRIP.x + idx * COL
    const cx = x + DAY_W / 2
    const cy = STRIP.y + STRIP.h / 2
    const parts = []

    if (day.kind === 'weekend') {
      parts.push(box(x, STRIP.y, DAY_W, STRIP.h, 6, SAND, INK, 1.5))
      parts.push(text(cx, LABEL_MID, 12, 700, INK, day.n, 'middle'))
    } else if (day.kind === 'holiday') {
      parts.push(box(x, STRIP.y, DAY_W, STRIP.h, 6, SEA, INK, 1.5))
      parts.push(text(cx, LABEL_MID, 12, 700, PAPER, day.n, 'middle'))
      // A ring: 4px across with a 1.5px border drawn inside it.
      parts.push(
        `<circle cx="${n(cx)}" cy="${DOT_Y}" r="1.25" fill="none" stroke="${PAPER}" stroke-width="1.5"/>`
      )
    } else {
      parts.push(box(x, STRIP.y, DAY_W, STRIP.h, 6, CORAL, INK, 1.5))
      parts.push(text(cx, LABEL_MID, 12, 700, INK, day.n, 'middle'))
      parts.push(`<circle cx="${n(cx)}" cy="${DOT_Y}" r="2" fill="${INK}"/>`)
      // The pier that holds the span up over the days you paid for.
      parts.push(`<rect x="${n(cx - 1)}" y="${n(STRIP.y + STRIP.h + 1)}" width="2" height="6" fill="${INK}"/>`)
    }

    if (day.kind !== 'booked') {
      p.push(parts.join(''))
      return
    }

    const a = track(BOOK[day.i], pct(time))
    if (a.o <= 0.002) return
    p.push(
      `<g opacity="${n(a.o)}" transform="translate(${n(cx)} ${n(cy)}) translate(0 ${n(a.ty)}) ` +
        `scale(${n(a.s)}) translate(${n(-cx)} ${n(-cy)})">${parts.join('')}</g>`
    )
  })

  p.push(text(DATES.x, DATES.mid, DATES.size, 700, MUTED, '28 Nov to 6 Dec', 'start', 0.105))

  // What you spend, then what you get.
  if (cost(pct(time)) > 0) {
    p.push(
      shadow(BADGE.x, BADGE.y, BADGE.w, BADGE.h, 6),
      box(BADGE.x, BADGE.y, BADGE.w, BADGE.h, 6, PAPER, INK, 2),
      text(BADGE_TEXT.x, BADGE_TEXT.mid, 12, 900, INK, '3 days booked')
    )
  }
  const g = track(GAIN, pct(time))
  if (g.o > 0.002) {
    const cx = BADGE.x + BADGE.w / 2
    const cy = BADGE.y + BADGE.h / 2
    p.push(
      `<g opacity="${n(g.o)}" transform="translate(${n(cx)} ${n(cy)}) scale(${n(g.s)}) translate(${n(-cx)} ${n(-cy)})">` +
        shadow(BADGE.x, BADGE.y, BADGE.w, BADGE.h, 6) +
        box(BADGE.x, BADGE.y, BADGE.w, BADGE.h, 6, SUN, INK, 2) +
        text(BADGE_TEXT.x, BADGE_TEXT.mid, 12, 900, INK, '9 days off') +
        `</g>`
    )
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><pattern id="grid" width="18" height="18" patternUnits="userSpaceOnUse">` +
    `<rect width="1" height="18" fill="${INK}" opacity="0.05"/>` +
    `<rect width="18" height="1" fill="${INK}" opacity="0.05"/>` +
    `</pattern></defs>` +
    p.join('') +
    `</svg>`
  )
}

/* ------------------------------------------------------------------ run ---- */

async function main() {
  // The same woff2 the site serves, decompressed to a file because this version
  // of resvg ignores font buffers and quietly falls back to a default face.
  const scratch = join(tmpdir(), 'bridgedays-preview-frames')
  rmSync(scratch, { recursive: true, force: true })
  mkdirSync(scratch, { recursive: true })
  const fontFiles = []
  for (const [name, file] of [
    ['PublicSans.ttf', 'public/fonts/public-sans-latin-wght-normal.woff2'],
    ['PublicSansExt.ttf', 'public/fonts/public-sans-latin-ext-wght-normal.woff2']
  ]) {
    const out = join(scratch, name)
    writeFileSync(out, Buffer.from(await wawoff.decompress(readFileSync(resolve(ROOT, file)))))
    fontFiles.push(out)
  }

  const total = LOOP * FPS
  for (let i = 0; i < total; i++) {
    const png = new Resvg(frame((i / FPS)), {
      fitTo: { mode: 'width', value: W * SCALE },
      font: { fontFiles, defaultFontFamily: 'Public Sans', loadSystemFonts: false }
    })
      .render()
      .asPng()
    writeFileSync(join(scratch, `f${String(i).padStart(4, '0')}.png`), png)
  }

  const pattern = join(scratch, 'f%04d.png')
  const gif = resolve(__dirname, 'bridgedays-preview.gif')
  const mp4 = resolve(__dirname, 'bridgedays-preview.mp4')
  const palette = join(scratch, 'palette.png')
  const run = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })

  // Flat colour, so one palette for the whole loop beats a per-frame one: no
  // dithering churn between frames, which is most of what makes a GIF heavy.
  run(['-framerate', String(FPS), '-i', pattern, '-vf', 'palettegen=max_colors=64:stats_mode=full', palette])
  run([
    '-framerate', String(FPS), '-i', pattern, '-i', palette,
    '-lavfi', 'paletteuse=dither=none:diff_mode=rectangle',
    '-loop', '0', gif
  ])
  run([
    '-framerate', String(FPS), '-i', pattern,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart',
    mp4
  ])

  rmSync(scratch, { recursive: true, force: true })
  const size = (f) => `${(readFileSync(f).length / 1024).toFixed(0)}KB`
  console.log(`${total} frames at ${W * SCALE}x${H * SCALE}, ${FPS}fps, ${LOOP}s loop`)
  console.log(`  bridgedays-preview.gif  ${size(gif)}`)
  console.log(`  bridgedays-preview.mp4  ${size(mp4)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
