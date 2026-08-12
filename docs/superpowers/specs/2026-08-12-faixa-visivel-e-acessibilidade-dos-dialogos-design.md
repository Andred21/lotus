# Faixa visível e acessibilidade dos diálogos (design)

> **NÃO PROMOVIDO.** Desenho escrito em 2026-08-12, com os seis itens íntegros e as oito decisões da
> §2 tomadas pelo João, mas o BD-3 **não** entrou em `state.md`: a sessão descobriu, ao gravar a
> transição, que `estilizacao-adr16-shell-tipografia` segue `executing` na branch
> `feat/estilizacao-adr16-shell-tipografia` (22 commits à frente do `main`, `state.md` da branch
> mais novo que o do `main`), parado no checkpoint visual do João. Promover o BD-3 violaria a
> invariante de um `active_work_item` só, e o item 6 escreveria variáveis de tema contra a folha
> Lara-Lotus que ainda vive apenas naquela branch. **Decisão do João em 2026-08-12: fechar a
> estilização primeiro.**
>
> **O que precisa ser remedido antes de executar este bloco:** todo número da §4.1, §5.1, §6 e §7.3
> foi medido contra `main`@`4b02b72`. A branch parada já mexeu em `AppButton`, `AppHeader`,
> `AppSidebar` e na camada de cor — as contagens de cor hardcoded e as citações de `arquivo:linha`
> de `shared/ui` mudam com o merge. As oito decisões da §2 são independentes da base e continuam
> valendo.
>
> BD-3 do `backlog.md`, seis itens íntegros.
> Frontend puro, main tree (a P-03 restringe worktree só em bloco de backend), zero schema, zero
> `generated.ts`. Fonte: repositório e documentos versionados — os três débitos do piloto UI
> (`backlog.md:192`, `:202`, `:213`), `Q-14` (`backlog.md:292`), `Q-15` (`backlog.md:296`),
> "Bloco visual · Parte 1 (Q-1 do `/revisar-sprint`)" e "Cor fora do corte do D18"
> (`backlog.md:300`). Sem Context Packet por ausência medida de fonte externa: nenhum dos seis itens
> cita Drive, Notion ou Figma, e o `D18` é decisão de spec versionada
> (`docs/superpowers/specs/archive/2026-07-26-bloco-visual-refino-ui-design.md:395`).

## 1. Escopo

Seis itens, na ordem escrita do BD-3:

1. **`AppDialog`** — restaurar o foco ao disparador no fechamento e nomear o controle de maximizar.
2. **Modo leitura** — valor completo legível e copiável onde hoje há input desabilitado,
   preservando os inputs no modo edit.
3. **Faixa visível** — tabela e estados vazio/erro dentro da área visível em `1024x768` e `390x844`,
   pela fronteira `shared/ui`.
4. **CTA duplicado** — um lugar só para a ação de cadastro.
5. **Q-14 e Q-15** no mesmo commit — os dois são estado de carregamento mentindo na tela.
6. **Cor Tailwind hardcoded nos diálogos de feature** (D18), por variável do tema (ADR-16).

**Fora de escopo (lista fechada):**

- o shell (`Sidebar`/`AppLayout`/`AppHeader`) — exceção aprovada pelo João em 2026-07-26;
- a cor hardcoded fora dos diálogos: `LoginForm`, `LoginPage`, `ValidationPage`, `CourseStep`,
  `QuoteWizard`, `ManualButton`, `ClientsTable` — 24 ocorrências em 7 arquivos, que entram na
  catraca da §7.3 em vez de serem corrigidas (D7);
- o toggle da sidebar abaixo de 1024px (`backlog.md`, decisão do João de 2026-07-27);
- adoção da `SearchableTableFrame` por `BudgetsTable`/`TurmasTable`, extração de componente e
  `max-lines` — são o BD-4;
- absorção do trio da foto no `useCrudForm` — é o BD-5;
- `B-7` (falha que se disfarça de lista vazia) — é o BD-6;
- qualquer mudança de backend, de schema, de DTO ou de contrato HTTP.

