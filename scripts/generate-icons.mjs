// Generates the PWA / iOS icon set: a Terra "topographic" mark of concentric
// contour rings. Rendered procedurally with pngjs (pure JS — no native deps),
// so it builds reliably on any machine. Run with: npm run generate-icons
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PNG } from 'pngjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
mkdirSync(publicDir, { recursive: true })

// Palette (Terra)
const BG = [236, 229, 216] // #ECE5D8
const CLAY = [180, 95, 56] // #B45F38
const SAGE = [124, 138, 90] // #7C8A5A

// Rings defined on a 512 reference canvas (centre 256,256), drawn outer→inner.
const REF = 512
const CENTER = 256
const STROKE = 11
const RINGS = [
  { r: 168, color: CLAY, alpha: 0.16 },
  { r: 138, color: SAGE, alpha: 0.3 },
  { r: 108, color: CLAY, alpha: 0.45 },
  { r: 78, color: CLAY, alpha: 0.7 },
  { r: 48, color: CLAY, alpha: 1 },
]
const DOT_R = 19

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Alpha-blend `src` (rgb) at coverage `a` over `dst` (rgb), in place on dst. */
function blend(dst, src, a) {
  dst[0] = Math.round(src[0] * a + dst[0] * (1 - a))
  dst[1] = Math.round(src[1] * a + dst[1] * (1 - a))
  dst[2] = Math.round(src[2] * a + dst[2] * (1 - a))
}

function renderIcon(size) {
  const png = new PNG({ width: size, height: size })
  const k = size / REF
  const cx = CENTER * k
  const cy = CENTER * k
  const half = (STROKE * k) / 2
  const dotR = DOT_R * k

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      const px = [BG[0], BG[1], BG[2]]

      // concentric ring strokes (1px anti-aliased band)
      for (const ring of RINGS) {
        const cov = clamp01(half + 0.5 - Math.abs(d - ring.r * k))
        if (cov > 0) blend(px, ring.color, ring.alpha * cov)
      }
      // solid centre dot
      const dotCov = clamp01(dotR + 0.5 - d)
      if (dotCov > 0) blend(px, CLAY, dotCov)

      const idx = (size * y + x) << 2
      png.data[idx] = px[0]
      png.data[idx + 1] = px[1]
      png.data[idx + 2] = px[2]
      png.data[idx + 3] = 255
    }
  }
  return PNG.sync.write(png)
}

const targets = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'maskable-icon-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of targets) {
  writeFileSync(join(publicDir, file), renderIcon(size))
  console.log(`✓ ${file} (${size}x${size})`)
}

// SVG favicon (browsers rasterize SVG favicons natively — no tooling needed)
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#ECE5D8"/>
  <g fill="none" stroke-width="11" stroke-linecap="round">
    <circle cx="256" cy="256" r="168" stroke="#B45F38" stroke-opacity="0.16"/>
    <circle cx="256" cy="256" r="138" stroke="#7C8A5A" stroke-opacity="0.30"/>
    <circle cx="256" cy="256" r="108" stroke="#B45F38" stroke-opacity="0.45"/>
    <circle cx="256" cy="256" r="78"  stroke="#B45F38" stroke-opacity="0.70"/>
    <circle cx="256" cy="256" r="48"  stroke="#B45F38"/>
  </g>
  <circle cx="256" cy="256" r="19" fill="#B45F38"/>
</svg>`
writeFileSync(join(publicDir, 'favicon.svg'), favicon)
console.log('✓ favicon.svg')
console.log('Done - icons written to public/')
