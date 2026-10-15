import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import type { Goal, Habit, Reminder, Schedule } from '../types'
import { PALETTE, colorHex } from '../lib/palette'
import { DEFAULT_ICON, HabitIcon, ICONS } from '../lib/icons'
import { WEEKDAYS_SHORT, formatTime, todayKey } from '../lib/dates'
import { predict, MIN_SAMPLES } from '../lib/predict'
import { reminderTime } from '../lib/reminders'
import { ensurePermission, remindersSupported } from '../lib/notify'
import { useBackHandler } from '../hooks/useBackHandler'
import { useStore } from '../store'
import { useToast } from './Toast'
import ButtonGroup from './ButtonGroup'

const CLOSE_MS = 220
/** Icons shown before "Show all": two rows. */
const ICON_PREVIEW = 16

interface Template {
  name: string
  icon: string
  color: string
  schedule: Schedule
  /** Reminder time in minutes, or null for a smart reminder. */
  remindAt: number | null
  goal?: Goal
}

const UNIT_SUGGESTIONS = ['glasses', 'pages', 'minutes', 'km', 'steps', 'times']

const TEMPLATES: Template[] = [
  { name: 'Drink water', icon: 'glass-water', color: 'blue', schedule: { kind: 'daily' }, remindAt: null, goal: { target: 8, unit: 'glasses', step: 1 } },
  { name: 'Read', icon: 'book', color: 'violet', schedule: { kind: 'daily' }, remindAt: null, goal: { target: 20, unit: 'pages', step: 5 } },
  { name: 'Workout', icon: 'dumbbell', color: 'red', schedule: { kind: 'weekly', times: 3 }, remindAt: null },
  { name: 'Meditate', icon: 'flower', color: 'teal', schedule: { kind: 'daily' }, remindAt: null },
  { name: 'Sleep early', icon: 'moon', color: 'indigo', schedule: { kind: 'daily' }, remindAt: 21 * 60 + 30 },
  { name: 'Walk', icon: 'footprints', color: 'amber', schedule: { kind: 'daily' }, remindAt: null, goal: { target: 30, unit: 'minutes', step: 5 } },
  { name: 'Journal', icon: 'pen', color: 'sand', schedule: { kind: 'daily' }, remindAt: 21 * 60 },
  { name: 'No phone in bed', icon: 'no-phone', color: 'slate', schedule: { kind: 'daily' }, remindAt: 22 * 60 },
]

