# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

### P-55 — a invariante do espelho proíbe o que toda lane precisa fazer

**Encerrada em 2026-09-26, no fechamento do `harness-estado-por-bloco` (item 30), por decisão do
João no gate.** O item 30 não escolheu nenhuma das duas saídas do gatilho: extinguiu o espelho. O
`state.md` virou contrato e não guarda mais `lanes:`, `focused_lane` nem os campos singulares do
topo; o estado de cada bloco mora em `docs/superpowers/blocos/<NN>-<slug>/estado.md`, na árvore da
lane (invariante 6 do contrato). Sem espelho, não há o que a lane precise escrever e a regra
proíba. Até o item 35 mesclar, os commands ainda citam `focused_lane`, e a seção "Transição" do
`state.md` manda lê-los contra o `estado.md` do bloco.

**Gatilho:** fecha quando o João escolher entre (a) reescrever a invariante para descrever o que as
lanes fazem de fato, ou (b) dar ao espelho um mecanismo próprio que dispense a escrita manual — por
exemplo `focused_lane` derivada da árvore corrente em vez de campo escrito. Revisar em
**2026-10-31**.

O `state.md` diz, na lista do que cada lane pode escrever: *"**Nunca os campos singulares do topo**:
são espelho de `focused_lane`, e trocar o foco é fronteira durável do main tree."* Mas
`/planejar-bloco` e `/executar-bloco` leem os singulares, não o bloco da lane em `lanes:` — então
uma lane que não vire o espelho na própria árvore é planejada e executada contra a lane errada.

**Medido em 2026-08-24:** três lanes viraram o espelho na própria branch, fora do main tree — a
`lane-c` em `ff5c29f6` (`focused_lane: lane-c`), a `lane-a` no commit de promoção do item 2 e a
`lane-b` no commit que abre esta ficha. Nenhuma das três podia, pela letra. É a mesma classe do
achado **Q-2** do review de 2026-08-22, em que a regra de dono foi quebrada por 21 commits no mesmo
dia em que foi escrita: a regra descreve a intenção (nenhuma lane sobrescreve o foco de outra no
merge) e proíbe o mecanismo que a operação exige.

**Por que fica aberta:** as duas saídas mudam contrato de workflow lido por comando — decisão do
João, não de lane em execução. Até lá vale o precedente executado: cada árvore mantém o espelho
apontando para a lane que a ocupa, e a colisão de merge se resolve na integração serial.

**Quarto caso, 2026-08-28:** a promoção do item 18 (`frontend-estilizacao-padronizacao-de-componentes`)
para a `lane-c` foi escrita da worktree `../fix-frontend`, espelho singular incluído, com o João
avisado da pendência antes do commit e decidindo por ela. A alternativa oferecida — gravar só o
bloco da lane aqui e o espelho no main tree — foi recusada por ping-pong entre árvores. A ficha
segue aberta: quatro precedentes não reescrevem a invariante.

**Quinto caso, 2026-08-29:** a promoção do item 19 (`frontend-triagem-dos-audits-do-item-18`) para a
`lane-c` foi escrita da worktree `../fix-frontend`, espelho singular incluído, pelo mesmo motivo do
quarto: `/planejar-bloco` lê os singulares, e a sessão rodou autônoma, sem o João para escolher o
ping-pong entre árvores. Cinco precedentes, mesma saída pendente.

*(A **`P-59`**, a **`P-75`** e a **`P-79`** cumpriram a sprint de rastro e saíram no
fechamento do `cicd-promocao-deploy-e-rollback` (item 12, 2026-09-26); o parágrafo do rastro adiante
é o delas. O item 12 não encerrou ficha: abriu a **`P-86`** e a **`P-87`**, emendou a **`P-62`** com
o botão sem Environment e disparou, sem pagar, o gatilho da **`P-87`**.)*

> **O número `P-73` está queimado, e o `P-74` foi disputado.** O `P-73` pertenceu à advisory do
> `browserslist`. Os fechamentos do item 25 e do item 26 abriram, cada um, uma ficha que o reusou
> por engano; as duas foram renumeradas no mesmo dia — a do item 25 para **`P-74`** e as do item 26
> para **`P-75`** e **`P-76`**, nesta ordem de integração. Número de pendência não se reusa nem se
> renumera para trás: é a mesma regra que o `state.md` escreveu para o rótulo de bloco na colisão
> de 2026-09-02.

> **Os números `P-77`, `P-78` e `P-79` foram disputados em 2026-09-20.** Dois blocos fecharam no
> mesmo dia, em árvores diferentes, e cada um alocou a mesma faixa: o
> `infra-producao-provisionamento-aws` (item 10 v2, `lane-b`) e o `harness-hooks-de-guarda` (item 28,
> `lane-a`). O item 10 integrou primeiro, pela **PR #105**, então os três IDs são dele. As três
> fichas do item 28 foram renumeradas **na integração**, não no fechamento: `P-77` → **`P-82`** (a
> spec do harness), `P-78` → **`P-83`** (as sete decisões de política) e `P-79` → **`P-84`** (o
> harness fora de doc versionado). É o mesmo precedente do `P-73`: renumera quem chega depois, nunca
> quem já está publicado. **A causa é estrutural, não descuido** — a numeração é um contador global
> sem reserva, e duas lanes que fecham no mesmo dia sem integrar entre si colidem por construção. A
> **`P-55`** é o lugar onde esse tipo de invariante de `state.md` está sendo discutido.

## Rastro anterior, já removido

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
