import { Skeleton } from 'primereact/skeleton'
import type { SkeletonProps } from 'primereact/skeleton'

export type { SkeletonProps as AppSkeletonProps } from 'primereact/skeleton'

/** Wrapper do Skeleton do PrimeReact. Feature não importa `primereact` direto
 * (ADR-05, lei §5.6). */
export function AppSkeleton(props: SkeletonProps) {
  return <Skeleton {...props} />
}

/**
 * Esqueleto de página de detalhe: barra de título, subtítulo e bloco de corpo.
 *
 * Substitui o `<p>Cargando…</p> ` das telas de detalhe (spec D19). Texto cru como
 * estado de carregamento não sinaliza a forma do conteúdo que vem e produz salto
 * de layout quando ele chega.
 */
export function AppDetailSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-busy="true">
      <AppSkeleton width="12rem" height="2rem" />
      <AppSkeleton width="20rem" height="1rem" />
      <AppSkeleton width="100%" height="12rem" />
    </div>
  )
}
