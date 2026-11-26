import { createContext, useState, type ReactElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, type QueryClientConfig } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { render } from '@testing-library/react'

/**
 * A ÚNICA construção de `QueryClient` em teste (item 27).
 *
 * Eram 33 arquivos e SETE grafias — 17 com os dois eixos de `retry`, 7 só com
 * `mutations`, 5 só com `queries`, 5 acrescentando `refetchOnWindowFocus` e
 * um declarando por escrito que `staleTime` não entra. Vinte dos 24 wrappers
 * locais construíam o client DENTRO do componente, então o cache morria a
 * cada re-render.
 *
 * Duas portas para um mecanismo: `createWrapper` serve os 24 arquivos de
 * `renderHook` (que querem um `wrapper`), `renderWithProviders` serve os 9 de
 * `render` (que querem a tela montada).
 *
 * A catraca `QUERY_CLIENT_A_MAO` (eslint.config.js) é o par que impede a
 * oitava grafia de nascer; este arquivo é o único isento dela em `shared/`.
 */

export type ProviderOptions = {
  /**
   * Quando presente, monta um router DE DADOS (`createMemoryRouter`) com esta
   * entrada inicial e uma única rota `path: '*'` que renderiza o filho — é o
   * que o `useBlocker` exige, e o app real também roda em data router.
   */
  route?: string
  /**
   * MERGE sobre o default, eixo a eixo: o que você declara vence, o resto do
   * `PADRAO` fica de pé. Substituir por inteiro derrubaria `retry: false` sem
   * aviso — reintroduzindo em silêncio o que este mecanismo apagou de 33
   * arquivos (Q-4 do review de 2026-09-04).
   */
  queryClientOptions?: QueryClientConfig
}

/**
 * Sem `staleTime`, de propósito: é sujeito de teste em
 * `src/app/pages/Dashboard/useDashboard.test.tsx`, que mede justamente o que a
 * página passa. Fixá-lo aqui provaria o client, não a página.
 */
const PADRAO: QueryClientConfig = {
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
}

/**
 * O filho do wrapper chega à rota `*` por contexto: o `element` da rota é fixado
 * na criação do router, e o `children` do `renderHook`/`render` muda a cada
 * re-render. Sem a ponte, o re-render não chegaria ao hook sob teste.
 */
const FilhoDoTeste = createContext<ReactNode>(null)

/** Funde o override sobre o `PADRAO`, eixo a eixo. */
function comDefault(over?: QueryClientConfig): QueryClientConfig {
  if (over === undefined) return PADRAO
  return {
    ...over,
    defaultOptions: {
      ...over.defaultOptions,
      queries: { ...PADRAO.defaultOptions?.queries, ...over.defaultOptions?.queries },
      mutations: { ...PADRAO.defaultOptions?.mutations, ...over.defaultOptions?.mutations },
    },
  }
}

/**
 * Nasce sem consumidor, e é intencional: a catraca fecha `new QueryClient` em
 * todo teste das três camadas, então um caso futuro que precise de outra
 * opção precisa de uma porta — sem ela, a saída seria furar a catraca. A
 * porta funde sobre o `PADRAO` (`comDefault`), nunca o substitui.
 *
 * **Chame por teste, não por arquivo.** Uma única chamada no escopo do
 * módulo entrega um client COMPARTILHADO por todos os `it()` daquele
 * arquivo — sobrevive entre eles, não só entre re-renders de um mount. Isso
 * é inofensivo quando o hook sob teste não usa `useQuery`/`useMutation` de
 * verdade, mas quebrou 5 de 7 casos num teste da tela de validação, que saiu do app
 * no bloco 63 (item 27, Task 3): testes diferentes reusavam a mesma query key e herdavam
 * cache um do outro. Onde houver query real, chame `createWrapper()` dentro
 * de um `beforeEach` (ou dentro de cada `it()`), não uma vez no topo do
 * arquivo.
 *
 * Os arquivos que hoje chamam no topo foram medidos um a um no review de
 * 2026-09-04 (Q-1): os que sobraram testam hook só de `useMutation`, e
 * mutation não guarda cache por chave. Os dois com `useQuery` de verdade —
 * `useEntityPhoto` e `useCrudFormWithPhoto` — passaram para `beforeEach`.
 */
export function createWrapper(opts: ProviderOptions = {}): {
  wrapper: ({ children }: { children: ReactNode }) => ReactElement
  client: QueryClient
} {
  // FORA do componente: é o que mantém o cache vivo entre re-renders.
  const client = new QueryClient(comDefault(opts.queryClientOptions))
  const { route } = opts

  function Roteado({ route: entrada, children }: { route: string; children: ReactNode }) {
    // Um router por montagem (não por `createWrapper`): dois `render` com o
    // mesmo wrapper não herdam a localização um do outro.
    const [router] = useState(() => createMemoryRouter(
      [{ path: '*', element: <FilhoDoTeste.Consumer>{(filho) => filho}</FilhoDoTeste.Consumer> }],
      { initialEntries: [entrada] },
    ))
    return (
      <FilhoDoTeste value={children}>
        <RouterProvider router={router} />
      </FilhoDoTeste>
    )
  }

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {route === undefined ? children : <Roteado route={route}>{children}</Roteado>}
      </QueryClientProvider>
    )
  }

  return { wrapper, client }
}

export function renderWithProviders(
  ui: ReactElement,
  opts: ProviderOptions = {},
) {
  const { wrapper, client } = createWrapper(opts)
  return { ...render(ui, { wrapper }), client }
}
