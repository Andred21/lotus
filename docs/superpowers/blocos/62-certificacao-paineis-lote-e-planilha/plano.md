# Bloco 62 — Painéis, lote e planilha de certificados — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o painel de emissão mostra as turmas pendentes por período, o Historial mostra e filtra a
cotação, e o conjunto filtrado do Historial sai em planilha (formato do e-mail da Lotus) e, por turma,
em ZIP de PDFs renderizados em paralelo limitado.

**Architecture:** Backend primeiro, um DTO por vez (cada um regenera `generated.ts`). A exportação mora
num controller próprio (`CertificateExportController`) sobre um escopo único
(`CertificateExportScope`), o mesmo para resumo, planilha e ZIP. O paralelismo fica no transporte
(`HtmlToPdf::renderMany`), e o documento continua montado por `CertificatePdfService`, num caminho só.
O frontend consome os tipos regenerados nas três últimas tasks de código.

**Tech Stack:** Laravel 13 (PHP 8.3), spatie/laravel-data + typescript-transformer, openspout 5
(xlsx), `ZipArchive`, Gotenberg 8.36 via `Http`, React 19 + TanStack Query, `shared/ui`
(`PeriodFilter`, `RecordCode`, `AppDropdown`), Vitest.

**Spec:** [`spec.md`](./spec.md)

## Global Constraints

- Exportação = listagem com os mesmos `q`, `display_status`, `quote_id`, todas as páginas, **sem
  `status = revocado`**. N do aviso sai do servidor, da mesma query (spec §5.3).
- ZIP exige `quote_id` → senão 422 em `errors.quote_id`. Tudo ou nada; uma nova tentativa por PDF que
  falhar; RFC 7807 nomeando o(s) `codigo` (spec §5.5).
- Planilha: colunas `Código`, `Fecha Curso`, `RUT`, `Nombre Completo`, `Curso`, `Link Descarga`, nesta
  ordem; `Fecha Curso` = `snapshot.turma.end_date` em `dd/mm/yy`; link com texto `ABRIR` para
  `config('app.url').'/api/publico/certificados/{uuid}/pdf'`; linhas por `codigo` asc (spec §5.4).
- Nome do PDF no ZIP: `certificado-<codigo>.pdf`. Nome dos arquivos: `certificados-scap-<budget>-r<seq>.zip|.xlsx`;
  planilha sem filtro de cotação: `certificados-<Y-m-d>.xlsx`.
- Painel: `period_start`/`period_end` (`Y-m-d`). Início ausente = hoje (Santiago) − `JANELA_MESES`;
  fim ausente = sem limite superior; janela resolvida invertida → 422 em `errors.period_end`.
- Rotas novas registradas **antes** de `certificates/{certificate}`; middleware
  `permission:certification.certificate.view` (o mesmo de `index`/`pdf`).
- O limitador público do PDF **não muda** (10/min, decisão 7).
- PDF nunca persistido (ADR-12); arquivo temporário do ZIP apagado depois do envio.
- `generated.ts` só por `php artisan typescript:transform` (lei 3). Feature não importa feature nem
  PrimeReact (lei 6).
- Textos novos nas três línguas (`frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`,
  `backend/lang/{es_CL,pt_BR,en}/certification.php`), no vocabulário já usado em `certificate.*`
  (conferir o termo de "cotização" já em uso antes de criar chave).

## Review Focus

1. **Filtro de cotação + busca + estado combinados:** o N do aviso, as linhas da planilha e os PDFs do
   ZIP são o mesmo conjunto — teste em Task 5 e Task 6 com os três filtros ao mesmo tempo.
2. **Turma com todos revogados ou filtro `display_status=revocado`:** N = 0, planilha e ZIP recusam
   com 422 (não arquivo vazio) — teste em Task 5.
3. **Aluno estrangeiro sem RUT / snapshot com nome vazio:** a planilha sai com célula vazia, não 500;
   o ZIP falha nomeando o código — testes em Task 5 e Task 6.
4. **Reemitir a partir do Historial depois da troca do parâmetro do painel:** a janela "desde o
   `end_date` do certificado" continua achando a turma — teste em Task 7.
5. **Turma concluída hoje e turma fora do período:** borda inclusiva dos dois lados — teste em Task 1.

---

### Task 1: Painel de emissão por período, com o código da cotação

