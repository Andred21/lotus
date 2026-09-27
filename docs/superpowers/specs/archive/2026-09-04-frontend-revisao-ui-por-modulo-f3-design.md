# Design — `frontend-revisao-ui-por-modulo`, fatia 3

**Data:** 2026-09-04 · **Item:** 16 da fila · **Lane:** `lane-c` · **Árvore:** `../fix-frontend`
**Branch:** `refactor/frontend-revisao-ui-f3`, aberta de `origin/main@9c038cca`
**Context Packet:** nenhum — a ficha é `Contexto: não por padrão`; as fontes vivem no repositório
**Executor:** `claude`

> Fecha o item 16. As fatias 1 (2026-08-24, Dashboard `ready-redator` e Operação) e 2 (2026-08-25,
> Comercial e Certificados) já saíram; a narrativa das duas está em `historico/state-archive.md`.
> Esta é a última varredura de UI por módulo — depois dela nada mais sobrevoa estas telas.

## 1. Escopo

Três superfícies, cada uma com uma run de `/lotus-ui-review` e um relatório datado próprio:

| # | Rota | Componente | Régua de aba |
|---|---|---|---|
| 1 | `/cursos` | `CatalogPage` | **não tem** — card único com `CoursesTable` |
| 2 | `/personas` | `PeoplePage` | `ModuleTabs`, 2 abas (Redactores, Alumnos) |
| 3 | `/administracion` | `AdministracionPage` | `ModuleTabs`, 2 abas (Usuarios, Roles) |

Mais duas tasks que não são runs: a **`D-59`** (§6) e a **herança da fatia 1** (§7).

**Ordem interna preservada:** Cursos, Pessoas, Administración **por último**. É a ordem que a ficha
escreveu por causa da colisão com o item 9 (`administracao-roles-permissoes-redesign`), que pode
redesenhar a mesma tela.

**Decisão do João, 2026-09-04, registrada:** a fatia 3 vai **inteira**, com a run de Administración
dentro, aceitando explicitamente que o item 9 possa refazer a tela depois. Oferecido o recorte, foi
recusado.

## 2. Papel — só superadmin (D1)

As três superfícies são de admin. `RolePermissionSeeder::redatorPermissions()` dá exatamente
`operation.turma.view`, `operation.turma.submit_docs` e `operation.enrollment.record_result` — o
redator não alcança nenhuma das três rotas, e **não há run de papel duplo nesta fatia**.

`admin@lotus.cl`, criado pelo `DatabaseSeeder`, recebe `syncRoles(['superadmin'])`. Ele é o papel
das três runs.

**Consequência declarada:** em `/administracion` a aba Roles e os dois botões de criação são gated
por `identity.access.manage`, que o `adminPermissions()` remove — só o superadmin tem. O admin comum
vê a mesma rota com **uma aba só** e sem ação primária. Esse estado **não é testado** nesta fatia, e
entra no relatório da run 3 na lista de estados não testados, ao lado de `loading` e erro de carga.
Motivo: cobri-lo exigiria criar um usuário admin comum antes da run — mutação, fora da janela
read-only da skill —, o superadmin já é o pior caso da régua de abas (2 abas contra 1), e o item 9
pode redesenhar a tela.

## 3. Fence

- **Escrita:** `frontend/src/**` e os artefatos de doc que o plano nomear.
- **Zero `backend/`**, zero `generated.ts`. Achado cuja raiz é do servidor vira ficha, nunca código
  — a árvore é worktree e toque em backend assume main tree (P-03).
- **Fora:** redesenho estético; o programa de acessibilidade, foco e overflow (era o item 8,
  fechado em 2026-08-27); a tela do item 9.
- Quem classifica achado é `references/review-rubric.md` da skill. `frontend-design` é lente
  complementar, e **a rule de `.claude/rules/` vence a lente**.

## 4. Ambiente das runs (D2)

