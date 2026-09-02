# Backlog — Lotus v2

> Fila ordenada de trabalho **futuro**. Não representa a etapa atual e nunca autoriza execução
> sozinha: um item só fica ativo por promoção explícita em `docs/superpowers/state.md`, e o
> backlog nunca promove trabalho sozinho.
>
> **Consolidado em 2026-08-22 contra `main@bda90ce`, com foco em terminar a aplicação.**
> **Saneado em 2026-08-31 contra `main@a304f317`:** os itens 6, 7, 18, 19 e 20 fecharam e
> saíram da contagem, a `D-60` saiu **paga** (por bloco que não era o hospedeiro dela) e a
> `D-61` foi **absorvida pela `D-67`** — eram o mesmo defeito registrado duas vezes.
> Histórico entregue → `historico/progress.md` · fichas `P-*` → `pendencias/abertas.md` ·
> specs/planos → `specs/archive/` e `plans/archive/`. Não duplicar esses conteúdos aqui.
> O registro canônico dos débitos `D-*` segue neste arquivo, na seção `# Débitos técnicos` —
> entrar num bloco não move nem apaga a ficha; a remoção acontece no `/fechar-sprint` do bloco
> que a paga.
>
> **Planejamento just-in-time (CLAUDE.md §4):** o roadmap vive como título e escopo, não como
> plano pronto que envelhece. Spec e plano se escrevem imediatamente antes da execução; limites,
> números e decisões ainda não aprovados se resolvem no brainstorming, não congelados aqui.

## Fluxo

`seleção explícita → context_required (quando indicado) → /planejar-bloco → /executar-bloco →
/revisar-sprint → /fechar-sprint`

- A ordem abaixo é recomendada por dependência/risco; **não promove automaticamente**.
- `Contexto: sim` exige Context Packet atual antes do planejamento.
- Bloco fechado sai desta fila; o rastro fica em `historico/progress.md`.
- **P0 não ordena** — quem ordena é a cadeia de dependência: o **21** destrava a fatia 3 do **16**,
  o **22** e o **9** fecham o que sobra do código (o 6, o 7, o 18, o 19 e o 20 fecharam),
  10→12 constroem a infra e o 13 é o gate final de go-live.
- **A numeração não se renumera quando um item fecha.** O `1` e o `14` saíram em 2026-08-22, o `3`
  em 2026-08-23, o `2` e o `17` em 2026-08-24, o `4` em 2026-08-25, o `11` em 2026-08-26, o `8` em
  2026-08-27, o `5` em 2026-08-28, o `6` e o `18` em 2026-08-29, o `7` e o `19` em 2026-08-30, o
  `20` em 2026-08-31, o `21` em 2026-09-01, o `24` em 2026-09-02, e o `10` **encolheu** em vez de
  sair (o runtime foi entregue; sobrou o provisionamento). A fila começa no `9` e salta os que já fecharam
  de propósito: o número é identidade estável, citada pelas fichas de `pendencias/` e pelos próprios
  blocos. Renumerar quebraria as citações e pareceria promoção.
- **Item novo entra pelo fim, com número novo.** O `16` nasceu assim em 2026-08-22, o `17` em
  2026-08-24 e o `21` e o `22` em 2026-08-31 — os dois **abertos pelo João**, recortando por frente
  as onze fichas travadas em decisão que nenhum bloco hospedava; o 21 e o 22 aparecem no topo da
  fila porque o 21 precede a fatia 3 do item 16, não porque a numeração ordene; o `24` em
  2026-09-02, do candidato 1 da revisão de arquitetura registrada em
  `audits/2026-09-02-arquitetura-deepening.html` — o `backend-projecao-de-arquivados`, fechado em
  2026-09-02; e o `25` em 2026-09-02, aberto pelo João para juntar as dívidas de frontend que se
  provam por mecanismo e que nenhum bloco hospedava (`P-68`, `P-69`, `P-70`, `P-30`, `P-42`, `D-69`) — **fechado em 2026-09-03**. O `26` nasceu em 2026-09-02, também
  aberto pelo João, juntando o **candidato 6** do mesmo review de arquitetura com as três fichas de
  backend que nenhum bloco hospedava (`P-71`, `P-72` e a metade de comportamento da `P-60`). **O `frontend-campo-de-formulario-liga-no-form` foi registrado como "item 24" na
  `lane-c` sem nunca ter ficha aqui**; o rótulo foi corrigido no fechamento da lane-a, por decisão
  do João, e **nenhum número foi reusado nem renumerado**. O `15` fica queimado, porque chegou a
  nomear o `BD-15` durante uma inserção que foi
  desfeita, e reusá-lo apontaria duas coisas diferentes com o mesmo número.
