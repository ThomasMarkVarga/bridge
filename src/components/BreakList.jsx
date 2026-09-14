/**
 * The breaks, one card each.
 *
 * People book leave one break at a time, arguing for one week with one manager,
 * so each break carries its own dates, its own copy button and its own calendar
 * file. Nobody has to take the whole plan to use part of it.
 */
import { useState } from 'react'
import Icon from './Icon.jsx'
import { breakToIcs, downloadIcs } from '../export/ics.js'
import { formatRange, formatDayList, plural } from '../format.js'

/**
 * @param {object} props
 * @param {import('../solver/solve.js').Break[]} props.breaks
 * @param {(dates: string[]) => void} [props.onHighlight]
 */
export default function BreakList({ breaks }) {
  if (!breaks.length) return null

  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {breaks.map((brk, i) => (
        <BreakCard key={brk.start} brk={brk} position={i + 1} />
      ))}
    </ol>
  )
}

function BreakCard({ brk, position }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatDayList(brk.leaveDates))
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {
      setCopied(false)
    }
  }

  const perDay = brk.cost > 0 ? (brk.length / brk.cost).toFixed(1) : null

  return (
    <li className="card flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-bold">{formatRange(brk.start, brk.end)}</h3>
        <span className="tabular shrink-0 text-sm text-[var(--muted-foreground)]">#{position}</span>
      </div>

      <p className="text-sm">
        <strong className="tabular text-lg" style={{ color: 'var(--day-leave)' }}>
          {brk.length} days off
        </strong>{' '}
        for {plural(brk.cost, 'day', 'days')} booked.
        {perDay ? ` That is ${perDay} days off for every day you book.` : ''}
      </p>

      <div>
        <p className="label mb-1">Days to request</p>
        <p className="tabular text-sm leading-relaxed">{formatDayList(brk.leaveDates)}</p>
      </div>

      {brk.pinnedDates.length > 0 && (
        <p className="hint">
          {plural(brk.pinnedDates.length, 'day', 'days')} here you fixed yourself.
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn btn-quiet flex-1 text-sm">
          <Icon name={copied ? 'check' : 'copy'} size={17} />
          {copied ? 'Copied' : 'Copy the dates'}
        </button>
        <button
          type="button"
          onClick={() => downloadIcs(breakToIcs(brk), `time-off-${brk.start}.ics`)}
          className="btn btn-quiet flex-1 text-sm"
        >
          <Icon name="calendar" size={17} />
          Add to calendar
        </button>
      </div>
    </li>
  )
}
