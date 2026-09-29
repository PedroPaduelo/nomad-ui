# Consumer de `@nomad/ui`

App Vite + React mínimo que instala o `@nomad/ui` por **dependência git** (de uma tag ou sha da
`main`), usa a camada de dados do pacote contra uma API falsa (msw), e roda os gates
(typecheck, lint, format, test, build). Serve para provar o mecanismo de instalação por git e a
API do `@nomad/ui/data` antes da `v1.0.0`.

```bash
# Instalação reproduzível: substitua SHA_ORIGIN_MAIN pelo SHA publicado na main.
npm install --package-lock-only --ignore-scripts
npm install             # prepare do pacote git executa build + gera os tipos em dist
npm run gates           # typecheck + lint + format:check + test + build
npm run dev             # servidor em http://localhost:5176
```

No repo do pacote, `file:../../` é usado para desenvolvimento rápido. Para provar o fluxo
real, defina `@nomad/ui` como `git+https://github.com/PedroPaduelo/nomad-ui.git#<sha origin/main>`
no `package.json` do consumer e instale do zero. A versão fixa de lançamento usa `#vX.Y.Z`; o
`prepare` do pacote sempre produz o `dist`, que não é commitado.
