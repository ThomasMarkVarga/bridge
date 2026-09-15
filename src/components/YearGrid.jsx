/**
 * The year view.
 *
 * You read it one month at a time, with a strip of the whole range above it so the
 * shape of the year is never out of sight and any month is one tap away.
 *
 * The hard requirement is that a break reads as one continuous run, and that has
 * to survive a month boundary. Paging strictly by month would cut a break from the
 * 28th of November to the 6th of December clean in half, and the shape of the
 * break is the information. So a month page shows whole weeks, plus one week of
 * spill either side: a break that crosses the turn of the month appears intact on
 * both pages, with the days outside the month dimmed but still drawn.
 *
 * Within a page, the weeks are a single unbroken ribbon. Seven columns, Monday to
 * Sunday, one row per week. A bar is drawn behind the days each break covers,
 * split into one segment per row and rounded only on the end where the break truly
 * starts or stops, so a break that wraps from one row to the next reads as
 * carrying on, which is what it does.
 *
 * Colour is never the only signal. Every day that is not an ordinary working day
 * carries a marker underneath its number: a filled dot for a day you booked, a
 * ring for a public holiday, a diamond for a day you pinned, and diagonal stripes
 * with a struck-through number for a day you ruled out.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dayOfWeek } from '../solver/plainDate.js'
import Icon from './Icon.jsx'

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAY_INITIAL = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** One week of spill either side of the month, so a break at the turn stays whole. */
const SPILL_WEEKS = 1

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

/** The month most of a week belongs to, used to decide which page it lives on. */
function dominantMonths(rows) {
  return rows.map((row) => {
    const tally = new Map()
    for (const day of row) {
      if (!day) continue
      const key = day.date.slice(0, 7)
      tally.set(key, (tally.get(key) || 0) + 1)
    }
    let best = null
    let bestCount = 0
    for (const [key, count] of tally) {
      if (count > bestCount) {
        best = key
        bestCount = count
      }
    }
    return best
  })
}

