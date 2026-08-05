---
schema_version: 1
packet_id: certificacao-sprint-4-context-v1
block_id: certificacao-sprint-4
status: blocked
generated_at: 2026-08-05T13:53:05-03:00
base_ref: main
base_commit: e23c91386157ae167d94a4803ce3d2c4727f3af9
state_path: docs/superpowers/state.md
state_blob_sha: 4ce96f22fe7df938e065191ec03261ad32429cb4
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

**Non-goals:** implementar; escolher silenciosamente QR/vigência; materializar PDFs; criar gate financeiro; incluir Dashboard/Meu Perfil (`8.4.x`/`8.5.x`).

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| R-STATE | Repository | `state.md`, `backlog.md` @ `e23c913` | 2026-08-05T13:44:42-03:00 | retrieved | Escopo, invariantes, baseline |
| R-SCHEMA | Repository | `adrs.md`, `der-fisico.md`, migrations @ `e23c913` | 2026-08-05 | retrieved | Schema planejado, ADR-12, numeração |
| R-CODE | Repository | `Catalog`, `ManualPdfService`, permissões, navegação/router @ `e23c913` | 2026-08-05 | retrieved | Estado implementado |
| D-CERT | Google Drive | `entidade-certificado.md` `1KxDZJrELx2dtKA0fqVE68tk0lk-g8NtX`; `modulo-certificacao.md` `1Jdm3iiAdK7A1RUrmeEC7pWBRvYIu0SzC` | 2026-06-12 / 2026-06-14 | retrieved | Regras de emissão, código, QR, vigência |
| D-COURSE | Google Drive | `entidade-curso.md` `1tcjyntae5sgYlU1sXPXJuIWY1VCKiolS` | 2026-07-16T07:26:27Z | retrieved | Template/vigência por curso |
| D-TURMA | Google Drive | `entidade-turma.md` `1LkyQr_g-xqW0-XPpGShPfhLZXHo9v6oJ` | 2026-06-12T18:06:30Z | retrieved | Handoff acadêmico e redator |
| D-SCREENS | Google Drive | `tela-certificados.md` `1QDvU3DJmE0TlCaFzJjfXjSV995Wz4CHG`; `tela-validacao-qr.md` `1k1pt9hH7zalcfMHmpjSFX5K6MwWponLE` | 2026-06-16 | retrieved | Emissão, histórico, validação |
| D-OFFICIAL-CERT | Google Drive | certificados `1lqAHR2msTQip2bg8VKUIvvvqX3d7SH5o`, `1D40xGbBJTDmN_WH6VrTFKafU1DYN18cR`, `1PHDiQtKAAg0rZuU0ynsRzUpX1OJ9T1dh` | 2026-07-31T21:45Z | retrieved as text | Campos e variações oficiais |
| D-OFFICIAL-MANUAL | Google Drive | `Libro de Clases Curso.docx` `1VE89_MEiRlY574NqPaWvB7IkdAA0zo0T` | 2026-07-31T21:41:41Z | retrieved as text | Campos do Manual |
| N-80 | Notion | canonical collection `e64b7d57-d000-4433-b652-a410e75193cc`; pages `3b1bc9603dfa81158aa1e9fe07b2b31e`, `3b1bc9603dfa81bb84b1f48cba0e24a9`, `3b1bc9603dfa817aa206e7a3ea0c4fd1` | 2026-08-03T21:49:34Z | retrieved | Tasks 8.0.1–8.0.3 |
| N-81 | Notion | pages 8.1.1–8.1.9: `388bc9603dfa81e6a0f3db0a1433c7d4`, `388bc9603dfa81bdb7bce469cac021cb`, `388bc9603dfa817e8142c7393179c3f0`, `388bc9603dfa81b092dfc4569509ccce`, `388bc9603dfa811ea7a5ef7f40de6c56`, `388bc9603dfa812f991efe610e6c7701`, `3aabc9603dfa816bac4fc56fe1488300`, `3aabc9603dfa8160a574e5f5b38e9595`, `39dbc9603dfa819f99c2c49a0024c6f4` | 2026-06-23–2026-07-27 | retrieved | Backend e aceite |
| N-82-83 | Notion | pages `388bc9603dfa819798a0d27b5b959442`, `388bc9603dfa81f5947ed959bb5f3c29`, `388bc9603dfa81978a8bd685c2ba1ade`, `388bc9603dfa812288baf8b75e749be4` | 2026-06-23T15:40:20Z | retrieved | Telas 8.2/8.3 |
| F-FIGMA | Figma | published locator `https://piece-desert-35638359.figma.site/`; sem fileKey/node ID | — | unavailable — `mcp__codex_apps__figma_get_metadata`: `INVALID_ARGUMENT: Invalid fileKey argument` | Prova visual não recuperada |

O teto de cinco artefatos foi excedido porque o pedido exige três entidades, duas telas, quatro documentos oficiais e dezesseis tasks distintas; somente fatos do bloco foram retidos. A base Notion obsoleta não foi consultada.

## Key facts