- **O 16 e o 17 chegaram aqui pelo merge da `lane-c` em 2026-08-24.** Até ele, a fila canônica dos
  dois morava na branch `refactor/frontend-revisao-ui` (`eaa9e15c`, `bef4feb3`), por decisão do João
  em 2026-08-22 — duplicá-los no main tree garantiria conflito no merge sem ganho.

---

# Fila priorizada

## 22. `dominio-decisoes-de-rbac-e-semantica`

**Prioridade:** P1 · **Frente:** Backend · **Contexto:** não
**Fonte:** as fichas `D-09`, `D-10`, `D-11` e `D-16`.

**Objetivo:** fechar as quatro decisões de domínio e RBAC travadas no João e aplicar o que cada uma
decidir. São de frente diferente do item 21 — contrato, permissão e semântica de funil, não tinta.

**Escopo:**
- **`D-10`** — `GET /api/roles` deixa admin comum enumerar permissão de superadmin enquanto
  `/api/permissions` é superadmin-only;
- **`D-11`** — o dropdown de empresa do create de aluno chama `clientsApi` num módulo gated por
  `identity.user.*`; duas mitigações de UI já foram revertidas por piorarem;
- **`D-16`** — turma concluída com zero matrículas cai em `fully_issued`; o consumidor que faltava
  existe desde 2026-08-17;
- **`D-09`** — a UI não volta a zero contatos principais e o backend aceita zero; decidir qual
  camada cede.

**Fora:** a `D-34` (gate RBAC do Dashboard atravessando o seam como `null`) — **continua sem
hospedeiro**, e escolher é do João; o candidato que sobrou é o item 9.

**DoD:** as quatro fichas têm veredito escrito e o código que o veredito pedir, com prova de
comportamento; mudança de contrato regenera `generated.ts` pelo DTO (lei §5.3).

---

## 9. `administracao-roles-permissoes-redesign`

**Prioridade:** P1 · **Frente:** Frontend · **Contexto:** sim
**Fonte:** referência visual atual + ADR-07.

**Objetivo:** redesenhar a tela apenas se o protótipo atual continuar sendo a referência desejada.

**Importante:** Notion `2.6.3` está **Concluída** e corresponde à implementação original. Este
redesign é trabalho novo e precisa de nova task/EAP se for mantido. Exige brainstorming — é
redesenho de tela, não refinamento visual.

**Escopo:** lista de roles + detalhe + matriz de permissões; permissões essenciais protegidas;
criação/edição de role customizada; nunca criar permissions arbitrárias pela UI.

**DoD:** referência aprovada e produto convergem sem enfraquecer ADR-07.

---

## 10. `infra-producao-provisionamento-aws`

> **Desestacionado em 2026-08-31:** o item 20 (`prontidao-pre-nuvem`) fechou e saiu desta fila — o
> par corporativo do GHCR está provado, puxado e executado por `scripts/provar-release.sh`. Packet
> `partial` de 2026-08-26 guardado; ver `state.md`. Promoção segue sendo do João.

**Prioridade:** P0 para deploy · **Frente:** Infra · **Contexto:** sim
**Fonte:** ADR-09/11/13/14; Notion `10.1.1–10.1.6`, `10.1.8`; Drive `RNF-DIS-01/03/04`.

**O runtime já foi entregue e saiu desta fila.** O `infra-producao-runtime-e-aws` fechou em
2026-08-22 com o `Dockerfile.prod` multi-stage, o `docker-compose.prod.yml` sem serviço de dev, o
Nginx de origem única com `/up` como healthcheck, `APP_DEBUG=false`, secrets por `env_file` fora da
imagem e a **P-50** paga por medição (CLI 320M, FPM 256M). Ver `historico/progress.md` e
`specs/archive/2026-08-22-infra-producao-runtime-e-aws-design.md`. **O que sobra aqui é a conta AWS,
que aquele bloco declarou explicitamente fora de escopo** — MinIO não é S3 e Mailpit não é SES.

**Objetivo:** provisionar os recursos reais da AWS e rodar a imagem já construída sobre eles.

