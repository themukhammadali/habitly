// Numbers for the Analytics tab. All rates use the same scheduling rules as
// streaks: only scheduled days (or weekly goals) count.

import type { Habit } from '../types'
import { addDaysKey, todayKey } from './dates'
import { currentStreak, isDue, progressBetween, streakUnit, weekStartKey, weekday, type Progress } from './schedule'

const pct = ({ due, done }: Progress) => (due ? Math.round((done / due) * 100) : null)

function sum(habits: Habit[], f: (h: Habit) => Progress): Progress {
  return habits.reduce(
    (acc, h) => {
      const p = f(h)
      return { due: acc.due + p.due, done: acc.done + p.done }
    },
    { due: 0, done: 0 },
  )
}

export interface WeekBar {
  /** Monday of the week. */
  start: string
  /** Completion rate, or null when nothing was scheduled. */
  rate: number | null
}

/** Completion rate for each of the last `weeks` weeks, oldest first, ending with this week. */
export function weeklyTrend(habits: Habit[], weeks = 12, today = todayKey()): WeekBar[] {
  const thisWeek = weekStartKey(today)
  const out: WeekBar[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDaysKey(thisWeek, -7 * i)
    out.push({ start, rate: pct(sum(habits, (h) => progressBetween(h, start, addDaysKey(start, 6), today))) })
  }
  return out
}

export interface WeekSummary {
  rate: number | null
  /** Change in percentage points from last week's rate. */
  change: number | null
  checkIns: number
  lastWeekCheckIns: number
}

/** This week so far, compared with last week. */
export function weekSummary(habits: Habit[], today = todayKey()): WeekSummary {
  const thisWeek = weekStartKey(today)
  const lastWeek = addDaysKey(thisWeek, -7)
  const rate = pct(sum(habits, (h) => progressBetween(h, thisWeek, today, today)))
  const lastRate = pct(sum(habits, (h) => progressBetween(h, lastWeek, addDaysKey(thisWeek, -1), today)))
  const count = (from: string, to: string) =>
    habits.reduce((n, h) => n + Object.keys(h.completions).filter((k) => k >= from && k <= to).length, 0)
  return {
    rate,
    change: rate !== null && lastRate !== null ? rate - lastRate : null,
    checkIns: count(thisWeek, today),
    lastWeekCheckIns: count(lastWeek, addDaysKey(thisWeek, -1)),
  }
}

/**
 * Completion rate per weekday (Monday first) over the last `weeks` weeks.
 * Weekly-goal habits are left out: they have no particular day.
 */
export function weekdayRates(habits: Habit[], weeks = 12, today = todayKey()): (number | null)[] {
  const due = [0, 0, 0, 0, 0, 0, 0]
  const done = [0, 0, 0, 0, 0, 0, 0]
  const from = addDaysKey(today, -7 * weeks + 1)
  for (const h of habits) {
    if (h.schedule.kind === 'weekly') continue
    let start = h.createdAt
    for (const k in h.completions) if (k < start) start = k
    for (let k = from < start ? start : from; k <= today; k = addDaysKey(k, 1)) {
      if (!isDue(h.schedule, k)) continue
      const d = weekday(k)
      if (h.completions[k]) done[d]++
      else if (k === today) continue
      due[d]++
    }
  }
  return due.map((n, i) => (n ? Math.round((done[i] / n) * 100) : null))
}

export const DAY_PARTS = [
  { key: 'morning', label: 'Morning', from: 5 * 60, to: 12 * 60 },
  { key: 'afternoon', label: 'Afternoon', from: 12 * 60, to: 17 * 60 },
  { key: 'evening', label: 'Evening', from: 17 * 60, to: 22 * 60 },
  { key: 'night', label: 'Night', from: 22 * 60, to: 5 * 60 },
] as const

/** How many check-ins in the last `days` days fell in each part of the day. */
export function timeOfDay(habits: Habit[], days = 90, today = todayKey()): number[] {
  const from = addDaysKey(today, -(days - 1))
  const counts = DAY_PARTS.map(() => 0)
  for (const h of habits) {
    for (const [k, t] of Object.entries(h.completionTimes)) {
      if (k < from || k > today) continue
      const i = DAY_PARTS.findIndex((p) => (p.from < p.to ? t >= p.from && t < p.to : t >= p.from || t < p.to))
      counts[i]++
    }
  }
  return counts
}

export interface HabitStat {
  habit: Habit
  /** Last 30 days, or null when nothing was scheduled yet. */
  rate: number | null
  /** Change from the 30 days before, in percentage points. */
  change: number | null
  streak: number
  streakUnit: 'day' | 'week'
}

/** Per-habit numbers, weakest first so slipping habits stand out. */
export function habitStats(habits: Habit[], today = todayKey()): HabitStat[] {
  return habits
    .map((h) => {
      const rate = pct(progressBetween(h, addDaysKey(today, -29), today, today))
      const before = pct(progressBetween(h, addDaysKey(today, -59), addDaysKey(today, -30), today))
      return {
        habit: h,
        rate,
        change: rate !== null && before !== null ? rate - before : null,
        streak: currentStreak(h, today),
        streakUnit: streakUnit(h.schedule),
      }
    })
    .sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101))
}
