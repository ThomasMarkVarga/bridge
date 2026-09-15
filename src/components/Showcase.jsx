/**
 * Ads for our other apps.
 *
 * A React port of the unit on pastesafe, so the products read the same way on
 * every site. showcase.css switches the layout: on small screens one ad at a
 * time in a bar fixed to the bottom, dismissible; from 75rem up to three cards
 * stacked in the sticky right rail. With more ads than that the stack slides up
 * one card at a time, so it always shows three however many there are.
 *
 * It keeps BridgeDays' central promise intact. There is no ad network and no
 * third-party script. The logos are files in this site's own public folder, the
 * links are plain anchors that fetch nothing until somebody clicks one, and every
 * animation is CSS. The request counter in the verification panel still reads
 * zero, which was the point of checking rather than assuming.
 *
 * Each card paints itself from its own brand theme, so an ad looks like the
 * product it is for rather than like this page.
 */
import { useEffect, useRef, useState } from 'react'
import { MAKERS, INTERVAL_MS } from '../ads/makers.js'
import { useT } from '../i18n/index.jsx'

const RAIL_CARDS = 3

/** Turn a theme object into the `--sc-*` custom properties the stylesheet reads. */
function themeVars(theme) {
  const out = {}
  for (const [k, v] of Object.entries(theme)) out[`--sc-${k}`] = v
  return out
}

function useMedia(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const sync = () => setMatches(mql.matches)
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [query])
  return matches
}

/* ------------------------------------------------------------------ motifs --
 * One small scene per product, plain elements animated by showcase.css while
 * that card is showing. Decorative: the box they sit in is hidden from the
 * accessibility tree.
 */

function DataMotif() {
  const rows = [
    ['"title"', 0.9],
    ['"price"', 0.5],
    ['"in_stock"', 0.7],
    ['"rating"', 0.4]
  ]
  return (
    <div className="sc-motif sc-motif-data">
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
    <div className="sc-motif sc-motif-order">
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
    <div className="sc-motif sc-motif-redact">
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

function SiteMotif() {
  // A small business website puts itself together, then the price lands on it.
  return (
    <div className="sc-motif sc-motif-site">
      <div className="sc-browser">
        <div className="sc-browser-bar">
          <i />
          <i />
          <i />
          <span className="sc-url">yourbusiness.com</span>
        </div>
        <div className="sc-site">
          <div className="sc-site-nav sc-build" style={{ '--i': 0 }}>
            <b>Bakery</b>
            <i />
            <i />
            <i />
          </div>
          <div className="sc-site-hero sc-build" style={{ '--i': 1 }}>
            Fresh bread, baked every morning
          </div>
          <div className="sc-site-btn sc-build" style={{ '--i': 2 }}>
            Order online
          </div>
          <div className="sc-site-tiles sc-build" style={{ '--i': 3 }}>
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>
      <span className="sc-price">From €29/mo</span>
    </div>
  )
}

const MOTIFS = { data: DataMotif, order: OrderMotif, redact: RedactMotif, site: SiteMotif }

/* ----------------------------------------------------------------- the unit -- */

export default function Showcase({ ads = MAKERS }) {
  const { t } = useT()
  const rail = useMedia('(min-width: 75rem)')
  const reduce = useMedia('(prefers-reduced-motion: reduce)')
  // The card at the top of the stack. Cards are rendered starting from it, so
  // moving on puts the top card at the back of the queue.
  const [start, setStart] = useState(0)
  const [sliding, setSliding] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hiddenTab, setHiddenTab] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const unitRef = useRef(null)

  const showing = rail ? RAIL_CARDS : 1
  const rotates = ads.length > showing

  const finish = () => {
    setSliding(false)
    setStart((s) => (s + 1) % ads.length)
  }
  // In the bar the next ad fades in. In the rail the stack first slides up by one
  // card, with the next card already playing its scene as it comes into view.
  const advance = () => (rail && !reduce ? setSliding(true) : finish())

  // The timer line's own animation is the clock, so pausing the animation pauses
  // the rotation.
  const onAnimationEnd = (e) => {
    if (e.animationName === 'sc-progress') advance()
  }

  // A change of layout drops a slide that was under way.
  useEffect(() => setSliding(false), [rail])

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

  const ordered = ads.map((_, k) => ads[(start + k) % ads.length])

  return (
    <div
      ref={unitRef}
      className={classes}
      style={{ '--sc-interval': `${INTERVAL_MS}ms`, '--sc-rows': Math.min(ads.length, RAIL_CARDS) }}
      onAnimationEnd={onAnimationEnd}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(unitRef.current?.contains(document.activeElement) || false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => setPaused(unitRef.current?.contains(e.relatedTarget) || false)}
    >
      <button type="button" className="showcase-close" aria-label={t('showcase.close')} onClick={() => setDismissed(true)}>
        &times;
      </button>

      <div className="showcase-stage">
        <div
          className={sliding ? 'showcase-track is-sliding' : 'showcase-track'}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && sliding) finish()
          }}
        >
          {ordered.map((ad, k) => {
            const Motif = MOTIFS[ad.motif]
            const hidden = k >= showing
            const active = !hidden || (sliding && k === showing)
            return (
              <a
                key={ad.id}
                className={active ? 'sc-slide is-active' : 'sc-slide'}
                style={themeVars(ad.theme)}
                href={ad.url}
                target="_blank"
                rel="noopener"
                // A new tab, so following an ad never throws away the plan someone
                // was in the middle of building. Cards out of view cannot be tabbed to.
                ref={(el) => {
                  if (el) el.inert = hidden
                }}
              >
                <span className="sc-art" aria-hidden="true">
                  {Motif && <Motif />}
                </span>
                <span className="sc-brand">
                  <img className="sc-logo" src={ad.logo} alt="" width="40" height="40" />
                  <span className="sc-name">{ad.title}</span>
                </span>
                <span className="sc-headline">{ad.headline}</span>
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
      </div>

      {/* The timer line: visible in the bar, invisible in the rail, and the clock for both. */}
      {rotates && (
        <div className="showcase-timer is-running">
          <i key={`timer-${start}-${showing}`} />
        </div>
      )}
    </div>
  )
}
