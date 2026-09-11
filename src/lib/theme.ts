export type ThemeName = 'terra' | 'midnight' | 'nordic' | 'sunset'

export const THEMES: { value: ThemeName; label: string; meta: string }[] = [
  { value: 'terra', label: 'Terra (warm light)', meta: '#ECE5D8' },
  { value: 'midnight', label: 'Midnight (warm dark)', meta: '#15130F' },
  { value: 'nordic', label: 'Nordic (cool light)', meta: '#F2F4F7' },
  { value: 'sunset', label: 'Sunset (plum + peach)', meta: '#2A1B2E' },
]

const VALID = new Set<ThemeName>(THEMES.map((t) => t.value))

export function isThemeName(v: unknown): v is ThemeName {
  return typeof v === 'string' && VALID.has(v as ThemeName)
}

/** Apply theme class to <html> and sync the iOS status-bar meta colour. */
export function applyTheme(name: ThemeName) {
  const html = document.documentElement
  for (const t of THEMES) html.classList.remove('theme-' + t.value)
  html.classList.add('theme-' + name)
  const meta = THEMES.find((t) => t.value === name)?.meta
  if (meta) {
    const tag = document.querySelector('meta[name="theme-color"]')
    if (tag) tag.setAttribute('content', meta)
  }
}

export const MIN_ZOOM = 80
export const MAX_ZOOM = 150
export const DEFAULT_ZOOM = 100

export function applyZoom(percent: number) {
  const p = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, percent || DEFAULT_ZOOM))
  document.documentElement.style.fontSize = (p / 100) * 16 + 'px'
}
