/**
 * The rotating unit for our other apps.
 *
 * A React port of the one on pastesafe, so the same three products read the same
 * way on both sites. showcase.css switches the layout: an anchor bar fixed to the
 * bottom of small screens, dismissible, and a half-page unit sticky in the right
 * rail of wide ones.
 *
 * It keeps BridgeDays' central promise intact. There is no ad network and no
 * third-party script. The logos are files in this site's own public folder, the
 * links are plain anchors that fetch nothing until somebody clicks one, and every
 * animation is CSS. The request counter in the verification panel still reads
 * zero, which was the point of checking rather than assuming.
 *
 * Each slide paints itself from its own brand theme, so an ad looks like the
 * product it is for rather than like this page.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { MAKERS, INTERVAL_MS } from '../ads/makers.js'

/** Turn a theme object into the `--sc-*` custom properties the stylesheet reads. */
function themeVars(theme) {
  const out = {}
  for (const [k, v] of Object.entries(theme)) out[`--sc-${k}`] = v
  return out
}

/* ------------------------------------------------------------------ motifs --
 * One small scene per product, plain elements animated by showcase.css while
 * that ad is showing. Decorative, so each is hidden from the accessibility tree.
 */

function DataMotif() {
  const rows = [
    ['"title"', 0.9],
    ['"price"', 0.5],
    ['"in_stock"', 0.7],
    ['"rating"', 0.4]
  ]
  return (
    <div className="sc-motif sc-motif-data" aria-hidden="true">
      {rows.map(([key, w], i) => (
        <div className="sc-row" key={key} style={{ '--i': i }}>
          <span className="sc-key">{key}</span>
          <span className="sc-val" style={{ '--w': w }} />
        </div>
      ))}
      <div className="sc-beam" />
    </div>
  )
}

function OrderMotif() {
  // Rows sit in 1.65rem slots, with a 0.7rem gap for the line after slot 2.
  const slotY = (s) => s * 1.65 + (s >= 2 ? 0.7 : 0)
  const rem = (v) => `${+v.toFixed(3)}rem`
  // [text, destination slot]. The list starts in this order and the one that
  // matters most is dragged above the line while the rest slide down a place.
  const rows = [
    ['Pricing page', 1],
    ['Onboarding emails', 2],
    ['Quarterly report', 3],
    ['Fix checkout bug', 0]
  ]

  return (
    <div className="sc-motif sc-motif-order" aria-hidden="true">
      <div className="sc-phone">
        <div className="sc-screen">
          <div className="sc-app-bar">
            <span>Q3 priorities</span>
            <span className="sc-pen" />
          </div>
          <div className="sc-list">
            {[0, 1, 2, 3].map((s) => (
              <span className="sc-rank" key={`rank-${s}`} style={{ '--y': rem(slotY(s)) }}>
                {s + 1}
              </span>
            ))}
            <span className="sc-divider" style={{ '--y': rem(slotY(2) - 0.8) }}>
              Above the line
            </span>
            {rows.map(([text, to], from) => (
              <div
                key={text}
                className={to === 0 ? 'sc-card is-rising' : 'sc-card'}
                style={{ '--y': rem(slotY(from)), '--dy': rem(slotY(to) - slotY(from)) }}
              >
                {text}
                {to === 0 && <span className="sc-finger" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RedactMotif() {
  // Invented on purpose: 123-45-6789 is not a valid SSN, 555-01xx numbers are
  // reserved for fiction, and example.com is reserved for examples.
  const fields = [
    ['Name', 'Emily Johnson'],
    ['SSN', '123-45-6789'],
    ['Address', '1200 Oak St, Austin, TX'],
    ['Phone', '+1 (212) 555-0142'],
    ['Email', 'emily.j@example.com']
  ]
  return (
    <div className="sc-motif sc-motif-redact" aria-hidden="true">
      <div className="sc-doc-title">
        Employment contract<span>Page 1</span>
      </div>
      {fields.map(([label, value], i) => (
        <div className="sc-doc-row" key={label}>
          <span className="sc-doc-label">{label}</span>
          <span className="sc-pii" style={{ '--i': i }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

const MOTIFS = { data: DataMotif, order: OrderMotif, redact: RedactMotif }

/* ----------------------------------------------------------------- the unit -- */

export default function Showcase({ ads = MAKERS }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hiddenTab, setHiddenTab] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const unitRef = useRef(null)

  const show = useCallback((i) => setIndex(((i % ads.length) + ads.length) % ads.length), [ads.length])

  // The progress bar's own animation is the clock, so the bar and the change of
  // ad can never drift apart, and pausing the animation pauses the rotation.
  const onAnimationEnd = (e) => {
    if (e.animationName === 'sc-progress') show(index + 1)
  }

  useEffect(() => {
    const sync = () => setHiddenTab(document.hidden)
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  // The bar is fixed to the bottom on small screens, so the page needs room
  // underneath it. Removed again the moment it is dismissed.
  useEffect(() => {
    document.body.classList.toggle('has-showcase-bar', !dismissed)
    return () => document.body.classList.remove('has-showcase-bar')
  }, [dismissed])

  if (!ads.length) return null

  const classes = [
    'showcase',
    paused ? 'is-paused' : '',
    hiddenTab ? 'is-hidden-tab' : '',
    dismissed ? 'is-dismissed' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={unitRef}
      className={classes}
      style={{ '--sc-interval': `${INTERVAL_MS}ms` }}
      onAnimationEnd={onAnimationEnd}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(unitRef.current?.contains(document.activeElement) || false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => setPaused(unitRef.current?.contains(e.relatedTarget) || false)}
    >
      <button type="button" className="showcase-close" aria-label="Close" onClick={() => setDismissed(true)}>
        &times;
      </button>

      <div className="showcase-stage">
        {ads.map((ad, i) => {
          const Motif = MOTIFS[ad.motif]
          const active = i === index
          return (
            <a
              key={ad.id}
              className={active ? 'sc-slide is-active' : 'sc-slide'}
              style={themeVars(ad.theme)}
              href={ad.url}
              target="_blank"
              rel="noopener"
              // A new tab, so following an ad never throws away the plan someone
              // was in the middle of building.
              inert={active ? undefined : ''}
            >
              {Motif && <Motif />}
              <span className="sc-brand">
                <img className="sc-logo" src={ad.logo} alt="" width="40" height="40" />
                <span className="sc-name">{ad.title}</span>
              </span>
              <span className="sc-headline">{ad.headline}</span>
              <span className="sc-line">{ad.line}</span>
              <span className="sc-cta">
                <span className="sc-cta-text">{ad.cta}</span>
                <span className="sc-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </span>
            </a>
          )
        })}
      </div>

      {/* A tab per product, so all three stay visible while one plays. */}
      <div className="showcase-progress">
        {ads.map((ad, i) => (
          <button
            key={ad.id}
            type="button"
            className={
              i === index ? 'showcase-seg is-active' : i < index ? 'showcase-seg is-done' : 'showcase-seg'
            }
            aria-label={`Show ${ad.title}, ${i + 1} of ${ads.length}`}
            aria-current={i === index}
            onClick={() => show(i)}
          >
            <img src={ad.logo} alt="" width="28" height="28" />
            <span className="showcase-seg-name">{ad.title}</span>
            <i key={`bar-${index}`} />
          </button>
        ))}
      </div>

      {/* The plain line used by the anchor bar, where there is no room for tabs. */}
      <div className="showcase-timer is-running">
        <i key={`timer-${index}`} />
      </div>
    </div>
  )
}
