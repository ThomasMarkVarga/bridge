/**
 * The year view.
 *
 * The hard requirement is that a break has to read as one continuous run, and that
 * has to survive a month boundary and the edge of a row. A grid of twelve separate
 * month blocks cannot do it: a break from the 28th of November to the 6th of
 * December gets cut in half, and the shape of the break is the information.
 *
 * So this is one unbroken ribbon of weeks. Seven columns, Monday to Sunday, one row
 * per week, running from the first day of the range to the last. Months are labelled
 * in the gutter and marked with a hairline; they never break the grid. Below each
 * break, a bar is drawn behind the days it covers, split into one segment per row.
 * A segment is rounded only on the end where the break genuinely starts or stops, so
 * a break that wraps from one row to the next reads as carrying on, which is what it
 * actually does.
 *
 * Colour is never the only signal. Every day that is not an ordinary working day
 * carries a marker underneath its number: a filled dot for a day you booked, a ring
 * for a public holiday, a diamond for a day you pinned, and diagonal stripes with a
 * struck-through number for a day you blacked out.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dayOfWeek, toDayNumber } from '../solver/plainDate.js'

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAY_INITIAL = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Arrange the range into week rows, with the first and last rows padded so the
 * columns always line up with the days of the week.
 */
function buildRows(calendar) {
  if (!calendar.length) return []
  const lead = dayOfWeek(calendar[0].date) - 1
  const rows = []
  let row = new Array(lead).fill(null)

  for (const day of calendar) {
    row.push(day)
    if (row.length === 7) {
      rows.push(row)
      row = []
    }
  }
  if (row.length) rows.push([...row, ...new Array(7 - row.length).fill(null)])
  return rows
}

/**
 * Cut each break into one piece per week row, remembering which end is the real
 * start and which is the real end of the whole break.
 */
function breakSegments(rows, breaks) {
  const segments = []
  for (let b = 0; b < breaks.length; b++) {
    const brk = breaks[b]
    for (let r = 0; r < rows.length; r++) {
      let from = -1
      let to = -1
      for (let c = 0; c < 7; c++) {
        const day = rows[r][c]
        if (!day) continue
        if (day.index >= brk.startIndex && day.index <= brk.endIndex) {
          if (from === -1) from = c
          to = c
        }
      }
      if (from === -1) continue
      const startsHere = rows[r][from].index === brk.startIndex
      const endsHere = rows[r][to].index === brk.endIndex
      segments.push({ key: `${b}-${r}`, row: r, from, to, startsHere, endsHere, breakIndex: b })
    }
  }
  return segments
}

/** What a day is, said plainly, for a screen reader and for the tooltip. */
function describeDay(day, inBreak, isLeave) {
  const parts = [new Date(day.date + 'T00:00:00Z').getUTCDate() + ' ' + MONTHS[Number(day.date.slice(5, 7)) - 1]]
  parts.push(WEEKDAY_SHORT[day.dayOfWeek - 1])
  if (day.blackout) parts.push('blacked out, will not be booked')
  else if (day.pinned) parts.push('pinned, you fixed this day')
  else if (isLeave) parts.push('a day to book')
  if (day.holidayName) parts.push(`public holiday, ${day.holidayName}`)
  else if (day.weekend && !day.holidayName) parts.push('not a working day')
  if (inBreak && !isLeave && !day.pinned) parts.push('inside a break')
  if (!inBreak && !day.isFree && !day.blackout && !day.pinned) parts.push('a normal working day')
  return parts.join(', ')
}

/**
 * @param {object} props
 * @param {import('../solver/calendar.js').Day[]} props.calendar
 * @param {import('../solver/solve.js').Plan} props.plan
 * @param {(date: string) => void} props.onPin
 * @param {(date: string) => void} props.onBlackout
 * @param {string[]} [props.changedDates]  days that moved in the last re-solve
 */
