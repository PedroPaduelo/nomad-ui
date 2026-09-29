import type { ReactNode, SVGProps } from 'react'

/** Ícones do pacote em SVG inline (traços do lucide, 1,75), sem dependência. Decorativos (aria-hidden). */
function Stroke({
  children,
  size = 16,
  ...rest
}: { children: ReactNode; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="ntb-ico"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <Stroke {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Stroke>
)
export const ChevronDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <Stroke {...p}>
    <path d="m6 9 6 6 6-6" />
  </Stroke>
)
export const UserIcon = (p: SVGProps<SVGSVGElement>) => (
  <Stroke {...p}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Stroke>
)
export const SwitchIcon = (p: SVGProps<SVGSVGElement>) => (
  <Stroke {...p}>
    <path d="M8 3 4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </Stroke>
)
export const LogoutIcon = (p: SVGProps<SVGSVGElement>) => (
  <Stroke {...p}>
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
  </Stroke>
)
export const BuildingIcon = (p: SVGProps<SVGSVGElement>) => (
  <Stroke {...p}>
    <path d="M10 12h4" />
    <path d="M10 8h4" />
    <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
    <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
    <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
  </Stroke>
)

/** Grade 3×3 de pontos cheios (botão da grade de apps, como no design da Conta Nommand). */
export function GridIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="ntb-ico-18"
    >
      {[5, 12, 19].flatMap((y) =>
        [5, 12, 19].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={2} />),
      )}
    </svg>
  )
}
