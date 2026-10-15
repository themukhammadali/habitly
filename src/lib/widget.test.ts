import { beforeEach, describe, expect, it, vi } from 'vitest'

// The store persists to localStorage; give it an in-memory one under Node.
vi.hoisted(() => {
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
  })
})
import type { Habit } from '../types'
import { useStore } from '../store'
import { applyWidgetActions, buildSnapshot } from './widget'

const TODAY = '2026-10-14' // Wednesday

function habit(patch: Partial<Habit>): Habit {
  return {
    id: 'h',
    name: 'Read',
    description: '',
    icon: 'book',
    color: 'violet',
    createdAt: '2026-10-01',
    completions: {},
    amounts: {},
    completionTimes: {},
    schedule: { kind: 'daily' },
    reminder: { mode: 'off', time: 540 },
    order: 0,
    ...patch,
  }
}

describe('buildSnapshot', () => {
  it('describes today for each active habit, in order', () => {
    const snap = buildSnapshot(
      [
        habit({ id: 'b', order: 1, goal: { target: 8, unit: 'glasses', step: 1 }, amounts: { [TODAY]: 3 } }),
        habit({ id: 'a', order: 0, schedule: { kind: 'weekdays', days: [0, 2] }, completions: { [TODAY]: true } }),
        habit({ id: 'c', archived: true }),
        habit({ id: 'd', order: 2, schedule: { kind: 'weekly', times: 3 }, completions: { '2026-10-12': true } }),
      ],
      TODAY,
    )
    expect(snap.date).toBe(TODAY)
    expect(snap.weekStart).toBe('2026-10-12')
    expect(snap.habits.map((h) => h.id)).toEqual(['a', 'b', 'd'])
    expect(snap.habits[0]).toMatchObject({ done: true, days: [0, 2], goal: null, color: '#8b6fd6' })
    expect(snap.habits[1].goal).toEqual({ target: 8, unit: 'glasses', step: 1, amount: 3 })
    expect(snap.habits[2].weekly).toEqual({ times: 3, done: 1 })
  })
})

describe('applyWidgetActions', () => {
  beforeEach(() => {
    useStore.setState({
      habits: [habit({ id: 'read' }), habit({ id: 'water', goal: { target: 8, unit: 'glasses', step: 1 }, amounts: { [TODAY]: 7 } })],
    })
  })

  it('applies taps in order, with the time they were made', () => {
    const n = applyWidgetActions([
      { habitId: 'read', type: 'toggle', day: TODAY, minutes: 7 * 60 },
      { habitId: 'water', type: 'add', delta: 1, day: TODAY, minutes: 8 * 60 },
      { habitId: 'water', type: 'add', delta: 1, day: TODAY, minutes: 9 * 60 },
    ])
    expect(n).toBe(3)
    const [read, water] = useStore.getState().habits
    expect(read.completions[TODAY]).toBe(true)
    expect(read.completionTimes[TODAY]).toBe(7 * 60)
    expect(water.amounts[TODAY]).toBe(9)
    // Goal reached on the 8:00 tap, which is what smart reminders learn from.
    expect(water.completionTimes[TODAY]).toBe(8 * 60)
  })

  it('skips taps for deleted habits or that no longer fit the habit', () => {
    const n = applyWidgetActions([
      { habitId: 'gone', type: 'toggle', day: TODAY, minutes: 0 },
      { habitId: 'read', type: 'add', delta: 1, day: TODAY, minutes: 0 },
    ])
    expect(n).toBe(0)
  })
})
