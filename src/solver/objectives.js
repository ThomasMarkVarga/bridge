/**
 * The three things someone might actually want from their leave.
 *
 * All three run the same exact solver underneath. They differ only in which
 * windows are allowed into the candidate set, and whether one long window is
 * required.
 */

/** Spread the leave to get the most days off in total. The usual answer. */
export const TOTAL = 'total'
/** Put as much as possible into one long trip, then use what is left sensibly. */
export const LONGEST = 'longest'
/** Several breaks, none of them too short to be worth taking. */
export const SPREAD = 'spread'

export const OBJECTIVES = [TOTAL, LONGEST, SPREAD]

/**
 * The default is SPREAD, not TOTAL, and this is a deliberate departure from the
 * brief. Worth explaining, because it is the one place the arithmetic and the
 * product disagree.
 *
 * Maximising total days off is exactly what TOTAL does, and it is provably
 * optimal. But the way to maximise it is to book isolated Fridays: one day of
 * leave buys a three-day weekend, a ratio of 3.0, which beats every holiday
 * bridge. For Romania 2026 with 21 days it returns 74 days off across 21 breaks,
 * fourteen of which are indistinguishable long weekends in January and February.
 * It is the right answer to the question as posed and the wrong answer for someone
 * planning a year.
 *
 * SPREAD with a floor of 5 days returns 54 days off in 6 breaks, which is the
 * shape the brief itself describes in its example headline. TOTAL remains
 * available and honestly labelled, because some people do want the long weekends.
 */
export const DEFAULT_OBJECTIVE = SPREAD

/** Shortest break worth booking under the "several proper breaks" objective. */
export const DEFAULT_MIN_BREAK_LENGTH = 5

/**
 * For "one long break", the long stretch must still be reasonable value.
 *
 * Without this, maximising the longest window simply spends the entire allowance
 * on one unbroken block of bought days: 21 days of leave becomes a 35-day January
 * with no holidays in it, at a ratio of 1.67, and there is no leftover leave for
 * the "spend the rest afterwards" half of the idea. Requiring the long break to
 * return at least this many days per day booked keeps it anchored on actual
 * holidays.
 */
export const DEFAULT_LONG_BREAK_MIN_LEVERAGE = 1.8

/**
 * Wording for the interface. Never says "optimise" or "efficiency": these are
 * choices about a holiday, not settings on a machine.
 */
export const OBJECTIVE_LABELS = {
  [SPREAD]: {
    name: 'Several proper breaks',
    hint: 'Real holidays rather than a string of long weekends.'
  },
  [LONGEST]: {
    name: 'One long trip',
    hint: 'Puts most of your leave into a single stretch.'
  },
  [TOTAL]: {
    name: 'Most days off, any length',
    hint: 'The highest total, mostly by turning Fridays into long weekends.'
  }
}

/** @param {string} objective */
export function isObjective(objective) {
  return OBJECTIVES.includes(objective)
}

/**
 * How window enumeration should be constrained for an objective.
 * @param {string} objective
 * @param {{minBreakLength?: number}} opts
 */
export function windowConstraints(objective, opts = {}) {
  if (objective === SPREAD) {
    const k = Number.isFinite(opts.minBreakLength) ? opts.minBreakLength : DEFAULT_MIN_BREAK_LENGTH
    return { minBreakLength: Math.max(1, Math.floor(k)) }
  }
  return {}
}
