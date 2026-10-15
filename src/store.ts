import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Habit, Settings } from './types'
import { minutesOfDay, todayKey } from './lib/dates'
import { normalizeHabit } from './lib/migrate'
import { applyGoal, setAmount as setHabitAmount, toggleDay as toggleHabitDay, type Clock } from './lib/measure'

const clock = () => ({ today: todayKey(), minutes: minutesOfDay() })

export type NewHabit = Pick<Habit, 'name' | 'description' | 'icon' | 'color' | 'schedule' | 'reminder' | 'goal'>

interface State {
  habits: Habit[]
  settings: Settings
  addHabit: (h: NewHabit) => void
  updateHabit: (id: string, patch: Partial<Habit>) => void
  deleteHabit: (id: string) => void
  /** Puts back a habit removed by deleteHabit, at its old position. */
  restoreHabit: (h: Habit) => void
  /** `at` is when it happened, if not now (e.g. a tap on the widget while the app was closed). */
  toggleDay: (id: string, dayKey: string, at?: Clock) => void
  /** Measurable habits: set the amount logged on a day. */
  setAmount: (id: string, dayKey: string, amount: number, at?: Clock) => void
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
              amounts: {},
              completionTimes: {},
              order: s.habits.length,
            },
          ],
        })),

      updateHabit: (id, patch) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h
            const next = { ...h, ...patch }
            // A changed goal (or switching measurable on/off) re-derives done days.
            return 'goal' in patch && JSON.stringify(patch.goal) !== JSON.stringify(h.goal)
              ? applyGoal({ ...next, goal: h.goal }, patch.goal)
              : next
          }),
        })),

      deleteHabit: (id) =>
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      restoreHabit: (habit) =>
        set((s) => ({
          habits: [...s.habits.filter((h) => h.id !== habit.id), habit].sort(
            (a, b) => a.order - b.order,
          ),
        })),

      toggleDay: (id, dayKey, at) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? toggleHabitDay(h, dayKey, at ?? clock()) : h)),
        })),

      setAmount: (id, dayKey, amount, at) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? setHabitAmount(h, dayKey, amount, at ?? clock()) : h)),
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
      version: 2,
      // v1: emoji icons became icon keys; schedules, reminders and completion times were added.
      // v2: measurable habits (goal, amounts). normalizeHabit upgrades any older version.
      migrate: (persisted, version) => {
        const state = persisted as { habits?: unknown[]; settings?: Settings }
        if (version < 2) {
          state.habits = (state.habits ?? []).map((h, i) => normalizeHabit(h, i))
        }
        return state as State
      },
    },
  ),
)
