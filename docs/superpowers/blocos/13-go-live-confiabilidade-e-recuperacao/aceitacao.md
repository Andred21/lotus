# Bloco 13 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Script instalado pela §7 e SHA do merge promovido pelo botão (§5, passo 1). | `producao GET /up -> 200` | `200`, esperado `200`: OK | 2026-10-06 |
| 2 | Linha de base do `conferir-golive.sh` sem `FALHA`, com roles e `.env` corrigidos se preciso (§5, passo 2). | manual |  |  |
| 3 | Smoke ponta a ponta sobre HTTPS, de cotação até validação pública do certificado; uuid anotado no Resultado (§5, passo 3). | `producao GET /sanctum/csrf-cookie -> 204` | `204`, esperado `204`: OK | 2026-10-06 |
| 4 | Dump manual com o certificado e restore cronometrado sobre o volume real; certificado sobrevivente; RTO e etapas anotados (§5, passos 4 a 6). | `producao GET /up -> 200` | `200`, esperado `200`: OK | 2026-10-06 |
| 5 | Certificado revogado, sondas arquivadas e `conferir-golive.sh --final` todo `OK` (§5, passos 7 e 8). | manual |  |  |
| 6 | Proposta enviada à Lotus com o RTO medido e a resposta registrada (§5, passo 9). | manual |  |  |
