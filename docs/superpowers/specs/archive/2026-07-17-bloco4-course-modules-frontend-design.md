# Bloco 4 · CR Curso: AppTextarea + módulos reordenáveis (frontend) — Design

> Data: 2026-07-17 · Escopo canônico: Notion CR.2.1 e CR.2.3.
> Depende de: CR.2.2 (Bloco 3 — backend + tipos gerados, mergeado no PR #9) e 6.4.1 (Bloco 1 —
> kit de form em `shared/ui/FormField/`).

## Objetivo

Dar interface ao quadro de módulos que o Bloco 3 criou no backend, e fechar o gate que ele
deixou aberto: **o form do curso hoje não manda `modules` no `PUT`, e o backend replace-total
apaga todos os módulos em silêncio.** Dois eixos:

1. **CR.2.1** — `AppTextarea` em `shared/ui`; descrição do curso passa a usá-lo; orientação de UX
   para nome vs nome técnico.
2. **CR.2.3** — módulos no `CourseDialog`: add/remover/reordenar, horas teóricas/práticas, total
   por módulo, soma geral, aviso não-bloqueante de divergência com `workload_hours`.

---

## 1. `AppTextarea` em `shared/ui` (CR.2.1)

Hoje `shared/ui` só tem `AppInputText`, e a descrição do curso é um input de uma linha
(`CourseDialog.tsx:62`). Features nunca importam PrimeReact direto (ADR-05, lei §5.6).

- Pasta `src/shared/ui/AppTextarea/` (`AppTextarea.tsx` + `index.ts`), com
  `export * from './AppTextarea'` no barrel — a regra do barrel é um export por pasta, nunca
  caminho fundo.
- Forma copiada do `AppInputText`: `forwardRef<HTMLTextAreaElement, AppTextareaProps>`,
  `AppTextareaProps extends InputTextareaProps` (de `primereact/inputtextarea`), `displayName`.
  **Sem** a variante de ícone (`IconField`/`InputIcon` não se aplicam a textarea).
- **Sem classes `dark:`** — cores vêm da folha de tema do Prime (ADR-16); empilhar `dark:` aqui
  faria o estado inválido (`.p-invalid`) perder.
- `AppRadioButton` (Bloco 2) é o precedente de wrapper **sem** `forwardRef`, porque o
  `RadioButton` do Prime é class component. **Não é o caso aqui:** `InputTextarea` é function
  component com `forwardRef` — segue a forma do `AppInputText`.

Consumidores nesta entrega: `course.description` e os dois textareas de cada módulo
(`learnings`, `contents`). Nenhum outro diálogo muda.

## 2. UX nome vs nome técnico (CR.2.1)

Os campos `name` e `technical_name` **já existem e já renderizam**. O pedido do contratante é só
de orientação. Decisão: **placeholder com exemplo real**, sem tocar o `FormField` do Bloco 1.

- `course.namePlaceholder` — ex.: `Riscos Elétricos` (rótulo curto).
- `course.technicalNamePlaceholder` — ex.: `Prevención de Riesgos Eléctricos en Alta Tensión`
  (denominação completa).

Descartado: prop `help?: string` no `FormField`. Adicionaria superfície ao kit compartilhado do
Bloco 1 para servir um único diálogo — abstração de uso único (§6). O placeholder some ao
digitar, e isso é aceitável: a dúvida é no preenchimento, não na releitura.

## 3. `useCourseForm` — fechar o gate do Bloco 3

**Este é o defeito real do bloco; a UI é a consequência.** Hoje:

```ts
export type CourseFormFields = Pick<
  CourseData,
  'id' | 'name' | 'technical_name' | 'description' | 'workload_hours' | 'redator_ids'
>
// submit():
const payload = { name, technical_name, description, workload_hours }
```

`PUT /api/courses/{id}` sem a chave `modules` faz o `UpdateCourseAction` ver `$modules = []`,
soft-deletar todos os módulos e não recriar nenhum. Silencioso, e o curso é registro de peso
legal. Correção:

- `'modules'` entra no `Pick`, no `EMPTY` (`modules: []`) e no `toFields`.
- O `payload` passa a incluir `modules`, projetado só nos campos **editáveis**:
  `{ name, learnings, contents, theory_hours, practice_hours }`.
