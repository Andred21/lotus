# Bloco 45 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Secret do token do release-please criado no `Andred21/lotus`, e a primeira PR de release aberta pelo workflow com os cinco gates rodando. | manual |  |  |
| 2 | Backfill escrito: 13 tags e Releases `v1.0.0`…`v1.9.1` nos dois repositórios, conferidas com `gh release list`. | manual |  |  |
| 3 | Primeira release pelo fluxo novo promovida: a Release aparece no Gatika-CL criada pelo `deploy.yml`, e a sidebar em produção mostra a mesma versão. A prova HTTP só mede que a produção responde depois da promoção; a versão é conferida à mão, porque só é exposta a usuário autenticado (§6). | `producao GET /up -> 200` |  |  |
