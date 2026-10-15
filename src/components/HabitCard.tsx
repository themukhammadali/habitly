import type { Habit } from '../types'
import { colorHex } from '../lib/palette'
import { HabitIcon } from '../lib/icons'
import { currentStreak, doneInWeek, isDue, scheduleLabel, streakUnit } from '../lib/schedule'
import { tapFeedback } from '../lib/haptics'
import YearGrid from './YearGrid'
import AmountControl from './AmountControl'
import { formatAmount, partialDays, usualAmount } from '../lib/measure'
import { todayKey } from '../lib/dates'
import { useStore } from '../store'

export default function HabitCard({
  habit,
  day,
  onOpen,
  dragHandle,
}: {
  habit: Habit
  /** The day the check button acts on (today, or yesterday when catching up). */
  day: string
  onOpen: () => void
  /** Shown instead of the check button while reordering. */
  dragHandle?: React.ReactNode
}) {
  const toggleDay = useStore((s) => s.toggleDay)
  const hex = colorHex(habit.color)
  const done = !!habit.completions[day]
  const due = isDue(habit.schedule, day)
  const streak = currentStreak(habit)
  const unit = streakUnit(habit.schedule)

  const goal = habit.goal
  const usual = goal ? usualAmount(habit, todayKey()) : null
  const subtitle =
    goal && due
      ? // Before anything is logged, the usual amount is the useful hint; after, progress is.
        !habit.amounts[day] && usual !== null
        ? `usually ${formatAmount(usual)} ${goal.unit}`
        : `${formatAmount(habit.amounts[day] ?? 0)}/${formatAmount(goal.target)} ${goal.unit}`
      : habit.schedule.kind === 'weekly'
      ? `${Math.min(doneInWeek(habit.completions, day), habit.schedule.times)}/${habit.schedule.times} this week`
      : !due
        ? 'Not scheduled'
        : habit.description || (habit.schedule.kind === 'daily' ? '' : scheduleLabel(habit.schedule))

  return (
    <div
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition active:scale-[0.99] dark:bg-neutral-900 dark:ring-white/5"
      onClick={dragHandle ? undefined : onOpen}
      role={dragHandle ? undefined : 'button'}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${hex}22` }}>
          <HabitIcon name={habit.icon} className="h-5 w-5" style={{ color: hex }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-neutral-900 dark:text-neutral-50">{habit.name}</div>
          {subtitle && <div className="truncate text-sm text-neutral-400">{subtitle}</div>}
        </div>
        {dragHandle ?? (goal ? (
          <AmountControl habit={habit} day={day} color={hex} />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              tapFeedback()
              toggleDay(habit.id, day)
            }}
            aria-label={done ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`}
            aria-pressed={done}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-90"
            style={{
              background: done ? hex : 'transparent',
              border: done ? 'none' : `2px solid ${hex}`,
              opacity: !done && !due ? 0.35 : 1,
            }}
          >
            {done ? (
              <CheckIcon key="done" className="h-5 w-5 animate-check-in text-white" />
            ) : (
              <PlusIcon className="h-5 w-5" style={{ color: hex }} />
            )}
          </button>
        ))}
      </div>

      {!dragHandle && (
        <>
          <div className="mt-3">
            <YearGrid
              completions={habit.completions}
              color={hex}
              createdAt={habit.createdAt}
              weeks={20}
              partial={goal ? partialDays(habit) : undefined}
            />
          </div>
          {streak > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs font-medium text-neutral-400">
              <FlameIcon className="h-3.5 w-3.5" style={{ color: hex }} />
              {streak} {unit}{streak === 1 ? '' : 's'} streak
            </div>
          )}
        </>
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
