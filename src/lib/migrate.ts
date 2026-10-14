import type { Habit, Reminder, Schedule } from '../types'
import { todayKey } from './dates'
import { normalizeIcon } from './icons'
import { PALETTE } from './palette'

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/
export const DEFAULT_REMINDER: Reminder = { mode: 'off', time: 9 * 60 }

/**
 * Turns a stored or imported habit of any version into a valid current Habit.
 * Throws if it lacks an id or name, since there's nothing sensible to fill in.
 */
export function normalizeHabit(raw: unknown, index: number): Habit {
  const x = (raw ?? {}) as Partial<Habit> & Record<string, unknown>
  if (typeof x.id !== 'string' || typeof x.name !== 'string') {
    throw new Error('This backup is damaged and cannot be imported.')
  }

  const completions: Record<string, true> = {}
  for (const [day, done] of Object.entries(x.completions ?? {})) {
    if (done === true && DAY_KEY.test(day)) completions[day] = true
  }
  const completionTimes: Record<string, number> = {}
  for (const [day, t] of Object.entries(x.completionTimes ?? {})) {
    if (completions[day] && Number.isInteger(t) && t >= 0 && t < 1440) completionTimes[day] = t
  }

  return {
    id: x.id,
    name: x.name,
    description: typeof x.description === 'string' ? x.description : '',
    icon: normalizeIcon(x.icon),
    color: PALETTE.some((c) => c.key === x.color) ? (x.color as string) : PALETTE[0].key,
    createdAt: typeof x.createdAt === 'string' && DAY_KEY.test(x.createdAt) ? x.createdAt : todayKey(),
    completions,
    completionTimes,
    schedule: normalizeSchedule(x.schedule),
    reminder: normalizeReminder(x.reminder),
    archived: x.archived === true ? true : undefined,
    order: typeof x.order === 'number' ? x.order : index,
  }
}

function normalizeSchedule(raw: unknown): Schedule {
  const s = raw as Partial<Schedule> | undefined
  if (s?.kind === 'weekdays' && Array.isArray(s.days)) {
    const days = [...new Set(s.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
    if (days.length > 0 && days.length < 7) return { kind: 'weekdays', days }
  }
  const times = s?.kind === 'weekly' ? s.times : undefined
  if (typeof times === 'number' && Number.isInteger(times) && times >= 1 && times <= 6) {
    return { kind: 'weekly', times }
  }
  return { kind: 'daily' }
}

function normalizeReminder(raw: unknown): Reminder {
  const r = raw as Partial<Reminder> | undefined
  const mode = r?.mode === 'smart' || r?.mode === 'fixed' ? r.mode : 'off'
  const time = Number.isInteger(r?.time) && r!.time! >= 0 && r!.time! < 1440 ? r!.time! : DEFAULT_REMINDER.time
  return { mode, time }
}
