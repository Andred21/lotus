# Spec — Cards da relação Curso ↔ Redator

- **Work item:** `cards-relacao-curso-redator`
- **Data:** 2026-08-01
- **Origem:** item 1 de `docs/superpowers/backlog.md`
- **Context packet:** nenhum — o João forneceu as 3 imagens de referência
  (`courses-redator`, `prototipo-redator-dialog-course`, `redator-courses`) direto na sessão de
  planejamento, e o restante do contexto está no repositório.

## 1. Problema

A relação curso ↔ redator existe nos dois diálogos, e nos dois ela é a representação mais pobre da
tela:

- **`CourseDialog`** (view/edit) lista os redatores habilitados como `<div className="rounded p-2
  text-sm">{r.name}</div>` — só o nome. Quem está habilitando uma turma não vê foto, RUT nem
  idoneidade, que é justamente a informação que decide se aquele redator pode ministrar.
- **`RedatorDialog`** lista todos os cursos como `<input type="checkbox">` + nome, sem distinguir
  habilitados de não habilitados e sem nenhum dado do curso (carga horária, módulos).

O protótipo já resolveu isso com cards. Este bloco traz os cards para o código.

## 2. Escopo

Bloco **100% frontend**. Nenhuma migration, nenhum DTO novo, nenhuma rota de API nova, nenhuma
mudança de regra de negócio.

**Fora de escopo, declarado:** o acoplamento RBAC entre `catalog` e `identity` (D11 trata só a
*visibilidade* da falha, não o acoplamento); FUT-2 no caso geral (D8 resolve um caso concreto, não
o mecanismo genérico); qualquer mudança no fluxo de habilitação.

## 3. Restrições que moldam o desenho

| # | Restrição | Origem |
|---|---|---|
| R1 | Feature não importa outra feature, nem para tipo | `CLAUDE.md` §5.6 · ADR-05 |
| R2 | Feature não importa PrimeReact direto — só via `shared/ui` | `CLAUDE.md` §5.6 |
| R3 | Idoneidade e status de documento se derivam no front, não no DTO | `.claude/rules/frontend-fsliced.md` |
| R4 | Tailwind é layout; cor vem de variável CSS do tema | ADR-16 |
| R5 | `shared/ui` não carrega regra de domínio | `.claude/rules/frontend-fsliced.md` |
| R6 | Componente de feature é declarativo; estado e derivação vão para hook | `.claude/rules/frontend-fsliced.md` |
| R7 | Frontend não tem test runner — gate é `pnpm build` + `pnpm lint` + prova visual | `.claude/rules/frontend-fsliced.md` |

## 4. Dados: o backend já entrega tudo

Verificado no código, não suposto:

- `CourseController@index` faz `with(['certificateTemplates', 'redatores', 'modules'])`, e
  `CourseData::fromModel` sempre preenche `modules` e `modules_total_hours`. O tipo gerado é
  `modules: CourseModuleData[] | undefined` → a contagem é `c.modules?.length ?? 0`.
- `RedatorController@index` faz `with(['user', 'courses', 'documents'])`, e `RedatorData` expõe
  `photo_url` (`#[Computed]`), `rut`, `documents[]` e `course_ids[]`.

Ambos os diálogos já consomem essas listas (`coursesApi.useList()`, `redatoresApi.useList()`).
**Nenhuma chamada nova.**

## 5. Decisões

### D1 — Zero backend

Nenhum arquivo de `backend/` é tocado. Se a execução descobrir que precisa de campo novo, isso é
divergência da spec: PARE e reporte, não estenda o DTO silenciosamente.

### D2 — `redatorStatus.ts` sobe para `shared/lib`

`features/identity/lib/redatorStatus.ts` → `shared/lib/redatorStatus.ts`, exportando `docStatus`,
`idoneidade` e o tipo `DocStatus` pelo barrel `shared/lib/index.ts`.

**Por quê:** o card do lado do curso mostra idoneidade, e `CourseDialog` é `catalog`. Importar
`identity/lib` de dentro de `catalog` quebra R1. Mover é a única saída que não duplica a regra nem
a empurra para o DTO (R3 proíbe o DTO).

O arquivo só depende de `@shared/types/generated`, então `shared` não passa a depender de feature.
Dois importadores existentes são reapontados: `RedatoresTable.tsx:9` e `RedatorDialog.tsx:11`.
O arquivo antigo é **removido**, não deixado como reexport.

### D3 — `AppSelectableCard` em `shared/ui`

Novo wrapper apresentacional puro: moldura, hover, estado selecionado e slot de ação à direita.

