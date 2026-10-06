# 13 — Revisão

## Em aberto

## Rodada 2 — `546be1f1..685ccc6d` — 2026-10-06 · Lente 1: opus · Lente 2: sonnet

Classificação: **alto risco**, como na rodada 1. A lente Codex foi despachada de novo pelo
`codex-companion` e **não rodou** (mesmo limite de uso, "try again at Nov 3rd, 2026"); a rodada
ficou só com a lente 1 do `revisor-bloco`.

A lente 1 conferiu as correções do `685ccc6d`:
- Q-1: os dois scripts comparam em segundos. Uma noite falhada sai OK e duas alertam, de acordo com
  o ADR-09, a proposta e o §9. As catracas passaram 65/65 e cercam a fronteira: 23 h/30 h e 47 h/50 h.
  A sonda `|| gritar` → `|| true` agora reprova.
- Q-2: o `SELECT` do passo 4 é igual à cláusula da `CONSULTA_SMOKE`, o dump carrega em `lotus` e a
  parada vem antes do passo 5.
- Q-4: o teto saiu da proposta.
- Contadores de `pendencias/`: batem (36 abertas, 3 encerradas).

Nenhuma lei do §5 foi ferida. A Q-3 da rodada 1 e os Menores do `rulings.md` item 9 não foram
reapresentados.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | O contêiner MySQL descartável do passo 4 e o da D3 saem com `docker rm -f`, sem `-v`. Como o `mysql:8.0` declara `VOLUME /var/lib/mysql`, o banco de produção carregado (com `certificates` e `audits`) ficaria num volume anônimo depois do passo, embora o `.sql.gz` seja apagado. O §9 tem o mesmo padrão | PLAUSIBLE | `deploy/aws/README.md:1428,1433,1459,1465` · `deploy/aws/README.md:533` | observação: a lente 1 mediu o volume órfão localmente, com a mesma imagem e as mesmas flags; a lente 2 não fecha o caso, porque o `--rm` limpa volume anônimo no autoremove e a corrida com `rm -f` depende da versão do Docker |
| Q-2 | Menor | O passo 5 do §15 para a produção de propósito (`$C stop app scheduler`, depois o botão de promoção) sem desligar e religar as ações do `lotus-prod-up`/`lotus-prod-5xx`, que o §14.7 manda fazer em "qualquer parada de propósito" | CONFIRMED | `deploy/aws/README.md:1316-1321` · `deploy/aws/README.md:1440-1444` | registrado; não bloqueia. O e-mail de ALARM na janela leva ao §14.6 por engano |
| Q-3 | Menor | A igualdade do passo 4 depende de duas cópias à mão da cláusula `SMOKE-GOLIVE` (runbook e `CONSULTA_SMOKE`), e o `describe` do §7/§15 não tem asserção sobre o passo 4. Se uma cópia mudar, ou se o passo voltar a contar no MySQL vivo, a suíte segue verde | CONFIRMED | `deploy/aws/README.md:1431-1432` · `deploy/bin/conferir-golive.sh:209` · `frontend/tests/conferir-golive.test.ts:512-536` | registrado; não bloqueia (lição 19 na margem: é runbook, não script montado em produção) |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 2 confirmados, 1 plausível, 0 refutados

## Rodada 1 — `546be1f1..296633cc` — 2026-10-06 · Lente 1: opus · Lente 2: sonnet

Classificação: **alto risco** (produção, restore de banco com certificado de peso legal, texto à
Lotus sobre perda de certificado). A lente Codex somente-leitura foi despachada pelo
`codex-companion` (o `mcp__codex__codex` não estava disponível) e **não rodou**: a conta bateu o
limite de uso ("try again at Nov 3rd, 2026"). A rodada ficou só com a lente 1 do `revisor-bloco`.

A lente 1 mediu: catraca `conferir-golive.test.ts` 51/51; as consultas reais do script, rodadas só
em leitura contra o schema migrado de dev; colunas e as oito tabelas de `archived_with_parent`
contra as migrations; e a coerência entre proposta, ADR-14 e §8.1.1 sobre perda, reatribuição de
número e revogação desfeita. Nenhuma lei do §5 ferida. Os Menores do `rulings.md` item 9 não foram
reapresentados.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | A idade do backup é truncada em dias: a linha de base do `conferir-golive.sh` só reprova com 48 h (uma noite falhada sai OK, contra o comentário "mais de 1 dia"); o `verificar-backup.sh` só alerta com 72 h, contra o "passando de 2 dias" do ADR-09; catraca sem cenário de fronteira | CONFIRMED | `deploy/bin/conferir-golive.sh:44-45,195-196` · `deploy/bin/verificar-backup.sh:66-67` · `docs/adrs.md:87` | registrado; a metade fora do diff (`verificar-backup.sh`, ADR-09) é divergência doc × código e abriu a **P-100** |
| Q-2 | Menor | O passo 4 do §15 confere `certificates ≥ 1` no MySQL vivo, não no dump como a spec §5.4 e o plano pedem ("contagem do §9"); a primeira prova de que o certificado está no dump fica para o passo 6, depois do `DROP DATABASE` — a cópia `antes-do-restore` evita a perda, mas a falha seria vista tarde | CONFIRMED | `deploy/aws/README.md:1422-1423` · `spec.md:165-166` · `deploy/aws/README.md:524-529` | registrado; não bloqueia |
| Q-3 | Menor | A alternativa D3 baixa o dump com dado real de cliente para `/tmp/golive.sql.gz` no shell do `ubuntu`, sem `umask 077`, ao contrário da disciplina do `backup-db.sh:8-14` e do §8.1.1 | PLAUSIBLE | `deploy/aws/README.md:1447` · `deploy/bin/backup-db.sh:8-14` | observação: depende do umask do `ubuntu` no host, que o repositório não exibe; o arquivo é removido na linha 1450 |
| Q-4 | Menor | A proposta justifica a decisão pelo "techo de US$ 30/mes", e a P-80 registra previsão de 35,74 USD com o teto em aberto: se o teto subir, o texto aceito pela cliente fica desatualizado | CONFIRMED | `proposta-dis02.md:15` · `pendencias/abertas.md:734-747` | registrado; cabe no passo 9 do §15, junto do `<costo estimado>`, ou na decisão da P-80 |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 3 confirmados, 1 plausível, 0 refutados

Nota de passagem: o bloco tirou a P-05 do índice sem decrementar `## Abertas (37)` do
`pendencias/README.md`; com a P-100 o contador volta a bater (37 fichas).
