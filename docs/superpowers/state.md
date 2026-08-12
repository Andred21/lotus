---
schema_version: 1
active_feature: null
active_work_item: estilizacao-adr16-shell-tipografia
workflow_state: executing
next_owner: joao
next_action: run_lotus_ui_review
resume_state: null
active_spec: docs/superpowers/specs/2026-08-11-estilizacao-adr16-shell-tipografia-design.md
active_plan: docs/superpowers/plans/2026-08-11-estilizacao-adr16-shell-tipografia.md
context_packet: null
blocker: null
review_findings_approved: null
last_completed_work_item: integridade-e-concorrencia-backend
state_basis_commit: b29f3b9
updated_at: 2026-08-12T10:25:00-03:00
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

## Item ativo — 2026-08-11 (`estilizacao-adr16-shell-tipografia`)

### Seleção — 2026-08-11

**Item 4 de "Próximos blocos" do `backlog.md`, promovido explicitamente pelo João** via
`/planejar-bloco item 4 — Estilização · tema custom (ADR-16), shell e tipografia` com o estado em
`idle` — o precedente é o de `turma-habilitacao-listagem` (item nomeado literalmente no argumento;
o comando não promove sozinho). Como no BD-1, o item era proposta ainda não commitada, nascida na
mesma sessão por instrução literal dele (`quero melhorar a estilização … e depois adicionamos no
backlog e seguimos`): **a proposta foi commitada antes da promoção** (`b29f3b9`), sobre a base
fresca de `origin/main` (`09a11d9`) — a edição original estava sobre base velha na branch
`fix/detalhes-tabelas-interface` e foi portada, não mesclada (guardada em stash).

**Escopo:** fechar o ADR-16 com tema custom sobre o Lara nos dois modos; shell com dono único de
título, sidebar navy fixa, header responsivo, toggle oculto em compact; tipografia em 3 papéis;
neutros numa família só e fim dos hex hardcoded. Evidência: review de UI do AppLayout de
2026-08-11 (`.artifacts/ui-review/2026-08-11T12-58-51-applayout-shell/report.txt`, 2 C + 5 B) +
análise de estilização com a lente `frontend-design`. **O item é a decisão que faltava** aos
débitos "Shell fora de conformidade com o ADR-16 §4" e "Toggle da sidebar sem efeito abaixo de
1024px" (seção "Fora dos BDs" ganhou o ponteiro; as linhas de origem ficam até o fechamento).

**Rota direta a `ready_for_planning`, sem packet, por ausência medida de fonte externa:** as
fontes são o repositório, o report em `.artifacts/`, o ADR-16 em `docs/adrs.md` e a direção
registrada na memória da sessão de 2026-08-11 — o item não cita Drive, Notion nem Figma. O Figma
**não** é fonte deste bloco de propósito: a direção é identidade própria aceita pelo João em
2026-08-11, não implementação de protótipo. Dispensa a confirmar por ele na abertura do
brainstorming, como nos precedentes.

**Isolamento:** bloco frontend-only (+ docs) — a P-03 não dispara. Worktree `fix-frontend`,
branch `feat/estilizacao-adr16-shell-tipografia` criada de `origin/main` (`09a11d9`). A branch
`fix/detalhes-tabelas-interface` (a6522b5, pushed, sem PR) ficou intocada e segue com o João.

### Brainstorming e spec — 2026-08-11

Dispensa do packet confirmada pelo João na abertura (D1). Entrevista fechou 8 decisões (D1–D8 da
spec): fontes self-hosted em 3 famílias via `@fontsource`; UI-06 fica no BD-3; UI-07 entra;
mecanismo do tema = `brand-theme.css` estático sobre o Lara (abordagem A, contra tema compilado e
runtime JS); botão primário celeste com texto azul-poste por AA medido (~2.6:1 de branco sobre
celeste reprova); radius 6→4px; review em duas frentes por tocar `locales/`. O João aprovou o
design por seções (§1+§2, depois §3+§4) com a instrução literal `APROVADO — gravar spec`. A spec
ativa materializa a paleta de 6 tokens, os 3 papéis tipográficos, as 5 mudanças de shell mapeadas
1:1 aos achados do review e o DoD que reprova pelas mesmas medições que reprovaram na abertura.
O estado entra em `planning` no mesmo commit da spec; `active_plan` permanece `null` até o João
revisar a spec escrita e autorizar o `writing-plans`.

### Spec aprovada e plano escrito — 2026-08-11

O João aprovou a spec com a instrução literal `aprovado`. **A escrita do plano achou um defeito na
spec aprovada e ele foi corrigido com decisão dele, não silenciado (lição 13):** o Lara compila as
cores inline (97 ocorrências de `#3b82f6` nas regras de componente) e as vars de `:root` são um
conjunto paralelo que as regras não consomem — a D5 original (override puro de tokens) **não**
restilizaria botão, foco nem highlight. Nasce a **D5'**, aprovada pelo João: script versionado
`frontend/scripts/generate-brand-theme.mjs` gera cópias dos 2 Lara com a escala celeste, os neutros
gray→slate (corpo em grafite, ground dark em noche), radius 4px e `"Inter var"→"Inter"`, saída
versionada em `src/shared/styles/themes/lara-{light,dark}-lotus.css` (em `shared/`, não `app/` —
a seta de dependência não sobe até `primeTheme.ts`), com teste vitest de drift; o
`brand-theme.css` fica fino (D6, humo via `--surface-ground`, `tabular-nums`). A adenda D5' foi
gravada na própria spec (§4) com a correção do §9.6.

Plano em 8 tasks (0–7): baseline → fontes `@fontsource` + tokens Tailwind → temas gerados +
guarda de drift → `brand-theme.css` + higiene de hex + foco (UI-03) → sidebar navy + toggle +
aria i18n (UI-02/04/07) → header barra utilitária + tokens no shell (UI-01/05) → enmenda ADR-16 →
gate pelas mesmas medições do report. Três desvios declarados no §Desvios do plano (focus ring
tingido em vez de anel novo; humo por var e noche por mapa; neutros unificados em slate).
Handoff: `executor: claude` — bloco de julgamento visual, sem task mecânica de paths fechados;
o Codex entra na segunda lente do review (spec §10). O estado transiciona para
`ready_for_execution` no mesmo commit do plano.

### Execução iniciada — 2026-08-11: o plano foi revisado contra o Lara instalado, e mudou

O João autorizou com `/executar-bloco estilizacao-adr16-shell-tipografia`, com a instrução literal
`Mas antes revise o plano e spec, verificando se esta de acordo`. O gate passou (spec, plano,
branch e Git coerentes); a revisão pedida **não** foi de coerência documental — foi do plano contra
o `node_modules/primereact` instalado, e achou **seis defeitos**, gravados como emenda no plano
(D-P4..D-P9). É a mesma mecânica da lição 13 que produziu a D5': defeito achado na fase seguinte se
corrige com decisão, não se silencia.

Quatro entraram declarados por serem defeito ou implementação literal da spec: o script tinha de
**remover** os `@font-face` do Lara (o rename `"Inter var"→"Inter"` os transformava numa face com
`src` 404 competindo com a do `@fontsource`); a escala `--primary-50..900` não era tocada por
nenhum dos dois mapas, então o arquivo afirmaria "sem azul Lara" carregando 20 hexes azuis; a
guarda de drift conferia 3 hexes em vez da família; e sobravam cinzas (`#1f2937` no light,
`#030712` no dark) contra a D-P3.

**Duas mudavam o construído e foram decididas pelo João antes de qualquer linha de código.**
**D-P8** — medi 9 blocos no Lara light pintando a primária com texto branco (`.p-button`, `.p-tag`
2×, `.p-badge`, `.p-selectbutton`, `.p-togglebutton`, `.p-overlaypanel-close`, `.p-steps`,
`.p-stepper`); depois do mapa isso é **2,77:1**, reprovando AA, e a cadeia de `:not()` do plano
cobria só o botão — com `AppTag` usado em 9+ arquivos de feature. Ele escolheu tornar a D6
propriedade do **tema gerado** (transform block-aware), matando a cadeia de `:not()`. **D-P9** — o
anel de foco da D-P1 media ~1,4:1 sobre branco e o DoD §9.3 passaria verde com o foco invisível,
que é o próprio UI-03; ele escolheu **restaurar a spec §4** com `:focus-visible` de 2px celeste.

O estado entra em `executing` neste commit, junto da emenda do plano — a etapa que o bloco anterior
pulou e registrou como falha de processo.

### Tasks 0–7 executadas — 2026-08-11: o código fechou, o checkpoint do João não

As sete tasks estão implementadas e commitadas na `feat/estilizacao-adr16-shell-tipografia`:
`f76ba67` (baseline), `c12a3bc` (fontes), `f54f6ff` (temas gerados), `b029ea8` (camada fina),
`59e6e1d` (sidebar/i18n), `87442f4` (header/shell), `df781c6` (ADR-16 ponto 5), `6eead8e` (correção
achada pelo próprio gate). Evidência task a task em `.superpowers/sdd/progress.md`.

**Mais duas emendas nasceram DURANTE a execução, gravadas no plano** — nenhuma reabre decisão do
João, as duas são a decisão dele aplicada onde ela vale. **D-P10**: a regra "mesmo bloco" da D-P8
pega 9 blocos, mas o Lara pinta o fundo num bloco e a cor do ícone em outro — mais 7 declarações
ficavam brancas sobre celeste. **D-P11**: o Step 6 da Task 3 esperava que o grep de `#25A5E4`
devolvesse só o `SidebarItem`; devolveu três — `AppAvatar.tsx` pintava `#25A5E4`/`#fff` inline e o
`brandOutline` mandava `dark:text-white` sobre celeste. Os dois são o par de 2,77:1 que a spec D6
nomeia, dentro do bloco que existe para matá-lo.

**Duas vezes a inspeção pegou o que os testes verdes não pegaram**, e é o padrão que a lição 13
combate: 96 verdes não provam o arquivo certo. Na Task 2, `--primary-400` e `--primary-500` saíram
com o mesmo hex e `--primary-color-text` ficou branco. Na Task 7, o grep de `ring-0` reprovou por um
motivo que virou correção: o scanner do Tailwind lê comentário, achou o token no `//` que explicava
a remoção da classe e **emitia a utility morta no bundle**.

**Gate do bloco, medido no navegador com sessão real** (não mock): UI-01 `rightEdge` 378 e
`scrollWidth` == 390; UI-02 zero `aside button` a 390, um a 1440, com a pref persistida intacta nos
dois; UI-03 Tab real casando `:focus-visible` com `outline: solid 2px rgb(37,165,228)` **somado** ao
anel do tema; UI-05 um heading por página. Mais: corpo em `Inter, sans-serif`, título em `Archivo`,
`--surface-ground` humo/noche, sidebar `rgb(15,43,61)` nos dois temas, `--primary-color-text`
azul-poste, radius 4px, `tabular-nums` nas células. Suíte **17 arquivos / 96 testes**, build e lint
verdes, `generated.ts` sem diff, os quatro greps de higiene vazios.

**O bloco PARA aqui, e o plano é quem manda parar.** O Step 4 da Task 7 é o checkpoint visual do
João, declarado **bloqueante** ("sem aprovação dele o bloco não segue"), e o Step 5 é o re-run do
`/lotus-ui-review`, que é invocação dele. Nada foi promovido a `ready_for_review`.

**Três coisas para a decisão dele, achadas olhando as telas — a medição verde não pegaria nenhuma:**

1. **O wordmark ficou ilegível (regressão do Step 4 da Task 4).** O asset é retrato **335×466**; com
   o `h-8 w-auto` que o plano escreveu ele renderiza **23×32 px**. O `on-dark` resolveu a cor, que
   era a UI-04; o tamanho errou para o outro lado do `h-30` anterior. Decisão de marca.
2. **O toggle da sidebar é uma caixa branca sobre a navy no tema claro** (`rgb(255,255,255)`
   medido). O `brandOutline` acompanha o tema; a sidebar deixou de acompanhar na Task 4. Contraste
   passa, coerência não.
3. **Celeste como traço ou texto sobre superfície clara segue reprovando.** A D6/D-P8 resolveu uma
   direção — texto **sobre** celeste. A outra não tem decisão: o outline de foco mede **2,77:1**
   sobre branco (e 5,29:1 sobre a navy, onde passa), o `brandOutline` claro mede 2,77:1, e as
   variantes `outlined`/`text` do tema caíram de 3,68:1 (Lara stock) para 2,77:1. A D-P9 continua
   certa — 1,4:1 → 2,77:1 é a diferença entre invisível e visível —; falta a decisão de cor.
   Proposta: azul-poste como traço de foco no claro (13,4:1 sobre humo), celeste mantido no escuro.

### Este arquivo foi reconstruído — 2026-08-12 (perda no merge `c9fb188`)

**Não é reescrita de história: é conserto de uma perda medida, com os dois lados recuperáveis no
Git.** O merge `c9fb188` ("fix: tailwind css applayout"), que trouxe a `origin/main` para dentro da
branch, resolveu o `state.md` num híbrido que **nenhum dos dois pais tinha**: ficou com o
frontmatter da main (`last_completed_work_item: integridade-e-concorrencia-backend`,
`state_basis_commit: e2a251c`) e, ao mesmo tempo, apagou **as duas** narrativas — a seção
`## Item ativo` deste bloco (144 linhas, vindas de `421e1c0`) **e** a seção do
`integridade-e-concorrencia-backend` que a main tinha acabado de escrever (358 linhas, de
`eca0e34`). O arquivo caiu de ~1170 para 812 linhas e passou a se contradizer: dizia no frontmatter
que o último fechado era o `integridade` enquanto a seção "Último item fechado" era o
`guardas-que-faltam`, e não havia registro nenhum do bloco em execução.

