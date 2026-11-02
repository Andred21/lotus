# 47 — Revisão

## Em aberto

## Rodada 2 — `d220a04f..542b0560` — 2026-11-02 · Lente 1: opus · Lente 2: sonnet

Classificação: alto risco, como na rodada 1. A lente Codex de novo não rodou: o `codex-companion`
recusou `gpt-5.5` com o mesmo `model_not_found` ("not supported when using Codex with a ChatGPT
account"). A rodada ficou só com o `revisor-bloco`.

As correções da rodada 1 — Q-1 `bd7f38dd`, Q-2 `ded32f6e`, Q-3 `d8c7dded`, Q-4 `bcb679db`, Q-5
`2110e7a6`, Q-6 `542b0560` — foram conferidas pela lente 1, sem regressão (`tsc` limpo, `eslint`
limpo, 306 testes de frontend e 19 de backend nos filtros tocados). A "Quitar firma" da gerente
ficou como está: tela de um arquivo só, fora do ruling 22.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | A lista de cotizaciones tem o defeito do Q-1 da rodada 1: uma `useUploadQuoteFile()` serve todas as linhas e só a linha que envia fica travada; um envio em outra linha solta o observer do primeiro, e o 422 dele não chega ao banner | CONFIRMED | `frontend/src/features/commercial/hooks/useQuoteFiles.ts:13,17,38-39`; `@tanstack/query-core@5.101.1 mutationObserver.js:58` (`removeObserver`) | registrado; não bloqueia |
| Q-2 | Menor | `docs/estrutura-monolito.md` não registra o `AppSignatureSlot`, peça nova da pasta `AppSignatureUpload/` que as três telas de assinatura consomem | CONFIRMED | `docs/estrutura-monolito.md:128`; `frontend/src/shared/ui/AppSignatureUpload/index.ts:1` | divergência de doc: P-111 |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis,
0 refutados · Menor: 2 confirmados, 0 plausíveis, 0 refutados

## Rodada 1 — `d220a04f..901e4135` — 2026-11-02 · Lente 1: opus · Lente 2: sonnet

Classificação: alto risco (backend de arquivos comerciais — `ReplaceFileOfTypeAction`,
`UploadFileAction` — e assinatura do gerente que entra no certificado). A lente Codex do Passo 4 não
rodou: o `codex-companion` recusou `gpt-5.5` (modelo do `~/.codex/config.toml`) e `gpt-5.4` com
`model_not_found` — "not supported when using Codex with a ChatGPT account". A rodada ficou só com o
`revisor-bloco`.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | Envio concorrente em dois slots do presupuesto perde o erro do primeiro: uma `useUploadBudgetFile()` serve os três slots e só o slot do último envio fica desabilitado; o `mutate` novo solta o observer do anterior e um 422 do primeiro não chega a `upload.error` | CONFIRMED | `frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx:30,95`; `@tanstack/query-core@5.101.1 mutationObserver.js:58` (`removeObserver`) | registrado; não bloqueia |
| Q-2 | Menor | Excluir da firma do redator sem `removeLabel`: o nome acessível cai em `common.delete`, enquanto os documentos do mesmo diálogo levam o tipo (ruling 22) e a firma do gerente diz "Remove signature" | CONFIRMED | `frontend/src/features/identity/components/Redator/RedatorSignatureSlot.tsx:71`; `frontend/src/shared/ui/AppFileSlot/AppFileSlot.tsx:98-99` | registrado; não bloqueia |
| Q-3 | Menor | Montagem do slot de assinatura (`useSignatureCleaner` + `AppFileSlot` + `SignatureHint`/`SignaturePreview`) repetida em três consumidores, que já divergem no `showing` | CONFIRMED | `RedatorSignatureSlot.tsx:38-72`, `ProfileSignatureSlot.tsx:30-64`, `ManagerSignatureField.tsx:27-61` | registrado; não bloqueia |
| Q-4 | Menor | Nome acessível do excluir do arquivo da cotização usa o nome do curso ("Delete Alta tensión"), e a lixeira da cotação fica "Delete" | PLAUSIBLE | `frontend/src/features/commercial/components/Budget/QuoteRow.tsx:95,107` | observação: os fatos conferem; se o nome engana é juízo de UX que o repositório não decide |
| Q-5 | Menor | `UploadFileAction::execute` sem chamador em `app/`; só o teste o usa. É a forma subir-e-registrar que originou a P-49 | CONFIRMED | `backend/app/Shared/Files/Actions/UploadFileAction.php:22-27`; único chamador `backend/tests/Feature/Cadastros/UploadFileActionTest.php:29` | registrado; não bloqueia |
| Q-6 | Menor | Foto em stage na criação (URL `blob:`) ganha ver/baixar/substituir/excluir e a confirmação de exclusão irreversível; a spec §4.1 pede só o tirar do stage | CONFIRMED | `frontend/src/shared/ui/AppPhotoField/AppPhotoField.tsx:109-118`; `frontend/src/shared/hooks/useEntityPhoto.ts:64,127` | registrado; não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis,
0 refutados · Menor: 5 confirmados, 1 plausível, 0 refutados
