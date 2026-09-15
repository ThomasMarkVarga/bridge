/**
 * BridgeDays.
 *
 * Everything happens here and nowhere else: read the plan out of the address bar,
 * load the country's dates, work out the answer, draw it. There is no server in
 * this application, and no state outside the URL.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildCalendar, selectHolidays } from './solver/calendar.js'
import { solve } from './solver/solve.js'
import {
  readState,
  isPlanHash,
  writeState,
  rangeOf,
  loadRemembered,
  saveRemembered,
  forgetRemembered,
  isRemembering
} from './state/urlState.js'
import { loadCountry, countryInfo, subdivisionName, holidaysForRange, yearsAvailable, DATA_YEARS } from './data/loadHolidays.js'
import { birthdayHolidays } from './solver/birthday.js'
import { periodLabel as makePeriodLabel, counted } from './format.js'
import { useT, useTx } from './i18n/index.jsx'
import { LANGUAGES, LANGUAGE_CODES } from './i18n/core.js'
import { countryNamer } from './i18n/calendarNames.js'

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
import Claims from './components/Claims.jsx'
import Showcase from './components/Showcase.jsx'

export default function App() {
  const { t, lang } = useT()
  const tx = useTx()

  const [state, setState] = useState(() => {
    const fromUrl = readState()
    // A remembered country only applies to a bare visit, never to a shared link,
    // because a link is somebody else's plan and must arrive intact.
    if (!isPlanHash(window.location.hash)) {
      const remembered = loadRemembered()
      if (remembered) return { ...fromUrl, ...remembered }
    }
    return fromUrl
  })
  const firstState = useRef(state)
  const arrivedWithPlan = useRef(isPlanHash(window.location.hash))

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
    const onPop = () => {
      // An in-page jump (#faq, the skip link) is not a plan. Reading it as one
      // would quietly reset everything to the defaults.
      if (window.location.hash && !isPlanHash(window.location.hash)) return
      setState(readState())
    }
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
          ? t('changed.dropped', { days: counted('days', removed.length) })
          : t('changed.movedAndDropped', {
              added: counted('days', added.length),
              removed: counted('days', removed.length)
            })
    })
    const timer = setTimeout(() => setChanged({ dates: [], note: null }), 6000)
    return () => clearTimeout(timer)
  }, [plan, t])

  const countryLabel = useMemo(() => {
    if (!info) return state.country
    const name = countryNamer(lang)(state.country, info.name)
    const sub = subdivisionName(countryData, state.subdivision)
    return sub ? `${name} (${sub})` : name
  }, [info, countryData, state.country, state.subdivision, lang])

  // Recomputed on a language change: the month names inside it are translated.
  const periodLabel = useMemo(() => makePeriodLabel(range), [range, lang])

  // A tab title and a bookmark that actually say something, once the plan is
  // somebody's: a shared link, or a change from the defaults. A bare visit keeps
  // the title from index.html, which is the one search engines show.
  const staticTitle = useRef(document.title)
  useEffect(() => {
    const personal = arrivedWithPlan.current || state !== firstState.current
    if (personal && plan && plan.feasible && plan.leaveSpent > 0) {
      document.title = t('meta.titlePlan', {
        spent: counted('leaveDays', plan.leaveSpent),
        total: counted('daysOff', plan.totalDaysOff),
        period: periodLabel
      })
    } else {
      // The served title is written in English in index.html, and for an English
      // reader it is left exactly as it arrived so a crawler and a person see the
      // same words. In any other language it has to be replaced, because the
      // alternative is an English title over a translated page.
      document.title = lang === 'en' ? staticTitle.current : t('meta.title')
      const description = document.querySelector('meta[name="description"]')
      if (description && lang !== 'en') description.setAttribute('content', t('meta.description'))
    }
  }, [plan, periodLabel, state, t, lang])

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
        {t('a11y.skipToAnswer')}
      </a>

      <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6 xl:max-w-[78rem]">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-5xl">
              BridgeDays<span style={{ color: 'var(--stamp)' }}>.</span>
            </h1>
            <p className="mt-2 text-base font-extrabold sm:text-lg">
              {tx('header.tagline', {
                days: <span className="hl hl-lime tabular">12</span>,
                off: <span className="hl tabular">28</span>
              })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle />
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </header>

        <div className="mb-5">
          <Claims />
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
                <h2 className="text-xl">{t('error.holidaysHeading')}</h2>
                <p className="mt-1 text-sm">{loadError}</p>
                <button type="button" className="btn btn-primary mt-3" onClick={() => update({ country: state.country })}>
                  <Icon name="reset" size={18} />
                  {t('error.tryAgain')}
                </button>
              </div>
            ) : (
              <Headline plan={plan} periodLabel={periodLabel} countryLabel={countryLabel} busy={loading} />
            )}
          </div>

          {missingYears.length > 0 && (
            <p className="card p-3 text-sm font-semibold" role="status">
              {t('error.missingYears', { years: missingYears.join(t('error.yearsJoin')) })}
            </p>
          )}

          {plan && plan.feasible && (
            <>
              <BreakList breaks={plan.breaks} />

              <RequestDates dates={plan.leaveDates} periodLabel={periodLabel} />

              <section className="card anim-pop p-4 sm:p-5" style={{ '--i': 2 }} aria-labelledby="year-heading">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="pill pill-blue mb-2">{t('year.pill')}</span>
                    <h2 id="year-heading" className="text-2xl">
                      {t('year.heading', { period: periodLabel })}
                    </h2>
                  </div>
                  {adjustments > 0 && (
                    <button
                      type="button"
                      className="btn btn-quiet min-h-9 px-3 text-sm"
                      onClick={() => update({ pinned: [], blackouts: [] })}
                    >
                      <Icon name="reset" size={16} />
                      {t('year.clearChanges', { changes: counted('changes', adjustments) })}
                    </button>
                  )}
                </div>

                <p className="hint mb-3">{t('year.tapHint')}</p>

                {changed.note && (
                  <p
                    className="mb-3 rounded-[10px] border-[2px] px-3 py-2 text-sm font-extrabold"
                    style={{ borderColor: 'var(--line)', background: 'var(--sun)', color: 'var(--ink-fixed)' }}
                    role="status"
                  >
                    {t('year.movedNote', { note: changed.note })}
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
                    <h3 className="mb-3 text-base">{t('year.whatMarksMean')}</h3>
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

          <aside className="showcase-slot" aria-label={t('showcase.label')}>
            <Showcase />
          </aside>
        </div>

        <Footer />
      </div>
    </>
  )
}

function RememberBox({ remembering, onToggle }) {
  const { t } = useT()
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
          {t('remember.label')}
        </label>
        <p className="hint">{t('remember.hint')}</p>
      </div>
    </div>
  )
}

function ThemeToggle({ theme, setTheme }) {
  const { t } = useT()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="btn btn-quiet min-h-11 px-3"
      onClick={() => setTheme(next)}
      aria-label={t('header.themeSwitch', { theme: t(`header.theme${next === 'dark' ? 'Dark' : 'Light'}Name`) })}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      <span className="hidden sm:inline">
        {next === 'dark' ? t('header.themeDark') : t('header.themeLight')}
      </span>
    </button>
  )
}

/**
 * Two languages, so it is a switch rather than a menu: the button says the
 * language you would get, and pressing it gets you there.
 *
 * The name is written in its own language and carries a lang attribute, so a
 * screen reader says "Romana" the Romanian way rather than reading it as
 * English. The choice is kept on this device and beats whatever the edge
 * guessed from the connection, because a guess from an address is wrong for
 * anybody travelling or living abroad.
 */
