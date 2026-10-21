# Bloco 39 — Certificado e redator sem trava: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: `superpowers:subagent-driven-development` (recomendada) ou
> `superpowers:executing-plans`, task a task. Os passos usam checkbox (`- [ ]`).

**Goal:** todo curso emite certificado pelo Blade padrão, sem cadastro de template, e com preview por
curso. A idoneidade do redator (RN-09) deixa de travar a designação e vira aviso auditado.

**Architecture:** a emissão perde a porta do template. A cidade da turma online vem da config do
emissor, e a vigência fica nula. O CRUD de template sai da API, mas tabela, model, cascata e alias
ficam por rastro. A RN-09 passa a diagnosticar motivos em vez de lançar exceção. A designação grava
os motivos na mesma linha de audit do `PivotAudit`, e o picker do front lista todos os redatores,
com tag e confirmação. O preview monta um `Certificate` em memória e passa pelo mesmo pipeline
Blade→Gotenberg, com marca d'água.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data + typescript-transformer (coletor de
enums automático), owen-it/laravel-auditing, Gotenberg (`Tests\Support\Pdf\FakeHtmlToPdf` em
teste), React 19 + TS, TanStack Query, PrimeReact via `shared/ui`, vitest.

**Spec:** `docs/superpowers/blocos/39-certificado-e-redator-sem-trava/spec.md`. Context Packet:
`context.md`, na mesma pasta.

## Global Constraints

- Cidade padrão do emissor: chave `app.certificate_issuer.city`, env `CERTIFICATE_ISSUER_CITY`,
  default `Santiago`. Vazia ou só com espaços conta como ausente.
- **Não tocar** `deploy/aws/env.prod.example` nem `CHAVES_ESPERADAS` de `deploy/bin/conferir-golive.sh`:
  a catraca `frontend/tests/conferir-golive.test.ts` prende os dois, e uma chave esperada nova
  exigiria escrita em produção.
- Emissão nova: `valido_ate = null` sempre; snapshot com `template: {version: null, city: null}`;
  `CertificateSnapshotData::CURRENT_VERSION` continua `2`.
- Valores de fio: `EmissionBlockReason` = `sin_ciudad` | `sin_redactor`; `MotivoInidoneidade` =
  `not_qualified` | `reuf_invalid`, sempre nessa ordem quando os dois valem.
- Preview: `GET /api/courses/{course}/certificate-preview`, `permission:certification.certificate.view`,
  `throttle:certificate-pdf`, `Content-Disposition: inline; filename="certificado-muestra-{id}.pdf"`.
  Código impresso `MUESTRA`; marca d'água e conteúdo do QR = `MUESTRA — SIN VALIDEZ`. Nada é
  persistido nem auditado, e nenhum número é consumido.
- Audit da designação com motivo: `new_values.inidoneidade = {"<redator_id>": [<motivos>]}`, na
  mesma linha do `sync`. Designação idônea: `new_values` só com `redatores`, como hoje.
- Nenhuma migration. Nenhuma linha de `course_certificate_templates` ou `certificates` é alterada.
- Lei 3: o `frontend/src/shared/types/generated.ts` só muda por
  `docker compose exec -T app php artisan typescript:transform`, e a task que regenera ajusta os
  consumidores no mesmo commit.
- Lei 6: PrimeReact só via `shared/ui`; feature não importa outra feature, nem para tipo.
- Mensagem de backend só em `backend/lang/{en,es_CL,pt_BR}`, com paridade. Locales do front
  (`pt-BR`, `es-CL`, `en`) com chaves idênticas, e o `es-CL` é a referência.
- Pint só nos arquivos tocados (`cd backend && ./vendor/bin/pint <arquivos>`), nunca na pasta `lang/`.
- **Fronteira com a lane 38:** não tocar `backend/database/seeders/**`, `backend/app/Console/**`,
  `backend/tests/Feature/CargaInicial/**`, `backend/tests/Support/CargaInicial/**`,
  `docs/estrutura-monolito.md` (o plano da 38 o edita) nem `docs/superpowers/blocos/38-*`.
  `SnapshotTemplateData`, o `schema_version` e as chamadas atuais do `PivotAudit` ficam compatíveis.
- Comandos: backend no container da lane (`docker compose exec -T app php artisan test --filter=…`);
  frontend de `frontend/` (`pnpm test <caminho>`, `pnpm build`, `pnpm lint`).

## Review Focus

1. A cidade do emissor só com espaços (`CERTIFICATE_ISSUER_CITY="   "`) conta como vazia. A turma
   online recusa no painel (`sin_ciudad`) e no POST (422), e a presencial segue emitindo. Teste na
   Task 2.
2. Um curso com template legado (cidade e vigência) tem o template ignorado: a cidade é a do
   emissor, `valido_ate` fica nulo e o `template` do snapshot fica nulo. Teste na Task 2.
3. Um redator com os dois motivos é designado. O audit leva os dois, na ordem fixa, e o picker e a
   confirmação mostram os dois. Testes nas Tasks 5 e 6.
4. Se a lista de redatores não carregar, o redator designado não ganha a tag "Idóneo" (`motivosDe`
   devolve `null`). Teste na Task 6.
5. O preview de um curso sem descrição e sem módulos renderiza, sem a página do temário, e com a
   marca. Teste na Task 3.

---

### Task 1: Guarda do certificado já emitido (antes de qualquer mudança)

**Files:**
- Create: `backend/tests/Feature/Certification/CertificadoEmitidoIntactoTest.php`

**Interfaces:**
- Consumes: nada. Roda contra o código de `main@0740843a`, ainda intocado.
- Produces: `CertificadoEmitidoIntactoTest` verde, com a constante `HTML_ANTES_DO_BLOCO_39` (sha256
  do HTML do PDF). **Toda task seguinte roda este teste, e nenhuma muda a constante.**