```
AppSelectableCardProps {
  selected?: boolean       // ausente => card de leitura
  onToggle?: () => void    // ausente => card de leitura
  disabled?: boolean
  action?: ReactNode       // canto direito (ex.: botão olho)
  children: ReactNode
}
```

**Semântica:** com `onToggle`, renderiza `<button type="button" aria-pressed={selected}>`; sem
`onToggle`, renderiza `<div>` sem papel interativo. Um card de leitura que anuncia `button` ao
leitor de tela mente sobre o que ele faz.

`action` fica **fora** do elemento clicável — botão dentro de botão é HTML inválido e o clique no
olho não pode alternar a seleção.

Cor por variável CSS (R4); borda de seleção e fundo derivados da mesma fórmula `color-mix` que
`AppCard`/`AppErrorState` já usam, que é o que mantém contraste nos dois temas.

### D4 — Os dois cards de conteúdo são de feature, não de `shared/ui`

- `features/catalog/components/Course/RedatorCard.tsx` — `AppAvatar` (foto com fallback de
  iniciais, já resolvido no bloco anterior), nome, RUT em `font-mono`, `AppTag` de idoneidade.
- `features/identity/components/Redator/CourseCard.tsx` — nome, carga horária, contagem de
  módulos. Sem avatar.

**Por quê:** idoneidade é regra de domínio, e R5 mantém `shared/ui` livre disso. Um `AppEntityCard`
genérico o bastante para os dois viraria componente de muitas props e puxaria domínio para o
`shared`.

### D5 — Severidade da idoneidade segue o mapa que já existe

`idoneo → success`, `por_vencer → warning`, `no_idoneo → danger` — o mesmo do `headerExtra` do
`RedatorDialog`. Não inventar terceira convenção de cor para o mesmo conceito.

### D6 — Carga horária no card do curso é `workload_hours`

Não `modules_total_hours`. É a carga **contratada** — o número que vale comercialmente e vai ao
certificado. O DTO declara que as duas divergem de propósito ("contratado, não se ajusta à soma").
O card não exibe o aviso de divergência: esse aviso é do formulário de módulos, onde a pessoa pode
agir sobre ele.

Contagem de módulos: `c.modules?.length ?? 0`.

### D7 — Modos de cada diálogo

| | `view` | `edit` | `create` |
|---|---|---|---|
| `CourseDialog` | cards dos habilitados, leitura | igual a view + nota "edita-se em Pessoas" | cards de **todos** os redatores, selecionáveis |
| `RedatorDialog` | cards dos habilitados, leitura | **todos** os cursos, habilitados primeiro, selecionáveis | todos os cursos, ordem da API |

A assimetria é a regra de negócio existente, não desleixo: habilitar pelo lado do curso só é
permitido no `create` (exceção do produto, via `PUT /api/courses/{id}/redatores`); pelo lado do
redator é permitido sempre, e é onde a edição mora.

Estado vazio permanece distinto por modo: em leitura, "sem redatores habilitados" / "sem cursos
habilitados"; em seleção, o vazio só aparece se o cadastro inteiro estiver vazio.

### D8 — Botão olho navega, não abre diálogo

Clique no olho fecha o `CourseDialog` e navega para `/personas?redator=<id>`. `PeoplePage` lê o
parâmetro, abre aquele redator em `view` e **limpa a query** (`replace`, para o botão Voltar não
reabrir o diálogo).

**Por quê:** `catalog` não pode importar `RedatorDialog` de `identity` (R1). Composição cruzada
acontece na camada de rota — é exatamente o que a regra de dependência manda. Este é o primeiro
caso concreto do FUT-2; o mecanismo genérico continua fora de escopo.

Exige `openViewById(id: number)` novo em `shared/hooks/useCrudPage.ts` — o hook hoje só tem
`openView(item)`, e o deep link só tem o id. Ele guarda o id e deriva a entidade da lista viva, então
o dado chega quando o GET terminar, sem congelar snapshot.

A leitura do parâmetro segue o padrão "adjust state during render" do projeto (comparar valor em
`useState` + set condicional no corpo do render), **não** `useEffect` — a regra
`react-hooks/set-state-in-effect` está ativa.

### D9 — Ordem em `edit` do redator congela na abertura

Os habilitados vêm primeiro, calculado **uma vez** ao entrar em `edit` e mantido até o diálogo
fechar. Um toggle não reordena a lista.

**Por quê:** reordenar ao vivo faz o card recém-clicado saltar sob o ponteiro; dois cliques
seguidos acertam o curso errado. A ordem se recalcula na próxima abertura.

Critério de ordenação dentro de cada grupo: a ordem que a API devolve (não introduzir sort
alfabético novo — o backend não garante ordem e mudar isso é decisão separada).

