# Consumer de `@nomad/ui`

App Vite + React mínimo que instala o `@nomad/ui` por **dependência git** (de uma tag ou sha da
`main`), usa a camada de dados do pacote contra uma API falsa (msw), e roda os gates
(typecheck, lint, format, test, build). Serve para provar o mecanismo de instalação por git e a
API do `@nomad/ui/data` antes da `v1.0.0`.

```bash
# Instalação (no clone do repo, este diretório é examples/consumer)
npm install            # roda `prepare` no pacote: build + tipos em dist
npm run gates          # typecheck + lint + format:check + test + build
npm run dev            # servidor em http://localhost:5175
```

Quando o tech lead trocar o `#<sha-da-main>` por `#v1.0.0` (depois da tag), basta `npm install`
de novo: o `prepare` gera o `dist` da tag.