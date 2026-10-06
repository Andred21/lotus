# Backlog — Lotus v2

> Fila ordenada de trabalho **futuro**. Não representa a etapa atual e nunca autoriza execução
> sozinha: um item só fica ativo por promoção explícita em `docs/superpowers/state.md`, e o
> backlog nunca promove trabalho sozinho.
>
> **Consolidado em 2026-08-22 contra `main@bda90ce`, com foco em terminar a aplicação.**
> **Saneado em 2026-08-31 contra `main@a304f317`:** os itens 6, 7, 18, 19 e 20 fecharam e
> saíram da contagem, a `D-60` saiu **paga** (por bloco que não era o hospedeiro dela) e a
> `D-61` foi **absorvida pela `D-67`** — eram o mesmo defeito registrado duas vezes.
> **Reorganizado em 2026-09-03 contra `main@182be2ab`, a pedido do João.** Quatro mudanças, todas
> de arrumação — nenhum escopo entrou ou saiu de ficha:
> 1. a fila passou a ser apresentada **na ordem de execução** (seção própria abaixo), em vez da
>    ordem de chegada dos números;
> 2. as cinco notas de saneamento de 2026-08-28 a 2026-09-03 viraram **uma tabela** — cada uma
>    descrevia ficha que já não está aqui, e o rastro que guardavam cabe em uma linha;
> 3. `# Decisões não promovíveis isoladamente` e `## Travados em decisão` eram **a mesma lista
>    escrita duas vezes** (`D-09`, `D-10`, `D-11`, `D-16`, `DS-05`, `DS-07` em ambas): viraram uma
>    seção só, com tabela-índice e ficha em prosa embaixo. A `D-65` saiu de lá porque **tem
>    hospedeiro** (item 23) — débito com bloco não é decisão travada, e a ficha inteira desceu para
>    `# Débitos técnicos`;
> 4. o texto riscado dos itens 16 e 10 saiu: `~~D-38~~` e `~~Comercial~~` são registro de bloco
>    fechado, que vive em `historico/progress.md`.
>
> O **27** (`frontend-arrumacao-de-testes`), item novo da passada de 2026-09-03, **fechou em
> 2026-09-04** e saiu desta fila. Entrega em `historico/progress.md`; a `P-58`, que ele pagou,
> está em `pendencias/encerradas.md`.
> O **16** (`frontend-revisao-ui-por-modulo`) **fechou em 2026-09-27** com a fatia 3 (Cursos, Pessoas
> e Administración) e saiu desta fila. Entrega em `historico/progress.md`; a `D-59`, que ele pagou,
> está na tabela de fichas que saíram, e os achados que não couberam viraram `D-71` e `D-72`.
> O **23** (`frontend-tabelas-reserva-e-rolagem`) **fechou em 2026-09-28** e saiu desta fila em
> 2026-10-01, pela PR da própria lane — desvio da invariante 10 decidido pelo João e registrado na
> `P-92`. Entrega em `historico/progress.md`; a `D-65`, que ele pagou, está na tabela de fichas que
> saíram, e o resíduo do diálogo do Alumno virou a `P-94`.
> Histórico entregue → `historico/progress.md` · fichas `P-*` → `pendencias/abertas.md` ·
> specs/planos → `specs/archive/` e `plans/archive/`. Não duplicar esses conteúdos aqui.
> O registro canônico dos débitos `D-*` segue neste arquivo, na seção `# Débitos técnicos` —
> entrar num bloco não move nem apaga a ficha; a remoção acontece no `/finalizar-bloco` do bloco
> que a paga (item 6d).
>
> **Planejamento just-in-time (CLAUDE.md §4):** o roadmap vive como título e escopo, não como
> plano pronto que envelhece. Spec e plano se escrevem imediatamente antes da execução; limites,
> números e decisões ainda não aprovados se resolvem no brainstorming, não congelados aqui.

## Fluxo

`seleção explícita → context_required (quando indicado) → /planejar-bloco → /executar-bloco →
/revisar-sprint → /fechar-sprint`

