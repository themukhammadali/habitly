import { useMemo } from 'react'
import { addDays, toKey, todayKey } from '../lib/dates'

interface Props {
  completions: Record<string, true>
  color: string // hex
  createdAt?: string
  weeks?: number
  onToggleDay?: (key: string) => void
  showMonths?: boolean
}

interface Cell {
  key: string
  inRange: boolean // between createdAt and today
  future: boolean
  done: boolean
}

/**
 * GitHub-style contribution grid: 7 rows (Mon..Sun), N week columns,
 * ending with the current week. Dots scale to fill available width.
 */
export default function YearGrid({
  completions,
  color,
  createdAt,
  weeks = 18,
  onToggleDay,
  showMonths = false,
}: Props) {
  const { columns, monthLabels } = useMemo(() => {
    const today = new Date()
    // Find Monday of the current week.
    const dow = (today.getDay() + 6) % 7 // 0 = Monday
    const lastMonday = addDays(today, -dow)
    const tKey = todayKey()

    const cols: Cell[][] = []
    const labels: { col: number; text: string }[] = []
    let lastMonth = -1

    for (let w = weeks - 1; w >= 0; w--) {
      const weekStart = addDays(lastMonday, -w * 7)
      const col: Cell[] = []
      for (let d = 0; d < 7; d++) {
        const date = addDays(weekStart, d)
        const key = toKey(date)
        const inRange =
          key <= tKey && (!createdAt || key >= createdAt)
        col.push({ key, inRange, future: key > tKey, done: !!completions[key] })
      }
      const colIndex = weeks - 1 - w
      const m = weekStart.getMonth()
      if (m !== lastMonth) {
        const prev = labels[labels.length - 1]
        // Skip labels that would visually collide with the previous one.
        if (!prev || colIndex - prev.col >= 3) {
          labels.push({
            col: colIndex,
            text: weekStart.toLocaleString('en', { month: 'short' }),
          })
        }
        lastMonth = m
      }
      cols.push(col)
    }
    return { columns: cols, monthLabels: labels }
  }, [completions, createdAt, weeks])

  return (
    <div className="w-full">
      {showMonths && (
        <div
          className="relative mb-1 h-3 text-[10px] text-neutral-400"
          style={{ marginLeft: 0 }}
        >
          {monthLabels.map((l) => (
            <span
              key={`${l.col}-${l.text}`}
              className="absolute"
              style={{ left: `${(l.col / columns.length) * 100}%` }}
            >
              {l.text}
            </span>
          ))}
        </div>
      )}
      <div
        className="grid w-full gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
          gridTemplateRows: 'repeat(7, 1fr)',
          gridAutoFlow: 'column',
        }}
      >
        {columns.map((col) =>
          col.map((cell) => (
            <Dot
              key={cell.key}
              cell={cell}
              color={color}
              onToggle={onToggleDay}
            />
          )),
        )}
      </div>
    </div>
  )
}

function Dot({
  cell,
  color,
  onToggle,
}: {
  cell: Cell
  color: string
  onToggle?: (key: string) => void
}) {
  const bg = cell.future
    ? 'transparent'
    : cell.done
      ? color
      : !cell.inRange
        ? 'rgba(120,120,128,0.07)' // before the habit existed
        : 'rgba(120,120,128,0.16)'

  return (
    <button
      type="button"
      disabled={!cell.inRange || !onToggle}
      onClick={() => onToggle?.(cell.key)}
      aria-label={cell.key}
      className="aspect-square w-full rounded-[2px] transition-transform active:scale-90 disabled:cursor-default"
      style={{ background: bg }}
    />
  )
}
