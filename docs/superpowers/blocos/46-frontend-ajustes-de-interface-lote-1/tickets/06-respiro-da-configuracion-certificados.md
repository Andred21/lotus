# 06: Respiro simétrico em Configuración › Certificados

**What to build:** na aba Configuración do módulo de administração, o conteúdo nasce colado à
barra de abas (em cima) e à borda do card (embaixo): o texto de ajuda encosta no header e o
"Guardar" encosta no rodapé. O corpo da aba passa a ter o mesmo respiro em cima e embaixo, o
mesmo valor do corpo do diálogo (ticket 01), para a tela e o diálogo lerem igual.

A correção é na aba (`ConfiguracionTab`), não no `AppTabView`: as outras abas da página são
tabelas que vão de borda a borda de propósito.

Origem: mudança 1 da ficha 46, extensão pedida pelo João na revisão da spec (2026-11-01).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] O espaço entre a barra de abas e o primeiro conteúdo é igual ao espaço entre o "Guardar" e
      a borda de baixo do card, medido no navegador.
- [ ] A navegação lateral (Certificados) acompanha o respiro de cima.
- [ ] Vale nos temas claro e escuro, e em 390px sem rolagem horizontal.
- [ ] As abas Usuarios e Roles y permisos não mudam.
- [ ] `pnpm build`, `pnpm lint` e `pnpm test` verdes.
