import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Habit, Settings } from './types'
import { minutesOfDay, todayKey } from './lib/dates'
import { normalizeHabit } from './lib/migrate'

export type NewHabit = Pick<Habit, 'name' | 'description' | 'icon' | 'color' | 'schedule' | 'reminder'>

interface State {
  habits: Habit[]
  settings: Settings
  addHabit: (h: NewHabit) => void
  updateHabit: (id: string, patch: Partial<Habit>) => void
  deleteHabit: (id: string) => void
  /** Puts back a habit removed by deleteHabit, at its old position. */
  restoreHabit: (h: Habit) => void
  toggleDay: (id: string, dayKey: string) => void
  setArchived: (id: string, archived: boolean) => void
  reorder: (ids: string[]) => void
  setTheme: (theme: Settings['theme']) => void
  replaceAll: (habits: Habit[], settings: Settings) => void
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      habits: [],
      settings: { theme: 'system' },

      addHabit: (h) =>
        set((s) => ({
          habits: [
            ...s.habits,
            {
              ...h,
              id: uid(),
              createdAt: todayKey(),
              completions: {},
              completionTimes: {},
              order: s.habits.length,
            },
          ],
        })),

      updateHabit: (id, patch) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),

      deleteHabit: (id) =>
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      restoreHabit: (habit) =>
        set((s) => ({
          habits: [...s.habits.filter((h) => h.id !== habit.id), habit].sort(
            (a, b) => a.order - b.order,
          ),
        })),

      toggleDay: (id, dayKey) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h
            const completions = { ...h.completions }
            const completionTimes = { ...h.completionTimes }
            if (completions[dayKey]) {
              delete completions[dayKey]
              delete completionTimes[dayKey]
            } else {
              completions[dayKey] = true
              // Only a tick on the day itself says when the habit is usually done.
              if (dayKey === todayKey()) completionTimes[dayKey] = minutesOfDay()
            }
            return { ...h, completions, completionTimes }
          }),
        })),

      setArchived: (id, archived) =>
        set((s) => ({
          habits: s.habits.map((h) =>
            h.id === id ? { ...h, archived: archived || undefined } : h,
          ),
        })),

      reorder: (ids) =>
        set((s) => ({
          habits: s.habits
            .map((h) => {
              const i = ids.indexOf(h.id)
              return i === -1 ? h : { ...h, order: i }
            })
            .sort((a, b) => a.order - b.order),
        })),

      setTheme: (theme) =>
        set((s) => ({ settings: { ...s.settings, theme } })),

      replaceAll: (habits, settings) => set({ habits, settings }),
    }),
    {
      name: 'habitly-v1',
      version: 1,
      // v0 → v1: emoji icons became icon keys; schedules, reminders and completion times were added.
      migrate: (persisted, version) => {
        const state = persisted as { habits?: unknown[]; settings?: Settings }
        if (version < 1) {
          state.habits = (state.habits ?? []).map((h, i) => normalizeHabit(h, i))
        }
        return state as State
      },
    },
  ),
)
