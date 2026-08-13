---
schema_version: 1
active_feature: null
active_work_item: login-fora-do-adr16
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-08-13-login-fora-do-adr16-design.md
active_plan: docs/superpowers/plans/2026-08-13-login-fora-do-adr16.md
context_packet: null
blocker: null
last_completed_work_item: catraca-max-lines-e-moldura
state_basis_commit: d0cc270
updated_at: 2026-08-13T13:05:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.

## Estados válidos

| Estado | Próxima ação permitida |
|---|---|
| `idle` | escolher explicitamente um item do `backlog.md` |
| `context_required` | gerar/atualizar Context Packet com `lotus-context-packet` |
| `ready_for_planning` | executar `/planejar-bloco` para `active_work_item` |
| `planning` | continuar brainstorming/spec/plano; não implementar |
| `ready_for_execution` | executar `/executar-bloco` para `active_work_item` |
| `executing` | retomar a task pendente do plano; não replanejar |
| `ready_for_review` | solicitar code review do bloco |
| `reviewing` | tratar somente achados aprovados e repetir o review |
| `ready_for_closure` | executar `/fechar-sprint` |
| `blocked` | resolver `blocker`; depois retornar a `resume_state` |

## Invariantes

- Existe no máximo um `active_work_item`.
- `next_action` deve corresponder a `workflow_state`.
- `active_plan` é obrigatório a partir de `ready_for_execution`.
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística.
- O backlog nunca promove trabalho automaticamente.

## Item ativo — 2026-08-13 (`login-fora-do-adr16`, item 4 de "Próximos blocos")

### Exceção declarada à invariante de um `active_work_item`

**Existem dois itens ativos ao mesmo tempo, por decisão explícita do João em 2026-08-13**, e isto
está escrito porque a invariante do topo deste arquivo diz o contrário. O `/planejar-bloco` do Login
abriu com o estado `idle` no main tree **e** com o `usecrudform-mais-fundo` (BD-5) já em
`ready_for_planning` na worktree `fix-frontend`, promovido por `5bf54f3` às 12:32 — dois `state.md`
divergentes no mesmo repositório. Não foi resolvido por heurística: a divergência foi mostrada e ele
escolheu **paralelo**, precedente do BD-4 × BD-9 (2026-08-13).

**A diferença para aquele precedente é que aqui a sobreposição não é zero, e foi medida antes de
decidir**, não depois:

1. `FormErrorBanner` — o BD-5 o reescreve (`shared/ui/FormField/FormField.tsx:119`, falha
   bufferizada) e `LoginForm.tsx:32` é call site (`variant="inline"`), num arquivo que este bloco
   reescreve inteiro.
2. `AppPassword.tsx:47` — a troca de `w-96` por `w-full` (decisão 6 do item) muda a largura
   renderizada dentro de `StaffIdentifyFields`, consumido só por `StaffUserDialog`, que é um dos
   quatro diálogos do trio da foto do BD-5. Interferência de comportamento, não de texto.
3. `shared/config/locales/{es-CL,pt-BR,en}.json` — os dois blocos escrevem nos três arquivos.

**Árvores trocadas em relação ao que o `5bf54f3` escreveu, também por decisão dele:** o Login fica no
**main tree** `/home/jvbat/projetos/lotus`, branch `feat/login-fora-do-adr16` criada de `d0cc270`; o
BD-5 fica na worktree `fix-frontend`, onde a branch dele já estava checada. O texto do `5bf54f3`
("main tree, porque o DoD é foto real no S3") descreve uma decisão que este gate substituiu; ele vive
na branch do BD-5 e não foi editado daqui — corrigi-lo é trabalho daquele bloco, não deste.

### Seleção — 2026-08-13

**Item 4 de "Próximos blocos" (`backlog.md:33`), promovido explicitamente pelo João.** O gate do
`/planejar-bloco` reprovou pelo motivo de sempre (BD-1, BD-2, BD-7, BD-8, BD-9, BD-5): o argumento
era **título de seção**, não slug promovido. As três decisões dele fecharam o gate: o slug
`login-fora-do-adr16`; **rota direta a `ready_for_planning` sem Context Packet**; e o main tree.

**A ausência de fonte externa foi medida, não presumida.** Grep por `drive.google`, `notion.so`,
`figma.com` e `docs.google` no `backlog.md` devolve **zero ocorrência**; a única referência externa
do item é o artifact `claude.ai` da análise "Placa de acesso" rev. 2 — saída de agente, não fonte de
regra de negócio —, e as oito decisões, a tabela de escala, a tabela de copy, o degradê sem hex novo
e o destino um a um dos 2 C + 8 B estão **transcritos** em `backlog.md:62-189`. A evidência do
`/lotus-ui-review` de 2026-08-12 **existe no disco**:
`.artifacts/ui-review/2026-08-12T14-38-43-loginpage-wrappers/` com `report.txt` (154 linhas), 6 PNGs
e 4 snapshots YAML. Diretório gitignored, portanto volátil — o registro durável é o texto do backlog.

**A direção decidida entra neste commit.** As 134 linhas do item 4 estavam **não commitadas** no
working tree do main tree quando o comando abriu: decisão durável vivendo onde um `git checkout` a
apagaria. Entram aqui como artefato do mesmo commit da promoção.

### Brainstorming e spec — 2026-08-13

Spec em `docs/superpowers/specs/2026-08-13-login-fora-do-adr16-design.md`. As **D1–D8** vêm fechadas
da direção que o João decidiu sobre a análise rev. 2 e **não foram reabertas**; as **D9–D12** são
desta sessão, cada uma escolhida por ele entre alternativas com o custo medido.

**A medição achou três coisas que o backlog não tinha, e uma delas muda o que o bloco é:**

1. **O login é 2 das 7 entradas da `CATRACA_COR`, e o comentário da lista aponta para este bloco** —
   *"lista que só ENCOLHE. Login e Validação têm fundo escuro deliberado — mudá-las é desenho novo,
   não pagamento de débito (D7)"* (`eslint.config.js:141-151`). Este bloco **é** o desenho novo.
   **D9:** os dois arquivos saem, a lista vai a **5**, e a prova é nos dois sentidos (lição 10) —
   sem as linhas o lint fica verde; com um `text-slate-800` reintroduzido no `LoginForm` ele reprova
   nomeando o arquivo. Numa tela sem teste de componente, é o único mecanismo disponível.
2. **O degradê decidido é fixo nos dois temas por medição:** a escala `--primary-*` é idêntica byte a
   byte nas duas folhas geradas (`--primary-900:#0c3549`). Os contrastes da tabela do backlog foram
   **recalculados** — tagline **9,846:1** — e batem; a divisa invisível do tema escuro também
   (`#0f2b3d` contra `#1e293b` = **1,0016:1**).
3. **A guarda de cor não enxerga o defeito que o bloco mata, e o repositório já escrevera isso**
   (`tokens.ts:11-13`). Dois sítios vivos com a forma exata, ambos a **2,77:1**:
   `FormSection.tsx:19` e `CoursesTable.tsx:43`. **D10:** ficam fora — `FormSection` tem 11
   consumidores, quatro deles os diálogos que o BD-5 reescreve agora, e a lacuna vira linha nova em
   `docs/pendencias.md` em vez de alargar um bloco de login.

**D11** mantém a label própria dos campos (o kit `FormField` pinta label em 14px secundário e
contrariaria a linha "rótulos inalterados" da escala decidida); o erro de campo passa a `dangerText`,
a fórmula de um dono só. **D12** torna a checagem visual pelo navegador **passo de gate bloqueante** —
o bloco é 100% aparência, e é a dívida que o BD-4 declarou e pagou só pela metade.

**Uma pergunta que a spec não adiou para o plano:** o número de chaves do nome acessível do olho da
senha foi medido na API instalada — `password.cjs.js:605,614` tem `passwordShow` **e**
`passwordHide`, dois estados. A via é o `pt` do wrapper e não a locale global do Prime, porque
`locale('es')` nunca é chamado no projeto (`primeLocale.ts` só faz `addLocale`), então um rótulo
pendurado lá ficaria congelado na troca de idioma.

**Baseline medido nesta branch, não herdado:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
**29 arquivos / 143 testes** — bate com o placar do merge pós-BD-4, confirmando que a branch nasce da
`main` sem deriva.

**Risco de review declarado BAIXO** pelo gate binário da skill (zero schema, `generated.ts`, Sanctum,
auditoria, RBAC, dinheiro ou documento legal; `executor: claude`) — a tela é a porta do Sanctum mas o
bloco não toca autenticação, e `useLoginForm` fica intocado. O risco próprio, escrito na §9 da spec,
é de alcance: `AppPassword` chega a um call site fora do login e a saída da catraca é permanente.

O estado entrou em `planning` no commit da spec; `active_plan` seguiu `null` até o João ler a spec
escrita e autorizar o `writing-plans`.

### Plano — 2026-08-13

