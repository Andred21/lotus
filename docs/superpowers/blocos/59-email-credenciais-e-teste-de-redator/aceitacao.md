# Bloco 59 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Production access do SES aprovado em `sa-east-1`. | manual |  |  |
| 2 | Sonda entregue a um endereço `@prismusai.com` e a um Gmail não verificado, com SPF, DKIM e DMARC `pass`. | manual |  |  |
| 3 | Checklist do redator percorrido em produção com as contas 252 e 253. | manual |  |  |
| 4 | Senhas de teste limpas nas contas 252 e 253, conferidas por leitura (impressão digital e sessões). | manual |  |  |
| 5 | Aviso ao `lotus-site` sobre o fim do teto do sandbox entregue. | manual |  |  |
