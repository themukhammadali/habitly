import { describe, expect, it } from 'vitest'
import { circularDistance, predict } from './predict'
import { addDaysKey } from './dates'
import { weekday } from './schedule'

const START = '2026-01-05' // a Monday

/** Seeded RNG so the simulated users are the same on every run. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
}
function gaussian(r: () => number) {
  return Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r())
}

interface Persona {
  name: string
  /** Typical time for this day index and date. */
  usual: (i: number, key: string) => number
  noise: number
  /** Chance a day is an off-pattern outlier (anywhere from 8:00 to 23:00). */
  outliers: number
  /** Chance the habit is skipped that day. */
  skip: number
}

const PERSONAS: Persona[] = [
  { name: 'consistent morning', usual: () => 7 * 60 + 30, noise: 10, outliers: 0.05, skip: 0.1 },
  {
    name: 'weekday 7:00 / weekend 10:00',
    usual: (_, k) => (weekday(k) >= 5 ? 600 : 420),
    noise: 15,
    outliers: 0.05,
    skip: 0.1,
  },
  { name: 'messy evening', usual: () => 20 * 60, noise: 45, outliers: 0.15, skip: 0.25 },
  { name: 'around midnight', usual: () => 0, noise: 20, outliers: 0.05, skip: 0.1 },
  {
    name: 'moves from 8:00 to 6:00 on day 60',
    usual: (i) => (i < 60 ? 480 : 360),
    noise: 10,
    outliers: 0.05,
    skip: 0.1,
  },
]

function simulate(p: Persona, days: number, seed: number) {
  const r = rng(seed)
  const times: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const key = addDaysKey(START, i)
    if (r() < p.skip) continue
    const t = r() < p.outliers ? 480 + r() * 900 : p.usual(i, key) + gaussian(r) * p.noise
    times[key] = ((Math.round(t) % 1440) + 1440) % 1440
  }
  return times
}

/** Replays a history day by day, predicting each day from the days before it. */
function backtest(p: Persona, seed: number) {
  const times = simulate(p, 120, seed)
  const errors: number[] = []
  let remindedBefore = 0
  let useful = 0
  let n = 0
  for (const [key, actual] of Object.entries(times)) {
    const pred = predict(times, key)
    if (!pred) continue
    n++
    errors.push(circularDistance(pred.usual, p.usual(daysFrom(key), key)))
    // Reminder is useful if it fires before the habit was done, at most 90 min before.
    const gap = ((actual - pred.remindAt) % 1440 + 1440) % 1440
    if (gap > 0 && gap <= 720) remindedBefore++
    if (gap > 0 && gap <= 90) useful++
  }
  errors.sort((a, b) => a - b)
  return {
    medianError: errors[Math.floor(errors.length / 2)],
    p90Error: errors[Math.floor(errors.length * 0.9)],
    beforeRate: remindedBefore / n,
    usefulRate: useful / n,
  }
}

function daysFrom(key: string) {
  return Math.round((Date.parse(key) - Date.parse(START)) / 86400000)
}

describe('predict', () => {
  it('needs a few completions before predicting', () => {
    expect(predict({ '2026-01-05': 450, '2026-01-06': 455 }, '2026-01-07')).toBeNull()
    expect(predict({ '2026-01-05': 450, '2026-01-06': 455, '2026-01-07': 445 }, '2026-01-08')).not.toBeNull()
  })

  it('ignores the target day and anything after it', () => {
    const t = { '2026-01-05': 450, '2026-01-06': 450, '2026-01-07': 450, '2026-01-08': 1200 }
    expect(predict(t, '2026-01-08')!.usual).toBe(450)
  })

  it('reminds a little before a morning routine', () => {
    const t = { '2026-01-05': 450, '2026-01-06': 455, '2026-01-07': 445, '2026-01-08': 450 }
    const p = predict(t, '2026-01-09')!
    expect(p.usual).toBe(450)
    expect(p.remindAt).toBeLessThan(450)
    expect(p.remindAt).toBeGreaterThanOrEqual(450 - 60)
  })

  it('handles times on both sides of midnight', () => {
    const t = { '2026-01-05': 1430, '2026-01-06': 10, '2026-01-07': 1435, '2026-01-08': 5 }
    const p = predict(t, '2026-01-09')!
    expect(circularDistance(p.usual, 0)).toBeLessThanOrEqual(10)
  })

  it('is not thrown off by a single late night', () => {
    const t = { '2026-01-05': 450, '2026-01-06': 455, '2026-01-07': 1380, '2026-01-08': 445, '2026-01-09': 450 }
    expect(predict(t, '2026-01-10')!.usual).toBeLessThan(460)
  })

  for (const [i, p] of PERSONAS.entries()) {
    it(`backtest: ${p.name}`, () => {
      const r = backtest(p, 42 + i)
      // eslint-disable-next-line no-console
      console.log(
        `${p.name.padEnd(36)} median error ${String(r.medianError).padStart(3)} min, ` +
          `p90 ${String(r.p90Error).padStart(3)} min, reminder before habit ${(r.beforeRate * 100).toFixed(0)}%, ` +
          `within 90 min before ${(r.usefulRate * 100).toFixed(0)}%`,
      )
      expect(r.medianError).toBeLessThanOrEqual(15)
      expect(r.p90Error).toBeLessThanOrEqual(p.noise >= 30 ? 60 : 45)
      expect(r.beforeRate).toBeGreaterThan(p.noise >= 30 ? 0.7 : 0.8)
    })
  }
})
