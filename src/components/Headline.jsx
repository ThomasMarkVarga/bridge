/**
 * The answer, in one sentence.
 *
 * It appears as soon as there is enough to compute it, and it is the first thing
 * after the three inputs, because it is the reason anybody came. The two numbers
 * that matter sit in marker-pen boxes and pop when they change, so a person
 * dragging the allowance up and down can watch the answer move.
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
      <div className="card p-5" style={{ background: 'var(--destructive)' }} role="status">
        <div className="flex items-start gap-3" style={{ color: 'var(--ink-fixed)' }}>
          <Icon name="warning" size={24} className="mt-0.5" />
          <div>
            <h2 className="text-xl">No plan fits</h2>
            <p className="mt-1 text-sm font-semibold">{plan.reason}</p>
          </div>
        </div>
      </div>
    )
  }

  // Nothing to spend yet. Saying "0 days off" is true and useless, so say what
  // they already have and what to do next instead.
  if (plan.leaveSpent === 0 && plan.breaks.length === 0) {
    const holidaysOff = plan.stats.holidayCount - plan.stats.holidaysOnNonWorkingDays
    return (
      <div className="card p-5 sm:p-7">
        <span className="pill pill-sun mb-3">Before you book a thing</span>
        <p className="text-2xl sm:text-3xl">
          You already have{' '}
          <span className="hl hl-lime tabular">{plan.stats.freeDays}</span> days off in {periodLabel}
        </p>
        <p className="mt-3 text-base font-semibold">
          That is every weekend, plus {plural(holidaysOff, 'public holiday', 'public holidays')} that
          {holidaysOff === 1 ? ' falls' : ' fall'} on a day you would have worked, in {countryLabel}.
        </p>
        <p className="hint mt-3">
          Put your leave allowance in the box above and Bridge will work out which days to book.
        </p>
      </div>
    )
  }

  const sentence = headlineSentence(plan)
  const ratio = ratioSentence(plan)

  return (
    <div className="card p-5 sm:p-7" style={{ opacity: busy ? 0.55 : 1, transition: 'opacity 160ms var(--ease)' }}>
      <span className="pill pill-pink mb-3">The answer</span>

      <p className="text-[1.75rem] leading-[1.1] sm:text-[2.75rem]">
        {/* Keyed on the value so React remounts the span and the pop replays. */}
        <span key={`spent-${plan.leaveSpent}`} className="anim-number hl tabular">
          {plan.leaveSpent}
        </span>{' '}
        {plan.leaveSpent === 1 ? 'leave day becomes' : 'leave days become'}{' '}
        <span key={`off-${plan.totalDaysOff}`} className="anim-number hl hl-lime tabular">
          {plan.totalDaysOff}
        </span>{' '}
        days off
      </p>

      <p className="mt-4 text-base font-semibold sm:text-lg">
        in {plural(plan.breaks.length, 'break', 'breaks')} across {periodLabel}, for {countryLabel}.
      </p>

      {ratio && (
        <p className="mt-5">
          <span className="stamp text-xl">
            {(plan.totalDaysOff / plan.leaveSpent).toFixed(1)}&times; your leave
          </span>
        </p>
      )}

      {plan.unusedBudget > 0 && (
        <p className="hint mt-3">
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
