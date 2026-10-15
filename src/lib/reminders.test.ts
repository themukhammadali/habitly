import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Habit } from '../types'
import { planReminders } from './reminders'

// Wednesday 14 Oct 2026, 08:00 local time.
const NOW = new Date(2026, 9, 14, 8, 0)

function habit(patch: Partial<Habit>): Habit {
  return {
    id: 'h',
    name: 'Read',
    description: '',
    icon: 'book',
    color: 'emerald',
    createdAt: '2026-09-01',
    completions: {},
    amounts: {},
    completionTimes: {},
    schedule: { kind: 'daily' },
    reminder: { mode: 'fixed', time: 9 * 60 },
    order: 0,
    ...patch,
  }
}

describe('planReminders', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('plans one reminder a day for a week at the fixed time', () => {
    const plan = planReminders([habit({})], NOW)
    expect(plan).toHaveLength(7)
    expect(plan[0].day).toBe('2026-10-14')
    expect(plan[0].at.getHours()).toBe(9)
  })

  it('skips days already done, and today once the time has passed', () => {
    const doneToday = planReminders([habit({ completions: { '2026-10-14': true } })], NOW)
    expect(doneToday[0].day).toBe('2026-10-15')
    const early = planReminders([habit({ reminder: { mode: 'fixed', time: 7 * 60 } })], NOW)
    expect(early[0].day).toBe('2026-10-15')
  })

  it('only plans scheduled days', () => {
    // Mondays only: next one is 19 Oct.
    const plan = planReminders([habit({ schedule: { kind: 'weekdays', days: [0] } })], NOW)
    expect(plan.map((r) => r.day)).toEqual(['2026-10-19'])
  })

  it('stops for the week once a weekly goal is met', () => {
    const plan = planReminders(
      [habit({ schedule: { kind: 'weekly', times: 2 }, completions: { '2026-10-12': true, '2026-10-13': true } })],
      NOW,
    )
    // Rest of this week (to Sun 18th) skipped; resumes Monday 19th.
    expect(plan[0].day).toBe('2026-10-19')
  })

  it('ignores archived habits and reminders that are off', () => {
    expect(planReminders([habit({ archived: true }), habit({ reminder: { mode: 'off', time: 540 } })], NOW)).toEqual([])
  })

  it('smart reminders use the learned time once there is enough history', () => {
    const times = { '2026-10-10': 1200, '2026-10-11': 1205, '2026-10-12': 1195, '2026-10-13': 1200 }
    const completions = Object.fromEntries(Object.keys(times).map((k) => [k, true as const]))
    const plan = planReminders([habit({ reminder: { mode: 'smart', time: 540 }, completions, completionTimes: times })], NOW)
    const minutes = plan[0].at.getHours() * 60 + plan[0].at.getMinutes()
    expect(minutes).toBeLessThan(1200)
    expect(minutes).toBeGreaterThanOrEqual(1140)
    expect(plan[0].body).toMatch(/usually/)
  })
})