/** What a day is, said plainly, for a screen reader and for the tooltip. */
function describeDay(day, inBreak, isLeave) {
  const parts = [`${Number(day.date.slice(8))} ${MONTHS[Number(day.date.slice(5, 7)) - 1]}`]
  parts.push(WEEKDAY_SHORT[day.dayOfWeek - 1])
  if (day.blackout) parts.push('blacked out, will not be booked')
  else if (day.pinned) parts.push('pinned, you fixed this day')
  else if (isLeave) parts.push('a day to book')
  if (day.holidayName) {
    // A birthday is a day off, but it is not a public holiday, and saying so out
    // loud to a screen reader would be wrong.
    parts.push(day.personal ? `a day off, ${day.holidayName}` : `public holiday, ${day.holidayName}`)
  } else if (day.weekend) parts.push('not a working day')
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
  const rowMonths = useMemo(() => dominantMonths(rows), [rows])

  /** Every month the range touches, in order, with what each one holds. */
  const months = useMemo(() => {
    const seen = new Map()
    for (const day of calendar) {
      const key = day.date.slice(0, 7)
      if (!seen.has(key)) seen.set(key, { key, daysOff: 0, booked: 0 })
    }
    const leave = new Set(plan.leaveDates || [])
    for (const b of breaks) {
      for (let i = b.startIndex; i <= b.endIndex; i++) {
        const entry = seen.get(calendar[i].date.slice(0, 7))
        if (!entry) continue
        entry.daysOff++
        if (leave.has(calendar[i].date)) entry.booked++
      }
    }
    return [...seen.values()]
  }, [calendar, breaks, plan.leaveDates])

  const leaveSet = useMemo(() => new Set(plan.leaveDates || []), [plan.leaveDates])
  const inBreakSet = useMemo(() => {
    const s = new Set()
    for (const b of breaks) for (let i = b.startIndex; i <= b.endIndex; i++) s.add(i)
    return s
  }, [breaks])
  const changedSet = useMemo(() => new Set(changedDates), [changedDates])

  // Open on the month holding the first break, because that is what somebody came
  // to look at. Falling back to the start of the range.
  const [month, setMonth] = useState(null)
  const activeMonth = month && months.some((m) => m.key === month) ? month : months[0]?.key

  useEffect(() => {
    if (!breaks.length || month) return
    setMonth(calendar[breaks[0].startIndex].date.slice(0, 7))
  }, [breaks, calendar, month])

  // When the plan re-solves and days move, follow them.
  useEffect(() => {
    if (!changedDates.length) return
    setMonth(changedDates[0].slice(0, 7))
  }, [changedDates])

  const [focused, setFocused] = useState(0)
  const [menuFor, setMenuFor] = useState(null)
  const gridRef = useRef(null)
  const pendingFocus = useRef(null)

  const monthIndex = months.findIndex((m) => m.key === activeMonth)

  /** Rows on this page: the month's own weeks plus a week of spill either side. */
  const visibleRows = useMemo(() => {
    const own = []
    for (let r = 0; r < rows.length; r++) if (rowMonths[r] === activeMonth) own.push(r)
    if (own.length === 0) return rows.map((_, r) => r)
    const first = Math.max(0, own[0] - SPILL_WEEKS)
    const last = Math.min(rows.length - 1, own[own.length - 1] + SPILL_WEEKS)
    const out = []
    for (let r = first; r <= last; r++) out.push(r)
    return out
  }, [rows, rowMonths, activeMonth])

  const goToMonth = useCallback(
    (key, focusIndex) => {
      setMonth(key)
      setMenuFor(null)
      if (focusIndex != null) {
        setFocused(focusIndex)
        pendingFocus.current = focusIndex
      }
    },
    []
  )

  // Focus lands after the new page has rendered.
  useEffect(() => {
    if (pendingFocus.current == null) return
    const el = gridRef.current?.querySelector(`[data-day-index="${pendingFocus.current}"]`)
    el?.focus()
    pendingFocus.current = null
  })

  // Arrow keys walk the grid: left and right by a day, up and down by a week.
  // Walking off the end of a page turns to the next one rather than stopping.
  const onKeyDown = useCallback(
    (event, index) => {
      const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
      let next = null

      if (event.key in moves) next = index + moves[event.key]
      else if (event.key === 'Home') next = index - (dayOfWeek(calendar[index].date) - 1)
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
      const targetMonth = calendar[clamped].date.slice(0, 7)
      if (targetMonth !== activeMonth && months.some((m) => m.key === targetMonth)) {
        goToMonth(targetMonth, clamped)
        return
      }
      setFocused(clamped)
      gridRef.current?.querySelector(`[data-day-index="${clamped}"]`)?.focus()
    },
    [calendar, menuFor, activeMonth, months, goToMonth]
  )

  if (!calendar.length) return null

  const [yearPart, monthPart] = (activeMonth || '').split('-')
  const monthLabel = `${MONTHS[Number(monthPart) - 1]} ${yearPart}`

  return (
    <div className="w-full max-w-[520px]">
      <YearStrip months={months} active={activeMonth} onPick={(key) => goToMonth(key)} />

      <div className="mb-3 mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn min-h-10 px-3"
          disabled={monthIndex <= 0}
          onClick={() => goToMonth(months[monthIndex - 1].key)}
          aria-label="Show the month before"
        >
          <Icon name="caret" size={18} className="rotate-90" />
        </button>

        <h3 className="text-lg" aria-live="polite">
          {monthLabel}
        </h3>

        <button
          type="button"
          className="btn min-h-10 px-3"
          disabled={monthIndex < 0 || monthIndex >= months.length - 1}
          onClick={() => goToMonth(months[monthIndex + 1].key)}
          aria-label="Show the month after"
        >
          <Icon name="caret" size={18} className="-rotate-90" />
        </button>
      </div>

      <div
        className="mb-2 flex items-stretch gap-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted-foreground)]"
        aria-hidden="true"
      >
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
        aria-label={`${monthLabel}, week by week`}
        aria-rowcount={visibleRows.length}
        className="relative"
      >
        {visibleRows.map((r, position) => {
          const row = rows[r]
          const rowSegments = segments.filter((s) => s.row === r)

          return (
            <div key={r} role="row" aria-rowindex={position + 1} className="flex items-stretch gap-1">
              <div className="relative grid min-w-0 flex-1 grid-cols-7 gap-[3px]">
                {/* The break bars sit behind the days, one piece per row. */}
                {rowSegments.map((seg) => (
                  <div
                    key={seg.key}
                    aria-hidden="true"
                    className="anim-bar pointer-events-none z-0 self-stretch"
                    style={{
                      '--i': seg.breakIndex,
                      gridColumn: `${seg.from + 1} / ${seg.to + 2}`,
                      gridRow: 1,
                      background: 'var(--day-leave-band)',
                      border: 'var(--b) solid var(--line)',
                      // An edge where the break carries on into the next row is
                      // left open and square, so the run reads as continuous.
                      borderLeftWidth: seg.startsHere ? 'var(--b)' : 0,
                      borderRightWidth: seg.endsHere ? 'var(--b)' : 0,
                      borderTopLeftRadius: seg.startsHere ? 10 : 0,
                      borderBottomLeftRadius: seg.startsHere ? 10 : 0,
                      borderTopRightRadius: seg.endsHere ? 10 : 0,
                      borderBottomRightRadius: seg.endsHere ? 10 : 0,
                      boxShadow: '2px 2px 0 0 var(--shadow-ink)'
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
                  return (
                    <DayCell
                      key={day.date}
                      day={day}
                      column={c}
                      row={1}
                      outsideMonth={day.date.slice(0, 7) !== activeMonth}
                      isLeave={leaveSet.has(day.date)}
                      inBreak={inBreakSet.has(day.index)}
                      changed={changedSet.has(day.date)}
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

      <p className="hint mt-2">
        Days either side of {MONTHS[Number(monthPart) - 1]} are shown faded, so a break that runs over the turn of the
        month stays in one piece.
      </p>
    </div>
  )
}

/**
 * The whole range in one strip: a bar per month, taller where there is more time
 * off, filled in proportion to how much of it you pay for. It is the overview and
 * the navigation at once, so the year is never out of sight.
 */
function YearStrip({ months, active, onPick }) {
  if (months.length < 2) return null
  const peak = Math.max(1, ...months.map((m) => m.daysOff))

  return (
    <div>
      <p className="label mb-1">The whole range</p>
      <ul className="flex items-end gap-[3px]" style={{ height: 58 }}>
        {months.map((m) => {
          const [y, mo] = m.key.split('-')
          const name = MONTHS_SHORT[Number(mo) - 1]
          const isActive = m.key === active
          const h = m.daysOff === 0 ? 5 : Math.max(9, Math.round((m.daysOff / peak) * 40))
          const bookedH = m.daysOff === 0 ? 0 : Math.round((m.booked / m.daysOff) * h)

          return (
            <li key={m.key} className="flex min-w-0 flex-1 flex-col items-center justify-end">
              <button
                type="button"
                onClick={() => onPick(m.key)}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`${MONTHS[Number(mo) - 1]} ${y}, ${m.daysOff} days off, ${m.booked} booked`}
                className="flex w-full flex-col items-center justify-end"
                style={{ height: 52 }}
              >
                <span
                  className="relative block w-full overflow-hidden rounded-t-[4px]"
                  style={{
                    height: h,
                    background: m.daysOff === 0 ? 'var(--day-weekend)' : 'var(--day-leave-band)',
                    border: 'var(--b-thin) solid var(--line)',
                    borderBottom: 0
                  }}
                >
                  {bookedH > 0 && (
                    <span
                      className="absolute inset-x-0 bottom-0 block"
                      style={{ height: bookedH, background: 'var(--day-leave)' }}
                    />
                  )}
                </span>
                <span
                  className="mt-[3px] block w-full text-[10px] font-extrabold uppercase"
                  style={{
                    color: isActive ? 'var(--ink-fixed)' : 'var(--muted-foreground)',
                    background: isActive ? 'var(--sun)' : 'transparent',
                    border: isActive ? 'var(--b-thin) solid var(--line)' : 'var(--b-thin) solid transparent',
                    borderRadius: 4
                  }}
                >
                  {name[0]}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DayCell({
  day,
  column,
  row,
  outsideMonth,
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

  let background = 'transparent'
  let outline
  if (inBreak) {
    // Inside a break the pale band shows through, except on the days you are
    // actually booking, which get a solid chip so they are the thing you read.
    if (isLeave) {
      background = 'var(--day-leave)'
      outline = 'var(--b-thin) solid var(--line)'
    } else if (day.holidayName) {
      background = 'var(--day-holiday)'
      outline = 'var(--b-thin) solid var(--line)'
    }
  } else if (!day.blackout) {
    if (day.holidayName) background = 'var(--day-holiday)'
    else if (day.weekend) background = 'var(--day-weekend)'
    if (day.holidayName || day.weekend) outline = 'var(--b-thin) solid var(--line)'
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
    <div
      role="gridcell"
      className="relative min-w-0"
      style={{
        gridColumn: column + 1,
        gridRow: row,
        opacity: outsideMonth ? 0.42 : 1,
        // Later rows are separate stacking contexts at the same depth, so an open
        // menu has to out-rank them here rather than from inside the cell, or the
        // next week paints straight over it.
        zIndex: menuOpen ? 60 : 10
      }}
    >
      <button
        type="button"
        data-day-index={day.index}
        tabIndex={focused ? 0 : -1}
        onFocus={onFocusCell}
        onKeyDown={onKeyDown}
        onClick={onToggleMenu}
        aria-label={outsideMonth ? `${label}, outside this month` : label}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        title={day.holidayName || undefined}
        className={`relative flex min-h-11 w-full flex-col items-center justify-center rounded-lg px-0.5 py-1 transition-colors duration-150 sm:min-h-12 ${
          day.blackout ? 'stripe-blackout' : ''
        } ${inBreak && (isLeave || day.holidayName) ? 'my-[3px] scale-[0.88]' : ''}`}
        style={{
          background,
          border: outline,
          // A day the solver just moved gets a ring it is impossible to miss.
          outline: changed ? 'var(--b-thick) solid var(--sky)' : undefined,
          outlineOffset: changed ? '2px' : undefined,
          boxShadow: day.pinned ? 'inset 0 0 0 var(--b) var(--day-pinned)' : undefined,
          // Both chips keep the same fill in either theme, so each carries its own
          // text colour rather than following the theme's ink. Sea green is dark
          // enough to need pale text; coral is not.
          color: isLeave ? 'var(--ink-fixed)' : day.holidayName ? 'var(--on-sea)' : undefined
        }}
      >
        <span
          className={`tabular text-[13px] leading-none ${
            isLeave || day.pinned ? 'font-extrabold' : day.isFree ? 'font-medium opacity-80' : 'font-semibold'
          } ${day.blackout ? 'line-through opacity-70' : ''} ${changed ? 'anim-nudge' : ''}`}
        >
          {dayNumber}
        </span>
        <Marker kind={marker} />
        {/* The pier. A day you pay for is what holds the span up, so it is drawn
            doing exactly that. */}
        {isLeave && inBreak && (
          <span
            aria-hidden="true"
            className="absolute bottom-[-6px] left-1/2 block h-[7px] w-[3px] -translate-x-1/2"
            style={{ background: 'var(--line)' }}
          />
        )}
      </button>

      {menuOpen && (
        <DayMenu day={day} column={column} onPin={onPin} onBlackout={onBlackout} onClose={onToggleMenu} />
      )}
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
    return <span className={`${common} rounded-full`} style={{ background: 'var(--ink-fixed)' }} aria-hidden="true" />
  }
  if (kind === 'holiday') {
    return (
      <span
        className={`${common} rounded-full border`}
        style={{ borderColor: 'currentColor', borderWidth: 1.5 }}
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
function DayMenu({ day, column, onPin, onBlackout, onClose }) {
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

  // Centred in the middle of the week, tucked in at either edge, so the menu
  // never hangs off the side of a phone.
  const align = column <= 1 ? 'left-0' : column >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2'

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Options for ${pretty}`}
      className={`panel absolute top-full mt-1 w-60 max-w-[80vw] p-1 text-left text-sm ${align}`}
    >
      <p className="px-2 py-1.5 text-xs font-extrabold text-[var(--muted-foreground)]">{pretty}</p>
      {day.isFree && !day.pinned ? (
        <p className="px-2 pb-2 text-xs leading-snug text-[var(--muted-foreground)]" style={{ overflowWrap: 'anywhere' }}>
          {day.holidayName ? `${day.holidayName}. ` : ''}You already have this day off.
        </p>
      ) : (
        <>
          <button
            type="button"
            role="menuitem"
            onClick={onPin}
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left font-semibold hover:bg-[var(--muted)]"
          >
            {day.pinned ? 'Stop fixing this day' : 'Always take this day off'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onBlackout}
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left font-semibold hover:bg-[var(--muted)]"
          >
            {day.blackout ? 'Allow this day again' : 'Never take this day off'}
          </button>
        </>
      )}
    </div>
  )
}

export { buildRows, breakSegments, dominantMonths }
