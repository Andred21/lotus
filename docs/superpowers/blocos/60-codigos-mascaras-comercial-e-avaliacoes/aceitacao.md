# Bloco 60 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Medição de formato em produção antes de migrar (RUT, telefone, e-mail duplicado e `files` de turma), rodada pelo João por SSH, com a saída colada e conferida. | manual | Rodada por SSH em 2026-11-22, antes do deploy de 2026-11-25. RUT 100% formatado; telefones em `users`: 95 no total, 73 vazios, 19 só dígitos, 3 com `+` e separador; `client_contacts`: 2, ambos vazios; e-mail com 0 duplicados e 0 fora da forma normalizada; nenhum `files` de turma. Detalhe em `medicao-producao.md`. | 2026-11-22 |
| 2 | Depois do deploy, a conversão dos telefones e o backfill de `courses.code` rodaram em produção: contagem de telefones em E.164, de telefones zerados pela conversão, de telefones fora de E.164 (tem de ser zero) e de cursos sem `code` (tem de ser zero), rodada pelo João e conferida. | manual | Deploy do espelho `c98240be` (promoção 2026-11-25 07:05Z; migrations `2026_11_22_000001`–`000004` DONE; backup `lotus-2026-11-25T07-06-02-pre-deploy-c98240bedf7f.sql.gz`). `conferir-pos-deploy.php` rodado pelo João: `FONE_E164 users 7`, `FONE_FORA users 0`, `FONE_E164 client_contacts 0`, `FONE_FORA client_contacts 0`, `FONE_ZERADOS users 16`, `FONE_ZERADOS client_contacts 0`, `CURSO_SEM_CODE 0`. Zerados batem com o log `telefones.e164` do deploy (16, ids 255–270; valor antigo no `audits`); E.164 7 = 6 convertidos + 1 gravado depois do deploy. | 2026-11-25 |
