# Design — `frontend-tabelas-reserva-e-rolagem`

**Data:** 2026-09-27 · **Item:** 23 da fila · **Lane:** `lane-c` · **Árvore:** `../fix-frontend`
**Branch:** `refactor/frontend-tabelas-reserva-e-rolagem`, aberta de `origin/main@162cbaa7` (a
fatia 3 do item 16 já mesclada pela PR #115)
**Context Packet:** nenhum. A ficha é `Contexto: não` e as fontes vivem no repositório.
**Paga:** a **`D-65`** inteira (ficha em `backlog.md`, `# Débitos técnicos`).
**Executor:** `claude`

> A `D-65` mediu em 2026-09-20 que a sobreposição da coluna presa é
> `larguraDaTabela - larguraDaMoldura` **por inteiro** e não depende de como `tableWidths()`
> reparte o %. Por isso este bloco corrige o **piso** da tabela e a **largura da coluna presa**.
> A reserva em % fica como está. A fatia 3 do item 16 já aplicou isso em 4 das 12 tabelas com
> ação. Este bloco faz as outras 8, recoloca a exceção como default e fecha o resíduo de 390px.

## 1. Escopo

As **15 consumidoras de `AppDataTable`** dividem-se em 12 tabelas com coluna de ação presa e 3 sem
ela. A elas somam-se as **7 visões de arquivados** que existem entre as 12.

| # | Componente | Rota / aba | Presa hoje (`stickyActionsColumn`) | Colapso hoje |
|---|---|---|---|---|
| 1 | `features/commercial/components/Client/ClientsTable.tsx` | `/comercial` Clientes | `archived ? "10rem" : "9rem"` | não |
| 2 | `features/commercial/components/Budget/BudgetsTable.tsx` | `/comercial` Presupuestos | `archived ? '10rem' : '6rem'` | não |
| 3 | `features/operation/components/Turma/TurmasTable.tsx` | `/operacion` | `archived ? '10rem' : '9rem'` | não |
| 4 | `features/operation/components/Enrollment/EnrollmentTable.tsx` | `/operacion/turmas/:id` Alumnos | `'9rem'` | não |
| 5 | `features/operation/components/Enrollment/ArchivedEnrollmentsList.tsx` | idem, arquivados | `'10rem'` | não |
| 6 | `features/catalog/components/Course/CoursesTable.tsx` | `/cursos` | `archived ? '10rem' : '9rem'` | não |
| 7 | `features/certification/components/Emission/EmissionStudentsTable.tsx` | `/certificados` Emisión | `'8rem'` | não |
| 8 | `features/certification/components/Historial/HistorialTable.tsx` | `/certificados` Historial | `'16rem'` | não |
| 9 | `features/identity/components/Redator/RedatoresTable.tsx` | `/personas` Redactores | hook, `archived ? '10rem' : '12rem'` | sim |
| 10 | `features/identity/components/Student/StudentsTable.tsx` | `/personas` Alumnos | hook, `'6rem'` | sim |
| 11 | `features/identity/components/Admin/UsersTable.tsx` | `/administracion` Usuarios | hook, `archived ? '10rem' : '9rem'` | sim |
| 12 | `features/identity/components/Admin/RolesTable.tsx` | `/administracion` Roles | hook, `'6rem'` | sim |
| 13 | `app/pages/Dashboard/admin/CompliancePanel.tsx` | `/` | sem coluna presa | — |
| 14 | `app/pages/Dashboard/admin/RedatorLoadPanel.tsx` | `/` | sem coluna presa | — |
| 15 | `features/identity/components/Student/StudentDetailSections.tsx` | diálogo do Alumno | sem coluna presa | — |

As 7 visões de arquivados são as de Clientes, Presupuestos, Turmas, Cursos, Redactores, Usuarios e
a lista de matrículas arquivadas (linha 5).

**Ampliação do João, 2026-09-27:** um componente de data e hora, o `Timestamp`, entra no bloco e é
aplicado **só onde já há data e hora juntas**: o relógio do cabeçalho e a coluna "Último acceso"
de Usuarios e Redactores (§4.5). Ele entra porque muda a célula que a varredura mede. A ficha do
item 23 no `backlog.md` não é editada; a ampliação vive aqui.

**Fora:**
- Redesenho de colunas e os pesos de `COL` (`AppDataTable/columnWidth.ts`).
- Todo o `backend/` e o `generated.ts`.
- O **transbordo de 25px** dos dois painéis do Dashboard: o `scrollWidth` passa a largura da
  tabela em 25px (793 contra 768 e 789 contra 768), ou seja, é conteúdo e não piso. Se ele
  persistir depois do piso novo, vira ficha nova e não se corrige aqui.
- Aplicar o `Timestamp` a campos que só têm data.

## 2. Baseline medida em `162cbaa7`

Medição read-only com o script do Apêndice A, offset +2 (SPA em `:5175`, API em `:8082`), es-CL,
tema claro, `admin@lotus.cl`. A turma medida é a 1: a turma 3 está concluída e não tem coluna de
ação.

**1024x768.** O piso de 48rem (768px) passa a moldura (718px, e 684px na Emisión) em toda tabela
com o piso default:

| Tabela | Moldura | Tabela | Presa | Sobreposição |
|---|---|---|---|---|
| Clientes | 718 | 768 | 144 | 50 em "Contactos" |
| Presupuestos | 718 | 768 | 96 | 50 em "Estado" |
| Turmas | 718 | 768 | 144 | 50 em "Estado" |
| Matrícula (turma 1) | 718 | 768 | 144 | 50 em "Estado matrícula" |
| Cursos | 718 | 768 | 144 | 50 em "Redactores" |
| Emisión | 684 | 768 | 128 | **84** em "Certificado" |
| Historial | 718 | 768 | 256 | 50 em "Estado" |
| Alumnos | 718 | 768 | 96 | 50 em "Turmas" |
| Redactores, Usuarios, Roles (42rem) | 718 | 718 | 192 / 144 / 96 | 0 |
| Dashboard, 2 painéis | 718 | 768 (`scrollWidth` 793 / 789) | — | — |

As três tabelas que já estão em 42rem (672px) cabem inteiras. Isso prova que 672px cabe em toda
moldura de 1024, inclusive nos 684px da Emisión.

**390x844.** A moldura tem 276px (242px na Emisión). A coluna presa ocupa 96 a 256px sem colapso e
72px com colapso. A coluna de texto abaixo mede o **texto** da primeira coluna que fica sob a presa
na pior linha, que é a leitura que a `D-65` usou para dizer "nome coberto":

| Tabela | Presa | 1ª coluna (célula) | Texto coberto |
|---|---|---|---|
| Clientes | 144 | 197 | 65 |
| Presupuestos | 96 | Código 101 | 0 |
| Turmas | 144 | Código 54 | 0 |
| Matrícula | 144 | 304 | **172** |
| Cursos | 144 | 243 | 95 |
| Emisión | 128 | 209 | 95 |
| Historial | 256 | Código 53 | 33 |
| Redactores (colapso) | 72 | 180 | 0 |
| Alumnos (colapso) | 77 | 265 | **66** |
| Usuarios (colapso) | 72 | 204 | 0 |
| Roles (colapso) | 72 | 332 | 0 |

Em 2026-09-26 a `D-65` registrou 0 para Alumnos, e hoje a mesma versão do código dá 66px. A
leitura por texto **oscila com o dado** do banco de dev: nomes mais longos na primeira página
cobrem mais. É por isso que a régua de 390 (§3) mede a **caixa** da célula e não o texto.

**Arquivados.** O banco de dev não tem nenhum registro arquivado, então as 7 visões medem vazio
(largura 0, uma linha de "sem resultados"). A medição delas exige a fixture do §6.2.

**1440x900.** Moldura de 1134px (1100px na Emisión). Tabela igual à moldura e sobreposição 0 em
todas.

## 3. Régua

A régua vale para cada uma das 15 consumidoras e das 7 visões de arquivados, **antes e depois**.

**1024x768:**
- `scrollWidth == clientWidth` no invólucro. Nos dois painéis do Dashboard a régua é "tabela ≤
  moldura", porque o transbordo de 25px está fora (§1).
- Sobreposição da coluna presa = 0.
- Nenhum cabeçalho truncado.

**390x844:**
- **A coluna identificadora não fica sob a presa.** Na rolagem 0, a borda direita da **caixa de
  conteúdo** da primeira célula (a borda da célula menos o `padding-right`) fica ≤ a borda esquerda
  da coluna presa, em toda linha. Medir a caixa, e não o texto, garante que nenhum nome, de
  qualquer comprimento, termine sob a presa: ele trunca com reticência antes. Nas tabelas cuja
  primeira coluna é o código (Presupuestos, Turmas, Historial), a régua vale sobre o código.
- A linha carrega **um** controle quando tem duas ou mais ações.
- Em arquivados, a primeira coluna mede ≥ a mesma coluna na visão ativa, também em 390.

**1440x900:** sem regressão contra a baseline.

> **Refinamento sobre a seção 1 aprovada.** A seção dizia "primeira coluna não coberta (0px)" sem
> dizer 0px de quê. A baseline acima mostrou que o texto oscila com o dado, e a spec fixa a caixa
> de conteúdo. A régua ficou mais estrita, e o §4.2 é a consequência disso.

## 4. Mecanismo

### 4.1 Piso default de 42rem

`appDataTablePt.table` (`shared/ui/AppDataTable/style.ts`) passa de `min-w-[48rem]` para
`min-w-[42rem]`, sempre composto com `TABLE_LAYOUT`. O valor nomeado `reducedFloorTablePt` deixa
de existir, e com ele os três `pt=` que o usam (Redactores, Usuarios, Roles), porque a exceção
virou regra. O repasse de `pt` do `SearchableTableFrame` fica, já que o §4.2 o usa.

As três consumidoras sem coluna presa herdam o piso novo. Isso só reduz rolagem, e a régua de
1440 cobre a regressão.

### 4.2 Piso estreito condicional

> **Mudança sobre a seção 2 aprovada, para confirmar na revisão desta spec.** A seção 2 previa um
> `archivedFloorTablePt` só para as visões de arquivados que reprovassem. A baseline de 390 mostra
> que visões **ativas** também reprovam a régua do §3 mesmo com o piso de 42rem e o colapso. As
> contas abaixo usam os pesos de hoje escalados para 672px, com área livre = moldura − 72px:
>
> | Tabela | 1ª coluna em 672px | Área livre |
> |---|---|---|
> | Matrícula | ~266 | 204 |
> | Cursos | ~213 | 204 |
> | Emisión | ~183 | 170 |
> | Alumnos | ~232 | 204 |
> | Roles | 332 (já em 672px, medido) | 204 |
>
> Com isso o mecanismo condicional vale para **qualquer visão**, ativa ou arquivada, que reprove
> em 390 depois do §4.1 e do §4.4.

Mecanismo: um `pt` de piso por modo em `shared/ui/AppDataTable/style.ts`, na forma
`min-w-[X] sm:min-w-[42rem]`, composto com `TABLE_LAYOUT`. Ele só muda o piso abaixo de `sm`, então
1024 e 1440 não mudam por construção. Há duas direções possíveis:
- **Visão ativa que reprova a caixa:** X < 42rem, para que a coluna identificadora caiba na área
  livre.
- **Visão de arquivados mais estreita que a ativa:** X > 42rem, para compensar o par fixo de 24%
  das colunas `archived_at`/`archived_by`. É o resíduo da `D-65`, com Redactores em 132px.

**X sai da medição**, tabela por tabela e modo por modo, e nunca de conta de cabeça. A ordem é
aplicar o §4.1 e o §4.4, medir, e só então aplicar o piso estreito nas visões que reprovaram, cada
uma com o seu X registrado no audit.

A forma de expressar X é decisão do plano, com duas restrições:
- **Não pode haver string copiada na feature.** `mergePt` substitui a folha `table.className`, e
  uma cópia literal divergiria em silêncio do wrapper, como já registrado na `D-65`.
- **Tem de sobreviver ao scanner do Tailwind v4.** Um `min-w-[${x}]` montado em runtime não gera
  CSS. As opções são uma constante nomeada por valor ou uma variável CSS no `style` da tabela.

Se a medição mostrar que nenhuma visão reprova, o mecanismo não nasce, e a task registra o
veredito.

### 4.3 Ações rotuladas viram `RowActions`

Quatro tabelas ainda montam ações à mão:

| Tabela | Ações hoje |
|---|---|
| Historial | três `AppButton` de texto: `certificate.view`, `certificate.revoke`, `certificate.reissue` |
| Emisión | `AppButton` rotulado `certificate.emit` |
| Matrícula arquivada | `AppButton` rotulado de restauração, `pi pi-undo` |
| `EnrollmentTable` | `AppButton` cru de remoção, `pi pi-times` |

As quatro passam a `RowActions` (`shared/ui`): ícone com `tooltip` e `aria-label` igual ao rótulo
de hoje. O plano escolhe os ícones. Os diálogos de confirmação e as regras de `disabled` não
mudam. Os testes que acham o botão pelo nome continuam valendo, porque o nome acessível vem do
`aria-label`.

### 4.4 Colapso nas 12 e a catraca `ACAO_SEM_COLAPSO`

As 8 tabelas restantes ligam `useCollapsibleActionsColumn(width)` e passam `collapsed` ao
`*RowActions`. Nos adaptadores de Turmas, Presupuestos, Clientes e Cursos, que embrulham o
`ArchiveRowActions`, o `collapsed` é repassado. A `D-65` dizia "opt-in por tabela, depois de medir".
A baseline já mediu as oito: em 390 todas têm presa entre 96 e 256px sobre uma moldura de 276px, e
por isso o colapso vale para todas.

A escolha vira mecanismo (lição 14) numa regra nova de `no-restricted-syntax` em
`frontend/eslint.config.js`, a **`ACAO_SEM_COLAPSO`**. Ela fica nos dois arrays que já têm a
`ACAO_SEM_ANCORA` e exige que o argumento de `stickyActionsColumn` seja `<x>.width`, o retorno do
hook. Literal, template e ternário de literais reprovam. A regra tem de ser vista reprovando por
sonda (lição 10): um literal plantado numa tabela faz o `pnpm lint` falhar, e a restauração é por
`cp` de uma cópia no scratchpad, nunca por `git stash`.

### 4.5 `Timestamp`

O componente novo fica em `frontend/src/shared/ui/Timestamp/`, com `Timestamp.tsx`,
`Timestamp.test.tsx` e `index.ts`, e é exportado em `shared/ui/index.ts`.

- **Prop:** `value: Date`.
- **Marcação:** `<time dateTime={value.toISOString()} lang={i18n.language}>` com duas linhas numa
  grade de duas colunas, ícones alinhados numa coluna e texto na outra.

  ```
  (pi-clock)    20:24
  (pi-calendar) 27/09/2026
  ```

- **Ícones:** `pi-clock` e `pi-calendar`, na cor `var(--primary-color)` (`#25a5e4` nos dois temas) e
  com `aria-hidden`. São decorativos, então o contraste de 2,8:1 sobre o branco não é régua de
  texto. Sobre o navy do cabeçalho o contraste é 5,3:1.
- **Texto:** herda a cor do contexto, branco no cabeçalho e a cor da célula na tabela. A hierarquia
  é a do `Clock` de hoje: hora em `font-semibold`, data em `opacity-75`, `tabular-nums`,
  `leading-tight` e `my-0` nas linhas, porque o projeto não tem Preflight.
- **Máscara:** `formatTime` e `formatDate` de `shared/lib/datetime.ts`, no idioma ativo. O resultado
  é `27-09-2026` em es-CL, `27/09/2026` em pt-BR e `9/27/2026` em en, com a hora em 12h e AM/PM em
  en. O "dddd/mm/aa" do pedido foi lido como "a data no formato do idioma". O ano segue com 4
  dígitos, como o relógio já mostra, e não nasce máscara nova.
- **Troca de idioma:** o componente chama `useTranslation()` para re-renderizar sem reload (lição
  D-P12 do `Clock`).
- **Fuso:** o do navegador, como hoje.

Onde ele entra:
- **`Clock`** (`shared/ui/Clock/Clock.tsx`) passa a ser `useClock()` + `<Timestamp value={now} />`.
  O `Header` não muda.
- **"Último acceso"** de `UsersTable` e `RedatoresTable`: `<Timestamp value={new Date(x.last_login)} />`,
  mantendo `'—'` quando é `null`. A célula passa a ter duas linhas.
- **`formatDateTime`** sai de `shared/lib/datetime.ts` com o `describe` dele em `datetime.test.ts`,
  porque não sobra consumidor. O comentário de `features/identity/components/Redator/redatorColumns.ts:6`
  que o cita é atualizado.

O `Timestamp` entra **antes** da varredura final, porque muda a altura e o conteúdo da coluna
"Último acceso" que a varredura mede.

## 5. Veredito da direção (a), o sinal de rolagem

A `D-65` pedia medir um sinal de rolagem no invólucro. **Veredito: não se implementa.**
- Em 1024 o §4.1 zera a rolagem de toda tabela (o §2 mostra 672px ≤ 684px), então não sobra nada
  a sinalizar.
- Em 390 o invólucro já tem as sombras de rolagem da UI-10 (`background-attachment: local/scroll`),
  e a coluna presa tem sombra própria permanente.

O veredito é escrito no audit do bloco e fecha a direção (a) da `D-65` no `/fechar-sprint`.

## 6. Prova

### 6.1 Unidade (vitest, jsdom)

- `AppDataTable.test.tsx`:
  - o piso default afirma `min-w-[42rem]` e `table-fixed`;
  - o `describe` de `reducedFloorTablePt` sai, junto com a comparação `semPiso`;
  - se o §4.2 nascer, ganha o teste de que o `pt` estreito troca só o piso abaixo de `sm` e compõe
    `TABLE_LAYOUT`.
- `Timestamp.test.tsx`:
  - `<time dateTime>` com o ISO;
  - duas linhas;
  - ícones com `aria-hidden`;
  - as máscaras de hora e data nos três locales;
  - re-render na troca de idioma sem remontar.
- `Clock.test.tsx` é ajustado ao `Timestamp`.
- Cada uma das 8 tabelas do §4.4 afirma, no molde dos testes da fatia 3:
  - com viewport estreito, **um** controle por linha quando há duas ou mais ações e a coluna presa
    em 4.5rem;
  - com viewport largo, os ícones com `aria-label`.
- As 4 tabelas do §4.3 afirmam que os diálogos de confirmação continuam abrindo pelo botão
  achado pelo nome.
- A catraca `ACAO_SEM_COLAPSO` é vista reprovando por sonda (§4.4).

### 6.2 Navegador (DoD comportamental)

- **Script:** o `medir.cjs` do Apêndice A entra no audit para ser reproduzível. Ele mede, por
  invólucro visível: moldura, `scrollWidth`, largura e piso da tabela, largura da presa,
  sobreposição por célula, caixa de conteúdo da primeira coluna contra a presa, texto coberto e
  cabeçalhos truncados.
- **Cobertura:** 15 consumidoras × 3 viewports, visão ativa e de arquivados, **antes**
  (`162cbaa7`) e **depois**.
- **Diálogo do Alumno (linha 15):** medido abrindo o diálogo, porque o script não o alcança pela
  rota.
- **Fixture de arquivados:** no banco de dev do offset +2, 1 registro arquivado por entidade das 7
  visões (Cliente, Presupuesto, Turma, Curso, Redactor, Usuario e uma matrícula da turma 1), pela
  própria UI ou pela API. O usuário arquivado nunca é o `admin@lotus.cl`. O fluxo é medir e depois
  restaurar os 7, e os ids ficam no audit.
- **`Timestamp`:** medido no cabeçalho, em Usuarios e em Redactores, nos 3 locales e nos 2 temas. A
  cor computada do ícone tem de ser `rgb(37, 165, 228)` e a máscara a do locale. Sai uma captura
  por superfície para o João ver.
- **Registro:** `docs/superpowers/audits/2026-09-27-item23-medicoes.md`, com a baseline do §2, o
  depois, os X do §4.2 (ou o veredito de que ele não nasceu), o veredito do §5, a fixture e o
  script em apêndice.

### 6.3 Gates

- `pnpm lint` com 0 problemas, e `pnpm build` e `pnpm test` verdes, rodados em `frontend/`.
- `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` vazio. Com isso o
  `pint` e o `typescript:transform` ficam N/A por escopo provado.

## 7. Alternativas rejeitadas

- **Reserva em %, corrigindo `tableWidths()`:** a medição da `D-65` em 2026-09-20 mostrou que a
  sobreposição não muda 1px com outros pesos.
- **Piso reduzido opt-in, mantendo `reducedFloorTablePt` e aplicando-o nas outras 9:** 672px cabe em
  toda moldura de 1024, então a exceção deve ser o default e não uma cópia em 12 lugares.
- **Ações rotuladas acima de `sm`, com ícone só no colapso:** duas aparências para a mesma ação e
  uma coluna presa larga em 1024 (16rem na Historial).
- **Sombra condicional em CSS no lugar do sinal (a):** o §5 mostra que não há o que sinalizar em
  1024 e que 390 já tem sinal.
- **`Timestamp` em toda data:** o João escolheu só onde já há data e hora juntas.
- **Ícone de calendário em campos só de data:** fora pelo mesmo motivo.

## 8. Execução

- `lane-c`, árvore `../fix-frontend`, branch `refactor/frontend-tabelas-reserva-e-rolagem`. Só
  frontend, então a P-03 não se aplica.
- **Executor `claude`:** o bloco toca `shared/ui`, tem task condicional (§4.2) e decide por
  medição.
- **Restrições de ordem para o plano:**
  1. O script e a baseline vêm primeiro.
  2. O `Timestamp` vem antes da varredura final.
  3. Os §4.1, §4.3 e §4.4 vêm antes da medição que decide o §4.2.
  4. O §4.2 é condicional.
  5. O audit fecha por último.

## 9. Decisões do João (2026-09-27)

1. O piso de 42rem vira default (§4.1).
2. `RowActions` nas três tabelas rotuladas (§4.3). A `EnrollmentTable` entra junto, porque tem o
   mesmo botão cru.
3. A direção (a) sai como veredito escrito (§5).
4. O piso por modo é decidido pela régua medida (§4.2).
5. O `Timestamp` entra no bloco (§4.5), aplicado só onde já há data e hora juntas.
6. As seções 1 (escopo e régua), 2 (mecanismo) e 3 (prova e execução) do design foram aprovadas.
   Os refinamentos do §3 e do §4.2 nasceram da baseline medida depois das aprovações, e estão
   marcados para a revisão desta spec.

## Apêndice A — script de medição

O script vive em
`/tmp/claude-1000/-home-jvbat-projetos-fix-frontend/0eb1c5b3-36bc-466d-804a-160f913198b2/scratchpad/medir.cjs`
durante o planejamento. É Playwright-core, read-only, e roda contra `:5175`. A execução copia o
script para o apêndice do audit, com a medida da caixa de conteúdo da primeira coluna acrescentada
à de texto.