- **`sort_order` e `total_hours` NÃO vão no payload.** O backend os deriva (`sort_order` do
  índice do array, `total_hours` em `fromModel`) e o `except('id','sort_order','total_hours')`
  do `Create/UpdateCourseAction` os descartaria de qualquer forma. Mandar seria teatro.
- `redator_ids` continua **fora** do payload (sincronizado pelo endpoint dedicado) — regra
  pré-existente, não muda.

**A ordem do array É o `sort_order`.** Não existe campo de ordem no form; reordenar é mover o
item no array.

## 4. Manipulação do array — no hook, não no JSX (CR.2.3)

Quatro helpers, exportados pelo `useCourseForm`, todos com **updater funcional** — dois eventos
no mesmo tick precisam enxergar o array já atualizado pelo anterior (o mesmo motivo do
`toggleRedator` e do `toggleCourse` do redator):

| Helper | Comportamento |
|---|---|
| `addModule()` | Anexa um módulo vazio ao fim (`name: ''`, textos `null`, horas `0`). |
| `removeModule(i)` | Remove o índice `i`. |
| `patchModule(i, patch)` | Merge parcial no índice `i`. Molde: `patchContact` do `ClientDialog`. |
| `moveModule(i, dir)` | Troca com o vizinho (`dir` = `-1` \| `1`). **No-op nas pontas.** |

`moveModule` no-op nas pontas em vez de lançar: os botões já vêm desabilitados no primeiro/último,
então um índice fora de faixa só chegaria por bug — e derrubar o diálogo do redator não é a
resposta proporcional a isso.

`ClientDialog` mantém os helpers em funções soltas no fim do arquivo, recebendo `setForm`. Aqui
eles vão **no hook**, como o card exige explicitamente ("manipulação do array vive no hook"). É
desvio consciente do irmão mais próximo, a favor do que o escopo manda — registrar no ledger.

## 5. `CourseDialog` — card por módulo

Seção nova `courseModule.section`, depois de "Dados gerais" e antes de "Redatores".

```
┌─ Módulo 1 ────────────────────────────────┐
│ [↑][↓]  Nome__________  Teo[8] Prat[0] =8 [x] │
│ Aprendizagens                              │
│ ┌────────────────────────────────────────┐ │
│ └────────────────────────────────────────┘ │
│ Conteúdos                                  │
│ ┌────────────────────────────────────────┐ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
                        Total dos módulos: 20 h
⚠ Soma dos módulos (20 h) difere da carga horária do curso (40 h). Você pode salvar assim mesmo.
```

- **`key={i}`, jamais `module.id`.** O replace do backend troca os ids a cada save; um `id` como
  key faria o React remontar as linhas e perder foco/caret. `ClientDialog:110` já usa índice —
  é o padrão da casa, e a ordem só muda por ação explícita do usuário.
- **Reordenar = botões `↑`/`↓`** (`AppButton text`, ícone `pi pi-arrow-up`/`pi pi-arrow-down`),
  desabilitados no primeiro/último item e em `readOnly`. Descartado o `OrderList` do Prime:
  exigiria wrapper novo em `shared/ui`, impõe layout de card próprio que briga com o grid da
  linha, e não é acessível por teclado.
- **Remover** = `AppButton text` com `pi pi-trash`, oculto em `readOnly`.
- **Adicionar** = `AppButton text` `pi pi-plus` sob a lista, oculto em `readOnly` — mesma forma
  do `addContact` do `ClientDialog`.
- **`NestedField`** (de `shared/ui`, nunca redefinido local) em cada campo do módulo, com
  `error={fieldErrors?.['modules.' + i + '.name']?.[0]}` etc. Sem ele, um 422 em
  `modules.0.theory_hours` deixa o botão de salvar aparentemente inerte.
- **`FormErrorSummary`** ganha `excludePrefixes={['modules.']}` — cada módulo já mostra o próprio
  erro. `mapped` continua com os campos do curso.
- **Horas** seguem a forma já usada no `workload_hours` do próprio diálogo:
  `AppInputText` + `Number(e.target.value.replace(/\D/g, '')) || 0`. Consequência: a UI não
  consegue produzir negativo. O `#[Min(0)]` do backend continua sendo a guarda real (e tem teste
  desde o Bloco 3) — **não duplicar validação no front**.
