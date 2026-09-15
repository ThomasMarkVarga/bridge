/**
 * What the marks in the calendar mean.
 *
 * The legend repeats each day state exactly as the grid draws it, marker included,
 * so it doubles as the proof that none of the states need colour to be told apart.
 */
import { useT } from '../i18n/index.jsx'

const ITEMS = ['leave', 'break', 'holiday', 'weekend', 'pinned', 'blackout']

export default function Legend({ className = '' }) {
  const { t } = useT()
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted-foreground)] ${className}`}>
      {ITEMS.map((item) => (
        <li key={item} className="flex items-center gap-1.5">
          <Swatch kind={item} />
          <span>{t(`legend.${item}`)}</span>
        </li>
      ))}
    </ul>
  )
}

function Swatch({ kind }) {
  const base =
    'relative flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg border-[2px] text-[10px] font-extrabold'

  if (kind === 'leave') {
    return (
      <span
        className={base}
        style={{ background: 'var(--day-leave)', borderColor: 'var(--line)', color: 'var(--ink-fixed)' }}
        aria-hidden="true"
      >
        <span className="leading-none">6</span>
        <span className="mt-[2px] h-[4px] w-[4px] rounded-full" style={{ background: 'var(--ink-fixed)' }} />
      </span>
    )
  }
  if (kind === 'break') {
    return (
      <span
        className={base}
        style={{ background: 'var(--day-leave)', borderColor: 'var(--line)', color: 'var(--ink-fixed)' }}
        aria-hidden="true"
      >
        <span className="leading-none opacity-80">7</span>
        <span className="mt-[2px] h-[4px] w-[4px]" />
      </span>
    )
  }
  if (kind === 'holiday') {
    return (
      <span className={base} style={{ background: 'var(--day-holiday)', borderColor: 'var(--line)', color: 'var(--on-sea)' }} aria-hidden="true">
        <span className="leading-none">1</span>
        <span
          className="mt-[2px] h-[4px] w-[4px] rounded-full border"
          style={{ borderColor: 'currentColor', borderWidth: 1.5 }}
        />
      </span>
    )
  }
  if (kind === 'weekend') {
    return (
      <span
        className={base}
        style={{ background: 'var(--day-weekend)', borderColor: 'var(--line)' }}
        aria-hidden="true"
      >
        <span className="font-normal leading-none opacity-70">2</span>
        <span className="mt-[2px] h-[4px] w-[4px]" />
      </span>
    )
  }
  if (kind === 'pinned') {
    return (
      <span
        className={base}
        style={{ borderColor: 'var(--line)', boxShadow: 'inset 0 0 0 3px var(--day-pinned)' }}
        aria-hidden="true"
      >
        <span className="leading-none">3</span>
        <span
          className="mt-[2px] h-[4px] w-[4px]"
          style={{ background: 'var(--day-pinned)', transform: 'rotate(45deg)' }}
        />
      </span>
    )
  }
  return (
    <span className={`${base} stripe-blackout`} style={{ borderColor: 'var(--line)' }} aria-hidden="true">
      <span className="leading-none line-through opacity-60">4</span>
      <span
        className="mt-[2px] h-[4px] w-[4px]"
        style={{ background: 'var(--day-blackout)', clipPath: 'polygon(0 100%, 100% 0, 100% 22%, 22% 100%)' }}
      />
    </span>
  )
}
