import { useState } from 'react'
import { MONTHS, WEEKDAYS_SHORT, toKey, todayKey } from '../lib/dates'

export default function CalendarMonth({
  completions,
  color,
  createdAt,
  onToggleDay,
}: {
  completions: Record<string, true>
  color: string
  createdAt: string
  onToggleDay: (key: string) => void
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const today = todayKey()

  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function shift(delta: number) {
    const m = month + delta
    const d = new Date(year, m, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 active:bg-black/5 dark:active:bg-white/10"
        >
          <Chevron dir="left" />
        </button>
        <div className="font-semibold text-neutral-900 dark:text-neutral-50">
          {MONTHS[month]} {year}
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 active:bg-black/5 dark:active:bg-white/10"
        >
          <Chevron dir="right" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-neutral-400">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />
          const key = toKey(new Date(year, month, d))
          const done = !!completions[key]
          const isToday = key === today
          const future = key > today
          const before = key < createdAt
          const disabled = future || before
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onToggleDay(key)}
              className="relative flex aspect-square items-center justify-center rounded-full text-sm transition active:scale-90 disabled:opacity-25"
              style={{
                background: done ? color : 'transparent',
                color: done ? '#fff' : undefined,
                outline: isToday && !done ? `1.5px solid ${color}` : 'none',
                outlineOffset: '-1.5px',
              }}
            >
              <span className={done ? 'font-semibold' : 'text-neutral-700 dark:text-neutral-300'}>
                {d}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