## 2. Decisões

Oito decisões do João, respondidas antes de a spec existir.

**D1 — a restauração de foco mora no `AppDialog`, não nas 9 páginas.** Escolha entre corrigir no
wrapper, trocar a montagem condicional das 9 páginas por montagem permanente, ou os dois. O wrapper
corrige os 9 diálogos num arquivo e não depende de como a página monta (§3).

**D2 — em leitura o campo vira texto que quebra linha**, não input `readOnly` nem tooltip. É mudança
visual deliberada do modo view; o modo edit fica intocado. Escolha entre texto, input `readOnly` e
input `readOnly` + `title` — a terceira foi recusada porque tooltip nativo não aparece no toque, e
duas das três viewports do DoD são de toque (§4).

**D3 — o texto de leitura mora no kit `FormField`/`NestedField`**, não nos wrappers de controle nem
num componente novo com ternário em cada sítio. Escolha entre as três formas: o kit evita colidir
com o `readOnly` nativo do `<input>` e não engorda diálogos que o BD-4 vai ter de emagrecer (§4.2).

**D4 — sem linhas, sem cabeçalho.** O estado vazio/erro cabe na faixa visível porque o `<thead>`
some sob a mesma condição que já zera a largura mínima. Escolha entre esconder o cabeçalho, tirar os
estados de dentro do `DataTable` e só encolher o mínimo da toolbar; a segunda contraria a spec D16
(o `AppDataTable` é o dono do estado de erro) e a terceira não fecha o débito medido (§5).

**D5 — o CTA aparece na toolbar quando há linha e no vazio quando não há**, com a regra na moldura.
Escolha entre esta, "só na toolbar, sempre" e "só no vazio, sempre" — a terceira deixaria a lista
cheia sem como cadastrar (§6).

**D6 — `onRetry` devolve o que o refetch devolve, e o `AppErrorState` aguarda.** Escolha entre a
promise, propagar `isFetching` do consumidor (a letra do Q-14, com prop nova atravessando duas
camadas em ~39 sítios) e estado local por tempo — a terceira foi recusada por mentir quando a rede
demora (§7.1).

**D7 — a cor entra na letra do débito: só os diálogos.** Escolha entre os 9 arquivos de diálogo,
tudo menos Login/Validação, e todos os 59 hits. Consequência assumida na D8.

**D8 — o bloco deixa mecanismo: duas regras de lint, uma delas com catraca.** Escolha entre lint para
cor e leitura, só corrigir, e lint só para a cor. Como a D7 corrige 9 dos 16 arquivos, a regra da cor
**precisa** nascer com `ignores` — lista que só encolhe, no precedente do `max-lines` de 2026-08-03
(§7.3).

## 3. Item 1 — foco e nome do maximizar

### 3.1 A medição que mudou o desenho

O débito descreve o sintoma ("`document.activeElement` passa a `BODY`") e a Saída escrita presume
que o mecanismo não existe. Medido no vendor, ele existe e não dispara:

```
dialog.cjs.js:687   onExited → DomHandler.focus(focusElementOnHide.current)
dialog.cjs.js:791   focusElementOnHide.current = document.activeElement   ← dentro de useUpdateEffect
hooks.cjs.js:1264   useUpdateEffect → PULA a primeira execução
```

Os 9 diálogos do repo montam condicionalmente já com `visible` — `CommercialPage.tsx:55-57`,
`CatalogPage.tsx:30`, `PeoplePage.tsx:79` e `:89`, `AdministracionPage.tsx:53` e `:64`,
`BudgetDetailPage.tsx:126` e `:140`, mais `CommercialPage.tsx:65`. Como o efeito de captura é de
atualização, ele nunca roda no ciclo em que o diálogo nasce: `focusElementOnHide` fica `null`, e
`DomHandler.focus(null)` é no-op. O foco não é perdido — ele nunca foi guardado.

Consequência para o desenho: **escrever a restauração no `AppDialog` não duplica mecanismo do
PrimeReact**, porque o do PrimeReact está inerte nesta forma de montagem.