**Files:**
- Modify: `backend/app/Domains/Certification/Data/EmissionPanelQueryData.php`
- Modify: `backend/app/Domains/Certification/Services/EmissionPanelQuery.php`
- Modify: `backend/app/Domains/Certification/Http/Controllers/CertificateController.php` (só `emissionPanel`)
- Modify: `backend/app/Domains/Certification/Data/EmissionPanelTurmaData.php`
- Modify: `backend/lang/{es_CL,pt_BR,en}/certification.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado)
- Modify: `frontend/src/features/certification/api/certificatesApi.ts` (só `useEmissionPanel`)
- Modify: `frontend/src/features/certification/hooks/useEmissionPanelState.ts`, `frontend/src/features/certification/hooks/useHistorial.ts` (só a chamada a `useEmissionPanel`)
- Modify: fixtures tipadas por `EmissionPanelTurmaData`: `frontend/src/features/certification/hooks/useBatchIssue.test.tsx`, `frontend/src/features/certification/components/Emission/EmissionPanel.test.tsx`
- Test: `backend/tests/Feature/Certification/EmissionPanelWindowTest.php`, `frontend/src/features/certification/components/Historial/HistorialTableRowActions.test.tsx` (Reemitir)

**Interfaces:**
- Consumes: `Quote::getCodeAttribute()` (`$quote->code`, `Scap {budget_id} - R{seq}`).
- Produces:
  - `EmissionPanelQueryData { ?string $period_start; ?string $period_end; inicio(): CarbonImmutable; fim(): ?CarbonImmutable }`
  - `EmissionPanelQuery::get(CarbonImmutable $inicio, ?CarbonImmutable $fim): array<EmissionPanelTurmaData>`
  - `EmissionPanelTurmaData::$quote_code: string`
  - Front: `useEmissionPanel(enabled: boolean, period?: { period_start?: string; period_end?: string })`

- [ ] **Step 1: Reescrever `EmissionPanelWindowTest` para o contrato novo (falha)**

Os testes de `concluidas_desde` viram:
- `test_sem_parametro_aplica_os_12_meses_de_santiago` — turma com `end_date` = hoje − 12 meses entra; − 12 meses − 1 dia não.
- `test_period_start_e_period_end_sao_inclusivos` — turmas em `start`, `end`, `start − 1`, `end + 1`: só as duas primeiras.
- `test_so_period_start_nao_tem_limite_superior` — turma concluída hoje entra com `period_start` de 2 anos atrás.
- `test_janela_invertida_e_422_em_period_end` — `assertJsonValidationErrors(['period_end'])` com a mensagem de `certification.emission_panel.inverted_period`.
- `test_so_period_end_anterior_ao_inicio_default_e_422` — `period_end` de 2 anos atrás sem `period_start` (a janela resolvida inverte).
- `test_turma_traz_o_codigo_da_cotacao` — `quote_code === "Scap {budget_id} - R{seq}"`.
- `test_concluidas_desde_nao_e_mais_aceito` — o parâmetro antigo é ignorado (resposta = default).

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=EmissionPanelWindowTest`
Expected: FAIL (parâmetros desconhecidos, `quote_code` ausente).

- [ ] **Step 3: Implementar**

`EmissionPanelQueryData`: `rules()` com `period_start`/`period_end` `['sometimes','nullable','date_format:Y-m-d']`; `withValidator` comparando a janela **resolvida** (`inicio()` vs `fim()`), no molde de `DashboardFilterData::withValidator`. `inicio()`: `period_start` em `CertificateDisplayStatus::TIMEZONE` `startOfDay`, senão `hoje()->subMonths(EmissionPanelQuery::JANELA_MESES)`. `fim()`: `period_end` `startOfDay` ou `null`.
`EmissionPanelQuery::get`: `where('end_date', '>=', DataSql::literal(..., $inicio))` e, com `$fim`, `where('end_date', '<=', DataSql::literal(..., $fim))`. O eager-load já carrega `quote`; se `Turma::quote()` não incluir soft-deleted e a cotação puder estar apagada, carregar `quote` com `withTrashed` como faz `TurmaQueryBuilder`.
`EmissionPanelTurmaData`: `public string $quote_code` depois de `turma_id`, de `$turma->quote->code`. Atualizar os comentários que citam `concluidas_desde` (`EmissionPanelQuery`, `emissionWindow.ts`).

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter='EmissionPanel|CertificateEagerLoad|ListQueryBudget'`
Expected: PASS, sem query a mais por turma.

- [ ] **Step 5: Regenerar tipos e ajustar o front ao parâmetro novo**

Run: `docker compose exec -T app php artisan typescript:transform`
`useEmissionPanel(enabled, period?)` manda `period` como `params` e põe `period_start ?? 'default'`/`period_end` na `queryKey`. `useEmissionPanelState` segue passando `undefined` por ora (Task 7 liga o filtro). `useHistorial` passa `{ period_start: reissuing.snapshot.turma.end_date }`. Fixtures ganham `quote_code`.
Teste novo onde o Reemitir já é testado (`HistorialTableRowActions.test.tsx` ou `HistorialTable.test.tsx`): o painel é pedido com `period_start = snapshot.turma.end_date` e acha a matrícula de turma concluída há mais de 12 meses.
Run (de `frontend/`): `pnpm build && pnpm test -- certification`
Expected: PASS.

- [ ] **Step 6: Commit** — `feat(62): painel de emissão por período e com código da cotação`

---

### Task 2: Cotação no Historial — coluna, filtro e opções

**Files:**
- Modify: `backend/app/Domains/Certification/Data/CertificateData.php`
- Modify: `backend/app/Domains/Certification/QueryBuilders/CertificateQueryBuilder.php` (`LISTING`, `whereQuote`)
- Modify: `backend/app/Domains/Certification/Data/CertificatePageQueryData.php`
- Create: `backend/app/Domains/Certification/Data/CertificateQuoteOptionData.php`
- Modify: `backend/app/Domains/Certification/Http/Controllers/CertificateController.php` (`index`, novo `quotes`, middleware `only`)
- Modify: `backend/app/Domains/Certification/routes.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado)
- Modify: fixtures tipadas por `CertificateData`: `frontend/src/features/certification/components/Historial/HistorialTable.test.tsx`, `frontend/src/features/certification/components/Historial/HistorialTableRowActions.test.tsx`
- Test: `backend/tests/Feature/Certification/CertificateListingTest.php`, `backend/tests/Feature/Certification/CertificateEagerLoadTest.php`, `backend/tests/Feature/Shared/ListQueryBudgetTest.php`

