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
- **P0 não ordena** — quem ordena é a cadeia de dependência: itens 5–9 mais o 16 e o 17 fecham o
  código, 10→11→12 constroem a infra e o 13 é o gate final de go-live.
- **A numeração não se renumera quando um item fecha.** O `1` e o `14` saíram em 2026-08-22, o `3`
  em 2026-08-23, o `2` em 2026-08-24, o `4` em 2026-08-25, e o `10` **encolheu** em vez de sair (o
  runtime foi entregue; sobrou o provisionamento). A fila começa no `5` e salta os que já fecharam
  de propósito: o número é identidade estável, citada pelas fichas de `pendencias/` e pelos
  próprios blocos. Renumerar quebraria as citações e pareceria promoção.
- **Item novo entra pelo fim, com número novo.** O `16` nasceu assim em 2026-08-22 e o `17` em
  2026-08-24; o `15` fica queimado, porque chegou a nomear o `BD-15` durante uma inserção que foi
  desfeita, e reusá-lo apontaria duas coisas diferentes com o mesmo número.
- **O 16 e o 17 chegaram aqui pelo merge da `lane-c` em 2026-08-24.** Até ele, a fila canônica dos
  dois morava na branch `refactor/frontend-revisao-ui` (`eaa9e15c`, `bef4feb3`), por decisão do João
  em 2026-08-22 — duplicá-los no main tree garantiria conflito no merge sem ganho.

---

# Fila priorizada

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

## 18. `frontend-estilizacao-padronizacao-de-componentes`

**Prioridade:** P2 · **Frente:** Frontend · **Contexto:** não por padrão
**Fonte:** `audits/2026-08-26-estilizacao-componentes.md` (leitura estática de `shared/ui/**`,
`app/layouts/**`, `app/pages/Dashboard/**` e varredura por padrão nas features; **sem execução no
navegador** — onde a recomendação depende de pixel, o bloco valida com `/lotus-ui-review`).

**Objetivo:** fechar a última milha da estilização — o mesmo papel visual sai hoje em 3 a 5 grafias
diferentes — e executar a assinatura que o ADR-16 elegeu e o produto ainda não tem. **Não é
redesenho:** o audit mede o código contra a direção JÁ fechada e declara por escrito que o alicerce
(tokens, contraste travado por teste, `AppCard`/`AppTag`/`AppDataTable`) não se toca.

**Escopo, nas quatro fases que o audit ordena:**
1. **Vocabulário de botão** — `brandIcon` virou a CTA primária do produto em ~14 call sites contra o
   próprio contrato do `AppButton/style.ts` ("marca, só-ícone"), enquanto `brandLabel` sobrou em 2.
   Renomear por PAPEL (`primary`, `iconToggle`, `noSurface`) e varrer os call sites; "Voltar" do
   `DetailHeader` desce de CTA a ação terciária; `ConfirmDialog` sem `severity` passa a confirmar
   com o mesmo variant do `CrudDialog` (B1, B2, B3).
2. **Tipografia** — um só tratamento de `h1` (hoje `PageHeader` e `DetailHeader` abrem com vozes
   diferentes, e o de auth está copiado 5×); um só rótulo de seção (hoje 5 grafias); um `StatValue`
   com `font-display` + `tabular-nums` sempre (A1, A2, A3, A5).
3. **Dado técnico e a assinatura** — regra "folio/RUT/data técnica = `font-mono tabular-nums`" na
   rule, e o `CertificateFolio` compartilhado entre `ValidationPage` e `IssuedDialog`. É o único
   investimento estético NOVO do audit, e a tela dele é a pública do QR — a que fiscalizador e
   empregador veem, onde hoje o folio é texto comum (A4, D4).
4. **Higiene** — escala de raio escrita na rule; `ValidationPage` volta a `--surface-ground` (é a
   única tela em paleta Tailwind crua); `AppTabView` passa a usar `mergePt` em vez de `?? default`;
   logo da sidebar sem os números mágicos `ml-15 h-30`; tinta de apoio do Login vira `--shell-ink*`
   (C1, C2, C3, C4, D1, D3, E1).

**Anexado na promoção de 2026-08-28: a `D-62`.** Nenhuma catraca reprova um `AppDropdown` de filtro
sem nome acessível — o mesmo defeito foi corrigido à mão em quatro sítios, por três runs
independentes, e a quinta ocorrência nasce verde. O hospedeiro dela era o item 8, que fechou sem
pagá-la. Entra aqui porque o remédio é regra de lint por FORMA no `frontend/eslint.config.js` — o
mesmo arquivo e a mesma frente das quatro fases acima —, e porque a fase 1 varre call sites de
`shared/ui` de qualquer jeito. A régua se mede com o próprio seletor antes de virar catraca (lição
do `eslint.config.js` que nasceu casando só `arguments.0`).

**Dependia do `frontend-hardening-final` (item 8), que fechou em 2026-08-27 — a dependência está
satisfeita, e o item 18 é promovível.** Os achados A2, D2 e E2 dependiam do estado pós-mini-reset
para não medir duas vezes; e o item 8 tocou `SidebarItem`, `index.css` e `eslint.config.js`. O
audit foi escrito durante o item 8 e já respeita a D6 da spec dele (os
`my-[0.83em]` ficam; trocá-los por margem de escala é decisão da fase 2, com screenshot).

