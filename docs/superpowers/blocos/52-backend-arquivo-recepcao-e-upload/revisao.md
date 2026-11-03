# 52 — Revisão

## Em aberto

Correções aprovadas pelo João em 2026-11-03, por aplicar: Q-3, Q-5, Q-6 e Q-7, todos Menor. Q-1 e
Q-2 ficam registrados sem correção. Aplicadas as quatro, a rodada 2 reabre a revisão.

## Rodada 1 — `60e42f49..5e54cd44` — 2026-11-03 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5/gpt-5.4) · Lente 2: sonnet

Bloco classificado como alto risco (upload de documentos e assinaturas de certificado, lang de
`auth`). A lente Codex foi tentada pelo `codex-companion` e falhou nas duas chamadas com
`The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account.` e depois o mesmo
erro com `gpt-5.4`. A rodada seguiu só com a lente 1.

A lente 1 não achou Crítico nem Importante: o envelope do `FileUploader::store` (D6), a semântica
das Actions (replace auditado, locks, turma concluída, destino `redator`), o 403 de não-redator
antes da validação e as frases da P-76/P-107 nos três locales conferem. Q-3, Q-5, Q-6 e Q-7
coincidem com os Minor M2, M3, M8 e M9 do `revisor-branch` (`rulings.md`).

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | Com `type` inválido, o 422 também acusa `valid_until` como proibido, o que não acontecia no `validate()` em duas etapas da base | CONFIRMED | `backend/app/Shared/Files/Data/TypedFileRules.php:35` | registrado, não bloqueia |
| Q-2 | Menor | A frase `documents_shape` diz "El campo documents" com o nome cru, sem usar o atributo `documentos` do D7 | CONFIRMED | `backend/lang/es_CL/identity.php:32`, `backend/lang/pt_BR/identity.php:32` | registrado, não bloqueia |
| Q-3 | Menor | A catraca de lock aceita qualquer menção a `FileUploader` (o `use` basta) e não confere se o `lockForWrite` fica dentro da closure | CONFIRMED | `backend/tests/Feature/Shared/ParentLockOnChildWriteTest.php:141` | registrado, não bloqueia |
| Q-4 | Menor | `FileStorageAccessRatchetTest` não pega escrita direta no disco (`->putFile(`, `->store(`, `Storage::disk()->delete`) fora do `FileStorage` | CONFIRMED | `backend/tests/Feature/Shared/FileStorageAccessRatchetTest.php:81`, `:103` | registrado, não bloqueia |
| Q-5 | Menor | `ISENTOS` mantém `RedatorData.php`, que já não casa nenhum sinal de upload, e nada reprova isento que deixou de ser sítio | CONFIRMED | `backend/tests/Feature/Shared/UploadPolicyRatchetTest.php:68`, `:270-283` | registrado, não bloqueia |
| Q-6 | Menor | Create/Update do redator passam a chave crua como `files.type`, sem `RedatorDocumentType::from`; só o `RedatorDocumentsData` filtra | PLAUSIBLE | `backend/app/Domains/Identity/Actions/CreateRedatorAction.php:58-60`, `backend/app/Shared/Files/Services/StoredFiles.php:33-52` | observação: depende de caller fora do caminho HTTP |
| Q-7 | Menor | O teste de rollback do create não afirma `users` vazio; o DoD 3 lista "redator, user, linha de `files` nem objeto no bucket" | CONFIRMED | `backend/tests/Feature/Cadastros/RedatorDocumentRollbackTest.php:115-117` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 6 confirmados, 1 plausível, 0 refutados
