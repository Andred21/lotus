# Backlog — Lotus v2

> Fila ordenada de trabalho **futuro**. Não representa a etapa atual e nunca autoriza execução
> sozinha: um item só fica ativo por promoção explícita em `docs/superpowers/state.md`, e o
> backlog nunca promove trabalho sozinho.
>
> **Consolidado em 2026-08-22 contra `main@bda90ce`, com foco em terminar a aplicação.**
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
- **P0 não ordena** — 9 dos 14 itens são P0; quem ordena é a cadeia de dependência:
  itens 1–8 fecham o código, 10→11→12 constroem a infra, o 14 fecha docs antes do fim e o 13 é o
  gate final de go-live.

---

# Fila priorizada

## 1. `feedbacks-resolver-escopo`

**Prioridade:** P0 · **Frente:** Produto/Backend · **Contexto:** sim
**Fonte:** Drive `RF-TUR-06/07`, `RF-FBK-01..04`; Notion `7.4.1`.

**Objetivo:** resolver a lacuna entre o requisito canônico de feedbacks/avaliações e a ausência de
`Domains/Feedback`.

**Evidência medida (2026-08-22):** o domínio não existe, mas o
`Identity/Support/PermissionCatalog.php:87-89` já declara `feedback.feedback.view/manage` — aresta
declarada sem código, a mesma classe que a D-17 (item 14) quer detectar.

**Escopo:** confirmar se Feedback permanece na v2; se entrar, desdobrar implementação mínima; se
sair, registrar descope no Drive/Notion/DER **e remover as permissões órfãs do catálogo**. Não
inventar schema ou workflow antes da decisão.

**DoD:** requisito, planejamento e código deixam de divergir sobre a existência de Feedback.

---

## 2. `certificacao-historico-do-aluno`

**Prioridade:** P0 se `RF-CER-07` continuar no MVP · **Frente:** Backend/Frontend · **Contexto:** sim
**Fonte:** Drive `RF-ALU-06`, `RF-CER-07`; Notion `8.1.7`, `8.3.1`; `P-15`.

**Objetivo:** disponibilizar certificados no contexto/histórico do aluno.

**Escopo:** query por aluno sem N+1; contrato tipado; autorização; curso/turma/status/validade;
exibição no detalhe do aluno; PDF/URL sob demanda. **Absorve a P-15** (ficha em
`pendencias/abertas.md`).

**DoD:** usuário autorizado parte do aluno e encontra/abre seus certificados sem regra de domínio
reconstruída no React.

---

## 3. `hardening-acesso-ownership-e-integridade`

**Prioridade:** P0 · **Frente:** Backend · **Contexto:** sim
**Fonte:** `RN-01`, `RN-02`, `RN-15`, ADR-07; Notion `7.3.3`; `P-49`, `P-51`, `P-47`, `D-34`.

**Objetivo:** completar autorização por função + ownership de recurso.

**Escopo:**
- somente `admin`/`redator` ativos autenticam e permanecem autorizados;
- **P-51**: omissão de `is_active` não pode reativar staff;
- Redator vê/altera somente turmas às quais está designado e recursos derivados;
- separar lançamento de nota/presença de `operation.enrollment.manage` se confirmado no
  planejamento;
- fechar Notion `7.3.3` com ownership real, não apenas permissão Spatie;
- **P-49**: completar o mutex de arquivamento × escritores de filho (eixos redator e turma; a ficha
  tem a tabela dos sítios);
- **P-47**: corrigir a role dos redatores do seed, se o seed continuar oficial;
- **D-34**: visibilidade RBAC do Dashboard vira campo explícito no payload, se o contrato for
  tocado (regenera `generated.ts`, lei §5.3).

**DoD:** Admin global; Redator A não lê/altera turma do Redator B; cliente/aluno e conta revogada
falham; concorrência coberta não deixa agregado inconsistente.

---

## 4. `hardening-api-arquivos-e-abuso`

**Prioridade:** P0 · **Frente:** Backend · **Contexto:** sim
**Fonte:** Drive `RNF-SEC-06`, `RNF-SEC-08`; Notion `9.1.1`; ADR-03/11/12.

**Objetivo:** limitar abuso e consumo excessivo antes da exposição pública.

