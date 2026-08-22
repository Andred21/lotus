# Design — BD-12 · a célula que não repinta e o catálogo que não esvaziava

> Spec do `active_work_item` `bd12-load-state-e-listas`. Escrita em 2026-08-20, sobre a árvore
> principal (`/home/jvbat/projetos/lotus`), branch `feat/bd12-datatable-idioma-e-catalogo-vazio` a
> partir de `main@716cf0b9`. **Sem Context Packet:** os dois itens nasceram de medição local — o
> D-55 na prova de navegador do BD-17 (2026-08-20, contra `1d61b28`), a P-40 no fechamento do BD-6
> (2026-08-14, contra `d20bebc`) —, e não há fonte canônica externa a recuperar.
>
> **O slug do work item continua `bd12-load-state-e-listas`**, que é a identidade promovida em
> `716cf0b9`; o escopo é que encolheu, pelo motivo da §2. Trocar o slug no meio do fluxo criaria a
> ambiguidade que o `state.md` existe para impedir.

## 1. Fronteira do bloco

Dois itens: **D-55** (código, um arquivo) e **P-40** (remedição, zero código). **Frontend puro.**

`git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` deve devolver **zero
arquivo** no fechamento — mesmo fence do BD-13, do BD-16 e do BD-17. É isso que mantém suíte de
backend, Pint e `typescript:transform` N/A por escopo medido, e não por suposição. A P-40 **consome**
a API (arquiva e restaura cursos), mas não escreve uma linha em `backend/`.

**A P-03 não dispara:** o gatilho da ficha é mais de um `active_work_item` de *backend*, e este bloco
não toca backend.

**Três dos cinco débitos que o backlog da `main` atribui ao BD-12 estão FORA, porque já foram
pagos** — ver §2. O backlog **não é editado neste bloco**: planejamento não promove nem remove item
de backlog; a reconciliação é do fechamento, quando as duas frentes se encontrarem.

## 2. A divergência que o gate mediu, e a exceção declarada

O `/planejar-bloco` foi invocado com a `main` em `ready_for_planning` para os cinco débitos. A
medição de abertura achou **duas árvores vivas com dois `active_work_item` e escopo sobreposto**:

| | árvore principal | worktree `fix-frontend` |
|---|---|---|
| `active_work_item` | `bd12-load-state-e-listas` | `bd18-useloadstate-promise-e-forma` |
| `workflow_state` | `ready_for_planning` | `ready_for_review` |
| `updated_at` | 2026-08-20T16:35 | 2026-08-20T18:20 |
| branch | `main@716cf0b9` | `docs/bd18-agrupamento-useloadstate@c09dc23a` |

O BD-18 **já executou e provou** D-56, D-54 e D-14, em 15 commits sobre `main@6edf1224`:
`a9e7c05b` (`listSource` e `loadFailure`, a forma num lugar só), `5850541a` e `d2068b23` (os sítios
espalhando em vez de derivar), `f34a9460` (a promise do `refetch` nos dois hooks compartilhados,
`useResourceState` incluído), `146b09c9` (mais sete consumidores), `e48b3f42` e `0cdb7a9e` (os dois
sítios do D-14, com teste do ramo COM cache), `ac60d876` (a linha da rule). O backlog **daquela
branch** já reagrupou de acordo: lá o BD-12 ficou só com a P-40 e o D-55 foi para "Sem bloco
atribuído".

**Decisão do João, tomada com os números na mão:** as duas frentes seguem vivas, e este bloco entra
já reduzido a D-55 + P-40. É a **sexta exceção declarada à invariante de um `active_work_item`** —
declarada na abertura, não descoberta na execução.

**A colisão foi medida antes de escrever, não temida.** Os 41 arquivos tocados pelo BD-18
(`git diff $(git merge-base HEAD main)..HEAD --name-only` naquela árvore) **não incluem**
`frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`, que é o único arquivo de código deste bloco.
O único encontro possível é `docs/superpowers/**` mais `backlog.md` — que sempre colidem entre
frentes e são merge mecânico.

## 3. O mecanismo do D-55, medido no fonte