**Escopo:**
- EC2 + Security Groups;
- RDS MySQL 8 separado da EC2 + snapshot com retenção mínima de 7 dias;
- S3 privado + IAM least privilege + CORS necessário;
- e-mail/domínio + DKIM (saída do sandbox do SES);
- TLS automático/renovação (Certbot na EC2, decidido pela task 10.1.6 e pelo ADR-14);
- CloudWatch/alerta básico.

**Quatro decisões do João que o bloco anterior mediu como abertas e não supôs** — cada uma bloqueia
o recurso correspondente, nenhuma bloqueia o planejamento: região (`sa-east-1` × `us-east-1`),
tamanho final da EC2 (`t4g.small` sugerido pelo Drive, `t4g.medium` se o Gotenberg pressionar
memória), controle do DNS de `lotus.cl` mais o canal do alerta CloudWatch, e o teto de custo
(estimativa externa de US$ 35–55/mês sem ALB).

**Herança a carregar do runtime:** o `key:generate` precisa de `--entrypoint php` (registrado na §10
da spec arquivada), e o `RNF-DIS-02` × ADR-14 segue **`unresolved`**, reservado ao gate do item 13.

**DoD:** a imagem promovida por SHA sobe sobre RDS, S3 e SES reais, passa healthcheck em HTTPS e não
depende do working tree do servidor.

---

## 12. `cicd-promocao-deploy-e-rollback`

> **Estacionado desde 2026-08-26** (packet `status: blocked`: não há host). Retoma quando o item 10
> provisionar o alvo; ver `state.md`.

**Prioridade:** P0 · **Frente:** GitHub/Infra · **Contexto:** sim
**Fonte:** decisão atual de CI/CD; ADR-14; Notion `10.1.7`.

**Objetivo:** substituir `git pull → build na VM` por promoção do artefato já testado.

**Fluxo:**

```text
Gatika/main → CI → GHCR:<sha> → approval production
            → deploy único → SSH EC2 → compose pull → migrate → up → /up
```

**Escopo:** GitHub Environment; secrets; aprovação manual; `concurrency=1`; deploy por SHA sem
rebuild na VM; health pós-deploy; registrar SHA em produção; rollback da aplicação para SHA
anterior compatível. Migration incompatível exige estratégia própria. DNS não participa do deploy
normal; TLS é infraestrutura.

**Fora:** Kubernetes, ECS/Fargate, ArgoCD e CodePipeline.

**DoD:** release e rollback de aplicação são reproduzíveis e identificáveis por SHA.

---

## 13. `go-live-confiabilidade-e-recuperacao`

**Prioridade:** último gate P0 · **Frente:** Cross-cutting/Infra · **Contexto:** sim
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

**DoD:** release, fluxo crítico, backup e restore têm evidência; a divergência de disponibilidade
está formalmente resolvida.

---

## 16. `frontend-revisao-ui-por-modulo`

**Prioridade:** P1 antes do go-live · **Frente:** Frontend · **Contexto:** não por padrão
**Fonte:** `audits/2026-08-17-lotus-ui-review-dashboard.md`,
`audits/2026-08-17-lotus-ui-review-dashboard-analitico-redator.md`,
`audits/2026-08-22-lotus-ui-review-dashboard.md`; `D-38`.

**Objetivo:** estender ao resto da aplicação a revisão de UI que só o Dashboard e o `/perfil`
receberam, tela a tela, sem abrir redesenho estético.

**A fatia 1 fechou em 2026-08-24** (`lane-c`, branch `refactor/frontend-revisao-ui`, narrativa em
`historico/state-archive.md`): duas superfícies medidas — Dashboard view `ready-redator` e Operação
(`/operacion` + detalhe da turma) —, com relatório datado em `audits/`, **14 achados corrigidos** e
zero `C` aberto. A **`D-39` foi paga** pela fábrica `shared/testing/i18n.ts`. A run de **Comercial
não foi executada**: o João cortou o escopo em 2026-08-23 para seguir ao review. O item continua
aqui com o que sobrou, e a fatia 2 escreve spec e plano próprios.

**A fatia 2 fechou em 2026-08-25** (`lane-c`, branch `refactor/frontend-revisao-ui-f2`, narrativa em
`historico/state-archive.md`): **Comercial** e **Certificados** medidos, relatório datado em
`audits/` para os dois, 7 achados no total, **4 corrigidos** (um deles `C`, no wrapper
`AppCardToolbar`) e **nenhum `C` aberto**; 3 viraram ficha `D-*`. A **`D-57` foi paga** — os quatro
campos do contrato tipam `TurmaDocumentType` no `generated.ts` — e a **`D-38` foi decidida** e está
registrada abaixo. Os Minors 2, 3 e 5 herdados da fatia 1 entraram junto. As réguas de aba de
Comercial e Certificados foram **medidas e não transbordam** (`[1134, 1134, false]` em 1440x900 e
`[276, 276, false]` em 390x844), então `scrollable` não foi ligado em nenhuma das duas.

