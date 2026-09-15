/**
 * The three questions, and everything else folded away behind them.
 *
 * Country, how many days, which year. That is the whole required path, and it has
 * to fit above the fold on a phone so the answer appears without scrolling. Work
 * patterns, leave years that start in April, blackout seasons and the rest live in
 * a panel that stays shut until somebody wants them.
 */
import { useId } from 'react'
import Icon from './Icon.jsx'
import Picker from './Picker.jsx'
import { COUNTRIES, subdivisionsOf } from '../data/loadHolidays.js'
import { OBJECTIVE_LABELS, OBJECTIVES } from '../solver/objectives.js'
import { WEEKDAYS_SHORT, MONTHS } from '../format.js'
import { toMonthDay, partsOf, daysInBirthdayMonth, isMonthDay } from '../solver/birthday.js'

/** Other names people type for a country, so that "uk" finds the United Kingdom. */
const ALIASES = {
  AE: 'uae emirates',
  CD: 'drc',
  CI: 'ivory coast',
  CZ: 'czechia czech',
  GB: 'uk britain england scotland wales',
  KR: 'korea',
  NL: 'holland',
  US: 'usa america'
}

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({
  value: c.code,
  label: c.name,
  badge: c.code,
  keywords: `${c.code} ${ALIASES[c.code] || ''}`
}))

/**
 * @param {object} props
 * @param {object} props.state
 * @param {(patch: object) => void} props.onChange
 * @param {object|null} props.countryData
 * @param {number[]} props.years
 * @param {boolean} props.optionsOpen
 * @param {(open: boolean) => void} props.setOptionsOpen
 */
