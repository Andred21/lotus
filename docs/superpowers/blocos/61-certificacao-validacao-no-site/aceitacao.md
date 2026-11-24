# Bloco 61 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Definir `CORS_PUBLIC_ORIGINS=https://lotusotec.cl` no `.env` de produção em `/opt/lotus`, **antes** do deploy. A chave entra no `deploy/aws/env.prod.example`, e a checagem de alinhamento (`.github/scripts/conferir-alinhamento.sh`) recusa o deploy de um SHA cujo molde traz chave ausente no host. O código antigo ignora a chave, então defini-la antes não muda nada no ar. | manual |  |  |
| 2 | Deploy da API do bloco em produção (merge na `main`, espelho para o corporativo, botão de deploy). | `producao GET /api/publico/certificados/consulta -> 405` | `404`, esperado `405`: FALHOU | 2026-11-24 |
