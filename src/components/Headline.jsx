/**
 * The answer, in one sentence.
 *
 * It appears as soon as there is enough to compute it, and it is the first thing
 * on the page after the three inputs, because it is the reason anybody came.
 *
 * The live region announces the sentence rather than every number on the page, and
 * only when the sentence actually changes, so a screen reader is not read a fresh
 * paragraph every time a slider moves.
 */
import Icon from './Icon.jsx'
import { headlineSentence, ratioSentence, plural } from '../format.js'

/**
 * @param {object} props
 * @param {import('../solver/solve.js').Plan} props.plan
 * @param {string} props.periodLabel
 * @param {string} props.countryLabel
 * @param {boolean} props.busy
 */
export default function Headline({ plan, periodLabel, countryLabel, busy }) {
  if (!plan) {
    return (
      <div className="card p-5">
        <p className="hint">Pick a country and how many days you have.</p>
      </div>
    )
  }

  if (!plan.feasible) {
    return (
      <div
        className="card flex items-start gap-3 p-5"
        style={{ borderColor: 'var(--destructive)' }}
        role="status"
      >
        <Icon name="warning" size={22} className="mt-0.5" style={{ color: 'var(--destructive)' }} />
        <div>
          <h2 className="text-base font-bold">No plan fits</h2>
          <p className="mt-1 text-sm">{plan.reason}</p>
        </div>
      </div>
    )
  }

  const sentence = headlineSentence(plan)
  const ratio = ratioSentence(plan)

  return (
    <div className="card p-5 sm:p-6" style={{ opacity: busy ? 0.6 : 1, transition: 'opacity 160ms ease' }}>
      <p className="text-2xl font-extrabold leading-tight sm:text-4xl">
        <span className="tabular" style={{ color: 'var(--day-leave)' }}>
          {plan.leaveSpent}
        </span>{' '}
        {plan.leaveSpent === 1 ? 'leave day becomes' : 'leave days become'}{' '}
        <span className="tabular" style={{ color: 'var(--day-leave)' }}>
          {plan.totalDaysOff}
        </span>{' '}
        days off
      </p>
      <p className="mt-1 text-base sm:text-lg">
        in {plural(plan.breaks.length, 'break', 'breaks')} across {periodLabel}, for {countryLabel}.
      </p>
      {ratio && <p className="hint mt-2">That is {ratio}.</p>}

      {plan.unusedBudget > 0 && (
        <p className="mt-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {plural(plan.unusedBudget, 'day', 'days')} of your allowance {plan.unusedBudget === 1 ? 'is' : 'are'} left
          over. There is nowhere left worth spending {plan.unusedBudget === 1 ? 'it' : 'them'} under these settings.
        </p>
      )}

      {plan.stats.givenBack > 0 && (
        <p className="hint mt-2">
          Includes {plural(plan.stats.givenBack, 'extra day', 'extra days')} for holidays that fall on a day you do not
          work. Check that your contract actually gives those back.
        </p>
      )}

      {/* Announced on change, and nowhere near as chatty as the page itself. */}
      <p className="sr-only" role="status" aria-live="polite">
        {sentence}
        {ratio ? `. ${ratio}.` : '.'}
      </p>
    </div>
  )
}