Reconstrução, sem escolha por heurística — cada peça veio de um pai identificado:

| Campo/seção | Origem | Por quê |
|---|---|---|
| `active_work_item`, `workflow_state`, `next_action`, `active_spec`, `active_plan` | branch (`421e1c0`) | é o bloco em execução; a main estava `idle` |
| `last_completed_work_item: integridade-e-concorrencia-backend` | main (`eca0e34`) | fechou 18:00, depois do `guardas-que-faltam` — é o fato mais novo |
| `state_basis_commit: b29f3b9` | branch (`421e1c0`) | é a base **deste** bloco, citada na própria seção Seleção; o `e2a251c` que o merge deixou é a base do bloco de backend |
| `## Item ativo` (144 linhas) | branch (`421e1c0`) | restaurada literal |
| `## Último item fechado — integridade` (358 linhas) | main (`eca0e34`) | restaurada literal, e a cadeia voltou a `Último → Penúltimo → Antepenúltimo` |

Nenhuma linha foi reescrita de memória. O único texto novo é esta seção e a de baixo.

### Checkpoint visual respondido — 2026-08-12: duas emendas, o bloco segue parado no João

O João respondeu ao Step 4 da Task 7. **Aprovou a navy no header e na sidebar** ("o jeito que está
atualmente está legal") e **fechou o achado nº 1** (logo): fica como está. Do retorno saíram duas
emendas, executadas e commitadas em `1a0279d`, declaradas no plano:

- **D-P12 — regressão de comportamento, achada por ele, não por teste.** Trocar o idioma parou de
  reformatar hora e data; só mudava no reload. O `Clock` nunca se inscreveu no i18n — quem
  re-renderizava era o `Header`, que tinha `t()` no título até a UI-05 dar essa posse ao
  `PageHeader`. A suíte não tinha como ver: o formato continuava certo, só congelado. Corrigido na
  origem (inscrição em quem depende dela) e coberto por `Clock.test.tsx`, que **foi rodado contra a
  versão sem inscrição e reprovou** com a data congelada — o sintoma literal do relato.
- **D-P13 — altura, texto branco e responsividade do header navy.** Altura real era 94px por causa
  das margens de user-agent dos `<p>` (o projeto não carrega Preflight): 42px mortos em cada bloco.
  Zeradas, o teto vira o avatar e a altura vira escolha — **o João fixou 80px no working tree
  durante a execução, e o valor dele ficou**. Texto branco cravado no lugar dos tokens de tema, que
  mediam 1,42:1 (nome) e 3,08:1 (relógio) sobre a navy; agora 14,65:1. 7 larguras medidas, de 1440
  a 320: zero overflow horizontal.
- **O `AppButton` fica como estava — decisão dele, contra a minha proposta.** Eu tinha entregue
  variantes `onNavy*` para os controles sobre a navy; ele **aprovou o visual e mandou reverter só o
  `AppButton`**. Revertido por inteiro (zero referências a `onNavy` no `src/`), gate refeito.
  **O achado nº 2 volta a ficar aberto por escolha dele:** a caixa branca sobre a navy passa a ser
  estética assumida, não defeito pendente. Contraste ali sempre passou; o que eu argumentava era
  coerência de superfície, e essa é chamada dele.
- **Reincidência da armadilha da UI-03 no mesmo bloco:** um comentário meu citou a classe de altura
  antiga e o scanner do Tailwind emitiu a regra morta no bundle. Segunda vez. Reescrito e conferido
  no `dist`.

**Step 4 APROVADO** — "visual aprovado", com a única ressalva do `AppButton`, já atendida. É a
primeira transição do bloco que não é minha de decidir e saiu: o checkpoint bloqueante caiu.

**O bloco continua em `executing` e continua em `next_owner: joao`, agora no Step 5:** o re-run do
`/lotus-ui-review AppLayout (sidebar, header e page)` é invocação dele, não minha. Só depois disso o
bloco pode ir a `ready_for_review`. Nada foi promovido.

**Achado nº 3 segue sem decisão** — celeste como traço sobre superfície clara reprova 3:1 fora do
shell (o shell aprovado não é afetado, porque sobre a navy o celeste mede 5,29:1). **Achado nº 2
foi fechado por decisão de não-agir dele** (ver acima). **Achado nº 1** (logo) fechado: fica como
está.

## Último item fechado — 2026-08-11 (`integridade-e-concorrencia-backend`)

### Seleção — 2026-08-11

**BD-2 do `backlog.md`, promovido explicitamente pelo João.** Ele abriu a sessão com
`/planejar-bloco ### BD-2 · Integridade e concorrência no backend`; o gate do comando **reprovou**
pelo mesmo motivo do BD-1 na véspera — estado `idle`, `active_work_item` `null` e argumento que é
título de seção, não slug promovido. A promoção veio da resposta dele ao gate, com uma escolha
registrada: **manter os quatro itens do BD-2 na íntegra**, contra o recorte alternativo que teria
deixado só os itens 1 e 2 (concorrência) e devolvido a dedução do `getRoleNames()` e os quatro
testes ao backlog.

**Nada precisou ser commitado antes de promover** — ao contrário do BD-1, cuja proposta nasceu no
mesmo dia. O BD-2 já era durável em `ec3ad2a` e a árvore estava limpa em `09a11d9`, o merge do
PR #38, que passa a ser o `state_basis_commit`.

**BD-2 não é o item 1 de `## Próximos blocos`** — ali segue `Arquivados e restauração de
soft-delete`, intocado desde o BD-1. A fila **não** foi renumerada: os BDs vivem na seção de dívida,
paralela a `Próximos blocos`, e a ordem escrita entre eles (BD-2 → BD-7) está sendo seguida.

**Rota direta a `ready_for_planning`, sem Context Packet, por ausência medida de fonte externa**
(mesmo caso de `guardas-que-faltam`, `turma-habilitacao-listagem`, `profundidade-backend-b4-b7` e
`documentos-oficiais-template-e-docx`): nenhum dos quatro itens cita Drive, Notion ou Figma. As
fontes são o próprio repositório e documentos versionados — `Q-16` em `backlog.md:302`, os débitos
"Bloco 5.2a/5.2b (minors do review final)" em `backlog.md:356` e `:360`, e as specs arquivadas
`specs/archive/2026-07-17-bloco5.2a-usuarios-design.md` e
`specs/archive/2026-07-18-bloco5.2b-roles-permisos-design.md`. `context_packet: null`.

**Toca backend → main tree, sem worktree (P-03).** Nenhum outro `active_work_item` de backend está
aberto, então o gatilho de fechamento da P-03 continua não vencido. Branch
`hardening/integridade-e-concorrencia-backend`, criada de `09a11d9`, no padrão de
`hardening/guardas-que-faltam`.

**Escopo, na ordem escrita do BD-2:** (1) `lockForUpdate()` no `Client` — não só na coleção — antes
do `ensureSingle()`, nos **dois** serviços (`PrimaryContactService`, `PrimaryAddressService`) no
mesmo commit; (2) unicidade de RUT/email do `UpdateStaffUserAction` para **dentro** da
`DB::transaction`; (3) `UserData::fromModel` chamando `getRoleNames()` duas vezes; (4) os quatro
testes que faltam — `SuperadminGuard` com outro superadmin **inativo**, auto-colisão de RUT/email no
próprio update, o 422 de `role: redator` afirmando a **chave** e o error-bag de
`CreateRoleAction`/`UpdateRoleAction`. **DoD do item 1 é sonda de concorrência real** (dois writes
competindo), não teste sequencial verde.

**Fora de escopo, declarado pelo próprio item:** a decisão do 5.2b sobre `GET /api/roles` enumerar
permissão de superadmin — é do João, e está travada em `backlog.md:173`.

### Terreno medido antes de planejar (não é desenho, é fato)

1. **`lockForUpdate()` é no-op silencioso na suíte.** `SQLiteGrammar::compileLock()` devolve `''`
   (conferido no vendor) — nenhum teste sqlite pode provar serialização. O repo já sabia disso: o
   `DeleteClientContactAction` (Q-5) escreve exatamente isso no comentário do lock que já carrega.
2. **O repo já tem sonda de concorrência real, automatizada e versionada.**
   `CertificateNumberTest:44` pula fora do MySQL, clona a conexão, sobe **dois processos** com
   `Symfony\Process`, alinha os dois num gate e confirma pelo `performance_schema.data_lock_waits`
   que ambos esperam pelo mesmo lock antes de commitar. É o `1 skipped` que a suíte reporta há
   blocos. **Medido neste terreno, não herdado:** contra MySQL real (`lotus_test`), o arquivo dá
   **3 passed (20 assertions)**, com o caso concorrente em 0,31s.
3. **Os seis chamadores dos dois serviços de principal já abrem `DB::transaction`**
   (`Create`/`UpdateClientAction`, `Create`/`UpdateClientContactAction`,
   `Create`/`UpdateClientAddressAction`) — o lock nasce com efeito, sem tocar Action nenhuma.
4. **O item 2 tem três sítios, não um.** Além do `UpdateStaffUserAction:34-38` que o débito nomeia,
   `UpdateClientAction:29` e `UpdateRedatorAction:33` chamam `ensureRutAvailable` antes de abrir a
   transação. Os irmãos `CreateStaffUserAction`, `UpdateStudentAction` e `CreateStudentAction` já
   chamam de dentro — a inconsistência é entre Actions irmãs, não um caso isolado.
5. **O item 3 não economiza query.** `getRoleNames()` faz `loadMissing('roles')` e a segunda chamada
   lê a relação em cache (conferido no vendor do spatie). É dedução de `pluck`, não de `SELECT`, e a
   spec diz isso em vez de vender ganho inexistente.
6. **O banco de dev segue com o `LOT-2026-1001` corrompido de propósito** (`snapshot.aluno.name`
   vazio, conferido em SQL cru), esperando o checkpoint visual do João. Nenhum passe deste bloco
   roda `migrate:fresh --seed`.

### Brainstorming e spec — 2026-08-11

O João aprovou o desenho com a instrução literal `Aprovado`. O estado entra em `planning` no mesmo
commit da spec; `active_plan` segue `null` até a leitura humana do documento e a escrita posterior do
plano.

**A medição que mudou o desenho, feita antes de escrever:** sonda contra o MySQL de dev
(`REPEATABLE-READ`) mostrando que, depois de acordar do `lockForUpdate()` no `Client`, o `SELECT`
comum de `ensureSingle()` **continua lendo o snapshot** — não enxerga o principal que a transação
concorrente já commitou (`leitura comum: [..., "SONDA-A"]` contra `leitura com lock: [..., "SONDA-A",
"SONDA-B"]`). O Q-16, ao pé da letra, entregaria mecanismo que promete e não fecha: a transação
contaria 1 principal, faria o early-return e os dois sobreviveriam. O mutex é necessário e não
suficiente.

**Três decisões dele, respondidas antes de a spec existir** (D1, D2 e D3 da §2): o lock é **duplo**
(mutex no `Client` mais leitura travada da coleção); a prova é **teste MySQL-only com o harness
extraído** para `tests/Support/`, consumido também pelo `CertificateNumberTest` sem mudança de
comportamento; e o item 2 entra nos **três** sítios medidos, com a conversão de violação de índice
único em 422 **recusada** e registrada como limitação (a corrida de RUT/email segue subindo 500).

**Efeito declarado no placar:** a suíte em sqlite passa de **1 para 3 skipped** — skip aqui é sinal
honesto de caso que existe e roda onde o lock existe.

**Risco de review declarado MÉDIO** (§8 da spec): nenhum gatilho de ALTO se aplica (sem schema,
`generated.ts`, Sanctum, RBAC em produção, dinheiro, documento legal; `executor: claude`). Os dois
gatilhos próprios são caminho de escrita auditado e concorrência que a suíte anula por construção.

### Aprovação da spec e plano — 2026-08-11

O João aprovou a spec com a instrução literal `aprovado`. O plano ativo
(`docs/superpowers/plans/2026-08-11-integridade-e-concorrencia-backend.md`) decompõe o bloco em
**7 tasks (0–6)**: baseline; harness extraído para `tests/Support/`; o lock (item 1) num commit só;
unicidade dentro da transação nos três sítios (item 2); a dedução do `getRoleNames()` (item 3); os
quatro testes que faltam (item 4); gate. O handoff fixa **`executor: claude`** — a Task 2 fecha por
laço de medição contra MySQL com alinhamento de processos, e o modo de falha do desenho é um
**deadlock**, que aparece como exit code do filho e precisa ser lido como sintoma de ordem de lock,
não como flakiness a contornar com retry.

**Baseline reconferido, não herdado:** backend **524 passed, 1 skipped (1963 assertions)**; contra
MySQL real (`lotus_test`), `CertificateNumberTest` **3 passed (20 assertions)**. O plano projeta
**532 passed / 3 skipped** em sqlite e **7 passed** no recorte de MySQL. O total de assertions é
declarado como **registrado no gate, não projetado** — casos com laço de espera não têm contagem
previsível.

**A escrita do plano mediu o terreno e produziu nove desvios declarados** (§Desvios do plano). Os
três que mudam decisão da spec:

1. **O mutex sai do `ensureSingle` e vai para as Actions — cinco Actions mudam, não zero** (D-P1). A
   §3.2 da spec põe as duas peças do lock dentro do serviço e afirma "Nenhuma Action muda". Medido
   contra MySQL: nessa forma o mutex é tomado **depois** de a Action já ter escrito, o que inverte a
   ordem dos locks e produz `SQLSTATE[40001]: Serialization failure: 1213 Deadlock found when trying
   to get lock` em `select * from clients ... for update`, matando um dos processos (exit 255) — em
   produção, 500 para o perdedor. Com o mutex antes de qualquer escrita: 2 processos esperando, os
   dois com exit 0, exatamente 1 principal. `CreateClientAction` fica de fora com a razão escrita no
   código — o cliente nasce ali, não há concorrente disputando um id ainda não gerado.
2. **O alinhamento é por `performance_schema`, não por marcador dentro do filho** (D-P3). Os dois
   candidatos que a §3.3 nomeia não sobrevivem à exigência de o filho exercitar a **Action real**:
   não há onde emitir marcador entre o mutex e a escrita, porque as duas coisas estão dentro de uma
   chamada só. A saída medida: iniciar P1, esperar até ele estar **bloqueado** (o que só acontece
   depois de ele ter tomado o mutex) e só então iniciar P2. Daí o harness ganhar mínimo explícito e
   filtro de tabela opcional (D-P2) — P1 espera em `client_contacts` e P2 espera em `clients`.
3. **O teste de `role: redator` prova a porta abrindo as outras, não afirmando a chave** (D-P9). A
   §6 diz que ele "afirma a chave `role`"; medido no código, as três regras de `role` (`required`,
   `exists:roles,name`, `Rule::notIn`) reprovam com a **mesma chave** e a **mesma mensagem** do
   Laravel. Afirmar a chave não discrimina porta nenhuma — seria o defeito que o item 4 existe para
   corrigir, reintroduzido dentro da correção. O que discrimina é asserir que a role `redator`
   **existe** em `roles`, o que fecha a porta do `exists` e deixa só o `notIn` podendo recusar.

**Nenhuma guarda extra nasce para a ordem dos locks, e a razão é medida** (D-P4): a própria sonda já
reprova nas duas formas de quebrar o mecanismo — apagar o mutex deixa dois principais (a asserção
final reprova) e movê-lo para depois da escrita mata o filho por deadlock (a asserção de exit code
reprova). Varredura de código que tentasse provar a ordem seria promessa que a varredura não
entrega, que é o risco central da §8.

A auto-revisão do plano contra a spec ainda achou dois erros no próprio rascunho e os corrigiu antes
de gravar: o Pint do gate alimentado por substituição de comando (lista vazia vira Pint sem
argumento, que reformata o repositório inteiro) e a conferência do banco de dev lendo
`certificates.number`, coluna que não existe — o nome real é `codigo`, conferido no schema.

**Risco de review continua MÉDIO.** O foco é um só: a sonda realmente disputa, o vermelho foi visto
sem o lock, e o harness extraído não afrouxou o caso do certificado. O review não roda
automaticamente ao fim da Task 6.

### Execução — 2026-08-11

O João autorizou com `/executar-bloco integridade-e-concorrencia-backend`. Thread principal, main
tree, sem worktree (P-03), do base `44db6ca`. Sete tasks (0–6), commit por task, revisão de task
após cada commit delegável.

Commits, na ordem do plano: `542e3cc` (Task 1, harness extraído para `tests/Support/`), `1c27647`
(Task 2, o lock — Q-16), `2cf0250` (Task 3, unicidade dentro da transação nos três sítios),
`2f0d756` (Task 4, `getRoleNames()` uma vez), `15f9fff` (Task 5, os quatro testes que faltam).
Evidência task a task em `.superpowers/sdd/progress.md`.

**Vermelho visto antes de cada correção, texto exato:**
- Task 2 — sondas MySQL de `PrimaryConcurrencyTest`: `2 failed, 2 passed`, o array final
  `['SONDA-B','SONDA-C']` contra o esperado `['SONDA-C']` — dois principais sobreviveram.
- Task 3 — os três casos de `UniquenessInsideTransactionTest`: `3 failed`, `a unicidade de rut foi
  checada FORA da transação que escreve`, `Failed asserting that 1 is identical to 2`.
- Task 5 — quatro mutantes, quatro vermelhos: superadmin inativo, `esperava ValidationException: o
  outro superadmin está inativo`; auto-colisão de RUT, `ValidationException: Este RUT já está
  cadastrado.`; porta `redator`, `esperava ValidationException`; as duas Role Actions, `4 failed`,
  `Failed asserting that an array has the key 'name'`/`'permissions'`.

**Um desvio de execução, não de plano.** O implementador da Task 3 (subagent) morreu no meio do
trabalho — a sessão anterior encerrou antes de ele rodar a verificação final e commitar. O
controller recuperou o working tree (edições já feitas, sem commit), conferiu que batia byte a
byte com o brief, e reproduziu o vermelho por conta própria via `git stash` das três Actions antes
de aceitar o fix — não herdou a prova de ninguém. A Task 4 teve uma imprecisão do texto do plano: o
Step 2 projetava `11 passed` para `StaffUserActionTest`, e o real, estável antes e depois da
edição, é `10 passed (17 assertions)` — a task não toca arquivo de teste, então a contagem do plano
estava simplesmente errada, não o código.

**Gate reproduzido, Steps 1 e 2:** backend em sqlite `3 skipped, 532 passed (1983 assertions)`;
contra MySQL real, filtro `CertificateNumberTest|PrimaryConcurrencyTest`, `7 passed (40
assertions)`. Pint `passed` nos 20 arquivos fechados do bloco (conferidos contra `git diff
--name-only main...HEAD -- '*.php'`, mesma lista). `typescript:transform` sem diff em
`generated.ts`; `git diff main...HEAD` de `backend/database/` e `frontend/` vazio. Nenhuma sonda
sobrevivente (`git status --porcelain` vazio, nenhum `SONDA`/`dd(`/`dump(` no diff de
`backend/app/`). Banco de dev intocado: `LOT-2026-1001` segue corrompido.

**O que o gate NÃO provou, sem maquiagem:** a corrida de unicidade de RUT/e-mail continua aberta —
duas escritas concorrentes com o mesmo valor ainda colidem no índice único e sobem 500, não 422 (D3
da spec, recusa registrada). E a suíte em sqlite segue sem enxergar lock nenhum:
`SQLiteGrammar::compileLock()` é no-op, então tudo que prova o lock do item 1 é MySQL-only.

**Estado:** `ready_for_review`. Review, fechamento, push e PR não rodam automaticamente.

### Review de sprint — 2026-08-11: ALTO risco, duas lentes, 6 achados

**ALTO RISCO pelo gate da skill, e a classificação divergiu da spec de propósito.** A §8 da spec
declarou MÉDIO na escala dela, afirmando "sem RBAC em produção". O `/revisar-sprint` é binário e
**três** gatilhos de ALTO se aplicam: o bloco toca RBAC (`UserData::fromModel` projetando
`getRoleNames()`, as duas Role Actions, o `SuperadminGuard`), toca auth/identidade
(`UpdateStaffUserAction`) e toca caminho de escrita auditado (as cinco Actions de Commercial). Duas
lentes, portanto: Claude mais revisão independente do Codex.

**Gate reproduzido, não herdado do relatório de execução:** backend em sqlite **3 skipped, 532
passed (1983 assertions)** — bate com o registro da execução.

**Órfãos: zero.** `ProbesMysqlConcurrency` tem os dois consumidores previstos (`CertificateNumberTest`,
`PrimaryConcurrencyTest`); `Client::lockForWrite()` tem os cinco chamadores que a spec nomeia, e a
sexta Action (`CreateClientAction`) carrega a razão escrita de não tomar o mutex; nenhuma sonda
`SONDA-*` sobreviveu no diff de `backend/app/`.

**A extração do harness não afrouxou nada.** Conferido linha a linha contra `09a11d9`: o
`CertificateNumberTest` passa `count($processes)` e `'certificate_sequences'`, que reproduz o
`WHERE ... OBJECT_NAME = 'certificate_sequences'` e o `>= count($processes)` da versão anterior. O
`assertGreaterThanOrEqual(2, $waitingCount)` continua no arquivo.

**Uma medição que NÃO virou achado, porque o código está certo.** O `lockForUpdate()` de
`ensureSingle` **não escala para linhas de outros clientes** — era o risco real de o item 1
serializar o sistema inteiro: sem índice, `SELECT ... WHERE client_id = ? AND is_primary = 1 FOR
UPDATE` em InnoDB trava tudo que varre. Conferido no schema de `lotus_test`:
`client_contacts_client_id_foreign` e `client_addresses_client_id_foreign` existem, então o lock fica
na faixa do cliente.

**A lente do Codex rodou em análise estática apenas** — o sandbox negou acesso ao Docker, então ele
não executou suíte nenhuma. As duas lentes convergiram no Q-1 e no Q-5. O Codex achou sozinho o Q-2 e
o Q-6; o Claude achou sozinho o Q-3 e o Q-4. Nenhum achado do Codex foi aceito sem conferência
própria no código, e **duas sub-afirmações dele foram recusadas** (registradas abaixo do Q-5).

**Uma conclusão da lente Claude estava errada e é corrigida aqui, não apagada.** A primeira passagem
descartou `DeleteClientContactAction` como fonte de deadlock com o argumento de que ela nunca pede
lock em `clients`, logo não fecha ciclo. O argumento ignora que o `lockForUpdate` dela adquire as
linhas de `client_contacts` **incrementalmente durante a varredura**: ela pode segurar parte da
coleção e bloquear no meio, numa linha que a outra transação já travou. Aí o ciclo existe. O Codex
apontou, a releitura confirmou, e o achado entrou como Q-2. A leitura sobre `ClientController::destroy`
continua válida no que ela afirmava (sem transação explícita, cada statement autocommita), mas isso
não a inocenta — ver a segunda ocorrência do Q-2.

**Os seis achados:**

1. **Q-1 🟡** *(Claude + Codex)* — o guard de lock-out de superadmin continua **check-then-act fora da
   transação** (`UpdateStaffUserAction:30-32`, e `UserController:62` sem transação nenhuma), no mesmo
   commit que moveu a unicidade para dentro pela razão oposta.
2. **Q-2 🔴** *(Codex, verificado)* — **o mutex tem dois escritores que o ignoram**, e os dois estão
   fora da lista de cinco Actions que o bloco tocou. `DeleteClientContactAction:32` trava a coleção
   sem tomar o mutex antes: ordem invertida contra as Actions novas, com ciclo real por aquisição
   incremental de lock, e o perdedor sai em `SQLSTATE[40001] ... 1213` (500). É **regressão do
   bloco** — antes dele ninguém travava `clients`, então a inversão não existia. E o hook
   `Client::booted deleting:40-47`, chamado por `ClientController::destroy:52` sem transação nem
   mutex, enumera os filhos e apaga um a um: um `CreateClientContactAction` concorrente insere depois
   da enumeração e o contato fica **ativo sob cliente arquivado**.
3. **Q-3 🟡** *(Claude)* — a D-P7 do plano afirma que `RedatorDocumentRollbackTest` prova o descarte do
   binário no caminho novo; o teste só injeta `RuntimeException` no segundo insert de `files`, depois
   do check de RUT. O caminho que o bloco criou não tem caso.
4. **Q-4 🟡** *(Claude)* — `PrimaryContactService` e `PrimaryAddressService` são idênticos byte a byte
   depois de normalizar o nome da entidade, e o bloco acrescentou as **mesmas** dez linhas aos dois.
5. **Q-5 🟢** *(Claude + Codex)* — `Client::lockForWrite()` devolve `void` e descarta o `->first()`: o
   mutex é no-op indetectável quando o id não casa, além do no-op já documentado em sqlite.
   **Duas sub-afirmações do Codex recusadas:** `null` produzindo `TypeError` é inalcançável pelos
   quatro sítios de chamada — `client_id` é `foreignId()->constrained()`, NOT NULL; e o `withTrashed()`
   aceitando cliente arquivado é a intenção escrita no docblock, não defeito do mutex.
6. **Q-6 🟢** *(Codex, verificado)* — `ProbesMysqlConcurrency:104`: com `$table === null` o `WHERE` fica
   só em `OBJECT_SCHEMA`, contando **qualquer** transação em espera no schema, sem correlação com os
   processos filhos. As duas chamadas de `PrimaryConcurrencyTest` passam `null`, inclusive a de
   `$minimum = 1` que existe para garantir que P1 já tomou o mutex antes de P2 subir.

**Decisão do João (2026-08-11): os seis entram.** Corrigidos na mesma sessão do review.

**Como cada correção foi provada — cada teste novo foi visto REPROVAR contra o código antigo,**
um a um, revertendo só a linha que ele guarda:

| Achado | Correção | Prova de que o teste discrimina |
|---|---|---|
| Q-1 | guard passa para dentro da `DB::transaction` da `UpdateStaffUserAction` e ganha `DeleteStaffUserAction`; `SuperadminGuard` troca `where('id','!=')->exists()` por `pluck` **travado do conjunto inteiro** — excluir o alvo do `FOR UPDATE` quebrava o mutex (T1 trava {B}, T2 trava {A}, sem conflito) | com o guard de volta para fora: `Failed asserting that 1 is identical to 2` no nível de transação |
| Q-2 | `Client::lockForWrite()` na `DeleteClientContactAction`; `ClientController::destroy` passa por uma `DeleteClientAction` nova (transação + mutex) | sem o mutex no delete de contato, o filho **termina antes do commit do gate**; com `$client->delete()` cru, a sonda mede **0 contatos vivos** enquanto o escritor ainda espera — a cascata já tinha autocommitado, que é exatamente a janela do achado |
| Q-3 | caso novo cobrindo a `ValidationException` de RUT duplicado no update do redator | trocando `catch (Throwable)` por `catch (RuntimeException)`: "objeto órfão ficou no bucket", com os outros três casos verdes |
| Q-4 | regra única em `PrimaryCollectionService`; os dois services viram três linhas cada; `PrimaryConcurrencyTest` perde os três pares de helper e as duas cópias do caso MySQL | sem teste próprio — é estrutura, e a prova é a suíte inteira seguir verde com **uma** implementação |
| Q-5 | `lockForWrite()` devolve o cliente travado, com `firstOrFail()`, e recusa cliente arquivado | com `first()`/`void` de volta: três casos do `ClientArchiveIntegrityTest` reprovam |
| Q-6 | a sonda correlaciona por `PROCESSLIST_ID`, lido do `CONNECTION_ID()` que o filho imprime no handshake `READY` | **medido**: com uma sessão `mysql` CLI alheia bloqueada em `lotus_test`, a consulta antiga devolveu `1` e a correlacionada devolveu `0` |

**Gate depois das correções:** sqlite **538 passed, 5 skipped (1999 assertions)**; MySQL real, os nove
casos de sonda verdes (`PrimaryConcurrencyTest` com seis, `CertificateNumberTest` com três). Pint
limpo nos arquivos tocados. Nenhum DTO mudou — `typescript:transform` não era necessário.

**Uma consequência do Q-2 que exigiu fechar a outra ponta:** o mutex torna o arquivamento atômico,
mas sozinho não impede o filho de nascer sob pai já arquivado — a requisição concorrente resolveu um
cliente VIVO no binding de rota e só descobre o arquivamento depois. Por isso `lockForWrite()` recusa
cliente arquivado: é uma decisão só, no único ponto por onde todos os escritores passam, em vez das
quatro linhas repetidas em seis Actions que o Q-4 acabara de punir.

### Gate de fechamento — 2026-08-11

**Item 0 — o critério de aceite deste bloco, provado contra a API real e não herdado do review.** O
DoD escrito é "dois writes competindo", então suíte verde não fecha item nenhum. O e2e rodou contra
o banco de dev (MySQL), com sessão Sanctum por cookie e CSRF:

| Prova | Resultado |
|---|---|
| cliente criado com **dois** contatos `is_primary=true` | **201** com **um** principal (o último por id, a regra escrita) |
| rota nested `POST /clients/5/contacts` com principal já existente | **201**, o anterior rebaixado; SQL cru confirma 1 principal |
| **20 `PUT` concorrentes** (10 rodadas, dois contatos do mesmo cliente disputando) | **200 nos 20**, invariante em **1 principal** em todas as rodadas |
| espera de lock no caminho HTTP | `Innodb_row_lock_waits` **116 → 127** (delta **11** em 10 rodadas) e `SHOW ENGINE INNODB STATUS` **sem** seção de deadlock |
| coleção de **endereços** (a subclasse nova do Q-4) | dois `POST` principais → 1 principal, mesma regra, um dono só |
| **Q-2** — `DELETE /clients/6` concorrente com `POST .../contacts` | **204** e **422** `application/problem+json` (`Este cliente foi arquivado e não aceita mais alterações.`); **0 contatos vivos** sob o cliente arquivado em SQL cru |
| **item 2** — `PUT /users/71` com o RUT de outro | **422** com `errors.rut`; SQL cru mostra o `name` **não** escrito (zero escrita parcial) |
| item 2 — auto-colisão com o próprio RUT | **200** |
| **Q-1** — `DELETE /users/1` (único superadmin) | **422** `Não é possível deixar o sistema sem superadmin ativo.` |
| Q-1 — rebaixar o superadmin ativo com outro superadmin **inativo** no banco | **422**; role intacta em SQL — é o caso do item 4, medido onde o usuário vive |
| **item 3** — projeção de roles | `role: "admin"` e `roles: ["admin"]` coerentes em todas as respostas de usuário |

**A medição de espera de lock é o que separa este e2e de um teste sequencial disfarçado:** 20 writes
paralelos que nunca se cruzassem passariam igual. As 11 esperas dizem que houve disputa real no
caminho HTTP completo, e a ausência de deadlock diz que a ordem de locks da D-P1 se sustenta fora do
harness.

**Itens 1–5.** Backend **538 passed, 5 skipped (1999 assertions)** em sqlite. Contra MySQL real
(`lotus_test`), `CertificateNumberTest|PrimaryConcurrencyTest` → **9 passed (48 assertions)**. Pint
`{"tool":"pint","result":"passed"}` nos **29** `.php` do bloco (lista conferida contra `git diff
--name-only main...HEAD -- '*.php'`, nunca por substituição de comando). `pnpm lint` limpo e `pnpm
build` verde — o bloco não toca `frontend/`, e o diff vazio é a prova. `typescript:transform` **sem
diff** em `generated.ts`. Código morto zero: `ProbesMysqlConcurrency` tem os dois consumidores
previstos, `Client::lockForWrite()` tem **sete chamadores** — as sete Actions que escrevem sob cliente já
existente, com `CreateClientAction` de fora carregando a razão escrita no código —,
`PrimaryCollectionService` tem as duas subclasses, `DeleteClientAction`
e `DeleteStaffUserAction` estão fiados nos controllers; `git status --porcelain` vazio e nenhuma
sonda `SONDA`/`dd(`/`dump(` no diff de `backend/app/`.

**Item 6 — leis.** Nenhuma contrariada: zero classe `Repository` em `backend/app/`, zero
`CREATE TRIGGER`/`DB::unprepared` (as duas guardas do BD-1 seguem verdes), auditoria só na aplicação
— o rebaixamento continua por instância, nunca por query builder —, `generated.ts` gerado e sem
diff, Sanctum intocado, financeiro fora do bloco.

**Item 7 — pendências.** Nenhum gatilho venceu: a **P-03** exige dois `active_work_item` de backend
em paralelo (só houve um) ou 2026-10-31, e a **P-04** revisa em 2026-08-15. Nasceu a **P-29**: a
corrida de unicidade **entre transações distintas** segue subindo 500, recusa registrada na D3 da
spec e agora com gatilho próprio. Uma divergência de formato foi **reportada e não corrigida** — o
ID `P-28` aparece **duas vezes** em `docs/pendencias.md` (a guarda da lição 13 e o fundo do
certificado); renumerar quebra referência e é decisão do João.

**O que o gate NÃO provou, sem maquiagem:** nada foi visto renderizado — o bloco é backend puro e o
contrato HTTP saiu idêntico, então não há tela nova a conferir; a corrida de RUT/e-mail entre
transações distintas continua em 500 (P-29); e a suíte em sqlite segue cega para lock
(`SQLiteGrammar::compileLock()` é no-op), então **tudo** que prova o item 1 é MySQL-only — os 5
skipped são isso, não cobertura ausente.

**Duas mutações declaradas no banco de dev:** os registros criados pelo e2e (2 clientes, 3 usuários
staff) foram removidos com `forceDelete` ao fim — `clients` vivos voltou a **4**, zero usuário
`gate.*` —, restando **15** linhas de `audits` apontando para ids que não existem mais; e o
`LOT-2026-1001` corrompido de propósito **segue lá**, conferido antes e depois, esperando o
checkpoint visual do João. Nenhum passe rodou `migrate:fresh`. Registrado também que o João estava
**usando a aplicação no navegador durante o gate** (foto e `PUT` no cliente 1, visto no log do
nginx): o tráfego dele não cruzou nenhum alvo do e2e, que operou só sobre registros próprios.

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

## Penúltimo item fechado — 2026-08-11 (`guardas-que-faltam`)

### Seleção — 2026-08-10

**BD-1 do `backlog.md`, promovido explicitamente pelo João.** Ele abriu a sessão com
`/planejar-bloco ### BD-1 · Guardas que faltam (mecanismo, zero mudança de comportamento)`; o gate
do comando **reprovou** — o estado era `idle`, `active_work_item` era `null` e o argumento era o
título de uma seção escrita no mesmo dia, não um slug promovido. A promoção veio da resposta dele ao
gate, com duas escolhas registradas: **commitar a proposta antes de promover** (feito em `ec3ad2a`,
que é o `state_basis_commit`) e **manter os 8 itens do BD-1 na íntegra**, incluindo a P-25, que eu
havia enfileirado por conta própria.

**BD-1 não é o item 1 de `## Próximos blocos`** — ali segue `Arquivados e restauração de
soft-delete`. A fila **não** foi renumerada: os BDs vivem na seção de dívida do `backlog.md`, que é
paralela a `Próximos blocos`, e o João pulou a ordem escrita conscientemente.

**Rota direta a `ready_for_planning`, sem Context Packet, por ausência medida de fonte externa**
(mesmo caso de `turma-habilitacao-listagem`, `profundidade-backend-b4-b7` e
`documentos-oficiais-template-e-docx`): nenhum dos 8 itens cita Drive, Notion ou Figma. A fonte é o
repositório — testes, ESLint e `.claude/rules/`. `context_packet: null`.

**Toca backend → main tree, sem worktree (P-03).** Os itens 1 e 2 mexem em `backend/tests/`
(guarda de §5.1/§5.2 e `NestedRouteOwnershipTest`). Nenhum outro `active_work_item` de backend está
aberto, então o gatilho de fechamento da P-03 continua não vencido. Branch
`hardening/guardas-que-faltam`, criada de `7e76db4`, no padrão de
`hardening/guardrails-e-transportes`.

### Terreno medido antes de planejar (não é desenho, é fato)

1. **A superfície das duas leis já está limpa** — zero classe `Repository` em `backend/app/` (o
   único hit de `grep` é `TurmaQueryBuilder`, que não é uma) e zero `CREATE TRIGGER`/`DB::unprepared`
   em `backend/database/`. A guarda da **P-04** nasce verde: é custo de escrita, não de correção. É
   também o gatilho mais próximo do bloco — a P-04 reavalia em **2026-08-15**.
2. **`NestedRouteOwnershipTest` filtra por assinatura, não por URI** (`Q-2`): ele lê
   `$route->signatureParameters(['subClass' => Model::class])` e faz `continue` quando encontra menos
   de dois models tipados. Rota com dois segmentos `{}` e binding não tipado sai do universo do teste
   em silêncio — o mecanismo entregue em 2026-08-04 tem essa porta aberta desde o primeiro dia.
3. **`postMultipart.test.ts` mocka o próprio transporte** (`Q-4`): o arquivo abre com
   `vi.mock('./axios', () => ({ api: { post: vi.fn(...) } }))`, então nenhum caso exercita o axios
   real. A afirmação que interessa — que o `Content-Type` **não** é fixado à mão — não é testada por
   nada hoje.
4. **O barrel de `shared/hooks` exporta três símbolos de uso interno** (`Q-2` de 2026-08-05):
   `unclassifiedPayloadKeys`, `MutableResource` e `CrudFormOptions`. Conferido em 2026-08-10: o único
   consumidor é `useCrudForm.test.ts`, **por caminho relativo** — a remoção do barrel não quebra
   ninguém.
5. **`useEntityPhoto` tem 161 linhas e nenhum teste**, sendo o module de maior fan-out de
   `shared/hooks`. É o item de maior custo do bloco e o único que não é guarda de guarda.
6. **A P-25 é uma linha ausente numa rule**, não código: `.claude/rules/frontend-fsliced.md` segue
   sem a cláusula "hook genérico não importa tipo de `shared/ui`", conferido em 2026-08-10, com os
   dois casos já medidos (`useFilePreview`, `SearchableTableFrame`). Entra no bloco porque o item 4
   já abre as rules pelo mecanismo da lição 13.

**Uma frase desta seção nasceu errada e é corrigida aqui, não apagada:** ela dizia que os itens 1 e
4 eram "as duas peças sem precedente no repositório". O item 1 **tem** precedente —
`tests/Feature/Shared/DomainDependencyTest.php` já é guarda de arquitetura por varredura de código,
com comentário descartado por `token_get_all()` e forma não coberta banida em vez de fingidamente
coberta. Só o item 4 era peça nova, e o brainstorming mudou o que ele confere.

### Brainstorming e spec — 2026-08-10

O João aprovou o desenho com a instrução literal `aprovado`. O estado entra em `planning` no mesmo
commit da spec; `active_plan` segue `null` até a leitura humana do documento e a escrita posterior do
plano.

**Quatro decisões dele, respondidas antes de a spec existir** (D1, D2, D5 e D6 da §2): a guarda da
lição 13 confere **referência de código citada em doc**, não comando; ela mora no **vitest**, em
`frontend/tests/`; o `useEntityPhoto` ganha **seis** casos; e a frase vencida da rule é corrigida
neste bloco.

**Três medições que mudaram o desenho, feitas antes de escrever:**

1. **O item 4, como o backlog o registrou, não fecha honesto.** Ele dizia "todo comando citado nos
   `§Comandos` das rules existe como script em `package.json`/`composer.json`, e vice-versa". Medido:
   só 2 das 4 rules têm `## Comandos`; o que citam é `docker compose exec -T app php artisan …` e
   `pnpm …`; **nenhum** é script de `composer.json`; e o "vice-versa" reprovaria no dia 1 contra
   `setup` e `post-autoload-dump`, que doc nenhuma cita. As três reincidências reais da lição 13
   foram **classe ou pasta citada que nunca existiu** (`app/Data`, `LibreOfficeConverter`).
2. **O container não enxerga a raiz do repositório.** `docker-compose.yml` monta `./backend` e
   `./frontend`; `CLAUDE.md`, `.claude/rules/` e `docs/` não estão montados — conferido de dentro do
   container. PHPUnit não tem como ler o doc que a guarda confere, e criar volume para isso seria
   mudar infra por guarda de doc, o mesmo que o bloco anterior recusou na D-P1. O vitest é o único
   runner do projeto com acesso à raiz.
3. **A guarda 4 nasce verde, e por pouco:** 87 referências conferíveis em 10 docs normativos, **3**
   não resolvem — e as três são negação deliberada (`generated-types.md:16` escreve "Não existe
   `app/Data`"; `README.md:88` é a própria lição 13; `estrutura-monolito.md:192` lista `src/Domains/`
   como alternativa em aberto). Viram lista de exceção declarada, não heurística de vizinhança.

**Um achado que o brainstorming produziu e o BD-1 não previa:** `.claude/rules/frontend-fsliced.md:161-167`
afirma que o runner "cobre os hooks de `shared/hooks/`", e existem **8 testes de hook de feature** no
repositório. É lição 13 dentro do arquivo que o item 8 já ia abrir; a correção entra no mesmo commit
(D6). O registro do bloco anterior, que herdou a mesma premissa ao justificar a Q-6 sem teste, **não**
foi reescrito — é histórico, pelo precedente da P-27.

**Risco de review declarado MÉDIO** (§7 da spec): nenhum gatilho de ALTO se aplica (sem schema, auth,
RBAC, dinheiro, documento legal, `generated.ts`, sem execução delegada). O risco próprio é guarda que
promete cobrir e não cobre — cinco das oito são varredura, e varredura tem escape por construção.

### Aprovação da spec e plano — 2026-08-11

O João aprovou a spec com a instrução literal `pode prosseguir`. O plano ativo
(`docs/superpowers/plans/archive/2026-08-10-guardas-que-faltam.md`, arquivado no fechamento de
2026-08-11) decompõe o bloco em **10 tasks (0–9)**:
baseline; as duas leis como teste; ownership de rota; a instância do axios; a recíproca da
classificação; o barrel; os seis casos da foto; a guarda de referência de doc; a rule; gate. O
handoff fixa **`executor: claude`** — as Tasks 1, 6 e 7 fecham por laço de ajuste contra medição, e o
risco declarado da §7 (guarda que promete cobrir e não cobre) não é detectável por execução linear.

**A escrita do plano mediu o terreno e produziu nove desvios declarados** (§Desvios do plano). Os que
mudam decisão da spec:

1. **A guarda 2 conta segmentos e exige declaração, não binding tipado** (D-P1). A spec pedia
   reprovar "≥2 segmentos com <2 models tipados, com a instrução de tipar o binding". O docblock do
   próprio teste já carregava a objeção certa contra ler a URI — `{file}` não diz que é model —, e a
   saída é a válvula que o teste já usa: `withoutScopedBindings()` com o motivo ao lado. Medido: **8**
   rotas com ≥2 segmentos, todas já declarando, **0** reprovando.
2. **A guarda 3 é arquivo novo** (D-P2). `postMultipart.test.ts` abre com `vi.mock('./axios')`, que é
   hoisted e vale para o arquivo inteiro: "caso sem mock" ali dentro não existe. Vai para
   `axios.test.ts`, e o DoD do frontend passa de **15 para 16** arquivos.
3. **`codigoSemComentarios` vira trait compartilhado** (D-P5). A guarda §5.2 precisa da mesma
   varredura sem comentário que o `DomainDependencyTest` tinha em método privado; duplicar
   reintroduziria o defeito da Q-4 de 2026-08-04 em dois lugares.
4. **A guarda §5.1 exclui `QueryBuilders/`, e a exclusão é provada com sonda** (D-P6), não afirmada
   em comentário: `TurmaQueryBuilder` é o padrão aprovado pelo ADR-02 e uma varredura por sufixo o
   reprovaria.
5. **A guarda 4 ganha duas guardas de si mesma** (D-P8): piso de volume de referências e conferência
   de que cada citação deliberada ainda está no doc que a declara. Extrator que pare de casar
   deixaria o teste verde com zero referências conferidas.

A auto-revisão do plano contra a spec ainda achou três erros de contagem no próprio rascunho e os
corrigiu antes de gravar: o total de casos da Task 3 (9, não 8), a projeção de arquivos do frontend
(16, não 15) e uma contagem absoluta na Task 4 que ignorava os testes da Task 3.

**Risco de review continua MÉDIO.** O foco é um só: para cada guarda, existe uma forma de violar a
lei que ela não pega? O review não roda automaticamente ao fim da Task 9.

### Execução — 2026-08-11: as oito entregues, oito commits

O João autorizou com `/executar-bloco guardas-que-faltam`. Thread principal, main tree, sem worktree
(P-03), do base `4ff7621`. **Task 0 reconferida, não herdada:** backend **522 passed, 1 skipped
(1961 assertions)**, frontend **13 arquivos / 47 testes**, lint e build verdes, árvore limpa — bate
com o plano.

Commits, na ordem do plano: `d5e53b0` (leis §5.1/§5.2 + trait), `e868076` (ownership de rota),
`60fc520` (instância do axios), `c45226a` (recíproca da classificação), `1a630a4` (barrel),
`a4d2d2d` (seis casos da foto), `e42ae30` (referência de doc), `d885738` (a rule). Evidência task a
task e os cinco desvios (D-E1..D-E5) em `.superpowers/sdd/progress.md`.

**Duas medições mudaram a guarda, não só a implementação.** **D-E1** — o regex da §5.2 nascia com
`->\s*unprepared\s*\(` e **não** pegava `DB::unprepared(`, que é a forma idiomática e a que a lei
nomeia; a sonda do próprio plano o denunciou ao produzir uma linha em vez de duas (reprovava pelo
texto `CREATE TRIGGER`, não pela chamada). É o risco da §7 aparecendo dentro do bloco que existe
para eliminá-lo. **D-E2** — a guarda do axios afirma o **valor** fixado, não a presença da chave: o
próprio axios escreve `Content-Type: undefined` em `defaults.headers.common`, e a medição do plano,
feita com `JSON.stringify`, não o via. Assertar ausência de chave reprovaria o estado correto.

**O escape da guarda 2 foi provado, não afirmado:** com a sonda no lugar, o teste **antigo** (por
`git stash` do arquivo) **passa** e o novo reprova. Mesma disciplina na §5.1, onde a exceção de
`QueryBuilders/` foi provada com sonda dentro e fora da pasta.

**A guarda 4 confere 87 referências em 10 docs — o número exato que o plano mediu** — e as 3 que não
resolvem são as 3 exceções declaradas. A guarda-da-guarda foi vista vermelha comentando o `push` do
extrator (`expected 0 to be greater than 60`), com o caso principal passando **em silêncio** com
zero referências conferidas.

**Gate da Task 9:** backend **524 passed, 1 skipped (1963 assertions)** — os 524 projetados; Pint
`passed`; frontend **16 arquivos / 79 testes**, os 16 do plano (D-P2). `git diff main...HEAD` de
`backend/database/` **vazio**; `typescript:transform` sem diff em `generated.ts`; e
`git diff main...HEAD --stat -- backend/app/ frontend/src/features/` **vazio** — nenhuma sonda ficou
para trás e o bloco não toca domínio nem feature.

**Uma etapa de processo foi pulada e fica registrada:** o estado não passou por `executing` no
commit da primeira task durável, como o `/executar-bloco` manda. Ele foi de `ready_for_execution`
direto para `ready_for_review` neste commit. Nenhum trabalho se perdeu — os oito commits são a prova
da execução —, mas se a sessão tivesse caído no meio, o `state.md` estaria mentindo sobre a fase.

**O que o gate NÃO provou, sem maquiagem:** as cinco guardas de varredura têm escape por construção,
e os três medidos estão nomeados no ledger — a guarda 4 só vê token entre crases que **pareça path**,
então classe citada sem `/` (o caso `LibreOfficeConverter`, uma das três reincidências que a
motivaram) segue fora do universo; a guarda 1 casa por **sufixo de nome de arquivo**; e a guarda 2
exige **declaração**, não correção, então `withoutScopedBindings()` escrito por engano a satisfaz.
São o foco do review pela §7 da spec.

**Estado:** `ready_for_review`. Review, fechamento, push e PR não rodam automaticamente.

### Review de sprint — 2026-08-11: uma lente, 4 achados, três provados por sonda

**BAIXO RISCO pelo gate da skill, e a classificação divergiu da spec de propósito.** A §7 da spec
declarou MÉDIO na escala dela; o `/revisar-sprint` é binário, e **nenhum** gatilho de ALTO se aplica
— zero schema, zero `generated.ts`, zero auth/Sanctum, zero auditoria, zero RBAC, sem dinheiro, sem
documento legal, `executor: claude`. Uma frente, lente Claude, **sem Codex**.

**Gate reproduzido, não herdado do relatório de execução:** backend **524 passed, 1 skipped (1963
assertions)**, frontend **16 arquivos / 79 testes**, `pnpm lint` limpo, `pnpm build` verde.

**Órfãos: zero.** `ScansPhpSource` tem os dois consumidores previstos; os quatro símbolos tirados do
barrel (`unclassifiedPayloadKeys`, `classificationConflicts`, `MutableResource`, `CrudFormOptions`)
não têm um único import sobrevivente em `frontend/src/`; nenhuma sonda das oito tasks ficou para
trás.

**A guarda 7 foi testada por mutação, não aceita por contagem.** Três mutantes no `useEntityPhoto`,
cada um pego pelo caso que o promete: `onRetry` lendo a prop `id` em vez do `retryId` reprova
*"reenvia para o id da TENTATIVA"*; remover `sizeError === null` do gate reprova *"`sizeError` apaga
o `onRetry`"*; e `flush` propagando a exceção reprova *"NÃO lança e liga `hasBufferedFailure`"*. Não
é cobertura fantasma.

**A guarda 4 discrimina onde alcança:** path inventado em `.claude/rules/backend-ddd.md` reprova
nomeando `arquivo:linha`. E a afirmação nova da rule — que `frontend/tests/` é type-checado pelo
`tsc -b` — foi **provada**, não aceita: erro de tipo plantado no `repo-docs-refs.test.ts` sai como
`error TS2322` no `pnpm build`. Nenhuma lição 13 nasceu no commit que corrige lição 13.

**Os quatro achados atacam o risco que a própria §7 declarou** — guarda que promete cobrir e não
cobre —, e os três primeiros foram **vistos passando verde contra a violação**, com árvore
restaurada limpa em cada sonda:

1. **Q-1 🟡** — a guarda 3 assere `api.defaults.headers` e **não** a cadeia de interceptors. Fixar
   `Content-Type: application/json` no interceptor de request de `axios.ts:45` — a segunda porta do
   mesmo arquivo, seis linhas abaixo da que a guarda vigia — passa a suíte **inteira** verde (16
   arquivos / 79 testes). O mutante não é hipotético: é literalmente o bug da lição 6, com FormData
   serializado como JSON, cada `File` virando `{}` e upload chegando vazio com 201 silencioso, em
   caminho de documento com peso legal.
2. **Q-2 🟡** — a D4 da spec escreve o escopo como `.claude/rules/*.md` (glob) e o `DOCS` do teste é
   lista literal de quatro nomes. Rule nova (`zz-sonda.md`) citando
   `backend/app/Domains/Inexistente/NaoExiste.php` → **13 passed**. O teste já carrega três
   guardas-de-si-mesmo (doc existe, volume > 60, citação deliberada viva); falta a do **conjunto**, e
   `.claude/rules/` é onde a lição 13 reincidiu duas vezes no mesmo arquivo.
3. **Q-3 🟡** — a guarda §5.2 varre só `backend/database/`; a lei não tem escopo.
   `DB::unprepared("CREATE TRIGGER …")` plantado em `backend/app/Shared/Pdf/PdfRenderException.php`
   → **2 passed**. A §5.1, no mesmo arquivo, já varre `app/` inteiro.
4. **Q-4 🟢** — `vite.config.ts:25` inclui `tests/**/*.test.ts` enquanto a linha ao lado usa
   `src/**/*.test.{ts,tsx}`. Teste de repositório que precise de JSX nunca roda, em silêncio.

**Uma observação medida que NÃO virou achado:** a §5.1 casa por nome de arquivo, e PSR-4 amarra nome
de arquivo a nome de classe para tudo que o autoload alcança — o escape "classe `Repository` em
arquivo com outro nome" é bem menor do que o ledger da execução supunha. Sobra a exclusão de
`/QueryBuilders/`, que é por path: `app/Domains/X/QueryBuilders/ClientRepository.php` escaparia.
Plausibilidade baixa demais para gastar um dos achados.

**Estado:** `blocked`, aguardando o João aprovar quais achados entram. Só achado aprovado se corrige.

### Correções do review — 2026-08-11: os quatro aprovados, dois commits

O João aprovou com a instrução literal `faça Q-1 á Q-4`. Backend em `45534c9`, frontend em
`b854019`. **Os quatro foram vistos vermelhos antes do verde**, cada um contra a violação que
promete pegar:

- **Q-3** — `DB::unprepared("CREATE TRIGGER …")` plantado em
  `app/Shared/Pdf/PdfRenderException.php` reprova agora pelas **duas** formas, e passava verde
  antes. A varredura da §5.2 virou `database/` **mais** `app/`.
- **Q-1** — o mutante no interceptor de `axios.ts` reprova o caso novo (1 failed / 10 passed) e
  passava a suíte inteira antes. A guarda ganhou uma guarda-de-si-mesma: `handlers` vazio (removido,
  ou renomeado numa major do axios) faria o laço iterar em vazio e passar sem exercitar nada.
- **Q-2** — `zz-sonda.md` reprova **nomeando a rule**, e passava com 13 verdes antes.
- **Q-4** — teste `.tsx` em `tests/` roda com o include corrigido (2 arquivos / 15 testes) e era
  **ignorado em silêncio** com o antigo (1 arquivo / 14 testes).

**Uma medição mudou o desenho do Q-1, e a versão recusada fica registrada.** A primeira forma
mandava uma requisição real por `adapter` e lia o header final — o que cobriria o pipeline inteiro.
Medido no jsdom: o próprio axios escreve `Content-Type: application/x-www-form-urlencoded` para
`FormData` (e `application/json` para objeto). É artefato do ambiente, não configuração da app, e
assertar ali **reprovaria o estado correto** — exatamente a armadilha da D-E2 deste bloco, onde
afirmar ausência de chave reprovava o `undefined` que o axios escreve de propósito. O universo da
guarda passou a ser o que a app **declara**: `defaults.headers` mais os interceptors registrados.

**Verificação depois das correções, refeita e não herdada:** backend **524 passed, 1 skipped (1963
assertions)** — o placar não muda porque a Q-3 alargou o universo de uma varredura sem somar teste;
Pint `passed` no `.php` tocado; frontend **16 arquivos / 82 testes** (+3 sobre os 79 do gate: dois
casos novos no axios, um no `repo-docs-refs`); `pnpm lint` limpo, `pnpm build` verde;
`typescript:transform` **sem diff** em `generated.ts`; `git diff main...HEAD` de `backend/database/`,
`backend/app/` e `frontend/src/features/` **vazios**; zero sonda sobrevivente.

**O que continua não provado, sem maquiagem:** as guardas de varredura seguem com escape por
construção, e três nomeados no ledger da execução continuam abertos por decisão de escopo — a
guarda 4 só vê token entre crases que **pareça path** (classe citada sem `/`, o caso
`LibreOfficeConverter`, segue fora), a guarda 1 casa por nome de arquivo (mitigado por PSR-4, não
fechado: `/QueryBuilders/` é exclusão por path e um `Repository` dentro dela escaparia) e a guarda 2
exige **declaração**, não correção. Nenhum dos três foi tocado por estas correções.

**Estado:** `ready_for_closure`. Nada pendente de decisão. O fechamento não roda automaticamente.

### Gate de fechamento — 2026-08-11

**Item 0 — o critério de aceite deste bloco, refeito e não herdado.** O DoD não é suíte verde: a
superfície das oito guardas nasceu limpa, então o que prova o bloco é **guarda vista reprovando com
sonda deliberada** (lição 10). As oito sondas foram plantadas de novo neste gate, não copiadas do
review, e a árvore foi restaurada limpa depois de cada uma:

| Guarda | Sonda | Reprovação |
|---|---|---|
| 1 · §5.1 | `app/Shared/Sonda/FooRepository.php` | nomeia o arquivo, com o diagnóstico do ADR-02 |
| 1 · §5.2 | `app/Shared/Sonda/TriggerAction.php` **e** `database/seeders/SondaTriggerSeeder.php` | quatro ocorrências, as duas formas nas duas pastas |
| 2 | `api/sonda/{parent}/{child}` sem binding tipado | `Rotas: GET\|HEAD api/sonda/{parent}/{child}` |
| 3 · porta A | `Content-Type` no `axios.create` | `não fixa Content-Type na raiz de defaults.headers` |
| 3 · porta B | `headers.set('Content-Type', …)` no interceptor | `expected [ 'application/json' ] to deeply equal []` |
| 4 · path | `docs/README.md` citando `backend/app/Shared/Pdf/NadaAquiConverter.php` | `docs/README.md:145  backend/app/Shared/Pdf/NadaAquiConverter.php` |
| 4 · glob | rule `.claude/rules/zz-sonda.md` fora da lista | `expected [ '.claude/rules/zz-sonda.md' ] to deeply equal []` |
| 5 | `'phone'` em `mapped` **e** em `summaryOnly` no `useStudentForm` | o `useCrudForm` lança nomeando a chave e as duas listas |
| 7 | gate de `sizeError` removido do `onRetry` | `× \`sizeError\` apaga o \`onRetry\`` |

As guardas **6** e **8** não têm sonda porque não são teste: a 6 é o barrel enxuto (conferido —
zero consumidor dos quatro símbolos fora do próprio `useCrudForm.test.ts`, por caminho relativo) e a
8 é a linha da P-25 na rule, que está lá.

**Itens 1–5.** Backend **524 passed, 1 skipped (1963 assertions)**. `pnpm lint` limpo, `pnpm build`
verde, `pnpm test` **16 arquivos / 82 testes** — a baseline era 13/47, e os três arquivos novos são
`repo-docs-refs.test.ts`, `useEntityPhoto.test.tsx` e `axios.test.ts` (o plano previa 15 arquivos
porque o caso da lição 6 nasceria dentro do `postMultipart.test.ts`; virou arquivo próprio na
execução). Pint `{"tool":"pint","result":"passed"}` nos 4 `.php`. `typescript:transform` sem diff em
`generated.ts` — nenhum DTO foi tocado. Zero código morto: `ScansPhpSource` tem exatamente dois
consumidores (`DomainDependencyTest`, `PersistenceLawsTest`), nenhum `.gitkeep` nem placeholder
nasceu, e `git status --porcelain` fica vazio depois das sondas.

**Item 6 — leis.** Nenhuma contrariada. O bloco não toca schema, `generated.ts`, auth, auditoria,
RBAC, financeiro nem documento legal; `backend/app/`, `backend/database/` e `frontend/src/features/`
não têm uma linha de diff contra a `main`. Os três arquivos de produção tocados fazem o que a spec
declarou: o barrel perde export sem consumidor, o `useCrudForm` ganha uma reprovação dentro do
`import.meta.env.DEV` que já existia (por construção não alcança o bundle) e o `vite.config.ts`
amplia o `include` do runner, que é build.

**Item 7 — pendências.** **P-04 fechada:** §5.1 e §5.2, as duas frentes que sobraram da resolução
parcial de 2026-08-03, agora têm mecanismo, visto vermelho neste gate. **P-25 fechada:** a linha
"hook genérico não importa tipo de `shared/ui`" está na `frontend-fsliced.md` com os dois casos
nomeados — era exatamente o gatilho, e não o constraint no `useFilePreview`. As duas fecham **aqui**,
como as próprias linhas prescreviam, e não por o bloco ter existido. **P-28 aberta, com o escape
medido no gate:** a guarda da lição 13 confere **path**, e `LibreOfficeConverter` — a terceira
reincidência, que motivou a guarda — passa **verde** por ser classe citada sem `/` (sonda em
`docs/adrs.md`: 14 testes passando). Nenhuma outra pendência venceu gatilho.

**O que fica aberto e declarado, sem maquiagem.** Cinco das oito guardas são varredura, e varredura
tem escape por construção. Três continuam nomeados: a **4** só vê token que parece path (P-28); a
**1** casa por nome de arquivo e exclui `QueryBuilders/` por path, então um `FooRepository.php`
dentro dessa pasta escaparia — decisão consciente, porque reprovar por semelhança de nome mataria o
padrão que o ADR-02 manda usar; e a **2** exige **declaração**, não correção: `withoutScopedBindings()`
com um comentário mentiroso passa. Nenhum dos três é defeito novo; os três estão escritos no docblock
da guarda que os carrega.

**Arquivamento:** plano → `plans/archive/2026-08-10-guardas-que-faltam.md`; spec →
`specs/archive/2026-08-10-guardas-que-faltam-design.md` (não é compartilhada — nenhum item do backlog
a consome). Entrega registrada no `progress.md`, com a de 2026-08-04 (`guardrails-e-transportes`)
descendo ao `progress-archive.md` para manter dez. **BD-1 removido do `backlog.md`**, junto das
linhas de débito que ele fechou (lição 13 sem mecanismo, Q-2 do `NestedRouteOwnershipTest`, Q-4 do
`postMultipart`, e o Q-2/Q-3 dos três achados de 2026-08-05 — o Q-4 desses três **fica**, porque o
bloco não o tocou). A linha do trio da foto **fica**: o teste do `useEntityPhoto` saiu aqui, a
absorção segue no BD-5.

**Estado do banco de dev:** intocado. O bloco não roda migration, não semeia e não escreve pela API
— nenhuma sonda tocou banco.

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

## Antepenúltimo item fechado — 2026-08-10 (`documentos-oficiais-template-e-docx`)

### Seleção — 2026-08-10

**Item 1 do `backlog.md`, escrito e selecionado explicitamente pelo João na mesma instrução.** Ele
descreveu o escopo em detalhe (fundo do certificado, realocação do QR, fidelidade tipográfica ao
template, manual conforme `manual.pdf` preenchido automaticamente, saída DOCX e botão na UI),
mandou abstrair no backlog e percorrer o workflow. O backlog foi escrito a partir dessa descrição;
ele não promoveu nada sozinho.

**Rota direta a `ready_for_planning`, sem Context Packet, por ausência medida de fonte externa**
(mesmo caso de `turma-habilitacao-listagem` e `profundidade-backend-b4-b7`): o item não cita Drive,
Notion nem Figma. As fontes são o repositório e os três templates **já versionados no repo** —
`docs/templates/certificado.pdf`, `docs/templates/manual.pdf` e `docs/templates/fundo-certificado.png`,
este último entregue pelo João junto da instrução. `context_packet: null`.

**Toca backend → main tree, sem worktree (P-03).** O bloco mexe em
`backend/resources/views/certification/certificate.blade.php`,
`backend/resources/views/operation/manual-turma.blade.php`, `ManualPdfService`, `TurmaController` e
no frontend (`features/operation/components/Document/`). Nenhum outro `active_work_item` de backend
está aberto, então o gatilho de fechamento da P-03 continua não vencido.

### Terreno medido antes de planejar (não é desenho, é fato)

1. **Os dois documentos já existem e já são Blade** — o bloco é refatoração, não construção:
   `certificate.blade.php` (2 páginas: certificado + temário) e `manual-turma.blade.php` (A4 retrato,
   3 tabelas), ambos via Gotenberg (`Shared/Pdf/GotenbergHtmlToPdf`). O manual já tem rota
   (`GET turmas/{turma}/manual`, `Operation/routes.php:25`), serviço (`ManualPdfService`) e botão
   (`features/operation/components/Document/ManualButton.tsx`, consumido por `TurmaDocuments.tsx:41`).
   O que não existe é **DOCX** — nenhuma ocorrência no repo.
2. **O manual do template não é o manual de hoje, nem em forma nem em conteúdo.** `manual.pdf` tem
   **5 páginas em ofício paisagem (1009×612 pt)** — Dados de la clase, Antecedentes Participantes,
   Control de Asistencia de Participantes (grade de 31 dias), Temas de La Capacitación, Evaluaciones.
   A Blade atual tem **3 tabelas em A4 retrato**, e o `@page { size: A4 portrait }` dela é decisão
   registrada (D4 do bloco 6d, com `preferCssPageSize` ligado no serviço). Mudar a orientação
   contradiz uma decisão escrita — o brainstorming tem de reabri-la explicitamente com o João, não
   sobrescrevê-la em silêncio.
3. **O fundo é pesado e o peso é o critério do próprio João.** `fundo-certificado.png` é
   **1414×2000, RGBA 8-bit, 1,2 MB** — proporção exatamente A4. Em base64 são ~1,66 MB **por página**
   que o embutir; o certificado tem 2 páginas e o manual, 5. O PDF são de hoje mede **40.119 bytes**
   (medido no gate de `certificacao-lote-e-snapshot`), e é essa a linha de base contra a qual o
   "visualizador travado" tem de ser medido.
4. **O QR e o par código/emissão trocam de lugar, não de existência.** Hoje `.meta` (`N°` + `Emisión`)
   abre a página 1 no canto superior **esquerdo** (`certificate.blade.php:244-247`) e o QR vive no
   rodapé dentro de `.footer-main` a 32mm (`:214-216`, `:313-316`). O template e a foto que o João
   anexou põem os três juntos no canto superior **direito**, QR menor com o par embaixo.
5. **O layout do certificado carrega guardas pagas com defeito medido em 2026-08-08** e documentadas
   no próprio arquivo: `min-height` em vez de `height` (com `height`, QR, assinatura e aviso legal
   saíram **sobrepostos** ao temário — documento corrompido sem aviso), o clamp
   `-webkit-line-clamp` da descrição e o limiar 80×7 que troca o tier de 11px pelo de 9px. Quem
   mexer no layout responde por elas; o `.accent-bottom` já tem falha de enquadramento **em aberto**
   declarada no arquivo (`:130-138`).
6. **DOCX via Blade é a pergunta aberta do bloco, e é decisão de arquitetura.** Não há biblioteca de
   escritório no `composer.json`; Gotenberg converte DOCX→PDF, nunca o contrário. O caminho a
   investigar no brainstorming é Blade renderizando WordprocessingML empacotado como OOXML; recorrer
   a biblioteca de terceiros é ADR, não escolha de implementação.

**Pendências tocadas pelo escopo, nenhuma vencida:** a **P-08** (RF-CUR-04 promete manual por curso;
implementado é Blade única) **não** dispara — o bloco continua com Blade única padronizada. A
**P-03** não fecha: um bloco de backend só.

### Brainstorming e spec — 2026-08-10

O João aprovou o desenho com a instrução literal `Aprovado — gravar e commitar a spec.` O estado
entra em `planning` no mesmo commit da spec; `active_plan` permanece `null` até a aprovação humana
deste documento e a escrita posterior do plano.

**Quatro decisões de abertura, respondidas por ele ANTES de a spec existir** (D1–D4 da §2):
manual com fonte de verdade única em Blade WordprocessingML, com o PDF saindo do mesmo `.docx` pela
rota LibreOffice; ofício paisagem igual ao template; fundo em JPEG de ~100 KB só no certificado; e
tipografia do certificado por fonte versionada com `@font-face`.

**A D2 reabre explicitamente a D4/D6 do bloco 6d** — o A4 retrato do manual, justificado na própria
Blade com "o cliente arquiva em A4, como todo documento oficial da Lotus". Não foi sobrescrita em
silêncio: as três saídas foram apresentadas e o João escolheu fidelidade literal ao arquivo aprovado
pela Lotus. O manual passa a ser o único documento oficial fora do A4.

**Três medições que mudaram o desenho, feitas antes de escrever:**

1. **O fundo entregue é limpo, e o peso tem referência própria.** `fundo-certificado.png`
   (1414×2000 RGBA, **1.245.172 bytes**) não tem logo, assinatura nem carimbos — é textura mais as
   barras azul/preta. O **mesmo fundo dentro do `certificado.pdf` aprovado** é um JPEG de
   **98.258 bytes** nas mesmas dimensões: 12,7× mais leve. O teto do bloco deixou de ser palpite.
2. **As fontes do template foram identificadas apesar da ofuscação do Word.** `pdffonts` só devolve
   `___WRD_EMBED_SUB_1235`; descomprimindo os oito programas de fonte e lendo o `name` table
   (`nameID 6`) saem **Lexend** (Regular/Bold/ExtraBold — três dos oito subsets), **Montserrat
   ExtraBold**, Comfortaa, Roboto e ArialMT. Lexend/Montserrat/Comfortaa são OFL e Roboto é
   Apache 2.0: nenhuma trava para versionar.
3. **A rota LibreOffice foi provada antes de virar decisão, não depois.** Pacote OOXML mínimo montado
   à mão (**1.207 bytes**) → `/forms/libreoffice/convert` → **`http=200`**, PDF de **18.671 bytes**,
   **`Page size: 1008 × 612 pts`** contra os 1009×612 do template, `LiberationSans-Bold` embutida e
   a célula com `w:shd w:fill="29A3E0"` no azul da Lotus. A D1 e a D2 repousam sobre medição.

**A contradição aparente entre D1 e D4 foi resolvida por medição, não por prosa** (§2.1 da spec):
`@font-face` é CSS e o manual deixa de passar por CSS, mas o texto do `manual.pdf` **é Liberation
Sans**, que o Gotenberg já tem — o probe a embutiu sem nenhuma instalação. D4 vale só para o
certificado.

**Um achado que a leitura do template produziu e o item do backlog não previa:** os títulos de página
do manual (`Libro de Control de Clases`, `Antecedentes Participantes`…) **não são texto** —
`pdftotext` da página 1 devolve só o conteúdo das células. Eles vivem dentro da faixa de cabeçalho
rasterizada (4205×378). Com a D3 deixando o manual sem fundo raster, os títulos passam a ser texto em
Liberation Sans Bold.

**Risco de review declarado ALTO** (§8 da spec): documento com peso legal mais dependência de infra
nova em caminho de produção → duas frentes, lente Claude e segunda frente do Codex read-only.

**A sessão parou no gate de leitura da spec, por escolha do João.** Ele optou por ler o documento
antes do `writing-plans`, então `next_owner` voltou para ele e a ação foi `approve_active_spec`.
Nenhuma linha de implementação foi escrita nessa etapa.

### Aprovação da spec e plano — 2026-08-10

O João aprovou a spec com a instrução literal `Spec aprovada, escreva o plano`. O plano ativo
(`docs/superpowers/plans/2026-08-10-documentos-oficiais-template-e-docx.md`) decompõe o bloco em
**11 tasks (0–10)**: baseline; fundo JPEG e fontes WOFF2 versionados; três tasks de certificado
(fundo, tipografia com remedição do limiar, QR); `App\Shared\Office\`; manual em Blade OOXML com o
PDF saindo do pacote; rota do DOCX; frontend; gate. O handoff fixa **`executor: claude`** — metade
das tasks fecha por comparação visual página a página com os templates, num laço de
render → olhar → ajustar. Nenhuma implementação foi iniciada durante o planejamento; o estado
transiciona para `ready_for_execution` no mesmo commit do plano.

**Baseline reconferido em `a703a26`, não herdado:** backend **503 passed, 1 skipped (1868
assertions)** — o mesmo placar do fechamento do `hardening-revisao-ui-assistida`, como esperado de
três commits só de documentação. O plano projeta **520 passed** ao fim do bloco (+17).

**A escrita do plano mediu o terreno e produziu nove desvios declarados** (§Desvios do plano), em vez
de silenciá-los. Os que mudam decisão da spec:

1. **`docs/templates/manual.docx` existe no repo** — a spec só tinha lido o PDF. Dele saíram o papel
   exato (`w:pgSz w:w="20183" w:h="12246"`, contra os 20160×12240 do probe), o `w:pgMar`, as larguras
   de coluna das cinco tabelas, a cor institucional **`25A5E4`** (e não `29A3E0`) e a descoberta de
   que o template declara **Arial** — Liberation Sans é a substituição métrica do LibreOffice, não a
   fonte pedida. Declarar Arial acerta o conversor **e** o Word do cliente (D-P3, D-P4).
2. **A conversão PNG→JPEG saiu sem mudança de infra.** A alternativa era `libjpeg-turbo-dev` no
   `docker/php/Dockerfile`; foi recusada por trocar imagem de produção para converter um asset uma
   vez. A rota `/forms/chromium/screenshot/html` do Gotenberg foi provada: JPEG **1414×2000 de 74.604
   bytes** com `quality=92`, contra os 98.258 do mesmo fundo dentro do certificado aprovado (D-P1).
3. **São duas faces WOFF2, não quatro** (a spec §3.3 dizia quatro): Lexend e Montserrat são fontes
   **variáveis**, e o Google Fonts serve a mesma URL para 400/700/800 do Lexend. 39.680 + 19.012
   bytes cobrem os quatro pesos (D-P2).
4. **`short_open_tag` está `On` no container**, então uma Blade que abra com o `<?xml …?>` literal
   morre em `Parse error: syntax error, unexpected identifier "version"` — confirmado executando os
   dois casos lado a lado. As quatro Blades do pacote abrem por uma diretiva `@xmlDecl`; `{!! … !!}`
   foi recusado por reintroduzir a interpolação crua que a guarda de escape proíbe (D-P9).
5. **`printBackground` não é necessário** — medido antes de aplicar o fundo: os PDFs com e sem o
   campo saem byte a byte do mesmo tamanho. `PageOptions` e `GotenbergHtmlToPdf`, que são
   compartilhados com o certificado, **não mudam** (D-P7).
6. **As grades do manual são formulário impresso com linha fixa** (22/20/20), e o plano fixa
   `max(N, fixas)`: turma pequena mantém as linhas em branco, turma grande estende a grade. Truncar
   esconderia aluno (D-P5).

A auto-revisão do plano contra a spec ainda achou seis erros no próprio rascunho e os corrigiu antes
de gravar: `makeStudentWithUser` não existe no `CreatesDomainRecords` (o idioma real é
`Student::create` sobre `User::factory()`); o `CertificatePdfTest` já tem `fakeGotenberg()`/
`assertHtml()` e não precisava de um helper novo; a guarda "sem `{{`" reprovaria o próprio comentário
Blade; duas asserções de contagem eram ambíguas (`<w:tr ` com espaço nunca casa; `6` e `10` também
são número de linha); a rota pública é `publico/certificados`, não `public/certificates`; e a troca
do controller precisava entrar na Task 7, senão um commit ficaria com a rota do manual quebrada.

**Risco de review continua ALTO** (§8 da spec): documento com peso legal mais dependência de infra
nova em caminho de produção → duas frentes, lente Claude e segunda frente do Codex read-only. O
review não roda automaticamente ao fim da Task 10.

**Uma pergunta fica aberta para o João, no Step 7 da Task 10:** `App\Shared\Office\` e a rota
LibreOffice são decisão de arquitetura de transporte. A recomendação do plano é **nota no ADR-12**,
não ADR novo — a rota LibreOffice é uma segunda porta do **mesmo** serviço do compose, com o mesmo
racional de "o transporte mora num lugar só".

### Execução iniciada — 2026-08-10

O João autorizou com `/executar-bloco documentos-oficiais-template-e-docx`. Execução no **thread
principal** conforme o `## Handoff de execução` do plano (`executor: claude`): metade das tasks
(3, 4, 5, 7 e 10) fecha por comparação visual página a página contra os templates, num laço
render → olhar → ajustar que exige leitura de imagem a cada iteração. Main tree, sem worktree (P-03).

**Task 0 provada em `8ee1d9e`:** backend **503 passed, 1 skipped (1868 assertions)** — bate com o
baseline do plano; `typescript:transform` sem diff em `generated.ts`; `pnpm lint` e `pnpm build`
verdes; `git status --porcelain` vazio.

### Tasks 1–9 entregues — 2026-08-10

Commits, do base `8ee1d9e`: `7d4a85f` (fundo JPEG), `90a353a` (fontes WOFF2), `11f75d5` (fundo
aplicado, morte do `.accent`), `042c2f2` (tipografia e remedição do limiar), `5037f24` (QR e bloco
de identificação no topo), `fc6c996` (`App\Shared\Office\`), `af046f6` (manual em Blade OOXML),
`2d815cb` (rota do DOCX), `86d81dc` (frontend com os dois formatos). Evidência task a task, e os
doze desvios declarados (D-E1..D-E12), em `.superpowers/sdd/progress.md`.

**Três desvios mudam o que o plano dizia, não só como foi feito.** **D-E6** — `Xml::lines()` nasceu
emitindo `<w:br/>` **dentro** do `<w:t>`, que é bem-formado e **inválido** contra o schema
(`CT_Text` é tipo simples); o separador passou a fechar e reabrir o `<w:t>`. **D-E7** — as fontes,
bordas e margens de cada tabela saíram **medidas do `docs/templates/manual.docx`**, tabela a tabela,
em vez do `sz 13/17` uniforme que o plano supunha. **D-E11** — `@else@xml(...)` **não compila**: o
regex de diretiva do Blade exige `\B@`, e o `e` de `@else` colado no `@` é fronteira de palavra; a
diretiva saía literal dentro do documento. O flag `$lineas` morreu e toda célula usa `@xmlLines`.

### Task 10 — o gate do bloco (2026-08-10)

**Ferramentas.** Backend **519 passed, 1 skipped (1950 assertions)** — contra os 520 projetados pelo
plano; a diferença é a Task 5, que substituiu asserções em vez de somar teste. `typescript:transform`
**sem diff** em `generated.ts` (nenhum DTO mudou de forma). `git diff` de `backend/database/`
**vazio** — zero schema, como o plano exige. Pint `passed` nos arquivos do bloco. Frontend: `pnpm
lint` limpo, `pnpm build` verde, **13 arquivos / 47 testes**.

**E2e contra a API real**, sessão Sanctum por cookie + CSRF. `GET /api/turmas/1/manual` → **200**
`application/pdf` + `inline; filename="manual-turma-1.pdf"`; `GET /api/turmas/1/manual/docx` → **200**
`…wordprocessingml.document` + `attachment; filename="manual-turma-1.docx"`. `pdfinfo` do manual:
**`Pages: 5`**, **`Page size: 1008 x 612 pts`**. Pesos: certificado **199.820 B** (linha de base
40.119, teto do plano 251.450), manual `.docx` **19.259 B**, manual `.pdf` **52.966 B**, template de
referência 444.830 B.

**Contrato do certificado intacto:** `snapshot_ok` **False** só no `LOT-2026-1001`, que segue
corrompido de propósito no banco de dev como evidência viva do checkpoint visual pendente do João.
`migrate:fresh --seed` **não** foi rodado, pelo mesmo motivo do bloco anterior. 51 consumidores das
classes de `App\Shared\Office\`; zero `Repository`; a única ocorrência da varredura de sobra é
`CertificatePdfTest.php:737`, que é a guarda `assertStringNotContainsString('class="qr"', $html)` —
asserção de **ausência**, não referência sobrevivente.

**O que o gate NÃO provou, sem maquiagem:** fidelidade **pixel a pixel** contra os templates — a
comparação foi de grade, cor e posição, página a página, com os PNGs de 144 dpi lado a lado;
comportamento de turma sem alunos ou sem módulos além do que os testes cobrem; e o manual aberto no
**Word do cliente** — a conversão foi validada pelo LibreOffice do Gotenberg, que é o mesmo motor
que gera o PDF, não um segundo leitor independente.

**Três decisões do João no checkpoint visual, todas registradas:**

1. **QR do certificado muda de lado.** A `§3.4` da spec pedia topo **direito**, e a Task 5 entregou
   assim; o gate mostrou que o `docs/templates/certificado.pdf` abre a folha com o retângulo do QR à
   **esquerda**. Ele decidiu pelo template. Corrigido em `ee285df` (`align-self: flex-start`), com o
   lado **assertado no teste** — a divergência veio de uma releitura da spec, e sem guarda a próxima
   releitura reverteria em silêncio uma decisão tomada contra ela.
2. **Fundo do certificado: aceitar agora, tratar depois** → **P-28**. Faltam as cunhas diagonais das
   quinas da página 1 (são **vetor** no PDF aprovado; o raster versionado não as contém) e a faixa
   azul/preta se repete na página 2, onde o aprovado é cinza limpo. Nenhuma das duas estava nas
   exclusões aceitas da §7 da spec, por isso viraram pendência em vez de silêncio.
3. **ADR: nota no ADR-12, não ADR novo.** `App\Shared\Office\` e a rota LibreOffice são a segunda
   porta do **mesmo** Gotenberg do certificado, com o mesmo racional de transporte. A nota está
   escrita. Isso **venceu o gatilho da P-20** (o bloco tocou `docs/adrs.md`) e resolveu metade da
   **P-21** — as duas foram **atualizadas, não fechadas**: o hospedeiro do `openspout` segue sendo
   escolha dele, e o `simple-qrcode` pertence a um bloco de Certification, não a este.

**Pendências revisadas:** a **P-08** não disparou (o manual continua Blade única padronizada, agora
em OOXML) e a **P-03** não fechou (um bloco de backend só). Nasceu a **P-28**. P-04 reavalia
**2026-08-15**; P-15, P-23, P-25, P-26 e a nova P-28 revisam **2026-09-30**.

**Risco de review continua ALTO** (§8 da spec): documento com peso legal mais dependência de infra
nova em caminho de produção → duas frentes, lente Claude e segunda frente do Codex read-only. O
bloco **para** em `ready_for_review`; review, fechamento, push e PR não rodam automaticamente.

### Review de sprint — 2026-08-10: duas lentes, 7 achados, todos aprovados e corrigidos

**ALTO RISCO** pela §8 da spec (documento com peso legal + dependência de infra nova em caminho de
produção). Lente Claude com o gabarito do projeto + `mcp__codex__codex` read-only sobre
`8ee1d9e..HEAD` (11 commits, 38 arquivos). **Órfãos: zero** — `ManualPdfService` morreu sem
referência sobrevivente, as cinco classes de `App\Shared\Office\` têm consumidor e a chave de locale
`documents.manual` não sobrou em nenhuma das três locales. **Leis §5 limpas:** zero `abort(` em
`Domains/Operation/`, zero Repository, `generated.ts` sem diff, `git diff` de `backend/database/`
vazio, controller fino, `ManualButton` só via `shared/ui`, permissão nas duas rotas com teste de 403.

**Uma divergência entre as lentes, mostrada em vez de resolvida em silêncio.** O achado nº 1 do
Codex — `w:tcPr` emitindo `vAlign`/`tcMar`/`shd`/`tcBorders` fora da sequência ECMA-376 — foi
**REJEITADO por medição**: descompactado, o `docs/templates/manual.docx` escrito pelo Word usa
exatamente a mesma ordem (`tcW, vAlign, tcMar, …, shd, tcBorders` ×706; `trHeight, cantSplit` ×81).
Sobrou dele só a parte confirmada em separado, que virou a Q-1. Também **não** foi reportada a
ausência de validação do corpo do PDF no `GotenbergDocxToPdf` (Codex nº 4): é o comportamento
idêntico do `GotenbergHtmlToPdf` já em produção pelo ADR-12, e apertar só um lado criaria assimetria
entre as duas portas do mesmo serviço.

**O João aprovou Q-1..Q-7 na íntegra** (`Todos de Q-1 a Q-7`); todos entraram em `96d7256`.

**Documento (Q-1, Q-2), com o template como árbitro.** O cabeçalho é um partial incluído cinco
vezes e escrevia `wp:docPr id="1"` nas cinco — o Word identifica figura pelo id e pede reparo do
arquivo quando ele repete, e o gate havia declarado, sem maquiagem, que o manual **nunca foi aberto
no Word do cliente**. O template aprovado numera os seus dez desenhos **1..10** e escreve
`pic:cNvPr id="0"` nos dez; as duas convenções foram medidas e seguidas (contador no `@include`,
`cNvPr` fixo em 0). A Q-2 trocou o `load('enrollments…')` por `orderByStudentName()`: as três grades
numeram linha a linha e são **assinadas** por linha, e PDF e DOCX são dois requests — sem ORDER BY a
mesma turma podia sair com duas numerações. O `EnrollmentQueryBuilder` já documentava o defeito para
a tela; aqui ele tinha peso de documento.

**Mecanismo (Q-3), com uma correção ao próprio achado.** O `OoxmlPackager` passou a conferir
`tempnam`, `open`, `addFromString`, `close` e a leitura, a apagar o temporário num `finally` e a
recusar pacote sem nenhum byte com `OfficeRenderException`. **O achado dizia "HTTP 200 com zero
byte" e isso não se reproduz:** sob o handler de erro do Laravel, o `file_get_contents` de um arquivo
ausente vira `ErrorException`. O que foi medido no vermelho do teste é pior de outro jeito — 500 sem
tipo de domínio, com o caminho `/tmp/ooxmlXXXXXX` dentro do `detail` e o `unlink` pulado. A porta
que devolveria bytes vazios em silêncio é o `open()` falhando, que deixa para trás o arquivo de zero
byte do `tempnam`; é ela que a checagem de `open` fecha.

**Teste (Q-4):** o `500_rfc7807` afirmava só o status — um 500 em HTML puro passaria. Passou a
afirmar `content-type`, `type`, `title`, `status` e o `detail` que nomeia o conversor. É guarda,
não conserto: o comportamento já estava certo, faltava a asserção.

**Doc (Q-5):** a nota do ADR-12 citava `LibreOfficeConverter`, classe que nunca existiu (lição 13);
agora nomeia `DocxToPdf` e `GotenbergDocxToPdf`, com o paralelo explícito ao `GotenbergHtmlToPdf`.

**Frontend (Q-6, Q-7):** o download do DOCX revogava o objectURL no mesmo stack do `click()` de uma
âncora **nunca anexada ao DOM** — duas causas conhecidas de download que não começa, e assimetria
com o caminho do PDF ao lado, que fazia certo. A âncora passou a ser anexada e o objectURL a viver
no `urlRef` até a próxima geração ou o unmount, com os dois formatos usando o mesmo `keepUrl`. A Q-7
separou o estado: `useMutationErrors` devolve o **primeiro** erro truthy e só a mutação disparada
reseta o próprio erro, então o erro do PDF sobrevivia a um DOCX baixado com sucesso; e o `pending`
fundido girava os dois botões juntos, anunciando o Word quando o pedido tinha sido o PDF.

**Verificação depois das correções, refeita e não herdada:** backend **522 passed, 1 skipped (1961
assertions)** — +3 testes / +10 asserções sobre o 519/1951 do gate, e os três testes novos foram
**vistos vermelhos** antes da correção (ids `1,1,1,1,1`; ordem `Zoe, Ana, Bruno`; `ErrorException` no
lugar da `OfficeRenderException`). Pint `passed`; `typescript:transform` sem diff em `generated.ts`;
`git diff` de `backend/database/` vazio; frontend `pnpm lint` limpo, `pnpm build` verde, **13
arquivos / 47 testes**. E2e contra o documento real da turma do seed: `.docx` de **19.269 B** com
`docPr=1,2,3,4,5`, `cNvPr=0,0,0,0,0` e as doze matrículas em ordem alfabética; PDF convertido de
**52.954 B**, **`Pages: 5`**, **`Page size: 1008 x 612 pts`**, página 2 conferida na imagem.

**O que continua não provado, sem maquiagem:** o manual **aberto no Word do cliente**. A Q-1 remove
a causa conhecida de "pedir reparo", medida contra o template, mas o segundo leitor independente
continua sendo o do João. A Q-6 tem correção sem teste: o corte do runner do frontend cobre os hooks
de `shared/`, e hook de feature com DOM segue fora dele — dizer o contrário seria cobertura fantasma
(lição 10).

**Uma divergência numérica registrada, sem consequência:** o gate do bloco anotou **1950**
asserções; a suíte na mesma árvore mede **1951**. O número do gate está errado por um.

**Estado:** `ready_for_closure`. Nada pendente de decisão. O fechamento não roda automaticamente.

### Gate de fechamento — 2026-08-10

**O item 0 foi refeito, não herdado.** As correções Q-1..Q-7 entraram depois do e2e da Task 10 e
mexeram no documento (ids do `wp:docPr`, ordem das matrículas), no `OoxmlPackager` e no frontend —
então o critério de aceite do bloco foi provado de novo contra a API real, e não pelo relatório do
gate anterior.

**Ferramentas.** Backend **522 passed, 1 skipped (1961 assertions)** — o mesmo placar da verificação
pós-review, contra os 520 que o plano projetava. Pint `--test` **`passed`** nos **22** `.php` vivos
do bloco. `typescript:transform` executado: **sem diff** em `generated.ts`, `git status --porcelain`
vazio depois de rodar. `git diff main...HEAD -- backend/database/` **vazio** (zero schema). Frontend:
`pnpm lint` limpo, `pnpm build` verde, **13 arquivos / 47 testes**. As três locales com **538 chaves
cada e zero diff** entre si.

**E2E com sessão Sanctum por cookie + CSRF, só GETs — nenhuma mutação no banco de dev.**
`GET /api/turmas/1/manual` → **200** `application/pdf` + `inline; filename="manual-turma-1.pdf"`,
`pdfinfo` dizendo **`Pages: 5`** e **`Page size: 1008 x 612 pts`**; `GET /api/turmas/1/manual/docx` →
**200** `…wordprocessingml.document` + `attachment; filename="manual-turma-1.docx"`.

**O pacote foi aberto, não suposto.** As cinco parts (`[Content_Types].xml`, `_rels/.rels`,
`word/document.xml`, `word/_rels/document.xml.rels`, `word/media/lotus-logo.png`),
`w:pgSz w:w="20183" w:h="12246" w:orient="landscape"` **idêntico ao `docs/templates/manual.docx`**,
`wp:docPr` numerado **1,2,3,4,5** e `pic:cNvPr id="0"` cinco vezes — as duas convenções da Q-1
vivas no documento entregue, e não só no teste.

**Preenchimento por contagem (DoD 4):** turma de **12 matrículas**, cada nome aparecendo **3 vezes**
(uma por grade), grades em 23/21/21 linhas (cabeçalho mais as 22/20/20 fixas) — com N=12 o
`max(N, fixas)` da D-P5 mantém as linhas em branco, como o formulário impresso. Rodapé de horas
fechando com a soma dos módulos: 8+6+4 = **18 T**, 4+10+8 = **22 P**.

**Pesos (DoD 1):** manual `.docx` **19.269 B**, manual `.pdf` **52.954 B** (template de referência
444.830 B), certificado **199.830 B** contra a linha de base **40.119 B** e o teto **251.450 B** do
documento aprovado pela Lotus.

**Fonte de verdade única (DoD 9), conferida no código:** `ManualDocumentService::pdf()` é
`converter->render($this->docx($turma))`. Não há segundo caminho de montagem.

**Contrato do certificado (DoD 7):** `GET /api/certificates` **200** com os treze campos de sempre e
`snapshot_ok` **false só** no `LOT-2026-1001`; `show` do são **200**; rota pública **sem cookie**
**200**; o corrompido devolve **500 `application/problem+json`** no `show` e no `pdf`, nomeando
`LOT-2026-1001` **e** o campo `aluno.name`.

**Visto renderizado (DoD 8):** 14 PNGs comparados página a página. As **cinco** páginas do manual
batem com o template em grade, colunas, cores e contagem de linhas; no certificado as únicas
divergências são as já declaradas — assinatura da gerente e carimbos SENCE/NCH pela §7 da spec,
cunhas das quinas e faixa na página 2 pela **P-28** —, confirmadas na imagem em vez de assumidas.

**Órfãos e leis §5:** 54 consumidores das classes de `App\Shared\Office\`; zero sobra de
`ManualPdfService`, `manual-turma.blade`, `class="accent"` ou `class="meta"` (os únicos hits são um
comentário que explica a renomeação e a asserção de **ausência** de `class="qr"`); zero `abort(` em
`Domains/Operation/`; zero Repository; nenhum import de PrimeReact direto nem cross-feature nos três
arquivos de frontend do bloco.

**Pendências:** nenhuma nasceu neste gate e nenhuma fechou. A **P-28** já entrou no gate técnico; a
**P-20** e a **P-21** foram atualizadas, não fechadas (o hospedeiro do `openspout` e a nota do
`simple-qrcode` seguem com o João). A **P-08** não disparou (manual continua Blade única
padronizada, agora em OOXML) e a **P-03** não fechou (um bloco de backend só). P-04 reavalia
**2026-08-15**; P-15, P-23, P-25, P-26 e P-28 revisam **2026-09-30**.

**Uma imprecisão do plano, registrada em vez de corrigida retroativamente:** o Step 2 da Task 10
escreve `"password":"password"` como credencial do seed, e a senha real é `senha123` — todos os
outros planos do repositório escrevem certo. O plano aprovado **não** foi reescrito (precedente da
P-27) e o e2e deste gate rodou com a credencial correta.

**Divergência de outro bloco, achada e não corrigida pelo segundo gate seguido:** a linha do
`turma-habilitacao-listagem` no `progress.md` tem um `|` não escapado em
`Spatie\LaravelData\Optional|int`, que parte a tabela naquela linha. O fechamento do
`hardening-revisao-ui-assistida` já a registrou sem tocar; reverter aquela decisão sem o João seria
a mesma deriva silenciosa que o gate existe para impedir.

**Arquivamento:** plano → `plans/archive/2026-08-10-documentos-oficiais-template-e-docx.md`; spec →
`specs/archive/2026-08-10-documentos-oficiais-template-e-docx-design.md` (não é compartilhada com
nenhum item futuro registrado). A referência interna do plano à spec foi reapontada para o path
arquivado. Entrega registrada no `progress.md`, com a de 2026-08-04
(`hardening-estrutural-pre-sprint-4`) descendo para o `progress-archive.md` para manter dez. Item 1
removido do `backlog.md`, com renumeração dos seguintes.

**Estado do ambiente:** `migrate:fresh --seed` **não** foi rodado — o banco de dev segue carregando
o `LOT-2026-1001` corrompido de propósito para o checkpoint visual do João, que é justamente a
evidência viva que o DoD 7 usa. O e2e deste gate foi read-only.

**O que o fechamento NÃO provou, sem maquiagem:** o manual **aberto no Word do cliente** (a Q-1
remove a causa conhecida de "pedir reparo", medida contra o template, mas o segundo leitor
independente continua sendo o do João); fidelidade **pixel a pixel** — a comparação foi de grade,
cor e posição; e a Q-6 segue **sem teste**, porque o runner do frontend cobre os hooks de `shared/`
e hook de feature com DOM está fora dele (lição 10).

**Estado:** `idle`. Nenhum item promovido — a seleção do próximo é do João.
