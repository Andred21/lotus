# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

## P-47 — os redatores do seed não têm a role `redator`, e o bloco que a criou só a atribui adiante

**Bloco:** hardening-acesso-ownership-e-integridade · **Gatilho:** o bloco que puder reseedar o
banco de dev (mesmo gatilho da [P-44](./abertas.md#p-44)), ou o primeiro gate `permission:` aplicado
sobre rota de redator — é quando a falta deixa de ser cosmética.

Medido no `/fechar-sprint` de 2026-08-19: dos 7 redatores do `OperationDemoSeeder`, **nenhum**
carregava a role `redator` que o `RolePermissionSeeder.php:38` define. O bloco
`identity-ativacao-acesso-redator` fechou as duas portas por onde a role passa a ser atribuída —
`CreateRedatorAction` (cadastro novo) e `SendRedatorAccessInvitationAction` (reenvio de convite, o
achado **Q-1** do review) —, mas nenhuma delas alcança linha que já existe no banco sem convite
reenviado.

**Encerrada em 2026-08-23 pelo `hardening-acesso-ownership-e-integridade`, e o remédio não foi o
que a ficha supunha.** O planejamento mediu contra o código, não contra o texto da ficha: o
**seeder já estava certo desde `e3490d84`** — quem nasce hoje nasce com a role. O que faltava era
**dado velho**, e dado velho não se conserta em seeder que ninguém roda de novo. O conserto é a
migration de backfill `2026_08_22_000003_backfill_redator_role.php` (`fa1abdf1`), com
`BackfillRedatorRoleMigrationTest` cobrindo o `up()`.

**Provado contra o banco de dev no gate de fechamento (2026-08-23):** os 7 redatores do seed —
`redator_id` 1 a 7, `user_id` 2 a 8 — carregam `roles=[redator]`, sem convite reenviado e sem
reseed. O gatilho da ficha (reseedar o dev) deixou de ser a única saída: o backfill alcança banco
já provisionado, que é exatamente o caso de produção.

**Sai quando:** primeiro fechamento **posterior** a este.

---

## P-50 — a suíte unida passou do `memory_limit` de 128M do container e o comando documentado morria no meio

**Bloco:** infra-producao-runtime-e-aws · **Gatilho:** o João decidir o `memory_limit` da imagem, ou
o primeiro bloco que tocar `docker/php/`.

O comando que o `CLAUDE.md` §6 documenta — `docker compose exec -T app php artisan test` — morria com
`Allowed memory size of 134217728 bytes exhausted` dentro de `ManualTurmaTest`, sem que teste nenhum
estivesse errado: o pico real da suíte foi de 127,00 MB (2026-08-20) para 129,00 MB, **acima** do
teto de 128M. Reproduzida em quatro fechamentos seguidos (BD-17, BD-14, BD-18 e BD-12), sempre pelo
mesmo mecanismo, e sempre contornada pelo binário direto com `-d memory_limit` elevado, porque o
`artisan test` reexecuta o PHPUnit em subprocesso que não herda a diretiva.

**ENCERRADA em 2026-08-22, no `infra-producao-runtime-e-aws`.** O gatilho venceu pelas duas metades
ao mesmo tempo: o bloco tocou `docker/php/` **e** o João decidiu o número. O impasse que a ficha
nomeava — `conf.d` vale para os dois SAPIs, então subir o CLI subiria o teto por processo do PHP-FPM
de produção — foi resolvido separando por SAPI, não escolhendo um lado:

| SAPI | Onde | Valor | Base da medição |
|---|---|---|---|
| CLI | `docker/php/memory-cli.ini` (nas duas imagens) | `320M` | menor múltiplo de 64M acima do **dobro** do pico medido de 129,00 MB |
| FPM | `php_admin_value[memory_limit]` em `docker/php/www.conf` | `256M` | pico de request medido na execução, com `pm.max_children = 5` fixado para a conta de sizing fechar |

**Quarta reprodução, medida na `main` em paralelo a este bloco** (fechamento do
`feedbacks-resolver-escopo`, 2026-08-22, suíte já em 877 testes): mesmo `Allowed memory size of
134217728 bytes exhausted … PhpEngine.php on line 62`, e `php -d memory_limit=1G vendor/bin/phpunit`
devolvendo **877 passed / 5 skipped, 3131 asserções** com **pico de 129 MB**. Terceira medição
consecutiva com o pico encostando ou passando o teto — 129, 127 e 129 MB. Ela entrou na ficha depois
que este bloco já a tinha fechado, e fica registrada porque **mede a mesma suíte maior** que o valor
novo precisa aguentar: 877 testes, não os 867 do gate desta branch.

**Prova de que fechou, medida no gate deste bloco e não citada:** o comando documentado do §6 roda
inteiro e devolve `5 skipped, 867 passed (3095 assertions)` em 58,49s, sem estouro de memória. É a
primeira vez desde 2026-08-19 que o gate de backend não precisa do contorno.

**A `lane-a` remendou o mesmo sintoma em paralelo, e o remendo foi DESFEITO no merge de
2026-08-23.** O bloco `hardening-acesso-ownership-e-integridade` topou com o fatal ao acrescentar
cinco testes e declarou `<ini name="memory_limit" value="512M"/>` em `backend/phpunit.xml`
(`0ac7358d`), sem saber que esta ficha já estava paga na outra lane. Os dois números conviveriam —
mas o do `phpunit.xml` é **maior**, então ele venceria, e o teto de 320M da imagem deixaria de ser o
limite efetivo da suíte: a próxima vez que a suíte passasse de 320M ninguém veria, e a medição que
fecha esta ficha pararia de valer. O `<ini>` saiu no merge e o teto voltou a ser um só, o da imagem.
**Reprovado o argumento que o justificava** ("valer o mesmo em qualquer máquina, sem depender da
imagem"): o backend deste projeto roda **sempre** no container (`CLAUDE.md` §6, o host WSL não tem
mbstring), então a imagem *é* a garantia de igualdade entre máquinas. Reprovado contra o valor
decidido: `docker compose exec -T app php artisan test` fecha **906 passed / 5 skipped (3227
asserções)** com `memory_limit = 320M`, sem estouro.

---

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
