import { useMemo } from 'react'
import { fromKey } from '../lib/dates'

const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeeklyPattern({
  completions,
  color,
}: {
  completions: Record<string, true>
  color: string
}) {
  const counts = useMemo(() => {
    const c = [0, 0, 0, 0, 0, 0, 0]
    for (const k of Object.keys(completions)) {
      const dow = (fromKey(k).getDay() + 6) % 7 // Monday = 0
      c[dow]++
    }
    return c
  }, [completions])

  const max = Math.max(1, ...counts)

  return (
    <div className="flex h-28 items-end justify-between gap-2">
      {counts.map((n, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-md transition-all"
              style={{
                height: `${(n / max) * 100}%`,
                minHeight: n > 0 ? '4px' : '0',
                background: color,
                opacity: 0.85,
              }}
            />
          </div>
          <span className="text-[10px] text-neutral-400">{LABELS[i]}</span>
        </div>
      ))}
    </div>
  )
}
