# Bloco 34 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Recursos base: a inline `lotus-observabilidade`, os log groups de `prod` com 30 dias e os de `lab` com 1 dia, e os três metric filters de `prod` validados por `test-metric-filter` (§5, passo 2). | manual |  |  |
| 2 | Lab nascido do user-data: agente publicando as métricas e os logs de dois contêineres, reexecução sem mudança e sem reiniciar o Docker, RSS medida e instância terminada (§5, passo 3). | manual |  |  |
| 3 | Produção instalada: reinstalação pelo §7 com a sonda e o botão passando, `(D12)` o SHA do merge promovido, reparo sem reiniciar contêiner, agente e timer ativos, e alarmes criados com assinatura confirmada (§5, passos 4 a 7). | `producao GET /up -> 200` |  |  |
| 4 | `lotus-prod-up` e `lotus-prod-5xx` vão a `ALARM` com o `app` parado e voltam a `OK`, com os e-mails das duas transições (§5, passo 8). | `producao GET /up -> 200` |  |  |
| 5 | `lotus-prod-disco` vai a `ALARM` a 82% e volta a `OK`, com os e-mails (§5, passo 8). | manual |  |  |
| 6 | `lotus-prod-certificado` vai a `ALARM` com o certificado de teste e volta a `OK`, com os e-mails (§5, passo 8). | manual |  |  |
| 7 | Custo do CloudWatch desta conta medido no Cost Explorer ~3 dias depois da instalação e registrado na P-80 (§5, passo 9). | manual |  |  |
