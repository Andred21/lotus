# Bloco 47 — Arquivo num padrão só (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** todo lugar do produto com arquivo segue o padrão do CV do redator — ícones ver, baixar,
substituir, excluir, com dica nos três idiomas e confirmação ao excluir — e presupuesto/cotización
passam a guardar um arquivo por tipo, com o anterior apagado e auditado.

**Architecture:** a confirmação e a dica entram no `AppFileActions` e no `AppFileUpload`, e valem
para todos os consumidores de uma vez; nasce `AppFileSlot` em `shared/ui` (título, linha, ações,
enviar/substituir, vazio), que reverte a D8. O `AppSignatureUpload` se divide em limpeza
(`useSignatureCleaner`) e preview (`SignaturePreview`) para o disparador virar ícone do slot. No
backend, uma action do Commercial substitui o arquivo do mesmo tipo.

**Tech Stack:** React 19 + TS, PrimeReact via `shared/ui`, Vitest + RTL, Laravel 13, owen-it.

**Spec:** `docs/superpowers/blocos/47-frontend-ajustes-de-interface-lote-2/spec.md` (tickets em
`tickets/`).

## Global Constraints

- PrimeReact (`Tooltip`, `FileUpload`) só dentro de `shared/ui` (lei 6).
- Auditoria por instância (`$file->delete()`), nunca pelo query builder (lei 2).
- Toda chave nova nos três locales (`pt-BR`, `es-CL`, `en`); `parity.test.ts` verde.
- Dica abre à esquerda (`tooltipOptions={{ position: 'left' }}`), texto = `aria-label`.
- Ordem das ações: ver, baixar, substituir, excluir.
- Nada de schema, migration, DTO, `generated.ts`.
- Sem rolagem horizontal da página em 390 e 1440 por causa da dica.
- Frontend: `pnpm build`, `pnpm lint`, `pnpm test` de `frontend/`; backend:
  `docker compose exec -T app php artisan test --filter=<Classe>`; Pint só nos arquivos tocados.

## Review Focus

1. Arquivar e restaurar o presupuesto/cotização depois de substituir não pode ressuscitar o
   arquivo substituído (o restore traz só `archived_with_parent = true`). Teste na Task 1.
2. Dois arquivos vivos do mesmo tipo (dado antigo): o slot mostra o de `created_at` mais novo,
   desempate por `id` maior, e o próximo envio apaga os dois. Testes nas Tasks 1 e 8.
3. Excluir cancelado no `ConfirmDialog` não chama `onRemove`; confirmado chama uma vez só. Teste na
   Task 2.
4. Disparador só-ícone sem `chooseLabel` ganha dica e nome traduzidos, nunca o "Choose" do Prime.
   Teste na Task 2.
5. Gerente e turma não podem ficar com confirmação dupla (a própria + a da peça). Testes nas
   Tasks 2 (remoção da própria) e 4/9.

---

### Task 1: Backend — um arquivo por tipo em presupuesto e cotización

**Files:**
- Create: `backend/app/Domains/Commercial/Actions/ReplaceFileOfTypeAction.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php`,
  `backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php`
- Test: `backend/tests/Feature/Comercial/CommercialFilesTest.php`

**Interfaces:**
- Produces: `ReplaceFileOfTypeAction::execute(Model $owner, UploadedFile $file, string $type): File`.
  Os endpoints `POST budgets/{budget}/files` e `POST quotes/{quote}/files` mantêm request e
  resposta (`FileData`).

- [ ] **Step 1: testes que falham**, em `CommercialFilesTest`:
  - `test_novo_upload_do_mesmo_tipo_substitui_no_orcamento`: sobe `invoice` duas vezes; o primeiro
    fica `trashed()`, existe linha em `audits` com `event = 'deleted'` e `auditable_id` do
    primeiro; `$budget->files()->where('type','invoice')->count() === 1`, e é o segundo.
  - `test_substituir_nao_toca_outro_tipo`: `invoice` + `receipt`, novo `invoice`; o `receipt`
    continua vivo.
  - `test_novo_upload_substitui_na_cotacao`: mesmo par para `quote_document`.
  - `test_duplicados_antigos_saem_todos_no_proximo_upload`: cria dois `invoice` vivos direto pelo
    model, sobe um terceiro; só o terceiro vivo, dois `deleted` auditados.
  - `test_arquivar_e_restaurar_nao_ressuscita_o_substituido`: substitui, arquiva e restaura o
    budget pelas rotas existentes; só o novo vivo.