**O que sobra para uma fatia 3:** as runs de **Cursos**, **Pessoas** e **Administração**, com as
réguas de aba dessas telas ainda sem medição, e os `B` que virarem ficha. O escopo abaixo continua
valendo para o que não foi coberto.

**Evidência medida (2026-08-22):** a terceira passada no Dashboard admin achou 8 itens, e **6
moravam em `shared/ui`** — `AppBarChart` nomeava a série pelo `dataKey` (`value : 2` no tooltip),
`AppDatePicker` fixava `dateFormat` e `locale="es"`, `AppDropdown` congelava o nome acessível no
idioma anterior, `AppCardHeader` não tinha onde declarar a grandeza do card. Corrigidos em
`ac4eef8a`, valem para toda tela que use esses wrappers; o que sobra é **descobrir onde mais os
mesmos padrões aparecem** — e cada revisão anterior encontrou defeito de wrapper que nenhuma
leitura de código tinha achado.

**Escopo:**
- uma run de `/lotus-ui-review` por superfície ainda não coberta, em ordem de peso: ~~**Comercial**
  (`/comercial` + detalhe)~~ e ~~Certificados~~ (fatia 2), **Cursos**, **Pessoas**,
  **Administração**. O Dashboard `ready-redator` e a Operação saíram na fatia 1;
- ~~**D-38**: decidir quem traduz a frase da pendência que hoje chega do backend com o código do
  enum (`EVALUACION_REDATOR`)~~ — **decidido e registrado na fatia 2**;
- **`scrollable` das réguas de abas (Q-3 do review de 2026-08-24, deferido por falta de medição):**
  a régua rolável foi medida e ligada só na tela de detalhe da turma; os quatro `ModuleTabs`
  (Comercial, Administración, Personas, Certificados) seguem sem medição e sem a prop. Cada run
  acima liga a sua, se a régua transbordar em 1440x900 ou 390x844 — e não por padrão no wrapper,
  que é o que o review desfez: `p-tabview-scrollable` troca a nav por um contêiner com
  `overflow: hidden`, e o efeito disso em tela não medida é suposição;
- ~~**D-57**: `missing_types` e `missing_document_types` chegam como `string[]` no `generated.ts`~~
  — **paga na fatia 2** (2026-08-25);
- os achados `C` de cada run se fecham no mesmo bloco, com medida; os `B` viram ficha `D-*` se não
  couberem.

**Fora:** acessibilidade, foco e overflow — são do `frontend-hardening-final` (item 8), que paga as
fichas `D-*`; este bloco descobre e corrige o que a rubrica classifica. Redesenho de tela também
fica fora: Administração é o item 9, e a lente `frontend-design` é complementar — **quem
classifica é `references/review-rubric.md`, e a rule de `.claude/rules/` vence a lente**.

**Herança da fatia 1, que a fatia 2 pega de volta:** as fichas `D-*` que a Task 12 nunca escreveu —
a UI-04 da run 1 (janela da agenda, backend) e a recusa em espanhol fixo de `Turma.php:200` —, mais
os Minors 2, 3 e 5 da revisão da Task 9 (hover coberto pela coluna fixa, sombra de rolagem
escondida, slot `actions` do `DetailHeader` reposicionado pelo `items-baseline`).

**DoD:** cada superfície com relatório datado em `audits/` e nenhum achado `C` aberto.

---


## 23. `frontend-tabelas-reserva-e-rolagem`

**Prioridade:** P2 · **Frente:** Frontend · **Contexto:** não
**Fonte:** a ficha `D-65`, remedida no brainstorming do item 21 (2026-08-31), e o audit
`audits/2026-08-28-item18-fase3.md` (f3 UI-01) que a originou.

Paga a **`D-65`**. A reserva da coluna presa é em `rem` contra `tableWidths` em %, sobre
`min-w-[48rem]`: em 1024px a coluna presa come largura que as outras colunas já reservaram, e o
efeito muda de tabela para tabela porque **a reserva não é uma constante**.

