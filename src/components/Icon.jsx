/**
 * Icons, inlined.
 *
 * One family, one stroke weight, one corner treatment, drawn on a 24 unit grid.
 * They are inlined rather than installed because the whole set BridgeDays uses is
 * under two kilobytes, and a page that must make no network requests should not
 * pull in an icon package to draw eleven shapes.
 *
 * Every icon here is decorative: each one sits beside a visible label, so they are
 * hidden from screen readers. An icon that ever stands alone needs a label passed
 * to it, and then it stops being decorative.
 */

const PATHS = {
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.3 3.3 5.2 3.3 8.5S14.2 18.2 12 20.5c-2.2-2.3-3.3-5.2-3.3-8.5S9.8 5.8 12 3.5Z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  download: <path d="M12 3.5v12m0 0 4.5-4.5M12 15.5 7.5 11M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  link: (
    <>
      <path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1.2 1.2" />
      <path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1.2-1.2" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L20 20" />
    </>
  ),
  sliders: <path d="M4 7h10M18 7h2M4 17h4M12 17h8M16 4.5v5M8 14.5v5" />,
  caret: <path d="m6 9.5 6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21v-6" />
      <path d="M8.5 4h7l-1 5.5 2.5 3v2.5h-11v-2.5l2.5-3z" />
    </>
  ),
  block: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 18 12-12" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.4" />
    </>
  ),
  offline: (
    <>
      <path d="M2.5 8.5a17 17 0 0 1 6-3.6M15.5 5a17 17 0 0 1 6 3.5M6 12.2a11 11 0 0 1 3-1.8M15 10.4a11 11 0 0 1 3 1.8M9.5 15.8a5 5 0 0 1 5 0M12 19.5v.2" />
      <path d="m3 3 18 18" />
    </>
  ),
  reset: <path d="M4 12a8 8 0 1 1 2.5 5.8M4 18v-5h5" />,
  code: <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  warning: (
    <>
      <path d="M12 4.5 2.8 20h18.4z" />
      <path d="M12 10v4.2M12 17.3v.2" />
    </>
  )
}

/**
 * @param {object} props
 * @param {keyof typeof PATHS} props.name
 * @param {number} [props.size]
 * @param {string} [props.label]  give this only when the icon stands alone
 * @param {string} [props.className]
 */
export default function Icon({ name, size = 20, label, className = '', ...rest }) {
  const path = PATHS[name]
  if (!path) return null
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
      {...rest}
    >
      {path}
    </svg>
  )
}
