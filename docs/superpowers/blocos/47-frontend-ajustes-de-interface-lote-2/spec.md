# Bloco 47 — Ajustes de interface, lote 2 (spec)

**Classificação:** architectural (peça compartilhada nova, reversão da D8 e regra nova no backend).
**Data:** 2026-11-02. **Fonte:** ficha 47 do `backlog.md` (lote fechado na mudança 1, decisão do
João em 2026-11-02) e os oito tickets em `tickets/`, ditados pelo João em 2026-11-01 e conferidos no
código. Esta spec não reabre decisão dos tickets: registra o desenho aprovado no brainstorming de
2026-11-02, diz onde cada parte mora e marca o que ficou ao construtor.

## 1. Por que

Cada tela do produto que lida com arquivo tem um arranjo próprio: o CV do redator usa ícones, a
assinatura usa botão de texto com preview, a foto tem "Seleccionar/Reemplazar" e "Remover" em
texto, o presupuesto tem botão e diálogo para escolher o tipo, a cotización tem um ícone de enviar
sem nome, a turma tem "Subir PDF". Excluir confirma em umas e não em outras. O João quer o padrão
do CV do redator em todo lugar com arquivo, com dica no hover dizendo o que cada ícone faz.

Sucesso: o João abre redator, Perfil, cliente, aluno, usuário, Configuración › Certificados,
presupuesto e turma, e o arquivo se comporta igual em todos — mesmos ícones na mesma ordem, mesma
dica, mesma confirmação ao excluir.

Fracasso, mesmo funcionando: um documento de peso legal sumir da tela (dado antigo fora do slot),
excluir sem confirmar, substituir sem deixar rastro de auditoria do anterior, um ícone sem nome
acessível, ou a dica criar rolagem horizontal.

## 2. Objetivos

| # | Ticket | Onde mora |
|---|---|---|
| T1 | 01 — slot de arquivo compartilhado com dica | `shared/ui` (peça nova), `AppFileActions`, `AppFileUpload`, `features/identity/components/Redator/SlotBody.tsx` |
| T2 | 02 — assinatura do redator (admin e Perfil) | `shared/ui/AppSignatureUpload`, `RedatorSignatureSlot`, `ProfileSignatureSlot` |
| T3 | 03 — assinatura do gerente | `features/certification/components/Settings/ManagerSignatureField.tsx` |
| T4 | 04 — documentos do Perfil | `ProfileDocumentSlot` |
| T5 | 05 — fotos | `shared/ui/AppPhotoField`, `FormPhotoRow`, `ProfileIdentityCard` |
| T6 | 06 — cotización com um slot | `QuoteRow`, `QuoteFileController` + action nova |
| T7 | 07 — presupuesto com três slots fixos | `BudgetDocumentsCard`, `budgetDocumentType.ts`, `BudgetFileController` + action nova; saem `BudgetDocumentUploadDialog` e `useBudgetDocumentUpload` |
| T8 | 08 — documentos de turma | `features/operation/components/Document/DocumentTypeCard.tsx` |

Os critérios de aceite são os dos tickets, um a um; a spec não os repete.

## 3. Não-objetivos e anti-objetivos

- Nada de schema, migration, DTO nem `generated.ts`. A regra de um por tipo é comportamento de
  action, sem índice único.
- Sem migração de dado: duplicado antigo fica no banco e no histórico.
- Turma continua com vários PDFs por tipo; não ganha substituir.
- O fluxo de limpeza da assinatura (`shared/lib/signature`) não muda; o fundo claro do 46 fica.
- O avatar das fotos não muda de tamanho nem de lugar.
- **Anti-objetivo:** arquivo de peso legal que suma da tela, ou exclusão sem confirmação.

## 4. Desenho decidido

### 4.1 A peça compartilhada (T1) — reverte a D8

Nasce em `shared/ui` um slot de arquivo: título, a linha do arquivo (`AppFileRow`) e as ações. A
D8 da spec de upload de 2026-07-31 rejeitou `AppFileList`/`AppDocumentSlot`; o João reverte essa
decisão neste bloco. O docblock do `AppFileActions` que cita a D8 "em vigor" muda junto, e a
reversão fica registrada nos rulings do bloco.

- **Ordem das ações:** ver, baixar, substituir, excluir. Só ícone, `text rounded`, como no CV hoje.
- **Vazio:** "No cargado" (`common.notLoaded`) e o ícone de enviar.
- **Dica:** todo ícone tem dica no hover, nos três idiomas, com o mesmo texto do `aria-label`; a
  dica abre à esquerda (`position: 'left'`), como no `RowActions` do 46. O enviar e o substituir
  são `FileUpload` do Prime, que não tem prop de dica: a dica se prende a um `span` invólucro com
  `Tooltip`, o mesmo arranjo do botão apagado do `RowActions`.
- **Rótulos:** ver = `common.preview`, baixar = o do `AppDownloadButton`, excluir = `common.delete`
  ou o `removeLabel` da tela, enviar = `common.upload` ou rótulo da tela, substituir = chave nova
  `common.replace` nos três idiomas ("Substituir", "Reemplazar", "Replace"). Onde a tela repete o
  mesmo verbo para vários documentos, o nome acessível leva o tipo (o `accessibleName` que o Perfil
  já usa, D-23).
- **Excluir confirma sempre:** a peça abre o `ConfirmDialog` e só chama `onRemove` depois do sim.
  Gerente (T3) e turma (T8), que hoje têm confirmação própria, passam a usar a da peça. Pendência e
  erro da exclusão aparecem no próprio `ConfirmDialog` (`pending`, `error`), como no gerente hoje.
