import { toast } from 'sonner'

type SonnerToastFn = (msg: string) => string | number
type SonnerDismiss = (id?: string) => void
type SonnerPromise = <T>(
  promise: Promise<T> | (() => Promise<T>),
  data: unknown,
) => Promise<T>

/**
 * API de toasts estável — referência CONSTANTE (definida fora de qualquer
 * componente). Os métodos do Sonner (`toast.success`, etc.) são estáticos, então
 * não há motivo pra recriar o objeto a cada render.
 *
 * Por que isso importa: se `useToast()` retornasse um objeto literal novo a
 * cada render, qualquer `useCallback`/`useMemo`/`useEffect` que dependa de
 * `toast` seria invalidado a cada render → loops de fetch e re-renders.
 * Mantendo uma referência estável, memoizações em toda a app continuam válidas.
 *
 * O tipo de `toast.promise` (`PromiseIExtendedResult`) é interno do Sonner e
 * não é exportado, o que quebra `tsc --declaration` ao reexportar. Tipamos
 * localmente como `SonnerPromise` para isolar a fronteira.
 */
const toastApi = {
  success: toast.success as SonnerToastFn,
  error: toast.error as SonnerToastFn,
  warning: toast.warning as SonnerToastFn,
  info: toast.info as SonnerToastFn,
  loading: toast.loading as SonnerToastFn,
  dismiss: toast.dismiss as SonnerDismiss,
  promise: toast.promise as unknown as SonnerPromise,
} as const

/**
 * Hook tipado para disparar toasts de qualquer lugar da app. Retorna sempre a
 * MESMA referência (`toastApi`), segura pra usar como dependência de hooks.
 *
 * ```ts
 * const toast = useToast()
 * mutation.onSuccess(() => toast.success('Salvo'))
 * mutation.onError((err) => toast.error(getErrorMessage(err)))
 * ```
 */
export const useToast = (): typeof toastApi => toastApi

/** @deprecated alias legado para `useToast`. Manter até a migração dos apps. */
export const useNotify = useToast

export default useToast