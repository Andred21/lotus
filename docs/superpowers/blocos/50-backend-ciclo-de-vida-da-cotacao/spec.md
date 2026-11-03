# Bloco 50 — `backend-ciclo-de-vida-da-cotacao` — spec

> Ficha: item 50 do `backlog.md`. Fontes: card 5 e achados 0.2 e 0.5 de
> `docs/superpowers/audits/2026-11-02-arquitetura-backend.html` (contra `main@d220a04f`), `P-49` e
> `P-112` (`pendencias/abertas.md`). Brainstorming de 2026-11-02 com o João. Base: `main@60e42f49`.

## 1. Intenção

A cotação tem uma máquina de estado (pendente, aprovada, recusada) cujas guardas estão espalhadas
por cinco Actions. Duas delas, `ApproveQuoteAction` e `RejectQuoteAction`, fazem `update` cru: sem
guarda de origem, sem transação e sem lock. Isso deixa um caminho aberto que fere dado com peso
legal: hoje o superadmin **recusa uma cotação aprovada cuja turma já está em andamento, ou já
concluída e com certificado emitido**, depois edita o curso e o número de alunos e até arquiva a
cotação. `QuoteApprovalTest.php:77-85` fixa o início desse caminho (sem turma, então segue válido).

Ao mesmo tempo, a regra atual "cotação aprovada é imutável" é dura demais para o uso real. O
superadmin precisa corrigir uma cotação aprovada que ainda não virou turma sem recusá-la e
reabri-la, e precisa ajustar o valor UF de uma cotação cuja turma já existe.

O bloco dá às transições **um dono**: um módulo que toma o lock da cotação, confere o estado de
origem e sabe se há turma viva. Ele fecha também o eixo restante da P-49 (cotação × orçamento) e
mostra na interface em que pé está a turma de cada cotação aprovada (P-112).

## 2. Objetivos

1. As transições e a edição da cotação passam por um só módulo do domínio Commercial, sempre dentro
   de `DB::transaction` e com `Quote::lockRow()`. A matriz da D2 é a regra inteira.
2. Recusar uma cotação com turma não arquivada dá 422, seja a turma em andamento ou concluída.
3. A cotação aprovada fica editável **só pelo superadmin**: com todos os campos enquanto não há
   turma, e só o `value_uf` quando há turma.
4. A P-49 fecha: o eixo cotação × orçamento ganha lock dos dois lados.
5. A cotação aprovada mostra a tag do status da turma no detalhe do orçamento e na tabela de
   orçamentos (P-112).
6. Os docblocks do achado 0.5 dizem o que o código faz.

## 3. Não-objetivos (Fora)

- Mudar a turma além da guarda da D10. `CreateTurmaAction` e `DeleteTurmaAction` seguem como estão,
  e a turma continua nascendo só de cotação aprovada.
- Permissão nova. "Só superadmin" usa a `commercial.quote.approve`, que já existe, é segregada
  (`PermissionCatalog::SEGREGATED`) e é exclusiva do superadmin no seed.
- Os escritores de **arquivo** do orçamento e da cotação (`BudgetFileController`,
  `QuoteFileController`) tomando o lock do pai. Fica como está; vale nota no fechamento da P-49 se o
  builder confirmar a janela.
- Propagar a edição da cotação para a turma. Mudar o `value_uf` de cotação com turma não toca a
  turma, porque a turma não guarda valor.
- Os cards 1 a 4 e 6 a 10 do audit e os achados 0.1, 0.3 e 0.4 (são de outros itens da fila).

## 4. Decisões

**D1 — "Tem turma" é ter turma não arquivada** (decisão do João). Usa `Quote::turma()`, que é
`hasOne` sem `withTrashed`, a mesma pergunta que `CreateTurmaAction` e o `UNIQUE` de
`turmas.active_quote_id` fazem. Turma em andamento e turma concluída contam. Turma arquivada não
conta: a cotação volta ao caso "sem turma".