function LanguageToggle() {
  const { lang, setLang, t } = useT()
  const next = LANGUAGE_CODES[(LANGUAGE_CODES.indexOf(lang) + 1) % LANGUAGE_CODES.length]
  return (
    <button
      type="button"
      className="btn btn-quiet min-h-11 px-3"
      onClick={() => setLang(next)}
      aria-label={`${t('lang.pick')}: ${LANGUAGES[next].endonym}`}
      lang={LANGUAGES[next].htmlLang}
    >
      <Icon name="globe" size={18} />
      <span className="hidden sm:inline">{LANGUAGES[next].endonym}</span>
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

/**
 * Rendered into #site-footer in index.html when it is there, so the footer comes
 * after the static guide and FAQ rather than above them.
 */
function Footer() {
  const { t } = useT()
  const tx = useTx()
  const slot = document.getElementById('site-footer')
  const footer = (
    <footer className="mt-10 border-t-[3px] pt-5 text-sm" style={{ borderColor: 'var(--border)' }}>
      {/* Leads the footer, the same way it does on the other apps in the family. */}
      <a className="vcf-home" href="https://vibe-coding.fans/">
        <svg viewBox="0 0 66 66" width="30" height="30" aria-hidden="true">
          <rect x="6" y="6" width="58" height="58" rx="16" fill="#0B0B0F" />
          <rect x="2" y="2" width="54" height="54" rx="14" fill="#FF4FA3" stroke="#0B0B0F" strokeWidth="4" />
          <path
            d="M26 18 13 29l13 11M33 18h7.5a5.5 5.5 0 0 1 0 11H36m4.5 0a5.5 5.5 0 0 1 0 11H33"
            fill="none"
            stroke="#0B0B0F"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{tx('footer.moreApps', { brand: <b>vibe-coding.fans</b> })}</span>
      </a>
      <p className="hint mt-3">
        <a className="underline" href="/countries/">
          {t('footer.holidaysByCountry')}
        </a>
      </p>
      <p className="hint mt-2">
        {tx('footer.licence', {
          link: (
            <a
              className="underline"
              href="https://github.com/commenthol/date-holidays"
              rel="noreferrer noopener"
              target="_blank"
            >
              date-holidays
            </a>
          )
        })}
      </p>
      <p className="hint mt-2">
        <a className="underline" href="https://github.com/qxZap/bridge" rel="noreferrer noopener" target="_blank">
          {t('footer.source')}
        </a>{' '}
        ·{' '}
        <a
          className="underline"
          href="https://github.com/qxZap/bridge/issues/new"
          rel="noreferrer noopener"
          target="_blank"
        >
          {t('footer.reportDate')}
        </a>
      </p>
      <p className="hint mt-2">{t('footer.contract')}</p>
    </footer>
  )
  return slot ? createPortal(footer, slot) : footer
}
