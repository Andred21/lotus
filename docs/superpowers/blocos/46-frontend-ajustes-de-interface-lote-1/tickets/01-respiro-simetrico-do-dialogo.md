# 01: Respiro simétrico entre header, corpo e footer do diálogo

**What to build:** em todo `AppDialog` do produto, o corpo fica enquadrado pelo header e pelo
footer com o mesmo respiro. Hoje o conteúdo nasce quase colado ao header (0,5rem) e longe do
footer (2rem). A mudança é na moldura compartilhada e vale de uma vez para os diálogos que passam
pelo `CrudDialog` e para os que usam o `AppDialog` direto. A `ConfirmDialog`, que tem moldura
própria, fica como está.

Origem: mudança 1 da ficha 46, item 1 do pedido do João (2026-11-01).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] O espaço entre o header e o primeiro conteúdo é igual ao espaço entre o último conteúdo e o
      footer, medido no navegador no diálogo de Cliente e num diálogo de certificação.
- [ ] Vale nos temas claro e escuro.
- [ ] O diálogo `lg` maximizado continua íntegro (sem rolagem nova nem corte).
- [ ] A `ConfirmDialog` não muda.
- [ ] Teste do `AppDialog` trava o respiro novo; `pnpm build`, `pnpm lint` e `pnpm test` verdes.