**O João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/2026-08-13-login-fora-do-adr16.md`: **dez tasks**, uma por commit, na ordem
degradê → painel de marca → superfícies → tipografia → copy → par credencial → layout mobile →
catraca → pendência → gate.

**A ordem não é a do relatório de review, e o motivo é de dependência:** a Task 8 (catraca) só pode
rodar depois das Tasks 3, 4 e 5, porque são elas que tiram a última utility de cor dos dois arquivos
— tentar encolher a lista antes faz o lint reprovar o próprio bloco. E o degradê vem primeiro para
que as tasks seguintes já meçam contraste contra o fundo definitivo, não contra o celeste.

**Três coisas apareceram só ao escrever o plano, e as três mudam trabalho:**

1. **A divisa do tema escuro precisa de duas larguras, não de uma.** No telefone os painéis empilham,
   então o traço é `dark:border-t`; a partir de `md` eles ficam lado a lado e o traço é
   `md:dark:border-l`. Uma borda só resolveria metade das viewports. A cor vai por
   `style={{ borderColor: 'var(--surface-border)' }}` e fica inerte no claro, onde nenhuma largura é
   declarada — é assim que "só no escuro" vira mecanismo em vez de condicional em JS.
2. **`autoComplete` é repassado ao input pelo Prime, e isso foi verificado na fonte instalada**
   (`password.cjs.js:713`: `autoComplete: props.autoComplete` no `inputTextProps`). Sem essa
   verificação a Task 6 poderia precisar de `inputProps`, que o wrapper não expõe.
3. **A sonda da catraca precisa de guarda contra si mesma.** O passo reintroduz `text-slate-800` por
   `sed`; um `sed` que não casa deixaria a sonda passar **verde** e provaria o contrário do que se
   quer. Por isso o passo grepa a string antes de rodar o lint: sem o grep, "não reprovou" seria
   ambíguo entre "a régua morreu" e "a sonda não foi plantada".

**Baseline medido antes de escrever, não herdado:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **29 arquivos / 143 testes**. Projeção do plano: **inalterado em 29/143** — nenhuma task
escreve teste, porque a superfície inteira está fora do corte do runner, e prometer o contrário seria
cobertura fantasma.

`executor: claude`, sem `paths_autorizados`: o bloco decide apresentação com julgamento de contraste
em vários sítios, atravessa a lei §5.6, mexe no `eslint.config.js` — onde bloco no lugar errado apaga
seletor existente em silêncio (Q-2 de 2026-08-04, reincidente no BD-3) — e a Task 8 remove uma
exceção de lint de forma permanente.

**Um conflito conhecido fica declarado antes de acontecer:** o cabeçalho do plano pede
`subagent-driven-development`, e esta sessão tem regra de não chamar o Agent tool sem pedido — o
mesmo impasse do `rastro-unicidade-e-gates` e do BD-4. Resolve-se no `/executar-bloco`, por pergunta
direta ao João, não aqui.

**Estado: `ready_for_execution`.** `/executar-bloco login-fora-do-adr16` exige instrução posterior do
João.

**Superfície medida do bloco (fato, não desenho):** `LoginPage.tsx`, `LoginForm.tsx`,
`shared/ui/AppPassword/AppPassword.tsx`, `shared/ui/AppLogo/AppLogo.tsx`,
`shared/styles/brand-theme.css` e os três locales. `AppPassword` tem **2 call sites** — `LoginForm` e
`StaffIdentifyFields` —, exatamente o alcance que o backlog escreveu. **Frontend puro: a P-03 não
dispara**, e o backend que serve o `:8080` é o desta branch, que não toca `backend/`.

## Último item fechado — 2026-08-13 (`catraca-max-lines-e-moldura`, BD-4)

### Seleção — 2026-08-13

**BD-4 do `backlog.md:127`, promovido explicitamente pelo João** com o estado em `idle` e
`active_work_item` `null`. O gate do `/planejar-bloco` não promove; as três decisões dele fecharam o
gate: o slug `catraca-max-lines-e-moldura` (mesmo da branch já criada), **rota direta a
`ready_for_planning` sem Context Packet** por ausência medida de fonte externa, e a worktree
`/home/jvbat/projetos/fix-frontend` seguindo — bloco **frontend puro**, a P-03 não dispara.

A branch `feat/catraca-max-lines-e-moldura` já existia em `0c2a24b`, **com zero commit sobre a
`main`** e árvore limpa; isso não era divergência de estado, e `0c2a24b` passa a ser o
`state_basis_commit`.

### O terreno foi medido antes de desenhar, e achou cinco divergências

Medição de 2026-08-13 sobre `0c2a24b`, por workflow de 9 agentes lançado antes do `/clear`.
**Três dos quatro números da catraca estavam vencidos** — `StudentDialog` 281 (o backlog diz 283),
`RedatorDialog` 206 (diz 199), `BudgetDetailPage` 187 (diz 171); só `RedatorDocumentSlot` (175)
bate. Déficit real: **249 linhas a extrair**.

**A premissa do bloco é falsa:** ele não existe por causa do modo leitura do BD-3 — o BD-3 tocou o
`StudentDialog` num único commit (`dfc3f4b`) com saldo **−2 linhas**, e os dois blocos grandes vêm de
`501b731` (2026-08-05). **A justificativa da ordem também:** a adoção da moldura não tira linha de
diálogo nenhum, e as duas tabelas não estão na catraca.

**O DoD escrito não era provável:** não existe regra de validação de `phone` em nenhum DTO de
`Identity` (zero `Max(` na pasta; coluna `varchar(30)` sem unique; nenhum teste assere 422 em phone).

**Os dois diálogos do item (c) não são o mesmo caso:** `useStudentForm` roda sobre `useCrudForm` e já
entrega `errorSummary` pronto; `useRedatorForm` não usa `useCrudForm` e não tem o que espalhar.

E o ponteiro `FormErrorSummary.tsx:62-67`, citado 4× em doc normativo, **apontava para arquivo que não
existia** — o componente é export nomeado em `FormField.tsx`, e as linhas 62-67 de lá são do
`NestedField`, não do `FormErrorSummary` (que vive em `FormField.tsx:79-107`). Corrigido na Task 9
do BD-4 (2026-08-13): as citações vivas passaram a apontar para o destino real.

### Brainstorming e spec — 2026-08-13

Nove decisões do João (D1–D9), registradas na spec
`docs/superpowers/specs/archive/2026-08-13-catraca-max-lines-e-moldura-design.md`. As que mudam trabalho:
o 422 de `phone` provado por **request forjado** (backend intocado); o resumo do redator com `mapped`
**literal**, sem migrar o hook (o BD-5 já o excluiu por critério); o campo de cliente do
`StudentDialog` **colapsado** no molde do `BudgetDialog`, pagando a quarta grafia do débito BD-3 §4;
`useStudentDetail` **ficando no pai** para preservar a rede; **dois** arquivos novos no par do
redator; UI-01, os dois `<p>` e o `sp` morto **entrando**; overlays em vez dos ramos de estado no
`BudgetDetailPage`; o critério de CTA da moldura **vencendo** na `BudgetsTable`; e a rule reescrita
no mesmo commit que esvazia o `ignores`. Ordem escolhida: **catraca primeiro, moldura por último**.

**Uma conta apresentada no brainstorming estava errada e foi corrigida antes da spec:** o colapso do
campo de cliente não corta ~46 linhas, corta ~9 — `FormField` em modo leitura troca os **filhos
inteiros** (`readOnly ? <ReadOnlyValue/> : children`), então as 28 linhas de dica são create-only e
ficam, e o aviso `clientLocked` do modo edit **sumiria** se não saísse para fora do campo. Com a
conta certa, o corte do bloco de view sozinho deixaria o arquivo em 156 — acima da régua —, e por
isso o desenho extrai **dois** blocos do `StudentDialog` e **duas** seções do `RedatorDialog`.

**Risco de review declarado MÉDIO** na spec (§9), contra o BAIXO do gate binário da skill —
divergência declarada, sem conflito. O risco próprio é de alcance (`shared/ui` alcança 4 consumidores
fora do bloco; a moldura passa a servir 8 tabelas) e de margem (`BudgetDetailPage` pousa com folga
de ~5 linhas).

O estado entra em `planning` no mesmo commit da spec; `active_plan` segue `null` até o João ler a
spec escrita e autorizar o `writing-plans`.

### Plano — 2026-08-13

**João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/archive/2026-08-13-catraca-max-lines-e-moldura.md`: **dez tasks**, uma por commit, na
ordem testes do resumo → `StudentDialog` → slot → `RedatorDialog` → `BudgetDetailPage` (que **zera o
`ignores`** e reescreve a rule) → UI-01 → `BudgetsTable` → `TurmasTable` → docs → gate.

**Baseline medido, não herdado:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` = **28
arquivos / 138 testes** — o número registrado neste arquivo até agora (27/131) estava vencido.
Projeção do plano: **29 arquivos / 142 testes** (3 casos do `FormErrorSummary`, 1 arquivo e 1 caso do
`AppFileRow`).

**Três coisas apareceram só ao escrever o plano, e duas mudam trabalho:**

1. **O `BudgetDetailPage` fica mais barato do que a spec projetou.** Os quatro overlays consomem o
   objeto `d` (`useBudgetDetail`) **inteiro**, que a página já tem, então a chamada de volta é de uma
   linha e `formatUf`/`AppCardTone` também ficam órfãos: **~136**, não ~145. A contingência da spec
   (extrair a prop `actions` do `DetailHeader`) vira reserva.
2. **O rótulo do modo leitura do campo de cliente precisa vir do pai.** Hoje o texto é
   `student?.current_client_name ?? t("student.noClient")` — se o filho derivasse o rótulo do
   `options`, view/edit cairia no travessão do `ReadOnlyValue`, que é o default certo para vazio e
   **não** é o texto atual. O filho recebe `readOnlyLabel` pronto e não conhece `StudentData`.
3. **Os testes novos do `FormErrorSummary` nascem verdes**, porque afirmam comportamento que já
   existe — então a Task 1 tem passo de sonda: com o filtro de `mapped` desligado à mão, o caso "não
   repete a chave que já aparece no campo" tem de reprovar, e a árvore volta limpa em seguida.

`executor: claude`, sem `paths_autorizados`: o bloco decide apresentação em vários sítios, atravessa
a lei §5.6 e mexe no `eslint.config.js`, onde bloco no lugar errado apaga seletor existente em
silêncio (Q-2 de 2026-08-04, reincidente no BD-3); a Task 5 ainda reescreve rule normativa.

**Estado: `ready_for_execution`.** `/executar-bloco catraca-max-lines-e-moldura` exige instrução
posterior do João.

### Execução — 2026-08-13: início

`/executar-bloco catraca-max-lines-e-moldura` validou as âncoras (spec, plano, `context_packet`
`null` coerente, Git limpo em `671bc94`, sem divergência) e abriu o gate main tree/worktree: bloco
frontend puro, `using-git-worktrees` normal — a worktree `/home/jvbat/projetos/fix-frontend` na
branch `feat/catraca-max-lines-e-moldura` já era o isolamento certo, sem criar nova.

**Mesmo conflito do `rastro-unicidade-e-gates` reapareceu, e foi resolvido do mesmo jeito:** o
plano recomenda `subagent-driven-development`; a sessão tem regra de não chamar o Agent tool sem
pedido. Escalado ao João via pergunta direta — **subagent-driven-development**, com Agent tool
autorizado para este bloco. Pre-flight scan do plano (10 tasks contra os Global Constraints e a
spec): limpo, sem conflito novo — as dívidas aceitas (D2 sem guarda, D4 requisição ociosa, D8
exceção de CTA) já são decisão declarada do João em §8 da spec, não achado a escalar aqui.

Ledger local reiniciado em `.superpowers/sdd/progress.md` (o anterior era do `BD-3`, já fechado).

**Estado:** `executing`.

### Execução — 2026-08-13: fechamento

10 tasks do plano completas via SDD, cada uma com revisor de task independente. Dois loops de fix
durante a execução: Task 2 (`StudentClientField` devolvia `Fragment` quando devia devolver `<div>`
— o `<p>` do aviso `clientLocked` não era irmão direto da section no original, achado escalado ao
João, ele escolheu `<div>`); Task 9 (número esquecido em `backlog.md:143`). A catraca `max-lines`
fechou de fato — array `ignores` do bloco removido inteiro em `eslint.config.js` (Task 5), regra
vale sem exceção, `.claude/rules/frontend-fsliced.md:106` reescrito. `BudgetsTable`/`TurmasTable`
migraram para `SearchableTableFrame` (D8: CTA muda comportamento só no caso lista-vazia-com-termo,
verificado por álgebra exaustiva no review final). UI-01 corrigido (`AppFileRow` ganha `title`).

**Gate da Task 10 — Steps 1-4 provados** (lint/build/test verdes, 29 arquivos/142 testes, os 6
arquivos-alvo abaixo de 150, sem sonda/vazamento de camada/órfão). **Steps 5 e 6 (e2e do 422 de
`phone` contra API real, checagem visual `/lotus-ui-review`) NÃO executados** — bloqueio de
ambiente: nem o main tree (branch WIP alheia, 500 em `/api/students`) nem uma stack própria da
worktree (comando `docker compose up` bloqueado pelo classifier de auto mode) ficaram disponíveis.
Escalado ao João duas vezes; ele escolheu prosseguir sem essas duas provas. Débito explícito, não
maquiado — ver `.superpowers/sdd/task-10-report.md` Step 7.

**Review final de branch inteira** (opus, intervalo `0c2a24b..96d36ba`, depois `..d50d7f8`):
veredito inicial "Ready to merge: With fixes" — 3 achados Important, todos verificados
pessoalmente antes de agir: `SearchableTableFrame.tsx` sem `flex-wrap` (regressão de layout em
telas estreitas nas duas tabelas migradas, achado real de CSS, não hipótese) e duas entradas do
próprio `state.md` (aqui perto, §"Brainstorming e spec — 2026-08-13") que a Task 9 corrompeu com
um find-replace cego — achado histórico do ponteiro fantasma virou afirmação invertida, e a
descrição de uma spec ARQUIVADA (protegida por D9) passou a mentir sobre o que ela cita. Um fix
subagent corrigiu os dois (commits `eb9bc47`, `d50d7f8`); re-review confirmou ambos resolvidos na
raiz. **Veredito final: "Ready to merge: Yes."** Achados Minor (margem fina em dois arquivos
novos, nome `SlotBody.tsx` foge da convenção `Redator*`, D6 muda espaçamento do banner em ~16px,
`backlog.md:137` com racional que a spec provou falso, D8 sem guarda automatizada) ficam
registrados no ledger local, não bloqueiam.

**Estado:** `ready_for_review`. Próxima instrução aciona a revisão do trabalho ativo — este
comando não a inicia sozinho.

### Review de sprint — 2026-08-13: BAIXO risco, uma lente, 4 achados

**BAIXO pelo gate binário da skill:** zero schema, `generated.ts`, Sanctum, auditoria, RBAC,
dinheiro escrito ou documento legal gerado; `executor: claude`. A spec §9 declara MÉDIO por alcance
e margem — divergência declarada, sem conflito, como no BD-3. **Só lente Claude, sem Codex.**

**Gate reproduzido, não herdado do relatório de execução:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **29 arquivos / 142 testes** (a projeção do plano, exata); os **13** arquivos do bloco
abaixo de 150, o maior sendo `SlotBody` em 144; `ignores` do `max-lines` inexistente (só o
`globalIgnores` do topo e o `CATRACA_COR`, que é outra regra); zero `className="sp"`; zero
`primereact` em `features/`; `BudgetDetailPage.test.tsx` com **diff vazio**.

**A catraca foi provada nos dois sentidos (lição 10), não por lint verde:** 25 linhas em branco
apensadas ao `StudentDialog` — o ex-ignorado — fazem o lint reprovar com
`File has too many lines (153). Maximum allowed is 150`, e a árvore volta limpa em seguida. Verde
sozinho não distinguiria "a régua vale" de "a regra parou de casar o glob".

**Órfãos: zero.** Os 7 componentes novos têm exatamente um consumidor cada, conferido por grep.

**As extrações foram conferidas linha a linha, não presumidas:** `StudentDetailSections` bate byte a
byte com `StudentDialog.tsx:172-278` do `0c2a24b`, com uma única divergência — o `sp` → `space-y-2`
da D6; `BudgetOverlays` e `BudgetStatCard` idênticos ao original; `SlotBody` preserva as duas
assimetrias medidas. **E a conferência que o `backlog.md:409-411` pedia foi feita:** todo campo em
`mapped` passa `error=` ao `FormField` nos dois diálogos, e `phone` não passa em nenhum — o resumo
não duplica erro de campo visível.

**A D8 foi confirmada por álgebra sobre o hook, não por leitura do JSX:** `useTableFilter.ts:98` é
`term !== '' || scoped.length !== items.length`, então lista crua vazia **com** termo digitado dá
`filtering: true` e o CTA aparece, onde o critério antigo (`budgets.length === 0`) o escondia. É o
único caso que diverge.

**Os quatro achados:**

1. **Q-1 🟡 P** — `RedatorDocumentsSection.tsx:37,69-70`: `removeDoc.error` **nunca é lido**. Um
   DELETE de documento do redator que falha deixa a linha na tela e não diz nada — vazio silencioso
   (D16) sobre dado que alimenta a idoneidade. O irmão `commercial` já resolve os dois no mesmo
   banner (`useBudgetDetail.ts:47`: `useMutationErrors([uploadFile.error, removeFile.error])`). O
   bloco reescreveu exatamente as duas linhas vizinhas (D6, `<p>` → banner) e passou ao lado da
   terceira. Não registrado em `backlog.md` nem em `pendencias.md`.
2. **Q-2 🟡 M** — o contrato "quem passa `filterSlot` passa um `clear` COMPOSTO"
   (`SearchableTableFrame.tsx:41-45`) é **prosa, não mecanismo**, e este bloco trouxe o terceiro
   consumidor: `BudgetsTable:63,67`, `TurmasTable:40,44` e `useHistorial:60,86` remontam o mesmo
   `clearAll` à mão. Esquecer produz um "Limpar filtros" que não devolve a lista — a mesma classe de
   falha silenciosa que o `filtering` do `useTableFilter` existiu para matar em 2026-08-03, quando
   estas duas tabelas erraram juntas. Pela lição 14 (instrução repetida três vezes quer mecanismo) e
   pela cláusula de reincidência da skill, **vira regra ou tipo, não refactor**: a moldura compondo
   por `onClearFilter`, o par virando tipo obrigatório, ou um `useStatusFilteredTable` em
   `shared/hooks`.
3. **Q-3 🟢 P** — `StudentDialog.tsx:115` introduz
   `options={clients.options as { label: string; value: number }[]}`. A fonte
   (`useStudentClients.ts:16`) devolve `value: c.id` com `ClientData.id` sendo `number | undefined`.
   A extração criou uma fronteira tipada e o cast é o que a atravessa; corrigir no dono do dado
   (filtrar/normalizar uma vez) elimina a asserção em vez de justificá-la em três linhas de
   comentário.
4. **Q-4 🟢 P** — `RedatorDocumentSlot.tsx:10-12` afirma que `preview` e `sizeError` "vivem no
   diálogo"; depois da Task 4 eles vivem em `RedatorDocumentsSection.tsx:38-39`. Lição 13 na forma
   exata, e a mesma classe do ponteiro fantasma que a Task 9 **deste bloco** existiu para corrigir.
   `repo-docs-refs` não pega: é comentário em `.tsx`, não doc normativo.

**O que NÃO virou achado, e por quê:** decisão consciente registrada não é achado — requisição
ociosa de `useStudentDetail` em edit (D4), `mapped` literal do redator sem guarda (D2), CTA da
`BudgetsTable` em lista-vazia-com-termo (D8), margem de 6 linhas do `SlotBody` (spec §8.1, no
ledger), `SlotBody.tsx` fora da convenção `Redator*` (ledger) e os números do `backlog.md` §Débitos
ainda descrevendo o estado pré-bloco (a baixa é do `/fechar-sprint`, por instrução do plano).

**Veredito: o bloco está bom.** Dez tasks, dez commits, nenhuma condicional mudou de forma, nenhum
`key` mudou de critério, e as quatro mudanças de tela são as quatro declaradas. Os quatro achados
são de acabamento e de mecanismo; nenhum é de correção.

### Correção dos achados — 2026-08-13: João aprovou os quatro

Triagem do João: **Q-1 a Q-4, todos**. Quatro commits, um por achado, na ordem do relatório.

**Q-1 (`3451976`)** — `RedatorDocumentsSection` adota o molde do `useBudgetDetail`:
`useMutationErrors([upload.error, removeDoc.error])` num banner só. A exclusão reprovada agora fala;
antes o documento reaparecia na linha e a tela ficava calada.

**Q-2 (`b4d1a50`) — virou tipo, não refactor,** que é o que a cláusula de reincidência pede. Das três
formas oferecidas no relatório (regra escrita, par obrigatório por tipo, `useStatusFilteredTable`),
a escolhida foi a do meio: `SearchableTableFrameProps` deixou de ser interface e virou
`SearchableTableFrameBaseProps<T> & FilterSlotProps`, com `FilterSlotProps` sendo
`{ filterSlot?: undefined; onClearFilter?: undefined } | { filterSlot: ReactNode; onClearFilter: () => void }`.
A composição saiu dos chamadores e entrou na moldura (`table.clear()` + `onClearFilter?.()`). Os três
consumidores (`BudgetsTable`, `TurmasTable`, `useHistorial`) pararam de remontar `clearAll` à mão —
o `useHistorial` passou a expor `clearStatusFilter` e devolve o `table` do hook intacto.
**Provado nas duas direções** (lição 10), não por lint verde: removi o `onClearFilter` da
`TurmasTable` mantendo o `filterSlot` e o `tsc -b` deu
`TS2322: Property 'onClearFilter' is missing ... but required in type '{ filterSlot: ReactNode; onClearFilter: () => void }'`;
restaurado, compila. O terceiro consumidor que motivou o achado é agora impossível de errar.
A regra ficou registrada no bullet "Tabela em card" de `.claude/rules/frontend-fsliced.md`.

**Q-3 (`ae52a6c`)** — `useStudentClients` descarta o `id` nulo com `flatMap` e devolve
`value: number` de verdade; o cast e as três linhas que o justificavam sumiram do `StudentDialog`.
Corrigido no dono do dado, não na fronteira.

**Q-4 (`20bc7e7`)** — docblock do `RedatorDocumentSlot` aponta para `RedatorDocumentsSection`.

**Gate reproduzido depois das correções:** `pnpm build` verde, `pnpm lint` exit 0,
`pnpm test` **29 arquivos / 142 testes** — mesmos números do fechamento da execução, nenhum teste
tocado. Os cinco componentes mexidos seguem sob a régua de 150 (maior: `HistorialTable`, 132).
A `SearchableTableFrame` foi a 164 linhas e isso é legítimo: a régua cobre
`src/features/*/components/**`, e a moldura é `shared/ui` — foi justamente ela que absorveu a
complexidade que estava espalhada em três features.

**Estado: `ready_for_closure`.** Nenhum achado aberto. O fechamento é passo explícito
(`/fechar-sprint`), não automático — e é lá que a baixa dos débitos do `backlog.md` acontece.

### Fechamento — 2026-08-13

A árvore já estava limpa em `7c28699` (as correções dos quatro achados entraram commitadas), que
passa a ser o `state_basis_commit` — diferente do fechamento anterior, aqui não houve trabalho
pendente a commitar antes de arquivar.

**O item 0 foi refeito contra a API real e PAGOU a dívida que a execução declarou.** Os Steps 5 e 6
do gate da Task 10 tinham ficado de fora por bloqueio de ambiente (500 em `/api/students` no main
tree, `docker compose up` recusado na worktree), com o João escolhendo prosseguir sem eles. No
fechamento a stack estava de pé e respondendo — `/api/students` sem cookie devolve **401**, não mais
500 —, então o Step 5 rodou: com sessão Sanctum viva (cookie + CSRF, `Origin` e `Accept` nos dois
lados), o payload forjado `"phone": []` devolveu **422 `application/problem+json`** com
`errors.phone` em `PUT /api/students/37` **e** em `PUT /api/redatores/1`, mensagem
`El campo teléfono debe ser una cadena de caracteres.`. É exatamente o insumo que o item (c) do
bloco mostra: `phone` não está em `mapped` em nenhum dos dois diálogos (`useStudentForm` o declara
em `summaryOnly`; o `RedatorDialog` passa a lista literal `['name', 'rut', 'email']`), então o 422
cai no `FormErrorSummary` em vez de sumir. **Ressalva escrita, não maquiada:** o `:8080` serve o
main tree, hoje na branch alheia `feat/contrato-de-entrada-identidade-e-nested`. O `phone` é
`string\|Optional\|null` no DTO e o 422 vem do cast do spatie/laravel-data, não de regra de formato;
`git diff main...HEAD -- backend/app/Domains/Identity/Data/` está **vazio** naquele tree, então o
caminho medido é o mesmo que a `main` percorre — mas a medição não é de uma stack limpa, e isso é
o custo da **P-03** aparecendo num bloco de frontend.

**A catraca foi provada no próprio fechamento, nos dois sentidos (lição 10), não herdada do
review:** 30 linhas em branco apensadas ao `StudentDialog` — o ex-ignorado — fazem o lint reprovar
com `File has too many lines (154). Maximum allowed is 150`, e a árvore volta limpa em seguida.
Ferramentas: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **29 arquivos / 142 testes**. Os
seis alvos do plano pousaram em **124 / 125 / 34 / 133 / 105 / 116** linhas. Suíte backend, Pint e
`typescript:transform` são **N/A por escopo medido, não por suposição**: `git diff main...HEAD --
backend/` e `-- frontend/src/shared/types/generated.ts` devolvem **zero arquivo**, e rodar a suíte
no container mediria o código da outra branch, não este bloco.

**Um achado do próprio gate de código morto, corrigido no commit de fechamento:** o comentário de
`useStudentForm.ts:36-38` ainda dizia que "`StudentDialog` não tem FormErrorSummary: um 422 em
`phone` não aparece em lugar nenhum hoje". O bloco tornou a frase falsa ao adicionar o resumo em
`StudentDialog.tsx:74`, e o arquivo ficou **fora** do diff das dez tasks — lição 13 na forma exata,
mesma classe da Q-4 do review, um nível abaixo (comentário de hook, que a guarda `repo-docs-refs`
não alcança).

**Pendências: nenhum gatilho venceu.** A **P-34** (`COR_HARDCODED` fora de `src/app/**`) espera
bloco que toque o shell, e este não tocou — `src/app/` não aparece no diff. A **P-23** (formato do
`progress.md`) segue com revisão em 2026-09-30, e foi exercitada aqui ao mover a entrega mais antiga
para o `progress-archive.md`, que tem as três colunas que o `progress.md` fundiu. A **P-03** ganhou
uma linha: a ausência de compose por worktree custou dois passos de gate **num bloco de frontend**,
não de backend — a worktree não pôde subir stack própria e dependeu do main tree, que naquele
momento servia branch alheia quebrada. Nenhuma pendência nova nasceu: o que fica aberto deste bloco
é prova não executada, registrada no `progress.md`, não divergência entre doc e realidade.

**Arquivamento e histórico:** plano e spec foram para `plans/archive/` e `specs/archive/` (a spec
não é compartilhada por nenhum item futuro), com os ponteiros da narrativa acima e o da §Spec do
próprio plano atualizados. O `progress.md` recebeu a entrega e voltou a dez linhas, movendo
`Certificação · lote em Action e gate único de snapshot` (2026-08-10) para o `progress-archive.md`.
Do `backlog.md` saíram o **BD-4** e os **três débitos que ele cobria** — as 2 tabelas sem a
`SearchableTableFrame`, a catraca do `max-lines` e o `FormErrorSummary` ausente nos dois diálogos —,
mais a atualização da ordem (`BD-5 → BD-6`). O gatilho do trio da foto, que o BD-4 venceu, ficou
escrito no próprio BD-5. **Nada foi promovido:** o próximo item é escolha explícita do João.

**O que o fechamento NÃO provou, sem maquiagem:** o **Step 6 segue não executado** — nada foi visto
renderizado, então o wrap da toolbar a 390x844, os quatro casos de CTA da D8, o aviso `clientLocked`
sobrevivendo fora do `FormField` e o resumo com o 422 **na tela** continuam sem checagem visual. A
equivalência das extrações é literal e conferida linha a linha no review, mas não vira mecanismo:
nenhum diálogo tem teste de componente. D8 e D2 seguem sem guarda automatizada, por decisão
declarada na spec §8.

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

### Merge com a `main` — 2026-08-13: duas sprints fecharam em paralelo

O BD-4 fechou às **08:49** e o BD-9 (`contrato-de-entrada-identidade-e-nested`, backend) às
**09:12**, do mesmo dia, em branches irmãs da mesma base `0c2a24b`. **Colisão de código: zero** — 30
arquivos de frontend contra 40 de backend mais `generated.ts`, sem um arquivo em comum. Os **cinco**
arquivos que se cruzam são todos doc de estado, e só **três** conflitaram (`state.md`,
`progress.md`, `progress-archive.md`).

**Merge da `main` na branch, nunca rebase.** Replayar 24 commits reescreveria os SHAs que o
`progress.md` e este arquivo **citam nominalmente** — doc versionado viraria mentira —, e faria 24
encontros com o mesmo `state.md` em vez de um.

**O perigo não estava nos conflitos, estava no auto-merge.** `pendencias.md` e `backlog.md`
mesclaram sozinhos, e um dos dois saiu **falso**: o parágrafo de ordem do `backlog.md` manteve
"então dessa fila resta o BD-9" depois de a `main` já ter entregue o BD-9 — a `main` nunca tocou
aquele parágrafo, então o git escolheu o lado desta branch e a afirmação vencida passou verde.
Corrigido à mão no mesmo commit. Auto-merge é ausência de sobreposição textual, não acordo.
`pendencias.md` é seguro por medição: a `main` mexeu só na P-29, esta branch só na P-03, e os 32 IDs
seguem sem duplicata — este repositório já renumerou ID duplicado três vezes.

**A cadeia foi resolvida por decisão do João: BD-4 fica como Último por ordem de merge**, não por
relógio (ele fechou 23 min antes do BD-9 e chega à `main` depois). BD-9 desce a Penúltimo,
`rastro-unicidade-e-gates` a Antepenúltimo e `faixa-visivel-e-acessibilidade-dos-dialogos` sai da
cadeia de três. O frontmatter é o desta branch (`last_completed_work_item:
catraca-max-lines-e-moldura`, `state_basis_commit: 7c28699`). Os três corpos foram conferidos por
comparação, não de olho: o do BD-9 entrou **byte a byte idêntico** ao da `main`, o do BD-4 idêntico
ao desta branch, e o do `rastro-unicidade-e-gates` difere da `main` em exatamente **duas linhas** —
as correções do ponteiro fantasma que o próprio BD-4 fez em `d50d7f8`, preservadas.

**`progress.md`:** as duas entregas entram, dá 11 contra o teto de 10, então desceu
`2026-08-10 · Operation · habilitação da turma`. **`progress-archive.md`:** os dois lados haviam
arquivado a **mesma** linha (`2026-08-10 · Certificação · lote`) e união ingênua a duplicaria —
ficou uma. E ficou na forma **verbatim de cinco colunas**, não no split de sete que esta branch
tinha feito: o fechamento do BD-9 declarou essa convenção no cabeçalho do arquivo (duas arities
convivendo, apontando para a P-23), e convenção recém-publicada vence reformatação.

**Gate pós-merge, que nenhum dos dois lados exercitou sozinho:** `pnpm lint` exit 0, `pnpm build`
verde (o `tsc -b` combinado é o risco real de um merge frontend×backend), `pnpm test` **29 arquivos
/ 143 testes** — os 142 desta branch mais o caso de `useClientForm` que a `main` trouxe. Backend
**591 passed, 5 skipped (2149 assertions)** e `typescript:transform` com **diff zero**; os dois
rodaram no container, que monta o main tree, e valem para esta branch por medição:
`git diff origin/main -- backend/ frontend/src/shared/types/generated.ts` devolve **zero linha**.

## Penúltimo item fechado — 2026-08-13 (`contrato-de-entrada-identidade-e-nested`)

### Seleção — 2026-08-13

**BD-9 do `backlog.md:185`, promovido explicitamente pelo João.** Ele abriu com
`/planejar-bloco ### BD-9 · Contrato de entrada: identidade e coleção nested (backend)` mais o
caminho de um arquivo de contexto, e o gate do comando **reprovou pelo motivo de sempre** (BD-1,
BD-2, BD-7, BD-8): o argumento é **título de seção**, não slug promovido, com o estado em `idle` e
`active_work_item` `null`. O comando mostra o backlog; quem promove é ele.

**Diferente do BD-8, não havia item concorrente a autorizar.** A worktree
`/home/jvbat/projetos/fix-frontend` está na branch `feat/catraca-max-lines-e-moldura` (BD-4), mas com
**zero commits** além de `0c2a24b`, árvore limpa e `state.md` idêntico ao da árvore principal, também
`idle` — branch criada, nada executado. A invariante de um `active_work_item` não precisou de
exceção.

**Três decisões do João fecharam o gate, todas confirmadas de uma vez:** promover o BD-9 com o slug
`contrato-de-entrada-identidade-e-nested`; **rota direta a `ready_for_planning`, sem Context
Packet**, por ausência **medida** de fonte externa; e **main tree, sem worktree** (P-03, bloco de
backend), na branch `feat/contrato-de-entrada-identidade-e-nested` criada de `0c2a24b`.

**A ausência de fonte externa foi medida, não presumida.** O arquivo de contexto que ele passou —
`architecture-review-20260812-backend.html`, 81.193 B — é a mesma revisão de arquitetura que gerou o
BD-8, e o grep por `drive.google`, `notion.so`, `figma.com` e `docs.google` devolve **zero
ocorrência**. Os onze achados dele estão numerados em `<h2>`, e os **4** (`UserProvisioner fecha
metade do invariante e quatro caminhos esquecem a outra`) e **5** (`ClientData::$addresses apaga a
coleção em silêncio`) são literalmente os dois itens do BD-9. O arquivo vive no `/tmp` de **outra
sessão** e é volátil; foi copiado para o scratchpad desta antes de qualquer leitura de desenho.

**Baseline medido nesta branch, não herdado do fechamento anterior:** backend **573 passed,
5 skipped (2104 assertions)** — bate com o placar de fechamento do `rastro-unicidade-e-gates`, o que
confirma que a branch nasce da `main` sem deriva.

### Terreno medido antes de desenhar — 2026-08-13 (fato, não desenho)

1. **O arquivo de contexto que abriu o bloco não existe mais.** O
   `architecture-review-20260812-backend.html` vivia no `/tmp` de outra sessão e não sobreviveu a
   ela. **Não bloqueou:** os achados 4 e 5 estão transcritos integralmente em `backlog.md:185-231`,
   com paths, linhas e as quatro decisões do grilling. `context_packet` segue `null` pela mesma
   ausência medida de fonte externa.
2. **Os caminhos de escrita de identidade são nove**, em cinco creates e quatro updates, e a
   assimetria é exatamente a do achado: `Create/UpdateClientAction` e `Create/UpdateRedatorAction`
   checam só o RUT; os outros cinco checam os dois.
3. **O staff tem `rut` nullable** (`create_users_table.php:18`), e por isso
   `Create/UpdateStaffUserAction` decidem entre `null` e a checagem por ternário. A assinatura
   `ensureIdentityAvailable(string $rut, …)` que o backlog escreveu **não cobre** esses dois.
4. **Fazer `provision()` checar e-mail torna duas chamadas redundantes** — `CreateStudentAction:49`
   e `StudentResolver:63` já chamam `ensureEmailAvailable` logo antes.
5. **O `Optional` no `ClientData` NÃO é inerte no frontend, e isso foi medido por sonda, não
   estimado:** `addresses`/`contacts` com `| undefined` no `generated.ts` e `tsc -b` devolvem **17
   erros em 4 arquivos** (`useClientForm.ts` 10, `ContactFields.tsx` 3, `ClientsTable.tsx` 2,
   `ContactCard.tsx` 2). Inerte em runtime (o front sempre manda as duas), quebrado em compilação.
   Árvore restaurada, `git status` limpo.
6. **O universo da lei da `der-fisico.md:103-106` é cinco, não dois** — a minha primeira contagem
   estava errada e foi corrigida antes de virar decisão. `#[DataCollectionOf]` são cinco
   propriedades em três DTOs, mas `BudgetData::$quotes` e `$files` **nunca são lidos na entrada**
   (grep de `data->quotes`/`data->files` em `app/` vazio): são projeção de saída e não violam lei
   nenhuma. Uma guarda que só olhasse o atributo nasceria vermelha nelas.
7. **Quem produz o `| undefined` no `generated.ts` é o docblock, não o tipo PHP.**
   `BudgetData::$files` é `array|Optional = []` com `/** @var FileData[] */` e sai sem `| undefined`;
   `CourseData:35,38` escreve `|Optional` no `@var` e sai com ele.
8. **Não existe um único `ValidationContext` em `app/`** — os 14 `rules()` do repositório são
   estáticos. A distinção create/update do `contacts` não tinha precedente e precisou de mecanismo.

### Brainstorming e spec — 2026-08-13

Spec em `docs/superpowers/specs/archive/2026-08-13-contrato-de-entrada-identidade-e-nested-design.md`. As
**D1–D4** vêm fechadas do grilling de 2026-08-12 e não foram reabertas; as **D5–D9** são desta
sessão, cada uma escolhida pelo João entre alternativas apresentadas com o custo medido:

- **D5** — o helper é a **porta única dos nove**, com `?string $rut` para caber no staff, e
  `ensureRutAvailable`/`ensureEmailAvailable` viram **privados**. Recusado: fechar só os quatro
  quebrados, que deixaria os dois métodos públicos e três formas de checar identidade convivendo.
- **D6** — `contacts` é `sometimes` no PUT e obrigatório no POST, com a obrigatoriedade do POST
  morando na **Action**, não em `rules()`. Recusado: `sometimes` nos dois verbos, que revogaria a
  regra do Drive (um ou mais contatos, ratificada 2026-07-31) e deixaria a UI como única guardiã.
- **D7** — o 422 **agrega** RUT e e-mail numa exceção só, em vez de dois round-trips.
- **D8** — o helper lê `deleted_at` na mesma query, e cada campo ganha duas mensagens (vivo e
  arquivado), quatro no total, em PT-BR. A Q-6 (idioma canônico) segue travada e não foi reaberta.
- **D9** — a lei ganha guarda estática em `PersistenceLawsTest`, e a exceção read-only é declarada
  **no sítio** por `#[ReadOnlyCollection]`. Recusados: migrar `BudgetData` junto (medido: 3 erros TS
  em 2 arquivos, e o tipo passaria a mentir sobre uma saída sempre preenchida) e allowlist literal
  dentro do teste.

