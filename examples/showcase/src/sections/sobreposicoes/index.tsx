import { useState } from 'react'
import {
  Drawer,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Popover,
} from '@nomad/ui'
import { Button } from '@nomad/ui'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

function ModalExample() {
  const [isOpen, setIsOpen] = useState(false)
  const close = () => setIsOpen(false)
  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Abrir modal
      </Button>
      <Modal isOpen={isOpen} onClose={close}>
        <ModalHeader title="Confirmar ação" onClose={close} />
        <ModalBody>
          <p className="text-body text-text-secondary">
            Esse modal usa o tema do pacote. Esc fecha; foco fica preso.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={close}>
            Confirmar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

function DrawerExample() {
  const [isOpen, setIsOpen] = useState(false)
  const close = () => setIsOpen(false)
  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Abrir drawer
      </Button>
      <Drawer isOpen={isOpen} onClose={close}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-body font-semibold text-text-primary">Detalhes</p>
        </div>
        <div className="flex flex-col gap-3 p-4 text-body text-text-secondary">
          <p>O drawer entra pela direita e tem o mesmo tema.</p>
          <p>Útil para detalhe rápido sem tirar o usuário da tela.</p>
        </div>
      </Drawer>
    </>
  )
}

function MenuExample() {
  return (
    <Menu button={<span className="ui-btn inline-flex items-center justify-center rounded-md border border-border bg-surface-raised px-3 py-1.5 text-body font-medium text-text-secondary hover:bg-surface-hover">Abrir menu</span>} ariaLabel="Ações">
      <MenuLabel>Ações</MenuLabel>
      <MenuItem onClick={() => {}}>Renomear</MenuItem>
      <MenuItem onClick={() => {}}>Duplicar</MenuItem>
      <MenuSeparator />
      <MenuItem onClick={() => {}}>Arquivar</MenuItem>
      <MenuItem onClick={() => {}}>Excluir</MenuItem>
    </Menu>
  )
}

function PopoverExample() {
  return (
    <Popover
      button={<span className="ui-btn inline-flex items-center justify-center rounded-md border border-border bg-surface-raised px-3 py-1.5 text-body font-medium text-text-secondary hover:bg-surface-hover">Abrir popover</span>}
      ariaLabel="Atalhos"
    >
      <ul className="flex flex-col gap-1 p-3 text-body">
        <li>Ctrl K — buscar</li>
        <li>G S — configurações</li>
        <li>? — ajuda</li>
      </ul>
    </Popover>
  )
}

const section: ShowcaseSection = {
  id: 'sobreposicoes',
  title: 'Sobreposições: Modal, Drawer, Menu, Popover',
  group: 'Sobreposições',
  order: 50,
  description: 'O pacote cobre todas as sobreposições padrão com o mesmo tema.',
  render: () => (
    <DemoGrid>
      <Demo title="Modal">
        <ModalExample />
      </Demo>
      <Demo title="Drawer">
        <DrawerExample />
      </Demo>
      <Demo title="Menu">
        <MenuExample />
      </Demo>
      <Demo title="Popover">
        <PopoverExample />
      </Demo>
    </DemoGrid>
  ),
}

export default section