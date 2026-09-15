/**
 * BridgeDays.
 *
 * Everything happens here and nowhere else: read the plan out of the address bar,
 * load the country's dates, work out the answer, draw it. There is no server in
 * this application, and no state outside the URL.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildCalendar, selectHolidays } from './solver/calendar.js'
import { solve } from './solver/solve.js'
import {
  readState,
  writeState,
  rangeOf,
  loadRemembered,
  saveRemembered,
  forgetRemembered,
  isRemembering
} from './state/urlState.js'
import { loadCountry, countryInfo, subdivisionName, holidaysForRange, yearsAvailable, DATA_YEARS } from './data/loadHolidays.js'
import { birthdayHolidays } from './solver/birthday.js'
import { periodLabel as makePeriodLabel, plural } from './format.js'

import Controls from './components/Controls.jsx'
import Headline from './components/Headline.jsx'
import YearGrid from './components/YearGrid.jsx'
import Legend from './components/Legend.jsx'
import BreakList from './components/BreakList.jsx'
import RequestDates from './components/RequestDates.jsx'
import ReturnsCurve from './components/ReturnsCurve.jsx'
import ShareRow from './components/ShareRow.jsx'
import Verification from './components/Verification.jsx'
import Icon from './components/Icon.jsx'
import Marquee from './components/Marquee.jsx'
import Showcase from './components/Showcase.jsx'

export default function App() {
  const [state, setState] = useState(() => {
    const fromUrl = readState()
    // A remembered country only applies to a bare visit, never to a shared link,
    // because a link is somebody else's plan and must arrive intact.
    if (!window.location.hash) {
      const remembered = loadRemembered()
      if (remembered) return { ...fromUrl, ...remembered }
    }
    return fromUrl
  })

  const [countryData, setCountryData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [theme, setTheme] = useTheme()
  const [remembering, setRemembering] = useState(() => isRemembering())
  const [changed, setChanged] = useState({ dates: [], note: null })
  const previousLeave = useRef(null)

  // The address bar and the app stay in step, including through the back button.
  useEffect(() => {
    writeState(state, { replace: true })
  }, [state])

  useEffect(() => {
    const onPop = () => setState(readState())
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [])

  // Each country's dates are fetched once, on demand, from this origin.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    loadCountry(state.country)
      .then((data) => {
        if (cancelled) return
        setCountryData(data)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err.message)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [state.country])

  const range = useMemo(() => rangeOf(state), [state])
  const info = countryInfo(state.country)

  const { calendar, missingYears } = useMemo(() => {
    if (!countryData) return { calendar: [], missingYears: [] }
    const { holidays, missingYears: missing } = holidaysForRange(
      countryData,
      range,
      state.subdivision,
      state.includeObservances
    )
    const applicable = selectHolidays(holidays, state.subdivision, {
      types: state.includeObservances ? ['public', 'bank', 'observance'] : ['public', 'bank']
    })

    // A birthday your employer gives you is a free day exactly like a public
    // holiday, so the solver can bridge from it the same way. It is added here
    // rather than in the data files because it is yours, not the country's.
    const personal =
      state.birthdayOff && state.birthday ? birthdayHolidays(range, state.birthday) : []

    return {
      calendar: buildCalendar({
        range,
        workPattern: state.workPattern,
        holidays: [...applicable, ...personal],
        blackouts: state.blackouts,
        pinned: state.pinned,
        booked: state.booked
      }),
      missingYears: missing
    }
  }, [
    countryData,
    range,
    state.subdivision,
    state.includeObservances,
    state.workPattern,
    state.blackouts,
    state.pinned,
    state.booked,
    state.birthday,
    state.birthdayOff
  ])

  const plan = useMemo(() => {
    if (!calendar.length) return null
    return solve(calendar, {
      budget: state.days,
      objective: state.objective,
      minBreakLength: state.minBreakLength,
      maxBreaks: state.maxBreaks,
      weekendHolidaysGivenBack: state.weekendHolidaysGivenBack
    })
  }, [calendar, state.days, state.objective, state.minBreakLength, state.maxBreaks, state.weekendHolidaysGivenBack])

  // After a pin or a blackout, say what moved. A plan that quietly rearranges
  // itself is unsettling; one that tells you what changed is not.
  useEffect(() => {
    if (!plan || !plan.feasible) {
      previousLeave.current = null
      return
    }
    const now = plan.leaveDates
    const before = previousLeave.current
    previousLeave.current = now
    if (!before) return

    const added = now.filter((d) => !before.includes(d))
    const removed = before.filter((d) => !now.includes(d))
    if (added.length === 0 && removed.length === 0) {
      setChanged({ dates: [], note: null })
      return
    }
    setChanged({
      dates: added,
      note:
        added.length === 0
          ? `The plan dropped ${plural(removed.length, 'day', 'days')}.`
          : `The plan moved ${plural(added.length, 'day', 'days')} and dropped ${plural(removed.length, 'day', 'days')}.`
    })
    const t = setTimeout(() => setChanged({ dates: [], note: null }), 6000)
    return () => clearTimeout(t)
  }, [plan])

  const countryLabel = useMemo(() => {
    if (!info) return state.country
    const sub = subdivisionName(state.country, state.subdivision)
    return sub ? `${info.name} (${sub})` : info.name
  }, [info, state.country, state.subdivision])

  const periodLabel = useMemo(() => makePeriodLabel(range), [range])

  // A tab title and a bookmark that actually say something.
  useEffect(() => {
    const base = 'BridgeDays'
    if (plan && plan.feasible && plan.leaveSpent > 0) {
      document.title = `${plan.leaveSpent} days become ${plan.totalDaysOff} days off · ${periodLabel} · ${base}`
    } else {
      document.title = `${base} · Work out which days to book`
    }
  }, [plan, periodLabel])

  const update = useCallback((patch) => setState((prev) => ({ ...prev, ...patch })), [])

  const togglePinned = useCallback((date) => {
    setState((prev) => {
      const pinned = new Set(prev.pinned)
      const blackouts = new Set(prev.blackouts)
      if (pinned.has(date)) pinned.delete(date)
      else {
        pinned.add(date)
        blackouts.delete(date)
      }
      return { ...prev, pinned: [...pinned].sort(), blackouts: [...blackouts].sort() }
    })
  }, [])

  const toggleBlackout = useCallback((date) => {
    setState((prev) => {
      const pinned = new Set(prev.pinned)
      const blackouts = new Set(prev.blackouts)
      if (blackouts.has(date)) blackouts.delete(date)
      else {
        blackouts.add(date)
        pinned.delete(date)
      }
      return { ...prev, pinned: [...pinned].sort(), blackouts: [...blackouts].sort() }
    })
  }, [])

  const years = countryData ? yearsAvailable(countryData) : DATA_YEARS
  const adjustments = state.pinned.length + state.blackouts.length

  return (
    <>
      <a className="skip-link" href="#answer">
        Skip to the answer
      </a>

      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6 xl:max-w-[78rem]">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-5xl">
              BridgeDays<span style={{ color: 'var(--stamp)' }}>.</span>
            </h1>
            <p className="mt-2 text-base font-extrabold sm:text-lg">
              Take <span className="hl hl-lime tabular">12</span> days off. Get{' '}
              <span className="hl tabular">28</span>.
            </p>
          </div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </header>

        <div className="mb-4">
          <Marquee />
        </div>

        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-6">
        <main className="grid gap-5">
          <Controls
            state={state}
            onChange={update}
            countryData={countryData}
            years={years}
            optionsOpen={optionsOpen}
            setOptionsOpen={setOptionsOpen}
          />

          <div id="answer" tabIndex={-1}>
            {loadError ? (
              <div className="card p-5" style={{ background: 'var(--destructive)', color: 'var(--ink-fixed)' }} role="alert">
                <h2 className="text-xl">The holiday dates would not load</h2>
                <p className="mt-1 text-sm">{loadError}</p>
                <button type="button" className="btn btn-primary mt-3" onClick={() => update({ country: state.country })}>
                  <Icon name="reset" size={18} />
                  Try again
                </button>
              </div>
            ) : (
              <Headline plan={plan} periodLabel={periodLabel} countryLabel={countryLabel} busy={loading} />
            )}
          </div>

          {missingYears.length > 0 && (
            <p className="card p-3 text-sm font-semibold" role="status">
              There are no holiday dates yet for {missingYears.join(' and ')}. Those days are counted as ordinary
              working days, so the plan will be conservative.
            </p>
          )}

          {plan && plan.feasible && (
            <>
              <BreakList breaks={plan.breaks} />

              <RequestDates dates={plan.leaveDates} periodLabel={periodLabel} />

              <section className="card anim-pop p-4 sm:p-5" style={{ '--i': 2 }} aria-labelledby="year-heading">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="pill pill-blue mb-2">The whole year</span>
                    <h2 id="year-heading" className="text-2xl">
                      {periodLabel} at a glance
                    </h2>
                  </div>
                  {adjustments > 0 && (
                    <button
                      type="button"
                      className="btn btn-quiet min-h-9 px-3 text-sm"
                      onClick={() => update({ pinned: [], blackouts: [] })}
                    >
                      <Icon name="reset" size={16} />
                      Clear my {plural(adjustments, 'change', 'changes')}
                    </button>
                  )}
                </div>

                <p className="hint mb-3">
                  Tap any working day to fix it into the plan or rule it out. The plan works itself out again around
                  whatever you choose.
                </p>

                {changed.note && (
                  <p
                    className="mb-3 rounded-[10px] border-[2px] px-3 py-2 text-sm font-extrabold"
                    style={{ borderColor: 'var(--line)', background: 'var(--sun)', color: 'var(--ink-fixed)' }}
                    role="status"
                  >
                    {changed.note} The days that moved are outlined below.
                  </p>
                )}

                {/* Wide screens put the key beside the calendar rather than
                    stretching the calendar across the whole page. Reading order
                    matches what you see, in both layouts. */}
                <div className="grid gap-4 lg:grid-cols-[520px_minmax(0,1fr)] lg:items-start lg:gap-8">
                  <YearGrid
                    calendar={calendar}
                    plan={plan}
                    onPin={togglePinned}
                    onBlackout={toggleBlackout}
                    changedDates={changed.dates}
                  />

                  <div
                    className="border-t-[3px] pt-4 lg:border-l-[3px] lg:border-t-0 lg:pl-6 lg:pt-0"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <h3 className="mb-3 text-base">What the marks mean</h3>
                    <Legend className="lg:flex-col lg:items-start lg:gap-3" />
                  </div>
                </div>
              </section>

              <ReturnsCurve curve={plan.curve} spent={plan.leaveSpent} />

              <ShareRow
                state={state}
                plan={plan}
                calendar={calendar}
                countryLabel={countryLabel}
                periodLabel={periodLabel}
                theme={theme === 'dark' ? 'dark' : 'light'}
              />
            </>
          )}

          <Verification
            countryNotes={countryData?.notes || []}
            countryName={info?.name || state.country}
            dataGeneratedAt={countryData?.generatedAt}
          />

          <RememberBox
            remembering={remembering}
            onToggle={(on) => {
              if (on) saveRemembered(state)
              else forgetRemembered()
              setRemembering(on)
            }}
          />
        </main>

          <aside className="showcase-slot" aria-label="Our other apps">
            <Showcase />
          </aside>
        </div>

        <Footer />
      </div>
    </>
  )
}

