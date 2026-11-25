# 62 — Revisão

## Em aberto

## Rodada 2 — `aba2b75e..491b1be2` — 2026-11-25 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5) · Lente 2: sonnet

Os cinco achados da rodada 1 foram corrigidos com aprovação do João: Q-2 em `2c710242`
(`useWindowedQuery` em `shared/hooks` e a regra em `.claude/rules/frontend-fsliced.md`); Q-1, Q-3, Q-4
e Q-5 em `491b1be2` (`CertificateExport`, `AssinaturasDoLote`, teste do ZIP com bytes por código, nome
via `Quote::code`). A lente 1 confirmou cada correção e não achou regressão. A suíte do backend deu
2102 passed e 7 skipped; o frontend deu 2176 testes passando, com lint e build limpos.

Codex: uma tentativa só, `model_not_found` para `gpt-5.5`, sem nova tentativa.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | `preg_replace` da fórmula `HYPERLINK` não checa `null`. Com falha do PCRE, `addFromString` recebe `''` (o arquivo não declara `strict_types`) e o xlsx sai com a aba vazia, entregue com 200. | PLAUSIBLE | `backend/app/Domains/Certification/Services/CertificateSpreadsheet.php:111-117` | observação. Depende de o PCRE falhar com a entrada real |
| Q-2 | Menor | A query de opções de cotação (`quotes()`) é montada no controller, com subquery `DB::table('certificates')` por fora do model. | CONFIRMED | `backend/app/Domains/Certification/Http/Controllers/CertificateController.php:87-95` | correção aprovada pelo João, a aplicar |
| Q-3 | Menor | `useHistorial` repassa só `quotes.data ?? []`. Com falha do GET `/api/certificates/quotes`, o filtro mostra "sin opciones" como se não houvesse cotação certificada. | CONFIRMED | `frontend/src/features/certification/hooks/useHistorial.ts:38,107`; `frontend/src/features/certification/components/Historial/HistorialQuoteFilter.tsx:37,43` | correção aprovada pelo João, a aplicar |
| Q-4 | Menor | Os cards da Emisión somem na troca de período: o ramo `s.loading ? null` usa o `isLoading` cru da query, não o piso do `useWindowedQuery`. | CONFIRMED | `frontend/src/features/certification/components/Emission/EmissionPanel.tsx:38`; `frontend/src/features/certification/hooks/useEmissionPanelState.ts:142` | correção aprovada pelo João, a aplicar |
| Q-5 | Menor | Com `quote_id`, o nome do arquivo é sempre o da cotação inteira, mesmo quando `q` ou `display_status` recortam o conjunto. A spec §5.3 a §5.5 manda assim, mas isso encosta no anti-objetivo da §3. | PLAUSIBLE | `backend/app/Domains/Certification/Services/CertificateExportScope.php:54-64`; `docs/superpowers/blocos/62-certificacao-paineis-lote-e-planilha/spec.md:64,172-173,190` | observação. Mudar o nome é decisão de spec |

Placar: Crítico: 0 · Importante: 0 · Menor: 3 confirmados, 2 plausíveis, 0 refutados

## Rodada 1 — `aba2b75e..3186e0d8` — 2026-11-25 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5/gpt-5.4) · Lente 2: sonnet

A lente Codex de alto risco não rodou: `codex-companion task --fresh` devolveu
`The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account.`, e a nova tentativa
com `--model gpt-5.4` falhou igual. A rodada seguiu só com o `revisor-bloco`.

