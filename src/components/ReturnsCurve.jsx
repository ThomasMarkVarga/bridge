/**
 * What each extra day of leave is worth.
 *
 * The solver works out the best plan for every budget from nothing up to the whole
 * allowance, so this costs no extra thought: it is a by-product of the table it
 * already built. It answers a question people genuinely have and nobody shows
 * them, which is whether the last few days of the allowance are worth spending
 * here or saving.
 *
 * Drawn as bars because each step is one whole day of leave, not a point on a
 * continuous line. Values are labelled on the bars and repeated in a table, so the
 * picture is never the only way to read the numbers.
 */
import { useId, useState } from 'react'

/**
 * @param {object} props
 * @param {{budget: number, totalDaysOff: number}[]} props.curve
 * @param {number} props.spent  how many days the current plan uses
 */
export default function ReturnsCurve({ curve, spent }) {
  const [hover, setHover] = useState(null)
  const tableId = useId()

  const steps = []
  for (let i = 1; i < curve.length; i++) {
    steps.push({ day: curve[i].budget, gain: curve[i].totalDaysOff - curve[i - 1].totalDaysOff, total: curve[i].totalDaysOff })
  }
  if (steps.length === 0) return null

  const max = Math.max(...steps.map((s) => s.gain), 1)
  const summary = describe(steps)

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="returns-heading">
      <h2 id="returns-heading" className="text-lg font-bold">
        What each day of leave buys you
      </h2>
      <p className="hint mt-1 mb-4">{summary}</p>

      <div
        className="flex items-end gap-[2px] overflow-x-auto pb-1"
        style={{ height: 132 }}
        role="img"
        aria-label={`Bar chart. ${summary} The same numbers are in the table below.`}
      >
        {steps.map((s) => {
          const active = hover === s.day
          const used = s.day <= spent
          return (
            <button
              key={s.day}
              type="button"
              onMouseEnter={() => setHover(s.day)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(s.day)}
              onBlur={() => setHover(null)}
              aria-label={`Leave day ${s.day} adds ${s.gain} days off, for ${s.total} in total`}
              className="group relative flex min-w-[10px] flex-1 flex-col justify-end rounded-t transition-colors duration-150"
              style={{ height: '100%' }}
            >
              <span
                className="block w-full rounded-t"
                style={{
                  height: `${Math.max(3, (s.gain / max) * 100)}%`,
                  background: used ? 'var(--day-leave)' : 'var(--border-strong)',
                  opacity: active ? 1 : used ? 0.92 : 0.6,
                  // A day that is spent gets a solid bar, one that is not gets a
                  // hollow outline, so the two are not told apart by colour alone.
                  border: used ? 'none' : '1.5px dashed var(--muted-foreground)'
                }}
              />
              {active && (
                <span
                  className="tabular pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: 'var(--foreground)', color: 'var(--background)' }}
                >
                  +{s.gain}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="tabular mt-1 flex justify-between text-[11px] text-[var(--muted-foreground)]">
        <span>1st day</span>
        <span>{steps.length}th day</span>
      </div>

      <details className="mt-3">
        <summary className="text-sm font-semibold">See the numbers</summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="tabular w-full text-left text-sm" id={tableId}>
            <caption className="sr-only">Days off gained for each day of leave spent</caption>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th scope="col" className="py-1 pr-3 font-semibold">Leave day</th>
                <th scope="col" className="py-1 pr-3 font-semibold">Adds</th>
                <th scope="col" className="py-1 font-semibold">Total days off</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s) => (
                <tr key={s.day} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th scope="row" className="py-1 pr-3 font-normal">
                    {s.day}
                    {s.day > spent ? ' (not used)' : ''}
                  </th>
                  <td className="py-1 pr-3">+{s.gain}</td>
                  <td className="py-1">{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

/** Say the shape of the curve in a sentence, because most people want only that. */
function describe(steps) {
  if (steps.length === 0) return ''
  const first = steps[0].gain
  const last = steps[steps.length - 1].gain

  if (first === last) {
    return `Every day of leave buys you ${first} days off.`
  }

  // Where the return first drops below the opening rate for good.
  let cliff = steps.length
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].gain < first) {
      cliff = i
      break
    }
  }

  if (cliff === 0) return `Your first day buys ${first} days off, and later days buy ${last}.`
  if (cliff >= steps.length) return `Every day of leave buys you ${first} days off.`

  const opening = cliff === 1 ? 'Your first day' : `Your first ${cliff} days`
  const rest = steps.length - cliff === 1 ? 'the last one' : `the remaining ${steps.length - cliff}`
  return `${opening} buy ${first} days off each. After that ${rest} buy ${last} or fewer.`
}
