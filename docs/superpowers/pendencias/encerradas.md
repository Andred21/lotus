# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

## P-76 — seis frases ao usuário seguem literais em `app/`, por três caminhos que nenhuma catraca alcança

**Bloco:** item 52 (desde 2026-11-02) · **Gatilho:** bloco que tocar `Identity/Services/UserProvisioner`, `Shared/Rules`,
`Shared/Files/Rules` ou `AuthController::logout()` por outro motivo; cada sítio passa a ler `lang/`
nos três locales no mesmo commit, **ou** a catraca ganha o caminho que faltava. Revisar em
**2026-10-31**.

**ENCERRADA em 2026-11-03, no `backend-arquivo-recepcao-e-upload` (item 52), pelo próprio gatilho:** o bloco tocou `UserProvisioner`, `Shared/Rules`, `Shared/Files/Rules` e o `AuthController::logout()`, e as seis frases (o duplicado e o arquivado do `UserProvisioner`, os `$fail()` de `ValidRut`, `PrintableGrade` e `ScannedForMalware`, e a resposta do logout) passaram a ler `lang/` nos três locales (`dd29add9`). O `MensagemLiteralTest` ganhou a quarta porta (`$fail` de regra) e a quinta (resposta de sucesso), e perdeu a entrada morta `UserPhotoService.php:64`.

## P-107 — o 422 de upload diz "El campo file…" em vez do nome do campo em es-CL

**Bloco:** item 52 (desde 2026-11-02) · **Quem decide:** — · **Gatilho:** bloco que tocar a validação de upload
(`Shared/Files`) ou os atributos de validação do `lang/`. Revisar em **2026-11-07**.

**ENCERRADA em 2026-11-03, no `backend-arquivo-recepcao-e-upload` (item 52), pelo próprio gatilho:** o `validation.attributes` ganhou `file`, `valid_until`, `documents` e `documents.*` nos três locales (`dd29add9`, `2ab31e86`). O 422 de upload em es-CL diz "El campo archivo…", provado pelo `UploadAttributeLocaleTest` e contra a API da lane no fechamento (`POST /api/budgets/1/files` com `text/plain`).


## Rastro anterior, já removido

