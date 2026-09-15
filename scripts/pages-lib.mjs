/**
 * Static pages for search: one page per country, and per region for the countries
 * people search by region, for every year the holiday data covers.
 *
 * Everything here is a pure function over the committed holiday JSON and the same
 * solver the app uses, so it runs in Node at build time and in the tests. Nothing
 * reaches the browser except the HTML it returns. Every number on a page comes
 * from the solver, never from copy written by hand.
 */
import { buildCalendar, selectHolidays, holidaysLostToWeekends } from '../src/solver/calendar.js'
import { enumerateWindows } from '../src/solver/windows.js'
import { solve } from '../src/solver/solve.js'

export const SITE = 'https://bridge-days.vibe-coding.fans'
/** The allowance a page plans for. Close to the common statutory minimum in Europe. */
export const PLAN_DAYS = 20
export const CURVE_DAYS = [5, 10, 15, 20, 25]
/** Countries whose regions get their own pages, because their holidays and searches differ by region. */
export const REGION_COUNTRIES = ['AU', 'CA', 'DE', 'ES', 'GB', 'US']

/** Shorter, familiar names for titles, where the data carries the long official one. */
const DISPLAY = {
  BD: 'Bangladesh',
  CD: 'DR Congo',
  CI: "Côte d'Ivoire",
  GQ: 'Equatorial Guinea',
  KN: 'Saint Kitts and Nevis',
  PM: 'Saint Pierre and Miquelon',
  US: 'United States',
  VC: 'Saint Vincent and the Grenadines'
}

/** Countries whose English name takes "the" inside a sentence: "public holidays in the United Kingdom". */
const THE = new Set(['AE', 'BS', 'CD', 'CF', 'CZ', 'DO', 'GB', 'GM', 'KM', 'MV', 'NL', 'PH', 'US', 'VA'])

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TITLE_MAX = 60
const DESCRIPTION_MAX = 160

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const displayName = (data) => DISPLAY[data.country] ?? data.countryName.replace(/\s*&\s*/g, ' and ')

const pretty = (day) => {
  const [, m, d] = day.date.split('-').map(Number)
  return `${DOW[day.dayOfWeek]} ${d} ${MONTHS[m - 1]}`
}

/** "a", "a and b", "a, b and c" */
const joinList = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)

const firstFitting = (candidates, max) => candidates.find((c) => c.length <= max) ?? candidates.at(-1)

function calendarFor(data, year, sub) {
  const holidays = selectHolidays(data.years[String(year)] || [], sub)
  const calendar = buildCalendar({ range: { start: `${year}-01-01`, end: `${year}-12-31` }, holidays })
  return { holidays, calendar }
}

/** The solver's plan for one allowance. Used by the tests to hold pages to the README's worked example. */
export function planFor(data, year, sub, budget) {
  return solve(calendarFor(data, year, sub ?? data.defaultSubdivision ?? null).calendar, { budget })
}

/** Runs of three or more days off that need no leave at all and contain a public holiday. */
export function freeLongWeekends(calendar) {
  const out = []
  let start = -1
  for (let i = 0; i <= calendar.length; i++) {
    const day = calendar[i]
    if (day && day.isFree) {
      if (start < 0) start = i
      continue
    }
    if (start >= 0 && i - start >= 3) {
      const days = calendar.slice(start, i)
      const names = [...new Set(days.filter((d) => d.holidayName).map((d) => d.holidayNameEn || d.holidayName))]
      if (names.length) out.push({ from: days[0], to: days.at(-1), length: days.length, names })
    }
    start = -1
  }
  return out
}

/**
 * The best short bookings: breaks costing one to three days that join a weekday
 * public holiday to a weekend, ranked by days off per day booked and never
 * overlapping each other.
 */
export function bestBridges(calendar, limit = 8) {
  const ranked = enumerateWindows(calendar, { budget: 3 })
    .filter((w) => w.cost >= 1 && calendar.slice(w.start, w.end + 1).some((d) => d.holidayName && !d.weekend))
    .sort((a, b) => b.length / b.cost - a.length / a.cost || b.length - a.length || a.start - b.start)
  const picked = []
  for (const w of ranked) {
    if (picked.length === limit) break
    if (picked.every((p) => w.end < p.start || w.start > p.end)) picked.push(w)
  }
  return picked
    .sort((a, b) => a.start - b.start)
    .map((w) => {
      const days = calendar.slice(w.start, w.end + 1)
      return {
        from: calendar[w.start],
        to: calendar[w.end],
        length: w.length,
        cost: w.cost,
        book: w.leaveIdx.map((i) => calendar[i]),
        names: [...new Set(days.filter((d) => d.holidayName && !d.weekend).map((d) => d.holidayNameEn || d.holidayName))]
      }
    })
}

