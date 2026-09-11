/**
 * Signature topographic contour lines, drawn faintly behind the Today hero card.
 * Purely decorative (aria-hidden); static, so it respects reduced-motion by nature.
 */
export default function ContourBackdrop({ className = '' }: { className?: string }) {
  // A handful of nested, offset rings read as topographic elevation lines.
  const rings = [
    { rx: 230, ry: 150, stroke: 'var(--accent)', opacity: 0.1 },
    { rx: 190, ry: 124, stroke: 'var(--accent)', opacity: 0.14 },
    { rx: 150, ry: 98, stroke: 'var(--accent-2)', opacity: 0.16 },
    { rx: 112, ry: 73, stroke: 'var(--accent)', opacity: 0.2 },
    { rx: 76, ry: 50, stroke: 'var(--accent)', opacity: 0.26 },
    { rx: 44, ry: 29, stroke: 'var(--accent-2)', opacity: 0.3 },
  ]

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <g transform="translate(248 96)" strokeWidth={2}>
        {rings.map((r, i) => (
          <ellipse
            key={i}
            cx={0}
            cy={0}
            rx={r.rx}
            ry={r.ry}
            stroke={r.stroke}
            strokeOpacity={r.opacity}
          />
        ))}
      </g>
    </svg>
  )
}
