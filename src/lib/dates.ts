// All dates are handled as local-time 'YYYY-MM-DD' keys.

export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toKey(new Date())
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function addDaysKey(key: string, n: number): string {
  return toKey(addDays(fromKey(key), n))
}

/** Build an array of the last `count` day-keys ending today (oldest first). */
export function lastNDays(count: number, end = new Date()): string[] {
  const out: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    out.push(toKey(addDays(end, -i)))
  }
  return out
}

/** Current streak: consecutive completed days ending today (or yesterday). */
export function currentStreak(completions: Record<string, true>): number {
  let streak = 0
  let cursor = todayKey()
  // If today isn't done yet, the streak can still be "alive" from yesterday.
  if (!completions[cursor]) {
    cursor = addDaysKey(cursor, -1)
    if (!completions[cursor]) return 0
  }
  while (completions[cursor]) {
    streak++
    cursor = addDaysKey(cursor, -1)
  }
  return streak
}

/** Longest run of consecutive completed days, ever. */
export function bestStreak(completions: Record<string, true>): number {
  const keys = Object.keys(completions).sort()
  if (keys.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < keys.length; i++) {
    if (addDaysKey(keys[i - 1], 1) === keys[i]) {
      run++
    } else {
      run = 1
    }
    if (run > best) best = run
  }
  return best
}

export function completedCount(completions: Record<string, true>): number {
  return Object.keys(completions).length
}

/** Completion rate over the window since createdAt (capped at 365 days). */
export function completionRate(
  completions: Record<string, true>,
  createdAt: string,
): number {
  const start = fromKey(createdAt)
  const today = new Date()
  const msPerDay = 86400000
  const totalDays = Math.min(
    365,
    Math.floor((today.getTime() - start.getTime()) / msPerDay) + 1,
  )
  if (totalDays <= 0) return 0
  const windowStart = toKey(addDays(today, -(totalDays - 1)))
  let done = 0
  for (const k of Object.keys(completions)) {
    if (k >= windowStart) done++
  }
  return Math.round((done / totalDays) * 100)
}

export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
