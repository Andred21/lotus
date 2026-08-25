# Item 17 — registro de medição do bloco `tabelas-coluna-de-acoes-e-largura`

Fechamento da Task 17 (Definition of done). Todas as leituras vêm do Procedimento M rodado no
Chromium, contra o Vite local e a API real — nenhuma linha desta página é inferida de código.

Vocabulário: `COL` (pesos), `tableWidths(pesos, { actions, archived })` sobre os orçamentos 90% (com
coluna de ação), 66% (arquivada) e 100% (sem ação), `stickyActionsColumn(rem)` e o par fixo
`ARCHIVED_COLUMN` (10% / 14%). `table-layout: fixed` ligado no `AppDataTable` na Task 2.

> **As leituras desta página são de antes do review** (2026-08-24, tarde). A §8 registra o que as
> correções do review mudaram e por que nenhum número acima se move.

## 1. As 12 tabelas com coluna de ação (1440x900, visão ativa)

| tabela | colunas de dado (`pct` medido) | ação | moldura/tabela/rolagem |
|---|---|---|---|
| `TurmasTable` | 7,6 · 19,9 · 17,0 · 9,5 · 17,0 · 6,6 · 9,5 | `9rem` | 1119 / 1119 / 0 |
| `EnrollmentTable` | 42,5 · 21,2 · 23,6 | `9rem` | 1134 / 1134 / 0 |
| `HistorialTable` | 8,0 · 18,0 · 21,0 · 10,0 · 10,0 · 10,0 | `16rem` | 1119 / 1119 / 0 |
| `RedatoresTable` | 26,6 · 13,3 · 10,4 · 14,8 · 17,8 | `12rem` | 1119 / 1119 / 0 |
| `UsersTable` | 29,7 · 21,4 · 16,5 · 19,8 | `9rem` | 1134 / 1134 / 0 |
| `ClientsTable` | 27,6 · 13,8 · 15,3 · 19,9 · 10,7 | `9rem` | 1134 / 1134 / 0 |
| `BudgetsTable` | 13,6 · 30,6 · 11,9 · 17,0 · 17,0 | `6rem` | 1134 / 1134 / 0 |
| `CoursesTable` | 38,2 · 23,6 · 12,7 · 12,7 | `9rem` | 1134 / 1134 / 0 |
| `EmissionStudentsTable` | 28,9 · 11,2 · 11,2 · 16,1 · 20,9 | `8rem` | 1100 / 1100 / 0 |
| `ArchivedEnrollmentsList` | 44,0 · 22,0 | `10rem` | 1134 / 1134 / 0 |
| `StudentsTable` | 34,5 · 17,2 · 24,9 · 13,4 | `6rem` | 1134 / 1134 / 0 |
| `RolesTable` | 49,7 · 23,7 · 16,6 | `6rem` | 1134 / 1134 / 0 |

`acaoDentroDaMoldura: true` nas doze, nos TRÊS viewports (1440x900, 1024x768, 390x844). A 1024 e a
390 a tabela trava no `min-width: 768px` e rola por dentro do invólucro — a coluna presa continua
visível, que é exatamente o que a ancoragem promete.

## 2. As 7 visões arquivadas (1440x900)

Todas 1134 / 1134 / rolagem 0, par do rastreio declarando **10% / 14%** e renderizando **108px /
152px (9,5% / 13,4%)**, `Restaurar` de 125px numa caixa de 127px sem transbordo, ação de `10rem`
dentro da moldura.

| superfície | soma das colunas de dado | menor identidade |
|---|---|---|
| relatores | 63,0% | 230px |
| cursos | 63,1% | 313px |
| clientes | 63,0% | 226px |
| turmas | 63,0% | 163px |
| usuários | 63,1% | 243px |
| orçamentos | 63,0% | 243px |
| matrículas | 63,0% | 476px |

Nenhuma identidade abaixo do piso de 120px. Turmas, usuários, orçamentos e matrículas não têm
registro arquivado no banco local: foram arquivados pela UI só para medir e **restaurados** em
seguida, com autorização explícita do João e `No hay registros archivados` conferido em cada.

