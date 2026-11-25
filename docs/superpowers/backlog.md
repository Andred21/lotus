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
  O `38` nasceu em 2026-10-17, aberto pelo João a partir do levantamento da pasta
  `V2/00. LEVANTAMIENTO INFO JOAO` do Drive: a carga inicial da produção com o histórico da v1.
  O `39` nasceu em 2026-10-17, aberto pelo João quando o smoke da aceitação do `13` recusou emitir
  certificado em produção (`sin_plantilla`). **O `38` foi saltado**: a branch
  `docs/backlog-ficha-38-carga-inicial-producao` já o reserva sem ficha aqui.
  O `40` nasceu em 2026-10-19, aberto pelo João a partir da revisão do `39`: um certificado real
  com nota e asistencia sai em 3 páginas, e a ficha junta a esse achado a revisão geral do
  certificado e a pesquisa do que o torna válido para uma OTEC credenciada.
  O `42` nasceu em 2026-10-25, aberto pelo João a partir da medição de saúde da infra daquele dia
  (`audits/2026-10-25-saude-infra.md`). **Entrou pela PR da própria lane, sem PR de docs
  separada**: desvio da invariante 10 decidido pelo João, para não abrir duas branches, duas
  worktrees e duas PRs. O portão do `lane.sh abrir` leu a ficha de uma cópia provisória no
  `backlog.md` do main tree, desfeita assim que a lane abriu.
  O `43` nasceu em 2026-10-28, aberto pelo João a partir do diálogo de matrícula da Operación, que
  empilhava os campos: a moldura dos diálogos e o tipo dos documentos do orçamento. Entrou pela PR
  da própria lane, com o mesmo desvio da invariante 10 e a mesma cópia provisória do `42`.
  O `46` nasceu em 2026-11-01, aberto pelo João para um lote de até cinco ajustes de interface
  ditados um a um. Entrou pela PR da própria lane, com o mesmo desvio da invariante 10 e a mesma
  cópia provisória do `42`.
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
abaixo está escrita nesta ordem. **Emendada em 2026-10-17, por decisão do João:** o **39** entra na
posição 1 — a aceitação do **13** parou no smoke porque produção recusa emitir certificado com
`sin_plantilla`, e o 13 só volta depois que o 39 mesclar.

| # | Bloco | Frente | Por que aqui |
|---|---|---|---|
| — | **56** `infra-deploy-gate-up` | Infra | Frente própria; pode correr a qualquer momento |
| — | **57** `harness-pontas-e-politicas` | Harness | Frente própria; pode correr a qualquer momento |
| — | **63** `certificacao-virada-validacao-site` | Infra + Backend + Frontend | Fecha a validação no site. Só abre com a página do `lotus-site` no ar e o 61 aceito |
| 10 | **58** `docs-sincronizacao-de-mapa` | Docs | Por último: a P-97 é coordenada de linha que os blocos 50 a 55 deslocam |
| 11 | **9** `administracao-roles-permissoes-redesign` | Frontend | Exige Context Packet e brainstorming. A `D-34` e a `D-71` saíram dele em 2026-11-02 (para o 54 e o 49). A colisão com o 16 saiu com ele — ver a nota abaixo |

**Emendada em 2026-11-02, por decisão do João:** os itens 48 a 58 entram na frente do 9. Os
números iguais na primeira coluna (o 48 e o 49) correm em paralelo, e o `—` corre em frente
própria, sem disputar árvore.

**Emendada em 2026-11-21, na PR das fichas 60 a 62:** os três entram na frente do 58 e do 9. O 58
vai por último de propósito, e os três também deslocam linhas que a P-97 coordena. É uma
proposta: a ordem continua sendo do João.

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
| **13** `go-live-confiabilidade-e-recuperacao` | 2, 5, 6 | 2026-10-06 |
| **60** `codigos-mascaras-comercial-e-avaliacoes` | 1, 2 | 2026-11-23 |

---

# Fila priorizada

---

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

**A `D-34` e a `D-71` saíram daqui em 2026-11-02**, por decisão do João, para o item 54 e o item
49. Se este bloco redesenhar o diálogo de Roles depois do 49, os rótulos `perm.*` já chegam limpos.

**DoD:** referência aprovada e produto convergem sem enfraquecer ADR-07.

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

