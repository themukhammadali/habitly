import { useEffect, useMemo, useState } from 'react'
import { useStore } from './store'
import HabitCard from './components/HabitCard'
import HabitSheet from './components/HabitSheet'
import HabitDetail from './components/HabitDetail'
import Settings from './components/Settings'

type Tab = 'habits' | 'settings'

export default function App() {
  const habits = useStore((s) => s.habits)
  const theme = useStore((s) => s.settings.theme)

  const [tab, setTab] = useState<Tab>('habits')
  const [adding, setAdding] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  useApplyTheme(theme)

  const sorted = useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits],
  )
  const detailHabit = habits.find((h) => h.id === detailId) ?? null

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-neutral-100/85 px-5 pb-3 pt-safe backdrop-blur-xl dark:bg-neutral-950/85">
        <div className="pt-3">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {tab === 'habits' ? 'Habits' : 'Settings'}
          </h1>
        </div>
        {tab === 'habits' && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label="Add habit"
            className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm transition active:scale-90 dark:bg-neutral-100 dark:text-neutral-900"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-28">
        {tab === 'habits' ? (
          sorted.length === 0 ? (
            <EmptyState onAdd={() => setAdding(true)} />
          ) : (
            <div className="space-y-3 px-4 pt-2">
              {sorted.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={h}
                  onOpen={() => setDetailId(h.id)}
                />
              ))}
            </div>
          )
        ) : (
          <Settings />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md justify-around border-t border-black/5 bg-white/80 pb-safe pt-2 backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/80">
        <TabButton
          active={tab === 'habits'}
          onClick={() => setTab('habits')}
          label="Habits"
          icon={<CheckCircleIcon />}
        />
        <TabButton
          active={tab === 'settings'}
          onClick={() => setTab('settings')}
          label="Settings"
          icon={<GearIcon />}
        />
      </nav>

      {adding && <HabitSheet onClose={() => setAdding(false)} />}
      {detailHabit && (
        <HabitDetail habit={detailHabit} onClose={() => setDetailId(null)} />
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 pt-24 text-center">
      <div className="mb-4 text-5xl">✅</div>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        No habits yet
      </h2>
      <p className="mt-1 max-w-xs text-sm text-neutral-400">
        Add your first habit and start building a streak today.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white active:scale-95 dark:bg-neutral-100 dark:text-neutral-900"
      >
        Add a Habit
      </button>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition ${
        active ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-400'
      }`}
    >
      <span className="h-6 w-6">{icon}</span>
      {label}
    </button>
  )
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function useApplyTheme(theme: string) {
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      root.classList.toggle('dark', dark)
      const meta = document.querySelector('meta[name="theme-color"]')
      meta?.setAttribute('content', dark ? '#0a0a0a' : '#f5f5f7')
    }
    apply()
    if (theme === 'system') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [theme])
}
