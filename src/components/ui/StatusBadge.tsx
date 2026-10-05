import { Badge, type BadgeVariant } from './Badge'
import {
  CircleDashed,
  Clock,
  CircleCheck,
  OctagonAlert,
  Ban,
  ArrowUp,
  ArrowDown,
  Minus,
  type LucideIcon,
} from 'lucide-react'

// ── Public helpers (exported) — map string statuses to a BadgeVariant ──

const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  awaiting_human_decision: 'accent',
  awaiting_more_information: 'warning',
  active: 'success',
  done: 'success',
  connected: 'success',
  completed: 'success',
  in_progress: 'info',
  todo: 'neutral',
  blocked: 'error',
  cancelled: 'neutral',
  inactive: 'neutral',
  disconnected: 'error',
  pending: 'warning',
  draft: 'neutral',
}

const CATEGORY_VARIANT_MAP: Record<string, BadgeVariant> = {
  decision: 'accent',
  preference: 'info',
  rule: 'warning',
  learned: 'success',
  context: 'info',
  note: 'default',
}

const PRIORITY_VARIANT_MAP: Record<string, BadgeVariant> = {
  urgent: 'error',
  high: 'warning',
  medium: 'neutral',
  low: 'neutral',
}

const SOURCE_VARIANT_MAP: Record<string, BadgeVariant> = {
  local: 'info',
  community: 'success',
  imported: 'accent',
  builtin: 'neutral',
}

// ── Ícones por status / prioridade (Spec 02 §3) ──
// Status e prioridade nunca são só cor — sempre acompanham um ícone.

const STATUS_ICON_MAP: Record<string, LucideIcon> = {
  awaiting_human_decision: CircleDashed,
  awaiting_more_information: Clock,
  todo: CircleDashed,
  in_progress: Clock,
  pending: Clock,
  done: CircleCheck,
  completed: CircleCheck,
  active: CircleCheck,
  connected: CircleCheck,
  blocked: OctagonAlert,
  disconnected: OctagonAlert,
  cancelled: Ban,
  inactive: Ban,
}

const PRIORITY_ICON_MAP: Record<string, LucideIcon> = {
  urgent: OctagonAlert,
  high: ArrowUp,
  medium: Minus,
  low: ArrowDown,
}

export type BadgeType = 'status' | 'category' | 'priority' | 'source' | 'tag'

interface StatusBadgeProps {
  type?: BadgeType
  value: string
  label?: string
}

export function StatusBadge({ type = 'status', value, label }: StatusBadgeProps) {
  const normalized = value.toLowerCase().replace(/\s+/g, '_')
  const variant = getVariant(type, value)
  const displayLabel = label ?? formatLabel(value)
  const Icon = getIcon(type, normalized)

  return (
    <Badge variant={variant}>
      {/* eslint-disable-next-line react-hooks/static-components -- ícone vem de um mapa estático do módulo, não é criado no render */}
      {Icon ? <Icon className="h-3 w-3" strokeWidth={2} aria-hidden /> : null}
      {displayLabel}
    </Badge>
  )
}

function getIcon(type: BadgeType, normalized: string): LucideIcon | null {
  if (type === 'status') return STATUS_ICON_MAP[normalized] ?? null
  if (type === 'priority') return PRIORITY_ICON_MAP[normalized] ?? null
  return null
}

/** Map a (type, value) pair to a BadgeVariant. */
function getVariant(type: BadgeType, value: string): BadgeVariant {
  const normalized = value.toLowerCase().replace(/\s+/g, '_')

  switch (type) {
    case 'status':
      return STATUS_VARIANT_MAP[normalized] ?? 'neutral'
    case 'category':
      return CATEGORY_VARIANT_MAP[normalized] ?? 'info'
    case 'priority':
      return PRIORITY_VARIANT_MAP[normalized] ?? 'neutral'
    case 'source':
      return SOURCE_VARIANT_MAP[normalized] ?? 'info'
    case 'tag':
      return 'info'
    default:
      return 'neutral'
  }
}

function formatLabel(value: string): string {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