**Fora, por escrito:** redesenho de paleta, tema ou contraste (medido e travado por teste — não há
achado ali); Dashboard (placeholder declarado) e as telas do item 16 ainda sem run de UI-review;
qualquer mudança de layout de navegação — a spec do item 8 já recusou drawer; motion novo, porque a
direção é instrumental e acrescentar animação seria decoração sem tese.

**DoD:** screenshot antes/depois por fase via `/lotus-ui-review` nos dois temas; guarda de grep com
zero `variant="brandIcon"` carregando `label`, zero número de stat sem `tabular-nums`, zero
folio/RUT sem mono nas telas tocadas; a **D-62** provada pela sonda negativa da ficha — remover o
`inputId` de um dos quatro sítios já corrigidos e ver o mecanismo reprovar nomeando o arquivo;
lint + build + suíte verdes; e as regras novas escritas em
`.claude/rules/` no mesmo PR — o audit vira mecanismo, não recomendação solta.

---

# Decisões não promovíveis isoladamente

| ID | Decisão / gatilho |
|---|---|
| `D-09` | UI e backend divergem sobre zero contatos principais — decidir qual camada cede. |
| `D-10` | Admin comum pode ou não enumerar permissões do superadmin via `GET /api/roles`. |
| `D-11` | RBAC do lookup de clientes usado no cadastro de aluno. |
| `D-16` | Semântica da turma concluída sem matrícula no funil. **Gatilho maduro:** o consumidor que faltava (funil do B2) existe desde 2026-08-17 — decidir sétimo balde ou rótulo distinto. |
| `D-32` | Ordem de foco de `/perfil` abaixo de `xl` — a correção existiu e foi revertida por decisão de layout (2026-08-18). Escolher entre as três saídas da ficha antes de qualquer bloco. |
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

- **D-07 · Idioma das mensagens de `ValidationException` é inconsistente no repo** →
  `hardening-i18n-e-erros-api`. Commercial escreve em PT (`DeleteQuoteAction`,
  `DeleteClientContactAction`), Operation em ES (`Turma`, `ConcludeTurmaAction`) — o usuário
  chileno lê um ou outro conforme o endpoint. O ADR-15 já define mecanismo e fallback (es-CL);
  falta aplicar.

- **D-58 · `Turma::concluir()` recusa em espanhol fixo, fora do mecanismo de locale** →
  `hardening-i18n-e-erros-api`. `backend/app/Domains/Operation/Models/Turma.php:200` monta a
  mensagem de recusa em espanhol literal, como as demais da família **D-07**. É a metade da UI-01 da
  run de Operação que ficou fora do fence da fatia 1 do item 16 (frontend puro), e a ficha não foi
  escrita porque a Task 12 daquele plano foi cortada. Mesmo remédio da D-07/D-36: `__()` com chave
  nas 4 `lang/`. **DoD:** a mesma recusa em es-CL, pt-BR e en devolve a mensagem no locale pedido.

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

- **D-60 · O motivo que desabilita a emissão fica longe da ação, e as linhas não o repetem** →
  `frontend-revisao-ui-por-modulo`. UI-03 da run de Certificados de 2026-08-25
  (`audits/2026-08-25-lotus-ui-review-certificados.md`), classe `B`. Em `/certificados` aba Emisión,
  a tag "El curso no tiene plantilla de certificado" (`EmissionPanel.tsx:62-64`) fica à esquerda e o
  botão do lote que ela desabilita (`EmissionPanel.tsx:66-75`) à direita, com a largura do card
  entre os dois; ao rolar até a tabela a tag sai da viewport e os 13 botões "Emitir" desabilitados
  não carregam `title` nem tooltip que diga o porquê. Em 390x844 a pilha empilha e o par já fica
  junto — o problema é a régua horizontal do desktop. Ficou de fora da fatia 2 porque há mais de um
  remédio possível (aviso ao lado do botão, tooltip por linha, ou os dois) e cada um muda o que a
  tela diz numa jornada de ESCRITA que a run read-only não pôde exercitar. **DoD:** com a emissão
  bloqueada, o motivo é legível a partir do controle bloqueado, sem rolar de volta.

- **D-61 · A validação pública de um código inexistente responde só com o título** →
  `frontend-revisao-ui-por-modulo`. UI-04 da run de Certificados de 2026-08-25, classe `B`.
  `ValidationPage.tsx:109-113` renderiza o ramo `notFound` com um `StatusHeading` e nada mais —
  "Certificado no encontrado" —, enquanto o ramo `revoked` logo abaixo acrescenta linha de detalhe.
  Quem valida é alguém DE FORA do sistema (fiscalizador, cliente) escaneando um QR, e a mensagem
  sozinha não distingue código digitado errado de certificado inexistente nem oferece próximo passo,
  numa tela de peso legal. **Travada em decisão do João:** o texto é copy pública em es-CL e não
  deve ser inventada num passe de correção de UI. **DoD:** o ramo `notFound` mostra título + linha
  de orientação aprovada, nas 3 locales.

