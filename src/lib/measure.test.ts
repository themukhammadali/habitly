import { describe, expect, it } from 'vitest'
import type { Habit } from '../types'
import { applyGoal, setAmount, toggleDay, usualAmount } from './measure'

const clock = { today: '2026-10-14', minutes: 600 }

function habit(patch: Partial<Habit> = {}): Habit {
  return {
    id: 'h',
    name: 'Water',
    description: '',
    icon: 'glass-water',
    color: 'blue',
    createdAt: '2026-09-01',
    completions: {},
    amounts: {},
    completionTimes: {},
    schedule: { kind: 'daily' },
    reminder: { mode: 'off', time: 540 },
    order: 0,
    goal: { target: 8, unit: 'glasses', step: 1 },
    ...patch,
  }
}

describe('setAmount', () => {
  it('marks the day done once the goal is reached, and records when', () => {
    let h = setAmount(habit(), clock.today, 5, clock)
    expect(h.completions[clock.today]).toBeUndefined()
    expect(h.amounts[clock.today]).toBe(5)
    h = setAmount(h, clock.today, 8, { ...clock, minutes: 700 })
    expect(h.completions[clock.today]).toBe(true)
    expect(h.completionTimes[clock.today]).toBe(700)
    // Going further keeps the time the goal was first reached.
    h = setAmount(h, clock.today, 9, { ...clock, minutes: 800 })
    expect(h.completionTimes[clock.today]).toBe(700)
  })

  it('un-marks the day when the amount drops below the goal, and never goes negative', () => {
    let h = setAmount(habit(), clock.today, 8, clock)
    h = setAmount(h, clock.today, 7, clock)
    expect(h.completions[clock.today]).toBeUndefined()
    expect(h.completionTimes[clock.today]).toBeUndefined()
    h = setAmount(h, clock.today, -3, clock)
    expect(h.amounts[clock.today]).toBeUndefined()
  })

  it('does not record a time for past days', () => {
    const h = setAmount(habit(), '2026-10-13', 8, clock)
    expect(h.completions['2026-10-13']).toBe(true)
    expect(h.completionTimes['2026-10-13']).toBeUndefined()
  })
})

describe('toggleDay', () => {
  it('fills a measurable day to the goal, or clears it', () => {
    let h = toggleDay(habit(), '2026-10-13', clock)
    expect(h.amounts['2026-10-13']).toBe(8)
    h = toggleDay(h, '2026-10-13', clock)
    expect(h.amounts['2026-10-13']).toBeUndefined()
  })

  it('ticks done / not done habits as before', () => {
    const h = toggleDay(habit({ goal: undefined }), clock.today, clock)
    expect(h.completions[clock.today]).toBe(true)
    expect(h.completionTimes[clock.today]).toBe(600)
  })
})

describe('applyGoal', () => {
  it('turns past done days into the goal amount', () => {
    const h = applyGoal(habit({ goal: undefined, completions: { '2026-10-13': true } }), { target: 20, unit: 'pages', step: 5 })
    expect(h.amounts['2026-10-13']).toBe(20)
    expect(h.completions['2026-10-13']).toBe(true)
  })

  it('recomputes done days when the target changes', () => {
    let h = setAmount(habit(), '2026-10-12', 6, clock)
    h = setAmount(h, '2026-10-13', 8, clock)
    h = applyGoal(h, { target: 6, unit: 'glasses', step: 1 })
    expect(Object.keys(h.completions).sort()).toEqual(['2026-10-12', '2026-10-13'])
    h = applyGoal(h, { target: 10, unit: 'glasses', step: 1 })
    expect(h.completions).toEqual({})
    expect(h.amounts['2026-10-13']).toBe(8)
  })

  it('back to done / not done keeps done days', () => {
    const h = applyGoal(setAmount(habit(), '2026-10-13', 8, clock), undefined)
    expect(h.goal).toBeUndefined()
    expect(h.completions['2026-10-13']).toBe(true)
  })
})

describe('usualAmount', () => {
  it('starts from the most recent day, then uses the median', () => {
    const amounts: Record<string, number> = { '2026-10-13': 5 }
    expect(usualAmount(habit({ amounts }), clock.today)).toBe(5)
    Object.assign(amounts, { '2026-10-10': 6, '2026-10-11': 6, '2026-10-12': 15 })
    // 5, 6, 6, 15 → median 6; the 15-glass day barely matters.
    expect(usualAmount(habit({ amounts }), clock.today)).toBe(6)
  })

  it('ignores today, and is null with no history', () => {
    expect(usualAmount(habit({ amounts: { [clock.today]: 3 } }), clock.today)).toBeNull()
  })

  it('rounds to the step', () => {
    const amounts = { '2026-10-11': 18, '2026-10-12': 22, '2026-10-13': 21 }
    expect(usualAmount(habit({ amounts, goal: { target: 20, unit: 'pages', step: 5 } }), clock.today)).toBe(20)
  })
})
