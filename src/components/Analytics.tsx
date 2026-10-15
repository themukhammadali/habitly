import { useMemo } from 'react'
import { useStore } from '../store'
import { colorHex } from '../lib/palette'
import { formatAmount } from '../lib/measure'
import { HabitIcon } from '../lib/icons'
import { WEEKDAYS_SHORT, fromKey } from '../lib/dates'
import { DAY_PARTS, habitStats, timeOfDay, weekSummary, weekdayRates, weeklyTrend } from '../lib/stats'

export default function Analytics() {
  const habits = useStore((s) => s.habits)
  const active = useMemo(() => habits.filter((h) => !h.archived), [habits])

  const week = useMemo(() => weekSummary(active), [active])
  const trend = useMemo(() => weeklyTrend(active), [active])
  const weekdays = useMemo(() => weekdayRates(active), [active])
  const parts = useMemo(() => timeOfDay(active), [active])
  const perHabit = useMemo(() => habitStats(active), [active])

  if (active.length === 0) {
    return (
      <div className="px-8 pt-24 text-center">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">No data yet</h2>
        <p className="mt-1 text-sm text-neutral-400">Add a habit and check it off for a few days to see your trends here.</p>
      </div>
    )
  }

  const best = perHabit.reduce((a, b) => (b.streak > a.streak ? b : a), perHabit[0])
  const rated = weekdays.map((r, i) => ({ r, i })).filter((d) => d.r !== null) as { r: number; i: number }[]
  const bestDay = rated.length > 1 ? rated.reduce((a, b) => (b.r > a.r ? b : a)) : null
  const worstDay = rated.length > 1 ? rated.reduce((a, b) => (b.r < a.r ? b : a)) : null
  const partsTotal = parts.reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4 px-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <Label>This week</Label>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {week.rate === null ? '—' : `${week.rate}%`}
          </div>
          <Change value={week.change} suffix=" pts vs last week" />
        </Card>
        <Card>
          <Label>Check-ins</Label>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{week.checkIns}</div>
          <div className="text-xs text-neutral-400">{week.lastWeekCheckIns} last week</div>
        </Card>
      </div>

      {best.streak > 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <IconBadge icon={best.habit.icon} color={best.habit.color} />
            <div className="min-w-0 flex-1">
              <Label>Longest current streak</Label>
              <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">{best.habit.name}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: colorHex(best.habit.color) }}>{best.streak}</div>
              <div className="text-xs text-neutral-400">{best.streakUnit}s</div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <Label>Last 12 weeks</Label>
        <div className="flex h-32 items-end gap-1.5" role="img" aria-label="Weekly completion rate for the last 12 weeks">
          {trend.map((w, i) => {
            const current = i === trend.length - 1
            return (
              <div key={w.start} className="flex h-full flex-1 flex-col justify-end" title={`${w.rate ?? '—'}%`}>
                <div
                  className={`w-full rounded-md ${current ? 'bg-emerald-500' : 'bg-emerald-500/40'}`}
                  style={{ height: w.rate === null ? 0 : `${Math.max(w.rate, 3)}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-neutral-400">
          <span>{shortDate(trend[0].start)}</span>
          <span>{shortDate(trend[Math.floor(trend.length / 2)].start)}</span>
          <span>This week</span>
        </div>
      </Card>

      <Card>
        <Label>By weekday</Label>
        <div className="space-y-1.5">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div key={d} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-neutral-400">{d}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div
                  className={`h-full rounded-full ${i === worstDay?.i ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${weekdays[i] ?? 0}%` }}
                />
              </div>
              <span className="w-9 text-right tabular-nums text-neutral-500">{weekdays[i] === null ? '—' : `${weekdays[i]}%`}</span>
            </div>
          ))}
        </div>
        {bestDay && worstDay && bestDay.i !== worstDay.i && (
          <p className="mt-3 text-xs text-neutral-400">
            You’re most consistent on {WEEKDAYS_LONG[bestDay.i]} and slip most on {WEEKDAYS_LONG[worstDay.i]}.
          </p>
        )}
      </Card>

      <Card>
        <Label>Time of day</Label>
        {partsTotal === 0 ? (
          <p className="text-sm text-neutral-400">Check habits off on the day you do them to see when you’re most active.</p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full">
              {parts.map((n, i) =>
                n ? <div key={i} className={PART_COLORS[i]} style={{ width: `${(n / partsTotal) * 100}%` }} /> : null,
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DAY_PARTS.map((p, i) => (
                <div key={p.key} className="flex items-center gap-2 text-xs">
                  <span className={`h-2.5 w-2.5 rounded-full ${PART_COLORS[i]}`} />
                  <span className="flex-1 text-neutral-500">{p.label}</span>
                  <span className="tabular-nums text-neutral-400">{Math.round((parts[i] / partsTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <div>
        <div className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-neutral-400">Habits · last 30 days</div>
        <div className="space-y-0.5 overflow-hidden rounded-2xl">
          {perHabit.map((s) => (
            <div key={s.habit.id} className="flex items-center gap-3 bg-container px-4 py-3">
              <IconBadge icon={s.habit.icon} color={s.habit.color} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">{s.habit.name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                    {s.rate === null ? '—' : `${s.rate}%`}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${s.rate ?? 0}%`, background: colorHex(s.habit.color) }} />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-neutral-400">
                  <span>
                    {s.streak} {s.streakUnit}{s.streak === 1 ? '' : 's'} streak
                    {s.average !== null && s.habit.goal && ` · avg ${formatAmount(s.average)} ${s.habit.goal.unit}/day`}
                  </span>
                  <Change value={s.change} suffix=" pts" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const WEEKDAYS_LONG = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays']
const PART_COLORS = ['bg-amber-400', 'bg-sky-400', 'bg-violet-500', 'bg-indigo-800 dark:bg-indigo-400']

function shortDate(key: string) {
  return fromKey(key).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function Change({ value, suffix }: { value: number | null; suffix: string }) {
  if (value === null) return <div className="text-xs text-neutral-400">&nbsp;</div>
  const tone = value > 0 ? 'text-emerald-600 dark:text-emerald-400' : value < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'
  return (
    <span className={`text-xs ${tone}`}>
      {value > 0 ? '▲ ' : value < 0 ? '▼ ' : ''}
      {Math.abs(value)}
      {suffix}
    </span>
  )
}

function IconBadge({ icon, color }: { icon: string; color: string }) {
  const hex = colorHex(color)
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${hex}22` }}>
      <HabitIcon name={icon} className="h-[18px] w-[18px]" style={{ color: hex }} />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-container p-4">{children}</div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">{children}</div>
}
