import { useState } from 'react'
import type { Habit } from '../types'
import { ICONS, PALETTE, colorHex } from '../lib/palette'
import { useStore } from '../store'
import Sheet from './Sheet'

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
  const editing = !!habit

  const [name, setName] = useState(habit?.name ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [icon, setIcon] = useState(habit?.icon ?? ICONS[0])
  const [color, setColor] = useState(habit?.color ?? PALETTE[0].key)

  const hex = colorHex(color)
  const canSave = name.trim().length > 0

  function save() {
    if (!canSave) return
    if (editing && habit) {
      updateHabit(habit.id, { name: name.trim(), description: description.trim(), icon, color })
    } else {
      addHabit({ name: name.trim(), description: description.trim(), icon, color })
    }
    onClose()
  }

  return (
    <Sheet title={editing ? 'Edit Habit' : 'New Habit'} onClose={onClose}>
      <div className="space-y-5">
        {/* Preview */}
        <div className="flex items-center gap-3 rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl"
            style={{ background: `${hex}22` }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-neutral-900 dark:text-neutral-50">
              {name || 'Habit name'}
            </div>
            <div className="truncate text-sm text-neutral-400">
              {description || 'Description'}
            </div>
          </div>
        </div>

        <Field label="Name">
          <input
            autoFocus={!editing}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Drink Water"
            maxLength={40}
            className="w-full rounded-xl bg-neutral-100 px-3 py-2.5 text-neutral-900 outline-none ring-2 ring-transparent focus:ring-current dark:bg-neutral-800 dark:text-neutral-50"
            style={{ color: undefined, caretColor: hex }}
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
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className="flex aspect-square items-center justify-center rounded-xl text-xl transition active:scale-90"
                style={{
                  background: icon === ic ? `${hex}26` : 'rgba(120,120,128,0.1)',
                  outline: icon === ic ? `2px solid ${hex}` : 'none',
                }}
              >
                {ic}
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

        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="w-full rounded-xl py-3 font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          style={{ background: hex }}
        >
          {editing ? 'Save Changes' : 'Create Habit'}
        </button>

        {editing && habit && (
          <button
            type="button"
            onClick={() => {
              deleteHabit(habit.id)
              onClose()
            }}
            className="w-full rounded-xl py-3 font-medium text-red-500 transition active:scale-[0.98]"
          >
            Delete Habit
          </button>
        )}
      </div>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </label>
      {children}
    </div>
  )
}