**D2 — Matriz de transições** (as linhas de editar, recusar e "só superadmin" são decisões do João;
as marcadas *(builder/Claude)* são escolha do Claude no brainstorming):

| Origem | Editar (`PUT /quotes/{id}`) | Recusar | Aprovar | Arquivar (`DELETE`) |
|---|---|---|---|---|
| pendente | `commercial.quote.update`, todos os campos, fica pendente (como hoje) | ok | ok | ok (como hoje) |
| recusada | `commercial.quote.update`, todos os campos, **reabre para pendente** (como hoje) | **422** *(Claude: transição inválida)* | ok *(como a UI já oferece)* | ok (como hoje) |
| aprovada, sem turma | **só com `commercial.quote.approve`**, todos os campos, **continua aprovada** e o `approved_at` não muda | ok, zera `approved_at` (como hoje) | **422** *(Claude)* | 422 (como hoje) |
| aprovada, com turma | **só com `commercial.quote.approve`**, e só o `value_uf` pode mudar; continua aprovada | **422** (decisão do João) | **422** *(Claude)* | 422 (como hoje) |

Recusar e aprovar já exigem `commercial.quote.approve` na rota (`QuoteController`), e isso fica.

- Editar cotação aprovada **sem** `commercial.quote.approve` dá 422 *(Claude: 422 de domínio com a
  mensagem atual `commercial.quote.approved_cannot_edit`, e não 403, porque a rota é a mesma do
  `PUT` comum e o admin tem `commercial.quote.update`)*.
- Em cotação aprovada com turma, o 422 sai quando **qualquer** campo além do `value_uf` chega
  **diferente** do valor gravado. Campo igual ao gravado não recusa, porque o front manda o
  formulário inteiro (`QuoteData::rules()` exige `course_id` e `student_count`). A chave do erro é o
  campo recusado. Regra de comparação *(Claude, do builder check)*: campo ausente (`Optional`) conta
  como "não mudou"; `null` sobre valor gravado conta como diferente; datas comparam por
  `toDateString()`; `value_uf` livre.
- O "só superadmin" é `can('commercial.quote.approve')` do ator. O controller passa o ator (ou o
  resultado da checagem) ao módulo *(Claude)*; o módulo não lê `auth()` por conta própria.
- As mensagens novas (transição inválida, turma existente ao recusar, campo travado por turma)
  entram nos três locales do backend (`es_CL`, `pt_BR`, `en`).

**D3 — Um módulo dono** *(Claude; nome e forma ficam com o builder dentro do molde
`backend-ddd.md`, sem Repository)*. O módulo vive em `Domains/Commercial/` e é a única porta para
aprovar, recusar, editar e arquivar a cotação. Toda operação abre `DB::transaction`, toma
`Quote::lockRow($id)` e decide sobre a linha travada, nunca sobre o model do binding (que pode estar
velho). As Actions atuais (`ApproveQuoteAction`, `RejectQuoteAction`, `UpdateQuoteAction`,
`DeleteQuoteAction`) podem virar fachadas finas do módulo ou desaparecer. O controller continua
chamando uma Action por rota, como manda a rule.

A pergunta "tem turma?" cruza para `Operation` (`Quote::turma()` já existe). Ler a relação é
aceitável. Escrever na turma não acontece.

**D4 — Ordem de lock sem ciclo.** `CreateTurmaAction` trava só a cotação. `RestoreTurmaAction`
trava turma e depois cotação. O módulo trava **só a cotação**, e as operações que também tocam o
orçamento (D5) travam **orçamento e depois cotação**. Nenhum sítio trava cotação e depois
orçamento. O builder confere essa ordem em todos os sítios que tomarem os dois locks.

**D5 — P-49, eixo cotação × orçamento.** Nasce `Budget::lockRow()` e `Budget::lockForWrite()` no
molde de `Client` (`Client.php:139-166`): `lockForWrite` recusa com 422 se o orçamento estiver
arquivado.