> **Os itens 48 a 58 nasceram em 2026-11-02**, abertos pelo João para juntar em blocos as pendências
> e os débitos que nenhum bloco hospedava com os achados da revisão de arquitetura do backend
> daquele dia (`audits/2026-11-02-arquitetura-backend.html`, contra `main@d220a04f`). "Card N" e
> "achado 0.N" abaixo são as seções daquele relatório. Decisões do João na mesma conversa, que as
> fichas carregam: recusar cotação com turma em andamento é proibido (50); a matrícula revogada e
> reemissível é pendência no Dashboard (48); a `D-34` e a `D-71` saem do item 9 para o 54 e o 49; a
> P-51 vai inteira para o 51, e a marca de coleção só de entrada vai para o 53. **Não decidido:**
> registrar "não adotar FormRequest nem Policy" em ADR — o João vai estudar o caso (55).

---

## 56. `infra-deploy-gate-up`

**Prioridade:** P2 · **Frente:** Infra · **Contexto:** não · **Depende:** —
**Fonte:** `P-90`, `P-86`.

**Escopo:** o gate `/up` do `deploy.sh` espera o php-fpm novo escutar, com retentativa limitada, em
vez de um `curl` só depois do nginx ficar `healthy` (**P-90**). A **P-86** (o dump pré-deploy nunca
rodou num deploy real) se paga no primeiro release corporativo com migration. Se este bloco não tiver
uma, ela fica com o primeiro bloco do 48 ao 55 que tiver.

**DoD:** um deploy que recria só o `app` passa no gate sem 502, e a evidência está no log do botão.

---

## 57. `harness-pontas-e-politicas`

**Prioridade:** P3 · **Frente:** Harness · **Contexto:** não · **Depende:** —
**Fonte:** `P-95`, `P-83`, `P-32`.

**Escopo:** as doze pontas do item 35 (**P-95**), cada uma corrigida ou com veredito escrito. As sete
decisões de política dos guardas (**P-83**), cada uma decidida pelo João e virada commit. A guarda da
lição 13 passa a conferir classe, e não path (**P-32**).

**DoD:** a P-95, a P-83 e a P-32 estão fechadas, e a suíte do harness está verde.

---

> **Os itens 60 a 62 nasceram em 2026-11-21**, abertos pelo João com um lote de pedidos da Lotus
> (Cursos, Comercial, Operación, Certificación, interface e validação), medidos contra
> `main@c6b06e2f`. O João pediu o menor número de blocos. Ficaram três porque duas divisões são
> reais: a validação tem metade no repositório `Andred21/lotus-site`, e a Certificação precisa do
> código de cotação novo (60) e do download público (61).

---

## 60. `codigos-mascaras-comercial-e-avaliacoes`

**Prioridade:** P1 · **Frente:** Backend + Frontend (Catalog, Commercial, Operation, Identity) · **Contexto:** não · **Depende:** —
**Fonte:** pedidos da Lotus de 2026-11-21 (Cursos 1 e 2, Comercial 1 e 2, Operación 1 e 2,
Interface 1); `P-09`.

**Escopo:**
- **Código do curso.** Todo curso ganha um código `C-<n>` (`C-1`), persistido e imutável, e a tela
  o mostra onde o curso aparece. O molde é o `budgets.code`: `'Scap '.id`, derivado na Action e
  na mesma transação (ADR-17). Os cursos que já existem recebem o código por backfill na
  migration.
- **Código SENCE.** O identificador numérico que o SENCE atribui a um curso registrado vira campo
  do curso, no cadastro e no `der-fisico.md`.
- **`Scap x - R y`.** No código composto da cotação, `Cot y` vira `R y` (`Scap 190 - R1`). O texto
  nasce em `Quote::code()` (`Quote.php:94`) e não é persistido. Os pontos que repetem o formato à
  parte vão junto (`TurmaQueryBuilder.php:110`, os comentários e os testes que o fixam). Toda tela
  que cita uma cotação mostra o código completo: Turmas, **Turmas a configurar**
  (`PendingQuotesPanel`), Certificación e Dashboard. Certificado já emitido não muda, porque o
  `snapshot` é retrato com peso legal.
- **Abas do Comercial.** `Presupuestos` passa a ser a primeira aba (`CommercialPage.tsx:36-71`).
- **Orçamentos no diálogo do cliente.** Uma seção nova lista em tabela os orçamentos do cliente,
  no molde da seção de certificados do diálogo do alumno (`StudentDetailSections`). Ela tem busca
  e dois filtros: estado (aprobado, rechazado, pendiente) e período (semana, mes, año,
  personalizado). O `PeriodFilter` mora em `app/pages/Dashboard/admin/`, e feature não importa de
  `app/`. Por isso ele sobe para `shared/` neste bloco, e o 62 o reusa.
