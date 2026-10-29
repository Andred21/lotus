# Bloco 40 — Certificado: assinaturas, layout e validade — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o certificado sai no layout v5 aprovado, em 2 páginas para todo texto realista dentro dos tetos,
com as assinaturas vivas da gerente e do instrutor, sem cortar texto, e a validade OTEC fica registrada
com fonte.

**Architecture:** a assinatura do instrutor é um documento `FIRMA` do redator (Identity); a da gerente
mora num singleton `certificate_settings` (Certification), editado numa aba nova de Administración
composta na camada `app/`. As duas imagens são limpas no navegador por uma função pura de `shared/lib`
e lidas vivas na hora de renderizar o PDF. O Blade é reescrito no layout v5; os tetos de caracteres
saem de uma matriz medida no Gotenberg real e valem em toda porta de entrada.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data, owen-it/auditing, spatie/permission, Blade +
Gotenberg 8 (Chromium), Poppler (`pdfinfo`, `pdftotext`, `pdfimages`, `pdftoppm`); React 19 + TS,
TanStack Query, PrimeReact via `shared/ui`, vitest.

**Spec:** `docs/superpowers/blocos/40-certificado-refinamento-e-validade/spec.md` (aprovada). Referência
visual: `referencia-layout-p1.png` e `referencia-layout-p2.png` na mesma pasta. Leia a spec inteira
antes de qualquer task: as decisões D1–D19 valem para todas.

**Base de código:** a lane foi atualizada com a `origin/main` depois do merge da lane 43
(`07579e04`, merge `0cd33214`). Os caminhos abaixo são desse código.

## Global Constraints

- Leis do `CLAUDE.md` §5 valem em toda task: sem Repository; auditoria só na aplicação;
  `frontend/src/shared/types/generated.ts` só por `php artisan typescript:transform`, com os consumidores
  corrigidos no mesmo commit; feature não importa PrimeReact nem outra feature.
- Toda mensagem que chega a uma resposta HTTP vem de `backend/lang/<locale>/*.php`, nas três locales
  (`en`, `es_CL`, `pt_BR`). Toda cópia de tela nas três locales do front
  (`frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`), com o es-CL como redação de referência.
- Snapshot e `valido_ate` de certificado emitido nunca mudam (D12). O snapshot não muda de schema.
- O PDF nunca corta texto: nada de `line-clamp`, `text-overflow` ou reticências em campo impresso (D10).
- Assinatura: só PNG, até 1 MB, largura mínima 600 px no servidor; no navegador, recorte rente à tinta,
  fundo transparente, no máximo 1600 px de largura, nunca ampliada (D16).
- Gotenberg com tag exata `gotenberg/gotenberg:8.36.0` nos dois composes (D17) — é a versão do dev em
  que a matriz é medida.
- Cópia fixa do certificado (spec §4.3): "CERTIFICADO DE CAPACITACIÓN"; "En {cidade}, a {data por
  extenso}, {emissor} [{RUT}] certifica que:"; "El trabajador participó en el curso:"; "N° de registro
  {código} · Válido hasta el {data por extenso}"; "Verifique la autenticidad escaneando el código.";
  "Emitido el dd-mm-aaaa"; "{código} · Página X de Y"; cargo do instrutor "Instructor".
- Backend roda no container (`docker compose exec -T app ...`); Pint só nos arquivos tocados, de dentro
  de `backend/`. Front de `frontend/`: `pnpm build`, `pnpm lint`, `pnpm test`.
- Componente de feature e de `app/` até 150 linhas (lint). Hooks de dados só em `features/*/hooks` ou
  `features/*/api`, nunca em `components/`.

## Review Focus

1. **Texto sem espaço no teto** (ex.: 120 `W` seguidos no nome do aluno): o navegador não quebra a
   palavra e o texto vaza da folha, perdido. Esperado: quebra forçada (`overflow-wrap: anywhere` nos
   campos impressos) e nenhum caractere perdido. Teste: caso `adversario` da matriz (Task 6) e asserção
   de CSS na Task 5.
2. **Binário da assinatura ausente no bucket** (linha em `files` existe, objeto sumiu): esperado o PDF
   sair com a caixa vazia, nunca 500. Teste na Task 4.
3. **Redator arquivado**: o certificado antigo continua com a `FIRMA` que a cascata arquivou, e o
   painel não avisa falta dela (D19). Testes nas Tasks 1, 4 e 12.
4. **Período que cruza o ano e nota/asistencia em formatos variados** ("6.5", "6,5", `6`, "92.50",
   "100.00"): esperado "entre el 28 de diciembre de 2025 y el 3 de enero de 2026", "6,5", "6",
   "92,5 %", "100 %". Teste na Task 3.
5. **Certificado sem nenhuma assinatura e amostra (MUESTRA) sem instrutor**: esperado traço, nome e
   cargo com a caixa vazia, sem erro (D6). Teste na Task 5.

---

## Task 1: `FIRMA` no backend e classe de conteúdo da assinatura

