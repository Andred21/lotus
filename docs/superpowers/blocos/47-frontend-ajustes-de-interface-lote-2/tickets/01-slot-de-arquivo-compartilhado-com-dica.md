# 01: Slot de arquivo compartilhado, com ações só-ícone, dica e confirmação

**What to build:** o padrão dos Documentos do redator (Currículo, Certificado REUF, Título,
Pós-graduação) vira a peça única de arquivo do produto. O slot é um cartão com borda: título, tag de
estado opcional à direita e, abaixo, o vazio ("Não enviado" e o ícone de enviar) ou a linha do
arquivo (ícone pelo tipo, nome, data · tamanho) com as ações só-ícone, nesta ordem: ver, baixar,
substituir, excluir (vermelho).

- **peça compartilhada:** o cartão sai da feature do redator para o `shared/ui`. Isso **reverte a
  D8** da spec de upload de 2026-07-31, que rejeitou um slot compartilhado, por decisão do João
  (2026-11-01); a reversão fica registrada no bloco e no docblock das ações de arquivo;
- **dica:** todo botão de arquivo (ver, baixar, substituir, excluir, enviar) mostra no hover o
  rótulo da ação, traduzido em es-CL, en e pt-BR. O rótulo da dica é o mesmo do `aria-label`;
- **substituir:** ganha rótulo próprio nos três idiomas. Hoje o ícone de substituir lê "Enviar
  documento" para o leitor de tela;
- **excluir confirma sempre:** todo excluir de arquivo pede confirmação antes, decisão do João
  (2026-11-01). Hoje o CV exclui direto;
- o slot aceita ações a menos (sem excluir, sem substituir) para as telas em que o backend não as
  oferece.

O CV do redator migra para a peça e fica visualmente igual ao de hoje, agora com dica e
confirmação.

Origem: mudança 1 da ficha 47, item 1.1 do pedido do João (2026-11-01).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Os quatro documentos do redator, no diálogo de edição, renderizam pela peça compartilhada,
      com a mesma aparência medida no navegador.
- [ ] Cada botão de arquivo mostra a dica no hover, nos três idiomas, e o `aria-label` bate com ela.
- [ ] Substituir tem rótulo próprio nos três idiomas; o teste de paridade dos locales passa.
- [ ] Excluir abre a confirmação; cancelar não exclui, confirmar exclui.
- [ ] Teste da peça trava a ordem das ações, a dica e a confirmação; `pnpm build`, `pnpm lint` e
      `pnpm test` verdes.
