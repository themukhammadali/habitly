import { useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChartColumn, CircleCheckBig, Plus, Settings as SettingsIcon, type LucideIcon } from 'lucide-react'
import { useStore } from './store'
import type { Habit } from './types'
import { todayKey } from './lib/dates'
import { isActionable, isSatisfied } from './lib/schedule'
import { initNotificationActions, syncReminders } from './lib/notify'
import { initWidget, pullWidgetActions, syncWidget } from './lib/widget'
import { successFeedback, tapFeedback } from './lib/haptics'
import HabitCard from './components/HabitCard'
import HabitEditor from './components/HabitEditor'
import HabitDetail from './components/HabitDetail'
import Settings from './components/Settings'
import Analytics from './components/Analytics'
import Toast, { useToast } from './components/Toast'
import SwipeToDelete from './components/SwipeToDelete'
import Confetti from './components/Confetti'

type Tab = 'habits' | 'analytics' | 'settings'

const TITLES: Record<Tab, string> = { habits: 'Habits', analytics: 'Analytics', settings: 'Settings' }

export default function App() {
  const habits = useStore((s) => s.habits)
  const theme = useStore((s) => s.settings.theme)
  const palette = useStore((s) => s.settings.palette)
  const reorder = useStore((s) => s.reorder)
  const deleteHabit = useStore((s) => s.deleteHabit)
  const restoreHabit = useStore((s) => s.restoreHabit)
  const showToast = useToast((s) => s.show)

  const [tab, setTab] = useState<Tab>('habits')
  const [adding, setAdding] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [sorting, setSorting] = useState(false)
  const today = useToday()
  // Cards always act on today; past days are edited from a habit's calendar.
  const day = today

  useApplyTheme(theme, palette)
  useNativeSync(habits)

  const active = useMemo(
    () => habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order),
    [habits],
  )
  const detailHabit = habits.find((h) => h.id === detailId) ?? null
  const celebrating = useCelebration(active, today)

  // Press and hold to pick a habit up; quicker movements are taps, swipes or scrolling.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { delay: 300, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 6 } }),
  )
  function onDragEnd({ active: a, over }: DragEndEvent) {
    setSorting(false)
    if (!over || a.id === over.id) return
    const ids = active.map((h) => h.id)
    reorder(arrayMove(ids, ids.indexOf(String(a.id)), ids.indexOf(String(over.id))))
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="sticky top-0 z-20 bg-surface/90 px-5 pb-3 pt-safe backdrop-blur-xl">
        <div className="flex items-center justify-between pt-3">
          <h1 className="text-[32px] font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
            {TITLES[tab]}
          </h1>
        </div>
        {tab === 'habits' && active.length > 0 && (
          <DaySummary
            habits={active}
            day={day}
          />
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        {tab === 'habits' ? (
          active.length === 0 ? (
            <EmptyState onAdd={() => setAdding(true)} />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragStart={() => {
                tapFeedback()
                setSorting(true)
              }}
              onDragEnd={onDragEnd}
              onDragCancel={() => setSorting(false)}
            >
              <SortableContext items={active.map((h) => h.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 px-4 pt-2">
                  {active.map((h) => (
                    <SortableHabit
                      key={h.id}
                      habit={h}
                      day={day}
                      sorting={sorting}
                      onOpen={() => setDetailId(h.id)}
                      onDelete={() => {
                        deleteHabit(h.id)
                        showToast(`Deleted “${h.name}”`, { label: 'Undo', run: () => restoreHabit(h) })
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )
        ) : tab === 'analytics' ? (
          <Analytics />
        ) : (
          <Settings />
        )}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md justify-center px-6 pb-safe"
      >
        <div className="mb-4 flex w-full items-center justify-around rounded-full bg-container-high/95 px-2 py-2 shadow-lg shadow-black/5 backdrop-blur-xl">
          <TabButton active={tab === 'habits'} onClick={() => setTab('habits')} label="Habits" icon={CircleCheckBig} />
          <TabButton
            active={tab === 'analytics'}
            onClick={() => {
              setTab('analytics')
            }}
            label="Analytics"
            icon={ChartColumn}
          />
          <button
            type="button"
            onClick={() => {
              setTab('habits')
              setAdding(true)
            }}
            aria-label="Add habit"
            className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary text-on-primary transition-all duration-300 ease-spring active:scale-90 active:rounded-full"
          >
            <Plus className="h-6 w-6" strokeWidth={2.4} />
          </button>
          <TabButton
            active={tab === 'settings'}
            onClick={() => {
              setTab('settings')
            }}
            label="Settings"
            icon={SettingsIcon}
          />
        </div>
      </nav>

      {adding && <HabitEditor onClose={() => setAdding(false)} />}
      {detailHabit && <HabitDetail habit={detailHabit} onClose={() => setDetailId(null)} />}
      {celebrating && <Confetti />}
      <Toast />
    </div>
  )
}

function DaySummary({
  habits,
  day,
}: {
  habits: Habit[]
  day: string
}) {
  const due = habits.filter((h) => isActionable(h, day))
  const done = due.filter((h) => isSatisfied(h, day)).length
  const total = due.length
  const progress = total ? done / total : 1
  const all = total > 0 && done === total

  const r = 18
  const c = 2 * Math.PI * r
  return (
    <div className="mt-3 flex items-center gap-3 rounded-3xl bg-primary-container px-4 py-3 text-on-primary-container">
      <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" className="stroke-primary/20" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold">
          {total === 0 ? 'Nothing scheduled' : all ? 'All done!' : `${done} of ${total} done`}
        </div>
        <div className="text-xs opacity-75">
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </div>
  )
}

/** A habit card you can press and hold to drag, or swipe left to delete. */
function SortableHabit({
  habit,
  day,
  sorting,
  onOpen,
  onDelete,
}: {
  habit: Habit
  day: string
  sorting: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })
  // Releasing a dragged card also fires a click; don't let it open the habit.
  const justDropped = useRef(false)
  useEffect(() => {
    if (isDragging) justDropped.current = true
    else if (justDropped.current) {
      const t = setTimeout(() => (justDropped.current = false), 300)
      return () => clearTimeout(t)
    }
  }, [isDragging])
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      onClickCapture={(e) => {
        if (justDropped.current) {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
      className="relative select-none [-webkit-touch-callout:none]"
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <div className={`transition-transform duration-200 ${isDragging ? 'scale-[1.03] rounded-2xl shadow-2xl' : ''}`}>
        <SwipeToDelete label={habit.name} onDelete={onDelete} disabled={sorting}>
          <HabitCard habit={habit} day={day} onOpen={onOpen} />
        </SwipeToDelete>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 pt-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary-container text-on-primary-container">
        <CheckCircleIcon />
      </div>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">No habits yet</h2>
      <p className="mt-1 max-w-xs text-sm text-neutral-400">Add your first habit and start building a streak today.</p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 rounded-full bg-primary px-6 py-3 text-sm font-bold text-on-primary transition duration-300 ease-spring active:scale-95"
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
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: LucideIcon
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex w-16 flex-col items-center justify-center gap-1 text-[11px] transition active:scale-90 ${active ? 'font-bold text-neutral-900 dark:text-neutral-50' : 'font-medium text-neutral-500'}`}
    >
      {/* Material's active indicator: a pill behind the icon. */}
      <span
        className={`flex h-8 items-center justify-center rounded-full transition-all duration-300 ease-spring ${
          active ? 'w-14 bg-primary-container text-on-primary-container' : 'w-8'
        }`}
      >
        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.8} />
      </span>
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
/**
 * Keeps scheduled reminders and the home screen widget in step with the
 * habits, wires up "Mark done", and applies taps made on the widget.
 */
function useNativeSync(habits: Habit[]) {
  useEffect(() => {
    initNotificationActions((habitId, day) => {
      const h = useStore.getState().habits.find((x) => x.id === habitId)
      if (h && !h.completions[day]) useStore.getState().toggleDay(habitId, day)
    })
    initWidget()
    if (!Capacitor.isNativePlatform()) return
    // Back from the background: apply widget taps made meanwhile, and a new
    // day may mean new reminders and a fresh widget.
    const sub = CapApp.addListener('resume', async () => {
      await pullWidgetActions()
      const current = useStore.getState().habits
      syncReminders(current)
      syncWidget(current)
    })
    return () => {
      sub.then((s) => s.remove())
    }
  }, [])

  // The widget also follows the color palette.
  const palette = useStore((s) => s.settings.palette)
  useEffect(() => {
    const t = setTimeout(() => {
      syncReminders(habits)
      syncWidget(habits)
    }, 400)
    return () => clearTimeout(t)
  }, [habits, palette])
}

function useApplyTheme(theme: string, palette: string) {
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      root.classList.toggle('dark', dark)
      root.dataset.palette = palette
      // Browser and Android status bar follow the palette's page color.
      const [r, g, b] = getComputedStyle(root).getPropertyValue('--surface').trim().split(/\s+/).map(Number)
      const color = `#${[r, g, b].map((n) => (n || 0).toString(16).padStart(2, '0')).join('')}`
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
  }, [theme, palette])
}