- [ ] **Step 1: Escrever o teste, com a constante `HTML_ANTES_DO_BLOCO_39 = ''`.**
  - **Fixture, no `setUp`:**
    - config: `app.certificate_validation_url` = `https://valida.lotus.test`,
      `app.certificate_issuer.name` = `OTEC Viva SpA`, `app.certificate_issuer.rut` = `77.000.000-0`;
    - `IssuableEnrollmentBuilder::make()->create()`, só para as FKs;
    - template legado por `makeTemplate($courseId, ['version' => 3, 'layout_config' => ['city' => 'Valparaíso'], 'validity_months' => 24])`;
    - `Certificate::create` com uuid fixo `3f6c2a1e-8b4d-4c7a-9e2f-5d1b0a9c8e7f` e `codigo`
      `LOT-2026-1001`;
    - snapshot `schema_version: 2`: emissor `OTEC Congelada SpA` / `76.543.210-3`; aluno, curso,
      cliente e redator com nomes "Congelado" diferentes dos vivos do builder;
      `template: {version: 3, city: 'Valparaíso'}`; `ciudad_emision: 'Valparaíso'`;
      `emitido_em: '2026-08-05'`;
    - `valido_ate` `2028-08-05` e `status` `Emitido`.
  - **Conversor:** `FakeHtmlToPdf` ligado em `HtmlToPdf`, como no `CertificatePdfTest`, com
    `Http::preventStrayRequests()`.
  - **Testes:**
    - `test_html_do_certificado_emitido_e_o_mesmo_de_antes_do_bloco_39`: como admin,
      `GET /api/certificates/{id}/pdf` responde 200, e
      `assertSame(self::HTML_ANTES_DO_BLOCO_39, hash('sha256', $fake->lastHtml()))`.
    - `test_ler_o_certificado_emitido_nao_consulta_templates`:
      - força a exclusão de todo template (`withTrashed()->get()->each->forceDelete()`) e coleta o
        SQL com `DB::listen`;
      - `GET /api/certificates/{id}` e `GET /api/publico/certificados/{uuid}` respondem 200, e o
        `GET .../pdf`, feito por último, também;
      - nenhum SQL coletado contém `course_certificate_templates`;
      - o hash do HTML segue igual à constante;
      - o `show` devolve `snapshot.template.city = 'Valparaíso'` e `valido_ate = '2028-08-05'`.
    - `test_ler_o_certificado_emitido_nao_reescreve_a_linha`: os valores crus (`getRawOriginal`)
      de `snapshot`, `valido_ate`, `codigo`, `status` e `updated_at` são iguais antes e depois
      dos três GETs.
- [ ] **Step 2: Capturar o hash do código atual.**
  Run: `docker compose exec -T app php artisan test --filter=CertificadoEmitidoIntactoTest`
  Expected: FAIL só no teste do hash. A mensagem traz o sha256 atual; grave-o na constante.
- [ ] **Step 3: Rodar de novo.** Expected: 3 PASS. Docblock da constante: "sha256 do HTML que
  `main@0740843a` (antes do bloco 39) gera para este certificado. Mudar este valor é decidir que
  todo certificado já emitido reimprime diferente — decisão do João, registrada."
- [ ] **Step 4: Commit.** `test(39): guarda do certificado emitido antes da mudança`

---

### Task 2: Emissão sem template

**Files:**
- Modify: `backend/config/app.php`
- Create: `backend/app/Domains/Certification/Services/EmissionCityResolver.php`
- Delete: `backend/app/Domains/Certification/Services/CertificateTemplateResolver.php`
- Modify: `backend/app/Domains/Certification/Services/CertificateEligibility.php`
- Modify: `backend/app/Domains/Certification/Services/EmissionPanelQuery.php`
- Modify: `backend/app/Domains/Certification/Services/IssuanceContext.php`
- Modify: `backend/app/Domains/Certification/Services/CertificateSnapshotBuilder.php`
- Modify: `backend/app/Domains/Certification/Services/CertificateVigenciaResolver.php`
- Modify: `backend/app/Domains/Certification/Actions/IssueCertificateAction.php`
- Modify: `backend/app/Domains/Certification/Data/EmissionPanelTurmaData.php`
- Modify: `backend/app/Domains/Certification/Enums/EmissionBlockReason.php`
- Modify: `backend/lang/es_CL/certification.php` `backend/lang/pt_BR/certification.php` `backend/lang/en/certification.php`
- Modify: `backend/tests/Support/Certification/IssuableEnrollmentBuilder.php`
- Test: `backend/tests/Feature/Certification/IssueCertificateTest.php`
- Test: `backend/tests/Feature/Certification/CertificateEligibilityTest.php`
- Test: `backend/tests/Feature/Certification/CertificateListingTest.php`
- Test: `backend/tests/Feature/Certification/CertificateSnapshotTest.php`
- Test: `backend/tests/Feature/Certification/MensagemDeCertificadoLocalizadaTest.php`
- Modify: `backend/tests/Feature/Shared/DomainDependencyTest.php`
- Modify: `frontend/src/shared/types/generated.ts`
- Modify: `frontend/src/features/certification/components/Emission/ConfirmIssueDialog.tsx`
- Modify: `frontend/src/features/certification/hooks/useBatchIssue.test.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json` `frontend/src/shared/config/locales/pt-BR.json` `frontend/src/shared/config/locales/en.json`
- Modify: `frontend/src/shared/config/locales/plural.test.ts`

**Interfaces:**
- Consumes: `CertificadoEmitidoIntactoTest` (Task 1), que tem de seguir verde.
- Produces:
  - `App\Domains\Certification\Services\EmissionCityResolver`:
    - `public function issuerCity(): ?string`: a config aparada, ou `null` quando vazia;
    - `public function emissionCityFor(Turma $turma): ?string`: `local_aplicacao`, e na falta dele `issuerCity()`.
  - `IssuanceContext(Turma $turma, string $ciudadEmision)`, sem o template.
  - `CertificateSnapshotBuilder::build(Enrollment $enrollment, Redator $redator, CarbonInterface $emitidoEm, string $ciudadEmision): CertificateSnapshotData`.
  - `EmissionBlockReason` com os casos `SinCiudad = 'sin_ciudad'` e `SinRedactor = 'sin_redactor'`.
  - `EmissionPanelTurmaData::fromModel(Turma $turma, ?EmissionBlockReason $emissionBlocked, Collection $vigentesPorEnrollment)`, sem `template_validity_months`.
  - Chave `certification.eligibility.emission_city_missing` (campo `turma` do 422).
  - `IssuableEnrollmentBuilder` sem `semTemplate()`, `templateSemCidade()`, `template()`,
    `templateModel()` e sem o trait de template.