- Árvore `../fix-frontend` em **offset +2**: SPA em `http://localhost:5175`, API em
  `http://localhost:8082`. O preflight da skill confirma `200` nas duas.
- Playwright CLI com **chromium empacotado** (`--browser=chromium`). O canal `chrome` não existe
  nesta máquina — o default do CLI falha com `Chromium distribution 'chrome' is not found`. É
  limitação de ambiente, não da run; nenhuma evidência depende do canal.
- Idioma **es-CL**, a referência de rótulo do cliente chileno, trocado pelo `localStorage`
  (`lotus-lang`) porque o popup do menu de idioma não aparece no snapshot do CLI.
- **Read-only:** nenhuma mutação além do login. `git status --short` vazio antes e depois, mesmo
  branch, mesmo commit.
- **Viewports:** `1440x900`, `1024x768` e `390x844` no tema **claro**, mais **uma** captura por
  superfície no tema **escuro** em `1440x900`.

**Por que o escuro entra amostrado, e não por inteiro (D3).** Dois temas × três viewports × três
telas seriam 18 passadas. A classe de defeito que só o escuro (ou só o claro) expõe é de
**contraste**, e ela não depende da largura: foi assim que o trilho branco-sobre-branco da UI-03 da
run de Operação apareceu, medido em `1440x900`. Uma captura por superfície no tema oposto pega essa
classe a custo de três passadas, não de nove. O que ficar sem medição no escuro entra no relatório
como estado não testado, e não como adequado.

## 5. Réguas de aba — a ficha se contradiz, e a medição decide

A ficha do item 16 diz duas coisas incompatíveis:

- o bullet do **Escopo**, herdado do Q-3 do review de 2026-08-24, afirma que os **quatro**
  `ModuleTabs` (Comercial, Administración, Personas, Certificados) seguem sem medição;
- o parágrafo **Fatias fechadas** registra que as réguas de Comercial e Certificados **foram
  medidas** — `[1134, 1134, false]` em 1440x900 e `[276, 276, false]` em 390x844 — e que por isso
  `scrollable` não foi ligado em nenhuma das duas.

**O parágrafo vence, porque tem número.** Restam **duas** réguas sem medição: Personas e
Administración. E `/cursos` não entra na conta: `CatalogPage` não usa `ModuleTabs` — é um `AppCard`
com `CoursesTable` dentro, sem régua nenhuma.

**Regra da medição:** no selector `.p-tabview-nav-container .p-tabview-nav`, ler
`[scrollWidth, clientWidth]` em `1440x900` e `390x844`. Ligar `scrollable` **somente** onde
`scrollWidth > clientWidth`. Nunca por padrão no wrapper: `p-tabview-scrollable` troca a nav por um
contêiner com `overflow: hidden`, e o efeito disso em tela não medida é suposição — foi exatamente
o que o review da fatia 1 desfez.

**Entregável de doc:** emenda datada na ficha do item 16 do `backlog.md` corrigindo o "quatro" para
o que ficou medido.

## 6. Passe de correção (D4)

Cada run é seguida do seu próprio passe, com o contexto daquela tela carregado — arranjo
intercalado, o mesmo da fatia 2. A run seguinte mede o wrapper já corrigido e acha coisa nova em
vez de repetir a anterior.

**Critério mecânico, no lugar do julgamento por achado:**

| Classe | Onde mora o remédio | Destino |
|---|---|---|
| `C` | qualquer lugar | **corrige aqui**, sempre |
| `B` | `shared/ui` (wrapper) | **corrige aqui** |
| `B` | composição de UMA tela | ficha `D-*` no `backlog.md` |
| `B` | composição de UMA tela, **com a forma já provada num irmão** | corrige aqui |

A linha da forma provada não é exceção improvisada: é o que a fatia 2 fez com o UI-02, quando o
`BudgetStatusFilter` recebeu o par `useId` + `<label htmlFor>` + `inputId` que o `TurmaStatusFilter`
já tinha. A régua "wrapper corrige aqui" também não é preferência — a própria ficha do item 16 mediu
que **6 dos 8** achados da terceira passada no Dashboard moravam em `shared/ui`, e que cada revisão
anterior encontrou defeito de wrapper que nenhuma leitura de código tinha achado.

