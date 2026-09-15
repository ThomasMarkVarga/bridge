/**
 * What the app does not do, said once.
 *
 * This was a scrolling banner. Widening the page for the showcase rail stretched
 * it to twelve hundred pixels by forty, and a band that long and that thin reads
 * as a strip of tape across the page rather than as anything you would want to
 * look at.
 *
 * It is a row of tags now. Same claims, no auto-scrolling, so it takes the width
 * it needs and wraps when it runs out. It also drops a moving element nobody
 * asked to have moving, which is one less thing to need a pause button.
 */
import { useT } from '../i18n/index.jsx'

/**
 * `always` are the three that carry the whole pitch. The rest are true and worth
 * saying, but on a phone six tags wrap to three rows and push the answer down the
 * screen for no gain, so they wait for a wider window.
 */
const CLAIMS = [
  { key: 'claims.noSignup', always: true },
  { key: 'claims.offline', always: true },
  { key: 'claims.nothingLeaves', always: true },
  { key: 'claims.free', always: false },
  { key: 'claims.noCookies', always: false },
  { key: 'claims.noTracking', always: false }
]

export default function Claims() {
  const { t } = useT()
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label={t('claims.label')}>
      {CLAIMS.map((claim, i) => (
        <li key={claim.key} className={`anim-pop ${claim.always ? '' : 'hidden sm:block'}`} style={{ '--i': i }}>
          <span className="pill pill-lime">{t(claim.key)}</span>
        </li>
      ))}
    </ul>
  )
}