- [ ] **Step 1: Testes que falham.**
  - **`IssueCertificateTest`.**
    - No `setUp`, `config(['app.certificate_issuer.city' => 'Temuco'])`: valor diferente do
      default e do template legado.
    - `test_admin_emite_certificado_com_codigo_e_snapshot_do_servidor` passa a asserir
      `snapshot.template.version` null, `snapshot.template.city` null e
      `snapshot.ciudad_emision` `Temuco`.
    - Novos:
      - `test_curso_sem_template_emite_com_a_cidade_do_emissor`: 201, `ciudad_emision` `Temuco`,
        `valido_ate` null, `template` `{version: null, city: null}`.
      - `test_template_legado_do_curso_e_ignorado` (Review Focus 2): com
        `makeTemplate(course, ['version' => 2, 'layout_config' => ['city' => 'Valparaíso'], 'validity_months' => 12])`,
        resulta 201, `ciudad_emision` `Temuco`, `valido_ate` null e `template` nulo.
      - `test_turma_online_sem_cidade_do_emissor_retorna_422` (Review Focus 1), com
        `#[DataProvider]` sobre `''`, `'   '` e `null`: 422 com
        `errors.turma.0 === __('certification.eligibility.emission_city_missing')` e zero
        certificados.
      - `test_turma_presencial_emite_com_local_aplicacao_mesmo_sem_cidade_do_emissor`: config
        `''` e turma presencial com `local_aplicacao` `Rancagua` dão 201 e `ciudad_emision`
        `Rancagua`.
    - Saem: `test_template_mais_recente_com_validade_define_valido_ate`,
      `test_sem_template_retorna_422`, `test_template_sem_validade_emite_com_valido_ate_nulo`, os
      três `test_turma_online_com_*_city_*`, e os helpers `createTemplate`/`assertInvalidTemplateCity`.
  - **`CertificateEligibilityTest`.**
    - No `setUp`: config `Temuco`. Saem os cenários `curso sem template` e
      `sem cidade de emissão`, junto com as entradas deles em `MENSAGEM_DA_PORTA`. A asserção
      `'Santiago'` da linha 160 passa a ser `'Temuco'`.
    - Sai `test_template_de_um_curso_e_filtrado_na_consulta_e_nao_em_php`.
    - Novo: `test_sem_cidade_do_emissor_painel_e_emissao_concordam_e_presencial_segue`. Com a config
      `''` dentro do teste:
      - uma cadeia online sai `SinCiudad` no painel, e o `assert()` recusa com
        `emission_city_missing`;
      - uma cadeia presencial (`Rancagua`) sai `null` no painel, e o `assert()` devolve
        `ciudadEmision` `Rancagua`.
  - **`CertificateListingTest`.**
    - `test_panel_mostra_turma_sem_template_bloqueada` vira
      `test_panel_nao_bloqueia_turma_sem_template` (`emission_blocked` null).
    - `test_panel_mostra_turma_online_sem_cidade_bloqueada` vira
      `test_panel_mostra_turma_online_sem_cidade_do_emissor_bloqueada` (config `''`,
      `emission_blocked` `sin_ciudad`).
    - Saem os `makeTemplate` e as asserções de `template_validity_months` restantes.
  - **`CertificateSnapshotTest`.**
    - O `setUp` perde `->template([...])` e `templateModel()`.
    - `test_snapshot_tem_exatamente_as_chaves_e_valores_dos_models` espera `template`
      `{version: null, city: null}`.
    - Sai `test_template_persistido_nao_muda_quando_template_e_editado_e_arquivado`.
    - `test_turma_online_usa_cidade_fixa_do_template_e_nao_endereco_do_cliente` vira
      `test_turma_online_usa_cidade_do_emissor_e_nao_endereco_do_cliente`, com a config `Temuco`
      diferente da cidade do endereço do cliente.
  - **`MensagemDeCertificadoLocalizadaTest`:** a lista de chaves troca `template_not_approved` e
    `template_city_invalid` por `certification.eligibility.emission_city_missing`.
- [ ] **Step 2: Rodar.**
  Run: `docker compose exec -T app php artisan test --filter='IssueCertificateTest|CertificateEligibilityTest|CertificateListingTest|CertificateSnapshotTest|MensagemDeCertificadoLocalizadaTest'`
  Expected: FAIL nos testes novos e nos reescritos.
- [ ] **Step 3: Implementar.**
  - **`config/app.php`:** `'city' => env('CERTIFICATE_ISSUER_CITY', 'Santiago')` em
    `certificate_issuer`, com comentário: "cidade impressa no certificado de turma online; a
    presencial usa `local_aplicacao` (bloco 39 D2)".
  - **`EmissionCityResolver`** com as assinaturas acima, e o `CertificateTemplateResolver` é
    removido.
  - **`CertificateEligibility`:**
    - sai a porta do template, e as portas passam a ser cinco (cidade = 4, redator = 5). Renumere o
      docblock dele, o do `EmissionPanelQuery` e o do `EmissionBlockReason`;
    - a porta da cidade recusa por `refuse('turma', __('certification.eligibility.emission_city_missing'))`.
  - **`EmissionPanelQuery::emissionBlockedFor(Turma $turma): ?EmissionBlockReason`:** `SinCiudad`
    quando o resolver devolve `null`, senão `SinRedactor` sem redatores, senão `null`.
  - **`IssueCertificateAction`** grava `'valido_ate' => null`.
  - **`CertificateSnapshotBuilder`** grava `new SnapshotTemplateData(version: null, city: null)`.
  - **Docblocks** que citam o `CertificateTemplateResolver` (`CertificateVigenciaResolver`,
    `EmissionPanelTurmaData`, `CertificateSnapshotBuilder`) passam a citar o
    `EmissionCityResolver`.
  - **Lang, nos três arquivos:** sai `eligibility.template_not_approved`, e
    `eligibility.template_city_invalid` vira `eligibility.emission_city_missing`:
    - es_CL: `No hay una ciudad de emisión configurada para esta clase.`
    - pt_BR: `Não há uma cidade de emissão configurada para esta turma.`
    - en: `No issuing city is configured for this class.`
  - **`IssuableEnrollmentBuilder`:** sai toda a maquinaria de template, inclusive a entrada
    `templateSemCidade()` do `assertSemColisaoDePorta`. O docblock passa a falar em "cinco portas".
  - **`DomainDependencyTest`:** sai `'Catalog\Models\CourseCertificateTemplate'` da linha
    `Certification` do `ALLOWED`.
- [ ] **Step 4: Rodar.**
  Run: o filtro do Step 2 + `--filter='CertificadoEmitidoIntactoTest|DomainDependencyTest|BatchIssueTest|CertificatePdfTest'`
  Expected: PASS.
- [ ] **Step 5: Regenerar os tipos e ajustar os consumidores no mesmo commit.**
  - Run: `docker compose exec -T app php artisan typescript:transform`. O `generated.ts` sai com
    `EmissionBlockReason = 'sin_ciudad' | 'sin_redactor'` e sem `template_validity_months`.
  - `ConfirmIssueDialog.tsx`: `vigencia = t('certificate.vigenciaIndefinida')`, sempre.
  - `useBatchIssue.test.tsx`: sai `template_validity_months` da fixture.
  - Locales: `certificate.blocked.sin_plantilla` sai, e `plantilla_sin_ciudad` vira `sin_ciudad`:
    - es-CL: `Sin ciudad de emisión configurada`
    - pt-BR: `Sem cidade de emissão configurada`
    - en: `No issuing city configured`

    Saem também `certificate.vigenciaMeses_one` e `certificate.vigenciaMeses_other` dos três.
  - `plural.test.ts`: sai `'certificate.vigenciaMeses'`.
  - Run (de `frontend/`): `pnpm build && pnpm lint && pnpm test`. Expected: PASS.
- [ ] **Step 6: Suíte e formatação.**
  - `cd backend && ./vendor/bin/pint` nos PHP tocados, um a um.
  - `git diff -w --stat main...HEAD -- backend/lang/` igual ao diff cru.
  - Run: `docker compose exec -T app php artisan test`. Expected: PASS.
- [ ] **Step 7: Commit.** `feat(39): emissão sem template por curso`

---

### Task 3: Preview do certificado do curso (backend)

**Files:**
- Create: `backend/app/Domains/Certification/Http/Controllers/CertificatePreviewController.php`
- Create: `backend/app/Domains/Certification/Services/CertificatePreviewBuilder.php`
- Modify: `backend/app/Domains/Certification/Services/CertificatePdfService.php`
- Modify: `backend/app/Domains/Certification/Services/CertificateSnapshotBuilder.php`
- Modify: `backend/app/Domains/Certification/routes.php`
- Modify: `backend/resources/views/certification/certificate.blade.php`
- Modify: `backend/tests/Feature/Shared/ListQueryBudgetTest.php`
- Test: `backend/tests/Feature/Certification/CertificatePreviewTest.php`