**Evidência medida (2026-08-22):** `/login` (`Identity/routes.php:23`) e a validação pública de
certificado (`Certification/routes.php:7`) não têm throttle; hoje só convite/recuperação têm
(`throttle:6,1`).

**Escopo:** throttle de login, validação pública de certificado e ações sensíveis; revisar o
throttle já existente de senha/convite; limites de upload/import/batch/PDF; MIME/tamanho/quantidade;
S3 privado + URL temporária; verificação antimalware exigida pelo RNF; `429` em Problem Details.
Números concretos saem de medição/risco no plano.

**Nota de proporção:** a sonda antimalware do `RNF-SEC-06` é candidata à mesma renegociação formal
do gate de redundância do item 13 — ~10 usuários internos; o brainstorming decide se a **forma**
exigida é obrigatória ou se o **resultado** basta.

**DoD:** sondas de abuso/arquivo inválido são bloqueadas sem prejudicar o fluxo normal.

---

## 5. `hardening-auditoria-privacidade-e-observabilidade`

**Prioridade:** P0 · **Frente:** Backend/Infra · **Contexto:** sim
**Fonte:** Drive `RNF-SEC-01/03/04/05/07`; ADR-08; `P-02`, `P-33`.

**Objetivo:** fechar retenção, privacidade, logs e alertas de produção.

**Escopo:**
- pruning de `audits` (**P-02**) e retenção de `login_logs` (**P-33**);
- **retenção documental:** decidir se os arquivos de turma/redator (peso legal) ganham política
  própria de retenção — linha herdada de "Próximos blocos" do backlog anterior; o brainstorming
  confirma se o escopo é este ou se era só atalho para P-02/P-33;
- minimização de PII; nunca logar password/token/cookie/secret;
- logs centralizados; alertas de acesso suspeito e falhas operacionais;
- secrets fora de código/imagem.

**Decisão:** `RNF-SEC-05` fala em "micro-serviço" de logs, mas a arquitetura é monolítica e
proporcional a ~10 usuários. Não criar microserviço sem confirmar que a **forma**, e não o
resultado "logs centralizados", é obrigatória.

**DoD:** auditoria/logs têm retenção, rastreabilidade e alertas definidos sem expor segredo/PII
desnecessária.

---

## 6. `hardening-performance-e-dados`

**Prioridade:** P1 · **Frente:** Backend · **Contexto:** sim
**Fonte:** Drive `RNF-DES-01/02/03`; Notion `9.1.3`; ADR-02/07/09; `D-15`.

**Objetivo:** otimizar o que for medido antes de introduzir cache/infra extra.

**Escopo:**
- medir N+1 separadamente de índices; eager-load; `EXPLAIN` nas queries relevantes;
- revisar FKs/joins/Spatie; paginar collections crescentes; teto de `per_page`; allowlist de
  filtro/ordenação;
- medir Dashboard/operações pesadas; cache somente após query+índice+paginação e com invalidação
  definida — **Redis não é requisito**;
- **D-15**: unificar `DIAS_AVISO = 30` (Identity) com `DashboardWindows::EXPIRY_WINDOW_DAYS = 30`,
  decidindo o dono do número (Shared ou um dos domínios). O gatilho venceu em 2026-08-16 — os dois
  convivem na mesma árvore; entra aqui por ser o bloco backend genérico mais próximo, e qualquer
  bloco backend anterior pode absorvê-la.

**DoD:** cenários representativos do porte do Lotus não exibem N+1 conhecido ou consulta
evidentemente degradada.

---

## 7. `hardening-i18n-e-erros-api`

**Prioridade:** P1 · **Frente:** Backend · **Contexto:** não
**Fonte:** ADR-03/15; `D-07`, `D-18`, `D-36`.

**Objetivo:** eliminar mistura de idiomas nas mensagens emitidas pela API.

**Escopo:** mover literais de `ValidationException` para `lang/` (**D-07**); localizar
`title/detail` do RFC 7807 (**D-36**); localizar descrições dinâmicas do Dashboard (**D-18**);
respeitar `Accept-Language`; manter ES-CL como fallback.

**Nota:** a D-07 não precisa mais aguardar decisão de idioma — o ADR-15 já define mecanismo e
fallback (es-CL); falta aplicar.

**DoD:** a mesma falha em ES-CL/PT-BR/EN retorna envelope e mensagem coerentes com o locale.

