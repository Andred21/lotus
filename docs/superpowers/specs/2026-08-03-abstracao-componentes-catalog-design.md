# Spec — Abstração de componentes de `catalog`

- **Work item:** `abstracao-componentes-catalog` (item 4 do `backlog.md`)
- **Data:** 2026-08-03
- **Feature:** `catalog`
- **Context packet:** nenhum. A fonte é o código de `frontend/src/features/catalog/`, a rule
  `.claude/rules/frontend-fsliced.md` e o relatório do `/revisar-frontend` de `features/catalog` da
  sessão de 2026-08-03. Sem Drive/Notion/Figma.

## 1. Problema

`catalog` é a última das quatro features com dívida estrutural mapeada. Os blocos de `operation`
(2026-08-02) e `commercial` (2026-08-03) fecharam as suas; a catraca de query-em-componente foi
zerada no segundo, e o `useCourseRedatores` que nasceu lá já tirou a query do `CourseDialog`. O que
sobrou aqui é composição de componente, não busca de dado — e é o maior caso do repositório.

`CourseDialog.tsx` tem **251 linhas**, o maior componente da SPA, contra a régua de ~150 da rule.
Duas responsabilidades convivem nele: o quadro de módulos do curso (76 linhas, 5 campos irmãos por
item dentro de um `.map`) e a seção de redatores (57 linhas, ternário de 4 ramos). Ambas se resolvem
com o padrão que o `ClientDialog` já provou — `ContactFields` + `ContactCard` — e que existe na base
justamente porque um diálogo de 199 linhas caiu para 132 com ele.

Junto vêm dois defeitos de uma linha só. `CoursesTable.tsx:87` tem um template literal quebrado —
``className={`pi pi-book }`}`` — sem interpolação nenhuma, mandando a classe lixo `}` para o DOM; e a
mesma linha hardcoda `'#25A5E4'`, que é cópia literal do `BRAND_COLOR` de `shared/config/brand.ts`.
Fora do `LoginPage`, é o único hex hardcoded em `features/`.

Lei §6 está limpa em `catalog`: zero PrimeReact importado direto, zero import cross-feature. Nada
neste bloco é bloqueante.

## 2. Escopo

**Dentro** — os 7 achados do `/revisar-frontend` de `catalog` (2026-08-03):

- **C-1** quadro de módulos inline no `CourseDialog` (`:96-171`) → `ModuleFields` + `ModuleCard`.
- **C-2** seção de redatores inline no mesmo arquivo (`:191-247`) → `CourseRedatoresSection`.
- **C-3** template literal quebrado em `CoursesTable.tsx:87`.
- **C-4** `'#25A5E4'` hardcoded na mesma linha, em vez de `BRAND_COLOR`.
- **B-1** derivação `modulesTotal`/`hoursMismatch` (`:39-41`) → `useCourseForm`.
- **B-2** `useNavigate` + `usePermissions` + `openRedator` (`:28-32`) → `useCourseRedatores`.
- **B-3** micros que dobram nos anteriores: alias `enabledIds`, `r.id as number` repetido 3x.

**Fora:**

- Qualquer arquivo de `backend/`, de `frontend/src/shared/`, `generated.ts` ou `locales/`. Nenhuma
  chave i18n nova: toda string que o bloco move já existe.
- Qualquer mudança de schema, auth, RBAC ou cálculo de dinheiro.
- Espaçamento, tipografia e tema — eixo do `/revisar-ui`. O C-4 entra por ser duplicação de uma
  constante compartilhada, não por ser escolha estética.
- Os débitos já registrados no `backlog.md` (B-7, Q-14, Q-15 e os demais). Nenhum toca `catalog`.

## 3. Decisões

### D1 — Bloco 100% frontend, branch no main tree, sem worktree

Branch `refactor/abstracao-componentes-catalog` a partir do `main`. `git diff --name-only
main...HEAD -- backend/` vazio é critério de gate. Sem worktree: o DoD se prova na tela contra o
`docker compose` e o Vite do main tree, e um worktree exigiria `pnpm install` próprio mais um segundo
dev server só para conferir 3 modos de um diálogo. Mesmo molde dos dois blocos anteriores, embora
aqui — diferente deles — nenhum arquivo de alcance global (`eslint.config.js`, `shared/`) seja tocado.

### D2 — C-1 em dois arquivos: `ModuleFields` (lista) + `ModuleCard` (item)

Espelha `ContactFields`/`ContactCard`, molde já aprovado no `ClientDialog`.