**Interfaces:**
- Consumes: `EmissionCityResolver::issuerCity(): ?string` (Task 2) e `CertificadoEmitidoIntactoTest`
  (Task 1), que tem de seguir verde: o HTML do certificado real não muda nem um byte.
- Produces:
  - rota `GET /api/courses/{course}/certificate-preview` (`whereNumber('course')`), que responde
    200 com `application/pdf` inline;
  - `CertificatePdfService::TEXTO_MUESTRA = 'MUESTRA — SIN VALIDEZ'` e
    `CertificatePdfService::renderMuestra(Certificate $certificate): string`;
  - `CertificatePreviewBuilder::build(Course $course): Certificate`, que devolve o model não
    persistido;
  - `CertificateSnapshotBuilder::curso(Course $course): SnapshotCourseData`, a mesma projeção que o
    `build()` usa, extraída.

- [ ] **Step 1: Testes que falham (`CertificatePreviewTest`)**, com `FakeHtmlToPdf` e config de
  cidade `Temuco`.
  - `test_preview_devolve_pdf_inline_com_a_marca_e_os_dados_do_curso`. Curso com nome, nome
    técnico, descrição e dois módulos. Resposta:
    - 200, `Content-Type` `application/pdf` e `Content-Disposition` contendo
      `certificado-muestra-{id}.pdf`;
    - o HTML contém `MUESTRA — SIN VALIDEZ`, `N° MUESTRA`, o nome do curso, os dois módulos e
      `Temuco`;
    - o HTML não contém `/validar/`.
  - `test_preview_nao_grava_nem_consome_numero`: as contagens de `certificates`, `audits` e
    `certificate_sequences` não mudam com a chamada.
  - `test_preview_sem_permissao_retorna_403`: usuário com a role `redator` recebe 403.
  - `test_preview_de_curso_arquivado_retorna_404`.
  - `test_preview_de_curso_sem_descricao_e_sem_modulos_renderiza` (Review Focus 5): responde 200,
    a marca está lá, e a marcação do temário (`temario-head`) não está.
  - `test_pdf_de_certificado_real_nao_carrega_a_marca`: o PDF de um certificado gravado não
    contém `MUESTRA — SIN VALIDEZ`.
- [ ] **Step 2: Rodar.**
  Run: `docker compose exec -T app php artisan test --filter=CertificatePreviewTest`
  Expected: FAIL, porque a rota ainda não existe e responde 404.
- [ ] **Step 3: Implementar.**
  - **`CertificateSnapshotBuilder::curso()`:** extraído do `build()`, sem mudar a projeção
    (módulos por `sort_order`).
  - **`CertificatePreviewBuilder::build()`** devolve `new Certificate([...])`, nunca `create`. O
    curso vem com `loadMissing('modules')`. Os dados fictícios (cópia exata):

    | Campo | Valor |
    |---|---|
    | aluno | `NOMBRE APELLIDO DEL ALUMNO` / `11.111.111-1` |
    | cliente | `EMPRESA DE EJEMPLO SpA` / `33.333.333-3` |
    | redator | `NOMBRE DEL RELATOR` / `22.222.222-2` |
    | turma | `id` null; `start_date` e `end_date` = `FusoDoNegocio::hoje()`; `modalidade` `online` |
    | resultado | `grades: {"final": 7.0}`, `aprobado`, `attendance_pct` `100.00` |

    O restante:
    - emissor da config; `template` `{null, null}`; `ciudad_emision` = `issuerCity()`;
      `emitido_em` = hoje;
    - `codigo` `MUESTRA` e `valido_ate` null;
    - `schema_version` = `CertificateSnapshotData::CURRENT_VERSION`.
  - **`CertificatePdfService`:**
    - `render()` mantém o comportamento;
    - `renderMuestra()` usa o mesmo caminho, com `private function html(Certificate $certificate, bool $muestra): string`;
    - o conteúdo do QR é calculado DEPOIS do `assertPresentable`, como hoje: `TEXTO_MUESTRA` na
      amostra, `validationUrl->para()` no real;
    - a view recebe `'muestra' => $muestra ? self::TEXTO_MUESTRA : null`.
  - **Blade:**
    - logo depois de `<body>`, na coluna 0, entra
      `@if ($muestra !== null)` + um `<div>` com estilo inline (`position: fixed`, centralizado,
      rotacionado, vermelho translúcido, `z-index` alto) imprimindo `{{ $muestra }}` + `@endif`;
    - CSS só inline, dentro do `@if`, e nenhuma outra linha do Blade muda. Assim, o HTML do
      certificado real sai idêntico byte a byte (Task 1).
  - **`CertificatePreviewController`:**
    - `HasMiddleware` com `permission:certification.certificate.view`;
    - método `show(Course $course, CertificatePreviewBuilder $builder, CertificatePdfService $pdf): Response`,
      com os headers da Global Constraints.
  - **Rota:** no grupo `auth.active` de `Certification/routes.php`, com `throttle:certificate-pdf`.
  - **`ListQueryBudgetTest::COM_PAI_ISENTAS`:**
    `'api/courses/{course}/certificate-preview' => 'gera o PDF de amostra de UM curso — resposta binária, não lista'`.
- [ ] **Step 4: Rodar.**
  Run: `--filter='CertificatePreviewTest|CertificadoEmitidoIntactoTest|CertificatePdfTest|ListQueryBudgetTest|ThrottledRouteRatchetTest|AuthenticatedRouteMiddlewareTest|DomainDependencyTest'`
  Expected: PASS. Depois, a suíte inteira.
- [ ] **Step 5: Pint e commit.** Pint nos PHP tocados. `feat(39): preview do certificado do curso`

---

### Task 4: O template sai da API do catálogo

**Files:**
- Modify: `backend/app/Domains/Catalog/routes.php`
- Delete: `backend/app/Domains/Catalog/Http/Controllers/CourseTemplateController.php`
- Delete: `backend/app/Domains/Catalog/Actions/CreateCertificateTemplateAction.php`
- Delete: `backend/app/Domains/Catalog/Data/CertificateTemplateData.php`
- Modify: `backend/app/Domains/Catalog/Data/CourseData.php`
- Modify: `backend/app/Domains/Catalog/Actions/CreateCourseAction.php`
- Modify: `backend/app/Domains/Catalog/Actions/UpdateCourseAction.php`
- Modify: `backend/app/Domains/Catalog/QueryBuilders/CourseQueryBuilder.php`
- Modify: `backend/app/Domains/Catalog/Models/Course.php`
- Test: `backend/tests/Feature/Cadastros/CourseCrudTest.php`
- Delete: `backend/tests/Feature/Cadastros/CourseTemplateTest.php`
- Test: `backend/tests/Feature/Cadastros/CourseArchiveEndpointTest.php`
- Modify: `backend/tests/Feature/Shared/ListQueryBudgetTest.php`
- Modify: `frontend/src/shared/types/generated.ts`
- Modify: `frontend/src/features/catalog/components/Course/CoursesTable.test.tsx`
- Modify: `frontend/src/features/catalog/hooks/useCourseForm.ts`
- Modify: `docs/der-fisico.md` `docs/adrs.md`
- Modify: `.claude/rules/backend-ddd.md` `.claude/rules/generated-types.md`