- [ ] **Step 2:** `docker compose exec -T app php artisan test --filter=CommercialFilesTest` — os
  novos falham (o primeiro arquivo continua vivo).
- [ ] **Step 3: implementar `ReplaceFileOfTypeAction`** no molde de
  `StoreRedatorDocumentAction`: `metadataOf` + `put` fora da transação; dentro de
  `DB::transaction`, `$owner->files()->where('type', $type)->get()->each(fn (File $f) => $f->delete())`
  e `register`; `catch` chama `discard($path)` e relança. Sem lock (spec 4.8). Os dois `store`
  passam a chamar a action.
- [ ] **Step 4:** a mesma suíte verde; depois `php artisan test` inteiro verde.
- [ ] **Step 5:** Pint nos três arquivos PHP; commit `feat(47): presupuesto e cotizacao com um arquivo por tipo`.

### Task 2: A peça compartilhada — dica, confirmação e `AppFileSlot`, com o CV migrado

**Files:**
- Create: `frontend/src/shared/ui/AppFileSlot/AppFileSlot.tsx`, `index.ts`, `AppFileSlot.test.tsx`
- Modify: `frontend/src/shared/ui/AppFileActions/AppFileActions.tsx` (+ `.test.tsx`),
  `frontend/src/shared/ui/AppFileUpload/AppFileUpload.tsx`,
  `frontend/src/shared/ui/AppDownloadButton/AppDownloadButton.tsx`, `frontend/src/shared/ui/index.ts`,
  `frontend/src/shared/config/locales/{pt-BR,es-CL,en}.json`,
  `frontend/src/features/identity/components/Redator/SlotBody.tsx`,
  `frontend/src/features/certification/components/Settings/ManagerSignatureField.tsx`,
  `frontend/src/features/certification/hooks/useCertificateSettingsForm.ts`,
  `frontend/src/features/operation/components/Document/TurmaDocuments.tsx`,
  `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx` (só o repasse da
  confirmação), testes de feature que hoje clicam na lixeira sem confirmar
  (`CertificateSettingsPanel.firma.test.tsx`, `FileList.test.tsx`, os do redator e da turma que
  falharem).

**Interfaces:**
- Produces:
  - `AppFileActions` ganha `confirmTitle?: string`, `confirmMessage?: string`,
    `confirmLabel?: string`, `removeError?: string | null`; `onRemove?: () => void | Promise<unknown>`
    é chamado **só depois do sim** do `ConfirmDialog` (`severity="danger"`, `pending={removing}`).
    Promise: o diálogo fica aberto até resolver; rejeitada, fica aberto mostrando `removeError`.
    Retorno `void`: fecha no ato. Defaults: `common.deleteFileTitle`, `common.deleteFileMessage`
    (`{{name}}` = `file.original_name`), `common.delete`.
  - Todo botão do `AppFileActions` tem `tooltip` = `aria-label`, `position: 'left'`;
    `AppDownloadButton` aceita e repassa `tooltip` (default: o próprio rótulo acessível).
  - `AppFileUpload`: disparador sem `chooseLabel` ganha dica = nome acessível, num `span`
    invólucro com `Tooltip` (o `FileUpload` não tem prop de dica). Com rótulo visível, sem dica.
  - `AppFileSlot<T extends PreviewableFile>` com props:
    `title?: ReactNode` (texto ou tag), `file: T | null | undefined`, `onPreview: (f: T) => void`,
    `onUpload?: (e: FileUploadHandlerEvent) => void` (ausente = sem enviar/substituir),
    `uploadLabel?: string` (default `common.upload`), `replaceLabel?: string` (default
    `common.replace`), `accept?`, `maxBytes?`, `uploading?: boolean`,
    `onSizeReject?: (m: string) => void`, os de remoção do `AppFileActions` repassados,
    `staged?: File`, `onUnstage?: () => void`, `children?: ReactNode` (corpo extra abaixo da
    linha: preview da assinatura, aviso). Vazio = `common.notLoaded` + enviar; cheio = linha +
    ver, baixar, substituir, excluir; `staged` = linha + tirar do stage (`pi pi-times`).
  - Chaves novas: `common.replace` ("Substituir" / "Reemplazar" / "Replace"),
    `common.deleteFileTitle`, `common.deleteFileMessage`, `photo.fileName` ("Foto" / "Foto" /
    "Photo"), `budget.otherDocuments`.
