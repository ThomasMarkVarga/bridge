/**
 * Month and weekday names, per language.
 *
 * Written out rather than asked of Intl.DateTimeFormat, for the same reason the
 * rest of this app does its own calendar arithmetic: Intl wants a Date, a Date
 * carries a timezone, and a timezone is how a plan that says 1 June ends up
 * drawn on 31 May for somebody in Auckland. These are twenty-four words per
 * language and they never change.
 *
 * Romanian month names are lower case. That is not a slip: unlike English,
 * Romanian does not capitalise months or weekdays mid-sentence, and capitalising
 * them is one of the tells of a page that has been run through a translator.
 */
export const CALENDAR_NAMES = {
  en: {
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    weekdaysInitial: ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  },
  ro: {
    months: [
      'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
      'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'
    ],
    monthsShort: ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'],
    weekdays: ['luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică'],
    weekdaysShort: ['lun', 'mar', 'mie', 'joi', 'vin', 'sâm', 'dum'],
    weekdaysInitial: ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  }
}

/**
 * Country names in the reader's language, from the browser rather than from a
 * table in this repository. Two hundred and six names per language is a lot of
 * bytes to ship for something every browser already knows, and a table would go
 * stale the next time a country renames itself.
 */
export function countryNamer(lang) {
  try {
    const names = new Intl.DisplayNames([lang], { type: 'region' })
    return (code, fallback) => {
      try {
        return names.of(code) || fallback
      } catch {
        return fallback
      }
    }
  } catch {
    // No Intl.DisplayNames. The English names that ship with the data are still
    // a country name, which beats a blank picker.
    return (code, fallback) => fallback
  }
}