**Interfaces:**
- Consumes: `Quote::code`.
- Produces:
  - `CertificateData::$quote_id: ?int`, `CertificateData::$quote_code: ?string`
  - `CertificateQueryBuilder::whereQuote(?int $quoteId): static` (via `enrollment.turma.quote_id`)
  - `CertificatePageQueryData::$quote_id: ?int`
  - `GET /api/certificates/quotes` → `CertificateQuoteOptionData[] { id: int; code: string }`, ordenado por `quotes.id` desc, só cotações com ≥ 1 certificado (qualquer status).

- [ ] **Step 1: Testes que falham**

- `CertificateListingTest::test_lista_traz_o_codigo_da_cotacao` — `data.0.quote_code === 'Scap X - RY'`, `quote_id` certo.
- `CertificateListingTest::test_filtra_por_quote_id` — duas turmas de cotações diferentes; `?quote_id=` devolve só as da primeira; combina com `q` e `display_status`.
- `CertificateListingTest::test_quote_id_inexistente_e_422`.
- `CertificateListingTest::test_opcoes_de_cotacao_so_com_certificado` — cotação sem certificado fora; ordem desc; exige `certification.certificate.view` (403 sem).
- `CertificateEagerLoadTest`: a contagem de queries da listagem não cresce com N depois do `quote` no `LISTING`.
- `ListQueryBudgetTest`: cenário para `api/certificates/quotes` em `CENARIOS_URIS`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter='CertificateListingTest|CertificateEagerLoadTest|ListQueryBudgetTest'`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`LISTING` = `['enrollment.student.user', 'enrollment.turma.quote']` (com `withTrashed` na cotação se a relação o exigir, Task 1). `CertificateData::fromModel` lê `enrollment?->turma?->quote`; nulo → `null`. `quotes` no controller, `->middleware(...)` incluindo `quotes` no `only` de `view`. Rota `certificates/quotes` **antes** de `certificates/{certificate}`, com throttle da API autenticada (a catraca `ThrottledRouteRatchetTest` cobra).

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter='Certificate|ListQueryBudget|ThrottledRouteRatchet|PermissionRouteMiddleware'`
Expected: PASS.

- [ ] **Step 5: Regenerar tipos e ajustar fixtures**

Run: `docker compose exec -T app php artisan typescript:transform`; de `frontend/`: `pnpm build && pnpm test -- certification`
Expected: PASS.

- [ ] **Step 6: Commit** — `feat(62): cotação no Historial, com filtro e opções`

---

### Task 3: Medir e ajustar o PDF unitário

**Files:**
- Create: `docs/superpowers/blocos/62-certificacao-paineis-lote-e-planilha/medicao-gotenberg.md`
- Modify: `backend/app/Shared/Pdf/GotenbergHtmlToPdf.php` (só se a medição justificar)
- Modify: `backend/app/Domains/Certification/Services/CertificatePdfService.php` (só se a medição justificar)
- Modify: `docker-compose.yml` (só `mem_limit: 768m` no `gotenberg`, para a medição espelhar produção)
- Test: `backend/tests/Feature/Shared/HtmlToPdfTest.php`, `backend/tests/Feature/Certification/CertificadoMatrizGotenbergTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: `medicao-gotenberg.md` com a seção `## Unitário` (baseline e depois), lida pela Task 4.

