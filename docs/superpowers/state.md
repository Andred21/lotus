---
schema_version: 1
active_feature: perfil-e-kit-compartilhado
active_work_item: bd16-perfil-e-kit-compartilhado
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-08-17-bd16-perfil-e-kit-compartilhado-design.md
active_plan: docs/superpowers/plans/2026-08-17-bd16-perfil-e-kit-compartilhado.md
context_packet: null
blocker: null
last_completed_work_item: meu-perfil-frontend
state_basis_commit: 135e468
updated_at: 2026-08-17T18:05:00-03:00
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

## Item ativo — `bd16-perfil-e-kit-compartilhado` (promovido em 2026-08-17)

**Promoção explícita do João**, a partir da auditoria
`audits/2026-08-17-perfil-ui-review-e-design.md`. O estado saiu de `idle` para `ready_for_planning`
no mesmo commit que grava a auditoria e o BD-16 — a fronteira durável é essa, e não a leitura do
relatório.

**Como o item nasceu.** Duas lentes sobre `/perfil`, na mesma sessão: o `/lotus-ui-review` (1 achado
**C**, 8 **B**, 18 capturas em `.artifacts/ui-review/2026-08-17-1241-perfil/`) e o `frontend-design`
(7 achados estéticos). Nenhum código foi tocado por nenhuma das duas — o passo 16 da skill proíbe, e
a auditoria é registro, não correção.

**Escopo escolhido: A + B + C, com a D-28 dentro.** As três frentes estão no BD-16 do
`backlog.md`; a D-28 (dar marca visual ao corte de mutabilidade da spec D1) entrou por decisão
explícita do João na mesma seleção, e **precede a D-27** — reordenar sem marca visual só troca qual
metade fica por último.

**Por que `ready_for_planning` e não `context_required`.** As Sprints 5 e 6 exigiam Context Packet
porque o escopo delas era canônico do Drive. Este bloco não tem fonte externa: cada item é medição
local, feita no navegador ou por `grep` no repositório, e a auditoria já é o pacote de contexto.
Nenhuma consulta a Drive, Notion ou Figma é necessária para planejá-lo.

