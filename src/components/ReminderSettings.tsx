import { useEffect, useState } from 'react'
import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useStore } from '../store'
import {
  ensurePermission,
  exactAlarmsAllowed,
  openExactAlarmSetting,
  remindersSupported,
  syncReminders,
} from '../lib/notify'

/** Android-only: shows whether reminders can be delivered, and on time. */
export default function ReminderSettings() {
  const [notifications, setNotifications] = useState<boolean | null>(null)
  const [exact, setExact] = useState<boolean | null>(null)

  async function refresh() {
    const { display } = await LocalNotifications.checkPermissions()
    setNotifications(display === 'granted')
    setExact(await exactAlarmsAllowed())
  }

  useEffect(() => {
    if (!remindersSupported()) return
    refresh()
    // Permissions may change in Android settings while we're in the background.
    const sub = App.addListener('resume', () => {
      refresh()
      syncReminders(useStore.getState().habits)
    })
    return () => {
      sub.then((s) => s.remove())
    }
  }, [])

  if (!remindersSupported() || notifications === null) return null

  return (
    <div className="space-y-0.5 overflow-hidden rounded-2xl">
      <Row
        title="Notifications"
        detail={notifications ? 'Allowed' : 'Needed for reminders'}
        ok={notifications}
        action={
          notifications ? null : (
            <ActionButton
              onClick={async () => {
                await ensurePermission()
                await refresh()
                syncReminders(useStore.getState().habits)
              }}
            >
              Allow
            </ActionButton>
          )
        }
      />
      <Row
        title="Exact timing"
        detail={exact ? 'Reminders arrive on the minute' : 'Reminders may arrive a few minutes late'}
        ok={!!exact}
        action={
          exact ? null : (
            <ActionButton
              onClick={async () => {
                await openExactAlarmSetting()
                await refresh()
                syncReminders(useStore.getState().habits)
              }}
            >
              Turn on
            </ActionButton>
          )
        }
      />
    </div>
  )
}

function Row({ title, detail, ok, action }: { title: string; detail: string; ok: boolean; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-container px-4 py-3">
      <span className={`h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{title}</div>
        <div className="text-xs text-neutral-400">{detail}</div>
      </div>
      {action}
    </div>
  )
}

function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
      {children}
    </button>
  )
}