- A ordem da seção seguinte é recomendada por dependência/risco; **não promove automaticamente**.
- `Contexto: sim` exige Context Packet atual antes do planejamento.
- Bloco fechado sai desta fila; o rastro fica em `historico/progress.md`.
- **A numeração não ordena e não se renumera.** Quem ordena é a seção *Ordem de execução*; o número
  é identidade estável, citada pelas fichas de `pendencias/` e pelos próprios blocos, e renumerar
  quebraria as citações e pareceria promoção. O `1` e o `14` saíram em 2026-08-22, o `3` em
  2026-08-23, o `2` e o `17` em 2026-08-24, o `4` em 2026-08-25, o `11` em 2026-08-26, o `8` em
  2026-08-27, o `5` em 2026-08-28, o `6` e o `18` em 2026-08-29, o `7` e o `19` em 2026-08-30, o
  `20` em 2026-08-31, o `21` em 2026-09-01, o `24` em 2026-09-02, o `25` e o `26` em 2026-09-03, o
  `22` e o `27` em 2026-09-04, o `10` e o `28` em 2026-09-20, o `29` em 2026-09-25 e o `16` em 2026-09-27. O `10` é o único que **encolheu antes de
  sair**: o runtime foi entregue em 2026-08-22 e a ficha ficou só com o provisionamento, que fechou
  agora. A fila salta os números que já fecharam, de propósito.
- **Item novo entra com número novo, e o lugar dele na fila é o da dependência, não o do número.** O
  `16` nasceu assim em 2026-08-22, o `17` em 2026-08-24 e o `21` e o `22` em 2026-08-31 — os dois
  **abertos pelo João**, recortando por frente as onze fichas travadas em decisão que nenhum bloco
  hospedava; o `24` em 2026-09-02, do candidato 1 da revisão de arquitetura registrada em
  `audits/2026-09-02-arquitetura-deepening.html` — o `backend-projecao-de-arquivados`, fechado em
  2026-09-02; o `25` em 2026-09-02, aberto pelo João para juntar as dívidas de frontend que se
  provam por mecanismo e que nenhum bloco hospedava (`P-68`, `P-69`, `P-70`, `P-30`, `P-42`,
  `D-69`) — **fechado em 2026-09-03**; o `26` em 2026-09-02, também aberto pelo João, juntando o
  **candidato 6** do mesmo review de arquitetura com as três fichas de backend que nenhum bloco
  hospedava (`P-71`, `P-72` e a metade de comportamento da `P-60`) — **fechado em 2026-09-03**; e o
  `27` em 2026-09-03, do levantamento de frontend pedido pelo João, medido contra `main@24bf770c`
  — **fechado em 2026-09-04**; e o `28` em 2026-09-20, aberto pelo João a partir da leitura do
  harness do `Ela-Decora/ElaDecora-Brain` — **fechado em 2026-09-20**; e o `29` em 2026-09-21,
  aberto pelo João a partir do agrupamento das 33 fichas de `pendencias/abertas.md` por "lado" —
  três chaves de `backend/config/` que nenhum bloco hospedava (`P-79`, `P-75`, `P-59`) — **fechado em
  2026-09-25**.
  O `30`, o `35`, o `36` e o `37` nasceram em 2026-09-26, abertos pelo João a partir da comparação
  do harness do Lotus com o do `Ela-Decora/ElaDecora-Brain@5eb74c0`; o `30` **fechou em
  2026-09-26**. **Os três últimos nasceram `31`, `32` e `33` na branch do `30`, sem chegar aqui, e
  foram renumerados em 2026-09-27** na integração do `30`, porque esta fila publicou antes o `31` a
  `34` de infra: renumera quem chega depois. **A ficha que uma sessão de 2026-09-21 rascunhou como
  "29 `harness-politica-de-modelo-e-esforco`" nunca foi commitada e colidia com o `29` real**: a
  parte A dela foi absorvida pelo `35`, e a parte B virou o `37`.
  O `31` nasceu em 2026-09-26, aberto pelo João juntando a `P-88` e a `P-87` pelo gatilho comum
  (o próximo commit que mudar `deploy/bin/deploy.sh`), com a `P-86` condicional. **O `30` foi
  saltado**: a branch órfã `chore/30-harness-estado-por-bloco` (`../lotus-harness`) já o usa sem
  ficha aqui, e reusá-lo apontaria duas coisas com o mesmo número. O `31` **fechou em 2026-09-26**.
  O `32`, o `33` e o `34` nasceram em 2026-09-26, abertos pelo João a partir do levantamento cruzado
  de infra (`docs/` × GitHub × Notion × Drive) daquele dia: o `32` junta a **P-77** — reescrita,
  porque a zona `lotusotec.cl` foi delegada ao Route 53 em 2026-09-26 pelo `Andred21/lotus-site` e a
  causa passou de "painel sem acesso" para "registro nunca criado" — ao runbook §11 que nunca rodou;
  o `33` e o `34` são os dois blocos que a spec do item 10 v2 prometeu como "bloco próprio, a criar
  pelo João no main tree" (`specs/archive/2026-09-02-infra-producao-provisionamento-aws-design.md:53-58`)
  e que nunca entraram nesta fila.
  **O `frontend-campo-de-formulario-liga-no-form` foi registrado como "item 24" na `lane-c` sem
  nunca ter ficha aqui**; o rótulo foi corrigido no fechamento da lane-a, por decisão do João, e
  **nenhum número foi reusado nem renumerado**. O `15` fica queimado, porque chegou a nomear o
  `BD-15` durante uma inserção que foi desfeita, e reusá-lo apontaria duas coisas diferentes com o
  mesmo número.