Duas direções a medir nas 12 tabelas, a 1024px: (a) sinal de rolagem no wrapper, para que a
rolagem horizontal deixe de ser descoberta por acidente; (b) `min-width` menor onde a reserva não
cabe. As duas reabrem 12 medições em navegador, e é por isso que a ficha não coube no item 21.

---

## 26. `backend-envelope-de-erro-e-recusa-de-dominio`

**Prioridade:** P1 antes do go-live · **Frente:** Backend · **Contexto:** não
**Fonte:** as fichas `P-71`, `P-72` e `P-60` de `pendencias/abertas.md` e o **candidato 6** do
review de arquitetura de 2026-09-02 (`audits/2026-09-02-arquitetura-deepening.html`) — os quatro
sem hospedeiro, e os quatro no mesmo par de diretórios.

**Objetivo:** dar um dono só ao envelope de erro. Hoje a decisão está repartida: a exceção de
domínio fixa o status HTTP, o `ProblemDetails` fareja esse status de volta para escolher o título, e
a frase que o usuário lê nasce ora de `lang/`, ora literal dentro da exceção. Depois deste bloco a
exceção **declara a recusa**, e o `ProblemDetails` — que já é o dono do envelope — traduz recusa em
status e em frase localizada.

**Por que junto:** o próprio candidato 6 escreve o critério de agrupamento — *"só vale dentro de um
bloco que já vá tocar `Shared/Exceptions`"* — e a `P-71` e a `P-72` são exatamente os dois motivos
independentes para tocar ali. A `P-60` entra pelo arquivo: `CorruptedSnapshotException` é o sítio
que ela compartilha com a `P-71`, e decidir a frase dela sem decidir se ela deve estourar seria
decidir metade.

**Medido em 2026-09-02, contra `main@4a0080ce`**, antes de escrever o item — nada foi pago de
passagem pelos blocos de 2026-09-01/02:
- quatro exceções de domínio estendem `HttpException` e fixam o status na própria factory:
  `Operation/Exceptions/TurmaConfiguracaoException.php:11`,
  `Operation/Exceptions/RedatorNaoElegivelException.php:12`,
  `Identity/Exceptions/ImmutableSystemRoleException.php:22`,
  `Identity/Exceptions/RedatorOnlyActionException.php:20`;
- `Shared/Exceptions/ProblemDetails.php:108-111` identifica 403 por `getStatusCode() === 403`, com
  o comentário de 14 linhas em `:104` explicando por que precisa farejar;
- `ProblemDetails::detailFor()` termina em `default => $e->getMessage() ?: __('problem.detail.generic')`
  e **não tem braço para `TokenMismatchException`** — é a `P-72`;
- as cinco recusas literais seguem vivas: `RedatorNaoElegivelException:16,21` e
  `TurmaConfiguracaoException:15,20` em pt-BR, e `CorruptedSnapshotException:42-43` em es_CL, esta
  um `sprintf` com dois `%s` — é a `P-71`, e é a forma dela que muda a factory da chave;
- `tests/Unit/Shared/MensagemLiteralTest.php:154` tem a lista `DEBITO_CONHECIDO`, que é o inventário
  desses sítios e o que faz o silêncio reprovar.

**Escopo:**
- **Candidato 6** — a exceção de domínio para de estender `HttpException` e passa a carregar o
  **tipo da recusa**; o mapa tipo→status vive no `ProblemDetails`. O `isForbidden` **não morre** —
  o 403 real nasce do spatie, não do domínio, e a própria ficha do candidato registra isso; o que
  encolhe é o que ele precisa cobrir. Prova: os testes de endpoint que hoje afirmam 422/403
  continuam verdes sem edição — passarem intactos é o que prova que o contrato não mudou.
- **P-71** — os cinco sítios passam a ler `lang/<locale>/<dominio>.php` nos três locales e **saem
  da `DEBITO_CONHECIDO` no mesmo commit**. A `CorruptedSnapshotException` é a cara: dois `%s` viram
  chave com dois parâmetros. Prova: `LocaleParityTest` e `MensagemLiteralTest` verdes com a lista
  encolhida.
- **P-72** — o 419 ganha `problem.detail.csrf` nos três locales. O desenho é a decisão que a ficha
  já nomeia: braço próprio para `TokenMismatchException` no `detailFor()`, **ou** a catraca passa a
  enxergar `getMessage()` de exceção de framework. Prova: os três locales medidos contra a API real,
  como a ficha mediu o defeito.
- **P-60, metade de comportamento** — decidir entre **degradar** (apresentar o que o snapshot tem)
  e **continuar estourando** numa rota **pública**, que é a que o QR do certificado impresso
  alcança. É decisão do João e cabe no brainstorming; o veredito vira código e teste.

