---
schema_version: 1
packet_id: 39-certificado-e-redator-sem-trava-20261017
block_id: 39-certificado-e-redator-sem-trava
status: partial
generated_at: 2026-10-17T13:35:49-03:00
base_ref: main
base_commit: fa719a910cd4915cd6a712a39e83cfa8aa46989f
state_path: null
state_blob_sha: null
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: c3444602079a5fdc57e63559a1a2434e987c4b26
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — 39 `certificado-e-redator-sem-trava`

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.
> Gerado pela rota "Codex indisponível" do `/planejar-bloco`: três `contexto-leitor` somente-leitura
> (Certification, RN-09, fontes externas), fundidos aqui.

## Scope

**Goal:** produção emite certificado de qualquer curso sem modelo cadastrado por curso, com preview
do certificado a partir do curso; a idoneidade do redator (RN-09) deixa de travar e vira aviso.

**Non-goals:** editor visual de template; layout do certificado (`P-28`); bloco 13; escrita em
produção; reintroduzir checagem de idoneidade na emissão.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRV | Google Drive | `requisitos-negocio.md` (id `17l0yDorx7RtjtaaWRjep3_xYINLpBm1J`, citado em packet antigo), pasta `Viagem Chile/Projetos/Lotus.cl/V2` | n/a | unavailable — tool ausente: ToolSearch "google drive"/"drive" sem namespace `mcp__*drive*` | texto canônico RN-09, RN-CER-01/02 |
| NOT | Notion | `collection://e64b7d57-d000-4433-b652-a410e75193cc` | n/a | unavailable — tool ausente: ToolSearch "notion" vazio | tasks de template/idoneidade |
| BKL | repo | `docs/superpowers/backlog.md` ficha 39 (branch `docs/backlog-ficha-39-…`, PR #134) | 2026-10-17 | ok | escopo do bloco |
| CER | repo | `backend/app/Domains/Certification/{Services,Actions,Data,Enums}`, `resources/views/certification/certificate.blade.php` | main@fa719a91 | ok | portas, snapshot, PDF |
| CAT | repo | `backend/app/Domains/Catalog/{Models/CourseCertificateTemplate,Actions,Http/Controllers/CourseTemplateController,Data/CourseData}.php` | main@fa719a91 | ok | CRUD de template |
| OPE | repo | `backend/app/Domains/Operation/{Services/RedatorIdoneidadeService,Actions/DesignateRedatorAction,Exceptions/RedatorNaoElegivelException}.php` | main@fa719a91 | ok | gate RN-09 |
| FE | repo | `frontend/src/features/{certification,operation,catalog}`, `shared/lib/redatorStatus.ts`, `shared/ui` | main@fa719a91 | ok | UI de bloqueio, picker, aviso |
| S6B | repo | `docs/superpowers/specs/archive/2026-07-21-bloco6b-turma-designacao-design.md` (D3, D4) | 2026-07-21 | ok | origem do gate RN-09 |
| S4 | repo | `docs/superpowers/specs/archive/2026-08-05-certificacao-sprint-4-design.md` (D6) | 2026-08-05 | ok | template por curso, vigência RN-CER-01 |
| RDM | repo | `deploy/aws/README.md` §15, passos 3–4 | main@fa719a91 | ok | smoke do go-live |

## Key facts

1. A emissão recusa em três portas, na ordem: sem template → `sin_plantilla`; sem cidade → `plantilla_sin_ciudad`; sem redator → `sin_redactor`. O painel (`EmissionPanelQuery.php:104-118`) e a emissão real (`CertificateEligibility.php:86-119`, 422) usam as mesmas portas. A emissão usa as chaves próprias `template_not_approved` e `template_city_invalid`. `[CER]`
2. O template por curso só fornece três coisas: `layout_config['city']`, que é a única chave de `layout_config` lida (`CertificateTemplateResolver.php:61`); `validity_months`, que vira `valido_ate` (`IssueCertificateAction.php:47-49`), com nulo significando sem vencimento, o padrão da RN-CER-01 (S4 D6); e `version`, congelada no snapshot. O Blade padrão não lê nada do template. `[CER][S4]`
3. Cidade (`emissionCityFor`, `CertificateTemplateResolver.php:55-64`): a turma presencial usa `turma->local_aplicacao`; a online cai em `layout_config.city`; nunca usa o endereço do cliente (D12). Sem template, a turma online fica sem cidade. `[CER]`
4. O certificado emitido é imutável no dado. `CertificateSnapshotBuilder.php:38-88` congela aluno, curso, turma, cliente, emissor, redator, resultado, `template{version,city}`, `ciudad_emision` e `emitido_em`; `valido_ate` fica em coluna. Nenhum caminho de leitura (PDF, `show`, validação pública `PublicCertificateData.php:38-56`) relê `course_certificate_templates`. O Blade é relido ao vivo a cada PDF (`CertificatePdfService.php:95-133`), então mudar o Blade muda o visual do re-download. Isso já é assim hoje. `[CER]`
5. O CRUD de template existe só no backend (`Catalog/routes.php:23-25`, `CourseTemplateController`, versão por MAX+1 sob `lockForUpdate`) e não tem UI: `useCourseForm.ts:12-13` deixa templates de fora. Por isso produção tem zero templates. Não existe endpoint de preview, e o curso não tem página de detalhe: ele se edita em `CourseDialog.tsx`, com ações em `CourseRowActions.tsx`. `[CAT][FE]`
6. A RN-09 no código: `RedatorIdoneidadeService::assertEligible` exige o redator habilitado ao curso (`course_redator`) e o REUF não vencido (`valid_until` nulo vale). O único chamador é `DesignateRedatorAction:34` (designação à turma). A habilitação ao curso (`CourseRedatorController::update`) nunca teve a trava. A recusa sai como 422 RFC 7807, sem campo `code`; o motivo vai só no `detail` traduzido. `isEligible(): bool` já existe e não lança. `[OPE][S6B]`
7. O front filtra o picker (`useRedatorPicker.ts:47-52`, via `features/operation/lib/eligibility.ts`), então o inidôneo nem aparece. Sem mudar esse filtro, o aviso nunca dispara. `shared/ui` não tem Message nem Banner; tem `AppTag`, `ConfirmDialog`, `AppDialog` e `AppToast` (success/error). Existe ainda uma segunda definição de idoneidade, provisória e divergente: `shared/lib/redatorStatus.ts:23-29`, que alimenta o `RedatorCard`. `[FE]`
8. O smoke do go-live (§15 passo 3) emite certificado de curso recém-criado pela UI, e o passo 4 exige `COUNT(certificates) >= 1`. Hoje só passaria com template cadastrado por curso, que é escrita em produção. `[RDM]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Texto canônico da RN-09 | Drive indisponível (DRV) | gate = REUF válido + habilitação; CV e título não bloqueiam | S6B D3, decisão do João em 2026-07-21; o rebaixamento a aviso fica para o ruling deste bloco |
| Onde a RN-09 trava | ficha 39 cita designação e habilitação | só a designação à turma trava no código | OPE: único chamador `DesignateRedatorAction:34` |
| Template obrigatório por curso | nenhuma RF/RN numerada achada em `/docs`; Drive indisponível | obrigatório por porta de código desde 2026-08-05 | S4; nenhum requisito local o exige, e cabe ao brainstorming confirmar |
| Idoneidade no front | — | duas regras divergentes (`eligibility.ts` × `redatorStatus.ts`) | FE; não resolvido, afeta o aviso |

## Constraints

- Lei 3: mudar `EmissionBlockReason` ou um DTO regenera `generated.ts` (`:220`, `:246`, `:154`, `:198`, `:575`).
- Lei 6: aviso e preview só por `shared/ui`; nenhum componente novo importa PrimeReact fora de `shared/ui`.
- Produção tem dado real: nenhuma migration destrutiva. Template já cadastrado não se apaga por migration.
- Recusas estruturais continuam travando: redator arquivado (`Redator::lockForWrite`) e turma concluída (`assertAcademicallyWritable`, ordem fixada em `TurmaDesignationTest.php:215`).
- Certificado emitido: teste prova o snapshot e o `valido_ate` intactos.
- Lei 4: erros pelo handler RFC 7807, nunca `abort()`.

## External acceptance signals

- Produção: o smoke §15 passo 3 emite certificado de curso sem template, e `GET /api/publico/certificados/<uuid>` responde 200. Chega lá só por espelho corporativo e promoção, ações do João.
- O Drive reflete o rebaixamento da RN-09 (ação do João).

## Open questions

- Cidade da turma online sem template: config global, cidade do emissor, campo do curso ou outra?
- Vigência sem template: nula (RN-CER-01) ou padrão configurável?
- Templates já cadastrados: override de cidade/vigência, ou saem do caminho de emissão?
- `sin_plantilla` sai do enum? `plantilla_sin_ciudad` continua?
- Preview: PDF ou HTML; snapshot sintético (aluno e turma fictícios); onde entra na UI (`CourseRowActions` ou `CourseDialog`).
- Aviso RN-09: só na designação (o único gate), para as duas causas (REUF, habilitação) ou só o REUF; aviso passivo ou `ConfirmDialog`; diagnóstico vindo do backend (DTO) ou do `isEligible` do front.
- A designação de redator inidôneo deve deixar rastro de auditoria do aviso (peso legal)?

## Deferred

- Unificar `redatorStatus.ts` × `eligibility.ts`, se o brainstorming não absorver.
- UI de CRUD de template por curso.
- `RedatorDocumentType.php:19` cita `temReufValido`, que é `private`.

## Staleness triggers

- Drive (DRV) ou Notion (NOT) ficam disponíveis e contradizem a RN-09 de S6B ou a RN-CER-01.
- Mudança na ficha 39 ou no escopo aprovado no brainstorming.
- Commit na `main` que mexa em `CertificateEligibility`, `CertificateTemplateResolver`, `CertificateSnapshotBuilder`, `RedatorIdoneidadeService` ou `useRedatorPicker`.
- Templates por curso aparecem em produção antes do merge.
