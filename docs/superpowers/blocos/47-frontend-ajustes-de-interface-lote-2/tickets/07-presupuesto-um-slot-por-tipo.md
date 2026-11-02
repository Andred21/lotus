# 07: Presupuesto com um slot fixo por tipo de documento

**What to build:** no detalhe do presupuesto, o cartão Documentos deixa de ter o botão "Enviar
documento" e o diálogo de escolher o tipo. No lugar, três slots fixos, na ordem do ciclo do
orçamento: Ordem de compra, Fatura e Comprovante de pagamento. Cada slot é a peça compartilhada:
vazio com ícone de enviar, preenchido com ver, baixar, substituir e excluir, com dica e confirmação
de excluir.

- **um arquivo por tipo:** decisão do João (2026-11-01). Enviar num slot preenchido substitui: o
  backend apaga o anterior do mesmo tipo com auditoria (soft-delete, um a um), como já faz com os
  documentos do redator, e grava o novo. Regra nova no backend, aceita neste bloco pelo João;
- **dado antigo:** presupuesto que já tenha dois arquivos do mesmo tipo não quebra. O slot mostra o
  mais recente; os outros ficam no histórico, sem migração;
- **tag do tipo:** cada slot tem a tag do tipo com ícone coerente e maior que a de hoje. Proposta:
  carrinho para Ordem de compra, recibo para Fatura e cédula para Comprovante de pagamento. As cores
  de hoje (três hues medidos em AA) continuam.

Origem: mudança 1 da ficha 47, item 1.2 do pedido do João (2026-11-01).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] O cartão Documentos mostra os três slots fixos; botão e diálogo de enviar não existem mais.
- [ ] Enviar num slot vazio grava o arquivo com o tipo do slot.
- [ ] Substituir grava o novo e apaga o anterior do mesmo tipo com registro de auditoria; teste de
      feature do backend prova os dois lados.
- [ ] Presupuesto com duplicados antigos mostra o mais recente de cada tipo, sem erro.
- [ ] A tag de cada tipo tem ícone e tamanho maior, medida no navegador nos dois temas.
- [ ] Excluir pede confirmação; `php artisan test`, `pnpm build`, `pnpm lint` e `pnpm test` verdes.
