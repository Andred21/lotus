---
schema_version: 1
packet_id: lotus-40-certificado-refinamento-e-validade-20261028
block_id: 40-certificado-refinamento-e-validade
status: partial
generated_at: 2026-10-28T20:54:01-03:00
base_ref: main
base_commit: 0c09fa4f8da56aa853b575bed4705a9a0c57f239
state_path: null
state_blob_sha: null
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: a3e1bfa0a365b8f6534b4332274002db8d49a035
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — 40 `certificado-refinamento-e-validade`

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.
> Gerado sem Codex (MCP ausente na sessão), por três `contexto-leitor` em paralelo: certificado
> atual, redator/documento, validade OTEC.

## Scope

**Goal:** o certificado sai paginado como o aprovado (2 páginas A4) em qualquer combinação real de
dados; carrega a assinatura **imagem** do redator — documento indexado no dialog do redator, como o
CV — e a da gerente **Marcia de Batalha**, lado a lado, em todo certificado; a validade OTEC fica
levantada em fonte, com o que couber aplicado e o resto decidido com a Lotus.

**Non-goals:** reescrever certificado já emitido (snapshot congelado); editor visual de template;
carga da v1 (bloco 38); contratar firma electrónica avanzada ou certificadora.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| JOAO | conversa | pedido do João em `/planejar-bloco 40`, 2026-10-28 | 2026-10-28 | ok | assinatura do redator como documento indexado; Marcia em todos, lado a lado |
| FICHA | repo | `docs/superpowers/backlog.md` §40 | 0c09fa4f | ok | escopo, DoD, restrições |
| BLADE | repo | `backend/resources/views/certification/certificate.blade.php` | 0c09fa4f | ok | layout, paginação, rodapé |
| SVC | repo | `backend/app/Domains/Certification/Services/{CertificatePdfService,CertificateSnapshotBuilder}.php`, `Data/Snapshot/CertificateSnapshotData.php` | 0c09fa4f | ok | pipeline, snapshot v2 |
| REDDOC | repo | `Identity/Enums/RedatorDocumentType.php`, `StoreRedatorDocumentAction`, `Shared/Files/ContentClass.php`, `frontend/src/features/identity/components/Redator/`, `frontend/src/shared/lib/redatorStatus.ts:33` | 0c09fa4f | ok | mecanismo do CV |
| TPL | repo | `docs/templates/certificado.pdf` (2 pág A4) | 2026-08-05 | ok | aprovado |
| B39 | repo | `docs/superpowers/blocos/39-certificado-e-redator-sem-trava/revisao.md:19-26`; `pendencias/abertas.md` P-28 (:684-704), P-78 (:706-734) | 0c09fa4f | ok | achado das 3 páginas |
| SPEC0810 | repo | `specs/archive/2026-08-10-documentos-oficiais-template-e-docx-design.md` §1.1, §7 | 0c09fa4f | ok | exclusão deliberada de assinatura/selos |
| LEY19799 | web | Ley 19.799 arts. 2–5, via chile.justia.com (bcn.cl falhou no fetch) | — | partial | firma electrónica |
| SENCE | web | snippets de sence.gob.cl (formato de certificado de asistencia, manual OTEC, ficha franquicia 2026); PDFs ilegíveis no fetch | — | partial | requisitos SENCE |
| INN | web | Ley 19.518 art. 21, DS 98 art. 10 (iura.cl); diretriz INN NCh 2728 (snippet; fetch 404) | — | partial | NCh 2728 |
| DRIVE | Google Drive | — | — | unavailable | tool absent: conector claude.ai Google Drive exige autenticação, não exposto na sessão não interativa |
| NOTION | Notion | — | — | unavailable | tool absent: conector claude.ai Notion exige autenticação, não exposto |

## Key facts

1. **Paginação.** `.page` usa `min-height: 297mm` (BLADE :100-134); página 1 vai de lead até
   narrativa, nota, asistencia, vigência e registro, e o rodapé tem só `redator->name` sobre
   "Instructor" (:360-366). Nome do curso com 2 linhas + nota + asistencia + vigência empurra o
   rodapé para a página 2; P-78 reproduziu em produção (`LOT-2026-1000`, 3 páginas) sem gatilho
   medido. Nenhum `max:` nos DTOs de curso, módulo, cliente, aluno; colunas `string(255)`/`text`.
   `[BLADE][B39]`
2. **Aprovado.** Rodapé da p1: Marcia de Batalha / "Gerente OTEC" (assinatura manuscrita) à
   esquerda, relator (assinatura sobre `{{RELATOR}}`, "Instructor") à direita; abaixo, selos
   `Res. SENCE N°0879 08/03/2022` e `NCH 2728 | 2015`. Sem linha de asistencia nem de vigência —
   só nota. P2: temário, fundo limpo. `[TPL]`
3. **Snapshot.** `CertificateSnapshotData` v2 congela redator (`name`, `rut`) e `emissor`
   (`config('app.certificate_issuer')`: name, rut); PDF regerado a cada requisição, nunca
   persistido. Assinatura congelada exige v3 com leitura tolerante a v1/v2 (:16-27). `[SVC]`
