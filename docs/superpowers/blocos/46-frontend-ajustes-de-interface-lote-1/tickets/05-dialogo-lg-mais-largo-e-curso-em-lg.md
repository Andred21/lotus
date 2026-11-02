# 05: Diálogo `lg` mais largo, e o de Curso em `lg` com maximizar

**What to build:** os diálogos grandes voltam a ter a largura de antes do bloco 43, e o diálogo
de Curso, que lista módulos com conteúdo longo, passa a ser um deles.

- **Largura do `lg`:** 95vw no celular, 85vw a partir de `sm`, 70vw a partir de 1024px de tela,
  com teto de 84rem (1344px, o que 70vw dá numa tela de 1920px), para não virar uma faixa enorme
  em monitor ultrawide ou 4K (decisão do João, 2026-11-01). Hoje o `lg` tem teto de 64rem
  (1024px). O maximizado continua ocupando a tela inteira. `sm` e `md` não mudam.
- **Curso:** o diálogo de Curso passa de `md` para `lg` e, com isso, ganha o botão de maximizar
  (no `AppDialog`, só o `lg` maximiza).

Diálogos afetados pela largura: Cliente, Alumno, Redactor, assistente de cotação, designação de
relator, vista de certificado e, agora, Curso.

Origem: mudança 3 da ficha 46, itens 3 e 3.1 do pedido do João (2026-11-01).

**Blocked by:** None (can start immediately). Mexe na mesma moldura do ticket 01: a ordem entre
os dois é do plano, não bloqueio.

**Status:** ready-for-agent

- [ ] Numa tela de 1440px o diálogo `lg` mede ~1008px; numa de 1920px, 1344px; numa de 2560px
      continua em 1344px.
- [ ] Em 390px de largura o `lg` ocupa 95vw, sem rolagem horizontal.
- [ ] O `lg` maximizado ocupa a tela inteira e restaura para a largura nova.
- [ ] `sm` e `md` medem o mesmo que antes.
- [ ] O diálogo de Curso abre em `lg` e tem o botão de maximizar, em leitura e em edição.
- [ ] Teste do `AppDialog` trava a largura nova do `lg` e a dos outros dois tamanhos;
      `pnpm build`, `pnpm lint` e `pnpm test` verdes.