- [ ] **Step 1: Baseline** — stack da lane de pé (`docker compose up -d`), certificado de seed com temário longo. Medir 10 renderizações do mesmo certificado: tempo de `CertificatePdfService::html` (PHP) e de `HtmlToPdf::render` (Gotenberg) separados, tamanho do HTML em bytes. Registrar mediana e máximo. Gerar `pdftoppm -png -r 72` de todas as páginas em `/tmp/62-antes/`.
- [ ] **Step 2: Hipóteses** — testar uma a uma, registrando o ganho de cada: (a) opções do formulário do Gotenberg para HTML sem recurso externo (ex.: não esperar rede ociosa — conferir o nome exato na doc do 8.36); (b) ler e codificar em base64 os arquivos estáticos (logo, fundos, fontes) uma vez por processo em vez de a cada render.
- [ ] **Step 3: Manter só o que ganhou** — ganho < 5% da mediana não entra. O que entrar ganha teste em `HtmlToPdfTest` que fixa o campo do formulário enviado (via `Http::fake`).
- [ ] **Step 4: Provar documento igual** — `pdftoppm` depois do ajuste em `/tmp/62-depois/`, comparar página a página (diferença de pixels = 0, ou explicada no registro). Rodar:
  `docker compose exec -T app php artisan test --filter='CertificadoMatrizGotenberg|CertificatePdf|PublicCertificatePdf|HtmlToPdf'`
  Expected: PASS.
- [ ] **Step 5: Commit** — `perf(62): renderização unitária do certificado medida e ajustada` (com o registro).

---

### Task 4: Renderização em lote com concorrência limitada

**Files:**
- Modify: `backend/app/Shared/Pdf/HtmlToPdf.php`, `backend/app/Shared/Pdf/GotenbergHtmlToPdf.php`
- Modify: `backend/tests/Support/Pdf/FakeHtmlToPdf.php`
- Modify: `backend/config/services.php` (`gotenberg.concurrency`)
- Modify: `backend/app/Domains/Certification/Services/CertificatePdfService.php`
- Modify: `docs/superpowers/blocos/62-certificacao-paineis-lote-e-planilha/medicao-gotenberg.md` (seção `## Lote`)
- Modify: `backend/.env.example`, `deploy/aws/env.prod.example` (só se a chave de env nova existir)
- Test: `backend/tests/Feature/Shared/HtmlToPdfTest.php`, `backend/tests/Feature/Certification/CertificatePdfTest.php`

**Interfaces:**
- Consumes: Task 3 (formulário do Gotenberg).
- Produces:
  - `HtmlToPdf::renderMany(array<string, string> $htmls, PageOptions $options): array<string, string|PdfRenderException>` — mesma chave na entrada e na saída; falha por item, não exceção do lote.
  - `CertificatePdfService::renderMany(iterable<Certificate> $certificates): array<string, string>` — chave = `codigo`; uma nova tentativa (via `render` unitário) para cada item que falhou; falha persistente → `PdfRenderException` cuja mensagem nomeia os códigos; snapshot não apresentável → a `CorruptedSnapshotException` de hoje, antes de qualquer chamada ao conversor.
  - `config('services.gotenberg.concurrency')`, int ≥ 1.

- [ ] **Step 1: Testes que falham**

- `HtmlToPdfTest::test_render_many_preserva_as_chaves` (`Http::fake`, 3 HTMLs).
- `HtmlToPdfTest::test_render_many_devolve_a_falha_no_item` — 1 de 3 com 500 → aquele item é `PdfRenderException`, os outros bytes.
- `HtmlToPdfTest::test_render_many_respeita_a_concorrencia` — com `concurrency=2` e 5 itens, nunca mais de 2 requisições em voo (contador no `Http::fake` callback ou lotes de 2 verificados pela ordem).
- `CertificatePdfTest::test_render_many_tenta_de_novo_e_recupera` — fake que falha na primeira vez de um item e acerta na segunda → todos os PDFs.
- `CertificatePdfTest::test_render_many_falha_persistente_nomeia_o_codigo`.
- `CertificatePdfTest::test_render_many_usa_o_mesmo_html_do_unitario` — o HTML enviado por item é idêntico ao de `render()` do mesmo certificado.

