export type ThemePref = 'light' | 'dark' | 'system'

/** When a habit is due. Weekdays use 0 = Monday … 6 = Sunday. */
export type Schedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] }
  | { kind: 'weekly'; times: number }

export interface Reminder {
  mode: 'off' | 'smart' | 'fixed'
  /** Minutes after midnight. Used for 'fixed', and by 'smart' until it has learned. */
  time: number
}

export interface Habit {
  id: string
  name: string
  description: string
  icon: string // key into ICONS
  color: string // key into PALETTE
  createdAt: string // 'YYYY-MM-DD'
  /** map of 'YYYY-MM-DD' -> true for completed days */
  completions: Record<string, true>
  /** 'YYYY-MM-DD' -> minutes after midnight, recorded only when ticked on the day itself */
  completionTimes: Record<string, number>
  schedule: Schedule
  reminder: Reminder
  archived?: boolean
  order: number
}

export interface Settings {
  theme: ThemePref
}
