// Learns when a habit is usually done from its completion times, so reminders
// can fire just before that time instead of at a fixed hour.

import { addDaysKey } from './dates'
import { weekday } from './schedule'

const DAY = 1440
/** How far back to look. Older habits of yours matter less than recent ones. */
const WINDOW_DAYS = 90
/** A completion's weight halves every this many days. */
const HALF_LIFE_DAYS = 14
/** Fewer samples than this and we don't trust the estimate. */
export const MIN_SAMPLES = 3
/** Weekday/weekend split only when the two typical times differ by at least this. */
const SPLIT_THRESHOLD_MIN = 45
/** Recent completions checked for a change of routine. */
const RECENT = 5
/** A routine change needs this many of the recent completions to agree. */
const RECENT_AGREE = 4
const MIN_LEAD = 15
const MAX_LEAD = 60

export interface Prediction {
  /** Typical completion time, minutes after midnight. */
  usual: number
  /** Typical deviation from `usual`, in minutes. */
  spread: number
  /** When to remind, minutes after midnight. */
  remindAt: number
  samples: number
  /** Whether weekday and weekend times were learned separately. */
  split: boolean
}

interface Sample {
  minutes: number
  weight: number
}

const isWeekend = (key: string) => weekday(key) >= 5

/**
 * Predicts the usual completion time for `day` from completion times recorded
 * before it. Returns null until there is enough data.
 */
export function predict(times: Record<string, number>, day: string): Prediction | null {
  const from = addDaysKey(day, -WINDOW_DAYS)
  const all: (Sample & { weekend: boolean; key: string })[] = []
  for (const [key, minutes] of Object.entries(times)) {
    if (key >= day || key < from) continue
    all.push({
      minutes,
      weight: 0.5 ** (daysBetween(key, day) / HALF_LIFE_DAYS),
      weekend: isWeekend(key),
      key,
    })
  }
  if (all.length < MIN_SAMPLES) return null

  // Learn weekdays and weekends separately when both have data and really differ.
  let samples = all
  let split = false
  const weekend = all.filter((s) => s.weekend)
  const weekdays = all.filter((s) => !s.weekend)
  if (weekend.length >= MIN_SAMPLES && weekdays.length >= MIN_SAMPLES) {
    const gap = circularDistance(circularMedian(weekend), circularMedian(weekdays))
    if (gap >= SPLIT_THRESHOLD_MIN) {
      samples = isWeekend(day) ? weekend : weekdays
      split = true
    }
  }

  let usual = circularMedian(samples)
  let spread = spreadAround(samples, usual)

  // If the last few completions agree on a new time, the routine changed:
  // follow it now rather than waiting for old data to fade out.
  const recent = [...samples].sort((a, b) => (a.key < b.key ? 1 : -1)).slice(0, RECENT)
  if (recent.length === RECENT) {
    const recentUsual = circularMedian(recent.map((s) => ({ ...s, weight: 1 })))
    const shift = circularDistance(recentUsual, usual)
    const agreeing = recent.filter((s) => circularDistance(s.minutes, recentUsual) < shift / 2)
    if (shift >= Math.max(SPLIT_THRESHOLD_MIN, 2 * spread) && agreeing.length >= RECENT_AGREE) {
      samples = agreeing
      usual = recentUsual
      spread = spreadAround(agreeing, usual)
    }
  }

  // Remind a bit before the usual time; earlier when the timing varies more.
  const lead = clamp(Math.round(10 + spread), MIN_LEAD, MAX_LEAD)
  const remindAt = mod(roundTo(usual - lead, 5), DAY)

  return { usual: Math.round(usual), spread: Math.round(spread), remindAt, samples: samples.length, split }
}

function spreadAround(samples: Sample[], center: number): number {
  return weightedMedian(
    samples.map((s) => ({ minutes: circularDistance(s.minutes, center), weight: s.weight })),
  )
}

/**
 * Weighted median of times of day. Times are unwrapped at the largest gap
 * between them, so 23:50 and 00:10 average to midnight, not noon.
 */
export function circularMedian(samples: Sample[]): number {
  const sorted = [...samples].sort((a, b) => a.minutes - b.minutes)
  let cut = 0
  let widest = sorted[0].minutes + DAY - sorted[sorted.length - 1].minutes
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].minutes - sorted[i - 1].minutes
    if (gap > widest) {
      widest = gap
      cut = i
    }
  }
  const unwrapped = sorted.map((s, i) => ({ ...s, minutes: i < cut ? s.minutes + DAY : s.minutes }))
  return mod(weightedMedian(unwrapped), DAY)
}

function weightedMedian(samples: Sample[]): number {
  const sorted = [...samples].sort((a, b) => a.minutes - b.minutes)
  const half = sorted.reduce((sum, s) => sum + s.weight, 0) / 2
  let acc = 0
  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i].weight
    if (acc > half) return sorted[i].minutes
    // Exactly on the halfway point: average with the next value.
    if (acc === half) return (sorted[i].minutes + sorted[i + 1].minutes) / 2
  }
  return sorted[sorted.length - 1].minutes
}

export function circularDistance(a: number, b: number): number {
  const d = Math.abs(mod(a, DAY) - mod(b, DAY))
  return Math.min(d, DAY - d)
}

function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((k) => {
    const [y, m, d] = k.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  })
  return Math.round((b - a) / 86400000)
}

const mod = (n: number, m: number) => ((n % m) + m) % m
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const roundTo = (n: number, step: number) => Math.floor(n / step) * step
