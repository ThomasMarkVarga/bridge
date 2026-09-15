#!/usr/bin/env node
/**
 * Write the static country pages into dist/ after `vite build`.
 *
 * One page per country per year, plus one per region for the countries in
 * REGION_COUNTRIES, an index at /countries/, and a sitemap listing all of them.
 * The pages reuse the app's built stylesheet, so they carry the same fonts and
 * colours, plus a small pages.css of their own. They are plain HTML with no
 * script, which is what makes them readable by crawlers that never run one.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pageData, renderPage, renderIndex, displayName, slugify, SITE, REGION_COUNTRIES } from './pages-lib.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const dataDir = join(root, 'src/data/holidays')

const built = readFileSync(join(dist, 'index.html'), 'utf8')
const appCss = built.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"/)?.[1]
if (!appCss) throw new Error('Could not find the app stylesheet in dist/index.html. Run `vite build` first.')

const index = JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8'))
const years = index.years
const lastmod = String(index.generatedAt || '').slice(0, 10)

const write = (path, html) => {
  const file = join(dist, path, 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html, 'utf8')
}

const urls = []
const countries = []
const seen = new Set()

for (const entry of index.countries) {
  const data = JSON.parse(readFileSync(join(dataDir, `${entry.code.toLowerCase()}.json`), 'utf8'))
  const name = displayName(data)
  const countrySlug = slugify(name)
  const yearLinks = years.map((year) => ({ year, path: `/${countrySlug}/${year}/` }))

  const regionCodes = REGION_COUNTRIES.includes(data.country)
    ? data.subdivisions.map((s) => s.code).filter((code) => code !== data.defaultSubdivision)
    : []
  const regions = regionCodes.map((code) => {
    const regionName = data.subdivisions.find((s) => s.code === code).name
    return { code, name: regionName, years: years.map((year) => ({ year, path: `/${countrySlug}/${slugify(regionName)}/${year}/` })) }
  })

  for (const year of years) {
    const page = pageData(data, year)
    if (seen.has(page.path)) throw new Error(`Two pages want ${page.path}`)
    seen.add(page.path)
    write(page.path, renderPage(page, { appCss, years: yearLinks, regions: regions.map((r) => ({ name: r.name, path: r.years.find((y) => y.year === year).path })) }))
    urls.push(page.url)
  }

  for (const region of regions) {
    for (const year of years) {
      const page = pageData(data, year, region.code)
      if (seen.has(page.path)) throw new Error(`Two pages want ${page.path}`)
      seen.add(page.path)
      write(page.path, renderPage(page, { appCss, years: region.years, regions: [] }))
      urls.push(page.url)
    }
  }

  countries.push({ name, years: yearLinks, regions })
}

countries.sort((a, b) => a.name.localeCompare(b.name, 'en'))
write('countries', renderIndex(countries, { appCss, years }))

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[`${SITE}/`, `${SITE}/countries/`, ...urls].map((u) => `  <url><loc>${u}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`
writeFileSync(join(dist, 'sitemap.xml'), sitemap, 'utf8')

console.log(`country pages: ${urls.length} pages for ${countries.length} countries and ${years.join(', ')}, plus /countries/ and sitemap.xml`)
