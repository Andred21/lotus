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
> Item novo nesta passada: o **27** (`frontend-arrumacao-de-testes`).
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

- A ordem da seção seguinte é recomendada por dependência/risco; **não promove automaticamente**.
- `Contexto: sim` exige Context Packet atual antes do planejamento.
- Bloco fechado sai desta fila; o rastro fica em `historico/progress.md`.
- **A numeração não ordena e não se renumera.** Quem ordena é a seção *Ordem de execução*; o número
  é identidade estável, citada pelas fichas de `pendencias/` e pelos próprios blocos, e renumerar
  quebraria as citações e pareceria promoção. O `1` e o `14` saíram em 2026-08-22, o `3` em
  2026-08-23, o `2` e o `17` em 2026-08-24, o `4` em 2026-08-25, o `11` em 2026-08-26, o `8` em
  2026-08-27, o `5` em 2026-08-28, o `6` e o `18` em 2026-08-29, o `7` e o `19` em 2026-08-30, o
  `20` em 2026-08-31, o `21` em 2026-09-01, o `24` em 2026-09-02, o `25` e o `26` em 2026-09-03, e o
  `10` **encolheu** em vez de sair (o runtime foi entregue; sobrou o provisionamento). A fila salta
  os números que já fecharam, de propósito.
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
  `27` em 2026-09-03, do levantamento de frontend pedido pelo João, medido contra `main@24bf770c`.
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

Recomendação por dependência e risco, decidida em 2026-09-03. **Não promove nada** — promover segue
sendo ato explícito no `state.md`. A fila abaixo está escrita nesta ordem.

| # | Bloco | Frente | Por que aqui |
|---|---|---|---|
| 1 | **27** `frontend-arrumacao-de-testes` | Frontend | Nada nele depende de decisão do João, e ele barateia o que vem depois: as runs do 16 e as 12 medições do 23 rodam sobre a mesma suíte que hoje leva 134,9s |
| 2 | **16** `frontend-revisao-ui-por-modulo` (fatia 3) | Frontend | Cada passada anterior achou defeito de wrapper `shared/ui` que nenhuma leitura de código tinha achado; achado de wrapper corrigido cedo não precisa ser corrigido tela a tela depois |
| 3 | **23** `frontend-tabelas-reserva-e-rolagem` | Frontend | Mesma frente e mesmo instrumento (navegador a 1024px) das runs do 16 — sai barato encostado nelas, e é P2 |
| 4 | **22** `dominio-decisoes-de-rbac-e-semantica` | Backend | Quatro decisões de domínio travadas no João; muda contrato e regenera `generated.ts`, então precede qualquer frontend que dependa desses campos |
| 5 | **9** `administracao-roles-permissoes-redesign` | Frontend | Exige Context Packet e brainstorming, e é o único candidato que sobrou para a `D-34`. **Colide com o 16** — ver a nota abaixo |
| 6 | **10** `infra-producao-provisionamento-aws` | Infra | P0 de deploy, mas depende de quatro decisões do João e de conta AWS; nada de código o bloqueia |
| 7 | **12** `cicd-promocao-deploy-e-rollback` | GitHub/Infra | Estacionado com packet `status: blocked`: não há host. Destrava quando o 10 provisionar o alvo |
| 8 | **13** `go-live-confiabilidade-e-recuperacao` | Cross-cutting | Gate final por definição: mede release, backup e restore sobre o que os anteriores construíram |

**A colisão 16 × 9, registrada e não resolvida:** o 16 tem uma run de `/lotus-ui-review` de
**Administração** no escopo e o 9 pode **redesenhar a mesma tela**. Medir antes do veredito do 9 é
medir o que talvez seja substituído. Recomendação: dentro do 16, rodar **Cursos** e **Pessoas**, e
deixar a run de Administração para depois do veredito do 9 — se ele mantiver o protótipo atual, a
run acontece como escrita; se redesenhar, ela mede o redesenho. **Escolher é do João**; nenhum
escopo foi movido de ficha.

---

# Fila priorizada

## 27. `frontend-arrumacao-de-testes`

**Prioridade:** P1 · **Frente:** Frontend · **Contexto:** não
**Fonte:** levantamento de 2026-09-03 contra `main@24bf770c`, pedido pelo João. Todos os números
abaixo são medidos, não estimados.

**Objetivo:** arrumar a suíte de frontend como mecanismo — ambiente, molde de montagem e sujeito de
cada arquivo — sem tocar em uma única asserção de comportamento.

**Linha de base medida (2026-09-03):** `pnpm test` verde, **128 arquivos, 759 testes, 12.665 linhas,
134,87s** (`environment 190,59s` somado entre workers). 117 arquivos co-localizados em `src/`, 11 em
`frontend/tests/`. A localização já é consistente; o que está desarrumado é outra coisa.

