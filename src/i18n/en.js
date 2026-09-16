/**
 * The English wording. This file is the original, and ro.js answers to it.
 *
 * Keys are flat and dotted so a string on screen can be found by grepping for
 * the words in it. Entries that vary with a number are an object of plural forms
 * rather than a sentence with an "s" glued on the end.
 *
 * Two habits here exist only because of Romanian, and both are worth keeping:
 *
 * A number and the noun after it are never split into separate strings. English
 * tolerates "{n}" + " days off" as two pieces; Romanian does not, because 1, 3
 * and 21 take three different forms of the noun and the preposition "de" appears
 * out of nowhere at 20. So the noun travels with its count, either as a whole
 * phrase (units.daysOff) or as a bare agreeing noun (units.daysOffNoun) when the
 * number itself has to sit inside markup.
 *
 * Sentences that contain two counts take their pieces pre-built rather than
 * pluralising on one of them and hoping the other agrees. A test keeps this file
 * and ro.js in step.
 */
export default {
  'lang.name': 'English',
  'lang.switch': 'Language',
  'lang.pick': 'Choose a language',

  'meta.title': 'BridgeDays · Work out which days to book',
  'meta.description':
    'Pick your country and how many days of leave you have. BridgeDays works out which days to book so they join up with weekends and public holidays into the longest possible stretches off. Runs entirely in your browser.',

  'a11y.skipToAnswer': 'Skip to the answer',

  'header.tagline': 'Take {days} days off. Get {off}.',
  'header.themeSwitch': 'Switch to the {theme} theme',
  'header.themeDark': 'Dark',
  'header.themeLight': 'Light',
  'header.themeDarkName': 'dark',
  'header.themeLightName': 'light',

  'claims.label': 'What this app does not do',
  'claims.noSignup': 'No sign-up',
  'claims.offline': 'Works offline',
  'claims.nothingLeaves': 'Nothing leaves your device',
  'claims.free': 'Free to use',
  'claims.noCookies': 'No cookies',
  'claims.noTracking': 'No tracking',

  'controls.country': 'Country',
  'controls.days': 'Days of leave',
  'controls.year': 'Year',
  'controls.region': 'Region',
  'controls.optional': '(optional)',
  'controls.wholeCountry': 'The whole country',
  'controls.regionMatters': 'Holidays genuinely differ here, so this changes the answer.',
  'controls.moreOptions': 'More options',
  'controls.workDays': 'Which days do you work?',
  'controls.noWorkDays': 'You have no working days selected, so there is nothing to book.',
  'controls.workDaysCount': {
    one: '{count} working day a week.',
    other: '{count} working days a week.'
  },
  'controls.objective': 'What are you after?',
  'controls.minBreak': 'Shortest break worth booking: {days}',
  'controls.minBreakHint': 'Anything shorter than this is left out of the plan.',
  'controls.maxBreaks': 'Most separate breaks (optional)',
  'controls.maxBreaksPlaceholder': 'No limit',
  'controls.maxBreaksHint': 'Useful if your employer only lets you book a few times a year.',
  'controls.leaveYear': 'Leave year',
  'controls.starts': 'Starts',
  'controls.ends': 'Ends',
  'controls.useCalendarYear': 'Use the whole calendar year instead',
  'controls.customLeaveYear': 'My leave year does not start in January',
  'controls.birthday': 'Your birthday',
  'controls.birthdayOff': 'My employer gives me my birthday off',
  'controls.birthdayOffHint':
    'It becomes a free day like a public holiday, so the plan can build a break around it.',
  'controls.birthdayWhich': 'Which day is it?',
  'controls.month': 'Month',
  'controls.day': 'Day',

  // The dropdowns themselves: what an empty one says, and the search box inside a long list.
  'picker.choose': 'Choose',
  'picker.search': 'Search: {label}',
  'picker.searchPlaceholder': 'Type to search',
  'picker.empty': 'Nothing matches “{query}”.',
  'controls.birthdayMonthLabel': 'Month of your birthday',
  'controls.birthdayDayLabel': 'Day of your birthday',
  'controls.birthdayPick': 'Pick a month and a day. It counts as a day off every year.',
  'controls.birthdayNoYear':
    'No year is asked for or stored, so a link you share cannot say how old you are.',
  'controls.birthdayLeapDay':
    'The 29th only comes round every fourth year. BridgeDays uses the 28th in the others, which may not be what your employer does.',
  'controls.givenBack': 'My employer gives a day back when a holiday falls on a weekend',
  'controls.givenBackHint':
    'Adds one day to your allowance for each one. Check your contract, because many employers do not do this.',
  'controls.observances': 'Count observances as days off too',
  'controls.observancesHint': "Days like Mother's Day that are marked but are not usually a day off work.",

  'objective.spread.name': 'Several proper breaks',
  'objective.spread.hint': 'Real holidays rather than a string of long weekends.',
  'objective.longest.name': 'One long trip',
  'objective.longest.hint': 'Puts most of your leave into a single stretch.',
  'objective.total.name': 'Most days off, any length',
  'objective.total.hint': 'The highest total, mostly by turning Fridays into long weekends.',

  'headline.pickFirst': 'Pick a country and how many days you have.',
  'headline.noPlan': 'No plan fits',
  'headline.beforeYouBook': 'Before you book a thing',
  'headline.alreadyHave': 'You already have {days} {daysOffNoun} in {period}',
  'headline.alreadyHaveDetail':
    'That is every weekend, plus {holidays} that {falls} on a day you would have worked, in {country}{birthday}.',
  'headline.falls': { one: 'falls', other: 'fall' },
  'headline.andYourBirthday': ', and your birthday',
  'headline.putAllowance':
    'Put your leave allowance in the box above and BridgeDays will work out which days to book.',
  'headline.answer': 'The answer',
  'headline.becomes': {
    one: '{spent} leave day becomes {total} {daysOffNoun}',
    other: '{spent} leave days become {total} {daysOffNoun}'
  },
  'headline.inBreaks': 'in {breaks} across {period}, for {country}.',
  'headline.ratio': '{ratio}× your leave',
  'headline.sentence': {
    one: '{leave} becomes {off}, in {breaks}',
    other: '{leave} become {off}, in {breaks}'
  },
  'headline.ratioSentence': '{ratio} days off for every day you book',
  'headline.leftOver': {
    one: '{count} day of your allowance is left over. There is nowhere left worth spending it under these settings.',
    other: '{count} days of your allowance are left over. There is nowhere left worth spending them under these settings.'
  },
  'headline.givenBack':
    'Includes {days} for holidays that fall on a day you do not work. Check that your contract actually gives those back.',

  'changed.dropped': 'The plan dropped {days}.',
  'changed.movedAndDropped': 'The plan moved {added} and dropped {removed}.',
  'meta.titlePlan': '{spent} become {total} · {period} · BridgeDays',

  'error.holidaysHeading': 'The holiday dates would not load',
  'error.tryAgain': 'Try again',
  'error.missingYears':
    'There are no holiday dates yet for {years}. Those days are counted as ordinary working days, so the plan will be conservative.',
  'error.yearsJoin': ' and ',

  'breaks.daysOffFor': '{daysOff} for {cost} booked.',
  'breaks.perDay': ' That is {ratio} days off for every day you book.',
  'breaks.daysToRequest': 'Days to request',
  'breaks.pinnedHere': {
    one: '{count} day here you fixed yourself.',
    other: '{count} days here you fixed yourself.'
  },
  'breaks.copy': 'Copy the dates',
  'breaks.copied': 'Copied',
  'breaks.addToCalendar': 'Add to calendar',

  'request.pill': 'Paste this into your leave request',
  'request.heading': 'Days to request',
  'request.inPeriod': '{days} in {period}',
  'request.listLabel': 'Every day to book, in order',
  'request.copyReadable': 'Copy the dates',
  'request.copyIso': 'Copy as 2026-06-02',
  'request.copied': 'Copied',
  'request.hint': 'Paste either into your leave request. The second format is the one most HR systems expect.',

  'year.pill': 'The whole year',
  'year.heading': '{period} at a glance',
  'year.clearChanges': 'Clear my {changes}',
  'year.tapHint':
    'Tap any working day to fix it into the plan or rule it out. The plan works itself out again around whatever you choose.',
  'year.movedNote': '{note} The days that moved are outlined below.',
  'year.whatMarksMean': 'What the marks mean',
  'year.prevMonth': 'Show the month before',
  'year.nextMonth': 'Show the month after',
  'year.weekByWeek': '{month}, week by week',
  'year.wholeRange': 'The whole range',
  'year.monthBar': '{month} {year}, {daysOff} days off, {booked} booked',
  'year.fadedHint':
    'Days either side of {month} are shown faded, so a break that runs over the turn of the month stays in one piece.',
  'year.movedHere': {
    one: 'One day that moved is in ',
    other: '{count} of the days that moved are in '
  },
  'year.listAnd': ' and ',
  'year.outsideMonth': '{label}, outside this month',

  'daymenu.options': 'Options for {date}',
  'daymenu.alreadyOff': 'You already have this day off.',
  'daymenu.pin': 'Always take this day off',
  'daymenu.unpin': 'Stop fixing this day',
  'daymenu.blackout': 'Never take this day off',
  'daymenu.unblackout': 'Allow this day again',

  'day.blackedOut': 'blacked out, will not be booked',
  'day.pinned': 'pinned, you fixed this day',
  'day.toBook': 'a day to book',
  'day.personalOff': 'a day off, {name}',
  'day.publicHoliday': 'public holiday, {name}',
  'day.notWorking': 'not a working day',
  'day.insideBreak': 'inside a break',
  'day.normalWorking': 'a normal working day',

  'legend.leave': 'A day to book',
  'legend.break': 'Inside a break',
  'legend.holiday': 'Public holiday',
  'legend.weekend': 'Not a working day',
  'legend.pinned': 'You fixed it',
  'legend.blackout': 'You ruled it out',

  'curve.pill': 'Nobody else shows you this',
  'curve.heading': 'What each day of leave buys you',
  'curve.pointAtBar': 'Point at a bar for the exact numbers.',
  'curve.readout': 'Leave day {day} adds {gain}, {total} in total',
  'curve.chartLabel': 'Bar chart. {summary} The same numbers are in the table below.',
  'curve.barLabel': 'Leave day {day} adds {gain}, for {total} in total',
  'curve.firstDay': '1st day',
  'curve.lastDay': 'day {count}',
  'curve.seeNumbers': 'See the numbers',
  'curve.tableCaption': 'Days off gained for each day of leave spent',
  'curve.colLeaveDay': 'Leave day',
  'curve.colAdds': 'Adds',
  'curve.colTotal': 'Total days off',
  'curve.notUsed': ' (not used)',
  'curve.everyDayBuys': 'Every day of leave buys you {days}.',
  'curve.firstThenLater': 'Your first day buys {first}, and later days buy {last}.',
  'curve.firstDayBuys': 'Your first day buys {days}.',
  'curve.firstDaysBuyEach': 'Your first {span} buy {days} each.',
  'curve.lastOneBuys': 'The last one buys {days} or fewer.',
  'curve.afterThatRemaining': 'After that the remaining {span} buy {days} or fewer.',

  'share.pill': 'Yours to keep',
  'share.heading': 'Take it with you',
  'share.hint':
    'Everything here is made on your device. Nothing is uploaded, and the link works because the whole plan is written into it.',
  'share.copyLink': 'Copy the link',
  'share.addBreaks': 'Add breaks to my calendar',
  'share.addEach': 'Add each day separately',
  'share.makePicture': 'Make a picture',
  'share.hidePicture': 'Hide the picture',
  'share.savePicture': 'Save the picture',
  'share.copyPicture': 'Copy the picture',
  'share.copyPost': 'Copy text for a post',
  'share.linkCopied': 'Link copied. It carries the whole plan.',
  'share.copyBlocked': 'Your browser would not let the page copy. Copy the address bar instead.',
  'share.textCopied': 'Text copied.',
  'share.copyBlockedText': 'Your browser would not let the page copy that.',
  'share.icsBreaksSaved': 'Calendar file saved, one event per break.',
  'share.icsDaysSaved': 'Calendar file saved, one event per booked day.',
  'share.pictureSaved': 'Picture saved.',
  'share.pictureCopied': 'Picture copied.',

  'verify.pill': 'Do not take our word for it',
  'verify.heading': 'Check it yourself',
  'verify.hint': 'You should not take our word for any of this. Here is how to confirm it.',
  'verify.offSiteLabel': 'Requests to anywhere else',
  'verify.countedLive': {
    one: 'Counted live in this page. {count} request in total, all of them to this site, for the page itself and the holiday dates.',
    other: 'Counted live in this page. {count} requests in total, all of them to this site, for the page itself and the holiday dates.'
  },
  'verify.howToCheck':
    "To check: open your browser's developer tools, go to the Network tab and reload. Nothing should point anywhere but this domain.",
  'verify.worksOffline': 'Works without a connection',
  'verify.online': 'You are online',
  'verify.offline': 'You are offline, and it still works',
  'verify.offlineHint':
    'Turn off your wifi and reload this page. The plan still works out, because the calculation and the holiday dates are both already on your device.',
  'verify.howItWorks': 'How it works',
  'verify.how1': 'The whole calculation runs in this page, on your device.',
  'verify.how2': 'Holiday dates ship with the app as plain files. Nothing is looked up.',
  'verify.how3':
    'Your plan lives in the address bar. That is why the link reproduces it, and why we never need to store anything.',
  'verify.how4': 'There is no account, no analytics, no cookie and no tracking. There is nothing to consent to.',
  'verify.how5':
    'The only thing that can be saved on this device is your country and allowance, and only if you tick the box to ask for it.',
  'verify.how6':
    'The language was picked at the edge from the country your connection comes from, on the same request that fetched this page. No location service was asked, and your address was not sent anywhere.',
  'verify.limits': 'What this cannot do',
  'verify.limit1':
    'Holiday dates can be wrong or change. Governments move them, and some are announced only weeks ahead. Check anything that matters against an official calendar.',
  'verify.limit2':
    'Your employer has rules this knows nothing about: notice periods, blackout seasons, how many people can be off at once, whether you can carry days over.',
  'verify.limit3': 'Some contracts count public holidays against your allowance. This assumes they do not.',
  'verify.limit4': 'Your colleagues want the same weeks you do, and somebody has to ask first.',
  'verify.limit5': 'This does arithmetic, not negotiation.',
  'verify.countryNotes': 'Worth knowing about {country}',
  'verify.source': 'Holiday dates come from {link}, generated on {date}. {report}.',
  'verify.reportDate': 'Report a wrong date',

  'remember.label': 'Remember my country and allowance on this device',
  'remember.hint':
    'Off unless you ask. It saves those two things in this browser and nothing else: no plan, no dates, nothing that leaves the device.',

  'footer.moreApps': 'More free apps on {brand}',
  'footer.holidaysByCountry': 'Public holidays by country',
  'footer.licence':
    'BridgeDays is free and open source under the MIT licence. Holiday dates come from the {link} project and ship with the app.',
  'footer.source': 'Read the source',
  'footer.reportDate': 'Report a wrong date',
  'footer.contract': 'Check your own contract before you book anything.',

  'showcase.label': 'Our other apps',
  'showcase.close': 'Close',
  'showcase.show': 'Show {title}, {n} of {total}',

  'ics.calendarName': 'Time off',
  'ics.leaveCalendarName': 'Leave days',
  'ics.singleBreakName': 'Time off, {date}',
  'ics.breakSummary': 'Time off, {days}',
  'ics.breakDescription': '{off}, using {leave}.',
  'ics.perDay': 'That is {ratio} days off for every day booked.',
  'ics.daysToRequest': 'Days to request:',
  'ics.plannedWith': 'Planned with BridgeDays. Check the dates against your own calendar before booking.',
  'ics.annualLeave': 'Annual leave',
  'ics.annualLeaveDescription': 'One day of annual leave. Planned with BridgeDays.',

  'card.perDayBooked': 'DAYS OFF PER DAY BOOKED',
  'card.daysYouBook': 'days you book',
  'card.daysUnlocked': 'days they unlock',
  'card.longest': 'Longest: {range}, {days} for {cost} booked',
  'card.tagline': 'Work out which days to book. Nothing leaves your device.',
  'card.fromLeave': 'from {leave}, in {breaks}',
  'card.imageFailed': 'The image could not be created.',
  'card.copyUnsupported': 'This browser will not let a page copy an image. Use Save image instead.',
  'card.shareLine1': {
    one: '{leave} becomes {off} in {period}.',
    other: '{leave} become {off} in {period}.'
  },
  'card.shareLine2': 'That is {ratio} days off for every day I book.',
  'card.shareBest': 'The best one: {range}, {off} for {cost} booked.',
  'card.shareFooter': 'Worked out with BridgeDays for {country}.',
  'card.alt':
    '{leave} become {off} in {period}, for {country}, across {breaks}, which is {ratio} days off for every day booked. A bar for each month shows how many days off it holds, split into the days you book and the weekends and holidays they unlock.',

  'units.days': { one: '{count} day', other: '{count} days' },
  'units.daysOff': { one: '{count} day off', other: '{count} days off' },
  'units.leaveDays': { one: '{count} leave day', other: '{count} leave days' },
  'units.breaks': { one: '{count} break', other: '{count} breaks' },
  'units.changes': { one: '{count} change', other: '{count} changes' },
  'units.extraDays': { one: '{count} extra day', other: '{count} extra days' },
  'units.publicHolidays': { one: '{count} public holiday', other: '{count} public holidays' },

  'units.dayNoun': { one: 'day', other: 'days' },
  'units.daysOffNoun': { one: 'day off', other: 'days off' },

  'format.rangeSeparator': 'to'
}
