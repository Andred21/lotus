# Spec — `frontend-arrumacao-de-testes` (item 27)

**Data:** 2026-09-03 · **Lane:** `lane-c` · **Árvore:** `../fix-frontend` ·
**Branch:** `refactor/frontend-arrumacao-de-testes` (de `origin/main@182be2ab`) ·
**Contexto:** não — sem Context Packet; as fontes são o código desta árvore, a ficha do item 27
(`backlog.md`), a `P-58` e a `P-68` já encerrada.

> **Toda medição desta spec foi refeita nesta árvore, contra `3833810c`.** A ficha do item 27 mediu
> contra `main@24bf770c` e quatro dos números dela não sobreviveram à remedição — inclusive um
> achado inteiro. O que vale é a §3.

---

## 1. O que o bloco faz

Arruma a suíte de frontend como **mecanismo** — ambiente de execução, molde de montagem e as fichas
de teste que ninguém hospedava —, **sem tocar em uma única asserção de comportamento**.

Cinco entregas:

1. **Ambiente por projeto:** `tests/**` deixa de subir jsdom que não usa; `src/**` continua em jsdom.
2. **Home única de montagem:** `src/shared/testing/providers.tsx` substitui as sete grafias de
   `new QueryClient` espalhadas por 33 arquivos.
3. **Catraca** que impede a oitava grafia de nascer.
4. **`P-58`** paga: o teste do compose deixa de depender do disco de quem roda.
5. **Veredito escrito** do achado 4 da ficha, que a remedição derrubou (§4.5).

---

## 2. Fora de escopo

- Reescrever asserção, cobrir caso novo, mudar comportamento da aplicação.
- `src/test-setup.ts` — é o que a `P-69` acabou de fixar em 2026-09-03.
- A régua de contraste da **`P-74`**, que é decisão de cor do João, não arrumação.
- O i18n: os 31 arquivos que mockam `react-i18next` já passam todos pela fábrica
  `shared/testing/i18n.ts`, zero grafia solta. Medido, não suposto.
- Absorver os 3 casos de topologia própria (2 com `<Routes>/<Route>`, 1 com `PageMeta`): eles
  convivem com o helper e o consomem por dentro, mas a árvore de rota não vira parâmetro.

---

## 3. Medições — feitas nesta árvore, contra `3833810c`, antes de desenhar

### 3.1 Linha de base

`pnpm test` verde: **128 arquivos, 760 testes, 96,68s** — `transform 24,46s`, `setup 19,95s`,
`import 93,76s`, `tests 29,35s`, **`environment 121,39s`** (somado entre workers).

117 arquivos em `src/`, 11 em `frontend/tests/`.

> A ficha diz **759 testes / 134,87s**. São **760** aqui, e o tempo é de outra carga de máquina. O
> DoD desta spec usa **760**, que é o número desta árvore. Nenhum teste foi acrescentado; a
> diferença é a base medida (`main@24bf770c` contra `origin/main@182be2ab`).

### 3.2 Achado 1 — `tests/` sobe jsdom sem precisar · **CONFIRMADO**

Os **11** arquivos de `frontend/tests/` usam `readFileSync`. **Zero** deles casa `render(`,
`document.` ou `window.`. Nenhum usa alias de path (`@shared`, `@features`): a única ocorrência de
`'@` no diretório está **dentro de uma string de regex** do `desmonte-global.test.ts`.

`environment` é o maior item do tempo medido (121,39s).

### 3.3 Achado 2 — a montagem do provedor é copiada · **CONFIRMADO, e pior que a ficha diz**

- **33** arquivos constroem `new QueryClient` (**28** em `features/`, **4** em `shared/`, **1** em
  `app/`).
- **24** declaram wrapper próprio (20 `function wrapper(...)`, 5 `const Wrapper = ...`).
- **10** montam `MemoryRouter` por conta.

**Fato novo A — não é uma grafia, são sete:**

| Opções declaradas | Arquivos |
|---|---|
| `queries.retry` + `mutations.retry` | 17 |
| só `mutations.retry` | 7 |
| só `queries.retry` | 5 |
| acrescenta `refetchOnWindowFocus` | 5 |
| sem `staleTime` **de propósito**, com comentário | 1 |

O último declara por escrito que `staleTime` não entra *"porque é justamente o que a página passa e
o que este teste mede"*. Um wrapper de opção fixa que fixasse `staleTime` **apagaria o sujeito
daquele arquivo**. A ficha do item 27 descreve as 33 ocorrências como uma grafia só; são sete.