- [ ] **Step 2: Rodar e ver falhar** — `--filter='HtmlToPdfTest|CertificatePdfTest'`, FAIL.
- [ ] **Step 3: Implementar** — `Http::pool` em fatias de `concurrency`, ou o recurso de concorrência do client se o Laravel 13 o tiver. `FakeHtmlToPdf::renderMany` delega a `render` por item e registra as chamadas.
- [ ] **Step 4: Rodar e ver passar** — mesmo filtro, PASS.
- [ ] **Step 5: Varredura de N** — com o Gotenberg a `mem_limit: 768m`, uma turma de seed com 30 certificados: N = 1, 2, 3, 4, 6. Para cada N: tempo total, pico de memória do container (`docker stats`), `RestartCount`/`OOMKilled`. O default de `concurrency` = maior N estável com folga de memória ≥ 20%. Se só N = 1 for estável, default 1 e o registro diz isso (spec §5.6, item 5). Registrar também o tempo de 30 PDFs unitários em sequência e o teto do ZIP: o maior lote cujo tempo medido × 2 ≤ 120 s, arredondado para baixo à dezena.
- [ ] **Step 6: Commit** — `feat(62): renderização em lote com concorrência limitada`

---

### Task 5: Escopo de exportação, resumo e planilha

**Files:**
- Create: `backend/app/Domains/Certification/Services/CertificateExportScope.php`
- Create: `backend/app/Domains/Certification/Data/CertificateExportQueryData.php`
- Create: `backend/app/Domains/Certification/Data/CertificateExportSummaryData.php`
- Create: `backend/app/Domains/Certification/Services/CertificateSpreadsheet.php`
- Create: `backend/app/Domains/Certification/Http/Controllers/CertificateExportController.php`
- Modify: `backend/app/Domains/Certification/routes.php`
- Modify: `backend/app/Shared/RateLimiting/RateLimits.php` (`certificate-export`)
- Modify: `backend/lang/{es_CL,pt_BR,en}/certification.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado)
- Test: `backend/tests/Feature/Certification/CertificateExportTest.php` (create), `backend/tests/Feature/Shared/RateLimitTest.php`, `backend/tests/Feature/Shared/ListQueryBudgetTest.php`

**Interfaces:**
- Consumes: `CertificateQueryBuilder::whereQuote` (Task 2), `searchable`, `whereDisplayStatus`.
- Produces:
  - `CertificateExportQueryData { ?string $q; ?CertificateDisplayStatus $display_status; ?int $quote_id }` (mesmas regras da listagem para os três).
  - `CertificateExportScope::query(CertificateExportQueryData $f): CertificateQueryBuilder` — os filtros da listagem + `where('status', CertificateStatus::Emitido)`, ordem `codigo` asc.
  - `CertificateExportScope::summary(CertificateExportQueryData $f): CertificateExportSummaryData { total: int; revocados: int }` — `revocados` = os do mesmo filtro com `status = revocado`.
  - `GET /api/certificates/export/summary` → `CertificateExportSummaryData`.
  - `GET /api/certificates/export/planilha` → xlsx (`Content-Disposition: attachment`).
  - `RateLimits::EXPORTACAO_CERTIFICADO`, limitador `certificate-export` por usuário.
  - `CertificateSpreadsheet::TETO_LINHAS` (1000).

- [ ] **Step 1: Testes que falham** (`CertificateExportTest`)

- `test_resumo_conta_o_mesmo_conjunto_da_planilha` — com `q` + `display_status` + `quote_id` combinados: `summary.total` = linhas de dados da planilha.
- `test_revogado_fica_fora_e_e_contado` — turma com 3 emitidos e 1 revogado: `total=3`, `revocados=1`, planilha com 3 linhas.
- `test_vencido_entra`.
- `test_conjunto_vazio_e_422` — `display_status=revocado` → planilha 422 (não arquivo vazio).
- `test_planilha_tem_as_seis_colunas_na_ordem` — ler o xlsx com o `Reader` do openspout: cabeçalho exato `['Código','Fecha Curso','RUT','Nombre Completo','Curso','Link Descarga']`.
- `test_linha_vem_do_snapshot` — mudar nome/RUT vivo do aluno depois de emitir: a planilha mostra o do snapshot; `Fecha Curso` = `12/10/26` para `end_date` `2026-10-12`.
- `test_link_aponta_para_o_pdf_publico_do_uuid` — célula com texto `ABRIR` e URL `config('app.url').'/api/publico/certificados/{uuid}/pdf'` (hyperlink da célula ou fórmula `HYPERLINK`, o que o openspout 5 suportar).
- `test_linhas_em_ordem_de_codigo`.
- `test_snapshot_sem_rut_e_sem_nome_nao_derruba` — célula vazia.
- `test_acima_do_teto_e_422`.
- `test_nome_do_arquivo` — com `quote_id`: `certificados-scap-<b>-r<s>.xlsx`; sem: `certificados-<Y-m-d>.xlsx`.
- `test_exige_permissao_de_ver` — 403 sem `certification.certificate.view`.
- `RateLimitTest`: `certificate-export` recusa acima do limite.

- [ ] **Step 2: Rodar e ver falhar** — `--filter=CertificateExportTest`, FAIL.
- [ ] **Step 3: Implementar** — controller com middleware de permissão; rotas `export/summary` e `export/planilha` antes de `{certificate}`, com `throttle:certificate-export`. `CertificateSpreadsheet::write(iterable<Certificate>, string $path)` com cabeçalho em fundo verde-azulado, texto branco, negrito (estilo openspout); percorre o escopo com `lazy()`/`cursor()`. Resposta `download(...)->deleteFileAfterSend()`. `ListQueryBudgetTest`: as duas URIs em `ISENTAS` com o motivo ("download de arquivo, não lista" / "contagem de um escopo, não lista").
- [ ] **Step 4: Rodar e ver passar** — `--filter='CertificateExport|RateLimit|ListQueryBudget|ThrottledRouteRatchet|PermissionRouteMiddleware|AuthenticatedRouteMiddleware'`, PASS.
- [ ] **Step 5: Regenerar tipos** — `typescript:transform`; de `frontend/`: `pnpm build`, PASS.
- [ ] **Step 6: Commit** — `feat(62): resumo e planilha da exportação de certificados`

---

### Task 6: ZIP da turma

**Files:**
- Modify: `backend/app/Domains/Certification/Http/Controllers/CertificateExportController.php`
- Create: `backend/app/Domains/Certification/Services/CertificateZip.php`
- Modify: `backend/app/Domains/Certification/routes.php`
- Modify: `backend/app/Shared/RateLimiting/RateLimits.php` (`certificate-zip`)
- Modify: `backend/lang/{es_CL,pt_BR,en}/certification.php`
- Test: `backend/tests/Feature/Certification/CertificateExportZipTest.php` (create), `backend/tests/Feature/Shared/RateLimitTest.php`, `backend/tests/Feature/Shared/ListQueryBudgetTest.php`

**Interfaces:**
- Consumes: `CertificateExportScope::query` (Task 5), `CertificatePdfService::renderMany` (Task 4).
- Produces:
  - `GET /api/certificates/export/zip?quote_id=` → `application/zip`, `attachment; filename="certificados-scap-<b>-r<s>.zip"`.
  - `CertificateZip::TETO` = o teto registrado na Task 4.
  - `RateLimits::ZIP_CERTIFICADO`, limitador `certificate-zip` por usuário.

- [ ] **Step 1: Testes que falham** (`CertificateExportZipTest`, com `FakeHtmlToPdf` ligado no container)

- `test_sem_quote_id_e_422_em_quote_id`.
- `test_um_pdf_por_certificado_nao_revogado` — abrir o ZIP com `ZipArchive`: nomes `certificado-<codigo>.pdf`, revogado ausente, contagem = `summary.total` com o mesmo filtro.
- `test_respeita_q_e_display_status_junto_com_quote_id`.
- `test_acima_do_teto_e_422`.
- `test_conjunto_vazio_e_422`.
- `test_falha_persistente_derruba_e_nomeia_o_codigo` — RFC 7807, `detail` contém o `codigo`; nenhum ZIP entregue.
- `test_snapshot_nao_apresentavel_derruba_e_nomeia_o_codigo`.
- `test_arquivo_temporario_e_apagado` — o diretório temporário usado não guarda o arquivo depois da resposta.
- `test_exige_permissao_de_ver`.
- `RateLimitTest`: `certificate-zip` recusa acima do limite.

- [ ] **Step 2: Rodar e ver falhar** — `--filter=CertificateExportZipTest`, FAIL.
- [ ] **Step 3: Implementar** — validação de `quote_id` obrigatório no próprio endpoint (`required`), teto antes de renderizar, `CertificateZip::build(array<string,string> $pdfs, string $path)`; resposta `download()->deleteFileAfterSend()`. Rota antes de `{certificate}`, com `throttle:certificate-zip`; URI em `ISENTAS` do `ListQueryBudgetTest`.
- [ ] **Step 4: Rodar e ver passar** — `--filter='CertificateExport|RateLimit|ListQueryBudget|ThrottledRouteRatchet|PermissionRouteMiddleware'`, PASS.
- [ ] **Step 5: Prova com Gotenberg real** — stack de pé: ZIP de uma turma de seed; cada PDF do ZIP comparado por `pdftoppm` com o download unitário do mesmo certificado (diferença 0). Registrar o tempo no `medicao-gotenberg.md`.
- [ ] **Step 6: Commit** — `feat(62): ZIP dos certificados da turma`

---

### Task 7: Emisión — período, combo e cards

**Files:**
- Modify: `frontend/src/features/certification/components/Emission/EmissionPanel.tsx`
- Create: `frontend/src/features/certification/components/Emission/PendingTurmaCards.tsx`
- Modify: `frontend/src/features/certification/hooks/useEmissionPanelState.ts`
- Modify: `frontend/src/features/certification/lib/emissionWindow.ts`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`
- Test: `frontend/src/features/certification/components/Emission/EmissionPanel.test.tsx`, `frontend/src/features/certification/components/Emission/PendingTurmaCards.test.tsx` (create)