**Consequência declarada, não escolha:** cinco caminhos que **não têm defeito** (staff e aluno)
mudam de forma. É o preço da porta única, e a prova de que o comportamento deles não mudou entra no
DoD.

**Um ruído previsto antes de aparecer:** `UniquenessInsideTransactionTest:116` filtra por
`select exists`; trocar `->exists()` por leitura de `deleted_at` muda o SQL e reprova os três casos.
O teste muda no mesmo commit, medindo a mesma coisa.

**Risco de review declarado ALTO** (§8 da spec), **divergindo do MÉDIO que o backlog escreveu**: o
gate da `revisar-sprint` é binário e lista `generated.ts` entre os gatilhos de alto
(`SKILL.md:37`). A divergência fica declarada; o backlog não foi corrigido por conta própria.

O estado entra em `planning` com `active_spec` preenchido neste commit; `active_plan` segue `null`
até o João ler a spec escrita e autorizar o `writing-plans`.

### Plano — 2026-08-13

**O João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/archive/2026-08-13-contrato-de-entrada-identidade-e-nested.md`: **seis tasks**, uma
por commit, na ordem helper → creates → updates e morte dos métodos antigos → coleção nested com os
consumidores TS → guarda da lei → gate.

**Baseline medido antes de escrever, não herdado do fechamento anterior:** backend **573 passed,
5 skipped (2104 assertions)**; frontend **28 arquivos / 138 testes**, lint limpo, build verde. Os
27/131 registrados no fechamento do BD-8 eram de antes dos merges na `main` — o número do frontend
subiu sozinho, sem este bloco tocar nada. Projeção do plano: **590 casos** no backend (+17),
frontend **inalterado** em 28/138, porque `useClientForm` é hook de feature e está fora do corte do
runner.

**A ordem das três primeiras tasks é a do bloco anterior (helper → call-sites → guarda), e por quê:**
o helper nasce sem chamador na Task 1, o que deixa um revisor rejeitar a forma da porta única sem
rejeitar a migração dos nove caminhos, e vice-versa. A Task 3 é onde
`ensureRutAvailable`/`ensureEmailAvailable` **deixam de existir** — a D5 na forma mais forte: método
apagado, não privado.

**Três coisas que só apareceram ao escrever o plano, e que mudam trabalho:**

1. **`ClientContactMinimumTest:54-67` afirma literalmente o comportamento que a D6 muda.**
   `test_update_sem_a_chave_contacts_da_422_em_vez_de_apagar` é o caso que o bloco tem de
   **inverter**, não um vermelho a consertar. Os outros seis casos do arquivo ficam — inclusive o
   `contacts: []` e a guarda da rota nested, que seguem valendo.
2. **Trocar `->exists()` por leitura de `deleted_at` quebra o filtro de SQL do
   `UniquenessInsideTransactionTest:116`** (`str_starts_with($query->sql, 'select exists')`). O
   filtro novo casa SELECT + `deleted_at` projetado, porque o UPDATE de `users` também contém
   `rut = ?` e o caractere de citação muda entre sqlite e MySQL. No mesmo passe, o cliente e o
   redator passam a exigir `['rut','email']`: a assimetria que aquele arquivo registrava deixa de
   existir.
3. **A guarda da lei pede reflexão, não regex.** A pergunta é sobre o TIPO ("admite `Optional`?"), e
   o texto do arquivo responde mal — default e união podem estar em linhas diferentes do atributo. A
   varredura resolve o FQCN a partir do path (PSR-4) e lê os atributos do construtor.

`executor: claude`, sem `paths_autorizados`: `generated.ts` regenera na Task 4 (lei §5.3), a forma do
erro HTTP muda em quatro rotas (RFC 7807, §5.4) e três tasks fecham por sonda vista reprovando —
julgamento, não transformação mecânica.

### Execução — 2026-08-13, via Subagent-Driven Development

**As seis tasks fecharam, cada uma em commit próprio, revisão individual aprovada antes de avançar:**
`0bd994e` (T1 — `ensureIdentityAvailable`/`duplicateStatus` isolados, nenhum call-site migrado),
`606bd36` (T2 — `provision()` passa a checar e-mail, fecha os dois `create`s de graça), `74d32ea` (T3
— os cinco caminhos restantes migram, `ensureRutAvailable`/`ensureEmailAvailable` deletados),
`29c3815` (T4 — `ClientData::$addresses`/`$contacts` viram `Optional`, `generated.ts` regenerado e os
5 consumidores TS corrigidos no mesmo commit), `fe36ab0` (T5 — guarda de reflexão em
`PersistenceLawsTest`, `#[ReadOnlyCollection]` nas duas projeções de saída de `BudgetData`). Task 6
foi gate — verificação pura, **sem commit**: suíte, Pint, `generated.ts` sem diff, zero órfão, e um
E2E completo contra a API real (sessão Sanctum de verdade) provando os 11 cenários do DoD por corpo
de resposta, não só status. Contagem final: backend **590 passed, 5 skipped** (573 no baseline);
frontend **28 arquivos**. Ledger fino task-a-task, achados Minor de cada review e o relatório do gate
em `.superpowers/sdd/progress.md` (local, não versionado).

