/**
 * The only server-side code in this application, and it does one thing.
 *
 * Cloudflare puts the visitor's country on every request it handles, worked out
 * from the address the connection came from. Reading it here means the page can
 * open in Romanian for somebody in Romania without asking a geolocation
 * service, without a second request, and without anybody's address being sent
 * anywhere: it arrives with the request that was already fetching the page, and
 * it is thrown away as soon as it has been turned into "ro" or "en".
 *
 * That is the whole reason this file exists rather than the alternative, which
 * would have been a fetch to an IP lookup API on first paint. This app tells
 * people nothing about them leaves their device and then counts its own
 * requests on screen to prove it. One call to a third party to decide which
 * language to say hello in would have made a liar of that counter.
 *
 * The rewriting itself lives in language-html.js, because the dev server has to
 * do exactly the same thing and one rule with two implementations is one rule
 * that will eventually disagree with itself.
 *
 * Everything else is still a static file. No routing, no rendering, no state.
 */
import { applyLanguage, isAppShell, pickLanguage, DEFAULT_LANGUAGE } from './language-html.js'

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)

    // Only the document is touched. The hashed bundles are immutable and are
    // left exactly as they are, which is most of what the site weighs.
    const type = response.headers.get('content-type') || ''
    if (!type.includes('text/html')) return response

    const lang = pickLanguage(request)
    if (lang === DEFAULT_LANGUAGE) return response

    /*
     * Only the app's own shell is translated. The build also writes a page per
     * country per year, and their text is English: stamping ro on one of those
     * would tell a screen reader to read English prose in a Romanian voice.
     *
     * They are told apart by looking for the block that gets swapped, rather
     * than by matching paths. The first version of this matched /countries/,
     * which is only the index; the pages themselves are at /romania/2026/ and
     * /united-states/virginia/2028/, so it skipped one page and caught the other
     * 935. A marker in the document cannot be wrong about what the document is.
     */
    const source = await response.text()
    if (!isAppShell(source)) return new Response(source, response)

    let fragment = null
    const asset = await env.ASSETS.fetch(new URL(`/seo.${lang}.html`, request.url))
    if (asset.ok) fragment = await asset.text()

    const html = applyLanguage(source, lang, fragment)

    const out = new Response(html, response)
    // Two visitors get two different documents from one URL, so an intermediary
    // must not hand one person's copy to the next. The document is a few
    // kilobytes and everything heavy on the page is separately cached, so this
    // costs almost nothing.
    out.headers.set('cache-control', 'no-store')
    out.headers.set('vary', 'accept-language')
    out.headers.set('content-language', lang)
    out.headers.delete('content-length')
    return out
  }
}

export { pickLanguage }
