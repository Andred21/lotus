---
schema_version: 1
packet_id: 38-seeder-carga-inicial-producao-20261017
block_id: 38-seeder-carga-inicial-producao
status: partial
generated_at: 2026-10-17T14:24:27-03:00
base_ref: main
base_commit: 0740843a5315139563a9a842c36b492107069d86
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

# Context Packet — Carga inicial da produção (recorte 2026)

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** carregar em produção o histórico **2026** da v1 — 1 cliente, os alunos, 3 redatores com
documentos, 5 cursos com módulos, os orçamentos (SCAP) e as cotações, as turmas concluídas, as
matrículas e os certificados `LOT-2026-*` com o código da planilha preservado.

**Non-goals:** 2022–2025 (1.884 linhas); instrutores sem pasta; corrigir dado da Lotus; QR legado;
template de certificado (ficha 39 e bloco do João); upload dos PDFs legados; reemitir; convite ou
e-mail a importado; firma PNG, licença SEC e cursos avulsos do redator.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| JOAO | sessão | instrução do João, 2026-10-17 | 2026-10-17 | ok | recorte e decisões a–g |
| REG | espelho local | `00. LEVANTAMIENTO INFO JOAO/Certificados/JVBA - REGISTRO CERTIFICADOS LOTUS R1.xlsx` | lido 2026-10-17 | ok | linhas 2026, aba CURSOS |
| COT | espelho local | `Cotizaciones/drive-download-20261012T230617Z-1-001.zip` | lido 2026-10-17 | ok | valor UF, curso e pessoas das COT-176..187 |
| TPL | espelho local | `Cursos/Template/{200#,201#,202#}.docx` | lido 2026-10-17 | ok | temário por módulo |
| INS | espelho local | `Instructores/{Cristian Olave, Cristian Zamora, Magallanes Acuña Olate}/` | lido 2026-10-17 | ok | RUT, e-mail, telefone, documentos |
| REPO | repositório | `docs/der-fisico.md`, `docs/adrs.md`, `backend/app` em `main@0740843a` | 2026-10-17 | ok | schema, invariantes, services |
| DRIVE | Google Drive | `Viagem Chile/Projetos/Lotus.cl/V2` | — | unavailable | tool absent: conector `claude.ai Google Drive` exige autenticação; nenhuma tool de Drive na descoberta |
| NOTION | Notion | `collection://e64b7d57-d000-4433-b652-a410e75193cc` | — | unavailable | tool absent: conector `claude.ai Notion` exige autenticação; nenhuma tool de Notion na descoberta |

## Key facts

1. Recorte 2026 = 127 linhas `LOT-2026-001..127`, contíguas, 3 dígitos; cliente único SWITCH CHILE
   LTDA. `77.117.942-8`; instrutor único MAO; Talca 126, Santiago 1; todas presenciais. `[REG]`
2. Saem 11 linhas por decisão: `LOT-2026-020` (SCAP `1000`, curso de 2024) e as de RUT com DV
   inválido (005, 006, 012, 016, 020, 073, 107) e de RUT repetido com nome diferente na mesma
   turma (059/084, 093/118). Sobram **116 certificados em 10 turmas** (SCAP 176, 179–187). `[JOAO][REG]`
3. Cursos: 200# (LLEE 16 h), 201# (Riesgos 9 h), 202# (Roles JF 2 h) da pasta, mais 051# (LLEE 8 h)
   e 035# (Brazo Hidroelevador 4 h) da aba CURSOS. 200# e 051# têm o **mesmo NomCURSO** com horas
   diferentes. Temário só existe para 200#/201#/202# (docx); 051#/035# não têm docx. `[JOAO][REG][TPL]`
4. COT: 181↔182 trocadas, 185 e 186 de outro curso, 176 cota 16 h para curso de 8 h, 187 com texto
   residual; 177 e 178 sem turma. Curso da turma sai da planilha; a COT dá só `value_uf`. `[COT][JOAO]`
