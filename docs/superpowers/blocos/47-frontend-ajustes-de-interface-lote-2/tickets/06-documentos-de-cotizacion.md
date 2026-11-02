# 06: Cotização com um slot de documento

**What to build:** na linha de cada cotização do presupuesto, o bloco de documentos (hoje um ícone
de enviar sem nome próprio e uma lista de vários arquivos) vira um slot só, a peça compartilhada:
vazio com ícone de enviar, preenchido com ver, baixar, substituir e excluir, com dica e confirmação
de excluir.

- **um arquivo por cotização:** decisão do João (2026-11-01) — vários documentos por tipo só na
  turma. Enviar num slot preenchido substitui: o backend apaga o anterior com auditoria
  (soft-delete, um a um) e grava o novo, a mesma regra do presupuesto (ticket 07);
- **dado antigo:** cotização que já tenha vários arquivos não quebra. O slot mostra o mais recente;
  os outros ficam no histórico, sem migração.

Origem: mudança 1 da ficha 47, item 1.1 do pedido do João (2026-11-01) — "nos docs de cotações".

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Cada cotização mostra um slot de documento com as quatro ações e dica, nos três idiomas.
- [ ] Substituir grava o novo e apaga o anterior com registro de auditoria; teste de feature do
      backend prova os dois lados.
- [ ] Cotização com vários arquivos antigos mostra o mais recente, sem erro.
- [ ] Excluir pede confirmação.