A ficha do débito supunha a causa ("o memo do `BodyCell` é keyed no dado da linha") e propunha o
remédio ("rekey do `AppDataTable` em `i18n.language`"). A medição em `primereact@10.9.8` confirma a
causa e **derruba a necessidade do remédio**: existe knob público para isso.

```js
// primereact/datatable/datatable.cjs.js:1795-1808
var defaultKeysToCompare = ['rowData', 'field', 'allowCellSelection', 'isCellSelected', /* … */];
var BodyCell = React.memo(function (props) { … }, function (prevProps, nextProps) {
  if (nextProps.cellMemo === false) return false;
  …
  return utils.ObjectUtils.selectiveCompare(prevProps, nextProps, keysToCompare, depth);
});
```

Três fatos que decidem o desenho:

1. **`cellMemo` é prop pública do `DataTable`** (`datatable.d.ts:1140`), default `true`
   (`datatable.cjs.js:492`), repassada às células em quatro pontos (`:2340`, `:3454`, `:7336`,
   `:7423`). Com `false`, o comparador devolve `false` na **primeira linha** — nunca "igual" — e a
   célula repinta a cada render da tabela.
2. **A comparação é por dado, não por função.** `keysToCompare` inclui `rowData` e `field`, e **não**
   inclui `body`: a closure nova que `archivedColumns(t)` produz a cada render não conta como
   mudança. É por isso que o cabeçalho troca de idioma e a célula não.
3. **`BodyRow` é `React.memo` sem comparador** (`datatable.cjs.js:2485`), então ele até repinta
   quando a identidade de props muda — e a célula bloqueia logo abaixo. Mexer acima do `BodyCell`
   não alcança o defeito.

O `AppDataTable` já chama `useTranslation()` (`AppDataTable.tsx:59`), então ele **re-renderiza** na
troca de idioma. Falta só a célula deixar de bloquear.

## 4. Decisões