### D10 — Grid responsivo

Cards em `grid gap-2 sm:grid-cols-2` nos dois diálogos: uma coluna abaixo de 640px, duas acima.
O conteúdo do card trunca com `truncate` no nome — nome longo não pode empurrar a tag de
idoneidade para fora.

### D11 — Falha de carregamento para de se disfarçar de lista vazia

Hoje `CourseDialog` faz `redatores.data ?? []`. Quem tem `catalog.course.view` sem
`identity.user.view` recebe 403 e lê **"Sem redatores habilitados"** num curso que tem três — a
tela afirma algo falso sobre o banco.

As duas seções (redatores no curso, cursos no redator) passam a distinguir três estados:

- `loading` → `AppSkeleton`;
- `isError` → `AppErrorState` com `detail` do RFC 7807 e botão Reintentar;
- 200 com lista vazia → estado vazio.

O botão olho só renderiza com `can('identity.user.view')` — sem a permissão, `/personas` não
serviria para nada.

**Isto não resolve o acoplamento RBAC.** Quem tem uma permissão sem a outra continua vendo menos do
que a API deixaria; o débito segue registrado no `backlog.md` (item "Alunos · o dropdown de empresa
depende de uma permissão de outro módulo", mesma classe de problema). O bloco só remove a mentira.

### D12 — i18n em 3 locales

Toda string nova entra em `pt-BR`, `es-CL` e `en` com chaves **idênticas**. `es-CL` é a referência
de rótulo (cliente chileno). Nenhum texto hardcoded no JSX.

## 6. Arquivos

**Novos**

- `frontend/src/shared/ui/AppSelectableCard/AppSelectableCard.tsx` + `index.ts`
- `frontend/src/shared/lib/redatorStatus.ts` (movido)
- `frontend/src/features/catalog/components/Course/RedatorCard.tsx`
- `frontend/src/features/identity/components/Redator/CourseCard.tsx`

**Alterados**

- `frontend/src/shared/ui/index.ts` (barrel)
- `frontend/src/shared/lib/index.ts` (barrel)
- `frontend/src/shared/hooks/useCrudPage.ts` (`openViewById`)
- `frontend/src/features/catalog/components/Course/CourseDialog.tsx`
- `frontend/src/features/identity/components/Redator/RedatorDialog.tsx`
- `frontend/src/features/identity/components/Redator/RedatoresTable.tsx` (import de D2)
- `frontend/src/features/identity/components/PeoplePage.tsx` (deep link)
- `frontend/src/shared/config/locales/{pt-BR,es-CL,en}.json`

**Removido**

- `frontend/src/features/identity/lib/redatorStatus.ts`

## 7. Definition of Done

Comportamental, provado na tela — build verde não basta (R7).

1. `CourseDialog` em `view` de curso com redatores habilitados mostra, por redator: foto (ou
   iniciais), nome, RUT e tag de idoneidade coerente com a do `RedatorDialog` do mesmo redator.
2. `CourseDialog` em `create` lista **todos** os redatores como card selecionável; a seleção grava
   e o curso criado volta com os `redator_ids` escolhidos.
3. Clique no olho fecha o diálogo, leva a `/personas` com aquele redator aberto em `view`, e a URL
   fica sem o parâmetro depois.
4. `RedatorDialog` em `view` mostra só os cursos habilitados, com nome, `workload_hours` e
   contagem de módulos.
5. `RedatorDialog` em `edit` lista todos os cursos com os habilitados primeiro; marcar/desmarcar
   **não** reordena; salvar persiste a habilitação nova.
6. Com o GET de redatores derrubado (DevTools offline ou usuário sem `identity.user.view`), a
   seção do `CourseDialog` mostra erro + Reintentar — nunca "sem redatores habilitados".
7. `pnpm build` e `pnpm lint` verdes.
8. Prova visual do João nos dois temas, em 1400px e 768px.
9. Suíte backend continua verde (nada de backend foi tocado — a corrida é regressão, não prova).

## 8. Riscos

- **Regressão silenciosa no `create` do curso.** Trocar checkbox por card mexe no caminho que
  grava `redator_ids`. O DoD 2 existe para provar a gravação, não só o desenho.
- **Deep link + `useCrudPage`.** Ler query param e setar estado no render é o padrão da casa, mas
  errar isso rende loop de render. O sinal de acerto é a URL limpa e um único diálogo aberto.
- **`AppSelectableCard` virando componente-canivete.** Se a execução precisar de mais props do que
  as declaradas em D3 para servir aos dois cards, o corte de D4 está errado — reporte antes de
  inflar o wrapper.
