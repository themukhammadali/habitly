import { useCallback, useState } from 'react'
import type { Habit } from '../types'
import { colorHex } from '../lib/palette'
import { HabitIcon } from '../lib/icons'
import { formatTime } from '../lib/dates'
import { bestStreak, completionRate, currentStreak, scheduleLabel, streakUnit } from '../lib/schedule'
import { predict } from '../lib/predict'
import { reminderTime } from '../lib/reminders'
import { todayKey } from '../lib/dates'
import { useBackHandler } from '../hooks/useBackHandler'
import { amountBetween, formatAmount, partialDays, usualAmount } from '../lib/measure'
import { fromKey } from '../lib/dates'
import { weekStartKey } from '../lib/schedule'
import { useStore } from '../store'
import YearGrid from './YearGrid'
import CalendarMonth from './CalendarMonth'
import WeeklyPattern from './WeeklyPattern'
import HabitEditor from './HabitEditor'

export default function HabitDetail({
  habit,
  onClose,
}: {
  habit: Habit
  onClose: () => void
}) {
  const toggleDay = useStore((s) => s.toggleDay)
  const setAmount = useStore((s) => s.setAmount)
  const goal = habit.goal

  /** Tapping a day: ticks it, or for measurable habits asks for the exact amount. */
  function editDay(day: string) {
    if (!goal) return toggleDay(habit.id, day)
    const label = fromKey(day).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    const answer = window.prompt(`${goal.unit || 'Amount'} on ${label}`, formatAmount(habit.amounts[day] ?? 0))
    if (answer === null) return
    const value = Number(answer.replace(',', '.'))
    if (Number.isFinite(value) && value >= 0) setAmount(habit.id, day, value)
  }
  const [editing, setEditing] = useState(false)
  const hex = colorHex(habit.color)

  useBackHandler(onClose)
  // Open the year grid scrolled to the most recent weeks.
  const scrollToEnd = useCallback((el: HTMLDivElement | null) => {
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  const streak = currentStreak(habit)
  const best = bestStreak(habit)
  const rate = completionRate(habit)
  const total = Object.keys(habit.completions).length
  const usual = goal ? usualAmount(habit, todayKey()) : null
  const weekTotal = goal ? amountBetween(habit, weekStartKey(todayKey()), todayKey()) : 0
  const unit = streakUnit(habit.schedule) === 'week' ? 'Weeks' : 'Days'
  const learned = predict(habit.completionTimes, todayKey())

  return (
    <div className="fixed inset-0 z-40 animate-fade-in overflow-y-auto bg-neutral-100 dark:bg-neutral-950 no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-neutral-100/90 px-3 py-3 pt-safe backdrop-blur dark:border-white/5 dark:bg-neutral-950/90">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-0.5 text-[15px] font-medium"
          style={{ color: hex }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Habits
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[15px] font-medium"
          style={{ color: hex }}
        >
          Edit
        </button>
      </div>

      <div className="space-y-4 px-4 py-4 pb-16">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: `${hex}22` }}
          >
            <HabitIcon name={habit.icon} className="h-6 w-6" style={{ color: hex }} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-neutral-900 dark:text-neutral-50">
              {habit.name}
            </h1>
            <p className="truncate text-sm text-neutral-400">
              {[scheduleLabel(habit.schedule), habit.description].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Last 365 days heatmap */}
        <Card>
          <SectionLabel>Last 365 days</SectionLabel>
          <div className="overflow-x-auto no-scrollbar" ref={scrollToEnd}>
            <div style={{ minWidth: 620 }}>
              <YearGrid
                completions={habit.completions}
                color={hex}
                createdAt={habit.createdAt}
                weeks={53}
                showMonths
                onToggleDay={editDay}
                partial={goal ? partialDays(habit) : undefined}
              />
            </div>
          </div>
        </Card>

        {/* Highlights */}
        <div className="grid grid-cols-2 gap-3">
          <Stat value={streak} label={`Current Streak (${unit})`} color={hex} />
          <Stat value={best} label={`Best Streak (${unit})`} color={hex} />
          <Stat value={`${rate}%`} label="Completion" color={hex} />
          <Stat value={total} label="Total Days" color={hex} />
          {goal && (
            <>
              <Stat value={usual === null ? '—' : formatAmount(usual)} label={`Usually (${goal.unit || 'per day'})`} color={hex} />
              <Stat value={formatAmount(weekTotal)} label={`This week (${goal.unit || 'total'})`} color={hex} />
            </>
          )}
        </div>

        {/* What the smart reminder has learned */}
        {(learned || habit.reminder.mode !== 'off') && (
          <Card>
            <SectionLabel>Timing</SectionLabel>
            <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
              {learned ? (
                <p>
                  Usually done around <b style={{ color: hex }}>{formatTime(learned.usual)}</b>
                  {learned.spread >= 5 && <> (± {learned.spread} min)</>}
                  {learned.split && <>, learned separately for weekdays and weekends</>}.
                </p>
              ) : (
                <p>Tick this habit off on the day you do it and Habitly will learn your usual time.</p>
              )}
              {habit.reminder.mode !== 'off' && (
                <p className="text-neutral-400">
                  Reminder today at {formatTime(reminderTime(habit).minutes)}
                  {habit.reminder.mode === 'smart' && !learned && ' until your usual time is learned'}.
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Calendar */}
        <Card>
          <CalendarMonth
            completions={habit.completions}
            color={hex}
            createdAt={habit.createdAt}
            onToggleDay={editDay}
            partial={goal ? partialDays(habit) : undefined}
          />
        </Card>

        {/* Weekly pattern */}
        <Card>
          <SectionLabel>Weekly Pattern</SectionLabel>
          <WeeklyPattern completions={habit.completions} color={hex} />
        </Card>
      </div>

      {editing && (
        <HabitEditor
          habit={habit}
          onClose={() => {
            setEditing(false)
            // If the habit was deleted or archived, close the detail too.
            const current = useStore.getState().habits.find((h) => h.id === habit.id)
            if (!current || current.archived) onClose()
          }}
        />
      )}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/5">
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
      {children}
    </div>
  )
}

function Stat({
  value,
  label,
  color,
}: {
  value: string | number
  label: string
  color: string
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/5">
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-neutral-400">{label}</div>
    </div>
  )
}