- **Documentos da turma.** O Manual de clase fica como está. `PRUEBAS` e `EVALUACION_REDATOR` dão
  lugar a um quadro de evaluaciones com três slots fixos com tag: Instructor, Cliente (o dono do
  orçamento) e Alumnos. O molde é o `BudgetDocumentsCard`. Só a falta do Manual ou da evaluación
  do Instructor bloqueia a conclusão pelo superadmin (`ConcludeTurmaAction`,
  `TurmaHabilitacaoService`, `TurmaDocumentType::values()`). As de Cliente e Alumnos avisam e não
  bloqueiam. A turma habilitada do status de exibição e o `OperationMetricsQuery` seguem a mesma
  regra. Paga a **P-09**: a Lotus decidiu a taxonomia, e ela não é a dos quatro tipos do Figma.
- **Máscaras.** RUT, telefone e os outros campos com formato ganham máscara na digitação e na
  exibição. O banco guarda o valor cru, sem `.`, `-` nem espaço. Os componentes moram em
  `shared/ui` (lei 6). Antes de trocar, medir como produção grava esses campos hoje, porque a
  carga inicial trouxe RUT da v1.

**Para o brainstorming:**
- De onde sai o número do `C-<n>`: do `id`, como o `Scap`, ou de uma sequência própria.
- Se o código SENCE é único, se é obrigatório e se vai impresso no certificado.
- O que acontece com os arquivos que produção já tem: `EVALUACION_REDATOR` vira Instructor, e
  `PRUEBAS` vira Alumnos?
- E-mail não tem máscara. O pedido quer validação na digitação, normalização (minúsculas, sem
  espaço) ou as duas?

**DoD:** curso novo nasce com `C-<n>`, e cada curso antigo tem o seu. O código SENCE persiste e
aparece no curso. Nenhuma tela mostra mais `Cot`. Presupuestos abre primeiro. O diálogo do cliente
lista e filtra os orçamentos dele. Um teste prova que a turma conclui sem as evaluaciones de
Cliente e Alumnos, com aviso, e é recusada sem o Manual ou sem a do Instructor. RUT e telefone
aparecem formatados e ficam crus no banco, provado por teste e no navegador.

---

## 63. `certificacao-virada-validacao-site`

**Prioridade:** P1 · **Frente:** Infra + Backend + Frontend (Certification) · **Contexto:** não · **Depende:** 61
**Fonte:** spec do 61 (`blocos/61-certificacao-validacao-no-site/spec.md`: §1, entrega 3; §2, decisões 3 e 4; §11); `P-89`; `D-70`.

**Hoje:** o QR de todo certificado leva a `config('app.certificate_validation_url')` + `/validar/{uuid}`
(`CertificateValidationUrl.php:26`), que em produção é o próprio app (`app.lotusotec.cl/validar/<uuid>`),
servido pela `ValidationPage` do SPA (`AppRouter.tsx:34`). O 61 entregou a API pública (consulta por
código + RUT, PDF público, CORS do site), e a página do site é um bloco do `Andred21/lotus-site`, pelo
harness de lá, com o §7 da spec do 61 como contrato.

**Escopo:**
- **QR novo.** `CERTIFICATE_VALIDATION_URL=https://lotusotec.cl` no `.env` de produção e no
  `deploy/aws/env.prod.example`. O caminho `/validar/` já é fixo em `CertificateValidationUrl::para()`,
  então a virada do QR novo é só o env.
- **QR antigo.** `301` de `app.lotusotec.cl/validar/<uuid>` para `https://lotusotec.cl/validar/<uuid>`
  no `prod.conf` e no `tls.conf`, versionado e testável. O `tls.conf` vai ao host por `scp`: divergente
  do repositório, a checagem de alinhamento trava o botão de deploy (`deploy/aws/README.md:762`).
- **Saída da `ValidationPage`.** A rota `/validar/:uuid` do SPA e a página saem do app. A
  `GET /api/publico/certificados/{uuid}` fica, porque o site a usa.
- **P-89** com o endereço novo no gatilho.
- **D-70**, se a Lotus aceitar o canal de contato do site.

**Fora:** conteúdo e layout do PDF (peso legal: muda só o destino do QR); a página do site.

**Para o brainstorming:**
- O bloco só abre com a página do site no ar e provada em `lotusotec.cl/validar/<uuid>`, e com o 61
  aceito em produção. O `301` fica em cache no navegador de quem o recebeu: mesclar antes da página
  existir quebra QR impresso sem volta fácil.