**Interfaces:**
- Consumes: `useEmissionPanel(enabled, period)` e `EmissionPanelTurmaData.quote_code` (Task 1); `PeriodFilter`, `RecordCode`, `currentCalendarPeriod` de `shared/`.
- Produces:
  - `type EmissionPeriodKey = 'last12' | 'week' | 'month' | 'year' | 'custom'`
  - `countsFor(turma: EmissionPanelTurmaData): EmissionCounts` exportada de `useEmissionPanelState.ts` (a função única das contagens — o `counts` da turma selecionada passa a usá-la).
  - `PendingTurmaCards({ turmas, onSelect }: { turmas: EmissionPanelTurmaData[]; onSelect: (turmaId: number) => void })`

- [ ] **Step 1: Testes que falham**

- `EmissionPanel.test`: preset default `last12` não manda `period_*`; `month` manda o mês corrente; `custom` revela duas datas; 422 de `period_end` aparece ao lado do filtro mantendo o dado anterior.
- `EmissionPanel.test`: rótulo da opção do combo = `Scap 190 - R1 · <curso> · 12/10/26`.
- `PendingTurmaCards.test`: só turmas com `countsFor(t).pendientes > 0`; texto `16 por emitir · 2 emitidos`; turma bloqueada com a tag do motivo; clique chama `onSelect(turma_id)`; nenhuma pendente → vazio com dica de ampliar o período.
- `EmissionPanel.test`: clicar num card abre a tabela daquela turma (mesmo resultado do combo).
- [ ] **Step 2: Rodar e ver falhar** — de `frontend/`: `pnpm test -- Emission`, FAIL.
- [ ] **Step 3: Implementar** — estado do preset e do período customizado em `useEmissionPanelState` (o componente só monta JSX); `EMISSION_PANEL_WINDOW_MONTHS` segue sendo o rótulo do preset `last12`. Cards no lugar do `AppEmptyState` quando `!turma`. Textos: `certificate.cardPending` (`{{pending}} por emitir · {{issued}} emitidos`), `certificate.noPendingTurmas`, `certificate.noPendingTurmasHint`, presets em `certificate.period.*`.
- [ ] **Step 4: Rodar e ver passar** — `pnpm test -- certification && pnpm lint && pnpm build`, PASS.
- [ ] **Step 5: Commit** — `feat(62): Emisión com período, combo da cotação e cards de pendência`

