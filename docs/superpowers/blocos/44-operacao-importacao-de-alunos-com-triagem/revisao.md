# 44 — Revisão

## Em aberto

## Rodada 3 — `8c1659d6..51da9d99` — 2026-11-01 · Lente 1: opus · Lente 2: sonnet

Esta rodada revisa o bloco inteiro, com foco no `51da9d99`, que aplica as correções aprovadas da
rodada 2: o Q-1 (`TetosDeColuna` em `RedatorData`, `UserData` e `ClientData`, com o docblock
corrigido) e o Q-2 (o `ImportRowEditor` usa o `isRegistered` do hook). A lente 1 confirmou as
duas sem regressão:
- os três testes novos provam o `max`, e não o formato do e-mail;
- o seeder de demo cabe nos tetos;
- a carga inicial não passa pelos DTOs;
- o erro de `phone` aparece nas três telas.

A suíte do backend passou inteira (1621 testes, 5 skipped). No front, `tsc`, lint e vitest
passaram (1443 testes). A lente Codex segue fora, pelo mesmo `model_not_found` das rodadas
anteriores.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | O contato do cliente (`ClientContactData`) grava `email` e `phone` sem teto de coluna. `client_contacts.phone` é `string(30)`, então um telefone de 31 caracteres no `POST /api/clients` passa a validação e estoura como 500 em MySQL strict. Anterior ao bloco. | CONFIRMED | `backend/app/Domains/Commercial/Data/ClientContactData.php:21-22`; `backend/database/migrations/2026_07_06_141820_clients.php:43`; `frontend/src/features/commercial/components/Client/ContactCard.tsx:101-110` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

Correções da rodada 2, aplicadas em `51da9d99`: Q-1 e Q-2.

Observações da lente 1 que não viraram achado:

- A emenda do texto da spec segue pendente para o fechamento: a D6 (`spec.md:71`) com o
  limitador da prévia e a D7 e `jornada.md:21` com o link do modelo "no cabeçalho".
- A validação da carga inicial também não tem teto para e-mail e telefone de redator e cliente
  (`ArquivoDeCarga.php:122-160`). O defeito é anterior ao bloco e a fonte é um arquivo escrito à
  mão pelo João, então fica só como nota.
- Uma linha cadastrada com Actualizar e e-mail X, antes de uma linha nova com o mesmo X, aparece
  como `new` na prévia e é recusada só na confirmação. O custo está aceito na ruling da Task 4
  (D18).

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
