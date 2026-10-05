// ── PromptDialog — diálogo que pede um texto (nome, título, slug) ────────
//
// Substitui o `window.prompt` e os NameDialog feitos à mão (FC-02): é um
// `Modal` com um campo, validação e os botões cancelar/confirmar. Herda do
// Modal o focus trap, o Esc, o retorno de foco e o nome acessível.
//
// - O campo recebe o foco e o texto inicial selecionado ao abrir.
// - Enter envia (é um `<form>`); o botão confirmar fica desabilitado com o
//   campo vazio (`required`, padrão) e enquanto `isLoading`.
// - `validate(value)` devolve a mensagem de erro em pt-BR ou `null`; o erro
//   aparece ao enviar e some ao editar.
// - `onSubmit` recebe o valor sem espaços nas pontas. Não fecha sozinho:
//   o chamador fecha no sucesso (igual ao ConfirmDialog).
// - O texto digitado some ao fechar: o conteúdo só existe com o diálogo aberto.

import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Modal, ModalFooter, useDialogAriaIds } from './Modal'
import { Button } from './Button'
import { Field, fieldErrorId } from './Field'
import { Input } from './Input'

export interface PromptDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (value: string) => void
  title: string
  description?: ReactNode
  /** Rótulo do campo. */
  label: string
  placeholder?: string
  /** Valor com que o campo abre (ex.: o nome atual, ao renomear). */
  initialValue?: string
  confirmText?: string
  cancelText?: string
  /** Mensagem de erro para o valor (já sem espaços nas pontas) ou `null`. */
  validate?: (value: string) => string | null
  /** Campo vazio bloqueia o envio. Padrão: true. */
  required?: boolean
  maxLength?: number
  isLoading?: boolean
}

export function PromptDialog({ isOpen, onClose, ...props }: PromptDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      noPadding
      initialFocusSelector="[data-prompt-input]"
    >
      <PromptDialogContent onClose={onClose} {...props} />
    </Modal>
  )
}

function PromptDialogContent({
  onClose,
  onSubmit,
  title,
  description,
  label,
  placeholder,
  initialValue = '',
  confirmText = 'Salvar',
  cancelText = 'Cancelar',
  validate,
  required = true,
  maxLength,
  isLoading = false,
}: Omit<PromptDialogProps, 'isOpen'>) {
  const ids = useDialogAriaIds()
  const inputId = useId()
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const trimmed = value.trim()
  const blocked = isLoading || (required && trimmed === '')

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (blocked) return
    const message = validate?.(trimmed) ?? null
    setError(message)
    if (message === null) onSubmit(trimmed)
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="px-6 pb-2 pt-6">
        <h2 id={ids?.titleId} className="text-heading font-semibold text-text-primary">
          {title}
        </h2>
        {description ? (
          <p id={ids?.descriptionId} className="mt-2 text-body text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      <div className="px-6 pb-2 pt-2">
        <Field htmlFor={inputId} label={label} required={required} error={error}>
          <Input
            id={inputId}
            data-prompt-input
            value={value}
            placeholder={placeholder}
            maxLength={maxLength}
            autoComplete="off"
            spellCheck={false}
            disabled={isLoading}
            error={error !== null}
            aria-required={required || undefined}
            aria-describedby={error ? fieldErrorId(inputId) : undefined}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setValue(e.target.value)
              if (error) setError(null)
            }}
          />
        </Field>
      </div>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button type="submit" variant="primary" loading={isLoading} disabled={blocked}>
          {confirmText}
        </Button>
      </ModalFooter>
    </form>
  )
}
