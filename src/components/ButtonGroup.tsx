import { Check } from 'lucide-react'

/**
 * Material 3 connected button group: options sit side by side with small
 * gaps, the outer ends fully rounded, and the selected one filled with a check.
 * `color` fills the selection (a habit's color); without it, the palette accent.
 */
export default function ButtonGroup<T extends string>({
  value,
  options,
  onChange,
  color,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  color?: string
  label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {options.map((o, i) => {
        const selected = value === o.value
        const ends = `${i === 0 ? 'rounded-l-full' : 'rounded-l-lg'} ${i === options.length - 1 ? 'rounded-r-full' : 'rounded-r-lg'}`
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1 px-2 py-2.5 text-sm font-semibold transition-all duration-300 ease-spring active:scale-95 ${ends} ${
              selected
                ? color
                  ? 'text-white'
                  : 'bg-primary text-on-primary'
                : 'bg-container-high text-neutral-600 dark:text-neutral-300'
            }`}
            style={selected && color ? { background: color } : undefined}
          >
            {selected && <Check className="h-4 w-4 shrink-0" strokeWidth={2.75} />}
            <span className="truncate">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
