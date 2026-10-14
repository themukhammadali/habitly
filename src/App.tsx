import { useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useStore } from './store'
import type { Habit } from './types'
import { addDaysKey, todayKey } from './lib/dates'
import { isActionable, isSatisfied } from './lib/schedule'
import { initNotificationActions, syncReminders } from './lib/notify'
import { successFeedback } from './lib/haptics'
import HabitCard from './components/HabitCard'
import HabitSheet from './components/HabitSheet'
import HabitDetail from './components/HabitDetail'
import Settings from './components/Settings'
import Toast from './components/Toast'
import Confetti from './components/Confetti'

type Tab = 'habits' | 'settings'

export default function App() {
  const habits = useStore((s) => s.habits)
  const theme = useStore((s) => s.settings.theme)
  const reorder = useStore((s) => s.reorder)

  const [tab, setTab] = useState<Tab>('habits')
  const [adding, setAdding] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const today = useToday()
  const [showYesterday, setShowYesterday] = useState(false)
  const day = showYesterday ? addDaysKey(today, -1) : today

  useApplyTheme(theme)
  useReminders(habits)

  const active = useMemo(
    () => habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order),
    [habits],
  )
  const detailHabit = habits.find((h) => h.id === detailId) ?? null
  const celebrating = useCelebration(active, today)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  function onDragEnd({ active: a, over }: DragEndEvent) {
    if (!over || a.id === over.id) return
    const ids = active.map((h) => h.id)
    reorder(arrayMove(ids, ids.indexOf(String(a.id)), ids.indexOf(String(over.id))))
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="sticky top-0 z-20 bg-neutral-100/85 px-5 pb-3 pt-safe backdrop-blur-xl dark:bg-neutral-950/85">
        <div className="flex items-center justify-between pt-3">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {tab === 'habits' ? 'Habits' : 'Settings'}
          </h1>
          {tab === 'habits' && (
            <div className="flex items-center gap-2">
              {active.length > 1 && (
                <button
                  type="button"
                  onClick={() => setReordering((r) => !r)}
                  className="rounded-full px-3 py-2 text-sm font-medium text-neutral-500 active:bg-black/5 dark:active:bg-white/10"
                >
                  {reordering ? 'Done' : 'Reorder'}
                </button>
              )}
              {!reordering && (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  aria-label="Add habit"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm transition active:scale-90 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        {tab === 'habits' && active.length > 0 && !reordering && (
          <DaySummary
            habits={active}
            day={day}
            yesterday={showYesterday}
            onToggleYesterday={() => setShowYesterday((y) => !y)}
          />
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-28">
        {tab === 'habits' ? (
          active.length === 0 ? (
            <EmptyState onAdd={() => setAdding(true)} />
          ) : reordering ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={active.map((h) => h.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 px-4 pt-2">
                  {active.map((h) => (
                    <SortableCard key={h.id} habit={h} day={day} />
                  ))}
                  <p className="pt-2 text-center text-xs text-neutral-400">Drag the handles to reorder.</p>
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-3 px-4 pt-2">
              {active.map((h) => (
                <HabitCard key={h.id} habit={h} day={day} onOpen={() => setDetailId(h.id)} />
              ))}
            </div>
          )
        ) : (
          <Settings />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md justify-around border-t border-black/5 bg-white/80 pb-safe pt-2 backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/80">
        <TabButton active={tab === 'habits'} onClick={() => setTab('habits')} label="Habits" icon={<CheckCircleIcon />} />
        <TabButton
          active={tab === 'settings'}
          onClick={() => {
            setTab('settings')
            setReordering(false)
          }}
          label="Settings"
          icon={<GearIcon />}
        />
      </nav>

      {adding && <HabitSheet onClose={() => setAdding(false)} />}
      {detailHabit && <HabitDetail habit={detailHabit} onClose={() => setDetailId(null)} />}
      {celebrating && <Confetti />}
      <Toast />
    </div>
  )
}

function DaySummary({
  habits,
  day,
  yesterday,
  onToggleYesterday,
}: {
  habits: Habit[]
  day: string
  yesterday: boolean
  onToggleYesterday: () => void
}) {
  const due = habits.filter((h) => isActionable(h, day))
  const done = due.filter((h) => isSatisfied(h, day)).length
  const total = due.length
  const progress = total ? done / total : 1
  const all = total > 0 && done === total

  const r = 18
  const c = 2 * Math.PI * r
  return (
    <div className="mt-3 flex items-center gap-3">
      <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" className="stroke-black/10 dark:stroke-white/10" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className="stroke-emerald-500 transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {total === 0 ? 'Nothing scheduled' : all ? 'All done!' : `${done} of ${total} done`}
        </div>
        <div className="text-xs text-neutral-400">
          {yesterday ? 'Yesterday' : new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleYesterday}
        aria-pressed={yesterday}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          yesterday
            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
            : 'bg-black/5 text-neutral-500 dark:bg-white/10'
        }`}
      >
        {yesterday ? 'Back to today' : 'Yesterday'}
      </button>
    </div>
  )
}

function SortableCard({ habit, day }: { habit: Habit; day: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        position: 'relative',
      }}
      className={isDragging ? 'scale-[1.02] opacity-90 shadow-xl' : ''}
    >
      <HabitCard
        habit={habit}
        day={day}
        onOpen={() => {}}
        dragHandle={
          <button
            type="button"
            aria-label={`Drag to reorder ${habit.name}`}
            className="flex h-10 w-10 touch-none items-center justify-center rounded-xl text-neutral-400 active:bg-black/5 dark:active:bg-white/10"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        }
      />
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 pt-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
        <CheckCircleIcon />
      </div>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">No habits yet</h2>
      <p className="mt-1 max-w-xs text-sm text-neutral-400">Add your first habit and start building a streak today.</p>
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
      aria-current={active ? 'page' : undefined}
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

/** Today's key, kept current across midnight and when the app comes back from the background. */
function useToday() {
  const [today, setToday] = useState(todayKey)
  useEffect(() => {
    const check = () => setToday(todayKey())
    const timer = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  return today
}

/** True for a moment after the last habit of the day gets ticked off. */
function useCelebration(habits: Habit[], today: string) {
  const due = habits.filter((h) => isActionable(h, today))
  const allDone = due.length > 0 && due.every((h) => isSatisfied(h, today))
  const prev = useRef(allDone)
  const [celebrating, setCelebrating] = useState(false)
  useEffect(() => {
    if (allDone && !prev.current) {
      successFeedback()
      setCelebrating(true)
      const t = setTimeout(() => setCelebrating(false), 1400)
      prev.current = allDone
      return () => clearTimeout(t)
    }
    prev.current = allDone
  }, [allDone])
  return celebrating
}

/** Keeps scheduled reminders in step with the habits, and wires up "Mark done". */
function useReminders(habits: Habit[]) {
  useEffect(() => {
    initNotificationActions((habitId, day) => {
      const h = useStore.getState().habits.find((x) => x.id === habitId)
      if (h && !h.completions[day]) useStore.getState().toggleDay(habitId, day)
    })
    if (!Capacitor.isNativePlatform()) return
    // A new day means new reminders to plan.
    const sub = CapApp.addListener('resume', () => syncReminders(useStore.getState().habits))
    return () => {
      sub.then((s) => s.remove())
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => syncReminders(habits), 400)
    return () => clearTimeout(t)
  }, [habits])
}

function useApplyTheme(theme: string) {
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      root.classList.toggle('dark', dark)
      const color = dark ? '#0a0a0a' : '#f5f5f7'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
      if (Capacitor.isNativePlatform()) {
        StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
        StatusBar.setBackgroundColor({ color }).catch(() => {})
      }
    }
    apply()
    if (theme === 'system') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [theme])
}
