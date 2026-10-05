import { Button, useToast } from '@nomad/ui'
import { Demo } from '../../Demo'
import type { ShowcaseSection } from '../../types'

/**
 * Toasts do `@nomad/ui` (PKG-FIXES #3b): wrapper Sonner 2.x com os tokens do
 * tema. Botões disparam os 5 tons + dismiss; o `Toaster` global vive no
 * `App.tsx` e lê o `theme` do `useResolvedTheme()` automaticamente.
 */
function ToastDemo() {
  const toast = useToast()
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast.success('Operação concluída')}>Sucesso</Button>
      <Button variant="danger" onClick={() => toast.error('Falha ao salvar')}>
        Erro
      </Button>
      <Button onClick={() => toast.warning('Atenção: revise os dados')}>Aviso</Button>
      <Button onClick={() => toast.info('Sincronização concluída')}>Info</Button>
      <Button onClick={() => toast.loading('Enviando…')}>Loading</Button>
      <Button variant="ghost" onClick={() => toast.dismiss()}>
        Fechar todos
      </Button>
    </div>
  )
}

const section: ShowcaseSection = {
  id: 'toasts',
  title: 'Toasts',
  group: 'Sobreposições',
  order: 60,
  description:
    'Feedback efêmero (sucesso/erro/aviso/info/loading). Wrapper Sonner 2.x com os tokens da paleta ativa. API estável via useToast() — ver @nomad/ui/data para a integração com mutation.onSuccess/onError.',
  render: () => (
    <Demo title="Toasts">
      <ToastDemo />
    </Demo>
  ),
}

export default section