**Interfaces:**
- Consumes: nada das outras tasks.
- Produces: `CourseData` sem `templates` (entrada e saída); `generated.ts` sem
  `CertificateTemplateData`; as três rotas de template respondem 404.

- [ ] **Step 1: Testes que falham.**
  - **`CourseCrudTest`.**
    - Novos:
      - `test_rotas_de_template_respondem_404_e_nao_tocam_o_legado`: com um template legado
        criado por `makeTemplate`, `POST /api/courses/{id}/templates`,
        `PUT /api/templates/{tid}` e `DELETE /api/templates/{tid}` respondem 404, e o template
        fica `assertNotSoftDeleted`.
      - `test_payload_com_templates_nao_grava_template_nem_devolve_a_chave`: um `POST /api/courses`
        com `templates` responde 201, com `assertJsonMissingPath('templates')` e
        `assertDatabaseCount('course_certificate_templates', 0)`.
      - `test_editar_curso_com_templates_vazio_nao_arquiva_o_legado`: o `PUT` com
        `'templates' => []` responde 200, e o template legado segue sem soft-delete. Antes, esse
        payload arquivava tudo.
    - Sai `test_cria_curso_com_template`, e `test_lista_mostra_edita_remove` perde payloads e
      asserções de template.
  - **`CourseArchiveEndpointTest`:**
    `test_arquivado_mostra_modulos_e_templates_que_a_cascata_levou` vira
    `test_arquivado_mostra_os_modulos_que_a_cascata_levou`, sem a contagem de templates e com
    `assertJsonMissingPath('0.course.templates')`.
  - **`CourseTemplateTest.php`** é apagado.
- [ ] **Step 2: Rodar.**
  Run: `--filter='CourseCrudTest|CourseArchiveEndpointTest'`. Expected: FAIL.
- [ ] **Step 3: Implementar.**
  - **Sai:** as três rotas e os três arquivos deletados; `$templates` do `CourseData` (construtor
    e `fromModel`); o bloco de templates do `CreateCourseAction` e do `UpdateCourseAction`,
    junto com a injeção do `CreateCertificateTemplateAction`.
  - **`CourseQueryBuilder`:** `LISTING = ['redatores', 'modules']`, `CASCADED = ['modules']`. A
    cascata do `Course::booted()` não muda.
  - **Docblock do `Course`:** "Templates de certificado: legado desde o bloco 39 — nenhuma leitura
    nem escrita da aplicação; a relação e a cascata de arquivamento ficam por rastro."
  - **`ListQueryBudgetTest`:** o motivo de `'api/courses/{course}'` passa a
    `'detalhe de UM curso — módulos são coleções bounded do próprio curso'`.
- [ ] **Step 4: Rodar.**
  Run: o filtro do Step 2 + `--filter='CourseModelTest|ArchiveCascadeMarkTest|RestoreCascadeTest|PersistenceLawsTest|ListQueryBudgetTest'`
  Expected: PASS. Os testes de cascata não mudam.
- [ ] **Step 5: Regenerar os tipos e ajustar os consumidores.**
  - `docker compose exec -T app php artisan typescript:transform`.
  - `CoursesTable.test.tsx`: sai `templates: []` do `CURSO`.
  - `useCourseForm.ts`: as linhas 12–13 dizem que `templates` saiu do contrato no bloco 39.
  - Run (de `frontend/`): `pnpm build && pnpm lint && pnpm test`. Expected: PASS.
- [ ] **Step 6: Docs normativos.**
  - `docs/der-fisico.md:34`: prefixo "**Legado desde o bloco 39 (2026-10-17):** nenhuma leitura nem
    escrita da aplicação; a emissão usa o Blade padrão. Tabela, dados e cascata ficam por rastro."
  - `docs/adrs.md`: emenda datada depois da linha 336 ("o `CreateCertificateTemplateAction` saiu
    com o CRUD de template no bloco 39; o padrão segue valendo"), e em `:580`, "templates como
    config versionada do curso (legado desde o bloco 39)".
  - `docs/estrutura-monolito.md` **não** é tocado: o plano da lane 38 o edita (o `lane.sh conferir`
    acusou o conflito em 2026-10-17). A linha 49 ("templates de certificado") continua verdadeira,
    porque model e tabela ficam.
  - `.claude/rules/backend-ddd.md:17`: Catalog = "cursos, módulos (templates de certificado: legado,
    só rastro, desde o bloco 39)".
  - `.claude/rules/backend-ddd.md:65` e `.claude/rules/generated-types.md:35`: a referência
    `CourseData::$templates`/`$modules` vira `CourseData::$modules`.
  - Run (de `frontend/`): `pnpm test tests/repo-docs-refs.test.ts`. Expected: PASS.
- [ ] **Step 7: Suíte, pint e commit.** Suíte backend inteira PASS, pint nos PHP tocados.
  `refactor(39): template sai da API do catálogo`

---

### Task 5: A RN-09 vira aviso no backend, com ruling

**Files:**
- Create: `backend/app/Domains/Operation/Enums/MotivoInidoneidade.php`
- Modify: `backend/app/Domains/Operation/Services/RedatorIdoneidadeService.php`
- Modify: `backend/app/Domains/Operation/Actions/DesignateRedatorAction.php`
- Delete: `backend/app/Domains/Operation/Exceptions/RedatorNaoElegivelException.php`
- Modify: `backend/app/Shared/Audit/PivotAudit.php`
- Modify: `backend/app/Domains/Identity/Enums/RedatorDocumentType.php`
- Modify: `backend/lang/es_CL/operation.php` `backend/lang/pt_BR/operation.php` `backend/lang/en/operation.php`
- Test: `backend/tests/Feature/Operation/TurmaDesignationTest.php`
- Test: `backend/tests/Feature/Operation/RedatorIdoneidadeServiceTest.php`
- Test: `backend/tests/Feature/Operation/MensagemDeOperacaoLocalizadaTest.php`
- Test: `backend/tests/Feature/Shared/PivotAuditTest.php`
- Modify: `frontend/src/shared/types/generated.ts`
- Create: `docs/superpowers/blocos/39-certificado-e-redator-sem-trava/ruling-rn09.md`

**Interfaces:**
- Consumes: nada das outras tasks.
- Produces:
  - `enum MotivoInidoneidade: string { case NaoHabilitado = 'not_qualified'; case ReufInvalido = 'reuf_invalid'; }`.
  - `RedatorIdoneidadeService::motivos(Redator $redator, Course $course): array`. Devolve uma
    `list<MotivoInidoneidade>`, na ordem `NaoHabilitado`, `ReufInvalido`. O `isEligible()` fica,
    como `motivos() === []`.
  - `PivotAudit::syncWithoutDetaching(Model&Auditable $model, string $relation, array $ids, array $contexto = []): void`.
    O `$contexto` é mesclado no `new_values` da mesma linha, e a chave da relação sempre vence
    (`[$relation => $depois] + $contexto`).
  - `generated.ts`: `MotivoInidoneidade = 'not_qualified' | 'reuf_invalid'`, que a Task 6 consome.