**Fato novo B — 20 dos 24 wrappers criam o client DENTRO do wrapper:**

```tsx
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ /* ... */ })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
```

O wrapper é um componente: cada re-render descarta o client e o cache junto. Nenhum teste falha por
isso hoje, mas é o defeito que a home única fecha de graça.

**Fato novo C — o helper não pode ser só `render`:** dos 33, **24 usam `renderHook`** (que quer um
`wrapper`) e **9 usam `render`**.

**Fato novo D — o client é usado depois de montar em um arquivo:**
`src/app/pages/Dashboard/useDashboard.test.tsx` chama `qc.refetchQueries()` em duas linhas. O helper
tem de devolver o client.

**Router, medido:** 10 arquivos, **6 com `initialEntries`** (`/comercial/presupuestos/1`,
`/validar/abc` ×2, e 2 por variável), **4 sem**. Dois montam `<Routes>/<Route>`, e árvore de rota
não cabe em parâmetro.

### 3.4 Achado 3 — `src/shared/testing/` tem só `i18n.ts` · **CONFIRMADO**

`i18n.ts` (906 B) e `i18n.test.tsx` (1.002 B). É o endereço natural do helper, com 31 consumidores
provando que o padrão pega.

### 3.5 Achado 4 — "dois arquivos sem sujeito próprio" · **DERRUBADO**

A ficha diz que os dois pares foram *"partidos por acidente de autoria"*. **Não foram.**

`ValidationPageFolio.test.tsx` declara o motivo no próprio docblock:

> *"A assinatura da página mora em arquivo próprio [...] porque o par dos dois passou de 150 linhas
> e a catraca `max-lines` de `src/features/<x>/components/` mede teste junto com componente (medido
> no fechamento do item 18: 170 linhas). **A saída escolhida pelo João foi quebrar, não isentar** — a
> camada `src/app/**` isenta teste, esta não, e afrouxar aqui soltaria régua que 24 arquivos honram
> hoje, dois deles exatamente em 150."*

`StudentCertificateCellPdf.test.tsx` diz o mesmo, mais curto: *"Separados porque a régua de 150
linhas de `components/**` vale para o teste também."*

E a **`P-68` fechou em 2026-09-03** — o dia anterior a este bloco — **por decisão escrita**,
ratificando que a régua vale para arquivo de teste em `src/features/*/components/**`.

Tamanhos medidos agora:

| Par | Linhas | Junto | Régua |
|---|---|---|---|
| `ValidationPage.test.tsx` (4 `it`) + `ValidationPageFolio.test.tsx` (2 `it`) | 128 + 96 | **224** | 150 |
| `StudentCertificateCell.test.tsx` (10 `it`) + `...CellPdf.test.tsx` (4 `it`) | 134 + 90 | **224** | 150 |

Juntar qualquer um dos dois pares **reprova o lint** por 74 linhas.

### 3.6 `P-58`, candidata a hospedeiro

`tests/compose-dev.test.ts` afasta os `.env*` da **raiz** (`CAMINHOS_ENV`) no `beforeEach` e **não**
afasta o `frontend/.env`. Árvore com `VITE_API_URL` legado reprova 3 casos com
`expected undefined to be '"http://localhost:8080"'`. O `vite.config.ts` está correto — quem não
isola é o teste. Conserto de uma linha, no arquivo que este bloco já vai abrir.

### 3.7 Ferramenta

`vitest` **4.1.10**. `test.projects` é estável (e `test.workspace`, que ele substitui, foi removido
na 4). Nada a instalar.

---

## 4. O desenho

### 4.1 Ambiente por projeto — `frontend/vite.config.ts`

`test.projects` com dois projetos:

| Projeto | `include` | `environment` | `setupFiles` |
|---|---|---|---|
| `unit` | `src/**/*.test.{ts,tsx}` | `jsdom` | `./src/test-setup.ts` |
| `repo` | `tests/**/*.test.{ts,tsx}` | `node` | — |

O `resolve.alias` fica onde está, no nível do config: os projetos o herdam, e o projeto `repo` não
depende dele de qualquer forma (§3.2).

O comentário que já mora ali — *"`tests/` fica fora de `src/` porque o que ele confere é o
REPOSITÓRIO, não a app"* — continua valendo e ganha o par que faltava: e por isso roda em `node`.

**Lição 19 (`docs/README.md`) aplicada.** `vite.config.ts` já é guardado por
`tests/desmonte-global.test.ts`, que hoje casa por regex:

