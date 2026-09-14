/**
 * What the marks in the calendar mean.
 *
 * The legend repeats each day state exactly as the grid draws it, marker included,
 * so it doubles as the proof that none of the states need colour to be told apart.
 */

const ITEMS = [
  { key: 'leave', label: 'A day to book', swatch: 'leave' },
  { key: 'break', label: 'Inside a break', swatch: 'break' },
  { key: 'holiday', label: 'Public holiday', swatch: 'holiday' },
  { key: 'weekend', label: 'Not a working day', swatch: 'weekend' },
  { key: 'pinned', label: 'You fixed it', swatch: 'pinned' },
  { key: 'blackout', label: 'You ruled it out', swatch: 'blackout' }
]

export default function Legend({ className = '' }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted-foreground)] ${className}`}>
      {ITEMS.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <Swatch kind={item.swatch} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

function Swatch({ kind }) {
  const base =
    'relative flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-md border text-[10px] font-semibold'

  if (kind === 'leave') {
    return (
      <span
        className={base}
        style={{ background: 'var(--day-leave-soft)', borderColor: 'var(--day-leave)', color: 'var(--day-leave)' }}
        aria-hidden="true"
      >
        <span className="leading-none">6</span>
        <span className="mt-[2px] h-[4px] w-[4px] rounded-full" style={{ background: 'var(--day-leave)' }} />
      </span>
    )
  }
  if (kind === 'break') {
    return (
      <span
        className={base}
        style={{ background: 'var(--day-leave-soft)', borderColor: 'var(--day-leave)' }}
        aria-hidden="true"
      >
        <span className="leading-none opacity-70">7</span>
        <span className="mt-[2px] h-[4px] w-[4px]" />
      </span>
    )
  }
  if (kind === 'holiday') {
    return (
      <span className={base} style={{ background: 'var(--day-holiday)', borderColor: 'transparent' }} aria-hidden="true">
        <span className="leading-none">1</span>
        <span
          className="mt-[2px] h-[4px] w-[4px] rounded-full border"
          style={{ borderColor: 'var(--foreground)', borderWidth: 1.5 }}
        />
      </span>
    )
  }
  if (kind === 'weekend') {
    return (
      <span
        className={base}
        style={{ background: 'var(--day-weekend)', borderColor: 'transparent' }}
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
        style={{ borderColor: 'transparent', boxShadow: 'inset 0 0 0 2px var(--day-pinned)' }}
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
    <span className={`${base} stripe-blackout`} style={{ borderColor: 'transparent' }} aria-hidden="true">
      <span className="leading-none line-through opacity-60">4</span>
      <span
        className="mt-[2px] h-[4px] w-[4px]"
        style={{ background: 'var(--day-blackout)', clipPath: 'polygon(0 100%, 100% 0, 100% 22%, 22% 100%)' }}
      />
    </span>
  )
}
