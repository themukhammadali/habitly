// Logging for habits, kept pure so the store stays thin and this stays testable.
// For measurable habits, `completions` is derived: a day is done once its
// amount reaches the goal. Everything that reads completions (streaks,
// schedules, analytics, reminders) works unchanged.

import type { Goal, Habit } from '../types'
import { addDaysKey } from './dates'

/** Days of history the "usual amount" looks at, once there's enough of it. */
const USUAL_WINDOW = 14
/** Below this many logged days, "usual" is simply the most recent day. */
const USUAL_MIN_DAYS = 3

export interface Clock {
  today: string
  /** Minutes after midnight, now. */
  minutes: number
}

/**
 * Sets a measurable habit's amount for a day. Records the time of day when
 * the goal is first reached today, which is what smart reminders learn from.
 */
export function setAmount(h: Habit, day: string, amount: number, clock: Clock): Habit {
  if (!h.goal) return h
  const value = Math.max(0, roundAmount(amount))
  const amounts = { ...h.amounts }
  if (value > 0) amounts[day] = value
  else delete amounts[day]

  const completions = { ...h.completions }
  const completionTimes = { ...h.completionTimes }
  const wasDone = !!completions[day]
  if (value >= h.goal.target) {
    completions[day] = true
    if (!wasDone && day === clock.today) completionTimes[day] = clock.minutes
  } else {
    delete completions[day]
    delete completionTimes[day]
  }
  return { ...h, amounts, completions, completionTimes }
}

/**
 * Ticks a day on or off. For a measurable habit that means setting it to the
 * goal or clearing it, which is what tapping a day in the calendar does.
 */
export function toggleDay(h: Habit, day: string, clock: Clock): Habit {
  if (h.goal) return setAmount(h, day, h.completions[day] ? 0 : Math.max(h.goal.target, h.amounts[day] ?? 0), clock)
  const completions = { ...h.completions }
  const completionTimes = { ...h.completionTimes }
  if (completions[day]) {
    delete completions[day]
    delete completionTimes[day]
  } else {
    completions[day] = true
    // Only a tick on the day itself says when the habit is usually done.
    if (day === clock.today) completionTimes[day] = clock.minutes
  }
  return { ...h, completions, completionTimes }
}

/**
 * Switches a habit between done / not done and measurable, or changes its goal.
 * - To measurable: past done days count as the goal reached.
 * - Back to done / not done: days that reached the goal stay done.
 * - New target: done days are recomputed from the logged amounts.
 */
export function applyGoal(h: Habit, goal: Goal | undefined): Habit {
  if (!goal) return { ...h, goal: undefined, amounts: {} }

  const amounts = { ...h.amounts }
  if (!h.goal) {
    for (const day of Object.keys(h.completions)) amounts[day] = goal.target
  }
  const completions: Record<string, true> = {}
  const completionTimes: Record<string, number> = {}
  for (const [day, value] of Object.entries(amounts)) {
    if (value >= goal.target) {
      completions[day] = true
      if (h.completionTimes[day] !== undefined) completionTimes[day] = h.completionTimes[day]
    }
  }
  return { ...h, goal, amounts, completions, completionTimes }
}

/**
 * The amount usually logged on a day: yesterday's (most recent) amount at
 * first, then the median of the last 14 logged days once there are a few.
 * The median keeps one unusual day from skewing it. Null until anything is logged.
 */
export function usualAmount(h: Habit, today: string): number | null {
  if (!h.goal) return null
  const from = addDaysKey(today, -60)
  const recent = Object.entries(h.amounts)
    .filter(([day, v]) => day < today && day >= from && v > 0)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, USUAL_WINDOW)
    .map(([, v]) => v)
  if (recent.length === 0) return null
  if (recent.length < USUAL_MIN_DAYS) return recent[0]
  const sorted = [...recent].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  // Land on the habit's step so the scrubber starts on a reachable value.
  return roundAmount(Math.round(median / h.goal.step) * h.goal.step)
}

/** Total amount logged between two days, inclusive. */
export function amountBetween(h: Habit, from: string, to: string): number {
  let sum = 0
  for (const [day, v] of Object.entries(h.amounts)) if (day >= from && day <= to) sum += v
  return roundAmount(sum)
}

/** Fraction of the goal reached on days that fell short, for lighter heatmap dots. */
export function partialDays(h: Habit): Record<string, number> {
  const out: Record<string, number> = {}
  if (!h.goal) return out
  for (const [day, v] of Object.entries(h.amounts)) {
    if (v < h.goal.target) out[day] = v / h.goal.target
  }
  return out
}

/** Amounts keep at most two decimals (e.g. 2.5 km). */
export function roundAmount(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '')
}
