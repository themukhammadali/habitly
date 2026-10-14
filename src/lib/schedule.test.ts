import { describe, expect, it } from 'vitest'
import type { Schedule } from '../types'
import { bestStreak, completionRate, currentStreak, isSatisfied } from './schedule'

// 2026-10-12 is a Monday.
const done = (...keys: string[]) => Object.fromEntries(keys.map((k) => [k, true as const]))
const habit = (schedule: Schedule, completions: Record<string, true>, createdAt = '2026-09-28') => ({
  schedule,
  completions,
  createdAt,
})

describe('daily', () => {
  const h = habit({ kind: 'daily' }, done('2026-10-12', '2026-10-13', '2026-10-14'))
  it('counts consecutive days, today not yet done keeps the streak alive', () => {
    expect(currentStreak(h, '2026-10-14')).toBe(3)
    expect(currentStreak(h, '2026-10-15')).toBe(3)
    expect(currentStreak(h, '2026-10-16')).toBe(0)
  })
  it('rate ignores an unfinished today', () => {
    expect(completionRate(habit({ kind: 'daily' }, done('2026-10-14'), '2026-10-14'), '2026-10-15')).toBe(100)
  })
})

describe('specific weekdays', () => {
  // Mon, Wed, Fri
  const s: Schedule = { kind: 'weekdays', days: [0, 2, 4] }
  const h = habit(s, done('2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12'))
  it('skips days the habit is not due', () => {
    expect(currentStreak(h, '2026-10-13')).toBe(4) // Tuesday, nothing due
    expect(currentStreak(h, '2026-10-14')).toBe(4) // Wednesday, not done yet
    expect(currentStreak(h, '2026-10-15')).toBe(0) // Wednesday missed
  })
  it('best streak and rate only count due days', () => {
    expect(bestStreak(h, '2026-10-13')).toBe(4)
    expect(completionRate(habit(s, done('2026-10-12'), '2026-10-12'), '2026-10-13')).toBe(100)
  })
  it('a day that is not due is satisfied', () => {
    expect(isSatisfied(h, '2026-10-13')).toBe(true)
    expect(isSatisfied(h, '2026-10-14')).toBe(false)
  })
})

describe('weekly goal', () => {
  const s: Schedule = { kind: 'weekly', times: 3 }
  // Week of 5 Oct: 3 times. Week of 12 Oct: 1 so far.
  const h = habit(s, done('2026-10-05', '2026-10-06', '2026-10-08', '2026-10-12'))
  it('counts weeks, and an unfinished week does not break the streak', () => {
    expect(currentStreak(h, '2026-10-14')).toBe(1)
    expect(bestStreak(h, '2026-10-14')).toBe(1)
  })
  it('is satisfied once the weekly goal is met', () => {
    expect(isSatisfied(h, '2026-10-09')).toBe(true)
    expect(isSatisfied(h, '2026-10-14')).toBe(false)
  })
})