### 3.2 A restauração

`AppDialog` guarda o disparador num ref e o devolve, cobrindo as duas formas de montagem que o repo
usa (montagem condicional e `visible` alternando em diálogo já montado):

- captura: na montagem e na virada de `visible` de falso para verdadeiro;
- devolução: na desmontagem e na virada de `visible` para falso;
- guarda: só devolve se o elemento capturado ainda está no documento — disparador que saiu do DOM
  (linha de tabela removida pela invalidação) não recebe foco e o navegador fica onde está, sem
  exceção.

O `DomHandler.focus(null)` do PrimeReact continua rodando no `onExited` e continua sendo no-op: as
duas coisas não competem.

### 3.3 O nome do controle de maximizar

`AppDialog` passa `maximizable` e nenhum `pt` para o botão; o PrimeReact emite `<button>` com
`type`, `className` e `onClick` e mais nada (`dialog.cjs.js:874-878`) — sem `aria-label`,
`aria-labelledby` ou `title`, que é exatamente o que o débito mediu.

O rótulo entra por `pt.maximizableButton`, e é **dinâmico**: o `pt` do Dialog recebe `state`
(`dialog.cjs.js:453-455`), então o botão diz "maximizar" quando restaurado e "restaurar" quando
maximizado. Rótulo fixo mentiria em metade dos estados.

Duas chaves i18n novas em `common`, nos três locales, com `es-CL` como referência de rótulo.

## 4. Item 2 — modo leitura

### 4.1 A superfície medida

41 sítios de `disabled={readOnly}` em 10 arquivos de 5 features:

| Onde o campo vive | Sítios | Arquivos |
|---|---|---|
| dentro de `FormField` | 35 | `ClientGeneralFields`, `AddressFields`, `ContactCard`, `BudgetDialog`, `CourseDialog`, `StaffIdentifyFields`, `StaffUserDialog`, `StudentIdentifyFields`, `RedatorIdentityFields` |
| dentro de `NestedField` | 5 | `ModuleCard` |
| solto, sem campo do kit | 1 | `ContactCard:31-34` |

Por controle: 32 `AppInputText`, 3 `AppTextarea`, 2 `AppDropdown`, 1 `AppRadioButton`.

**O sítio solto não entra.** `ContactCard:31-34` é o `AppRadioButton` que marca o contato principal:
não é valor truncado, não há o que copiar, e o estado dele já é legível pela marcação. Segue
`disabled`. É a única exceção declarada do item.

### 4.2 O mecanismo

`FormField` e `NestedField` ganham duas props: `readOnly?: boolean` e `value?: ReactNode`. Em
leitura, renderizam `value` como texto e **não montam** o controle; em edição, o comportamento de
hoje, byte a byte.

O texto quebra linha, seleciona e copia, e usa `var(--text-color)` — leitura não é texto secundário,
e o cinza de desabilitado é parte do que o débito mediu como contraste reduzido.

Quem passa o `value` é a feature, porque o valor de apresentação é de domínio: os dois `AppDropdown`
viram `t('clientType.'+form.type)` e equivalentes, não o código cru. Campo vazio em leitura mostra o
travessão já usado no repo (`—`), não string vazia — campo em branco é ambíguo entre "sem valor" e
"não carregou".

**Custo assumido:** o JSX do controle continua sendo construído pela feature mesmo em leitura (React
não monta o que não é renderizado, mas o elemento é criado). É barato e mantém os 41 sítios com uma
forma só.

## 5. Item 3 — faixa visível

### 5.1 A válvula que já existe e não bastou

`AppDataTable.tsx:83-84` já zera o `min-w-[48rem]` quando não há linhas, desde `127e175`
(2026-07-26) — **antes** da medição de 2026-08-10, que ainda assim encontrou 452px de conteúdo para
276px visíveis em `390x844`. O que sobra é o `<thead>`: seis cabeçalhos com `px-4 py-2.5` têm largura
intrínseca própria e sustentam a tabela mesmo com o corpo ocupado por um único `<td>` de estado
vazio.

