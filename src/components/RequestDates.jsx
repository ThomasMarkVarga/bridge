/**
 * The bare list of days to book.
 *
 * This is the most useful thing the app produces, and it has to be one action to
 * copy. Everything else on the page is there to justify this list.
 */
import { useState } from 'react'
import Icon from './Icon.jsx'
import { formatDayShort, formatIsoList, plural } from '../format.js'

/**
 * @param {object} props
 * @param {string[]} props.dates
 * @param {string} props.periodLabel
 */
export default function RequestDates({ dates, periodLabel }) {
  const [copied, setCopied] = useState(null)

  if (!dates.length) return null

  const copy = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 2400)
    } catch {
      setCopied(null)
    }
  }

  const readable = dates.map(formatDayShort).join('\n')

  return (
    <div className="card anim-pop p-4 sm:p-5" style={{ '--i': 1 }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="pill pill-lime mb-2">Paste this into your leave request</span>
          <h2 className="text-2xl">Days to request</h2>
        </div>
        <p className="hint tabular font-extrabold">
          {plural(dates.length, 'day', 'days')} in {periodLabel}
        </p>
      </div>

      <ol
        className="tabular mb-4 grid max-h-60 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto text-sm sm:grid-cols-3 lg:grid-cols-4"
        aria-label="Every day to book, in order"
      >
        {dates.map((d) => (
          <li key={d} className="border-b-2 border-dashed py-1 font-semibold" style={{ borderColor: 'var(--border)' }}>
            {formatDayShort(d)}
          </li>
        ))}
      </ol>

      <div className="perf grid gap-2 sm:flex sm:flex-wrap">
        <button type="button" onClick={() => copy(readable, 'readable')} className="btn btn-primary">
          <Icon name={copied === 'readable' ? 'check' : 'copy'} size={18} />
          {copied === 'readable' ? 'Copied' : 'Copy the dates'}
        </button>
        <button type="button" onClick={() => copy(formatIsoList(dates), 'iso')} className="btn btn-quiet">
          <Icon name={copied === 'iso' ? 'check' : 'copy'} size={18} />
          {copied === 'iso' ? 'Copied' : 'Copy as 2026-06-02'}
        </button>
      </div>
      <p className="hint mt-2">
        Paste either into your leave request. The second format is the one most HR systems expect.
      </p>
    </div>
  )
}
