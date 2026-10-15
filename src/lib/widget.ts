// Bridge to the Android home screen widget. The app is the source of truth:
// it writes a snapshot of today's habits for the widget to draw, and applies
// taps the widget queued (with the time they happened) when it next runs.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import type { Habit } from '../types'
import { addDaysKey, todayKey } from './dates'
import { colorHex } from './palette'
import { doneInWeek, weekStartKey } from './schedule'
import { useStore } from '../store'

interface WidgetPlugin {
  update(options: { snapshot: string }): Promise<void>
  /** Taps queued by the widget since the last call, oldest first. Clears the queue. */
  takePendingActions(): Promise<{ actions: string }>
  addListener(event: 'widgetAction', listener: () => void): Promise<PluginListenerHandle>
  requestPin(options: { habitId: string }): Promise<{ requested: boolean }>
}

const Widget = registerPlugin<WidgetPlugin>('HabitlyWidget')
const native = () => Capacitor.getPlatform() === 'android'

/** Days of history sent for the widget's heatmap (26 weeks, more than a 3×2 widget can show). */
export const WIDGET_HISTORY_DAYS = 182

/** What the widget needs to draw today, and to roll over to tomorrow without the app. */
export interface WidgetSnapshot {
  date: string
  weekStart: string
  habits: {
    id: string
    name: string
    /** ARGB-free hex like #2fb170. */
    color: string
    icon: string
    done: boolean
    /** Scheduled weekdays (0 = Monday), or null for every day / weekly goals. */
    days: number[] | null
    /** Weekly goals: target per week and how many are done this week. */
    weekly: { times: number; done: number } | null
    /** Measurable habits: today's amount toward the goal. */
    goal: { target: number; unit: string; step: number; amount: number } | null
    /**
     * One value per day, oldest first, ending today: 1 done, 0 not done,
     * 0–1 part of a measurable goal, -1 before the habit existed.
     */
    history: number[]
  }[]
}

export function buildSnapshot(habits: Habit[], today = todayKey()): WidgetSnapshot {
  return {
    date: today,
    weekStart: weekStartKey(today),
    habits: habits
      .filter((h) => !h.archived)
      .sort((a, b) => a.order - b.order)
      .map((h) => ({
        id: h.id,
        name: h.name,
        color: colorHex(h.color),
        icon: h.icon,
        done: !!h.completions[today],
        days: h.schedule.kind === 'weekdays' ? h.schedule.days : null,
        weekly: h.schedule.kind === 'weekly' ? { times: h.schedule.times, done: doneInWeek(h.completions, today) } : null,
        goal: h.goal ? { ...h.goal, amount: h.amounts[today] ?? 0 } : null,
        history: history(h, today),
      })),
  }
}

function history(h: Habit, today: string): number[] {
  let start = h.createdAt
  for (const k in h.completions) if (k < start) start = k
  const out: number[] = []
  for (let i = WIDGET_HISTORY_DAYS - 1; i >= 0; i--) {
    const day = addDaysKey(today, -i)
    if (day < start) out.push(-1)
    else if (h.completions[day]) out.push(1)
    else if (h.goal && h.amounts[day]) out.push(Math.round((h.amounts[day] / h.goal.target) * 100) / 100)
    else out.push(0)
  }
  return out
}

export interface WidgetAction {
  habitId: string
  /** 'toggle' ticks a done / not done habit; 'add' adds `delta` to a measurable one. */
  type: 'toggle' | 'add'
  delta?: number
  /** The day and time on the phone when the widget was tapped. */
  day: string
  minutes: number
}

/** Applies queued widget taps to the store. Returns how many were applied. */
export function applyWidgetActions(actions: WidgetAction[]): number {
  const store = useStore.getState()
  let applied = 0
  for (const a of actions) {
    const h = useStore.getState().habits.find((x) => x.id === a.habitId)
    if (!h) continue
    // Only the time of a tap on that same day says when the habit is done.
    const at = { today: a.day, minutes: a.minutes }
    if (a.type === 'add' && h.goal) {
      store.setAmount(h.id, a.day, (h.amounts[a.day] ?? 0) + (a.delta ?? h.goal.step), at)
    } else if (a.type === 'toggle' && !h.goal) {
      store.toggleDay(h.id, a.day, at)
    } else {
      continue
    }
    applied++
  }
  return applied
}

async function pullActions() {
  const { actions } = await Widget.takePendingActions()
  const list = JSON.parse(actions || '[]') as WidgetAction[]
  if (list.length) applyWidgetActions(list)
}

let syncing: Promise<void> = Promise.resolve()

/** Sends the current habits to the widget. Calls are serialized. */
export function syncWidget(habits: Habit[]): Promise<void> {
  if (!native()) return Promise.resolve()
  syncing = syncing
    .then(() => Widget.update({ snapshot: JSON.stringify(buildSnapshot(habits)) }))
    .catch((e) => console.warn('Widget sync failed', e))
  return syncing
}

/**
 * Applies taps made on the widget while the app was closed, and listens for
 * taps made while it's open. Call once at startup.
 */
export async function initWidget() {
  if (!native()) return
  try {
    await pullActions()
    await Widget.addListener('widgetAction', () => {
      pullActions().catch((e) => console.warn('Widget actions failed', e))
    })
  } catch (e) {
    console.warn('Widget unavailable', e)
  }
}

export const widgetSupported = native

/**
 * Asks the launcher to add a widget for this habit. False if it can't, so the
 * app can explain how to add one by hand instead.
 */
export async function requestWidgetPin(habitId: string): Promise<boolean> {
  if (!native()) return false
  try {
    // Make sure the widget can find the habit as soon as it's placed.
    await syncWidget(useStore.getState().habits)
    return (await Widget.requestPin({ habitId })).requested
  } catch {
    return false
  }
}

/** For the app's resume handler: taps made while the app was in the background. */
export const pullWidgetActions = () => (native() ? pullActions().catch(() => {}) : Promise.resolve())