**A revisão final de branch (mandato da própria skill SDD, não o `/revisar-sprint` do João — essa
continua sendo a próxima instrução explícita) achou dois Important, ambos reais e ambos corrigidos
antes de fechar:**

1. A guarda nova de T5 checava só o TIPO do parâmetro (`array|Optional` admite `Optional`), nunca o
   DEFAULT — e a lei em `backend-ddd.md` exige as duas coisas (`= new Optional`). Confirmado por
   reflexão real: `BudgetData::from(['client_id'=>1])->files` devolve `array(0){}`, não `Optional`,
   apesar do tipo admitir. Uma coleção nova escrita `array|Optional $x = []` passaria pela guarda e
   ainda apagaria em silêncio — o mesmo defeito que o bloco existe para fechar, sob grafia diferente.
   Corrigido em `11c7337`, sonda provada nos dois sentidos (código velho deixa passar errado, código
   novo reprova nomeando a sonda).
2. A spec (§5, ecoada em §9) afirmava que o frontend ficava sem teste novo porque "o runner só cobre
   hooks de `shared/`" — falso, e o mesmo engano que `frontend-fsliced.md` já registra como lição
   repetida duas vezes (lição 13) no próprio arquivo. A lacuna real era a normalização
   `client.addresses ?? []`/`contacts ?? []` (T4) nunca ter sido exercitada por teste. Corrigido em
   `e06c204`: caso novo em `useClientForm.test.tsx`, prosa da spec corrigida nos dois pontos. Frontend
   138→139 testes.