O `revisor-bloco` rodou `pnpm lint` e `tsc -b --noEmit` limpos; a suíte do backend não rodou nesta
rodada (containers da lane parados).

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Crítico | Regras da exportação no controller: recusa de vazio e de teto repetida em `planilha()` e `zip()`; só no `zip()` ficam a exigência de `quote_id`, a recusa de snapshot não apresentável, o lock global, a tradução de `PdfRenderException` em 503 e o ciclo do temporário. Um segundo ponto de entrada não herdaria as recusas. Fere ADR-02 e `backend-ddd.md` ("controller fino"); o gabarito mapeia para 🔴 automático, embora seja caminho de leitura. | CONFIRMED | `backend/app/Domains/Certification/Http/Controllers/CertificateExportController.php:61-67,100-139,158-171,189-198` | em aberto: decisão do João |
| Q-2 | Importante | `useEmissionPanelState` copia de `useDashboard` a política de piso (`ultimo`/`setUltimo`), de falha antiga e `podeRepetir`. As cópias já divergem: a Emisión junta detalhe e dica numa string, o Dashboard devolve `staleError` e `staleHint` separados, e `podeRepetir` recebe `number \| undefined` contra `ProblemDetails \| null`. | CONFIRMED | `frontend/src/features/certification/hooks/useEmissionPanelState.ts:53-55,88-90,121-123`; `frontend/src/app/pages/Dashboard/useDashboard.ts:91-94,159-160,183-186` | em aberto: decisão do João |
| Q-3 | Menor | `renderMany` monta o HTML em série e cada `html()` relê `CertificateSettings::atual()`, a assinatura da gerente no disco e a firma do relator (query + GET). A medição que fixou `TETO = 70` usou certificados sem `redator_id` e MinIO local, então o caminho da firma e a latência do S3 de produção ficaram fora. | CONFIRMED | `backend/app/Domains/Certification/Services/CertificatePdfService.php:60-61,128`; `backend/app/Domains/Certification/Services/CertificateSignatures.php:26,32,37,49,63`; `docs/superpowers/blocos/62-certificacao-paineis-lote-e-planilha/medir-lote.php:35` | registrado; não bloqueia. O item 1 do `aceitacao.md` mede em produção |
| Q-4 | Menor | `test_cada_entrada_leva_o_pdf_do_proprio_certificado` emite um só certificado e confere os bytes constantes do `FakeHtmlToPdf`; uma troca de chave entre `renderMany`, `CertificateZip::build` e o arquivo passaria verde. | CONFIRMED | `backend/tests/Feature/Certification/CertificateExportZipTest.php:118-126`; `backend/tests/Support/Pdf/FakeHtmlToPdf.php:26` | registrado; não bloqueia |
| Q-5 | Menor | O nome do arquivo remonta o código da cotação a partir de `budget_id` e `seq_in_budget`, fora de `Quote::code` (fonte única, ADR-17). | CONFIRMED | `backend/app/Domains/Certification/Services/CertificateExportScope.php:63`; `backend/app/Domains/Commercial/Models/Quote.php:91-94` | registrado; não bloqueia |

Placar: Crítico: 1 confirmado, 0 plausíveis, 0 refutados · Importante: 1 confirmado, 0 plausíveis,
0 refutados · Menor: 3 confirmados, 0 plausíveis, 0 refutados

### Padrão reincidente

Q-2 é a segunda vez que a política de carga é copiada à mão entre hooks (a primeira está registrada
em `.claude/rules/frontend-fsliced.md`, review de 2026-08-14). A rule cobre o estado de carga de
lista (`useLoadState`, `ListSource`), mas não a query por janela com piso, que agora tem dois
consumidores. Texto proposto para a rule, logo depois do parágrafo de `ListSource`:

> Query por janela com piso (o `PeriodFilter` que mantém o último payload enquanto o novo período
> carrega) também não se deriva à mão: o piso, a falha antiga (`staleError`/`staleHint`) e o
> `podeRepetir` moram num hook de `shared/hooks`. O Dashboard e a Emisión os copiaram e as cópias
> divergiram na forma da mensagem e na assinatura do `podeRepetir` (Q-2 do bloco 62).

A proposta só entra na rule se o João aprovar a correção de Q-2 ou pedir a regra à parte.
