/**
 * The scrolling claim bar.
 *
 * It states what the app does not do, which is the whole pitch, and it keeps
 * moving so it reads as a banner rather than a list of promises.
 *
 * Moving content needs a way to stop it, so there is a real pause button, it
 * pauses on hover and on keyboard focus, and it never animates at all when the
 * system asks for reduced motion. The text is in the document once for screen
 * readers; the second copy exists only to make the loop seamless and is hidden
 * from the accessibility tree.
 */
import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

const CLAIMS = [
  'Free to use',
  'No sign-up',
  'No cookies',
  'No tracking',
  'Works offline',
  'Nothing leaves your device'
]

export default function Marquee() {
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const strip = (hidden) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {CLAIMS.map((claim) => (
        <li key={claim} className="flex items-center whitespace-nowrap">
          <span className="px-5 text-sm font-extrabold uppercase tracking-tight">{claim}</span>
          <span aria-hidden="true" className="text-sm">
            &#9670;
          </span>
        </li>
      ))}
    </ul>
  )

  return (
    <div
      ref={ref}
      className="marquee relative overflow-hidden rounded-[10px] border-[2px]"
      data-paused={paused ? 'true' : 'false'}
      style={{
        borderColor: 'var(--line)',
        background: 'var(--sun)',
        color: 'var(--ink-fixed)',
        boxShadow: '3px 3px 0 0 var(--shadow-ink)'
      }}
    >
      <div className={reduced ? 'flex w-full flex-wrap justify-center py-2' : 'marquee-track py-2'}>
        {strip(false)}
        {!reduced && strip(true)}
      </div>

      {!reduced && (
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-[2px] bg-[var(--surface)]"
          style={{ borderColor: 'var(--ink-fixed)', color: 'var(--ink-fixed)' }}
          title={paused ? 'Start the banner moving' : 'Stop the banner moving'}
        >
          <span className="sr-only">{paused ? 'Start the banner moving' : 'Stop the banner moving'}</span>
          {paused ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
