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
  const current = steps.find((s) => s.day === hover) || null

  return (
    <section className="card anim-pop p-4 sm:p-5" style={{ '--i': 3 }} aria-labelledby="returns-heading">
      <span className="pill pill-sun mb-2">Nobody else shows you this</span>
      <h2 id="returns-heading" className="text-2xl">
        What each day of leave buys you
      </h2>
      <p className="hint mt-1">{summary}</p>

      {/*
       * A readout above the chart rather than a bubble floating over a bar. The
       * bars scroll sideways, and a scroll container clips anything poking out of
       * its top, so the tallest bar's label was being cut in half. This also works
       * on a touch screen, where there is no hover to reveal anything.
       */}
      <p
        className="tabular mb-3 mt-2 min-h-6 text-sm font-extrabold"
        style={{ color: current ? 'var(--stamp)' : 'var(--muted-foreground)' }}
        aria-hidden="true"
      >
        {current
          ? `Leave day ${current.day} adds ${current.gain} ${current.gain === 1 ? 'day' : 'days'} off, ${current.total} in total`
          : 'Point at a bar for the exact numbers.'}
      </p>

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
                className="anim-col block w-full rounded-t-md border-[2px]"
                style={{
                  '--i': s.day,
                  height: `${Math.max(4, (s.gain / max) * 100)}%`,
                  // A day that is spent is filled in, one that is not is left
                  // hollow, so the two are never told apart by colour alone.
                  background: used ? (active ? 'var(--coral)' : 'var(--sun)') : 'transparent',
                  borderColor: 'var(--line)',
                  borderStyle: used ? 'solid' : 'dashed'
                }}
              />
            </button>
          )
        })}
      </div>

      <div className="tabular mt-1 flex justify-between text-[11px] text-[var(--muted-foreground)]">
        <span>1st day</span>
        <span>{steps.length}th day</span>
      </div>

      <details className="mt-3">
        <summary className="text-sm font-extrabold">See the numbers</summary>
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

  const plural = (n) => `${n} ${n === 1 ? 'day' : 'days'}`
  if (first === last) {
    return `Every day of leave buys you ${plural(first)} off.`
  }

  // Where the return first drops below the opening rate for good.
  let cliff = steps.length
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].gain < first) {
      cliff = i
      break
    }
  }

  if (cliff === 0) return `Your first day buys ${plural(first)} off, and later days buy ${plural(last)}.`
  if (cliff >= steps.length) return `Every day of leave buys you ${plural(first)} off.`

  const days = (n) => `${n} ${n === 1 ? 'day' : 'days'}`
  const opening =
    cliff === 1
      ? `Your first day buys ${days(first)} off.`
      : `Your first ${cliff} days buy ${days(first)} off each.`
  const remaining = steps.length - cliff
  const rest =
    remaining === 1
      ? `The last one buys ${days(last)} or fewer.`
      : `After that the remaining ${remaining} buy ${days(last)} or fewer.`
  return `${opening} ${rest}`
}