**Escopo — quatro achados, cada um com a medição que o abre:**

- **Os 11 arquivos de `frontend/tests/` rodam em jsdom sem precisar.** Todos leem o repositório com
  `readFileSync` (compose, tema, glyph, docs, release) e nenhum monta componente; o `environment` é o
  maior item do tempo medido. Separar por `test.projects` no `frontend/vite.config.ts` — `node` para
  `tests/**`, `jsdom` para `src/**`. O comentário que já mora ali explicando por que `tests/` fica
  fora de `src/` continua valendo e ganha o par que faltava.
- **Não existe `renderWithProviders`, e 33 arquivos remontam o provedor à mão.** 33 constroem
  `new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })`,
  20 declaram wrapper próprio e 10 montam `MemoryRouter` por conta. É a mesma classe de defeito que
  a **P-69** fechou no `cleanup` (grafia manual em 62 de 127 arquivos) e que a fábrica
  `mockUseTranslation` já fechou no i18n — e as duas provam o remédio: home única mais catraca.
- **`src/shared/testing/` tem só `i18n.ts`.** É o endereço natural do wrapper acima, e já tem 31
  consumidores provando que o padrão pega. O i18n **não** entra no escopo: os 31 arquivos que mockam
  `react-i18next` passam todos pela fábrica, zero grafia solta — medido, não suposto.
- **Dois arquivos sem sujeito próprio:** `StudentCertificateCell.test.tsx` +
  `StudentCertificateCellPdf.test.tsx` e `ValidationPage.test.tsx` + `ValidationPageFolio.test.tsx`.
  São suítes irmãs do mesmo componente, partidas por acidente de autoria. Juntar sem perder um `it`.

**Candidata a hospedeiro — decisão do João:** a **P-58** (`compose-dev.test.ts` afasta os `.env*` da
raiz mas não o `frontend/.env`, e árvore com `VITE_API_URL` legado reprova 3 casos) é ficha de
mecanismo de teste e sai barata aqui. Agrupar não promove; a ficha segue em `pendencias/abertas.md`
com o gatilho dela até haver veredito.

**Fora:** reescrever asserção, cobrir caso novo, mudar comportamento da aplicação, mexer em
`src/test-setup.ts` (é o que a P-69 acabou de fixar) e tocar na régua de contraste da **P-74**, que é
decisão de cor do João e não de arrumação.

**DoD:** `pnpm test` verde com os **mesmos 759 testes**; tempo medido antes e depois registrado no
fechamento; `tests/**` provado rodando em `environment: node` por sonda; wrapper único em
`shared/testing/` com catraca no `frontend/eslint.config.js` que reprova `new QueryClient` em teste
de `features/` e `app/` — vista reprovar por sonda negativa antes de virar régua, no molde de
`CLEANUP_A_MAO` e `DROPDOWN_SEM_NOME`.

---

## 16. `frontend-revisao-ui-por-modulo`

**Prioridade:** P1 antes do go-live · **Frente:** Frontend · **Contexto:** não por padrão
**Fonte:** `audits/2026-08-17-lotus-ui-review-dashboard.md`,
`audits/2026-08-17-lotus-ui-review-dashboard-analitico-redator.md`,
`audits/2026-08-22-lotus-ui-review-dashboard.md`.

**Objetivo:** estender ao resto da aplicação a revisão de UI que só o Dashboard e o `/perfil`
receberam, tela a tela, sem abrir redesenho estético.

**Fatias fechadas:** a **1** em 2026-08-24 (Dashboard `ready-redator` e Operação; 14 achados
corrigidos, zero `C` aberto, `D-39` paga pela fábrica `shared/testing/i18n.ts`) e a **2** em
2026-08-25 (Comercial e Certificados; 7 achados, 4 corrigidos — um `C` no wrapper `AppCardToolbar` —,
nenhum `C` aberto, 3 viraram ficha, `D-57` paga e `D-38` decidida). As réguas de aba de Comercial e
Certificados foram medidas e **não transbordam** (`[1134, 1134, false]` em 1440x900 e
`[276, 276, false]` em 390x844), então `scrollable` não foi ligado em nenhuma das duas. Narrativa das
duas em `historico/state-archive.md`.

**O que sobra — fatia 3:** as runs de **Cursos**, **Pessoas** e **Administração**, as réguas de aba
dessas telas ainda sem medição, e os `B` que virarem ficha.

**Ordem interna, pela colisão com o item 9:** rodar **Cursos** e **Pessoas** primeiro; a run de
**Administração** espera o veredito do 9, que pode redesenhar a mesma tela. Ver a nota da seção
*Ordem de execução*.