Nove achados Minor triados como backlog (não bloqueiam merge, nenhum fixado nesta passagem) — inclui
uma discordância explícita da triagem da T4 (`$data->contacts === []` em `CreateClientAction` **não**
é código morto: `OperationDemoSeeder` chama a Action direto, sem passar por `rules()` — manter).
Recomendações não-bloqueantes: a guarda de T5 só alcança propriedade promovida no construtor marcada
`#[DataCollectionOf]` (`QuoteData::$files` etc. ficam fora, spec §6 já declara essa fronteira);
`UpdateStaffUserAction` tem o mesmo defeito de família num campo escalar (`rut` some em silêncio num
PUT que o omite) — pré-existente, fora de escopo, vale backlog. Detalhe completo, achado a achado, em
`.superpowers/sdd/progress.md`.

**O que o gate NÃO provou, registrado sem maquiagem:** corrida de unicidade concorrente (a suíte roda
sqlite `:memory:`, a defesa real é o `unique` do MySQL); nenhuma tela vista renderizada (o frontend só
mudou de tipo mais a normalização `?? []`, sem mudança visual); a listagem `GET /api/clients` não
recebeu asserção formal neste gate (fora do escopo de escrita do bloco).

**Estado: `ready_for_review`.** Este comando não inicia review — a próxima instrução do João aciona
`/revisar-sprint` (ou equivalente) sobre o trabalho ativo.

### Review de sprint — 2026-08-13: ALTO risco, UMA lente, 4 achados

Risco ALTO pelo gabarito: `generated.ts` regenerado (lei §5.3), forma do 422 mudando em quatro rotas,
eixo de identidade. **A segunda lente foi recusada pelo João** — o despacho ao Codex não foi
autorizado, e o review saiu com lente única. Fica declarado, não resolvido em silêncio (mesmo
precedente do fechamento de 2026-08-12).

**Gate reproduzido, não herdado:** backend 590 passed / 5 skipped / 2146 assertions; frontend
`pnpm build` verde, `pnpm lint` limpo, 28 arquivos / 139 testes; `typescript:transform` sem diff;
Pint `passed` nos `.php` do bloco; zero `dd(`/`dump(`/`console.log`/`SONDA` no diff.

**Órfãos: zero.** `ensureRutAvailable`/`ensureEmailAvailable` não existem mais em `app/`, `tests/`
nem `database/` — a D5 na forma forte. Os nove caminhos de escrita de identidade passam pela porta
única (4 via `provision()`, 5 diretos), conferidos um a um.

Os quatro achados, com as duas provas por sonda (árvore restaurada nos dois casos):

1. **Q-1 🟡/P — `#[ReadOnlyCollection]` era isenção AUTO-DECLARADA.** A guarda dava `continue` na
   marca antes de qualquer checagem: DTO sonda com `#[DataCollectionOf] public array $itens = []`
   reprovava; a MESMA sonda, `array = []` intacto, passava só por ganhar a marca. A guarda não olhava
   Action nenhuma — a read-only-ness, que é a premissa inteira da exceção, era a única parte não
   mecanizada (a spec §1.5 a mediu à mão, uma vez).
2. **Q-2 🟡/P — checagem de `contacts` rodava depois de escrever.** Sonda: `POST /api/clients` sem
   `contacts` e com e-mail ocupado devolvia `status 422 | chaves: email`. Só `email`. Dois
   round-trips para o operador, num check que é entrada pura e custa zero de banco.
3. **Q-3 🟢/P — uma regra, três redações**, e duas línguas: "precisa **de** ao menos um contato"
   (`CreateClientAction`), "precisa **ter** ao menos um contato" (`DeleteClientContactAction`) e
   `El campo contacts debe tener al menos 1 elementos.` (o `min:1` de `rules()`, pelo locale `es` do
   validador).
4. **Q-4 🟢/P — marca inerte:** `BudgetData::$files` tinha `#[ReadOnlyCollection]` sem
   `#[DataCollectionOf]`, então a guarda não olhava a propriedade de jeito nenhum e a marca sugeria
   cobertura inexistente.

**Descartado como achado, com razão registrada:** o objeto `entity` novo a cada render em
`useClientForm` (o `useEntityForm` reseta comparando `id`+`mode`, não identidade — não há laço); o
filtro SQL reescrito no `UniquenessInsideTransactionTest` (ainda discrimina); o `| undefined` na
saída do `ClientData` (consequência declarada da D4, custo medido); a língua das mensagens (Q-6,
congelada pelo João); `BudgetData` não migrar (D9).

**Fora dos achados:** o deferimento do `rut` do `UpdateStaffUserAction`, declarado no relatório de
execução acima como "vale backlog", nunca chegou ao `backlog.md`.

### Correção dos achados — 2026-08-13: os 4 aprovados pelo João, os 4 aplicados

Cada um com o vermelho visto antes do verde, sem exceção.

- **Q-3** — `ClientData::CONTATO_OBRIGATORIO` vira o texto único, com `messages()` cobrindo
  `contacts.min`/`contacts.array`, e as duas Actions passam a citar a constante. Vermelho real: as
  três asserções de mensagem do `ClientContactMinimumTest` eram `fn ($m) => is_string($m)` — vagas
  **porque** o texto variava. Apertadas para a frase literal, 3 reprovaram (duas em espanhol, uma
  com "precisa ter"). A LÍNGUA do resto da validação segue sendo o Q-6 congelado; isto fecha só a
  divergência de redação desta regra.
- **Q-2** — a checagem de contato sai de dentro da transação e vai para o topo do `execute()`, antes
  de `provision()` e do `client()->create()`. Vermelho por teste novo em `ClientCrudTest`
  (`test_store_sem_contatos_reclama_do_contato_antes_da_identidade`): contra o código velho
  `errors.contacts` vinha `null`. **O que isto NÃO faz, dito sem maquiagem:** o caso combinado
  continua devolvendo UM campo por vez — agora `contacts` em vez de `email`. Agregar os dois num
  422 exigiria plumbar a regra de contato (Commercial) por dentro do `ensureIdentityAvailable`
  (Identity), e o preço não paga: a D7 agrega o que mora na MESMA chamada, e estes dois moram em
  camadas diferentes. O que a correção compra é a ordem determinística e a transação contendo só
  escrita.
- **Q-1** — a marca deixou de ser palavra-de-honra. A guarda agora varre `app/` atrás de
  `$data-><campo>` em arquivos que citam a classe do DTO, e reprova nomeando o sítio. Vermelho por
  sonda (`SondaQ1Action` lendo `$data->quotes`): `BudgetData::$quotes: marcada como SAIDA, mas lida
  da entrada em app/Domains/Commercial/Actions/SondaQ1Action.php`. Sonda apagada, árvore conferida
  por `git status`. Limite honesto e declarado no docblock: só arquivos que citam a classe entram, e
  a convenção `XData $data` é o que torna isso preciso — falso positivo aqui é barulhento, falso
  negativo é o que a guarda existe para não ter.
