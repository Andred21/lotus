---
schema_version: 1
active_feature: null
active_work_item: null
workflow_state: idle
next_owner: joao
next_action: select_backlog_item
resume_state: null
active_spec: null
active_plan: null
context_packet: null
blocker: null
last_completed_work_item: login-fora-do-adr16
state_basis_commit: 024673a
updated_at: 2026-08-13T19:20:00-03:00
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

## Último item fechado — 2026-08-13 (`login-fora-do-adr16`, item 4 de "Próximos blocos")

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

Spec em `docs/superpowers/specs/archive/2026-08-13-login-fora-do-adr16-design.md`. As **D1–D8** vêm fechadas
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
`docs/superpowers/plans/archive/2026-08-13-login-fora-do-adr16.md`: **dez tasks**, uma por commit, na ordem
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

### Execução — 2026-08-13: início

`/executar-bloco login-fora-do-adr16` (arg recebido com typo, `login-fora-do-adr1`, confirmado com o
João antes de prosseguir) validou as âncoras (spec, plano, `context_packet` `null` coerente com a
ausência medida em §1.1, Git limpo em `8391a6a`, sem divergência) e abriu o gate main tree/worktree:
a decisão de main tree já estava tomada em `state.md` (exceção declarada de dois `active_work_item`,
§"Árvores trocadas"), então nenhuma worktree nova foi criada.

**Mesmo conflito do BD-4 e do `rastro-unicidade-e-gates` reapareceu, e foi resolvido do mesmo jeito:**
o plano recomenda `subagent-driven-development`; a sessão tem regra de não chamar o Agent tool sem
pedido. Escalado ao João via pergunta direta — **subagent-driven-development**, com Agent tool
autorizado para este bloco.

Pre-flight scan do plano (10 tasks contra os Global Constraints e a spec): limpo, sem conflito novo —
a sonda da Task 8 (reintroduz `text-slate-800` de propósito, reverte, confere árvore limpa) é
mecanismo de prova nos dois sentidos, não teste vazio.

Ledger local reiniciado em `.superpowers/sdd/progress.md` (o anterior era do `contrato-de-entrada-identidade-e-nested`, já fechado).

**Estado:** `executing`.

### Execução — 2026-08-13: gate final bloqueado

As Tasks 1-9 fecharam por `subagent-driven-development` (implementador + revisor por task, ledger em
`.superpowers/sdd/progress.md`), com dois desvios registrados no ledger: uma regressão de teste
(`brand-ink.test.ts`, comentário da Task 1 com `${BRAND_COLOR}` literal quebrando a regex do teste,
corrigida em commit próprio `4c7a658`) e um Critical do review da Task 7 (painel de marca mobile
cortando o topo do logo e a legenda de setor inteira, corrigido em `2173681`, altura do `aside` de
250px pra 270px). Nenhuma das duas foi decisão heurística — as duas foram medidas, corrigidas e
reverificadas antes de seguir.

**A Task 10 (gate final, D12) bloqueou no Step 5.** A skill `lotus-ui-review` (e o comando legado
`/revisar-ui`) tem `disable-model-invocation: true` — não pode ser chamada por agente nenhum, só por
invocação explícita do humano na sessão interativa. A checagem visual bloqueante (3 viewports × 2
temas) não foi medida. Stack está de pé (`docker compose up -d` + `pnpm dev` em background,
`localhost:5173/login` respondendo 200) esperando o João rodar `/lotus-ui-review
http://localhost:5173/login` ele mesmo. Steps 1-4 e 6-7 do gate passaram (detalhe completo, inclusive
a ressalva não-bloqueante do Step 4 — dois greps de higiene batendo só em comentário histórico, não
em código vivo — em `.superpowers/sdd/progress.md`, seção "Task 10 — gate final").