- `DeleteBudgetAction`: transação, `Budget::lockRow()`, e a checagem de cotação aprovada passa para
  **dentro** da transação, depois do lock.
- `RestoreQuoteAction`: troca a leitura `$quote->budget->trashed()` por `Budget::lockForWrite()`
  dentro da transação, antes do `restore()`, mantendo a mensagem `commercial.quote.budget_archived`.
- `CreateQuoteAction` *(Claude)*: escritor de filho do orçamento, toma `Budget::lockForWrite()`
  antes de derivar o `seq_in_budget`. Sem isso, criar cotação concorrente ao arquivar o orçamento
  deixa cotação ativa sob orçamento arquivado, a mesma classe da P-49.
- O docblock da `RestoreQuoteAction` que declara "SEM lock sobre o orçamento" é reescrito.
- A P-49 vai **inteira** para `encerradas.md` no fechamento: os eixos redator e turma fecharam em
  2026-08-23, e este é o último.
- O 422 de `Budget::lockForWrite` não é alcançável pela API fora de corrida (o binding de
  `{budget}` devolve 404 para orçamento arquivado). O teste chama a Action direto com o orçamento
  arquivado depois do binding *(Claude, do builder check)*.

**D6 — `QuoteData` ganha `turma_status`** *(Claude)*. É um campo só de saída,
`TurmaStatus|Optional|null`, preenchido por `fromModel` a partir de `Quote::turma` (viva): `null`
sem turma, senão `em_andamento` ou `concluida`. A relação entra em `QuoteQueryBuilder::LISTING` e
em toda carga de cotação que alimenta `BudgetData`, sem N+1. O `generated.ts` é regenerado
(`typescript:transform`), nunca editado à mão.

**D7 — Tag da turma na cotação** (decisão do João, P-112). Texto com o prefixo "Turma:" nos três
idiomas do front: *A configurar* quando a cotação está aprovada e `turma_status` é `null` (inclusive
com turma arquivada, coerente com a D1), *En curso*
para `em_andamento` e *Concluida* para `concluida`. Cotação pendente ou recusada não tem tag
*(Claude: a turma só existe a partir da aprovação)*. Os rótulos pt-BR e en são escolha do builder,
no tom dos locales vizinhos.

- **Detalhe do orçamento:** cada cotação aprovada mostra a tag na `QuoteRow`, junto da tag de status.
- **Tabela de orçamentos** (`BudgetsTable`, coluna de status): abaixo da tag de status aprovado, uma
  tag por cotação aprovada, **indicando a cotação** a que se refere (ex.: `Cot 2 · Turma: En
  curso`) (decisão do João). Os dados já vêm em `BudgetData::$quotes`.

**D8 — Ações na `QuoteRow`** *(Claude)*. As ações seguem a matriz:

- "Recusar" some quando a cotação tem turma.
- "Editar" aparece na cotação aprovada só para quem tem `commercial.quote.approve`.
- No formulário de edição de cotação aprovada com turma, só o campo UF fica habilitado.

"Aprovar" e "Arquivar" mantêm a visibilidade de hoje. O backend é a fonte da regra; a UI só não
oferece o que daria 422.

**D9 — Achado 0.5.** `ArchiveRedatorAction:18-23` e o comentário da cascata em `Turma.php:76-79`
passam a dizer que os escritores de filho tomam o lock do pai (`lockForWrite`), como tomam desde
2026-08-23 (`ParentLockOnChildWriteTest`). O builder confere quais escritores tomam antes de
escrever o texto: o plano não é fonte sobre o que o código faz. `ArchiveRedatorAction` mora em
`Domains/Identity/Actions/`.