- **D-62 · Nada reprova um `AppDropdown` de filtro sem nome — o achado já apareceu 3 vezes** →
  `frontend-estilizacao-padronizacao-de-componentes`. **Rehospedada em 2026-08-28**: o hospedeiro
  anterior era o `frontend-hardening-final`, que fechou em 2026-08-27 pagando `P-46`/`D-03`/`D-33`/
  `D-35` e **não** esta ficha — medido na promoção do item 18, `frontend/eslint.config.js` não tem
  uma linha sobre `AppDropdown`, `inputId` ou `aria-label`. O item 18 já toca esse arquivo. O mesmo defeito foi encontrado por três runs independentes em três
  dias, sempre na mesma forma (`<div className="w-48">` com o `AppDropdown` solto dentro, sem
  `<label>`, sem `aria-label` e sem `aria-labelledby`): UI-07 de Operação (2026-08-23, pago no
  `TurmaStatusFilter`), UI-02 de Comercial e UI-01 de Certificados (2026-08-25, pagos no
  `BudgetStatusFilter` e no `HistorialTable`), mais o UI-02 de Certificados no seletor de turma da
  Emisión, que só tinha nome por acidente do placeholder. Três correções idênticas e nenhuma
  catraca: nem o lint, nem a suíte, nem o `tsc` sabem que um dropdown precisa de nome acessível — a
  quarta ocorrência nasce verde. Lição 14 do `docs/README.md` (instrução repetida três vezes quer
  mecanismo). O remédio provável é regra de lint por FORMA, não grep por grafia (`AppDropdown` sem
  `inputId` nem `aria-label` dentro de `src/features/**`), medida com o próprio seletor antes de
  virar catraca — é a lição do `eslint.config.js` que nasceu casando só `arguments.0`. **DoD:**
  remover o `inputId` de um dos quatro sítios já corrigidos e ver o mecanismo reprovar nomeando o
  arquivo.

- **D-15 · `DIAS_AVISO = 30` (Identity) duplica `DashboardWindows::EXPIRY_WINDOW_DAYS = 30`** →
  `hardening-performance-e-dados`. Duplicação declarada e datada na spec do Meu Perfil
  (2026-08-14); o gatilho venceu em 2026-08-16 — os dois números convivem na mesma árvore. A task
  inclui decidir o dono do número (Shared, ou um dos dois domínios). Qualquer bloco backend
  anterior pode absorvê-la.

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

- **D-18 · `description` de pendências/alertas do Dashboard é string fixa em espanhol no backend**
  → `hardening-i18n-e-erros-api`. Quatro produtores montam frase pronta
  (`CommercialMetricsQuery.php:48`, `OperationMetricsQuery.php:128`,
  `CertificationMetricsQuery.php:38`, `IdentityMetricsQuery.php:46`); o front não pode traduzir —
  em `turma_docs_incomplete` a string carrega a lista de documentos faltantes. Mitigado pela D17
  do B1 (rótulo do tipo traduzido vira a linha principal). Fecha junto da D-07, pelo mesmo
  mecanismo.

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

- **D-38 · A descrição da pendência do Dashboard imprime o código do enum** →
  `frontend-revisao-ui-por-modulo`. A frase chega pronta do backend (D17) como
  `Documentación obligatoria incompleta: MANUAL, PRUEBAS, EVALUACION_REDATOR.`, e o
  `CompliancePanel` — que monta a própria coluna — já passou a traduzir pelos mesmos códigos
  (`operation.documents.type.*`, `ac4eef8a`). O mesmo dado aparece traduzido numa parte da tela e
  cru na outra.
  **Decidido em 2026-08-22 (D1 da spec da fatia 1), registrado em 2026-08-25:** o backend manda as
  PARTES e o cliente compõe. Traduzir a frase no backend exige `Accept-Language`, que é exatamente o
  que o item 7 (`hardening-i18n-e-erros-api`) instala junto de **D-18** e **D-36** — fazer agora
  seria construir metade do item 7 fora dele. A execução é do item 7; nenhuma linha de código muda
  por causa desta ficha até lá. O sítio vivo é `PendingList.tsx:30`, que imprime `item.description`
  cru vindo de `OperationMetricsQuery.php:137`.

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
no `frontend-hardening-final` (item 8), levando a D-03 — e **o próprio item 8 saiu da fila em
2026-08-27**, levando junto as fichas `D-03`, `D-33` e `D-35`, pagas por ele. **Os itens 1 e 14
saíram da fila em 2026-08-22, em lanes paralelas:** `feedbacks-resolver-escopo` (item 1) e
`BD-15-docs-guardrails-e-sincronizacao` (item 14). A numeração restante **não** foi reordenada — a
fila tem buracos de propósito, porque renumerar quebraria toda referência escrita a "item N". O que
o BD-15 deixou aberto vive em `pendencias/` (P-22, P-31, P-32, P-52, P-53), não aqui. Task antiga
com status incorreto no Notion gera sincronização documental, não reimplementação.
