import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pageData, renderPage, planFor, slugify, displayName, escapeHtml, REGION_COUNTRIES } from '../pages-lib.mjs'

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/data/holidays')
const load = (code) => JSON.parse(readFileSync(resolve(dataDir, `${code.toLowerCase()}.json`), 'utf8'))
const index = JSON.parse(readFileSync(resolve(dataDir, 'index.json'), 'utf8'))

describe('country pages', () => {
  it('agree with the worked example in the README', () => {
    const plan = planFor(load('RO'), 2026, null, 21)
    expect(plan.totalDaysOff).toBe(54)
    expect(plan.breaks).toHaveLength(6)
  })

  it('give every country, region and year its own path, with titles and descriptions that fit a results page', () => {
    const paths = new Set()
    for (const { code } of index.countries) {
      const data = load(code)
      const subs = REGION_COUNTRIES.includes(code) ? data.subdivisions.map((s) => s.code).filter((s) => s !== data.defaultSubdivision) : []
      for (const year of index.years) {
        for (const sub of [null, ...subs]) {
          const page = pageData(data, year, sub)
          expect(paths.has(page.path), page.path).toBe(false)
          paths.add(page.path)
          expect(page.title.length, page.title).toBeLessThanOrEqual(60)
          expect(page.description.length, page.description).toBeLessThanOrEqual(160)
          expect(page.path).toMatch(/^\/[a-z0-9-]+(\/[a-z0-9-]+)?\/\d{4}\/$/)
        }
      }
    }
    expect(paths.size).toBeGreaterThan(index.countries.length * index.years.length)
  })

  it('find the free Easter long weekend in England in 2027', () => {
    const page = pageData(load('GB'), 2027)
    expect(page.place).toBe('the United Kingdom (England)')
    expect(page.longWeekends.map((w) => `${w.from.date}..${w.to.date}`)).toContain('2027-03-26..2027-03-29')
  })

  it('list bridges that never overlap, each costing some leave', () => {
    const { bridges } = pageData(load('RO'), 2027)
    expect(bridges.length).toBeGreaterThan(0)
    for (let i = 1; i < bridges.length; i++) expect(bridges[i].from.index).toBeGreaterThan(bridges[i - 1].to.index)
    for (const b of bridges) expect(b.cost).toBeGreaterThan(0)
  })

  it('render one h1, parseable structured data and an FAQ that matches it word for word', () => {
    const page = pageData(load('US'), 2027)
    const html = renderPage(page, { appCss: '/assets/app.css', years: [], regions: [] })
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    expect(html).toContain(`<link rel="canonical" href="https://bridge-days.vibe-coding.fans${page.path}">`)
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
    const faq = ld['@graph'].find((n) => n['@type'] === 'FAQPage')
    const unescape = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    const visible = [...html.slice(html.indexOf('id="faq"')).matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].slice(0, 3).map((m) => [unescape(m[1]), unescape(m[2])])
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(visible)
    expect(html).not.toMatch(/[\u2013\u2014]/)
  })

  it('make safe slugs and escape text', () => {
    expect(slugify(displayName(load('AX')))).toMatch(/^[a-z0-9-]+$/)
    expect(slugify("Côte d'Ivoire")).toBe('cote-divoire')
    expect(escapeHtml('<a href="x">&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;')
  })
})
