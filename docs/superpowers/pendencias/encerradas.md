# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

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

**Prova de que fechou, medida no gate deste bloco e não citada:** o comando documentado do §6 roda
inteiro e devolve `5 skipped, 867 passed (3095 assertions)` em 58,49s, sem estouro de memória. É a
primeira vez desde 2026-08-19 que o gate de backend não precisa do contorno.

---

## Rastro anterior, já removido

A **P-40** (o ramo "catálogo genuinamente vazio" medido em `d20bebc`, não contra HEAD) foi encerrada
em 2026-08-22, no `bd12-load-state-e-listas`, e saiu neste fechamento — o primeiro **posterior** ao
do BD-12, que é o que a linha dela pedia. O rastro durável está nos commits do BD-12 e na linha da
entrega em [`../historico/progress.md`](../historico/progress.md).

A **P-29** (corrida de unicidade entre transações subindo 500) e a **P-35** (o ADR-17 defendido em
duas profundidades) foram encerradas em 2026-08-20, no `bd14-contrato-de-entrada`, e saíram aqui, no
fechamento do `bd12-load-state-e-listas` (2026-08-22) — o primeiro **posterior** ao do BD-14, que é o
que a linha do índice pedia. A **P-36** (catraca `COR_HARDCODED` cega para `style={{ }}`) e a
**P-37** (`FormField` sem `htmlFor`) foram encerradas em 2026-08-18 e saíram no fechamento do
`bd13-listagens-e-abas`. A **P-45** (o `TestCase` lendo `FRONTEND_URL` cru) saiu no fechamento do
`arquivados-roots-restantes` (2026-08-19). O rastro durável de todas está nos commits (`8ffdefa`,
`efd5bfe`, `0672019`, `2ad35d7` e `6fd0ad8`) e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).