5. Redatores: MAO (CV, TITULO UFRO, POSTGRADO UTN; **sem REUF**), CZR
   (CV p.1–5, TITULO p.6, POSTGRADO p.9 do mesmo PDF; REUF = registro SENCE sem validade), COO
   (só CV). RUT, e-mail e telefone saem do CV. `RedatorDocumentType` = CV, REUF,
   TITULO, POSTGRADO, um ativo por tipo. `[INS][REPO]`
6. Código: `certificates.codigo` é varchar UNIQUE sem formato; `CertificateNumberService` gera
   `LOT-%d-%d` a partir de 1000 — o legado não colide. Budget: `code = "Scap {id}"` e o código da
   cotação deriva de `budget_id`, então SCAP-n exige `budgets.id = n` explícito. `[REPO]`
7. A carga contorna Actions do fluxo vivo: `CreateRedatorAction` (dispara convite), `StudentResolver`
   (exige e-mail, D9), `StudentClientLinkService` (`started_on` = hoje), `ConcludeTurmaAction`
   (RN-16), `DesignateRedatorAction` (RN-09) e `IssueCertificateAction` (portas de template,
   `valido_ate` calculado). Invariantes de banco a garantir: `active_quote_id` (turma só de cotação
   `approved`), `enrollments_turma_student_unique`, `certificates_active_enrollment_unique`,
   `users.rut`/`users.email` UNIQUE (`email` NOT NULL). `[REPO]`
8. `audit.console = true`: carga por Eloquent audita com `user_id` nulo; `DB::table` não audita
   (ADR-08). `backend/` atravessa o espelho corporativo e entra na imagem: dado pessoal não pode
   morar no repo nem em `backend/`. `[REPO]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Recorte | ficha 38: 2.011 certificados 2022–2026 | só `LOT-2026-*` | JOAO (a) |
| Cursos | ficha: 54 seletores | 5 cursos: pasta + 051# e 035# | JOAO (b) |
| `LOT-2026-020` | entraria | fora | JOAO (c) |
| RUT inválido/duplicado | ficha: recusa e reporta | fora, sem correção | JOAO (d) |
| Redator sem REUF | RN-09 bloqueia designação | carga liga direto; ficha 39 rebaixa RN-09 para aviso em outra lane | JOAO (e) |
| COT divergente | — | curso da planilha; COT só valor UF | JOAO (f) |
| COT 177/178 | ficha: decidir | cotação sem turma | JOAO (g); status exato em aberto |
| Redatores | ficha: 6 instrutores | só os 3 com pasta | JOAO |

## Constraints

- Lei 2: auditoria só na aplicação; nada de trigger. Lei 7: financeiro não bloqueia.
- RN-01: aluno e cliente `is_active=false`, sem login, sem convite.
- Nenhum RUT ou nome de aluno no git nem em `backend/`; arquivo de dados fora da árvore.
- Datas de calendário via `FusoDoNegocio`; mensagens em `lang/` nos 3 locales.
- Escrita em produção é do João (auto mode bloqueia escrita remota); Claude prepara e confere.
- Comando em produção: `docker compose -p lotus -f docker-compose.prod.yml run --rm app php artisan …`
  (`deploy/aws/README.md`).

## External acceptance signals

- Contagens por tabela em produção iguais às do `--simular` aprovado.
- Amostra de certificados importados abre em `/validar/{uuid}` e no PDF.
- Reexecução não muda contagem.

## Open questions

- Status das COT 177/178 (`pending` ou `rejected`).
- `LOT-2026-127` sem nota, mas "Aprobado": entra sem nota?
- Nome dos cursos 200# e 051# (mesmo NomCURSO) e temário de 051#/035#.
- E-mail sintético de aluno e cliente; vínculo aluno↔cliente com data histórica.
- Como o arquivo de dados chega ao container de produção.
- Ordem frente ao bloco 13 (restore com dado real muda de forma) e à ficha 39.

## Deferred

- 2022–2025; JC Rodríguez, Nelson González, OJI; QR legado (`D-70`); firma no certificado.

## Staleness triggers

- O João mudar o recorte, a lista de cursos ou de redatores.
- Nova versão da planilha ou das COT no espelho local.
- A ficha 39 mesclar mudando `RedatorIdoneidadeService` ou o snapshot do certificado.
- O Drive ficar disponível e contradizer uma decisão desta tabela.
