# 02: Hierarquia de texto — seção, label e valor

**What to build:** quem lê um diálogo distingue três níveis à primeira vista:

1. **Título de seção** (`FormSection`): no azul da marca por `--brand-ink`, que é celeste no
   escuro e o degrau 700 (`#186b94`) no claro, seguido de uma linha contínua (não tracejada) até a
   borda, separando "Datos generales", "Dirección", "Personas de contacto" e as demais seções.
2. **Label do campo** (`FormField`): 14px, peso 500, na tinta de corpo. Hoje ela sai no cinza
   secundário, com o mesmo corpo do valor, e se confunde com ele.
3. **Valor**: 14px, peso regular, na tinta de corpo.

Vale no produto inteiro, pela fonte: diálogos, página de Perfil, cartões e formulários (login
inclusive), em leitura e em edição.

**Reverte a D1/P-36** ("a tinta de marca saiu do título de seção, e não volta"), por decisão do
João em 2026-11-01. O motivo da D1 era contraste (celeste a 2,77:1 no claro); o `--brand-ink`
resolve esse motivo. Os testes que travavam a D1 e os docblocks que a explicam mudam junto, e a
reversão fica registrada no bloco.

Origem: mudança 1 da ficha 46, itens 2 e 3 do pedido do João (2026-11-01).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Título de seção em `--brand-ink` com linha contínua, nos temas claro e escuro, com
      contraste AA medido nos dois.
- [ ] Label do campo em 14px peso 500 na tinta de corpo; valor em 14px regular.
- [ ] Os três níveis se distinguem no navegador no diálogo de Cliente (leitura e edição), na página
      de Perfil e no login, nos dois temas.
- [ ] Nenhum campo perde o nome acessível; o nível de heading de cada seção não muda.
- [ ] Testes do `FormSection` e do `SectionLabel` reescritos para a regra nova; teste do
      `FormField` trava a grafia da label.
- [ ] Reversão da D1/P-36 registrada no bloco.
- [ ] `pnpm build`, `pnpm lint` e `pnpm test` verdes.