Isto é fato medido no código, não hipótese: a spec do bloco anterior tratou o mesmo sintoma pela
largura mínima e o débito reincidiu.

### 5.2 O mecanismo

`pt.thead` recebe `hidden` sob a **mesma condição** do `widthPt` da linha 83 — sem linhas, sem
cabeçalho. Cabeçalho sobre zero linha não informa nada: não há coluna a interpretar. Com dado real,
nada muda.

A mudança é de um lugar só e alcança todas as tabelas do sistema — 14 arquivos de feature consomem
o `AppDataTable` ou a moldura —, incluindo as que não adotaram a moldura.

**O que isto não resolve, declarado:** a toolbar da `SearchableTableFrame` tem dois `min-w-64`
aninhados (`SearchableTableFrame.tsx:103-104`) e continua sendo o que transborda com a lista
**cheia** em `390x844`. Reduzir esse mínimo é mexer no campo de busca de 6 tabelas por medição que
este bloco não fez; fica fora e é nomeado aqui para não virar surpresa no review.

## 6. Item 4 — CTA único

`actions` chega hoje ao `emptyState` **e** à toolbar em seis tabelas, não nas duas que o débito
nomeia: `ClientsTable:41,45`, `CoursesTable:26,29`, `UsersTable:25,28`, `StudentsTable:25,28`,
`RedatoresTable:26,29` e `BudgetsTable:71` (que monta o vazio à mão, fora da moldura).

A regra vai para a `SearchableTableFrame`: `actions` na toolbar **só quando há linha**; sem linha, o
CTA existe só dentro do `AppEmptyState`, que é o convite a cadastrar. As tabelas seguem passando
`actions` uma vez cada e não decidem nada. `BudgetsTable` recebe a mesma regra no mesmo commit, à
mão, porque ainda não adotou a moldura (adoção é BD-4).

A moldura já suprime `actions` da toolbar em erro (`SearchableTableFrame.tsx:115`); a regra nova é a
irmã disso para o vazio, no mesmo lugar.

## 7. Item 5 e item 6

### 7.1 Q-14 — o botão que não diz que está reintentando

`AppErrorState.tsx:36` não recebe estado de refetch nem `disabled`. `onRetry` passa a devolver o que
o refetch devolve; o `AppErrorState` aguarda o retorno e mantém `loading` + `disabled` enquanto está
em voo.

`useCrudPage.refetch` (`useCrudPage.ts:44`) hoje descarta a promise (`() => { void query.refetch() }`)
e passa a devolvê-la — isso cobre de uma vez os 12 sítios que passam `refetch` direto. Os demais
repassam handler de hook (`d.reload`, `s.reload`, `picker.reloadList`), que devolve a própria promise.

**Limitação declarada:** sítio cujo `onRetry` devolva `void` fica sem feedback, em silêncio. O bloco
converte os sítios que alimentam tabela com `error`; sítio novo escrito errado depois não é pego por
nada — não há guarda barata para isto, e inventar uma seria promessa que ela não entrega.

### 7.2 Q-15 — a faixa que conta 0 durante o load

`AppDataTable.tsx:106` liga o paginador junto com `footerCount` mesmo em `loading`, e a faixa afirma
"0 registros" sob a overlay.

Desligar o paginador durante o `loading` foi **recusado**: a faixa some e volta, e o card salta de
altura a cada GET. O que muda é o texto — em `loading`, `paginatorLeft` recebe `common.loading` no
lugar da contagem. A troca é do wrapper; nenhuma tabela muda.

### 7.3 Item 6 — cor e as duas regras de lint

**Corrigidos (D7): 9 arquivos de diálogo, 35 ocorrências** — `ModuleCard` (8), `ModuleFields` (6),
`ImportResultSummary` (4), `RedatorDocumentSlot` (4), `BudgetDialog` (4), `ImportDialog` (3),
`EnrollStudentForm` (2), `RedatorDialog` (2), `RoleDialog` (2). Cada classe de paleta vira variável
do tema (ADR-16), na mesma fórmula já usada em `shared/ui`: `var(--text-color-secondary)` para texto
de apoio, `var(--surface-border)` para borda, e a fórmula de `color-mix` do `AppErrorState` para
vermelho de erro — que é o que mantém contraste nos dois temas, porque os palette vars do Lara não
invertem.

