// ── ConfirmDialog — Dialog de confirmação (ok/cancel) ────────────────────
//
// Wrapper sobre `Modal` que renderiza título, descrição e 2 botões
// (cancelar/confirmar). Use para confirmar ações destrutivas (delete, etc).
//
// Variantes:
//   • default — botão confirmar usa bg-accent
//   • danger  — botão confirmar usa bg-error
//
// `typeToConfirm` pede que a pessoa digite um texto (ex.: o nome do projeto)
// antes de liberar o botão: é a trava das exclusões de maior impacto (FE-12).
// `children` entra entre a descrição e o campo, para o impacto da ação
// (contagens, avisos).

import { forwardRef, useId, useState, type ReactNode } from 'react'
import { Modal, ModalFooter, useDialogAriaIds } from './Modal'
import { Button } from './Button'
import { Field } from './Field'
import { Input } from './Input'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  danger?: boolean
  /** Estado de loading no botão confirmar (ex: enquanto a mutation roda). */
  isLoading?: boolean
  /**
   * Texto que a pessoa precisa digitar, exatamente igual, para liberar o
   * botão confirmar. O campo começa vazio a cada abertura.
   */
  typeToConfirm?: string
  /** Conteúdo extra do corpo (impacto da ação), abaixo da descrição. */
  children?: ReactNode
}

export const ConfirmDialog = forwardRef<HTMLDivElement, ConfirmDialogProps>(function ConfirmDialog(
  { isOpen, onClose, typeToConfirm, ...props },
  ref,
) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      noPadding
      initialFocusSelector={typeToConfirm !== undefined ? '[data-type-to-confirm]' : undefined}
    >
      {/* Montado só com o diálogo aberto: o texto digitado some ao fechar. */}
      <ConfirmDialogContent ref={ref} onClose={onClose} typeToConfirm={typeToConfirm} {...props} />
    </Modal>
  )
})

type ContentProps = Omit<ConfirmDialogProps, 'isOpen'>

const ConfirmDialogContent = forwardRef<HTMLDivElement, ContentProps>(function ConfirmDialogContent(
  {
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    danger = false,
    isLoading = false,
    typeToConfirm,
    children,
  },
  ref,
) {
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const locked = typeToConfirm !== undefined && typed !== typeToConfirm

  return (
    <>
      <ConfirmDialogText ref={ref} title={title} description={description} />
      {children || typeToConfirm !== undefined ? (
        <div className="grid gap-4 px-6 pb-2 pt-2">
          {children}
          {typeToConfirm !== undefined ? (
            <Field
              htmlFor={inputId}
              label={
                <>
                  Digite <strong className="font-semibold">{typeToConfirm}</strong> para confirmar
                </>
              }
            >
              <Input
                id={inputId}
                data-type-to-confirm
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={isLoading}
              />
            </Field>
          ) : null}
        </div>
      ) : null}
      <ModalFooter>
        <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={danger ? 'danger' : 'primary'}
          size="md"
          loading={isLoading}
          disabled={locked}
          onClick={() => {
            if (locked) return
            onConfirm()
            // Não fecha automaticamente — deixa o caller controlar (loading state, error, etc)
          }}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </>
  )
})

/**
 * Título e descrição ligados ao `aria-labelledby`/`aria-describedby` do
 * diálogo: sem isso o ConfirmDialog era um diálogo sem nome acessível.
 */
const ConfirmDialogText = forwardRef<HTMLDivElement, { title: string; description?: ReactNode }>(
  function ConfirmDialogText({ title, description }, ref) {
    const ids = useDialogAriaIds()
    return (
      <div ref={ref} className="px-6 pt-6 pb-2">
        <h2 id={ids?.titleId} className="text-base font-semibold text-text-primary">
          {title}
        </h2>
        {description && (
          <p id={ids?.descriptionId} className="mt-2 text-sm text-text-secondary">
            {description}
          </p>
        )}
      </div>
    )
  },
)
