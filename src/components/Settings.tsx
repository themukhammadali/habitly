import type { ThemePref } from '../types'
import { useStore } from '../store'

const OPTIONS: { key: ThemePref; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
]

export default function Settings() {
  const theme = useStore((s) => s.settings.theme)
  const setTheme = useStore((s) => s.setTheme)
  const habits = useStore((s) => s.habits)

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
        <SectionLabel>About</SectionLabel>
        <div className="rounded-2xl bg-white p-4 text-sm text-neutral-500 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/5">
          <p className="font-semibold text-neutral-900 dark:text-neutral-50">Habitly</p>
          <p className="mt-1">
            A minimalist habit tracker. All your data lives privately on this
            device — nothing is uploaded.
          </p>
          <p className="mt-3 text-xs text-neutral-400">
            Tip: tap the Share button in Safari, then “Add to Home Screen” to
            install Habitly as an app.
          </p>
        </div>
      </div>
    </div>
  )
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
