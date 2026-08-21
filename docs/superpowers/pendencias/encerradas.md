# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

## P-29 — corrida de unicidade entre transações ainda sobe 500

**Bloco:** BD-14 · **Gatilho:** fecha quando um 500 de cadastro por RUT/e-mail duplicado for
observado em uso real (aí a frequência justifica o contrato de erro), ou quando um bloco tocar
`ProblemDetails`/`ValidationMessages` por outro motivo e puder absorver a conversão. Revisar em
**2026-10-31**.

Duas escritas concorrentes com o mesmo RUT ou e-mail colidem no índice único de `users` e sobem
**500**, não 422.

O BD-2 (`integridade-e-concorrencia-backend`, 2026-08-11) moveu o check de unicidade para **dentro**
da `DB::transaction` nos três sítios medidos (`UpdateStaffUserAction`, `UpdateClientAction`,
`UpdateRedatorAction`), o que fecha a janela entre o check e a escrita da **mesma** transação.

**Atualização de 2026-08-13 (BD-9):** os dois métodos que o texto original nomeava —
`ensureRutAvailable`/`ensureEmailAvailable` — não existem mais; a porta única é
`UserProvisioner::ensureIdentityAvailable`, e os nove caminhos de escrita passam por ela. Isso
**não** move o gatilho: o BD-9 unificou e agregou o 422, não fechou a corrida entre transações
distintas.

O que segue aberto, por recusa explícita registrada na spec (D3): o `SELECT` de unicidade não trava
linha inexistente, então dois cadastros simultâneos do mesmo RUT passam os dois pelo check e o
perdedor estoura no índice único como `QueryException`, que o handler RFC 7807 devolve como 500
mascarado. Converter violação de índice em 422 exigiria capturar `SQLSTATE 23000` e reescrever o
erro por coluna, decisão de contrato de erro que a spec preferiu não tomar dentro de um bloco de
concorrência. Proporcional a ~10 usuários internos: a colisão exige dois cadastros do mesmo RUT no
mesmo segundo.

**ENCERRADA em 2026-08-20, no `bd14-contrato-de-entrada` (D4).** A tradução mora na porta única:
`UserProvisioner::writing()` envolve a escrita, captura a `QueryException` e devolve
`ValidationException` do campo — a MESMA resposta que `ensureIdentityAvailable` dá quando ganha a
corrida. A detecção é pela mensagem, não pelo SQLSTATE (o código da PDOException varia por driver),
e cobre as duas grafias: sqlite (`UNIQUE constraint failed: users.rut`) e MySQL
(`Duplicate entry … for key 'users_rut_unique'`, com e sem qualificador de tabela — as quatro
formas reproduzidas contra o `mysql:8.0.45` do compose). Exige o marcador de violação de
UNICIDADE antes de resolver a coluna, senão um `NOT NULL constraint failed: users.email` virava
"já cadastrado". Provas: `UniqueIndexCollisionTest`; e2e do gate: `POST /api/users` com RUT já
cadastrado devolve **422** com `rut: "Este RUT já está cadastrado."`. O que **não** é alcançável
por uma request só é a corrida em si — as duas portas devolvem a mesma resposta por desenho, e é
isso que fecha a ficha.

---

## P-35 — o ADR-17 é defendido em duas profundidades

**Bloco:** BD-14 · **Gatilho:** fecha quando um bloco tocar `CreateQuoteAction`/`Quote` por outro
motivo e puder absorver a simetria, ou quando um payload de cotação com `seq_in_budget` for
observado. Revisar em **2026-10-31**.

`course_certificate_templates.version` saiu do `$fillable` e só a Action a escreve, enquanto
`CreateQuoteAction` segue gravando `seq_in_budget` por **mass assignment**.

Nasceu no bloco `rastro-unicidade-e-gates` (2026-08-12; entrou como P-34 no fechamento e virou
**P-35** ao mesclar a `main`, que já tinha publicado a P-34 da catraca de cor): a D10 tirou `version`
do `$fillable` justamente porque payload que chega com o número não pode vencer a derivação sob
lock — e o `seq_in_budget`, mesmo padrão do mesmo ADR, continua aceitável por mass assignment.
Estava no ledger de execução como achado aberto e **não** entrou nos seis achados do
`/revisar-sprint`, então nunca foi triado.

Não é bug vivo: nenhum payload de cotação envia `seq_in_budget` hoje e o `unique` do banco recusa o
par repetido — o que fica é a assimetria, que faz o próximo leitor do ADR-17 copiar a forma mais
fraca.

**O gatilho venceu pela metade no `arquivados-roots-restantes` (2026-08-19) e a simetria NÃO foi
absorvida.** O bloco tocou `Quote` (o `lockRow` que nasceu para o Q-5 do review), `DeleteQuoteAction`
e `RestoreQuoteAction` — mas **não** `CreateQuoteAction`, que é o sítio do mass assignment, e o
`$fillable` do model não foi reaberto. Absorver custaria tirar `seq_in_budget` do `$fillable` e
passar a escrevê-lo explicitamente na Action, o que muda o caminho de criação de cotação num bloco
cujo escopo era arquivar e restaurar. Fica registrado que o gatilho já foi visto vencer: o próximo
bloco que abrir `CreateQuoteAction` não tem mais desculpa de contexto.

**ENCERRADA em 2026-08-20, no `bd14-contrato-de-entrada` (D5).** `seq_in_budget` saiu do
`$fillable` de `Quote` e `CreateQuoteAction` passou a gravá-lo por atribuição explícita, sob o
`lockForUpdate` que já existia — a mesma forma do `version` do template de certificado. O
`$auditInclude` manteve o campo: sair do `$fillable` não tira da auditoria (ADR-08 intacto).
Custo real medido: os testes que criavam cotação por `Quote::create` passaram a `forceCreate`
(varredura completa, nenhum `Quote::create` sobrou no repositório). Provas:
`SeqInBudgetNotMassAssignableTest`; e2e do gate: dois `POST /api/budgets/{id}/quotes` com
`"seq_in_budget": 99` no corpo gravaram **1** e **2**.

---

## Rastro anterior, já removido

A **P-36** (catraca `COR_HARDCODED` cega para `style={{ }}`) e a **P-37** (`FormField` sem
`htmlFor`) foram encerradas em 2026-08-18 e saíram no fechamento do `bd13-listagens-e-abas`. A
**P-45** (o `TestCase` lendo `FRONTEND_URL` cru) saiu no fechamento do
`arquivados-roots-restantes` (2026-08-19). O rastro durável de todas está nos commits (`8ffdefa`,
`efd5bfe`, `0672019`, `2ad35d7` e `6fd0ad8`) e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).