**Fora:**
- **`P-60`, metade do dado de dev** — reseedar ou corrigir o `LOT-2026-1001` é o mesmo candidato da
  **`P-44`**, hospedada no item 13. Linha alheia de bloco fechado se menciona, não se apaga.
- **`P-51`** — os cinco campos com default literal em DTO de entrada mudam contrato e regeneram
  `generated.ts`, e pedem decisão por campo (`Optional` × `present`, que **contradiz a D1 do
  BD-14**). Frente de DTO, não de envelope.
- **`D-17`** — a catraca que falta é sobre o **catálogo de permissões**, não sobre exceção; família
  de RBAC.
- **`P-49`, `P-54`, `P-59`, `P-52`** — os quatro foram remedidos contra `main@4a0080ce` e seguem
  vivos e sem hospedeiro, mas cada um está em outro eixo: lock dos dois lados em
  `RestoreQuoteAction`/`DeleteBudgetAction`, as duas assertivas da migration de permissão,
  `config/app.php:75` sem `env()`, e a ficha de colunas de `invitation_tokens`. Entram aqui **só se
  o João os puxar no brainstorming**; nenhum deles compartilha superfície de prova com o envelope.
- **`D-09`/`D-10`/`D-11`/`D-16`** — são o **item 22**, que já existe nesta fila.
- **`D-34`** — atravessa o seam para o SPA e continua sem hospedeiro; escolher é do João.
- **candidato 2 do mesmo review (fatia Site)** — `app/Domains/Site` **não existe em `main`**: a
  fatia vive em `archive/site-contact-form-v1`. Não é dívida desta árvore.

**DoD:** as três fichas fechadas — cada uma **por mecanismo verde ou por decisão escrita**, nunca
por remoção na fé —, com `DEBITO_CONHECIDO` encolhida nos cinco sítios, `LocaleParityTest` e
`MensagemLiteralTest` verdes, o 419 devolvendo `detail` localizado nos três locales medido contra a
API real, a `P-60` com veredito escrito e o código que o veredito pedir, `php artisan test` inteiro
verde sem edição nos testes de endpoint existentes, e a linha de cada ficha removida do índice de
`pendencias/` no `/fechar-sprint`.

---

---

# Decisões não promovíveis isoladamente

| ID | Decisão / gatilho |
|---|---|
| `D-09` | UI e backend divergem sobre zero contatos principais — decidir qual camada cede. |
| `D-10` | Admin comum pode ou não enumerar permissões do superadmin via `GET /api/roles`. |
| `D-11` | RBAC do lookup de clientes usado no cadastro de aluno. |
| `D-16` | Semântica da turma concluída sem matrícula no funil. **Gatilho maduro:** o consumidor que faltava (funil do B2) existe desde 2026-08-17 — decidir sétimo balde ou rótulo distinto. |
| `D-65` | **Reserva da coluna presa em tablet** (f3 UI-01): a reserva de `stickyActionsColumn` é em `rem` e as colunas são em %, sobre `min-w-[48rem]`: em 1024px a soma estoura e a coluna presa come largura alheia. **A ficha dizia `8rem` fixo nas 12 tabelas; remedido em 2026-08-31, são SETE valores**, vários condicionais ao ramo `archived` — `6rem` (`RolesTable`, `StudentsTable`, `BudgetsTable` ativo), `8rem` (`EmissionStudentsTable`, o único), `9rem` (`EnrollmentTable` + os ramos ativos de `TurmasTable`, `CoursesTable`, `UsersTable`, `ClientsTable`), `10rem` (`ArchivedEnrollmentsList` + os ramos `archived` de seis tabelas), `12rem` (`RedatoresTable` ativo), `16rem` (`HistorialTable`). Não se corrige numa constante: são 12 decisões. **Hospedeiro: item 23.** |
| `D-70` | **`/validar` diz "contacta a Lotus" sem canal** — o item 21 (`D-67`) pôs a linha de orientação no ramo `notFound` dos três locales, **sem canal**: publicar endereço ou telefone numa página aberta é decisão da Lotus, não do João sozinho. Enquanto não houver canal, a orientação termina num beco. Precisa da Lotus antes de virar código. **Gatilho: decisão da Lotus.** |
| `P-28` | Lotus/João aprovam ou corrigem o fundo final do certificado. |
| `P-08` | Lotus decide se Manual varia por curso. |
| `P-09` | Lotus confirma/descopa o quarto tipo de documento de turma. |
| `P-10` | Lotus decide se tabela de alunos exibe Cliente. |
| `P-13` | Lotus decide se Turma terá código próprio. |
| `P-16` | Lotus decide a aba inicial de Turma. |
| `DS-05` | Avatar do Perfil só vira task após medição justificar. |
| `DS-07` | Mural de credenciais é redesign próprio, com brainstorming. |

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