**Files:**
- Modify: `backend/app/Shared/Files/ContentClass.php`
- Create: `backend/app/Shared/Files/Rules/LarguraMinimaDeImagem.php`
- Modify: `backend/app/Domains/Identity/Enums/RedatorDocumentType.php`
- Modify: `backend/app/Domains/Identity/Models/Redator.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorDocumentController.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/ProfileDocumentController.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorController.php` (`documentsFromRequest`)
- Modify: `backend/lang/{en,es_CL,pt_BR}/shared.php`, `backend/lang/{en,es_CL,pt_BR}/identity.php`
- Modify: `backend/tests/Support/Files/BuildsRealUploads.php`
- Modify: `backend/tests/Feature/Shared/UploadPolicyTest.php`, `backend/tests/Feature/Shared/UploadPolicyRatchetTest.php`
- Modify: `backend/tests/Feature/Cadastros/RedatorDocumentTest.php`, `backend/tests/Feature/Identity/ProfileDataTest.php`, `backend/tests/Unit/Identity/DocumentValidityStatusTest.php`
- Create: `backend/tests/Feature/Identity/RedatorFirmaTest.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado) e o consumidor do front que o `pnpm build` acusar

**Interfaces:**
- Produces:
  - `ContentClass::Assinatura` (`'assinatura'`): extensões `['png']`, mimes `['image/png']`, teto
    `1024` KB; `ContentClass::LARGURA_MINIMA_ASSINATURA_PX = 600`; `ContentClass::Assinatura->regras()`
    devolve as regras de sempre **mais** `new LarguraMinimaDeImagem(600)`.
  - `LarguraMinimaDeImagem implements ValidationRule`, `__construct(int $minimoPx)`; lê a largura por
    `getimagesize()` (sem GD); falha com `__('shared.file.image_too_narrow', ['min' => ..., 'width' => ...])`
    ou `__('shared.file.image_unreadable')`.
  - `RedatorDocumentType::FIRMA = 'FIRMA'`; `isCompliance(): bool` (falso só para `FIRMA`);
    `values()` passa a devolver só os tipos de compliance (o docblock já a chama de "lista canônica dos
    tipos regulatórios"); `conteudo(): ContentClass` (`FIRMA` → `Assinatura`, demais → `Documento`);
    `aceitaValidade(): bool` (= `isCompliance()`). `isSelfService()` não muda (FIRMA é self-service, D2).
  - `Redator::firma(): MorphOne` — a assinatura vigente pela D19: `File` do tipo `FIRMA`, com
    `withTrashed()` e a condição `deleted_at IS NULL OR archived_with_parent = true`, a de maior `id`.
    Eager-loadable (`->with('firma')`).

- [ ] **Step 1: Testes que falham** — em `RedatorFirmaTest`:

```php
public function test_admin_sobe_firma_png_e_ela_vira_a_firma_do_redator(): void
// POST /api/redatores/{id}/documents type=FIRMA, file=pngDeLargura(800, 300) -> 201/200;
// $redator->fresh()->firma->type === 'FIRMA'
public function test_redator_sobe_a_propria_firma_pelo_perfil(): void          // POST /api/profile/documents
public function test_firma_recusa_jpeg_com_mensagem_nomeada(): void            // 422 em errors.file
public function test_firma_recusa_png_acima_de_1mb(): void
public function test_firma_recusa_png_com_menos_de_600px(): void
// errors.file.0 === __('shared.file.image_too_narrow', ['min' => 600, 'width' => 599])
public function test_firma_recusa_valid_until(): void                         // 422 em errors.valid_until
public function test_criar_redator_com_firma_no_multipart_aplica_a_regra_da_assinatura(): void
// POST /api/redatores com documents[FIRMA]=jpeg -> 422
public function test_firma_vigente_segue_a_d19(): void
// casos: ativa; substituída (vale a nova); redator arquivado (vale a que a cascata marcou);
// apagada pelo admin antes do arquivamento (null); redator sem firma (null)
public function test_firma_fica_fora_dos_tipos_de_compliance(): void
// RedatorDocumentType::values() === ['CV','REUF','TITULO','POSTGRADO']; cases() tem os cinco
```

  `BuildsRealUploads` ganha `pngDeLargura(int $largura, int $altura): string` (bytes PNG reais por
  `imagecreatetruecolor` + `imagepng`). Ajuste os testes que cravam a lista antiga:
  `RedatorDocumentTest::test_enum_tem_os_quatro_tipos` (cinco casos), `ProfileDataTest` (cinco slots,
  FIRMA por último), `DocumentValidityStatusTest` (`selfServiceValues()` inclui `FIRMA`), e
  `UploadPolicyTest::test_os_tetos_preservam_os_numeros_de_hoje` (crava `Assinatura` = 1024).

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter='RedatorFirmaTest|RedatorDocumentTest|ProfileDataTest|DocumentValidityStatusTest|UploadPolicy'`
Expected: FAIL (caso `FIRMA` e `ContentClass::Assinatura` não existem).

- [ ] **Step 3: Implementar**

  - Os três sítios de upload do redator escolhem a regra pelo tipo: validam `type` primeiro e depois
    `'file' => $tipo->conteudo()->regras()` e `'valid_until' => $tipo->aceitaValidade() ? ['nullable', 'date'] : ['prohibited']`.
  - `UploadPolicyRatchetTest::REFERENCIAS_DE_POLITICA` ganha o marcador `'->conteudo()->regras('`, com
    comentário apontando `RedatorDocumentType::conteudo()`: o sítio continua pedindo a classe de conteúdo,
    só que pelo tipo.
  - `identity.document_type.FIRMA` nas três locales (es_CL "Firma", pt_BR "Assinatura", en "Signature");
    `shared.file.image_too_narrow` e `shared.file.image_unreadable` nas três.
  - Regenere `generated.ts` e rode `pnpm build`; corrija no mesmo commit o consumidor que quebrar.

- [ ] **Step 4: Rodar e ver passar** — o filtro do Step 2, depois a suíte inteira
  (`docker compose exec -T app php artisan test`) e `cd frontend && pnpm build`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(40): documento FIRMA do redator e classe de conteúdo da assinatura`

## Task 2: Configuración › Certificados no backend

**Files:**
- Create: `backend/database/migrations/2026_10_29_000001_create_certificate_settings_table.php`
- Create: `backend/app/Domains/Certification/Models/CertificateSettings.php`
- Create: `backend/app/Domains/Certification/Data/CertificateSettingsData.php`, `backend/app/Domains/Certification/Data/CertificateSignatureFileData.php`
- Create: `backend/app/Domains/Certification/Actions/UpdateCertificateSettingsAction.php`, `StoreManagerSignatureAction.php`, `RemoveManagerSignatureAction.php`
- Create: `backend/app/Domains/Certification/Http/Controllers/CertificateSettingsController.php`
- Modify: `backend/app/Domains/Certification/routes.php`
- Modify: `backend/app/Providers/AppServiceProvider.php` (morph map)
- Modify: `backend/app/Domains/Identity/Support/PermissionCatalog.php`, `backend/database/seeders/RolePermissionSeeder.php`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (só `perm.certification_settings_manage`)
- Modify: `backend/tests/Feature/Shared/ListQueryBudgetTest.php` (`ISENTAS`)
- Create: `backend/tests/Feature/Certification/CertificateSettingsTest.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado)

**Interfaces:**
- Consumes: `ContentClass::Assinatura` (Task 1).
- Produces:
  - tabela `certificate_settings` (`id`, `manager_name` string, `manager_title` string, timestamps); a
    migration insere a linha única "Marcia de Batalha" / "Gerente OTEC". Alias de morph
    `certificate_settings`.
  - `CertificateSettings` (Auditable, `$auditInclude = ['manager_name', 'manager_title']`, sem
    SoftDeletes): `static atual(): self` (a linha única, `firstOrFail`); `const TIPO_FIRMA = 'FIRMA_GERENTE'`;
    `signature(): MorphOne` (`File` do tipo `FIRMA_GERENTE` não apagado, o de maior `id`).
  - `CertificateSettingsData` (`#[TypeScript]`): `manager_name: string`, `manager_title: string`
    (`#[Required]`), `signature: ?CertificateSignatureFileData` só de saída (`#[Computed]`/`Optional`, no
    molde de `RedatorData::$documents`); `fromModel(CertificateSettings): self`.
  - `CertificateSignatureFileData` (`#[TypeScript]`): `original_name`, `size`, `created_at`,
    `download_url` (URL assinada, como `RedatorDocumentData`).
  - Rotas sob `auth.active`, todas com `permission:certification.settings.manage` (`HasMiddleware`):
    `GET certificate-settings`, `PUT certificate-settings`, `POST certificate-settings/signature`
    (`throttle:upload`), `DELETE certificate-settings/signature`. Todas devolvem `CertificateSettingsData`
    (o DELETE pode devolver 204, no molde do `RedatorDocumentController::destroy`).
  - `UpdateCertificateSettingsAction::execute(CertificateSettings $s, CertificateSettingsData $d): CertificateSettings`;
    `StoreManagerSignatureAction::execute(UploadedFile $file): File` (no molde do
    `StoreRedatorDocumentAction`: `put` fora da transação, `lockForUpdate` da linha, soft-delete por
    instância da firma anterior, `register`, `discard` na falha); `RemoveManagerSignatureAction::execute(): void`.
  - Permissão `certification.settings.manage`: em `PermissionCatalog::descriptions()` e `SEGREGATED`, e
    fora de `adminPermissions()` no seeder — só o superadmin a recebe (D3).

- [ ] **Step 1: Testes que falham** — em `CertificateSettingsTest`:

```php
public function test_superadmin_le_as_configuracoes_com_a_gerente_semeada(): void
// GET -> manager_name 'Marcia de Batalha', manager_title 'Gerente OTEC', signature null
public function test_superadmin_salva_nome_e_cargo_e_gera_auditoria(): void
// PUT -> 200; audits: auditable_type 'certificate_settings', event 'updated', new_values com o nome novo
public function test_superadmin_sobe_troca_e_remove_a_assinatura(): void
// POST pngDeLargura(900, 300) -> signature.original_name; POST de novo -> a anterior soft-deleted;
// DELETE -> signature null
public function test_assinatura_da_gerente_passa_pela_mesma_validacao_da_firma(): void
// jpeg -> 422; 599 px -> 422 com shared.file.image_too_narrow
public function test_admin_recebe_403_em_toda_rota(): void   // GET, PUT, POST, DELETE
public function test_permissao_e_so_do_superadmin(): void
// Role superadmin hasPermissionTo; admin e redator não; está em PermissionCatalog::SEGREGATED
public function test_alias_de_morph(): void   // Relation::getMorphedModel('certificate_settings')
```

- [ ] **Step 2: Rodar e ver falhar** — `docker compose exec -T app php artisan test --filter=CertificateSettingsTest`. Expected: FAIL.

- [ ] **Step 3: Implementar** — siga o padrão de entidade do `backend-ddd.md` (controller fino, DTO
  com `fromModel`, uma Action por escrita em `DB::transaction`). Antes da migration, leia
  `docs/der-fisico.md` e `.claude/rules/migrations.md`. `api/certificate-settings` entra em `ISENTAS` do
  `ListQueryBudgetTest` (não é lista). Regenere `generated.ts`.

- [ ] **Step 4: Rodar e ver passar** — o filtro, a suíte inteira (as catracas de throttle, rota
  autenticada, upload, i18n de permissão e paridade de locale passam) e `cd frontend && pnpm build`.

- [ ] **Step 5: Commit** — `feat(40): configuração de certificados com a assinatura da gerente`

## Task 3: Texto do certificado no formato chileno

**Files:**
- Create: `backend/app/Domains/Certification/Services/TextoDoCertificado.php`
- Create: `backend/tests/Unit/Certification/TextoDoCertificadoTest.php`

**Interfaces:**
- Produces (classe sem dependências, meses por array próprio — sem depender de locale do Carbon/ICU):
  - `fechaLarga(string $iso): string` — `'2026-10-28'` → `'28 de octubre de 2026'`.
  - `periodo(?string $inicio, ?string $termino): ?string` — mesmo ano: `'entre el 13 de julio y el 7 de agosto de 2026'`;
    anos diferentes: `'entre el 28 de diciembre de 2025 y el 3 de enero de 2026'`; mesmo dia:
    `'el 13 de julio de 2026'`; qualquer ponta nula → `null`.
  - `nota(int|float|string $nota): string` — `'6.5'`/`6.5`/`'6,5'` → `'6,5'`; `6` → `'6'`.
  - `asistencia(string $pct): string` — `'92.50'` → `'92,5 %'`; `'100.00'` → `'100 %'`; `'95'` → `'95 %'`.
  - `parrafo(?string $periodo, ?string $descricao, ?string $nota, ?string $asistencia): ?string` — o
    parágrafo centralizado do corpo (spec §4.3, item 6), com a cópia fixada aqui **(Claude)**:
    - período e descrição: `"La actividad, realizada {periodo}, abordó los siguientes contenidos: {descrição}"`;
    - só período: `"La actividad fue realizada {periodo}."`;
    - só descrição: `"La actividad abordó los siguientes contenidos: {descrição}"`;
    - a descrição recebe `.` no fim quando não termina em `.`, `!` ou `?`;
    - resultado, quando houver, numa segunda frase: nota e asistencia →
      `"El trabajador logró aprobar el curso con nota {nota} y una asistencia de {asistencia}."`; só nota →
      `"El trabajador logró aprobar el curso con nota {nota}."`; só asistencia →
      `"El trabajador registró una asistencia de {asistencia}."`;
    - tudo nulo → `null`.

- [ ] **Step 1: Testes que falham** — um teste por método com os valores acima, mais:

```php
public function test_periodo_que_cruza_o_ano_imprime_os_dois_anos(): void
public function test_parrafo_completo(): void
// parrafo('entre el 13 de julio y el 7 de agosto de 2026', 'Mantenimiento de subestaciones', '6,5', '92,5 %')
// === 'La actividad, realizada entre el 13 de julio y el 7 de agosto de 2026, abordó los siguientes '
//   .'contenidos: Mantenimiento de subestaciones. El trabajador logró aprobar el curso con nota 6,5 '
//   .'y una asistencia de 92,5 %.'
```

- [ ] **Step 2: Rodar e ver falhar** — `docker compose exec -T app php artisan test --filter=TextoDoCertificadoTest`.
- [ ] **Step 3: Implementar** `TextoDoCertificado`.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat(40): texto do certificado em formato chileno`

## Task 4: Assinaturas vivas na impressão

**Files:**
- Create: `backend/app/Domains/Certification/Services/CertificateSignatures.php`
- Create: `backend/app/Domains/Certification/Services/AssinaturaImpressa.php`, `backend/app/Domains/Certification/Services/AssinaturasDoCertificado.php`
- Create: `backend/tests/Feature/Certification/CertificateSignaturesTest.php`

**Interfaces:**
- Consumes: `Redator::firma()` (Task 1); `CertificateSettings::atual()`, `->signature` (Task 2).
- Produces:
  - `final readonly class AssinaturaImpressa { string $nome; string $cargo; ?string $pngBase64 }`.
  - `final readonly class AssinaturasDoCertificado { AssinaturaImpressa $gerente; AssinaturaImpressa $instrutor }`.
  - `CertificateSignatures::para(Certificate $certificate): AssinaturasDoCertificado`:
    - gerente: nome e cargo de `CertificateSettings::atual()`, imagem da `signature` dela;
    - instrutor: nome do **snapshot** (`$certificate->snapshot->redator->name`, D14), cargo `'Instructor'`,
      imagem da `firma` de `Redator::withTrashed()->find($certificate->redator_id)` (D19); `redator_id`
      nulo (amostra) → sem imagem;
    - os bytes saem do disco em que o `File` foi gravado; objeto ausente ou erro de leitura → imagem
      `null` e `report()` da exceção. Nunca lança (spec §4.3: a falta nunca derruba o PDF).

- [ ] **Step 1: Testes que falham**

```php
public function test_gerente_vem_da_configuracao_viva(): void            // trocar o nome muda o resultado
public function test_imagem_da_gerente_e_do_instrutor_em_base64(): void   // === base64_encode(bytes subidos)
public function test_nome_do_instrutor_vem_do_snapshot_e_nao_do_redator_vivo(): void
public function test_redator_arquivado_mantem_a_firma_que_a_cascata_arquivou(): void   // D19
public function test_sem_assinaturas_as_imagens_sao_nulas(): void
public function test_binario_ausente_no_disco_vira_imagem_nula_sem_excecao(): void      // Review Focus 2
public function test_certificado_sem_redator_sai_sem_imagem_do_instrutor(): void
```

- [ ] **Step 2: Rodar e ver falhar** — `--filter=CertificateSignaturesTest`.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat(40): assinaturas vivas lidas na hora de imprimir`

## Task 5: Certificado no layout v5