## 3. As 3 tabelas sem coluna de ação (orçamento 100%)

| superfície | 1440x900 |
|---|---|
| painel de conformidade | 25,0 · 15,5 · 14,3 · 8,3 · 25,0 · 11,9 |
| painel de carga de relatores | 42,9 · 14,3 · 14,3 · 14,3 · 14,3 |
| turmas do aluno (diálogo, moldura 960px) | 16,3 · 42,9 · 20,4 · 20,4 |

As três casam EXATO com o esperado do plano — é o que acontece quando não há `rem` de ação para o
navegador reescalar.

## 4. Divergências acima de 2 pontos, e o que as causa

**Nenhuma delas é defeito; todas têm a mesma raiz aritmética.** Sob `table-layout: fixed`, quando o
`rem` da coluna de ação não vale exatamente os 10% de `ACTIONS_RESERVE` (`RESERVA_ACAO` à época da
medição; ver §8), o navegador reescala as
porcentagens declaradas sobre os pixels que sobram — **preservando as razões entre as colunas de
dado com exatidão**.

| tabela | declarado × medido | ação vale | desconto |
|---|---|---|---|
| `HistorialTable` | 9,35 → 8,0 · 21,04 → 18,0 · 24,55 → 21,0 | 256px = 22,9% | −3,5 pontos no maior |
| `RedatoresTable` | 29,1 → 26,6 · 19,4 → 17,8 | 192px = 17,2% | −2,5 pontos no maior |
| `UsersTable`, `ClientsTable`, `CoursesTable`, `TurmasTable`, `EnrollmentTable` | ≤ 1 ponto | 144px ≈ 12,7% | benigno |
| `BudgetsTable`, `StudentsTable`, `RolesTable` | casam exato | 113px = 10,0% | zero |

**R1 da spec, realizado e registrado:** a coluna PERÍODO do painel de conformidade tem
`whitespace-nowrap` com duas datas. A 1024x768 e 390x844 ela fica numa linha só (altura 15px, que é
o que a UI-10 de 2026-08-17 pedia), mas o span mede **166px numa célula de 110px** —
`scrollWidth` 182 contra `clientWidth` 110. É o `min-content` vencendo a fatia declarada e
empurrando a rolagem, comportamento previsto e não corrigido.

## 5. Varredura (Passo 1) e gate (Passo 3)

`npx eslint "src/**/*.tsx"` com o seletor de coluna sem largura acusa **6 erros, todos em fixture de
teste de `shared`** — `AppDataTable.test.tsx` (2), `SearchableTableFrame.test.tsx` (1) e
`archivedColumns.test.tsx` (3). Nenhuma tabela de produção escapou.

`git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` sai **vazio**: Pint e
`typescript:transform` são N/A por escopo medido.

Gate final: `pnpm lint` 0 problemas · `pnpm build` verde · `pnpm test` **101 arquivos / 561 testes**
(baseline 560 mais o teste de largura do par de arquivados, Task 15).

## 6. O que este bloco NÃO cobriu

- **Os 3 botões de texto continuam de texto** (D2): `HistorialTable` (`Revocar`/`Reemitir`),
  `EmissionStudentsTable` (`Emitir`) e `ArchivedEnrollmentsList` (`Restaurar`). Eles ganharam
  posição e ancoragem, não forma — converter ação de peso legal em ícone sem rótulo é mudança de
  affordance, e o Fora do item 17 a proíbe.
- **`ArchivedQuotesList` não é tabela** — é layout flex, e largura de coluna não se aplica a ele.
  É o oitavo consumidor do rastreio de arquivamento e não foi tocado.
- **As fixtures de teste de `shared`** ficaram fora da catraca de ESLint por decisão medida
  (Task 16): cobri-las exigiria um `ignores: ['**/*.test.tsx']` que desligaria junto `COR_HARDCODED`
  e `DISABLED_READONLY` nos testes de `shared`.