- O docblock do `AppFileActions` deixa de citar a D8 "em vigor" e registra a reversão (bloco 47).

- [ ] **Step 1: testes que falham.** `AppFileActions.test`: clicar na lixeira abre o diálogo e não
  chama `onRemove`; cancelar não chama; confirmar chama uma vez; cada botão tem dica com o texto do
  `aria-label` (hover + `findByText`). `AppFileSlot.test`: vazio mostra "No cargado" e só o enviar,
  com nome `common.upload`; cheio mostra os quatro na ordem ver, baixar, substituir, excluir; sem
  `onUpload` não há substituir; sem `onRemove` não há lixeira; `staged` mostra só o tirar.
  Disparador só-ícone: nome e dica traduzidos, nunca `Choose`.
- [ ] **Step 2:** `pnpm test -- AppFileActions AppFileSlot` falha.
- [ ] **Step 3: implementar** o descrito em Interfaces. Gerente: a `ManagerSignatureControl` perde
  `confirmingRemove/askRemove/cancelRemove/confirmRemove` e expõe `remove: () => Promise<unknown>`;
  o `ManagerSignatureField` passa `onRemove={control.remove}` com os textos dele em
  `confirmTitle/confirmMessage/confirmLabel` e apaga o `ConfirmDialog` próprio. Turma: o
  `TurmaDocuments` apaga o `ConfirmDialog` e o `pendingRemoval`; o `DocumentTypeCard` passa a
  confirmação (com o texto que o `TurmaDocuments` usava) ao `AppFileActions`; a guarda
  `canSubmit`/`removing` continua no handler. `SlotBody` vira consumidor do `AppFileSlot`.
- [ ] **Step 4:** `pnpm test` inteiro, `pnpm lint`, `pnpm build` verdes (testes de feature
  ajustados para clicar no confirmar).
- [ ] **Step 5:** commit `feat(47): slot de arquivo compartilhado com dica e confirmacao`.

### Task 3: Assinatura do redator (admin e Perfil)

**Files:**
- Modify: `frontend/src/shared/ui/AppSignatureUpload/AppSignatureUpload.tsx` (+ `.test.tsx`),
  `frontend/src/shared/ui/AppSignatureUpload/index.ts`,
  `frontend/src/features/identity/components/Redator/RedatorSignatureSlot.tsx` (+ `.test.tsx`),
  `frontend/src/features/identity/components/Profile/ProfileSignatureSlot.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: `AppFileSlot` (Task 2).
- Produces: `useSignatureCleaner(): { pick: (e: FileUploadHandlerEvent) => void; preview: { file: File; url: string } | null; error: string | null; processing: boolean; reset: () => void }`
  e `SignaturePreview({ cleaner, onConfirm: (file: File) => void, busy?: boolean, disabled?: boolean })`
  (xadrez + Confirmar/Cancelar em texto + erro + "processando"), ambos exportados de `shared/ui`.
  Constantes do slot: `SIGNATURE_ACCEPT = 'image/png,image/jpeg,image/webp'`,
  `SIGNATURE_MAX_ORIGINAL_BYTES = 25 * 1024 * 1024`. O `AppSignatureUpload` vira composição dos
  dois (continua exportado até a Task 4 tirar o último uso).

- [ ] **Step 1: testes que falham.** `RedatorSignatureSlot.test`: em `edit` com firma, os quatro
  ícones; escolher imagem mostra o preview abaixo da linha; Confirmar chama `onUpload` com o PNG
  limpo; em `view`, só ver e baixar. `ProfileSignatureSlot.test`: sem excluir; `self_service` falso
  mostra `profile.documents.managedByAdmin` e nenhum enviar.
- [ ] **Step 2:** falham.
- [ ] **Step 3:** dividir o `AppSignatureUpload` e montar os dois slots com `AppFileSlot`
  (`onUpload={cleaner.pick}`, `accept`, `maxBytes`, `children={<SignaturePreview …/>}`). O
  `uploadKey` vira `cleaner.reset()` depois do upload aceito.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm build` verdes.
