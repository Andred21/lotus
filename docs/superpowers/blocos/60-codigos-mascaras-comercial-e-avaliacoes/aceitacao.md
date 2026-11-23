# Bloco 60 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Medição de formato em produção antes de migrar (RUT, telefone, e-mail duplicado e `files` de turma), rodada pelo João por SSH, com a saída colada e conferida. | manual |  |  |
| 2 | Depois do deploy, a conversão dos telefones e o backfill de `courses.code` rodaram em produção: contagem de telefones em E.164, de telefones zerados pela conversão, de telefones fora de E.164 (tem de ser zero) e de cursos sem `code` (tem de ser zero), rodada pelo João e conferida. | manual |  |  |
