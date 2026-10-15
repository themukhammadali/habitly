import { useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { Habit } from '../types'
import { formatAmount, usualAmount } from '../lib/measure'
import { todayKey } from '../lib/dates'
import { tapFeedback, successFeedback } from '../lib/haptics'
import { useStore } from '../store'
import { useToast } from './Toast'

/** Horizontal distance for one step while scrubbing. */
const PX_PER_STEP = 14
const SLOP = 4

/**
 * − / + around the day's amount. Press the amount and drag left or right to
 * scrub to a value; the scrubber starts at the usual amount, so on a typical
 * day a press and release logs it.
 */
export default function AmountControl({ habit, day, color }: { habit: Habit; day: string; color: string }) {
  const goal = habit.goal!
  const setAmount = useStore((s) => s.setAmount)
  const showToast = useToast((s) => s.show)
  const current = habit.amounts[day] ?? 0
  const usual = usualAmount(habit, todayKey())
  const [scrub, setScrubState] = useState<number | null>(null)
  // Pointer events can outpace renders; read the live value from a ref.
  const scrubRef = useRef<number | null>(null)
  const setScrub = (v: number | null) => {
    scrubRef.current = v
    setScrubState(v)
  }
  const gesture = useRef<{ x: number; start: number; moved: boolean } | null>(null)

  const shown = scrub ?? current
  const progress = Math.min(1, shown / goal.target)
  const r = 17
  const c = 2 * Math.PI * r

  function change(next: number) {
    const value = Math.max(0, next)
    if (value === current) return
    if (current < goal.target && value >= goal.target) successFeedback()
    else tapFeedback()
    setAmount(habit.id, day, value)
  }

  // Keep presses on the control from starting a swipe, a drag-to-reorder, or opening the habit.
  const stop = {
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
  }

  return (
    <div className="flex shrink-0 items-center gap-1" {...stop} onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={`Less ${goal.unit || habit.name}`}
        disabled={current <= 0}
        onClick={() => change(current - goal.step)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition active:scale-90 active:bg-black/5 disabled:opacity-30 dark:active:bg-white/10"
      >
        <Minus className="h-4 w-4" strokeWidth={2.5} />
      </button>

      <div
        role="slider"
        aria-label={`${habit.name}, drag to set amount`}
        aria-valuemin={0}
        aria-valuenow={shown}
        aria-valuetext={`${formatAmount(shown)} of ${formatAmount(goal.target)} ${goal.unit}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') change(current + goal.step)
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') change(current - goal.step)
        }}
        className="relative flex h-11 w-11 touch-none select-none items-center justify-center"
        onPointerDown={(e) => {
          e.stopPropagation()
          try {
            // Keep receiving moves when the finger leaves the control.
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          } catch {
            // No capture for this pointer; moves over the control still work.
          }
          const start = current > 0 ? current : (usual ?? goal.step)
          gesture.current = { x: e.clientX, start, moved: false }
          setScrub(start)
          tapFeedback()
        }}
        onPointerMove={(e) => {
          const g = gesture.current
          if (!g) return
          const dx = e.clientX - g.x
          if (Math.abs(dx) > SLOP) g.moved = true
          const next = Math.max(0, g.start + Math.round(dx / PX_PER_STEP) * goal.step)
          if (next !== scrubRef.current) {
            tapFeedback()
            setScrub(next)
          }
        }}
        onPointerUp={() => {
          const g = gesture.current
          gesture.current = null
          const value = scrubRef.current
          setScrub(null)
          if (!g || value === null) return
          // A plain press on an already-logged day changes nothing.
          if (!g.moved && current > 0) return
          if (value === current) return
          const before = current
          change(value)
          showToast(`${habit.name}: ${formatAmount(value)} ${goal.unit}`.trim(), {
            label: 'Undo',
            run: () => setAmount(habit.id, day, before),
          })
        }}
        onPointerCancel={() => {
          gesture.current = null
          setScrub(null)
        }}
      >
        <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" stroke={`${color}33`} />
          <circle
            cx="22"
            cy="22"
            r={r}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-200"
          />
        </svg>
        <span
          className={`relative text-[13px] font-bold tabular-nums ${scrub !== null ? 'scale-110' : ''} transition-transform`}
          style={{ color: shown >= goal.target ? color : undefined }}
        >
          {formatAmount(shown)}
        </span>
        {scrub !== null && (
          <div
            className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold text-white shadow-lg"
            style={{ background: color }}
          >
            {formatAmount(scrub)} / {formatAmount(goal.target)} {goal.unit}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label={`More ${goal.unit || habit.name}`}
        onClick={() => change(current + goal.step)}
        className="flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90"
        style={{ background: `${color}22`, color }}
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  )
}
