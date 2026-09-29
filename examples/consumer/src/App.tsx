import {
  createHttpClient,
  createQueryKeys,
  isUnauthorizedError,
  parseResponse,
} from '@nomad/ui/data'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

const http = createHttpClient({
  baseURL: 'http://api.test/api',
  getToken: () => 'demo-token',
  onUnauthorized: ({ error }) => {
    if (isUnauthorizedError(error)) window.alert('Sessão vencida')
  },
})

const projectKeys = createQueryKeys('projects')

const listSchema = z.object({ items: z.array(z.object({ id: z.string(), name: z.string() })) })
type Project = z.infer<typeof listSchema>['items'][number]

function listProjects(): Promise<Project[]> {
  return http
    .get('/projects')
    .then((r) => r.data)
    .then((data) => parseResponse(listSchema, data, 'GET /projects').items)
}

export function App() {
  const list = useQuery({ queryKey: projectKeys.all, queryFn: listProjects })
  return (
    <main style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h1>Nomad UI · Consumer</h1>
      <p>
        Projetos:{' '}
        {list.data ? list.data.map((p) => p.name).join(', ') : (list.error?.message ?? 'carregando…')}
      </p>
    </main>
  )
}