**A P-49 e a P-112 saíram no fechamento do `backend-arquivo-recepcao-e-upload` (item 52, 2026-11-03)**, o primeiro depois do item 50, que as encerrou no mesmo dia. O rastro durável está nos commits e na linha de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-74, a P-101, a P-103, a P-104, a P-105, a P-108 e a P-109 saíram no fechamento do `backend-ciclo-de-vida-da-cotacao` (item 50, 2026-11-03)**, o primeiro depois do item 49, que não as removeu. O item 48 encerrou a P-103 e a P-104, e o item 49 a P-74, a P-101, a P-105, a P-108 e a P-109, todas em 2026-11-02. O aceite do "redator" em inglês, que a P-104 deixou pendente, vive na P-116. O rastro durável está nos commits e na linha de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-106 e a P-111 saíram no fechamento do `certificacao-estado-de-emissao` (item 48, 2026-11-02)**, o primeiro depois do item 49 que não as removeu. O item 47 as encerrou em 2026-11-02: a P-106 por mecanismo (a lixeira do presupuesto confirma pelo `AppFileSlot`, medido no `prova.md` do bloco), a P-111 pelo próprio gatilho (o `AppSignatureSlot` na linha do `estrutura-monolito.md`, `debc6891`). O rastro durável está nos commits e na linha de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-28 e a P-78 saíram no fechamento do `frontend-ajustes-de-interface-lote-2` (item 47,
2026-11-02)**. O item 40 as encerrou em 2026-10-29, e os fechamentos de 2026-11-01 passaram sem
removê-las. O rastro durável está nos commits e na linha de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-94 saiu no fechamento do `certificado-refinamento-e-validade` (item 40, 2026-10-30)**, o primeiro
depois do item 43, que a encerrou em 2026-10-29 pela medição do `smoke.md` do bloco (`scroll` = `frame` na
linha `DIALOGO` em 1024x768 e em 1440x900). O rastro durável está nos commits e na linha de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-100 e a P-05 saíram no fechamento do `seeder-carga-inicial-producao` (item 38, 2026-10-21)**, o primeiro depois do item 39, que passou sem removê-las. Ambas foram encerradas em 2026-10-06 pelo item 13: a P-100 pela correção da idade do backup (Q-1 da revisão, aprovada pelo João), a P-05 pela decisão D4 da spec — não consolidar as 30 migrations, com o "banco = código" provado pelo `deploy/bin/conferir-golive.sh`. O rastro durável está nos commits e na linha de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-84 e a P-92 saíram no fechamento do `infra-producao-email-ses` (item 33, 2026-10-04)**, o primeiro
depois do item 35 que as encerrou em 2026-10-03: a P-84 pela seção HARNESS do
`docs/estrutura-monolito.md`, a P-92 pela invariante 10 reescrita e exercida no fechamento do item
35. O rastro durável está nos commits e na linha de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-77 saiu no fechamento do `harness-commands-de-bloco` (item 35, 2026-10-03)**. Fechou no
item 32, em 2026-09-27, pelo gatilho pago: `app.lotusotec.cl` resolve exatamente o EIP
`18.230.53.197`, sem AAAA, e o §11 do runbook rodou de ponta a ponta. O fechamento do item 23
(2026-09-28) a deixou em rastro, e o João decidiu tirá-la neste. A prova do QR num PDF de produção,
que o gatilho não pedia, segue na [P-89](./abertas.md). O rastro durável está nos commits e na
linha de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-55, a P-87 e a P-88 saíram no fechamento do `infra-producao-dns-e-tls` (item 32,
2026-09-27)**. A P-55 fechou no item 30 (o espelho do `state.md` deixou de existir) e a P-87 e a
P-88 no item 31 (o botão confere o host antes de promover, e o `deploy.sh` fixa `gatika-cl`), todas
em 2026-09-26. O fechamento do item 16 (2026-09-27) as deixou para a lane que as abriu; este é o
primeiro da `lane-b` depois deles. O rastro durável está nos commits e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-59, a P-75 e a P-79 saíram no fechamento do `cicd-promocao-deploy-e-rollback` (item 12,
2026-09-26)**, o primeiro posterior ao do `backend-config-e-conteudo-de-documento` (item 29), que as
encerrou em 2026-09-25: a P-59 por mecanismo, com o `'UTC'` literal como decisão escrita e o
`FusoDoNegocio` dono da data de calendário (catracas `FusoDeArmazenamentoTest` e
`DataDeCalendarioTest`); a P-75 por veredito escrito, pois a config nunca divergiu do ambiente; e a
P-79 por mecanismo, com a chave própria do QR, obrigatória e `https` em produção, provada no QR
decodificado do PDF. O rastro durável está nos commits e na linha de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-82 saiu no fechamento do `backend-config-e-conteudo-de-documento` (item 29, 2026-09-25)**, o
primeiro posterior ao do `harness-hooks-de-guarda` (item 28), que a abriu e a encerrou em 2026-09-20
pelos dois lados do gatilho: a spec dos hooks corrigida (§5.2, §5.3, §9 e §11) e o `run-all.sh` com o
`trap limpar_descartes EXIT` que a §9 prometia, provado nos dois sentidos (0 sobras com o trap, 2 com
a linha neutralizada). A spec arquivada está em
[`../specs/archive/2026-09-20-harness-hooks-de-guarda-design.md`](../specs/archive/2026-09-20-harness-hooks-de-guarda-design.md);
o rastro durável, nos commits e na linha de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-58 saiu nos dois fechamentos de 2026-09-20** — o do
`infra-producao-provisionamento-aws` (item 10 v2), que integrou primeiro, e o do
`harness-hooks-de-guarda` (item 28) —, os primeiros posteriores ao do
`frontend-arrumacao-de-testes` (item 27), que a encerrou em 2026-09-04 por mecanismo: o
`compose-dev.test.ts` passou a afastar os `.env*` das **duas** raízes que o `vite.config.ts` lê — a
do repositório (`loadEnv(mode, RAIZ, 'LOTUS_')`) e a de `frontend/` (`loadEnv(mode, __dirname,
'VITE_')`) —, e o gate deixou de depender do disco de quem roda, provado com o arquivo posto e
retirado duas vezes (3 falhas na versão pré-Task-7, 12/12 na nova, com o mesmo `frontend/.env` no
disco). O rastro durável está nos commits e na linha de entrega em
[`../historico/progress.md`](../historico/progress.md).