---

### Task 8: Historial — coluna e filtro de cotação

**Files:**
- Modify: `frontend/src/features/certification/components/Historial/historialColumns.ts`, `HistorialTable.tsx`
- Create: `frontend/src/features/certification/components/Historial/HistorialQuoteFilter.tsx`
- Modify: `frontend/src/features/certification/hooks/useHistorial.ts`
- Modify: `frontend/src/features/certification/api/certificatesApi.ts` (`useCertificateQuotes`)
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`
- Test: `frontend/src/features/certification/components/Historial/HistorialTable.test.tsx`

**Interfaces:**
- Consumes: `CertificateData.quote_code`, `GET /api/certificates/quotes` (Task 2).
- Produces: `useHistorial()` ganha `quoteFilter: number | null`, `setQuoteFilter`, `quoteOptions`, e `clearFilters()` (substitui `clearStatusFilter`, limpa os dois); `filters` do `useServerTable` = `{ display_status, quote_id }`.

- [ ] **Step 1: Testes que falham** — coluna mostra `RecordCode` com o código, `—` quando nulo; escolher cotação manda `quote_id` e volta à página 1; limpar zera estado e cotação.
- [ ] **Step 2: Rodar e ver falhar** — `pnpm test -- Historial`, FAIL.
- [ ] **Step 3: Implementar** — `historialWidths` ganha `cotizacion: COL.code`; filtro `AppDropdown` com `filter` (busca) e `showClear`, ao lado do `HistorialStatusFilter` no `filterSlot`.
- [ ] **Step 4: Rodar e ver passar** — `pnpm test -- certification && pnpm lint && pnpm build`, PASS.
- [ ] **Step 5: Commit** — `feat(62): cotação no Historial`

---

### Task 9: Historial — exportar planilha e ZIP

**Files:**
- Create: `frontend/src/features/certification/components/Historial/HistorialExportActions.tsx`
- Create: `frontend/src/features/certification/components/Historial/ExportConfirmDialog.tsx`
- Create: `frontend/src/features/certification/hooks/useCertificateExport.ts`
- Modify: `frontend/src/features/certification/api/certificatesApi.ts` (resumo e downloads)
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`
- Test: `frontend/src/features/certification/hooks/useCertificateExport.test.tsx` (create), `frontend/src/features/certification/components/Historial/HistorialTable.test.tsx`