- [ ] **Step 1: Testes que falham.**
  - **`TurmaDesignationTest`.** Os três `*_recusa_422` viram, cada um, uma designação 200 com
    linha no pivot, e o último audit `sync` da turma traz
    `json_decode(new_values, true)['inidoneidade'][$r->id]` igual ao motivo nomeado:
    - `test_redator_sem_reuf_e_designado_e_o_audit_guarda_o_motivo` → `['reuf_invalid']`;
    - `test_redator_reuf_vencido_e_designado_e_o_audit_guarda_o_motivo` → `['reuf_invalid']`;
    - `test_redator_nao_habilitado_e_designado_e_o_audit_guarda_o_motivo` → `['not_qualified']`.

    Novos:
    - `test_redator_com_os_dois_motivos_e_designado_e_o_audit_guarda_os_dois` (Review Focus 3) →
      `['not_qualified', 'reuf_invalid']`;
    - `test_redator_idoneo_nao_ganha_chave_de_inidoneidade_no_audit`: as chaves de `new_values`
      são exatamente `['redatores']`;
    - `test_redator_arquivado_depois_de_carregado_continua_recusado`: no nível da Action, o
      redator é carregado e depois arquivado. O `execute` lança `ValidationException` com
      `errors()['redator'][0] === __('identity.errors.redator_archived')`, e o pivot fica sem a
      linha.

    O `test_turma_concluida_recusa_antes_de_avaliar_idoneidade` fica como está.
  - **`RedatorIdoneidadeServiceTest`** passa para `motivos()`. Os casos:
    - habilitado com REUF futuro → `[]`;
    - REUF com validade nula → `[]`;
    - sem REUF → `[ReufInvalido]`;
    - REUF vencido → `[ReufInvalido]`, e `isEligible` false;
    - não habilitado com REUF válido → `[NaoHabilitado]`;
    - os dois → `[NaoHabilitado, ReufInvalido]`.
  - **`PivotAuditTest`.** Novos:
    - `test_sync_without_detaching_mescla_o_contexto_na_mesma_linha`: uma audit só, com
      `new_values === ['redatores' => [$r->id], 'inidoneidade' => [$r->id => ['reuf_invalid']]]`;
    - `test_contexto_nao_sobrescreve_o_conjunto`: um contexto com a chave `redatores` não altera
      o conjunto gravado;
    - `test_contexto_em_acrescimo_sem_mudanca_nao_grava`: o redator já ligado com contexto não
      grava audit nova.
  - **`MensagemDeOperacaoLocalizadaTest`:** saem as duas asserções da exceção removida. O
    `as_quatro_recusam_por_regra_de_negocio` vira
    `as_recusas_de_configuracao_de_turma_sao_regra_de_negocio`, com as duas
    `TurmaConfiguracaoException`.
- [ ] **Step 2: Rodar.**
  Run: `--filter='TurmaDesignationTest|RedatorIdoneidadeServiceTest|PivotAuditTest|MensagemDeOperacaoLocalizadaTest'`
  Expected: FAIL.
- [ ] **Step 3: Implementar.**
  - **Enum, serviço e `PivotAudit`** conforme Produces. O `assertEligible` sai.
  - **`DesignateRedatorAction`:** a ordem fica `assertAcademicallyWritable` → transação →
    `lockForWrite` → `motivos()` → `syncWithoutDetaching($turma, 'redatores', [$redator->id], $contexto)`,
    com `$contexto = ['inidoneidade' => [$redator->id => <valores dos motivos>]]` só quando há
    motivo. O docblock da classe passa a dizer "designa 1 redator; idoneidade é aviso auditado
    (ruling RN-09 do bloco 39)".
  - **Docblock do serviço:** cita `docs/superpowers/blocos/39-certificado-e-redator-sem-trava/ruling-rn09.md`.
  - **A exceção** é apagada, e o bloco `redator` sai dos três `lang/*/operation.php`.
  - **`RedatorDocumentType.php:19`:** o comentário cita `RedatorIdoneidadeService::motivos()` em
    vez do `temReufValido` privado.
  - **`ruling-rn09.md`**, com este texto:

    ```markdown
    # Ruling — RN-09 (idoneidade do redator) vira aviso

    > Bloco 39. Decisão do João Victor em 2026-10-17, na abertura do bloco (`spec.md` §1, D7–D10).
    > O Drive (requisitos) vence sobre os `/docs`: até o João refletir esta decisão lá (item 1 da
    > `## Verificação externa` da spec), o Drive descreve uma trava que o código não aplica.

    ## Regra anterior

    Spec do bloco 6b (`docs/superpowers/specs/archive/2026-07-21-bloco6b-turma-designacao-design.md`,
    D3, decisão do João em 2026-07-21): o redator só era designado à turma se estivesse habilitado
    ao curso (`course_redator`) **e** tivesse REUF válido (`valid_until` nulo vale sempre; só o
    vencido reprova). CV e título não contavam. A recusa era 422 (`RedatorNaoElegivelException`).
    A habilitação redator↔curso nunca teve essa trava.

    ## Decisão

    A idoneidade não trava mais a designação redator→turma. Os mesmos dois critérios viram motivos
    de aviso: `not_qualified` (não habilitado ao curso) e `reuf_invalid` (REUF ausente ou vencido).
    A tela mostra o motivo e pede confirmação; a API aceita. Continuam travando, porque não são
    RN-09: turma concluída (RN-15) e redator arquivado.

    ## Rastro

    A designação de um redator com motivo grava os motivos daquele instante na mesma linha de audit
    da designação: `new_values.inidoneidade = {"<redator_id>": [...]}`. A designação idônea grava a
    linha de sempre.

    ## Pendência

    Refletir no Drive (requisitos, `Viagem Chile/Projetos/Lotus.cl/V2`): ação do João.
    ```
- [ ] **Step 4: Rodar.** Run: o filtro do Step 2, e depois a suíte inteira, com o
  `LocaleParityTest` e o `MensagemLiteralTest` dentro dela. Expected: PASS.
- [ ] **Step 5: Regenerar os tipos.**
  `docker compose exec -T app php artisan typescript:transform`. O tipo
  `MotivoInidoneidade` aparece no `generated.ts`, e nenhum consumidor muda. Run (de `frontend/`):
  `pnpm build`. Expected: PASS.
- [ ] **Step 6: Pint e commit.** Pint nos PHP tocados, um a um. `feat(39): idoneidade do redator vira aviso`

---

### Task 6: Aviso de idoneidade no front

**Files:**
- Modify: `frontend/src/features/operation/lib/eligibility.ts`
- Test: `frontend/src/features/operation/lib/eligibility.test.ts`
- Modify: `frontend/src/features/operation/hooks/useRedatorPicker.ts`
- Test: `frontend/src/features/operation/hooks/useRedatorPicker.test.tsx`
- Modify: `frontend/src/features/operation/components/Turma/RedatorDesignation.tsx`
- Create: `frontend/src/features/operation/components/Turma/RedatorPickerBody.tsx`
- Test: `frontend/src/features/operation/components/Turma/RedatorDesignation.test.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json` `frontend/src/shared/config/locales/pt-BR.json` `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `MotivoInidoneidade` de `@shared/types/generated` (Task 5).
- Produces:
  - `motivosInidoneidade(redator: RedatorData, courseId: number): MotivoInidoneidade[]`, na mesma
    ordem do backend. O `isEligible` sai, porque fica sem consumidor.
  - `export type RedatorPickerOption = { redator: RedatorData; motivos: MotivoInidoneidade[] }`.
  - `useRedatorPicker(turma)` devolve:

    ```ts
    {
      options: RedatorPickerOption[]                                // todos os não designados
      motivosDe: (redatorId: number) => MotivoInidoneidade[] | null // null = lista não carregada ou redator fora dela
      pendingConfirmation: RedatorPickerOption | null
      pick: (redatorId: number) => boolean // true = designou direto; false = abriu a confirmação
      confirmPick: () => void
      cancelPick: () => void
      loadingList; loadError; reloadList; remove; pending; error   // como hoje
    }
    ```

