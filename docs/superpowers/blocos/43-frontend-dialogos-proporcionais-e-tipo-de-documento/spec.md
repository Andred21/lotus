# Bloco 43 — diálogos proporcionais e tipo de documento do orçamento

**Data:** 2026-10-28 · **Lane:** `feat/43-frontend-dialogos-proporcionais-e-tipo-de-documento`
(offset +3) · **Base:** `main@0c09fa4f` · **Classificação:** *bounded*
**Ficha:** `docs/superpowers/backlog.md` §43 (entrou pela PR da própria lane, como a do 42).

## 1. Por que existe

O João abriu o diálogo de matrícula de aluno na Operación e viu os campos empilhados em coluna, num
diálogo largo demais para quatro campos. O levantamento mostrou que o problema é da moldura, não
só da tela:

- **Mesma moldura para tudo.** O `AppDialog` (`shared/ui/AppDialog/AppDialog.tsx:58`) liga
  `maximizable` fixo, e o `style.ts:7` dá uma largura única (`w-[95vw] sm:w-[85vw] lg:w-[70vw]`).
  Por isso uma confirmação de duas linhas abre do tamanho de um formulário e ainda maximiza.
- **Confirmação sem família.** O `ConfirmDialog` só conhece a marca e o `danger`
  (`ConfirmDialog.tsx:22`). O único aviso (`MoveConfirmDialog.tsx:26-37`) foi montado à mão, e o
  `RevokeDialog` e o `ConfirmIssueDialog` também usam o `AppDialog` cru.
- **Formulários empilham.** No diálogo de Alumno, nome e RUT ficam em `sm:grid-cols-1`
  (`StudentIdentifyFields.tsx:21`), embora o docblock prometa 2×2. O `FormPhotoRow` vira coluna
  abaixo de `lg`. O `EnrollStudentForm` não tem grade nenhuma, e os botões ficam no corpo, não no
  footer.
- **Header e footer sem identidade.** Eles usam `--surface-section` (branco no claro), enquanto o
  sidebar e o navbar usam `--brand-navy` (`brand-theme.css:11`).
- **Documento do orçamento sem rótulo.** O tipo se escolhe num `AppDropdown` ao lado do upload
  (`BudgetDocumentsCard.tsx:36-44`), e depois a lista não mostra o tipo, embora o backend o grave
  em `files.type`. A orden de compra não pode ser anexada: hoje é só o texto
  `quotes.purchase_order`, e o backend aceita só `invoice` e `receipt`
  (`BudgetFileController.php:23`).

## 2. Objetivo

Diálogos com tamanho proporcional ao conteúdo, em duas famílias que se distinguem à primeira vista
— a **moldura padrão** (formulário e visualização, com header e footer navy) e a **confirmação
compacta** (confirmar, aviso, excluir) —, e documento do orçamento etiquetado pelo tipo escolhido
num diálogo, com a tag visível na lista.

**Sucesso, para o João:** o diálogo de aluno abre organizado em grade, sem rolagem lateral; uma
confirmação de exclusão é reconhecível como perigosa antes de ler o texto; subir uma factura não
depende de lembrar de trocar um combo antes.

## 3. Decisões do João (2026-10-28)

| # | Pergunta | Decisão |
|---|---|---|
| J1 | Fluxo do upload | Um botão **"Subir documento"** abre um diálogo pequeno: escolhe o tipo em cartões, depois o arquivo, e confirma. A lista mostra a tag do tipo |
| J2 | Orden de compra | Vira **terceiro tipo de arquivo** anexável. O campo de texto `quotes.purchase_order` continua |
| J3 | Estilo da confirmação | **Ícone grande circular + faixa de cor** no topo, na cor da severidade; sem header navy; sem maximizar; ~28rem |
| J4 | Alcance do navy | Header e footer navy em **todos os diálogos de formulário e visualização**. A confirmação compacta tem estilo próprio |
| J5 | Tamanhos | **Três tamanhos fixos** `sm` / `md` / `lg`; cada consumidor declara o seu |
| J6 | Maximizar | **Só no `lg`** |
| J7 | Diálogo de Alumno | **Foto à esquerda + grade de 2 colunas**: Nome │ RUT, E-mail │ Teléfono; Empresa na linha inteira abaixo; uma coluna em tela estreita |
| J8 | Validação do tipo | **Enum do domínio Comercial** (`BudgetDocumentType`), no molde do `TurmaDocumentType`; `generated.ts` regenerado; o tipo TS escrito à mão sai |
| J9 | Onde a OC se anexa | **No orçamento**, junto de factura e comprobante, pelo mesmo diálogo. O PDF da OC não se liga a uma cotação específica, embora o número `purchase_order` seja campo de cada cotação (`Quote.php:40`); a ligação, se precisar, é decisão futura. Várias OCs por orçamento são aceitas, como as facturas |
| J10 | `danger` e a `P-74` | **Fora.** O botão `danger` preenchido mede 3,76:1 no claro (`P-74`, aberta); o bloco o usa como está e declara o resíduo (§5) |