- **Nenhuma superfície ficou sem medição por falta de dado local.** A lista de NÃO MEDIDOS,
  aberta nas Tasks 2, 6 e 8, está zerada desde a varredura de arquivados.

## 7. Decisões do João registradas durante a execução

1. Autorização para arquivar e restaurar registros pela UI, só para medir superfície sem dado local.
2. Mantém o `10rem` da arquivada de orçamentos (depois confirmado na tela).
3. Mantém o commit corretivo `ea280fe1`, que reabriu as Tasks 2 e 3 fora de task.
4. `RolesTable` mantém `COL.text` no NOMBRE, mesmo com 564px de célula para 40px de texto — a faixa
   larga vem de só existirem três colunas de dado, não do peso.

## 8. Depois do review — o que mudou e o que não se moveu

O `/revisar-sprint` de 2026-08-24 devolveu quatro achados, todos de esforço P, todos aprovados pelo
João e aplicados na mesma branch.

**Nenhuma leitura das §§1-3 se move.** Q-2, Q-3 e Q-4 não tocam pixel: são renome de identificador,
texto de docblock e seletor de ESLint. Q-1 muda um estado que esta página **não mediu** — a lista de
matrículas arquivadas com `registroBloqueado`, onde a coluna de ação some. Nos estados medidos o
parâmetro novo vale `true`, que era o valor congelado antes.

| Achado | O que entrou |
|---|---|
| Q-1 🟡 | `archivedEnrollmentWidths(actions)` passou a receber `!registroBloqueado`, como o irmão `enrollmentWidths` já fazia. Sem ele, no registro fechado os 10 pontos da ação ficavam sem dono e o navegador os redistribuía sobre o resto — inclusive sobre `ARCHIVED_COLUMN`, cujo par existe para render 10%/14% IGUAIS nas sete arquivadas. |
| Q-2 🟡 | Léxico único. Todo consumidor exporta `<entidade>Widths` e **é função**, inclusive onde não há variação (`emissionWidths()`, `historialWidths()`, `roleWidths()`, `studentWidths()`, `studentTurmaWidths()`, `complianceWidths()`, `redatorLoadWidths()`, `archivedEnrollmentWidths()`) — o sítio não adivinha mais nome nem forma. Na peça de `shared`, `ColClass` virou `{ weight, cap }`, `OrcamentoOpcoes` virou `TableWidthOptions` com `actions`, e as reservas viraram `ACTIONS_RESERVE`/`ARCHIVED_RESERVE`: a infraestrutura fala inglês, como o resto de `shared/ui`; português fica para o domínio. |
| Q-3 🟢 | Os docblocks de `columnWidth.ts` e `style.ts` deixaram de prometer que a largura declarada é LEI. Passam a dizer que é RAZÃO, com o caso medido da `HistorialTable` (18,0% entregues para 21,04% declarados) e ponteiro para a §4 desta página. |
| Q-4 🟢 | A catraca `COLUNA_SEM_LARGURA` virou **dois** seletores: coluna sem `style`, e coluna com `style` que não é `MemberExpression` nem `CallExpression`. Antes `style={{ color: '…' }}` a satisfazia. |

**A grafia encadeada do `:has` falhou de novo, e agora está medida nas duas direções.** A tentativa
`:has(> JSXAttribute[name.name='style'] > JSXExpressionContainer > :matches(MemberExpression,
CallExpression))` reprovou as QUATRO colunas da sonda — as duas inválidas e as duas legítimas: o
esquery não desce a cadeia dentro do `:has`. A forma que passou desce pelo CAMINHO do nó
(`[value.expression.type=…]`), num `:has` de um nível só. Sonda de quatro colunas
(`style` de objeto literal · sem `style` · `largura.name` · `stickyActionsColumn('9rem')`):
**2 erros, nas duas primeiras**, antes de ser removida.

Gate reconferido depois das correções: `pnpm lint` 0 · `pnpm build` verde · `pnpm test` 101 arquivos
/ 561 testes.
