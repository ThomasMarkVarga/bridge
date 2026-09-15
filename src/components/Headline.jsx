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
import { headlineSentence, ratioSentence, counted } from '../format.js'
import { useT, useTx } from '../i18n/index.jsx'

/**
 * @param {object} props
 * @param {import('../solver/solve.js').Plan} props.plan
 * @param {string} props.periodLabel
 * @param {string} props.countryLabel
 * @param {boolean} props.busy
 */
export default function Headline({ plan, periodLabel, countryLabel, busy }) {
  const { t } = useT()
  const tx = useTx()

  if (!plan) {
    return (
      <div className="card p-5">
        <p className="hint">{t('headline.pickFirst')}</p>
      </div>
    )
  }

  if (!plan.feasible) {
    return (
      <div className="card p-5" style={{ background: 'var(--destructive)' }} role="status">
        <div className="flex items-start gap-3" style={{ color: 'var(--ink-fixed)' }}>
          <Icon name="warning" size={24} className="mt-0.5" />
          <div>
            <h2 className="text-xl">{t('headline.noPlan')}</h2>
            <p className="mt-1 text-sm font-semibold">{plan.reason}</p>
          </div>
        </div>
      </div>
    )
  }

  // Nothing to spend yet. Saying "0 days off" is true and useless, so say what
  // they already have and what to do next instead.
  if (plan.leaveSpent === 0 && plan.breaks.length === 0) {
    const publicOff = plan.stats.publicHolidayCount - plan.stats.holidaysOnNonWorkingDays
    const birthdayOff = plan.stats.personalDays > 0
    return (
      <div className="card p-5 sm:p-7">
        <span className="pill pill-sun mb-3">{t('headline.beforeYouBook')}</span>
        <p className="text-2xl sm:text-3xl">
          {tx('headline.alreadyHave', {
            days: <span className="hl hl-lime tabular">{plan.stats.freeDays}</span>,
            daysOffNoun: t('units.daysOffNoun', { count: plan.stats.freeDays }),
            period: periodLabel
          })}
        </p>
        <p className="mt-3 text-base font-semibold">
          {t('headline.alreadyHaveDetail', {
            holidays: counted('publicHolidays', publicOff),
            falls: t('headline.falls', { count: publicOff }),
            country: countryLabel,
            birthday: birthdayOff ? t('headline.andYourBirthday') : ''
          })}
        </p>
        <p className="hint mt-3">{t('headline.putAllowance')}</p>
      </div>
    )
  }

  const sentence = headlineSentence(plan)
  const ratio = ratioSentence(plan)

  return (
    <div className="card p-5 sm:p-7" style={{ opacity: busy ? 0.55 : 1, transition: 'opacity 160ms var(--ease)' }}>
      <span className="pill pill-pink mb-3">{t('headline.answer')}</span>

      {/* The numbers are keyed on their own value, so React remounts each span
          and the pop replays when the answer moves. The sentence around them is
          one dictionary entry rather than fragments either side of a number:
          the pieces do not come in the same order in every language. */}
      <p className="text-[1.75rem] leading-[1.1] sm:text-[2.75rem]">
        {tx('headline.becomes', {
          count: plan.leaveSpent,
          spent: (
            <span key={`spent-${plan.leaveSpent}`} className="anim-number hl tabular">
              {plan.leaveSpent}
            </span>
          ),
          total: (
            <span key={`off-${plan.totalDaysOff}`} className="anim-number hl hl-lime tabular">
              {plan.totalDaysOff}
            </span>
          ),
          daysOffNoun: t('units.daysOffNoun', { count: plan.totalDaysOff })
        })}
      </p>

      <p className="mt-4 text-base font-semibold sm:text-lg">
        {t('headline.inBreaks', {
          breaks: counted('breaks', plan.breaks.length),
          period: periodLabel,
          country: countryLabel
        })}
      </p>

      {ratio && (
        <p className="mt-5">
          <span className="stamp text-xl">
            {t('headline.ratio', { ratio: (plan.totalDaysOff / plan.leaveSpent).toFixed(1) })}
          </span>
        </p>
      )}

      {plan.unusedBudget > 0 && (
        <p className="hint mt-3">{t('headline.leftOver', { count: plan.unusedBudget })}</p>
      )}

      {plan.stats.givenBack > 0 && (
        <p className="hint mt-2">
          {t('headline.givenBack', { days: counted('extraDays', plan.stats.givenBack) })}
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
