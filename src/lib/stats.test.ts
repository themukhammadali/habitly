import { describe, expect, it } from 'vitest'
import type { Habit } from '../types'
import { habitStats, timeOfDay, weekSummary, weekdayRates, weeklyTrend } from './stats'

// Wednesday 14 Oct 2026. Week started Monday 12 Oct.
const TODAY = '2026-10-14'

function habit(patch: Partial<Habit>): Habit {
  return {
    id: Math.random().toString(36),
    name: 'h',
    description: '',
    icon: 'book',
    color: 'emerald',
    createdAt: '2026-10-05',
    completions: {},
    amounts: {},
    completionTimes: {},
    schedule: { kind: 'daily' },
    reminder: { mode: 'off', time: 540 },
    order: 0,
    ...patch,
  }
}
const done = (...keys: string[]) => Object.fromEntries(keys.map((k) => [k, true as const]))

describe('stats', () => {
  // Last week (5–11 Oct) all 7 days; this week Mon and Tue done, today not yet.
  const daily = habit({
    completions: done('2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'),
    completionTimes: { '2026-10-12': 7 * 60, '2026-10-13': 23 * 60 },
  })

  it('compares this week with last week, not counting an unfinished today', () => {
    const s = weekSummary([daily], TODAY)
    expect(s.rate).toBe(100)
    expect(s.change).toBe(0)
    expect(s.checkIns).toBe(2)
    expect(s.lastWeekCheckIns).toBe(7)
  })

  it('weekly trend has no rate before the habit existed', () => {
    const trend = weeklyTrend([daily], 3, TODAY)
    expect(trend.map((w) => w.rate)).toEqual([null, 100, 100])
  })

  it('weekday rates skip weekly-goal habits', () => {
    const rates = weekdayRates([daily, habit({ schedule: { kind: 'weekly', times: 3 } })], 2, TODAY)
    expect(rates[0]).toBe(100) // Mondays
    expect(rates[2]).toBe(100) // Wednesday 7 Oct done; today not counted yet
  })

  it('buckets check-ins by part of day, with night wrapping midnight', () => {
    expect(timeOfDay([daily], 90, TODAY)).toEqual([1, 0, 0, 1])
  })

  it('lists the weakest habit first', () => {
    const weak = habit({ completions: done('2026-10-12') })
    const stats = habitStats([daily, weak], TODAY)
    expect(stats[0].habit).toBe(weak)
    expect(stats[1].rate).toBe(100)
  })
})