- **Menos ações:** a tela passa só o que tem. Sem `onRemove`, sem lixeira; sem substituir, sem o
  ícone; só leitura = ver e baixar. Arquivo em stage (`create`, ainda sem `download_url`) mostra só
  o tirar do stage, como hoje.
- **Primeiro consumidor:** o CV do redator migra para a peça sem mudança visual além da dica e da
  confirmação de excluir.

### 4.2 Assinaturas (T2, T3)

Redator no admin, redator no Perfil e gerente em Configuración › Certificados usam a peça. O
enviar e o substituir viram ícone na linha; ao escolher a imagem, o preview limpo sobre o xadrez
abre logo abaixo do slot, com Confirmar e Cancelar ainda em texto, porque é um passo de decisão
(escolha do construtor aprovada no brainstorming). Para isso o `AppSignatureUpload` se divide em
duas partes: o disparador e o preview com a decisão. A forma da divisão (hook mais componente, ou
componente com duas partes) fica ao construtor. No Perfil não há excluir. A ajuda do gerente
("vale para todos os certificados") continua.

### 4.3 Documentos do Perfil (T4)

O "Reemplazar" em texto vira o ícone de substituir da peça. Sem excluir. REUF (não `self_service`)
fica só leitura, com o aviso "gerido pela administração" que já existe.

### 4.4 Fotos (T5)

Cliente, redator, aluno, usuário da administração e Perfil. O avatar de 8rem continua; embaixo
dele, os botões de texto viram a fileira de ícones da peça: ver, baixar, substituir e excluir, com
dica. Sem foto, só o enviar. Ver abre a foto no mesmo `AppFilePreviewDialog` dos documentos.
Enviando, erro com "tentar de novo", arquivo grande demais e só leitura continuam como hoje. O
`AppPhotoField` hoje só tem a URL da foto: o nome e o tamanho que o preview e o baixar precisarem
saem do que o `useEntityPhoto` já tem; se faltar dado, o construtor decide o mínimo (ex.: nome
genérico traduzido), sem mudar DTO.

### 4.5 Cotización (T6)

A linha de cada cotização troca o ícone solto e a lista por um slot só da peça. Um arquivo por
cotização: enviar num slot cheio substitui.

### 4.6 Presupuesto (T7)

Saem o botão "Enviar documento", o `BudgetDocumentUploadDialog` e o `useBudgetDocumentUpload`. O
cartão Documentos mostra três slots fixos, na ordem do `BUDGET_DOCUMENT_TYPES` (Ordem de compra,
Fatura, Comprovante de pagamento). Cada slot tem a tag do tipo maior que a de hoje e com ícone:
`pi pi-shopping-cart` (ordem de compra), `pi pi-receipt` (fatura), `pi pi-money-bill`
(comprovante), mantendo os três hues já medidos em AA. O contador do cabeçalho do cartão segue
contando arquivos.

**Tipo fora do enum (escolha do construtor):** se o presupuesto tiver arquivo cujo tipo não é
nenhum dos três (dado antigo ou de outro fluxo), ele aparece numa linha simples abaixo dos slots,
com a tag neutra que o `budgetDocumentTag` já devolve, para não sumir da tela.

### 4.7 Turma (T8)

Cada tipo (Manual, Pruebas, Evaluación del redactor) segue o padrão: título, a tag
entregue/pendente, e o ícone de enviar com dica no lugar do "Subir PDF". Cada arquivo é a linha
com ver, baixar e excluir só ícone. Vários PDFs por tipo, sem substituir. O aviso de só PDF fica.

### 4.8 Backend: um arquivo por tipo (T6, T7)

Duas actions novas no domínio Commercial, no molde do `StoreRedatorDocumentAction`: o binário vai
ao disco antes da transação (o órfão em falha é descartado); dentro dela, os arquivos anteriores do
mesmo tipo do mesmo dono levam soft-delete **um a um, por instância**, para o owen-it gravar a
linha em `audits`; depois o novo é registrado. `BudgetFileController::store` e
`QuoteFileController::store` passam a chamar a action. Validação, rotas, `destroy` e o `FileData`
devolvido não mudam.

**Sem lock (escolha do construtor):** `Budget` e `Quote` não têm `lockForWrite`; com ~10 usuários,
dois envios simultâneos no mesmo slot podem deixar dois vivos, e a tela mostra o mais recente.

**Dado antigo:** onde já houver mais de um arquivo vivo do mesmo tipo, o slot mostra o mais recente
por `created_at` (desempate pelo `id`); os outros ficam no banco, sem migração. O próximo envio no
slot apaga todos os anteriores daquele tipo.

Teste de feature para cada controller prova os dois lados: o anterior fica soft-deleted com linha
de auditoria, e o novo é o único vivo do tipo; outro tipo do mesmo dono não é tocado.

## 5. Restrições

- Lei 6: PrimeReact (`Tooltip`, `FileUpload`) só dentro de `shared/ui`.
- Lei 2: auditoria pelo owen-it na aplicação, por instância.
- i18n: toda chave nova nos três locales; o `parity.test.ts` segura.
- Nada de rolagem horizontal da página por causa da dica, nas larguras 390 e 1440.
- O `AppFileRow` e a quebra por contêiner dele (D-19, D-22) ficam; a peça usa a linha, não a
  reescreve.

## 6. Ao construtor

- API da peça (nome, props, se recebe um arquivo ou uma lista), desde que cubra os oito consumidores.
- Forma da divisão do `AppSignatureUpload`.
- Nome e local exato das duas actions do Commercial (ou uma genérica no Commercial, se as duas
  forem idênticas).
- Testes de frontend da peça (dica, ordem, confirmação, menos ações) e ajuste dos testes existentes
  que hoje procuram os botões de texto.

## Verificação externa

Nenhuma. O bloco muda frontend e duas actions do backend, provados no stack da lane. `efeito_externo: nao`.
