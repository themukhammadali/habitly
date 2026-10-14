import { useState } from 'react'
import type { Habit, Reminder, Schedule } from '../types'
import { PALETTE, colorHex } from '../lib/palette'
import { DEFAULT_ICON, HabitIcon, ICONS } from '../lib/icons'
import { WEEKDAYS_SHORT, formatTime, todayKey } from '../lib/dates'
import { predict, MIN_SAMPLES } from '../lib/predict'
import { reminderTime } from '../lib/reminders'
import { ensurePermission, remindersSupported } from '../lib/notify'
import { useStore } from '../store'
import Sheet from './Sheet'
import { useToast } from './Toast'

export default function HabitSheet({
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

  const [name, setName] = useState(habit?.name ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [icon, setIcon] = useState(habit?.icon ?? DEFAULT_ICON)
  const [color, setColor] = useState(habit?.color ?? PALETTE[0].key)
  const [schedule, setSchedule] = useState<Schedule>(habit?.schedule ?? { kind: 'daily' })
  const [reminder, setReminder] = useState<Reminder>(
    habit?.reminder ?? { mode: remindersSupported() ? 'smart' : 'off', time: 9 * 60 },
  )

  const hex = colorHex(color)
  const canSave = name.trim().length > 0

  async function save(close: () => void) {
    if (!canSave) return
    const fields = { name: name.trim(), description: description.trim(), icon, color, schedule, reminder }
    if (editing && habit) updateHabit(habit.id, fields)
    else addHabit(fields)
    close()
    if (reminder.mode !== 'off' && remindersSupported() && !(await ensurePermission())) {
      showToast('Notifications are off for Habitly. Turn them on in Android settings to get reminders.')
    }
  }

  return (
    <Sheet title={editing ? 'Edit Habit' : 'New Habit'} onClose={onClose}>
      {(close) => (
        <div className="space-y-6">
          {/* Preview */}
          <div className="flex items-center gap-3 rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${hex}22` }}>
              <HabitIcon name={icon} className="h-6 w-6" style={{ color: hex }} />
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold text-neutral-900 dark:text-neutral-50">{name || 'Habit name'}</div>
              <div className="truncate text-sm text-neutral-400">{description || 'Description'}</div>
            </div>
          </div>

          <Field label="Name">
            <input
              autoFocus={!editing}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Drink Water"
              maxLength={40}
              className="w-full rounded-xl bg-neutral-100 px-3 py-2.5 text-neutral-900 outline-none dark:bg-neutral-800 dark:text-neutral-50"
              style={{ caretColor: hex }}
            />
          </Field>

          <Field label="Description">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Drink 3 litres of water a day"
              maxLength={60}
              className="w-full rounded-xl bg-neutral-100 px-3 py-2.5 text-neutral-900 outline-none dark:bg-neutral-800 dark:text-neutral-50"
              style={{ caretColor: hex }}
            />
          </Field>

          <Field label="Icon">
            <div className="grid grid-cols-8 gap-2">
              {ICONS.map(({ key }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  aria-label={key}
                  aria-pressed={icon === key}
                  className="flex aspect-square items-center justify-center rounded-xl transition active:scale-90"
                  style={{
                    background: icon === key ? `${hex}26` : 'rgba(120,120,128,0.1)',
                    outline: icon === key ? `2px solid ${hex}` : 'none',
                    color: icon === key ? hex : undefined,
                  }}
                >
                  <HabitIcon name={key} className={`h-5 w-5 ${icon === key ? "" : "text-neutral-600 dark:text-neutral-300"}`} />
                </button>
              ))}
            </div>
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

          <Field label="Repeat">
            <ScheduleEditor schedule={schedule} onChange={setSchedule} color={hex} />
          </Field>

          <Field label="Reminder">
            <ReminderEditor habit={habit ?? null} reminder={reminder} onChange={setReminder} color={hex} />
          </Field>

          <button
            type="button"
            onClick={() => save(close)}
            disabled={!canSave}
            className="w-full rounded-xl py-3 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
            style={{ background: hex }}
          >
            {editing ? 'Save Changes' : 'Create Habit'}
          </button>

          {editing && habit && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setArchived(habit.id, true)
                  close()
                  showToast(`Archived “${habit.name}”`, { label: 'Undo', run: () => setArchived(habit.id, false) })
                }}
                className="w-full rounded-xl py-3 font-medium text-neutral-500 transition active:scale-[0.98]"
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
                className="w-full rounded-xl py-3 font-medium text-red-500 transition active:scale-[0.98]"
              >
                Delete Habit
              </button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
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
      <Segmented
        color={color}
        value={schedule.kind}
        options={[
          { value: 'daily', label: 'Every day' },
          { value: 'weekdays', label: 'Some days' },
          { value: 'weekly', label: 'Times a week' },
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
                className="flex h-10 flex-1 items-center justify-center rounded-xl text-xs font-semibold transition active:scale-90"
                style={{
                  background: on ? color : 'rgba(120,120,128,0.12)',
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
        <div className="flex items-center justify-between rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-semibold text-neutral-700 shadow-sm transition active:scale-90 disabled:opacity-30 dark:bg-neutral-700 dark:text-neutral-100"
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
      <Segmented
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
        <div className="space-y-2 rounded-xl bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
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
              className="w-full rounded-lg bg-white px-3 py-2 text-neutral-900 outline-none dark:bg-neutral-700 dark:text-neutral-50"
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

function Segmented<T extends string>({
  value,
  options,
  onChange,
  color,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  color: string
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className="flex-1 rounded-lg py-2 text-sm font-medium transition"
          style={
            value === o.value
              ? { background: color, color: '#fff' }
              : { color: 'rgb(115 115 115)' }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
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
