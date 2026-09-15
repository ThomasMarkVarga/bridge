/**
 * Translating the half of the page that is not the app.
 *
 * The how-to, the bridge day explainer, the coverage note and the FAQ are prose
 * in index.html rather than markup in the app, so a crawler and a reader with
 * JavaScript switched off both get them. The server sends that prose in the
 * right language already.
 *
 * But the language can change after the page has loaded, because there is a
 * switch in the header and somebody Romanian reading this from an airport in
 * Vienna is going to use it. React cannot re-render those sections: they are not
 * its. So the block is replaced here instead.
 *
 * The copy that arrived is kept rather than re-fetched, so switching back is
 * free and the common case of a reader flicking between the two costs one
 * request in total. That request is to this origin, for a file that ships with
 * the app, exactly like the holiday dates: nothing is told to anybody else.
 */
const CONTAINER = 'seo'

/** The language the document was served in, read before anything changes it. */
export const SERVED_LANGUAGE =
  typeof document === 'undefined' ? 'en' : document.documentElement.getAttribute('lang') || 'en'

const cache = new Map()

function container() {
  return typeof document === 'undefined' ? null : document.getElementById(CONTAINER)
}

// Whatever the server sent, kept so switching back needs no request at all.
const served = container()?.innerHTML ?? null
if (served !== null) cache.set(SERVED_LANGUAGE, served)

/*
 * The language the block is showing right now, which is not the same question as
 * the language it arrived in. Comparing against the served language instead sent
 * a reader who switched to Romanian and back again to an English interface with
 * the Romanian prose still under it, because going back looked like no change.
 */
let shown = SERVED_LANGUAGE

/**
 * Put the static block into `lang`, fetching the prose for it once.
 *
 * Anything that goes wrong leaves the page as it is. A section in the wrong
 * language is a much smaller problem than a section that has been emptied.
 */
export async function translateStaticPage(lang) {
  const el = container()
  if (!el || served === null) return false
  if (shown === lang) return true

  if (cache.has(lang)) {
    el.innerHTML = cache.get(lang)
    shown = lang
    return true
  }

  try {
    const response = await fetch(`/seo.${lang}.html`, { credentials: 'omit' })
    if (!response.ok) return false
    const html = await response.text()
    cache.set(lang, html)
    // Checked again rather than assumed: the reader may have switched twice
    // while this was in flight, and the last one they chose is the one to show.
    if (document.documentElement.getAttribute('lang') !== lang) return false
    el.innerHTML = html
    shown = lang
    return true
  } catch {
    return false
  }
}