```
/setupFiles:\s*\[\s*["']\.\/src\/test-setup\.ts["']\s*\]/
```

Essa asserção **sobrevive à mudança sem provar mais nada**: ela não sabe em que projeto o
`setupFiles` está, então um `setupFiles` declarado no projeto `repo` passaria a régua e deixaria
todo o `src/**` sem desmonte — exatamente o buraco que a `P-69` fechou. A guarda ganha, **no mesmo
commit da mudança**, asserções de que o projeto que cobre `src/**` é `jsdom` **e** declara o setup, e
o que cobre `tests/**` é `node`.

### 4.2 Home única — `src/shared/testing/providers.tsx` (novo)

```
createWrapper(opts?)           → { wrapper, client }
renderWithProviders(ui, opts?) → ReturnType<typeof render> & { client }
```

`renderWithProviders` é construído sobre `createWrapper` — um mecanismo, duas portas: os 24 arquivos
de `renderHook` querem o `wrapper`, os 9 de `render` querem a tela montada (§3.3, fato C).

**Default do client:**

```ts
{ queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } }
```

Sem `staleTime`, **de propósito** — é sujeito de teste em um arquivo (§3.3). Quem precisar de outra
coisa passa `queryClientOptions`, e o override fica **visível no sítio** em vez de escondido num
wrapper local.

**O client é criado uma vez por chamada**, fora do componente wrapper: fecha o defeito dos 20
(§3.3, fato B). E sai no retorno, porque `useDashboard.test.tsx` o usa depois de montar (fato D).

**Router opcional:** `route?: string` monta `MemoryRouter` com `initialEntries: [route]`. Sem
`route`, sem router — 23 dos 33 não precisam de um, e nos 6 que usam `initialEntries` a rota é
**sujeito de teste**, então continua visível na chamada.

### 4.3 Migração dos 33 sítios

Os **12** que hoje declaram um eixo só (7 `mutations`, 5 `queries`) passam a ter os dois. Nenhuma
asserção muda; `retry` ligado em teste é fonte de flake e lentidão, não de cobertura. Os **5** de
`refetchOnWindowFocus` passam a recebê-lo do default.

Os **2** que montam `<Routes>/<Route>` e o 1 que compõe `PageMeta` mantêm a árvore própria, com
`createWrapper` por dentro: o helper cobre o provedor, não a topologia de rota.

### 4.4 Catraca — `QUERY_CLIENT_A_MAO`

`no-restricted-syntax` no `frontend/eslint.config.js`, reprovando `new QueryClient` em arquivo de
teste de **`features/`, `app/` e `shared/`** — as três camadas onde os 33 sítios vivem —, com
`src/shared/testing/**` isento, que é onde o mecanismo mora.

As três, e não as duas que a ficha pede: fechar duas e deixar `shared/` aberta é a porta por onde o
defeito volta. Foi assim que a `P-67` voltou, por grafia que a catraca não alcançava.

**Vista reprovar por sonda negativa antes de virar régua**, no molde de `CLEANUP_A_MAO` e
`DROPDOWN_SEM_NOME` — arquivo restaurado a partir de cópia no scratchpad, **nunca por `git stash`**
(a pilha é compartilhada entre árvores).

### 4.5 Veredito do achado 4 — **recusado**

Decisão do João em 2026-09-03, com a medição da §3.5 à vista: **os dois pares ficam como estão.**

Juntá-los custaria 224 linhas contra uma régua de 150 que 24 arquivos honram hoje, dois deles
exatamente no limite — e as três saídas foram pesadas: isentar teste em `features/` reabriria a
`P-68` quatro dias depois de ela fechar por decisão escrita; subir a régua para 240 a transformaria
em decoração para a camada inteira, já que nenhum componente passa de 150 hoje.

**Zero mudança de código.** O que o bloco entrega aqui é o registro: os dois arquivos já explicam a
partição no próprio docblock, e agora a spec explica por que a ficha os descreveu errado — para o
próximo leitor não reabrir a mesma pergunta.

### 4.6 `P-58`

`tests/compose-dev.test.ts` passa a afastar `frontend/.env` no `beforeEach`, com o mesmo tratamento
que já dá aos `.env*` da raiz.

---

## 5. Riscos