- [ ] **Step 5:** commit `feat(47): assinatura do redator no padrao do slot`.

### Task 4: Assinatura do gerente em Configuración › Certificados

**Files:**
- Modify: `frontend/src/features/certification/components/Settings/ManagerSignatureField.tsx`,
  `CertificateSettingsPanel.firma.test.tsx`

**Interfaces:**
- Consumes: `AppFileSlot` (Task 2), `useSignatureCleaner`, `SignaturePreview` (Task 3).

- [ ] **Step 1: teste que falha:** com firma, a imagem sobre xadrez continua, a linha tem os quatro
  ícones com dica; substituir abre o preview; excluir abre **um** diálogo só, com o texto do
  gerente (`certificateSettings.removeTitle`).
- [ ] **Step 2:** falha.
- [ ] **Step 3:** trocar `AppFileRow` + `AppSignatureUpload` pelo `AppFileSlot`, mantendo
  `signatureHelp`, a imagem e o `FormErrorBanner`. Se nenhum uso de `AppSignatureUpload` sobrar,
  apagá-lo e o teste dele (os casos de limpeza migram para o de `useSignatureCleaner`).
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm build` verdes.
- [ ] **Step 5:** commit `feat(47): assinatura do gerente no padrao do slot`.

### Task 5: Documentos do Perfil do redator

**Files:**
- Modify: `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: `AppFileSlot` (Task 2).

- [ ] **Step 1: teste que falha:** com arquivo e `self_service`, ver, baixar e substituir só ícone,
  o substituir com nome `profile.documents.replaceNamed` (`{tipo}`) e dica; sem lixeira; REUF
  (`self_service: false`) só ver/baixar e o aviso `managedByAdmin`.
- [ ] **Step 2:** falha.
- [ ] **Step 3:** montar com `AppFileSlot` (`title` = `ProfileDocumentSlotHeader`,
  `replaceLabel`/`uploadLabel` com o nome do tipo); o `UPLOAD_CHOOSE_OPTIONS` de texto sai.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm build` verdes.
- [ ] **Step 5:** commit `feat(47): documentos do perfil com acoes so icone`.

### Task 6: Fotos (cliente, redator, aluno, usuário, Perfil)

**Files:**
- Modify: `frontend/src/shared/ui/AppPhotoField/AppPhotoField.tsx`, create
  `frontend/src/shared/ui/AppPhotoField/AppPhotoField.test.tsx`

**Interfaces:**
- Consumes: `AppFileActions`, `AppFileUpload` com dica (Task 2). Props do `AppPhotoField` não
  mudam, então `FormPhotoRow` e `ProfileIdentityCard` não se tocam.

- [ ] **Step 1: teste que falha:** com `url`, embaixo do avatar: ver, baixar, substituir, excluir,
  com dica; ver abre o `AppFilePreviewDialog` com a imagem; excluir confirma e só então chama
  `onRemove`; sem `url`, só o enviar (`photo.select` como nome); `readOnly` com `url` mostra só ver
  e baixar; `error` + `onRetry` mostra "Reintentar".
- [ ] **Step 2:** falha.
- [ ] **Step 3:** o arquivo previsualizável é
  `{ original_name: t('photo.fileName'), mime: 'image/jpeg', download_url: url }` (a URL é a única
  coisa que o `useEntityPhoto` expõe; o `mime` só serve para o preview escolher imagem); o preview
  mora no próprio campo (`useFilePreview`). Rótulos: substituir = `photo.replace`, excluir =
  `photo.remove`.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm build` verdes.
