---
schema_version: 2
mode: multi-lane
focused_lane: lane-a
active_feature: hardening
active_work_item: hardening-auditoria-privacidade-e-observabilidade
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
resume_state: null
active_spec: docs/superpowers/specs/2026-08-26-hardening-auditoria-privacidade-e-observabilidade-design.md
active_plan: docs/superpowers/plans/2026-08-26-hardening-auditoria-privacidade-e-observabilidade.md
context_packet: docs/superpowers/context-packets/2026-08-26-hardening-auditoria-privacidade-e-observabilidade.md
blocker: null
lanes:
  lane-a:
    active_feature: hardening
    active_work_item: hardening-auditoria-privacidade-e-observabilidade
    workflow_state: ready_for_closure
    next_owner: claude
    next_action: close_active_work_item
    tree: main-tree
    branch: feat/hardening-auditoria-privacidade-e-observabilidade
    active_spec: docs/superpowers/specs/2026-08-26-hardening-auditoria-privacidade-e-observabilidade-design.md
    active_plan: docs/superpowers/plans/2026-08-26-hardening-auditoria-privacidade-e-observabilidade.md
    context_packet: docs/superpowers/context-packets/2026-08-26-hardening-auditoria-privacidade-e-observabilidade.md
    blocker: null
    resume_state: null
    last_completed_work_item: hardening-api-arquivos-e-abuso
  lane-b:
    active_feature: cicd
    active_work_item: cicd-ci-governanca-e-artefato
    workflow_state: ready_for_closure
    next_owner: claude
    next_action: close_active_work_item
    tree: ../lotus-infra
    branch: cicd/ci-governanca-e-artefato
    active_spec: docs/superpowers/specs/2026-08-24-cicd-ci-governanca-e-artefato-design.md
    active_plan: docs/superpowers/plans/2026-08-24-cicd-ci-governanca-e-artefato.md
    context_packet: docs/superpowers/context-packets/2026-08-24-cicd-ci-governanca-e-artefato.md
    blocker: null
    resume_state: null
    last_completed_work_item: compose-por-worktree
  lane-c:
    active_feature: null
    active_work_item: null
    workflow_state: idle
    next_owner: joao
    next_action: select_backlog_item
    tree: ../fix-frontend
    branch: refactor/frontend-revisao-ui-f2   # fechada em 2026-08-25; ainda não mesclada
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: frontend-revisao-ui-por-modulo-f2
last_completed_work_item: hardening-api-arquivos-e-abuso
state_basis_commit: df9533eb
updated_at: 2026-08-28T14:20:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.
>
> **Só o trabalho ATIVO mora aqui.** Bloco fechado deixa uma linha em `## Itens fechados`; a
> narrativa dele vive em `historico/state-archive.md`. Este é o arquivo que toda sessão lê
> primeiro (`CLAUDE.md` §3), e ele só se mantém legível se encolher a cada fechamento.

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

- **Modo multi-lane (desde 2026-08-22):** existe no máximo um `active_work_item` **por lane**; as
  lanes ativas vivem em `lanes:` no frontmatter. Os estados da tabela acima valem por lane.
- Os campos singulares do topo **espelham** a lane apontada por `focused_lane` — é o que
  `/planejar-bloco` e `/executar-bloco` leem; eles operam sempre sobre a lane em foco. Trocar o
  foco é fronteira durável: espelho + `lanes:` mudam no mesmo commit.
- `next_action` deve corresponder a `workflow_state` (em cada lane).
- `active_plan` é obrigatório a partir de `ready_for_execution` (em cada lane).
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- **Gate de árvore por lane:** bloco que toca backend roda no main tree (o compose monta o main
  tree — P-03). Só há uma lane de backend, então a P-03 não é disparada. Worktree é para lane que
  não depende do compose; se precisar subir stack no worktree, vale o precedente de override de
  portas + projeto compose próprio (2026-08-19), decidido no planejamento da lane.
