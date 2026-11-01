# 44 — Revisão

## Em aberto

- **Q-1 da rodada 2** (Importante, CONFIRMED): o docblock de `TetosDeColuna` afirma que toda porta
  de escrita recusa pelo teto, mas `RedatorData` e `UserData` gravam `users.email` e `users.phone`
  sem `max`. Falta a decisão do João entre reescrever o docblock com o que é verdade e abrir
  ficha para Redator/User, ou aplicar `Max(TetosDeColuna::…)` nos dois DTOs agora, fora do escopo
  original do bloco.

## Rodada 2 — `8c1659d6..ee05062a` — 2026-11-01 · Lente 1: opus · Lente 2: sonnet

Esta rodada revisa o bloco inteiro, com foco no `ee05062a`, que aplica as correções aprovadas da
rodada 1: Q-1, Q-2, Q-3, Q-5 e Q-6. A lente 1 confirmou que as cinco fecham o que prometem, sem
regressão. A suíte do backend passou inteira (1618 testes, 5 skipped). No front, `tsc`, lint e
vitest passaram (1443 testes), e o `generated.ts` bate com o manifest. A lente Codex segue fora,
pelo mesmo `model_not_found` da rodada 1.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Importante | O docblock de `TetosDeColuna` diz que toda porta de escrita recusa pelo teto, mas `RedatorData` e `UserData` gravam `users.email` e `users.phone` sem `max`. Um telefone de 31 caracteres no cadastro de redator ou de usuário segue dando 500 em MySQL strict; o defeito já existia antes do bloco. | CONFIRMED | `backend/app/Shared/Support/TetosDeColuna.php:6-9`; `backend/app/Domains/Identity/Data/RedatorData.php:32-34,59-70`; `backend/app/Domains/Identity/Data/UserData.php:35-38,65-72`; `backend/database/migrations/0001_01_01_000000_create_users_table.php:20` | aguarda decisão do João |
| Q-2 | Menor | A correção do Q-5 deixou uma terceira cópia de `isRegistered` em `ImportRowEditor`, no `rutLocked`. | CONFIRMED | `frontend/src/features/operation/components/Enrollment/ImportRowEditor.tsx:31` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 1 confirmado, 0
plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

Correções da rodada 1, aplicadas em `ee05062a`: Q-1, Q-2, Q-3, Q-5 e Q-6. O Q-4 (PLAUSIBLE) não
foi corrigido, por decisão do João.

Observações da lente 1 que não viraram achado:

- O texto da spec não foi emendado. A D6 (`spec.md:71`) ainda põe a prévia sob `throttle:import`,
  e a D10 não cita a checagem de formato do e-mail. As duas mudanças estão nas rulings.
- A mudança do link do modelo para o corpo do passo de upload segue sem ruling (D7 e
  `jornada.md:21`).
- A ruling do Q-2 diz que o `max:50` virar 30 em `EnrollmentData` não muda comportamento. Isso só
  vale para aluno novo: na matrícula avulsa de aluno já existente, o `EnrollStudentAction` ignora
  o telefone, e um telefone de 31 a 50 caracteres, que antes passava com 201, agora dá 422.

## Rodada 1 — `8c1659d6..e9838885` — 2026-11-01 · Lente 1: opus · Lente 2: sonnet

Bloco classificado de alto risco, porque toca `generated.ts` e DTOs. A lente Codex não rodou: a
conta ChatGPT recusou `gpt-5.5` (o modelo do `~/.codex/config.toml`) e `gpt-5.4` (passado por
`--model`) com `model_not_found`. Por isso esta rodada teve só a lente opus.

A lente 1 rodou a verificação dela: backend com 197 testes passando (Import, StudentResolver,
StudentData, Enrollment, SpreadsheetTemplate e as catracas), front com 246 testes passando, e
`tsc --noEmit` e `pnpm lint` limpos. Nenhuma lei do §5 foi violada.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Importante | Aluno novo da importação entra sem validar o formato do e-mail (`ana@` vira `new` e é gravado), e o Actualizar valida por `StudentData`. Depois de gravado, o aluno não salva mais pelo cadastro nem aceita Actualizar numa importação futura. | CONFIRMED | `backend/app/Domains/Identity/Services/StudentResolver.php:132-163`; `backend/app/Domains/Operation/Data/ImportConfirmRowData.php:35`; `backend/app/Domains/Identity/Data/StudentData.php:38` | aguarda decisão do João |
| Q-2 | Menor | Os tetos de `users.email` (255) e `users.phone` (30) estão repetidos no resolver, no `StudentData` e no editor do front, e o `EnrollmentData` já aceita telefone com `max:50`. | CONFIRMED | `backend/app/Domains/Identity/Services/StudentResolver.php:26-28`; `backend/app/Domains/Identity/Data/StudentData.php:38,40`; `frontend/src/features/operation/components/Enrollment/ImportRowEditor.tsx:9-10`; `backend/app/Domains/Operation/Data/EnrollmentData.php:51` | registrado, não bloqueia |
| Q-3 | Menor | A prévia e a confirmação dividem o balde `throttle:import` (5 por minuto por usuário), então uma importação custa no mínimo duas requisições. | CONFIRMED | `backend/app/Domains/Operation/routes.php:48-49`; `backend/app/Shared/RateLimiting/RateLimits.php:46,75-76` | registrado, não bloqueia |
| Q-4 | Menor | `useBlobDownload` revoga o object URL no mesmo tick do `click()`. O efeito depende do navegador; no Chromium funciona, como a jornada mostrou. | PLAUSIBLE | `frontend/src/shared/hooks/useBlobDownload.ts:15-17` | observação |
| Q-5 | Menor | O mapa de tom por status está em dois lugares (`TAG` e `TONES`), e `isRegistered` está duplicado no hook e na tabela. | CONFIRMED | `frontend/src/features/operation/components/Enrollment/ImportTriageTable.tsx:22-25`; `frontend/src/features/operation/components/Enrollment/ImportCounts.tsx:9-15`; `frontend/src/features/operation/hooks/useImportStudentsFlow.ts:27` | registrado, não bloqueia |
| Q-6 | Menor | `divergent` sai como `string[]` (o subconjunto só existe num comentário), e o front faz cast para indexar. | CONFIRMED | `backend/app/Domains/Operation/Data/ImportPreviewRowData.php:27-28`; `frontend/src/features/operation/components/Enrollment/ImportTriageTable.tsx:48` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 1 confirmado, 0
plausíveis, 0 refutados · Menor: 4 confirmados, 1 plausível, 0 refutados

Observações da lente 1 que não viraram achado:

- O commit `e9838885` tirou o link do modelo do cabeçalho e o pôs no corpo do passo de upload. A
  D7 da spec e `jornada.md:21` ainda dizem "no cabeçalho", e nenhuma ruling registra a mudança.
  Isso deve ser registrado no fechamento.
- `StudentResolver` (Service) injeta `UpdateStudentAction`, e `ImportPreviewService` importa
  `ImportStudentsAction` só pela constante `MAX_LINHAS`. São inversões de camada conscientes; a
  primeira está registrada na ruling da Task 4.
- As regras novas de `.p-dialog-header` em `brand-theme.css` ficaram sem consumidor. É inofensivo.
- O `template` do `EnrollmentController` (`:103-104`) não apaga o arquivo temporário se o `write`
  lançar exceção. O vazamento é desprezível.
