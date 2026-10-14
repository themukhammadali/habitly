import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Habit, Settings } from './types'
import { todayKey } from './lib/dates'

interface State {
  habits: Habit[]
  settings: Settings
  addHabit: (h: Omit<Habit, 'id' | 'completions' | 'createdAt' | 'order'>) => void
  updateHabit: (id: string, patch: Partial<Habit>) => void
  deleteHabit: (id: string) => void
  toggleDay: (id: string, dayKey: string) => void
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

      toggleDay: (id, dayKey) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h
            const completions = { ...h.completions }
            if (completions[dayKey]) delete completions[dayKey]
            else completions[dayKey] = true
            return { ...h, completions }
          }),
        })),

      reorder: (ids) =>
        set((s) => ({
          habits: s.habits
            .map((h) => ({ ...h, order: ids.indexOf(h.id) }))
            .sort((a, b) => a.order - b.order),
        })),

      setTheme: (theme) =>
        set((s) => ({ settings: { ...s.settings, theme } })),

      replaceAll: (habits, settings) => set({ habits, settings }),
    }),
    { name: 'habitly-v1' },
  ),
)