**Achado à parte:** a sobreposição com o BD-5 (`usecrudform-mais-fundo`, worktree `fix-frontend`)
que este `state.md` já registrava (§"Árvores trocadas", `AppPassword.tsx`/`StaffIdentifyFields` como
ponto de interferência comportamental) é contexto relevante de que há uma segunda sessão ativa na
mesma área — `AppPassword.tsx` apareceu revertido no working tree (não commitado) por duas vezes
durante a execução, sempre limpo com `git checkout --` antes de qualquer commit deste bloco. Nenhum
commit foi afetado; fica registrado para o João avaliar a causa, não é bloqueio do bloco.

**Estado:** `blocked`. `blocker`: Task 10 Step 5 exige `/lotus-ui-review` ou `/revisar-ui` rodado
pelo João na sessão interativa. `resume_state`: `executing` (retomar `continue_active_plan` — só
fechar a Task 10 e seguir pro review de branch inteira — assim que o Step 5 for medido).

### Execução — 2026-08-13: gate desbloqueado, 4 achados corrigidos, branch revisada

**O João rodou `/lotus-ui-review http://localhost:5173/login` ele mesmo**, que era o único caminho —
a skill tem `disable-model-invocation: true`. O bloqueio saiu por execução, não por decisão. Run em
`.artifacts/ui-review/2026-08-13T16-51-39-loginpage-fora-adr16/` (report.txt, 11 PNGs, 2 snapshots).
Playwright com `--browser=chromium`: o canal `chrome` não existe neste host, e trocar o binário do
Chromium é escolha de mecanismo permitida — a skill proíbe trocar de **ferramenta**.

**Steps 1-4 reproduzidos no gate, não herdados:** lint exit 0, build verde, **29 arquivos / 143
testes**; `git diff main...HEAD -- backend/ generated.ts` com **zero arquivo**, que é o que torna
backend/Pint/`typescript:transform` N/A por escopo medido; catraca provada **nos dois sentidos**
(`text-slate-800` reintroduzido no `<h1>` faz o lint reprovar nomeando arquivo e linha, árvore volta
limpa); greps de higiene batendo **só em comentário histórico**, a mesma ressalva não-bloqueante de
antes e a forma exata do P-36.

**Step 5 — as 8 afirmações do plano, todas medidas no navegador nas 3 viewports × 2 temas:** sem
overflow nas seis combinações; contrastes lidos da tela (tagline **9,84:1**, versão 8,02:1, setor
6,23:1, secundário 4,76:1 claro / 6,21:1 escuro) batendo com a projeção da spec; `LogoDark` nos dois
temas; divisa `border-left` 1px escuro / 0px claro a 1440 e `border-top` equivalente a 390;
`AppearanceControls.bottom` 358,4 ≤ `h1.top` 398,5 a 390; olho em `Mostrar`/`Ocultar contraseña` com
`lang=es-CL`; `username` + `current-password` no DOM; **seis** paradas de Tab com anel visível.

**A revisão achou 4 defeitos que as 8 afirmações não cobriam, e o João mandou corrigir os quatro** —
Step 7 do plano em ação (gate que reprova vira commit próprio antes do review). Um commit por
achado, cada um remedido no navegador:

1. **UI-01 (`ebd0258`)** — o campo de senha **nunca preenchia o container**: 316px contra os 384px
   do e-mail e do botão, as três bordas direitas desalinhadas em toda viewport acima de ~316px. O
   `w-full` do `inputClassName` não alcança o IconField que o Password renderiza por dentro com
   `toggleMask` (`password.cjs.js:737`), e esse nó mede por conteúdo. Vai pelo `pt`, na chave
   `iconField.root` — **não** `iconField.className`, porque o Prime passa `ptm('iconField')` como o
   *pt* do filho, não como props. Medido: 384/384, 326/326 e 256/256, sem overflow.
2. **UI-02 (`21c2c3c`)** — no escuro os dois campos irmãos vinham de famílias diferentes: e-mail
   `rgb(11,18,32)`/`rgb(51,65,85)` da folha de tema, senha `rgb(30,41,59)`/`rgba(255,255,255,0.1)`
   das utilities `dark:` do wrapper. O docblock do `AppInputText` já mandava não empilhar `dark:`
   (ADR-16). As seis utilities saíram; os campos agora batem nos dois temas.
