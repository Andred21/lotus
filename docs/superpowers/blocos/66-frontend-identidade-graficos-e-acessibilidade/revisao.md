# 66 — Revisão

## Em aberto

- **Q-1** · Importante · espera aprovação do João: corrigir agora (comparar datas no `windowMonths`
  e pôr teto de janela com 422 no `DashboardFilterData`, com testes de `period_end=9999-12-31` e
  acima do teto) ou adiar como ficha proposta.
- **Q-2** · Importante · espera aprovação do João: corrigir agora (amarrar o campo de UF ao locale
  da exibição, ou recusar `\d{1,3}[.,]\d{3}` sem outro separador em qualquer locale, com casos `en`
  em `uf.test.ts` e `useQuoteForm.test.tsx`) ou adiar como ficha proposta.

## Rodada 1 — `9447d785..b0f6214e` — 2026-11-27 · Lente 1: opus · Lente 2: sonnet

Classificação: **alto risco**. O `AnalyticsQuery` agrega a série monetária `uf_aprovada`. A lente
Codex do Passo 4 **não rodou**: a conta ChatGPT recusou `gpt-5.5`, o modelo do `~/.codex/config.toml`,
e depois `gpt-5.4`, os dois com `model_not_in_accessible_catalog`. Por isso a lente 1 é só o
`revisor-bloco`.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Importante | `windowMonths()` compara mês como texto: depois de `9999-12` o cursor vira `10000-01`, que é `<= "9999-12"` em string, e o laço não termina. A validação (`nullable\|date`) aceita `period_end=9999-12-31`, e o `withValidator` só barra janela invertida. A requisição vira 500 (esgota memória ou tempo) em vez de 422, contra o ADR-03. É mais grave que o item 10 (M-6) do `fechamento.md`, que tratava o caso como "~120 mil meses". | CONFIRMED | `backend/app/Domains/Dashboard/Services/AnalyticsQuery.php:273-275` · `backend/app/Domains/Dashboard/Data/DashboardFilterData.php:41-42` | espera o João |
| Q-2 | Importante | Em `en`, o `formatUf` mostra 1500 como `1,500 UF`. O campo do `DataStep` segue com vírgula decimal fixa e o `parseUfInput` lê `1,500` como 1,5 UF. O eco do campo, `1,500`, é igual ao que a lista mostra para 1500, então o valor gravado mil vezes menor não aparece em lugar nenhum. Isso contraria o contrato do próprio `uf.ts` ("valor silenciosamente errado, não"). O item 9 (M-11) do `fechamento.md` cobre só o es-CL, onde o eco denuncia o erro. | CONFIRMED | `frontend/src/shared/lib/uf.ts:11-13,40-47` · `frontend/src/features/commercial/components/Budget/DataStep.tsx:50-51` · `frontend/src/shared/config/i18n.ts:15` | espera o João |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 2 confirmados, 0 plausíveis,
0 refutados · Menor: 0 confirmados, 0 plausíveis, 0 refutados
