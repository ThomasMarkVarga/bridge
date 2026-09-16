/**
 * A dropdown in BridgeDays's own look, in place of the browser's select.
 *
 * The closed picker is a field like any other, with a sun-yellow caret box. It
 * opens a panel of the same card stock, and the option under the pointer or the
 * arrow keys is marked the way the site marks what matters: sun yellow with an
 * ink outline. Long lists get a search box, so nobody scrolls past two hundred
 * countries to reach Romania.
 *
 * Keyboard use follows the ARIA listbox and combobox patterns: arrow keys, Page
 * Up and Down, Home and End move; Enter picks; Escape closes and hands focus back
 * to the field. On a short list, typing a letter jumps to the first option that
 * starts with it. On a long one, typing on the closed field opens the search with
 * that letter already in it.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { useT } from '../i18n/index.jsx'

const fold = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/**
 * The options matching a search: those whose label starts with it or that have it
 * as a keyword first, then those that contain it anywhere. Accents are ignored, so
 * "aland" finds Åland Islands.
 */
export function filterOptions(options, query) {
  const q = fold(query.trim())
  if (!q) return options
  const first = []
  const rest = []
  for (const o of options) {
    const keywords = fold(o.keywords || '')
    if (fold(o.label).startsWith(q) || keywords.split(/\s+/).includes(q)) first.push(o)
    else if (`${fold(o.label)} ${keywords}`.includes(q)) rest.push(o)
  }
  return [...first, ...rest]
}

const isTypingKey = (e) => e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey

/**
 * @param {object} props
 * @param {string} props.id  the field's id, so a <label htmlFor> names it
 * @param {string} props.label  names the list for screen readers
 * @param {string|number} props.value
 * @param {{value: string|number, label: string, badge?: string, keywords?: string}[]} props.options
 * @param {(value: string|number) => void} props.onChange
 * @param {boolean} [props.searchable]
 * @param {boolean} [props.disabled]
 * @param {string} [props.placeholder]  shown while no option is chosen, already translated
 * @param {string} [props.className]
 */
export default function Picker({
  id,
  label,
  value,
  options,
  onChange,
  searchable = false,
  disabled = false,
  placeholder,
  className = ''
}) {
  const { t } = useT()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const typed = useRef({ text: '', at: 0 })

  const shown = useMemo(() => (searchable ? filterOptions(options, query) : options), [options, query, searchable])
  const selected = options.find((o) => o.value === value)
  const activeId = shown[active] ? `${listId}-${active}` : undefined

  const openList = (initialQuery = '') => {
    if (disabled) return
    setQuery(initialQuery)
    const list = searchable ? filterOptions(options, initialQuery) : options
    setActive(initialQuery ? 0 : Math.max(0, list.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const pick = (option) => {
    if (!option) return
    if (option.value !== value) onChange(option.value)
    close()
  }

  const move = (to) => setActive(Math.max(0, Math.min(shown.length - 1, to)))

  // Focus goes into the panel as it opens: the search box, or the list itself.
  useEffect(() => {
    if (open) (searchable ? inputRef.current : listRef.current)?.focus()
  }, [open, searchable])

  // Keep the highlighted option in view as it moves.
  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, shown])

  // A press anywhere else closes the panel, and leaves focus wherever it landed.
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const onButtonKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      openList()
    } else if (searchable && isTypingKey(e) && e.key !== ' ') {
      e.preventDefault()
      openList(e.key)
    }
  }

  const onListKeyDown = (e) => {
    const inList = !searchable
    if (e.key === 'ArrowDown') move(active + 1)
    else if (e.key === 'ArrowUp') move(active - 1)
    else if (e.key === 'PageDown') move(active + 8)
    else if (e.key === 'PageUp') move(active - 8)
    else if (e.key === 'Home' && inList) move(0)
    else if (e.key === 'End' && inList) move(shown.length - 1)
    else if (e.key === 'Enter' || (e.key === ' ' && inList)) pick(shown[active])
    else if (e.key === 'Escape') close()
    else if (e.key === 'Tab') return setOpen(false)
    else if (inList && isTypingKey(e)) {
      const now = Date.now()
      const t = typed.current
      t.text = now - t.at > 700 ? e.key : t.text + e.key
      t.at = now
      const i = shown.findIndex((o) => fold(o.label).startsWith(fold(t.text)))
      if (i >= 0) move(i)
    } else return undefined
    e.preventDefault()
    return undefined
  }

  return (
    <div ref={rootRef} className={`picker${open ? ' is-open' : ''} ${className}`}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className="field picker-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKeyDown}
      >
        {selected?.badge && <span className="picker-badge">{selected.badge}</span>}
        <span className="picker-value">{selected ? selected.label : placeholder || t('picker.choose')}</span>
        <span className="picker-caret" aria-hidden="true">
          <Icon name="caret" size={16} />
        </span>
      </button>

      {open && (
        <div className="panel picker-panel">
          {searchable && (
            <div className="picker-search">
              <Icon name="search" size={18} />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeId}
                aria-label={t('picker.search', { label })}
                placeholder={t('picker.searchPlaceholder')}
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onListKeyDown}
              />
            </div>
          )}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            tabIndex={searchable ? -1 : 0}
            aria-activedescendant={searchable ? undefined : activeId}
            onKeyDown={searchable ? undefined : onListKeyDown}
            className="picker-list"
          >
            {shown.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={o.value === value}
                className={i === active ? 'picker-option is-active' : 'picker-option'}
                onPointerMove={() => i !== active && setActive(i)}
                onClick={() => pick(o)}
              >
                {o.badge && <span className="picker-badge">{o.badge}</span>}
                <span className="picker-label">{o.label}</span>
                {o.value === value && <Icon name="check" size={18} />}
              </li>
            ))}
            {shown.length === 0 && (
              <li className="picker-empty" role="presentation">
                {t('picker.empty', { query })}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
