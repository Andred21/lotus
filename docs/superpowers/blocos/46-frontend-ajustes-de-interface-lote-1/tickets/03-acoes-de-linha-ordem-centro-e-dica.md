# 03: Ações de linha — ordem, centralização e dica

**What to build:** em toda tabela do produto, a coluna de ações da linha segue uma regra só:

- **ordem:** ver primeiro, depois as ações próprias da tabela (o envio de credenciais por e-mail em
  Redactores e Usuarios, por exemplo) e arquivar sempre por último. Ex.: Redactores fica
  Ver → Correo → Archivar. Hoje a peça compartilhada monta ações próprias → arquivar → ver. As
  tabelas que montam as ações direto (Emisión, Historial, matrículas) já seguem a regra — ver
  antes, destrutiva ("Quitar") por último — e o ticket a confirma nelas;
- **alinhamento:** os ícones ficam centralizados na coluna. Hoje estão encostados à direita, e o
  vazio à esquerda parece um padding;
- **dica:** todo botão de ação mostra a dica no hover, com o rótulo traduzido nos três idiomas
  (es-CL, en, pt-BR). Hoje a dica só aparece onde a tabela a pede, e Clientes, Presupuestos,
  Cursos, Usuarios e Clases não pedem. Vale também para o botão desabilitado, que já tem caminho
  próprio de dica, e para o "Restaurar" só-ícone da coluna estreita.

O menu de "mais ações" da coluna estreita (viewport abaixo de `sm`) segue a mesma ordem.

Origem: mudança 2 da ficha 46, item 2.1 do pedido do João (2026-11-01).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Em Clientes, Presupuestos, Cursos, Usuarios, Redactores, Clases e matrículas arquivadas, a
      ordem é ver → ações próprias → arquivar; no menu colapsado também.
- [ ] Os ícones ficam centralizados na coluna, medido no navegador em Clientes e Redactores.
- [ ] Todo botão de ação mostra a dica no hover, nos três idiomas, inclusive desabilitado.
- [ ] A dica continua abrindo para dentro da tabela, sem criar rolagem horizontal na página.
- [ ] Teste do `RowActions`/`ArchiveRowActions` trava a ordem e a dica padrão; `pnpm build`,
      `pnpm lint` e `pnpm test` verdes.