- [ ] **Step 5:** commit `feat(47): fotos com acoes so icone e preview`.

### Task 7: Cotización com um slot

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/QuoteRow.tsx`,
  `QuotesList.test.tsx` (ou `BudgetQuotesCard.test.tsx`, onde o upload de cotização já é testado)

**Interfaces:**
- Consumes: `AppFileSlot` (Task 2); backend da Task 1 (sem mudança de contrato). Props do
  `QuoteRow` não mudam.
- Produces: `latestFile<T extends { created_at?: string | null; id: number }>(files: T[]): T | undefined`
  em `frontend/src/features/commercial/lib/latestFile.ts` (+ `.test.ts`): maior `created_at`,
  desempate pelo maior `id`.

- [ ] **Step 1: testes que falham:** `latestFile` com dois do mesmo dia devolve o de maior `id`;
  lista vazia, `undefined`. `QuoteRow` com dois arquivos mostra só o mais recente, com os quatro
  ícones; vazio mostra o enviar com dica.
- [ ] **Step 2:** falham.
- [ ] **Step 3:** o bloco "Documentos" vira `AppFileSlot` com `title={t('quote.documents')}`,
  `file={latestFile(quote.files ?? [])}`; o `FileList` sai do `QuoteRow`.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm build` verdes.
- [ ] **Step 5:** commit `feat(47): cotizacao com um slot de documento`.

### Task 8: Presupuesto com três slots fixos

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDocumentsCard.tsx`,
  `frontend/src/features/commercial/lib/budgetDocumentType.ts`, `BudgetDetailPage.test.tsx`
- Delete: `BudgetDocumentUploadDialog.tsx` (+ `.test.tsx`),
  `frontend/src/features/commercial/hooks/useBudgetDocumentUpload.ts` (+ `.test.tsx`)
- Modify: `frontend/src/features/commercial/hooks/useBudgetDetail.ts` (só o comentário que cita o
  hook apagado)

**Interfaces:**
- Consumes: `AppFileSlot` (Task 2), `latestFile` (Task 7), backend da Task 1.
- Produces: `budgetDocumentTag` ganha `icon`: `purchase_order` = `pi pi-shopping-cart`,
  `invoice` = `pi pi-receipt`, `receipt` = `pi pi-money-bill`; hues não mudam.
- O upload por slot usa `useUploadBudgetFile` de `features/commercial/api/useCommercialFiles`
  (a mesma mutation que o `useBudgetDocumentUpload` envolvia), com o `type` do slot; o erro do
  upload vai para o `FormErrorBanner` do cartão, junto do `fileError` de remoção
  (`useMutationErrors`).

- [ ] **Step 1: testes que falham** (`BudgetDetailPage.test`): o cartão mostra três slots na ordem
  Ordem de compra, Fatura, Comprovante; não existe botão "Enviar documento"; enviar no slot Fatura
  manda `type=invoice`; dois `invoice` antigos mostram só o mais recente; arquivo de tipo fora do
  enum aparece abaixo dos slots sob `budget.otherDocuments`, com a tag neutra; cada tag tem o
  ícone do tipo.
- [ ] **Step 2:** falham.
- [ ] **Step 3:** três `AppFileSlot` com `title` = `AppTag` maior (`className="text-sm px-3 py-1"`,
  `icon`), arquivo = `latestFile` dos arquivos do tipo; os de tipo fora do enum num `FileList`
  com `showType` abaixo; apagar diálogo e hook. Comentários do `budgetDocumentType.ts` que falam do
  diálogo passam a falar dos slots.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm build` verdes.
- [ ] **Step 5:** commit `feat(47): presupuesto com um slot fixo por tipo`.

### Task 9: Documentos de turma

**Files:**
- Modify: `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx`, create
  `DocumentTypeCard.test.tsx`