export default function Controls({ state, onChange, countryData, years, optionsOpen, setOptionsOpen }) {
  const countryId = useId()
  const daysId = useId()
  const yearId = useId()
  const regionId = useId()

  const country = COUNTRIES.find((c) => c.code === state.country)
  // Regions come from the country's own file, so they only exist once it has
  // loaded. Until then the picker simply does not offer a region to choose.
  const regions = subdivisionsOf(countryData)
  const needsRegion = regions.length > 0

  return (
    <div className="card anim-pop relative z-10 p-4 sm:p-5">
      {/* On a phone the country gets its own row and the two numbers share one,
          so the answer underneath still lands above the fold. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_0.8fr_0.9fr]">
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor={countryId}>
            Country
          </label>
          <Picker
            id={countryId}
            label="Country"
            searchable
            value={state.country}
            options={COUNTRY_OPTIONS}
            onChange={(code) => {
              const next = COUNTRIES.find((c) => c.code === code)
              onChange({ country: code, subdivision: next ? next.defaultSubdivision : null })
            }}
          />
        </div>

        <div>
          <label className="label" htmlFor={daysId}>
            Days of leave
          </label>
          <input
            id={daysId}
            className="field tabular"
            type="number"
            inputMode="numeric"
            min="0"
            max="365"
            step="1"
            value={state.days}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              onChange({ days: Number.isFinite(n) ? Math.min(365, Math.max(0, n)) : 0 })
            }}
          />
        </div>

        <div>
          <label className="label" htmlFor={yearId}>
            Year
          </label>
          <Picker
            id={yearId}
            label="Year"
            className="tabular"
            value={state.year}
            disabled={Boolean(state.range)}
            options={years.map((y) => ({ value: y, label: String(y) }))}
            onChange={(year) => onChange({ year })}
          />
        </div>
      </div>

      {needsRegion && (
        <div className="mt-3">
          <label className="label" htmlFor={regionId}>
            {country.subdivisionLabel || 'Region'}
            {country.requireSubdivision ? '' : ' (optional)'}
          </label>
          <Picker
            id={regionId}
            label={country.subdivisionLabel || 'Region'}
            searchable={regions.length > 12}
            value={state.subdivision || ''}
            options={[
              ...(country.requireSubdivision ? [] : [{ value: '', label: 'The whole country' }]),
              ...regions.map((s) => ({ value: s.code, label: s.name }))
            ]}
            onChange={(code) => onChange({ subdivision: code || null })}
          />
          {country.requireSubdivision && (
            <p className="hint mt-1">Holidays genuinely differ here, so this changes the answer.</p>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn btn-quiet mt-3 w-full sm:w-auto"
        aria-expanded={optionsOpen}
        onClick={() => setOptionsOpen(!optionsOpen)}
      >
        <Icon name="sliders" size={18} />
        More options
        <Icon
          name="caret"
          size={16}
          className="transition-transform duration-150"
          style={{ transform: optionsOpen ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {optionsOpen && <MoreOptions state={state} onChange={onChange} countryData={countryData} />}
    </div>
  )
}

function MoreOptions({ state, onChange, countryData }) {
  const workId = useId()
  const objId = useId()
  const birthdayMonthId = useId()
  const birthdayDayId = useId()
  const minLenId = useId()
  const maxBreaksId = useId()
  const startId = useId()
  const endId = useId()

  const pattern = new Set(state.workPattern)
  const toggleDay = (d) => {
    const next = new Set(pattern)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    onChange({ workPattern: [...next].sort((a, b) => a - b) })
  }

  return (
    <div className="anim-pop mt-4 grid gap-5 border-t-[3px] pt-4" style={{ borderColor: 'var(--border)' }}>
      <fieldset>
        <legend className="label mb-2" id={workId}>
          Which days do you work?
        </legend>
        <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={workId}>
          {WEEKDAYS_SHORT.map((name, i) => {
            const day = i + 1
            const on = pattern.has(day)
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(day)}
                className="btn min-h-11 min-w-[3.25rem] px-2 text-sm"
                style={{
                  background: on ? 'var(--sun)' : 'var(--card)',
                  color: on ? 'var(--ink-fixed)' : 'var(--foreground)',
                  borderColor: 'var(--line)',
                  fontWeight: 800
                }}
              >
                {name}
              </button>
            )
          })}
        </div>
        <p className="hint mt-1.5">
          {state.workPattern.length === 0
            ? 'You have no working days selected, so there is nothing to book.'
            : `${state.workPattern.length} working days a week.`}
        </p>
      </fieldset>

      <div>
        <label className="label" htmlFor={objId}>
          What are you after?
        </label>
        <Picker
          id={objId}
          label="What are you after?"
          value={state.objective}
          options={OBJECTIVES.map((o) => ({ value: o, label: OBJECTIVE_LABELS[o].name }))}
          onChange={(objective) => onChange({ objective })}
        />
        <p className="hint mt-1">{OBJECTIVE_LABELS[state.objective]?.hint}</p>
      </div>

      {state.objective === 'spread' && (
        <div>
          <label className="label" htmlFor={minLenId}>
            Shortest break worth booking: <span className="tabular">{state.minBreakLength} days</span>
          </label>
          <input
            id={minLenId}
            type="range"
            min="2"
            max="14"
            step="1"
            value={state.minBreakLength}
            onChange={(e) => onChange({ minBreakLength: Number(e.target.value) })}
            className="w-full"
            style={{ accentColor: 'var(--primary)' }}
          />
          <p className="hint">Anything shorter than this is left out of the plan.</p>
        </div>
      )}

      <div>
        <label className="label" htmlFor={maxBreaksId}>
          Most separate breaks (optional)
        </label>
        <input
          id={maxBreaksId}
          className="field tabular"
          type="number"
          inputMode="numeric"
          min="1"
          max="60"
          placeholder="No limit"
          value={state.maxBreaks ?? ''}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10)
            onChange({ maxBreaks: Number.isFinite(n) && n > 0 ? n : null })
          }}
        />
        <p className="hint mt-1">Useful if your employer only lets you book a few times a year.</p>
      </div>

      <fieldset>
        <legend className="label mb-2">Leave year</legend>
        {state.range ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="hint mb-1 block" htmlFor={startId}>
                Starts
              </label>
              <input
                id={startId}
                type="date"
                className="field tabular"
                value={state.range.start}
                onChange={(e) => onChange({ range: { ...state.range, start: e.target.value } })}
              />
            </div>
            <div>
              <label className="hint mb-1 block" htmlFor={endId}>
                Ends
              </label>
              <input
                id={endId}
                type="date"
                className="field tabular"
                value={state.range.end}
                onChange={(e) => onChange({ range: { ...state.range, end: e.target.value } })}
              />
            </div>
            <button
              type="button"
              className="btn btn-quiet sm:col-span-2"
              onClick={() => onChange({ range: null })}
            >
              Use the whole calendar year instead
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-quiet w-full sm:w-auto"
            onClick={() =>
              onChange({ range: { start: `${state.year}-04-01`, end: `${state.year + 1}-03-31` } })
            }
          >
            My leave year does not start in January
          </button>
        )}
      </fieldset>

      <fieldset>
        <legend className="label mb-2">Your birthday</legend>
        <Switch
          checked={state.birthdayOff}
          onChange={(v) => onChange({ birthdayOff: v })}
          label="My employer gives me my birthday off"
          hint="It becomes a free day like a public holiday, so the plan can build a break around it."
        />

        {state.birthdayOff && <BirthdayPicker state={state} onChange={onChange} monthId={birthdayMonthId} dayId={birthdayDayId} />}
      </fieldset>

      <Switch
        checked={state.weekendHolidaysGivenBack}
        onChange={(v) => onChange({ weekendHolidaysGivenBack: v })}
        label="My employer gives a day back when a holiday falls on a weekend"
        hint="Adds one day to your allowance for each one. Check your contract, because many employers do not do this."
      />

      <Switch
        checked={state.includeObservances}
        onChange={(v) => onChange({ includeObservances: v })}
        label="Count observances as days off too"
        hint="Days like Mother's Day that are marked but are not usually a day off work."
      />
    </div>
  )
}

/**
 * A month and a day, and nothing else.
 *
 * A date field would demand a year, and a birthday does not have one that is
 * anybody's business. Two lists also beat a date picker on a phone, where the
 * native one opens on the current year and makes you scroll decades back.
 */
function BirthdayPicker({ state, onChange, monthId, dayId }) {
  const { month, day } = partsOf(state.birthday)
  const selectedMonth = month || 1
  const maxDay = daysInBirthdayMonth(selectedMonth)

  const setMonth = (m) => onChange({ birthday: toMonthDay(m, day || 1) })
  const setDay = (d) => onChange({ birthday: toMonthDay(selectedMonth, d) })

  return (
    <div className="mt-3">
      <p className="label">Which day is it?</p>
      <div className="grid grid-cols-[1.4fr_0.8fr] gap-2">
        <div>
          <label className="sr-only" htmlFor={monthId}>
            Month of your birthday
          </label>
          <Picker
            id={monthId}
            label="Month of your birthday"
            placeholder="Month"
            value={month || ''}
            options={MONTHS.map((name, i) => ({ value: i + 1, label: name }))}
            onChange={setMonth}
          />
        </div>
        <div>
          <label className="sr-only" htmlFor={dayId}>
            Day of your birthday
          </label>
          <Picker
            id={dayId}
            label="Day of your birthday"
            placeholder="Day"
            className="tabular"
            value={day || ''}
            options={Array.from({ length: maxDay }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
            onChange={setDay}
          />
        </div>
      </div>

      {!isMonthDay(state.birthday) ? (
        <p className="hint mt-1">Pick a month and a day. It counts as a day off every year.</p>
      ) : (
        <p className="hint mt-1">No year is asked for or stored, so a link you share cannot say how old you are.</p>
      )}

      {state.birthday === '02-29' && (
        <p className="hint mt-1">
          The 29th only comes round every fourth year. BridgeDays uses the 28th in the others, which may not be what your
          employer does.
        </p>
      )}
    </div>
  )
}

function Switch({ checked, onChange, label, hint }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0"
        style={{ accentColor: 'var(--primary)' }}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium">
          {label}
        </label>
        <p className="hint">{hint}</p>
      </div>
    </div>
  )
}
