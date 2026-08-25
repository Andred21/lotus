# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

## P-15 — certificados não aparecem no módulo de alunos

**Bloco:** certificacao-historico-do-aluno · **Gatilho:** fechava quando o João decidisse expor (ou
não) certificados na listagem e no detalhe do aluno, ou se a Lotus pedisse.

O protótipo mostra coluna `CERTIFICADOS` na listagem e card `CERTIFICADOS EMITIDOS` no detalhe;
implementado não tinha nenhum dos dois.

Bloco alunos (2026-07-27, spec D10): `app/Domains/Certification/` era pasta vazia e não existia
migration de `certificates`. Card vazio foi rejeitado explicitamente: afirmar "sem certificados"
quando a verdade é "o módulo não existe" é falha silenciosa, e aqui o dado tem peso legal.
**Proveniência de D10 ratificada pelo João no doc-sync 2026-07-30.**

O gatilho venceu duas vezes sem produzir decisão: em **2026-08-07** o Bloco 7 entregou `certificates`
e a vertical até a API pública; em **2026-08-08** o `certificacao-frontend` entregou o módulo próprio
`/certificados` (Emisión + Historial) e **não tocou o módulo de alunos**.

**Encerrada em 2026-08-24, no `certificacao-historico-do-aluno`: a decisão que ela esperava foi
tomada.** Certificados passam a aparecer no **detalhe** do aluno, como coluna da tabela de turmas —
código, estado derivado no servidor, data quando o curso tem prazo, marca de reemissão com a
contagem de anteriores e o PDF pela própria célula.

**O outro ramo fica fora por escrito, não por omissão:** a coluna `CERTIFICADOS` na **listagem** de
alunos está declarada fora de escopo na §9 da spec do bloco. Isto é o que impede a pendência de
reabrir por silêncio — o protótipo pedia os dois sítios, um foi construído e o outro foi recusado
com registro.

---

## P-03 — compose por worktree não existe

**ENCERRADA em 2026-08-24, no bloco `compose-por-worktree` (`lane-b`).** O mecanismo existe: as
portas host do `docker-compose.yml` vêm de `LOTUS_DEV_*` com default igual à porta histórica, o
`.env` da raiz (gitignored, molde em `.env.example`) escolhe o offset da árvore, o serviço `app`
recebe injetadas as chaves que carregam porta (`APP_URL`, `FRONTEND_URL`,
`SANCTUM_STATEFUL_DOMAINS`, `SESSION_COOKIE`, `AWS_ENDPOINT_PUBLIC`, `AWS_URL`) e o Vite deriva
porta e `VITE_API_URL` do mesmo offset. Não é mais receita manual: quem clona sem `.env` sobe
idêntico a antes, e quem quer segunda árvore copia o molde e soma o offset.

**Prova medida** (`../audits/2026-08-24-compose-por-worktree-dod.md`, re-executada no fechamento):
main tree e `../lotus-infra` no ar ao mesmo tempo (`/up` 200 em `:8080` e `:8081`), volumes
`lotus_lotus-db` e `lotus-infra_lotus-db` lado a lado, login Sanctum ponta a ponta em `:8081`
(csrf 204, login 200, `/api/me` 200), objeto no MinIO da árvore existindo em `:9002` e ausente no
do main tree, e as duas sessões coexistindo no mesmo jar de cookies — `lotus_session_8081` ao lado
de `laravel-session` — que é o cenário das duas abas abertas.

**Sai do rastro** no primeiro `/fechar-sprint` posterior a este.

O que a ficha registrava enquanto aberta segue abaixo, verbatim, como diagnóstico histórico:

<details>
<summary>Diagnóstico original</summary>

**Gatilho VENCIDO em 2026-08-24 — agrupada no bloco `compose-por-worktree` (`lane-b`).** O João
decidiu paralelizar a fila e a condição observável se cumpriu: restam quatro blocos de backend
(itens 4, 5, 6 e 7 do `backlog.md`) e o compose monta o main tree com portas fixas, então só uma
lane de backend cabe. O gatilho original era *"fecha na primeira sprint que precisar de **dois
blocos de backend em paralelo**"* (condição verificável em `state.md`: mais de um
`active_work_item` de backend), ou **2026-10-31**, o que viesse primeiro.