/** Full-screen editor for creating a habit or changing an existing one. */
export default function HabitEditor({
  habit,
  onClose,
}: {
  habit?: Habit | null
  onClose: () => void
}) {
  const addHabit = useStore((s) => s.addHabit)
  const updateHabit = useStore((s) => s.updateHabit)
  const deleteHabit = useStore((s) => s.deleteHabit)
  const restoreHabit = useStore((s) => s.restoreHabit)
  const setArchived = useStore((s) => s.setArchived)
  const showToast = useToast((s) => s.show)
  const editing = !!habit
  const canRemind = remindersSupported()

  const initial = useMemo(
    () => ({
      name: habit?.name ?? '',
      description: habit?.description ?? '',
      icon: habit?.icon ?? DEFAULT_ICON,
      color: habit?.color ?? PALETTE[0].key,
      schedule: habit?.schedule ?? ({ kind: 'daily' } as Schedule),
      reminder: habit?.reminder ?? ({ mode: canRemind ? 'smart' : 'off', time: 9 * 60 } as Reminder),
      goal: habit?.goal,
    }),
    [habit, canRemind],
  )
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [icon, setIcon] = useState(initial.icon)
  const [color, setColor] = useState(initial.color)
  const [schedule, setSchedule] = useState<Schedule>(initial.schedule)
  const [reminder, setReminder] = useState<Reminder>(initial.reminder)
  const [goal, setGoal] = useState<Goal | undefined>(initial.goal)
  const [allIcons, setAllIcons] = useState(false)
  const [closing, setClosing] = useState(false)

  const hex = colorHex(color)
  const canSave = name.trim().length > 0 && (!goal || (goal.target > 0 && goal.step > 0))
  const fields = { name: name.trim(), description: description.trim(), icon, color, schedule, reminder, goal }
  const dirty =
    JSON.stringify(fields) !==
    JSON.stringify({ ...initial, name: initial.name.trim(), description: initial.description.trim() })

  function close() {
    setClosing(true)
    setTimeout(onClose, CLOSE_MS)
  }

  /** Back arrow and Android back: ask before throwing away changes. */
  function requestClose() {
    if (dirty && !window.confirm(editing ? 'Discard your changes?' : 'Discard this new habit?')) return
    close()
  }
  useBackHandler(requestClose)

  async function save() {
    if (!canSave) return
    if (editing && habit) updateHabit(habit.id, fields)
    else addHabit(fields)
    close()
    if (reminder.mode !== 'off' && canRemind && !(await ensurePermission())) {
      showToast('Notifications are off for Habitly. Turn them on in Android settings to get reminders.')
    }
  }

  function applyTemplate(t: Template) {
    setGoal(t.goal)
    setName(t.name)
    setIcon(t.icon)
    setColor(t.color)
    setSchedule(t.schedule)
    setReminder(
      !canRemind
        ? { mode: 'off', time: t.remindAt ?? 9 * 60 }
        : t.remindAt === null
          ? { mode: 'smart', time: 9 * 60 }
          : { mode: 'fixed', time: t.remindAt },
    )
  }

  // Keep the selected icon visible even when the list is collapsed.
  const shownIcons = allIcons
    ? ICONS
    : [...ICONS.slice(0, ICON_PREVIEW - 1), ...(ICONS.slice(0, ICON_PREVIEW - 1).some((i) => i.key === icon)
        ? [ICONS[ICON_PREVIEW - 1]]
        : ICONS.filter((i) => i.key === icon))]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? 'Edit habit' : 'New habit'}
      className={`fixed inset-0 z-50 overflow-y-auto bg-surface no-scrollbar ${closing ? 'animate-slide-out' : 'animate-slide-in' }`}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between bg-surface/90 px-2 pb-2 pt-safe backdrop-blur-xl">
        <button
          type="button"
          onClick={requestClose}
          aria-label="Back"
          className="mt-2 flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 active:bg-black/5 dark:text-neutral-300 dark:active:bg-white/10"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="mt-2 font-semibold text-neutral-900 dark:text-neutral-50">{editing ? 'Edit Habit' : 'New Habit'}</h1>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="mt-2 rounded-full px-4 py-2 text-[15px] font-semibold text-white transition active:scale-95 disabled:opacity-40"
          style={{ background: hex }}
        >
          Save
        </button>
      </header>

      <div className="mx-auto max-w-md space-y-6 px-4 pb-16 pt-5">
        {/* Preview */}
        <div className="flex flex-col items-center text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full transition-colors"
            style={{ background: `${hex}22` }}
          >
            <HabitIcon name={icon} className="h-10 w-10" style={{ color: hex }} />
          </div>
          <div className="mt-3 max-w-full truncate text-xl font-bold text-neutral-900 dark:text-neutral-50">
            {name.trim() || 'New habit'}
          </div>
          <div className="max-w-full truncate text-sm text-neutral-400">{description.trim() || 'Add a description'}</div>
        </div>

        {!editing && (
          <div>
            <Label>Start from a template</Label>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
              {TEMPLATES.map((t) => {
                const c = colorHex(t.color)
                const selected = name === t.name && icon === t.icon
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    aria-pressed={selected}
                    className="flex shrink-0 items-center gap-2 rounded-full bg-container py-2 pl-2 pr-3.5 text-sm font-medium text-neutral-800 transition active:scale-95 dark:text-neutral-100"
                    style={{ ['--tw-ring-color' as string]: selected ? c : 'rgba(0,0,0,0.06)' }}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `${c}22` }}>
                      <HabitIcon name={t.icon} className="h-4 w-4" style={{ color: c }} />
                    </span>
                    {t.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <Card>
          <Field label="Name">
            <input
              autoFocus={!editing}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Read 20 pages"
              maxLength={40}
              enterKeyHint="next"
              className="w-full rounded-2xl bg-container-high px-4 py-3 text-neutral-900 outline-none dark:text-neutral-50"
              style={{ caretColor: hex }}
            />
          </Field>
          <Field label="Description">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
              maxLength={60}
              enterKeyHint="done"
              className="w-full rounded-2xl bg-container-high px-4 py-3 text-neutral-900 outline-none dark:text-neutral-50"
              style={{ caretColor: hex }}
            />
          </Field>
        </Card>

        <Card>
          <Field label="Icon">
            <div className="grid grid-cols-8 gap-2">
              {shownIcons.map(({ key }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  aria-label={key}
                  aria-pressed={icon === key}
                  className={`flex aspect-square items-center justify-center transition-all duration-300 ease-spring active:scale-90 ${icon === key ? 'rounded-[50%]' : 'rounded-2xl'}`}
                  style={{
                    background: icon === key ? `${hex}26` : 'rgb(var(--container-high))',
                    outline: icon === key ? `2px solid ${hex}` : 'none',
                    color: icon === key ? hex : undefined,
                  }}
                >
                  <HabitIcon name={key} className={`h-5 w-5 ${icon === key ? '' : 'text-neutral-600 dark:text-neutral-300'}`} />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAllIcons((a) => !a)}
              className="mt-3 w-full rounded-full bg-container-high py-2.5 text-sm font-semibold text-neutral-600 transition active:scale-[0.98] dark:text-neutral-300"
            >
              {allIcons ? 'Show fewer' : `Show all ${ICONS.length} icons`}
            </button>
          </Field>
          <Field label="Color">
            <div className="flex flex-wrap gap-3">
              {PALETTE.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  aria-label={c.name}
                  aria-pressed={color === c.key}
                  className="h-8 w-8 rounded-full transition active:scale-90"
                  style={{
                    background: c.hex,
                    outline: color === c.key ? `2px solid ${c.hex}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </Field>
        </Card>

        <Card>
          <Field label="Track">
            <GoalEditor goal={goal} onChange={setGoal} color={hex} />
          </Field>
        </Card>

        <Card>
          <Field label="Repeat">
            <ScheduleEditor schedule={schedule} onChange={setSchedule} color={hex} />
          </Field>
          <Field label="Reminder">
            <ReminderEditor habit={habit ?? null} reminder={reminder} onChange={setReminder} color={hex} />
          </Field>
        </Card>

        {editing && habit && (
          <div className="space-y-0.5 overflow-hidden rounded-card">
            <button
              type="button"
              onClick={() => {
                setArchived(habit.id, true)
                close()
                showToast(`Archived “${habit.name}”`, { label: 'Undo', run: () => setArchived(habit.id, false) })
              }}
              className="w-full bg-container py-3.5 font-medium text-neutral-600 active:bg-container-high dark:text-neutral-300"
            >
              Archive Habit
            </button>
            <button
              type="button"
              onClick={() => {
                deleteHabit(habit.id)
                close()
                showToast(`Deleted “${habit.name}”`, { label: 'Undo', run: () => restoreHabit(habit) })
              }}
              className="w-full bg-container py-3.5 font-medium text-red-500 active:bg-container-high"
            >
              Delete Habit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 rounded-card bg-container p-4">
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-neutral-400">{children}</div>
}

function ScheduleEditor({
  schedule,
  onChange,
  color,
}: {
  schedule: Schedule
  onChange: (s: Schedule) => void
  color: string
}) {
  return (
    <div className="space-y-3">
      <ButtonGroup
        color={color}
        value={schedule.kind}
        options={[
          { value: 'daily', label: 'Every day' },
          { value: 'weekdays', label: 'Some days' },
          { value: 'weekly', label: 'Weekly' },
        ]}
        onChange={(kind) =>
          onChange(
            kind === 'daily'
              ? { kind }
              : kind === 'weekdays'
                ? { kind, days: [0, 1, 2, 3, 4] }
                : { kind, times: 3 },
          )
        }
      />

      {schedule.kind === 'weekdays' && (
        <div className="flex justify-between gap-1.5">
          {WEEKDAYS_SHORT.map((label, d) => {
            const on = schedule.days.includes(d)
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const days = on ? schedule.days.filter((x) => x !== d) : [...schedule.days, d].sort()
                  if (days.length === 0) return
                  onChange(days.length === 7 ? { kind: 'daily' } : { kind: 'weekdays', days })
                }}
                className={`flex h-11 flex-1 items-center justify-center text-xs font-bold transition-all duration-300 ease-spring active:scale-90 ${on ? 'rounded-[22px]' : 'rounded-2xl'}`}
                style={{
                  background: on ? color : 'rgb(var(--container-high))',
                  color: on ? '#fff' : undefined,
                }}
              >
                {label.slice(0, 2)}
              </button>
            )
          })}
        </div>
      )}

      {schedule.kind === 'weekly' && (
        <div className="flex items-center justify-between rounded-3xl bg-container-high px-4 py-2.5">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            {schedule.times} {schedule.times === 1 ? 'time' : 'times'} a week, any days
          </span>
          <div className="flex gap-2">
            {[-1, 1].map((step) => (
              <button
                key={step}
                type="button"
                aria-label={step < 0 ? 'Fewer times' : 'More times'}
                disabled={schedule.times + step < 1 || schedule.times + step > 6}
                onClick={() => onChange({ kind: 'weekly', times: schedule.times + step })}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-container-highest text-lg font-semibold text-neutral-700 transition active:scale-90 disabled:opacity-30 dark:text-neutral-100"
              >
                {step < 0 ? '−' : '+'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ReminderEditor({
  habit,
  reminder,
  onChange,
  color,
}: {
  habit: Habit | null
  reminder: Reminder
  onChange: (r: Reminder) => void
  color: string
}) {
  const timeValue = `${String(Math.floor(reminder.time / 60)).padStart(2, '0')}:${String(reminder.time % 60).padStart(2, '0')}`
  const learned = habit ? predict(habit.completionTimes, todayKey()) : null
  const samples = habit ? Object.keys(habit.completionTimes).length : 0

  return (
    <div className="space-y-3">
      <ButtonGroup
        color={color}
        value={reminder.mode}
        options={[
          { value: 'off', label: 'Off' },
          { value: 'smart', label: 'Smart' },
          { value: 'fixed', label: 'At a time' },
        ]}
        onChange={(mode) => onChange({ ...reminder, mode })}
      />

      {reminder.mode !== 'off' && (
        <div className="space-y-2 rounded-3xl bg-container-high p-4 text-sm">
          {reminder.mode === 'smart' && (
            <p className="text-neutral-600 dark:text-neutral-300">
              {habit && learned
                ? <>You usually do this around <b>{formatTime(learned.usual)}</b>{learned.split ? ' on these days' : ''}, so Habitly reminds you at <b>{formatTime(reminderTime({ ...habit, reminder }).minutes)}</b> today if it isn’t done yet.</>
                : <>Habitly learns when you usually do this and reminds you a little before. Until it has {MIN_SAMPLES - samples > 0 ? `${MIN_SAMPLES - samples} more` : 'enough'} check-ins, it reminds you at:</>}
            </p>
          )}
          {(reminder.mode === 'fixed' || !learned) && (
            <input
              type="time"
              value={timeValue}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number)
                if (!Number.isNaN(h)) onChange({ ...reminder, time: h * 60 + m })
              }}
              className="w-full rounded-lg bg-container-highest px-3 py-2 text-neutral-900 outline-none dark:text-neutral-50"
            />
          )}
          {!remindersSupported() && (
            <p className="text-xs text-neutral-400">Reminders are delivered by the Android app.</p>
          )}
        </div>
      )}
    </div>
  )
}

function GoalEditor({
  goal,
  onChange,
  color,
}: {
  goal: Goal | undefined
  onChange: (g: Goal | undefined) => void
  color: string
}) {
  return (
    <div className="space-y-3">
      <ButtonGroup
        color={color}
        value={goal ? 'amount' : 'check'}
        options={[
          { value: 'check', label: 'Done / not done' },
          { value: 'amount', label: 'An amount' },
        ]}
        onChange={(v) => onChange(v === 'check' ? undefined : (goal ?? { target: 8, unit: 'glasses', step: 1 }))}
      />
      {goal && (
        <div className="space-y-3 rounded-3xl bg-container-high p-4">
          <div className="flex gap-2">
            <NumberField
              label="Daily goal"
              value={goal.target}
              onChange={(target) => onChange({ ...goal, target })}
            />
            <label className="flex-1">
              <span className="mb-1 block text-xs text-neutral-500">Unit</span>
              <input
                value={goal.unit}
                onChange={(e) => onChange({ ...goal, unit: e.target.value.slice(0, 20) })}
                placeholder="glasses"
                className="w-full rounded-lg bg-container-highest px-3 py-2 text-neutral-900 outline-none dark:text-neutral-50"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {UNIT_SUGGESTIONS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onChange({ ...goal, unit: u })}
                aria-pressed={goal.unit === u}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95"
                style={
                  goal.unit === u
                    ? { background: color, color: '#fff' }
                    : { background: 'rgb(var(--container-high))', color: 'rgb(115 115 115)' }
                }
              >
                {u}
              </button>
            ))}
          </div>
          <NumberField
            label="Each + and − changes it by"
            value={goal.step}
            onChange={(step) => onChange({ ...goal, step })}
          />
          <p className="text-xs text-neutral-400">
            The day counts as done once you reach {goal.target || '…'} {goal.unit}.
          </p>
        </div>
      )}
    </div>
  )
}

/** A positive number input that tolerates being cleared while typing. */
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value))
  // Follow outside changes (e.g. a template), but not while the typed text already means this value.
  useEffect(() => {
    if (Number(text) !== value) setText(String(value))
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="flex-1">
      <span className="mb-1 block text-xs text-neutral-500">{label}</span>
      <input
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(',', '.')
          if (!/^\d*\.?\d{0,2}$/.test(t)) return
          setText(t)
          onChange(Number(t) || 0)
        }}
        className="w-full rounded-lg bg-container-highest px-3 py-2 tabular-nums text-neutral-900 outline-none dark:text-neutral-50"
      />
    </label>
  )
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</div>
      {children}
    </div>
  )
}
