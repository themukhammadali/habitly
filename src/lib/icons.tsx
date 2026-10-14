import {
  AlarmClock, Apple, Bed, Bike, BookOpen, Brain, Brush, CigaretteOff, Code, Coffee,
  CookingPot, Dog, Droplet, Dumbbell, Flower2, Footprints, Gamepad2, GlassWater, Guitar,
  HandHeart, Headphones, Heart, HeartPulse, Languages, Laptop, Leaf, Moon, Mountain,
  Music, Palette, PenLine, PhoneOff, PiggyBank, Pill, Salad, Scale, Smile, Sparkles,
  Sprout, Sun, Target, Timer, Users, Wallet, Waves, WineOff,
  type LucideIcon,
} from 'lucide-react'

export const ICONS: { key: string; Icon: LucideIcon }[] = [
  { key: 'droplet', Icon: Droplet },
  { key: 'glass-water', Icon: GlassWater },
  { key: 'footprints', Icon: Footprints },
  { key: 'dumbbell', Icon: Dumbbell },
  { key: 'bike', Icon: Bike },
  { key: 'waves', Icon: Waves },
  { key: 'mountain', Icon: Mountain },
  { key: 'heart-pulse', Icon: HeartPulse },
  { key: 'book', Icon: BookOpen },
  { key: 'pen', Icon: PenLine },
  { key: 'brain', Icon: Brain },
  { key: 'languages', Icon: Languages },
  { key: 'code', Icon: Code },
  { key: 'laptop', Icon: Laptop },
  { key: 'flower', Icon: Flower2 },
  { key: 'leaf', Icon: Leaf },
  { key: 'salad', Icon: Salad },
  { key: 'apple', Icon: Apple },
  { key: 'cooking', Icon: CookingPot },
  { key: 'coffee', Icon: Coffee },
  { key: 'pill', Icon: Pill },
  { key: 'bed', Icon: Bed },
  { key: 'moon', Icon: Moon },
  { key: 'sun', Icon: Sun },
  { key: 'alarm', Icon: AlarmClock },
  { key: 'timer', Icon: Timer },
  { key: 'smile', Icon: Smile },
  { key: 'brush', Icon: Brush },
  { key: 'sparkles', Icon: Sparkles },
  { key: 'piggy-bank', Icon: PiggyBank },
  { key: 'wallet', Icon: Wallet },
  { key: 'scale', Icon: Scale },
  { key: 'guitar', Icon: Guitar },
  { key: 'music', Icon: Music },
  { key: 'headphones', Icon: Headphones },
  { key: 'palette', Icon: Palette },
  { key: 'gamepad', Icon: Gamepad2 },
  { key: 'sprout', Icon: Sprout },
  { key: 'dog', Icon: Dog },
  { key: 'users', Icon: Users },
  { key: 'hand-heart', Icon: HandHeart },
  { key: 'heart', Icon: Heart },
  { key: 'target', Icon: Target },
  { key: 'no-smoking', Icon: CigaretteOff },
  { key: 'no-alcohol', Icon: WineOff },
  { key: 'no-phone', Icon: PhoneOff },
]

export const DEFAULT_ICON = 'target'

/** Maps the emoji icons used before v1.1 to the new icon keys. */
const EMOJI_TO_ICON: Record<string, string> = {
  '💧': 'droplet', '🏃': 'footprints', '🏋️': 'dumbbell', '🚭': 'no-smoking',
  '📚': 'book', '🧘': 'flower', '🥗': 'salad', '💊': 'pill', '😴': 'bed',
  '🦷': 'smile', '🧹': 'sparkles', '💰': 'piggy-bank', '✍️': 'pen',
  '🎸': 'guitar', '🌱': 'sprout', '☀️': 'sun', '🚶': 'footprints', '🚴': 'bike',
  '🧠': 'brain', '❤️': 'heart', '📵': 'no-phone', '🍎': 'apple', '🛏️': 'bed',
  '🧴': 'sparkles', '🎯': 'target', '⏰': 'alarm', '🙏': 'hand-heart',
  '🎨': 'palette', '🐶': 'dog', '☕': 'coffee', '✅': 'target',
}

export function normalizeIcon(icon: string | undefined): string {
  if (icon && ICONS.some((i) => i.key === icon)) return icon
  return (icon && EMOJI_TO_ICON[icon]) || DEFAULT_ICON
}

export function HabitIcon({
  name,
  className,
  style,
}: {
  name: string
  className?: string
  style?: React.CSSProperties
}) {
  const Icon = ICONS.find((i) => i.key === name)?.Icon ?? Target
  return <Icon className={className} style={style} strokeWidth={2} aria-hidden />
}
