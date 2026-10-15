/**
 * Habitly's mark, used by the opening animation and the intro.
 * Placeholder until the final logo is drawn: replace this component's SVG
 * and everything that shows the logo follows.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="Habitly">
      <rect width="96" height="96" rx="30" className="fill-primary" />
      <path
        d="M29 50l13 13 26-29"
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-on-primary"
      />
    </svg>
  )
}
