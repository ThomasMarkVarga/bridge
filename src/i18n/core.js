/**
 * The translation lookup, and the one piece of state that says which language
 * the page is in.
 *
 * It is a module variable rather than something threaded through every call.
 * The alternative was passing a language down into the calendar export, the
 * share card drawing, the date formatter and everything that calls them, which
 * is a lot of plumbing for a value that is the same everywhere on the page and
 * changes only when somebody picks from a menu. React components still re-render
 * properly: the provider in index.jsx sets this and bumps a context value in the
 * same breath, so nothing reads a stale string.
 *
 * There is no i18n library here. The whole of what this app needs is a lookup, a
 * placeholder, and a plural rule, and a dependency for that would be bigger than
 * the thing it replaced.
 */
import { pluralForm } from './plural.js'
import en from './en.js'
import ro from './ro.js'

export const LANGUAGES = Object.freeze({
  en: { code: 'en', name: 'English', endonym: 'English', htmlLang: 'en', ogLocale: 'en_US' },
  ro: { code: 'ro', name: 'Romanian', endonym: 'Română', htmlLang: 'ro', ogLocale: 'ro_RO' }
})

export const DEFAULT_LANGUAGE = 'en'
export const LANGUAGE_CODES = Object.keys(LANGUAGES)

const DICTIONARIES = { en, ro }

let current = DEFAULT_LANGUAGE

export function getLanguage() {
  return current
}

export function isLanguage(code) {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, code)
}

/**
 * Switch the page's language. Also sets the lang attribute on the document,
 * which is not decoration: it is what tells a screen reader to change voice, and
 * what lets the browser hyphenate and quote correctly.
 */
export function setLanguage(code) {
  if (!isLanguage(code)) return current
  current = code
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', LANGUAGES[code].htmlLang)
  }
  return current
}

const PLACEHOLDER = /\{(\w+)\}/g

/** Substitute {name} placeholders. Anything not supplied is left alone. */
function fill(template, vars) {
  if (!vars) return template
  return template.replace(PLACEHOLDER, (whole, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole
  )
}

/**
 * Look a key up, in the current language, then in English, then give back the
 * key itself. A key on screen is ugly but it is honest and it is findable, which
 * beats an empty space where a sentence should be.
 */
export function lookup(key, lang = current) {
  const dict = DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANGUAGE]
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key]
  const fallback = DICTIONARIES[DEFAULT_LANGUAGE]
  if (Object.prototype.hasOwnProperty.call(fallback, key)) return fallback[key]
  return null
}

/**
 * A translated string.
 *
 * Pass `count` and the entry may be a set of plural forms, which are picked
 * between by the language's own rule rather than by asking whether the number
 * is 1.
 *
 *   t('breaks.count', { count: 3 })   en -> "3 breaks"    ro -> "3 vacanțe"
 *   t('breaks.count', { count: 21 })  en -> "21 breaks"   ro -> "21 de vacanțe"
 */
export function t(key, vars) {
  const entry = lookup(key)
  if (entry === null) return key
  if (typeof entry === 'string') return fill(entry, vars)
  const count = vars && typeof vars.count === 'number' ? vars.count : 0
  return fill(pluralForm(current, entry, count), vars)
}

/** Every key a dictionary defines, for the test that keeps them in step. */
export function keysOf(lang) {
  return Object.keys(DICTIONARIES[lang] || {})
}

export { DICTIONARIES }
