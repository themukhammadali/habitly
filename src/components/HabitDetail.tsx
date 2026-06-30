import { useState } from 'react'
import type { Habit } from '../types'
import { colorHex } from '../lib/palette'
import {
  bestStreak,
  completedCount,
  completionRate,
  currentStreak,
} from '../lib/dates'
import { useStore } from '../store'
import YearGrid from './YearGrid'
import CalendarMonth from './CalendarMonth'
import WeeklyPattern from './WeeklyPattern'
import HabitSheet from './HabitSheet'

export default function HabitDetail({
  habit,
  onClose,
}: {
  habit: Habit
  onClose: () => void
}) {
  const toggleDay = useStore((s) => s.toggleDay)
  const [editing, setEditing] = useState(false)
  const hex = colorHex(habit.color)

  const streak = currentStreak(habit.completions)
  const best = bestStreak(habit.completions)
  const rate = completionRate(habit.completions, habit.createdAt)
  const total = completedCount(habit.completions)

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
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
            style={{ background: `${hex}22` }}
          >
            {habit.icon}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-neutral-900 dark:text-neutral-50">
              {habit.name}
            </h1>
            {habit.description && (
              <p className="truncate text-sm text-neutral-400">{habit.description}</p>
            )}
          </div>
        </div>

        {/* Last 365 days heatmap */}
        <Card>
          <SectionLabel>Last 365 days</SectionLabel>
          <div className="overflow-x-auto no-scrollbar">
            <div style={{ minWidth: 620 }}>
              <YearGrid
                completions={habit.completions}
                color={hex}
                createdAt={habit.createdAt}
                weeks={53}
                showMonths
                onToggleDay={(k) => toggleDay(habit.id, k)}
              />
            </div>
          </div>
        </Card>

        {/* Highlights */}
        <div className="grid grid-cols-2 gap-3">
          <Stat value={streak} label="Current Streak" color={hex} />
          <Stat value={best} label="Best Streak" color={hex} />
          <Stat value={`${rate}%`} label="Completion" color={hex} />
          <Stat value={total} label="Total Days" color={hex} />
        </div>

        {/* Calendar */}
        <Card>
          <CalendarMonth
            completions={habit.completions}
            color={hex}
            createdAt={habit.createdAt}
            onToggleDay={(k) => toggleDay(habit.id, k)}
          />
        </Card>

        {/* Weekly pattern */}
        <Card>
          <SectionLabel>Weekly Pattern</SectionLabel>
          <WeeklyPattern completions={habit.completions} color={hex} />
        </Card>
      </div>

      {editing && (
        <HabitSheet
          habit={habit}
          onClose={() => {
            setEditing(false)
            // If the habit was deleted, close the detail too.
            const stillExists = useStore.getState().habits.some((h) => h.id === habit.id)
            if (!stillExists) onClose()
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