**Evidência medida (2026-08-22) de por que o bloco continua valendo:** a terceira passada no
Dashboard admin achou 8 itens, e **6 moravam em `shared/ui`** — `AppBarChart` nomeava a série pelo
`dataKey` (`value : 2` no tooltip), `AppDatePicker` fixava `dateFormat` e `locale="es"`,
`AppDropdown` congelava o nome acessível no idioma anterior, `AppCardHeader` não tinha onde declarar
a grandeza do card. Corrigidos em `ac4eef8a`, valem para toda tela que use esses wrappers; o que
sobra é **descobrir onde mais os mesmos padrões aparecem** — e cada revisão anterior encontrou
defeito de wrapper que nenhuma leitura de código tinha achado.

**Escopo:**
- uma run de `/lotus-ui-review` por superfície ainda não coberta: **Cursos**, **Pessoas**,
  **Administração**;
- **`scrollable` das réguas de abas (Q-3 do review de 2026-08-24, deferido por falta de medição):**
  a régua rolável foi medida e ligada só na tela de detalhe da turma; os quatro `ModuleTabs`
  (Comercial, Administración, Personas, Certificados) seguem sem medição e sem a prop. Cada run
  acima liga a sua, se a régua transbordar em 1440x900 ou 390x844 — e não por padrão no wrapper,
  que é o que o review desfez: `p-tabview-scrollable` troca a nav por um contêiner com
  `overflow: hidden`, e o efeito disso em tela não medida é suposição;
- a **`D-59`**, que é composição de UMA tela de Comercial;
- os achados `C` de cada run se fecham no mesmo bloco, com medida; os `B` viram ficha `D-*` se não
  couberem.

**Fora:** acessibilidade, foco e overflow — eram do `frontend-hardening-final` (item 8), fechado em
2026-08-27. Redesenho de tela também fica fora: Administração é o item 9, e a lente `frontend-design`
é complementar — **quem classifica é `references/review-rubric.md`, e a rule de `.claude/rules/`
vence a lente**.

**Herança das fatias anteriores:** as fichas `D-*` que a Task 12 da fatia 1 nunca escreveu — a UI-04
da run 1 (janela da agenda, backend) e a recusa em espanhol fixo de `Turma.php:200`.

**DoD:** cada superfície com relatório datado em `audits/` e nenhum achado `C` aberto.

---

## 23. `frontend-tabelas-reserva-e-rolagem`

**Prioridade:** P2 · **Frente:** Frontend · **Contexto:** não
**Fonte:** a ficha `D-65`, remedida no brainstorming do item 21 (2026-08-31), e o audit
`audits/2026-08-28-item18-fase3.md` (f3 UI-01) que a originou.

Paga a **`D-65`** (ficha inteira em `# Débitos técnicos`). A reserva da coluna presa é em `rem`
contra `tableWidths` em %, sobre `min-w-[48rem]` (`AppDataTable/style.ts:73`): em 1024px a coluna
presa come largura que as outras colunas já reservaram, e o efeito muda de tabela para tabela porque
**a reserva não é uma constante** — são sete valores, vários condicionais ao ramo `archived`.

Duas direções a medir nas 12 tabelas, a 1024px: (a) sinal de rolagem no wrapper, para que a
rolagem horizontal deixe de ser descoberta por acidente; (b) `min-width` menor onde a reserva não
cabe. As duas reabrem 12 medições em navegador, e é por isso que a ficha não coube no item 21.

---

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

**Colisão com o item 16:** a fatia 3 do 16 tem uma run de UI de Administração no escopo. O veredito
deste bloco — redesenhar ou manter — decide se aquela run mede a tela atual ou a nova. Ver a nota da
seção *Ordem de execução*.

**Escopo:** lista de roles + detalhe + matriz de permissões; permissões essenciais protegidas;
criação/edição de role customizada; nunca criar permissions arbitrárias pela UI.

**Candidato a hospedeiro da `D-34`** — é o único que sobrou, e escolher é do João.

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

# Decisões não promovíveis isoladamente

Executar sem a decisão é escolher no lugar de quem decide. A tabela é o índice; as fichas com
detalhe que não cabe em linha vêm logo abaixo. **As `P-*` moram em `pendencias/abertas.md`** — aqui
ficam só como ponteiro, e a ficha delas é lá.