**Files:**
- Modify: `backend/resources/views/certification/certificate.blade.php` (reescrita)
- Modify: `backend/app/Domains/Certification/Services/CertificatePdfService.php`
- Create: `backend/resources/images/fundo-certificado-continuacao.jpg`
- Modify: `backend/tests/Feature/Certification/CertificatePdfTest.php`
- Modify: `backend/tests/Feature/Certification/CertificadoEmitidoIntactoTest.php`

**Interfaces:**
- Consumes: `TextoDoCertificado` (Task 3); `CertificateSignatures::para()` (Task 4);
  `EmissionCityResolver::issuerCity()` (existente).
- Produces: o Blade v5. A cidade da abertura é `issuerCity()` lida na hora (D13), com
  `$snapshot->ciudad_emision` como reserva; sem as duas, a frase começa em "A {data}, …". Emissor e RUT
  continuam vindo do snapshot.

- [ ] **Step 1: Extrair o fundo da continuação** — o fundo da página 2 do aprovado é JPEG
  1414×2000 sem as barras:

```bash
pdfimages -j -f 2 -l 2 docs/templates/certificado.pdf /tmp/fundo-p2
cp /tmp/fundo-p2-000.jpg backend/resources/images/fundo-certificado-continuacao.jpg
file backend/resources/images/fundo-certificado-continuacao.jpg   # JPEG, 1414x2000
```

- [ ] **Step 2: Testes que falham** — em `CertificatePdfTest`, contra o HTML do `FakeHtmlToPdf`:

```php
public function test_abertura_usa_a_cidade_do_emissor_e_a_data_por_extenso(): void
// config city 'Santiago', snapshot ciudad_emision 'Valparaíso', emitido_em '2026-08-05'
// -> 'En Santiago, a 5 de agosto de 2026, OTEC Congelada SpA [76.543.210-3] certifica que:'
public function test_corpo_segue_a_ordem_da_v5(): void
// posições crescentes: título, abertura, nome do aluno, 'El trabajador participó en el curso:',
// nome do curso, parágrafo, razão social, 'N° de registro'
public function test_registro_traz_codigo_e_validade_por_extenso(): void
// 'N° de registro LOT-2026-1000 · Válido hasta el 5 de agosto de 2028'; sem valido_ate, sem 'Válido hasta'
public function test_nenhum_texto_do_documento_e_clampado(): void
// o HTML não contém 'line-clamp' nem 'text-overflow'; contém 'overflow-wrap: anywhere' (Review Focus 1)
public function test_assinaturas_lado_a_lado_com_imagem_quando_existe(): void
// gerente à esquerda do instrutor no HTML; nomes e cargos; base64 das duas imagens; mix-blend-mode: multiply
public function test_sem_assinatura_a_caixa_fica_vazia_e_traco_e_nome_ficam(): void       // D6, Review Focus 5
public function test_amostra_sem_instrutor_renderiza(): void                               // rota do preview
public function test_aviso_legal_sai_uma_vez(): void
public function test_cada_fundo_e_o_logo_embutidos_uma_unica_vez(): void                   // P-28
public function test_trocar_a_firma_muda_a_reimpressao_sem_mudar_o_snapshot(): void       // D5, critério 5
```

  Remova `test_so_a_descricao_do_curso_e_elidida_e_a_elisao_e_marcada`,
  `test_limiar_troca_o_corpo_antes_de_o_clamp_de_11px_morder` e o helper `renderComDescricaoDe` (o clamp
  sai, D10). Reescreva para a v5, mantendo a intenção, `test_rodape_e_qr_ficam_no_fluxo_e_nao_em_posicao_absoluta`
  (assinaturas no fluxo, logo abaixo do corpo), `test_fundo_embutido_uma_unica_vez` e
  `test_qr_e_identificacao_formam_um_bloco_no_topo` ("N° LOT-…", "Emitido el 05-08-2026", "Verifique la
  autenticidad escaneando el código."). Os testes que asseriam cópia antiga ("Emisión:", "Asistencia
  registrada", "El trabajador de la empresa RUT") passam a asserir a v5; os de tolerância de snapshot
  (`test_html_tolera_*`) e `test_nenhuma_regra_do_documento_prende_a_folha_em_297mm` ficam.

- [ ] **Step 3: Rodar e ver falhar** — `--filter=CertificatePdfTest`.

- [ ] **Step 4: Implementar o Blade v5** pela spec §4.3 e pelos PNGs de referência: cabeçalho de
  altura fixa com o logo no mesmo lugar em toda página física; bloco de verificação à esquerda só na
  página 1; título sempre na mesma linha (~70 mm); corpo centralizado; assinaturas em duas colunas
  iguais logo abaixo do corpo; aviso legal uma vez, no pé da última página; "{código} · Página X de Y" em
  toda página; temário em quadro com módulos numerados e quebra só entre módulos, sem separar o título
  do primeiro marcador; o fundo com barras só na página 1, o de continuação nas demais. O mecanismo de
  cabeçalho e paginação é seu (spec §8), desde que provado no Gotenberg real e sem prender a folha em
  `height: 297mm`. O `CertificatePdfService` passa ao Blade `fundoContinuacao`, as assinaturas, a cidade
  e o `TextoDoCertificado`.

- [ ] **Step 5: Rodar e ver passar** — `--filter=CertificatePdfTest`.

- [ ] **Step 6: Inspeção visual no Gotenberg real** — renderize um certificado com os dados da
  referência (Sebastián Gallardo, RUT 16.200.019-5, "Mantenimiento de subestaciones", Transelec, 5
  módulos) pelo Gotenberg da lane, gere `pdftoppm -png -r 144` das páginas 1 e 2 em `/tmp`, leia os PNGs
  e compare com `referencia-layout-p1.png` e `referencia-layout-p2.png`. Corrija até conferir; guarde o
  comando e a conclusão para a Task 14.

- [ ] **Step 7: Novo sha do certificado emitido** — em `CertificadoEmitidoIntactoTest`, troque
  `HTML_ANTES_DO_BLOCO_39` por `HTML_LAYOUT_V5_BLOCO_40`, com o docblock registrando a decisão do João
  (D5/D8 da spec do bloco 40, 2026-10-29): todo certificado emitido reimprime no layout v5 com as
  assinaturas vivas. O teste de "não reescreve a linha" continua provando snapshot e `valido_ate`
  intactos. Rode o arquivo: PASS.

- [ ] **Step 8: Suíte e commit** — suíte inteira verde; Pint nos PHP tocados.
  `feat(40): certificado no layout v5 com assinaturas e sem corte de texto`

## Task 6: Matriz no Gotenberg real, tetos medidos e tag fixa

**Files:**
- Create: `backend/tests/Support/ProbesGotenberg.php`
- Create: `backend/tests/Support/Certification/MedidorDeCertificado.php`, `backend/tests/Support/Certification/TextoRealista.php`
- Create: `backend/app/Shared/Support/TetosImpressos.php`
- Create: `backend/tests/Feature/Certification/CertificadoMatrizGotenbergTest.php`
- Modify: `docker-compose.yml`, `docker-compose.prod.yml`
- Create: `docs/superpowers/blocos/40-certificado-refinamento-e-validade/matriz.md`

**Interfaces:**
- Consumes: o Blade v5 e o `CertificatePdfService` (Task 5).
- Produces:
  - `ProbesGotenberg::skipUnlessGotenberg(): void` — no molde do `ProbesMysqlConcurrency`: sonda
    `GET {services.gotenberg.url}/health` com timeout curto; fora do container (ou com o serviço fora do
    ar), `markTestSkipped` com o motivo.
  - `MedidorDeCertificado::medir(array $snapshot, ?string $validoAte): MedicaoDePdf` — renderiza pelo
    `CertificatePdfService` com o `GotenbergHtmlToPdf` real, grava o PDF num temporário apagado ao fim, e
    devolve `paginas` (`pdfinfo`), `textoPorPagina` (`pdftotext -layout`), `imagensPorPagina`
    (`pdfimages -list`) e `linhasDe(string $trecho): int` (por `pdftotext -bbox-layout`).
  - `TextoRealista` (determinístico): `nome(int $chars): string` em MAIÚSCULAS espanholas de um corpus
    fixo; `prosa(int $chars): string` em espanhol corrido; `adversario(int $chars): string` (sem espaço,
    glifo largo).
  - `TetosImpressos` (`App\Shared\Support`), constantes `int`: `NOME_ALUNO`, `NOME_CURSO`,
    `NOME_TECNICO`, `DESCRICAO_CURSO`, `RAZAO_SOCIAL`, `NOME_ASSINANTE` (redator e gerente),
    `CARGO_ASSINANTE`. Os valores saem dos Steps 2–3; o docblock registra a medição.

- [ ] **Step 1: Sonda, medidor e texto realista** — implemente as três peças de suporte e um teste
  mínimo que mede o certificado da referência e vê 2 páginas. Run:
  `docker compose exec -T app php artisan test --filter=CertificadoMatrizGotenbergTest`. Expected: PASS no
  container; SKIPPED com o motivo se o Gotenberg estiver fora.

- [ ] **Step 2: Medir produção (só leitura)** — o maior comprimento de cada campo, com arquivados:

```sql
SELECT 'aluno', MAX(CHAR_LENGTH(name)) FROM users WHERE type = 'aluno'
UNION ALL SELECT 'redator', MAX(CHAR_LENGTH(name)) FROM users WHERE type = 'redator'
UNION ALL SELECT 'razao_social', MAX(CHAR_LENGTH(legal_name)) FROM clients
UNION ALL SELECT 'curso', MAX(CHAR_LENGTH(name)) FROM courses
UNION ALL SELECT 'tecnico', MAX(CHAR_LENGTH(technical_name)) FROM courses
UNION ALL SELECT 'descricao', MAX(CHAR_LENGTH(description)) FROM courses
UNION ALL SELECT CONCAT('snapshot.', k), MAX(CHAR_LENGTH(JSON_UNQUOTE(JSON_EXTRACT(snapshot, CONCAT('$.', k)))))
  FROM certificates, JSON_TABLE('["aluno.name","curso.name","curso.technical_name","curso.description","cliente.name","redator.name"]',
       '$[*]' COLUMNS (k VARCHAR(40) PATH '$')) AS chaves GROUP BY k;
```

  Rode só-leitura em produção. Se o auto mode recusar, deixe o script no scratchpad, peça ao João que
  rode e cole a saída, e confira o resultado. Registre os números em `matriz.md`.

- [ ] **Step 3: Achar os tetos pela regra da D15** — num teste descartável, não commitado, que usa o
  `MedidorDeCertificado`. A regra, fixada aqui **(Claude)**:
  - cada nome (aluno, curso, técnico, razão social, assinante, cargo) recebe o **maior** comprimento de
    `TextoRealista::nome()` em que ele, sozinho, ocupa no máximo **2 linhas** da própria caixa, achado por
    busca binária e arredondado para baixo à dezena;
  - esse teto tem de ser pelo menos 1,5× o maior valor de produção do campo (tabelas e snapshots);
  - com todos os nomes no teto, mais nota, asistencia e vigência, a descrição recebe o maior comprimento
    de `TextoRealista::prosa()` em que as assinaturas ficam na página 1, arredondado para baixo à
    dezena;
  - esse teto da descrição tem de ser pelo menos o maior valor de produção.

  **Pare e leve ao João** se algum dado de produção passar do teto ou se alguma das duas folgas não
  fechar. Grave as constantes em `TetosImpressos`, com o docblock trazendo a tabela da medição (campo,
  maior de produção, teto, linhas no teto) e a tag do Gotenberg.

- [ ] **Step 4: A matriz vira teste** — `CertificadoMatrizGotenbergTest`, um caso por linha
  (data provider), todos com `skipUnlessGotenberg()`:
  - cada nome no teto, sozinho;
  - todos no teto juntos, com nota, asistencia e vigência;
  - descrição no teto;
  - temário do tamanho do aprovado (8 módulos);
  - temário grande (16 módulos);
  - sem campos opcionais;
  - sem temário;
  - adversário no teto em cada campo.

  Asserções:
  - texto realista dentro dos tetos com temário de até uma página: 2 páginas, `Instructor` e
    `Gerente OTEC` na página 1, `Temario del curso` na 2;
  - sem temário: 1 página;
  - toda página traz `"{código} · Página {p} de {n}"` e o logo (`pdfimages -list`);
  - nenhuma página traz `…`;
  - adversário: todo texto de entrada aparece, sem espaços, no texto concatenado do PDF;
  - temário grande: o título de cada módulo está na mesma página que o primeiro marcador dele.

- [ ] **Step 5: Tag fixa** — nos dois composes, `gotenberg/gotenberg:8` → `gotenberg/gotenberg:8.36.0`,
  com um comentário de uma linha: trocar a tag exige rodar `CertificadoMatrizGotenbergTest` de novo
  (D17). Rode `docker compose up -d gotenberg` e a matriz: PASS.

- [ ] **Step 6: Registro** — `matriz.md` com a tabela de cada caso (páginas, página das assinaturas,
  página do temário, reticências) gerada pelo medidor nesta execução, e a tabela dos tetos.

- [ ] **Step 7: Commit** — `test(40): matriz do certificado no Gotenberg real e tetos medidos`

## Task 7: Tetos em toda porta de entrada (backend)

**Files:**
- Modify: `backend/app/Domains/Identity/Data/StudentData.php`, `RedatorData.php`, `ProfileUpdateData.php`
- Modify: `backend/app/Domains/Operation/Data/EnrollmentData.php`
- Modify: `backend/app/Domains/Commercial/Data/ClientData.php`
- Modify: `backend/app/Domains/Catalog/Data/CourseData.php`
- Modify: `backend/app/Domains/Certification/Data/CertificateSettingsData.php`
- Modify: `backend/app/Domains/Identity/Services/StudentResolver.php`
- Modify: `backend/app/Console/CargaInicial/ArquivoDeCarga.php`
- Modify: `backend/lang/{en,es_CL,pt_BR}/validation.php` (`attributes`)
- Create: `backend/tests/Feature/Shared/TetosDeEntradaTest.php`
- Modify: `backend/tests/Feature/Operation/ImportStudentsActionTest.php`, `backend/tests/Feature/CargaInicial/ArquivoDeCargaTest.php`

**Interfaces:**
- Consumes: `TetosImpressos` (Task 6); `CertificateSettingsData` (Task 2).
- Produces: `#[Max(TetosImpressos::X)]` em:
  - `StudentData::$name`, `EnrollmentData` (`name`): `NOME_ALUNO`;
  - `RedatorData::$name`, `ProfileUpdateData` (`name`), `CertificateSettingsData::$manager_name`:
    `NOME_ASSINANTE`;
  - `CertificateSettingsData::$manager_title`: `CARGO_ASSINANTE`;
  - `ClientData::$legal_name`: `RAZAO_SOCIAL`;
  - `CourseData::$name`: `NOME_CURSO`; `$technical_name`: `NOME_TECNICO`; `$description`:
    `DESCRICAO_CURSO`.

  O import de alunos recusa a linha de aluno **novo** com nome acima do teto (o `StudentResolver` só usa
  o nome ao criar) com `ValidationException` em `name` e a mensagem `validation.max.string`. A carga
  histórica aplica os mesmos tetos em `erroDeForma()`: nos cadastros e nos `*_impresso`. Arquivo acima do
  teto é recusado antes de gravar, com o caminho do campo. `validation.attributes` ganha `legal_name`,
  `technical_name`, `manager_name` e `manager_title` nas três locales.

- [ ] **Step 1: Testes que falham** — `TetosDeEntradaTest` com data provider
  (rota, payload, campo, teto) × locale (`es-CL`, `pt-BR`, `en`):

```php
public function test_campo_no_teto_passa(...): void
public function test_campo_acima_do_teto_recebe_422_com_a_mensagem_nomeada(...): void
// withHeaders(['Accept-Language' => $locale])->postJson/putJson(...)->assertStatus(422)
//   ->assertJsonPath("errors.{$campo}.0", __('validation.max.string',
//        ['attribute' => __("validation.attributes.{$campo}", [], $loc), 'max' => $teto], $loc))
```

  Rotas: `POST /api/students`, `POST /api/redatores`, `PUT /api/profile`,
  `POST /api/turmas/{turma}/enrollments` (matrícula individual), `POST /api/clients` (`legal_name`),
  `POST /api/courses` (`name`, `technical_name`, `description`) e `PUT /api/certificate-settings`.
  Confirme cada caminho no `routes.php` do domínio antes de escrever. Mais:
  - `ImportStudentsActionTest::test_linha_com_nome_acima_do_teto_vira_erro_da_linha`;
  - casos novos no provider `alteracoesInvalidas()` do `ArquivoDeCargaTest`: `alunos.0.name` e
    `certificado.aluno_impresso` acima do teto.

- [ ] **Step 2: Rodar e ver falhar** — `--filter='TetosDeEntradaTest|ImportStudentsActionTest|ArquivoDeCargaTest'`.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar** — o filtro e a suíte inteira.
- [ ] **Step 5: Commit** — `feat(40): tetos de caracteres dos campos impressos em toda entrada`

## Task 8: Limpeza da assinatura no navegador (`shared`)

**Files:**
- Create: `frontend/src/shared/lib/signature/cleanSignature.ts`, `frontend/src/shared/lib/signature/cleanSignature.test.ts`
- Create: `frontend/src/shared/lib/signature/canvasBridge.ts`, `frontend/src/shared/lib/signature/index.ts`
- Modify: `frontend/src/shared/lib/index.ts`
- Create: `frontend/src/shared/ui/AppSignatureUpload/AppSignatureUpload.tsx`, `AppSignatureUpload.test.tsx`, `index.ts`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (só `signature.*`)

**Interfaces:**
- Produces:
  - `interface Raster { width: number; height: number; data: Uint8ClampedArray }` (RGBA).
  - `cleanSignature(input: Raster, options?: Partial<CleanSignatureOptions>): Raster`, função pura:
    - estima o papel pelo percentil alto da luminância;
    - alfa por rampa suave: tinta opaca, papel transparente, faixa intermediária proporcional — caneta
      fraca não some;
    - recorta rente à tinta com margem pequena;
    - reduz para no máximo `SIGNATURE_MAX_WIDTH = 1600` px, preservando a proporção e nunca ampliando;
    - sem tinta, lança `EmptySignatureError`;
    - os limiares ficam em `CleanSignatureOptions`, com defaults calibrados por você (spec §8).
  - `SIGNATURE_MIN_WIDTH = 600` (espelha `ContentClass::LARGURA_MINIMA_ASSINATURA_PX`).
  - `fileToRaster(file: File): Promise<Raster>` (lança `UnsupportedImageError` para o que o navegador não
    decodifica) e `rasterToPngFile(r: Raster, name: string): Promise<File>` em `canvasBridge.ts` — a única
    ponte com canvas.
  - `AppSignatureUpload` (`shared/ui`): props `{ label: string; onConfirm: (file: File) => void; disabled?: boolean; busy?: boolean }`.
    Fluxo: escolher arquivo (`accept="image/png,image/jpeg,image/webp"`), limpar, prévia do resultado
    sobre fundo xadrez, depois "Usar esta firma" chama `onConfirm(png)` ou "Cancelar" descarta. Mostra
    erro nomeado para formato não suportado, imagem sem traço e largura final abaixo de
    `SIGNATURE_MIN_WIDTH`. O PNG enviado é o limpo; o original não sobe.

- [ ] **Step 1: Testes que falham** — `cleanSignature.test.ts` com rasters sintéticos:

```ts
it('traço preto em papel branco: fundo vira alfa 0 e traço alfa 255')
it('recorta rente ao traço com a margem')
it('caneta fraca (luminância ~170 em papel 250) continua visível')            // alfa > 0 no traço
it('foto com fundo cinza ruidoso (180 ± 10) perde o fundo inteiro')
it('3000 px de largura saem com 1600, na mesma proporção')
it('800 px de largura não são ampliados')
it('imagem em branco lança EmptySignatureError')
```

  `AppSignatureUpload.test.tsx`, com `canvasBridge` mockado: prévia aparece depois da escolha;
  confirmar chama `onConfirm` com o arquivo limpo; cancelar não chama; erro de formato mostra a mensagem.

- [ ] **Step 2: Rodar e ver falhar** — `cd frontend && pnpm test -- src/shared/lib/signature src/shared/ui/AppSignatureUpload`.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar** — o comando acima, `pnpm lint` e `pnpm build`.
- [ ] **Step 5: Commit** — `feat(40): limpeza da assinatura no navegador`

## Task 9: `FIRMA` no front (redator e Meu Perfil)

**Files:**
- Modify: `frontend/src/shared/lib/redatorStatus.ts`; Create ou Modify: `frontend/src/shared/lib/redatorStatus.test.ts`
- Modify: `frontend/src/features/identity/components/Redator/RedatorDocumentsSection.tsx`
- Create: `frontend/src/features/identity/components/Redator/RedatorSignatureSlot.tsx`, `RedatorSignatureSlot.test.tsx`
- Modify: `frontend/src/features/identity/components/Profile/ProfileDocumentsSection.tsx`
- Create: `frontend/src/features/identity/components/Profile/ProfileSignatureSlot.tsx`, `ProfileSignatureSlot.test.tsx`
- Modify: `frontend/src/features/identity/hooks/useProfileDocuments.ts`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: `RedatorDocumentType` com `'FIRMA'` (Task 1, `generated.ts`); `AppSignatureUpload` (Task 8).
- Produces:
  - `COMPLIANCE_DOC_TYPES = ['CV', 'REUF', 'TITULO', 'POSTGRADO'] as const`;
    `DOC_TYPES = [...COMPLIANCE_DOC_TYPES, 'FIRMA'] as const`;
  - `idoneidade()` considera só documentos de `COMPLIANCE_DOC_TYPES`;
  - `useProfileDocuments` ganha `uploadFile(type: RedatorDocumentType, file: File)`.
  - Slot "Firma" depois dos quatro atuais, sem tag de status, com `AppSignatureUpload`: no dialog do
    redator, em criação o PNG limpo vai para `stageDoc('FIRMA', file)` e em edição para `upload.mutate`;
    no Meu Perfil, para `uploadFile('FIRMA', file)`.
  - `documentType.FIRMA` nas três locales.

- [ ] **Step 1: Testes que falham**

```ts
it('redator só com FIRMA e com cursos é no_idoneo')                      // redatorStatus.test.ts
it('FIRMA sem validade não muda a idoneidade de quem tem os documentos')
it('slot Firma do dialog sobe o PNG confirmado')                         // RedatorSignatureSlot.test.tsx
it('slot Firma do perfil sobe o PNG confirmado e não mostra status')    // ProfileSignatureSlot.test.tsx
```

- [ ] **Step 2: Rodar e ver falhar** — `cd frontend && pnpm test -- redatorStatus RedatorSignatureSlot ProfileSignatureSlot`.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar** — e `pnpm lint`, `pnpm build`, `pnpm test`.
- [ ] **Step 5: Commit** — `feat(40): slot de assinatura no redator e no Meu Perfil`

## Task 10: Configuración › Certificados no front

**Files:**
- Create: `frontend/src/shared/ui/AppSubNav/AppSubNav.tsx`, `AppSubNav.test.tsx`, `index.ts`
- Modify: `frontend/src/shared/ui/index.ts`
- Create: `frontend/src/features/certification/api/certificateSettingsApi.ts`
- Create: `frontend/src/features/certification/hooks/useCertificateSettingsForm.ts`
- Create: `frontend/src/features/certification/components/Settings/CertificateSettingsPanel.tsx`, `ManagerSignatureField.tsx`, `CertificateSettingsPanel.test.tsx`
- Modify: `frontend/src/features/identity/components/AdministracionPage.tsx`, `AdministracionPage.test.tsx`
- Create: `frontend/src/app/pages/Administracion/AdministracionRoute.tsx`, `ConfiguracionTab.tsx`, `AdministracionRoute.test.tsx`
- Modify: `frontend/src/app/router/AppRouter.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`

**Interfaces:**
- Consumes: rotas e `CertificateSettingsData` (Task 2); `AppSignatureUpload` (Task 8).
- Produces:
  - `AppSubNav` (`shared/ui`): `{ items: { key: string; label: string }[]; activeKey: string; onSelect: (key: string) => void; ariaLabel: string }`;
    navegação vertical, item atual com `aria-current="page"`.
  - `certificateSettingsApi`: `useCertificateSettings()`, `useUpdateCertificateSettings()`,
    `useUploadManagerSignature()` (`postMultipart`), `useRemoveManagerSignature()`.
  - `CertificateSettingsPanel` (`features/certification`): Nombre, Cargo, Firma (prévia, trocar por
    `AppSignatureUpload`, remover com confirmação) e "Guardar". O texto de ajuda, es-CL fixado:
    "Esta configuración se aplica a todos los certificados, incluidos los ya emitidos." (D5).
  - `AdministracionPage({ configuracion }: { configuracion?: ReactNode })`: renderiza a aba
    `admin.tabConfiguracion` quando `configuracion` vem. A página não conhece Certification (lei 6).
  - `AdministracionRoute` (`app/`): passa `<ConfiguracionTab />` só com `can('certification.settings.manage')`.
    `ConfiguracionTab` compõe `AppSubNav` (hoje só "Certificados") à esquerda e o painel à direita. O
    `AppRouter` troca `AdministracionPage` por `AdministracionRoute` em `/administracion`.
  - `module.administracion.description` passa a citar a configuración (es-CL: "Usuarios internos, roles,
    permisos y configuración").

- [ ] **Step 1: Testes que falham**

```ts
it('AppSubNav marca o item atual com aria-current e chama onSelect')
it('superadmin vê a aba Configuración; admin não')                       // AdministracionRoute.test.tsx
it('painel carrega nome e cargo, salva por PUT e mostra a ajuda de todos os certificados')
it('trocar a firma sobe o PNG confirmado; remover pede confirmação')
```

- [ ] **Step 2: Rodar e ver falhar** — `cd frontend && pnpm test -- AppSubNav AdministracionRoute CertificateSettingsPanel AdministracionPage`.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar** — e `pnpm lint`, `pnpm build`, `pnpm test`.
- [ ] **Step 5: Commit** — `feat(40): aba Configuración com o submódulo Certificados`

## Task 11: Tetos no front

**Files:**
- Create: `frontend/src/shared/config/tetosImpressos.ts`
- Create: `backend/tests/Unit/Shared/TetosImpressosParityTest.php`
- Modify: `frontend/src/shared/ui/AppTextarea/AppTextarea.tsx`; Create: `frontend/src/shared/ui/AppTextarea/AppTextarea.test.tsx`
- Modify: `frontend/src/features/identity/components/Student/StudentIdentifyFields.tsx`, `frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx`, `frontend/src/features/identity/components/Profile/ProfilePersonalSection.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollStudentForm.tsx`, `frontend/src/features/commercial/components/Client/ClientGeneralFields.tsx`, `frontend/src/features/catalog/components/Course/CourseDialog.tsx`
- Modify: `frontend/src/features/certification/components/Settings/CertificateSettingsPanel.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (`common.charCount`)

**Interfaces:**
- Consumes: `TetosImpressos` (Task 6); `CertificateSettingsPanel` (Task 10).
- Produces:
  - `TETOS_IMPRESSOS = { nomeAluno, nomeCurso, nomeTecnico, descricaoCurso, razaoSocial, nomeAssinante, cargoAssinante } as const`,
    com os números de `TetosImpressos`.
  - `TetosImpressosParityTest` lê o `.ts` por `FrontendPath::de('src/shared/config/tetosImpressos.ts')` e
    exige cada número igual à constante PHP.
  - `AppTextarea` ganha `showCount?: boolean`: com `maxLength`, mostra `t('common.charCount', { count, max })`
    sob o campo, com `aria-live="polite"`.
  - `maxLength` nos inputs dos campos com teto, e contador na descrição do curso.

- [ ] **Step 1: Testes que falham** — o de paridade (backend) e:

```ts
it('AppTextarea com maxLength e showCount mostra contagem e máximo')
```

- [ ] **Step 2: Rodar e ver falhar** — `docker compose exec -T app php artisan test --filter=TetosImpressosParityTest` e `cd frontend && pnpm test -- AppTextarea`.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar** — e `pnpm lint`, `pnpm build`, `pnpm test`.
- [ ] **Step 5: Commit** — `feat(40): tetos de caracteres nos formulários`

## Task 12: Avisos de assinatura na emissão e porta de cidade (D9)

**Files:**
- Modify: `backend/app/Domains/Certification/Services/CertificateEligibility.php` (porta 4)
- Modify: `backend/app/Domains/Certification/Services/EmissionPanelQuery.php`, `backend/app/Domains/Certification/Services/EmissionCityResolver.php` (docblock)
- Modify: `backend/app/Domains/Certification/Data/EmissionPanelRedatorData.php`, `backend/app/Domains/Certification/Data/EmissionPanelTurmaData.php`
- Modify: `backend/tests/Feature/Certification/CertificateListingTest.php`, `backend/tests/Feature/Certification/CertificateEligibilityTest.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado)
- Modify: `frontend/src/features/certification/components/Emission/EmissionPanel.tsx`; Create: `frontend/src/features/certification/components/Emission/EmissionWarnings.tsx`
- Modify: `frontend/src/features/certification/components/Emission/ConfirmIssueDialog.tsx`, `BatchIssueDialog.tsx` (e `Historial/ReissueDialog.tsx` se ele escolhe redator)
- Modify: `frontend/src/features/certification/components/Emission/EmissionPanel.test.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (`certificate.warnings.*`)

**Interfaces:**
- Consumes: `Redator::firma()` (Task 1); `CertificateSettings::atual()->signature()` (Task 2).
- Produces:
  - `EmissionPanelRedatorData::$has_firma: bool`, pela D19, com `redatores.firma` no eager-load do
    `EmissionPanelQuery`;
  - `EmissionPanelTurmaData::$manager_signature_missing: bool`, calculado uma vez por requisição;
  - porta 4 do `CertificateEligibility` e `SinCiudad` do painel passam a olhar só
    `EmissionCityResolver::issuerCity()` (D9). O `emissionCityFor()` continua alimentando
    `ciudad_emision` do snapshot;
  - avisos, não bloqueios: `EmissionWarnings` mostra a falta da firma da gerente acima das turmas;
    os diálogos de emissão avisam quando o relator escolhido tem `has_firma === false`. Nenhum
    `EmissionBlockReason` novo.

- [ ] **Step 1: Testes que falham**

```php
public function test_painel_marca_relator_sem_firma_e_gerente_sem_firma(): void
public function test_relator_arquivado_com_firma_arquivada_pela_cascata_nao_gera_aviso(): void   // D19
public function test_painel_nao_faz_n_mais_1_com_a_firma(): void      // ou pela catraca ListQueryBudgetTest
public function test_turma_presencial_com_local_e_cidade_do_emissor_vazia_e_recusada(): void
// config city '' -> painel sin_ciudad e POST 422 com certification.eligibility.emission_city_missing
```

  Atualize o caso do `CertificateEligibilityTest` (`:195-235`) que provava a presencial passando com a
  config vazia: agora ela recusa (D9). No front:

```ts
it('mostra o aviso da firma da gerente quando falta')
it('diálogo de emissão avisa relator sem firma e não bloqueia o botão')
```

- [ ] **Step 2: Rodar e ver falhar** — `--filter='CertificateListingTest|CertificateEligibilityTest'` e `pnpm test -- Emission`.
- [ ] **Step 3: Implementar** — regenere `generated.ts`. O `EmissionPanel.tsx` está em 149 linhas:
  o aviso nasce em `EmissionWarnings.tsx`.
- [ ] **Step 4: Rodar e ver passar** — suíte backend inteira, `pnpm lint`, `pnpm build`, `pnpm test`.
- [ ] **Step 5: Commit** — `feat(40): avisos de assinatura na emissão e cidade do emissor`

## Task 13: Pesquisa de validade

**Files:**
- Create: `docs/superpowers/blocos/40-certificado-refinamento-e-validade/validade.md`

**Interfaces:** nenhuma.

- [ ] **Step 1: Levantar em fonte primária** a partir dos fatos 6 e 7 do `context.md`: Ley 19.799
  (arts. 3, 4 e 5), Ley 19.518 (art. 21), DS 98 (art. 10) em bcn.cl; certificado de asistencia e de
  aprovação em sence.gob.cl; NCh 2728:2015 em inn.cl. Fonte que não abrir fica registrada como tal,
  com a fonte secundária usada.
- [ ] **Step 2: Escrever `validade.md`** — tabela `requisito | fonte primária (URL, norma, artigo) |
  certeza | situação no template (atendido / decisão da Lotus / não se aplica)`. Já decidido: selos
  fora (D7); firma electrónica avanzada não exigida para instrumento privado, que vai para Deferred.
  Uma seção "Pendências da Lotus" com código SENCE no certificado, nota mínima, prazo de guarda e
  exigência do setor elétrico.
- [ ] **Step 3: Commit** — `docs(40): pesquisa de validade do certificado OTEC`

## Task 14: Docs, evidências e smoke

**Files:**
- Modify: `docs/der-fisico.md` (tabela `certificate_settings`, alias `certificate_settings`, tipos `FIRMA` e `FIRMA_GERENTE` em `files`)
- Modify: `docs/superpowers/pendencias/README.md`, `abertas.md`, `encerradas.md` (`P-28` e `P-78` encerradas)
- Modify: `docs/estrutura-monolito.md` (`shared/lib/signature`, `shared/ui/AppSignatureUpload`, `shared/ui/AppSubNav`, `app/pages/Administracion`, `features/certification/components/Settings`)
- Modify: `.claude/rules/frontend-fsliced.md` (aba de feature alheia composta em `app/` por prop de slot, ref. `AdministracionRoute`)
- Modify: `.claude/rules/backend-ddd.md` (a linha que diz que Certification não tem classes está velha)
- Create: `docs/superpowers/blocos/40-certificado-refinamento-e-validade/evidencias.md`

- [ ] **Step 1: Docs** — as atualizações da lista acima, curtas e com referência ao bloco 40.
- [ ] **Step 2: Smoke no navegador** (stack da lane, offset +1, front em `http://localhost:5174`):
  - suba uma `FIRMA` por foto de celular e por scan, pelo dialog do redator e pelo Meu Perfil;
  - configure a gerente como superadmin e confira que o admin não vê a aba;
  - emita um certificado e abra o PDF;
  - registre o que viu.
- [ ] **Step 3: `evidencias.md`** — a inspeção visual da Task 5 (comando e conclusão), a saída da
  matriz (aponta `matriz.md`), o smoke do Step 2, e o resultado dos gates (suíte backend, Pint nos
  tocados, `pnpm build`, `pnpm lint`, `pnpm test`).
- [ ] **Step 4: Commit** — `docs(40): registros do certificado v5 e pendências encerradas`

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 3, 8, 13 | sim (backend `Certification/Services/TextoDoCertificado*` · front `shared/lib/signature`, `shared/ui/AppSignatureUpload`, barris e locales · `validade.md`) | nenhuma entre elas |

Task fora de grupo executa e revisa uma a uma. Ordem: 1, 2, G1 (3, 8, 13), 4, 5, 6, 7, 9, 10, 11, 12, 14.
A Task 1 fica fora de grupo porque o `pnpm build` pode exigir correção em consumidor do front que o
plano não consegue listar. A Task 6 tem um portão humano (Step 2, medição de produção) e uma parada
(Step 3).

## Handoff de execução

- `executor: claude` — o bloco toca leis do §5 (tipos gerados, PrimeReact só por `shared/ui`,
  auditoria), schema e julgamento visual. Nada vai para o Codex.
- Sessão: a do `/executar-bloco` (frontmatter: `sonnet`, esforço `medium`). O `--max` sobe os
  despachos `sonnet` para `opus`.
- Papéis de `.claude/papeis.md`:
  - `implementador-integracao`: Tasks 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12 e 13;
  - `implementador-mecanico`: Tasks 3 e 14;
  - `revisor-task` em cada task, `re-revisor` nas rodadas de correção, `corretor-tardio` nas rodadas 4
    e 5;
  - `revisor-branch` no fim.
- `paths_autorizados`: não se aplica (executor `claude`).