**O bloco absorve o BD-10 e reabre duas pendências travadas.** P-36 e P-37 estavam adiadas desde
2026-08-13 pelo mesmo motivo — `FormSection` e `FormField` sob reescrita ativa do BD-5 —, e o
impedimento venceu. O gatilho literal da P-36 (*"bloco que tocar `FormSection` ou `CoursesTable` por
outro motivo"*) foi disparado pelo DS-01 da auditoria.

**Três coisas que o planejamento precisa tratar e que não são detalhe:**

1. **O alcance sai de `/perfil`.** `FormSection` tem 11 consumidores, `AppPassword` 5 sítios,
   `AppFileRow` serve comercial/turma/redator, `AppTag` aparece fora da tela. O plano declara os
   sítios e o DoD prova que nenhum regrediu — a lei 6 manda a correção para `shared/ui`, então o
   alcance é consequência, não escolha.
2. **A P-36 traz uma decisão junto, não só um fix.** O seletor da catraca `COR_HARDCODED` precisa
   distinguir cor crua de `var(--…)` em `style={{ }}`, e é isso que sempre adiou a guarda.
3. **Dois achados ficaram FORA por decisão pendente:** DS-05 (`scale-200` no avatar — a previsão de
   recorte é aritmética e precisa de medição no navegador antes de virar task) e DS-07 (mural de
   credenciais como assinatura da tela — inverte a ordem da spec D1, é bloco próprio).

**Colisão de ID encontrada e não corrigida.** Existem dois `D-18` no `backlog.md`: a data do
`AppFileRow` (que este bloco cobre) e o `description` em espanhol fixo do Dashboard, em "Travados em
decisão". Renumerar é decisão do João — está anotado nas duas linhas.

### Planejamento — fechado em 2026-08-17

**Spec:** `specs/2026-08-17-bd16-perfil-e-kit-compartilhado-design.md`. Oito decisões escolhidas pelo
João (D1–D8) e sete derivadas (D9–D15).
**Plano:** `plans/2026-08-17-bd16-perfil-e-kit-compartilhado.md` — 16 tasks. As 8 primeiras entregam
o kit compartilhado (`shared/ui`), as 7 seguintes aplicam em `/perfil`, a 16ª é o gate do bloco.
Executor `claude`, worktree `fix-frontend`, branch `feat/bd16-perfil-e-kit-compartilhado` a partir de
`main@135e468`. P-03 não dispara: o bloco é frontend puro.

**Duas tasks abrem ponto de decisão por medição, não por escolha do executor:**

- **Task 8** ramifica: `onToggleMaskKeyDown` do Prime (`password.cjs.js:588-593`) **já trata**
  `event.code === 'Space'`. Se o teste da Task 8 passar sem código novo, o defeito não reproduz em
  jsdom e a task vira registro medido, não correção. Um handler no wrapper chamaria `toggleMask()`
  duas vezes e devolveria o campo ao estado inicial — o defeito pioraria ficando invisível.
- **Task 15** para e pergunta se a faixa recortar o avatar (ver o risco abaixo).

**Duas divergências medidas contra o que estava escrito, e o que venceu:**

1. **`FormSection` tem 16 consumidores, não 11.** A ficha da P-36 mediu 11 em 2026-08-13; os cinco
   arquivos de `Profile/` nasceram depois, e o DoD do BD-16 no `backlog.md` herdou o número velho.
   **Vence a medição de hoje.** A correção do registro sai no fechamento, junto do encerramento das
   duas pendências — auditoria reporta, não corrige no meio do bloco.
2. **O `aria-pressed` que a D-24 pede foi RECUSADO com motivo.** `AppPassword.tsx:50-57` registra a
   decisão de 2026-08-13 (UI-04): o olho é botão, não `switch`, porque o **nome** dele alterna a cada
   clique — e o `aria-checked` do Prime foi removido justamente por mentir sobre o estado. Pendurar
   `aria-pressed` num botão cujo nome já carrega o estado o anuncia duas vezes. A D-24 fecha pela
   metade do teclado (Espaço); a metade do `aria-pressed` não entra. Está na D6 da spec.

**Um risco que pode reabrir a DS-05 durante a execução.** A faixa horizontal da D8 esbarra no
`transform scale-200` do `AppPhotoField`, e a DS-05 está fora do bloco. Se a faixa recortar no
navegador, a decisão volta ao João: ou a DS-05 entra, ou a faixa fica só na parte de baixo do
cartão. Medir antes de escrever o layout.

## Trabalho fora de bloco — 2026-08-17 (revisão de UI do Dashboard e passe de correção)

**Isto não é um `active_work_item` e não muda `workflow_state`.** O estado segue `idle`,
`active_work_item` segue `null` e `state_basis_commit` segue `0afdb55`. A seção existe porque houve
escrita de código sem bloco promovido, e escrita não registrada é exatamente o que o
`/auditar-docs` volta a achar depois como divergência nova.

**Duas invocações do João, na mesma sessão.** Primeiro `/lotus-ui-review dashboard`, que é passo
dele por `disable-model-invocation: true`; depois, lido o relatório, a instrução de cruzar os
achados com a skill `frontend-design` e corrigir. Nenhum item do `backlog.md` foi promovido, nenhum
gate de `/planejar-bloco` correu, e não existem spec nem plano — **por decisão dele, não por
esquecimento do fluxo.**

**A divergência de registro que o fechamento do B1 deixou aberta fecha aqui.** O
`/fechar-sprint` de 2026-08-16 escreveu que o `/lotus-ui-review` daquele bloco "rodou mas não deixou
artefato em `docs/superpowers/audits/`". A execução de 2026-08-17 deixa:
`audits/2026-08-17-lotus-ui-review-dashboard.md`, com o `report.txt` verbatim, o passe de correção e
os números medidos antes e depois. A evidência bruta (13 capturas + 5 snapshots da revisão, 10 do
passe) fica em `.artifacts/ui-review/`, coberta por `.gitignore:24-25` — o relatório é o que se
versiona, não os PNG.

**A revisão não era redundante, e o próprio fechamento anterior dizia por quê:** `f38585e` tocou
`DashboardItemRow`, `KpiRow` e `PipelineFunnel` **depois** do commit da revisão visual `3273cbf`,
sem re-rodar os passos visuais do DoD. Medido agora, as cinco correções de 2026-08-16 se sustentam.

**6 achados B, 0 C, todos corrigidos.** Os números de antes e depois estão na §3.1 do artefato de
auditoria e não se repetem aqui. A tese de desenho que amarra o passe é uma só: **cor de sinal vive
em traço e marca; texto fica em contraste cheio** — é o que fecha a UI-04 na raiz, porque o tom sai
do número (onde precisava de 4,5:1 e entregava 2,86) e vai para o trilho (onde 3:1 basta e entrega
5,2–5,8).

**Três achados que não estavam no relatório apareceram ao corrigir e entraram junto:** a faixa do
`AppCardHeader` media 80px para 24px de texto em **todo card da aplicação**; a barra do funil
reprovava o 3:1 de elemento gráfico contra o próprio trilho nos dois temas; e dois sítios fora do
Dashboard pintavam texto com `var(--red-500)` cru a 3,52:1 — o caso que a **P-36** descreve.

**O alcance fora do Dashboard está declarado, não descoberto depois:** as quatro tintas de tom mudam
de valor em ~20 sítios; o `AppCardHeader` encurta nos 8 consumidores; `variant="stat"` também é do
`BudgetStatCard`, e a tela de orçamento foi conferida no navegador; o link de salto é do shell e
vale para toda rota protegida.

**Nasce a P-46**, e ela é a causa raiz da UI-02 que este passe **não** fechou: sem Preflight, toda
tag de bloco herda margem do agente do usuário. A neutralização foi feita onde custava e parou aí —
o reset escopado mexe no espaçamento de todas as telas de uma vez e é decisão do João.

**Branch `fix/dashboard-revisao-visual-2026-08-17`**, nascida de `main@18bf487`, oito commits de
código (`abff4be`…`2fc0bd8`) mais este de documentação, um por alteração. Gate: `pnpm lint` exit 0,
`pnpm build` verde, `pnpm test` **39 arquivos / 223 testes**. Zero mutação de dado.
`backend/config/cors.php` (WIP do João, o outro lado da P-45) ficou fora de todo `git add` — os
commits usaram paths exatos.

**Estado: `idle`.** O passe está entregue e o merge é decisão do João. O backlog não promove nada
sozinho.

## Último item fechado — 2026-08-17 (`meu-perfil-frontend`, Sprint 6 · Meu Perfil, bloco 2 de 2)

### Seleção — 2026-08-15

**Bloco restante da Sprint 6 (`backlog.md:64`), promovido explicitamente pelo João** com o estado
desta árvore em `idle` e `active_work_item` `null`. Três decisões dele fecharam o gate: correr **em
paralelo** com o `dashboard-frontend-central-controle`; a worktree **`fix-frontend`** com branch
nova a partir da `main`; e a rota **`context_required`**, como o backlog exige para a Sprint 6
inteira (`backlog.md:61`).

**O gate reprovou por motivo NOVO, e é a primeira vez em doze promoções.** As onze anteriores
(BD-1, BD-2, BD-7, BD-8, BD-9, BD-5, `login-fora-do-adr16`, `celula-de-identidade`,
`dashboard-backend-agregacoes`, `meu-perfil-backend-self-service` e
`dashboard-frontend-central-controle`) reprovaram porque o argumento era **título de seção**. Aqui o
argumento **trazia o slug** (`## Sprint 6 · Meu Perfil **meu-perfil-frontend**`); o que reprovou foi
**divergência de estado medida entre duas árvores**:

| Onde | Branch / commit | `workflow_state` | `active_work_item` |
|---|---|---|---|
| worktree `fix-frontend` | `main` `36faf44` | `idle` | `null` |
| main tree `/home/jvbat/projetos/lotus` | `feat/dashboard-frontend-central-controle` `1a56207` | `context_required` | `dashboard-frontend-central-controle` |

O `1a56207` promoveu o bloco B da Sprint 5 às **09:20:07**, 23 minutos depois do state desta árvore
(`08:57:58`), e **não chegou à `main`** — está um commit à frente, na branch dele. Nas duas leituras
o gate reprovava para `meu-perfil-frontend`: `idle` não é estado aceito, e o `context_required` do
main tree pertence a **outro** work item. A regra do `CLAUDE.md` §3 (divergência → PARE, não escolha
por heurística) foi aplicada como escrita: nenhum arquivo tocado antes da decisão do João.

### Exceção declarada à invariante de um `active_work_item` — quinta ocorrência, e a primeira frontend × frontend

**Existem dois itens ativos ao mesmo tempo, por decisão explícita do João em 2026-08-15**, e isto
está escrito porque a invariante do topo deste arquivo diz o contrário. As quatro anteriores
(BD-4 × BD-9, BD-5 × login, BD-6 × `celula-de-identidade`, e
`dashboard-backend-agregacoes` × `meu-perfil-backend-self-service`) eram backend × frontend ou
backend × backend. **Esta é a primeira em que os dois blocos são de frontend.**

**A P-03 não dispara, e o motivo é literal:** o gatilho da ficha (`pendencias/abertas.md:331-333`) é
"mais de um `active_work_item` de **backend**". Nenhum destes dois toca backend — os dois consomem
contrato já mergeado na `main` (`36faf44`, PR #53 e #54). **Mas a ausência do gatilho não significa
ausência de colisão**, e a colisão desta dupla é de outra natureza: as duas frentes escrevem no
**mesmo shell** `frontend/src/app/`.

**A sobreposição foi medida antes de escrever esta seção, não depois — quatro pontos:**

1. **`frontend/src/app/router/AppRouter.tsx` — colisão certa, 75 linhas, arquivo único.** As duas
   frentes acrescentam import no bloco 1-18 e rota no bloco 58-68. **A rota `/perfil` já existe**
   (`AppRouter.tsx:68`, hoje `<ModulePlaceholder titleKey="userMenu.profile" />`) e a `/` também
   (linha 58, `DashboardPage`) — cada frente substitui a **sua** linha. O conflito real é o bloco de
   imports, e é textual, não semântico: resolução mecânica no merge.
2. **`frontend/src/features/` — zero colisão, medida.** Tem cinco domínios (`catalog`,
   `certification`, `commercial`, `identity`, `operation`); **nem `dashboard` nem `profile`
   existem**. Cada frente cria a própria pasta. Onde exatamente o perfil nasce sob o ADR-05 é
   decisão do brainstorming — o backend dele vive em `App\Domains\Identity`, e `features/identity/`
   já existe.
3. **`frontend/src/shared/types/generated.ts` — zero colisão, e por mecanismo.** Os dois blocos são
   **consumidores**; nenhum regenera. Os dois backends já estão na `main`.
4. **`shared/ui/` — colisão possível, não medida ainda.** As duas frentes podem querer wrapper novo.
   Fica declarado como risco de merge, não como fato.

**Alternativa recusada por ele:** fechar o `dashboard-frontend-central-controle` primeiro, o que
manteria a invariante e eliminaria a colisão do `AppRouter.tsx` na origem, ao custo de o bloco não
começar hoje.

### Área de trabalho

**Worktree `fix-frontend`** (`/home/jvbat/projetos/fix-frontend`), branch
`feat/meu-perfil-frontend` criada de `main@36faf44` — o merge do PR #54, HEAD da `main`, que já
carrega o backend do bloco 1. O prefixo `feat/` segue o precedente de todas as branches do projeto;
o João nomeou o slug. A árvore estava limpa e em `main` antes do checkout.

**`state_basis_commit` passa de `d0430d0` a `36faf44`.** Não era divergência: com
`active_work_item` `null` não havia trabalho ativo cujo baseline pudesse ter derivado — mesmo
critério das quatro promoções anteriores.

### Superfície declarada do bloco, medida na abertura

**O contrato inteiro já está no repositório, e foram conferidas as seis entradas do bloco 1**
(`shared/types/generated.ts`):

| Tipo | Forma medida |
|---|---|
| `ProfileData` | 10 campos; `redator: RedatorProfileData \| null` |
| `ProfileUpdateData` | **2 campos** — `name`, `phone` |
| `ProfilePasswordData` | `current_password`, `password`, `password_confirmation` |
| `RedatorProfileData` | `documentos[]`, `cursos_habilitados: number`, `cursos: string[]` |
| `RedatorProfileDocumentData` | 8 campos, com `status: DocumentValidityStatus` |
| `DocumentValidityStatus` | `'vigente' \| 'vence_em_breve' \| 'vencido' \| 'ausente'` |

**Duas divergências nasceram desta medição, e as duas são de fonte viva — não de suposição:**

1. **O backlog promete mais do que o contrato entrega.** O `backlog.md:70-71` descreve o resumo do
   Redator como "cursos habilitados, **turmas atuais/próximas e pendências**". O
   `RedatorProfileData` tem `cursos_habilitados` e `cursos` — **turmas e pendências não existem**,
   porque o **corte D1** do bloco 1 as removeu por decisão do João (evitar aresta de `Identity` para
   `Operation`, esperando o bloco do dashboard). Não é lacuna a preencher por conta própria: ou o
   escopo do bloco 2 encolhe junto, ou alguém reabre a aresta. **Decisão do brainstorming.**
2. **Uma rule normativa ficou meio falsa, e a metade falsa é justamente a deste bloco.** O
   `.claude/rules/frontend-fsliced.md` afirma: *"Derivação de apresentação no front, não no DTO:
   status de documento e idoneidade se calculam no front."* O bloco 1 **inverteu isso** para o
   contrato de perfil (Drive §5 vence, `DocumentValidityStatus` calculado no backend). Medido nos
   dois DTOs: `RedatorProfileDocumentData` **tem** `status`; `RedatorDocumentData` (administrativo,
   intocado de propósito pelo bloco 1) **não tem**. A rule segue verdadeira no administrativo e
   falsa no perfil — é a **lição 13** com doc normativo vivo, e a emenda é tarefa deste bloco, não
   descoberta de fechamento.

**A porta de entrada da tela já está construída e não precisa nascer:** `UserMenu.tsx:22` já navega
para `/perfil` com `t('userMenu.profile')`, e a rota já está registrada sob o ramo protegido. O que
o bloco troca é o **conteúdo** do `ModulePlaceholder`.

**O gate visual é passo do João, não meu:** o bloco termina em revisão de tela e `/lotus-ui-review`
tem `disable-model-invocation: true`. Escrito aqui para não ser descoberto no fechamento, como no
`login-fora-do-adr16`.

**Risco de review projetado** pelo gatilho binário do projeto: **não regenera `generated.ts`**
(consumidor puro), **não toca backend**. Mas a tela **exibe e escreve no eixo de autenticação**
(troca da própria senha) e **exibe documento de peso legal com status de validade**. A
classificação final é do `/revisar-sprint`, não desta promoção.

### Context Packet — 2026-08-15: `ready`, e a validação virou medição em quatro frentes

Packet em `docs/superpowers/context-packets/2026-08-15-meu-perfil-frontend.md`, gerado pelo Codex
read-only com a skill `lotus-context-packet`. **Contrato conferido por medição, não aceito de
chegada:** marcadores exatos e nada fora deles; frontmatter com os 16 campos populados e
`plan_path`/`spec_path` corretamente em `null` (os ponteiros do estado eram `null`, e a skill proíbe
inventá-los); **8 key facts** — o teto exato; **802 palavras** de corpo contra o orçamento de 1.200,
contadas excluindo frontmatter e tabela de fontes como o contrato manda; `status: ready`,
`RECOMMENDED_TRANSITION: ready_for_planning`; nenhuma fonte marcada `unavailable`; e os cinco
staleness triggers todos semânticos, nenhum apontando para hash de proveniência ou para a própria
transição promotora — a armadilha que a skill documenta em §"Provenance versus staleness".

**Os três hashes de proveniência foram remedidos e batem byte a byte:** `base_commit`
`5ff2e7e134d5…`, `state_blob_sha` `503d5ca5…` e `progress_blob_sha` `d2bac2b4…`. Obtidos com
`git rev-parse`/`git hash-object`, não conferidos por semelhança.

**O Codex corrigiu a minha medição de novo, e no mesmo eixo do bloco 1.** Eu passei a frente
paralela como `1a56207` em `context_required` — medição minha, de 09:26. Ele mediu às 09:36 e achou
`cfee85c1` em **`ready_for_planning`**, com packet próprio já salvo
(`2026-08-15-dashboard-frontend-central-controle.md`, commit de 09:35). Conferido por
`git --git-dir` no main tree: a branch avançou nos nove minutos entre as duas leituras. É a segunda
vez que a instrução do prompt ("se não mediu, não escreva") devolve a correção na direção certa.

**Três afirmações foram verificadas contra a fonte pelo revisor, não aceitas pela citação:**

1. **"Sempre quatro slots" (key fact 3) confere no código, não na prosa.** `RedatorDocumentType`
   tem exatamente quatro casos (`CV`, `REUF`, `TITULO`, `POSTGRADO`) e
   `RedatorProfileData.php:48` projeta `RedatorDocumentType::cases()` — a lista não depende do que o
   redator subiu.
2. **A suspeita de lacuna nas EAP foi levantada e derrubada por medição.** O packet consumiu **3**
   das **9** páginas de Meu Perfil da base canônica, e o teto da skill é cinco artefatos externos —
   valia perguntar quais ficaram de fora. Buscadas na collection `e64b7d57-…` e abertas por ID: a
   "projeção resumida de idoneidade e atividade profissional" (EAP **8.5.3**), o "self-service
   seguro de documentos profissionais" (**8.5.6**) e os "testes de integração" (**8.5.8**) são
   **todas `Camada: Backend`**. As EAP de frontend da sprint são exatamente **8.5.4, 8.5.5 e
   8.5.9** — e ele consumiu as três. Nenhum gap.
3. **O critério de aceite que o packet atribui à 8.5.5 é verbatim dela.** A página
   (`3b1bc960-…-81e6`, `Camada: Frontend`, `ADR ref: ADR-05, ADR-06`) diz *"Admin não vê seção
   documental"*, *"alteração de senha exige fluxo próprio"* e *"loading/erro/vazio/sucesso, i18n,
   tema e responsividade seguem shared/ui"*. O packet não inflou o aceite.

**As duas divergências que a abertura levantou voltaram resolvidas com base declarada:** o resumo do
Redator (o Drive e a EAP 8.5.3 pedem turmas e pendências; o corte D1 as removeu do contrato, e a
instrução posterior do João vence) e a validade documental (o Drive §5 manda calcular no backend; a
linha da `frontend-fsliced.md` é genérica demais e vale só para o DTO administrativo). Nenhuma foi
resolvida em silêncio.

**Uma observação do revisor que NÃO vira emenda no packet, e fica aqui para o brainstorming:** o
sinal de aceite da 8.5.5 pede *"CTA para o Dashboard do Redator"*, e o Dashboard do Redator é
justamente a frente paralela — hoje a rota `/` ainda serve `DashboardPage` placeholder. O CTA não
está bloqueado (a rota existe), mas para onde ele aponta e o que promete é decisão de desenho, não
fato do packet. `status: ready` continua correto: nenhuma pergunta bloqueante sobrou.

**Estado: `ready_for_planning`.** Próxima ação: `/planejar-bloco` prossegue para `planning`
(brainstorming → spec → plano).

### Brainstorming e spec — 2026-08-15: cinco decisões, e a divergência de taxonomia virou débito nomeado

**Spec:** `docs/superpowers/specs/2026-08-15-meu-perfil-frontend-design.md`. Cinco perguntas abertas,
cinco respondidas pelo João; D6–D10 derivadas e declaradas como tais.

**D1 — layout de duas colunas com corte por mutabilidade.** Três formas foram desenhadas (empilhada,
abas, duas colunas) e a de duas colunas ganhou; o corte entre elas foi a segunda pergunta, porque era
ele que decidia se a esquerda ficava oca para o Admin. Cortar por *seção* deixava o Admin com uma
coluna que existe só para segurar uma foto; cortar por **mutabilidade** dá conteúdo real aos dois
papéis e faz a regra do bloco — o que é seu vs. o que o administrador controla — virar a regra
visível do layout. Custo aceito: o nome aparece nos dois lados.

**D2 — `useResourceState` é arquivo novo, `useLoadState` fica intocado.** O hook existente é tipado
`UseQueryResult<T[], …>` e sua razão de existir é a política "falhou" vs. "veio vazia" de uma LISTA.
Perfil é objeto único: não tem vazio. Generalizar mexeria nos seis consumidores por conveniência de
um sétimo caso que não é do mesmo tipo — e arquivo novo é também a opção de menor colisão com a
frente paralela, que pode adotá-lo depois.

**D3 — `ProfileDocumentSlot` é irmão, não reuso.** O slot administrativo deriva status no front
(`docStatus(valid_until)`), porque `RedatorDocumentData` não tem `status`; o do perfil consome
`RedatorProfileDocumentData.status` pronto. São duas fontes de verdade para a mesma pergunta, e
embutir as duas no mesmo componente é o que faria a tela mentir sob refactor.

**A divergência que o brainstorming mediu e o bloco NÃO conserta:** o mesmo REUF renderiza `sin_venc`
na tela administrativa e `vigente` no perfil, e um documento que vence em exatamente 30 dias é
`vigente` no front (`<` estrito, relógio de parede) e `vence_em_breve` no backend (`<=` inclusivo,
meia-noite). A raiz é `RedatorDocumentData` não ter `status` — correção de backend, declarada fora de
escopo pela D6 do bloco 1. Vira **débito nomeado na spec §10**, não emenda silenciosa. Pela mesma
razão, a linha da `frontend-fsliced.md` ("status de documento e idoneidade se calculam no front") é
hoje meia-verdade: vale para o DTO administrativo, não para o de perfil. Vira pendência de doc.

**O CTA que o packet deixou para o desenho foi resolvido:** aponta para `/`, que hoje serve um
`DashboardPage` placeholder (22 linhas, só `PageHeader`). O link funciona em qualquer ordem de merge;
se este bloco fechar primeiro, apenas leva a uma tela magra. Risco declarado, não bloqueio.

**Medições que mudaram o desenho, não confirmaram premissa:** `documentType.*` já existe nos três
locales e é reusado; `documentStatus.*` também existe, mas com a taxonomia ANTIGA (`sin_venc`,
`por_vencer`) — daí o namespace `profile.docStatus.*` próprio (D9), para não acoplar as duas telas a
uma régua que só uma usa. E `i18n.test.ts` protege a sincronia de `<html lang>`, **não** a paridade
de chaves entre dicionários: locale esquecido não reprova nada, e isso ficou declarado como risco de
gate na spec §8.

**Estado: `planning`.** Próxima ação: `writing-plans` produz o plano executável; só então
`ready_for_execution`.

### Plano — 2026-08-15: 11 tasks, executor Claude, e uma afirmação da própria spec corrigida por medição

**Plano:** `docs/superpowers/plans/2026-08-15-meu-perfil-frontend.md`. 11 tasks, 24 arquivos (22
criados, 4 modificados), 5 arquivos de teste novos. Ordem: `useResourceState` → i18n → camada de API
→ página com ramos de carga → as cinco peças de tela, cada uma acrescentando UMA linha de JSX à
página → gate/DoD/UI review.

**A correção que a medição impôs à spec já aprovada:** a §9 afirmava, herdando a
`.claude/rules/frontend-fsliced.md`, que teste de componente PrimeReact no jsdom está fora do corte
do runner. **Está dentro** — a medição são seis: `InlineLoadState`, `CourseStep`, `QuotesList`,
`BudgetDetailPage`, `TurmaDetailPage` e `ValidationPage`. É a **P-38**, já aberta desde o BD-12, que
manda a rule valer pelo que o `pnpm test` faz. A pendência **não fecha aqui** (o gatilho dela é tocar
a rule, e este bloco não a toca), mas a spec deixou de repetir a afirmação vencida e o plano ganhou
**um** teste de componente: `ProfileDocumentSlot`, escolhido porque o gate de `self_service` decide
se um documento de peso legal oferece envio. É a mesma classe de defeito que a spec do BD-6 já tinha
herdado — doc que descreve o corte por memória, não por medição.

**Duas coisas que o self-review do plano pegou contra a spec, não contra si mesmo:** (1) o rótulo do
botão documental tinha herdado o ícone mudo do slot administrativo, e a §6 exige "Enviar" vs.
"Reemplazar" — o texto é o único aviso de que substituir apaga o anterior, mesmo contrato do
`AppPhotoField`; (2) `profile.documents.noValidity` nascia órfã no dicionário, e passou a ser o que
o slot mostra quando o documento existe sem data de vencimento.

**Executor: `claude`.** O bloco é quase todo convenção local com lint por trás — `COR_HARDCODED`,
`DISABLED_READONLY` nas três grafias, `max-lines: 150` incidindo inclusive sobre arquivo de teste que
mora em `components/`, os três seletores de query-em-componente, `postMultipart` como único
transporte — e paridade de chaves em três locales que **nenhum teste protege**. O gate final é visual
e itera contra o navegador. Delegar aumentaria o custo de validação do diff sem baixar o de execução.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco meu-perfil-frontend`.

### Execução — 2026-08-15: início, técnica `executing-plans`

`/executar-bloco meu-perfil-frontend` validou as âncoras (spec, plano e packet no disco; Git limpo
na branch `feat/meu-perfil-frontend`; `active_plan` cobrindo o work item) e transicionou
`ready_for_execution` → `executing` no commit da Task 1. Técnica: `executing-plans` — o handoff do
plano já fixa `executor: claude` e o ambiente restringe o Agent tool a pedido explícito; as 11 tasks
têm dependência sequencial de montagem (cada seção volta a `ProfilePage.tsx`), sem paralelismo
genuíno a explorar.

**Task 1 (`useResourceState`) completa, com um bug de tipo que o plano não previu.** Vermelho medido
antes do código: `Failed to resolve import "./useResourceState"`. Implementação sem desvio da spec —
4 testes verdes no `vitest run`. Mas `pnpm build` (`tsc -b`) reprovou o teste literal do plano:
`Partial<UseQueryResult<T, ProblemDetails>>['error']` colapsa para `ProblemDetails | undefined`, sem
`null` — o union discriminado de `QueryObserverResult` não distribui do jeito que o literal do plano
assumia (`error: null` no terceiro caso). Isolado com repro mínimo fora do projeto antes de tocar o
arquivo real: `Partial<Omit<UseQueryResult<…>, 'error'>> & { error?: ProblemDetails | null }`
resolve, sem mudar nenhuma asserção do teste. Fica registrado no comentário do próprio arquivo de
teste, para não repetir a investigação num hook futuro que mocke `UseQueryResult` do mesmo jeito.
Gate: lint 0, build verde, suíte 37 arquivos / 190 testes.

**Tasks 2–10 completas**, uma por commit, na ordem do plano (`6f5a085`..`d4821d7`): i18n nos três
locales, camada de API, página com os ramos de carga na rota `/perfil`, e então as cinco peças de
tela — cartão de identidade com foto, `Datos personales`, `Seguridad`, slot e seção documental do
Redator, resumo profissional —, cada uma acrescentando **uma** linha de JSX à `ProfilePage`. Os
**5 arquivos de teste novos** que o plano previu existem (`useResourceState`, `useProfileForm`,
`useProfilePassword`, `useProfileDocuments`, `ProfileDocumentSlot`).

### Task 11 — 2026-08-16: gate verde, DoD provado, e o passo 4 do plano corrigido por medição

**Step 1 — gate:** `pnpm build` verde, `pnpm lint` com 0 erro e 0 warning, suíte **41 arquivos /
203 testes** contra a baseline de 36/186 — exatamente os 5 arquivos previstos.

**Steps 2 e 3 — DoD end-to-end contra a API real:** 6/6 no Admin e 6/6 no Redator, cada item
observado no navegador, não deduzido. Os dois que costumam passar por dedução foram medidos: **zero
input desabilitado ou `readOnly`** entre os 6 campos da tela do Admin (e-mail, RUT e papel são
texto), e **zero requisição de rede** na recusa do arquivo de 11 MB, conferida na aba Network — o
teto de 10 MB corta antes do transporte. Nenhum slot documental tem botão de excluir, em papel
nenhum.

**Step 4 — o ramo de falha, e a receita do plano estava errada.** Derrubar o backend
(`docker compose stop nginx`) **não** alcança o `AppErrorState`: `GET /api/me` morre junto e o
shell redireciona para `/login` antes de a página montar. O ramo se prova com falha **isolada** de
`/api/profile`, e assim foi provado — aviso inline ao lado do conteúdo, texto digitado preservado
através do Retry, recuperação quando o backend volta; e, com recarga durante a falha isolada,
`AppErrorState` substituindo a tela. Medição colateral: o `networkMode: 'online'` do TanStack Query
**pausa** a query com o browser offline, então a página remonta exibindo cache sem aviso nenhum —
offline de browser não serve como injeção de falha. A expectativa escrita do passo 4 foi corrigida
no próprio plano; o João mediu a mesma coisa independentemente (UI-06).

**Um defeito NOVO apareceu nessa medição, e a raiz é compartilhada — não nasceu neste bloco.** Sob
um 5xx **de corpo vazio**, o aviso inline não aparecia. Isolado por sonda temporária na página e
três testes de rascunho: `isError` verdadeiro, `loadError` presente, e ainda assim `null` chegando
ao componente — porque o valor era `''`. Raiz em `shared/api/axios.ts`: o `??` do interceptor só
pega `null`/`undefined`, então a string vazia virava a própria rejeição e o `InlineLoadState`
desistia no `!error`. Alcança **todas** as listas do projeto pelo `useLoadState`, não só o perfil.

### UI review — 2026-08-16: rodada pelo João, 7 achados, 2 classe C

`/lotus-ui-review` sobre `/perfil` em `d4821d7`, artefatos em
`.artifacts/ui-review/2026-08-16-1213-perfil/` (relatório + 20 PNGs). Cobertura: Admin e Redator,
três locales, dois temas, 1440/1024/390. **Resumo A:** o corte por mutabilidade da D1 é legível nas
três viewports; identidade, RUT, e-mail e papel como texto; Admin sem seção documental nem resumo;
quatro slots sempre projetados para o Redator, REUF administrativo, "Sin subir" nos ausentes,
substituição anunciada por rótulo e nenhum botão de exclusão; zero erro de console; zero requisição
repetida; nenhum overflow horizontal em 390px.

**Run NÃO conforme ao contrato read-only da skill, com autorização explícita do João:** a metade
Redator era inalcançável de outro modo (todo `type=redator` do seed está `is_active=0` e o
`UserProvisioner` grava senha aleatória). `users.id=2` (juan.morales@lotus.cl) recebeu
`is_active=1`, senha `senha123` e o papel `redator`, e **permanece assim**. Nenhuma escrita em dado
de negócio pela tela.

### Step 6 — 2026-08-16: 8 commits de correção, um achado por commit

Os 7 achados foram **verificados no código antes de virarem correção**, não aceitos pela descrição.
O João aprovou todos, incluindo os três que moram fora da feature.

| Achado | Correção | Prova |
|---|---|---|
| UI-01 (C) | `ProfileDocumentSlot` usa `formatDate` + âncora `T00:00:00` | "Vence el 10-08-2028" onde saía "8/9/2028"; teste novo pina o idioma da interface |
| UI-02 (C) | `AppPassword` pina a largura **também** no ramo sem `leftIcon` | input `113→357` dentro do cartão em 390px, onde vazava 42px |
| UI-05 (B) | `<form onSubmit>` + `autoComplete` nas duas seções | Enter envia (422 por campo vazio, sem mutação); console sem o aviso de DOM |
| UI-05 (B) | campo `username` oculto para o gerenciador de senhas | o segundo aviso do Chrome também some; console em 0/0 |
| — | `axios.ts` qualifica o corpo por **ser objeto** | guarda no interceptor real reprova com `expected '' to be truthy` se o `??` voltar |
| UI-03 (B) | `AppTag` pinta `secondary` neutro | "Sin subir" cinza nos dois temas, distinto das tags de curso |
| UI-04 (B) | grade de duas colunas só em `xl` | 1024px volta a uma coluna, com o self-service em largura cheia |
| UI-07 (B) | `AppPhotoField` centra o par e mantém o centro na quebra | es-CL e pt-BR deixam de trocar de arranjo |

**Gate re-rodado depois das oito:** build verde, lint 0, suíte **41 arquivos / 208 testes** (+5
asserções novas de guarda: 1 no slot documental, 4 no interceptor).

**Alcance declarado das correções de `shared/ui`:** `AppPassword` tem 5 sítios e só os 3 do perfil
mudam de comportamento; `severity="secondary"` tem 2 sítios e o outro é a tag de tipo de cliente da
`ClientsTable`, que também deixa de sair na cor da marca; `AppPhotoField` é o mesmo das telas de
pessoas.

**O que NÃO virou correção, e por quê.** `AppFileRow.tsx:42` tem a mesma classe do UI-01 (data no
idioma do navegador), mas o próprio review a declarou decisão fora do bloco: vira **D-18** no
`backlog.md`, agrupada no BD-10 junto do D-01, que é a mesma linha de arquivo. Como `created_at` é
timestamp completo, ali só o formato erra — o dia não volta.

### Emenda de doc — 2026-08-16: a rule que este bloco tinha de corrigir, e a pendência que veio junto

A `.claude/rules/frontend-fsliced.md` afirmava que "status de documento e idoneidade se calculam no
front". Verdade só na metade administrativa desde que o contrato de perfil existe: onde o DTO traz
`status`, o front **não recalcula**. A linha foi reescrita separando os dois contratos, com a
divergência REUF (`sin_venc` administrativo × `vigente` no perfil) declarada e não resolvida.

**Tocar o arquivo disparou o gatilho literal da P-38**, e ela foi encerrada no mesmo passo: a frase
"teste de componente com PrimeReact no jsdom segue fora do corte" foi trocada pelo corte **medido
com o runner** — 13 arquivos renderizam componente, **9 montam wrapper PrimeReact**
(`ValidationPage`, `BudgetDetailPage`, `CourseStep`, `QuotesList`, `TurmaDetailPage`,
`ProfileDocumentSlot`, `DetailHeader`, `IdentityCell`, `InlineLoadState`), 4 são DOM puro. Ficha em
`pendencias/encerradas.md`, índice e BD-12 atualizados.

### Resíduos declarados no banco de dev — não são achado novo, são rastro

1. `users.id=2` (juan.morales) segue `is_active=1`, `redator`, senha `senha123` — mutação do UI
   review, autorizada e **não revertida**.
2. Juan Morales ganhou um documento CV (`cv-e2e.pdf`) que não existia, do DoD do Step 3. Não há
   remoção self-service por desenho (spec D2), então ele fica.
3. O admin ficou **sem foto**: a demo foi substituída e depois removida na prova do Step 2. O
   `DemoPhotosSeeder` restaura. Senha, nome e telefone do admin foram restaurados e reprovados por
   login.

Os três seguem a mesma classe da **P-44** (gates de e2e deixam resíduo no banco de dev), que já está
aberta — não abre pendência nova.

**Estado: `ready_for_review`.** Working tree limpo, 18 commits na branch `feat/meu-perfil-frontend`
(`5ff2e7e`..HEAD), dos quais 10 de task, 8 de correção do gate visual e os de doc. A próxima
instrução do João aciona `/revisar-sprint`; este passo não inicia review.

### Revisão de sprint — 2026-08-16: alto risco, duas lentes, 6 achados e zero violação de lei

`/revisar-sprint` transicionou `ready_for_review` → `reviewing` e classificou o bloco como **alto
risco**: não regenera `generated.ts` e não toca backend, mas **escreve no eixo de autenticação**
(troca da própria senha) e **exibe documento de peso legal com status de validade**. A projeção da
abertura se confirmou, e a classificação acionou a **segunda lente do Codex** (read-only) sobre o
mesmo intervalo Git contra plano, spec e leis §5.

**Gate remedido, não citado:** `pnpm build` 0, `pnpm lint` 0, suíte **41 arquivos / 208 testes** —
bate com o que a Task 11 registrou.

**Órfãos: zero.** Todo hook novo tem consumidor, todo componente entra na `ProfilePage`, o
`useResourceState` está no barrel e é consumido pelo `useProfilePage`, e a paridade de chaves dos
três locales foi **medida** (581 chaves, 0 divergência) — justamente o que nenhum teste protege.
Nenhuma chave `profile.*` órfã entre as 36 criadas. Nenhuma dependência nova.

**Leis §5: nenhuma violada, e as duas de maior risco foram medidas.** `generated.ts` intocado nos 23
commits; nenhum import de `primereact` ou de outra feature sob `features/identity/**` — o
`ProfileDocumentSlot` recebe `FileUploadHandlerEvent` e `PreviewableFile` pelo reexport de
`shared/ui`, que é a porta.

**As duas lentes convergiram em quatro achados e divergiram em dois**, e as divergências foram
resolvidas por medição, não por autoridade:

1. **`refetch` que engole a promise** (`useResourceState.ts:31`) — o Codex a reportou; **derrubada
   na verificação.** O `useLoadState`, irmão e convenção vigente, faz o mesmo `void query.refetch()`
   e o docblock dele nomeia isso como idiom aceito. Divergir seria o achado, não seguir.
2. **`created_at` no idioma do navegador** (`ProfileDocumentSlot.tsx:89` via `AppFileRow`) — o Codex
   a reportou e ele próprio a identificou como **D-18**, já registrada no `backlog.md` pelo UI
   review. Decisão consciente registrada não é achado.

Os seis que sobraram entram no relatório ao João. Nenhum é 🔴: nenhum fere lei, lição ou ADR — o
mais caro é uma **divergência literal contra a spec §7** ("campos daquela seção desabilitados"),
reincidente em duas seções.

**Estado: `blocked`.** Só achado aprovado pelo João vira correção; depois o estado retorna a
`reviewing` e as checagens se repetem sobre o mesmo work item.

### Correções — 2026-08-17: os 6 achados aprovados pelo João, todos aplicados

**João aprovou Q-1 a Q-6 em bloco.** Nenhum achado foi diferido para o `backlog.md`.

| # | O que entrou |
|---|---|
| Q-1 | `disabled={pending}` nos 2 campos do `ProfilePersonalSection` e nos 3 do `ProfileSecuritySection` — a spec §7, que pedia isso literalmente |
| Q-2 | `detail` do fallback do interceptor passa a ser `common.unexpectedErrorHint`, a mesma chave que o `problemFromBlob` já usava para corpo não-parseável |
| Q-3 | `useProfilePhoto` zera a mutation IRMÃ antes de disparar a própria (`remove.reset()` no envio, `upload.reset()` na remoção); o envio saiu para uma função `enviar`, usada também pelo `onRetry` |
| Q-4 | `useProfileDocuments` deixou de ler o estado em voo da instância compartilhada: `mutateAsync` por chamada, lista local `emVoo` e erro local — `uploadingType` virou `uploadingTypes` |
| Q-5 | `AppPassword`: no ramo com `leftIcon`, `className`/`inputClassName` mesclados DEPOIS do spread, como no ramo sem ícone |
| Q-6 | `valid_until` removido das variables e do `postMultipart` em `useUploadProfileDocument` |

**A premissa do Q-4 foi medida contra o TanStack instalado, não deduzida.** Sonda temporária com
`useMutation` real e duas chamadas concorrentes numa instância: `variables` vira a da SEGUNDA com a
primeira ainda em voo (é o que reabilitava o slot errado), a `mutationFn` das duas roda e o
`onSuccess` da mutation dispara 2×, mas o **`onSettled` por chamada da primeira nunca dispara** —
`mutationObserver.mutate` faz `removeObserver` na anterior (build/modern/mutationObserver.js:58).
Isso **derruba a alternativa sugerida no próprio achado**: um `Set` alimentado por
`onMutate`/`onSettled` deixaria o primeiro slot desabilitado para sempre. `mutateAsync` devolve a
promise daquela chamada, que resolve sem observer; a invalidação segue na mutation e vale para as
duas. A sonda foi removida após medir.

**Guardas novas onde a correção tem comportamento a provar:** dois casos em
`useProfileDocuments.test.tsx` — envios simultâneos saindo da fila cada um no próprio término (o
segundo termina primeiro e o primeiro **não** reabilita) e falha do primeiro visível depois do
sucesso do segundo. O mock passou a devolver **uma promise por chamada**, que é o que permite
sobrepor os dois envios. Q-1, Q-2, Q-5 e Q-6 são supressão de superfície ou de string: não há
comportamento novo que uma guarda morda além do que a suíte já cobre (o `axios.test.ts:143` segue
verde — ele assere `toBeTruthy()`, não o texto).

**Gate após as correções:** `pnpm lint` 0, `pnpm build` 0, suíte **41 arquivos / 210 testes**
(+2), exit 0.

### Revisão de sprint — 2ª rodada, 2026-08-17: as duas correções que saíram com defeito

Risco inalterado (**alto**), então a segunda lente do Codex rodou de novo, sobre `df75d50..HEAD`.
Gate: lint 0, build 0, 41 arquivos / 210 testes. Órfãos zero — nenhuma referência sobrevivente a
`uploadingType`, `generated.ts` intocado, nenhum import de `primereact` ou cross-feature em
`identity/**`, nenhuma chave i18n nova. Leis §5 sem violação nova.

Q-1, Q-3, Q-4 e Q-5 saíram corretos, com as duas lentes concordando. **Q-2 e Q-6 saíram com
defeito, e os dois achados vieram do Codex** — verificados no código antes de aceitos, e nenhum
deles nascido do trabalho original: os dois nascem da rodada de correção.

**Q-7 — o docblock do `valid_until` afirmava a regra de domínio ao contrário.** O Q-6 escreveu
"quem declara validade é o administrador, e o redator declarar a própria fura a RN-09 (D5)", e a D5
do bloco 1 diz literalmente o oposto: *"`valid_until` segue aceito, e só nos três tipos permitidos.
Nenhum deles entra no gate da RN-09, que lê exclusivamente REUF."* Quem protege a RN-09 é o
`Rule::in(selfServiceValues())`, que barra o REUF por TIPO — validade de CV/TÍTULO/POSTGRADO é
capacidade suportada. O Q-6 não removeu superfície proibida, removeu superfície **ainda não usada**,
o que continua defensável; a justificativa é que não era. Pior: o comentário de
`useProfileDocuments.ts` já estava errado desde a execução, e o Q-6 o **copiou** para um segundo
arquivo em vez de medi-lo — lição 13 na regra que decide habilitação de turma. Os dois docblocks
foram reescritos, e a spec §4 ganhou a nota de que a rota aceita o campo e a tela é que não o
declara. (No relatório da rodada a tabela de contratos foi citada como §5; é **§4** — o código e a
emenda estão corretos.)

**Q-8 — a correção do Q-2 não tinha guarda.** O caso do fallback em `axios.test.ts` assere `status`
e `title` e **nunca** `detail`, que é o campo inteiro do achado: passava verde antes do Q-2, com
`error.message` em inglês, e passaria verde de novo se alguém revertesse. Corrige também o registro
acima, que afirmou não haver comportamento a guardar — havia.

**Q-9 — `AppPassword` acumulou quatro achados de largura sem nenhuma guarda.** C-2 (08-12), UI-01
(08-13), UI-02 e Q-5 (08-16), sempre a mesma forma, e a quarta encontrada por leitura. A rule já
carregava o texto ("pine o override após o spread"); faltava o mecanismo, mesma lacuna do D-08.
Ganhou `AppPassword.test.tsx`: os dois ramos, sob `inputClassName` do chamador.

**As duas guardas novas foram vistas reprovar contra o código antigo** (reversão pontual, medida,
revertida): com `detail: error.message` o caso do fallback falha em
`expected 'Request failed with status code 502' not to be 'Request failed with status code 502'`;
com o `className` antes do spread no ramo com ícone, o teste falha em
`expected 'uppercase p-password-input…' to contain 'w-full'`. O ramo sem ícone segue verde na mesma
reversão, que é o esperado — ele já estava correto desde o `a5f748c`.

**Gate após a 2ª rodada:** lint 0, build 0, suíte **42 arquivos / 213 testes**. Esta rodada não
mudou comportamento de produção — só comentário, doc e teste —, então as checagens pertinentes se
esgotam no gate e na medição das guardas.

**Estado: `ready_for_closure`.** Nenhum achado pendente de decisão ou correção. O fechamento não é
executado automaticamente.

### Fechamento — 2026-08-17: o critério de aceite provado no navegador, e a suíte de backend que estava vermelha por env

**O passo 0 do gate não foi herdado do DoD da Task 11, e não podia ser:** aquele DoD mediu o bloco
**antes** das nove correções, e seis delas mudam comportamento de produção. A prova foi refeita
contra a API real — **26/26 verificações**, nos dois papéis, em es-CL, num Chromium de verdade
dirigido por CDP (o Node 22 tem `WebSocket` global, então não entrou dependência nova no projeto), com
o frontend **desta** worktree em `:5174` e a API em `:8080`. Cada uma das seis correções foi
exercitada no ramo que ela mudou, não por proximidade:

| Correção | Como foi provada |
|---|---|
| Q-1 | PUT `/api/profile` e `/api/profile/password` **pausados no interceptor**, e os 5 campos medidos `disabled` com a escrita em voo |
| Q-2 | 5xx **de corpo vazio** rendeu "No se pudo procesar la respuesta del servidor." — o `detail` do fallback, não a string inglesa do axios |
| Q-3 | upload de foto falhado deixa erro na tela; disparar a remoção o **zera**, medido com o DELETE segurado em voo |
| Q-4 | dois uploads concorrentes, o **segundo liberado primeiro**: só o slot dele reabriu, o primeiro seguiu travado até o próprio término |
| Q-5 | largura do input de senha medida em px — 719, igual à do irmão de texto e igual à do formulário |
| Q-6 | o multipart carrega `type` e `file` e **nada de `valid_until`**; 201 nos dois envios |

**Três falhas intermediárias apareceram nessa prova e as três eram do harness, não do produto** — o
que só se soube porque cada uma foi lida até a causa em vez de contornada. O locator subia para fora
do `<label>` e devolvia o mesmo input para dois rótulos; a presença da seção documental estava sendo
medida por TEXTO, e o subtítulo da página já diz "tu documentación profesional" em qualquer papel; e o
`Fetch` estava pausando o **preflight OPTIONS**, não a escrita, o que explicava de uma vez o corpo
vazio e o `[204,204,201,201]`. **A quarta é a que mais valia:** injetar `Access-Control-Allow-Headers:
*` derrubava o preflight, porque em modo credenciado o `*` do CORS é lido **literalmente** — e com o
preflight reprovado tudo caía no ramo `!error.response`, que já era traduzido **antes** do Q-2. A
prova do Q-2 tinha passado pelo motivo errado, e a evidência disso era o texto: saía
`common.loadErrorHint`, não `common.unexpectedErrorHint`. Duas strings diferentes que compartilham a
tradução (`networkErrorHint` e `loadErrorHint` são a mesma frase em es-CL) quase esconderam isso.

**A suíte de backend abriu vermelha — 12 falhas — e a causa é local, não do bloco.** Todas as 12 são
de login, com `RuntimeException: Session store not set on request`: o Sanctum não tratou a request
como stateful, então `StartSession` nunca rodou. A raiz é `tests/TestCase.php:18`, que injeta
`Referer: env('FRONTEND_URL')` — e o `.env` do main tree virou **lista com vírgula**
(`http://localhost:5173,http://localhost:5174`), para o CORS multi-origem que ainda está
**descommitado** lá (`config/cors.php` com `explode`). O header sai com a lista inteira e não casa com
domínio nenhum. **Provado por medição:** com `FRONTEND_URL` valendo uma URL só, a suíte fecha em **684
passed / 5 skipped / 0 failed**. Nada disso é deste bloco — ele tem **zero** arquivo em `backend/` —,
e nem é rastreado: `.env` e `phpunit.xml` não estão no Git, então nenhum commit poderia tê-lo causado
nem consertado. **O container que mede é o `lotus-app-1`, que monta o main tree — e o main tree está
em `main`**, logo o vermelho medido é o da `main`, não o desta branch.

**Fica como candidata a pendência, não escrita por conta própria:** o código commitado assume
`FRONTEND_URL` com **uma** URL nos dois lados (`cors.php` embrulha num array de um elemento;
`TestCase` a usa como header único), e um `.env` com lista reprova 12 testes sem dizer por quê. Quem
decide se isso vira ficha é o João — e há razão extra para não escrever agora: os arquivos de
pendência desta árvore já divergem da `main`, que encerrou a **P-34** por lá.

**Gatilhos de pendência conferidos um a um, e nenhum venceu neste bloco.** A **P-37** pede bloco que
*toque* o `FormField`; este o consumiu e não o modificou. A **P-34** tinha o gatilho do shell, mas foi
**encerrada na `main`** pela frente paralela, que ligou a catraca de cor em `src/app`. A **P-32** pede
a lição 13 reincidindo **por classe** — o Q-7 é lição 13, mas de outra espécie: docblock que afirma
regra de domínio ao contrário, não classe citada que não existe, e a guarda de path não teria como
pegá-lo em nenhuma das duas formas. A **P-03** segue sem disparar: o gatilho é *backend* em paralelo.
A **P-38**, encerrada dentro deste bloco, cumpre a sprint de rastro **agora** e sai no próximo
fechamento, pelo precedente da P-26.

**Higiene medida, não presumida:** zero arquivo PHP no diff (Pint não se aplica — e ele nunca roda sem
argumento), `generated.ts` intocado nos 34 commits e nenhum DTO alterado (`typescript:transform` não
se aplica), zero `.gitkeep` órfão, nenhuma chave `profile.*` órfã entre as 36, nenhum sobrevivente de
`uploadingType` no singular, e nenhum import de `primereact` ou de outra feature sob
`features/identity/**`. As ocorrências restantes de `valid_until` no front foram lidas uma a uma: são
o caminho **administrativo** (`useRedatorDocuments`, `RedatorDocumentSlot`), a **exibição** da
validade no slot do perfil — que lê o campo, não o envia — e os dois docblocks corrigidos pelo Q-7.

**Resíduo declarado no banco de dev:** a prova do Q-4/Q-6 subiu dois documentos reais para Juan
Morales (`cv-fechamento.pdf` e `titulo-fechamento.pdf`), e não há remoção self-service por desenho
(spec D2), então eles ficam. As provas do Admin **não** gravaram nada — nome, telefone e foto foram
reconferidos por `GET /api/profile` depois de tudo, porque cada escrita foi abortada no interceptor de
propósito. Mesma classe da **P-44**, já aberta; não abre pendência nova.

**O que fica aberto, e é a única coisa que fica:** a **`main` avançou 21 commits** enquanto este bloco
corria — o PR #55 mergeou o `dashboard-frontend-central-controle` —, então esta branch está atrás e
**9 arquivos foram tocados pelas duas frentes**: `AppRouter.tsx`, os 3 locales e 5 docs de
`superpowers/` (backlog, state, e os três de pendências). A colisão do `AppRouter.tsx` é a que a
abertura deste bloco previu e mediu: bloco de imports, textual, resolução mecânica. Os docs exigem
mais cuidado que o router, porque as duas frentes rodaram a mesma cascata de `state.md` e a mesma
rotação do `progress.md` — e o `encerradas.md` precisa terminar com **P-34 e P-38**, não uma no lugar
da outra. **Nada disso é fechamento; é merge**, e é trabalho a fazer.

**Estado: `idle`.** `state_basis_commit` passa a `e103178`, o commit que prova a entrega fechada; a
próxima ação é escolha explícita do João no `backlog.md`. Nenhum item foi promovido — o backlog não
promove sozinho e a instrução atual não nomeou o seguinte.
### Integração — 2026-08-17: merge da `main` (fechamento do `dashboard-frontend-central-controle`)

**A `main` andou 30 commits desde o `36faf44` de onde este bloco partiu** — o PR #55 fechou o
`dashboard-frontend-central-controle` em 2026-08-16, e em 2026-08-17 entrou ainda o passe de
correção da revisão de UI do Dashboard, que não é bloco. As duas frentes correram em paralelo por
exceção declarada (a quinta, e a primeira frontend × frontend), então este merge é a costura
prevista, não uma surpresa.

**Merge, não rebase, e a razão é documental:** rebase reescreve todo SHA da branch, e o fechamento
deste bloco **cita SHAs** — `state_basis_commit: e103178` e a linha do `progress.md` com o intervalo
`5ff2e7e..e103178`. A prova da entrega passaria a apontar para commits inexistentes. O segundo
motivo é a forma dos conflitos: os arquivos que colidiram são os que o fluxo escreve em quase todo
commit, então rebase replayaria a mesma colisão de `state.md` dezenas de vezes, e cada resolução
intermediária seria um estado que **nunca existiu** — o oposto da invariante de fronteira durável.

**Cinco conflitos: quatro de documento e um de código.** Documento: `state.md`, `progress.md`,
`pendencias/README.md`, `pendencias/encerradas.md`. Código: `AppRouter.tsx`. Auto-mergearam
`backlog.md`, `pendencias/abertas.md`, `progress-archive.md` e os três locales.

**O conflito de código era o previsto na abertura, e fechou um placeholder:** a `main` moveu o
`DashboardPage` de `@app/pages/DashboardPage` para `@app/pages/Dashboard/` (a central de controle
virou pasta), e este bloco trocou o `/perfil` de `ModulePlaceholder` por `ProfilePage`. Resolvido
com o caminho novo da `main` e a rota real deste bloco. Consequência medida: **`/perfil` era o
último consumidor do `ModulePlaceholder`** — o import saiu (senão o lint reprova) e o componente
`frontend/src/app/pages/ModulePlaceholder.tsx` ficou **órfão**. Não foi deletado aqui: código morto
alheio se menciona, não se apaga num merge. O comentário do `AppRouter` que promete guarda de rota
"quando páginas reais substituírem os `ModulePlaceholder`" também venceu — não há mais nenhum.

**P-38 e P-34 fecharam em paralelo, uma de cada lado, e as duas ficam.** A tabela de encerradas do
índice unia formatos divergentes (a deste lado tinha coluna `Como`, a da `main` tinha `Sai em`);
ficou com as duas colunas, sem descartar informação de nenhum lado. As duas saem no próximo
`/fechar-sprint`, cumprida a sprint de rastro.

**A contagem de abertas do índice vinha errada dos dois lados, desde a base.** `36faf44` declarava
`Abertas (29)` com 31 linhas na tabela; a `main` declarava `(30)` com 32; esta branch, `(28)` com
30. O merge grava o número **contado** — **31**, conferido contra as 31 fichas de `abertas.md`, com
zero ID de diferença entre índice e fichas. Não é achado deste bloco nem da frente paralela: é
deriva herdada, e é exatamente a classe que a P-32 e a regra de "medir a própria população com o
seletor dela" existem para pegar.

**A candidata a pendência que o fechamento deixou para o João já existe na `main`:** o
`TestCase.php:18` lendo `FRONTEND_URL` cru contra um `.env` que virou lista é a **P-45**, aberta
pela frente paralela. Nada a registrar; a decisão segue sendo do João.

**O `progress.md` estourou o teto de dez ao unir as duas frentes** — cada lado rotacionou a mesma
linha mais antiga (BD-3) e depois somou entregas: uma daqui, duas de lá, dando doze. As duas mais
antigas (`2026-08-13 · Auditoria · BD-8` e `2026-08-13 · Identity/Commercial · contrato de entrada`)
desceram **verbatim** para o `progress-archive.md`, que vai a 58 linhas. A cascata deste arquivo
rotaciona um degrau e o `falha-vs-lista-vazia` (BD-6) sai como sexto — a narrativa dele vive no git
e no `progress-archive.md`.

**`last_completed_work_item` fica em `meu-perfil-frontend` por medição, não por preferência:** o
`dashboard-frontend-central-controle` fechou em 2026-08-16 14:22 (`4a0f08b`) e este em 2026-08-17
11:21 (`7afe2be`). `state_basis_commit` segue em `e103178`, o commit que prova a entrega fechada
mais recente, e continua sendo ancestral desta árvore.

**Gates remedidos pós-merge, não herdados:** `pnpm lint` exit 0; `pnpm build` exit 0; `pnpm test`
**45 arquivos / 250 testes**, a união das duas frentes (esta branch trazia 42/213). Backend
**684 passed / 5 skipped (2537 asserções)**, idêntico ao medido no fechamento — o merge não trouxe
**nenhum** arquivo de `backend/`, e a suíte só passa com `FRONTEND_URL` de uma URL só, que é a P-45.

## Penúltimo item fechado — 2026-08-16 (`dashboard-frontend-central-controle`, Sprint 5 · Dashboard, bloco B1)

### Seleção — 2026-08-15

**Bloco restante da Sprint 5 (`backlog.md:41`), promovido explicitamente pelo João** com o estado em
`idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de sempre — o
argumento era **título de seção** (`## Sprint 5 · Dashboard`), não slug promovido, exatamente como já
reprovou a promoção de BD-1, BD-2, BD-7, BD-8, BD-9, BD-5, `login-fora-do-adr16`,
`celula-de-identidade`, `dashboard-backend-agregacoes` e `meu-perfil-backend-self-service`. Três
decisões dele fecharam o gate: o slug `dashboard-frontend-central-controle`; a rota
**`context_required`**, como o backlog exige para a Sprint 5; e **main tree** como área de trabalho.

**A branch nasceu ANTES deste commit, por instrução explícita dele** ("já crie a branch antes de
alterar qualquer documento"): `feat/dashboard-frontend-central-controle`, criada de `main@36faf44`.
Este arquivo já é escrito na branch, não na `main`.

**A main tree é escolha dele, não gatilho da P-03.** O bloco é de frontend — consome
`GET /api/dashboard/metricas`, entregue e fechado no bloco A —, então o gatilho de dois blocos de
**backend** não vence e uma worktree seria admissível. Ele escolheu a árvore principal mesmo assim.
A `fix-frontend` está em `feat/meu-perfil-backend-self-service`, já mergeada, e não foi reusada.

**`state_basis_commit` passa de `d0430d0` a `36faf44`, e a divergência que a sessão mediu na abertura
já não existe.** Ao abrir o comando, a `main` local estava em `29eff53` e a
`feat/meu-perfil-backend-self-service` tinha 18 commits com o bloco **fechado e não mergeado** — o
que teria posto o bloco B numa base sem os tipos de Meu Perfil e adiado a colisão de `generated.ts`
para o merge. O João respondeu que já havia mergeado; medido, o **PR #54** está na `main` (`36faf44`,
igual a `origin/main`, árvore limpa). A base é única e a colisão não chega a existir.

**Fonte externa declarada, como no bloco A:** o backlog aponta o escopo canônico no Drive
(`Planejamento/dashboard-escopo-funcional-analitico.md`) e a execução detalhada no Notion
(EAP 8.4.0–8.4.7). O bloco A cobriu a sequência de backend (8.4.0→8.4.1→8.4.2→8.4.3→8.4.6); **as EAP
de frontend não foram consumidas por packet nenhum ainda**, e é isso que sustenta a rota — nenhuma
rota direta a `ready_for_planning` se aplica, e o Context Packet do Codex (`lotus-context-packet`,
read-only) vem antes de qualquer brainstorming.

**Três medições da abertura entram aqui porque o packet e o brainstorming vão precisar delas:**

1. **Não existe `features/dashboard/`.** O que há é `frontend/src/app/pages/DashboardPage.tsx`, um
   placeholder na rota `/` do `AppRouter.tsx:58` cujo próprio docblock diz "conteúdo real é task
   futura". Onde a feature nasce e o que acontece com a página de `app/pages/` é decisão do
   brainstorming sob o ADR-05, não dado do bloco.
2. **O contrato já está no repositório:** `generated.ts` traz os tipos do bloco A (9 ocorrências de
   `Dashboard`), e a spec arquivada
   `specs/archive/2026-08-14-dashboard-backend-agregacoes-design.md` é o contrato do payload,
   incluindo a §4.2 completada no fechamento (uma seção exige TODOS os gates dos módulos de que lê).
3. **Dois itens do backlog apontam para este bloco e não são dele:** a **D-16** (turma concluída sem
   matrícula em `fully_issued`) está parada esperando o consumidor dizer se a distinção paga — o
   consumidor é este bloco; e a **ativação de acesso do redator** (item 4 de "Próximos blocos")
   **bloqueia o valor da view do Redator**, porque nenhum redator autentica hoje. Nenhum dos dois é
   escopo desta promoção.

**A árvore não decide sozinha o gate visual:** o bloco termina em revisão de tela, e
`/lotus-ui-review` tem `disable-model-invocation: true` — é passo do João. Planejar isso é do
`writing-plans`, e está escrito aqui para não ser descoberto no gate, como no `login-fora-do-adr16`.

**Estado: `context_required`.** Próxima ação: Context Packet pelo Codex, read-only, sobre
`feat/dashboard-frontend-central-controle` a partir de `main@36faf44`.

### Context Packet — 2026-08-15

Gerado pelo Codex (`lotus-context-packet`, sandbox read-only, sobre `1a56207`) e validado contra o
contrato da skill item a item: markers exatos e nada fora deles, frontmatter completo com
`plan_path`/`plan_blob_sha`/`spec_path`/`spec_blob_sha` corretamente em **`null`** (registrados, não
inventados), **8 key facts** — o teto exato —, toda fonte com status `retrieved` (nenhuma
`unavailable`, então a regra das duas evidências não se aplica), divergência com base de resolução
declarada, e **nenhum staleness trigger** apontando para hash de proveniência, para a transição
promotora ou para edição de `state.md` que só move campo de workflow. Salvo em
`docs/superpowers/context-packets/2026-08-15-dashboard-frontend-central-controle.md`.

**Os três hashes de proveniência foram remedidos e batem:** `base_commit`
`1a562076af2f…`, `state_blob_sha` `31bc77d7…` e `progress_blob_sha` `d2bac2b4…`. Foram obtidos por
`git rev-parse`/`git hash-object` antes da invocação, não aceitos de chegada.

**A troca do Notion PERSISTE, e agora está medida em vez de suposta.** O fechamento do bloco A
registrou que as EAP **8.4.0 e 8.4.7** têm descrição e critério de aceite invertidos entre si
(títulos, camadas e ADRs corretos; corpos trocados). O packet foi instruído a conferir se a troca
havia sido corrigida: **não foi** — a 8.4.0 segue contendo o aceite de UI review e a 8.4.7 segue
contendo domínio backend e `DomainDependencyTest`. A resolução é a mesma do bloco A e pela mesma
base: **o Drive decide o escopo**, então a UI review pertence a este bloco. O staleness trigger da
correção continua vivo.

**Três afirmações materiais do packet foram medidas contra o repositório antes de salvá-lo, e as
três batem:**

1. **A composição em `app` sem `features/dashboard` não é imposição externa contra o repo — é
   convergência.** O packet atribui a regra ao Drive; medido, `estrutura-monolito.md:100` já reserva
   `app/pages/` para "página que NÃO é de domínio: DashboardPage, ModulePlaceholder", e as linhas 9 e
   159 dizem que composição acontece na camada `app`/rota (lei §5.6). Um Dashboard que lesse de
   Commercial, Operation e Certification como *feature* violaria a lei §5.6 — a proibição externa e a
   lei interna apontam para o mesmo lugar. **Não há divergência a registrar aqui**, e é isso que a
   medição estabelece.
2. **Os dois DTOs raiz existem e são discriminados por `view`:** `AdminDashboardData` (`view: 'admin'`)
   e `RedatorDashboardData` (`view: 'redator'`) em `generated.ts`, com a **nulabilidade de gate só no
   admin** (`pipeline`, `agenda`, `compliance_turmas`, `redatores`, `series` como `| null`) e as seis
   chaves do redator sem nenhuma anulável — exatamente o que o fechamento do bloco A provou ao vivo.
3. Spec arquivada do bloco A e packet do bloco A existem nos paths citados.

**`status: ready`, e as duas open questions não bloqueiam:** ambas são de **apresentação** —
qual visualização recebe cada dataset e para onde cada CTA navega —, e o Drive delega essa decisão
ao frontend. Nenhuma regra de negócio, critério de aceite ou comportamento de peso legal ficou por
adivinhar, que é o teste da própria skill para `blocked`.

**Estado: `ready_for_planning`.** Próxima ação: `/planejar-bloco` prossegue para `planning`
(brainstorming → spec → plano).

### Brainstorming e spec — 2026-08-15: o bloco B virou dois

Spec em `docs/superpowers/specs/archive/2026-08-15-dashboard-frontend-central-controle-design.md`
(arquivada no fechamento), com
**dezesseis decisões**: D1–D7, D11, D12 e D16 escolhidas pelo João entre alternativas com o custo
declarado; D8–D10 e D13–D15 derivadas e declaradas como tais.

**A decisão que reconfigura o bloco é a D1: o bloco B foi FATIADO em dois.** O contrato do bloco A
expõe **14 seções de UI** (9 na view admin, 5 na do Redator), e entregá-las num plano só levaria o
gate visual cansado ao fim. O corte é por pergunta respondida: o **B1** (este bloco) responde *"o
que tenho para fazer agora"* — `kpis`, `pendencias`, `alertas`, `agenda`, `pipeline`; o **B2**
(`dashboard-frontend-analitico-e-redator`, a nascer no `backlog.md` no fechamento) responde *"como a
operação evoluiu"* e leva séries, rankings, compliance, carga de redatores e a view do Redator
inteira. **O slug e a branch do B1 não mudam** (D2): a branch já existia quando o corte foi decidido.

**O corte se pagou duas vezes, e as duas por medição feita antes do desenho:**

1. **Não existe biblioteca de gráficos no projeto.** `package.json` não tem `chart.js` — peer
   obrigatório do `Chart` do PrimeReact — nem alternativa, e não há wrapper de chart em `shared/ui`.
   As 5 seções do B1 são as que **não precisam de gráfico**, então a decisão de chart lib inteira
   saiu do caminho e nasce no B2, junto das 5 séries mensais que a exigem.
2. **O filtro de período caiu junto.** A D3 da spec do bloco A já dizia que estado operacional
   ignora o período — só séries e rankings o obedecem. Com séries e rankings no B2, **o B1 não tem
   o que filtrar**, e a parte cara da EAP 8.4.4 saiu do bloco. O hook nasce com o parâmetro mesmo
   assim (D5): fronteira pronta, sem UI, e o B2 liga a tela sem mexer no cache (lição 3).

**Uma premissa do packet foi confirmada por medição em vez de aceita:** ele atribui ao Drive a
proibição de `features/dashboard` e a composição em `app`. Medido, o repositório manda no mesmo
sentido por outro caminho — `estrutura-monolito.md:100` já reserva `app/pages/` para "página que NÃO
é de domínio: DashboardPage" e a lei §5.6 proíbe feature importar feature, o que um Dashboard que lê
de três módulos violaria. **Drive e repositório convergem; não havia divergência a reconciliar.**

**Três achados de terreno mudaram o desenho, e nenhum deles estava no packet:**

1. **`useLoadState` não serve.** A assinatura é `UseQueryResult<T[]>` — query de **lista** —, e o
   dashboard é objeto único com seções anuláveis. A política de estado vive no `useDashboard`
   (D9), preservando a tese da rule verbatim (o que ramifica a tela é o dado que falta, não o
   `status`). Sem irmão genérico em `shared/hooks`: um consumidor só; o segundo é Meu Perfil
   frontend, e é ele quem pagaria a extração.
2. **`formatUf` vive em `features/commercial/lib/uf.ts` com 4 consumidores**, e o KPI de cotações
   precisa dela. `app/` importando de uma feature é permitido pela direção da dependência, mas
   acopla a página ao módulo comercial por um utilitário puro — o arquivo sobe para `shared/lib`
   (D13) pelo argumento do ADR-18 (`adrs.md:222`): recurso de mais de uma camada é promovido, não
   decidido caso a caso.
3. **Dois alertas não têm rota de detalhe.** `certificate_*` traz `certificate_id` e
   `redator_document_*` traz `redator_id`, mas `/certificados` e `/personas` são listagem com
   diálogo — não há rota de entidade. Ancorar seria decidir o **FUT-2**, que é futuro dependente de
   decisão do João; os dois CTAs levam à listagem sem seleção (D8), com a limitação escrita.

**A D11 é a única que amplia o bloco de propósito, e o motivo é medido:** `COR_HARDCODED` roda em
`src/features/*/components/**`, `src/features/**` e `src/shared/**`, e `src/app/**` **é a única
camada sem ela** — a P-34. Este bloco escreve oito arquivos novos justamente em `app/`, que
nasceriam sem guarda de cor. A catraca entra aqui, com os 3 sítios que hoje a impedem
(`SidebarItem.tsx:24`, `Sidebar.tsx:60`, `Sidebar.tsx:71`, batendo com a contagem do backlog).
**Consequência: a P-34 fecha no `/fechar-sprint` deste bloco e o BD-11 fica só com a D-03.**

**O self-review da spec achou quatro coisas e as corrigiu antes do commit:** o baseline não estava
declarado (medido nesta branch: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **36 arquivos /
186 testes**); o layout era citado sem número de decisão (virou D16); o DoD não provava o movimento
de `uf.ts` onde ele pode quebrar (4 telas que exibem **dinheiro**); e faltava o caso-limite da D6 —
esconder cada seção nula, uma a uma, deixa **página em branco** para quem não tem permissão de
módulo nenhum, indistinguível de falha silenciosa, então esse caso ganhou mensagem própria.

**Risco de review: BAIXO pelo gate binário** — não toca schema, não regenera `generated.ts`, não
toca Sanctum, auditoria nem documento legal, e não decide autorização (o payload já chega filtrado).
**Divergência por alcance declarada:** 8 arquivos novos, `uf.ts` tocando 4 telas de dinheiro e uma
catraca nova numa camada inteira — a segunda lente é decisão do João no `/revisar-sprint`.

O estado entra em `planning` no commit da spec; `active_plan` segue `null` até o João ler a spec
escrita e autorizar o `writing-plans`.

### Plano — 2026-08-15: três medições corrigiram a spec antes de virar plano

João aprovou a spec escrita ("aprovado pode continuar") e o `writing-plans` rodou. O plano tem
**11 tasks** e vive em
`docs/superpowers/plans/archive/2026-08-15-dashboard-frontend-central-controle.md` (arquivado no
fechamento).

**A escrita do plano exigiu medir o que a spec tinha afirmado, e três afirmações caíram:**

1. **`formatUf` tem 5 sítios de import, não 4.** `grep -rn "lib/uf'" src/` acusa `BudgetStatCard`,
   `BudgetsTable`, `QuoteRow`, `useQuoteForm` **e `DataStep.tsx`** — este último consome
   `parseUfInput` e ficara de fora da contagem. O quinto é o mais caro dos cinco: é o caminho de
   **escrita** do valor da cotação, onde um erro grava dinheiro errado em silêncio, e não o de
   leitura. D13 e o DoD da spec foram corrigidos.
2. **O backend já manda a descrição do item pronta, em espanhol.** Medido em
   `CommercialMetricsQuery.php:48`, `OperationMetricsQuery.php:128`,
   `CertificationMetricsQuery.php:38` e `IdentityMetricsQuery.php:46`: `description` é string fixa
   ("Cotización pendiente de aprobación."). A D14 manda traduzir os 11 tipos, então **isso não é a
   mesma coisa que o rótulo** — a spec ganhou a **D17**: rótulo do tipo traduzido é a linha
   principal, `description` entra como detalhe e fica em es-CL nas outras duas locales. Ela não some
   porque em `turma_docs_incomplete` carrega a lista de documentos faltantes, dado que o front não
   deriva. Traduzir texto de servidor é trabalho do backend e nasce no `backlog.md` no fechamento.
3. **O caso "nenhuma seção legível" cabe no corte do runner.** Ele era caso-limite do §4 sem prova
   automatizada nenhuma; como é decisão do hook e não de componente PrimeReact, virou o **5º teste
   de `useDashboard`**. A spec §6 foi de 5 para 6 cenários.

**A catraca de cor foi medida com o próprio seletor, não com o grep que originou o débito** (a
regra do `frontend-fsliced.md`): `npx eslint 'src/app/**/*.tsx' --rule '{…COR_HARDCODED…}'` acusa
**exatamente 3** — `Sidebar.tsx:60`, `Sidebar.tsx:71`, `SidebarItem.tsx:24`. Bate com o grep e com o
backlog. A conversão **não pode** usar `--text-color`: a sidebar é navy FIXA nos dois temas
(§6/UI-04) e a tinta do tema claro seria texto escuro sobre navy — entram dois tokens novos em
`brand-theme.css` com os valores literais que o Tailwind já rendia, para a entrada da catraca não
mexer um pixel.

**Uma adição de plano à estrutura da spec §3:** `DashboardItemRow.tsx`. `AlertData` e
`PendingItemData` têm a mesma forma de linha (`severity`, `description`, `date`, `navigation`); só
`module` distingue. A linha é um componente, e as duas listas o compõem.

**Números do gate:** baseline **36 arquivos / 186 testes**; ao fim **38 / 204**. Os "6 testes" da
spec são **cenários**; o vitest conta **casos**, e os `it.each` de `navigation.test.ts` rendem 13.

**Handoff: `executor: claude`, main tree.** Três das onze tasks são de fronteira do repositório e
não de escrita de tela — mover um utilitário de dinheiro entre camadas, ligar uma catraca de lint
numa camada inteira (reescrevendo o comentário normativo que a decisão torna falso) e provar o DoD
com papel-sonda de RBAC e contagem de tabela. **O `/lotus-ui-review` do Step 9 da Task 11 é passo do
João** (`disable-model-invocation: true`); o bloco não fecha sem ele.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco dashboard-frontend-central-controle`,
por instrução do João. O planejamento **não** implementa.

### Execução — 2026-08-15: início, técnica `executing-plans`

`/executar-bloco dashboard-frontend-central-controle` validou as âncoras (spec, plano e packet no
disco; Git limpo na branch `feat/dashboard-frontend-central-controle`; `active_plan` cobrindo o work
item).

**Técnica: `executing-plans`, não `subagent-driven-development`.** O plano tem 11 tasks
majoritariamente sequenciais por contrato (Task 6 consome Task 1, Task 7 consome Task 4, Task 10
consome 5–9, Task 11 consome tudo) e o ambiente restringe o uso do Agent tool a pedido explícito do
João, que não veio nesta invocação. `executor: claude`, main tree — handoff do plano já cobria isso.

**Task 1 (`formatUf` sobe para `shared/lib`) completa.** Medido antes de mexer: exatamente 5 sítios
de import (`BudgetStatCard.tsx`, `BudgetsTable.tsx`, `QuoteRow.tsx`, `DataStep.tsx`,
`useQuoteForm.ts`), como o plano previa. `git mv` preservou histórico; barrel de `shared/lib`
exporta `uf`; os 5 imports reapontados para `@shared/lib`; zero referência ao caminho antigo. Gate:
`tsc -b` sem erro, eslint exit 0, **36 arquivos / 186 testes** — baseline intocado, como esperado de
uma task que só move função pura.

### Execução — 2026-08-16: as 11 tasks executadas, `ready_for_review`

**Tasks 2–11 completas**, uma por commit, cada uma com o gate do plano rodado antes de commitar.
Gate final: eslint exit 0, `tsc -b` sem erro, **38 arquivos / 204 testes** — exatamente o alvo do
plano (baseline 36/186 + 13 casos da Task 4 + 5 da Task 5). Nenhum step do DoD exigiu conserto de
código, então o commit de `fix` previsto na Task 11 Step 10 não existe.

**Três achados durante a execução, todos consertados no próprio commit da task:**

1. **Task 5 — `mockClear()` em `beforeEach` produz falha fantasma de rejeição não tratada.** O
   `beforeEach(() => get.mockClear())`, adicionado para isolar a contagem de chamadas, fez dois
   testes que já passavam falharem com um dump cru do valor rejeitado, sem mensagem de asserção.
   Isolado empiricamente (repro mínimo confirmou a asserção PASSANDO enquanto o Vitest reportava
   falha; `mockRejectedValue` é lazy e `mockClear` só zera histórico, então o mecanismo exato não
   foi fixado — a condição de gatilho, sim, 3/3). Consertado adotando **contagem relativa**
   (`const antes = get.mock.calls.length`), que é a convenção que `useValidationPage.test.tsx` já
   usava — o `beforeEach` nunca foi necessário.
2. **Task 5 — narrowing de TS perdido através do closure.** `act(() => result.current.retry())` não
   compila depois de um `if (result.current.kind !== 'ready') throw`: reacessar `result.current`
   dentro da arrow function é escopo novo. Estava assim no código literal do plano. Consertado
   capturando `const antesDoRetry = result.current`. Pego pelo `pnpm build`, não pelo `pnpm test`.
3. **Task 7 — `react-refresh/only-export-components` sobre `severityTagProps`.** Helper puro
   convivendo com componentes no mesmo arquivo. Seguido o precedente que já existe no repo
   (`AppToast.tsx`): `eslint-disable-next-line` com motivo declarado, em vez de um arquivo novo para
   uma função de três linhas.

**Prova do DoD (Task 11) — o que foi medido, não deduzido:**

- **Dado real, 6 seções:** as 6 KPIs, 7 pendências, 3 alertas, agenda e funil renderizam com o seed;
  nenhuma chave i18n crua na tela.
- **3 locales × 2 temas:** rótulo traduzido nas três; detalhe do item **em espanhol** nas outras
  duas, como D17 prevê; formato de data acompanha a locale; nenhum tom ilegível no tema oposto.
- **Gate `null` por papel-sonda (3 papéis criados e removidos):** sem `commercial.*` → card de
  cotações some e as duas etapas comerciais somem do funil; sem `operation.turma.view` → os 4 KPIs
  de turma, a agenda e o funil somem; sem nenhuma das três → tela `noAccess`, não página em branco.
  Sondas removidas ao fim (`forceDelete`), zero resíduo em `users` e `roles`.
- **5 sítios de UF (D13):** `BudgetsTable` (450/80/120 UF), `BudgetStatCard` (450/120/80),
  `QuoteRow` (120 UF), `DataStep` — `parseUfInput` aceita `1.250,75` e normaliza para `1250,75` — e
  `useQuoteForm`, que **repõe formatado**: o backend manda `"250.0000"` (`decimal(12,4)`) e o campo
  reabre com `"250"`. O caminho de escrita foi exercido, não só o de leitura.
- **Catraca de cor nos dois sentidos (D11):** verde no estado atual; com `text-slate-400` injetado
  em `PipelineFunnel.tsx`, reprova **nomeando arquivo e linha** (`20:31`). Sonda revertida.
- **Zero mutação:** `turmas=6, quotes=9, budgets=8, certificates=5, enrollments=56, files=22` antes
  e depois de uma rodada por todos os CTAs — números idênticos.
- **Backend intocado:** `git diff main...HEAD -- backend/` e `-- generated.ts` ambos vazios. Pint e
  `typescript:transform` são N/A por escopo, medido e não suposto.

**Step 9 do plano (`/lotus-ui-review`) continua PENDENTE e é do João** (`disable-model-invocation:
true`). É a revisão de viewport, hierarquia de cabeçalhos e estados na tela; o bloco não fecha sem
ela. A transição para `ready_for_review` cobre o code review do diff, não substitui esse passo.

**`backend/config/cors.php` está modificado no working tree e NÃO é deste bloco** (WIP do João:
`allowed_origins` passa a aceitar lista separada por vírgula). Ficou fora de todo `git add` — os
commits usaram paths exatos.

### Review — 2026-08-16: `/revisar-sprint`, risco BAIXO, 3 achados 🟡

**Divergência de registro encontrada na abertura, e ela não é sobre a etapa.** Cinco arquivos do
Dashboard estão modificados no working tree, sem commit: `AgendaPanel`, `DashboardItemRow`,
`DashboardPage`, `KpiRow` e `PipelineFunnel`. O conteúdo é correção de revisão visual — os
comentários citam **UI-01 a UI-05 da "revisão de 2026-08-16"** com medidas em pixel (vazamento de
19–55px em 390px, rótulo colapsado a ~33px, barras do funil no mínimo, truncagem em `lg`, 231px de
KPI empurrando as listas para fora de 1440×900). O `/lotus-ui-review` do Step 9 **rodou**, portanto,
mas a seção de execução acima ainda o declara PENDENTE e não existe artefato dele em
`docs/superpowers/audits/`. Registro e árvore discordam sobre um fato, não sobre `workflow_state` —
por isso a sessão seguiu para o review em vez de parar, e a reconciliação é decisão do João.

**A revisão cobriu o working tree, não só o intervalo commitado**, porque é o working tree que vai
para a `main`. Gate remedido nele: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
**38 arquivos / 204 testes** — os mesmos números que o fechamento da execução mediu.

**Classificação: BAIXO risco, pelo gate binário e medido, não pela projeção da spec.**
`git diff main...HEAD -- backend/` e `-- generated.ts` vazios; nada de schema, Sanctum, auditoria,
RBAC ou documento legal; `executor: claude`. O único toque em dinheiro é a promoção de `uf.ts`, e
ela é `git mv` **byte-idêntico** (0 linhas no diffstat) com os 5 imports reapontados — nenhuma
lógica de UF mudou. A segunda lente do Codex, que a spec §9 deixou como decisão do João pelo
alcance (8 arquivos novos, `uf.ts` em 4 telas de dinheiro, catraca nova numa camada), **não foi
acionada**; continua disponível se ele quiser.

**Órfãos (Passo 1): três, todos dentro da pasta nova e todos virando achado.** `Kpi.hint` declarado
e nunca preenchido; `severityTagProps` exportado sem consumidor externo; `dashboardKeys.all` sem
consumidor. Fora deles: `features/commercial/lib/` sobreviveu ao `git mv` com `quoteStatus.ts`,
`DashboardPage.tsx` antigo foi deletado de fato, e o `AppRouter` aponta para a pasta nova.

**Conformidade verificada e limpa:** nenhum import de feature nem de `primereact` em
`app/pages/Dashboard/` (lei §5.6); zero mutação e zero `can()`; `generated.ts` intocado (lei §5.3);
as **50 chaves** de i18n existem idênticas nas 3 locales e cobrem os 6 `PendingItemType`, os 5
`DashboardAlertType`, os 3 `DashboardModule`, as 3 severidades e as 6 `PipelineStage`; cor só por
variável de tema, com a catraca `COR_HARDCODED` agora rodando em `src/app/**` sem `ignores`; o
`sm:order-0` do `DashboardItemRow` foi conferido no CSS emitido (`.sm\:order-0{order:0}`) em vez de
suposto válido no Tailwind v4. A política de estado do hook preserva a tese da rule verbatim.

### Segunda lente (Codex) e correções — 2026-08-16

**O João decidiu três coisas de uma vez:** os 3 achados entram, a segunda lente vem **antes** deles,
e as 5 correções de UI review entram nesta branch. As correções foram commitadas primeiro
(`3273cbf`), para o Codex revisar o intervalo Git completo em vez de um working tree sujo.

**A segunda lente foi acionada mesmo com risco BAIXO, por decisão dele** — é a divergência por
alcance que a spec §9 tinha deixado em aberto. Codex read-only (`mcp__codex__codex`, sandbox
`read-only`) sobre `main...HEAD`, instruído a ler as leis §5, `docs/README.md`, os ADRs, a rule do
frontend, a spec e o plano, e a devolver `arquivo:linha — problema — impacto`. **7 achados: 3
coincidiram com os meus, 2 eram novos e verificados, 2 foram descartados com razão registrada.**
Nenhuma divergência de julgamento entre as duas lentes — elas se complementaram, e nenhuma
contradisse a outra.

**O achado que só o Codex viu é o mais grave do review, e foi verificado no backend antes de
aceito** (a regra da skill: achado que só o Codex viu não entra sem verificação própria). Ele
apontou que `nenhumaSecaoLegivel` ignora alertas liberados por `identity.user.view`. Medido em
`AdminDashboardAssembler.php:56-62,86,157`: essa permissão alimenta os alertas de documento de
relator e **não liga KPI, pipeline nem agenda** — as três coisas que o predicado media. Um papel só
com ela recebia todo KPI `null`, `pipeline: null`, `agenda: null` e uma lista de alertas **cheia**,
e a tela anunciava *"Nenhum módulo visível — seu perfil não tem permissão de leitura sobre nenhum
módulo"* enquanto escondia alerta autorizado. O bloco A mandou `null` justamente para a tela não
mentir sobre o banco; aqui ela mentia na direção oposta, com dado de peso de RN-09. O argumento
original do comentário vale para a lista **vazia** e se inverte na lista **cheia**: item na lista
prova permissão, porque o gate age na origem.

**Os dois descartados, com o porquê:** o `truncate` + `title` do detalhe é a UI-01 que o João
acabara de aprovar, decisão declarada e não defeito; e o `unauthorized` devolvido antes de calcular
`staleError` não custa nada — nesse ramo não há dado a preservar nem o que um retry recupere.

**Cinco correções commitadas (`f38585e`), todas de esforço P:** `hint` do KPI passa a carregar chave
i18n + valor e sai do `kpi.key === 'cotacoesPendentes'` no JSX; `severityTagProps` deixa de ser
exportado e leva o `eslint-disable` junto; `dashboardKeys.all` removido; os 6 KPIs medidos por
`Object.values` num lugar só; e o `min-w-1` do funil passa a valer só para contagem maior que zero.

**O caso do Q-4 ganhou teste, com o vermelho visto antes do verde** (lição 10): payload com todo KPI
nulo, seções nulas e **um** alerta devolve `ready`. Contra o predicado antigo ele falha e os 5
anteriores seguem verdes — medido, não deduzido. Gate final: `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **38 arquivos / 205 testes** (204 + o caso de regressão).

**A spec foi emendada onde o código passou a divergir dela**, em vez de a divergência ficar para o
`/auditar-docs` achar depois: o §4 ganhou a emenda do predicado com o mecanismo medido, e o §6
ganhou o 7º cenário. As emendas são datadas e dizem o que a spec afirmava antes.

**Nenhum trabalho deferido:** tudo que o João aprovou foi corrigido nesta sessão, então nada desceu
para o `backlog.md` e nada virou pendência documental.

**Estado: `ready_for_closure`.** Próxima ação: `/fechar-sprint`, que **não** roda automaticamente.
O fechamento herda o que já estava escrito para ele: fechar a P-34, deixar o BD-11 só com a D-03,
criar o B2 (`dashboard-frontend-analitico-e-redator`) no backlog e nomear a tradução do
`description` do backend (D17).

### Fechamento — 2026-08-16: o gate parou uma vez, e não foi por causa do bloco

**O item 1 do gate reprovou:** `php artisan test` deu **12 failed / 672 passed / 5 skipped**, todos
`RuntimeException: Session store not set on request.` em `AuthController.php:47` — `AuthTest` (6),
troca de senha (3) e `StaffUserCrudTest` (3). **A causa foi rastreada inteira antes de reportar, e é
ambiente, não código do bloco:** `backend/tests/TestCase.php:18` faz
`withHeader('Referer', env('FRONTEND_URL', …))` lendo a variável **crua**, e o `.env:38` passou a ser
lista separada por vírgula (`http://localhost:5173,http://localhost:5174`); o host resultante não
bate com `sanctum.stateful` (`.env:37`), o `EnsureFrontendRequestsAreStateful` não injeta o
`StartSession` e a rota devolve 500. **Provado nos dois sentidos:** com
`FRONTEND_URL=http://localhost:5173 php artisan test`, **684 passed / 5 skipped, zero falha**. A
diferença é a variável.

**Não é regressão deste bloco** — `git diff main...HEAD -- backend/` = 0 linhas. O `.env` é
gitignored e não aparece em `git status`; o que aparece é a outra metade do mesmo WIP do João, o
`config/cors.php` trocando `[env('FRONTEND_URL', …)]` por `explode(',', env('FRONTEND_URL', …))`.
`TestCase.php` é o terceiro sítio que lê a variável e o único que ainda a trata como valor único.
**O João decidiu fechar assim mesmo**, e o achado virou a **P-45** em vez de conserto dentro do
fechamento: o bloco é frontend puro, e abrir arquivo de backend aqui seria o alargamento de escopo
que o próprio gate recusa.

**Prova do critério de aceite contra a API real, não a higiene genérica.** `GET
/api/dashboard/metricas` como admin devolve as 5 seções do B1 com dado do seed — 6 KPIs, 7
pendências, 3 alertas, agenda de 4 janelas, funil de 6 estágios. **O gate `null` foi provado ao
vivo com papel-sonda criado e removido por API** (`POST /api/roles` + `POST /api/users`): `sonda-q4`
com **só** `identity.user.view` recebeu `kpis` inteiramente `None`, `pipeline`, `agenda`,
`compliance_turmas`, `redatores`, `series` e `rankings` `null`, 0 pendências e 0 alertas. Isso
confirma ao vivo o mecanismo do achado do Codex (`AdminDashboardAssembler.php:62,157`): essa
permissão alimenta só `alertasDocumentos()`, não KPI, pipeline nem agenda. Sondas removidas —
`users=0 roles=0`.

**A metade que NÃO foi reproduzida está declarada, sem maquiagem:** o payload "tudo `null` + alertas
cheio" — o caso Q-4 exato que o review consertou — **não tem gatilho vivo no seed**. Os 3 alertas
são `turma_overdue` (gate `operation.turma.view`) e nenhum documento de relator está dentro do
horizonte de 30 dias. Ele segue provado pelo 7º teste de `useDashboard`, que foi vermelho antes de
verde. Fabricar o gatilho exigiria mutar dado de documento, que é justamente o que o Step 6 do DoD
conta.

**Resto do gate:** zero mutação (`turmas=6 quotes=9 budgets=8 certificates=5 enrollments=56
files=22`, idênticos ao snapshot da execução, com as sondas já removidas); catraca de cor provada
nos dois sentidos (verde no HEAD; com `text-slate-400` injetado em `PipelineFunnel.tsx` o lint
reprova nomeando `17:23`; sonda revertida); front `pnpm lint` exit 0, `pnpm build` verde,
**38 arquivos / 205 testes**. **Pint e `typescript:transform` são N/A por escopo medido** — zero
arquivo `backend/` e `generated.ts` com 0 linhas de diff. Código morto: os 3 órfãos do review saíram
em `f38585e`; os seis `.gitkeep` de `features/*/stores|api|hooks` são alheios e não foram tocados
por este bloco (`git diff main...HEAD` não os lista), então se mencionam e não se apagam.

**Duas coisas ficam abertas, e nenhuma delas é achado novo do fechamento:**

1. **A tela revisada não é exatamente a entregue.** `f38585e` tocou 3 componentes de render
   (`DashboardItemRow`, `KpiRow`, `PipelineFunnel`) **depois** do commit da revisão visual
   `3273cbf`. Os passos visuais do DoD (3 locales × 2 temas, 5 sítios de UF) não foram re-rodados
   neste gate.
2. **O `/lotus-ui-review` rodou mas não deixou artefato** em `docs/superpowers/audits/` — a
   divergência de registro que o review já havia levantado segue aberta. `disable-model-invocation:
   true`: o passo é do João, e o registro dele também.

**Movimentos de backlog e pendências:** a **P-34** fecha (ficha em `pendencias/encerradas.md`, sai no
próximo fechamento) e o **BD-11** fica só com a **D-03**; nasce a **P-45**; nasce a **D-18** (o
`description` do backend em espanhol, atada à D-07 pelo mesmo motivo); a **P-44** tem o gatilho
reapontado para o B2, porque quem mostra nome de redator é a carga de redatores e ela é seção do B2;
e a trava de merge da **D-15** caiu — `DashboardWindows` está na `main`, medido —, sem que o
fechamento a agrupe, porque escolher bloco é do João. O **B2**
(`dashboard-frontend-analitico-e-redator`) nasceu no `backlog.md` com as três coisas que o B1
empurrou para ele: a decisão de chart lib, o filtro de período e a D-16 sem consumidor que a peça.

**Estado: `idle`.** O backlog **não** promove nada sozinho: o próximo item é escolha explícita do
João.

## Antepenúltimo item fechado — 2026-08-15 (`meu-perfil-backend-self-service`, Sprint 6 · Meu Perfil, bloco 1 de 2)

### Seleção — 2026-08-14

**Primeiro bloco da Sprint 6 (`backlog.md:66`), promovido explicitamente pelo João** com o estado em
`idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de sempre — e é
a nona vez (BD-1, BD-2, BD-7, BD-8, BD-9, BD-5, login, `celula-de-identidade`, dashboard): o
argumento era **título de seção** (`## Sprint 6 · Meu Perfil`), não slug promovido. Três decisões
dele fecharam o gate: o slug `meu-perfil-backend-self-service` (a ordem escrita do backlog — backend
antes do frontend); a **worktree `fix-frontend`** como área de trabalho, com branch
`feat/meu-perfil-backend-self-service` nascida de `84b0838`; e a rota **`context_required`**,
exatamente como o backlog exige para a Sprint 6.

**A fonte externa EXISTE declarada, como na Sprint 5 e ao contrário dos BDs:** o backlog aponta o
escopo canônico no Drive (`Planejamento/meu-perfil-escopo-funcional.md`) e a execução detalhada no
Notion (EAP 8.5.1–8.5.9). Nenhuma rota direta a `ready_for_planning` se aplica; o Context Packet do
Codex (`lotus-context-packet`, read-only) vem antes de qualquer brainstorming.

**`state_basis_commit` passa de `9ed7351` a `84b0838`** — o merge do PR #52, HEAD atual da `main`.
Não era divergência: com `active_work_item` `null` não havia trabalho ativo cujo baseline pudesse ter
derivado.

### Exceção declarada à invariante de um `active_work_item` — quarta ocorrência, e a primeira que é backend × backend

**Existem dois itens ativos ao mesmo tempo, por decisão explícita do João em 2026-08-14**, e isto
está escrito porque a invariante do topo deste arquivo diz o contrário. O
`dashboard-backend-agregacoes` (Sprint 5, bloco 1 de 2) está em `workflow_state: executing` no main
tree `/home/jvbat/projetos/lotus`, branch `feat/dashboard-backend-agregacoes` (`8c53f60`,
`state_basis_commit: 1e40acb`), com **uma task commitada e WIP não commitado na Task 2**
(`OperationMetricsQuery.php` e `OperationMetricsQueryTest.php` untracked,
`DomainDependencyTest.php` modificado).

**A diferença para as três ocorrências anteriores é que esta é a que a P-03 descreve.** BD-4 × BD-9,
BD-5 × login e BD-6 × `celula-de-identidade` foram todas backend × frontend, e a P-03 não disparava
por definição. Aqui **os dois blocos são de backend**, que é o gatilho literal e verificável da
pendência (`pendencias/abertas.md:331-333`: "mais de um `active_work_item` de backend"). **O gatilho
da P-03 venceu neste bloco.** Fechá-la é decisão separada do João — o registro entra aqui para não
voltar como achado novo no review.

**O dano que a P-03 descreve foi medido e já está mitigado por mecanismo existente, não por sorte.**
O texto dela diz: "o stack monta o main tree e o teste rodaria contra o código errado". Medido com
`docker inspect`, não deduzido:

| Container | Monta | Serve |
|---|---|---|
| `lotus-app-1` | `/home/jvbat/projetos/lotus/backend` | main tree = dashboard |
| `fix-frontend-app-1` | `/home/jvbat/projetos/fix-frontend/backend` | **esta worktree** |

`fix-frontend-app-1` está `Up` e vive nas duas redes (`fix-frontend_default` + `lotus_default`),
então alcança o MySQL e o MinIO do stack principal — é exatamente o arranjo construído durante o
`celula-de-identidade` e ele sobreviveu. `php artisan test` neste container mede **esta** branch. O
`fix-frontend-nginx` em `:8081` segue de pé para o e2e; `:8080` e `:5173` seguem do main tree.

**A sobreposição foi medida antes da decisão, não depois — quatro pontos:**

1. `frontend/src/shared/types/generated.ts` — **colisão certa, não provável.** O dashboard já
   regenerou (+146 linhas commitadas, 21 DTOs e 5 enums); este bloco cria contrato próprio de perfil
   e regenera de novo. Cada árvore produz o arquivo correto para o próprio backend; o conflito é no
   merge, e o remédio é regenerar depois dele — mecânico, com precedente no merge do BD-6.
2. `backend/tests/Feature/Shared/DomainDependencyTest.php` — **colisão provável na abertura,
   eliminada no brainstorming.** Era allowlist compartilhada de arestas entre domínios, com o WIP do
   dashboard justamente nela (`'Dashboard'` ganhando quatro arestas para `Operation`); a colisão
   dependia de o resumo profissional do Redator ler Operation de dentro de Identity. O João cortou
   exatamente essa parte do escopo (D1 da spec), então **o arquivo não é tocado por este bloco** e a
   previsão não se confirmou. Registro mantido: a medição valia na hora em que foi feita, e o que
   mudou foi o escopo, não o fato.
3. `backend/app/Domains/**` — **zero colisão, medida.** O dashboard vive inteiro em
   `Domains/Dashboard/` (27 arquivos, domínio novo); este bloco vive em `Domains/Identity/`. Nenhum
   arquivo em comum.
4. `backend/routes/api.php` — **zero colisão, e por mecanismo, não por acaso.** O arquivo tem 14
   linhas e agrega por glob (`app_path('Domains/*/routes.php')`); cada domínio declara as próprias
   rotas no próprio arquivo. Dashboard escreve em `Domains/Dashboard/routes.php`, este bloco em
   `Domains/Identity/routes.php`.

**Alternativa recusada por ele:** fechar o dashboard primeiro e só então promover a Sprint 6, o que
manteria a invariante, respeitaria a ordem escrita do backlog e eliminaria as duas colisões na
origem, ao custo de o bloco não começar hoje.

### Superfície declarada do bloco, medida na abertura

`SessionUserData` tem hoje **9 campos** (`id`, `uuid`, `name`, `email`, `type`, `is_active`, `roles`,
`permissions`, `photo_url` — o último acrescentado pela extensão do `celula-de-identidade`). O
backlog é explícito em **não inflar** este DTO: o contrato de perfil é próprio. `Identity/Data/` tem
10 DTOs, e `RedatorDocumentData` já existe — a documentação profissional do Redator não nasce do
zero. O que é self-service está fechado no backlog (`backlog.md:72-73`): nome, telefone, foto e a
própria senha; **e-mail, RUT, role, permissões, `type` e `is_active` não são**.

**Risco de review projetado ALTO** pelo gatilho binário do projeto: regenera `generated.ts` (lei
§5.3), toca eixo de autenticação (troca da própria senha) e ownership de documento de Redator. A
classificação final é do `/revisar-sprint`, não desta promoção.

### Context Packet — 2026-08-14: `ready`, e a rota se pagou de novo — agora com fonte que existe

Packet em `docs/superpowers/context-packets/2026-08-14-meu-perfil-backend-self-service.md`, gerado
pelo Codex read-only com a skill `lotus-context-packet`. **Contrato validado item a item, não aceito
de chegada:** marcadores exatos, frontmatter completo com `plan_path`/`spec_path` corretamente em
`null` (os ponteiros do estado eram `null`, e a skill proíbe inventá-los), **8 key facts** — o teto
exato —, `status: ready`, `RECOMMENDED_TRANSITION: ready_for_planning`, e nenhum staleness trigger
apontando para hash de proveniência ou para a própria transição promotora, que é a armadilha que a
skill documenta em §"Provenance versus staleness".

**Os três hashes de proveniência foram remedidos e batem:** `base_commit` `8964777024e8…`,
`state_blob_sha` `7af48af2…` e `progress_blob_sha` `a494bf83…`. Obtidos, não adivinhados.

**A diferença desta rota para todas as anteriores é que aqui a fonte externa EXISTE — e o packet a
recuperou por ID.** Nos BDs a rota se justificava por ausência **medida** de fonte; no
`celula-de-identidade` o retorno foi **prova de ausência**. Aqui o Drive
`meu-perfil-escopo-funcional.md` (file ID `1lI3IEOx9_2H0…`) foi criado às **18:37:45Z de hoje**,
três minutos antes desta promoção, e prescreve o bloco inteiro: os três campos self-service
(`name`, `phone`, foto), os seis proibidos, o fluxo próprio de senha, os quatro tipos documentais,
a fronteira Meu Perfil × Dashboard e o DoD de backend com dez itens. Não havia o que supor.

**Duas afirmações do Codex foram verificadas contra a fonte pelo revisor, não aceitas pela citação:**

1. **A linha "Validade documental" da tabela de divergências inverte design já implementado**, então
   ela precisava ser real. O código diz o oposto do packet — `RedatorDocumentData.php:12-13`:
   *"O status (vigente/por vencer/vencido) é derivado no front a partir de `valid_until`"*. O Drive
   §5 diz **verbatim**: *"A regra que decide validade/idoneidade permanece no backend/domínio dono.
   O React não calcula compliance a partir de datas cruas quando o contrato puder fornecer o estado
   semântico."* O Drive vence pela hierarquia, e a regra de reconciliação que protege decisão
   fechada **não se aplica**: ela protege contra reabrir decisão por causa de snapshot **antigo**, e
   este documento é de hoje.
2. **A EAP 8.5.1 foi buscada por page ID e confere:** `Camada: Backend`, `Sprint 6 · Meu Perfil`,
   `ADR ref: ADR-04, ADR-06`. Mais importante, ela está ancorada na collection **canônica**
   `e64b7d57-…`, não na obsoleta `6adbc960-…` que ainda responde a busca e produziu as **12 falsas
   divergências** de 2026-07-30. O packet endereçou a base certa.

**Uma emenda do revisor, registrada e não silenciosa:** o terceiro bullet de `## Constraints`
afirmava as 15 linhas do dashboard na allowlist **sem chave de fonte**, e o contrato exige que todo
fato externo cite uma. A chave `[DASH]` entrou e a emenda está no cabeçalho do packet; o fato foi
remedido e confere. É a mesma forma da correção do packet do `celula-de-identidade` — resto
verbatim, correção no cabeçalho.

**O Codex corrigiu a minha instrução, e isso é o mecanismo funcionando na direção certa.** Eu passei
o dashboard como `8c53f60` com WIP não commitado — medição minha, de 18:35. Ele remediu às 18:48 e
achou `4b3d6e3f7c49…` com **árvore limpa**: a branch avançou entre as duas leituras e commitou o
WIP. A linha entrou na tabela de divergências dele em vez de a minha descrição ser copiada. Foi
exatamente o que o prompt exigia ("se não mediu, não escreva"), e é o oposto do que aconteceu no
packet anterior, onde uma afirmação de árvore não medida teve de ser removida na revisão.

**`status: ready`, não `partial`** — as duas fontes canônicas foram recuperadas, nenhuma ficou
`unavailable`, e não sobra fato bloqueante. As **cinco open questions são as do próprio Drive**
(§14, "Pontos para Context Packet / brainstorming técnico"), não lacunas que o Codex inventou:
paths HTTP sem conflitar com `/api/me`, limiar de "vence em breve" e janela de próximas turmas,
seam comum com o Dashboard, remoção self-service por tipo documental e comportamento da sessão
após troca de nome/foto e de senha. São decisões de desenho do João e pertencem ao brainstorming.

**Estado: `ready_for_planning`.** Próxima ação: `/planejar-bloco` prossegue para `planning`
(brainstorming → spec → plano).

### Brainstorming e spec — 2026-08-14: o bloco encolheu por decisão, e encolheu para melhor

Spec em `docs/superpowers/specs/2026-08-14-meu-perfil-backend-self-service-design.md`. As **cinco
open questions do packet eram as cinco perguntas do próprio Drive §14**, e as cinco foram fechadas
pelo João: `/api/profile` como recurso próprio (D4), limiar de 30 dias em Identity (D6), sem seam
com o Dashboard (D1), substituição sem remoção self-service (D2), REUF administrativo (D5).

**O corte é a decisão do bloco.** O desenho apresentado primeiro construía uma camada comum em
`Operation` (`OperationWindows`, `RedatorAtividadeQuery`) para o resumo de atividade do Redator, e
com ela **três arestas novas de Identity para Operation**. O João recusou: *"Vamos excluir a parte
que vem de dashboard, esperando a finalização do seu bloco na branch e worktree paralela, acredito
que evita fazer cross-domain com operation. O restante implementamos."* Perguntado se o corte era
por bloco inteiro ou pelo que de fato depende de Operation, escolheu o segundo. Saíram
`turmas_em_andamento`, `proximas_turmas`, `proxima_turma` e `pendencias`; **ficou
`cursos_habilitados`**, que sai de `Redator::courses()` — `belongsToMany` para `Catalog\Models\Course`,
aresta **já** na allowlist. O bloco fica inteiro dentro de Identity, sem aresta nova, e a colisão
prevista em `DomainDependencyTest.php` desapareceu com o escopo.

**Um furo de regra de negócio apareceu na medição e não estava em fonte nenhuma.** A rota
administrativa de documento aceita `valid_until` do corpo da request, e o
`RedatorIdoneidadeService` decide habilitação de turma lendo exatamente REUF + `valid_until`.
Self-service irrestrito deixaria o Redator declarar a própria validade de REUF e **se auto-habilitar
por payload** — RN-09 furada sem nenhum código malicioso. Levantado como pergunta, não resolvido por
conta própria; o João manteve o REUF administrativo (D5).

**Uma armadilha de teste foi medida antes de o plano existir:** `backend/phpunit.xml` define
`SESSION_DRIVER=array`, então a suíte não usa a tabela `sessions` e o teste do encerramento de
sessões (D3) passaria verde **sem exercitar nada** — cobertura fantasma, a lição 10. A spec fixa
dois testes que medem coisas diferentes (contagem de linhas na tabela; sessão corrente sobrevive ao
HTTP) e obriga o override do driver. Igual sorte teve a asserção de N+1: `Model::preventLazyLoading()`
**não está ligado globalmente** na suíte e só marca instância hidratada com mais de uma linha — no
perfil, que hidrata um usuário, a guarda nunca dispararia. A spec troca por contagem de queries e
registra o porquê, para o plano não repetir a tentativa.

**Divergência do packet resolvida contra a fonte, não por gosto:** `RedatorDocumentData.php:12-13`
afirma que o status documental é derivado no front; o Drive §5 diz o contrário. O Drive vence e o
cálculo vai para o backend (enum `DocumentValidityStatus`), **mas o DTO administrativo não muda** —
o contrato novo é do perfil, e reescrever `RedatorDocumentData` é escopo de outro bloco.

Duplicação declarada e datada: `DIAS_AVISO = 30` em Identity coexiste com
`DashboardWindows::EXPIRY_WINDOW_DAYS = 30` da branch paralela. Unificar é **tarefa nomeada no
fechamento**, depois do merge — antes dele significaria importar de um domínio que nesta árvore
ainda não existe.

**Estado: `planning`.** Próxima ação: `writing-plans` para o plano executável.

### Plano — 2026-08-14: 8 tasks, executor único, e três armadilhas de teste fechadas antes da execução

Plano em `docs/superpowers/plans/2026-08-14-meu-perfil-backend-self-service.md`. Ordem: enum
(regras) → DTOs → `GET` → `PUT` → foto → senha → documentos → `generated.ts`. Cada task fecha com
Pint dos arquivos tocados e um commit próprio.

**A spec foi aprovada sem emenda pelo João**, e o self-review do plano contra ela reprovou **três
coisas minhas**, todas medidas no repo, nenhuma vinda de suposição:

1. **`@dataProvider` não existe mais.** O repo roda `phpunit/phpunit ^12.5.12`, e a anotação foi
   removida na 12 — `EnrollmentResultTest` já usa `#[DataProvider]`. Os sete casos de campo proibido
   teriam sido silenciosamente **não executados**.
2. **O segundo teste de sessão, como eu o escrevi primeiro, não provava nada.** Ele usava
   `actingAs()`, que autentica direto no guard e **não grava linha em `sessions`** — com
   `SESSION_DRIVER=array` a tabela fica vazia, o purge vira no-op e o teste passa verde. Reescrito
   para forçar `session.driver = database`, **logar por HTTP** (é o login que grava a linha com
   `user_id`), plantar uma sessão de outro dispositivo e então asserir que a do outro morreu, que
   sobrou exatamente uma, e que quem trocou continua navegando. É a mesma armadilha que a spec já
   tinha nomeado — ela quase escapou na hora de virar código.
3. **`post()` com arquivo devolveria a validação no formato errado.** O idioma do repo é
   `postJson()` com `UploadedFile` no payload (`RedatorDocumentTest.php:85`); o cliente de teste
   extrai os arquivos antes de serializar, e o `Accept: application/json` é o que garante 422 JSON.

**Uma dúvida de mecanismo foi resolvida lendo o pacote, não a documentação.** A recusa 422 de campo
proibido depende de `rules()` aceitar chave **sem propriedade correspondente** no DTO.
`DataValidationRulesResolver::applyOverwrittenRules` itera as chaves devolvidas e as adiciona ao
ruleset sem checar se existe propriedade com aquele nome — então funciona, e o plano cita o arquivo
em vez de deixar contingência escrita.

**Executor: `claude`**, para as oito tasks. Duas tocam lei do §5 diretamente (senha/sessão e a
regeneração de `generated.ts`), a de documentos decide ownership com a RN-09 ao lado, e a de campos
proibidos depende do comportamento de pacote acima. O plano registra que as tasks 1, 2 e 5
qualificariam para `codex` com `paths_autorizados` fechados, e por que dividir não compensa: as
demais consomem o contrato que elas fixam.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco meu-perfil-backend-self-service`,
em instrução posterior — o planejamento não implementa.

### Execução — 2026-08-14: início, técnica `executing-plans`

`/executar-bloco meu-perfil-backend-self-service` validou as âncoras (spec, plano e packet no
disco; Git limpo na branch `feat/meu-perfil-backend-self-service`; `active_plan` cobrindo o work
item) e abriu com `fix-frontend-app-1` já `Up` (3h), montando esta worktree — a P-03 já estava
mitigada, sem novo `docker compose up` necessário.

**Técnica: `executing-plans`, não `subagent-driven-development`.** As oito tasks são sequenciais
por contrato (3 consome 1+2, 4 consome 2+3, 8 consome todas) — não há paralelismo genuíno a
explorar — e o ambiente restringe o uso do Agent tool a pedido explícito. `executor: claude` no
plano já cobre a delegação ao Codex; nenhuma reabertura desse handoff aqui.

**Task 1 (enum de validade documental) completa** (commit a seguir). Vermelho medido antes do
código: `Call to undefined method RedatorDocumentType::isSelfService()`. 7 testes verdes depois do
enum `DocumentValidityStatus` e dos dois métodos em `RedatorDocumentType`. Pint `passed` nos três
arquivos.

**Task 2 (DTOs de leitura) completa.** `ProfileData`, `RedatorProfileData` e
`RedatorProfileDocumentData` seguem a forma da spec §3 sem desvio — 7 testes verdes, catraca
`PersistenceLawsTest` verde confirmando `#[DataCollectionOf]` + `#[ReadOnlyCollection]` corretos.
Pint removeu um import não usado no teste (`File`), sem efeito de comportamento.

**Task 3 (`GET /api/profile`) completa, e uma quarta armadilha de teste apareceu na hora — nova,
fora das três que a spec já tinha fechado.** O teste `test_perfil_nao_faz_n_mais_um`, copiado
verbatim do plano, dava `0 identical to 4` com corpo idêntico entre as duas chamadas — sintoma de
N+1 zerado por dado velho, não de N+1 ausente. Isolado por medição, não suposição: `auth:sanctum`
resolve `$request->user()` via `Illuminate\Auth\RequestGuard` (Sanctum registra por
`Auth::viaRequest`), que **cacheia o usuário internamente na primeira resolução** e é singleton no
container durante o método de teste inteiro. `actingAs($novoUser, 'web')` sozinho não basta — troca
só o guard `web`; `$request->user()` continua batendo no `sanctum` cacheado, que devolve o objeto
velho com `redator` já carregado (`loadMissing` vira no-op). A prova ficou em três camadas de
instrumentação temporária (contador estático no controller, `spl_object_id` dos dois guards,
`DB::listen()` cru) — removida do commit, só o achado fica. Corrigido com
`$this->app['auth']->forgetGuards()` antes de reautenticar com um `User::findOrFail` fresco. É
artefato do container persistir entre chamadas de teste no mesmo método, não bug de produção: lá
cada request boota o guard do zero. 4 testes verdes; `AuthTest`/`RbacAuthTest` confirmam `/api/me`
intocado (D4). Pint `passed`.

**Task 4 (`PUT /api/profile`) completa.** 12 testes verdes (5 diretos + 7 do `#[DataProvider]`) —
o plano previa 11, mas contou errado; o `#[DataProvider]` funcionou de primeira, sem repetir a
armadilha do `@dataProvider` antigo. `prohibited` recusou os sete campos forjados nomeando o campo,
como a D8 exige. Pint removeu import não usado no teste (`User`), sem efeito de comportamento.

**Task 5 (foto do perfil) completa.** Reuso integral de `UserPhotoService`, sem gate administrativo
— 6 testes verdes, redator sem `identity.user.update` troca a própria foto (D7). Pint `passed`.

**Task 6 (senha e sessões) completa, com a task mais sensível do bloco entregando DUAS armadilhas
de teste novas — nenhuma das duas estava na spec, e as duas isoladas por medição em três camadas de
instrumentação temporária (contador estático, `spl_object_id`, `DB::listen()` cru), removida do
commit.**

1. Mesma classe de bug da Task 3 (`RequestGuard` do Sanctum cacheado por processo), mas aqui o
   sintoma inverteu: o `test_a_sessao_corrente_sobrevive_…` copiado do plano dava
   `assertSame(1, 0)` — a "sessão corrente" desaparecia junto com a de terceiro. Causa em DUAS
   camadas, as duas comprovadas antes do fix: (a) `postJson`/`putJson` resolvem cookies por
   `MakesHttpRequests::prepareCookiesForJsonRequest()`, que devolve array **vazio** a menos que
   `withCredentials()` esteja ligado — medido com `ALL_COOKIES=[]` no request do `PUT`; (b) mesmo
   com `withCredentials()`, `prepareCookiesForRequest()` **criptografa sozinho** o valor passado a
   `withCookie()` — ele espera texto puro, não o `Set-Cookie` já criptografado que
   `getCookie(..., decrypt: false)` devolveria. Corrigido com `withCredentials()` +
   `withCookie(config('session.cookie'), $login->getCookie(...)->getValue())` usando o decrypt
   padrão. Autenticação (via guard cacheado) já funcionava mesmo sem o fix; só o ID de sessão
   "corrente" estava errado — por isso o purge matava a sessão real do login junto com a de
   terceiro.
2. A nota do próprio plano ("se `assertSame(1, …)` falhar com `0`, o driver não trocou a tempo")
   **não bateu com a causa medida** — `DB::table('sessions')->count()` logo após o login já dava 1,
   a linha existia. O plano previu o sintoma certo com a causa errada; o registro fica para não se
   repetir a heurística errada num teste parecido.

7 testes verdes; `AuthTest`/`LoginLogTest`/`RbacAuthTest` confirmam login e RBAC intocados. Pint
`passed`.

**Task 7 (documentos do redator) completa.** `POST /api/profile/documents` reusa
`StoreRedatorDocumentAction` inteiro; `REUF` recusa com 422 nomeando o campo (nunca 403), fechando
a RN-09 do jeito que a spec D5 prescreveu. 6 testes verdes; `RedatorIdoneidadeServiceTest` +
`TurmaHabilitacaoServiceTest` + `TurmaDesignationTest` (23 testes) confirmam a RN-09 intocada. Pint
removeu um import não usado, sem efeito de comportamento.

**Task 8 (`generated.ts`) completa, fecha o bloco.** `typescript:transform` saiu aditivo — 37
linhas, zero remoção — com as seis entradas da spec §3 presentes e `DocumentValidityStatus`
serializando exatamente como previsto. `pnpm build` verde. Suíte de backend inteira: **644 passed /
5 skipped (2292 asserções)**, contra baseline 592/5 (2154) — +52 testes e +138 asserções, exatamente
as sete tasks de conteúdo do bloco, zero regressão e zero skip novo. `DomainDependencyTest` verde
**sem ter sido tocado** — prova de que o corte D1 (sem aresta nova para Operation) segurou o bloco
inteiro dentro de Identity, como a spec prometeu.

**O bloco produziu duas descobertas de mecanismo de teste que não estavam em fonte nenhuma — a
spec já havia fechado três armadilhas conhecidas (`@dataProvider`, `SESSION_DRIVER`, `postJson`
com arquivo), e a execução mediu mais duas, ambas raiz no MESMO comportamento do Sanctum
(`Illuminate\Auth\RequestGuard` cacheado por processo de teste), com sintomas opostos**: na Task 3
o cache fazia o segundo `getJson` devolver dado VELHO (`redator` já carregado, N+1 mascarado); na
Task 6 o mesmo cache fazia a autenticação sobreviver mas a sessão HTTP real não replicar entre
chamadas, fazendo o purge matar a sessão "corrente" por engano. As duas ficam registradas nos
comentários dos testes correspondentes (`ProfileReadTest`, `ProfilePasswordTest`) para não se
repetir a investigação num bloco futuro que também misture duas chamadas HTTP autenticadas no mesmo
método de teste.

**Executor `claude` nas oito tasks, como o plano previu — nenhum subagente disparado.** O ambiente
restringe o uso do Agent tool a pedido explícito do João; como as tasks são sequenciais por
contrato (cada uma consome o que a anterior fixou), `subagent-driven-development` não teria
paralelismo genuíno para explorar mesmo se disponível — `executing-plans` foi a técnica correta, não
uma segunda escolha.

**Estado: `ready_for_review`.** Working tree limpo, 8 commits de task na branch
`feat/meu-perfil-backend-self-service` (`3499439`..`0765ed6`) sobre o commit de abertura que já
trouxe a transição a `executing`. Este comando não inicia review — a próxima instrução do João aciona
a revisão do trabalho ativo. O bloco 2 (frontend de Meu Perfil) só começa depois disso.

### Review — 2026-08-15: risco ALTO, duas lentes, 5 achados, nenhum 🔴

`/revisar-sprint` sobre `3499439`..`0765ed6`. **Risco ALTO** pelo gatilho binário: `generated.ts`
regenerado (§5.3), senha/sessões (eixo Sanctum) e ownership de documento (RN-09). Revisão Claude
com o gabarito do projeto + revisão independente do Codex (read-only, mesma janela Git); os achados
das duas lentes foram deduplicados e **cada achado do Codex foi verificado no código/vendor antes de
aceito** — nenhum entrou por citação.

**O que está limpo, medido:** zero órfão (todas as rotas registradas, enums e Actions consumidos,
nenhuma dep nova); leis §5 sem violação — `generated.ts` aditivo e regenerado (diff confere com os
DTOs), nenhum `abort(422)`, D1 (zero aresta para Operation, `DomainDependencyTest` intocado), D4
(`/api/me` e `SessionUserData` intocados), D5/RN-09 (REUF recusa 422 nomeando campo), D7 (nenhuma
permissão nova). Lições 5/10/11 respeitadas.

**Achados aguardando aprovação (Q-1 a Q-5):**

1. **Q-1 🟡 P** — `ProfilePasswordController.php:22-24`: escrita de senha direta no controller,
   fora de Action e fora de `DB::transaction` — a rule `backend-ddd.md` exige Action transacional
   para escrita (o `UpdateProfileAction` do mesmo bloco segue); se o purge falhar, senha trocada +
   sessões vivas + 500 (D3 não-atômica). Convergência das duas lentes (Codex apontou a transação;
   o gabarito, a Action).
2. **Q-2 🟡 P** — `ProfileUpdateData.php:36-44`: `prohibited` é `! validateRequired`
   (`ValidatesAttributes.php:2222` — medido no vendor), então campo proibido presente-mas-vazio
   (`email: null`, `roles: []`, `''`) responde **200 silencioso**, furando a D8 na borda. Remédio:
   `missing`. Achado do Codex, confirmado por medição.
3. **Q-3 🟢 P** — `ProfilePasswordTest.php` prova 2: não assere que a linha sobrevivente é
   `$sessionId` (o `assertSame(1, …)` discrimina o cenário de falha já medido, mas não um futuro em
   que o PUT grave sessão nova própria), e o `getJson` final não prova nada — o guard cacheado
   autentica mesmo com a sessão morta, como o próprio comentário do teste registra. Codex apontou;
   aceito parcialmente (a parte "sem prova confiável" é exagero — a asserção de contagem discrimina).
4. **Q-4 🟡 P** — `ProfileUpdateTest.php:33-40`: o teste de auditoria só assere a EXISTÊNCIA da
   linha `updated`; `config/audit.php:104` tem `empty_values => true` (medido), então remover `name`
   de `$auditInclude` manteria o teste verde com trilha vazia — cobertura fantasma (lição 10) em
   superfície de peso legal. Achado do Codex; minha primeira leitura o rejeitou e a medição da
   config me desmentiu.
5. **Q-5 🟢 P** — `ProfilePasswordData.php`: a spec §3 diz *"password_confirmation é chave do
   payload, lida pela regra `confirmed`, não propriedade"*; o código a fez propriedade, com
   justificativa em comentário (tipo TS gerado não mentir para o bloco 2). Comportamento idêntico e
   provavelmente melhor — mas é desvio de spec vinculante não emendada: aceitar e emendar a spec, ou
   reverter.

**Divergência entre revisores, mostrada e não resolvida em silêncio:** só o Q-3 teve downgrade meu
sobre o texto do Codex, pelo motivo registrado acima. Nenhum achado meu ficou fora da lista dele por
discordância — as lentes convergiram.

**Correções — 2026-08-15, os 5 achados aprovados pelo João e aplicados:** Q-1
`ChangeOwnPasswordAction` (update + purge em `DB::transaction`, controller fino); Q-2 `missing` nos
sete campos vetados + três casos vazios no dataprovider, **provados reprovando contra o
`prohibited` antigo** (stash: 3 failed); Q-3 `assertDatabaseHas('sessions', ['id' => $sessionId])`
e GET decorativo removido, **provado por mutação no purge** (assert novo da linha 177 reprovou);
Q-4 assert de conteúdo em `new_values`, **provado por mutação no `$auditInclude`** (1 failed);
Q-5 spec §3 emendada aceitando `password_confirmation` como propriedade. Suíte completa: 647
passed, 5 skipped (pré-existentes). `generated.ts` intocado — só `rules()` mudou, nenhuma
propriedade de DTO. Pint verde nos arquivos tocados. Recheck: Action nova consumida pelo
controller (zero órfão). Revisão limpa — **`ready_for_closure`**.

### Fechamento — 2026-08-15: gate completo, e2e contra a API real desta worktree

**O critério de aceite do bloco foi provado ponta a ponta contra a API real, não pela suíte.** O
stack `fix-frontend-*` inteiro estava de pé servindo esta árvore (o main tree estava parado, e o
nginx desta worktree ocupou o `:8080`); o banco de dev nasceu vazio no stack novo e foi migrado e
seedado no gate. Sessão Sanctum SPA completa por curl — `csrf-cookie`, login, e **o XSRF-TOKEN
rotaciona no login**, então o token vai relido do jar depois dele (a primeira rodada inteira deu 419
por usar o token pré-login). Com o redator demo (`juan.morales@lotus.cl`, senha e `is_active`
mutados temporária e reversivelmente, restauração executada): `GET /api/profile` com o contrato
completo (4 tipos documentais com `status` calculado no backend, REUF `vigente` com `download_url`
assinada, `cursos_habilitados: 2`); `PUT` de nome+telefone **200** persistindo; `email` forjado e
`roles: []` presente-mas-vazio **422 nomeando o campo** (a correção Q-2 provada na API); REUF por
self-service **422 nomeando `type`** (nunca 403, D5/RN-09); CV **201**; foto própria **204** sem
gate administrativo (D7) com `photo_url` presente no GET seguinte; e a prova de sessões com dois
jars — senha trocada **204** no jar A, jar B **401** no request seguinte, jar A **200** (D3 na
superfície real, não só no teste com driver forçado).

**Higiene do gate:** suíte completa **647 passed / 5 skipped (2302 asserções)**; `pnpm lint` e
`pnpm build` exit 0; Pint `passed` nos 22 `.php` do bloco com zero alteração; `typescript:transform`
re-rodado **sem drift** contra o `generated.ts` commitado. Zero código morto criado pelo bloco (o
review já tinha medido zero órfão); nenhuma lei do §5 contrariada.

**Um acidente do próprio fechamento, declarado e revertido antes de qualquer commit:** na primeira
tentativa do Pint a lista de arquivos chegou **vazia** (pathspec `backend/` avaliado com cwd já
dentro de `backend/`) e o Pint rodou **sem argumento**, reformatando 37 arquivos alheios — a
ocorrência exata que o CLAUDE.md §6 proíbe, e ela falha em silêncio quando a expansão do shell
devolve vazio. Revertido por `git stash` (recuperável, não destrutivo), árvore conferida limpa, e a
segunda rodada usou SHA completo da base e lista conferida (`22` antes de executar).

**Pendências:** o gatilho da P-03 **venceu neste bloco** (backend × backend) e já estava registrado
na seleção; fechá-la segue decisão separada do João — o arranjo que este bloco provou (stack compose
completo por worktree, mounts relativos) é exatamente o mecanismo que a ficha pede, então a decisão
tem agora um precedente medido. Nenhuma outra venceu; nenhuma fechou. Nasce **D-15** no backlog
(unificar `DIAS_AVISO`/`EXPIRY_WINDOW_DAYS`, travado no merge do dashboard) — a task que a spec
nomeou para o fechamento, registrada onde não envelhece.

**Arquivamento:** plano em `plans/archive/2026-08-14-meu-perfil-backend-self-service.md`, spec em
`specs/archive/2026-08-14-meu-perfil-backend-self-service-design.md` (não compartilhada: o bloco 2
terá spec própria), ponteiro de spec dentro do plano arquivado atualizado. `progress.md` ganhou a
entrega e devolveu a mais antiga (estilização ADR-16) ao `progress-archive.md` verbatim, mantendo o
teto de dez. Backlog: bloco 1 da Sprint 6 riscado; **o bloco 2 (`meu-perfil-frontend`) NÃO foi
promovido** — seleção é do João.

**Estado: `idle`.** O `dashboard-backend-agregacoes` foi medido no main tree neste gate — **também
já fechou** (`b9b8a30`, "fecha dashboard-backend-agregacoes; estado volta a idle", com a `main`
mergeada na branch em `e60b7b4` à espera do PR). A exceção de dois itens ativos morreu pelas duas
pontas; o D-15 segue travado até essa branch chegar à `main`.

## Quarto item fechado — 2026-08-15 (`dashboard-backend-agregacoes`, Sprint 5 bloco A)

### Seleção — 2026-08-14

**Primeiro bloco da Sprint 5 (`backlog.md:39`), promovido explicitamente pelo João** com o estado em
`idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de sempre: o
argumento era **título de seção** (`## Sprint 5 · Dashboard`), não slug promovido. As duas decisões
dele fecharam o gate: o slug `dashboard-backend-agregacoes` (a ordem escrita do backlog — backend
antes do frontend); e a **rota `context_required`**, exatamente como o backlog exige para a Sprint 5.

**Aqui a fonte externa EXISTE declarada — o oposto dos BDs:** o backlog aponta o escopo canônico no
Drive (`Planejamento/dashboard-escopo-funcional-analitico.md`) e a execução detalhada no Notion
(EAP 8.4.0–8.4.7). Nenhuma rota direta a `ready_for_planning` se aplica; o Context Packet do Codex
(`lotus-context-packet`, read-only) vem antes de qualquer brainstorming.

**`state_basis_commit` passa de `2511501` a `1e40acb`** — o merge do PR #51, HEAD atual da `main`.
Não era divergência: com `active_work_item` `null` não havia trabalho ativo cujo baseline pudesse
ter derivado.

**Árvore ainda não decidida:** bloco de backend assume main tree pela P-03; branch nasce no
planejamento/execução, não nesta promoção. O packet é gerado sobre `main@1e40acb`.

### Context Packet — 2026-08-14

Gerado pelo Codex (`lotus-context-packet`, sandbox read-only, sobre `a3833e0`) e validado contra o
contrato da skill: markers exatos, frontmatter completo (`plan`/`spec` `null` registrados, não
inventados), **8 key facts**, fontes por ID, `status: ready`,
`RECOMMENDED_TRANSITION: ready_for_planning`. Salvo em
`docs/superpowers/context-packets/2026-08-14-dashboard-backend-agregacoes.md`.

**As duas fontes canônicas foram recuperadas, não presumidas:** o Drive
(`dashboard-escopo-funcional-analitico.md`, ID `1HlT8kUsnoGsRJpYmryHacZ8zBZnDQgRa`) e as oito tasks
EAP 8.4.0–8.4.7 na base canônica do Notion, endereçadas por ID de página — a lição das 12 falsas
divergências de 2026-07-30 aplicada.

**Uma divergência externa foi achada e reconciliada com base declarada, não em silêncio:** as
descrições e critérios de aceite das EAP **8.4.0 e 8.4.7 estão trocados entre si** no Notion (títulos
apontam backend/frontend correto; corpos invertidos). Resolução: o Drive decide o escopo — domínio e
dependências ficam neste bloco, UI review fica no bloco frontend. A correção da troca no Notion é
staleness trigger do packet.

**O que o packet fixa para o desenho:** domínio `App\Domains\Dashboard` read-only **sem** Model,
migration ou tabela; `GET /api/dashboard/metricas`; ownership e filtros aplicados **antes** da
agregação no backend (nada de payload administrativo ocultado no React); sequência backend
EAP 8.4.0→8.4.1→8.4.2→8.4.3→8.4.6; Notifications fora. Open questions não bloqueantes (semântica dos
KPIs, filtros MVP, ranking do Redator) vão para o brainstorming.

**Estado: `ready_for_planning`.** Próxima ação: `/planejar-bloco` prossegue para `planning`
(brainstorming → spec → plano).

### Brainstorming e spec — 2026-08-14

Spec em `docs/superpowers/specs/archive/2026-08-14-dashboard-backend-agregacoes-design.md`, com **nove
decisões**: D1–D6 escolhidas pelo João entre alternativas com o custo declarado (recorte analítico
sem tempos de ciclo; sem ranking de redatores nem séries próprias do Redator; filtro só de período;
janelas 7d/30d; **dois DTOs raiz num endpoint só** — vazamento de payload vira erro de tipo, não bug
de runtime; certificado revogado não devolve a matrícula a "a emitir"), D7–D9 derivadas e declaradas
(sem permissão `dashboard.*` nova — view por `type`, seções por permissão existente com `null`
tipado; regra de domínio reusada de `TurmaHabilitacaoService`/`BudgetSummaryService`, nunca
duplicada; agregação por query, sem cache).

**Três medições entraram na spec, não em memória:** o catálogo RBAC real (33 permissões, redator só
com `operation.turma.view`/`submit_docs`/feedback) sustenta a D7; `certificates` **não tem coluna de
data de emissão** — `created_at` é a data do ato, não proxy, e foi isso que expôs a ambiguidade do
revogado que virou a D6; e o funil do Drive §3.4 tem sete rótulos com dois sobrepostos ("concluída"
× "a emitir") — a spec fixa **seis baldes exclusivos** com o split por estado de emissão declarado.

**Risco de review declarado ALTO** pelo gate binário (regenera `generated.ts`; eixo central é
RBAC/ownership) — duas lentes no `/revisar-sprint`. O `der-fisico.md` listando `certificates` como
"planejada" é divergência preexistente, registrada na §10 da spec para o fechamento.

O estado entra em `planning` no commit da spec; `active_plan` segue `null` até o João ler a spec
escrita e autorizar o `writing-plans`.

### Plano — 2026-08-14

**O João aprovou a spec e cravou execução MESCLADA claude/codex** ("delegue tarefas de backend ao
codex, mesclando entre você e ele"). O plano saiu em
`docs/superpowers/plans/archive/2026-08-14-dashboard-backend-agregacoes.md`: **oito tasks**, uma por commit,
na ordem contrato → queries por área (Operation, Commercial, Certification/Analytics) → ownership do
Redator → assemblers/endpoint/gates → feature tests do endpoint → gate final e2e.

**O handoff estende o contrato do comando por instrução explícita dele:** `executor: misto`, task a
task — **codex nas Tasks 2, 3 e 4** (queries mecânicas com contrato fechado na Task 1, verificação
executável e `paths_autorizados` de globs exatos, incluindo o `DomainDependencyTest` restrito à
chave `'Dashboard'`); **claude nas Tasks 1, 5, 6, 7 e 8** (contrato/`generated.ts` §5.3, ownership
do Redator, gates RBAC por seção, classificação do pipeline, gate final). Task de codex só fecha
depois de revisão do claude; violação de path reprova a task.

**Três coisas apareceram só ao escrever o plano:**

1. **D-P1** — agrupar série por mês em SQL diverge entre engines (a suíte roda sqlite, sem
   `DATE_FORMAT`): o bucketing `YYYY-MM` vai para PHP sobre projeção mínima, exceção declarada à
   D9; contagens e somas de KPI seguem 100% em SQL.
2. **`Enrollment` não tem relação com `Certificate`** — o vínculo é unidirecional
   (`certificates.enrollment_id`). O "sem certificado" da D6 sai por `whereNotIn` sobre subselect,
   sem criar relação nova em model de outro domínio.
3. **O self-review achou dois órfãos de spec antes de commitar:** ninguém produzia
   `RedatorLoadData` (seção `redatores` da D2 — nasceu o `RedatorLoadQuery` na Task 6) e o alerta
   `TurmaOverdue` não tinha dono declarado (composição no `AdminDashboardAssembler`, registrada no
   plano).

**Baseline declarado:** backend `591 passed, 5 skipped`; frontend 35 arquivos / 176 testes.
Projeção: +~24 testes backend, frontend inalterado (nenhum consumidor novo do `generated.ts`).

**Estado: `ready_for_execution`.** `/executar-bloco dashboard-backend-agregacoes` exige instrução
posterior do João. Branch `feat/dashboard-backend-agregacoes` nasce no `/executar-bloco` (main
tree, P-03).

### Execução — 2026-08-14: início

`/executar-bloco dashboard-backend-agregacoes` validou as âncoras (spec, packet, plano, Git limpo em
`2de9d64`, sem divergência) e aplicou o gate main tree/worktree: **bloco toca backend, então main
tree pela P-03** — nenhuma worktree criada. Branch `feat/dashboard-backend-agregacoes` criada de
`main@2de9d64`.

**As duas decisões do João no início:** `subagent-driven-development` com Agent tool autorizado para
este bloco (mesmo impasse do BD-4, do login, do `rastro-unicidade-e-gates` e do `falha-vs-lista-vazia`,
resolvido do mesmo jeito, por pergunta direta); e **o `executor: misto` do plano mantido** — Tasks 2,
3 e 4 no Codex via `lotus-execute-block`, Tasks 1, 5, 6, 7 e 8 no claude.

Baseline reproduzido nesta branch, não herdado: `docker compose exec -T app php artisan test` →
**591 passed, 5 skipped (2149 assertions)**, exit 0 — bate com o baseline do plano. Ledger local
reiniciado em `.superpowers/sdd/progress.md` (o anterior era do `falha-vs-lista-vazia`, já fechado).

**O pre-flight scan achou uma contradição real entre spec e plano, e ela mudou o contrato antes da
primeira linha de código.** A spec §4.2 afirma duas coisas incompatíveis: `AgendaTurmaData` é DTO
compartilhado entre as duas views, **e** o payload do Redator não contém cliente "por construção do
tipo, não por omissão em runtime" (D5, Drive §7.4). O plano deu `?string $client_name` ao
`AgendaTurmaData`, e `RedatorDashboardData` carrega quatro coleções dele — ou seja, o campo proibido
chegava ao Redator pelo tipo. **O João escolheu o split:** nascem `RedatorAgendaTurmaData` (sem
`client_name`) e `RedatorAgendaData`, a Task 1 passa de 19 para **21 DTOs**, e a agenda do admin
mantém o nome do cliente. Vazamento volta a ser erro de tipo, que é a tese da D5.

Dois outros achados do scan **não** foram escalados, e o motivo está no ledger: a lista de arestas
pré-escrita da Task 2 é indicativa (o próprio passo manda conferir contra os `use` do arquivo final),
e o parêntese da turma (c) na Task 2 é ambiguidade de redação que a asserção da linha seguinte
resolve.

**Estado:** `executing`.

### Execução — 2026-08-14: fechamento

As oito tasks do plano completaram em **sete commits** (`8c53f60`..`cdccb12`; a Task 8 é gate, não
entrega). O `executor: misto` foi cumprido como escrito: **Tasks 2, 3 e 4 no Codex** via
`lotus-execute-block` (`sandbox: workspace-write`, sem acesso ao socket do Docker — decisão explícita
do João: "Codex escreve, eu rodo"), cada uma com o diff real lido contra o plano antes de aceita, a
verificação rodada por mim e os `paths_autorizados` conferidos; **Tasks 1, 5, 6, 7 e 8 no claude**.

**A Task 8 provou o DoD contra a API real com três atores**, não contra a suíte. Admin com todo KPI
conferido por SQL independente (turmas 4/1/2; `certificados_a_emitir=9` respeitando a D6, com um
certificado revogado que **não** volta a "a emitir"; cotação 1 / `250.0000 UF`), e a coerência interna
fechando sozinha — `conclusoes_por_confirmar` = as turmas `habilitada` do `compliance_turmas`, e os
`alertas` = os `overdue` da agenda, que é a D8 viva. Papel **sem permissão comercial** criado pela API
real (`POST /api/roles` + `POST /api/users`): `cotacoes`, `uf_aprovada` das séries e as 8 UF de ranking
saem `null`, o pipeline perde as duas etapas de cotação, e a rede de string no corpo bruto mostra que
`uf`/`cotac` só aparecem como **nome de chave seguido de `null`** — zero valor comercial atravessa.
Redator ativado de forma temporária e reversível: 6 chaves, nenhuma de admin, e o escopo conferido por
SQL (só as turmas dela). **Restauração conferida byte a byte** (hash comparado com o capturado antes)
e as 6 tabelas de RBAC/auditoria de volta aos números exatos do snapshot inicial.

**Mutação zero foi medida, não afirmada:** contagem de 14 tabelas — incluindo `audits` e `login_logs`
— antes e depois de uma rodada dos quatro GETs (sem filtro, filtro válido, intervalo invertido, data
lixo). `diff` idêntico. Os dois caminhos de erro devolvem 422 `application/problem+json` pelo handler
global; sem sessão, 401 no mesmo formato.

**Placar final:** backend **617 passed, 5 skipped (2334 assertions)** — a projeção do plano era
591 + ~24, e vieram **+26**. `pnpm lint` limpo, `pnpm test` **35 arquivos / 176 testes**, `pnpm build`
verde, Pint `passed` nos `.php` do bloco, `typescript:transform` **sem diff novo** (`generated.ts` foi
escrito na Task 1 e a árvore segue limpa depois de reexecutar o comando — lei §5.3 cumprida pela
regeneração, não pela mão). `git status --porcelain` vazio; nenhum artefato de prova ficou no
repositório ou no banco.

**Quatro coisas ficam declaradas para o review, e nenhuma é regressão deste bloco:** (1) **nenhum
redator autentica em produção** — `CreateRedatorAction` cria com `is_active=false` "até o fluxo de
ativação", que não existe, então o dashboard do redator está correto e provado mas hoje inalcançável;
(2) uma turma concluída com **zero matrículas** cai em `fully_issued` no funil, defensável mas lê como
"tudo emitido" onde não havia o que emitir; (3) `DomainDependencyTest` detecta aresta **usada e não
declarada**, mas a direção contrária passa em silêncio — o cenário (9) cobre isso só para Dashboard, e
generalizar é candidato a follow-up; (4) **quatro premissas do plano venceram durante a execução** e
estão registradas uma a uma no ledger, sendo a última o `preventLazyLoading` dito "já global" que é
por teste.

**Estado:** `ready_for_review`. Próxima ação: revisão do trabalho ativo, por instrução explícita do
João — **não iniciada automaticamente aqui**.

### Review de sprint — 2026-08-14: ALTO risco, duas lentes, 9 achados (2🔴 + 3🟡 + 4🟢)

**ALTO pelo gate binário**, como a spec §9 já declarava: o bloco regenera `generated.ts` e o eixo
central é RBAC/ownership. Duas lentes, sem divergência a mostrar — o Codex (read-only, sobre
`main...HEAD`, com CLAUDE.md §5, spec, plano e as duas rules como gabarito) devolveu 8 achados e
**quatro coincidem** com a lente Claude, sem que o prompt dele citasse achado nenhum.

**Gate reproduzido, não herdado:** suíte backend **617 passed, 5 skipped (2334 assertions)**, exit 0;
Pint `passed` nos `.php` do bloco; `typescript:transform` reexecutado **sem diff** (lei §5.3 cumprida
pela regeneração); `route:list --path=dashboard` com **uma** rota. **Órfãos: zero** — cada uma das 34
classes do domínio tem ao menos um consumidor fora de si.

**Três achados foram medidos por sonda temporária, não deduzidos** (arquivos removidos, árvore
limpa):

1. **Q-1** — papel com todas as permissões **menos** `identity.*`: `redatores` sai `null`, e ainda
   assim `alertas` traz `{"type":"redator_document_expired", ..., "navigation":{"redator_id":1}}`.
2. **Q-4** — `rankings.courses` com uma linha; `$course->delete()`; `rankings.courses` vira `[]`
   enquanto `series.turmas_iniciadas` segue `[{"month":"2026-08","count":1}]`.
3. **Q-2** (o único achado só do Codex, verificado antes de aceito, como a skill exige) —
   `?period_end=2020-01-01` devolve **HTTP 200** com `period_start=2025-08-14`,
   `period_end=2020-01-01`; `?period_start=2030-01-01` devolve 200 com o par invertido no outro
   sentido. A spec §4.1 promete 422, e o cenário 6 só cobre os dois limites presentes.

**Um achado do Codex NÃO foi aceito:** o `RedatorLoadQuery` contar carga em PHP não é violação da D9
— o docblock dele declara o motivo (uma query para toda a equipe em vez de subquery por linha), a
projeção é mínima (`id`, `start_date`, pivô) e a alternativa é o N+1 que o `preventLazyLoading`
existe para barrar.

### Correções — 2026-08-14: os 9 achados aprovados pelo João, todos aplicados

**João aprovou Q-1 a Q-9 em bloco.** Nenhum achado foi diferido para o `backlog.md`.

| # | O que entrou |
|---|---|
| Q-1 | `IdentityMetricsQuery` novo: alerta de documento de relator sai do `CertificationMetricsQuery` e passa a responder a `identity.user.view` no assembler |
| Q-2 | `DashboardFilterData::withValidator()` compara a janela **resolvida**; `after_or_equal` saiu das `rules()`, e a recusa tem texto único (`PERIODO_INVERTIDO`) |
| Q-3 | os quatro KPIs de turma viraram `?int` em `AdminKpisData`; `generated.ts` regenerado (4 campos `number \| null`) |
| Q-4 | `withTrashed()` na resolução de nome de curso/cliente **e** nos três agregados de cliente — a query nasce em `clients`, o escopo apagava a linha antes de haver nome |
| Q-5 | `Certificate::scopeEmitidos()`: uma definição de "emitido" para série, ranking e histórico do redator |
| Q-6 | `PipelineQuery` deixou de injetar os três serviços e recebe as contagens prontas do assembler — o funil só particiona |
| Q-7 | `fileable_type` sai de `(new Redator)->getMorphClass()` (ADR-10); zero literal `'redator'` em `app/` |
| Q-8 | `RedatorDocumentType::values()` como lista canônica, usada pelos três sítios; a carga do redator parou de contar arquivo não regulatório |
| Q-9 | UF do ranking e série de UF só são lidas sob gate comercial; a razão do `bcadd` (DECIMAL exato no MySQL × float no sqlite) ficou declarada nos dois sítios |

**Cada guarda foi vista reprovar contra o código antigo** (reversão pontual, medida, revertida):
Q-1 3 asserções, Q-2 1, Q-3 2, Q-4 1, Q-5 2, Q-8 1, Q-9 2; Q-6 mediu **20 queries contra `turmas`**
antes e **13** depois, no mesmo cenário. **Q-7 não tem guarda que morda** — o morph map já mapeava
`Redator` para `'redator'`, então a troca é de convenção, sem delta de comportamento; o
`IdentityMetricsQueryTest` prova o comportamento correto, não o regresso.

**Gate após as correções:** suíte **628 passed, 5 skipped (2384 assertions)**, exit 0 (+11 casos);
Pint `passed`; `typescript:transform` regenerado com o diff esperado (4 campos de `AdminKpisData`);
`pnpm build` verde — nenhum consumidor TS do `generated.ts` tocava esses campos.

**Spec corrigida no mesmo passo** (§4.1 janela resolvida; §4.2 gate de `kpis` e de `alertas`) — o
texto descrevia o comportamento antigo.

**Padrão reincidente proposto:** Q-2 é a terceira aparição de "entrada inválida vira lista vazia".
Vale texto na rule da camada, não só o fix — proposta abaixo, para o João decidir.

### Fechamento — 2026-08-15

`/fechar-sprint` sem argumento, com o gate de estado conferido antes de qualquer medição
(`ready_for_closure`, `active_work_item: dashboard-backend-agregacoes`).

**A primeira coisa medida foi uma divergência Git, e ela não era conflito:** o HEAD (`18f0856`)
dizia `ready_for_review` e a árvore de trabalho dizia `ready_for_closure`, com as **nove correções
do review não commitadas** (22 arquivos, 2 novos). O estado estava à frente do Git de forma
coerente com o código presente — a fase de correção terminou sem fronteira durável. Resolvido sem
heurística: o gate rodou contra a árvore, as correções viraram o commit `59b4f4d` e o fechamento
veio depois.

**O item 0 foi REMEDIDO, não herdado — e essa era a única forma honesta:** as nove correções
entraram depois do e2e da Task 8 e mexeram em gate por seção, contrato de filtro e escopo de
certificado, então a evidência de `cdccb12` não vale para HEAD. **Quatro atores**, sessão Sanctum
cookie+CSRF:

- **Admin:** todo KPI conferido por SQL independente — `em_andamento` 4, `encerrando` 0,
  `atrasadas` 3, `conclusoes_por_confirmar` 1, cotação 1 / `250.0000` UF, `certificados_a_emitir` 9.
  O 4/1/2 do gate de execução virou 4/0/3 porque a data do container passou de 14 para **15/08** e
  uma turma cruzou o limite dos 7 dias — deriva de calendário, conferida em SQL, não regressão. A
  coerência interna fecha sozinha: `conclusoes_por_confirmar` = as turmas `turma_ready_for_conclusion`
  do funil, e os `alertas` = os `overdue` da agenda (D8 viva). **Q-5 provado ao vivo:** existem 5
  certificados, 1 revogado, e ranking e série contam **4**.
- **Três papéis-sonda criados pela API real** (`POST /api/roles` + `POST /api/users`), cada um cego
  a um módulo. Sem comercial: `cotacoes` `null`, `series.uf_aprovada` `null`, **as quatro linhas de
  ranking com `uf_aprovada: null`**, o funil perdendo as duas etapas de cotação, e a rede de string
  no corpo bruto devolvendo `uf` **só** como nome de chave `"uf_aprovada"` seguido de null (Q-9).
  Sem `identity.user.view`: `redatores` `null` (Q-1). Sem `operation.turma.view`: os **quatro KPIs
  de turma saem `null`, não 0** (Q-3).
- **Redator** ativado de forma temporária e reversível (o `UserProvisioner` dá senha aleatória, então
  senha e `is_active` foram mutados no banco de dev): payload com **6 chaves**, nenhuma de admin;
  `resumo` 2 em andamento + 1 próxima e `historico` 1 concluída, batendo com as 4 turmas dele em SQL;
  turma_ids `[1,4,6]` ⊆ `{1,4,5,6}`, **nenhuma turma alheia**; e **zero ocorrência** das strings
  `uf`, `cotac`, `client`, `quote`, `budget`, `series` e `ranking` no corpo.

**Q-2 provado nos dois sentidos**, que é onde ele nascia 200: só `period_end=2020-01-01` e só
`period_start=2030-01-01` devolvem **422 `application/problem+json`** com
`La fecha de término no puede ser anterior a la de inicio.`; data lixo, 422; janela válida, 200; sem
sessão, **401** no mesmo envelope.

**Mutação zero foi medida, não afirmada:** contagem de **17 tabelas** — `audits` e `login_logs`
inclusive — antes e depois de **8 GETs** (quatro formas de query × dois atores). `diff` vazio.

**Restauração conferida:** o redator voltou byte a byte (`is_active`, hash e `updated_at`, com o MD5
do conjunto de usuários idêntico ao capturado antes) e as sondas saíram, devolvendo `users`,
`roles`, `role_has_permissions` e `model_has_roles` a **79/3/70/5**, os números exatos do snapshot.

**Ferramentas:** backend **628 passed, 5 skipped (2384 assertions)**, exit 0; `pnpm lint` exit 0 e
`pnpm build` verde; Pint `passed` nos 18 `.php` do bloco; `typescript:transform` reexecutado **sem
diff novo** — a regeneração é idempotente e o diff da árvore é exatamente os 4 campos de
`AdminKpisData` que o Q-3 anulou (lei §5.3 cumprida pela regeneração). **Zero órfão** nas 34 classes
do domínio; zero `Repository`, zero `abort(4xx)`, zero Model/migration no Dashboard; o único uso de
morph é `(new Redator)->getMorphClass()` (Q-7/ADR-10). Leis §5 limpas.

**O fechamento achou uma divergência spec × código e a corrigiu antes de arquivar.** Medido ao vivo:
um papel com `identity.user.view` e comercial mas **sem** `operation.turma.view` recebe `redatores`,
`rankings` **e** `pipeline` nulos. A tabela §4.2 da spec declarava só `identity.user.view` para
`redatores` e nenhum gate para os outros dois. O código está certo e a regra vive escrita no docblock
do `AdminDashboardAssembler` — "uma seção exige TODOS os gates dos módulos de que ela lê", com
degradação parcial só onde o TIPO admite ausência. A §4.2 foi **completada**, não retro-editada: a
fase de correção deste mesmo bloco já a emendara para `kpis` e `alertas` e parou no meio, e o
precedente P-27 protege história de bloco **fechado** — este fechava agora, e a tabela é o contrato
que o bloco B vai ler.

**O que o gate NÃO provou, sem maquiagem:** a **D6** não é distinguível no banco de dev — a matrícula
22 tem certificado revogado **e** emitido, então as duas definições de "a emitir" dão 9 igual; e o
**Q-4**, o **Q-7** e o **Q-8** não têm caminho vivo lá (zero curso arquivado, nenhum cliente
arquivado com cotação, um só tipo de documento de relator com zero vencido). Os quatro valem pelos
testes, cada um com a guarda vista reprovar contra o código antigo, e o Q-7 declaradamente **sem**
guarda que morda (troca de convenção, sem delta). **Nenhuma tela foi vista** — é o bloco B.

**Pendências:** nascem a **P-43** (`der-fisico.md` chama `certificates` de "planejada" em quatro
sítios e a tabela existe desde a Sprint 4 — a §10 da spec já previa esta ficha) e a **P-44** (onze
usuários de sonda de gates antigos vivem no banco de dev, e **dois aparecem na carga do dashboard**
como "E2E Gate Redator 1/2"; as sondas deste bloco foram removidas, as alheias se mencionam e não
se apagam). A **P-26** cumpriu a sprint de rastro e saiu de `encerradas.md`. Nenhum outro gatilho
venceu.

**Arquivamento, histórico e backlog:** plano e spec foram para `plans/archive/` e `specs/archive/`
por `git mv`, com as referências repontadas neste arquivo; a linha do bloco entrou em
`progress.md` e a mais antiga das dez (`2026-08-11 · Hardening · integridade e concorrência no
backend`) desceu **verbatim** para `progress-archive.md`. O bloco A saiu da Sprint 5 do
`backlog.md` — o bloco B permanece, e **nada foi promovido no lugar**. As três não-regressões
declaradas no review ganharam dono: **D-16** (turma concluída sem matrícula em `fully_issued`) e
**D-17** (`DomainDependencyTest` unidirecional) como débitos agrupados no BD-15, e a **ativação de
acesso do redator** como item 4 de "Próximos blocos" — é a que bloqueia uso real, porque a view do
redator está provada e hoje inalcançável.

**Estado: `idle`.** `state_basis_commit` passa a `59b4f4d`, o commit que prova a entrega fechada; a
próxima ação é escolha explícita do João no `backlog.md`.

### Integração — 2026-08-15: merge da `main` (fechamento da `celula-de-identidade`)

**A `main` andou 30 commits desde o `1e40acb` de onde este bloco partiu** — o PR #52 fechou a
`celula-de-identidade` em 2026-08-14, e aquele fechamento havia **desfeito a promoção deste bloco**,
com a repromoção declarada como instrução explícita do João. A repromoção aconteceu: o bloco foi
executado e fechado nesta branch em 2026-08-15, então o disclaimer "Promoção desfeita no fechamento"
que veio da `main` saiu neste merge — o item foi entregue e a narrativa dele vive acima, como último
item fechado. A `celula-de-identidade` entra como penúltimo, com a narrativa íntegra; a cadeia
rotaciona (BD-6 → antepenúltimo, login → quarto, BD-5 → quinto).

**Cinco conflitos, todos de documento ou de artefato gerado** (`state.md`, `progress.md`,
`pendencias/README.md`, `pendencias/encerradas.md`, `typescript-transformer-manifest.json`); zero
conflito de código — `Certificate.php`, `generated.ts` e os locales auto-mergearam.

**P-41 e P-42 deste bloco colidiram de ID e foram renumeradas para P-43 e P-44**, pelo precedente que
o repositório já fixou três vezes (P-32, P-33 e as próprias P-41/P-42 da célula): o fechamento da
`celula-de-identidade` chegou à `main` primeiro usando esses IDs, e quem renumera é a recém-chegada.
Fichas, índice, este arquivo e o `progress.md` acompanham.

**A saída da P-26 fica creditada ao fechamento da `celula-de-identidade` (2026-08-14)** — os dois
fechamentos a removeram em paralelo e a decisão publicada prevalece. O `progress-archive.md` havia
recebido a MESMA linha (BD-2, 2026-08-11) uma vez por cada fechamento; a duplicata saiu, e o
`progress.md` volta ao teto de dez descendo a Estilização (2026-08-12) verbatim.

**O manifest do `generated.ts` não se resolve à mão (lei §5.3):** `typescript:transform` reexecutado
depois do merge — `generated.ts` saiu **idêntico ao auto-merge** (regeneração idempotente) e o
manifest passou a apontar o hash real do arquivo unido.

**Gates remedidos pós-merge, não herdados:** backend **632 passed / 5 skipped (2397 asserções)** —
a soma exata dos dois lados (628 deste bloco + 4 testes que a célula trouxe); Pint `passed` no
`Certificate.php` auto-mergeado; `pnpm lint` exit 0; `pnpm build` verde; `pnpm test` **36 arquivos /
186 testes**, a contagem da `main` pós-célula — este bloco não adiciona teste de frontend.

## Quinto item fechado — 2026-08-14 (`celula-de-identidade`, item 4 de "Próximos blocos")

### Exceção declarada à invariante de um `active_work_item` — terceira ocorrência

**Existem dois itens ativos ao mesmo tempo, por decisão explícita do João em 2026-08-14**, e isto
está escrito porque a invariante do topo deste arquivo diz o contrário. O `falha-vs-lista-vazia`
(BD-6) está em `workflow_state: executing` no main tree `/home/jvbat/projetos/lotus`, branch
`feat/falha-vs-lista-vazia` (`d20bebc`), com **cinco tasks de conteúdo já commitadas**. Este bloco
nasce na worktree `fix-frontend`, branch `feat/celula-de-identidade` criada de `0a1439f`.

**A diferença para as duas ocorrências anteriores (BD-4 × BD-9 e BD-5 × login) é que aqui não há
divergência de base:** a branch do BD-6 declara `state_basis_commit: 0a1439f` e **descende** do HEAD
da `main` a partir do qual este bloco nasce. Não são dois `state.md` incompatíveis promovidos do
mesmo ponto em paralelo — é um bloco ativo ainda não mergeado mais um bloco novo atrás dele. O
`state.md` da `main` dizia `idle` porque o BD-6 vive na branch dele, não porque nada esteja ativo.

**A sobreposição foi medida antes da decisão, não depois — três pontos, e o João a aceitou de
antemão** em vez de descobri-la no merge:

1. `frontend/src/features/commercial/hooks/useCommercialClients.ts` — o BD-6 **já o reescreveu**
   (`f64ba33`…`d20bebc`), e o **Grupo B** deste bloco exige expor o `ClientData` inteiro nesse mesmo
   hook, que hoje estreita para o nome (`backlog.md`, Grupo B, `BudgetsTable.tsx:88`). Colisão de
   conteúdo, não só de texto.
2. `frontend/src/shared/ui/index.ts` — o BD-6 acrescenta `InlineLoadState` ao barrel; este bloco
   acrescenta a célula nova. Mesma região do arquivo.
3. `shared/config/locales/{es-CL,pt-BR,en}.json` — o BD-6 escreve nos três; este bloco escreve **se**
   a decisão 1 criar rótulo de ausência ("sin correo"). Condicional, não certo.

**O que NÃO colide, também medido:** nenhum dos 13 sítios de renderização do item 4 aparece no diff
`main...feat/falha-vs-lista-vazia`. Os arquivos do BD-6 em `commercial` são `BudgetDialog`,
`CourseStep`, `QuoteWizard` e `QuotesList` — `BudgetsTable.tsx`, que é o sítio do Grupo B, está
fora deles.

**Alternativas recusadas por ele:** esperar o BD-6 fechar e mergear (manteria a invariante e
permitiria planejar o Grupo B sobre a forma nova do hook, ao custo de o bloco não começar hoje); e
promover em paralelo **cortando o Grupo B**, que teria eliminado a colisão de hook na origem.

### Seleção — 2026-08-14

**Item 4 de "Próximos blocos" (`backlog.md:33`), promovido explicitamente pelo João.** O gate do
`/planejar-bloco` reprovou pelo motivo de sempre (BD-1, BD-2, BD-7, BD-8, BD-9, BD-5, login): o
estado era `idle` e o argumento era **título de seção**, não slug promovido. As quatro decisões dele
fecharam o gate: o slug `celula-de-identidade`; a rota **`context_required`** com Context Packet
gerado pelo Codex; o **paralelismo** com o BD-6; e a **worktree `fix-frontend`** como área de
trabalho.

**A rota do packet é decisão dele contra a medição, e isso fica escrito.** A ausência de fonte
externa foi **medida**: grep por `drive.google`, `notion.so`, `figma.com`, `docs.google` e `http` nas
105 linhas do item 4 devolve **zero ocorrência**, e a superfície dos 13 sítios, os três grupos, as
cinco decisões abertas e a ordem sugerida estão **transcritos** no `backlog.md`. Pela medição, o
precedente seria rota direta a `ready_for_planning` (BD-8, BD-9, BD-5, login). O João escolheu o
packet mesmo assim — as duas capturas de tela que abriram o pedido são a única entrada que não vive
no repositório, e o packet é o mecanismo que registra o que existe e o que está indisponível em vez
de deixar a lacuna implícita.

**A direção decidida entra neste commit.** As **105 linhas** do item 4 estavam **não commitadas** no
working tree desta worktree quando o comando abriu — decisão durável vivendo onde um `git checkout`
a apagaria. É a repetição exata do que aconteceu no `login-fora-do-adr16` (§"Seleção — 2026-08-13"),
e entram aqui como artefato do mesmo commit da promoção.

**`state_basis_commit` passa de `024673a` a `0a1439f`** — o HEAD da `main` de onde esta branch nasce.
Não era divergência: com `active_work_item` `null` não havia trabalho ativo cujo baseline pudesse ter
derivado.

**Frontend puro por escopo declarado: a P-03 não dispara.** O bloco é apresentacional, e o único
caminho que tocaria backend é a alternativa (b) da decisão 1 (alargar DTO, `generated.ts`, lei §5.3)
— que é justamente uma das cinco decisões que o planejamento tem de fechar, não um dado do bloco.

### Context Packet — 2026-08-14: `partial`, e a rota se pagou

Packet em `docs/superpowers/context-packets/celula-de-identidade.md`, gerado pelo Codex read-only
com a skill `lotus-context-packet`. **Contrato validado item a item, não aceito de chegada:**
marcadores exatos, frontmatter completo com `plan_path`/`spec_path` corretamente em `null`,
**8 key facts** (o teto exato da skill), `RECOMMENDED_TRANSITION: ready_for_planning`, e nenhum
staleness trigger apontando para hash de proveniência ou para a própria transição promotora — que é
a armadilha que a skill documenta.

**Os quatro hashes de proveniência foram remedidos aqui e batem:** `base_commit`
`fb443ee41af6…`, `state_blob_sha` `f4ac80fc…`, `progress_blob_sha` `35d631aa…` e o HEAD do BD-6
`d20bebc78aa9…`. Foram obtidos, não adivinhados.

**A rota que o João escolheu contra a medição se pagou, e o retorno é o oposto do esperado.** O
packet consultou as três fontes canônicas do Drive por **file ID** (`tela-pessoas.md`,
`tela-turmas.md`, `tela-servicos.md`) e a base canônica do Notion por **collection ID** — e o achado
é que **nenhuma delas prescreve célula de identidade, uso de foto, fallback sem imagem, fusão de
coluna ou tratamento de N redatores**. As cinco decisões abertas do item 4 continuam abertas, agora
com **prova de ausência** em vez de suposição de ausência: o brainstorming as fecha com o João
sabendo que não há respaldo externo a contrariar. Um único sinal de aceite externo apareceu, e é
restritivo: a task `388bc960-3dfa-8188-b051-e0f4feb08943` exige que a lista de designação **continue
filtrada por habilitação** — decide só isso, e não a aparência do card ou do picker.

**As duas capturas viraram lacuna declarada, não fonte `unavailable`**, e a distinção é a que a
skill exige: elas não têm arquivo, ID nem path, e não existe locator de Figma nos artefatos
canônicos. Consequência escrita no packet: **não há aceite por equivalência visual** neste bloco.
Isso não bloqueia o planejamento — vira `## Deferred`.

**Uma afirmação do packet foi medida e reprovou, e a correção está no próprio arquivo.** Ele
afirmava em `## Constraints` que o main tree tinha WIP não commitado em `CourseStep.tsx`; medido,
`git -C /home/jvbat/projetos/lotus status --short` devolve **vazio** com HEAD em `d20bebc`. A
cláusula saiu e a correção ficou registrada no cabeçalho do packet, com o resto verbatim — packet
revisado é packet cujo revisor mediu, não cujo revisor confiou.

**`status: partial` prossegue** pela regra da própria skill: fonte não canônica indisponível não
bloqueia, e o fato faltante que bloquearia — uma regra de negócio ou critério de aceite — não
existe, porque as cinco decisões são de apresentação e pertencem ao João.

### Spec — 2026-08-14: o bloco deixou de ser frontend puro

Spec em `docs/superpowers/specs/archive/2026-08-14-celula-de-identidade-design.md`, aprovada pelo João
depois de onze decisões fechadas uma a uma (D1–D11, tabela §10 da spec). `active_spec` já entra
preenchido: a spec existe no disco, e deixá-la `null` criaria exatamente a divergência que a
invariante deste arquivo proíbe.

**A decisão D2/D3 invalida a frase "frontend puro" escrita acima em "Seleção — 2026-08-14".** O
Grupo C resolve-se **alargando dois DTOs no backend** (`TurmaData` ganha `client_rut` e
`client_photo_url`; `TurmaRedatorData` ganha `email` e `photo_url`), o que regenera `generated.ts`
pela lei §5.3 / ADR-04. A frase antiga previa esse caminho como alternativa (b) da decisão 1 — foi
ele que o João escolheu. Duas consequências entram aqui porque mudam o gate, não a implementação:

1. **Risco de review sobe a ALTO**, pelo gatilho binário do projeto (`generated.ts` regenerado,
   precedente BD-9).
2. **A P-03 continua não disparando, e isto foi remedido, não herdado.** O gatilho dela exige
   *mais de um* `active_work_item` de **backend**; o diff `main...feat/falha-vs-lista-vazia` do BD-6
   tem **zero** arquivo em `backend/`. Este é o único bloco de backend ativo.
3. **A escolha da worktree sobrevive, sob uma condição escrita.** O João escolheu `fix-frontend` no
   gate quando o bloco era declaradamente frontend. Medido: `docker compose ps` vazio e os mounts do
   compose são relativos (`./backend`, `./frontend`), então `docker compose up -d` **desta** worktree
   serve o backend **desta** branch em `:8080`. A condição é **um stack por vez**: se um stack subir
   do main tree, o `:8080` passa a servir a outra branch e os testes deste bloco mentem. O BD-6 é
   frontend e consome o mesmo backend sem dano, porque o alargamento é aditivo.

**Custo do alargamento, medido e não estimado:** `TurmaQueryBuilder::LISTING` já traz
`redatores.user` e `quote.budget.client.user`. Zero query nova, zero eager load novo, zero migration.
Eu havia precificado esta rota como cara (risco de N+1, assinaturas por request) **antes** de medir;
a medição desmentiu o meu próprio quadro de custo e isso está dito na spec §3. Sobra **uma**
incerteza real e ela é verificação obrigatória do plano: `redatores` é `array` sem
`#[DataCollectionOf]`, e não está provado que o `WithTransformer` dispare ali — o teste prova que
`redatores[0].photo_url` volta assinada, ou o campo passa a ser resolvido no `fromModel`.

### Plano — 2026-08-14: 12 tasks, executor dividido

Plano em `docs/superpowers/plans/archive/2026-08-14-celula-de-identidade.md`. **Doze tasks, cada uma com
entregável testável isolado.** Ordem obrigatória: 1–2 (backend) antes de 3 (`typescript:transform`);
3 e 4 antes de 5–10 (os sítios precisam do TS e do componente); 11 depois de tudo; 12 é o gate.
As tasks 5–10 são independentes entre si.

**O executor é dividido por decisão do João (D12): `codex` nas tasks 1, 2 e 11 (`backend/**`),
`claude` no resto.** Os `paths_autorizados` do Codex são cinco arquivos nomeados um a um, e
`frontend/src/shared/types/generated.ts` **não está entre eles** — a lei §5.3 proíbe editá-lo à
mão, e a garantia mais barata é o executor do backend não alcançar o arquivo. A regeneração é task
do Claude.

**A ordem "depois de teste" do pedido está no plano, não na cabeça de ninguém:** o
`DemoPhotosSeeder` é a task 11, depois das dez tasks de conteúdo, porque sem ele a revisão visual
exercitaria só o fallback de iniciais — o caminho `photo_url` → `SignedUrlTransformer` → `<img>`,
que é exatamente o que este bloco acrescenta, ficaria sem prova.

**A revisão visual entra no plano como lista fechada de 13 telas com o que provar em cada uma**
(task 12, step 8). `/lotus-ui-review` tem `disable-model-invocation: true`: é passo do João, e
planejá-lo agora é o que evita descobri-lo no gate, como no `login-fora-do-adr16`.

### Execução — 2026-08-14: início, e a premissa da worktree caiu antes da Task 1

`/executar-bloco celula-de-identidade` validou as âncoras (spec, plano e packet no disco; Git em
`abe976a` na branch `feat/celula-de-identidade`; `active_plan` cobrindo o work item) e abriu os dois
gates. O ciclo foi escalado ao João pelo mesmo impasse recorrente do BD-4, do
`rastro-unicidade-e-gates` e do login — o plano pede `subagent-driven-development` e a sessão não
chama o Agent tool sem autorização: **SDD, Agent tool autorizado para este bloco.**

**A condição escrita em §"Spec — 2026-08-14" item 3 estava falsa quando o comando abriu, e isso foi
medido, não deduzido.** Aquele parágrafo autorizou a worktree com base em `docker compose ps`
**vazio**. Na abertura da execução o stack `lotus-*` estava de pé havia 3h, servido pelo main tree em
`feat/falha-vs-lista-vazia` (BD-6, `ready_for_closure`), e `lotus-app-1` monta
`/home/jvbat/projetos/lotus/backend` — **não** esta árvore. Como as Tasks 1, 2 e 11 são de
`backend/**`, `php artisan test` naquele container teria medido a outra branch.

**O mecanismo do defeito ficaria invisível, e é isso que o torna grave.** Os três hashes de
`TurmaData.php` — container, main tree e worktree — batiam em `f59c2df7…`, mas **por conteúdo**:
`git diff main -- backend/` desta branch é vazio. A Task 1 escreve na worktree; o container seguiria
lendo a cópia do main tree, **sem o campo**. Vermelho permanente contra código correto, sem nada na
tela apontando para a causa.

**Decisão do João: manter o stack de pé, sem derrubar nada.** Mecanismo:
`docker compose up -d --no-deps app` desta worktree, que cria `fix-frontend-app-1` montando
`fix-frontend/backend`. O serviço `app` não publica porta, então há zero colisão com os 8080/3307/9000
do stack do main tree — conferido depois da subida: os cinco containers `lotus-*` seguem `Up`.
`--no-deps` porque `mysql`/`minio` colidiriam, e o `phpunit.xml` usa sqlite `:memory:` (linhas 26-27),
então teste de backend não precisa de MySQL. Sem build: `fix-frontend-app:latest` já existia.

**Isso resolve as Tasks 1–11 e NÃO resolve a Task 12 Step 7**, que precisa de MySQL com dado real,
MinIO e `pnpm dev` para o `DemoPhotosSeeder` e a revisão visual. Fica declarado agora como decisão
pendente do João, em vez de descoberto no gate — que é a lição do `login-fora-do-adr16`.

**Baseline medido nesta branch, não herdado:** backend **591 passed / 5 skipped** (2149 asserções);
`pnpm lint` exit 0; `pnpm build` verde; `pnpm test` **32 arquivos / 163 testes**.

**Pre-flight scan das 12 tasks — três achados, nenhum bloqueante.** O desvio de mecanismo acima (F1);
um falso alarme descartado por medição (F2: `AppAvatarProps.image` já é `string | null` e o tipo já é
exportado, então a Task 4 compila); e uma justificativa errada com conclusão certa (F3: a Task 10
diz que o `field` alimenta a busca do `useTableFilter`, mas quem varre é o `searchable`, e o
`EmissionStudentsTable` chama `useTableFilter(enrollments)` **sem** `searchable` — a tabela não tem
busca nenhuma, então a fusão de colunas custa ainda menos do que D5 supôs). Detalhe em
`.superpowers/sdd/progress.md`.

**Nota de higiene:** o `updated_at` anterior dizia `17:10:00-03:00`, à frente do relógio real
(`date -Is` na abertura: `15:18:17-03:00`). O campo passa a registrar a hora medida, então ele
**recua** — o valor antigo é que estava errado.

### Execução — 2026-08-14: Tasks 1 e 2, e a incerteza do bloco caiu por medição

**O sandbox do Codex não alcança `/var/run/docker.sock`**, então ele não chegou ao PHPUnit e parou nos
Steps 2 das duas tasks, corretamente marcando `blocked` em vez de alegar verde. **Escalar a permissão
foi recusado**: o `/executar-bloco` já exige que Claude rode a verificação do plano antes de aceitar o
diff, então o arranjo passou a ser Codex autora o diff e Claude mede — sem nenhum ganho de permissão.

**Vermelho medido, e é literalmente o que o plano previu:** Task 1 com
`Undefined property: App\Domains\Operation\Data\TurmaData::$client_rut`; Task 2 com
`Failed asserting that null is identical to 'ana.silva@lotus.cl'`.

**A única incerteza real declarada na spec §3 e no plano foi resolvida, e resolveu-se a favor do
caminho barato.** `TurmaData::$redatores` é `array|Optional` com `@var TurmaRedatorData[]` e **sem
`#[DataCollectionOf]`**, e não estava provado que um `WithTransformer` de propriedade disparasse
dentro desse aninhamento. O `assertStringStartsWith('http', …)` **passou**: o transformer atravessa.
O Step 6 alternativo do plano (resolver a assinatura no `fromModel`) **não foi aplicado** — não era
necessário, e aplicá-lo por precaução teria trocado um mecanismo medido por um palpite.

**Suíte inteira: 592 passed / 5 skipped** (2154 asserções) contra o baseline de 591/5 (2149) — +1
teste e +5 asserções, exatamente o que as duas tasks acrescentam, zero regressão. Pint `passed` nos
quatro arquivos. Diff revisado contra o plano antes do commit e integralmente dentro dos
`paths_autorizados`; `generated.ts` intocado, como a lei §5.3 exige.

### Execução — 2026-08-14: Tasks 3–12, o bloco fecha em `ready_for_review`

**Task 4 (`IdentityCell`) não foi delegada a subagente.** SDD com Agent tool estava autorizado pelo
João para o ciclo do bloco, mas a tentativa de spawn foi rejeitada em tempo real; executada inline
por Claude a partir daí — Tasks 4 a 10 e o gate (12) inteiros sem subagente.

**Um rabo solto da Task 3 apareceu ao abrir a Task 4:** `typescript-transformer-manifest.json`
estava modificado na árvore sem nunca ter sido staged junto de `0c4e9ac` — hash novo já batendo com
o `generated.ts` commitado. Corrigido em commit próprio (`a81adb2`), separado da Task 4.

**Grupo A, B e C (Tasks 5–10) fecham os 13 sítios da superfície do bloco**, cada um com gate
build+lint+test verde e commit isolado. Dois achados de execução, nenhum de código: `useCommercialClients.ts`
seguia na forma pré-BD-6 (`clients.data?.find`, não `useLoadState`) — a variante Step 1b do plano
previa exatamente esse caso, aplicada sem ambiguidade (Task 7). A catraca de cor provou nos dois
sentidos (Task 5 Step 6): reintroduzir `text-gray-400` faz `pnpm lint` falhar nomeando arquivo e
linha; revertido à mão, sem `git checkout`.

**Task 11 (`DemoPhotosSeeder`, executor `codex`) repetiu a forma das Tasks 1/2** — Codex escreveu o
arquivo verbatim ao plano, Pint passou, e os Steps dependentes de Docker (rodar o seed, provar
idempotência) foram bloqueados no sandbox por desenho. Mas a causa raiz chegou uma task antes do
previsto: o `--no-deps app` do gate de abertura resolvia teste (sqlite `:memory:`), não `db:seed`,
que precisa de MySQL/MinIO reais — gap que o F1 do pre-flight só havia antecipado para a Task 12
Step 7. **Decisão do João:** `docker network connect lotus_default fix-frontend-app-1` — sem subir
ou derrubar container, sem tocar porta, só entrar como membro adicional da rede; o seed grava no
MESMO banco de dev que o BD-6 usa, reuso deliberado, não isolamento. Medido depois: 33 semeadas na
primeira rodada, `0 semeadas` e todos `já tem foto, pulado` na segunda — idempotência provada.

**Gate do bloco (Task 12), todos os seis passos verificáveis sem exceção:** suíte de backend 592
passed / 5 skipped (2154 asserções, mesma contagem desde a Task 3); frontend `pnpm build`/`pnpm lint`/`pnpm test`
os três exit 0, 171 testes; `grep "text-gray-"` zero ocorrências; `CATRACA_COR` com exatamente 4
linhas, sem `ClientsTable.tsx`; `grep "AppAvatar"` fora de `shared/ui` aponta só para
`UserMenu.tsx`, a única exceção deliberada; `typescript:transform` reexecutado devolve diff vazio
em `generated.ts` — nenhuma edição à mão.

**O que o bloco NÃO provou, sem maquiagem:** `/lotus-ui-review` não rodou — os 13 sítios da lista do
plano (Task 12 Step 8) nunca foram vistos no navegador nesta execução. A porta 5173 está ocupada
pelo `pnpm dev` do main tree (BD-6, `/home/jvbat/projetos/lotus/frontend`), e o `docker compose up
-d` sem `--no-deps` do texto original do plano colidiria de porta com aquele stack — mesma classe
de desvio de mecanismo do F1. A revisão visual é passo do João na sessão interativa; a lista das 13
telas foi entregue a ele em chat, não através de skill.

**Estado: `ready_for_review`.** Este comando não inicia review — a próxima instrução do João aciona
a revisão do trabalho ativo.

### Extensão — 2026-08-14: foto no header, foto de redator sai de Turma/detalhe

**O bloco já estava `ready_for_review` quando o João pediu, em chat, dois itens novos sobre a mesma
superfície:** foto do usuário logado no header (via `IdentityCell`) e remoção da foto de redatores
em Turma/detalhe da turma. Decisão dele: dobra no MESMO `active_work_item`, estado volta a
`executing` para a extensão e fecha de novo em `ready_for_review` — sem abrir item novo.

**`IdentityCell.tsx` não foi tocado — o João já o tinha editado à mão antes desta sessão** (`<p>` virou
`<span>`, WIP não commitado quando a sessão abriu). A única consequência disso: `IdentityCell.test.tsx`
estava quebrado (3 testes contando `<p>`, que não existe mais), achado no gate desta extensão e não
por ele. Corrigido só o teste, trocando a asserção por `span.truncate` — o contrato real que o
próprio componente documenta ("a forma empilhada trunca; a inline não"), não a tag incidental.

**Foto no header exigiu DTO novo, não só JSX.** `SessionUserData` (`/login` e `/me`) não carregava
`photo_url` — medido antes de mexer no front, não assumido. Campo acrescentado no mesmo molde de
`UserData::$photo_url` (`#[WithTransformer(SignedUrlTransformer::class, 60)]`, `fromModel` lendo
`$user->photo_path`), `typescript:transform` reexecutado, diff de `generated.ts` de uma linha só.
`UserMenu.tsx` ganhou `image={user.photo_url}` no `AppAvatar` já existente.

**`IdentityCell` NÃO entrou no header, por decisão do João contra a leitura literal do pedido.**
O trigger do `UserMenu` tem desenho específico documentado no próprio arquivo — avatar `aria-hidden`
(nome acessível vem do texto), texto colapsa por `sr-only` abaixo de `sm` (UI-04 do review de
2026-08-12, chevron cortava a 320px), branco cravado (D-P13, a navy é fixa nos dois temas).
`IdentityCell` empacota avatar+texto num bloco só, sem gancho pra isolar só o texto do colapso — usá-lo
ali regrediria o UI-04. Escalado, e o João escolheu manter o `AppAvatar` com a foto encaixada, sem
importar `IdentityCell` no header.

**Redator sai de 2 sítios, os outros 11 já estavam certos — medido, não author.** Grep de
`image={.*photo_url}` em todo `IdentityCell` do repo antes de editar: 3 sítios de Turma mostravam foto
de redator (`RedatorDesignation.tsx:37,72`, `TurmasTable.tsx:106`), removida a prop `image` dos três
(cai no fallback de iniciais do `AppAvatar`, sem tocar `IdentityCell`). Os sítios de aluno em
Certificados e no detalhe da turma (`EnrollmentTable`, `EmissionStudentsTable`, `HistorialTable`) **já
não passavam `image`** — commit `9e3a68e` desta mesma branch já fechou isso. `client_photo_url` em
`TurmasTable`/`TurmaDetailPage` fica — é cliente, fora do pedido.

**Gate reproduzido depois da extensão:** backend 592 passed / 5 skipped (2154 asserções, mesma
contagem — a extensão não muda regra de negócio, só projeta um campo já resolvido);
`pnpm build`/`pnpm lint`/`pnpm test` os três exit 0, **171 testes** (mesma contagem da Task 12 — a
correção do `IdentityCell.test.tsx` troca asserção, não adiciona/remove teste); `typescript:transform`
reexecutado de novo ao final, diff vazio.

**O que esta extensão NÃO provou, sem maquiagem:** a foto aparecendo de fato no header não foi vista
no navegador. `:5173`/`:8080` seguem ocupados pelo stack do main tree (mesma causa registrada acima
para os 13 sítios da Task 12); um nginx+`pnpm dev` avulsos em portas alternativas (`8081`/`5174`),
ligados só a este container via `fix-frontend_default`, chegaram a subir para o teste de rota
(HTTP 200 confirmado) e foram desmontados em seguida sem login nem screenshot — checagem visual seguiu
fora do escopo desta sessão, pelo mesmo motivo que já vale pro resto do bloco (`/lotus-ui-review` é
`disable-model-invocation: true`, passo do João).

**Estado: `ready_for_review`.** Mesma regra da Task 12 — este comando não inicia review.

### Correção de rumo — 2026-08-14: "não exibe foto" era BUG, não pedido — foto entra em todos os sítios

**A extensão acima leu o pedido ao contrário, e o João corrigiu em chat.** A frase "em turma,
certificados e detalhes da turma não exibe foto de redatores, alunos" era RELATO de defeito, não
pedido de remoção. Instrução corrigida: a foto deve aparecer **em todos os sítios que chamam
`IdentityCell`** — redator e aluno inclusos — e no header. A remoção da subseção anterior foi
desfeita e a direção invertida.

**Causa raiz de "nunca apareceu, nem na 1ª nem na 2ª execução": stack misto — medido, não
teorizado.** O `pnpm dev` em `:5173` é DESTA worktree (`/proc/<pid>/cwd` conferido), mas
`VITE_API_URL` apontava `:8080` = nginx do MAIN tree = backend da branch do BD-6, **sem nenhum DTO
alargado desta branch**. Todo `photo_url` que o front pedia chegava `undefined`; o header idem
(`SessionUserData.photo_url` só existe aqui). Defeito latente adicional: o `backend/.env` desta
worktree assinava URL pública contra `localhost:9002`, porta sem listener nenhum (o MinIO
compartilhado publica `9000`) — mesmo com backend certo, a foto morreria no `onImageError`.

**Código (commitável):** `image` restaurado nos 3 sítios de redator (`RedatorDesignation.tsx` ×2,
`TurmasTable.tsx`); `EnrollmentData::photo_url`, `EmissionPanelEnrollmentData::student_photo_url` e
`CertificateData::aluno_photo_url` criados no molde do `StudentData` (`#[Computed]` +
`SignedUrlTransformer`), com os 3 sítios de aluno consumindo (`EnrollmentTable`,
`EmissionStudentsTable`, `HistorialTable`). No `CertificateData` a foto é VIVA e deliberadamente
fora do snapshot — a decisão de auditoria do `9e3a68e` ("snapshot não se ilustra com dado mutável")
foi revertida por instrução explícita do João **para a listagem**; PDF e rota pública do QR seguem
só-snapshot. `CertificateController::index` ganhou `with('enrollment.student.user')` (a listagem não
tinha eager load porque só lia snapshot), e o `SoftDeletedRelationProjectionTest` ganhou o caso do
certificado de aluno arquivado, na regra da rule backend-ddd. `generated.ts` regenerado (3 campos
novos); 3 fixtures de teste TS ajustadas no mesmo passo (ADR-04, "quem regenera ajusta consumidor").
O painel de emissão não custa query nova (`withListingData()` já carregava `student.user`).

**Ambiente (não commitável, worktree):** `backend/.env` — `AWS_ENDPOINT_PUBLIC`/`AWS_URL`
`9002→9000`, `FRONTEND_URL` e `SANCTUM_STATEFUL_DOMAINS` ganham `localhost:5173` (o vite real);
`frontend/.env` — `VITE_API_URL` `8080→8081`; container avulso **`fix-frontend-nginx`**
(nginx:alpine, `:8081`) servindo o backend DESTA branch via `fix-frontend-app-1`, que já vivia nas
duas redes (`fix-frontend_default` + `lotus_default`) e por isso usa o MySQL e o MinIO do stack
principal — mesmo banco de dev, mesmas fotos do `DemoPhotosSeeder`. O stack do main tree não foi
tocado; `:8080`/`:5173` seguem dele.

**Gate:** backend **593 passed / 5 skipped (2156 asserções)** — +1 teste, o caso novo de
soft-delete; Pint passed nos 4 PHP; front `build`/`lint`/`test` verdes, **171 testes** (fixtures
mudaram, contagem não).

**Provado por request real, não só por suite:** login curl `admin@lotus.cl` em `:8081` →
`/api/me` 200 com `photo_url` assinada contra `localhost:9000` → `curl` da própria URL = **200
`image/png` (1,87 MB)**; `/api/turmas` = 6 turmas, 6 com `redatores[0].photo_url` assinada;
`/api/certificates` = 5 linhas, `aluno_photo_url` em 3 (o seed é "um sim, um não" — as outras 2
caem nas iniciais, que é o ramo correto); CORS respondendo
`Access-Control-Allow-Origin: http://localhost:5173` + credentials.

**NÃO provado: o pixel no navegador** — `/lotus-ui-review` segue sendo passo do João. O vite
reinicia sozinho ao detectar o `.env` novo; se a aba ainda apontar `:8080`, reiniciar o `pnpm dev`
e relogar (a sessão anterior era do backend do main tree).

**Estado: `ready_for_review`.** Mesma regra de sempre — review só quando o João acionar.

### Review — 2026-08-14: risco ALTO, duas lentes, 9 achados

`/revisar-sprint` abriu em `ready_for_review`, transicionou a `reviewing` e classificou o bloco
como **ALTO risco** pelo gatilho binário do projeto: `generated.ts` regenerado (lei §5.3), DTO de
documento legal alargado (`CertificateData`) e Tasks 1/2/11 com `executor: codex`. Por isso a
revisão do Codex read-only rodou como segunda lente, sobre o intervalo `0a1439f..840edf0`.

**Os gates do bloco foram REPRODUZIDOS aqui, não herdados:** backend **593 passed / 5 skipped
(2156 asserções)**; `pnpm lint` exit 0; `pnpm test` **33 arquivos / 171 testes**;
`typescript:transform` reexecutado devolve `generated.ts` sem diff; `grep text-gray-` zero;
`CATRACA_COR` com 4 linhas; `AppAvatar` fora de `shared/ui` só em `UserMenu.tsx`. Nenhum órfão.

**Dois 🔴, e os dois são o mesmo tipo de defeito — texto afirmando o que o código não faz:**
o comentário do `HistorialTable.tsx:54-57` diz "SEM `image`, e isto é decisão de auditoria" três
linhas acima de `image={c.aluno_photo_url}` (a reversão do João está no `state.md`, mas a spec §D4 e
o comentário seguem dizendo o contrário); e o `IdentityCell` perdeu o `min-w-0` que o plano
escrevia, o que deixa o `truncate` inerte nos 13 sítios — com o teste verde, porque ele conta a
classe `.truncate` em vez de medir o comportamento (lição 10, cobertura fantasma).

**A segunda lente achou um que a primeira não tinha, e ele foi verificado no código antes de
entrar:** o `SignedUrlPropertyReadTest` varre `app/` por `->photo_url` e `->download_url`, e os três
campos novos do bloco (`client_photo_url`, `student_photo_url`, `aluno_photo_url`) **escapam da
regex pelo prefixo** — a guarda existe e não cobre o que o bloco criou.

**Um achado do Codex foi medido e reprovou, e não entra como ele o escreveu:** o
`DemoPhotosSeeder` "sem guarda de ambiente" já é barrado em produção pelo `ConfirmableTrait` do
`db:seed`, que exige `--force`. Fica como 🟢 de higiene, não como risco de produção.

**Medição própria que desmontou uma suspeita:** os dois campos de foto aninhados em `array` sem
`#[DataCollectionOf]` (`EmissionPanelEnrollmentData::student_photo_url` e
`EnrollmentData::photo_url`) **voltam assinados** — verificado por tinker contra o banco de dev,
`http://localhost:9000/lotus/user-photos/…`. Não é bug; é lacuna de teste de regressão.

### Triagem do João (2026-08-14): 7 entram, 2 são decisão dele

**Entraram e estão corrigidos** — Q-1, Q-4, Q-5, Q-6, Q-7, Q-8, Q-9:

- **Q-1** — o comentário do `HistorialTable` passou a descrever a reversão, e a spec §D4 ganhou a
  nota do que ficou de pé: **o PDF e a rota pública do QR seguem só-snapshot**; a fronteira mudou de
  lugar, não sumiu.
- **Q-4** — a regex da guarda virou `/->\s*\w*(download_url|photo_url)\b/`. Os três campos novos
  passam a ser cobertos e nada de `app/` reprova.
- **Q-5** — a forma inline devolve `<div>`. **Sem mudança visual**: o `flex` já cravava o `display`
  nas duas grafias, e as classes são as mesmas — a troca só corrige `<div>` do avatar dentro de
  fraseado. Teste novo prova o container de fluxo, e reprovou contra o `<span>` antes de entrar.
- **Q-6** — nasceu o `CertificateQueryBuilder` (`LISTING = ['enrollment.student.user']`), com
  `withListingData()` no `index` e `loadListingData()` em `show`/`store`/`revoke`, que
  lazy-loadavam três relações cada. Guarda de runtime em
  `tests/Feature/Certification/CertificateEagerLoadTest.php`, no molde do `ContratanteEagerLoadTest`
  (duas cadeias distintas, `preventLazyLoading`) — **vista vermelha** com o eager load removido.
  O segundo teste do arquivo fecha a lacuna que a própria revisão mediu: `aluno_photo_url` chega
  **assinado** na listagem e no detalhe.
- **Q-7** — `aria-hidden` no avatar da célula: o nome deixa de ser anunciado duas vezes por linha
  nos 13 sítios, de uma linha só. Teste próprio, também visto vermelho antes.
- **Q-8** — `clientName` deriva de `client`; era a mesma varredura escrita duas vezes.
- **Q-9** — o seeder passa a contar quatro números separados (semeadas, já tinham, sem foto por
  propósito, falharam); "total menos semeadas" chamava de proposital quem falhou por rede.

**Não entraram, por decisão do João — as duas são alteração dele, à mão, depois do plano:**

- **Q-2** (`min-w-0` ausente, `truncate` inerte nos 13 sítios) — "deixe como está". Registrado em
  `docs/pendencias.md` (**P-38**) para não voltar como achado novo.
- **Q-3** (grafia diverge do D1: `font-semibold`, `text-sm`, `gap-2`) — "eu que mudei". Registrado
  em `docs/pendencias.md` (**P-39**); o D1 da spec segue com a grafia planejada.

**Gates repetidos depois das correções:** backend **595 passed / 5 skipped (2162 asserções)**;
`pnpm lint` exit 0; `pnpm build` sem erro de tipo; `pnpm test` **33 arquivos / 173 testes**;
`typescript:transform` reexecutado não move `generated.ts`.


### Integração — 2026-08-14: a `main` entra na branch antes do fechamento

**A `main` andou 24 commits desde o `0a1439f` de onde esta branch nasceu**, e dois deles mudam o
chão que o `/fechar-sprint` pisa: o BD-6 mergeado (PR #50) e a **reorganização da pasta de docs**
(PR #51). `docs/pendencias.md` deixou de existir — virou `docs/superpowers/pendencias/` com
`README.md` (índice), `abertas.md` (fichas) e `encerradas.md`; `progress.md` e `progress-archive.md`
desceram para `docs/superpowers/historico/`. O próprio `.claude/skills/fechar-sprint/SKILL.md` foi
reescrito na `main` com os paths novos. Fechar antes de integrar escreveria em dois arquivos mortos,
então a ordem foi **merge primeiro**, por decisão do João (a alternativa, rebase dos 27 commits sobre
a reorg, replayaria o mesmo conflito de `state.md` commit a commit).

**Cinco conflitos, e três eram exatamente os que este arquivo previu em §"Exceção declarada".**
`frontend/src/shared/ui/index.ts` (união: `IdentityCell` + `InlineLoadState`) e
`frontend/src/features/commercial/hooks/useCommercialClients.ts` são as colisões 2 e 1 medidas antes
da promoção paralela; a colisão 3 (os três locales) **auto-mergeou limpo**. Os outros dois são de
documento: `docs/superpowers/backlog.md` e este arquivo.

**O hook resolveu-se pela rule, não pelo meio-termo.** `.claude/rules/frontend-fsliced.md` escreve
que estado de carga de lista **não se deriva à mão na feature** — vem do `useLoadState`. A forma do
BD-6 (`...load`) fica inteira e o Grupo B deste bloco volta por cima dela como `client`, com
`clientName` derivando dele. Medido: `useLoadState` já expõe `isLoading`, `loadError` e `refetch`,
que eram os três campos que a forma antiga montava à mão, então `BudgetsTable` e `BudgetDialog`
seguem compilando sem tocar em consumidor.

**`backlog.md` ficou com o lado da `main` inteiro, e isso já cumpre o passo 9 do gate.** O único
acréscimo desta branch ao arquivo eram as 105 linhas do item 4 (a própria célula de identidade), e a
reorg da `main` já as removeu ao reescrever a fila em Sprint 5/6 + BD-10..BD-15.

**P-38 e P-39 desta branch colidiram de ID e foram renumeradas para P-41 e P-42**, no precedente que
o próprio repositório fixou duas vezes (a segunda `P-30` virou `P-33`; a segunda `P-28` virou
`P-32`): a reorg chegou à `main` primeiro e já usava `P-38`/`P-39` para outras pendências, e vai até
`P-40` — quem renumera é a recém-chegada. As fichas foram portadas para
`docs/superpowers/pendencias/abertas.md` na forma nova, sob `# Travadas em decisão do João`, com o
índice do `README.md` acompanhando.

**O gatilho da P-34 venceu neste bloco e já tem casa: `BD-11`.** Este bloco tocou o shell
(`frontend/src/app/layouts/Header/UserMenu.tsx`, a foto no `UserMenu`), que é o gatilho literal da
pendência. Não foi absorvido — as 3 classes `text-slate-*` vivem em `Sidebar/`, não no Header, e a
reorg da `main` já agrupou P-34 + D-03 no **BD-11 · shell: catraca de cor e navegação no toque**, com
DoD escrito. O gatilho fica cumprido pelo agrupamento, não por alargamento desta sprint.

**A promoção do `dashboard-backend-agregacoes` que veio da `main` NÃO fica de pé neste fechamento**,
por decisão do João: o `workflow_state` vai a `idle` e ele repromove o bloco explicitamente. A
narrativa dela está preservada logo abaixo e a spec, o plano e o Context Packet do dashboard
**continuam no disco, nas pastas ativas** — nada foi arquivado, porque nada foi entregue.

### Fechamento — 2026-08-14

`/fechar-sprint` abriu com `workflow_state: ready_for_closure` e o item batendo. **O gate rodou
inteiro DEPOIS do merge da `main`** (§"Integração" acima), porque a reorg de docs mudou o destino de
dois passos dele — as pendências e o histórico.

**O passo 0 fechou em duas metades, e a segunda não é artefato desta sessão.** A metade de API foi
provada por request real contra o backend DESTA branch (`:8081`, sessão Sanctum, `Origin` +
`Accept`): `/api/me` devolve `photo_url` assinada e o GET da própria URL responde **200 `image/png`,
1.877.301 bytes**; `client_photo_url` em 3 de 6 turmas, `redatores[0].photo_url` em 5 de 6,
`EnrollmentData::photo_url` em 27 de 55 matrículas, `student_photo_url` em 7 de 15 do painel de
emissão e `aluno_photo_url` em 3 de 5 certificados — preenchimento parcial é o "um sim, um não" do
`DemoPhotosSeeder`, e o resto cai nas iniciais, que é o ramo correto. Os **16 call sites** de
`IdentityCell` passam `image`, conferidos um a um. **A metade de pixel veio do João**, que confirmou
a checagem visual em chat; `/lotus-ui-review` não rodou e continua sendo passo dele
(`disable-model-invocation: true`), com a porta 5173 ocupada pelo stack do main tree durante toda a
execução. Fica escrito qual metade tem artefato no repositório e qual não tem.

**Placar do gate, medido pós-merge e não herdado:** backend **595 passed / 5 skipped (2162
asserções)**; `pnpm lint` exit 0; `pnpm build` exit 0; `pnpm test` **36 arquivos / 186 testes**;
Pint `passed` nos 15 `.php` do bloco; `typescript:transform` reexecutado não move `generated.ts`;
zero `.gitkeep` órfão, e os 9 arquivos novos são todos entregável nomeado no plano. Leis §5: zero
import de `primereact` fora de `shared/ui`, zero import cruzado entre features, e o
`CertificateQueryBuilder` é o sétimo `Eloquent\Builder` do padrão — não Repository.

**Docker caiu inteiro no meio da sessão** (`Exited (255)` simultâneo nos sete containers, daemon/WSL)
e o stack foi restaurado com `docker start`, com as duas redes de `fix-frontend-app-1` intactas. A
suíte foi remedida depois da restauração, com o mesmo placar — o número acima é o de depois, não o de
antes.

**Arquivamento e histórico, já no layout novo da `main`:** plano em `plans/archive/`, spec em
`specs/archive/`, com as duas referências dentro deste arquivo atualizadas para os paths movidos. O
Context Packet fica onde está — `context-packets/` não tem convenção de arquivo. A entrega entrou em
`docs/superpowers/historico/progress.md` e a mais antiga das dez (o BD-2, 2026-08-11) desceu
**verbatim** para `historico/progress-archive.md`, mantendo o teto de dez.

**O passo 9 do gate já estava cumprido pela `main`:** a reorg removeu o item 4 de "Próximos blocos"
ao reescrever a fila em Sprint 5/6 + BD-10..BD-15, e nada foi removido daqui.

**A P-26 saiu das encerradas.** Ela fechou na varredura pós-BD-6 com "sai no próximo
`/fechar-sprint`", e este é o próximo; o rastro durável fica em `historico/progress-archive.md` e na
spec arquivada do bloco de 2026-08-04.

**Estado: `idle`, com a promoção do dashboard desfeita por decisão do João.** O `state.md` que veio
da `main` trazia `dashboard-backend-agregacoes` em `ready_for_execution`; a alternativa era preservar
a promoção e mexer só em `last_completed_work_item`, e ele escolheu **fechar a `idle` e repromover
depois**. A spec, o plano e o Context Packet do dashboard **continuam nas pastas ativas** — nada foi
arquivado, porque nada foi entregue —, e a narrativa da promoção segue logo abaixo, intacta.
`state_basis_commit` aponta para `9ed7351`, o merge que integra a entrega; não para o commit deste
fechamento.