**As três do `backend-envelope-de-erro-e-recusa-de-dominio` (item 26) saíram no fechamento do
`dominio-decisoes-de-rbac-e-semantica` (2026-09-04)**, o primeiro da `lane-a` posterior ao bloco que
as encerrou em 2026-09-03 — a **P-71** e a **P-72** (as recusas literais e o `detail` do 419 saindo
para `lang/` nos três locales, com o resíduo nomeado na **P-76**) e a metade de **comportamento** da
**P-60** (a validação pública do certificado com snapshot incompleto, fechada por decisão escrita); a
metade de **dado de dev** dela segue viva na **P-44**. O rastro durável está nos commits e nas linhas
de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-69, a P-68, a P-70, a P-30 e a P-42 saíram no fechamento do `frontend-arrumacao-de-testes`
(2026-09-04)**, o primeiro posterior ao do `frontend-dividas-de-mecanismo` (item 25), que as
encerrou em 2026-09-03 — e nenhuma saiu na fé: a **P-69** fechou no `setupFiles` com `cleanup()`
global mais as catracas `CLEANUP_A_MAO` e a guarda estática do `desmonte-global.test.ts`; a
**P-70**, na allowlist `DETALHE_LOCALIZADO` de 403/404/429 do `screenDetail`; a **P-30**, no
`warning` alinhado ao amarelo do `AppTag`, com régua de contraste própria (a borda que ela abriu
vive na **P-74**); a **P-68** e a **P-42**, por decisão escrita — a razão da assimetria de
`max-lines` ao lado da régua e a emenda datada ao D1 da spec arquivada da célula de identidade, as
duas sem tocar código. O rastro durável está nos commits e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-73 e a P-67 saíram no fechamento do `frontend-dividas-de-mecanismo` (2026-09-03)**, o primeiro
posterior aos dos blocos que as encerraram. A **P-73** fechou em 2026-09-02 na PR #93, por bump só
de lockfile (`browserslist` 4.28.4 → 4.28.8), com `pnpm audit` de volta a **0** e o `package.json`
intacto. A **P-67** fechou em 2026-09-01 no `frontend-decisoes-de-ui-pendentes`, por mecanismo — a
escala de raio saiu da rule para catraca. **O ID `P-73` está queimado:** a ficha que este bloco abriu
nasceu numerada `P-73` por engano e foi renumerada para `P-74` no próprio fechamento, pelo mesmo
precedente de sempre — ID publicado não se reusa. O rastro durável das duas está nos commits e nas
linhas de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-61 e a P-63 saíram no fechamento do `frontend-decisoes-de-ui-pendentes` (2026-09-01)**, o
primeiro posterior aos dos dois blocos que as encerraram em 2026-08-30. A **P-61** fechou no
`hardening-i18n-e-erros-api` por mecanismo — os sete `title` do `ProblemDetails::fromException` e o
`detail` mascarado do 500 saíram do código para `lang/<locale>/problem.php` nos três locales, com o
`LocaleParityTest` recusando chave que exista em um só, e a borda que ela não cobria (o 419) vive
nomeada na [P-72](./abertas.md). A **P-63** fechou no `frontend-triagem-dos-audits-do-item-18`,
também por mecanismo — a legenda do `AppLineChart` ganhou conteúdo próprio
(`shared/ui/AppLineChart/legend.tsx`, `<ul role="list">`) e o mini-reset deixou de tirar semântica
de lista renderizada por biblioteca, medido na run 5 (`audits/2026-08-29-item19-run5.md`): zero `ul`
sem `role` no Dashboard. O rastro durável das duas está nos commits e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).


**Saíram no fechamento do `hardening-acesso-ownership-e-integridade` (2026-08-23), o primeiro
posterior ao do BD-15, que é a condição que as seis linhas pediam:** a **P-18** (página de
fechamento do Notion com `Sprint` divergente), a **P-20** (`openspout/openspout` sem ADR hospedeiro,
que virou o ADR-20), a **P-21** (`simple-qrcode` sem nota no ADR-12, que virou a nota de
2026-08-22), a **P-23** (a coluna `Contexto` do `progress.md`, declarada e não restaurada), a
**P-39** (o plano do BD-6 sobre o RBAC de `GET /api/courses`, que virou a lição 18) e a **P-43**
(`der-fisico.md` chamando `certificates` de "planejada", fechada pelas duas lanes em paralelo, e
cuja lacuna remanescente virou a [P-52](./abertas.md#p-52)).

A **P-40** (o ramo "catálogo genuinamente vazio" do BD-6 medido em `d20bebc`, não remedido contra
HEAD) foi encerrada em 2026-08-22, no `bd12-load-state-e-listas`, e saiu no fechamento do
`feedbacks-resolver-escopo` e no do `BD-15-docs-guardrails-e-sincronizacao` (2026-08-22) — os
primeiros **posteriores** ao do BD-12, que é o que a linha do índice pedia. A **P-29** (corrida de
unicidade entre transações subindo 500) e a **P-35** (o ADR-17 defendido em duas profundidades)
foram encerradas em 2026-08-20, no `bd14-contrato-de-entrada`, e saíram no fechamento do
`bd12-load-state-e-listas` (2026-08-22) — o primeiro **posterior** ao do BD-14, que é o que a linha
do índice pedia. A **P-36** (catraca `COR_HARDCODED` cega para `style={{ }}`) e a **P-37**
(`FormField` sem `htmlFor`) foram encerradas em 2026-08-18 e saíram no fechamento do
`bd13-listagens-e-abas`. A **P-45** (o `TestCase` lendo `FRONTEND_URL` cru) saiu no fechamento do
`arquivados-roots-restantes` (2026-08-19). O rastro durável de todas está nos commits (`8ffdefa`,
`efd5bfe`, `0672019`, `2ad35d7` e `6fd0ad8`) e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).