**Duas obrigações em toda correção:**

1. **Teste visto reprovar antes** (lei §8 do `CLAUDE.md`: DoD é critério de aceite provado).
2. **Correção de wrapper mede o alcance nas outras telas**, não só na que a encontrou — é a
   `frontend-fsliced`, e é o que impede o par UI-02/UI-07 (mesmo defeito, duas runs, dois dias) de
   se repetir.

Um commit por achado, com a medição na tela antes e depois no corpo da mensagem.

## 7. Fichas já abertas que moram nestas telas (D5)

Quatro pendências vivas aparecem nas superfícies desta fatia. Elas **não viram achado novo** — o
relatório de cada run as declara como conhecidas, com o ID, e segue:

| Ficha | Onde aparece | Quem decide |
|---|---|---|
| `P-16` | `/personas` — o Figma põe `Alumnos` como primeira aba; implementado mantém `Redactores` | Lotus |
| `P-10` | `/personas`, aba Alumnos — coluna CLIENTE omitida | Lotus |
| `P-74` | qualquer tela com botão de severidade — reprova AA no claro em 4 das 5 famílias | João |
| `P-44` | `/administracion` — onze usuários de sonda vivem no banco de dev | João |

Reabrir qualquer uma delas como achado seria registrar duas vezes o mesmo defeito, que é o que
produziu a absorção da `D-61` pela `D-67` em 2026-08-31.

## 8. `D-59` — task cirúrgica, não quarta run

A `D-59` não é uma das três superfícies: é conserto conhecido numa tela **já revisada** em
2026-08-25. Em `/comercial/presupuestos/:id`, o card "Cotizaciones" tem
`div.flex.justify-end.px-4.pt-4` (`QuotesList.tsx:45`) com 1134px de largura e 56px de altura para
carregar **um** filho de 228px encostado à direita — 943px de faixa vazia entre o cabeçalho
"Cotizaciones 3" e a primeira cotação. Diferente das listas do índice, este card não tem busca para
ocupar o lado esquerdo da régua.

**Remédio:** subir o alternador Activos/Archivados para o slot `actions` do `AppCardHeader`
(`AppCard.tsx:174`), que já existe.

**Forma da task:** medir a linha nos três viewports **antes**, aplicar, **remedir** nos três. Sem
run completa de UI — a tela já tem relatório datado e o defeito está delimitado a UM card. A ficha
fecha com medição, não com diff.

## 9. Herança da fatia 1 — as duas fichas que a Task 12 nunca escreveu

A ficha do item 16 herda duas pendências que a fatia 1 prometeu registrar e não registrou. As duas
foram remedidas contra o código em 2026-09-04, e **uma delas já não existe**:

**`Turma.php:200` — morta.** A recusa que a UI-04 da run de Operação citou como
`La clase ya fue concluida: el registro académico está bloqueado (RN-15).` em espanhol fixo é hoje
`__('operation.turma.concluded_locked')` — o item 7 (`hardening-i18n-e-erros-api`, 2026-08-30) a
levou para `lang/` nos três locales. **Nenhuma ficha nasce**; sai veredito escrito, porque herança
paga precisa de rastro para ninguém a reabrir na leitura seguinte.

**A janela da agenda — viva, e medida.** `RedatorScopeQuery::resumo()` conta `proximas_turmas` com
`start_date > hoje` **sem teto**; `agenda()` recorta `starting_soon` por `DashboardWindows::turmaHorizon()`,
que são **7 dias**. Turma que começa em 10 dias é contada pelo KPI "Próximas clases" e não aparece em
janela nenhuma da agenda — exatamente o que a UI-04 da run 1 mediu com a turma 6. É defeito de
**backend**, e o fence da §3 proíbe tocá-lo nesta árvore: **vira ficha `D-*`** no `backlog.md`, com
os dois sítios nomeados.

