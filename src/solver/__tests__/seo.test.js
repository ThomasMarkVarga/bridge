/**
 * The search basics in index.html, which nobody sees break until rankings do.
 *
 * The FAQ structured data must say exactly what the visible FAQ says, or search
 * engines treat it as spam, and the two live in different places in the file.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8')
const text = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) =>
  JSON.parse(m[1])
)

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
    const section = html.match(/<section id="faq"[\s\S]*?<\/section>/)[0]
    const visible = [...section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => [
      text(m[1]),
      text(m[2])
    ])
    expect(visible.length).toBeGreaterThanOrEqual(6)
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(visible)
  })

  it('leaves the one h1 to the app, outside the no-script message', () => {
    expect(html.replace(/<noscript>[\s\S]*?<\/noscript>/, '')).not.toMatch(/<h1/)
  })
})
