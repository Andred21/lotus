# Spec — `tabelas-coluna-de-acoes-e-largura` (item 17)

> Bloco da `lane-c`, worktree `../fix-frontend`, branch `refactor/tabelas-coluna-de-acoes`,
> nascida de `cad0d1fb` (merge do PR #69, que **é** a `main`).
> Frontend puro. Sem Context Packet: `Contexto: não` no backlog, e a evidência é medição local.
> Data: 2026-08-24.

## 1. O problema, medido

Duas medições contra `cad0d1fb`, feitas antes de desenhar.

**A coluna de ação sai da vista.** 15 sítios montam `AppDataTable` ou `SearchableTableFrame`;
**12 têm coluna de ação e só 2 a prendem** — `TurmasTable` (`stickyActionsColumn('8rem')`) e
`EnrollmentTable` (`stickyActionsColumn('6rem')`). Nos outros 10 a ação rola para fora junto com o
resto: o UI-02 da revisão de 2026-08-22 mediu 429px fora da vista em 1024x768 e 871px em 390x844 na
tabela de turmas, e 492px na aba de matrículas. Quem não descobre a rolagem não abre o registro pela
linha.

**A largura é sorteada.** Fora da `TurmasTable`, **nenhuma coluna de dado do sistema declara
largura**. Nos outros 14 sítios todo `style={{ width }}` pertence à coluna de ação; os demais
`style` são cor e fonte. As duas colunas de `archivedColumns` (`shared/ui`, 7 sítios) também não
declaram. Com `table-layout: auto` e nenhuma declaração, a largura sai do conteúdo e produz o
inverso da importância — foi o que as três medições registradas em `turmaColumns.ts` mostraram na
única tabela já corrigida.

### Inventário (o que existe hoje)

| Tabela | largura da ação | conteúdo da célula de ação | presa |
|---|---|---|---|
| `operation/…/Turma/TurmasTable.tsx` | `stickyActionsColumn('8rem')` | 2 ícones (`TurmaRowActions`) | sim |
| `operation/…/Enrollment/EnrollmentTable.tsx` | `stickyActionsColumn('6rem')` | 2 ícones | sim |
| `certification/…/Historial/HistorialTable.tsx` | `16rem` | até 3 botões de **texto** | não |
| `identity/…/Redator/RedatoresTable.tsx` | `10rem` | 3 ícones (envelope + `RedatorRowActions`) | não |
| `identity/…/Admin/UsersTable.tsx` | `8rem` | 2 ícones (`UserRowActions`) | não |
| `commercial/…/Client/ClientsTable.tsx` | `8rem` | 2 ícones (`ClientRowActions`) | não |
| `commercial/…/Budget/BudgetsTable.tsx` | `8rem` | 2 ícones (`BudgetRowActions`) | não |
| `catalog/…/Course/CoursesTable.tsx` | `8rem` | 2 ícones (`CourseRowActions`) | não |
| `certification/…/Emission/EmissionStudentsTable.tsx` | `8rem` | 1 botão de **texto** | não |
| `operation/…/Enrollment/ArchivedEnrollmentsList.tsx` | `8rem` | 1 botão **rótulo+ícone** | não |
| `identity/…/Student/StudentsTable.tsx` | `4rem` | 1 ícone (olho) | não |
| `identity/…/Admin/RolesTable.tsx` | `4rem` | 1 ícone (olho) | não |
| `app/pages/Dashboard/admin/CompliancePanel.tsx` | — | sem ação | — |
| `app/pages/Dashboard/admin/RedatorLoadPanel.tsx` | — | sem ação | — |
| `identity/…/Student/StudentDetailSections.tsx` | — | sem ação | — |

Catraca existente sobre largura ou ancoragem: **nenhuma**. `grep` por `width`/`sticky` nos testes das
tabelas não devolve nada, e só 2 das 12 (`TurmasTable`, `HistorialTable`) têm arquivo de teste.

### Duas divergências corrigidas aqui

1. **O backlog descreve uma política que o código rejeita.** O item 17 escreve a regra como *"toda
   coluna declara largura, menos UMA, a que absorve a sobra"*. O `turmaColumns.ts` **rejeita esse
   modelo por escrito**, com medição: com todas as colunas em `rem` e CURSO absorvendo, CURSO foi a
   **519px num contêiner de 1603px**, metade daquilo vazio, enquanto CLIENTE truncava em 222px —
   *"nenhuma coluna desta tabela quer 500px"*. A política real, decidida por João em 2026-08-24, é a
   do código: **porcentagem em todas as colunas de dado, `rem` só na coluna de ações.**
2. **O docblock de `turmaColumns.ts` erra a aritmética.** Diz que os números somam 91%; somam **90**
   (8 + 21 + 18 + 8 + 18 + 7 + 10).

O texto do backlog **não** é editado por este bloco: o item sai da fila no `/fechar-sprint`, e
reescrever a redação de um item promovido é do main tree, com o João. A correção vive nesta spec e
no docblock que a substitui.

## 2. Decisões (D1–D6)

Todas do João, na sessão de brainstorming de 2026-08-24.

- **D1 · Porcentagem em todas.** Toda coluna de dado declara largura em `%`; a coluna de ações fica
  em `rem` porque é a única que não deve escalar — carrega ícone, não texto. O modelo do absorvedor
  único fica rejeitado, com a medição do §1 como razão.
- **D2 · Ancorar, não converter.** `HistorialTable`, `EmissionStudentsTable` e
  `ArchivedEnrollmentsList` mantêm o botão de texto e ganham só a coluna presa com a largura que o
  texto exige. O objetivo do backlog fala em "ícones", mas o **Fora** do mesmo item proíbe redesenho
  de célula, e o Fora vence: revogar e reemitir certificado são ações com peso legal, e trocá-las
  por ícone sem rótulo é mudança de affordance, não de largura. Consequência declarada: a promessa
  de "mesma coluna de ícones" vale para **9 das 12**; as outras 3 terminam iguais em **posição e
  ancoragem**, não em forma.
- **D3 · A política vira mecanismo, por ESLint.** Duas regras `no-restricted-syntax` (§4). Foi
  escolhido contra a catraca de render (10 arquivos de teste novos, e não cobre tabela futura sem
  teste) e contra a regra só escrita (zero mecanismo — o estado de hoje).
- **D4 · O rastreio de arquivados declara par fixo em `shared`.** `archivedColumns` mantém a
  assinatura `(t)` e declara `archived_at: 10%` / `archived_by: 14%`. O conteúdo é o mesmo nos 7
  sítios — uma data e um nome —, então medir 7 vezes o mesmo dado é desproporcional.
- **D5 · Os números saem de um vocabulário por classe de conteúdo**, não de medição por tabela
  (§3). A `TurmasTable` migra para o vocabulário: manter os números dela à parte criaria duas fontes
  para o mesmo valor.
- **D6 · O DoD é o escrito no backlog: 12 tabelas × 3 viewports.** Mais as visões arquivadas. O
  custo foi apresentado (≈44 medições, o custo dominante do bloco) e reafirmado.

## 3. Desenho

### 3.1 Vocabulário de largura — `shared/ui/AppDataTable/columnWidth.ts`

Arquétipo de coluna com **peso**, não porcentagem literal. Os pesos são os números que a
`TurmasTable` já pagou em três medições; o resto sai da classificação do §3.4.

```ts
export const COL = {
  code: 8,        // identificador atômico, mono, não quebra
  identity: 18,   // IdentityCell: avatar + duas linhas
  text: 21,       // o texto livre e mais longo da tabela
  short: 13,      // texto curto: comuna, nome técnico, papel
  rut: 9,         // mono de tamanho conhecido
  tag: 10,        // AppTag — a mais longa das três traduções manda
  count: 7,       // numeral
  date: 10,       // data sem hora
  dateTime: 12,   // data com hora (last_login)
  money: 10,      // valor + unidade
} as const
```

**Peso e não porcentagem porque a mesma classe vale em tabela de 3 e de 8 colunas.** Porcentagem
literal só fecharia numa aridade; peso normalizado fecha em todas.

### 3.2 `tableWidths(pesos, archived?)`

Normaliza os pesos para o orçamento e devolve `Record<chave, CSSProperties>`.

```ts
tableWidths({ name: COL.identity, rut: COL.rut, status: COL.tag })
// => { name: {width:'46.2%'}, rut: {width:'23.1%'}, status: {width:'25.6%'} } (soma 90%)
```

- **Orçamento padrão: 90%.** Os ~10% restantes são a coluna de ações, em `rem`, que não escala.
- **Com `archived: true`: 66%.** Os 24% de `ARCHIVED_COLUMN` saem do orçamento em vez de estourarem
  os 100% e deixarem a repartição por conta da normalização do navegador.
- **Normalizar mata a sobra na origem.** A soma é sempre o orçamento, em qualquer aridade — não há
  resto a sortear, que é o defeito medido no §1.
- `maxWidth` acompanha `width` na classe `identity`: é o teto contra o qual o `truncate` do
  `IdentityCell` mede (a peça já tem o `min-w-0` que a fatia 1 do item 16 acrescentou).
- Vai em `style` e não em classe do Tailwind pela mesma razão registrada em `style.ts`: no
  PrimeReact 10.9.8 o `className` da coluna chega só ao `<td>`, e a largura precisa valer também
  para o `<th>`, que é quem sustenta a coluna.

### 3.3 `ARCHIVED_COLUMN` dentro de `archivedColumns`

`archived_at: 10%`, `archived_by: 14%`, aplicados no `style` das duas colunas. A assinatura
`archivedColumns(t)` não muda; os 7 sítios não mudam.

Os 7 sítios: `TurmasTable`, `BudgetsTable`, `ClientsTable`, `CoursesTable`, `UsersTable`,
`RedatoresTable` (as seis com `ArchiveSwitch`) e `ArchivedEnrollmentsList` (sempre arquivada).

**São 7, e não os 8 que o item 17 escreve.** O oitavo consumidor de `archivedColumns` é o
`ArchivedQuotesList`, que **não é tabela** — é layout flex, e o próprio arquivo comenta o sítio de
data que não vive dentro do `archivedColumns`. Largura de coluna não se aplica a ele.

### 3.4 Classificação das 15 tabelas

| Tabela | colunas de dado, por classe |
|---|---|
| `TurmasTable` | `code` `text` `identity` `tag` `identity` `count` `tag` |
| `EnrollmentTable` | `identity` `rut` `tag` |
| `HistorialTable` | `code` `identity` `text` `date` `date` `tag` |
| `RedatoresTable` | `identity` `rut` `count` `tag` `dateTime` |
| `UsersTable` | `identity` `short` `tag` `dateTime` |
| `ClientsTable` | `identity` `rut` `tag` `short` `count` |
| `BudgetsTable` | `code` `identity` `count` `money` `tag` |
| `CoursesTable` | `text` `short` `count` `count` |
| `EmissionStudentsTable` | `identity` `count` `count` `tag` |
| `StudentsTable` | `identity` `rut` `short` `count` |
| `RolesTable` | `text` `tag` `count` |
| `ArchivedEnrollmentsList` | `identity` `rut` |
| `CompliancePanel` | `text` `short` `code` `count` `count` `tag` |
| `RedatorLoadPanel` | `text` `count` `count` `count` `count` |
| `StudentDetailSections` | `code` `text` `date` `tag` |

Cada tabela ganha um arquivo de colunas ao lado dela, no molde de `turmaColumns.ts` — a política é
da TELA, que conhece o dado; o wrapper não sabe qual coluna carrega identificador e qual carrega
nome próprio.

### 3.5 Largura da coluna de ações

Continua em `rem` e continua sendo `stickyActionsColumn(width)`. A largura de cada uma sai do que a
célula carrega, medido, e **não** se copia o `8rem` da turma:

- 1 ícone → `4rem` (`StudentsTable`, `RolesTable` já estão assim)
- 2 ícones → `6rem`–`8rem`
- 3 ícones → `10rem` (`RedatoresTable`; ver o risco R3)
- botão de texto → o que o rótulo mais longo dos três idiomas exigir (`Historial` está em `16rem`)

## 4. Mecanismo — as duas regras

No molde dos cinco blocos de `no-restricted-syntax` que o `eslint.config.js` já tem.

```js
// R1 — toda AppColumn declara largura
{
  selector: "JSXElement[openingElement.name.name='AppColumn']"
          + ":not(:has(JSXAttribute[name.name='style']))",
  message: 'Toda coluna declara largura (item 17): use tableWidths/COL, ou stickyActionsColumn na coluna de ações.',
}

// R2 — coluna com ação fica presa à direita
{
  selector: "JSXElement[openingElement.name.name='AppColumn']"
          + ":has(JSXElement[openingElement.name.name=/RowActions$|^AppButton$/])"
          + ":not(:has(CallExpression[callee.name='stickyActionsColumn']))",
  message: 'Coluna de ação fica presa à direita: style={stickyActionsColumn(largura)} (item 17).',
}
```

R2 alcança as três formas de célula de ação que o inventário achou: adaptador `*RowActions`,
`AppButton` solto e `AppButton` dentro de `div` — o `:has` é descendente, então o `flex gap-2` do
`HistorialTable` casa.

**A armadilha do `eslint.config.js:240` é obrigatória.** O arquivo documenta que, em flat config, o
`no-restricted-syntax` de um bloco posterior **apaga** o do anterior para os mesmos arquivos. As
duas regras entram em **todos** os blocos que já setam `no-restricted-syntax` e casam os paths das
15 tabelas: `src/features/*/components/**`, `CATRACA_COR`, `src/features/**`, `src/app/**` e
`src/shared/**`. Bloco esquecido apaga a catraca sem estourar nada — é o modo de falha silencioso
que o próprio arquivo registra.

**As duas regras entram depois de as 15 tabelas cumprirem**, senão o lint fica vermelho durante
catorze tasks.

**Sonda obrigatória:** cada regra é vista **reprovar** antes de passar — uma `AppColumn` sem `style`
e uma coluna de ação com `style` literal —, e a sonda é revertida com a árvore limpa.

## 5. Ordem de execução

1. `columnWidth.ts` (`COL`, `tableWidths`, `ARCHIVED_COLUMN`) + teste de normalização: soma igual ao
   orçamento nos dois orçamentos, em três aridades diferentes.
2. `TurmasTable` migra para o vocabulário. É a semente: se o vocabulário não reproduzir a única
   tabela já medida, o vocabulário está errado, não a tabela.
3. `EnrollmentTable` — já presa; só a largura das colunas.
4. As 10 tabelas que faltam prender — **uma task cada**, com a largura da ação medida.
5. As 3 sem coluna de ação — uma task só, só largura.
6. `archivedColumns` ganha `ARCHIVED_COLUMN`.
7. ESLint liga, com as duas sondas vistas reprovar.
8. DoD: as medições do §6.

Dezessete tasks. Executor **`claude`** na íntegra: quinze delas terminam em medição de tela, que é
julgamento fora do plano — as duas exceções (a peça de `shared` e a catraca de ESLint) não valem um
handoff próprio.

## 6. Definition of done

**Comportamental, medido na tela contra a API real — não no diff, não pela suíte.**

- **12 tabelas × 3 viewports** (1440x900, 1024x768, 390x844): a coluna de ação permanece visível e
  clicável na borda direita sem rolagem horizontal prévia.
- **Visões arquivadas**: as 7 tabelas com rastreio, em 1440x900, com as duas colunas do rastreio
  declarando largura e nenhuma coluna encolhendo abaixo do que o `IdentityCell` precisa para
  truncar.
- **Nenhuma tabela com coluna de dado sem largura declarada** — provado pela R1 e pela varredura.
- **As duas sondas de ESLint vistas reprovar** e revertidas.
- `pnpm lint` 0, `pnpm build` verde, `pnpm test` sem regressão contra a baseline **medida na
  primeira task** sobre `cad0d1fb` (o fechamento do item 16 registrou 100 arquivos / 555 testes numa
  árvore anterior ao merge; o número que vale é o medido, não o herdado).
- **Fence de escopo:** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
  vazio. Pint e `typescript:transform` são N/A **por escopo medido**, não por suposição.

## 7. Riscos declarados

- **R1 · `table-layout: auto` honra `%` como preferência, não como lei.** Coluna com conteúdo
  indivisível maior que a fatia estoura para `min-content`. É o comportamento que protege a tela
  estreita — e é o que a spec D20 pede —, mas significa que a soma prometida pode não se realizar em
  toda tabela. Medido no DoD, não assumido.
- **R2 · `min-w-[48rem]` na tabela.** Abaixo de 768px toda tabela rola por construção. A prova em
  390x844 é da coluna presa continuar alcançável, **não** de a tabela caber.
- **R3 · `RedatoresTable` muda de largura de ação entre as visões.** O botão de reenviar convite só
  existe na lista ativa (3 ícones ativa, 2 arquivada). A largura escolhida serve às duas, ou a
  tabela declara duas — decidido na medição da task dela.
- **R4 · Falso positivo da R2.** Uma coluna de dado que contenha `AppButton` casaria a regra. O
  inventário não achou nenhuma (os `Link` do Dashboard não são `AppButton`), mas a task da catraca
  roda o lint sobre a árvore inteira antes de fechar.
- **R5 · Suporte de `:has()`/regex no esquery.** As duas regras dependem de seletores compostos. A
  sonda do passo 7 prova o suporte antes de a regra ser dada como mecanismo; se um seletor não
  casar, a regra é reescrita, não afrouxada.

## 8. Fora de escopo

- Redesenho de célula, ordenação e paginação. O que muda é largura e ancoragem.
- **Colapsar coluna em tela estreita** segue rejeitado (spec D20): escolher qual dado some é
  julgamento de domínio, e esconder coluna em tela com peso de auditoria é perda silenciosa.
- Converter botão de texto em ícone (D2).
- Editar a redação do item 17 no `backlog.md` (§1).
- Acessibilidade, foco e overflow — são do `frontend-hardening-final` (item 8).