# Débitos técnicos — registro canônico

> Ficha de cada débito vivo. A cobertura por bloco está mapeada na fila; **entrar num bloco não
> move nem apaga a linha daqui** — a remoção acontece só depois do bloco aplicado e do
> `/fechar-sprint` correspondente. Fichas completas anteriores: histórico do arquivo no Git
> (`git log -- docs/superpowers/backlog.md`).

## Agrupados em bloco

> **Saneamento de 2026-08-28:** as fichas `D-57` e `D-39` saíram daqui — as duas estavam **pagas**
> (fatia 2 e fatia 1 do item 16) e as próprias fichas pediam a saída no primeiro saneamento. O
> rastro fica nos commits e em `historico/progress.md`. A `D-62` foi rehospedada no item 18; a
> `D-34` segue sem hospedeiro, e escolher é do João.
>
> **Fechamento de 2026-08-29:** a `D-62` **saiu daqui paga** — o item 18 construiu a catraca
> `DROPDOWN_SEM_NOME` no `frontend/eslint.config.js`, medida com o próprio seletor antes de virar
> régua e vista reprovar por sonda negativa no `TurmaStatusFilter`. A `D-34` continua sem
> hospedeiro. A **P-63**, que era agrupada no item 18, ficou aberta: o hospedeiro fechou sem
> pagá-la e rehospedar é do João.
>
> **Fechamento de 2026-08-30:** a `D-07`, a `D-18`, a `D-36`, a `D-38` e a `D-58` **saíram daqui
> pagas** pelo item 7 (`hardening-i18n-e-erros-api`): toda mensagem que a API emite ao usuário sai
> de `lang/<locale>/<dominio>.php` e responde ao `Accept-Language`, com `es_CL` de fallback, sob
> duas catracas — `LocaleParityTest` (paridade das três traduções) e `MensagemLiteralTest` (frase
> literal em `app/`, no `withMessages` e no `throw`). A `D-38` fechou em três sítios, não no único
> que a ficha nomeava: `OperationMetricsQuery`, `IdentityMetricsQuery` e `RedatorScopeQuery`. O
> rastro fica nos commits e em `historico/progress.md`. Cinco recusas que o bloco **não tocou**
> continuam literais e viraram a **P-71**; o 419 virou a **P-72**.
>
> **Saneamento de 2026-08-31 (main tree, com o João):** duas fichas saíram daqui.
> A **`D-60` saiu paga**, e **não pelo hospedeiro que ela declarava**: o `frontend-revisao-ui-por-modulo`
> (item 16) nunca rodou, mas o item 19 pagou o defeito pela f3 UI-03 do audit dele — o motivo do
> bloqueio subiu para a MESMA linha do CTA e ganhou `aria-describedby`
> (`EmissionPanel.tsx:92-105`), e os botões "Emitir" por linha também
> (`EmissionStudentsTable.tsx:100-101`), que é o DoD inteiro da ficha. **O `/fechar-sprint` do item
> 19 não removeu a linha porque a ficha estava agrupada em outro bloco** — a remoção fica aqui,
> medida contra o código. A **`D-61` não saiu paga: saiu absorvida pela `D-67`**, que o próprio item
> 19 abriu em 2026-08-30 para o MESMO defeito (`/validar/<uuid>` inexistente responde só com o
> `h1`). Duas fichas para um defeito é duas decisões do João sobre a mesma frase; a `D-67` fica,
> com o DoD da `D-61` herdado, e a `D-61` sai como ID queimado.

> **A `D-69` saiu paga em 2026-09-03**, no `frontend-dividas-de-mecanismo` (item 25, Task 1), pelo
> DoD mecanizado que ela mesma escreveu: os quatro sítios de utility de paleta em `features/`
> morreram, a `CATRACA_COR` chegou a `[]` e a **partição `files: CATRACA_COR` foi removida** do
> `frontend/eslint.config.js` — a prova é o `pnpm lint` verde **sem** a lista, não o grep. Os dois
> sítios de tinta de erro foram o que travava a ficha, e a decisão de desenho do brainstorming
> (D-69/D1) é que a variável de perigo do tema **já existia**: a medição contra `main@5f6daf8b`
> contradisse o texto da ficha, que a supunha inexistente.

