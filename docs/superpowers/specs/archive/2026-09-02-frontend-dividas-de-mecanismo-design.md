# Spec — `frontend-dividas-de-mecanismo` (item 25)

**Data:** 2026-09-02 · **Lane:** `lane-c` · **Árvore:** `../fix-frontend` (worktree) ·
**Branch:** `fix/frontend-dividas-de-mecanismo`, aberta de `3654b6dc` (= `origin/main@5f6daf8b` mais o
commit que abre este item no `backlog.md`, em revisão na PR #97) ·
**Context Packet:** nenhum (`Contexto: não` na fila; as seis fontes vivem no repositório) ·
**Executor:** `claude`

---

## 1. O que o bloco faz

Paga de uma vez as seis dívidas de frontend que **se provam por mecanismo** — catraca de lint,
teste ou token de tema — ou que **fecham por decisão escrita**: `P-69`, `D-69`, `P-70`, `P-30`,
`P-68` e `P-42`. Todas foram abertas por blocos de frontend já fechados e nenhuma tinha hospedeiro
até 2026-09-02.

**Nenhuma task deste bloco abre navegador.** É esse corte que o separa do item 16 (fatia 3) e do
item 23, cujas fichas só fecham com medição em viewport. Tudo o que este bloco muda se prova com
`pnpm test`, `pnpm lint`, `pnpm build` e aritmética de contraste sobre hex — as mesmas réguas que
`tests/tone-ink.test.ts` e `tests/brand-theme.test.ts` já usam.

Escopo de arquivos: **só `frontend/`**. `backend/` e `generated.ts` terminam com diff vazio, o que
torna `pint` e `typescript:transform` N/A por escopo — provado, não presumido.

## 2. Fora de escopo

- **`D-65` (item 23) e a fatia 3 do item 16** — as duas reabrem medição em navegador. São o oposto
  do critério deste bloco.
- **`D-59`** — segue no item 16; pede remedir uma tela inteira nos três viewports.
- **`D-34`** — atravessa o seam e toca contrato + `generated.ts`; é backend.
- **`D-70`** — precisa de canal publicável, e isso é decisão da Lotus.
- **`P-58`** — é do compose, frente de infra (lane-b).
- **`P-72`** (o 419 devolve `CSRF token mismatch.` em inglês nos três locales) — **não fecha aqui**,
  porque o remédio dela é backend (`problem.detail.csrf` nos três locales). Este bloco apenas impede
  que aquele literal chegue à tela, o que é consequência do corte da `P-70` e não pagamento da ficha.

## 3. Medições — feitas contra `main@5f6daf8b` antes de desenhar

Cada uma destas mudou ou apertou o desenho, e três delas **contradizem o texto da ficha**. Ficam
escritas para que ninguém remeça.

### 3.1 `D-69` — a variável de perigo já existe

A ficha dizia que a decisão travada era "qual variável de perigo o tema expõe", e que isso era
desenho. **Não é**: `shared/styles/tokens.ts` já exporta `dangerText = 'var(--tone-danger-ink)'`,
com régua de contraste medida nos dois temas em `tests/tone-ink.test.ts`, e **11 arquivos de
`features/` já o importam**. Não há variável a inventar — há quatro sítios a ligar.

Os quatro sítios, vivos e remedidos:

| Sítio | Grafia atual | Papel |
|---|---|---|
| `commercial/components/Budget/CourseStep.tsx:102` | `text-slate-500` | texto secundário (carga horária) |
| `commercial/components/Budget/QuoteWizard.tsx:48` | `text-slate-500` | texto secundário (passo do wizard) |
| `commercial/components/Budget/QuoteWizard.tsx:72` | `text-red-600` | erro de campo `course_id` |
| `operation/components/Document/ManualButton.tsx:28` | `text-red-600` | erro de download do manual |

### 3.2 `P-30` — a superfície é menor que a ficha, e tem defeito de contraste

A ficha listava "botão, tag e badge e a mensagem `warn`". Medido: **não há `Message` nem `Badge` no
produto**, e o `AppTag` **já** pinta warning com style próprio
(`color-mix(in srgb, var(--yellow-500) 15%, var(--surface-card))` + `--tone-warning-ink`) — logo a
tag nunca foi laranja na tela. O laranja de stock do Lara sobrevive em **um** sítio:
`operation/components/Enrollment/MoveConfirmDialog.tsx:36`, o único `AppButton severity="warning"`
do produto (`ReissueDialog.tsx:66` e `EmissionPanel.tsx:97` são `AppTag`).

E esse sítio não é só incoerência de família:

| Par | Contraste | Veredito |
|---|---|---|
| hoje, claro: `#ffffff` sobre `#f97316` | **2,80:1** | reprova o AA de texto (4,5:1) **e** o 3:1 de elemento gráfico |
| hoje, escuro: `#431407` sobre `#fb923c` | 6,92:1 | passa |
| alinhado, claro: `--yellow-900` (`#5e4803`) sobre `--yellow-500` (`#eab308`) | 4,55:1 | passa |
| alinhado, escuro: `--yellow-900` (`#5e4803`) sobre `--yellow-400` (`#eec137`) | 5,12:1 | passa |

O tema claro pinta o botão de confirmação de uma ação destrutiva com texto que reprova a régua de
acessibilidade. Alinhar a família **corrige o defeito de passagem**, e é o que faz a ficha valer
código em vez de fechar por decisão.

### 3.3 `P-69` — o custo que a ficha temia é zero

A ficha registrava o bloqueio assim: *"o custo real é descobrir quantos arquivos hoje dependem, sem
saber, de o componente **não** desmontar entre testes."*

Medido em 2026-09-02, com sonda na configuração (`setupFiles` apontando para um `afterEach(cleanup)`
global) e restauração no mesmo comando: **127 arquivos / 734 testes passam**, árvore limpa depois.
Nenhum arquivo depende do vazamento. O bloqueio era um desconhecido, não um custo.

Sobram **28** arquivos com `afterEach(cleanup)` escrito à mão, que o global torna redundantes.

### 3.4 `P-70` — o que o backend prova e o que ele não prova

`backend/app/Shared/Exceptions/ProblemDetails.php` escolhe o `detail` por TIPO de exceção:

- `500` sem debug e sem `PublicDetail` → `__('problem.detail.server')`;
- `PublicDetail` ou `ValidationException` → `getMessage()`, que é a frase que alguém escreveu para
  quem lê — e as duas exceções de domínio que a implementam (`ImmutableSystemRoleException`,
  `RedatorOnlyActionException`) constroem com **403**;
- `ThrottleRequests` (429), `Authentication` (401), forbidden (403), not found (404) → chave de
  `lang/`;
- **`default` → `getMessage()` cru.** É por esta porta que sai o `CSRF token mismatch.` do 419 nos
  três locales (`P-72`), e é ela que qualquer status novo atravessa sem ninguém decidir.

Logo: `403`, `404` e `429` são os três status em que o envelope **prova** que o texto passou por
`lang/`. O `401` não entra porque sessão expirada não chega a virar estado de carga — o interceptor
de `shared/api/axios.ts` redireciona para o login. O `422` não entra porque o `FormErrorSummary` já
imprime campo a campo.

### 3.5 `P-68` — a população

24 arquivos `*.test.tsx` em `src/features/*/components/**`. **Um** passava de 150 (quebrado em
`e76747a6`, no fechamento do item 18) e **dois** estão exatamente em 150 —
`EnrollmentSection.test.tsx` e `ProfileDocumentSlot.test.tsx`, que é a assinatura de quem aparou
para caber.

### 3.6 `D-69` e a partição do eslint

`CATRACA_COR` não é só uma lista: ela particiona o glob `src/features/*/components/**` em dois
blocos, porque um array de `no-restricted-syntax` não aceita `ignores` por seletor individual. Com a
lista vazia, o bloco `files: CATRACA_COR` **não particiona nada** e precisa sair inteiro — um bloco
com `files: []` é ruído que o próximo leitor interpreta como catraca viva.

Conferido: nenhum dos três arquivos está em `FORA_DO_CAMPO_LIGADO`, então eles caem no bloco
principal, cujo array é o mesmo **mais** `COR_HARDCODED`. O `QuoteWizard.tsx` já carrega os dois
`eslint-disable-next-line no-restricted-syntax` que o `ERRO_DE_CAMPO_A_MAO` exige, e o bloco
`CATRACA_COR` já incluía essa régua — a migração não estreia nenhuma proibição nova nesses arquivos
além da de cor, que é justamente a que eles deixam de violar.

---

## 4. O desenho, ficha a ficha

### 4.1 `P-69` — o desmonte vira mecanismo

Nasce `frontend/src/test-setup.ts` com `afterEach(cleanup)`, e `vite.config.ts` passa a declará-lo em
`setupFiles`. O comentário atual do bloco `test:` explica a ausência de `globals` (type-check pelo
`tsc -b`) e **não** a de `setupFiles`; ele ganha a segunda metade.

Os 28 arquivos com `afterEach(cleanup)` à mão perdem a linha e o import correspondente. Duas réguas
fecham as portas que sobram:

1. **`CLEANUP_A_MAO`** — `no-restricted-syntax` sobre `**/*.test.{ts,tsx}`, reprovando
   `afterEach(cleanup)`. Sem ela, o próximo teste copia o molde de um vizinho e a redundância volta.
2. **A guarda do próprio `setupFiles`** — caso novo em `frontend/tests/`, afirmando que
   `vite.config.ts` declara o setup e que o arquivo de setup chama `cleanup`.

> **Esta segunda guarda não estava no desenho apresentado no brainstorming; entra aqui declarada.**
> A razão é que a primeira régua, sozinha, deixa o repositório PIOR na falha: proibida a grafia
> manual e apagado o `setupFiles`, nenhum teste desmonta nada e nada acusa. Uma catraca que só faz
> sentido enquanto a outra existir precisa que a outra seja verificada.

Sonda negativa da ficha: um teste que monta um hook com timer — o molde do `useServerTable`, que
marca `setTimeout` de debounce no mount. Sem `setupFiles` ele mata a rodada com
`ReferenceError: window is not defined` em `Unhandled Errors`, **reprovando sem reprovar asserção
nenhuma**; com ele, a rodada termina. A sonda é vista reprovar com o `setupFiles` removido e o
arquivo restaurado do scratchpad, nunca por `git stash`.

### 4.2 `D-69` — os quatro sítios e a lista que zera

Os dois de texto secundário passam a `style={{ color: 'var(--text-color-secondary)' }}`, mantendo o
`ml-2` e o `text-xs font-normal` que são layout. Os dois de erro passam a
`style={{ color: dangerText }}`, com o import de `@shared/styles/tokens` que 11 arquivos vizinhos já
fazem.

`CATRACA_COR` chega a `[]`, o bloco `files: CATRACA_COR` sai do `eslint.config.js` e o `ignores` do
bloco principal perde a referência. O comentário que explicava a partição vira o registro de que ela
morreu, com a data — a lista "só encolhe" já era a regra escrita ali, e este é o encolhimento final.

**DoD mecanizado, como a ficha pede:** `CATRACA_COR` em `[]`. A prova de que os quatro sítios
morreram é o lint verde **sem** a lista, não o grep.

### 4.3 `P-70` — o `detail` do servidor chega à tela em três status

`screenDetail` passa a devolver o `detail` quando o envelope não é do front **e** o `status` é
`403`, `404` ou `429`. Todo o resto continua calado: `500`, `419`, `405`, `503` e qualquer status
novo — a allowlist é fechada por desenho, e status que ninguém decidiu não entra sozinho.

O `ScreenDetailSource` já carrega `status`, que hoje só o `loadErrorHint` lê; a política passa a ler
o mesmo campo, no mesmo arquivo. **Uma política, um lugar, uma chave.**

O docblock do arquivo é reescrito. A frase vigente — "só vai o que o FRONT escreveu" — deixa de ser
verdade, e um docblock que descreve a política anterior é pior que docblock nenhum num arquivo cuja
razão de existir é ser a política.

**Prova, em duas camadas e sem navegador:**

1. Casos novos em `screenDetail.test.ts`: `403`, `404` e `429` devolvem o `detail`; `500` e `419`
   devolvem `undefined`; o envelope do front segue passando; `''` e `null` seguem virando
   `undefined` nos três status novos (a guarda de "erro nunca é só cor nem só ícone" vale igual).
2. Teste em jsdom que renderiza um consumidor real do par `screenDetail(error) ?? t(loadErrorHint(error))`
   com um envelope `403` e com um `500`, afirmando o **texto na tela**: no primeiro a frase do
   servidor, no segundo a dica do i18n. É o que honra o "na tela" do DoD da ficha atravessando a
   árvore de render, em vez de parar na função.

### 4.4 `P-30` — o warning volta para a família amarela

Transformação de **FORMA** no `scripts/generate-brand-theme.mjs`, no molde do `textoSobrePrimaria`
(D-P8) e da regra de borda da `D-68`: bloco que pinta com o laranja de warning do Lara troca o fundo
para a família `--yellow-*` e a tinta para o degrau 900. Não é troca de entrada no mapa de hex — é
regra sobre a forma do bloco, então alcança toda superfície que o Lara pinta de laranja nas duas
folhas, e não só o botão que existe hoje.

Regeneração por `pnpm brand-theme`; `tests/brand-theme.test.ts` acusa drift, como já acusa para as
outras transformações. Caso novo de contraste no molde do `tone-ink.test.ts`, com os quatro pares
medidos na §3.2 — inclusive o par de HOJE, que reprova, para que a régua registre o defeito que ela
fecha.

### 4.5 `P-68` — a razão da assimetria fica escrita

A régua de 150 continua alcançando arquivo de teste em `src/features/*/components/**`. O
`eslint.config.js` passa a dizer por quê, ao lado da régua e em contraponto explícito à isenção que
`src/app/**` tem doze linhas abaixo. **Zero mudança de comportamento**; a assimetria deixa de ser
acidente e vira escolha, com a decisão do item 18 (quebrar o arquivo, não afrouxar a régua) como
precedente citado.

### 4.6 `P-42` — emenda datada no D1

O D1 da spec arquivada `specs/archive/2026-08-14-celula-de-identidade-design.md` ganha uma emenda
datada: a grafia construída (`font-semibold` no título, `text-sm font-medium` na descrição, `gap-2`
entre as linhas), o motivo (decisão do João em 2026-08-14, achado Q-3 do `/revisar-sprint`, tomada
com a tela na frente) e a consequência medida — o `gap-2` × N linhas muda a altura de toda tabela
que usa a célula, então não é detalhe cosmético invisível.

O snapshot **não é reescrito em silêncio**: ganha linha nova com data, no molde da emenda de
2026-08-24 no ADR-13. O docblock do `IdentityCell.tsx` aponta para a emenda, para quem edita o
arquivo não precisar abrir a spec para saber que a divergência é deliberada. **Código intocado.**

---

## 5. Riscos

| Risco | Onde | Contenção |
|---|---|---|
| Diff grande e gerado | `P-30` regenera duas folhas de tema inteiras | o diff de `lara-*-lotus.css` é saída de script, não edição; `tests/brand-theme.test.ts` prova que a saída corresponde à entrada, e o cabeçalho "NÃO editar à mão" já está lá |
| Regra de forma alcançando demais | `P-30` troca laranja por amarelo em toda superfície que o Lara pinta de laranja | a lista de blocos alcançados é enumerada no plano antes de aplicar; superfície fora de warning que apareça na lista reprova a task |
| 28 arquivos tocados de uma vez | `P-69` | mecânico e provado pela suíte verde; a medição de §3.3 já rodou com o global ligado e os 28 ainda presentes |
| Catraca deixando o repositório pior na falha | `P-69`, `CLEANUP_A_MAO` sem `setupFiles` | a guarda estática do §4.1, declarada como adição |
| Frase de exceção não prevista chegando à tela | `P-70` | allowlist fechada de três status; `default` do backend nunca é um deles |

## 6. Definition of done

1. As **seis fichas** fechadas, cada uma por mecanismo verde ou veredito escrito — nenhuma por
   remoção na fé.
2. `CATRACA_COR` em `[]` e o bloco `files: CATRACA_COR` removido do `eslint.config.js`.
3. `pnpm lint` **0**, `pnpm build` verde, `pnpm test` com a suíte inteira passando e **terminando**
   (a P-69 é sobre rodada que não termina, não só sobre teste que reprova).
4. As catracas novas (`CLEANUP_A_MAO`, a guarda do `setupFiles`, o caso de contraste do warning)
   **vistas reprovar por sonda**, com o arquivo restaurado do scratchpad — nunca `git stash`.
5. `git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts` **vazio**, o que
   torna `pint` e `typescript:transform` N/A por escopo, provado.
6. A linha de cada uma das seis fichas removida do índice de `pendencias/` no `/fechar-sprint`, com
   o veredito no `encerradas.md`.

## 7. Decisões

| ID | Decisão |
|---|---|
| D1 | `P-70` corta por **status**: `403`, `404` e `429` passam; todo o resto cala. Não por `type` do envelope (duas chaves para uma política) nem por "tudo menos 500" (deixaria passar o `default` cru do backend) |
| D2 | A prova da `P-70` é **unidade + jsdom no consumidor**, não navegador: honra o "na tela" da ficha sem quebrar o corte do item 25 |
| D3 | `P-30` **alinha o botão ao amarelo que a tag já usa**; não constrói âmbar de marca (seria segunda família de marca, contra a emenda vigente do ADR-16) nem fecha por decisão (deixaria de pé um contraste de 2,80:1) |
| D4 | `P-68` **mantém a régua** em teste de `features/` e escreve a razão; não isenta. Coerente com a decisão do item 18 |
| D5 | `P-42` fecha por **emenda datada no D1** da spec arquivada, mais docblock no componente; o código não volta ao D1 |
| D6 | `P-69` remove os 28 `afterEach(cleanup)` manuais **e** ganha catraca contra a grafia manual — o `setupFiles` vira dono único |
| D7 | A guarda estática do `setupFiles` entra **além** do desenho aprovado, declarada, porque `CLEANUP_A_MAO` sozinha deixa o repositório pior na falha |
| D8 | `D-69` não tem decisão de desenho a tomar: `dangerText` já existe, com régua medida e 11 adotantes |
| D9 | `P-72` **não fecha** neste bloco; o corte da `P-70` apenas impede que o literal chegue à tela |

## 8. Handoff de execução

```yaml
executor: claude
```

Três das tasks tocam lei do §5 do `CLAUDE.md` (cor vem de variável do tema, ADR-16) ou desenham
política de erro de tela, e a `P-30` decide alcance de uma transformação de forma sobre folha
gerada. Não é trabalho de paths fechados com verificação puramente mecânica, que é o critério para
delegar ao Codex.