1. Emissão é manual, somente para matrícula academicamente aprovada de turma concluída; financeiro não bloqueia. `[D-CERT]` `[D-SCREENS]` `[N-81]`
2. Numeração externa é `LOT-ANO-SEQ`, incremental e atômica por ano; o único exemplo é `LOT-2026-016`. Nenhuma fonte define padding/overflow. `[D-CERT]` `[N-81]`
3. Drive e 8.1.9 prescrevem `qr_code_hash`; 8.2.1 prescreve `/validar/{uuid}`. 8.0.3 existe para consolidar um único contrato público sem dados sensíveis. `[D-CERT]` `[D-SCREENS]` `[N-80]` `[N-81]` `[N-82-83]`
4. Vigência está contraditória: “tempo indeterminado”, estados “expirado” e `valido_ate` derivado de `vigencia_meses`; curso/módulo ainda marcam a origem curso × turma como “a confirmar”. Os certificados oficiais não exibem vigência. `[D-CERT]` `[D-COURSE]` `[D-SCREENS]` `[N-81]` `[D-OFFICIAL-CERT]`
5. Certificado: fixos/versionados — marca OTEC, RUT `77.510.327-2`, título, cláusulas, narrativa e temário por curso; dinâmicos — `CodCert`, emissão, cidade/data, aluno/RUT, empresa/RUT, curso, horas, nota e relator. Os três exemplos variam em narrativa, curso e cláusula; nenhum placeholder textual de QR/vigência aparece. `[D-OFFICIAL-CERT]`
6. Manual: fixos — shell, seções e grades; dinâmicos — atividade/código, datas, local, horário, instrutores, mês/ano, participantes, presença, temas/atividades/horas, avaliações, notas e assinaturas. Um único exemplo não prova variação por curso. `[D-OFFICIAL-MANUAL]`
7. Telas funcionais: emissão lista elegíveis e permite individual/lote; histórico lista status e download sob demanda; validação pública mostra válido/revogado/expirado, dados mínimos e “não encontrado”. Composição visual do protótipo não foi recuperada. `[D-SCREENS]` `[N-82-83]` `[F-FIGMA]`
8. A baseline local fornecida está correta: migrations ausentes, `Certification` vazio, template versionado em `Catalog`, Gotenberg existente, três permissões e `/certificados` ainda placeholder. `[R-SCHEMA]` `[R-CODE]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Dados do PDF | Drive antigo manda usar dados atuais no download. `[D-CERT]` | Snapshot dos dados/template relevantes na emissão; PDF continua sob demanda. | Instrução explícita atual + backlog, superiores ao snapshot antigo. `[R-STATE]` |
| QR | Hash × UUID. `[D-CERT]` `[N-81]` `[N-82-83]` | Unresolved; não escolher no packet. | Task 8.0.3 exige decisão única. `[N-80]` |
| Vigência | Fontes mutuamente incompatíveis. `[D-CERT]` `[N-81]` | Unresolved and blocking. | Nenhuma fonte disponível fixa a regra. |
| Manual | Drive antigo sugere template por curso. `[D-COURSE]` | Blade global permanece até prova oficial de variação. | Decisão posterior P-08 + aceite condicional de 8.0.1/8.0.2. `[R-CODE]` `[N-80]` |
| Relator | Documento oficial usa `RELATOR` singular; Drive antigo modela N:1. `[D-OFFICIAL-CERT]` `[D-TURMA]` | Turma atual é N:N; representação no certificado está unresolved. | Implementação/DER posteriores vencem a cardinalidade antiga, mas não definem o layout. `[R-SCHEMA]` |

## Constraints

- PDF sob demanda via Gotenberg; armazenar metadata/snapshot, não PDF por aluno.
- Template legal é auditável, soft-deletável e versionado em `course_certificate_templates`.
- Validação é pública, sem Sanctum, com exposição mínima.
- Revogação deve refletir imediatamente na validação.

## External acceptance signals

- `8.0.1–8.0.3`: mapa oficial sem campos inventados; Manual global × curso registrado; um contrato QR canônico.
- `8.1.1–8.1.3`: tabelas conforme DER; sequência anual atômica; emissão com gate somente acadêmico.
- `8.1.4–8.1.6`: Blade fiel + QR funcional; PDF→S3→URL temporária sem intermediário; `valido_ate` derivado da vigência.
- `8.1.7–8.1.9`: histórico otimizado/autorizado; endpoints tipados RFC 7807; hash inválido retorna 404.
- `8.2.1–8.2.2`: rota pública sem Sanctum; tela distingue válido/expirado/revogado.
- `8.3.1–8.3.2`: histórico com download sob demanda; emissão a partir da matrícula concluída. `[N-80]` `[N-81]` `[N-82-83]`

## Open questions

- **Blocking:** qual é a regra exata de vigência — quantidade/origem dos meses, sem vencimento permitido e cálculo de `valido_ate`?
- **Blocking:** qual padding e comportamento após `LOT-ANO-999`?
- **Blocking:** como o certificado oficial representa uma turma com múltiplos redatores?
- João deve escolher `hash` ou `UUID` usando a divergência já documentada.
- Para prova visual, fornecer fileKey e node IDs Figma das três telas.

## Deferred

- Tasks `8.4.x` Dashboard e `8.5.x` Meu Perfil.

## Staleness triggers

- Mudança semântica no bloco, spec/plano ou contratos locais de certificado/template.
- Fonte canônica definir vigência, padding, múltiplos redatores ou reabrir snapshot.
- Decisão do QR/template ser registrada.
- FileKey/node IDs Figma ou novo documento oficial tornarem-se disponíveis.
