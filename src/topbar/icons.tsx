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
/** Sino de notificações (botão de `NotificationsButton`; v1.6.0). */
export const BellIcon = (p: SVGProps<SVGSVGElement>) => (
  <Stroke {...p}>
    <path d="M10.268 21a2 2 0 0 0 3.464 0" />
    <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
  </Stroke>
)
/** Ponto de interrogação (menu de ajuda `helpLinks`; v1.6.0). */
export const HelpIcon = (p: SVGProps<SVGSVGElement>) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </Stroke>
)
/** Sol/lua (item de tema do menu da conta; v1.6.0). */
export const ThemeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Stroke {...p}>
    <path d="M12 2v2" />
    <path d="m4.9 4.9 1.4 1.4" />
    <path d="M20 12h2" />
    <path d="m19.1 4.9-1.4 1.4" />
    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path d="M17.5 17.5A9 9 0 0 1 6.5 6.5a9 9 0 1 0 11 11Z" />
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