- [ ] **Step 1: `eligibility.test.ts`**, com o relógio fixo em 2026-10-17 e o curso 9:
  - habilitado com REUF `2030-01-01` → `[]`;
  - habilitado com REUF `null` → `[]`;
  - habilitado sem REUF → `['reuf_invalid']`;
  - habilitado com REUF `2020-01-01` → `['reuf_invalid']`;
  - habilitado com REUF `'lixo'` → `['reuf_invalid']`;
  - não habilitado com REUF válido → `['not_qualified']`;
  - não habilitado sem REUF → `['not_qualified', 'reuf_invalid']`.
- [ ] **Step 2: `useRedatorPicker.test.tsx`**, com `renderHook` e `vi.mock` de
  `@shared/api/redatoresApi` (`useList`) e de `../api/useTurmas` (`mutate: vi.fn()`):
  - lista todos os não designados, cada um com seus motivos, e o inidôneo aparece;
  - `pick` de um idôneo devolve `true`, chama `mutate({ turmaId, redatorId })` e não deixa
    confirmação pendente;
  - `pick` de um inidôneo devolve `false`, não chama `mutate`, e
    `pendingConfirmation = { redator, motivos }`;
  - `confirmPick` chama `mutate` com o pendente e limpa a confirmação; `cancelPick` limpa sem
    chamar;
  - `motivosDe` devolve os motivos de um designado, e `null` com a lista não carregada (Review
    Focus 4).
- [ ] **Step 3: `RedatorDesignation.test.tsx`.**
  - O `beforeEach` do mock ganha os campos novos: `options: []`, `motivosDe: () => []`,
    `pendingConfirmation: null`, `pick: vi.fn(() => true)`, `confirmPick: vi.fn()` e
    `cancelPick: vi.fn()`. O `t` do arquivo passa a ser `(k, o) => (o ? \`${k}|${JSON.stringify(o)}\` : k)`.
  - Os testes que já existem seguem verdes.
  - Novos:
    - designado com `motivosDe → ['reuf_invalid']` mostra `operation.redator.motivo.reuf_invalid`
      e não mostra `operation.redator.idoneo`;
    - com `motivosDe → null`, não aparece tag nenhuma;
    - no picker aberto, a opção inidônea traz a tag de cada motivo;
    - com `pendingConfirmation` (os dois motivos), o diálogo
      `operation.redator.confirmIneligibleTitle` aparece, e a mensagem traz as duas chaves de
      motivo. `operation.redator.confirmIneligibleAction` chama `confirmPick`, e `common.cancel`
      chama `cancelPick`.
- [ ] **Step 4: Rodar.**
  Run (de `frontend/`): `pnpm test src/features/operation`. Expected: FAIL.
- [ ] **Step 5: Implementar.**
  - **`eligibility.ts`** conforme Produces.
  - **`useRedatorPicker`:** o estado da confirmação fica num `useState` do próprio hook.
  - **`RedatorPickerBody.tsx`:** recebe o `PickerBody` por movimento literal, mais as tags por
    opção (`AppTag severity="warning"`). Props: `{ picker: Picker; onPick: (redatorId: number) => void }`.
  - **`RedatorDesignation.tsx`:**
    - `onPick={(id) => { if (picker.pick(id)) setOpen(false) }}`;
    - `ConfirmDialog` de `shared/ui` com `visible={picker.pendingConfirmation !== null}` e a
      mensagem interpolando os motivos traduzidos, unidos por `, `. Ao confirmar,
      `picker.confirmPick(); setOpen(false)`. Ao cancelar, `picker.cancelPick`;
    - a tag de cada designado segue `motivosDe`: `[]` mostra "Idóneo" (success), motivos mostram
      um warning cada, e `null` não mostra tag;
    - o componente fica abaixo de 150 linhas.
  - **Locales** (`operation.redator`, cópia exata):

    | chave | es-CL | pt-BR | en |
    |---|---|---|---|
    | `helpNote` | Se listan todos los redactores. Los que no cumplen la idoneidad (RN-09) aparecen con aviso y piden confirmación. | Todos os redatores aparecem. Quem não cumpre a idoneidade (RN-09) aparece com aviso e pede confirmação. | All redatores are listed. Those who do not meet suitability (RN-09) show a warning and ask for confirmation. |
    | `pickerTitle` | Designar redactor | Designar redator | Assign redator |
    | `pickerEmpty` | No hay redactores disponibles para designar. | Nenhum redator disponível para designar. | No redatores available to assign. |
    | `motivo.not_qualified` | No habilitado para el curso | Não habilitado ao curso | Not enabled for the course |
    | `motivo.reuf_invalid` | Sin REUF vigente | Sem REUF vigente | No valid REUF |
    | `confirmIneligibleTitle` | Designar con aviso de idoneidad | Designar com aviso de idoneidade | Assign with suitability warning |
    | `confirmIneligibleMessage` | No cumple la idoneidad (RN-09): {{motivos}}. ¿Designar de todos modos? | Não cumpre a idoneidade (RN-09): {{motivos}}. Designar mesmo assim? | Does not meet suitability (RN-09): {{motivos}}. Assign anyway? |
    | `confirmIneligibleAction` | Designar de todos modos | Designar mesmo assim | Assign anyway |
- [ ] **Step 6: Gate.**
  Run (de `frontend/`): `pnpm build && pnpm lint && pnpm test`. Expected: PASS.
- [ ] **Step 7: Commit.** `feat(39): aviso de idoneidade na designação`

---

### Task 7: Amostra do certificado na tabela de cursos

