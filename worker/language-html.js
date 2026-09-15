/**
 * Putting a document into a language, in one place.
 *
 * The static half of the page is prose in index.html rather than markup in the
 * app, so a crawler and a reader with JavaScript switched off both get it. That
 * means translating it is a text substitution on the document, and it has to
 * happen before the document is sent.
 *
 * This is plain string work rather than Cloudflare's HTMLRewriter for one
 * reason: the dev server has to do exactly the same thing. An edge-only
 * implementation meant the feature was invisible on localhost, so the page
 * rendered a Romanian interface wrapped around English prose and stayed that
 * way until somebody deployed it. Two implementations of the same rule would
 * have drifted, so there is one, it is pure, and it runs in both places.
 *
 * The document is a few tens of kilobytes, so buffering it costs nothing worth
 * measuring against the certainty of the two behaving the same.
 */

/** Countries whose visitors are shown Romanian unless they say otherwise. */
export const ROMANIAN_SPEAKING = new Set(['RO', 'MD'])
export const SUPPORTED = new Set(['en', 'ro'])
export const DEFAULT_LANGUAGE = 'en'

/**
 * The language for a request.
 *
 * An explicit ?lang= wins, which is what makes a link shareable and what lets a
 * crawler reach both versions. Otherwise it is the country the connection came
 * from, which Cloudflare has already worked out and attached to the request.
 */
export function pickLanguage(request) {
  let asked = null
  try {
    asked = new URL(request.url).searchParams.get('lang')
  } catch {
    asked = null
  }
  if (SUPPORTED.has(asked)) return asked
  return ROMANIAN_SPEAKING.has(request.cf?.country) ? 'ro' : DEFAULT_LANGUAGE
}

/** The whole of <div id="seo"> ... </div>, matched by counting nested divs. */
function seoBlock(html) {
  const open = html.indexOf('<div id="seo">')
  if (open === -1) return null
  let i = open + '<div id="seo">'.length
  let depth = 1
  const tag = /<(\/?)div\b/g
  tag.lastIndex = i
  let m
  while ((m = tag.exec(html)) !== null) {
    depth += m[1] ? -1 : 1
    if (depth === 0) {
      const close = html.indexOf('>', m.index)
      return { start: open + '<div id="seo">'.length, end: m.index, blockEnd: close + 1 }
    }
  }
  return null
}

/**
 * Rewrite a document into `lang`.
 *
 * `fragment` is the translated static block, and is only needed for a language
 * that is not the one index.html is written in. Given nothing to swap in, this
 * still sets the lang attribute, because a Romanian interface in a document
 * claiming to be English is worse than either on its own: it is what a screen
 * reader believes.
 *
 * @param {string} html the document as authored, in English
 * @param {string} lang
 * @param {string|null} fragment contents of public/seo.<lang>.html
 */
export function applyLanguage(html, lang, fragment = null) {
  let out = html.replace(/<html([^>]*)\slang="[^"]*"/, `<html$1 lang="${lang}"`)
  if (lang === DEFAULT_LANGUAGE || !fragment) return out

  // The English FAQ structured data goes with the English prose. Two FAQPage
  // blocks on one page is how the markup gets ignored altogether, and the
  // translated fragment brings its own.
  out = out.replace(/\s*<script id="faq-schema"[\s\S]*?<\/script>/, '')

  const at = seoBlock(out)
  if (!at) return out
  return out.slice(0, at.start) + '\n' + fragment + '\n' + out.slice(at.end)
}