---

## 8. `frontend-hardening-final`

**Prioridade:** P1 antes do go-live · **Frente:** Frontend · **Contexto:** não por padrão
**Fonte:** Notion `9.1.5`; `D-03`, `D-33`, `D-35`, `P-46`, `P-41`.

**Objetivo:** fechar acessibilidade/navegação e guardrails reais, sem abrir redesign estético
geral. **Absorve o BD-11**, que ficava só com a D-03 e deixou de existir como bloco próprio.

**Escopo:**
- **D-03**: nome do item de navegação alcançável no toque com a sidebar recolhida a 390px;
- **D-33**: foco devolvido ao ícone no toggle de senha do `AppPassword`;
- **D-35**: ban de import PrimeReact também em `src/app/**` (régua nasce verde — zero import,
  remedido em 2026-08-22);
- **P-46**: decidir Preflight/margens de UA (mini-reset escopado é o desenho provável);
- **P-41**: decidir/aplicar truncamento do `IdentityCell`;
- revisão pelo harness nas viewports/temas relevantes.

**Fora:** a ordem de foco de `/perfil` (**D-32**) — a correção existiu e foi revertida por decisão
de layout; mora na tabela de decisões e só entra com o desenho escolhido pelo João.

**DoD:** nenhum bloqueio coberto de foco, toque, overflow ou fronteira PrimeReact permanece.

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

## 10. `infra-producao-runtime-e-aws`

**Prioridade:** P0 para deploy · **Frente:** Infra · **Contexto:** sim
**Fonte:** ADR-09/11/13/14; Notion `10.1.1–10.1.6`, `10.1.8`; `P-50`; Drive `RNF-DIS-01/03/04`.

**Objetivo:** criar a infraestrutura/runtime real de produção; o compose atual continua sendo de
dev.

**Escopo:**
- Dockerfile multi-stage e `docker-compose.prod.yml`;
- Nginx de produção, `/up` como healthcheck, sem bind mount;
- sem MySQL/MinIO/Mailpit de dev em produção; Gotenberg permanece serviço requerido;
- **P-50**: resolver o `memory_limit` por medição (o valor vale para o PHP-FPM de produção), não
  por número arbitrário;
- EC2 + Security Groups;
- RDS MySQL 8 separado da EC2 + snapshot com retenção mínima de 7 dias;
- S3 privado + IAM least privilege + CORS necessário;
- e-mail/domínio + DKIM;
- TLS automático/renovação;
- CloudWatch/alerta básico;
- `APP_DEBUG=false`, configuração segura e secrets fora da imagem/repo.

**DoD:** stack nasce do zero, usa serviços externos corretos, passa healthcheck e não depende do
working tree do servidor.

---

## 11. `cicd-ci-governanca-e-artefato`

**Prioridade:** P0 para Continuous Delivery · **Frente:** GitHub/Infra · **Contexto:** sim
**Fonte:** decisão atual de CI/CD; ADR-13/14; `D-08`.

**Topologia a validar:** `Gatika/lotus` como upstream corporativo; `Andred21/lotus` como
fork/workbench; `origin` pessoal + `upstream` corporativo; worktrees somente locais; `develop`
apenas se existir staging real — sem staging, PR da feature vai ao `Gatika/main`.

**Escopo:** CI rápido pessoal; CI corporativo obrigatório; backend test; frontend
`pnpm install --frozen-lockfile` + lint/test/build; regenerar tipos e reprovar drift de
`generated.ts` (**D-08** — fecha a lei §5.3); audit de dependências; branch protection/required
checks; build único da imagem de produção; GHCR com tag por commit SHA.

**Limite:** esta consolidação não confirmou configurações do `Gatika/lotus`; não inventar
branch/ruleset/Environment/secret existente.

**DoD:** commit reprovado não gera release promovível; aprovado gera artefato imutável
identificável.

---

## 12. `cicd-promocao-deploy-e-rollback`

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

# Decisões não promovíveis isoladamente