**Duas regras `no-restricted-syntax`** em `src/features/**` (D8):

1. **classe de paleta Tailwind em `className`** — nasce com `ignores` para os 7 arquivos que a D7
   deixa de fora (`LoginForm` 12, `LoginPage` 3, `CourseStep` 3, `QuoteWizard` 2, `ValidationPage` 2,
   `ManualButton` 1, `ClientsTable` 1). Catraca: lista que só encolhe, com o motivo escrito ao lado
   — Login e Validação têm fundo escuro deliberado e mudá-las é desenho novo, não pagamento de
   débito;
2. **`disabled={readOnly}`** — nasce **verde**, com `ignores` vazio, porque o item 2 zera os 41
   sítios antes de a regra existir. Reintrodução é o defeito exato que o débito do piloto mediu.

As duas vivem em bloco próprio no `eslint.config.js`, separado dos `no-restricted-syntax` já
existentes: seletores de `no-restricted-syntax` **não** concatenam entre blocos com o mesmo `files`,
e o último apaga o primeiro inteiro — é o bug do review de 2026-08-04 (Q-2), documentado em
`eslint.config.js:111-116`.

## 8. Prova

O DoD do BD-3 é comportamento na tela: `/lotus-ui-review` em `1440x900`, `1024x768` e `390x844`,
fechando os seis de uma passada. Lint verde não fecha item nenhum.

**Cada correção é vista vermelha antes**, com a sonda no navegador e não em prosa:

| Item | Sonda de vermelho | Verde esperado |
|---|---|---|
| 1 foco | `document.activeElement.tagName` após `Escape` | `BUTTON` do disparador, não `BODY` |
| 1 nome | atributos do primeiro botão do header | `aria-label` presente e coerente com o estado |
| 2 leitura | valor renderizado contra o valor do dado | valor inteiro na tela, selecionável |
| 3 faixa | `scrollWidth` contra `clientWidth` do wrapper em `390x844`, com busca sem resultado | sem rolagem horizontal |
| 4 CTA | contagem de botões de cadastro no DOM com lista vazia | exatamente 1 |
| 5 Q-14 | cliques repetidos no Reintentar | botão desabilitado com spinner enquanto em voo |
| 5 Q-15 | texto da faixa durante o GET | `common.loading`, nunca "0" |
| 6 cor | classes de paleta nos 9 arquivos | zero, e o lint reprovando a reintrodução |

**O que não vai ter prova automatizada, sem maquiagem:** o runner do vitest não cobre componente com
PrimeReact no jsdom (`frontend-fsliced.md`, §Comandos), então foco, `aria-label`, largura, CTA e
feedback de retry **não** ganham teste. O único mecanismo que sobrevive ao bloco é o lint da §7.3, e
ele só vê cor e `disabled={readOnly}` — nada do resto. Um bloco futuro que quebre a restauração de
foco passa em tudo que é automático.

## 9. Risco de review

**MÉDIO.** Nenhum gatilho de ALTO se aplica: sem schema, sem `generated.ts`, sem Sanctum, sem RBAC,
sem dinheiro, sem documento legal; `executor: claude`.

Os riscos próprios são dois, e são de alcance:

1. **`shared/ui` alcança todas as telas de uma vez.** `AppDataTable`, `SearchableTableFrame`,
   `FormField` e `AppDialog` são consumidos por todo o sistema; regressão aqui aparece longe do
   arquivo mudado, e a §8 admite que quase nada disso tem teste.
2. **O modo leitura toca 10 arquivos de 5 features.** É o item de maior superfície e o que mais
   depende de julgamento por sítio (qual texto exibir para dropdown, rádio e campo vazio).

O foco do review é um só: onde a mudança de `shared/ui` alcança tela que este bloco não abriu, e o
que ela faz lá.