- **`docs/superpowers/**` se divide por DONO, não por árvore.** A regra anterior — *"muda somente
  pelo main tree; branch de lane em worktree não toca esses arquivos"* — foi quebrada por 21
  commits da lane-c no mesmo dia em que foi escrita, e a exceção redigida não cobria o que a lane
  realmente escreveu (Q-2 do review de 2026-08-22). Regra vigente, cada lane escreve **só o que é
  dela**, na árvore em que estiver:
  - **O bloco dela em `lanes:`** — nunca o de outra lane.
  - **Spec, plano e context packet dela**, e o arquivamento deles no fechamento.
  - **Fichas de `pendencias/`** que ela abre ou fecha, com a linha do índice que as acompanha.
  - **A linha dela** em `historico/progress.md`, a narrativa dela em `historico/state-archive.md`
    e a linha dela na tabela `## Itens fechados` — tudo no commit de fechamento.
  - **A remoção do próprio item** de `backlog.md`. Promover, reordenar ou acrescentar item ali é
    do main tree, com o João.
  - **Entregáveis de doc** que o plano dela autorizar, nos paths que o plano nomeia.
  - **Nunca os campos singulares do topo**: são espelho de `focused_lane`, e trocar o foco é
    fronteira durável do main tree.

  Colisão que sobrar é resolvida pela integração serial, que já é invariante logo abaixo: uma lane
  mescla por vez, as demais rebasam antes de continuar.
- **Planejamento é serial** (brainstorming com o João, um bloco por vez) e **integração é serial**
  (uma lane faz merge por vez; após cada merge as demais rebasam antes de continuar). Só a
  execução sobrepõe.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística. Divergência **entre lanes** (mesmo arquivo, mesma decisão) bloqueia as lanes
  envolvidas.
- O backlog nunca promove trabalho automaticamente.

## Seleção multi-lane — 2026-08-22: três blocos promovidos em paralelo

Decisão explícita do João (sessão 2026-08-22): desenvolver blocos em paralelo com worktrees.
Três itens da fila consolidada (`backlog.md@ba59dbd9`) promovidos de uma vez — frentes
disjuntas, colisão mínima de arquivos:

| Lane | Bloco (item da fila) | Frente | Árvore | Branch |
|---|---|---|---|---|
| `lane-a` | ~~`feedbacks-resolver-escopo` (1)~~ — **fechado em 2026-08-22** | Backend | main tree (gate P-03) | `feat/feedbacks-resolver-escopo` (não mesclada) |
| `lane-b` | `infra-producao-runtime-e-aws` (10) | Infra | `../lotus-infra` | `infra/producao-runtime-e-aws` |
| `lane-c` | `BD-15-docs-guardrails-e-sincronizacao` (14) | Docs | `../lotus-bd15` | `docs/bd15-guardrails-e-sincronizacao` |

- As três lanes nascem em `context_required` — os três blocos exigem Context Packet.
- O gate main-tree/worktree do `/executar-bloco` fica satisfeito sem reabrir a P-03: uma única
  lane de backend, e ela no main tree. O override de portas de 2026-08-19 não é necessário aqui;
  se a lane-b precisar subir o stack do worktree para provar imagem/compose, o planejamento dela
  decide o arranjo (projeto compose próprio + portas próprias, como no precedente).
- Worktrees criados a partir de `main@c8480ee`; **rebase obrigatório** antes de a execução da
  lane começar e antes de cada merge.
- Ordem de planejamento (serial): `lane-a` → `lane-b` → `lane-c`. Execuções sobrepõem depois que
  cada plano fica pronto.
- Interseções conhecidas a vigiar: `lane-c` (BD-15/D-17) e a futura CI (item 11) tocam
  `.github/workflows`; `generated.ts` só regenera na lane-a. Nada disso colide entre as três
  lanes ativas.

