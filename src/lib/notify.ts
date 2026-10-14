// Native (Android) side of reminders. On the web these are no-ops: browsers
// can't reliably show scheduled notifications while the page is closed.

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { Habit } from '../types'
import { planReminders } from './reminders'

const ACTION_TYPE = 'habit'
const ACTION_DONE = 'done'

export const remindersSupported = () => Capacitor.isNativePlatform()

/** Asks for notification permission. Returns whether reminders can be shown. */
export async function ensurePermission(): Promise<boolean> {
  if (!remindersSupported()) return false
  let { display } = await LocalNotifications.checkPermissions()
  if (display === 'prompt' || display === 'prompt-with-rationale') {
    display = (await LocalNotifications.requestPermissions()).display
  }
  return display === 'granted'
}

/** Whether Android lets reminders fire at the exact minute ("Alarms & reminders"). */
export async function exactAlarmsAllowed(): Promise<boolean> {
  if (!remindersSupported()) return true
  const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting()
  return exact_alarm === 'granted'
}

/** Opens the Android setting for exact alarms. */
export async function openExactAlarmSetting(): Promise<boolean> {
  const { exact_alarm } = await LocalNotifications.changeExactNotificationSetting()
  return exact_alarm === 'granted'
}

let syncing: Promise<void> = Promise.resolve()

/** Replaces all scheduled reminders with a fresh plan. Calls are serialized. */
export function syncReminders(habits: Habit[]): Promise<void> {
  syncing = syncing.then(() => doSync(habits)).catch((e) => console.warn('Reminder sync failed', e))
  return syncing
}

async function doSync(habits: Habit[]) {
  if (!remindersSupported()) return
  const { display } = await LocalNotifications.checkPermissions()
  if (display !== 'granted') return

  const { notifications: pending } = await LocalNotifications.getPending()
  if (pending.length) {
    await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) })
  }

  const plan = planReminders(habits)
  if (!plan.length) return
  await LocalNotifications.schedule({
    notifications: plan.map((r, i) => ({
      id: i + 1,
      title: r.title,
      body: r.body,
      schedule: { at: r.at, allowWhileIdle: true },
      actionTypeId: ACTION_TYPE,
      extra: { habitId: r.habitId, day: r.day },
    })),
  })
}

/** Registers the "Mark done" button and calls back when it's pressed. */
export async function initNotificationActions(onDone: (habitId: string, day: string) => void) {
  if (!remindersSupported()) return
  await LocalNotifications.registerActionTypes({
    types: [{ id: ACTION_TYPE, actions: [{ id: ACTION_DONE, title: 'Mark done' }] }],
  })
  await LocalNotifications.addListener('localNotificationActionPerformed', ({ actionId, notification }) => {
    const { habitId, day } = (notification.extra ?? {}) as { habitId?: string; day?: string }
    if (actionId === ACTION_DONE && habitId && day) onDone(habitId, day)
  })
}