- **D-59 · O alternador Activos/Archivados do card "Cotizaciones" gasta uma linha própria** →
  `frontend-revisao-ui-por-modulo`. UI-03 da run de Comercial de 2026-08-25
  (`audits/2026-08-25-lotus-ui-review-comercial.md`), classe `B`. Em `/comercial/presupuestos/:id` a
  linha `div.flex.justify-end.px-4.pt-4` tem 1134px de largura e 56px de altura para carregar UM
  filho de 228px encostado à direita — 943px de faixa vazia entre o cabeçalho "Cotizaciones 3" e a
  primeira cotação. Diferente das listas do índice, este card não tem busca para ocupar o lado
  esquerdo da régua. O remédio provável é subir o alternador para o slot `actions` do
  `AppCardHeader` (`AppCard.tsx:174`), que já existe; ficou de fora da fatia 2 porque é composição
  de UMA tela e pede remedir o detalhe inteiro nos três viewports. **DoD:** o card abre com o
  alternador na linha do cabeçalho e sem faixa vazia, medido nos três viewports.


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
  restando `administracao-roles-permissoes-redesign` (item 9). A visibilidade nasce como quatro booleanos em
  `AdminDashboardAssembler.php:56-62`, passa posicionalmente por `AnalyticsQuery::series()`/
  `::rankings()` e chega ao payload como ausência de dado (sentinela `'0.0000'`,
  `AnalyticsQuery.php:319`); `RankingsPanel.tsx:25` e `SeriesPanel.tsx:54` reconstroem a permissão
  farejando nulo. Medido 2026-08-18 contra `b758068`; desfecho do Q-2 do review do B2. Fix: a
  visibilidade vira campo explícito no payload e módulo próprio no backend — toca contrato e
  regenera `generated.ts` (lei §5.3).

- **D-37 · `archived_with_parent` nasceu sem backfill, e não há como recuperá-lo** →
  `go-live-confiabilidade-e-recuperacao`. A migration `2026_08_18_000001` entra com `false` em
  todas as linhas: agregado arquivado antes de 2026-08-18 restaura o pai sem os filhos, em
  silêncio. Backfill correto não existe — casar por `deleted_at` (precisão 0) foi recusado pela
  spec, e marcar todo filho arquivado ressuscitaria arquivamento intencional. Sem produção, o
  alcance é só banco de dev. Gatilho: primeiro deploy — conferir agregados arquivados pré-data e
  decidir caso a caso.


## Travados em decisão — não entram em bloco

Executar sem a decisão é escolher no lugar do João.

- **D-09** · A UI não consegue voltar a zero contatos principais; o backend aceita zero. Decidir
  qual camada cede.

- **D-10** · `GET /api/roles` permite a admin comum enumerar permissões do superadmin enquanto
  `/api/permissions` é superadmin-only. (O Bloco 5.2a e a parte de teste saíram em 2026-08-11 com
  o BD-2.)

- **D-11** · O dropdown de empresa do create de aluno lista via `clientsApi`
  (`commercial.client.view`) num módulo gated por `identity.user.*`: quem tem
  `identity.user.create` sem a permissão de cliente cria aluno pela API e não pela tela. Duas
  mitigações de UI foram revertidas por piorarem (`3e0bc36`, `03280c6`); o estado atual deixa a
  falha visível (dropdown desabilitado + motivo + "Reintentar"). Decisão: endpoint sob
  `identity.user.view`, permissão nova, ou aceitar o acoplamento.

- **D-16** · Turma concluída com zero matrículas cai em `fully_issued` no funil — a spec §4.3
  escolheu o balde de propósito, mas o rótulo afirma emissão completa onde não houve emissão.
  **O gatilho venceu:** o consumidor que faltava (funil do B2) existe desde 2026-08-17. Decidir:
  sétimo balde, ou rótulo que distinga "sem matrícula a emitir".

- **DS-05** · O avatar de `/perfil` é `scale-200` sobre imagem pequena. Deixado fora do BD-16 por
  decisão explícita; a Task 15 mediu que não recorta. Estética — só vira task após medição
  justificar.

- **DS-07** · O mural de credenciais como assinatura da tela inverte a ordem da spec D1 e é bloco
  próprio, com brainstorming.

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
