/**
 * The React side of translation: a provider, a hook, and a way to put a piece of
 * markup in the middle of a sentence without cutting the sentence in half.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getLanguage, setLanguage, t as translate, lookup, LANGUAGES, LANGUAGE_CODES } from './core.js'
import { detectLanguage, rememberLanguage } from './detect.js'
import { translateStaticPage } from './staticPage.js'
import { pluralForm } from './plural.js'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => setLanguage(detectLanguage()))

  const change = useCallback((code) => {
    if (!LANGUAGE_CODES.includes(code)) return
    setLanguage(code)
    rememberLanguage(code)
    setLangState(code)
  }, [])

  /*
   * The static prose below the app is not React's to re-render, so it is
   * swapped by hand whenever the language is not the one the document arrived
   * in. That happens when somebody uses the switch, and on a plain static host
   * with nothing in front of it to do the swapping.
   */
  useEffect(() => {
    translateStaticPage(lang)
  }, [lang])

  // `lang` is in the dependency list so every consumer re-renders on a switch,
  // even though `t` reads the language from the module rather than from here.
  const value = useMemo(
    () => ({ lang, setLang: change, t: (key, vars) => translate(key, vars), languages: LANGUAGES }),
    [lang, change]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

function useLanguageContext() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useT was called outside LanguageProvider')
  return ctx
}

/** The translate function, and the current language with it. */
export function useT() {
  return useLanguageContext()
}

const PLACEHOLDER = /\{(\w+)\}/g

/**
 * A translated sentence with markup dropped into it.
 *
 * Splitting a sentence into "the bit before the number" and "the bit after"
 * works in English and then falls apart the moment a language puts the pieces in
 * a different order. So the whole sentence stays one entry in the dictionary,
 * placeholders and all, and this puts the elements back where that language
 * happens to want them.
 *
 *   tx('header.tagline', { days: <b>12</b>, off: <b>28</b> })
 *
 * en: "Take {days} days off. Get {off}."
 * ro: "Iei {days} zile de concediu. Stai liber {off}."
 */
export function useTx() {
  const { lang } = useLanguageContext()
  return useCallback(
    (key, vars = {}) => {
      const entry = lookup(key)
      const template =
        typeof entry === 'string'
          ? entry
          : entry
            ? pluralForm(lang, entry, typeof vars.count === 'number' ? vars.count : 0)
            : key

      const out = []
      let last = 0
      let match
      PLACEHOLDER.lastIndex = 0
      while ((match = PLACEHOLDER.exec(template)) !== null) {
        if (match.index > last) out.push(template.slice(last, match.index))
        const supplied = vars[match[1]]
        out.push(supplied === undefined ? match[0] : supplied)
        last = match.index + match[0].length
      }
      if (last < template.length) out.push(template.slice(last))

      // The wrapper carries the supplied element's own key as well as its
      // position. Without that, a caller that keys an element on a value to
      // replay an animation when the value changes would find the wrapper's key
      // never changing, and the animation would only ever run once.
      return out.map((piece, i) =>
        typeof piece === 'string' || typeof piece === 'number' ? (
          piece
        ) : (
          <span key={`${i}:${piece?.key ?? ''}`}>{piece}</span>
        )
      )
    },
    [lang]
  )
}

export { getLanguage, setLanguage, LANGUAGES, LANGUAGE_CODES }
