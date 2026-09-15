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
import { useT, useTx } from '../i18n/index.jsx'

const REPO = 'https://github.com/qxZap/bridge'
/*
 * Where the dates actually come from. Held here rather than read from the data
 * file with a fallback: the index file has no url on it, so the fallback was
 * quietly crediting this repository for somebody else's work.
 */
const DATA_SOURCE_URL = 'https://github.com/commenthol/date-holidays'

export default function Verification({ countryNotes = [], countryName, dataGeneratedAt }) {
  const { t } = useT()
  const tx = useTx()
  const { total, offSite } = useNetworkCount()
  const online = useOnline()

  return (
    <section className="card anim-pop p-4 sm:p-5" style={{ '--i': 5 }} aria-labelledby="verify-heading">
      <span className="pill pill-blue mb-2">{t('verify.pill')}</span>
      <h2 id="verify-heading" className="text-2xl">
        {t('verify.heading')}
      </h2>
      <p className="hint mt-1 mb-4">{t('verify.hint')}</p>

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
            {t('verify.offSiteLabel')}
          </p>
          <p className="tabular display text-5xl">{offSite}</p>
          <p className="mt-1 text-sm font-semibold">{t('verify.countedLive', { count: total })}</p>
          <p className="mt-2 text-sm font-semibold">{t('verify.howToCheck')}</p>
        </div>

        <div className="rounded-[10px] border-[2px] p-3" style={{ borderColor: 'var(--line)' }}>
          <p className="label mb-1">{t('verify.worksOffline')}</p>
          <p className="flex items-center gap-2 text-base font-extrabold">
            <Icon name={online ? 'check' : 'offline'} size={20} />
            {online ? t('verify.online') : t('verify.offline')}
          </p>
          <p className="hint mt-2">{t('verify.offlineHint')}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-base">{t('verify.howItWorks')}</h3>
          <ul className="grid gap-1.5 text-sm">
            {['how1', 'how2', 'how3', 'how4', 'how5', 'how6'].map((key) => (
              <li key={key}>{t(`verify.${key}`)}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-base">{t('verify.limits')}</h3>
          <ul className="grid gap-1.5 text-sm">
            {['limit1', 'limit2', 'limit3', 'limit4', 'limit5'].map((key) => (
              <li key={key}>{t(`verify.${key}`)}</li>
            ))}
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
            {t('verify.countryNotes', { country: countryName })}
          </h3>
          <ul className="grid gap-1.5 text-sm">
            {countryNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="hint mt-4">
        {tx('verify.source', {
          link: (
            <a className="underline" href={DATA_SOURCE_URL} rel="noreferrer noopener" target="_blank">
              {DATA_SOURCE.library} {DATA_SOURCE.version}
            </a>
          ),
          date: (dataGeneratedAt || DATA_GENERATED_AT || '').slice(0, 10),
          report: (
            <a className="underline" href={`${REPO}/issues/new`} rel="noreferrer noopener" target="_blank">
              {t('verify.reportDate')}
            </a>
          )
        })}
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
