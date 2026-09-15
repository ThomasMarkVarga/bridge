/**
 * The rule that decides which language a visitor is greeted in, and the rewrite
 * that puts the document into it.
 *
 * Both run where they are awkward to look at, and both fail quietly: somebody in
 * Bucharest gets English prose under a Romanian interface, shrugs, and never
 * mentions it. The rewrite is the same function the dev server uses, so this
 * covers localhost and the edge at once.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { applyLanguage, isAppShell, pickLanguage } from '../language-html.js'

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const fragment = readFileSync(new URL('../../public/seo.ro.html', import.meta.url), 'utf8')

const req = (country, url = 'https://bridge-days.vibe-coding.fans/') => ({
  url,
  cf: country ? { country } : undefined
})
const count = (source, pattern) => (source.match(pattern) || []).length

describe('picking a language at the edge', () => {
  it('shows Romanian to Romania and Moldova', () => {
    expect(pickLanguage(req('RO'))).toBe('ro')
    expect(pickLanguage(req('MD'))).toBe('ro')
  })

  it('shows English to everybody else', () => {
    for (const country of ['GB', 'US', 'DE', 'FR', 'HU', 'BG', 'RS']) {
      expect(pickLanguage(req(country)), country).toBe('en')
    }
  })

  it('falls back to English when the country is unknown', () => {
    // Cloudflare leaves cf.country off for some requests, and a missing country
    // must not read as a match.
    expect(pickLanguage(req(null))).toBe('en')
    expect(pickLanguage({ url: 'https://example.com/', cf: {} })).toBe('en')
  })

  it('lets an explicit lang override the guess, in both directions', () => {
    expect(pickLanguage(req('RO', 'https://x/?lang=en'))).toBe('en')
    expect(pickLanguage(req('GB', 'https://x/?lang=ro'))).toBe('ro')
  })

  it('ignores a language it does not have', () => {
    expect(pickLanguage(req('GB', 'https://x/?lang=fr'))).toBe('en')
    expect(pickLanguage(req('RO', 'https://x/?lang=../../etc'))).toBe('ro')
  })
})

describe('rewriting the document into Romanian', () => {
  const ro = applyLanguage(html, 'ro', fragment)

  it('sets the language on the document itself', () => {
    expect(ro).toMatch(/<html[^>]*lang="ro"/)
    expect(ro).not.toMatch(/<html[^>]*lang="en"/)
  })

  it('replaces the English prose rather than adding to it', () => {
    expect(ro).toContain('Întrebări frecvente')
    expect(ro).not.toContain('Frequently asked questions')
    expect(ro).not.toContain('How to maximize your vacation days')
    expect(ro).toContain('Cum să profiți la maximum')
  })

  it('leaves exactly one FAQ in the structured data', () => {
    expect(count(ro, /"@type":\s*"FAQPage"/g)).toBe(1)
    expect(count(ro, /application\/ld\+json/g)).toBe(2)
    expect(ro).not.toContain('id="faq-schema"')
    expect(ro).toContain('"inLanguage": "ro"')
  })

  it('leaves the parts of the page the app owns alone', () => {
    expect(ro).toContain('id="root"')
    expect(ro).toContain('id="site-footer"')
    expect(ro).toContain('src="/src/main.jsx"')
    expect(ro).toContain('<noscript>')
  })

  it('closes the swapped block where it found it, so the page is still whole', () => {
    // A miscounted closing div would swallow the footer slot or the script tag.
    const openDivs = count(ro, /<div\b/g)
    const closeDivs = count(ro, /<\/div>/g)
    expect(openDivs).toBe(closeDivs)
  })

  it('changes nothing but the language attribute for English', () => {
    const en = applyLanguage(html, 'en', fragment)
    expect(en).toBe(html)
  })

  it('still sets the language when there is no translated prose to swap in', () => {
    const partial = applyLanguage(html, 'ro', null)
    expect(partial).toMatch(/<html[^>]*lang="ro"/)
    // Better an English paragraph than a page that claims to be English while
    // the interface around it is not.
    expect(partial).toContain('Frequently asked questions')
  })
})

describe('telling the app apart from the generated country pages', () => {
  /*
   * The build writes a page per country per year. They are English, and they do
   * not live where their index does: the index is /countries/, the pages are
   * /romania/2026/ and /united-states/virginia/2028/. A guard that matched the
   * index caught one page in 936 and stamped Romanian on the rest.
   */
  // The real artefact when there is one, so this is checked against what is
  // actually served. A clean checkout has no dist/, and a test that needs a
  // build to have run first is a test that fails for the wrong reason, so it
  // falls back to a document of the same shape: English, and no swap marker.
  let generated
  try {
    generated = readFileSync(new URL('../../dist/romania/2026/index.html', import.meta.url), 'utf8')
  } catch {
    generated = '<!doctype html><html lang="en"><body><h1>Romania Public Holidays 2026</h1></body></html>'
  }

  it('recognises the app shell', () => {
    expect(isAppShell(html)).toBe(true)
  })

  it('does not mistake a generated country page for it', () => {
    expect(isAppShell(generated)).toBe(false)
  })

  it('leaves a generated page in the language it was written in', () => {
    // Guarded by isAppShell in the Worker, so this is the belt to that braces:
    // even asked directly, the rewrite must not claim an English page is Romanian.
    expect(generated).toMatch(/<html[^>]*lang="en"/)
    expect(isAppShell(generated) ? applyLanguage(generated, 'ro', fragment) : generated).toMatch(
      /<html[^>]*lang="en"/
    )
  })
})