Bloco de backend não pode usar `using-git-worktrees` — o stack monta o main tree e o teste rodaria
contra o código errado. **6a (Sprint 3) rodou em main-tree sem atrito — abordagem confirmada.** O
gatilho anterior ("se a concorrência passar a doer") era não verificável e escapou do grep de prova
do doc-sync 2026-07-30 por diferença de redação — trocado por condição observável na revisão do
mesmo dia (Q-6).

**Custo medido fora do backend em 2026-08-13** (BD-4, `catraca-max-lines-e-moldura`): a worktree não
pôde subir stack própria, dependeu do main tree — que naquele momento servia branch alheia com
`/api/students` em 500 — e o bloco **de frontend** perdeu dois passos de gate (e2e do 422 e checagem
visual), pagos só em parte no `/fechar-sprint`.

**Contraprova medida em 2026-08-13** (BD-5, `usecrudform-mais-fundo`, mesmo arranjo de duas execuções
em paralelo): o e2e do S3 rodou inteiro contra o main tree, porque `git diff main...HEAD -- backend/`
naquele tree estava **vazio no momento da prova** — o custo da P-03 não é constante, é contingente ao
que a branch alheia toca, e a prova só é válida com essa conferência feita na hora. O que mudou é que
a falta já cobra de quem a P-03 dizia não afetar.

**Primeiro bloco de BACKEND rodado em worktree linkada — 2026-08-19, `identity-ativacao-acesso-redator`,
por decisão explícita do João declarada na abertura.** O arranjo que segurou a execução, os dois gates
de prova e este fechamento foi **override efêmero de portas fora do repositório** (nginx 8081, MySQL
3308, MinIO 9002/9003, Mailpit 8025, Vite 5174 no gate da emenda), com o compose do worktree subindo
projeto próprio (`fix-frontend`) e, portanto, **volume de banco próprio** — a disputa que a ficha
previa (um MySQL só para as duas árvores) não chegou a acontecer. No `/fechar-sprint` a stack do main
tree estava **desligada**, então a prova e2e correu nas portas padrão (8080/3307/8025) sem override
nenhum. **Não fecha:** compose por worktree continua não existindo, e o que existe é receita manual
que depende de quem executa lembrar — a decisão de construí-lo é do João. O gatilho formal
(dois blocos de **backend** em paralelo) segue sem vencer: houve um só.

</details>

**Sai quando:** primeiro fechamento **posterior** a este.

---

**Saíram no fechamento do `frontend-revisao-ui-por-modulo` (2026-08-24), o primeiro posterior aos
dos blocos que as encerraram:** a **P-47** (os 7 redatores do seed sem a role `redator`, fechada em
2026-08-23 pela migration de backfill `2026_08_22_000003_backfill_redator_role` e **remedida aqui**
contra o MySQL de dev: os 7 do seed e os 2 usuários de gate e2e carregam a role) e a **P-50** (a
suíte unida acima do `memory_limit` de 128M, fechada em 2026-08-22 e também remedida aqui — o
`docker compose exec -T app php artisan test` do `CLAUDE.md` §6 terminou, 906 passed / 5 skipped).

**A P-41 saiu neste fechamento (`tabelas-coluna-de-acoes-e-largura`, 2026-08-24), o primeiro
posterior ao do bloco que a encerrou** — e foi **remedida antes de sair**, não removida na fé: o
`min-w-0` do bloco de texto está em `frontend/src/shared/ui/IdentityCell/IdentityCell.tsx:74`. A
metade não paga do gatilho continua declarada onde ela vive: `IdentityCell.test.tsx` conta
`span.truncate` e não mede `scrollWidth > clientWidth` — trabalho do `frontend-hardening-final`.

## Rastro anterior, já removido

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