> A tabela acima é **registro da seleção de 2026-08-22**, não a lista do que está ativo. Os três
> itens que ela promoveu fecharam: o 1 e o 14 em 2026-08-22 (PR #65 e PR #66, merge `61acc0c3`) e o
> 10 em 2026-08-22 (PR #67, merge `31f91987`). As lanes foram reatribuídas. O que está vivo agora
> está na seção abaixo.

## Ocupação corrente — 2026-08-24

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | `hardening-auditoria-privacidade-e-observabilidade` (item 5) | Backend/Infra | main tree | `feat/hardening-auditoria-privacidade-e-observabilidade` | `ready_for_closure` |
| `lane-b` | `cicd-ci-governanca-e-artefato` (item 11) | GitHub/Infra | `../lotus-infra` | `cicd/ci-governanca-e-artefato` (mesclada, PR #75) | `ready_for_closure` |
| `lane-c` | — | — | `../fix-frontend` | `refactor/frontend-revisao-ui-f2` (fechada em 2026-08-25, não mesclada) | `idle` |

**A `lane-a` fechou o item 4 em 2026-08-25** — `hardening-api-arquivos-e-abuso`, narrativa integral
em `historico/state-archive.md` e entrega em `historico/progress.md`. A branch
`feat/hardening-api-arquivos-e-abuso` nasceu de `main@7fa1cb0a` e **mesclou pelo PR #78** (merge
`038b4a70`); a árvore é o main tree, que não se destrói. A lane não recebe item novo sozinha: promoção é
do João, contra o `backlog.md`.

**Promoção do item 5 — 2026-08-26, `lane-a`.** Promoção explícita do João com a lane em `idle`,
contra o `backlog.md`. O item é marcado `Contexto: sim`, então a lane nasce em `context_required`: o
Context Packet vem antes do `/planejar-bloco` e é do Codex (`.agents/skills/lotus-context-packet`),
em sandbox read-only. A branch `feat/hardening-auditoria-privacidade-e-observabilidade` sai de
`main@038b4a70`, que já é `origin/main` e traz o merge do próprio item 4. **Árvore:** main tree, pelo
precedente de todo bloco de backend; a **P-03 foi paga** pelo `compose-por-worktree`, então isso é
escolha e não imposição do compose. O espelho já apontava para a `lane-a` — não houve troca de foco
neste commit.

**O Context Packet do item 5 voltou `blocked` — 2026-08-26.** O Codex recuperou o `requisitos-negocio.md`
do Drive por ID (`1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-`) e leu o texto real dos cinco RNF-SEC citados pelo
backlog. **Nenhum deles fixa número, canal ou prazo:** o único número próximo na fonte é o "no mínimo
7 dias" do `RNF-DIS-03`, que é backup de banco e não alcança `audits`, `login_logs` nem documento. A
medição também **desfez a suposição do próprio backlog** sobre o `RNF-SEC-05`: a ambiguidade não está
no texto — ele diz "Micro-serviço em nuvem" literalmente, e o que está aberto é se o João mantém a
forma diante de um monólito para ~10 usuários. E a linha de **retenção documental** não é atalho para
P-02/P-33 nem requisito confirmado: a fonte descreve os PDFs de redator/turma e o S3, e não define
prazo, descarte nem preservação legal. São quatro decisões do João, todas de regra de negócio ou peso
legal, e o `blocker` do espelho as enumera. **O packet foi salvo como evidência** em
`context-packets/2026-08-26-hardening-auditoria-privacidade-e-observabilidade.md`, mas **não** entrou
em `context_packet` enquanto estava `blocked`: `status: blocked` não é contexto utilizável, e apontar
para ele diria que a lane tem contexto que ela não tem.

**O João respondeu as quatro no mesmo dia, e o packet foi refeito por refresh — `status: ready`.** As
decisões entram no packet com `Resolution basis` de **instrução explícita do João Victor**, que é o
topo da hierarquia de fontes da própria skill, acima do snapshot do Drive:

1. **Retenção:** `audits` **5 anos**, `login_logs` **12 meses**, os dois podados pelo scheduler. O
   trilho de auditoria acompanha o peso legal do certificado e precisa sobreviver à validade dele; o
   `login_logs` é o que carrega PII pura (`ip_address`, `user_agent`) e sai antes. É o mecanismo que a
   **P-02** e a **P-33** esperavam e a lacuna que o ADR-08 deixou aberta.
2. **Retenção documental:** os arquivos de turma/redator **não expiram**. Fica só o arquivamento
   lógico, que já é o comportamento vigente — decisão registrada, **sem código novo**, e non-goal
   declarado do bloco.
3. **Forma dos logs:** a forma literal "Micro-serviço em nuvem" do `RNF-SEC-05` **não** se mantém;
   centralização dentro do monólito basta e o requisito é **revisado formalmente por escrito**. É o
   mesmo movimento que o item 13 aplica ao `RNF-DIS-02` × ADR-14: manter a arquitetura e revisar o
   requisito, nunca declarar equivalência em silêncio. A revisão é entregável deste bloco.
4. **Alerta e cofre:** o alerta do `RNF-SEC-07` é definido **aqui**, por três famílias de evento
   medível dentro do monólito — falhas de login repetidas na mesma chave, uso de sessão de conta
   desativada e 403 em sequência —, cada uma com condição, destino e expectativa temporal. O cofre do
   `RNF-SEC-03` fica em `env_file` fora da imagem (que já é o HEAD) mais **rotação documentada**; o
   cofre gerenciado real é **diferido ao item 10**, junto da conta AWS.

**Brainstorming fechado e spec escrita — 2026-08-26.** A medição contra `main@038b4a70` levantou
**uma tensão que o packet não tinha como enxergar**: a `audits` guarda `url`, `ip_address` e
`user_agent`, que é a MESMA PII pura que motivou a P-33 no `login_logs`. Com 5 anos numa tabela e 12
meses na outra, IP e user agent sobreviveriam os 5 anos assim mesmo, pela outra porta. **Decisão do
João, no mesmo dia: poda em duas fases** — aos 12 meses a linha de `audits` é anonimizada nos três
campos e preserva quem/o quê/valor antigo/novo; aos 5 anos é apagada. As duas janelas passam a contar
a mesma história e o que o `RNF-SEC-04` exige sobrevive intacto.

A medição também mostrou que **"podados pelo scheduler" não tinha onde rodar**: não há `app/Console/`,
nenhum `Schedule::` em lugar nenhum, nenhum comando Artisan próprio, e nenhum compose ou entrypoint
com cron, supervisor ou `schedule:work`. O runner passa a ser entregável deste bloco — serviço
`scheduler` no compose de produção, mesma imagem, e não cron do host, que faria a poda depender do
working tree do servidor logo depois de o item 10 ter comprado o contrário. E os logs de ação são
construção do zero: `config/logging.php` é o stub vanilla e o app inteiro tem três chamadas de log,
todas de descarte de arquivo órfão.

A spec está em `specs/2026-08-26-hardening-auditoria-privacidade-e-observabilidade-design.md`, com
nove decisões, cinco catracas e treze itens de DoD.

**Plano escrito e a lane em `ready_for_execution` — 2026-08-26.** Nove tasks em
`plans/2026-08-26-hardening-auditoria-privacidade-e-observabilidade.md`, ordenadas por dependência e
não por preferência. **`executor: claude`**, e a razão está escrita no handoff: a poda escreve por
consulta crua, o que PARECE violar a lei §5.2 e a lição 5 e é exatamente o oposto delas — apagar
trilha não pode gerar trilha —, e errar isso não quebra teste nenhum, gera auditoria da auditoria em
produção, em silêncio. Somam-se cinco números com gatilho de revisão durante a execução e três
arquivos do caminho de autenticação que o bloco anterior deixou com risco medido no comentário. O
Codex entra **depois**, na revisão independente pelo `/revisar-sprint`.

Dois desvios de implementação ficam declarados no próprio plano, nenhum de escopo: a poda executa
descarte antes de anonimização (mesmas janelas, menos trabalho) e o canal de log é endereçado por
nome em vez de por `LOG_CHANNEL` (mesmo destino, determinístico no teste, e o desenvolvimento ganha
o mesmo canal).

**Transição para `executing` registrada tarde — 2026-08-26.** A execução via
`subagent-driven-development` já ia da Task 1 à Task 8 quando este arquivo mudou de
`ready_for_execution` para `executing`; o procedimento pede a transição no mesmo commit da primeira
task durável (Task 1, `cbe3f711`), e isso não aconteceu ali. O ledger (`.superpowers/sdd/progress.md`)
e o `git log` da branch são a prova de que o trabalho é contínuo desde então — nenhuma task foi
pulada ou refeita por causa da lacuna; é disciplina de registro atrasada, não um estado real
diferente do que o `state.md` já deveria dizer.

**As nove tasks fecharam e a lane vai a `ready_for_review` — 2026-08-27.** Ciclo completo de
`subagent-driven-development`: implementador por task, review de task (spec + qualidade) atrás de
cada uma, subagente de correção para achado Crítico/Importante, re-review, e um review final da
branch inteira no modelo mais capaz, seguido de re-review da onda de correções. Evidência task a
task em `.superpowers/sdd/progress.md`.

O review final da branch achou **um Crítico, e ele era real**: o canal `seguranca` lia
`env('LOG_LEVEL', 'debug')`, e `backend/.env.production.example:45` fixa `LOG_LEVEL=warning` — sete
dos oito eventos de `EventoDeSeguranca` saem em `info`, então **em produção o canal inteiro do
`RNF-SEC-05` estaria mudo menos o alerta**, no único ambiente em que a spec importa. O nível virou o
literal `'info'`, com catraca provada por inversão, e o porquê ficou escrito no próprio
`config/logging.php`. Os demais achados foram corrigidos na mesma onda: guarda de `try/catch` na
costura do handler global (mesma catraca 5, agora protegendo a resposta de erro e não só o e-mail),
`withoutOverlapping(60)` nas duas podas, resolução de conexão da migration alinhada ao comando, e o
teste de login falho real refeito com `freezeTime()` — ele era o único ponto do bloco que ainda
corria contra o relógio de verdade, e falhou uma vez em nove execuções da suíte antes da correção.

**Três decisões do João ficam abertas antes do fechamento, registradas e não corrigidas em silêncio.**
O review final mediu três lacunas no **escopo** da D6 — senha certa em conta desativada não gera
alerta prioritário, o alerta de login falho não carrega o `chave_hash` que liga ao rastro, e
password spraying entre contas não acumula em família nenhuma porque tudo chaveia em `email|ip`. O
detector faz exatamente o que a D6 escreveu; mudar qualquer das três é redefinir a D6. Foram para a
**P-63**, que já era a ficha da assimetria de ADR entre D5 e D6/D7/D8, porque é a mesma conversa. A
lacuna de índice da poda de `login_logs`, medida nos reviews das Tasks 1 e 4 e fora do escopo do
plano nas duas, virou a **P-64**.

**Review do bloco e os seis achados corrigidos — 2026-08-28.** Bloco classificado **alto risco**
(migration nova, caminho de auth/Sanctum, trilha de auditoria com peso legal e a costura de 403),
então o review veio com a segunda lente independente do Codex em sandbox read-only. Nenhum órfão,
nenhuma dependência nova, nenhuma lei da §5 ferida. Seis achados, **todos aprovados pelo João e
corrigidos na mesma sessão**, cada um com a catraca vista reprovando antes de valer (lição 10):

- **Q-1 🔴 — a contenção da catraca 5 era assimétrica.** O review anterior blindou a costura do
  handler global e parou aí: `AuthController::login()`/`logout()` e `EnsureAccountIsActive` seguiam
  chamando log e detector sem guarda. Um canal de log fora do ar transformava o `422` de senha
  errada num `500` — e no middleware era pior, porque a linha de observabilidade sai ANTES de
  `session()->invalidate()` (ordem exigida por `EventosDeAcessoTest`): a exceção subia com a sessão
  da conta desativada **ainda viva**. A contenção foi para DENTRO do `EventoDeSeguranca` e do
  `DetectorDeAcessoSuspeito`, cobrindo os sítios que ainda não existem, e a catraca nova
  (`ObservabilidadeContidaTest`) quebra a dependência real — canal, limitador, cache —, não a classe
  contida: as sete asserções reprovaram com a proteção removida.
- **Q-2 🟡 — o serviço `scheduler` não tinha catraca.** `PodaAgendadaRatchetTest` provava as entradas
  do `Schedule`; nada provava o container que as executa, e apagar o serviço deixava a suíte inteira
  verde com a poda parada em produção. Entrou no `compose-prod.test.ts`, que já é a catraca desse
  arquivo — provado apagando o bloco.
- **Q-3 🔴 — `operacao-segredos.md` §5 prometia uma revogação que o próprio procedimento impedia.**
  Dizia que rotacionar o `APP_KEY` derruba toda sessão viva, enquanto mandava mover a chave velha
  para `APP_PREVIOUS_KEYS` — e `Encrypter::getAllKeys()` devolve `[$this->key, ...$this->previousKeys]`
  com o `decrypt()` percorrendo a lista inteira, então o cookie antigo **continua abrindo**. O erro
  apontava para o lado perigoso: quem rotacionasse para expulsar sessão roubada acreditaria ter
  revogado o que seguia valendo. A seção virou dois procedimentos separados — 5.1 planejada (não
  derruba ninguém) e 5.2 por comprometimento (chave velha fora da lista **mais** `DELETE FROM
  sessions`, porque só a chave não garante).
- **Q-4 🟡 — o inventário de segredos não tinha o segredo de e-mail que produção usa.** Documentava
  SES pelo par IAM, mas `.env.production.example:106` seleciona `MAIL_MAILER=smtp`, cujo segredo é
  `MAIL_PASSWORD`. Entrou no inventário e ganhou procedimento de rotação com a prova certa — um
  e-mail de teste que chega —, porque e-mail é a única superfície do inventário cuja falha é
  assintomática do lado de dentro. O bloco SES ficou marcado como caminho do item 10, não corrente.
- **Q-5 🟡 — `getMessage()` cru podia levar endereço de e-mail ao log default.** A exceção de
  transporte do Symfony Mailer carrega a resposta do SMTP com o destinatário dentro. Os dois `catch`
  passaram pela `FalhaDeObservabilidade` nova, que registra classe/código/origem e **nunca** a
  mensagem; a catraca planta um `550 ... <vitima@lotus.cl>` e exige que ele não apareça em log
  nenhum.
- **Q-6 🟢 — a fase de anonimização da poda não tinha teste de chunk.** O teste existente plantava
  linhas de 6 anos, ou seja, exercitava só o descarte; o laço com risco de não terminar é o do
  `UPDATE`. Coberto, e provado com a regressão simulada (uma passada só deixa 5 linhas com PII).

**Um sétimo defeito apareceu por rodar a suíte que o review anterior não rodou.** `pnpm test` estava
**vermelho no `HEAD` do bloco**: o ADR-21 cita `backend/config/logging.php:134-142` e a spec por
faixa de linha, e a catraca `repo-docs-refs` não sabia ler o sufixo `:NN-NN` — path com número de
linha nunca resolvia. Corrigido no lado da catraca, não da doc: citação line-precise é a convenção do
projeto, e a guarda agora recorta o sufixo **e confere** que o arquivo tem a linha citada. Ficou
estritamente mais forte que antes — reprova citação que aponta para além do fim do arquivo, defeito
que passava batido. Suíte final: backend `1047 passed, 5 skipped`; frontend `607 passed`, lint e
build limpos.

**Duas lanes com estado durável fora da `main`, medido na promoção e não tocado aqui.** O fechamento
do item 11 (`ce651752`, `lane-b`) vive só em `cicd/ci-governanca-e-artefato`, e a promoção do item 8
mais spec e plano (`323f58bd`, `c98fed91`, `4fdc1338`, `lane-c`) vivem só em
`refactor/frontend-hardening-final`. Por isso o `state.md` da `main` ainda descreve a `lane-b` em
`ready_for_closure` e a `lane-c` em `idle`. **A invariante de dono manda: nenhum dos dois blocos foi
escrito por este commit** — cada lane espelha o seu na árvore em que roda, e a divergência se resolve
na integração serial. Não há colisão de escopo com este bloco: o item 8 é frontend puro, o item 11
não tem trabalho de código restante.

**A `lane-b` fechou o `compose-por-worktree` em 2026-08-24, voltou a `idle` e recebeu o item 11 no
mesmo dia**, por promoção explícita do João. A narrativa do bloco anterior está em
`historico/state-archive.md`; a entrega, em `historico/progress.md`. Nenhuma lane recebe item novo
sozinha: promoção é do João, contra o `backlog.md`.

**Promoção do item 11 — 2026-08-24.** O `backlog.md` marca o item como `Contexto: sim`, então a lane
nasce em `context_required`: o Context Packet vem antes do `/planejar-bloco`, e o packet é do Codex
(`.agents/skills/lotus-context-packet`), em sandbox read-only. A branch sai de `main@6e8e8618`, que já
é `origin/main` — as três lanes anteriores mesclaram.

**Fora de ordem em relação ao item 10, de propósito.** O `backlog.md` recomenda `10→11→12`, mas o que
sobrou do item 10 é o `infra-producao-provisionamento-aws` (EC2, RDS, S3, SES, TLS), travado nas
quatro decisões do João que o bloco do runtime mediu como abertas. O item 11 é GitHub, GHCR e
governança de branch — **não toca conta AWS**. Quem depende de recurso real é o item 12
(`SSH EC2 → compose pull`), e ele continua atrás do 10. A dependência que o 11 realmente tem é o
runtime, e esse fechou em 2026-08-22 (PR #67): é a imagem dele que a CI vai construir e etiquetar por
SHA.

**A interseção que a seleção de 2026-08-22 previu não existe — medida e desfeita.** Aquela seção
escreveu que o `BD-15` e a futura CI tocavam `.github/workflows`; era previsão, não medição. O
Context Packet mediu: não há `.github/` nesta árvore, `git log --all -- .github/workflows` volta
vazio, e a PR #66 (BD-15) não lista o diretório. **Todo workflow deste bloco nasce do zero** — não há
o que preservar, e não há colisão a vigiar com a lane-c.

**A `lane-c` fechou o item 17 em 2026-08-24** — `tabelas-coluna-de-acoes-e-largura`, narrativa
integral em `historico/state-archive.md`. A worktree `../fix-frontend` e a branch
`refactor/tabelas-coluna-de-acoes` seguem vivas: a branch **ainda não foi mesclada**, é o PR a
abrir. A lane não recebe item novo sozinha: promoção é do João, contra o `backlog.md`. O
fechamento mediu a suíte do backend em **906 passed / 5 skipped** depois de reconstruir a imagem
`app` desta worktree — a antiga era anterior ao `memory-cli.ini` e o §6 do `CLAUDE.md` fatalava por
memória nela. Está registrado como **P-57**, e é ambiente, não código: o bloco não toca `backend/`. O merge
da `main` (PR #70) entrou aqui e o gate foi refeito sobre ele: lint 0, build verde, **102 arquivos /
573 testes** — os 3 casos de `tests/compose-dev.test.ts` que reprovavam eram o `frontend/.env` desta
árvore com `VITE_API_URL` legado, que o teste não afasta; virou a **P-58**.

**Review do item 11 — 2026-08-25.** Bloco classificado **alto risco** (paga o mecanismo da lei §5.3
e faz merge, publicação em GHCR e mudança de configuração de repositório — ações externas
irreversíveis), então a revisão do gabarito veio acompanhada de uma segunda lente independente do
Codex, em sandbox read-only. Três achados aprovados pelo João e corrigidos no mesmo dia; a
divergência entre os revisores está registrada abaixo, não resolvida em silêncio.

- **Q-1 — o par `app`+`web` não era publicação atômica.** O `concurrency` do workflow usava
  `cancel-in-progress: true` com `group: ci-${{ github.ref }}`, e `github.ref` é constante para todo
  push em `main`: um segundo push cancelava o job `image` do primeiro no meio da publicação. Somado a
  isso, os dois alvos eram construídos **e** publicados em passos sequenciais, então uma falha comum
  de build entre eles deixava o SHA com meia release no GHCR. Corrigido em duas frentes: o
  cancelamento passou a valer só fora de `push`, e o job constrói os dois alvos antes de publicar
  qualquer um, com `scope` de cache separado por alvo e um passo final que **afirma** que os dois
  manifestos existem — o "release é o par" do DoD3 deixou de ser confiança em dois passos verdes.
- **Q-2 — "imutável" não estava garantido.** As quatro imagens base do `Dockerfile.prod` vinham por
  tag móvel, então reconstruir o MESMO commit meses depois publicaria um digest diferente sob a mesma
  tag de SHA — o objetivo §2 da spec inteira. As quatro passaram a ser fixadas por digest (capturados
  em 2026-08-25, com o comando de atualização no cabeçalho do arquivo). O que o digest **não** fixa é
  o índice do apk, e por isso o `image` ganhou uma guarda de idempotência: tag de SHA que já existe
  não se reescreve, e só se republica quando falta metade do par.
- **Q-3 — o `procedencia` confiava num trailer que nunca conferiu.** No corporativo a árvore limpa é
  o normal, não uma propriedade especial: bastava uma linha `Source-Commit:` inventada num push
  direto para o commit se passar por release de espelho — e essa é a única camada entre o push e uma
  imagem publicada, porque a branch protection é o que o plano free não dá. Agora o SHA do trailer
  precisa ser 40 hexadecimais **e** estar no histórico de `main` da origem
  (`compare/main...<sha>` = `identical` ou `behind`). Quem responde qual é a origem é a variável de
  repositório `ESPELHO_FONTE`, definida só em `Gatika-CL/lotus` — o arquivo segue sem nome de dono, e
  onde a variável não existe o caminho de espelho não abre. `Andred21/lotus` é público, então o
  `GITHUB_TOKEN` do corporativo faz a consulta sem PAT.

**Divergência entre os revisores, registrada.** O Codex levantou oito candidatos; três viraram os
achados acima depois de verificação própria no código, e os demais não passaram: um lia o escopo do
desenho ao contrário (a auto-restrição do caminho de espelho no repositório pessoal é intencional, não
um furo). Os dois sobre o `espelhar-corporativo.sh` eram reais e **o João mandou corrigir na mesma
rodada**: a lista de exclusões passou a sair do blob do commit espelhado, não do disco da árvore —
os dois leitores da lista voltam a ler a mesma versão, e o vazamento deixa de acontecer antes de o
destino reprovar —, e o script passou a recusar commit cujo CI não esteja verde, com a saída
`LOTUS_ESPELHO_SEM_CI=1` pela mesma razão que o `pre-push` tem a dele. Provado com `origin/main` em
`26d0e3e9`, que é a própria sonda vermelha: modo real aborta com `exit 1` antes de qualquer push, e
sujar a cópia local do `.espelho-exclusoes` não muda a árvore filtrada (`ecd187e9` nos dois casos).

**As correções provadas no gatilho real — 2026-08-25.** PR #75 mesclado em `ac078a80`, run
[32901859725](https://github.com/Andred21/lotus/actions/runs/32901859725): sete jobs,
`conclusion: success`, `procedencia` e `image` verdes, par publicado em `ghcr.io/andred21`. A guarda
de idempotência foi medida re-executando o job `image` no mesmo SHA — os quatro passos de build e
push saíram `skipped`, a verificação do par continuou rodando e os dois digests ficaram idênticos.
Só o `concurrency` fica sem prova direta: provar exigiria dois merges em segundos, e o custo não
paga o que a leitura do `github.ref` já diz. Evidência integral em
`audits/2026-08-24-cicd-evidencias.md`.


## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-08-25 | `hardening-api-arquivos-e-abuso` | Item 4 da fila |
| 2026-08-25 | `frontend-revisao-ui-por-modulo` (fatia 2 de 2) | Item 16 da fila |
| 2026-08-24 | `certificacao-historico-do-aluno` | Item 2 da fila |
| 2026-08-24 | `tabelas-coluna-de-acoes-e-largura` | Item 17 da fila |
| 2026-08-24 | `compose-por-worktree` (paga a **P-03**) | Fora da fila — ficha `P-03` |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