| Risco | Por quê | Contra-medida |
|---|---|---|
| `test.projects` muda como o vitest resolve config, e um projeto mal recortado deixa arquivo **sem rodar** | Régua de 128 arquivos / 760 testes só acusa se alguém a conferir | O DoD compara **arquivo a arquivo e teste a teste** contra a base da §3.1, não só "verde" |
| A guarda do `setupFiles` passa a valer sobre um objeto aninhado e pode virar asserção vazia | Regex que casa em qualquer lugar do arquivo prova menos depois de `projects` | §4.1: asserções novas no mesmo commit, ligando `setupFiles` ao projeto `jsdom` |
| Os 12 que ganham o eixo que faltava podem depender de `retry` ligado | Improvável, mas é mudança de ambiente de execução | Suíte verde com os mesmos 760; qualquer arquivo que exigir outra coisa usa `queryClientOptions`, e o desvio fica escrito no sítio |
| Client estável por chamada muda o cache entre re-renders nos 20 | Hoje o cache é descartado a cada re-render; passa a sobreviver | Mesma prova: 760 verdes. Divergência vira achado medido, não ajuste silencioso |
| A catraca nasce verde e ninguém a vê morder | Cobertura fantasma (lição 10) | Sonda negativa obrigatória, com cópia no scratchpad |

---

## 6. Definition of done

1. `pnpm test` verde com **128 arquivos e 760 testes** — os mesmos da §3.1, conferidos por número,
   não por cor.
2. Tempo registrado **antes e depois**, com o `environment` destacado (base: 96,68s / 121,39s).
3. `tests/**` provado rodando em `environment: node` **por sonda** — não por leitura da config.
4. `src/shared/testing/providers.tsx` existe e concentra a construção do client:
   `grep -rln 'new QueryClient' src --include='*.test.ts*'` devolve **vazio** (hoje: 33 arquivos), e
   `grep -rl 'new QueryClient' src` fora de teste devolve só `app/providers/AppProviders.tsx` (a
   aplicação) e o próprio helper.
5. `QUERY_CLIENT_A_MAO` **vista reprovar por sonda negativa** e depois verde, com o arquivo
   restaurado a partir do scratchpad.
6. A guarda do `desmonte-global.test.ts` afirma o par projeto/ambiente e é **vista reprovar** contra
   uma config sem a separação.
7. `P-58`: os 3 casos de `compose-dev.test.ts` passam com um `frontend/.env` contendo
   `VITE_API_URL` legado no disco — provado com o arquivo posto e retirado.
8. `pnpm lint` **0** e `pnpm build` verde.
9. `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` **vazio** — `pint` e
   `typescript:transform` N/A por escopo, provado, não presumido.

---

## 7. Decisões

| # | Decisão | Por quê |
|---|---|---|
| D1 | Dois projetos (`unit` jsdom / `repo` node), não um `environmentMatchGlobs` | `environmentMatchGlobs` foi removido no vitest 4; `projects` é o caminho vigente e isola também o `setupFiles` |
| D2 | Default do client com os dois eixos de `retry` e `refetchOnWindowFocus`, **sem `staleTime`** | Cobre 32 dos 33 sem apagar o sujeito do 33º, que declara a dependência por escrito |
| D3 | Override por parâmetro, não por wrapper local | O desvio fica visível no sítio que o precisa; wrapper local é como as sete grafias nasceram |
| D4 | Client criado por chamada, fora do componente wrapper | Fecha o defeito dos 20 sem custo, e devolve o client ao único arquivo que o usa depois |
| D5 | Router opcional por `route`, não sempre | A rota é sujeito de teste em 6 dos 10; 23 arquivos não precisam de router nenhum |
| D6 | Catraca nas três camadas, não nas duas da ficha | `shared/` tem 4 dos 33 sítios, e camada descoberta é por onde o defeito volta (precedente: `P-67`) |
| D7 | Achado 4 **recusado**, com veredito escrito | A partição é decisão de 2026-08-29 ratificada pela `P-68` em 2026-09-03; juntar dá 224 contra régua de 150 |
| D8 | `P-58` entra no bloco | Ficha de mecanismo de teste, conserto de uma linha, no arquivo que o bloco já abre |
| D9 | DoD usa **760**, não os 759 da ficha | 760 é o que esta árvore mede; número de ficha não vence medição |

---

## 8. Handoff de execução

**`executor: claude`.**

Não é task mecânica de paths fechados: a §4.3 migra 33 arquivos cujo desvio de opção precisa de
julgamento caso a caso (o do `staleTime` é o exemplo vivo), a §4.1 mexe em arquivo guardado por
catraca — o que a lição 19 obriga a tratar no mesmo commit — e a §4.4 exige sonda negativa vista
reprovar, que é prova de comportamento, não passo verificável por script.