3. **UI-03 (`5e005f1`)** — o `<label>` embrulhava o campo e o olho tem `aria-label` próprio, então o
   nome acessível era "Password  Show password". Trocado por `htmlFor`/`id` (com `inputId` no
   `AppPassword`, porque o `id` cru pousaria no wrapper).
4. **UI-04 (`c3a8f80`)** — o olho era `role="switch"` com `aria-checked` **invertido** (o Prime crava
   `'true'` no showIcon; `password.cjs.js:600-615`), anunciando "Mostrar contraseña, ativado" com a
   senha escondida. Corrigido **pelo papel** — controle cujo nome muda a cada clique é botão —, o
   que mantém de pé os dois rótulos que a spec decidiu a partir da API instalada.

**Uma observação declarada como NÃO introduzida pelo bloco, provada por sonda:** acionar o olho por
teclado devolve o foco ao `<body>`, porque o Prime troca o elemento do ícone e o React remonta.
Idêntico antes e depois da UI-04, medido guardando a mudança no stash.

**Review de branch inteira (`main...HEAD`, 13 arquivos): um achado, verificado à mão antes de agir.**
A correção da UI-03 fechou o login e deixou o **segundo** call site aberto — `FormField` embrulha o
controle em `<label className="block">` sem `htmlFor` (`FormField.tsx:34-36`), então o olho segue
somando no nome do campo dentro do `StaffUserDialog`. **Virou P-37, não commit de código, pelo
precedente exato da D10/P-36:** `FormField` é o kit de form inteiro e está sob reescrita ativa do
BD-5 na worktree `fix-frontend`. O bloco **piorou a forma e não criou o defeito** — antes da Task 6
o olho já concatenava, em inglês. O resto da branch o review confirmou correto por verificação
independente, inclusive que o `aria-checked: undefined` sobrevive ao `mergeProps` do Prime e que
`h-67.5`/`w-17` saem no CSS construído.

**O que o bloco NÃO provou, sem maquiagem:** nenhum teste automatizado cobre a aparência do login
(PrimeReact no jsdom está fora do corte do runner), então a única guarda permanente é a catraca da
Task 8 — que nem enxerga `style={{…}}`, o P-36; a não-regressão do `AppPassword` no `StaffUserDialog`
é **inferência**, não medição, porque o segundo call site vive atrás do login e a revisão é read-only
sem credencial; os estados de erro do login (credencial inválida, erro de campo, `loading`) seguem
não vistos, porque alcançá-los exige submeter credencial e a skill proíbe fabricá-los por mock.

Gate final depois dos cinco commits: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **29
arquivos / 143 testes** — o baseline exato, como o plano projetou.

**Estado:** `ready_for_review`. A próxima instrução aciona `/revisar-sprint`; este comando não a
inicia sozinho.

### Review de sprint — 2026-08-13: BAIXO risco, uma lente, 3 achados

**BAIXO pelo gate binário da skill:** zero schema, `generated.ts`, Sanctum, auditoria, RBAC,
dinheiro escrito ou documento legal gerado; `executor: claude`. A spec §9 declara o mesmo BAIXO —
sem divergência a mostrar. **Só lente Claude, sem Codex.**

**Gate reproduzido, não herdado do relatório de execução:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **29 arquivos / 143 testes** (o baseline exato, como o plano projetou); as três locales
com **545 chaves cada**; `git diff main...HEAD -- backend/ generated.ts` com **zero arquivo**, o que
mantém backend/Pint/`typescript:transform` N/A por escopo medido; os três arquivos de código abaixo
da régua de 150 (`LoginForm` 86, `LoginPage` 56, `AppPassword` 83); higiene limpa (zero
`console.log`/`debugger`/`1b7fb8`/`w-96` em código vivo).