**Interfaces:**
- Consumes: filtros de `useHistorial` (Task 8: `q` da tabela, `statusFilter`, `quoteFilter`); `GET export/summary|planilha|zip` (Tasks 5–6); `useBlobDownload` de `@shared/hooks`; `problemFromBlob`.
- Produces: `useCertificateExport(filters: { q?: string; display_status?: CertificateDisplayStatus | null; quote_id?: number | null })` → `{ format: 'planilha'|'zip'|null; open(format); close(); summary; confirm(); pending; error; zipDisabledReason: string | null }`.

- [ ] **Step 1: Testes que falham**

- Abrir "Planilla" busca o resumo com os mesmos filtros da tabela e mostra `Se exportarán 3 certificados según los filtros aplicados` + `1 revocado no se incluye`; sem filtro, a frase de "todos".
- ZIP desabilitado sem `quote_id`, com a dica `Filtra por cotización para descargar los PDF`.
- `total = 0` → confirmar desabilitado com a razão.
- Confirmar baixa o blob com o `filename` do `Content-Disposition`.
- Erro 422/500 do download (corpo Blob) mostra o `detail` RFC 7807 no diálogo.

- [ ] **Step 2: Rodar e ver falhar** — `pnpm test -- Export`, FAIL.
- [ ] **Step 3: Implementar** — requests com `responseType: 'blob'`, `problemFromBlob` no erro; ZIP mostra estado de carregamento enquanto renderiza. Botões no cabeçalho da `SearchableTableFrame` (slot já existente ou `filterSlot`).
- [ ] **Step 4: Rodar e ver passar** — `pnpm test && pnpm lint && pnpm build`, PASS.
- [ ] **Step 5: Commit** — `feat(62): exportar planilha e ZIP pelo Historial`

---

### Task 10: Prova ponta a ponta no navegador

**Files:**
- Create: `docs/superpowers/blocos/62-certificacao-paineis-lote-e-planilha/prova-navegador.md`

**Interfaces:**
- Consumes: Tasks 1–9.
- Produces: o registro da prova, lido pelo `/finalizar-bloco`.

- [ ] **Step 1:** Stack da lane de pé, seed com turma concluída com ≥ 15 aprovados emitidos, 1 revogado, 1 pendente. Pelo navegador (`playwright-cli`, Vite da lane): cards listam a turma pendente e abrem a tabela; período `Mes` muda a lista; Historial filtra pela cotação; aviso mostra N e o revogado; planilha e ZIP baixam.
- [ ] **Step 2:** Abrir o xlsx baixado (LibreOffice headless → CSV, ou leitura openspout) e conferir colunas, datas e URLs; abrir um link `ABRIR` e conferir que o PDF é do aluno da linha; abrir o ZIP e contar os PDFs.
- [ ] **Step 3:** Pedir ao João: abrir o xlsx no Excel e colar a tabela no Gmail, conferindo que o `ABRIR` segue clicável (critério 10 da spec). Registrar a resposta.
- [ ] **Step 4: Commit** — `docs(62): prova no navegador`

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 3, 7 | sim (3: `backend/app/Shared/Pdf/*`, `CertificatePdfService.php`, `docker-compose.yml`, `medicao-gotenberg.md`, testes de PDF; 7: `frontend/src/features/certification/components/Emission/*`, `useEmissionPanelState.ts`, `emissionWindow.ts`, locales) | nenhuma entre elas (7 consome a Task 1, já feita) |

Task fora de grupo executa e revisa uma a uma. As demais compartilham `generated.ts`, `routes.php`,
`CertificateController.php`, `useHistorial.ts`, `certificatesApi.ts` ou os locales, ou consomem uma da outra.

## Handoff de execução

- `executor: claude` — o bloco toca lei 3 (tipos gerados), documento de peso legal (PDF e dado do
  snapshot) e duas tasks de medição com julgamento (3 e 4).
- Sessão: `opus`, esforço `high`.
- Papéis (`.claude/papeis.md`): `implementador-integracao` (Tasks 1, 2, 4, 5, 6, 7, 8, 9),
  `implementador-mecanico` (nenhuma de partida), `revisor-task` em toda task, `re-revisor` nas
  rodadas de correção, `revisor-branch` ao fim. Tasks 3 e 10 rodam na sessão principal: precisam do
  stack de pé, de medição e, na 10, do João.