4. **CV = linha em `files`** (morph `redator`, `type` string(80)), enum `RedatorDocumentType`
   `CV|REUF|TITULO|POSTGRADO`; upload admin `POST redatores/{redator}/documents` e self-service
   `POST profile/documents` (todos menos REUF); **replace por tipo com soft-delete**, sem
   versão; `ContentClass::Imagem` (jpg/png/webp, 5 MB) existe. `DOC_TYPES` no front é manual.
   `[REDDOC]`
5. **Nada de assinatura existe.** Sem asset de assinatura, gerente ou selo em backend/frontend;
   `backend/resources/images/` tem só logo e fundo. A gerente não é entidade. `[BLADE][REDDOC]`
6. **Firma electrónica.** Ley 19.799 art. 3: firma electrónica de qualquer natureza equivale à
   manuscrita; art. 4 exige FEA só para instrumento público; art. 5: privado sem FEA tem o valor
   probatório que corresponda. Certificado de OTEC é instrumento privado: imagem + QR é válido,
   prova mais fraca que FEA. `[LEY19799]`
7. **SENCE / NCh.** Certificado de **asistencia** SENCE traz OTEC (razão social, RUT), empresa,
   atividade, **código SENCE**, datas e horas; conteúdo mínimo do certificado de **aprovação** não
   verificado. Ley 19.518 art. 21 / DS 98 art. 10 exigem a NCh 2728 da OTEC, não sua impressão
   no certificado. Retenção ≥ 3 anos (cláusula 4.2.4) só por snippet. `[SENCE][INN]`
8. **Pedido novo.** Assinatura do redator vira documento indexado no dialog do redator, como o CV,
   e sai no certificado da turma; Marcia em todos, lado a lado. `[JOAO]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Assinatura da gerente no certificado | SPEC0810 §7 deixou fora ("não inventa peça de valor legal") | entra em todos, imagem, lado a lado ao redator | instrução explícita do João 2026-10-28 `[JOAO]`; asset ainda a definir |
| Assinatura do redator | Blade: só nome | imagem por redator, documento indexado | `[JOAO]` |
| Selos SENCE/NCh | no aprovado; fora por SPEC0810 §7 | **unresolved** — FICHA exige asset/texto aprovado pela Lotus | `[FICHA]` restrições |
| Asistencia e vigência na p1 | ausentes no aprovado | presentes no Blade; **unresolved** | `[TPL]` vs `[BLADE]` |
| P-28 (cunhas, p2 limpa) | aprovado p2 limpa | `repeat-y` repete; **unresolved** | `[B39]` |

## Constraints

- Certificado emitido não muda: snapshot é lido como gravado; teste de snapshot como no 39.
- Peça de valor legal só com asset/texto entregue ou aprovado pela Lotus.
- Replace de documento do redator faz soft-delete; sem congelar o binário (ou hash/path) no
  snapshot, a assinatura de certificado antigo pode se perder no lifecycle do S3 (ADR-11 emenda
  2026-10-25: versões de documento retidas 7 dias).
- Gotenberg recebe imagem como data-URI (como logo/fundo hoje); medição de páginas só vale no
  Gotenberg real (`CertificatePdfTest.php:461-462`).
- `generated.ts` regenerado se DTO mudar (lei 3); front não importa PrimeReact direto (lei 6).
- Nada é cortado em silêncio: nota, asistencia, vigência nunca clampadas.

## External acceptance signals

- `pdfinfo` do pior caso medido = 2 páginas, assinaturas na página do corpo.
- Nenhum sinal externo de produção identificado ainda; aceitação pode precisar de certificado real
  reimpresso em produção — decidir na spec.

## Open questions

- Fonte do asset da assinatura da Marcia: recorte do `certificado.pdf` aprovado, arquivo entregue
  pela Lotus, ou upload no sistema? Asset fixo (config/repo) ou entidade/documento versionado?
- Congelar a assinatura no snapshot (v3) ou ler a atual na reimpressão?
- Redator sem assinatura cadastrada: bloqueia emissão (`EmissionBlockReason`) ou cai no nome?
- Self-service: o redator sobe a própria assinatura?
- Limite de paginação: layout ou teto de caracteres na entrada?
- Asistencia/vigência: ficam (compactadas) ou saem, como no aprovado?

## Deferred

- FEA ou selo de tempo da gerente (Ley 19.799 art. 5) — decisão de produto, ficha própria.
- Exigência SEC / clientes do setor elétrico — não verificado; perguntar à Lotus.
- Compra do texto NCh 2728:2015 no INN para citar cláusula.

## Staleness triggers

- O João mudar o escopo da assinatura (redator ou gerente) ou a Lotus entregar asset/texto de selo.
- Mudança em `certificate.blade.php`, `CertificateSnapshotData` ou `RedatorDocumentType` na `main`
  antes da execução.
- Google Drive ou Notion ficarem disponíveis com documento que contradiga o aprovado.
- Fonte primária SENCE/INN lida contradizer os fatos 6–7.
