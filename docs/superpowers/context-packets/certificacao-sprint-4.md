---
schema_version: 1
packet_id: certificacao-sprint-4-context-v1
block_id: certificacao-sprint-4
status: partial
generated_at: 2026-08-05T14:18:30-03:00
base_ref: main
base_commit: 492f8f82a74cc9e70b3912bc174cfbf719dbecc2
state_path: docs/superpowers/state.md
state_blob_sha: 936f35edaee48fda23a5e7b0105183d2a8a185e3
progress_path: docs/superpowers/progress.md
progress_blob_sha: 1043c4e2d41bfd23aaeaf11eff5ca18f7a0550d6
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Bloco 7 · Sprint 4 · Certificação

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** municiar o planejamento de emissão, numeração, template oficial, PDF sob demanda, histórico e validação pública por QR.

**Non-goals:** implementar; decidir no packet o contrato QR ou o formato final do código; materializar PDFs; criar gate financeiro; indexar assinaturas; incluir Dashboard/Meu Perfil (`8.4.x`/`8.5.x`).

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| J-DEC | João Victor + Repository | Instrução explícita vigente desta solicitação; `docs/superpowers/state.md` §“Bloqueio resolvido pelo João em 2026-08-05” @ `492f8f82a74cc9e70b3912bc174cfbf719dbecc2` | 2026-08-05T14:06:00-03:00 | retrieved | RN-CER-01–03 e restrição de assinaturas |
| R-STATE | Repository | `docs/superpowers/state.md` @ `492f8f82a74cc9e70b3912bc174cfbf719dbecc2` | 2026-08-05T14:06:00-03:00 | retrieved | Escopo, workflow e decisões vigentes |
| R-SCHEMA | Repository | `adrs.md`, `der-fisico.md`, migrations @ `e23c913` | 2026-08-05 | reused from prior packet | Schema planejado, ADR-12, numeração |
| R-CODE | Repository | `Catalog`, `ManualPdfService`, permissões, navegação/router @ `e23c913` | 2026-08-05 | reused from prior packet | Estado implementado |
| D-CERT | Google Drive | `entidade-certificado.md` `1KxDZJrELx2dtKA0fqVE68tk0lk-g8NtX`; `modulo-certificacao.md` `1Jdm3iiAdK7A1RUrmeEC7pWBRvYIu0SzC` | 2026-06-12 / 2026-06-14 | retrieved; reused | Regras de emissão, código, QR, vigência |
| D-COURSE | Google Drive | `entidade-curso.md` `1tcjyntae5sgYlU1sXPXJuIWY1VCKiolS` | 2026-07-16T07:26:27Z | retrieved; reused | Template/vigência por curso |
| D-TURMA | Google Drive | `entidade-turma.md` `1LkyQr_g-xqW0-XPpGShPfhLZXHo9v6oJ` | 2026-06-12T18:06:30Z | retrieved; reused | Handoff acadêmico e redator |
| D-SCREENS | Google Drive | `tela-certificados.md` `1QDvU3DJmE0TlCaFzJjfXjSV995Wz4CHG`; `tela-validacao-qr.md` `1k1pt9hH7zalcfMHmpjSFX5K6MwWponLE` | 2026-06-16 | retrieved; reused | Emissão, histórico, validação |
| D-OFFICIAL-CERT | Google Drive | certificados `1lqAHR2msTQip2bg8VKUIvvvqX3d7SH5o`, `1D40xGbBJTDmN_WH6VrTFKafU1DYN18cR`, `1PHDiQtKAAg0rZuU0ynsRzUpX1OJ9T1dh` | 2026-07-31T21:45Z | retrieved as text; reused | Campos e variações oficiais |
| D-OFFICIAL-MANUAL | Google Drive | `Libro de Clases Curso.docx` `1VE89_MEiRlY574NqPaWvB7IkdAA0zo0T` | 2026-07-31T21:41:41Z | retrieved as text; reused | Campos do Manual |
| N-80 | Notion | canonical collection `e64b7d57-d000-4433-b652-a410e75193cc`; pages `3b1bc9603dfa81158aa1e9fe07b2b31e`, `3b1bc9603dfa81bb84b1f48cba0e24a9`, `3b1bc9603dfa817aa206e7a3ea0c4fd1` | 2026-08-03T21:49:34Z | retrieved; reused | Tasks 8.0.1–8.0.3 |
| N-81 | Notion | pages 8.1.1–8.1.9: `388bc9603dfa81e6a0f3db0a1433c7d4`, `388bc9603dfa81bdb7bce469cac021cb`, `388bc9603dfa817e8142c7393179c3f0`, `388bc9603dfa81b092dfc4569509ccce`, `388bc9603dfa811ea7a5ef7f40de6c56`, `388bc9603dfa812f991efe610e6c7701`, `3aabc9603dfa816bac4fc56fe1488300`, `3aabc9603dfa8160a574e5f5b38e9595`, `39dbc9603dfa819f99c2c49a0024c6f4` | 2026-06-23–2026-07-27 | retrieved; reused | Backend e aceite |
| N-82-83 | Notion | pages `388bc9603dfa819798a0d27b5b959442`, `388bc9603dfa81f5947ed959bb5f3c29`, `388bc9603dfa81978a8bd685c2ba1ade`, `388bc9603dfa812288baf8b75e749be4` | 2026-06-23T15:40:20Z | retrieved; reused | Telas 8.2/8.3 |
| F-FIGMA | Figma | published locator `https://piece-desert-35638359.figma.site/`; sem fileKey/node ID | — | unavailable — prior `mcp__codex_apps__figma_get_metadata` call: `INVALID_ARGUMENT: Invalid fileKey argument` | Prova visual não recuperada |

