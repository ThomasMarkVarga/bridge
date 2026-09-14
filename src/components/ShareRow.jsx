/**
 * Sharing, all of it done on this machine.
 *
 * The link carries the plan in its hash, so it reproduces exactly on someone
 * else's screen without anything being stored anywhere. The calendar file and the
 * image are both generated in the page.
 */
import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { breaksToIcs, leaveDaysToIcs, downloadIcs } from '../export/ics.js'
import { drawShareCard, downloadCard, copyCardToClipboard, shareText, shareCardAlt } from '../export/shareCard.js'
import { permalink } from '../state/urlState.js'

/**
 * @param {object} props
 * @param {object} props.state
 * @param {import('../solver/solve.js').Plan} props.plan
 * @param {import('../solver/calendar.js').Day[]} props.calendar
 * @param {string} props.countryLabel
 * @param {string} props.periodLabel
 * @param {'light'|'dark'} props.theme
 */
export default function ShareRow({ state, plan, calendar, countryLabel, periodLabel, theme }) {
  const [said, setSaid] = useState(null)
  const [cardOpen, setCardOpen] = useState(false)
  const canvasRef = useRef(null)

  const announce = (message) => {
    setSaid(message)
    setTimeout(() => setSaid(null), 3000)
  }

  useEffect(() => {
    if (!cardOpen || !canvasRef.current) return
    drawShareCard({ plan, calendar, countryLabel, periodLabel, theme, canvas: canvasRef.current })
  }, [cardOpen, plan, calendar, countryLabel, periodLabel, theme])

  if (!plan.feasible) return null

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(permalink(state))
      announce('Link copied. It carries the whole plan.')
    } catch {
      announce('Your browser would not let the page copy. Copy the address bar instead.')
    }
  }

  const copyPost = async () => {
    try {
      await navigator.clipboard.writeText(shareText({ plan, countryLabel, periodLabel }))
      announce('Text copied.')
    } catch {
      announce('Your browser would not let the page copy that.')
    }
  }

  return (
    <section className="card anim-pop p-4 sm:p-5" style={{ '--i': 4 }} aria-labelledby="share-heading">
      <span className="pill pill-pink mb-2">Yours to keep</span>
      <h2 id="share-heading" className="mb-1 text-2xl">
        Take it with you
      </h2>
      <p className="hint mb-4">
        Everything here is made on your device. Nothing is uploaded, and the link works because the whole plan is
        written into it.
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={copyLink}>
          <Icon name="link" size={18} />
          Copy the link
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            downloadIcs(breaksToIcs(plan.breaks), `time-off-${periodLabel.replace(/\s+/g, '-')}.ics`)
            announce('Calendar file saved, one event per break.')
          }}
        >
          <Icon name="calendar" size={18} />
          Add every break to my calendar
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            downloadIcs(leaveDaysToIcs(plan.leaveDates), `leave-days-${periodLabel.replace(/\s+/g, '-')}.ics`)
            announce('Calendar file saved, one event per booked day.')
          }}
        >
          <Icon name="download" size={18} />
          One event per booked day
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => setCardOpen((v) => !v)} aria-expanded={cardOpen}>
          <Icon name="image" size={18} />
          {cardOpen ? 'Hide the picture' : 'Make a picture'}
        </button>
      </div>

      <p className="hint mt-2">
        The second calendar file is for HR systems that count days rather than stretches.
      </p>

      {cardOpen && (
        <div className="mt-4">
          <div className="overflow-hidden rounded-[10px] border-[2px]" style={{ borderColor: 'var(--line)' }}>
            <canvas
              ref={canvasRef}
              className="block h-auto w-full"
              role="img"
              aria-label={shareCardAlt({ plan, countryLabel, periodLabel })}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={async () => {
                await downloadCard(canvasRef.current, `bridge-${periodLabel.replace(/\s+/g, '-')}.png`)
                announce('Picture saved.')
              }}
            >
              <Icon name="download" size={18} />
              Save the picture
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={async () => {
                try {
                  await copyCardToClipboard(canvasRef.current)
                  announce('Picture copied.')
                } catch (err) {
                  announce(err.message)
                }
              }}
            >
              <Icon name="copy" size={18} />
              Copy the picture
            </button>
            <button type="button" className="btn btn-quiet" onClick={copyPost}>
              <Icon name="copy" size={18} />
              Copy text for a post
            </button>
          </div>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {said}
      </p>
      {said && (
        <p
          className="mt-3 inline-block rounded-[10px] border-[2px] px-3 py-1.5 text-sm font-extrabold"
          style={{ borderColor: 'var(--line)', background: 'var(--sun)', color: 'var(--ink-fixed)' }}
        >
          {said}
        </p>
      )}
    </section>
  )
}
