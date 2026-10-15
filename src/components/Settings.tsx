import { useRef, useState } from 'react'
import type { Palette, ThemePref } from '../types'
import ButtonGroup from './ButtonGroup'
import { useStore } from '../store'
import { exportBackup, parseBackup } from '../lib/backup'
import { Capacitor } from '@capacitor/core'
import { HabitIcon } from '../lib/icons'
import { colorHex } from '../lib/palette'
import { useToast } from './Toast'
import ReminderSettings from './ReminderSettings'
import { widgetSupported } from '../lib/widget'
import { remindersSupported } from '../lib/notify'

const REPO = 'https://github.com/themukhammadali/habitly'

/** Swatches: the palette's container tint and its accent (light mode values). */
const PALETTES: { key: Palette; label: string; swatch: [string, string] }[] = [
  { key: 'neutral', label: 'Neutral', swatch: ['#e4e4ea', '#1c1c1e'] },
  { key: 'sage', label: 'Sage', swatch: ['#c7efd6', '#1e7a4c'] },
  { key: 'sky', label: 'Sky', swatch: ['#d6e4ff', '#2563c7'] },
  { key: 'lavender', label: 'Lavender', swatch: ['#e8deff', '#6e52be'] },
]

const OPTIONS: { key: ThemePref; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
]

export default function Settings() {
  const theme = useStore((s) => s.settings.theme)
  const setTheme = useStore((s) => s.setTheme)
  const palette = useStore((s) => s.settings.palette)
  const setPalette = useStore((s) => s.setPalette)
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
        <div className="space-y-4 rounded-card bg-container p-4">
          <ButtonGroup label="Theme" value={theme} options={OPTIONS.map((o) => ({ value: o.key, label: o.label }))} onChange={setTheme} />
          <div role="radiogroup" aria-label="Colors" className="grid grid-cols-4 gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={palette === p.key}
                onClick={() => setPalette(p.key)}
                className="flex flex-col items-center gap-1.5 rounded-2xl py-2 transition active:scale-95"
              >
                <span
                  data-palette={p.key}
                  className={`flex h-12 w-12 items-center justify-center rounded-[18px] transition-all duration-300 ease-spring ${
                    palette === p.key ? 'scale-110 rounded-[50%]' : ''
                  }`}
                  style={{ background: p.swatch[0] }}
                >
                  <span className="h-5 w-5 rounded-full" style={{ background: p.swatch[1] }} />
                </span>
                <span className={`text-xs ${palette === p.key ? 'font-bold text-neutral-900 dark:text-neutral-50' : 'text-neutral-500'}`}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {remindersSupported() && (
        <div>
          <SectionLabel>Reminders</SectionLabel>
          <ReminderSettings />
        </div>
      )}

      {widgetSupported() && (
        <div>
          <SectionLabel>Home screen widget</SectionLabel>
          <p className="rounded-card bg-container p-4 text-sm text-neutral-500">
            Each widget shows one habit with its heatmap. Open a habit and tap{' '}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Add to home screen</span>, or long-press
            your home screen, tap Widgets, and choose Habitly.
          </p>
        </div>
      )}

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
            className="flex-1 rounded-full bg-container py-3.5 text-sm font-semibold transition duration-300 ease-spring active:scale-95 text-neutral-900 dark:text-neutral-50"
          >
            Export backup
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex-1 rounded-full bg-container py-3.5 text-sm font-semibold transition duration-300 ease-spring active:scale-95 text-neutral-900 dark:text-neutral-50"
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
          <div className="space-y-0.5 overflow-hidden rounded-card">
            {archived.map((h) => (
              <div key={h.id} className="flex items-center gap-3 bg-container px-4 py-3">
                <HabitIcon name={h.icon} className="h-5 w-5 shrink-0" style={{ color: colorHex(h.color) }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {h.name}
                </span>
                <button
                  type="button"
                  onClick={() => setArchived(h.id, false)}
                  className="text-sm font-semibold text-primary"
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
        <div className="rounded-card bg-container p-4 text-sm text-neutral-500">
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
    <div className="rounded-card bg-container p-4">
      <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        {value}
      </div>
      <div className="text-xs text-neutral-400">{label}</div>
    </div>
  )
}