## 10. Definition of done

1. **Três relatórios datados** em `docs/superpowers/audits/`, um por superfície, no molde das runs
   anteriores (`## Run`, `## Coverage`, `## Technical signals`, `## Findings`, `## Summary`).
2. **Zero achado `C` aberto** ao fim do bloco.
3. **As duas réguas medidas com número escrito** (`[scrollWidth, clientWidth]` nos dois viewports),
   `scrollable` ligado **somente** onde transbordou, e a ficha do item 16 emendada com o resultado.
4. **`D-59` fechada** com a medição da linha nos três viewports antes e depois.
5. **Herança resolvida:** uma ficha nova (janela da agenda) e um veredito escrito
   (`Turma.php:200`).
6. **Toda correção com teste visto reprovar antes**, e correção de wrapper com o alcance medido nas
   demais telas.
7. **Gate:** `pnpm lint` **0**, `pnpm build` verde, `pnpm test` verde, e
   `git diff main...HEAD -- backend/ generated.ts` **vazio** — `pint` e `typescript:transform` N/A
   por escopo provado, não por alegação.

## 11. Decisões

- **D1** — papel único **superadmin** nas três runs; o estado admin-comum de `/administracion` fica
  declarado como não testado. Cobri-lo exigiria mutação, o superadmin é o pior caso da régua, e o
  item 9 pode refazer a tela.
- **D2** — chromium empacotado, es-CL pelo `localStorage`, read-only com `git status` vazio nos dois
  momentos. Herdado das fatias 1 e 2 sem mudança.
- **D3** — tema claro nos três viewports; escuro **amostrado** em uma captura por superfície a
  1440x900. A classe que o tema inverte é contraste, e contraste não depende de largura.
- **D4** — critério de `B` **mecânico** (wrapper corrige aqui, composição de tela vira ficha, forma
  provada em irmão corrige aqui), no lugar do julgamento por achado que as fatias anteriores usaram.
- **D5** — `P-16`, `P-10`, `P-74` e `P-44` entram nos relatórios como conhecidas e **não** viram
  achado novo.
- **D6** — arranjo **intercalado**: run, passe, run, passe, run, passe. A vantagem do arranjo oposto
  (ver a classe inteira antes de consertar) já é garantida pela obrigação de medir o alcance da
  correção de wrapper em todas as telas.
- **D7** — a `D-59` é task cirúrgica, não quarta run: a tela já tem relatório datado de 2026-08-25 e
  o defeito está delimitado a um card.

## 12. Fora desta fatia

- Redesenho estético de qualquer das três telas.
- A tela de Administração como objeto de redesenho — é o item 9.
- Acessibilidade, foco e overflow como programa próprio — era o item 8, fechado em 2026-08-27.
- O estado admin-comum de `/administracion` (D1).
- Qualquer linha de `backend/` ou de `generated.ts`.
- As réguas de Comercial e Certificados, já medidas na fatia 2.

## 13. O que esta lane escreve em `docs/superpowers/**`

A invariante do `state.md` diz que **promover, reordenar ou acrescentar item** em `backlog.md` é do
main tree, com o João. Esta fatia **não faz nada disso**: ela escreve ficha `D-*` na seção
*Débitos técnicos* e emenda a ficha do próprio item 16 — que é a fila **do bloco dela**, e o
precedente é medido (a fatia 2 escreveu a `D-59` do worktree; o item 19 escreveu `D-63` a `D-68`).
Nenhum item novo entra na fila, nenhum item é reordenado, e a remoção do item 16 só acontece no
`/fechar-sprint`.

Além disso, a lane escreve: o próprio bloco em `lanes:`, esta spec e o plano dela, os três
relatórios em `audits/`, a linha dela em `historico/progress.md` e a narrativa dela em
`historico/state-archive.md` no fechamento. Nunca o bloco de outra lane.