function RememberBox({ remembering, onToggle }) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <input
        id="remember"
        type="checkbox"
        checked={remembering}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0"
        style={{ accentColor: 'var(--primary)' }}
      />
      <div>
        <label htmlFor="remember" className="block text-sm font-medium">
          Remember my country and allowance on this device
        </label>
        <p className="hint">
          Off unless you ask. It saves those two things in this browser and nothing else: no plan, no dates, nothing
          that leaves the device.
        </p>
      </div>
    </div>
  )
}

function ThemeToggle({ theme, setTheme }) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="btn btn-quiet min-h-11 px-3"
      onClick={() => setTheme(next)}
      aria-label={`Switch to the ${next} theme`}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      <span className="hidden sm:inline">{next === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}

/** System preference by default, the person's own choice once they make one. */
function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('bridge.theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      /* storage can be blocked, and that is fine */
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#071a1c' : '#f0fdfa')
    try {
      localStorage.setItem('bridge.theme', theme)
    } catch {
      /* nothing to do */
    }
  }, [theme])

  return [theme, setTheme]
}

function Footer() {
  return (
    <footer className="mt-10 border-t-[3px] pt-5 text-sm" style={{ borderColor: 'var(--border)' }}>
      <p className="hint">
        BridgeDays is free and open source under the MIT licence. Holiday dates come from the{' '}
        <a
          className="underline"
          href="https://github.com/commenthol/date-holidays"
          rel="noreferrer noopener"
          target="_blank"
        >
          date-holidays
        </a>{' '}
        project and ship with the app.
      </p>
      <p className="hint mt-2">
        <a className="underline" href="https://github.com/ThomasMarkVarga/bridge" rel="noreferrer noopener" target="_blank">
          Read the source
        </a>{' '}
        ·{' '}
        <a
          className="underline"
          href="https://github.com/ThomasMarkVarga/bridge/issues/new"
          rel="noreferrer noopener"
          target="_blank"
        >
          Report a wrong date
        </a>
      </p>
      <p className="hint mt-2">Check your own contract before you book anything.</p>
    </footer>
  )
}