| ID | Quem decide | Decisão / gatilho |
|---|---|---|
| `D-09` | João | UI e backend divergem sobre zero contatos principais — decidir qual camada cede |
| `D-10` | João | Admin comum pode ou não enumerar permissões do superadmin via `GET /api/roles` |
| `D-11` | João | RBAC do lookup de clientes usado no cadastro de aluno |
| `D-16` | João | Semântica da turma concluída sem matrícula no funil. **Gatilho maduro** desde 2026-08-17 |
| `D-70` | Lotus | `/validar` diz "contacta a Lotus" sem canal — publicar endereço ou telefone é decisão da Lotus |
| `DS-05` | João | Avatar do Perfil só vira task após medição justificar |
| `DS-07` | João | Mural de credenciais é redesign próprio, com brainstorming |
| `P-74` | João | Botão de severidade reprova AA no claro em 4 das 5 famílias |
| `P-58` | João | `compose-dev.test.ts` não isola o `frontend/.env` — candidata ao item 27 |
| `P-57` | João | `artisan test` fatala por memória em worktree com imagem `app` velha |
| `P-28` | Lotus / João | Fundo final do certificado: aprovar ou corrigir |
| `P-08` | Lotus | Manual varia por curso ou não |
| `P-09` | Lotus | Quarto tipo de documento de turma: confirmar ou descopar |
| `P-10` | Lotus | Tabela de alunos exibe Cliente ou não |
| `P-13` | Lotus | Turma terá código próprio ou não |
| `P-16` | Lotus | Aba inicial de Turma |

> **As quatro primeiras (`D-09`, `D-10`, `D-11`, `D-16`) são a fonte do item 22** — entrar num bloco
> não as promove, e o veredito segue sendo do João, no brainstorming daquele bloco.

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

---

# Débitos técnicos — registro canônico

> Ficha de cada débito vivo. A cobertura por bloco está mapeada na fila; **entrar num bloco não
> move nem apaga a linha daqui** — a remoção acontece só depois do bloco aplicado e do
> `/fechar-sprint` correspondente. Fichas completas anteriores: histórico do arquivo no Git
> (`git log -- docs/superpowers/backlog.md`).

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
>
> **O que aqueles fechamentos deixaram aberto, e que não é débito:** cinco recusas literais fora de
> `lang/` viraram a **P-71** e o 419 virou a **P-72** — as duas fechadas depois pelo item 26; a
> legenda do `AppLineChart` fechou como **P-63** em 2026-09-01; e o item 25 abriu a **P-74**. Todas
> em `pendencias/`.

- **D-59 · O alternador Activos/Archivados do card "Cotizaciones" gasta uma linha própria** →
  `frontend-revisao-ui-por-modulo` (item 16). UI-03 da run de Comercial de 2026-08-25
  (`audits/2026-08-25-lotus-ui-review-comercial.md`), classe `B`. Em `/comercial/presupuestos/:id` a
  linha `div.flex.justify-end.px-4.pt-4` (`QuotesList.tsx:45`, conferida viva em 2026-09-03) tem
  1134px de largura e 56px de altura para carregar UM filho de 228px encostado à direita — 943px de
  faixa vazia entre o cabeçalho "Cotizaciones 3" e a primeira cotação. Diferente das listas do
  índice, este card não tem busca para ocupar o lado esquerdo da régua. O remédio provável é subir o
  alternador para o slot `actions` do `AppCardHeader` (`AppCard.tsx:174`), que já existe; ficou de
  fora da fatia 2 porque é composição de UMA tela e pede remedir o detalhe inteiro nos três
  viewports. **DoD:** o card abre com o alternador na linha do cabeçalho e sem faixa vazia, medido
  nos três viewports.

- **D-65 · A reserva da coluna presa não é uma constante** → `frontend-tabelas-reserva-e-rolagem`
  (item 23). f3 UI-01: a reserva de `stickyActionsColumn` é em `rem` e as colunas são em %, sobre
  `min-w-[48rem]` (`AppDataTable/style.ts:73`, conferido vivo em 2026-09-03); em 1024px a soma
  estoura e a coluna presa come largura alheia. **A ficha dizia `8rem` fixo nas 12 tabelas;
  remedido em 2026-08-31, são SETE valores**, vários condicionais ao ramo `archived` — `6rem`
  (`RolesTable`, `StudentsTable`, `BudgetsTable` ativo), `8rem` (`EmissionStudentsTable`, o único),
  `9rem` (`EnrollmentTable` + os ramos ativos de `TurmasTable`, `CoursesTable`, `UsersTable`,
  `ClientsTable`), `10rem` (`ArchivedEnrollmentsList` + os ramos `archived` de seis tabelas),
  `12rem` (`RedatoresTable` ativo), `16rem` (`HistorialTable`). Não se corrige numa constante: são
  12 decisões. **Estava listada entre as decisões não promovíveis até 2026-09-03** — mas tem
  hospedeiro desde que o item 23 nasceu, e débito com bloco não é decisão travada.

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
