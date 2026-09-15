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
import { useT } from '../i18n/index.jsx'

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
  const { t, lang } = useT()
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
    // `lang` is a dependency even though it is not read here: the card writes
    // words on itself, so it has to be drawn again when the language changes.
  }, [cardOpen, plan, calendar, countryLabel, periodLabel, theme, lang])

  if (!plan.feasible) return null

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(permalink(state))
      announce(t('share.linkCopied'))
    } catch {
      announce(t('share.copyBlocked'))
    }
  }

  const copyPost = async () => {
    try {
      await navigator.clipboard.writeText(shareText({ plan, countryLabel, periodLabel }))
      announce(t('share.textCopied'))
    } catch {
      announce(t('share.copyBlockedText'))
    }
  }

  return (
    <section className="card anim-pop p-4 sm:p-5" style={{ '--i': 4 }} aria-labelledby="share-heading">
      <span className="pill pill-pink mb-2">{t('share.pill')}</span>
      <h2 id="share-heading" className="mb-1 text-2xl">
        {t('share.heading')}
      </h2>
      <p className="hint mb-4">{t('share.hint')}</p>

      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <button type="button" className="btn btn-primary" onClick={copyLink}>
          <Icon name="link" size={18} />
          {t('share.copyLink')}
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            downloadIcs(breaksToIcs(plan.breaks), `time-off-${periodLabel.replace(/\s+/g, '-')}.ics`)
            announce(t('share.icsBreaksSaved'))
          }}
        >
          <Icon name="calendar" size={18} />
          {t('share.addBreaks')}
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            downloadIcs(leaveDaysToIcs(plan.leaveDates), `leave-days-${periodLabel.replace(/\s+/g, '-')}.ics`)
            announce(t('share.icsDaysSaved'))
          }}
        >
          <Icon name="download" size={18} />
          {t('share.addEach')}
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => setCardOpen((v) => !v)} aria-expanded={cardOpen}>
          <Icon name="image" size={18} />
          {cardOpen ? t('share.hidePicture') : t('share.makePicture')}
        </button>
      </div>


      {cardOpen && (
        <div className="mt-4">
          <div className="overflow-hidden rounded-[10px] border-[2px]" style={{ borderColor: 'var(--line)' }}>
            <canvas
              ref={canvasRef}
              className="block h-auto w-full max-w-full"
              style={{ aspectRatio: '1200 / 630' }}
              role="img"
              aria-label={shareCardAlt({ plan, countryLabel, periodLabel })}
            />
          </div>
          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={async () => {
                await downloadCard(canvasRef.current, `bridge-${periodLabel.replace(/\s+/g, '-')}.png`)
                announce(t('share.pictureSaved'))
              }}
            >
              <Icon name="download" size={18} />
              {t('share.savePicture')}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={async () => {
                try {
                  await copyCardToClipboard(canvasRef.current)
                  announce(t('share.pictureCopied'))
                } catch (err) {
                  announce(err.message)
                }
              }}
            >
              <Icon name="copy" size={18} />
              {t('share.copyPicture')}
            </button>
            <button type="button" className="btn btn-quiet" onClick={copyPost}>
              <Icon name="copy" size={18} />
              {t('share.copyPost')}
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
