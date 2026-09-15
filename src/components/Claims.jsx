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
/**
 * `always` are the three that carry the whole pitch. The rest are true and worth
 * saying, but on a phone six tags wrap to three rows and push the answer down the
 * screen for no gain, so they wait for a wider window.
 */
const CLAIMS = [
  { text: 'No sign-up', always: true },
  { text: 'Works offline', always: true },
  { text: 'Nothing leaves your device', always: true },
  { text: 'Free to use', always: false },
  { text: 'No cookies', always: false },
  { text: 'No tracking', always: false }
]

export default function Claims() {
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="What this app does not do">
      {CLAIMS.map((claim, i) => (
        <li key={claim.text} className={`anim-pop ${claim.always ? '' : 'hidden sm:block'}`} style={{ '--i': i }}>
          <span className="pill pill-lime">{claim.text}</span>
        </li>
      ))}
    </ul>
  )
}
