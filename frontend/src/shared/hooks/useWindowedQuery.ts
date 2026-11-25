import { useState } from 'react'
import type { ProblemDetails } from '@shared/api/axios'
import { loadErrorHint, screenDetail } from '@shared/lib'
import type { LoadErrorHintKey } from '@shared/lib'

/**
 * Repetir só recupera falha de TRANSPORTE. Um 4xx é a recusa desta requisição:
 * reemitir a mesma URL devolve a mesma recusa, sem informação nova. O caso
 * medido é a janela invertida do filtro — o backend sobe 422 com
 * "La fecha de término no puede ser anterior a la de inicio.", e o "Reintentar"
 * ao lado da mensagem tomava o mesmo 422 (UI-05 da revisão de 2026-08-17). Ali a
 * recuperação é corrigir a data, e é o que a própria mensagem já diz.
 *
 * Sem `status` (o `{}` do interceptor que não populou o corpo), a falha é
 * tratada como de transporte: oferecer o botão a mais é mais barato que negá-lo
 * a quem só perdeu a rede.
 */
function podeRepetir(erro: ProblemDetails | null): boolean {
  const status = erro?.status
  return status === undefined || status < 400 || status >= 500
}

/**
 * A política de uma query POR JANELA (período no filtro), num lugar só: o piso,
 * a falha antiga e o "repetir". Nasceu do Dashboard e foi copiada à mão para a
 * Emisión, e as cópias já tinham divergido (Q-2 da revisão do bloco 62).
 *
 * **O piso.** O último payload que chegou bom, de QUALQUER janela. A query key
 * varia pela janela, então trocar de período cria key nova e `query.data` volta
 * `undefined` — e `placeholderData: keepPreviousData` não cobre a troca que
 * FALHA (o observador só o aplica em `status === 'pending'`; o fetch que falha
 * vira `'error'`). Sem piso, a recusa 422 de uma janela invertida derrubaria a
 * tela inteira por um erro de digitação no filtro. Um piso cobre as duas
 * metades; dois mecanismos para a mesma verdade é defeito já pago aqui.
 *
 * É ESTADO ajustado durante o render, não `useRef` (`react-hooks/refs` reprova
 * `.current` no corpo do render; molde: `useEntityForm`). A guarda de igualdade
 * impede o laço e é confiável porque o TanStack Query faz structural sharing.
 * No render em que o piso sobe, `query.data` já está definido: a tela lê o dado
 * novo nesse mesmo render, não o piso velho.
 *
 * **A falha antiga.** Só existe COM dado em mão (`staleFailed`): é aviso AO
 * LADO, e a tela continua utilizável. Falha SEM dado não é stale — quem decide
 * trocar a tela é quem lê `data` (`undefined` + `isError`).
 *
 * Devolve as peças separadas, e quem imprime as compõe: `staleError` é o
 * `detail` que sobreviveu ao `screenDetail` (cala o do servidor fora da
 * allowlist da P-70, e o 422 está fora), `null` nos demais; aí cai-se em
 * `staleHint`, escolhida pelo STATUS. `staleRetry` devolve a promise do refetch
 * (é ela que mantém o "Reintentar" em `loading`) e some quando repetir não é
 * recuperação.
 *
 * O parâmetro é estrutural, e não `UseQueryResult`, pelo mesmo motivo do
 * `loadFailure`: a política lê quatro campos.
 */
export function useWindowedQuery<T>(query: {
  data?: T
  isError: boolean
  error: ProblemDetails | null
  refetch: () => Promise<unknown>
}): {
  data: T | undefined
  staleFailed: boolean
  staleError: string | null
  staleHint: LoadErrorHintKey
  staleRetry: (() => Promise<unknown>) | undefined
} {
  const [ultimo, setUltimo] = useState<T | undefined>(undefined)
  if (query.data !== undefined && query.data !== ultimo) setUltimo(query.data)

  const data = query.data ?? ultimo
  const staleFailed = data !== undefined && query.isError

  return {
    data,
    staleFailed,
    staleError: staleFailed ? (screenDetail(query.error) ?? null) : null,
    staleHint: loadErrorHint(query.error),
    staleRetry: staleFailed && podeRepetir(query.error) ? () => query.refetch() : undefined,
  }
}
