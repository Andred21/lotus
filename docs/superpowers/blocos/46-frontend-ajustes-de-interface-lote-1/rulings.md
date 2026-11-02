# Bloco 46 — rulings da execução

Decisões tomadas em nome do João durante o `/executar-bloco`, uma por linha, com o custo se
estiverem erradas. Execução sequencial (sem o pipeline de profundidade 1), então não há desvio do
loop da SDD a registrar.

- **Task 4 — `items-end` virou `items-center` no wrapper de `CourseRowActions.tsx:45`**, fora da
  lista do brief: sem isso o centro do `RowActions` não chega à coluna de Cursos, que o ticket 03
  cobre. Custo se errado: o aviso de popup bloqueado fica centrado em vez de à direita.
- **Task 5 — `budgetSortProps` em `features/commercial/lib/budgetOrder.ts` e os testes de tabela
  em `BudgetsTable.ordem.test.tsx`**, fora da lista de Files: a régua `max-lines` 150 de
  `components/` estouraria (161 linhas no componente, 184 no teste). Custo se errado: um export a
  mais na `lib` e um arquivo de teste a mais para consolidar.
- **Revisão final — Alumnos (`StudentsTable`) e Roles (`RolesTable`) passaram ao `RowActions`**:
  o ticket 03 diz "toda tabela do produto" e a spec D6 não as exclui; sem isso o produto ficava
  com duas grafias de coluna de ação. Custo se errado: duas tabelas ganham centro e dica sem pedido
  explícito (reverter é voltar ao `AppButton` nas duas).
- **Revisão final — o restaurar colapsado do `ArchiveRowActions` passou a usar o `RowActions`** e o
  botão de ação ficou sempre dentro de um `span` (árvore estável ao alternar `disabled`). Custo se
  errado: nenhum visual medido (folgas iguais às de antes, `prova.md`); um nó a mais por botão.
- **Prova — xadrez da assinatura mantido em `--primary-300`/`--primary-200`** no escuro (D9
  deixava descer para 100/200): a assinatura ficou legível em Configuración › Certificados. Custo
  se errado: um quadro mais forte que o desejado; trocar dois tokens no `brand-theme.css`.
- **Prova — `sm`, diálogos de certificação, botão desabilitado, matrículas arquivadas e prévia do
  Redactor ficaram sem medida no navegador**, por falta de dado no banco local; aceitos pelos testes
  de `AppDialog`, `RowActions` e `AppSignatureUpload`. Custo se errado: um desses critérios do DoD
  pode falhar só no navegador e aparecer na aceitação.
- **Pedido do João depois da execução (2026-11-01) — espaço entre seções, título maior e respiro
  interno, de forma sutil.** Li assim, tudo no `FormSection`/`SectionLabel` (as 16 telas
  acompanham): `spaced` de `pt-2` para `pt-4` (24 → 32px entre seções); título de seção de
  formulário de 12 para 13px (`formSectionTitleClass`, só no `tone="brand"`; as faixas de Dashboard,
  Sidebar e cartões ficam nos 12px da D-63); `pb-1` sob o título (20px até o conteúdo). "Padding
  interno" virou o respiro título → conteúdo, não um recuo lateral do conteúdo: o `FormSection` é
  só o cabeçalho, e recuar exigiria embrulhar o conteúdo nas 16 telas. Custo se errado: recuo
  lateral ainda por fazer, ou um degrau a mais/menos em três classes.