- **O 16 e o 17 chegaram aqui pelo merge da `lane-c` em 2026-08-24.** Até ele, a fila canônica dos
  dois morava na branch `refactor/frontend-revisao-ui` (`eaa9e15c`, `bef4feb3`), por decisão do João
  em 2026-08-22 — duplicá-los no main tree garantiria conflito no merge sem ganho.

---

# Ordem de execução

Recomendação por dependência e risco, decidida em 2026-09-03 e **emendada em 2026-09-21**, por
decisão do João: o **22** saiu da tabela — fechou em 2026-09-04 e a linha ficou para trás por 17
dias —, e o **29** entrou na frente. O **29** saiu em 2026-09-25, fechado; as posições abaixo dele
subiram uma casa sem mudar a ordem relativa. O **12** saiu em 2026-09-26, fechado, e o **13** subiu
uma casa. O **31** entrou na posição 0, promovido pelo João, e saiu no mesmo dia, fechado; as
demais posições não se moveram. O **16** saiu em 2026-09-27, fechado; as posições abaixo dele subiram
uma casa sem mudar a ordem relativa. O **23** saiu em 2026-10-01, fechado em 2026-09-28, e as
posições abaixo dele subiram uma casa do mesmo jeito. **Emendada em 2026-09-26:** o **32** entra
na posição 1 — a produção roda na "fase sem DNS" do runbook e por isso **recusa emitir certificado**, que é a função
central; o **33** entra logo atrás, porque produção não entrega e-mail nenhum, nem o alerta de
segurança; o **34** entra antes do **13**, que é gate de medição e não constrói alarme. Os três são
da frente Infra (lane-b) e não disputam árvore com os de Frontend (lane-c) — a ordem que vincula é a
de cada frente. **Não promove nada** — promover segue sendo ato explícito no `state.md`. A fila
abaixo está escrita nesta ordem.

| # | Bloco | Frente | Por que aqui |
|---|---|---|---|
| 2 | **9** `administracao-roles-permissoes-redesign` | Frontend | Exige Context Packet e brainstorming, e é o único candidato que sobrou para a `D-34`. A colisão com o 16 saiu com ele — ver a nota abaixo |

**A colisão 16 × 9 saiu com o 16, em 2026-09-27.** O João levou a fatia 3 **inteira**, com a run de
Administración dentro, aceitando que o 9 possa redesenhar a tela depois: o relatório
`audits/2026-09-04-lotus-ui-review-administracion.md` mede a tela **atual**. Se o 9 redesenhar, a
tela nova pede run própria dentro dele.

## Aguardando aceitação

Bloco que mesclou em `blocked` esperando a prova do efeito externo (`state.md`, invariante 11). A
linha entra no fechamento da lane do bloco, quando o `aceitacao.sh conferir` sai PENDENTE, e sai no
fechamento da lane de aceitação, junto com a ficha (`/finalizar-bloco`, item d do Passo 6). Ficha
listada aqui não se planeja de novo: o caminho é `/finalizar-bloco <NN>` no main tree.

| Bloco | Itens pendentes | Desde |
|---|---|---|
| **34** `infra-producao-observabilidade` | 7 | 2026-10-05 |
| **13** `go-live-confiabilidade-e-recuperacao` | 2, 5, 6 | 2026-10-06 |

---

# Fila priorizada

## 9. `administracao-roles-permissoes-redesign`

**Prioridade:** P1 · **Frente:** Frontend · **Contexto:** sim
**Fonte:** referência visual atual + ADR-07.

**Objetivo:** redesenhar a tela apenas se o protótipo atual continuar sendo a referência desejada.

**Importante:** Notion `2.6.3` está **Concluída** e corresponde à implementação original. Este
redesign é trabalho novo e precisa de nova task/EAP se for mantido. Exige brainstorming — é
redesenho de tela, não refinamento visual.

**Colisão com o item 16, resolvida em 2026-09-27:** o 16 fechou com a run de Administración feita
sobre a tela atual (`audits/2026-09-04-lotus-ui-review-administracion.md`). Se este bloco
redesenhar, a tela nova pede run própria aqui; se mantiver, aquele relatório vale.