- `ModuleFields` — o `.map` com `key={i}`, o botão add, o total de módulos e o aviso de divergência.
  Recebe `modules`, `readOnly`, `fieldErrors`, `workloadHours`, `modulesTotal`, `hoursMismatch` e
  `onAdd`/`onRemove`/`onPatch`/`onMove`.
- `ModuleCard` — um módulo: os 5 campos (`name`, `theory_hours`, `practice_hours`, `learnings`,
  `contents`), o total da linha e os 3 botões de ação. Recebe `module`, `index`, `isFirst`, `isLast`,
  `readOnly`, `fieldErrors` e os handlers já fechados sobre o índice.

Um arquivo só foi descartado: repetiria no `catalog` o tamanho que o `ContactCard` existe para evitar,
e deixaria o item sem fronteira própria.

### D3 — C-2 preserva os 4 ramos na ordem de hoje

`CourseRedatoresSection` recebe o retorno do `useCourseRedatores`, mais `isCreate`, `enabledIds` e
`onToggle`. A cadeia continua `isLoading` → `isError` → `isCreate` → view/edit. **Não** vira guarda
sequencial no molde do `PickerBody`/`SlotBody`: o terceiro ramo é modo de diálogo, não estado de
carga, e achatar os dois eixos numa lista de guardas mudaria o significado do código sem mudar a tela.

Os 3 estados que a D11 do bloco de cards fixou continuam valendo: um 403 é erro com Reintentar, nunca
"curso sem redatores habilitados".

### D4 — B-1: a derivação sobe para o `useCourseForm`

O hook já é dono de `form.modules` e `form.workload_hours`, as duas entradas do cálculo, e passa a
expor `modulesTotal` e `hoursMismatch`. `ModuleFields` recebe os dois prontos e só renderiza —
`workloadHours` viaja junto apenas para o texto do aviso. Nenhum `reduce` sobrevive em componente.

Deixar o `ModuleFields` derivar de `modules` + `workloadHours` foi descartado: economizaria duas props
e reintroduziria em `catalog` exatamente o cheiro que o bloco existe para tirar.

### D5 — B-2: a navegação sobe para o `useCourseRedatores`

A assinatura passa a ser `useCourseRedatores(enabledIds, onClose)`, e o retorno ganha
`canOpenRedator` (`can('identity.user.view')`) e `openRedator(id)` (que fecha o diálogo e navega para
`/personas?redator=<id>`). `CourseDialog` perde os imports de `useNavigate` e `usePermissions`.

Os 3 comentários que justificam o desenho migram para o hook: o olho leva ao módulo dono do redator,
`catalog` não pode importar o `RedatorDialog` de `identity` (lei §6) e composição cruzada mora na
rota. Sem `identity.user.view` o destino não serviria de nada, então o olho não aparece.

Um `useCourseRedatorNav` separado foi descartado: seriam ~15 linhas com um consumidor só, sempre usado
junto com o hook do dado. Deixar a navegação descer para o `CourseRedatoresSection` também — só
mudaria o endereço do problema.

### D6 — C-3 e C-4 são a mesma linha, num commit só

`CoursesTable.tsx:87` vira `className="pi pi-book"` com `style={{ color: BRAND_COLOR, fontSize:
'1.25rem' }}`, importando de `@shared/config/brand`. As duas correções são no-op visual **por
construção**: a classe `}` não casa com nenhum seletor, e `BRAND_COLOR === '#25A5E4'`.

### D7 — `key={i}` continua `key={i}`, com o comentário junto

O backend faz replace-total dos módulos, então os ids trocam a cada save e o índice é a identidade
estável (a ordem do array É o `sort_order`). Trocar por `key={m.id}` durante a extração seria
regressão silenciosa — derrubaria foco e estado da linha. O comentário que explica isso migra para o
`ModuleFields`, onde o `.map` passa a viver.

### D8 — B-3 não vira task própria

O alias `enabledIds` desaparece como efeito da D3 — o `CourseDialog` passa `form.redator_ids` direto.
Os três `r.id as number` se concentram no `CourseRedatoresSection`, junto do markup que os usa;
eliminá-los exigiria o hook devolver uma lista com `id` não-opcional, e `RedatorData.id` é `number |
undefined` no `generated.ts` — mudar isso é mexer no DTO, fora do escopo. Task própria para o B-3
seria commit sem conteúdo.

### D9 — Nada de órfão

Cada componente e cada campo de retorno novo tem consumidor na tela. `ModuleFields`, `ModuleCard` e
`CourseRedatoresSection` têm exatamente um cada; `modulesTotal`, `hoursMismatch`, `canOpenRedator` e
`openRedator` têm leitor. API morta em hook novo é órfão parcial e mente sobre o que a tela trata.

### D10 — Prova visual em 1 checkpoint

