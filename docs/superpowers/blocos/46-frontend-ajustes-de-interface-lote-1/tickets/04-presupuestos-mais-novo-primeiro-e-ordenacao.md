# 04: Presupuestos — mais novo primeiro e ordenação por coluna

**What to build:** a tabela de Presupuestos abre do mais novo para o mais antigo (hoje abre do
mais antigo), e as colunas Código, Estado e Cotizaciones ganham a ordenação no cabeçalho, com a
mesma seta da Razón social em Clientes.

- **Código** ordena pelo número do Scap, não pelo texto: o código é "Scap {id}", e por texto
  "Scap 1000" viria antes de "Scap 999". O id é o número SCAP também nos orçamentos da carga
  inicial.
- **Estado** ordena pela ordem do negócio, igual nos três idiomas: Pendiente → Aprobada →
  Rechazada (decisão do João, 2026-11-01).
- **Cotizaciones** ordena pela quantidade de cotações.

Só Presupuestos: as demais tabelas mantêm a ordem atual (decisão do João, 2026-11-01). A lista é
ordenada no navegador (lista inteira carregada), sem mudança no backend.

Origem: mudança 2 da ficha 46, item 2.2 do pedido do João (2026-11-01).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A lista abre com o Scap mais novo no topo.
- [ ] Código, Estado e Cotizaciones mostram a seta de ordenação e alternam asc/desc no clique.
- [ ] Código ordena numericamente (prova com um Scap de quatro dígitos ao lado de um de três).
- [ ] Estado ordena Pendiente → Aprobada → Rechazada nos três idiomas.
- [ ] A visão de arquivados não quebra.
- [ ] Teste trava a ordem padrão e a ordenação numérica do código; `pnpm build`, `pnpm lint` e
      `pnpm test` verdes.