**Files:**
- Create: `frontend/src/features/catalog/api/useCertificatePreview.ts`
- Create: `frontend/src/features/catalog/hooks/useCertificatePreviewOpener.ts`
- Modify: `frontend/src/features/catalog/components/Course/CourseRowActions.tsx`
- Test: `frontend/src/features/catalog/components/Course/CourseRowActions.test.tsx`
- Modify: `frontend/src/features/catalog/components/Course/CoursesTable.tsx`
- Test: `frontend/src/features/catalog/components/Course/CoursesTable.test.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json` `frontend/src/shared/config/locales/pt-BR.json` `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: a rota `GET /api/courses/{course}/certificate-preview` (Task 3); `useBlobTabOpener`
  e `problemFromBlob` de `shared/`.
- Produces:
  - `useCertificatePreview(): UseMutationResult<Blob, ProblemDetails, number>`, na forma do
    `useCertificatePdf` de `shared/api/certificatesApi.ts`;
  - `useCertificatePreviewOpener()`, que devolve
    `{ open(courseId: number), pending, popupBlocked, message }`.

- [ ] **Step 1: Testes que falham.**
  - **`CourseRowActions.test.tsx`**, com mock do opener no molde do
    `StudentCertificateCellPdf.test.tsx` e permissões pela sessão:
    - com `certification.certificate.view`, o botão `course.certificatePreview` aparece, e o
      clique chama `open(1)`;
    - sem a permissão, não aparece;
    - `archived` com a permissão, não aparece;
    - com `popupBlocked`, aparece o texto `certificate.popupBlocked`; com `message`, aparece a
      mensagem.
  - **`CoursesTable.test.tsx`:** novo caso com `catalog.course.delete` e
    `certification.certificate.view`. A coluna mede `12rem`, e os três botões aparecem. O caso de
    `9rem`, que não tem a permissão da amostra, fica como está.
- [ ] **Step 2: Rodar.**
  Run (de `frontend/`): `pnpm test src/features/catalog`. Expected: FAIL.
- [ ] **Step 3: Implementar.**
  - **API e opener** conforme Produces.
  - **`CourseRowActions`:** passa
    `leading=[{ label: t('course.certificatePreview'), icon: 'pi pi-file-pdf', onClick: () => preview.open(course.id!), disabled: preview.pending }]`
    só com `can('certification.certificate.view')`. O aviso de popup ou erro sai abaixo, na
    forma do `StudentCertificateCell` (`dangerText`).
  - **`CoursesTable`:**
    `useCollapsibleActionsColumn(archived ? '10rem' : podeVerAmostra ? '12rem' : '9rem')`, com
    `podeVerAmostra = can('certification.certificate.view')`.
  - **Locale `course.certificatePreview`:** es-CL `Ver certificado de muestra`, pt-BR
    `Ver certificado de amostra`, en `View sample certificate`.
- [ ] **Step 4: Gate.**
  Run (de `frontend/`): `pnpm build && pnpm lint && pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `feat(39): amostra do certificado na tabela de cursos`

---

### Task 8: Verificação final e smoke na lane

**Files:**
- Create: `docs/superpowers/blocos/39-certificado-e-redator-sem-trava/smoke.md`

**Interfaces:**
- Consumes: as Tasks 1 a 7.
- Produces: `smoke.md`, com a evidência de cada item (data, commit, OK/FALHA e o que foi visto).

- [ ] **Step 1: Suíte backend inteira.** Run: `docker compose exec -T app php artisan test`.
  Expected: PASS. Anote a contagem.
- [ ] **Step 2: Tipos sem drift.** Run:
  `docker compose exec -T app php artisan typescript:transform && git diff --exit-code frontend/src/shared/types/generated.ts`.
  Expected: exit 0.
- [ ] **Step 3: Frontend.** Run (de `frontend/`): `pnpm build && pnpm lint && pnpm test`.
  Expected: PASS.
- [ ] **Step 4: Formatação.**
  - `git diff -w --stat main...HEAD -- backend/lang/` igual ao diff cru.
  - `cd backend && ./vendor/bin/pint --test` nos PHP de `git diff --name-only main...HEAD -- backend`.
  - Expected: nada a reformatar.
- [ ] **Step 5: Smoke no stack da lane** (offset +1: HTTP 8081, Vite 5174, volume próprio).
  - Suba com `docker compose up -d`, `docker compose exec -T app php artisan migrate`,
    `docker compose exec -T app php artisan db:seed` e `pnpm dev`.
  - Pela UI:
    1. Emisión: um certificado de turma **online** concluída, de curso sem template, sai com
       `Santiago` no PDF.
    2. Emisión: uma turma **presencial** sai com a cidade do `local_aplicacao`.
    3. Cursos: "Ver certificado de muestra" abre o PDF com a marca `MUESTRA — SIN VALIDEZ` e o
       temário do curso.
    4. Turma em andamento: o redator sem REUF aparece no picker com a tag. A confirmação aparece;
       ao confirmar, ele é designado com a tag de aviso, e a linha de `audits` (`event = sync`)
       traz `inidoneidade`.

  Grave cada item no `smoke.md`.
- [ ] **Step 6: Commit.** `test(39): smoke na lane`

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 3, 5 | sim | nenhuma entre elas |
| G2 | 4, 6 | sim | nenhuma entre elas |

A ordem é 1 → 2 → G1 → G2 → 7 → 8. Task fora de grupo executa e revisa uma a uma.

Validação por par:
- **3 × 5:** a 3 toca só Certification, o Blade, `Certification/routes.php` e o
  `ListQueryBudgetTest`. A 5 toca Operation, `Shared/Audit/PivotAudit.php`, o enum de Identity, o
  `lang/*/operation.php`, o `generated.ts` e o ruling. A interseção é vazia. A 3 consome a Task 2,
  e a 5 não consome nem produz nada para a 3.
- **4 × 6:** a 4 toca Catalog, o `ListQueryBudgetTest`, o `generated.ts`, `CoursesTable.test.tsx`,
  `useCourseForm.ts`, docs e rules. A 6 toca `features/operation` e os três locales. A interseção é
  vazia. A 6 consome a Task 5, e entre a 4 e a 6 não há aresta.
- **Fora de grupo, e por quê:**
  - 1 precede todas, porque o hash tem de ser medido no código intocado.
  - 2 mexe no `CertificateSnapshotBuilder` (também da 3), no `generated.ts` (também da 4 e da 5)
    e nos locales (também da 6 e da 7).
  - 7 divide os locales com a 6 e o `CoursesTable.test.tsx` com a 4, e consome a 3.
  - 8 consome todas.

## Handoff de execução

- **executor:** `claude`. O bloco toca as leis 3 e 6, documento de peso legal e uma regra de negócio
  rebaixada com ruling, então não é mecânico com paths fechados.
- **Sessão:** modelo `opus`, esforço `high`, na lane
  `/home/jvbat/projetos/lotus-39-certificado-e-redator-sem-trava`.
- **Papéis** (`.claude/papeis.md`):
  - `implementador-mecanico` na Task 1 (um arquivo, teste especificado);
  - `implementador-integracao` nas Tasks 2 a 7;
  - `revisor-task` por task, `re-revisor` nas rodadas de correção e `corretor-tardio` nas
    rodadas 4 e 5;
  - `revisor-branch` ao fim.
  - A Task 8 roda na própria sessão: precisa do stack e do navegador.
- **paths_autorizados:** não se aplica (`executor: claude`).
