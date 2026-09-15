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
import { formatRange, formatDayList, counted } from '../format.js'
import { useT } from '../i18n/index.jsx'

/**
 * @param {object} props
 * @param {import('../solver/solve.js').Break[]} props.breaks
 * @param {(dates: string[]) => void} [props.onHighlight]
 */
export default function BreakList({ breaks }) {
  if (!breaks.length) return null

  return (
    <ol className="grid gap-4 sm:grid-cols-2">
      {breaks.map((brk, i) => (
        <BreakCard key={brk.start} brk={brk} position={i + 1} index={i} />
      ))}
    </ol>
  )
}

function BreakCard({ brk, position, index }) {
  const { t } = useT()
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
    <li className="card anim-pop flex flex-col gap-3 p-4" style={{ '--i': index }}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xl">{formatRange(brk.start, brk.end)}</h3>
        <span className="tabular shrink-0 text-sm font-extrabold text-[var(--muted-foreground)]">#{position}</span>
      </div>

      <p className="text-sm font-semibold">
        {t('breaks.daysOffFor', {
          daysOff: counted('daysOff', brk.length),
          cost: counted('days', brk.cost)
        })}
        {perDay ? t('breaks.perDay', { ratio: perDay }) : ''}
      </p>

      <div>
        <p className="label mb-1">{t('breaks.daysToRequest')}</p>
        <p className="tabular text-sm font-bold leading-relaxed">{formatDayList(brk.leaveDates)}</p>
      </div>

      {brk.pinnedDates.length > 0 && (
        <p className="hint">{t('breaks.pinnedHere', { count: brk.pinnedDates.length })}</p>
      )}

      {/* Stacked rather than side by side: a card is narrow at every width once the
          list goes to two columns, and these labels name an outcome rather than
          being shortened until they stop saying anything. */}
      <div className="mt-auto grid gap-2">
        <button type="button" onClick={copy} className="btn btn-quiet w-full text-sm">
          <Icon name={copied ? 'check' : 'copy'} size={17} />
          {copied ? t('breaks.copied') : t('breaks.copy')}
        </button>
        <button
          type="button"
          onClick={() => downloadIcs(breakToIcs(brk), `time-off-${brk.start}.ics`)}
          className="btn btn-quiet w-full text-sm"
        >
          <Icon name="calendar" size={17} />
          {t('breaks.addToCalendar')}
        </button>
      </div>
    </li>
  )
}