**A catraca foi provada nos dois sentidos (lição 10), não por lint verde:** `text-slate-800`
reintroduzido no `<p>` do subtítulo faz o lint reprovar em
`LoginForm.tsx:35:22` com `Cor Tailwind hardcoded: Tailwind é layout, cor vem de variável do tema
(ADR-16).`; árvore restaurada e lint de volta a 0.

**Órfãos: zero, conferido por grep.** `--brand-gradient` tem exatamente um consumidor
(`LoginPage.tsx:19`); `BRAND_COLOR` continua vivo em `FormSection.tsx:19` e `CoursesTable.tsx:43`, e
portanto não virou export morto ao sair do login; `common.showPassword`/`hidePassword` são lidas só
pelo wrapper, que é a porta única por desenho; a constante `darkInput` saiu sem deixar consumidor.

**Duas afirmações do bloco foram verificadas na fonte instalada, não aceitas do relatório:**
o `aria-checked: undefined` sobrevive de fato ao `mergeProps` (a função faz `merged[key] = value`
iterando as chaves do objeto de `pt`, então a chave explícita apaga o `'true'` do Prime); e o
`role="button"` não quebra teclado, porque `onToggleMaskKeyDown` (`password.cjs.js:588`) já trata
`Enter` **e** `Space`, que é exatamente o contrato do papel de botão. `h-67.5` e `w-17` materializam
no CSS construído como `calc(var(--spacing) * 67.5)` = 270px e `* 17` = 68px. A escala `--primary-*`
é idêntica nas duas folhas para os quatro degraus que a tela usa (200/300/400/900).

**Os três achados:**

1. **Q-1 🟡 M** — `LoginPage.tsx:16,19`: a faixa de marca mobile tem **altura fixa com
   `overflow-hidden`**, então ela absorve o conteúdo em vez de crescer — e o preço foi pago no
   wordmark, que caiu de 208px (desktop) para **68px** no telefone. Medido no asset (335×466, banda
   do "LOTUS" com 54px e a sub-linha com 23px): a 68px o wordmark tem **11,0px** de altura e a
   sub-linha **4,7px**; a 208px são 33,5px e 14,3px. A causa raiz está escrita no corpo do próprio
   commit `2173681` — o Preflight do Tailwind está desligado (`index.css:7,10`), então cada `<p>` do
   painel carrega 1em de margem de agente de usuário que não colapsa com o `gap` do flex — e **não
   foi removida**: o fix comprou espaço encolhendo a marca. Duas consequências: o `gap-1` do aside
   virou decoração (quem espaça são as margens de UA), e sob zoom de texto o conteúdo volta a cortar,
   que é o defeito Critical que a Task 7 já corrigiu uma vez neste bloco.
2. **Q-2 🟡 P** — `LoginForm.tsx:47-54,64-72`: a UI-03 trocou o `<label>` que embrulhava o campo por
   `htmlFor`/`id` e, com isso, o `<small>` do erro de campo **perdeu a única associação que tinha**.
   O Prime não escreve `aria-invalid` (zero ocorrência em `inputtext.cjs.js`) — `invalid` só pinta
   `.p-invalid` —, então um 422 em `email`/`password` (vivo por `useLoginForm.ts:21`) fica sem
   `aria-describedby` e sem estado: aparece na tela e não existe para leitor de tela. O
   `generalError` não tem o problema, porque o `FormErrorBanner` é `role="alert"`. **O que torna
   isto mecanismo e não acabamento:** a P-37 aponta `LoginForm.tsx:40-70` como "o molde já existe e
   está medido" para consertar o `FormField`, e o embrulho em `<label>` é justamente o que hoje faz
   o `error` do kit ser anunciado (`FormField.tsx:34-46`) — copiar o molde como está tiraria a
   associação de erro de **todo** diálogo do sistema.
