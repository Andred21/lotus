# 66 — Revisão

## Em aberto

## Rodada 2 — `9447d785..df8e6cad` — 2026-11-27 · Lente 1: opus · Lente 2: sonnet

A lente Codex do Passo 4 não foi tentada de novo: a mesma conta recusou `gpt-5.5` e `gpt-5.4`
(`model_not_in_accessible_catalog`) na rodada 1, minutos antes. A lente 1 foi só o `revisor-bloco`.
Os achados novos foram numerados a partir de Q-3, porque Q-1 e Q-2 já estavam em uso na rodada 1.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Importante | (rodada 1) `windowMonths()` não terminava com `period_end=9999-12-31` e a janela não tinha teto. | CONFIRMED | `backend/app/Domains/Dashboard/Services/AnalyticsQuery.php:271-279` · `backend/app/Domains/Dashboard/Data/DashboardFilterData.php:39,87-93` | corrigido em `697723ce`: o laço compara datas e acima de 120 meses responde 422 (teto decidido pelo João) |
| Q-2 | Importante | (rodada 1) Em `en`, digitar `1,500` gravava 1,5 UF sem nada denunciar. | CONFIRMED | `frontend/src/shared/lib/uf.ts:44-52` · `frontend/src/features/commercial/hooks/useQuoteForm.ts:80,102-109` | corrigido em `df8e6cad`: o campo recusa a entrada ambígua (decisão do João) |
| Q-3 | Menor | A recusa do separador repetido só funciona na colagem. Ao digitar `1.500.000`, o campo reescreve o texto a cada tecla: `parseUfInput` já juntou o primeiro separador quando o segundo chega, e o valor gravado é `1500.000`, sem erro. O docblock do `uf.ts` e o comentário do `DataStep` prometem a recusa para qualquer entrada. O caso realista, digitar `1.500`, continua sendo recusado, porque o texto final da última tecla é `1,500`. | CONFIRMED | `frontend/src/features/commercial/components/Budget/DataStep.tsx:51-52` · `frontend/src/features/commercial/hooks/useQuoteForm.ts:106-109` · `frontend/src/shared/lib/uf.ts:37-52` | registrado, não bloqueia: só valores de sete dígitos em UF caem no caso, e isso fica fora do domínio de uma cotação de capacitação |
| Q-4 | Menor | A mensagem `quote.ufAmbiguous` não mostra como digitar um valor de três casas decimais. Para `12,345` recusado, a saída é `12,3450`, que a coluna `decimal(12,4)` aceita, mas a interface não indica isso. | CONFIRMED | `frontend/src/shared/config/locales/{es-CL,en,pt-BR}.json:659` · `frontend/src/shared/lib/uf.ts:46` | registrado, não bloqueia |
| Q-5 | Menor | O `fechamento.md` (itens 9 e 10) e o `rulings.md` (item 14) ainda tratam M-11 e M-6 como abertos, embora `697723ce` e `df8e6cad` os tenham corrigido. | CONFIRMED | `docs/superpowers/blocos/66-frontend-identidade-graficos-e-acessibilidade/fechamento.md:129-135` · `rulings.md:51-53` | registrado. São os registros de fechamento do próprio bloco, e o `/finalizar-bloco` os reescreve, então não vira pendência |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis,
0 refutados · Menor: 3 confirmados, 0 plausíveis, 0 refutados

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
