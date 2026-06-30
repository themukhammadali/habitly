import type { Habit } from '../types'
import { colorHex } from '../lib/palette'
import { currentStreak } from '../lib/dates'
import { todayKey } from '../lib/dates'
import YearGrid from './YearGrid'
import { useStore } from '../store'

export default function HabitCard({
  habit,
  onOpen,
}: {
  habit: Habit
  onOpen: () => void
}) {
  const toggleDay = useStore((s) => s.toggleDay)
  const hex = colorHex(habit.color)
  const today = todayKey()
  const doneToday = !!habit.completions[today]
  const streak = currentStreak(habit.completions)

  return (
    <div
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/5"
      onClick={onOpen}
      role="button"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ background: `${hex}22` }}
        >
          {habit.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-neutral-900 dark:text-neutral-50">
            {habit.name}
          </div>
          {habit.description && (
            <div className="truncate text-sm text-neutral-400">
              {habit.description}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleDay(habit.id, today)
          }}
          aria-label={doneToday ? 'Mark today incomplete' : 'Mark today complete'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-90"
          style={{
            background: doneToday ? hex : 'transparent',
            border: doneToday ? 'none' : `2px solid ${hex}`,
          }}
        >
          {doneToday ? (
            <CheckIcon className="h-5 w-5 text-white" />
          ) : (
            <PlusIcon className="h-5 w-5" style={{ color: hex }} />
          )}
        </button>
      </div>

      <div className="mt-3">
        <YearGrid completions={habit.completions} color={hex} createdAt={habit.createdAt} weeks={20} />
      </div>

      {streak > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-neutral-400">
          <FlameIcon className="h-3.5 w-3.5" style={{ color: hex }} />
          {streak} day streak
        </div>
      )}
    </div>
  )
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
function FlameIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2c1 3-1 4-2 6s-1 4 1 5c1-1 1-2 1-3 1 1 2 3 2 5a4 4 0 11-8 0c0-3 2-5 3-7 1 2 2 1 2-1 0-2-1-4 1-5z" />
    </svg>
  )
}
