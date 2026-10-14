import type { Habit } from '../types'
import { addDaysKey, formatTime, fromKey, todayKey } from './dates'
import { predict } from './predict'
import { doneInWeek, isDue } from './schedule'

/** How many days ahead reminders are scheduled. Re-planned whenever the app runs. */
export const PLAN_DAYS = 7

export interface PlannedReminder {
  habitId: string
  day: string
  at: Date
  title: string
  body: string
}

/** Where a habit's reminder will land today, for display in the editor. */
export function reminderTime(habit: Habit, day = todayKey()): { minutes: number; learned: boolean } {
  if (habit.reminder.mode === 'smart') {
    const p = predict(habit.completionTimes, day)
    if (p) return { minutes: p.remindAt, learned: true }
  }
  return { minutes: habit.reminder.time, learned: false }
}

/** Every reminder that should fire in the next PLAN_DAYS days, soonest first. */
export function planReminders(habits: Habit[], now = new Date()): PlannedReminder[] {
  const today = todayKey()
  const out: PlannedReminder[] = []
  for (const h of habits) {
    if (h.archived || h.reminder.mode === 'off') continue
    for (let d = 0; d < PLAN_DAYS; d++) {
      const day = addDaysKey(today, d)
      if (h.completions[day] || !isDue(h.schedule, day)) continue
      // Weekly goal already met for that week (only known for the current week).
      if (h.schedule.kind === 'weekly' && doneInWeek(h.completions, day) >= h.schedule.times) continue

      const { minutes, learned } = reminderTime(h, day)
      const at = fromKey(day)
      at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
      if (at <= now) continue

      const usual = learned ? predict(h.completionTimes, day)!.usual : null
      out.push({
        habitId: h.id,
        day,
        at,
        title: h.name,
        body: usual !== null
          ? `You usually do this around ${formatTime(usual)}.`
          : h.description || 'Time to keep your streak going.',
      })
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime())
}