| ID | Decisão / gatilho |
|---|---|
| `D-09` | UI e backend divergem sobre zero contatos principais — decidir qual camada cede. |
| `D-10` | Admin comum pode ou não enumerar permissões do superadmin via `GET /api/roles`. |
| `D-11` | RBAC do lookup de clientes usado no cadastro de aluno. |
| `D-16` | Semântica da turma concluída sem matrícula no funil. **Gatilho maduro:** o consumidor que faltava (funil do B2) existe desde 2026-08-17 — decidir sétimo balde ou rótulo distinto. |
| `D-32` | Ordem de foco de `/perfil` abaixo de `xl` — a correção existiu e foi revertida por decisão de layout (2026-08-18). Escolher entre as três saídas da ficha antes de qualquer bloco. |
| `P-03` | Compose por worktree — só se backend ∥ backend voltar a ocorrer, ou 2026-10-31. |
| `P-28` | Lotus/João aprovam ou corrigem o fundo final do certificado. |
| `P-30` | Decidir se `warning` recebe âmbar próprio da marca. |
| `P-42` | Spec do `IdentityCell` muda ou código volta à grafia original. |
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

---

# Débitos técnicos — registro canônico

> Ficha de cada débito vivo. A cobertura por bloco está mapeada na fila; **entrar num bloco não
> move nem apaga a linha daqui** — a remoção acontece só depois do bloco aplicado e do
> `/fechar-sprint` correspondente. Fichas completas anteriores: histórico do arquivo no Git
> (`git log -- docs/superpowers/backlog.md`).

## Agrupados em bloco

- **D-03 · Menu recolhido a 390px tira o rótulo do DOM e deixa só `title`** →
  `frontend-hardening-final`. Sem hover no toque, o nome do item de navegação fica inalcançável
  (`src/app/layouts/Sidebar/SidebarItem.tsx`). Era o BD-11. **DoD:** nome alcançável no toque a
  390px, medido no dispositivo emulado — não o atributo novo no DOM.

- **D-07 · Idioma das mensagens de `ValidationException` é inconsistente no repo** →
  `hardening-i18n-e-erros-api`. Commercial escreve em PT (`DeleteQuoteAction`,
  `DeleteClientContactAction`), Operation em ES (`Turma`, `ConcludeTurmaAction`) — o usuário
  chileno lê um ou outro conforme o endpoint. O ADR-15 já define mecanismo e fallback (es-CL);
  falta aplicar.

- **D-08 · A lei §5.3 (`generated.ts` não se edita à mão) segue sem mecanismo** →
  `cicd-ci-governanca-e-artefato`. Único mecanismo hoje é `globalIgnores` no lint
  (`eslint.config.js:158`), que só tira o arquivo do corte. §5.1/5.2 cobertas por
  `PersistenceLawsTest`, §5.6 por `no-restricted-imports` nas três fronteiras (remedido 2026-08-14
  contra `977586e`); §5.4/5.5/5.7/5.8 sem guarda e sem desenho medido — não entram como promessa.
  Fecho: CI regenera `typescript:transform` e reprova drift do commitado. **DoD-sonda:** editar
  `generated.ts` e ver o mecanismo reprovar nomeando o arquivo.

- **D-15 · `DIAS_AVISO = 30` (Identity) duplica `DashboardWindows::EXPIRY_WINDOW_DAYS = 30`** →
  `hardening-performance-e-dados`. Duplicação declarada e datada na spec do Meu Perfil
  (2026-08-14); o gatilho venceu em 2026-08-16 — os dois números convivem na mesma árvore. A task
  inclui decidir o dono do número (Shared, ou um dos dois domínios). Qualquer bloco backend
  anterior pode absorvê-la.

- **D-17 · `DomainDependencyTest` detecta aresta usada-e-não-declarada, não a contrária** →
  **entregue em 2026-08-22 pelo `BD-15-docs-guardrails-e-sincronizacao`**
  (`plans/archive/2026-08-22-bd15-docs-guardrails-e-sincronizacao.md`). A Regra C reprova declaração
  sem consumidor, lendo a **mesma** varredura da Regra B, e foi vista reprovar por sonda. **A parte
  que NÃO veio junto, por decisão (D4 da spec):** a catraca cobre só aresta de domínio; as permissões
  `feedback.*` órfãs (`PermissionCatalog.php:87-89`) seguem fora e são do item 1,
  `feedbacks-resolver-escopo`.