- **Q-4** — `BudgetData::$files` ganha `#[DataCollectionOf(FileData::class)]`, e a guarda passou a
  reprovar marca sem coleção. Este foi o único vermelho que **não** precisou de sonda: a checagem
  nova nomeou `BudgetData::$files` no primeiro `run`. `QuoteData::$files` — mesmo defeito na classe
  irmã, um nível abaixo (não tinha nem a marca, então era invisível) — recebeu os dois atributos no
  mesmo commit; é escopo ligeiramente além do achado, declarado aqui de propósito.

**Gate após as correções:** backend **591 passed, 5 skipped, 2149 assertions** (+1 caso, o do Q-2);
Pint `passed` nos 8 arquivos tocados; `typescript:transform` **sem diff** — nenhuma mudança de
contrato TS, nenhum consumidor frontend tocado, e por isso o gate do frontend não foi rerodado.

O deferimento do `rut` do `UpdateStaffUserAction` foi registrado em `backlog.md`, em
`## Débitos técnicos`.

**Estado: `ready_for_closure`.** O review não executa fechamento — `/fechar-sprint` é instrução
explícita do João.

### Fechamento — 2026-08-13

**As correções do review estavam no working tree, não commitadas** — o último commit da branch era o
handoff para review (`b2fe20e`). O fechamento começou por commitá-las (`59a39e3`, que passa a ser o
`state_basis_commit`); a árvore ficou limpa antes de qualquer prova.

**O item 0 foi refeito contra a API real, não herdado do review:** as quatro correções entraram
depois do e2e de execução e mexeram exatamente no que ele mediu — ordem da checagem, texto das
mensagens e a guarda. Sessão Sanctum por cookie + CSRF, `Origin` e `Accept` nos dois lados,
**10 cenários provados por corpo de resposta**, não por status:

1. **D7 na API:** RUT `76.123.456-0` e e-mail `contacto@transelec.demo.cl`, os dois ocupados, saem
   **num 422 só** — `errors.rut` **e** `errors.email` —, com `content-type: application/problem+json`
   conferido no header.
2. **Q-2 na API:** POST sem `contacts` com o mesmo e-mail ocupado devolve **`contacts`, e
   `errors.email` ausente**. A ordem que a correção comprou, medida onde o operador vive.
3. **As três portas da regra de contato falam a mesma frase** (Q-3): POST sem contatos,
   `contacts: []` no PUT (caminho do `min:1`, que antes respondia em espanhol) e DELETE do último
   contato pela rota nested — `O cliente precisa de ao menos um contato.` nos três.
4. **O coração do bloco:** PUT **sem** as chaves `addresses`/`contacts`, mudando só o `legal_name`,
   devolve **200** e o GET seguinte mostra **1 endereço e 2 contatos intactos**. O replace explícito
   segue funcionando — `addresses` com outro item troca de fato (`city` passa a `Valparaiso`) e os
   contatos não são tocados.
5. **A porta única nos caminhos que antes só checavam RUT:** `POST /api/redatores` com e-mail de
   redator existente → 422 `email`; `PUT /api/clients/{id}` com RUT de outro usuário → 422 `rut`.
6. **D8 (arquivado) pelo caminho real:** o cliente do gate foi soft-deletado pela própria API e a
   recriação com o mesmo par devolveu as **duas** mensagens de arquivado, não as de "já cadastrado".

**Ferramentas:** backend **591 passed, 5 skipped (2149 assertions)** contra o baseline **573** da
abertura; frontend **28 arquivos / 139 testes**, `pnpm lint` limpo e `pnpm build` verde; Pint
`{"tool":"pint","result":"passed"}` nos **21** `.php` do bloco; `typescript:transform` **sem diff**
(`git status --porcelain frontend/` vazio depois de rodar); zero `abort(` novo em `app/`.

**Órfãos: zero**, reconferidos no fechamento e não herdados do review: `ensureRutAvailable` e
`ensureEmailAvailable` não aparecem em `app/`, `tests/` nem `database/`; `ensureIdentityAvailable`
tem seis sítios em `app/` (o `UserProvisioner` mais cinco Actions) e três em `tests/`;
`#[ReadOnlyCollection]` é usada nas três propriedades de saída que a declaram.

**Item 7 — dois docs VIVOS nomeavam método morto, e é a lição 13 exata:** a lição 8 do
`docs/README.md` e a **P-29** citavam `ensureRutAvailable`/`ensureEmailAvailable`. Os dois foram
corrigidos para `UserProvisioner::ensureIdentityAvailable`; a guarda `repo-docs-refs` não os pegaria,
porque confere **path** e o escopo dela exclui `docs/superpowers/**` e `docs/pendencias.md`. **A P-29
NÃO fecha:** o BD-9 unificou a checagem e agregou o 422, e o que ela registra — a corrida entre
transações distintas, que estoura no índice único como 500 — segue exatamente igual, porque o
`SELECT` de unicidade não trava linha inexistente. O gatilho dela também não venceu: este bloco não
tocou `ProblemDetails` nem `ValidationMessages`. Nenhuma pendência nova nasceu; os limites do bloco
já estão declarados no sítio (docblock da guarda) ou no `backlog.md`.

**A rule `backend-ddd.md` ganhou o que o bloco criou**, porque sem isso um DTO novo com coleção de
saída reprovaria num teste cujo remédio a rule não documentava: a catraca da lei (tipo **e** default),
a exceção `#[ReadOnlyCollection]` com a verificação das duas pontas, e a direção "obrigatoriedade que
depende do verbo mora na Action, não em `rules()`", com o texto único da recusa.

**Mutação declarada no banco de dev**, append-only e toda pela API: cliente 14 (`Gate BD9`) criado e
soft-deletado no próprio gate, com o user de RUT `21.111.111-9`; endereços 22-23; contatos 35-36 (o
35 apagado pela rota nested, para provar que só o último é recusado). **Nenhuma linha pré-existente
foi alterada**, e nenhum `migrate:fresh`, `refresh`, `reset` ou seeder rodou — o banco segue com o
`LOT-2026-1001` corrompido de propósito para o checkpoint visual do João.

**O que o fechamento NÃO provou, sem maquiagem:** corrida de unicidade concorrente (a suíte roda
sqlite `:memory:` e a defesa real é o `unique` do MySQL — é a P-29, aberta); **nenhuma tela vista
renderizada**, porque o frontend só mudou de tipo mais a normalização `?? []`; e `GET /api/clients`
não recebeu asserção formal neste gate. O `progress-archive.md` passou a conter uma linha de **cinco**
colunas numa tabela de sete — a entrega mais antiga saiu do `progress.md` **verbatim**, como o
fechamento manda, e o cabeçalho do arquivo agora declara as duas arities apontando para a P-23.

**Estado: `idle`.** O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

## Antepenúltimo item fechado — 2026-08-13 (`rastro-unicidade-e-gates`)

### Seleção — 2026-08-12

**BD-8 do `backlog.md:208`, promovido explicitamente pelo João.** Ele abriu com
`/planejar-bloco BD-8 · Rastro, unicidade e gate no eixo de peso legal (achados 1+2+3)` e o gate do
comando **reprovou por dois motivos**, como em BD-1, BD-2 e BD-7:

1. Argumento é **título de seção**, não slug promovido, com o estado em `idle` e `active_work_item`
   `null`. O comando pode mostrar o backlog e pedir seleção; não pode promover.
2. Existia **item ativo em paralelo**: a worktree `/home/jvbat/projetos/fix-frontend`, na branch
   `feat/dialogos-faixa-visivel-acessibilidade`, carrega `faixa-visivel-e-acessibilidade-dos-dialogos`
   em `executing` (`updated_at` 14:48). A invariante de um `active_work_item` só precisava da mesma
   exceção declarada de 12-08.

**Três decisões do João fecharam o gate**, e as três ficam registradas porque nenhuma é default:
promover o BD-8 com o **paralelismo autorizado** (a outra frente é frontend, então a P-03 não
dispara contra este bloco de backend); **rota direta a `ready_for_planning`, sem Context Packet**,
por ausência medida de fonte externa — o bloco nasceu de revisão do próprio repositório e cita só
arquivos, ADR-17 e o relatório da revisão, sem Drive, Notion ou Figma; e o slug
`rastro-unicidade-e-gates`.

**A proposta foi commitada antes da promoção** (`e6c831f`, que passa a ser o `state_basis_commit`),
precedente de BD-1 e da estilização: BD-8 e BD-9 estavam só no working tree. Aquele commit carrega
junto o item 4 (Login) que o João já tinha pendente no mesmo arquivo — declarado na mensagem, não
misturado em silêncio.

**Toca backend e schema → main tree, sem worktree (P-03).** Branch `feat/rastro-unicidade-e-gates`,
criada de `18cf90a`.

### Terreno medido antes de desenhar (fato, não desenho)

1. **Os call-sites crus de pivot são exatamente cinco** — o grep de
   `->(sync|syncWithoutDetaching|attach|detach|toggle|updateExistingPivot)\(` em `app/` devolve as
   cinco linhas do achado e mais nada. A guarda estática nasce verde, sem allowlist além do próprio
   helper.
2. **O rastro de pivot não é fraco: não existe.** As 14 asserções sobre `audits` em `tests/` cobrem
   6 `auditable_type` e **dois** eventos (`deleted` 8×, `updated` 3×). Zero `sync`/`attach`/`detach`,
   zero sobre `turma` ou `redator`.
3. **A armadilha do `$auditInclude` do bloco anterior NÃO se aplica a pivot.**
   `Auditable.php:262` desvia para `getCustomEventAttributes()` quando `isCustomEvent`, então o
   filtro de atributos não zera o diff da relação.
4. **Mas existe outra, oposta:** `auditSync` com diff vazio zera os dois lados e **ainda dispara**
   (`Auditable.php:831-840`), e `config/audit.php:104` tem `empty_values => true`. Como
   `UpdateRedatorAction:66` roda `courses()->sync` em toda edição de redator, a `audits` ganharia
   linha vazia por salvada. É o que a D12 mata.
5. **O `version` tem três caminhos de escrita, não um:** `CourseTemplateController::store` (controller
   cru, sem Action nem transação), `CreateCourseAction:28-32` e `UpdateCourseAction:35-40`.
6. **O replace nested obriga `withTrashed()` na derivação.** `UpdateCourseAction:36` soft-deleta
   todos e recria; com `unique(course_id, version)` cru, `MAX` sobre vivos voltaria a 1 e o banco
   recusaria a segunda salvada.
7. **Um quarto caminho sem gate, que o relatório não listou e o código autodenuncia:**
   `DeleteTurmaAction.php:8-9` — "Home para futuras guardas do 6d (blindagem pós-conclusão RN-15) —
   hoje sem gate".
8. **Trocar a chave do erro é inerte na tela.** `frontend/src/shared/ui/FormField/FormField.tsx:79-107` renderiza qualquer
   chave sem input mapeado e `useMutationErrors` cai no primeiro valor do mapa. Só um teste afirma
   texto literal de gate (`EnrollmentResultTest:150-151`), e é a mensagem que **fica**.

### Brainstorming e spec — 2026-08-12

O João aprovou o desenho por seções (§1+§2, depois §3+§4). Oito decisões novas entram na spec como
D9–D16; as D1–D8 vêm fechadas do grilling e não foram reabertas.

**Quatro são escolha dele entre alternativas apresentadas:** `version` **imutável** com PUT editando
in-place (contra versionamento por linha nova); **Action única como escritor exclusivo** mais
`version` fora do `$fillable` (contra service solto e contra evento `creating`, que rodaria a trava
fora de transação e viraria no-op silencioso em SQLite); **`UpdateTurmaAction` fecha total sem
caminho de correção novo** — a pergunta que o backlog deixou aberta, respondida com o precedente da
conclusão terminal; e **helper que não grava audit em no-op** (contra aceitar o ruído e contra
curto-circuitar só a designação).

**Uma amplia o escopo por decisão dele:** o `DeleteTurmaAction` entra no gate, que passa de dez para
**onze** caminhos.