**Interfaces:**
- Consumes: `AppFileActions` com confirmação e `AppFileUpload` com dica (Task 2). Props do
  `DocumentTypeCard` não mudam.

- [ ] **Step 1: teste que falha:** `canSubmit` mostra o ícone de enviar (nome
  `operation.documents.upload`, com dica) e não o botão de texto; dois PDFs listados, cada um com
  ver, baixar, excluir só ícone; excluir abre um diálogo só; `canSubmit` falso, sem enviar nem
  lixeira; o aviso `uploadHint` continua.
- [ ] **Step 2:** falha.
- [ ] **Step 3:** o `AppFileUpload` perde o `chooseLabel` e passa
  `accessibleName={t('operation.documents.upload')}` com o ícone `pi pi-upload` text rounded.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm build` verdes.
- [ ] **Step 5:** commit `feat(47): documentos de turma com acoes so icone`.

### Task 10: Limpeza e prova na tela

**Files:**
- Modify: `frontend/src/shared/config/locales/{pt-BR,es-CL,en}.json` (chaves que ficaram sem uso:
  as do diálogo de upload do presupuesto e as de assinatura/foto que nenhum `t()` cita mais, cada
  uma conferida por `grep` antes de sair)
- Create: `docs/superpowers/blocos/47-frontend-ajustes-de-interface-lote-2/prova.md`

**Interfaces:**
- Consumes: tudo acima.

- [ ] **Step 1:** `grep` de cada chave candidata em `frontend/src`; remover só as sem uso, nos três
  locales.
- [ ] **Step 2:** `pnpm build`, `pnpm lint`, `pnpm test` e `php artisan test` verdes.
- [ ] **Step 3: prova no stack da lane** (http://localhost:5174, offset +1), nas larguras 390 e
  1440, nos dois temas onde houver cor: CV e firma do redator (admin), Perfil (firma, documentos,
  foto), cliente/aluno/usuário (foto), Configuración › Certificados, presupuesto (três slots,
  tags com ícone, substituir e ver o anterior sumir), cotización, turma. Para cada critério dos
  tickets 01–08, uma linha no `prova.md` com o que foi medido; dica sem rolagem horizontal
  (`scrollWidth` = `clientWidth` do `documentElement`).
- [ ] **Step 4:** commit `docs(47): prova do lote 2`.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 2 | sim | nenhuma entre elas |
| G2 | 3, 5, 6, 7, 9 | sim | nenhuma entre elas |

Task fora de grupo executa e revisa uma a uma: a 4 depois da 3 (consome `useSignatureCleaner`), a
8 depois da 7 (consome `latestFile`), a 10 por último.

Conferência por par do G1: a Task 1 só toca `backend/`; a 2 só `frontend/`. Do G2: a 3 toca
`AppSignatureUpload/*`, `RedatorSignatureSlot*`, `ProfileSignatureSlot*`; a 5,
`ProfileDocumentSlot*`; a 6, `AppPhotoField/*`; a 7, `QuoteRow.tsx`, `lib/latestFile*` e o teste
de cotização; a 9, `DocumentTypeCard*`. Nenhuma toca locale (as chaves novas nascem na Task 2) nem
consome o que outra do grupo produz.

## Handoff de execução

- **executor:** `claude`. A Task 2 reverte uma decisão registrada (D8) e mexe em três consumidores
  com confirmação própria; as Tasks 3 e 8 dividem componente e apagam diálogo e hook; a 10 é
  julgamento visual no navegador. Nada disso é mecânico com caminhos fechados.
- **Sessão:** `opus`, esforço da sessão do `/executar-bloco`.
- **Papéis (`.claude/papeis.md`):** `implementador-integracao` (Tasks 1, 2, 3, 6, 8),
  `implementador-mecanico` (Tasks 4, 5, 7, 9), `revisor-task` (cada task), `re-revisor` (rodadas
  de correção), `corretor-tardio` (rodadas 4–5, se houver), `revisor-branch` (fim da SDD). A Task 10
  roda na sessão.
- **paths_autorizados:** não se aplica (`executor: claude`).
