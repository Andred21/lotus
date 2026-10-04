# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

## P-84 — o harness de guarda não existe em nenhum doc versionado

**Encerrada em 2026-10-03, no fechamento do `harness-commands-de-bloco` (item 35), pelo gatilho
pago.** O `docs/estrutura-monolito.md` ganhou a seção `## HARNESS — .claude/ e .agents/`, que
descreve `.claude/hooks/` (os cinco hooks e o que cada um nega), `.claude/tests/` e
`.claude/settings.json`, mais a régua da allowlist do `guard-main-shell` e como se acrescenta
entrada a ela. A `auditar-docs` do fechamento conferiu a seção contra o disco, sem divergência.

*(nasceu `P-79` no fechamento do item 28 e foi renumerada na integração: o item 10 v2 fechou
a mesma faixa no mesmo dia e mesclou antes, pela PR #105. Ver a nota da colisão em
[`encerradas.md`](./encerradas.md).)*

**Bloco:** 35 (`harness-commands-de-bloco`, desde 2026-09-26; nasceu `31` e foi renumerado em 2026-09-27) · **Gatilho:** fecha quando `docs/estrutura-monolito.md` descrever `.claude/hooks/`,
`.claude/tests/` e `.claude/settings.json`, ou quando o `CONTRIBUINDO.md` disser o que os cinco
hooks negam e como se acrescenta entrada à allowlist. Revisar em **2026-10-31**.

Medido em 2026-09-20, no `/fechar-sprint` do `harness-hooks-de-guarda` (item 28). O bloco entregou
cinco hooks que passam a governar **toda** sessão futura — e nenhum doc versionado os menciona:

| Doc | O que ele diz hoje |
|---|---|
| `docs/estrutura-monolito.md` | zero ocorrências de `.claude`. É o doc que o `CLAUDE.md` §3 manda ler "antes de criar arquivo novo — para saber ONDE ele vai", e ele não conhece a pasta |
| `CONTRIBUINDO.md` | descreve o `pre-push` de `.githooks`, que é outro mecanismo. Nada sobre os hooks do Claude Code |
| `CLAUDE.md` §4 e §6 | tabelam comandos e skills; hook não aparece |

A consequência não é estética: quando o `guard-main-shell` negar um comando legítimo, o remédio é
"acrescente a entrada em `.claude/hooks/lib/classificar-comando.py` e commite" — o próprio motivo de
recusa diz isso —, e não há doc que explique a régua da allowlist nem por que ela existe. O bloco
não escreveu nada disso porque o plano não listou entregável de doc; a spec §3.4 cobre a
consequência de versionar os hooks, mas a spec agora está em `specs/archive/`, que ninguém lê por
rotina.

## P-92 — a invariante 10 manda o main tree escrever o `backlog.md` na `main`, e nenhum caminho deixa

**Encerrada em 2026-10-03, no fechamento do `harness-commands-de-bloco` (item 35), pelos dois
lados do gatilho.** A invariante 10 de `docs/superpowers/state.md` foi reescrita (emendas E8 e E10
da spec do bloco): o `backlog.md` entra na `main` só por PR, e a lane remove a própria ficha e os
`D-*` que pagou no commit de fechamento do `/finalizar-bloco`. O caminho ficou escrito no Passo 6d
do command e foi exercido uma vez, no próprio fechamento do item 35, que tirou a ficha 35 do
`backlog.md` dentro do PR dele.

**Bloco:** 35 (`harness-commands-de-bloco`) · **Quem decide:** João · **Gatilho:** fecha quando o
fluxo de fechamento tiver um caminho escrito, e exercido uma vez, para a ficha de um bloco fechado
sair do `backlog.md` — ou quando a invariante 10 for reescrita para o caminho que existe. Revisar em
**2026-10-31**.

A invariante 10 do `state.md` diz: *"`backlog.md` é escrito somente pelo main tree, na `main`."*
Mas o main tree não tem como escrever na `main`: o `guard-main` e o `guard-main-shell` negam
escrita com a árvore na `main`, e o `pre-push` recusa push direto nela (`CONTRIBUINDO.md`). Toda
mudança chega à `main` por PR, e PR sai de branch, que não é o main tree.

**Medido em 2026-09-27, no fechamento do item 32:** a ficha 30 segue em `backlog.md:328` da
`origin/main@229994bb`, um dia depois de o item 30 fechar e mesclar (PR #116); a ficha 32 segue em
`backlog.md:137`, com o bloco em `closed` e mesclado (PR #118). Os dois fechamentos disseram "o
main tree remove a ficha depois do merge", e nenhum dos dois tinha como. As mudanças do backlog que
entraram até aqui vieram de branch de lane (`7b14e817`, na do item 30), contra a letra da regra.

**Por que fica aberta:** o João escolheu, no fechamento do item 32, não quebrar a regra por atalho
e entregar a lacuna ao item 35, que reescreve os comandos de bloco. As saídas que se veem: uma
branch curta aberta do main tree só para o `backlog.md`, ou a lane remover a própria ficha no PR de
fechamento, com a invariante reescrita para dizer isso.

**Exceção de 2026-09-28, decidida pelo João:** a ficha 32 saiu do `backlog.md` por commit direto na
`main`, do main tree, com `LOTUS_FORCA_MAIN=1` no push — sem branch nem PR. O mesmo commit deu à
ficha 33 a linha `**Depende:** —` que o portão do `lane.sh abrir` exige. É a saída de emergência do
`CONTRIBUINDO.md`, usada uma vez e registrada aqui; não é o caminho que fecha a pendência. A ficha 30
continua no `backlog.md`.

**Desvio de 2026-10-01, decidido pelo João:** a ficha 23 e a `D-65` saíram do `backlog.md` na PR
de fechamento da própria lane, que também levou o bloco 23 a `closed`. É a segunda saída acima, sem
a invariante 10 reescrita, e o mesmo desvio do item 30 (`7b14e817`), agora por escolha registrada.
Passou pela CI e pelo `procedencia`, o que o commit direto do item 32 não passou. Não fecha a
pendência: o caminho escrito continua com o item 35.

*(P-84 e P-92, encerradas pelo item 35 em 2026-10-03. A **`P-77`** saiu no mesmo
fechamento.)*

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
