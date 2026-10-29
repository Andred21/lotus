# 43 — Revisão

## Em aberto

## Rodada 1 — `0c09fa4f..e7f8e15b` — 2026-10-29 · Lente 1: opus · Lente 2: sonnet

Classificação: **alto risco** (tocou `generated.ts` e os diálogos de certificado `RevokeDialog` e
`ConfirmIssueDialog`). A lente Codex foi tentada duas vezes e não rodou: a conta ChatGPT recusa
`gpt-5.5` (o `model` do `~/.codex/config.toml`) e `gpt-5.4` com `model_not_found`. A rodada ficou
só com o `revisor-bloco`.

O revisor rodou `pnpm lint` e `pnpm test` (185 arquivos, 1326 testes, verdes) e conferiu: lei 3 (o
hash do manifest bate com o `md5sum` do `generated.ts`), lei 6 (nenhum `primereact` nem import
entre features nas linhas novas), lei 7 (o anexo não bloqueia nada), o `size` obrigatório pelo tipo
e todos os consumidores contra a §4.3 da spec.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | Um arquivo grande demais é recusado, mas o anterior continua escolhido e o "Subir" fica ligado. O 422 antigo também segue na tela. | CONFIRMED | `frontend/src/features/commercial/hooks/useBudgetDocumentUpload.ts:79`, `:82`; `frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx:57-66` | registrado; não corrigido |
| Q-2 | Menor | A escolha do tipo é exclusiva, mas é anunciada como três botões `aria-pressed` num `role="group"`, e não como radiogroup. É resíduo da spec §4.5. | CONFIRMED | `frontend/src/features/commercial/components/Budget/BudgetDocumentUploadDialog.tsx:44-55`; `frontend/src/shared/ui/AppSelectableCard/AppSelectableCard.tsx:60-64` | registrado; não corrigido |
| Q-3 | Menor | A spec §4.4 dizia "uma coluna abaixo de `md`", e o código usa `sm`, que é o medido no smoke. | CONFIRMED | `spec.md:117-118`; `StudentIdentifyFields.tsx:22`; `FormPhotoRow.tsx:29` | spec corrigida para `sm` em `21a8f5bc` |
| Q-4 | Menor | O cast `message as string \| null` compensa o retorno sem anotação do `useMutationErrors`, cujo `?? null` some do tipo. | CONFIRMED | `frontend/src/features/commercial/hooks/useBudgetDocumentUpload.ts:16`; `frontend/src/shared/hooks/useEntityForm.ts:62` | registrado; não corrigido |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis,
0 refutados · Menor: 4 confirmados, 0 plausíveis, 0 refutados

**Depois do intervalo revisado.** O `9bd0ec86` foi pedido pelo João durante esta rodada:
`ClientDialog`, `StudentDialog`, `RedatorDialog` e o picker do `RedatorDesignation` passaram para
`lg` (rulings, item 12). São quatro props `size` e um docblock. Passaram `pnpm lint`, `pnpm test`
(1326 testes) e `tsc -b`. A lente 1 não os leu. Também falta ver no navegador os quatro diálogos em
`lg` e o M-9 (`ConfirmIssueDialog`/`RevokeDialog` a 28rem): fica para um `lotus-ui-review` antes do
merge.