- A ordem no deploy: o env do QR novo e o `301` no mesmo release, ou o env primeiro.

**DoD:** certificado emitido depois do deploy tem QR para `https://lotusotec.cl/validar/<uuid>`, que abre
a página do site com o estado certo. `https://app.lotusotec.cl/validar/<uuid>` responde `301` com
`Location` no site, e um QR antigo impresso chega à validação. A `ValidationPage` saiu do app com a
suíte verde. A P-89 confere o endereço novo. A prova final é contra produção, depois do deploy
(aceitação, invariante 11).

---

## 58. `docs-sincronizacao-de-mapa`

**Prioridade:** P3 · **Frente:** Docs · **Contexto:** não · **Depende:** 50 51 52 53 54 55
**Fonte:** `P-96`, `P-97`, `P-53`, `P-52`, `P-110`, `P-57`.

Vai por último porque a P-97 é de coordenada de linha, e os blocos 50 a 55 mexem nessas linhas.

**Escopo:** os três docs de mapa (**P-96**), as doze coordenadas e mapas (**P-97**), as 12
divergências do BD-15 (**P-53**), a ficha de `invitation_tokens` no `der-fisico.md` (**P-52**), a
faixa de seção de formulário na `frontend-estilizacao.md` (**P-110**) e o §6 do `CLAUDE.md` em
worktree nova (**P-57**). Fecha com uma `auditar-docs` fresca.

**DoD:** as seis fichas estão fechadas, e a `auditar-docs` do fechamento não acusa nada fora de
`pendencias/`.

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
| `P-57` | João | `artisan test` fatala por memória em worktree com imagem `app` velha |
| `P-28` | Lotus / João | Fundo final do certificado: aprovar ou corrigir |
| `P-08` | Lotus | Manual varia por curso ou não |
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
  outra empresa recebendo e-mail do sistema. O pré-requisito do production access foi pago no
  item 59: a conta SES saiu do sandbox em 2026-11-20 (ADR-23, emenda de 2026-11-07), e qualquer
  destinatário recebe sem verificação. Se a feature der login a cliente ou aluno, ela reabre a
  RN-01 (lei 5 do `CLAUDE.md`).

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
> | 2026-11-02 | `D-74` | paga — `mask_bindings_in_exception_messages` nas conexões de `config/database.php`, provado por `backend/tests/Feature/Shared/BindingsForaDaMensagemTest.php` (`d5878d61`) | item 34 |
> | 2026-11-02 | `D-71` | paga — nenhum rótulo `perm.*` carrega jargão interno (Flujo, RN-N, soft delete) nas três locales, sob `frontend/tests/perm-labels.test.ts` (`81f45817`) | item 49 |
> | 2026-11-03 | `D-72` | paga — o KPI "Próximas clases" e a agenda contam o mesmo balde do `AgendaClassifier`; turma que começa em 10 dias saiu em `proximas_turmas` e em `starting_soon` no redator e no admin, contra a API da lane (`a2ebea59`, `b2700c72`) | item 54 |
> | 2026-11-03 | `D-73` | paga — `scrollWidth == clientWidth` nos dois painéis em 1024x768 e, pela leitura emendada, nada passa da tabela em 390x844, medido no navegador (`blocos/54-dashboard-agenda-e-pendencias/medicoes-d73.md` §3, `d78915a7`, `196489c6`) | item 54 |
> | 2026-11-03 | `D-34` | paga — a visibilidade RBAC vira o campo `visibility` do payload (`DashboardVisibilityData`), e `AdminView`, `kpiCards`, `SeriesPanel` e `RankingsPanel` decidem por ele (`7977f4aa`) | item 54 |
> | 2026-11-25 | `D-17` | paga — a metade que faltava: `PermissionCatalogOrphanTest` reprova permissão do `PermissionCatalog` sem rota e rota com permissão fora do catálogo, vista reprovar por sonda (`b36ffdd6`, `blocos/55-backend-borda-http-auth-e-permissao/prova.md`) | item 55 |
>
> **O que aqueles fechamentos deixaram aberto, e que não é débito:** cinco recusas literais fora de
> `lang/` viraram a **P-71** e o 419 virou a **P-72** — as duas fechadas depois pelo item 26; a
> legenda do `AppLineChart` fechou como **P-63** em 2026-09-01; e o item 25 abriu a **P-74**. Todas
> em `pendencias/`.

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
