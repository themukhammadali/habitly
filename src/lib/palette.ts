// Accent colors, Streaks-inspired. Each is the base "completed" dot color.
export interface PaletteColor {
  key: string
  name: string
  hex: string
}

export const PALETTE: PaletteColor[] = [
  { key: 'emerald', name: 'Emerald', hex: '#2fb170' },
  { key: 'sand', name: 'Sand', hex: '#c9a36a' },
  { key: 'slate', name: 'Slate', hex: '#7c8896' },
  { key: 'violet', name: 'Violet', hex: '#8b6fd6' },
  { key: 'red', name: 'Red', hex: '#e0524b' },
  { key: 'pink', name: 'Pink', hex: '#e0699a' },
  { key: 'indigo', name: 'Indigo', hex: '#5b7cf0' },
  { key: 'blue', name: 'Blue', hex: '#3b9ad6' },
  { key: 'teal', name: 'Teal', hex: '#1f9b8e' },
  { key: 'amber', name: 'Amber', hex: '#e0962b' },
]

export function colorHex(key: string): string {
  return PALETTE.find((c) => c.key === key)?.hex ?? PALETTE[0].hex
}

// Suggested emoji icons for the picker.
export const ICONS = [
  '💧', '🏃', '🏋️', '🚭', '📚', '🧘', '🥗', '💊', '😴', '🦷',
  '🧹', '💰', '✍️', '🎸', '🌱', '☀️', '🚶', '🚴', '🧠', '❤️',
  '📵', '🍎', '🛏️', '🧴', '🎯', '⏰', '🙏', '🎨', '🐶', '☕',
]
