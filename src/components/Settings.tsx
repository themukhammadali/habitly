import { useRef, useState } from 'react'
import type { ThemePref } from '../types'
import { useStore } from '../store'
import { exportBackup, parseBackup } from '../lib/backup'
import { Capacitor } from '@capacitor/core'
import { HabitIcon } from '../lib/icons'
import { colorHex } from '../lib/palette'
import { useToast } from './Toast'

const REPO = 'https://github.com/themukhammadali/habitly'

const OPTIONS: { key: ThemePref; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
]

export default function Settings() {
  const theme = useStore((s) => s.settings.theme)
  const setTheme = useStore((s) => s.setTheme)
  const habits = useStore((s) => s.habits)
  const settings = useStore((s) => s.settings)
  const replaceAll = useStore((s) => s.replaceAll)
  const setArchived = useStore((s) => s.setArchived)
  const deleteHabit = useStore((s) => s.deleteHabit)
  const restoreHabit = useStore((s) => s.restoreHabit)
  const showToast = useToast((s) => s.show)
  const archived = habits.filter((h) => h.archived)
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleExport() {
    setMessage(null)
    try {
      await exportBackup({ habits, settings })
    } catch (e) {
      // Closing the share sheet without picking an app rejects; not an error.
      if (!/cancel/i.test(String(e))) setMessage('Export failed. Please try again.')
    }
  }

  async function handleImport(file: File) {
    setMessage(null)
    try {
      const backup = parseBackup(await file.text())
      const ok = window.confirm(
        `Import ${backup.habits.length} habit(s)? This replaces all habits currently on this device.`,
      )
      if (!ok) return
      replaceAll(backup.habits, backup.settings)
      setMessage(`Imported ${backup.habits.length} habit(s).`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import failed.')
    }
  }

  const totalCompletions = habits.reduce(
    (sum, h) => sum + Object.keys(h.completions).length,
    0,
  )

  return (
    <div className="space-y-6 px-4 py-4">
      <div>
        <SectionLabel>Appearance</SectionLabel>
        <div className="flex gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/5">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setTheme(o.key)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
                theme === o.key
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'text-neutral-500'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Overview</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <Box value={habits.length} label="Habits" />
          <Box value={totalCompletions} label="Days Completed" />
        </div>
      </div>

      <div>
        <SectionLabel>Data</SectionLabel>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 rounded-2xl bg-white py-3 text-sm font-medium text-neutral-900 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-white/5"
          >
            Export backup
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex-1 rounded-2xl bg-white py-3 text-sm font-medium text-neutral-900 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-white/5"
          >
            Import backup
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) handleImport(file)
          }}
        />
        {message && <p className="mt-2 px-1 text-xs text-neutral-500">{message}</p>}
      </div>

      {archived.length > 0 && (
        <div>
          <SectionLabel>Archived</SectionLabel>
          <div className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 dark:divide-white/5 dark:bg-neutral-900 dark:ring-white/5">
            {archived.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                <HabitIcon name={h.icon} className="h-5 w-5 shrink-0" style={{ color: colorHex(h.color) }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {h.name}
                </span>
                <button
                  type="button"
                  onClick={() => setArchived(h.id, false)}
                  className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
                >
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteHabit(h.id)
                    showToast(`Deleted “${h.name}”`, { label: 'Undo', run: () => restoreHabit(h) })
                  }}
                  className="text-sm font-medium text-red-500"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>About</SectionLabel>
        <div className="rounded-2xl bg-white p-4 text-sm text-neutral-500 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/5">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold text-neutral-900 dark:text-neutral-50">Habitly</p>
            <p className="text-xs text-neutral-400">Version {__APP_VERSION__}</p>
          </div>
          <p className="mt-1">
            A minimalist habit tracker. All your data lives privately on this
            device — nothing is uploaded.
          </p>
          <InstallTip />
          <p className="mt-3 text-xs text-neutral-400">
            Open source under the MIT license ·{' '}
            <a href={REPO} target="_blank" rel="noreferrer" className="underline">
              GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

/** How to install or update Habitly, depending on where it's running. */
function InstallTip() {
  const ua = navigator.userAgent
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  let tip: React.ReactNode = null
  if (Capacitor.isNativePlatform()) {
    tip = (
      <>
        New versions are published on{' '}
        <a href={`${REPO}/releases/latest`} target="_blank" rel="noreferrer" className="underline">
          GitHub Releases
        </a>
        . Install the new APK over this one; your habits are kept.
      </>
    )
  } else if (standalone) {
    tip = null
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    tip = 'Tip: tap the Share button in Safari, then “Add to Home Screen” to install Habitly as an app.'
  } else if (/Android/.test(ua)) {
    tip = (
      <>
        Tip: get the Android app with reminders from{' '}
        <a href={`${REPO}/releases/latest`} target="_blank" rel="noreferrer" className="underline">
          GitHub Releases
        </a>
        , or use “Add to Home screen” in your browser menu.
      </>
    )
  } else {
    tip = 'Tip: use the install icon in your browser’s address bar to install Habitly as an app.'
  }
  return tip ? <p className="mt-3 text-xs text-neutral-400">{tip}</p> : null
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
      {children}
    </div>
  )
}

function Box({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/5">
      <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        {value}
      </div>
      <div className="text-xs text-neutral-400">{label}</div>
    </div>
  )
}