**D1 · O D-55 se paga com `cellMemo={false}` no `AppDataTable`, não com remount.**
Um sítio, dentro do wrapper, com o docblock citando `datatable.cjs.js:1799`. **A alternativa da
ficha foi recusada com o custo medido:** `key={i18n.language}` remonta a tabela e zera ordenação,
página e filtro client-side — e a paginação e o sort **são** client-side aqui, por decisão registrada
no próprio docblock do wrapper ("5 tabelas têm coluna `sortable`, e o DataTable só ordena o que
recebe"). Trocar o idioma perderia estado que o usuário escolheu. O `cellMemo={false}` não remonta
nada.

**D2 · O custo aceito é a memoização de célula desligada em TODA tabela, e ele é proporcional.**
Não há como ligar o knob só na troca de idioma: `cellMemo` é prop, não evento. A escala do produto é
~10 usuários internos e listas de dezenas de linhas paginadas de 10 em 10 — a mesma escala que o
`CLAUDE.md` manda não superdimensionar. Fica **declarado**, não escondido: se um dia uma tabela
crescer a milhares de linhas, o knob vira prop do `AppDataTable` e aquela tela decide.

**D3 · A catraca do D-55 é teste de RENDER, e a suíte de hoje não a tem.**
`archivedColumns.test.tsx` prova a função de coluna chamando `body(...)` direto (`:61-68`, "acompanha
a TROCA de idioma") — e passa verde **com o defeito de pé**, porque nunca monta a tabela. A guarda
nova monta um `AppDataTable` com uma coluna cujo `body` lê i18n, troca o idioma e afirma que o
**texto renderizado** mudou. Precedente de montagem: `HistorialTable.test.tsx`, que monta a tabela
real por dentro (`SearchableTableFrame` → `AppDataTable`) e afirma sobre o texto da célula.
**Condição de aceite da própria catraca:** ela tem de ser **vista reprovar** com o `cellMemo`
default. Se o jsdom não reproduzir o congelamento, o teste não é catraca — é decoração —, e nesse
caso ele **não entra**: o D-55 fica provado só no navegador, com a limitação declarada. Ferramenta
verde não é DoD (lei §5.8).

**D4 · A prova visual do D-55 tem controle, não só sujeito.**
Sujeito: a célula `archived_at` de uma tabela de arquivados, com o idioma trocado ao vivo no menu.
Controle positivo do alcance: `ÚLTIMO ACCESO` de `UsersTable` (`formatDateTime`, que este bloco não
toca) e o `AppTag` de estado — os dois congelavam pelo mesmo motivo e têm de destravar junto.
Controle negativo: `ArchivedQuotesList`, mesma `formatDate` **fora** de DataTable, que já trocava ao
vivo antes do bloco e tem de continuar trocando.

**D5 · A P-40 se prova esvaziando o catálogo pela API, e a reversão faz parte da prova.**
O que travou a ficha em 2026-08-14 foi o `php artisan tinker --execute` recusado pelo classificador,
sem substituto pela API. **Isso mudou e foi remedido agora:** `DELETE /api/courses/{course}` e
`POST /api/courses/{course}/restore` existem desde 2026-08-18
(`app/Domains/Catalog/routes.php:16-18`), e `ArchiveCourseAction` **não tem gate** — arquiva em
transação, cascateando para módulos e templates. Sequência: contar os ativos → arquivar cada um →
medir a tela → restaurar cada um → conferir a contagem idêntica. A restauração não é limpeza
opcional: é o que mantém "zero resíduo no banco de dev", que os dois blocos de arquivados já
provaram ser exigível.

**D6 · A sonda da P-40 é o passo 1 do wizard de cotação, que é o sítio original.**
`CourseStep` é onde o ramo foi medido em `d20bebc`, e é o único consumidor cuja mensagem de vazio
(`course.empty`) tem de aparecer **sem** a de falha (`common.loadError`). Medir noutro lugar mediria
outro ramo. O `RedatorCourseSelector` tem o mesmo `if (isEmpty)` e entra como conferência secundária
**se** estiver de graça na mesma passagem — não como requisito.

## 5. Prova de aceite (DoD)

Comportamento, não ferramenta verde:

1. **D-55, navegador:** com a interface em es-CL e uma tabela de arquivados na tela, trocar o idioma
   no menu repinta o **valor** da célula de data junto do cabeçalho, sem F5. Medido nos três idiomas.
2. **D-55, alcance:** na mesma passagem, `ÚLTIMO ACCESO` (`UsersTable`) e o `AppTag` de estado também
   repintam; `ArchivedQuotesList` continua repintando (não regrediu).
3. **D-55, catraca:** o teste de render novo **reprova** contra o `AppDataTable` sem o `cellMemo`
   (visto reprovando, não deduzido) e passa com ele — ou, se o jsdom não reproduzir, a ausência da
   catraca é declarada no fechamento junto do motivo medido.
4. **P-40:** com o catálogo de dev **de fato** vazio, o passo 1 do wizard mostra `course.empty` e
   **não** `common.loadError`; e com o catálogo restaurado, a contagem de cursos ativos volta ao
   valor de antes, conferida pela API.
5. **Fence:** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` vazio.
6. **Gate:** `pnpm lint` 0, `pnpm build` verde, `pnpm test` sem regressão contra a baseline medida na
   abertura da execução.

## 6. Limitações declaradas

- **A memoização de célula fica desligada em todas as tabelas** (D2). É custo aceito de propósito,
  não efeito colateral não percebido.
- **A P-40 mede o ambiente de dev, não um ambiente vazio de nascença.** O catálogo é esvaziado por
  arquivamento e devolvido em seguida; se a restauração falhar no meio, o banco de dev fica com
  cursos arquivados — e o fechamento tem de dizer isso em vez de maquiar.
- **O BD-18 não está mergeado.** Enquanto ele não entrar na `main`, a `main` continua sem D-54, D-56
  e D-14, e qualquer leitura do `useLoadState` nesta árvore mostra o código antigo. Não é regressão
  deste bloco: é a segunda frente viva que a §2 declara.

## 7. Fora de escopo

- **D-54, D-56 e D-14** — pagos no BD-18 (§2), que segue o ciclo dele.
- **A linha nova da rule `frontend-fsliced.md`** sobre `ListSource<T>` — ela pertence ao bloco que
  pagou o D-56, e já saiu lá (`ac60d876`).
- **`cellMemoProps`/`cellMemoPropsDepth`** — ajuste fino do comparador, sem consumidor que o peça.
- **Os 6 `*RowActions`** e qualquer outra dívida de tabela que não seja o repinte por idioma.