- **D-18 · `description` de pendências/alertas do Dashboard é string fixa em espanhol no backend**
  → `hardening-i18n-e-erros-api`. Quatro produtores montam frase pronta
  (`CommercialMetricsQuery.php:48`, `OperationMetricsQuery.php:128`,
  `CertificationMetricsQuery.php:38`, `IdentityMetricsQuery.php:46`); o front não pode traduzir —
  em `turma_docs_incomplete` a string carrega a lista de documentos faltantes. Mitigado pela D17
  do B1 (rótulo do tipo traduzido vira a linha principal). Fecha junto da D-07, pelo mesmo
  mecanismo.

- **D-34 · O gate RBAC do Dashboard atravessa o seam como `null`, e o cliente o remonta** →
  `hardening-acesso-ownership-e-integridade`. A visibilidade nasce como quatro booleanos em
  `AdminDashboardAssembler.php:56-62`, passa posicionalmente por `AnalyticsQuery::series()`/
  `::rankings()` e chega ao payload como ausência de dado (sentinela `'0.0000'`,
  `AnalyticsQuery.php:319`); `RankingsPanel.tsx:25` e `SeriesPanel.tsx:54` reconstroem a permissão
  farejando nulo. Medido 2026-08-18 contra `b758068`; desfecho do Q-2 do review do B2. Fix: a
  visibilidade vira campo explícito no payload e módulo próprio no backend — toca contrato e
  regenera `generated.ts` (lei §5.3). No bloco, condicional: só se o contrato for tocado.

- **D-33 · O foco cai no `<body>` quando o olho da senha alterna** → `frontend-hardening-final`.
  Medido no fechamento do BD-16 (2026-08-18) em Chromium real (`/perfil` como Redator): o ícone é
  trocado pelo Prime, o nó focado sai do DOM e `document.activeElement` vira `BODY`. Não é
  regressão (main tree igual). Fix no wrapper `AppPassword`: devolver o foco ao novo ícone após a
  troca. Terceira ponta do mesmo componente, depois de D-24 (não reproduzida) e UI-04 (paga).

- **D-35 · `src/app/**` é o único lado do seam `shared/ui` sem o ban de PrimeReact** →
  `frontend-hardening-final`. O bloco do lint é escopado por feature (`eslint.config.js:362`) e a
  exceção comentada (`:388-390`) só justifica a metade feature→feature; a camada concentra 28
  arquivos em `app/pages/Dashboard/`. A régua nasce verde: zero import de `primereact` em
  `src/app` (remedido 2026-08-22). Fix: acrescentar `src/app/**` ao `no-restricted-imports` só na
  fronteira PrimeReact, deixando feature→feature liberada.

- **D-36 · O envelope RFC 7807 não é localizado** → `hardening-i18n-e-erros-api`.
  `ProblemDetails.php:22-36,68,71` devolve `title`/`detail` literais em português, apesar de
  `SetLocale` já traduzir por `Accept-Language` e de existirem `lang/{en,es,es_CL,pt_BR}`. Medido
  2026-08-18 (BD-13) e remedido 2026-08-19 com os dois idiomas no MESMO envelope (`title` PT +
  `detail` es-CL num 422 de restore). Custo de tela hoje: só o `CertificateViewDialog` imprime
  `detail` cru. Correção: `__()` com chaves nas 4 `lang/`.

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

- **D-32** · A ordem de foco de `/perfil` diverge da visual abaixo de `xl` — `order-*` reordena a
  pintura, não a árvore de acessibilidade (WCAG 1.3.2/2.4.3; medições: 390px `scrollTop`
  0→1862→2230→0; 1024px `y` 1875→2383→323). **A correção existiu e foi revertida por decisão do
  João (2026-08-18)** — virar as colunas em `xl` tirava a identidade da esquerda no desktop.
  Inverter só o DOM não serve (muda a viewport da violação); `tabIndex` positivo também não. O que
  resta é desenho: a D1 abre mão do lado, a D-27 abre mão da precedência abaixo de `xl`, ou o
  cartão de identidade encolhe o bastante para dispensar a inversão.

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
no `frontend-hardening-final` (item 8), levando a D-03. O **BD-15** era o item 14 e saiu da fila no
fechamento de 2026-08-22; o que ele deixou aberto vive em `pendencias/` (P-22, P-31, P-32, P-52,
P-53), não aqui. Task antiga com status incorreto no Notion gera sincronização documental, não
reimplementação.