/**
 * Everything one page says, computed. `subCode` is set only for a region's own page;
 * a country page for a country that needs a region uses the data's default region.
 */
export function pageData(data, year, subCode = null) {
  const regionPage = Boolean(subCode) && subCode !== data.defaultSubdivision
  const sub = subCode ?? data.defaultSubdivision ?? null
  const subName = sub ? (data.subdivisions.find((s) => s.code === sub)?.name ?? sub) : null
  const country = displayName(data)
  const countrySlug = slugify(country)
  const the = !regionPage && (THE.has(data.country) || /Islands$/.test(country)) ? 'the ' : ''
  const place = regionPage ? `${subName}, ${country}` : `${the}${sub ? `${country} (${subName})` : country}`
  const placeCap = place.charAt(0).toUpperCase() + place.slice(1)
  const short = regionPage ? subName : country

  const { holidays, calendar } = calendarFor(data, year, sub)
  const byDate = new Map(calendar.map((d) => [d.date, d]))
  const lost = new Set(holidaysLostToWeekends(calendar).map((d) => d.date))
  const seen = new Set()
  const list = holidays
    .filter((h) => byDate.has(h.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((h) => {
      const key = `${h.date}|${h.nameEn || h.name}`
      return seen.has(key) ? false : seen.add(key)
    })
    .map((h) => ({
      date: h.date,
      day: pretty(byDate.get(h.date)),
      name: h.nameEn || h.name,
      local: h.nameEn && h.name && h.name !== h.nameEn ? h.name : null,
      onWeekend: lost.has(h.date)
    }))
  const holidayDates = new Set(list.map((h) => h.date))
  const weekendCount = [...holidayDates].filter((d) => lost.has(d)).length

  const full = solve(calendar, { budget: Math.max(...CURVE_DAYS) })
  const plan = solve(calendar, { budget: PLAN_DAYS })
  const curve = CURVE_DAYS.map((b) => ({ budget: b, daysOff: full.curve[b]?.totalDaysOff ?? 0 }))
  const longWeekends = freeLongWeekends(calendar)
  const bridges = bestBridges(calendar)

  const path = regionPage ? `/${countrySlug}/${slugify(subName)}/${year}/` : `/${countrySlug}/${year}/`
  const appLink = `/#c=${data.country}&d=${PLAN_DAYS}&y=${year}${sub ? `&r=${encodeURIComponent(sub)}` : ''}`
  const count = holidayDates.size

  const title = firstFitting(
    [
      `${short} Public Holidays ${year}: Best Days to Take Off | BridgeDays`,
      `${short} Public Holidays ${year}: Best Days to Take Off`,
      `${short} Holidays ${year}: Best Days to Take Off`,
      `${short} Holidays ${year}: Best Days Off`,
      `${short} ${year}: Holidays and Best Days Off`,
      `${short} ${year} Holidays`
    ],
    TITLE_MAX
  )
  const daysOff20 = curve.find((c) => c.budget === PLAN_DAYS).daysOff
  const description = firstFitting(
    [
      `${count} public holidays in ${place} in ${year}. Book ${PLAN_DAYS} days of leave, get ${daysOff20} days off: see the long weekends, bridge days and exact dates to book.`,
      `${count} public holidays in ${short} in ${year}. Book ${PLAN_DAYS} days of leave, get ${daysOff20} days off: long weekends, bridge days and dates to book.`,
      `${count} public holidays in ${short} in ${year}. ${PLAN_DAYS} days of leave can become ${daysOff20} days off. See the bridge days to book.`
    ],
    DESCRIPTION_MAX
  )

  const top = bridges.slice().sort((a, b) => b.length / b.cost - a.length / a.cost || a.from.index - b.from.index)[0]
  const faq = [
    {
      q: `How many public holidays does ${place} have in ${year}?`,
      a: `${placeCap} has ${count} public holiday${count === 1 ? '' : 's'} in ${year}${weekendCount ? `, and ${weekendCount} of them fall${weekendCount === 1 ? 's' : ''} on a weekend` : ''}.`
    },
    {
      q: `When are the long weekends in ${place} in ${year}?`,
      a: longWeekends.length
        ? `Without booking any leave: ${joinList(longWeekends.map((w) => `${pretty(w.from)} to ${pretty(w.to)} (${w.names.join(', ')})`))}.`
        : `No public holiday in ${place} joins a weekend on its own in ${year}, so the long weekends come from booking a bridge day.`
    },
    {
      q: `What are the best days to take off in ${place} in ${year}?`,
      a: top
        ? `Book ${joinList(top.book.map(pretty))} to get ${top.length} days off, from ${pretty(top.from)} to ${pretty(top.to)}. With ${PLAN_DAYS} days of leave, the best plan gives ${plan.totalDaysOff} days off across ${plan.breaks.length} breaks.`
        : `With ${PLAN_DAYS} days of leave, the best plan gives ${plan.totalDaysOff} days off across ${plan.breaks.length} breaks.`
    }
  ]

  return {
    code: data.country,
    sub,
    subName,
    regionPage,
    country,
    countrySlug,
    place,
    short,
    year,
    path,
    url: SITE + path,
    appLink,
    title,
    description,
    verified: Boolean(data.verified),
    notes: data.notes || [],
    holidays: list,
    weekendCount,
    longWeekends,
    bridges,
    curve,
    plan: {
      totalDaysOff: plan.totalDaysOff,
      leaveSpent: plan.leaveSpent,
      breaks: plan.breaks.map((b) => ({
        from: pretty(byDate.get(b.start)),
        to: pretty(byDate.get(b.end)),
        length: b.length,
        cost: b.cost,
        book: b.leaveDates.map((d) => pretty(byDate.get(d)))
      }))
    },
    faq
  }
}

const head = ({ title, description, url, appCss, jsonLd }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#faf5ec">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="${appCss}">
<link rel="stylesheet" href="/pages.css">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_US">
<meta property="og:site_name" content="BridgeDays">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${SITE}/og.png">
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c')}
</script>
</head>`

const top = (appLink) => `<a class="pg-skip" href="#main">Skip to content</a>
<header class="pg-top">
  <a class="pg-brand" href="/"><img src="/favicon.svg" alt="" width="28" height="28">BridgeDays</a>
  <nav class="pg-nav" aria-label="Site">
    <a href="/countries/">All countries</a>
    <a class="pg-btn pg-btn-sm" href="${escapeHtml(appLink)}">Plan your leave</a>
  </nav>
</header>`

const foot = `<footer class="pg-foot">
  <a class="vcf-home" href="https://vibe-coding.fans/"><svg viewBox="0 0 66 66" width="30" height="30" aria-hidden="true"><rect x="6" y="6" width="58" height="58" rx="16" fill="#0B0B0F"/><rect x="2" y="2" width="54" height="54" rx="14" fill="#FF4FA3" stroke="#0B0B0F" stroke-width="4"/><path d="M26 18 13 29l13 11M33 18h7.5a5.5 5.5 0 0 1 0 11H36m4.5 0a5.5 5.5 0 0 1 0 11H33" fill="none" stroke="#0B0B0F" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>More free apps on <b>vibe-coding.fans</b></span></a>
  <p>Holiday dates from <a href="https://github.com/commenthol/date-holidays">date-holidays</a> (MIT), built into the page. BridgeDays runs in your browser: no account, no tracking.</p>
</footer>`

const breadcrumb = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url }))
})

/**
 * @param {ReturnType<typeof pageData>} p
 * @param {{appCss: string, years: {year: number, path: string}[], regions: {name: string, path: string}[]}} ctx
 */
export function renderPage(p, { appCss, years = [], regions = [] }) {
  const crumbs = [
    { name: 'BridgeDays', url: `${SITE}/` },
    { name: 'Countries', url: `${SITE}/countries/` },
    ...(p.regionPage ? [{ name: p.country, url: `${SITE}/${p.countrySlug}/${p.year}/` }] : []),
    { name: `${p.short} ${p.year}`, url: p.url }
  ]
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumb(crumbs),
      {
        '@type': 'FAQPage',
        mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
      }
    ]
  }
  const e = escapeHtml
  const holidayRows = p.holidays
    .map(
      (h) =>
        `<tr${h.onWeekend ? ' class="is-weekend"' : ''}><td>${e(h.day)}</td><td>${e(h.name)}${h.local ? ` <span class="pg-local">${e(h.local)}</span>` : ''}</td><td>${h.onWeekend ? 'Weekend' : 'Day off'}</td></tr>`
    )
    .join('\n')
  const longWeekends = p.longWeekends.length
    ? `<ul class="pg-list">${p.longWeekends
        .map((w) => `<li><strong>${e(pretty(w.from))} to ${e(pretty(w.to))}</strong>, ${w.length} days: ${e(w.names.join(', '))}</li>`)
        .join('')}</ul>`
    : `<p>No public holiday joins a weekend on its own this year, so every long weekend starts with a bridge day below.</p>`
  const bridges = p.bridges.length
    ? `<ol class="pg-list">${p.bridges
        .map(
          (b) =>
            `<li><strong>Book ${e(joinList(b.book.map(pretty)))}</strong> (${b.cost} day${b.cost === 1 ? '' : 's'}) for ${b.length} days off, ${e(pretty(b.from))} to ${e(pretty(b.to))}${b.names.length ? `, around ${e(b.names.join(', '))}` : ''}.</li>`
        )
        .join('')}</ol>`
    : `<p>No weekday public holiday sits close enough to a weekend for a short bridge this year.</p>`
  const curveRows = p.curve
    .map((c) => `<tr><td>${c.budget} days</td><td>${c.daysOff} days</td><td>${c.budget ? (c.daysOff / c.budget).toFixed(1) : '0'}x</td></tr>`)
    .join('')
  const planBreaks = p.plan.breaks
    .map((b) => `<li><strong>${e(b.from)} to ${e(b.to)}</strong>: ${b.length} days off for ${b.cost} booked (${e(b.book.join(', '))})</li>`)
    .join('')
  const regionNote = p.sub && !p.regionPage ? `<p>Dates for ${e(p.subName)}. Other regions can differ.</p>` : ''
  const verified = p.verified
    ? `<p>These dates have been checked by hand against ${e(p.country)}'s official calendar.</p>`
    : `<p>These dates come from the date-holidays library and have not been checked by hand against ${e(p.country)}'s official calendar. Check before you book.</p>`
  const notes = p.notes.map((n) => `<p>${e(n)}</p>`).join('')
  const yearLinks = years.map((y) => (y.year === p.year ? `<span aria-current="page">${y.year}</span>` : `<a href="${y.path}">${y.year}</a>`)).join(' ')
  const regionLinks = regions.length
    ? `<p><span class="pg-label">Regions</span> ${regions.map((r) => `<a href="${r.path}">${e(r.name)}</a>`).join(' · ')}</p>`
    : ''

  return `${head({ title: p.title, description: p.description, url: p.url, appCss, jsonLd })}
<body class="pg">
${top(p.appLink)}
<main id="main" class="pg-main">
  <nav class="pg-crumbs" aria-label="Breadcrumb"><a href="/">BridgeDays</a> / <a href="/countries/">Countries</a>${p.regionPage ? ` / <a href="/${p.countrySlug}/${p.year}/">${e(p.country)}</a>` : ''} / <span>${e(p.short)} ${p.year}</span></nav>
  <h1>Best days to take off in ${e(p.place)} in ${p.year}</h1>
  <p class="pg-lead">With ${PLAN_DAYS} days of annual leave, booking the right days gives <strong>${p.plan.totalDaysOff} days off</strong> across ${p.plan.breaks.length} breaks. Below are all ${p.holidays.length} public holidays in ${e(p.place)} in ${p.year}, the long weekends you get for free, and the bridge days worth booking.</p>
  <p><a class="pg-btn" href="${e(p.appLink)}">Plan your own dates for ${e(p.short)}</a></p>

  <section class="pg-card" aria-labelledby="holidays">
    <h2 id="holidays">Public holidays in ${e(p.place)} in ${p.year}</h2>
    <div class="pg-table-wrap"><table><thead><tr><th scope="col">Date</th><th scope="col">Holiday</th><th scope="col">Falls on</th></tr></thead><tbody>
${holidayRows}
    </tbody></table></div>
    ${p.weekendCount ? `<p>${p.weekendCount} of these fall on a weekend in ${p.year}.</p>` : ''}
    ${regionNote}
  </section>

  <section class="pg-card" aria-labelledby="long-weekends">
    <h2 id="long-weekends">Long weekends in ${e(p.place)} in ${p.year}</h2>
    ${longWeekends}
  </section>

  <section class="pg-card" aria-labelledby="bridges">
    <h2 id="bridges">Best bridge days to book in ${p.year}</h2>
    <p>A bridge day is a working day between a public holiday and a weekend. Booking it joins them into one long break.</p>
    ${bridges}
  </section>

  <section class="pg-card" aria-labelledby="curve">
    <h2 id="curve">How many days off can you get in ${p.year}?</h2>
    <div class="pg-table-wrap"><table><thead><tr><th scope="col">Leave booked</th><th scope="col">Days off</th><th scope="col">Per day booked</th></tr></thead><tbody>${curveRows}</tbody></table></div>
  </section>

  <section class="pg-card" aria-labelledby="plan">
    <h2 id="plan">A plan for ${PLAN_DAYS} days of leave in ${p.year}</h2>
    <p>${p.plan.leaveSpent} days of leave become ${p.plan.totalDaysOff} days off, in ${p.plan.breaks.length} breaks of at least five days.</p>
    <ol class="pg-list">${planBreaks}</ol>
    <p><a class="pg-btn" href="${e(p.appLink)}">Open this plan and change it</a></p>
  </section>

  <section class="pg-card" aria-labelledby="faq">
    <h2 id="faq">Questions about ${p.year} in ${e(p.short)}</h2>
${p.faq.map((f) => `    <h3>${e(f.q)}</h3>\n    <p>${e(f.a)}</p>`).join('\n')}
  </section>

  <section class="pg-note" aria-labelledby="about-data">
    <h2 id="about-data">About these dates</h2>
    ${verified}
    ${notes}
  </section>

  <nav class="pg-more" aria-label="More">
    <p><span class="pg-label">Years</span> ${yearLinks}</p>
    ${regionLinks}
    <p><a href="/countries/">All countries</a></p>
  </nav>
</main>
${foot}
</body>
</html>
`
}

/**
 * @param {{name: string, years: {year: number, path: string}[], regions: {name: string, years: {year: number, path: string}[]}[]}[]} countries
 */
export function renderIndex(countries, { appCss, years }) {
  const title = `Public Holidays and Best Days to Take Off, by Country`
  const description = `Public holidays, long weekends and the best bridge days to book for ${countries.length} countries in ${joinList(years.map(String))}.`
  const url = `${SITE}/countries/`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [breadcrumb([{ name: 'BridgeDays', url: `${SITE}/` }, { name: 'Countries', url }])]
  }
  const e = escapeHtml
  const items = countries
    .map((c) => {
      const regions = c.regions.length
        ? `<details class="pg-regions"><summary>Regions</summary><ul>${c.regions
            .map((r) => `<li>${e(r.name)}: ${r.years.map((y) => `<a href="${y.path}">${y.year}</a>`).join(' ')}</li>`)
            .join('')}</ul></details>`
        : ''
      return `<li><span class="pg-country">${e(c.name)}</span> ${c.years.map((y) => `<a href="${y.path}" aria-label="${e(c.name)} ${y.year}">${y.year}</a>`).join(' ')}${regions}</li>`
    })
    .join('\n')
  const appLink = '/'
  return `${head({ title, description, url, appCss, jsonLd })}
<body class="pg">
${top(appLink)}
<main id="main" class="pg-main">
  <nav class="pg-crumbs" aria-label="Breadcrumb"><a href="/">BridgeDays</a> / <span>Countries</span></nav>
  <h1>Public holidays and the best days to take off, by country</h1>
  <p class="pg-lead">Pick a country and a year to see every public holiday, the long weekends you get for free, and which days of leave to book for the longest breaks.</p>
  <ul class="pg-countries">
${items}
  </ul>
</main>
${foot}
</body>
</html>
`
}