## 4. Design

### 4.1 Moldura padrão (`AppDialog` / `CrudDialog`)

- **Prop `size: 'sm' | 'md' | 'lg'`** no `AppDialog` e no `CrudDialog`, sem default silencioso de
  70vw. Larguras de partida: `sm` ≈ 32rem, `md` ≈ 48rem, `lg` ≈ 64rem; todas limitadas a `95vw` em
  tela estreita. Os valores finais são do builder, medidos no navegador (§4.5).
- **Maximizar só no `lg`** (J6): `maximizable` deixa de ser fixo e passa a depender do tamanho. O
  rótulo acessível dinâmico do botão (`AppDialog.tsx:71-73`) continua para quem maximiza.
- **Header e footer navy** (J4): `--brand-navy` como fundo, `--shell-ink` como tinta do título e do
  botão fechar, e o `--focus-stroke` redeclarado como `var(--brand)` no header e no footer, como o
  sidebar já faz (`Sidebar.tsx:32`). O `--brand-navy` não muda com o tema, então header e footer
  ficam navy no claro e no escuro, como o shell.
- **Botões no footer.** Os botões do footer navy precisam ler sobre o navy: o primário de marca e o
  `text`/`outlined` de cancelar. O builder confere contraste AA (4,5:1 texto, 3:1 contorno) dos dois
  sobre o navy, nos dois temas, e ajusta via pt/classe em `shared/ui` se reprovar.
- O conteúdo continua em `--surface-card`.

### 4.2 Confirmação compacta (`ConfirmDialog`)

- O `ConfirmDialog` evolui; não nasce um segundo primitivo. `severity` passa a ser
  `'confirm' | 'warning' | 'danger'`, com `'confirm'` como default (o comportamento sem severidade
  de hoje).
- **Visual (J3):** largura fixa ≈ 28rem (limitada a `95vw`), sem maximizar; faixa de cor no topo
  e ícone circular grande à esquerda do título, na cor da severidade: `confirm` = marca, `pi-check`
  ou `pi-question`; `warning` = âmbar, `pi-exclamation-triangle`; `danger` = vermelho, `pi-trash` ou
  `pi-exclamation-circle`. O botão de confirmar veste a mesma severidade. Sem header navy.
- **Âmbar:** o `brand-theme.css` registra que o token `ámbar-aviso` nunca foi construído (D-P16). O
  aviso usa a paleta `warning` do tema Lara já gerado; não nasce token de marca novo. O contraste do
  ícone e do botão `warning` passa pela régua do `tone-ink.test.ts`.
- `children` continua (ex.: o motivo do `RevokeDialog`, a lista do `ConfirmIssueDialog`).
- `ArchiveConfirmDialog` segue sendo um `ConfirmDialog severity="danger"`.

### 4.3 Consumidores

Todo consumidor declara um `size` ou passa a usar a confirmação compacta. Classificação de partida,
que o builder pode corrigir com motivo:

| Família | Consumidores |
|---|---|
| `sm` | `EnrollStudentForm`, `RegisterResultDialog`, `ImportDialog`, `RedatorDesignation` (picker), `ReissueDialog`, `BatchIssueDialog` |
| `md` | `BudgetDialog`, `ClientDialog`, `CourseDialog`, `RoleDialog`, `StaffUserDialog`, `StudentDialog`, `RedatorDialog`, `IssuedDialog` |
| `lg` | `QuoteWizard`, `AppFilePreviewDialog` (e quem o usa: `FileList`, `DocumentTypeCard`, `RedatorDocumentsSection`, `ProfileDocumentsSection`), `CertificateViewDialog` |
| confirmação `confirm` | `ConfirmIssueDialog`, `RedatorDesignation` (confirmação), `BudgetOverlays` (`approve`) |
| confirmação `warning` | `MoveConfirmDialog` |
| confirmação `danger` | `RemoveEnrollmentDialog`, `TurmaDocuments`, `ConcludePanel`, `BudgetOverlays` (demais ações), `RevokeDialog`, `ArchiveConfirmDialog` (`CatalogPage`, `OperationPage`, `CommercialPage`, `AdministracionPage`, `RedatoresTab`) |

- `ConfirmIssueDialog`, `MoveConfirmDialog` e `RevokeDialog`, hoje sobre `AppDialog` cru, passam a
  usar o `ConfirmDialog`.
