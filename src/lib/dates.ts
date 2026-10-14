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

export function minutesOfDay(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes()
}

export function formatTime(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return new Date(2000, 0, 1, Math.floor(m / 60), m % 60).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
