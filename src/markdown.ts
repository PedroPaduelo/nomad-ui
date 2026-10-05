// Entrada `@nomad/ui/markdown`: o `Markdown` do kit. Fica fora da entrada
// principal porque puxa o `react-markdown` (peer OPCIONAL do pacote): só o app
// que importa esta entrada precisa instalar `react-markdown`.
export { Markdown } from './components/ui/Markdown'