- Os diálogos com botões no corpo (`EnrollStudentForm`, `RegisterResultDialog`, `ImportDialog`)
  movem os botões para o `footer`, que é onde o navy dá a moldura.
- O `ConcludePanel` é `danger` por ser irreversível hoje; o texto dele é a `P-104`, fora daqui.

### 4.4 Proporção dos formulários

- **Diálogo de Alumno (J7):** foto à esquerda; à direita, grade de 2 colunas — Nome │ RUT, E-mail │
  Teléfono; Empresa (`StudentClientField`) na linha inteira abaixo da linha da foto. Abaixo de `md`
  (o breakpoint), uma coluna. Corrige o docblock de `StudentIdentifyFields.tsx:5-9` para dizer o que
  o código faz.
- **`FormPhotoRow`:** a foto deixa de ocupar `lg:w-3/5`; vira coluna compacta de largura fixa ao
  lado dos campos a partir de `sm`/`md`. Como é compartilhado com `ClientDialog`, `StaffUserDialog`
  e `RedatorUserSection`, os quatro são conferidos no navegador depois da mudança.
- **`RedatorIdentityFields`:** o mesmo padrão 2 colunas do Alumno (hoje tem o mesmo
  `sm:grid-cols-1`).
- **`EnrollStudentForm` (`sm`):** RUT sozinho no passo 1; no passo 2, grade de 2 colunas — RUT
  (desabilitado, como hoje) │ Nome, E-mail │ Teléfono —, e o aviso de e-mail do aluno novo na linha
  inteira abaixo. Botões no footer, que muda com o passo (Verificar no 1, Matricular no 2).
  *Decisão minha, sobre a pergunta do revisor.*
- **`P-94`:** a tabela de turmas do diálogo de Alumno (modo `view`) não pode rolar lateralmente em
  1024×768. Com `md` ≈ 48rem, o corpo útil (moldura menos padding) deve passar do piso de 42rem
  (672px) do `AppDataTable`, mas isso se mede, não se supõe. Se reprovar, o builder escolhe: ou o
  Alumno em `view` usa `lg`, ou a tabela recebe `pt` próprio. O gatilho da `P-94`
  (`pendencias/abertas.md:15-33`) é a régua.

### 4.5 Documento do orçamento

**Backend**

- Novo `App\Domains\Commercial\Enums\BudgetDocumentType` com `PURCHASE_ORDER = 'purchase_order'`,
  `INVOICE = 'invoice'`, `RECEIPT = 'receipt'`. Os valores `invoice` e `receipt` são os **mesmos** já
  gravados em `files.type`: nada de migration nem de backfill.
- `BudgetFileController` valida `type` pelo enum (`Rule::enum`), no lugar do `in:invoice,receipt`.
- O enum é exportado pelo typescript-transformer; `generated.ts` regenerado (lei 3). O
  `BudgetFileType` escrito à mão em `useCommercialFiles.ts:9` sai, e os consumidores passam a usar o
  tipo gerado.
- `FileData.type` segue `string`: a `files` é polimórfica e guarda tipos de outros domínios.
- O documento da cotação (`quote_document`, `QuoteFileController`) não muda.

**Frontend**

- O `BudgetDocumentsCard` perde o `AppDropdown` e o `AppFileUpload` do header; ganha um botão
  **"Subir documento"** que abre um diálogo `sm` (J1):
  1. três cartões de tipo (`AppSelectableCard`, que já existe em `shared/ui`): Orden de compra,
     Factura, Comprobante — nenhum pré-selecionado;
  2. seletor de arquivo (`AppFileUpload` ou equivalente em `shared/ui`), com o nome do arquivo
     escolhido visível;
  3. footer: Cancelar │ Subir. Subir fica desabilitado até tipo **e** arquivo estarem escolhidos.
- Erro de upload (tamanho, MIME, 422) aparece **dentro** do diálogo, que não fecha. Sucesso fecha o
  diálogo e a lista invalida, como hoje.
- O estado `fileType` sai do `useBudgetDetail` (a escolha mora no diálogo).
- **Lista:** o `FileList` do orçamento mostra o tipo como `AppTag` em cada linha, com o rótulo
  traduzido. Cor da tag é do builder, desde que os três tipos se distingam e passem AA. Arquivo com
  `type` fora do enum (não deveria existir) mostra a tag neutra com o valor cru, sem quebrar.
- i18n nos três locales (`es-CL`, `pt-BR`, `en`): rótulo de `purchase_order`, título do diálogo,
  botão. Chaves sem uso (`budget.fileTypeLabel`, se sobrar) saem.
- **Lei 7 / RN-14:** anexo ausente continua sem bloquear a aprovação do orçamento.

