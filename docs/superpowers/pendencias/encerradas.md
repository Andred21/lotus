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
