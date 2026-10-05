// ── UI Components (kit do agent-package, components/ui) ──
// Markdown fica fora daqui: entrada própria `@nomad/ui/markdown` (react-markdown é peer opcional).
export { ModalPortal } from './ModalPortal'
export { PageHeader } from './PageHeader'
export { EmptyState } from './EmptyState'
export { ErrorState } from './ErrorState'
export { SearchInput } from './SearchInput'
export { SearchSnippet, parseSnippet } from './SearchSnippet'
export { StatCard } from './StatCard'
export { Badge, badgeVariants } from './Badge'
export type { BadgeVariant } from './Badge'
export { StatusBadge } from './StatusBadge'
export type { BadgeType } from './StatusBadge'
export { TagInput, type TagInputProps } from './TagInput'
export { ConfirmDialog } from './ConfirmDialog'
export { Skeleton, SkeletonText } from './Skeleton'
export { FilterChips } from './FilterChips'
export type { FilterChip } from './FilterChips'

// ── Modal (Dialog) — centralizado ──
export { Modal, ModalHeader, ModalBody, ModalFooter, useDialogAriaIds } from './Modal'
export type {
  ModalProps,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
  ModalSize,
} from './Modal'

// ── Drawer — painel lateral centralizado ──
export {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from './Drawer'
export type {
  DrawerProps,
  DrawerHeaderProps,
  DrawerTitleProps,
  DrawerDescriptionProps,
  DrawerBodyProps,
  DrawerFooterProps,
  DrawerSize,
} from './Drawer'

// ── Skeleton variants (table/card) ──
export { CardGridSkeleton, CardSkeleton, TableSkeleton, TableRowSkeleton } from './SkeletonVariants'

// ── Button (primary / secondary / ghost / danger) ──
export { Button, IconButton, buttonVariants, iconButtonVariants } from './Button'
export type { ButtonProps, ButtonVariant, ButtonSize, IconButtonProps } from './Button'

// ── Card (base) ──
export { Card, cardVariants } from './Card'
export type { CardProps, CardVariant } from './Card'

// ── Estados e rótulos (FE-08) ──
export { Spinner, spinnerVariants } from './Spinner'
export type { SpinnerProps } from './Spinner'
export { Label, labelVariants } from './Label'
export type { LabelProps } from './Label'
export { PromptDialog } from './PromptDialog'
export type { PromptDialogProps } from './PromptDialog'
export { Collapsible } from './Collapsible'
export type { CollapsibleProps } from './Collapsible'

// ── Primitivos do redesign (protótipo) ──
export { Avatar } from './Avatar'
export type { AvatarProps } from './Avatar'
export { Chip, chipVariants } from './Chip'
export type { ChipProps } from './Chip'
export { Segmented } from './Segmented'
export type { SegmentedProps, SegmentedOption } from './Segmented'
export { Toaster, type Tone as ToastTone } from './Toaster'
export { useToast, useNotify } from './useToast'
export { Input, inputWrapperVariants } from './Input'
export type { InputProps } from './Input'
export { Textarea } from './Textarea'
export type { TextareaProps } from './Textarea'
export { Field, fieldErrorId } from './Field'
export type { FieldProps } from './Field'
export { Select } from './Select'
export type { SelectProps } from './Select'
export { Menu, MenuItem, MenuLabel, MenuSeparator } from './Menu'
export { ContextMenu } from './ContextMenu'
export type { ContextMenuProps } from './ContextMenu'
export type { MenuProps, MenuItemProps } from './Menu'
export { Popover } from './Popover'
export type { PopoverProps } from './Popover'
export { Tabs, TabsList, Tab, TabsPanel } from './Tabs'
export type { TabsProps, TabsListProps, TabProps, TabsPanelProps } from './Tabs'
export { Progress } from './Progress'
export type { ProgressProps, ProgressTone } from './Progress'
export { Kbd, type KbdProps } from './Kbd'
export { PropertyPicker } from './PropertyPicker'
export type { PropertyOption, PropertyPickerProps } from './PropertyPicker'

// ── ThemeSwitcher (palette + dark/light) ──
export { ThemeSwitcher } from './ThemeSwitcher'

// ── CommandPalette (⌘K) — busca e navegação unificadas (itens por props) ──
export { CommandPalette, filterCommandItems } from './CommandPalette'
export type { CommandItem, CommandPaletteProps, CommandSearchStatus } from './CommandPalette'

// ── Primitivos de layout e cabeçalho (L3) ──
export { Page } from './Page'
export type { PageProps, PageVariant } from './Page'
export { SectionTitle } from './SectionTitle'
export type { SectionTitleProps } from './SectionTitle'
export { HeaderIcon } from './HeaderIcon'
export type { HeaderIconProps, HeaderIconSize, HeaderIconTone } from './HeaderIcon'

// ── Shell lateral (sidebar + header + breadcrumb + composição) ──
export {
  Sidebar,
  SIDEBAR_MOBILE_ID,
  SIDEBAR_MOBILE_QUERY,
} from './Sidebar'
export type {
  SidebarProps,
  SidebarSection,
  SidebarItem,
  SidebarBrand,
} from './Sidebar'
export { Header } from './Header'
export type { HeaderProps } from './Header'
export { Breadcrumb } from './Breadcrumb'
export type { BreadcrumbProps, BreadcrumbItem } from './Breadcrumb'
export { HeaderUserMenu } from './HeaderUserMenu'
export type { HeaderUserMenuProps, HeaderUserMenuUser } from './HeaderUserMenu'
export { MainLayout } from './MainLayout'
export type { MainLayoutProps } from './MainLayout'

// ── Extras do kit trazidos do loadbalance (0d728c1) na v1.1.0 (PKG-FIXES #1) ──
export { Switch, switchTrackVariants } from './Switch'
export type { SwitchProps } from './Switch'
export { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell, tableRowVariants } from './Table'
export type { TableProps, TableRowProps, TableRowTone, TableHeaderCellProps, TableCellProps, TableSort } from './Table'
export { Pagination } from './Pagination'
export type { PaginationProps } from './Pagination'
export { Banner, bannerVariants } from './Banner'
export type { BannerProps, BannerTone } from './Banner'
export { MultiSelect } from './MultiSelect'
export type { MultiSelectProps, MultiSelectOption } from './MultiSelect'
export { CodeBlock, highlightJson } from './CodeBlock'
export type { CodeBlockProps } from './CodeBlock'
export { StatusDot, statusDotVariants } from './StatusDot'
export type { StatusDotProps, StatusDotTone } from './StatusDot'