## 5. Fora

- Conteúdo das telas atrás dos diálogos; o fluxo do `QuoteWizard` (só recebe `size="lg"`).
- O documento da cotação (`quote_document`).
- O texto de confirmação da `P-104`.
- Token de marca âmbar novo (D-P16 segue como está).
- Arrastar diálogo (`draggable` segue `false`).
- Reclassificar arquivos antigos: os que já existem mantêm o tipo gravado.
- Ligar o PDF da OC a uma cotação específica (J9).
- **Contraste do `danger` preenchido (`P-74`, J10).** A confirmação de exclusão usa o `danger` como
  está, a 3,76:1 no claro. O `lotus-ui-review` do DoD 9 vai acusar isso; o achado é resíduo
  declarado da `P-74`, não defeito do bloco.
- A tag de tipo no `FileList` vale só para o orçamento. O mesmo componente serve o `QuoteRow`
  (`quote_document`), que não ganha tag.

## 6. Anti-objetivos

- Uma confirmação de exclusão que só se diferencia pela cor do botão.
- Um diálogo de formulário que volte a herdar 70vw por esquecimento — o `size` é obrigatório.
- Tag de tipo que dependa só de cor (o rótulo é texto).
- Quebrar o foco de volta ao disparador (`AppDialog.tsx:36-53`) ou os nomes acessíveis do fechar e
  do maximizar.

## 7. Restrições

- Lei 6: nenhuma feature importa PrimeReact; tudo via `shared/ui`.
- Lei 3: `generated.ts` só regenerado.
- Lei 7 / RN-14: anexo nunca bloqueia ação.
- Contraste AA de toda tinta nova sobre o navy e da severidade `warning`, medido pela régua do
  `tone-ink.test.ts`.
- ADR-16: cores só por tokens do tema / `brand-theme.css`; nada de hex solto em `.tsx`.

## 8. DoD

1. Vitest do `AppDialog`: `size` aplica a largura; `maximizable` só no `lg`; header e footer com o
   navy; nomes acessíveis do fechar e do maximizar preservados.
2. Vitest do `ConfirmDialog`: as três severidades rendem ícone, faixa e botão próprios; sem
   maximizar; `children` e `pending` seguem funcionando.
3. Nenhum consumidor de confirmação usa a moldura de formulário (grep: `MoveConfirmDialog`,
   `RevokeDialog`, `ConfirmIssueDialog` sobre `ConfirmDialog`); todo `AppDialog`/`CrudDialog` passa
   `size` (o tipo exige).
4. Medidos no navegador em 1024×768 e 1440×900, sem rolagem lateral:
   - diálogo de Alumno (criar e ver): Nome │ RUT lado a lado; a `P-94` fecha pelo próprio gatilho;
   - `EnrollStudentForm`, passo 2: RUT │ Nome e E-mail │ Teléfono lado a lado.
5. Contraste AA do header/footer navy (título, fechar, botões) e do `warning`, nos dois temas, por
   teste. O `danger` fica de fora (J10).
6. Backend: `CommercialFilesTest` cobre upload dos três tipos, 422 para tipo fora do enum, e o tipo
   no GET; suíte inteira verde.
7. Frontend: vitest do diálogo de upload — Subir desabilitado sem tipo ou sem arquivo; envia o tipo
   escolhido; erro fica no diálogo — e do `FileList` mostrando a tag.
8. `pnpm build`, `pnpm lint`, `pnpm test` verdes; `generated.ts` regenerado sem diff manual.
9. `lotus-ui-review` nas telas tocadas: diálogo de Alumno, matrícula na Operación, detalhe do
   orçamento com upload, uma confirmação de cada severidade.

## 8.1 Deixado ao builder

- Valores exatos das larguras `sm`/`md`/`lg`, medidos no navegador.
- Ícone exato de cada severidade e cor das tags de tipo, dentro das restrições.
- Como resolver a `P-94` (tamanho `lg` no modo `view` ou `pt` da tabela).
- Se o seletor de arquivo do diálogo de upload é o `AppFileUpload` em modo básico ou um wrapper novo
  em `shared/ui`.
- Como o `ConfirmDialog` escapa do `size` obrigatório e do navy do `AppDialog` (variante interna,
  `pt` próprio ou composição direta em `shared/ui`).
- A tinta dos passos do `QuoteWizard` sobre o header navy, se o wizard pinta algo no header.

## Verificação externa

Nenhuma. O bloco cobre primitivos de diálogo, consumidores no frontend e o enum de tipo de anexo do
orçamento, todos provados por teste e no navegador local; chega a produção pelo espelho e pela
promoção de sempre, sem passo fora do repositório. `efeito_externo: nao`.
