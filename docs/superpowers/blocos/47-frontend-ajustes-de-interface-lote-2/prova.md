# Prova — bloco 47, ajustes de interface lote 2

Data: 2026-11-02. Stack da lane (offset +1): http://localhost:5174, API :8081. Medido com
`playwright-cli` (Chromium), logado como admin (`admin@lotus.cl`) e como redator
(`juan.morales@lotus.cl`), locale `en`. Largura de página medida em 390 e 1440; "sem rolagem" é
`documentElement.scrollWidth === clientWidth`. Dica medida pelo hover: texto do `.p-tooltip` e
classe `p-tooltip-left`.

## Suítes (HEAD 73d9707d + limpeza de locale)

- `pnpm build`: ok. `pnpm lint`: 0. `pnpm test`: 216 arquivos, 1641 passed.
- `php artisan test`: 1630 passed, 5 skipped.

## Limpeza de locale

Chaves que estavam em uso (`t()` de produção) no merge-base `d220a04f` e ficaram sem nenhuma
referência depois do bloco, removidas dos três locales: `certificateSettings.noSignature`,
`budget.uploadDocument`, `budget.fileTypeLabel`, `budget.uploadTitle`, `budget.chooseFile`,
`profile.documents.send`, `profile.documents.replace`, `profile.documents.sendNamed`,
`profile.documents.replaceNamed` (o Perfil passou a usar `common.uploadNamed`/`common.replaceNamed`)
e `operation.documents.upload` (o enviar da turma passou a `common.uploadNamed`).
Conferido por script contra o merge-base (chave literal entre aspas ou crase, ou prefixo de template
`prefixo.${`): nenhuma chave que o bloco matou ficou no locale. Chaves lidas por template ou por
plural (`budget.documentType.*`, `_one/_other`, `operation.documents.lock.*`) ficaram; as que já
estavam mortas antes do bloco não são deste escopo.

## Critérios dos tickets

| Ticket | Critério | Medido |
|---|---|---|
| 01 | Quatro documentos do redator pela peça compartilhada | Diálogo de edição do redator: CV, REUF, título, pós-grado e Firma em `rounded-surface`; ações só-ícone |
| 01 | Dica no hover = `aria-label` | Em todo botão sondado (Replace Invoice, Replace signature, Upload PDF, Remove, View), texto do tooltip igual ao `aria-label`, classe `p-tooltip-left` |
| 01 | Substituir com rótulo próprio, paridade de locale | `Replace`, `Replace signature`, `Replace Invoice`; teste de paridade verde na suíte |
| 01 | Excluir confirma; cancelar não exclui, confirmar exclui | Turma 2: cancelar manteve `fatura-a.pdf`, confirmar o removeu; um diálogo só |
| 02 | Firma do redator no slot, enviar/substituir com recorte e preview | Diálogo do redator: Firma com View, Download, Replace signature, Delete e a dica de formatos |
| 02 | No Perfil, Firma sem excluir | Perfil do redator: View, Download, Replace signature; sem lixeira |
| 02 | Fundo claro (xadrez) no preview | Configuración: `background-image` com gradiente no corpo do slot, tema escuro |
| 03 | Firma do gerente no mesmo slot, quatro ações e dica | Admin › Settings › Certificates: View, Download, Replace signature, Remove signature; dica à esquerda |
| 03 | Substituir abre o preview; o novo substitui o anterior | Imagem de 1400×300: preview com "Use this signature"/Cancel; cancelar manteve 89 KB; confirmar trocou para 8 KB. Imagem de 400 px recusada com o aviso de largura mínima |
| 03 | Excluir pede confirmação | Um diálogo, "Remove the signature" com o texto do gerente; cancelar manteve |
| 04 | Documentos do Perfil pela peça, ações só-ícone | Perfil do redator: Upload Résumé (CV), Upload University degree, View/Download no REUF |
| 04 | REUF só leitura, com aviso | Só View/Download e "This document is managed by the administrator" |
| 04 | Tag e vencimento como hoje | "Valid" + "Valid until 11/2/2028"; tipo à esquerda e tag à direita (borda da tag a 9 px da borda do cartão em 390 e 1440); quebra de linha quando não cabe ("Postgraduate degree" a 390) |
| 05 | Foto com avatar e ações só-ícone; sem foto, só enviar | Perfil admin: antes `Select photo`; depois View, Download, Replace, Remove photo. `Select photo` também no diálogo de usuário, aluno, cliente e redator |
| 05 | Ver abre o preview; baixar baixa | View abriu diálogo com `img alt="Photo"` do bucket; Download é o `AppDownloadButton` |
| 05 | Excluir confirma; avatar volta às iniciais | Um diálogo "Delete “Photo”?"; depois do confirmar, avatar "AL" e só `Select photo` |
| 06 | Cotização com um slot e quatro ações | Presupuesto 1: cotizações com View, Download, Replace, Delete; vazia com o enviar |
| 06 | Vários arquivos antigos mostram o mais recente | Linha extra de `quote_document` (created_at 2026-01-01) inserida e removida no banco da lane: a tela mostrou só o arquivo mais novo, console sem erro |
| 07 | Três slots fixos; sem botão nem diálogo de enviar | Ordem Purchase order, Invoice, Receipt; nenhum "Upload document" no cartão, só `Upload <tipo>` |
| 07 | Enviar num slot grava o tipo do slot | `fatura-a.pdf` no slot Invoice: `files.type = invoice` |
| 07 | Substituir apaga o anterior com auditoria | `fatura-b.pdf` substituiu: arquivo 22 com `deleted_at`, audits `deleted` 22 e `created` 23; a tela mostra só o novo |
| 07 | Tag com ícone e maior, nos dois temas | `pi-shopping-cart`, `pi-receipt`, `pi-money-bill`; 14px, padding 4px 12px; claro e escuro com hue próprio (azul, roxo, verde) |
| 07 | Excluir confirma | Um diálogo "Delete “fatura-b.pdf”?"; cancelar manteve |
| 08 | Três tipos com ícone de enviar e dica | Turma em andamento: três `Upload PDF`, sem texto visível, dica à esquerda |
| 08 | Vários PDFs por tipo; aviso de só PDF | Turma 3: dois arquivos em Tests; "PDF only, up to 10 MB…" em cada tipo; turma concluída só View/Download |
| 08 | Excluir confirma pela peça | Um diálogo "Remove document" com o texto da turma |

Rolagem horizontal da página: 390/390 e 1440/1440 em todas as telas acima (presupuesto,
turma, Settings, Perfil admin, Perfil redator, diálogo do redator).

## Fora do escopo, encontrado na prova

- Diálogo de edição do redator a 390: o `.p-dialog-content` rola 14 px na horizontal
  (`scrollWidth` 383, `clientWidth` 369). Quem estoura são os cartões de curso habilitado
  (`AppSelectableCard`, borda direita em 394 contra 379), que o bloco não tocou; os slots de
  arquivo terminam em 355. A página em si não rola.
- No Perfil, o documento vazio diz "Not uploaded" duas vezes: na tag de estado e no corpo do slot.

## Dados de desenvolvimento alterados na lane

- Presupuesto 1: um `invoice` (`fatura-b.pdf`) e um anterior apagado com auditoria.
- Turma 2: um PDF enviado e removido.
- Firma do gerente trocada pela imagem de teste.
- Foto do admin enviada e removida.
- Senha do redator `juan.morales@lotus.cl` definida como a do seed do admin, para entrar no Perfil.
