import type { Habit, Schedule } from '../types'
import { addDaysKey, fromKey, todayKey } from './dates'

type Completions = Record<string, true>
type HabitLike = Pick<Habit, 'completions' | 'createdAt' | 'schedule'>

/** 0 = Monday … 6 = Sunday */
export function weekday(key: string): number {
  return (fromKey(key).getDay() + 6) % 7
}

export function weekStartKey(key: string): string {
  return addDaysKey(key, -weekday(key))
}

/** Whether the habit is scheduled on this day. Weekly-goal habits can be done any day. */
export function isDue(schedule: Schedule, key: string): boolean {
  return schedule.kind !== 'weekdays' || schedule.days.includes(weekday(key))
}

export function doneInWeek(completions: Completions, key: string): number {
  const start = weekStartKey(key)
  let n = 0
  for (let i = 0; i < 7; i++) if (completions[addDaysKey(start, i)]) n++
  return n
}

/** Whether nothing more is expected today: done today, not due today, or the weekly goal is met. */
export function isSatisfied(h: HabitLike, key = todayKey()): boolean {
  if (h.completions[key]) return true
  if (h.schedule.kind === 'weekly') return doneInWeek(h.completions, key) >= h.schedule.times
  return !isDue(h.schedule, key)
}

/** Whether the habit should show up as something to do on this day. */
export function isActionable(h: HabitLike, key = todayKey()): boolean {
  if (h.schedule.kind === 'weekly') return true
  return isDue(h.schedule, key)
}

/** Tracking starts at createdAt, or earlier if an import brought older completions. */
function startKey(h: HabitLike): string {
  let start = h.createdAt
  for (const k in h.completions) if (k < start) start = k
  return start
}

export type StreakUnit = 'day' | 'week'

export function streakUnit(schedule: Schedule): StreakUnit {
  return schedule.kind === 'weekly' ? 'week' : 'day'
}

/**
 * Current streak in due days (or weeks for weekly goals). An unfinished today
 * (or this week) doesn't break the streak yet.
 */
export function currentStreak(h: HabitLike, today = todayKey()): number {
  const start = startKey(h)
  if (h.schedule.kind === 'weekly') {
    const target = h.schedule.times
    let week = weekStartKey(today)
    let streak = 0
    if (doneInWeek(h.completions, week) >= target) streak++
    week = addDaysKey(week, -7)
    while (week >= weekStartKey(start) && doneInWeek(h.completions, week) >= target) {
      streak++
      week = addDaysKey(week, -7)
    }
    return streak
  }

  let streak = 0
  let cursor = today
  if (!h.completions[cursor]) cursor = addDaysKey(cursor, -1)
  for (; cursor >= start; cursor = addDaysKey(cursor, -1)) {
    if (!isDue(h.schedule, cursor)) continue
    if (!h.completions[cursor]) break
    streak++
  }
  return streak
}

/** Longest streak ever, in the same unit as currentStreak. */
export function bestStreak(h: HabitLike, today = todayKey()): number {
  const start = startKey(h)
  let best = 0
  let run = 0
  if (h.schedule.kind === 'weekly') {
    const target = h.schedule.times
    for (let w = weekStartKey(start); w <= today; w = addDaysKey(w, 7)) {
      run = doneInWeek(h.completions, w) >= target ? run + 1 : 0
      best = Math.max(best, run)
    }
    return best
  }
  for (let k = start; k <= today; k = addDaysKey(k, 1)) {
    if (!isDue(h.schedule, k)) continue
    if (h.completions[k]) {
      run++
      best = Math.max(best, run)
    } else if (k !== today) {
      run = 0
    }
  }
  return best
}

/**
 * Share of scheduled days (or weekly goals) met over the last 365 days at most.
 * Today and the current week only count once they're done, so an unfinished
 * day doesn't drag the rate down.
 */
export function completionRate(h: HabitLike, today = todayKey()): number {
  let start = startKey(h)
  const yearAgo = addDaysKey(today, -364)
  if (start < yearAgo) start = yearAgo

  if (h.schedule.kind === 'weekly') {
    const target = h.schedule.times
    let met = 0
    let total = 0
    for (let w = weekStartKey(start); w <= today; w = addDaysKey(w, 7)) {
      const done = Math.min(target, doneInWeek(h.completions, w))
      const current = w === weekStartKey(today)
      if (current && done < target) continue
      met += done
      total += target
    }
    return total ? Math.round((met / total) * 100) : 0
  }

  let due = 0
  let done = 0
  for (let k = start; k <= today; k = addDaysKey(k, 1)) {
    if (!isDue(h.schedule, k)) continue
    if (h.completions[k]) done++
    else if (k === today) continue
    due++
  }
  return due ? Math.round((done / due) * 100) : 0
}

export function scheduleLabel(s: Schedule): string {
  if (s.kind === 'daily') return 'Every day'
  if (s.kind === 'weekly') return `${s.times}× a week`
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const days = [...s.days].sort()
  if (days.join() === '0,1,2,3,4') return 'Weekdays'
  if (days.join() === '5,6') return 'Weekends'
  if (days.length === 7) return 'Every day'
  return days.map((d) => names[d]).join(', ')
}
