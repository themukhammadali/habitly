export type ThemePref = 'light' | 'dark' | 'system'

export interface Habit {
  id: string
  name: string
  description: string
  icon: string // emoji
  color: string // key into PALETTE
  createdAt: string // 'YYYY-MM-DD'
  /** map of 'YYYY-MM-DD' -> true for completed days */
  completions: Record<string, true>
  archived?: boolean
  order: number
}

export interface Settings {
  theme: ThemePref
}