São 2 telas apenas (lista de cursos e o diálogo), e todas as mudanças convergem nelas. Dois
checkpoints fariam o João aprovar o mesmo diálogo duas vezes. O checkpoint vem depois de todas as
extrações e do fix da tabela, e cobre: Cursos (busca, os 2 empty states, ícone), diálogo **create**
(add/mover/remover módulo, total, aviso âmbar, grid de redatores selecionável), **view** (leitura,
olho, "sem redatores"), **edit** (campos e módulos editáveis, redatores em leitura) e o **erro** de
redatores com Reintentar.

Sem baseline capturada — mesma limitação dos blocos anteriores: não há ferramenta de browser ou
screenshot na sessão.

## 4. Invariantes de comportamento

O critério de aceite é comportamento idêntico. O review confere estas uma a uma contra o `main`:

1. **`key={i}`** nos módulos; `moveModule` no-op fora de faixa; mover desabilitado em `i === 0` e
   `i === length - 1`.
2. **Máscara numérica idêntica** nos 3 campos de hora: `Number(v.replace(/\D/g, '')) || 0`. Não
   arredonda, não aceita negativo, não coage `0`.
3. **Chaves de erro nested** batem com o índice depois da extração —
   `modules.${i}.name|theory_hours|practice_hours|learnings|contents`. `ModuleCard` recebe `index`;
   não recalcula posição.
4. **`FormErrorSummary`** mantém `mapped` e `excludePrefixes={['modules.']}`.
5. **Aviso de divergência de horas:** âmbar, sem `role="alert"`, **nunca bloqueia o submit** (§5.7 —
   registro histórico não é gate). Só aparece com `modules.length > 0`.
6. **Totais:** por linha (`theory + practice`) sempre; o total geral só com `modules.length > 0`.
7. **Redatores:** os 3 estados da D11 sobrevivem; o `?? []` do hook **não** vira tratamento de erro em
   lugar nenhum.
8. **Seleção só no create**, leitura em view/edit; o olho existe só onde há `onView` **e**
   `canOpenRedator`.
9. **`openRedator` chama `onClose()` antes do `navigate`** — inverter deixaria o diálogo aberto sobre
   a rota nova.
10. **Submit inalterado:** `redator_ids` fora do payload, `modules` sempre dentro (replace-total),
    `createdIdRef` ainda impede recriar curso em resubmit, `sync` só dispara com
    `redator_ids.length > 0`.
11. **`readOnly`** desabilita todos os campos e esconde add/mover/remover.
12. **Tabela:** coluna `name` `sortable`, `footerCount`, `first` controlado, os 2 empty states (sem
    cadastro vs. busca sem resultado), `end={error ? undefined : actions}`.
13. **C-3/C-4 são no-op visual por construção:** a classe `}` não casa com seletor nenhum e
    `BRAND_COLOR === '#25A5E4'`.

## 5. Definition of done

**Comportamento idêntico provado na tela, não build verde** (lei §8). O aceite é o checkpoint D10
aprovado pelo João.

Gate automatizado da última task:

- `pnpm build` e `pnpm lint` verdes.
- `git diff --name-only main...HEAD` vazio para `backend/`, `frontend/src/shared/`,
  `frontend/src/shared/config/locales/` e `generated.ts`.
- Greps sem saída: `use(Query|Mutation)\b|Api\.use` em `features/catalog/components/`; `primereact`
  importado direto em `features/catalog/`; import cross-feature; `#25A5E4` fora de
  `shared/config/brand.ts`; `pi-book }`.
- `CourseDialog.tsx` abaixo de ~100 linhas; nenhum arquivo de `catalog` acima de ~110.
- Nenhum órfão (D9): cada arquivo novo com consumidor, cada campo de retorno com leitor.
- Suíte backend como regressão: **372 passed (1360 assertions)**, a baseline dos dois blocos
  anteriores.
- Pint **n/a** (zero arquivo de `backend/` no diff); sem `typescript:transform` (nenhum DTO tocado).

## 6. Riscos

- **Extração que muda a tela.** O risco real do bloco. Mitigação: markup movido literal, nenhuma
  condicional muda de forma, nenhum `key` muda de critério — mais o checkpoint da D10. Foi assim nos
  dois blocos anteriores e nenhum precisou refazer prova.
- **Índice de módulo perdido na fronteira nova.** `ModuleCard` recebe `index` e handlers já fechados
  sobre ele; a invariante 3 existe para pegar isso.
- **`CourseRedatoresSection` achatando os 4 ramos.** Coberto pela D3: a ordem e o significado de cada
  ramo são explícitos na spec, não deduzidos na hora.
