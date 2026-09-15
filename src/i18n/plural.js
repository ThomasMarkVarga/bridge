/**
 * Plural categories, because Romanian does not have two of them.
 *
 * English picks between one and other. Romanian has a third, and getting it
 * wrong is the most obvious way for a translated page to read as machine
 * output: 1 zi, 2 zile, 19 zile, but 20 de zile, with a preposition appearing
 * out of nowhere. 101 goes back to zile, 120 takes de again.
 *
 * The browser already knows all of that, for every language, so this asks it
 * rather than keeping a copy of the CLDR rules that would only ever drift.
 * Node knows it too, which is what the build scripts and the tests use.
 */

const cache = new Map()

const rules = (lang) => {
  let r = cache.get(lang)
  if (!r) {
    r = new Intl.PluralRules(lang)
    cache.set(lang, r)
  }
  return r
}

/**
 * The category a count falls into for a language.
 * @returns {'zero'|'one'|'two'|'few'|'many'|'other'}
 */
export function pluralCategory(lang, n) {
  return rules(lang).select(n)
}

/**
 * Pick the wording for a count out of a set of forms.
 *
 * Falling back to `other` rather than throwing is deliberate: a missing form
 * should read a little wrong in one sentence, not take the page down.
 */
export function pluralForm(lang, forms, n) {
  return forms[pluralCategory(lang, n)] ?? forms.other ?? forms.one ?? ''
}