- **Estado vazio:** sem módulos, uma linha `courseModule.empty` (mesma forma do `noRedatores`).
- **`readOnly` (modo view):** campos desabilitados, botões de mover/remover/adicionar ocultos ou
  desabilitados. Totais e aviso continuam visíveis — são informação, não edição.

## 6. Totais e aviso de divergência

Tudo **derivado no render**, nada em estado:

- `total` do módulo = `theory_hours + practice_hours`, exibido na própria linha.
- `modulesTotal` = soma dos totais, exibido no rodapé da seção **sempre** (o card pede a soma
  geral; ela é útil enquanto se digita, não só quando dá errado).
- **Aviso âmbar** só quando `modulesTotal !== form.workload_hours` **e** há ao menos um módulo —
  curso sem módulo nenhum não é divergência, é curso sem módulo cadastrado.
- O aviso mostra **os dois números** e diz que dá para salvar. **Nunca desabilita o submit**
  (§5.7 — registro não bloqueia ação). Não é `FormErrorBanner`: aquilo é erro (vermelho,
  `role="alert"`); isto é aviso. Markup âmbar local no diálogo — **não** promover a `shared/ui`
  antes de existir um 2º consumidor (§6).
- **Módulo 100% teórico ou 100% prático (o outro = 0) é válido** e não gera aviso nenhum — o
  card é explícito, e o backend não tem regra que rejeite lado zerado.
- `modules_total_hours` do backend **não** é usado pelo form: a soma tem que reagir ao que está
  sendo digitado, não ao último valor salvo. O campo do DTO serve a consumidores de leitura
  (assumido no brainstorm do Bloco 3).

## 7. i18n — 3 locales (`es-CL` fallback, `pt-BR`, `en`)

**Colisão a evitar:** `course.module` **já existe** e significa "Cursos" como módulo do sistema
(rótulo de menu) — nada a ver com módulo do curso. Os textos novos vão em namespace próprio
`courseModule.*`, no topo de cada locale:

`section`, `add`, `remove`, `moveUp`, `moveDown`, `name`, `namePlaceholder`, `learnings`,
`contents`, `theoryHours`, `practiceHours`, `total`, `modulesTotal`, `hoursMismatch`
(interpolado com `{{modules}}` e `{{workload}}`), `empty`, `itemLabel` (interpolado com
`{{n}}` — "Módulo 1").

Mais, em `course.*`: `namePlaceholder`, `technicalNamePlaceholder`.

**Os 3 locales recebem todas as chaves.** `es-CL` é o fallback e a língua do cliente — chave
faltando ali vaza a chave crua na tela.

## Fora de escopo

- Validação de horas no front (o backend já responde 422; duplicar divergiria).
- Qualquer mudança em `workload_hours` — é a carga contratada, não se ajusta à soma (Bloco 3).
- Tocar o kit de form do Bloco 1 (`FormField`/`NestedField`/`FormErrorSummary`/`FormErrorBanner`).
- Promover o aviso âmbar a `shared/ui`.
- Backend: nenhuma linha. Se aparecer necessidade, **é sinal de que o spec errou** — parar e
  perguntar.

## Definition of Done

Comportamento provado **end-to-end contra a API real** (CLAUDE.md §4), não build/lint/test verde:

1. Criar curso com 2 módulos → reabrir em view → ordem e horas conferem com o que foi digitado.
2. Reordenar com `↑`/`↓` e salvar → reabrir → a nova ordem persistiu.
3. **Regressão do gate:** editar **só o nome do curso** e salvar → **os módulos sobrevivem**.
   Este é o cenário que hoje apaga tudo em silêncio.
4. Divergência de horas (soma 20 vs `workload_hours` 40) → aviso na tela **e o salvar funciona**.
5. Módulo 100% teórico → sem aviso.
6. `pnpm lint` e `pnpm build` verdes; nenhuma feature importando PrimeReact direto.

O front não tem test runner (CLAUDE.md §8) — a prova é a verificação real no navegador contra a
API do container, mais a suíte backend intacta (144 testes) como rede de que nada regrediu.
