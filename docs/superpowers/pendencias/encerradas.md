# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## P-36 — a catraca `COR_HARDCODED` só enxerga `className`

**Bloco:** BD-10 · **Gatilho:** fecha quando um bloco tocar `FormSection` ou `CoursesTable` por
outro motivo e puder absorver os dois sítios junto com a guarda — ou quando a família reincidir uma
terceira vez em código vivo, que é o dado que falta para desenhar o seletor sem falso-positivo (cor
por `style` também é a grafia CERTA quando o valor é `var(--…)`). Revisar em **2026-10-31**.

Cor entrando por `style={{ … }}` ou por template string em `.tsx` passa verde.

O próprio `frontend/src/shared/styles/tokens.ts:11-13` já registrava a lacuna ("uma cor errada
entrando por `style` passava verde"); o bloco `login-fora-do-adr16` (2026-08-13) a mediu com dois
sítios vivos, ambos pintando o celeste como PRIMEIRO PLANO sobre superfície clara a **2,77:1** — que
é exatamente o número que o `--brand-ink` existe para consertar:

- `frontend/src/shared/ui/FormSection/FormSection.tsx:19` — `style={{ color: BRAND_COLOR }}` num
  `<h3>`, texto, reprova o 4,5:1;
- `frontend/src/features/catalog/components/Course/CoursesTable.tsx:43` — mesmo `style` num ícone,
  reprova o 3:1.

O `#1b7fb8` do login era a terceira grafia da mesma família e morreu no próprio bloco.

**Ficaram de fora por decisão do João (D10 da spec), não por esquecimento:** `FormSection` tem **11
consumidores**, quatro deles os diálogos que o BD-5 reescrevia em paralelo naquele dia, então
consertá-lo mudaria cor de título de seção na aplicação inteira dentro de um bloco de login. Guarda
com `ignores` foi recusada no mesmo passo: criaria catraca nova logo depois de o projeto ter zerado
duas, e nasceria verde com a exceção embutida.

**Encerrada em 2026-08-18, no BD-16, pelo gatilho literal.** O bloco tocou `FormSection` pelo DS-01
da auditoria de `/perfil` e absorveu os dois sítios junto com a guarda, como a ficha mandava.
`8ffdefa` tira a tinta de marca do `<h3>` do `FormSection` e do ícone de `CoursesTable`; `efd5bfe`
desenha a régua que faltava — a catraca passa a olhar o **valor**, não a grafia, então cor por
`style` continua sendo a forma certa quando vale `var(--…)` e reprova quando vale um hex de marca.
`BRAND_COLOR` morre no mesmo commit.

**Provado nos dois sentidos, que é o que a ficha pedia.** O título de seção mede **11,4:1** no escuro
sobre card e **10,35:1** no claro (era 2,77:1, régua 4,5:1); o ícone de curso mede **6,21:1** e
**7,58:1** (era 2,53:1, régua 3:1). A medição compõe o alfa da tinta sobre o fundo opaco mais
próximo — ignorá-lo inflava as razões. E a catraca pega: `style={{ color: '#25A5E4' }}` reintroduzido
em `FormSection.tsx` faz o `pnpm lint` reprovar nomeando arquivo, linha e regra; sonda revertida com
a árvore limpa.

**O número de consumidores da ficha estava vencido:** `FormSection` tem **16**, não 11 — os cinco
arquivos de `Profile/` nasceram depois da medição de 2026-08-13. O registro foi corrigido no
`backlog.md` neste fechamento.

## P-37 — `FormField` sem `htmlFor` soma o rótulo do controle no nome acessível

**Bloco:** BD-10 · **Gatilho:** fecha quando um bloco tocar `FormField` por outro motivo e puder
absorver a associação por `htmlFor`/`id` para todos os campos do kit de uma vez. Revisar em
**2026-10-31**.

O `FormField` embrulha o controle num `<label className="block">` sem `htmlFor`, então todo campo
cujo controle carrega rótulo próprio soma os dois no nome acessível. Dois sítios hoje: o olho do
`AppPassword` dentro do `StaffUserDialog` **e** o dropdown de cliente do `BudgetDialog`.

Mesmo defeito que o **UI-01** do login (`/lotus-ui-review` de 2026-08-13), corrigido lá e **não**
aqui. O mecanismo foi medido no login antes do fix: o algoritmo de nome acessível soma todo o
conteúdo textual do `<label>`, então o campo passa a se chamar "Contraseña Mostrar contraseña".
`frontend/src/shared/ui/FormField/FormField.tsx:34-36` renderiza `<label className="block">` com
`<span>` do rótulo mais `children`, sem `htmlFor`/`id`; o call site é
`frontend/src/features/identity/components/Admin/StaffIdentifyFields.tsx:83`. O bloco do login
**piorou a forma, não criou o defeito**: antes da Task 6 o olho já concatenava, com o texto em
inglês do Prime.

**Ficou de fora por decisão do João no fechamento (2026-08-13), no precedente exato da D10/P-36:**
`FormField` é `shared/ui` e o kit inteiro passa por ele, então dar `htmlFor`/`id` ali muda a
marcação de todo diálogo do sistema — e o arquivo estava sob reescrita ativa do BD-5
(`usecrudform-mais-fundo`, worktree `fix-frontend`), o mesmo motivo que tirou `FormSection` do
escopo. Não é bug de dado: o campo tem nome utilizável e recebe foco; o que degrada é o anúncio em
leitor de tela.

**Copiar o molde inteiro, não só o `htmlFor`.** O molde existe e está medido:
`frontend/src/features/identity/components/Login/LoginForm.tsx:40-85` (commits `5e005f1` e
`1952075`). O `<label>` que embrulha é o que faz o `error` do kit ser anunciado hoje, então trocar
por `htmlFor`/`id` obriga a levar junto o `aria-describedby` condicional e o `aria-invalid` do par —
o PrimeReact não escreve `aria-invalid`, o `invalid` dele só pinta `.p-invalid` (Q-2 do review de
sprint de 2026-08-13, medido contra um 422 real).

**Segundo sítio registrado no review do BD-6 (2026-08-14):**
`frontend/src/features/commercial/components/Budget/BudgetDialog.tsx:54-59` passa pelo mesmo
`FormField`, então o dropdown de cliente herda a mesma concatenação. Não muda o diagnóstico nem a
data — muda o tamanho do que o fix único em `shared/ui` resolve de uma vez.

**Encerrada em 2026-08-18, no BD-16, pelo gatilho literal.** O bloco tocou `FormField` pela D-24 e
absorveu a associação para o kit inteiro de uma vez. `0672019` faz a label virar **irmã** do
controle, com `htmlFor`/`id`, e leva junto o `aria-describedby` condicional e o `aria-invalid` que
o molde do `LoginForm` exigia — não só o `htmlFor`, como a ficha alertava. `2ad35d7` põe os cinco
wrappers para se associarem sozinhos, para o call site não precisar lembrar.

**Medido no navegador, não conferido no DOM**, que é o que a ficha pedia: nos cinco wrappers o nome
acessível é **só o rótulo**; sob um 422 real o `aria-invalid="true"` e o `aria-describedby` pousam no
**input** e não na casca — inclusive no `AppDatePicker`, onde prop desconhecida cai no `<span>` raiz
e o caminho certo é o `pt.input.root`; e clicar no texto do rótulo põe o foco no controle.

Os dois sítios da ficha (`StaffIdentifyFields.tsx` e `BudgetDialog.tsx`) saem pelo fix único em
`shared/ui`, sem passe por call site. Onde o rótulo **deliberadamente** não tem `htmlFor` é o modo
leitura, para "Carga horaria (del curso, solo lectura)" não apontar para o vazio.

## P-38 — a rule afirma que teste PrimeReact/jsdom está fora do corte, e o corte já tem três

**Bloco:** BD-12 · **Gatilho:** fecha no próximo bloco que tocar `frontend-fsliced.md` por qualquer
motivo, trocando a frase pelo corte medido (rodar o runner e contar, não citar de memória — é a
catraca do parágrafo "mede a própria população com o seletor dela"). Enquanto não fechar, **a rule
vale pelo que o `pnpm test` faz, não pelo que ela diz**.

Divergência medida no review de sprint do BD-6 (2026-08-14). O próprio bloco criou
`frontend/src/shared/ui/InlineLoadState/InlineLoadState.test.tsx`,
`frontend/src/features/commercial/components/Budget/CourseStep.test.tsx` e
`frontend/src/features/commercial/components/Budget/QuotesList.test.tsx` — os três renderizam
componente que monta wrapper PrimeReact no jsdom, e os três passam. A §10 da spec
`docs/superpowers/specs/archive/2026-08-14-falha-vs-lista-vazia-design.md` repete a mesma frase,
herdada da rule.

É a **lição 13 no mesmo arquivo pela terceira vez**: a rule já afirmou "sem test runner ainda" um
bloco inteiro depois de o runner existir, e depois afirmou por quatro dias que o corte era só
`shared/`. Não é bug de código: o corte real é maior que o documentado, então o texto **subestima**
a cobertura — quem lê a rule pode deixar de escrever um teste que o projeto já sabe rodar.

**Encerrada em 2026-08-16, no bloco `meu-perfil-frontend`, pelo gatilho literal.** O bloco tocou
`.claude/rules/frontend-fsliced.md` por outro motivo (a linha de derivação de status documental, que
o contrato de perfil tinha tornado meia-verdade) e absorveu esta junto, como a ficha mandava. A frase
foi trocada pelo **corte medido com o runner**, não citado: 13 arquivos renderizam componente, **9
montam wrapper PrimeReact** (`ValidationPage`, `BudgetDetailPage`, `CourseStep`, `QuotesList`,
`TurmaDetailPage`, `ProfileDocumentSlot`, `DetailHeader`, `IdentityCell`, `InlineLoadState`) e 4 são
DOM puro (`AppFileRow`, `PageHeader`, `FormField`, `Clock`). A spec arquivada
`2026-08-14-falha-vs-lista-vazia-design.md` §10 continua repetindo a frase vencida **de propósito**:
spec arquivada é snapshot datado, não doc normativo — quem manda é a rule.

## P-34 — a catraca `COR_HARDCODED` não roda em `src/app/**`

**Encerrada em 2026-08-16**, no `/fechar-sprint` do `dashboard-frontend-central-controle`. Sai daqui
no fechamento seguinte, cumprida a sprint de rastro.

Era a última camada do frontend sem a guarda de cor, com 3 classes `text-slate-*` vivas no
`Sidebar/`. O gatilho escrito era "um bloco que tocar o shell por outro motivo e puder converter as
3 classes junto com a entrada da regra" — e foi exatamente o que aconteceu: a **D11** da spec do B1
ampliou o bloco de propósito, porque o Dashboard escrevia 8 arquivos novos em `src/app/`, que
nasceriam sem guarda numa camada inteira sem guarda nenhuma.

**A população foi medida com o próprio seletor, não com o grep que originou o débito** (a regra do
`frontend-fsliced.md`): `npx eslint 'src/app/**/*.tsx' --rule '{…COR_HARDCODED…}'` acusava
exatamente 3 — `Sidebar.tsx:60`, `Sidebar.tsx:71`, `SidebarItem.tsx:24` — e passou a acusar 0. A
conversão **não** pôde usar `--text-color`: a sidebar é navy fixa nos dois temas, e a tinta do tema
claro seria texto escuro sobre navy; entraram `--shell-ink` e `--shell-ink-muted` em
`brand-theme.css` com os valores literais que o Tailwind já rendia, para a entrada da catraca não
mexer um pixel.

**A regra nasceu sem bloco `ignores`**, que era o DoD do BD-11, e em bloco `files` próprio — sem o
merge raso do Q-2 (2026-08-04), porque nenhum outro bloco do `eslint.config.js` casa
`no-restricted-syntax` em `src/app/**`. Só `COR_HARDCODED` entrou: `DISABLED_READONLY` é sobre campo
de formulário e o shell não tem nenhum, e os bans de query não cabem numa camada onde a composição
cruzada é legítima.

**Provada nos dois sentidos no gate de fechamento**, não deduzida: `pnpm lint` exit 0 no HEAD; com
`text-slate-400` injetado em `PipelineFunnel.tsx`, o lint reprova nomeando arquivo e linha
(`17:23`). Sonda revertida, árvore limpa.

**Consequência no backlog:** o **BD-11** fica só com a **D-03** (menu recolhido a 390 tira o rótulo
do DOM e deixa só `title`).
