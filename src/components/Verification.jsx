/**
 * For the person who does not believe any of it.
 *
 * Claiming that nothing is sent anywhere is easy and worth nothing on its own. So
 * this counts the page's own network requests as they happen and shows the number,
 * tells people exactly where to check it themselves, and then admits in plain
 * words what the app cannot do. The limits section is the part that earns trust.
 */
import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { DATA_SOURCE, DATA_GENERATED_AT } from '../data/loadHolidays.js'

const REPO = 'https://github.com/ThomasMarkVarga/bridge'

export default function Verification({ countryNotes = [], countryName, dataGeneratedAt }) {
  const { total, offSite } = useNetworkCount()
  const online = useOnline()

  return (
    <section className="card anim-pop p-4 sm:p-5" style={{ '--i': 5 }} aria-labelledby="verify-heading">
      <span className="pill pill-blue mb-2">Do not take our word for it</span>
      <h2 id="verify-heading" className="text-2xl">
        Check it yourself
      </h2>
      <p className="hint mt-1 mb-4">
        You should not take our word for any of this. Here is how to confirm it.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className="rounded-[10px] border-[2px] p-3"
          style={{
            borderColor: 'var(--line)',
            background: offSite === 0 ? 'var(--sun)' : 'var(--destructive)',
            color: 'var(--ink-fixed)'
          }}
        >
          <p className="label mb-1" style={{ color: 'var(--ink-fixed)' }}>
            Requests to anywhere else
          </p>
          <p className="tabular display text-5xl">{offSite}</p>
          <p className="mt-1 text-sm font-semibold">
            Counted live in this page. {total} {total === 1 ? 'request' : 'requests'} in total, all of them to this
            site, for the page itself and the holiday dates.
          </p>
          <p className="mt-2 text-sm font-semibold">
            To check: open your browser&rsquo;s developer tools, go to the Network tab and reload. Nothing should point
            anywhere but this domain.
          </p>
        </div>

        <div className="rounded-[10px] border-[2px] p-3" style={{ borderColor: 'var(--line)' }}>
          <p className="label mb-1">Works without a connection</p>
          <p className="flex items-center gap-2 text-base font-extrabold">
            <Icon name={online ? 'check' : 'offline'} size={20} />
            {online ? 'You are online' : 'You are offline, and it still works'}
          </p>
          <p className="hint mt-2">
            Turn off your wifi and reload this page. The plan still works out, because the calculation and the holiday
            dates are both already on your device.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-base">How it works</h3>
          <ul className="grid gap-1.5 text-sm">
            <li>The whole calculation runs in this page, on your device.</li>
            <li>Holiday dates ship with the app as plain files. Nothing is looked up.</li>
            <li>
              Your plan lives in the address bar. That is why the link reproduces it, and why we never need to store
              anything.
            </li>
            <li>There is no account, no analytics, no cookie and no tracking. There is nothing to consent to.</li>
            <li>
              The only thing that can be saved on this device is your country and allowance, and only if you tick the
              box to ask for it.
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-base">What this cannot do</h3>
          <ul className="grid gap-1.5 text-sm">
            <li>
              Holiday dates can be wrong or change. Governments move them, and some are announced only weeks ahead.
              Check anything that matters against an official calendar.
            </li>
            <li>
              Your employer has rules this knows nothing about: notice periods, blackout seasons, how many people can be
              off at once, whether you can carry days over.
            </li>
            <li>Some contracts count public holidays against your allowance. This assumes they do not.</li>
            <li>Your colleagues want the same weeks you do, and somebody has to ask first.</li>
            <li>This does arithmetic, not negotiation.</li>
          </ul>
        </div>
      </div>

      {countryNotes.length > 0 && (
        <div
          className="mt-4 rounded-[10px] border-[2px] p-3"
          style={{ borderColor: 'var(--line)', background: 'var(--muted)' }}
        >
          <h3 className="mb-1 flex items-center gap-2 text-base">
            <Icon name="info" size={18} />
            Worth knowing about {countryName}
          </h3>
          <ul className="grid gap-1.5 text-sm">
            {countryNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="hint mt-4">
        Holiday dates come from{' '}
        <a className="underline" href={DATA_SOURCE.url || REPO} rel="noreferrer noopener" target="_blank">
          {DATA_SOURCE.library} {DATA_SOURCE.version}
        </a>
        , generated on {(dataGeneratedAt || DATA_GENERATED_AT || '').slice(0, 10)}.{' '}
        <a className="underline" href={`${REPO}/issues/new`} rel="noreferrer noopener" target="_blank">
          Report a wrong date
        </a>
        .
      </p>
    </section>
  )
}

/**
 * Count this page's own requests, and how many of them go anywhere but here.
 *
 * `PerformanceObserver` sees every fetch the page makes, so this is the page
 * reporting on itself rather than a promise in a privacy policy.
 */
function useNetworkCount() {
  const [counts, setCounts] = useState({ total: 0, offSite: 0 })

  useEffect(() => {
    const origin = window.location.origin
    const tally = (entries) => {
      let total = 0
      let offSite = 0
      for (const e of entries) {
        if (e.entryType !== 'resource') continue
        total++
        try {
          if (new URL(e.name, origin).origin !== origin) offSite++
        } catch {
          offSite++
        }
      }
      return { total, offSite }
    }

    // Anything that has already loaded counts too.
    const initial = tally(performance.getEntriesByType('resource'))
    setCounts(initial)

    if (typeof PerformanceObserver !== 'function') return undefined

    const observer = new PerformanceObserver((list) => {
      const add = tally(list.getEntries())
      setCounts((prev) => ({ total: prev.total + add.total, offSite: prev.offSite + add.offSite }))
    })
    try {
      observer.observe({ type: 'resource', buffered: false })
    } catch {
      return undefined
    }
    return () => observer.disconnect()
  }, [])

  return counts
}

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