**Escopo:** lista de roles + detalhe + matriz de permissões; permissões essenciais protegidas;
criação/edição de role customizada; nunca criar permissions arbitrárias pela UI.

**Candidato a hospedeiro da `D-34`** — é o único que sobrou, e escolher é do João.

**DoD:** referência aprovada e produto convergem sem enfraquecer ADR-07.

---

## 34. `infra-producao-observabilidade`

**Prioridade:** P1 antes do go-live · **Frente:** Infra · **Contexto:** sim · **Depende:** 32
**Fonte:** spec do item 10 v2 (mesmas linhas 53-58 — "CloudWatch agent, alarmes de app; bloco
próprio"); Notion admin `10.1.8` (healthcheck + alerta de queda, CloudWatch básico); Drive ADR-14
("healthcheck + alerta de queda `[FASE 2]`"); `deploy/bin/verificar-backup.sh` e o tópico SNS
`lotus-alertas` (item 12); `docker-compose.prod.yml` (healthchecks de container, sem alerta fora do host).

**Por que existe:** hoje o único alerta que sai do host é o de backup atrasado (SNS). Queda do `app`,
disco cheio, 5xx sustentado, certificado a vencer — ninguém é avisado. A spec do item 10 v2 prometeu
este bloco e ele nunca entrou na fila; o item 13 lista "alertas/health", mas é gate de medição, não o
construtor.

**Escopo:**
- CloudWatch agent na EC2 (via `user-data.sh`, versionado): disco, memória, logs do nginx/app com
  retenção decidida;
- alarmes mínimos → SNS `lotus-alertas` já existente: instância/`/up` fora, disco acima do limiar, 5xx
  sustentado, certificado a menos de N dias (ou a saída do `certbot renew --dry-run`);
- destinatário do SNS real (e-mail do item 33 ou o mesmo canal do Budget);
- custo dos alarmes dentro da conversa da `P-80`.

**Fora:** APM, tracing, dashboards; auditoria de aplicação (já é `owen-it/laravel-auditing`).

**Depende de:** item 32 (alarme de certificado só faz sentido com TLS); item 33 recomendado, não
obrigatório (SNS entrega e-mail sem SES).

**DoD:** cada alarme visto disparar por sonda (parar o `app`, encher o disco em laboratório, etc.) e
chegar ao destinatário; `user-data.sh` recria a instância com o agente; medição em `audits/`.

---

## 13. `go-live-confiabilidade-e-recuperacao`

**Prioridade:** último gate P0 · **Frente:** Cross-cutting/Infra · **Contexto:** sim · **Depende:** —
**Fonte:** Drive `RNF-DIS-*`; Notion `11.1.1–11.1.3`; `P-05`, `P-44`, `D-37`.

**Escopo:**
- validar/consolidar migrations (**P-05**);
- **D-37**: conferir agregados arquivados anteriores a `archived_with_parent` (2026-08-18) e
  decidir caso a caso — backfill correto não existe;
- rodar migrations + roles/permissões em produção;
- **P-44**: limpar/reseedar os dados-sonda usados como evidência;
- smoke `cotação → turma → matrícula → resultado → conclusão → certificado → validação pública`;
- backup + restore real; RPO/RTO; alertas/health; secrets/config final.

**Gate de arquitetura:** `RNF-DIS-02` exige servidor redundante, enquanto ADR-14 define EC2 única.
Não declarar uma EC2 única como atendimento do RNF. Antes do go-live decidir explicitamente entre:
- manter ADR-14 e revisar formalmente o requisito para RPO/RTO + restore; ou
- manter HA/redundância e desenhar a infraestrutura correspondente.

**Emenda 2026-09-26:** o Drive `arquitetura-aws-lotus.md` §4 **já rebaixou** o `RNF-DIS-02` — de
"redundância com failover instantâneo" para "RTO de minutos via redeploy + restore de snapshot", com
trilha para HA futura. O gate deixa de ser decidir do zero e passa a ser **confirmar o aceite da
Lotus** e replicar a decisão no ADR-14. O smoke roda sobre HTTPS (item 32); alertas/health são
construídos pelo item 34 — aqui só se medem.

**DoD:** release, fluxo crítico, backup e restore têm evidência; a divergência de disponibilidade
está formalmente resolvida.

---

# Decisões não promovíveis isoladamente

Executar sem a decisão é escolher no lugar de quem decide. A tabela é o índice; as fichas com
detalhe que não cabe em linha vêm logo abaixo. **As `P-*` moram em `pendencias/abertas.md`** — aqui
ficam só como ponteiro, e a ficha delas é lá.

| ID | Quem decide | Decisão / gatilho |
|---|---|---|
| `D-70` | Lotus | `/validar` diz "contacta a Lotus" sem canal — publicar endereço ou telefone é decisão da Lotus |
| `DS-05` | João | Avatar do Perfil só vira task após medição justificar |
| `DS-07` | João | Mural de credenciais é redesign próprio, com brainstorming |
| `P-74` | João | Botão de severidade reprova AA no claro em 4 das 5 famílias |
| `P-57` | João | `artisan test` fatala por memória em worktree com imagem `app` velha |
| `P-28` | Lotus / João | Fundo final do certificado: aprovar ou corrigir |
| `P-08` | Lotus | Manual varia por curso ou não |
| `P-09` | Lotus | Quarto tipo de documento de turma: confirmar ou descopar |
| `P-10` | Lotus | Tabela de alunos exibe Cliente ou não |
| `P-13` | Lotus | Turma terá código próprio ou não |
| `P-16` | Lotus | Aba inicial de Turma |

- **D-70** · **`/validar` diz "contacta a Lotus" sem canal** — o item 21 (`D-67`) pôs a linha de
  orientação no ramo `notFound` dos três locales, **sem canal**: publicar endereço ou telefone numa
  página aberta é decisão da Lotus, não do João sozinho. Enquanto não houver canal, a orientação
  termina num beco. Precisa da Lotus antes de virar código. **Gatilho: decisão da Lotus.**

- **DS-05** · O avatar de `/perfil` é `scale-200` sobre imagem pequena. Deixado fora do BD-16 por
  decisão explícita; a Task 15 mediu que não recorta. Estética — só vira task após medição
  justificar.

- **DS-07** · O mural de credenciais como assinatura da tela inverte a ordem da spec D1 e é bloco
  próprio, com brainstorming.

---

# Futuros

- **FUT-1 · Templates genéricos de documentos de turma** — além do Manual já existente, somente
  após desenho com a Lotus. O manual PDF/DOCX pré-preenchido já cobre a fatia "baixa, preenche à
  mão, sobe" do tipo `MANUAL`; futuro é o mecanismo genérico (`PRUEBAS`, `EVALUACION_REDATOR`) e o
  preenchimento online.
- **FUT-2 · Ancoragem cross-módulo** — padronizar deep-link/seleção quando houver recorrência
  real; o caso turma→orçamento já existe.
- **FUT-3 · Central de notificações** — notificações persistidas na aplicação alimentadas por
  eventos/condições dos domínios; badge/central/leitura primeiro; e-mail apenas como canal futuro
  para eventos críticos. Exige levantamento funcional próprio.
- **FUT-4 · Destinatário de e-mail fora dos usuários internos** — cliente, aluno ou usuário de
  outra empresa recebendo e-mail do sistema. A conta SES está em sandbox por decisão (ADR-23,
  emenda de 2026-10-01): sem production access, cada destinatário fora de `@lotusotec.cl` precisa
  clicar antes num link da AWS. Pré-requisito do bloco que trouxer a feature: pedir o production
  access logo no início (runbook `deploy/aws/README.md` §13.6, cerca de 1 dia útil de espera). Se
  a feature der login a cliente ou aluno, ela também reabre a RN-01 (lei 5 do `CLAUDE.md`).

---

# Débitos técnicos — registro canônico

> Ficha de cada débito vivo. A cobertura por bloco está mapeada na fila; **entrar num bloco não
> move nem apaga a linha daqui** — a remoção acontece só depois do bloco aplicado, no
> `/finalizar-bloco` correspondente (item 6d). Fichas completas anteriores: histórico do arquivo
> no Git (`git log -- docs/superpowers/backlog.md`).

## Agrupados em bloco

> **Fichas que saíram desta fila — rastro de uma linha.** A narrativa de cada fechamento vive em
> `historico/progress.md` e nos commits; aqui fica só o suficiente para ninguém reabrir o que já
> fechou. Substituiu, em 2026-09-03, cinco notas de saneamento que ocupavam ~60 linhas descrevendo
> fichas que já não estão aqui.
>
> | Data | Ficha | Como saiu | Por quem |
> |---|---|---|---|
> | 2026-08-28 | `D-57`, `D-39` | pagas | fatias 2 e 1 do item 16 |
> | 2026-08-29 | `D-62` | paga — catraca `DROPDOWN_SEM_NOME` no `frontend/eslint.config.js`, vista reprovar por sonda negativa no `TurmaStatusFilter` | item 18 |
> | 2026-08-30 | `D-07`, `D-18`, `D-36`, `D-38`, `D-58` | pagas — toda mensagem ao usuário sai de `lang/<locale>/<dominio>.php` sob `LocaleParityTest` e `MensagemLiteralTest`; a `D-38` fechou em três sítios, não no único que a ficha nomeava | item 7 |
> | 2026-08-31 | `D-60` | paga — **não** pelo hospedeiro que ela declarava: a f3 UI-03 do item 19 subiu o motivo do bloqueio para a linha do CTA com `aria-describedby` (`EmissionPanel.tsx:92-105`, `EmissionStudentsTable.tsx:100-101`) | item 19 |
> | 2026-08-31 | `D-61` | **absorvida pela `D-67`** — mesmo defeito registrado duas vezes; a `D-61` fica como ID queimado | saneamento com o João |
> | 2026-09-03 | `D-69` | paga — os quatro sítios de utility de paleta em `features/` morreram e a **partição `files: CATRACA_COR` foi removida**; a prova é o `pnpm lint` verde **sem** a lista, não o grep | item 25, Task 1 |
> | 2026-09-26 | `D-59` | paga — o alternador Activos/Archivados de "Cotizaciones" subiu para o slot `actions` do `AppCardHeader` (`BudgetQuotesCard`) e a régua própria de 56px sumiu, medido nos três viewports (`180bfa1a`, teste em `a3439596`). A ficha seguiu aberta aqui até o Q-2 do review | fatia 3 do item 16 |
> | 2026-09-26 | — (herança da Task 12 da fatia 1, nunca escrita) | **morta antes de nascer** — a recusa em espanhol fixo de `Turma.php:200` já virou `__('operation.turma.concluded_locked')` nos três locales; reconfirmado em `Turma.php:201` nesta leitura. Paga em 2026-08-30, junto com `D-07`/`D-18`/`D-36`/`D-38`/`D-58`, antes de a ficha ganhar nome | item 7 (reconfirmado pela Task 10 da fatia 3 do item 16) |
> | 2026-09-28 | `D-65` | paga — em 1024 a coluna presa não cobre mais nada nas 18 visões com presa, sobre o piso default de 42rem; abaixo de `sm` o `narrowFloorTablePt` medido por visão tira a 1ª coluna de baixo da presa, e o `RowActions` colapsa as ações num `⋮` único, sob a catraca `ACAO_SEM_COLAPSO`. Cursos e Usuarios arquivados ficam como exceção provada, e o diálogo do Alumno, que rola 3px em 1024, virou a `P-94` (`audits/2026-09-27-item23-medicoes.md`) | item 23 |
>
> **O que aqueles fechamentos deixaram aberto, e que não é débito:** cinco recusas literais fora de
> `lang/` viraram a **P-71** e o 419 virou a **P-72** — as duas fechadas depois pelo item 26; a
> legenda do `AppLineChart` fechou como **P-63** em 2026-09-01; e o item 25 abriu a **P-74**. Todas
> em `pendencias/`.

- **D-71 · Rótulos `perm.*` do diálogo de Roles expõem jargão interno (Flujo N, RN-02, soft delete),
  nos 3 locales** → **sem bloco hospedeiro.** UI-04 da run de Administración de 2026-09-26
  (`audits/2026-09-04-lotus-ui-review-administracion.md`), classe `B`. Em `/administracion` >
  "Roles y permisos" > "Ver" em qualquer role, 9 dos 41 rótulos de `perm.*`
  (`frontend/src/shared/config/locales/es-CL.json:150-190`, conferido vivo nesta leitura) carregam
  referência de especificação ou termo técnico em inglês: `identity_user_delete` diz "Eliminar (soft delete)
  usuarios", e o botão da mesma ação na lista diz "Archivar" — "Eliminar" contradiz o verbo que a
  própria UI usa; os outros oito citam "Flujo N" ou "RN-02" (`commercial_quote_approve`,
  `operation_enrollment_manage`, `operation_enrollment_record_result`,
  `operation_turma_assign_redator`, `operation_turma_complete`, `operation_turma_submit_docs`,
  `certification_certificate_issue`, `certification_certificate_revoke`). **Conferido que pt-BR e en
  carregam o mesmo jargão, nas mesmas linhas 150-190 dos respectivos arquivos** — "Fluxo"/"soft
  delete" em pt-BR, "Flow"/"soft delete" em en, "RN-02" idêntico nos três. Remédio provável: reescrever
  as 9 strings nos 3 locales sem referência interna, alinhando o verbo ao da interface ("Archivar
  usuarios" em vez de "Eliminar (soft delete) usuarios"); só string, nenhuma chave muda. **Quem
  decide o hospedeiro é o João** — candidato natural é o item 9
  (`administracao-roles-permissoes-redesign`), que pode redesenhar o próprio diálogo de Roles, ou um
  bloco de copy/i18n à parte. **DoD:** zero rótulo `perm.*` casando `/Flujo|Fluxo|Flow|RN-\d|soft
  delete/` (uma variante do termo por locale) nos 3 arquivos, e o diálogo de Roles relido no
  navegador em 1440x900 confirmando o texto novo nos grupos de permissão. Origem: UI-04 da Task 7 da
  fatia 3 do item 16 (`frontend-revisao-ui-por-modulo`).

- **D-72 · O KPI "Próximas clases" e a agenda do dashboard do redator contam conjuntos diferentes** →
  **sem bloco hospedeiro.** `RedatorScopeQuery::resumo()` conta `proximas_turmas` com
  `$turma->start_date->isAfter($today)`, **sem teto**; `RedatorScopeQuery::agenda()` recorta
  `starting_soon` por `DashboardWindows::turmaHorizon()`, que é `TURMA_WINDOW_DAYS = 7`
  (`backend/app/Domains/Dashboard/Services/DashboardWindows.php:17`) — os dois conferidos vivos
  nesta leitura. Turma que começa em 10 dias entra no KPI e não aparece em janela nenhuma da agenda —
  foi a turma 6 na run de 2026-08-22, e o payload confirmou `starting_soon`, `ending_soon` e
  `in_progress` vazios. Não se corrige aqui: é backend, e o fence desta fatia proíbe `backend/` — a
  fatia roda em worktree, e tocar backend exige o main tree (P-03). **Quem decide o hospedeiro é o
  João** — nenhum item da fila atual toca
  `RedatorScopeQuery`/`DashboardWindows` hoje. Gatilho: o próximo bloco que tocar o dashboard do
  redator, ou o redesenho do item 9 se ele alcançar o mesmo assembler. Origem: UI-04 da run
  `ready-redator` de 2026-08-22, classe `B`, herança que a Task 12 da fatia 1 do item 16 prometeu e
  nunca escreveu.

- **D-73 · Os dois painéis de tabela do Dashboard transbordam por conteúdo, não por piso** →
  **sem bloco hospedeiro.** `app/pages/Dashboard/admin/CompliancePanel.tsx` e
  `RedatorLoadPanel.tsx` têm `scrollWidth` maior que a tabela: em 1024x768, 749 e 747px sobre
  moldura e tabela de 718, ou seja, 31 e 29px a mais. Antes do item 23 eram 25 e 21px sobre 768. Em
  390x844, 708 e 707 sobre 672. A tabela cabe na moldura (`table` ≤ `frame`, régua do item 23), então
  o que passa é conteúdo de célula, e o piso não mexe nisso. A spec do item 23 (§1, "Fora") mandou
  abrir ficha se o transbordo persistisse depois do piso novo. Ele persistiu, medido no audit
  `audits/2026-09-27-item23-medicoes.md` §6, Observação 1. Não há coluna presa nesses painéis. O
  remédio provável é achar a célula que força a largura (grafia sem quebra ou `min-width` de
  conteúdo) e deixá-la quebrar ou truncar. **Quem decide o hospedeiro é o João.** **DoD:**
  `scrollWidth == clientWidth` no invólucro dos dois painéis em 1024x768 e 390x844, medido no
  navegador. Origem: Q-3 do review do item 23 (`frontend-tabelas-reserva-e-rolagem`).

- **D-74 · A `QueryException` leva a SQL com os bindings ao log default, e com o banco fora qualquer
  `report()` grava e-mail, RUT ou nome** → **sem bloco hospedeiro.** A mensagem da exceção traz a
  SQL com os valores já interpolados (`Str::replaceArray`), em qualquer rota. É anterior ao SES e
  vale para o app inteiro: o item 33 fechou o mesmo vazamento para o destinatário de e-mail (D15,
  `report` de `TransportExceptionInterface` no `bootstrap/app.php`) e deixou esta fatia de fora
  (spec do item 33, §1.3 e §8). O Laravel 13.34 lê `mask_bindings_in_exception_messages` na
  conexão; ligar custa os valores no diagnóstico de erro de SQL, e **a decisão é do João**.
  Gatilho: o próximo bloco que tocar a observabilidade ou `config/database.php`. O débito do
  `report($e)` proposto em 2026-10-01 não nasceu: a D15 o pagou neste bloco. Origem: brainstorming
  de 2026-10-04 do item 33 (`infra-producao-email-ses`).

- **D-17 · `DomainDependencyTest` detecta aresta usada-e-não-declarada, não a contrária** →
  **entregue PELA METADE em 2026-08-22, e a metade que falta tem dono nenhum.**
  **Feito** (`BD-15-docs-guardrails-e-sincronizacao`,
  `plans/archive/2026-08-22-bd15-docs-guardrails-e-sincronizacao.md`): a Regra C do
  `DomainDependencyTest` reprova aresta declarada sem consumidor, lendo a **mesma** varredura da
  Regra B, e foi vista reprovar por sonda. **Fora, por decisão (D4 da spec):** a catraca cobre só
  aresta de **domínio**, nunca permissão. As permissões `feedback.*` órfãs
  (`PermissionCatalog.php:87-89`) eram a instância viva da mesma classe e o
  `feedbacks-resolver-escopo` as removeu **à mão** em 2026-08-22 (`f6b04b45`..`629fcfe6`) — o caso
  vivo virou caso de regressão, e **nada mede permissão órfã hoje**. A próxima nasce igual e ninguém
  vê. Quem absorver isto precisa de uma catraca sobre o catálogo de permissões, não sobre `use`.

- **D-34 · O gate RBAC do Dashboard atravessa o seam como `null`, e o cliente o remonta** →
  **sem bloco hospedeiro desde 2026-08-23.** Estava no item 3 como **condicional** ("só se o
  contrato for tocado"), e a §2 da spec do `hardening-acesso-ownership-e-integridade` o declarou
  **fora**: o bloco tocou `generated.ts` pelo `is_active` de `UserData`, **não** pelo payload do
  Dashboard, e entrar ali abriria `AnalyticsQuery`, o assembler e dois componentes do SPA — frente
  diferente, com a `lane-c` já no frontend. O item 3 fechou e saiu da fila; **este débito precisa de
  novo hospedeiro, e escolhê-lo é do João**. Dos dois candidatos naturais sobrou um: o
  `frontend-hardening-final` fechou em 2026-08-27 sem absorvê-la (conferido na promoção do item 18),
  restando `administracao-roles-permissoes-redesign` (item 9). A visibilidade nasce como quatro
  booleanos em `AdminDashboardAssembler.php:56-62`, passa posicionalmente por
  `AnalyticsQuery::series()`/`::rankings()` e chega ao payload como ausência de dado (sentinela
  `'0.0000'`, `AnalyticsQuery.php:319`); `RankingsPanel.tsx:25` e `SeriesPanel.tsx:54` reconstroem a
  permissão farejando nulo — conferido vivo em 2026-09-03. Medido 2026-08-18 contra `b758068`;
  desfecho do Q-2 do review do B2. Fix: a visibilidade vira campo explícito no payload e módulo
  próprio no backend — toca contrato e regenera `generated.ts` (lei §5.3).

- **D-37 · `archived_with_parent` nasceu sem backfill, e não há como recuperá-lo** →
  `go-live-confiabilidade-e-recuperacao` (item 13). A migration `2026_08_18_000001` entra com
  `false` em todas as linhas: agregado arquivado antes de 2026-08-18 restaura o pai sem os filhos,
  em silêncio. Backfill correto não existe — casar por `deleted_at` (precisão 0) foi recusado pela
  spec, e marcar todo filho arquivado ressuscitaria arquivamento intencional. Sem produção, o
  alcance é só banco de dev. Gatilho: primeiro deploy — conferir agregados arquivados pré-data e
  decidir caso a caso.

---

# Fora desta fila

Dashboard Sprint 5, Meu Perfil Sprint 6, Arquivados/Restauração, `identity-ativacao-acesso-redator`,
BD-1..BD-10, BD-12, BD-13, BD-14, BD-15, BD-16, BD-17 e BD-18 já foram executados/fechados e **não
voltam ao backlog** — rastro em `historico/progress.md`. O **BD-11** não foi executado: dissolveu-se
no `frontend-hardening-final` (item 8), levando a D-03 — e **o próprio item 8 saiu da fila em
2026-08-27**, levando junto as fichas `D-03`, `D-33` e `D-35`, pagas por ele. **Os itens 1 e 14
saíram da fila em 2026-08-22, em lanes paralelas:** `feedbacks-resolver-escopo` (item 1) e
`BD-15-docs-guardrails-e-sincronizacao` (item 14). A numeração restante **não** foi reordenada — a
fila tem buracos de propósito, porque renumerar quebraria toda referência escrita a "item N". O que
o BD-15 deixou aberto vive em `pendencias/` (P-22, P-31, P-32, P-52, P-53), não aqui. Task antiga
com status incorreto no Notion gera sincronização documental, não reimplementação.
