import {
  Field,
  Input,
  Segmented,
  Select,
  Tabs,
  TabsList,
  Tab,
  TabsPanel,
  Textarea,
} from '@nomad/ui'
import { Search, User } from 'lucide-react'
import { useState } from 'react'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

function TabsExample() {
  const [v, setV] = useState('conta')
  return (
    <Tabs value={v} onValueChange={setV} className="w-full max-w-md">
      <TabsList>
        <Tab value="conta">Conta</Tab>
        <Tab value="empresa">Empresa</Tab>
        <Tab value="avancado">Avançado</Tab>
      </TabsList>
      <TabsPanel value="conta">
        <p className="text-body text-text-secondary">Configurações da sua conta pessoal.</p>
      </TabsPanel>
      <TabsPanel value="empresa">
        <p className="text-body text-text-secondary">Nome, slug, marca e plano da empresa.</p>
      </TabsPanel>
      <TabsPanel value="avancado">
        <p className="text-body text-text-secondary">Tokens de API e webhooks.</p>
      </TabsPanel>
    </Tabs>
  )
}

const section: ShowcaseSection = {
  id: 'formulario',
  title: 'Formulário: Field, Input, Select, Textarea, Tabs',
  group: 'Formulário',
  order: 20,
  description:
    'Os blocos de formulário do pacote: rótulo + controle + mensagem, com validação. Tabs e Segmented mostram escolha mutuamente exclusiva.',
  render: () => (
    <DemoGrid>
      <Demo title="Field + Input">
        <div className="flex w-full max-w-md flex-col gap-3">
          <Field label="Nome" htmlFor="fld-name" help="Como devemos te chamar?">
            <Input id="fld-name" placeholder="Ex.: Ana Souza" />
          </Field>
          <Field label="Buscar" htmlFor="fld-search" error="Nada encontrado para esse termo.">
            <Input
              id="fld-search"
              leadingIcon={<Search className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
              defaultValue="ana"
            />
          </Field>
        </div>
      </Demo>

      <Demo title="Select e Textarea">
        <div className="flex w-full max-w-md flex-col gap-3">
          <Field label="Workspace" htmlFor="fld-ws">
            <Select id="fld-ws" defaultValue="nomad-labs">
              <option value="nomad-labs">Nomad Labs</option>
              <option value="serendiped">Serendiped</option>
              <option value="filial">Filial sem app</option>
            </Select>
          </Field>
          <Field label="Descrição" htmlFor="fld-desc" help="Até 280 caracteres.">
            <Textarea id="fld-desc" rows={3} placeholder="Conte o que você está construindo…" />
          </Field>
        </div>
      </Demo>

      <Demo title="Segmented (escolha única)">
        <div className="flex w-full max-w-md flex-col gap-3">
          <Segmented
            options={[
              { value: 'owner', label: 'Owner' },
              { value: 'admin', label: 'Admin' },
              { value: 'member', label: 'Membro' },
            ]}
            value="admin"
            onChange={() => {}}
            aria-label="Papel"
          />
          <p className="text-caption text-text-tertiary">
            Owner decide, Admin gerencia, Membro só lê.
          </p>
        </div>
      </Demo>

      <Demo title="Tabs (mudar aba)">
        <TabsExample />
      </Demo>

      <Demo title="Input com ícone">
        <div className="w-full max-w-sm">
          <Input
            leadingIcon={<User className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
            placeholder="Seu usuário"
            aria-label="Usuário"
          />
        </div>
      </Demo>
    </DemoGrid>
  ),
}

export default section