import { useRef, useState } from 'react'
import { Bell, Check, Lock, Plus } from 'lucide-react'
import Logo from './Logo'

interface Slide {
  title: string
  body: string
  art: () => React.ReactNode
}

const SLIDES: Slide[] = [
  {
    title: 'Build habits that stick',
    body: 'Track the small things you do every day and watch your streaks grow.',
    art: () => <HeatmapArt />,
  },
  {
    title: 'One tap to check off',
    body: 'Tick a habit when it’s done, or count up to a goal like 8 glasses of water.',
    art: () => <CardArt />,
  },
  {
    title: 'Reminders that learn',
    body: 'Habitly notices when you usually do each habit and reminds you just before.',
    art: () => <ReminderArt />,
  },
  {
    title: 'Private, and yours',
    body: 'No account, no ads. Everything stays on this phone, and the app is open source.',
    art: () => <PrivateArt />,
  },
]

/**
 * The first-run intro: swipe or tap through four short screens, then start by
 * adding a habit. Shown once; "Skip" ends it early.
 */
export default function Onboarding({ onDone }: { onDone: (addHabit: boolean) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const last = index === SLIDES.length - 1

  function go(i: number) {
    track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-surface pb-safe pt-safe animate-fade-in" role="dialog" aria-label="Welcome to Habitly">
      <div className="flex items-center justify-between px-5 pt-3">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">Habitly</span>
        </div>
        {!last && (
          <button
            type="button"
            onClick={() => onDone(false)}
            className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-500 active:bg-container-high"
          >
            Skip
          </button>
        )}
      </div>

      <div
        ref={track}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto no-scrollbar"
        onScroll={(e) => {
          const el = e.currentTarget
          setIndex(Math.round(el.scrollLeft / el.clientWidth))
        }}
      >
        {SLIDES.map((s, i) => (
          <section
            key={s.title}
            aria-hidden={i !== index}
            className="flex w-full shrink-0 snap-center flex-col items-center justify-center px-8 text-center"
          >
            {/* Always drawn, so swiping shows it; the key replays its animation on arrival. */}
            <div key={i === index ? 'active' : 'idle'} className="flex h-64 w-full max-w-xs items-center justify-center">
              {s.art()}
            </div>
            <h2 className="mt-8 text-[28px] font-extrabold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">
              {s.title}
            </h2>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 px-6 pb-6">
        <div className="flex gap-2" aria-label={`Step ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Go to step ${i + 1}`}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all duration-300 ease-spring ${
                i === index ? 'w-6 bg-primary' : 'w-2 bg-container-highest'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (last ? onDone(true) : go(index + 1))}
          className="h-14 w-full max-w-sm rounded-full bg-primary text-base font-bold text-on-primary transition duration-300 ease-spring active:scale-[0.97]"
        >
          {last ? 'Add your first habit' : 'Next'}
        </button>
      </div>
    </div>
  )
}

/** A heatmap filling in, dot by dot. */
function HeatmapArt() {
  // A plausible history: a few gaps early on, more consistent recently.
  const done = new Set([0, 1, 2, 5, 6, 8, 9, 11, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28, 29, 30, 31, 32, 33, 34])
  return (
    <div className="grid grid-cols-7 gap-2 rounded-card bg-container p-5">
      {Array.from({ length: 35 }, (_, i) => (
        <span
          key={i}
          className={`h-6 w-6 rounded-full ${done.has(i) ? 'animate-dot-in bg-primary' : 'bg-container-high'}`}
          style={done.has(i) ? { animationDelay: `${150 + i * 35}ms` } : undefined}
        />
      ))}
    </div>
  )
}

/** A habit card whose button ticks itself, and a counter counting up. */
function CardArt() {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-3 rounded-card bg-container p-4 text-left animate-rise">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <Check className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="font-bold text-neutral-900 dark:text-neutral-50">Read</div>
          <div className="text-sm text-neutral-500">12 days streak</div>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary animate-tick">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-card bg-container p-4 text-left animate-rise" style={{ animationDelay: '150ms' }}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/15 text-sky-500">
          <Plus className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="font-bold text-neutral-900 dark:text-neutral-50">Drink water</div>
          <div className="text-sm text-neutral-500">6/8 glasses</div>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-sky-500 border-r-sky-500/25 text-sm font-bold text-neutral-900 dark:text-neutral-50">
          6
        </span>
      </div>
    </div>
  )
}

/** A notification sliding in at the usual time. */
function ReminderArt() {
  return (
    <div className="w-full">
      <div className="mx-auto mb-4 w-max rounded-full bg-container px-4 py-1.5 text-sm font-bold tabular-nums text-neutral-500">7:15</div>
      <div className="flex items-start gap-3 rounded-3xl bg-container p-4 text-left shadow-lg shadow-black/5 animate-notify">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <div className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Read</div>
          <div className="text-sm text-neutral-500">You usually do this around 7:30.</div>
          <div className="mt-2 inline-block rounded-full bg-primary-container px-3 py-1 text-xs font-bold text-on-primary-container">
            Mark done
          </div>
        </div>
      </div>
    </div>
  )
}

/** A lock on a soft shape. */
function PrivateArt() {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <span className="absolute inset-0 rounded-[48px] bg-primary-container animate-breathe" />
      <Lock className="relative h-16 w-16 text-on-primary-container animate-rise" strokeWidth={2} />
    </div>
  )
}