export default function YearGrid({ calendar, plan, onPin, onBlackout, changedDates = [] }) {
  const rows = useMemo(() => buildRows(calendar), [calendar])
  const breaks = plan.feasible ? plan.breaks : []
  const segments = useMemo(() => breakSegments(rows, breaks), [rows, breaks])

  const leaveSet = useMemo(() => new Set(plan.leaveDates || []), [plan.leaveDates])
  const inBreakSet = useMemo(() => {
    const s = new Set()
    for (const b of breaks) for (let i = b.startIndex; i <= b.endIndex; i++) s.add(i)
    return s
  }, [breaks])
  const changedSet = useMemo(() => new Set(changedDates), [changedDates])

  const [focused, setFocused] = useState(() => calendar.findIndex((d) => !d.isFree) || 0)
  const [menuFor, setMenuFor] = useState(null)
  const gridRef = useRef(null)

  useEffect(() => {
    if (focused >= calendar.length) setFocused(Math.max(0, calendar.length - 1))
  }, [calendar.length, focused])

  // Arrow keys walk the grid: left and right by a day, up and down by a week.
  const onKeyDown = useCallback(
    (event, index) => {
      const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
      let next = null

      if (event.key in moves) next = index + moves[event.key]
      else if (event.key === 'Home') next = index - ((dayOfWeek(calendar[index].date) - 1) % 7)
      else if (event.key === 'End') next = index + (7 - dayOfWeek(calendar[index].date))
      else if (event.key === 'PageUp') next = index - 28
      else if (event.key === 'PageDown') next = index + 28
      else if (event.key === 'Escape' && menuFor !== null) {
        setMenuFor(null)
        event.preventDefault()
        return
      } else return

      event.preventDefault()
      const clamped = Math.max(0, Math.min(calendar.length - 1, next))
      setFocused(clamped)
      const el = gridRef.current?.querySelector(`[data-day-index="${clamped}"]`)
      el?.focus()
    },
    [calendar, menuFor]
  )

  if (!calendar.length) return null

  // A week can straddle two months, so each row is labelled with the month most of
  // its days belong to. The label and the hairline appear only where that changes,
  // which puts the mark where the month visually turns over rather than on the
  // technicality of which row happens to contain the 1st.
  const rowMonths = rows.map((row) => {
    const tally = new Map()
    for (const day of row) {
      if (!day) continue
      const m = Number(day.date.slice(5, 7)) - 1
      tally.set(m, (tally.get(m) || 0) + 1)
    }
    let best = null
    let bestCount = 0
    for (const [m, count] of tally) {
      if (count > bestCount) {
        best = m
        bestCount = count
      }
    }
    return best
  })

  return (
    <div className="w-full max-w-[520px]">
      {/* The header mirrors a row exactly: same gutter, same gap, same seven columns. */}
      <div
        className="mb-2 flex items-stretch gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]"
        aria-hidden="true"
      >
        <div className="w-6 shrink-0 sm:w-8" />
        <div className="grid min-w-0 flex-1 grid-cols-7 gap-[3px]">
          {WEEKDAY_SHORT.map((d, i) => (
            <div key={d + i} className="text-center">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{WEEKDAY_INITIAL[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label="The planning range, week by week"
        aria-rowcount={rows.length}
        className="relative"
      >
        {rows.map((row, r) => {
          const monthIndex = rowMonths[r]
          const newMonth = r === 0 || rowMonths[r] !== rowMonths[r - 1]
          const rowSegments = segments.filter((s) => s.row === r)

          return (
            <div
              key={r}
              role="row"
              aria-rowindex={r + 1}
              className={`flex items-stretch gap-1 ${newMonth && r > 0 ? 'mt-1.5 border-t border-dashed pt-1.5' : ''}`}
              style={newMonth && r > 0 ? { borderColor: 'var(--border)' } : undefined}
            >
              <div
                className="tabular flex w-6 shrink-0 items-center justify-end pr-1 text-[10px] font-semibold text-[var(--muted-foreground)] sm:w-8 sm:text-[11px]"
                aria-hidden="true"
              >
                {newMonth && monthIndex !== null ? MONTHS_SHORT[monthIndex] : ''}
              </div>

              <div className="relative grid min-w-0 flex-1 grid-cols-7 gap-[3px]">
                {/* The break bars sit behind the days, one piece per row. */}
                {rowSegments.map((seg) => (
                  <div
                    key={seg.key}
                    aria-hidden="true"
                    className="pointer-events-none z-0 self-stretch"
                    style={{
                      gridColumn: `${seg.from + 1} / ${seg.to + 2}`,
                      gridRow: 1,
                      background: 'var(--day-leave-soft)',
                      border: '1px solid var(--day-leave)',
                      borderLeftWidth: seg.startsHere ? '1px' : 0,
                      borderRightWidth: seg.endsHere ? '1px' : 0,
                      borderTopLeftRadius: seg.startsHere ? 8 : 0,
                      borderBottomLeftRadius: seg.startsHere ? 8 : 0,
                      borderTopRightRadius: seg.endsHere ? 8 : 0,
                      borderBottomRightRadius: seg.endsHere ? 8 : 0
                    }}
                  />
                ))}

                {row.map((day, c) => {
                  if (!day) {
                    return (
                      <div
                        key={`pad-${r}-${c}`}
                        role="gridcell"
                        aria-hidden="true"
                        className="min-h-11 sm:min-h-12"
                        style={{ gridColumn: c + 1, gridRow: 1 }}
                      />
                    )
                  }
                  const isLeave = leaveSet.has(day.date)
                  const inBreak = inBreakSet.has(day.index)
                  const changed = changedSet.has(day.date)
                  return (
                    <DayCell
                      key={day.date}
                      day={day}
                      column={c}
                      row={1}
                      isLeave={isLeave}
                      inBreak={inBreak}
                      changed={changed}
                      focused={focused === day.index}
                      menuOpen={menuFor === day.date}
                      onFocusCell={() => setFocused(day.index)}
                      onToggleMenu={() => setMenuFor((v) => (v === day.date ? null : day.date))}
                      onKeyDown={(e) => onKeyDown(e, day.index)}
                      onPin={() => {
                        onPin(day.date)
                        setMenuFor(null)
                      }}
                      onBlackout={() => {
                        onBlackout(day.date)
                        setMenuFor(null)
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayCell({
  day,
  column,
  row,
  isLeave,
  inBreak,
  changed,
  focused,
  menuOpen,
  onFocusCell,
  onToggleMenu,
  onKeyDown,
  onPin,
  onBlackout
}) {
  const dayNumber = Number(day.date.slice(8))
  const label = describeDay(day, inBreak, isLeave)

  // Backgrounds for days that are not inside a break. Days inside one sit on the
  // bar, so they stay transparent and let it show through.
  let background = 'transparent'
  if (!inBreak) {
    if (day.blackout) background = 'transparent'
    else if (day.holidayName) background = 'var(--day-holiday)'
    else if (day.weekend) background = 'var(--day-weekend)'
  }

  const marker = day.blackout
    ? 'blackout'
    : day.pinned
      ? 'pinned'
      : isLeave
        ? 'leave'
        : day.holidayName
          ? 'holiday'
          : null

  return (
    <div role="gridcell" className="relative z-10 min-w-0" style={{ gridColumn: column + 1, gridRow: row }}>
      <button
        type="button"
        data-day-index={day.index}
        tabIndex={focused ? 0 : -1}
        onFocus={onFocusCell}
        onKeyDown={onKeyDown}
        onClick={onToggleMenu}
        aria-label={label}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        title={day.holidayName || undefined}
        className={`relative flex min-h-11 w-full flex-col items-center justify-center rounded-lg px-0.5 py-1 transition-colors duration-150 sm:min-h-12 ${
          day.blackout ? 'stripe-blackout' : ''
        }`}
        style={{
          background,
          outline: changed ? '2px solid var(--primary)' : undefined,
          outlineOffset: changed ? '1px' : undefined,
          boxShadow: day.pinned ? 'inset 0 0 0 2px var(--day-pinned)' : undefined
        }}
      >
        <span
          className={`tabular text-[13px] leading-none ${
            isLeave || day.pinned ? 'font-bold' : day.isFree ? 'font-normal opacity-70' : 'font-medium'
          } ${day.blackout ? 'line-through opacity-60' : ''}`}
          style={{ color: isLeave ? 'var(--day-leave)' : undefined }}
        >
          {dayNumber}
        </span>
        <Marker kind={marker} />
      </button>

      {menuOpen && <DayMenu day={day} onPin={onPin} onBlackout={onBlackout} onClose={onToggleMenu} />}
    </div>
  )
}

/**
 * The shape under the number. This is what makes the grid readable without
 * relying on colour at all.
 */
function Marker({ kind }) {
  if (!kind) return <span className="mt-[3px] block h-[5px] w-[5px]" aria-hidden="true" />
  const common = 'mt-[3px] block h-[5px] w-[5px]'
  if (kind === 'leave') {
    return <span className={`${common} rounded-full`} style={{ background: 'var(--day-leave)' }} aria-hidden="true" />
  }
  if (kind === 'holiday') {
    return (
      <span
        className={`${common} rounded-full border`}
        style={{ borderColor: 'var(--foreground)', borderWidth: 1.5 }}
        aria-hidden="true"
      />
    )
  }
  if (kind === 'pinned') {
    return (
      <span
        className={common}
        style={{ background: 'var(--day-pinned)', transform: 'rotate(45deg)' }}
        aria-hidden="true"
      />
    )
  }
  return (
    <span
      className={common}
      style={{ background: 'var(--day-blackout)', clipPath: 'polygon(0 100%, 100% 0, 100% 22%, 22% 100%)' }}
      aria-hidden="true"
    />
  )
}

/** A small menu for fixing or refusing a day. */
function DayMenu({ day, onPin, onBlackout, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    ref.current?.querySelector('button')?.focus()
    const away = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [onClose])

  const pretty = `${Number(day.date.slice(8))} ${MONTHS_SHORT[Number(day.date.slice(5, 7)) - 1]}`

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Options for ${pretty}`}
      className="card absolute left-1/2 top-full z-50 mt-1 w-52 -translate-x-1/2 p-1 text-left text-sm shadow-lg"
      style={{ boxShadow: '0 10px 15px rgba(0,0,0,0.12)' }}
    >
      <p className="px-2 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]">{pretty}</p>
      {day.isFree && !day.pinned ? (
        <p className="px-2 pb-2 text-xs text-[var(--muted-foreground)]">
          {day.holidayName ? `${day.holidayName}. ` : ''}You already have this day off.
        </p>
      ) : (
        <>
          <button
            type="button"
            role="menuitem"
            onClick={onPin}
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-[var(--muted)]"
          >
            {day.pinned ? 'Stop fixing this day' : 'Always take this day off'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onBlackout}
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-[var(--muted)]"
          >
            {day.blackout ? 'Allow this day again' : 'Never take this day off'}
          </button>
        </>
      )}
    </div>
  )
}

export { buildRows, breakSegments }
