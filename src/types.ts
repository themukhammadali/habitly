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

/** A daily amount to reach, for habits measured in more than done / not done. */
export interface Goal {
  /** Amount that counts the day as done ("at least"). */
  target: number
  /** Free text, e.g. "glasses", "pages", "minutes". */
  unit: string
  /** How much one + or − changes the amount. */
  step: number
}

export interface Habit {
  id: string
  name: string
  description: string
  icon: string // key into ICONS
  color: string // key into PALETTE
  createdAt: string // 'YYYY-MM-DD'
  /** map of 'YYYY-MM-DD' -> true for completed days (for measurable habits: amount reached the goal) */
  completions: Record<string, true>
  /** Measurable habits only. Undefined means a done / not done habit. */
  goal?: Goal
  /** 'YYYY-MM-DD' -> amount logged that day (measurable habits only) */
  amounts: Record<string, number>
  /** 'YYYY-MM-DD' -> minutes after midnight, recorded only when ticked (or the goal reached) on the day itself */
  completionTimes: Record<string, number>
  schedule: Schedule
  reminder: Reminder
  archived?: boolean
  order: number
}

export interface Settings {
  theme: ThemePref
}
