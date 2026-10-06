# Bloco 34 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Recursos base: a inline `lotus-observabilidade`, os log groups de `prod` com 30 dias e os de `lab` com 1 dia, e os três metric filters de `prod` validados por `test-metric-filter` (§5, passo 2). | manual | `base prod` e `base lab` com rc 0. Inline com as 4 ações e a condição de namespace. Retenção: prod 30/30, lab 1/1. Filtros Up, CertDias e Http5xx (regex) passaram no `test-metric-filter`. Ver audit.md, Task 6. | 2026-10-05 |
| 2 | Lab nascido do user-data: agente publicando as métricas e os logs de dois contêineres, reexecução sem mudança e sem reiniciar o Docker, RSS medida e instância terminada (§5, passo 3). | manual | Lab `t4g.small` nasceu do user-data: agente e timer ativos, 0 AccessDenied, 3 métricas `Ambiente=lab`, 2 streams de contêiner. Reexecução não mudou nada e o Docker não reiniciou. RSS de 112.8 MiB, acima do portão D14, aceita pelo João. Instância terminada e grupos apagados. Ver audit.md, Task 6. | 2026-10-05 |
| 3 | Produção instalada: reinstalação pelo §7 com a sonda e o botão passando, `(D12)` o SHA do merge promovido, reparo sem reiniciar contêiner, agente e timer ativos, e alarmes criados com assinatura confirmada (§5, passos 4 a 7). | `producao GET /up -> 200` | `200`, esperado `200`: OK | 2026-10-05 |
| 4 | `lotus-prod-up` e `lotus-prod-5xx` vão a `ALARM` com o `app` parado e voltam a `OK`, com os e-mails das duas transições (§5, passo 8). | `producao GET /up -> 200` | `200`, esperado `200`: OK | 2026-10-05 |
| 5 | `lotus-prod-disco` vai a `ALARM` a 82% e volta a `OK`, com os e-mails (§5, passo 8). | manual | `fallocate` levou `/` a 82% (`df` mostrou 83%). `lotus-prod-disco` foi a `ALARM` às 00:17:48 UTC (2 de 2 em 82.00, > 80) e voltou a `OK` às 00:24:48 UTC (69.65, depois do `rm`). Os e-mails de `ALARM` e de `OK` chegaram. Ver audit.md, Fase B, passo 8. | 2026-10-05 |
| 6 | `lotus-prod-certificado` vai a `ALARM` com o certificado de teste e volta a `OK`, com os e-mails (§5, passo 8). | manual | Certificado de teste de 1 dia (`cert_dias` 0) na sonda. `lotus-prod-certificado` foi a `ALARM` às 00:26:56 UTC (0.0 < 21) e voltou a `OK` às 00:31:56 UTC (81.0, na leitura seguinte, com o certificado real). Os e-mails de `ALARM` e de `OK` chegaram. Ver audit.md, Fase B, passo 8. | 2026-10-05 |
| 7 | Custo do CloudWatch desta conta medido no Cost Explorer ~3 dias depois da instalação e registrado na P-80 (§5, passo 9). | manual |  |  |