**Três são consequência declarada, não escolha:** a audit cai no model que o usuário tocou, então
`course_redator` passa a ter dois `auditable_type`; o gate mantém nome e mensagem **verbatim**
para não churnar os dois testes que afirmam o texto; e a sonda de concorrência MySQL fica **fora**,
porque aqui o `unique` é a defesa de integridade e a corrida degrada para 500, não para duplicata —
o `seq_in_budget`, mesmo padrão do mesmo ADR-17, também não tem sonda.

**Risco de review declarado ALTO** (§5 da spec): schema, peso legal e `generated.ts`.

O estado entra em `planning` no mesmo commit da spec; `active_plan` segue `null` até o João ler a
spec escrita e autorizar o `writing-plans`.

### Plano — 2026-08-12

**João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/archive/2026-08-12-rastro-unicidade-e-gates.md`: **sete tasks**, uma por commit, na
ordem helper → call-sites → guarda → índice → derivação → gate → fechamento. O índice vem **antes**
da derivação de propósito: sem ele, o `withTrashed()` não teria o que provar.

**Baseline medido antes de escrever (não herdado do bloco anterior):** 548 passed, 5 skipped, 2025
assertions. Projeção do plano: **+21 casos → 569**; assertions ficam para o gate medir.

**Duas coisas que só apareceram ao escrever o plano, e que mudam trabalho:**

1. **Tirar `version` do `$fillable` quebra sete sítios de teste** que criam template por mass
   assignment (`CourseModelTest`, `IssueCertificateTest`, `CertificateListingTest`,
   `CertificateEligibilityTest` e o `IssuableEnrollmentBuilder`). O vermelho é ruidoso
   (`NOT NULL constraint failed`), não silencioso, e a Task 5 traz o trait
   `Tests\Support\CreatesCertificateTemplates` para resolvê-lo por atribuição explícita.
2. **A recusa do `RemoveEnrollmentAction` nunca teve teste** — é um dos sete caminhos que a prova 11
   afirma cobrir. A Task 6 escreve o caso que falta, e ele nasce vermelho pela mensagem PT-BR antiga.

`executor: claude`, sem `paths_autorizados`: três gatilhos de lei do §5 (auditoria, schema com peso
legal, `generated.ts`) e quatro pontos que fecham por prova de mutação.

### Execução — 2026-08-12, via Subagent-Driven Development

O João escolheu **SDD (subagentes)** quando o `/executar-bloco` levantou o conflito entre a
prioridade do comando e a configuração de sessão. Cada task virou um agente implementador isolado
(brief extraído do plano, report próprio) seguido de um agente revisor dedicado. As seis tasks com
código fecharam **todas Approved**; a sétima é gate, sem commit.

- **Task 1** (`9ba3615`) — `App\Shared\Audit\PivotAudit` como fonte única da escrita de pivot
  auditada, comparando antes de delegar (D12).
- **Task 2** (`e67cbf4`) — os cinco call-sites convertidos, nas duas portas (`turma_redator` e
  `course_redator`).
- **Task 3** (`5ed6ed9`) — guarda estática: escrita crua de pivot em `app/` reprova, com allowlist
  de exatamente um arquivo.
- **Task 4** (`673cb25`) — migration `UNIQUE(course_id, version)` em `course_certificate_templates`.
- **Task 5** (`4aa077b`) — `CreateCertificateTemplateAction` derivando `MAX(version)+1` sob
  `lockForUpdate` com `withTrashed()`, `version` fora do `$fillable`, DTO em `int|Optional` e
  `generated.ts` regenerado.
- **Task 6** (`4586e6f`) — `assertAcademicallyWritable()` nos onze caminhos, nome e mensagem
  **verbatim**.
- **Task 7** — gate, verificação pura.

**Dois vermelhos de audit não discriminavam, e um deles teria passado falso.** As contagens literais
do brief incluíam a linha `created` que a própria fixture grava (`makeCourse()`, `Turma::create()`).
Na Task 1 isso reprovou o teste bom (`Failed asserting that 2 is identical to 1`); na Task 2 o
`assertSame(1, …)` **casava com a linha `created`** e passava contra o código velho. Corrigido nos
**testes**, filtrando por evento — `PivotAudit.php` não foi tocado para caber em asserção.

**Um vermelho da Task 5 não era o esperado.** Entre as 90 falhas do Step 8, 89 eram o
`NOT NULL constraint failed: course_certificate_templates.version` previsto; a de
`test_derivacao_conta_os_arquivados` era 422 do `required` pré-existente sobre `layout_config => []`.
Corrigido o **payload do teste**, não a regra de validação — afrouxar `required` seria mudança de
contrato não pedida.

**Gate (Task 7):** backend **569 passed, 5 skipped (2092 assertions)** — exatamente a projeção do
plano (548+21). Frontend 27 arquivos/131 testes, lint limpo, build verde; o diff de `frontend/`
contra a `main` são **só** os dois arquivos gerados, conferido — os 17/86 do registro anterior são do
gate do `last-login`, antes de merges posteriores na main. Pint `passed` nos 33 `.php` do bloco;
`typescript:transform` regenera com diff **zero**.

**E2E contra a API real: 7/7**, com sessão Sanctum viva. `version: 99` no payload produziu **3**;
MySQL recusou o par repetido (`Duplicate entry '8-90'`); designação real gravou audit com
`new_values` populado e a repetida gravou **zero** linhas (D12 provada onde precisa valer); D13
confirmada com os dois `auditable_type`; os quatro caminhos da RN-15 devolveram 422 +
`application/problem+json` + mensagem exata, sem mutar nada. Dois casos além do brief foram escritos
porque o status sozinho não provaria a afirmação: designar redator **já anexado** (se o gate rodasse
depois do `PivotAudit`, o diff vazio curto-circuitaria para 200) e redator **não habilitado**.

**Mutação declarada no banco de dev**, append-only e nomeada no ledger (course 8, budget 7, quote 9,
turma 5 criada para o gate, templates, dois `course_redator`, um `turma_redator`, files 20-22,
audits 460-481). **Nenhuma turma semeada foi concluída, apagada ou tocada.** Uma única linha
pré-existente mudou, aditiva e reversível: `course_ids` do redator 2 de `[2,3]` para `[2,3,8]`.
`LOT-2026-1001` reconferido corrompido, intocado. Nenhum `migrate:fresh`, `refresh`, `reset` ou
seeder rodou.

**O que o gate NÃO provou, sem maquiagem:** a derivação não tem prova de concorrência MySQL (D16,
escolha declarada — `lockForUpdate` é no-op em SQLite, onde a suíte roda, e o `unique` é a defesa de
integridade); 7 dos 11 caminhos da RN-15 só foram exercitados em SQLite; a cadeia
template → certificado não foi percorrida ponta a ponta, então "o resolver escolhe o template certo"
segue não provado; nenhuma tela vista renderizada (bloco de backend); **sem backfill (D2)** — o
rastro dos dois pivots começa aqui e o passado não é recuperável; a retenção de `audits` segue aberta
(P-02/P-30) e este bloco aumenta o volume.

### Achados abertos, para triagem do review — 2026-08-12

Os reviews de task fecharam Approved; estes seis ficaram registrados no ledger como Minor ou como
achado do próprio gate, e **nenhum foi corrigido**. Entram no `/revisar-sprint` como entrada, não
como pendência resolvida.

1. **Achado do gate, o mais grave da lista:** a audit de `sync` registra o **delta, não o conjunto**.
   O redator 2 já tinha os cursos 2 e 3 e `old_values` veio `{"courses":[]}` — o **estado** anterior
   não é reconstruível a partir da `audits`. Numa tabela de peso legal, é o que este bloco existia
   para consertar e consertou pela metade.
2. `HabilitacaoTest.php:267-284` —
   `test_edicao_de_redator_sem_mudar_curso_nao_grava_audit_de_sync` **não discrimina**: `sync()` cru
   também não grava audit, então ele passa contra os dois códigos. Texto veio verbatim do plano; a
   D12 está provada de fato em `PivotAuditTest` e no e2e.
3. `PersistenceLawsTest` — a regex da guarda nova não tem o modificador `i`, e o dispatch de método
   em PHP é case-insensitive: `->Attach(` passaria. A guarda irmã do mesmo arquivo tem a mesma
   lacuna, então é estilo da casa, não defeito novo.
4. `tests/Support/CreatesCertificateTemplates.php:19-24` — engole chave desconhecida em silêncio;
   um `makeTemplate($id, ['validityMonths' => 24])` futuro gravaria o default e o teste passaria
   contra o default. Nenhum chamador atual está errado.
5. `CreateQuoteAction` ainda escreve `seq_in_budget` por mass assignment enquanto este bloco tirou
   `version` do `$fillable` — os dois consumidores do mesmo padrão do ADR-17 passam a defender a
   coluna derivada em profundidades diferentes.
6. Duas dívidas pré-existentes achadas e deliberadamente não corrigidas: validação `required` sobre
   o `redator_ids` read-only, e ~80 avisos de `Optional` no `typescript:transform`.

**Dois erros de ponteiro na spec, conferidos por mim no código, que não são defeito de código:** a
D14 afirma que **dois** testes congelam a string da RN-15, mas `IssueCertificateTest:107` afirma a
mensagem da **RN-08** (outro gate, condição oposta) — só o `EnrollmentResultTest:151` congela a
RN-15; e a spec justifica a troca de chave `status` → `turma` citando `FormErrorSummary.tsx:62-67`,
**arquivo que não existe** no repositório (a spec arquivada não foi corrigida — D9 do BD-4 proíbe
reescrever artefato fechado). A conclusão da spec sobrevive pelo mecanismo real:
`useMutationErrors` (`frontend/src/shared/hooks/useEntityForm.ts:54-63`) cai no primeiro valor do
mapa **independentemente da chave**, e `useConclusionSection.ts:15` consome esse `message`.

Ledger fino task-a-task em `.superpowers/sdd/progress.md` (local, não versionado).

**Estado: `ready_for_review`.** O review final de branch inteira **não foi rodado** — o João recusou
o despacho. Este comando não inicia review; a próxima instrução dele aciona `/revisar-sprint` sobre
o trabalho ativo, com a lista de seis achados acima como entrada.

### Review de sprint — 2026-08-12: ALTO risco, duas lentes, 6 achados

**ALTO RISCO pelo gate da skill, e a escala da spec (§5) concorda:** schema (índice novo),
auditoria/peso legal e `generated.ts`. Duas lentes — Claude com o gabarito do projeto mais revisão
independente do Codex (read-only, `mcp__codex__codex`, `model_reasoning_effort: high`).

**Gate reproduzido, não herdado do relatório de execução:** backend **569 passed, 5 skipped (2092
assertions)**; frontend **27 arquivos / 131 testes**, `pnpm lint` limpo e `pnpm build` verde; Pint
`{"tool":"pint","result":"passed"}` nos 33 `.php` do bloco; `typescript:transform` **sem diff**
(`git status --porcelain frontend/` vazio depois de rodar); nenhuma sonda `dd(`/`dump(`/
`console.log`/`SONDA` no diff de `backend/app` e `frontend/src`.

**Órfãos: zero.** `PivotAudit` tem os cinco call-sites previstos; `CreateCertificateTemplateAction`
tem os três (controller, `CreateCourseAction`, `UpdateCourseAction`); `CreatesCertificateTemplates`
é usada por cinco arquivos de teste; `assertAcademicallyWritable()` é chamada por **onze** Actions,
conferido por grep.

**Dois achados foram provados por sonda, não por leitura** (lição 10), com o controle rodado nos
dois sentidos e a árvore restaurada em seguida (`git status --porcelain` limpo).

**Os seis achados:**

1. **Q-1 🟡** *(Claude)* — a guarda nova do `PersistenceLawsTest` é **cega para a forma maiúscula**:
   o regex não tem `i` e o dispatch de método em PHP é case-insensitive. Sonda: um arquivo em
   `app/Shared/Audit/` com `->Sync([1, 2])` faz o caso **passar**; a mesma linha em minúscula o faz
   **reprovar**. E a varredura cobre só `app/`, enquanto a guarda irmã do mesmo arquivo varre
   `app/` **e** `database/` — correção feita no review de 2026-08-11 (Q-3) pelo argumento de que a
   lei não tem escopo. Medido: `database/` tem **zero** escrita de pivot hoje, então ampliar mantém
   verde. O docblock da guarda irmã escreve que "guarda que promete cobrir uma forma e não cobre é o
   defeito que este bloco existe para não repetir" — pelo gabarito (§lição institucionalizada) o
   argumento é de 🔴; fica 🟡 porque a forma que escapa (`->Sync(`) ninguém escreve.
2. **Q-2 🟡** *(Claude + gate)* — a audit de pivot grava o **delta, não o conjunto**.
   `PivotAudit` delega ao `auditSync`, e `Auditable::dispatchRelationAuditEvent`
   (`vendor/owen-it/laravel-auditing/src/Auditable.php:827-829`) grava `old->diff(new)` e
   `new->diff(old)`. Conferido no fonte do pacote, não presumido. Consequência: numa habilitação que
   só acrescenta, `old_values` vem `{"courses":[]}` e o estado anterior **não é reconstruível** a
   partir da linha; e com a D2 (sem backfill) também não é pela soma das linhas, porque o ponto de
   partida dos pivots que já existiam nunca foi gravado. Corrigir exige **não** usar o `auditSync`
   (o pacote calcula o diff dentro de método privado) — custo M/G, decisão do João.
3. **Q-3 🟢** *(Codex, verificado)* — pivot e audit **não são atômicos** nos três call-sites sem
   transação externa (`DesignateRedatorAction`, `RemoveRedatorAction`, `CourseRedatorController`):
   o pacote grava o pivot e só depois dispara o `AuditCustom`, então falha na escrita da audit deixa
   o pivot mudado sem rastro. Os dois de `Identity` já correm dentro de transação. Correção
   proporcional: `DB::transaction` dentro do próprio helper (aninha sem efeito nos dois que já têm).
4. **Q-4 🟢** *(Claude)* — `HabilitacaoTest.php:267-284`
   (`test_edicao_de_redator_sem_mudar_curso_nao_grava_audit_de_sync`) **não discrimina** o mutante
   que mais importa. Sonda: devolvendo `->courses()->sync()` cru ao `UpdateRedatorAction:67`, o caso
   **passa** (2 assertions), enquanto o irmão `test_habilitacao_pelo_lado_do_redator_grava_audit_no_redator`
   **reprova**. Ele guarda a remoção da comparação (D12), não a remoção do helper. Correção P: no
   mesmo caso, um PUT que **muda** os cursos primeiro (1 audit) e o PUT idêntico depois (segue 1).
5. **Q-5 🟢** *(Claude)* — `tests/Support/CreatesCertificateTemplates.php:19-24` engole chave
   desconhecida em silêncio: `makeTemplate($id, ['validityMonths' => 24])` gravaria o default e o
   teste passaria contra o default. É a classe do `IssuableEnrollmentBuilder` (rule
   `backend-ddd.md` §Testes). Nenhum chamador atual está errado.
6. **Q-6 🟢** *(Claude)* — o gate pergunta `status === Concluida`, e as quatro grafias inline que ele
   substituiu perguntavam `status !== EmAndamento`. Hoje é a mesma condição (o `TurmaStatus` tem
   exatamente dois casos, conferido), mas a forma passou de fail-closed para **fail-open**: um
   terceiro estado futuro (`cancelada`) abriria os onze caminhos sem ninguém ver. A forma é anterior
   ao bloco (D14 congelou o método verbatim); o que o bloco fez foi estendê-la a mais quatro
   caminhos.

**Achados do Codex recusados, com a razão:**

- *"`lockForUpdate()` não cria mutex confiável quando ainda não há template — duas primeiras
  criações derivam versão 1 e uma termina em 500"* — em InnoDB/REPEATABLE READ o `SELECT … FOR
  UPDATE` com `where course_id = X` toma gap lock no índice, então a segunda transação bloqueia em
  vez de correr; e, mesmo se corresse, a **D16 declara exatamente essa degradação** ("aqui o
  `unique` é a defesa de integridade: sem lock a corrida vira 500, não duplicata"). Decisão
  consciente registrada não é achado.
- *"o gate lê o status sem travar a turma — corrida entre check e escrita"* — TOCTOU real em tese,
  mas a forma do `assertAcademicallyWritable()` é **anterior** ao bloco (D14 a congelou) e exigiria
  conclusão simultânea a uma escrita, com ~10 usuários internos e concorrência declarada baixa no
  `CLAUDE.md`. Não é defeito introduzido aqui; fica como nota, não como achado.

**Triagem do João — 2026-08-13: "aprovado de Q-1 à Q-6".** Os seis entraram; nenhum foi deferido.

### Correção dos achados — 2026-08-13

Cada correção foi provada por sonda, com a árvore restaurada em seguida (`git status` limpo entre
elas). O que a sonda mostrou, e não o que o código parecia dizer:

- **Q-1** — regex com `i` e varredura de `app/` **e** `database/` em `PersistenceLawsTest:145`.
  Duas sondas ao mesmo tempo (`app/Shared/Audit/SondaCaixa.php` com `->Sync([1,2])` e
  `database/seeders/SondaEscopo.php` com `->attach(1)`): a guarda corrigida reprova nomeando as
  duas; a guarda anterior, com as MESMAS sondas no lugar, passa verde.
- **Q-2** — `PivotAudit` deixou de delegar ao `auditSync` e passou a montar o `AuditCustom` à mão,
  com o CONJUNTO dos dois lados lido do banco antes e depois da escrita. Sonda: com o payload de
  volta na forma do delta, os três casos novos de conjunto reprovam e os dois casos de no-op (D12)
  seguem verdes — eles medem coisa diferente.
- **Q-3** — escrita e audit na mesma `DB::transaction`, dentro do helper: cobre os cinco call-sites
  de uma vez, e quem já abria transação (as duas Actions de redator) só ganha savepoint.
- **Q-4** — `HabilitacaoTest` passou a fazer duas edições, a segunda idêntica à primeira. Sonda:
  com `$redator->courses()->sync(...)` cru de volta na Action, o caso reprova (antes passava).
- **Q-5** — `makeTemplate()` estoura `InvalidArgumentException` em chave desconhecida.
- **Q-6** — o gate voltou à forma fail-closed `!== EmAndamento`. Sonda: com um terceiro caso no
  `TurmaStatus` (`cancelada`), a forma `=== Concluida` deixa a escrita acadêmica passar e a forma
  corrigida recusa. `TurmaCrudTest` ganhou uma guarda que varre `TurmaStatus::cases()`, então o
  status que alguém acrescentar amanhã cai nela sozinho.

**A Q-6 revelou um buraco anterior a ela, e é o achado desta rodada:** `Turma::create([...])` sem
`status` deixa a instância em memória com `status` NULO — o default `em_andamento` é do INSERT, não
do objeto. Enquanto o gate perguntava `=== Concluida`, esse nulo passava batido; com o fail-closed,
**sete casos da suíte reprovaram**, nenhum deles falando de conclusão. Corrigido no model
(`protected $attributes = ['status' => 'em_andamento']`), com guarda própria em `TurmaCrudTest`. A
forma antiga não estava só latente: escondia um caminho em que a RN-15 já não valia.

`.claude/rules/migrations.md` dizia "Pivot não audita sozinho: use `auditSync`" — a Q-2 tornou a
linha falsa e ela é carregada por quem tocar em schema. Reescrita apontando para o `PivotAudit`,
com a razão (delta vs. conjunto) junto.

**Gate reproduzido após as correções:** backend **573 passed, 5 skipped (2104 assertions)** — os 569
anteriores mais os quatro casos novos; Pint `passed` nos 7 arquivos tocados; `typescript:transform`
sem diff (nenhum DTO mudou); frontend intocado nesta rodada, então lint/build seguem valendo da
medição de 12-08.

**Estado: `ready_for_closure`.** O fechamento não roda sozinho — é chamada do João.

### Fechamento — 2026-08-13

**As correções do review estavam no working tree, não commitadas** — o último commit da branch era o
handoff para review (`bcac2d5`). O fechamento começou por commitá-las (`bd769f8`), que passa a ser o
`state_basis_commit`; a árvore ficou limpa antes de qualquer arquivamento.

**O item 0 foi refeito contra a API real, não herdado do review** — as correções entraram depois do
e2e de execução e mexeram exatamente no que ele mediu (helper, gate e model). Sessão Sanctum por
cookie + CSRF, `Origin` e `Accept` nos dois lados.

**O conjunto provado nas três portas, com o `auditable_type` do model tocado (D13):** designar o
redator 3 na turma 4 gravou `old {"redatores":[1]}` → `new [1,3]` (com o `auditSync` o `old` viria
`[]`, que é o defeito da Q-2); o `detach` gravou `[1,3]` → `[1]`; a habilitação pelo lado do curso
gravou em `course` (`[1,3,4]` → `[1,3,4,6]`); e o `PUT /api/redatores/2` gravou em `redator`
(`[2,3,8]` → `[1,2,3,8]`) **de dentro da transação externa da Action** — o savepoint da Q-3 não
quebrou o caminho. **As três repetições idênticas gravaram zero linha** (D12). Os pivots tocados
foram devolvidos ao estado original.

**A derivação foi discriminada, não só exercitada:** `version: 99` no payload produziu **92**; e o
`withTrashed()` foi medido arquivando a v92 e criando de novo — deu **93**, quando sem ele daria 92
e o `unique` estouraria. `INSERT` direto do par repetido recusado pelo banco
(`Duplicate entry '8-92'`).

**Seis caminhos da RN-15** em turma concluída devolveram **422 `application/problem+json`** com a
mensagem exata sob a chave `turma` (designar, `DELETE` da turma, `PUT` da turma, matricular, remover
matrícula e resultado acadêmico). O sétimo tentado, a importação, para na validação de `file` antes
do gate. **E o fail-closed não fechou o caminho normal:** a turma 6, criada da cotação 1 no próprio
gate, aceitou designação, matrícula e remoção de matrícula.

**Placar:** backend **573 passed, 5 skipped (2104 assertions)**; frontend **`pnpm lint` limpo e
`pnpm build` verde**; Pint `{"tool":"pint","result":"passed"}` nos **33** `.php` do bloco;
`typescript:transform` **sem diff** em `generated.ts`; nenhuma sonda no diff; órfãos zero
(`PivotAudit` com cinco call-sites, `assertAcademicallyWritable()` em onze Actions,
`CreatesCertificateTemplates` em cinco testes, `CreateCertificateTemplateAction` nos três caminhos);
resíduo de `auditSync` só em comentário.

**Mutação declarada no banco de dev**, append-only: turma 6, templates 9 e 11 (v92 arquivado, v93
vivo), audits 482-497 e um aluno de gate. `LOT-2026-1001` segue corrompido de propósito, intocado.

**Duas decisões do João no gate**, nenhuma default: a segunda `P-30` — a do `ámbar-aviso`, que veio
da branch de estilização e colidiu com a retenção de `login_logs` sem o merge acusar — seria
**renumerada para P-33**; e das três coisas abertas oferecidas para registro, só a assimetria do
`seq_in_budget` entrou, como **P-34**. O backfill (D2) e os avisos de `Optional` do
`typescript:transform` ficam sem linha própria por decisão dele.

**A primeira dessas duas foi desfeita pelo merge da `main`, e o parágrafo acima fica como está
porque história não se reescreve.** O fechamento do BD-3 já tinha resolvido o mesmo `P-30` duplicado
**pelo critério oposto** — quem renumera é a linha que chegou à `main` por último, então quem virou
`P-33` foi a retenção de `login_logs`, e o `ámbar-aviso` **ficou com o P-30**. Aquela decisão foi
publicada na `main` (PR #43) antes desta branch mesclar; esta ainda não tinha saído. Reverter a
publicada quebraria as referências que já vivem lá, então **a da `main` prevalece**: a renumeração
deste fechamento foi desfeita e a pendência nova do `seq_in_budget` passou de `P-34` — número que a
`main` já tinha dado à lacuna de alcance da catraca `COR_HARDCODED` — para **P-35**.

**O que o fechamento NÃO provou, sem maquiagem:** a derivação segue sem prova de concorrência MySQL
(D16, escolha declarada); 5 dos 11 caminhos da RN-15 só foram exercitados em SQLite; a cadeia
template → certificado não foi percorrida ponta a ponta; nenhuma tela vista renderizada; e **sem
backfill** — o rastro dos dois pivots começa aqui.

**Estado:** `idle`. Nada foi promovido — a escolha do próximo item é do João, no `backlog.md`.
