/**
 * The search basics in index.html, which nobody sees break until rankings do.
 *
 * The FAQ structured data must say exactly what the visible FAQ says, or search
 * engines treat it as spam, and the two live in different places in the file.
 *
 * The same rule applies to the Romanian half of the static page, which is
 * swapped in at the edge and so never passes through the English checks.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8')
const ro = readFileSync(new URL('../../../public/seo.ro.html', import.meta.url), 'utf8')

const text = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const jsonLd = [...html.matchAll(/<script[^>]*type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) =>
  JSON.parse(m[1])
)

/** Every question and answer a page shows, in the order it shows them. */
function visibleFaq(source) {
  const section = source.match(/<section id="faq"[\s\S]*?<\/section>/)[0]
  return [...section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => [
    text(m[1]),
    text(m[2])
  ])
}

describe('index.html for search', () => {
  it('has a title and description of a sensible length', () => {
    const title = text(html.match(/<title>([\s\S]*?)<\/title>/)[1])
    const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)[1]
    expect(title.length).toBeGreaterThanOrEqual(50)
    expect(title.length).toBeLessThanOrEqual(60)
    expect(description.length).toBeGreaterThanOrEqual(140)
    expect(description.length).toBeLessThanOrEqual(155)
  })

  it('has structured data that parses, including an FAQ', () => {
    expect(jsonLd.map((b) => b['@type'])).toEqual(['WebApplication', 'FAQPage'])
  })

  it('has an FAQ in structured data that matches the visible FAQ word for word', () => {
    const faq = jsonLd.find((b) => b['@type'] === 'FAQPage')
    const visible = visibleFaq(html)
    expect(visible.length).toBeGreaterThanOrEqual(6)
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(visible)
  })

  it('leaves the one h1 to the app, outside the no-script message', () => {
    expect(html.replace(/<noscript>[\s\S]*?<\/noscript>/, '')).not.toMatch(/<h1/)
  })

  it('keeps the block the Worker swaps, and the id it takes the English schema out by', () => {
    expect(html).toMatch(/<div id="seo">/)
    expect(html).toMatch(/<script id="faq-schema"/)
  })
})

describe('the Romanian static page', () => {
  it('carries the same sections as the English original', () => {
    for (const id of ['how-it-works', 'bridge-days', 'coverage', 'faq']) {
      expect(ro, 'missing section ' + id).toContain('id="' + id + '"')
    }
  })

  it('answers the same questions, in the same order', () => {
    expect(visibleFaq(ro).length).toBe(visibleFaq(html).length)
  })

  it('has structured data that matches its own visible FAQ word for word', () => {
    const faq = JSON.parse(ro.match(/<script[^>]*type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.inLanguage).toBe('ro')
    const visible = visibleFaq(ro)
    expect(visible.length).toBeGreaterThanOrEqual(6)
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(visible)
  })

  it('is actually in Romanian, not a copy of the English', () => {
    expect(ro).toMatch(/zile de concediu/)
    expect(ro).not.toContain('Frequently asked questions')
  })

  it('uses comma-below s and t, not the cedilla lookalikes', () => {
    // U+015E/U+015F and U+0162/U+0163 are the Turkish cedilla letters that older
    // Windows codepages used for Romanian. They look almost identical on screen.
    expect(ro).not.toMatch(/[ŞşŢţ]/)
  })
})
