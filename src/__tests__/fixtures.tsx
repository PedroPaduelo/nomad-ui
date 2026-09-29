/** Marca Nommand em SVG inline (mesmo glifo e mesma peça da Conta Nommand). */
export function NommandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Nommand">
      <rect width="32" height="32" rx="8" fill="var(--mark-bg, #172033)" />
      <g fill="none" stroke="var(--mark-on, #fff)" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 22.5V9.5l11 13v-13" />
      </g>
    </svg>
  )
}