**D10 — Restaurar turma confere a cotação** (decisão do João, do builder check). Pela D1, turma
arquivada não conta, e o superadmin pode recusar a cotação ou trocar o curso dela enquanto a turma
está arquivada. Restaurar a turma depois devolveria turma viva sob cotação recusada, ou com
`course_id` diferente do da cotação. `RestoreTurmaAction`, que já trava a cotação
(`Quote::lockRow`), passa a recusar com 422 quando a cotação travada **não está aprovada** ou quando
o `course_id` dela **difere** do da turma. Mensagens novas nos três locales do backend.

## 5. Restrições

- Leis do `CLAUDE.md` §5: DDD-lite sem Repository; auditoria na aplicação (o `update` sob lock
  continua auditado pelo `AuditableTrait`); `generated.ts` só regenerado; erro sobe como
  `ValidationException` para o handler RFC 7807 (nunca `abort(422)`); features do front não importam
  PrimeReact direto nem outra feature.
- Em sqlite o `lockForUpdate` é no-op: a suíte prova a **matriz**, não o lock. Prova de lock, se
  houver, segue o molde `PrimaryConcurrencyTest`/`EmissionResultRaceTest` (só em MySQL).
- Teste existente que fixa comportamento que este bloco inverte (ex.: admin recebendo 422 ao editar
  aprovada continua valendo; superadmin editando aprovada passa a dar 200) é atualizado na mesma
  task que inverte a regra, e não descoberto depois.
- ~10 usuários internos: nada de máquina de estado genérica, biblioteca de workflow ou tabela de
  transições persistida.

## 6. Deixado ao builder

- Nome e forma do módulo dono (classe de serviço com métodos por verbo, ou Actions finas sobre um
  guardião comum), dentro de `backend-ddd.md`.
- Se as Actions antigas ficam como fachada ou somem.
- O texto exato das mensagens novas e dos rótulos pt-BR/en da tag.
- O componente visual da tag (`AppTag` de `shared/ui`, severidade) e o layout da pilha de tags na
  célula da tabela, desde que não estoure a coluna a 1024 px.
- Se vale um teste MySQL de corrida para "recusar × criar turma" no molde do `EmissionResultRaceTest`.
  É opcional, e a matriz em sqlite é obrigatória.

## 7. Critérios de aceite (DoD)

1. Um teste de tabela **origem × verbo × turma × papel** cobre cada célula da D2 pela API e afirma o
   código HTTP e o estado gravado (status, `approved_at`, campos):
   - recusar com turma em andamento dá 422, e com turma concluída também;
   - recusar com turma arquivada passa;
   - superadmin edita aprovada sem turma (inclusive o curso) e ela continua aprovada;
   - superadmin edita só o UF de aprovada com turma e passa;
   - mandar outro campo diferente nesse caso dá 422;
   - admin editando aprovada dá 422;
   - aprovar aprovada e recusar recusada dão 422.
2. `DeleteBudgetAction`, `RestoreQuoteAction` e `CreateQuoteAction` tomam `Budget::lockRow`/`lockForWrite`
   dentro da transação, e criar cotação em orçamento arquivado dá 422 (Action chamada direto). A P-49
   sai de `abertas.md`.
2a. Restaurar turma cuja cotação foi recusada, ou teve o curso trocado, dá 422 e a turma continua
   arquivada.
3. `GET` de orçamento e de cotação devolvem `turma_status`, sem N+1, e o `generated.ts` regenerado
   bate (CI `types-drift` verde).
4. No navegador, no stack da lane: a tag aparece na `QuoteRow` e na tabela de orçamentos com a
   cotação indicada; "Recusar" some com turma; o superadmin edita aprovada sem turma; com turma, só o
   UF fica habilitado; o admin não vê "Editar" em aprovada.
5. Suíte PHP, Pint nos arquivos tocados, `pnpm lint`, `pnpm build` e `pnpm test` verdes.

## Verificação externa

Nenhuma. O bloco cobre regras do backend, o contrato `QuoteData` e telas do frontend, tudo provado
no repositório e no stack da lane. `efeito_externo: nao`.