O teto de cinco artefatos foi excedido na recuperação original porque o pedido exige três entidades, duas telas, quatro documentos oficiais e dezesseis tasks distintas. Este refresh reutilizou o registry por ID e não refez a varredura ampla. A base Notion obsoleta não foi consultada.

## Key facts

1. Emissão é manual, somente para matrícula academicamente aprovada de turma concluída; financeiro não bloqueia. `[D-CERT]` `[D-SCREENS]` `[N-81]`
2. Numeração externa parte de `LOT-ANO-SEQ`, incremental e atômica por ano; depois de `LOT-ANO-999` vem `LOT-ANO-1000`, sem teto ou rollover. O único exemplo oficial medido é `LOT-2026-016`; possível referência à turma no `codigo` segue decisão de desenho. `[D-CERT]` `[N-81]` `[J-DEC]`
3. Drive e 8.1.9 prescrevem `qr_code_hash`; 8.2.1 prescreve `/validar/{uuid}`. A 8.0.3 deve consolidar um contrato público único, sem dados sensíveis. `[D-CERT]` `[D-SCREENS]` `[N-80]` `[N-81]` `[N-82-83]`
4. Certificado nasce sem vencimento (`valido_ate = null`); vigência é exceção, e “expirado” só se aplica quando há data. Isso reconcilia os snapshots e os três certificados oficiais sem vigência. `[D-CERT]` `[D-COURSE]` `[D-SCREENS]` `[N-81]` `[D-OFFICIAL-CERT]` `[J-DEC]`
5. Certificado: fixos/versionados — marca OTEC, RUT `77.510.327-2`, título, cláusulas, narrativa e temário por curso; dinâmicos — `CodCert`, emissão, cidade/data, aluno/RUT, empresa/RUT, curso, horas, nota e relator. Nenhum exemplar mostra placeholder textual de QR. `[D-OFFICIAL-CERT]`
6. Manual: fixos — shell, seções e grades; dinâmicos — atividade/código, datas, local, horário, instrutores, mês/ano, participantes, presença, temas/atividades/horas, avaliações, notas e assinaturas. Um exemplo não prova variação por curso. `[D-OFFICIAL-MANUAL]`
7. Telas: emissão lista elegíveis e permite individual/lote; histórico lista status e download sob demanda; validação pública distingue válido/revogado/expirado/não encontrado com dados mínimos. A composição visual não foi recuperada. `[D-SCREENS]` `[N-82-83]` `[F-FIGMA]`
8. Há um relator por certificado. A operação mantém um redator por vez; o N:N da turma registra trocas, e, havendo mais de um associado ao fim, o admin escolhe o relator/assinatura na emissão. `[D-TURMA]` `[D-OFFICIAL-CERT]` `[J-DEC]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Dados do PDF | Drive antigo manda usar dados atuais no download. `[D-CERT]` | Snapshot dos dados/template relevantes na emissão; PDF sob demanda. | Instrução atual do João registrada no estado vence o snapshot. `[R-STATE]` |
| QR | Hash × UUID. `[D-CERT]` `[N-81]` `[N-82-83]` | Unresolved, não bloqueante; decidir no brainstorming. | Task 8.0.3 exige contrato único. `[N-80]` |
| Vigência | “Tempo indeterminado” convive com `valido_ate`/`vigencia_meses` e estado “expirado”; oficiais omitem vigência. `[D-CERT]` `[D-COURSE]` `[N-81]` `[D-OFFICIAL-CERT]` | Sem validade por padrão; data é exceção; expiração só com data. | RN-CER-01, instrução explícita vigente. `[J-DEC]` |
| Numeração | `LOT-ANO-SEQ`; só `LOT-2026-016` observado, sem regra de overflow. `[D-CERT]` `[N-81]` | Cresce sem teto: `999` → `1000`; formato com turma ainda aberto. | RN-CER-02, instrução explícita vigente. `[J-DEC]` |
| Manual | Drive antigo sugere template por curso. `[D-COURSE]` | Blade global até prova oficial de variação. | Decisão posterior P-08 + aceite condicional de 8.0.1/8.0.2. `[R-CODE]` `[N-80]` |
| Relator | Oficial usa `RELATOR` singular; Drive antigo modela N:1, enquanto o estado local registra N:N. `[D-OFFICIAL-CERT]` `[D-TURMA]` `[R-STATE]` | Um relator por certificado; N:N preserva trocas; admin escolhe na emissão se necessário. | RN-CER-03, instrução explícita vigente. `[J-DEC]` |

## Constraints

- PDF sob demanda via Gotenberg; persistir metadata/snapshot, não um PDF materializado por aluno. `[R-CODE]` `[R-STATE]`
- Template legal é auditável, soft-deletável e versionado em `course_certificate_templates`. `[R-SCHEMA]` `[R-CODE]`
- Validação é pública, sem Sanctum, com exposição mínima; revogação reflete imediatamente. `[D-CERT]` `[N-81]` `[N-82-83]`
- Assinaturas não serão indexadas neste bloco: preparar apenas o ponto de extensão, sem armazenamento. `[J-DEC]`

## External acceptance signals

- `8.0.1–8.0.3`: mapa oficial sem campos inventados; Manual global × curso registrado; um contrato QR canônico. `[N-80]`
- `8.1.1–8.1.6`: tabelas conforme DER; sequência anual atômica sem teto; gate só acadêmico; Blade fiel + QR; `valido_ate` nulo por padrão e derivado somente na exceção com vigência. `[N-81]` `[J-DEC]`
- `8.1.7–8.1.9`: histórico autorizado; endpoints tipados RFC 7807; identificador público inválido retorna 404. `[N-81]`
- `8.2.x`/`8.3.x`: validação pública sem Sanctum e histórico/emissão funcionais. `[N-82-83]`

## Open questions

- Não bloqueante: contrato público do QR, `hash × UUID` (task 8.0.3).
- Não bloqueante: formato final de `codigo` caso carregue referência à turma.
- Não bloqueante: fileKey e node IDs do Figma para prova visual das três telas.

## Deferred

- Armazenamento/indexação de assinaturas; viabilização será discutida com o cliente. O bloco mantém somente o ponto de extensão. `[J-DEC]`
- Tasks `8.4.x` Dashboard e `8.5.x` Meu Perfil.

## Staleness triggers

- Mudança semântica no bloco, futura spec/plano ou contratos locais de certificado/template.
- João reabrir vigência, crescimento da sequência, relator único, snapshot ou escopo de assinaturas.
- Decisão do QR ou do formato de `codigo` ser registrada.
- FileKey/node IDs Figma ou novo documento oficial tornarem-se disponíveis.