3. **Q-3 🟢 P** — `AppPassword.tsx:47-56`: `pt={{ ...pt, ...ariaPt }}` sobrescreve **chaves
   inteiras** do chamador. Pinar depois do spread é o padrão da rule ("pine o override após o
   spread"), mas a granularidade está errada: quem passar `pt.showIcon`, `pt.hideIcon` ou
   `pt.iconField` perde `className`/`style`/handlers junto, em silêncio. Latente — nenhum dos 2 call
   sites passa `pt` hoje —, e o custo de fundir por chave é de minutos.

**O que NÃO virou achado, e por quê:** decisão registrada não é achado — a lacuna da catraca de cor
(P-36), o nome acessível do `FormField` (P-37), a ausência de teste de componente sobre a aparência
do login e a não-regressão do `AppPassword` no `StaffUserDialog` como inferência já estão escritas
como débito declarado. A remoção do `darkInput` foi conferida contra o irmão: o `AppInputText`
também não empilha `dark:`, e o docblock dele manda não empilhar — os dois wrappers ficaram
simétricos, não divergentes.

**Veredito: o bloco está bom.** Vinte e um commits, o gate reproduzido nos números do baseline,
nenhuma lei §5 tocada, nenhuma utility de cor sobrevivendo nos dois arquivos que saíram da catraca.
Os três achados são um de causa-raiz não paga (Q-1), um de mecanismo que vai infectar a P-37 se não
for escrito agora (Q-2) e um de granularidade de merge (Q-3); nenhum é de correção de dado.

**Estado:** `blocked`, `next_action: approve_review_findings`. Só achado aprovado pelo João vira
commit; depois o estado volta a `reviewing` e as checagens pertinentes se repetem.

### Correção dos achados — 2026-08-13: os 3 aprovados, um commit cada

**O João aprovou os três** ("resolva os 3"). Nenhum outro trabalho entrou junto.

**Q-1 (`221f8fb`)** — a causa raiz foi paga onde ela mora: `my-0` nos dois `<p>` do painel mata a
margem de 1em do user-agent que o Preflight desligado deixa de pé, o `aside` virou `min-h-67.5`
(cresce por conteúdo em vez de cortar), o `overflow-hidden` **saiu** (estouro futuro tem que
aparecer) e o wordmark voltou a 150px (`w-37.5 md:w-52`). O badge de versão entra no fluxo no mobile
(`mt-2 md:absolute md:bottom-4`), porque com o painel crescendo um badge absoluto colidiria com a
legenda de setor. **Medido no navegador** (Playwright global, 390×844 e 1440×900): mobile cresceu
270 → **337,7px** com tudo dentro de [0, 337,7] — img 24..232,7 (150×208,7, inteira), tagline
236,7..264,7, setor 268,7..284,7, badge 296,7..313,7 —, `scrollWidth === innerWidth === 390`, o
`gap-1` valendo **4,0px reais** (contra os ~20px que a margem do UA somava sozinha) e a banda
"LOTUS" em **24,2px** com a sub-linha em 10,3px (era 11,0 e 4,7). Desktop sem regressão: logo 208px,
badge em 867..884 dentro dos 900.

**Q-2 (`1952075`)** — cada erro de campo tem `id` e o campo aponta para ele por `aria-describedby`
quando, e só quando, há erro, com `aria-invalid` espelhando o estado que o PrimeReact não escreve.
Os atributos chegam ao `<input>` pelo `getOtherProps` do Prime (`inputtext.cjs.js:191-192`; no
Password, pelo `inputProps` de `password.cjs.js:699`). **Provado nos dois sentidos contra o backend
real** — o que a revisão não pôde fazer por ser read-only: `POST /api/login` com credencial
inexistente devolve **422** e o `#login-email` fica `aria-invalid="true"` com
`aria-describedby="login-email-error"` resolvendo para "These credentials do not match our records.",
enquanto o `#login-password`, sem erro na mesma resposta, permanece `aria-invalid="false"` e **sem**
`describedby`. O nome acessível do campo continua sendo só "Email" — a UI-03 não regrediu. Isso
fecha o buraco "estados de erro do login seguem não vistos" que o bloco havia declarado.

**Q-3 (`38b948d`)** — a fusão do `pt` passou a ser chave a chave e em profundidade, com o que o
wrapper crava vencendo folha a folha; nó aninhado (`iconField.root`) funde sem descartar o irmão e
valor de função do chamador é **composto**, não descartado. O helper mora em `shared/ui/mergePt.ts`,
fora do barrel, e o `AppDataTable` — que já tinha a versão local de um nível só — passa a usar o
mesmo: duplicar a versão profunda ao lado dela era o padrão que o próprio review reprova. **Provado
nos dois sentidos:** `mergePt.test.ts` (7 casos) passa e, com o corpo do helper trocado pelo spread
raso de antes, **4 dos 7 falham por nome** (folha do chamador na mesma chave, nó aninhado, valor de
função, base sem `pins`). A P-37 ganhou a linha que faltava: copiar o molde **inteiro**, não só o
`htmlFor`.

**Gate repetido depois dos três commits:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
**30 arquivos / 150 testes** (+1 arquivo, +7 casos sobre o baseline de 29/143 — a diferença é o
`mergePt.test.ts`, e nenhum teste existente mudou de resultado); os cinco arquivos tocados abaixo da
régua de 150 (`LoginForm` 96, `LoginPage` 69, `AppPassword` 89, `mergePt` 40, `AppDataTable` 123, que
**encurtou**). Zero arquivo de backend ou `generated.ts` no diff, como antes.

**Estado:** `ready_for_closure`. `/fechar-sprint` é passo explícito do João — este turno não o
executa.

### Fechamento — 2026-08-13

**Item 0 — critério de aceite DESTE bloco, provado, não a higiene genérica.** O bloco é 100%
aparência, então o critério é a §7.3 da spec, e ela foi **remedida depois** dos três commits de
correção do review — a checagem visual anterior do João era de antes do Q-1, que mudou a geometria do
telefone. Playwright global (`@playwright/cli`, já instalado; nada baixado para o gate), **três
viewports × dois temas**, `lang=es-CL`, contra o dev server real:

1. `scrollWidth == innerWidth` em 1440×900, 1024×768 e 390×844, nos dois temas — o C-2 fechado onde
   foi medido;
2. **contrastes lidos no navegador**, não herdados da tabela da spec: contra o degradê renderizado, no
   pior dos dois extremos (`--primary-900` e `--brand-navy` resolvidos em runtime), tagline **9,84**,
   setor **6,23**, versão **8,02**; sobre `--surface-card`, `h1` 10,35 (claro) / 14,63 (escuro),
   subtítulo e ajuda **4,76** (claro) / 14,63 (escuro) — todos acima de 4,5;
3. wordmark é `LogoDark.png` nos dois temas (o painel é escuro em ambos, por construção), com a banda
   "LOTUS" em 24,2px no telefone — o C-1 fechado;
4. **divisa** exatamente como a §4.2 desenhou: no claro `border-top` e `border-left` **0px** nas três
   viewports; no escuro `border-left: 1px` a partir de `md` e `border-top: 1px` a 390px, em
   `rgba(255,255,255,.1)`;
5. par idioma/tema fora da faixa do `h1` a 390px: `controls.bottom` 441,7 ≤ `h1.top` 481,7 (folga de
   40px), nos dois temas — o UI-10;
6. `aria-label` do alternador de senha em **"Mostrar contraseña"** com `lang=es-CL`, `role="button"` e
   **sem** `aria-checked` — o UI-08 e o UI-04 juntos;
7. zero elemento do `aside` fora do retângulo do `aside` em qualquer das seis combinações.

**A não-regressão do `AppPassword` deixou de ser inferência.** A revisão declarou o buraco: o segundo
call site vive atrás do login e a revisão é read-only. O fechamento **logou** (`admin@lotus.cl`, senha
de seeder), abriu o diálogo de criação em `/administracion` e mediu: o input de senha tem **292,0px**,
o mesmo dos irmãos da coluna do grid 2×2 (`name`/`rut`, de linha inteira, 600px) — a troca de `w-96`
por `w-full` não encolheu nem estourou nada, e o olho de lá também responde `role="button"` /
"Mostrar contraseña". A §7.2 fica **medida**.

**Itens 1–4.** Suíte de backend `docker compose exec -T app php artisan test`: **591 passed, 5
skipped**, exit 0 — rodada por disciplina, não por escopo. Front, de `frontend/`: `pnpm lint` exit 0,
`pnpm build` verde, `pnpm test` **30 arquivos / 150 testes**. **Pint e `typescript:transform` são N/A
por escopo medido, não por suposição:** `git diff --name-only main...HEAD -- backend/
frontend/src/shared/types/generated.ts` devolve **zero arquivo** (o diff inteiro do bloco são 16
arquivos, todos em `docs/` e `frontend/src`), então não há arquivo de backend para formatar nem DTO
que regenere tipo — e `generated.ts` segue intocado, como a lei §5.3 exige.

**Item 5 — código morto.** Nada órfão sobrou do bloco: `w-17` **zero** ocorrências (morreu com o Q-1),
`darkInput` **zero** (removido na UI-02), `--brand-gradient` com exatamente **um** consumidor mais a
definição, `mergePt` com dois consumidores de produção (`AppPassword`, `AppDataTable`) mais o teste,
nenhum `.gitkeep` ou placeholder adicionado. As chaves novas de locale continuam sendo lidas só pelo
wrapper, que é a porta única por desenho (UI-08).

**Item 6 — leis §5.** Nenhuma contrariada: zero import de `primereact` em `src/features` e zero
import cruzado `@features/*` dentro de `src/features` (§5.6, conferido por busca, não por memória);
`generated.ts` intocado (§5.3); nada de auth, auditoria, RBAC, financeiro ou schema no diff.

**Item 7 — pendências.** Nasceram duas neste bloco, ambas já registradas com decisão do João: **P-36**
(a catraca de cor não enxerga `style={{…}}`, com os dois sítios a 2,77:1) e **P-37** (o `FormField`
soma o nome acessível). A **P-37 ganhou linha nova** no fechamento: copiar o molde do login
**inteiro** — trocar o `<label>` que embrulha por `htmlFor`/`id` obriga a levar junto o
`aria-describedby` condicional e o `aria-invalid`, senão o kit perde a associação de erro que hoje ele
tem de graça. Nenhuma pendência fechou e **nenhum gatilho venceu**: o vencimento mais próximo é
2026-09-30.

**Item 8 — arquivamento.** `plans/2026-08-13-login-fora-do-adr16.md` →
`plans/archive/`; `specs/2026-08-13-login-fora-do-adr16-design.md` → `specs/archive/` (spec não
compartilhada: nenhum outro work item atual ou futuro a cita). As duas referências narrativas deste
arquivo foram apontadas para os paths novos.

**O que o bloco NÃO provou, sem maquiagem:** segue sem **teste automatizado de aparência** — o único
teste novo é o do `mergePt`, que é função pura; a guarda permanente da cor continua sendo a catraca,
que não vê `style={{…}}` (a P-36). Os contrastes do degradê são o **pior caso entre os dois extremos**
da interpolação, não uma amostra de pixel sob cada glifo. O `StaffUserDialog` foi medido em largura e
papel do olho, **não** no nome acessível do campo — que é justamente a P-37, e continua aberta. E o
`/lotus-ui-review` do João é a lente humana do desenho; o que este fechamento fez foi medição
instrumental dos sete itens acima, que é prova de geometria e de contraste, não juízo estético.

**Estado: `idle`.** Nada foi promovido — o próximo item é escolha do João, no `backlog.md`.

## Penúltimo item fechado — 2026-08-13 (`catraca-max-lines-e-moldura`, BD-4)

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

## Antepenúltimo item fechado — 2026-08-13 (`contrato-de-entrada-identidade-e-nested`)

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
