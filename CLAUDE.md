# CLAUDE.md — Lotus Platform

> Mapa da sessão: o que é o projeto, as leis, o fluxo (curto), os comandos e onde achar contexto.
> **Postura** → [`INSTRUÇÕES-DO-PROJETO.md`](./INSTRUÇÕES-DO-PROJETO.md).
> **Mecânica de código** → `.claude/rules/` (carrega sozinha ao tocar o arquivo coberto; não leia "por precaução").
> **Procedimento de execução** → comando `/executar-bloco`. **Planejamento datado** → `/docs`.

## 1. O que é o Lotus

Plataforma corporativa de gestão de capacitação profissional para a **Lotus** (cliente chileno,
setor elétrico de alta tensão regulado). Ciclo: cotação → curso → turma → matrícula → certificado
com validação por QR. **Certificados e documentos têm peso legal** — correção, auditoria e
rastreabilidade não são negociáveis. Refatoração v2 greenfield; a v1 documenta _o quê_, nunca
_como_. ~10 usuários internos, baixa concorrência: escolhas proporcionais, sem superdimensionar.

## 2. Stack

Laravel 13 (PHP 8.3) API · React 19 + TS (Vite) · MySQL 8 · Sanctum SPA cookie/CSRF ·
spatie/laravel-permission (RBAC) · owen-it/laravel-auditing · spatie/laravel-data +
typescript-transformer · TanStack Query + Zustand · PrimeReact (via `shared/ui`) + Tailwind v4
(layout) · RFC 7807 · Gotenberg (PDF) · S3/MinIO · Docker Compose + EC2 + RDS.

## 3. Como consultar contexto (consulte — não assuma)

Antes de decidir arquitetura, padrão ou schema, **leia a fonte**. Se a dúvida não estiver coberta,
**pergunte ao João Victor — alucinar arquitetura é pior que perguntar.**

**Pós `/clear`, reconstrua contexto SELETIVAMENTE — não carregue tudo indiscriminadamente:**

- **SEMPRE, PRIMEIRO:** a saída do `SessionStart` — quais lanes existem, em que estado e qual é a
  desta sessão (marcada com `*`); a qualquer momento, `bash .claude/scripts/lane.sh descobrir` dá o
  mesmo inventário. **Depois, o `estado.md` da lane**, em `docs/superpowers/blocos/<NN>-<slug>/` —
  fonte única da etapa do bloco e da próxima ação permitida. O contrato dos estados, dos campos e
  das invariantes é `docs/superpowers/state.md`. Não deduza fase por commits, existência de
  arquivos, ordem do backlog ou texto do `progress.md`.
- **DEPOIS:** `docs/superpowers/historico/progress.md` — histórico curto e resultado das entregas recentes.
  Ele não controla o workflow.
- **EM SEGUIDA, PELOS PONTEIROS DO `estado.md`:** leia `context_packet` (quando não for `null`),
  `active_spec` e `active_plan` (quando não forem `null`). O packet vem antes de qualquer consulta
  a Drive, Notion ou Figma e não substitui spec, plano, rules, ADRs ou código.
- **SÓ QUANDO O ESTADO EXIGIR:** `docs/superpowers/backlog.md` — fila futura, usada no main tree:
  para abrir lane e no planejamento, ou por solicitação explícita do João; no fechamento, é a
  lane que remove a própria ficha e os `D-*` que pagou — ou, no bloco que mesclou aguardando
  aceitação, a lane de aceitação (`state.md`, invariante 10).
- **SE a task toca schema/DB/infra:** `docs/adrs.md` e `docs/der-fisico.md`.  
- **OPCIONAL (se presente):** `.superpowers/sdd/progress.md` — ledger local task a task. Serve
  somente para retomar detalhe fino da execução; nunca decide a fase.

| Doc                                 | Consulte antes de                                               |
| ------------------------------------|-----------------------------------------------------------------|
| `docs/adrs.md`                      | qualquer decisão de stack, padrão, estrutura ou infra           |
| `docs/der-fisico.md`                | criar migration/model ou mexer em schema                        |
| `docs/estrutura-monolito.md`        | criar arquivo novo — para saber ONDE ele vai                    |
| `docs/README.md` (lições)           | iniciar feature — não repetir erro já mapeado                   |
| `docs/superpowers/pendencias/`      | antes de reportar divergência de doc — pode já estar registrada |
| `docs/superpowers/blocos/<NN>-<slug>/context.md` | antes de consultar Drive/Notion/Figma para o bloco ativo (`context-packets/` guarda o legado) |

> **Layout de `docs/superpowers/`:** na raiz vivem só os dois arquivos que decidem — `state.md`
> (o contrato dos estados) e `backlog.md` (a fila; entra na `main` só por PR). Cada bloco aberto
> pelo `lane.sh` tem a pasta `blocos/<NN>-<slug>/`, com o `estado.md` e os artefatos dele. O resto
> mora em pasta: `pendencias/` (`README.md` é o índice, `abertas.md` a ficha de cada uma,
> `encerradas.md` o rastro de 1 sprint), `historico/` (`progress.md`, `progress-archive.md` e
> `state-archive.md` — a narrativa dos blocos do fluxo antigo, congelada na virada do item 30),
> `plans/`, `specs/`, `context-packets/` e `audits/` (legado: bloco novo escreve na própria pasta).
> **Nenhum arquivo guarda o estado de todas as lanes:** o inventário sai do `git worktree list`.
> Ler narrativa de bloco encerrado é escolha explícita, não custo fixo de toda sessão.

> Planejamento canônico: Google Drive (`Viagem Chile/Projetos/Lotus.cl/V2`).
> Tasks: Notion (`Lotus/Lotus-Desenvolvimento/Tasks-Lotus Fase 2`).
> Os `/docs` são snapshots datados;
> Se divergirem do Drive, **o Drive vence.**
> **Conflito de estado:** se o `estado.md` da lane, packet, spec, plano, Git ou `progress.md`
> divergirem sobre a etapa atual, PARE. Não escolha por heurística. Mostre a divergência e corrija o
> estado antes de continuar. A incoerência mecânica o `SessionStart` já acusa, como
> `ESTADO INCOERENTE`.

## 4. Fluxo de trabalho (superpowers)

Os quatro commands de bloco são o fluxo, e cada etapa invoca a skill do superpowers por `Skill()`
explícito (plugin `superpowers@claude-plugins-official`, ligado no `.claude/settings.json`):

`/planejar-bloco` (`brainstorming` → `lane.sh abrir` → `writing-plans`) → `/executar-bloco`
(`subagent-driven-development` ou `executing-plans`, com `test-driven-development`) →
`/revisar-bloco` (`requesting-code-review` → `dispatching-parallel-agents` →
`receiving-code-review`) → `/finalizar-bloco` (`verification-before-completion` →
`finishing-a-development-branch`). Modelo e esforço de cada papel despachado: `.claude/papeis.md`.

Entradas do fluxo — **comandos** (`.claude/commands/`) e **skills** (`.claude/skills/`) se invocam
igual, com `/`, mas não são a mesma coisa: comando é prompt fixo, skill carrega instrução sob demanda.

| `/` | Onde vive | Para que serve |
| --- | --- | --- |
| `/planejar-bloco` | comando | entrada do bloco (brainstorming → spec → plano) |
| `/executar-bloco` | comando | execução, com a mecânica de gate e disciplina git |
| `/revisar-frontend` | comando | revisão estrutural focada do frontend |
| `/lotus-ui-review` | skill | revisão UI/UX de uma tela local pelo navegador (`/revisar-ui` é a entrada legada) |
| `/revisar-bloco` | comando | revisão de duas lentes: gabarito do Lotus e verificação de cada achado |
| `/finalizar-bloco` | comando | verificação fresca, registros de fechamento na lane, PR; depois do merge, fecha a lane |
| `/auditar-docs` | skill | auditoria de doc vs. código (reporta, não corrige) |

Bloco novo: spec, plano, revisão e rulings em `docs/superpowers/blocos/<NN>-<slug>/`. `specs/` e
`plans/` guardam o legado e as specs compartilhadas.
Histórico curto: `docs/superpowers/historico/progress.md` (§3).

Delegação ao Codex (Context Packet, execução delegada, revisão independente) é roteada pelos
próprios comandos conforme o `estado.md` do bloco; os contratos vivem em `.agents/skills/`.

**Planejamento just-in-time:** escreva o plano/spec detalhado de um bloco só imediatamente antes
de executá-lo. O roadmap adiante vive como títulos em `docs/superpowers/backlog.md`, não como planos
prontos que envelhecem. O backlog nunca autoriza execução nem promove trabalho sozinho.

> **A mecânica de execução** — validação do estado do bloco, rota pelo `executor` com o gate do
> Codex, TDD e disciplina git, e DoD end-to-end — **vive no `/executar-bloco`.** Não a duplique
> aqui.
  
## 5. Leis invioláveis

Enunciados abaixo; a mecânica de cada uma mora nas rules/ADR indicados. Se uma task parecer pedir
que você quebre uma destas, **PARE e confirme com o João Victor.**



1. **DDD-lite, SEM Repository sobre Eloquent.** (ADR-02 · `.claude/rules/backend-ddd.md`)
2. **Auditoria só na aplicação, nunca em trigger de banco.** (ADR-08 · `backend-ddd.md`)
3. **Tipos TS gerados do backend** — `generated.ts` não se edita à mão; corrige-se o DTO e regenera.
   (ADR-04 · `.claude/rules/generated-types.md`)
4. **Auth = cookie de sessão Sanctum + CSRF** — nunca token/localStorage; erros sobem ao handler
   global RFC 7807 (nunca `abort(422)`). (ADR-06/03 · `backend-ddd.md`)
5. **Só admin e redator autenticam.** — cliente e aluno NÃO logam, são entidades com `is_active=false`. (RN-01)
6. **Features não importam PrimeReact direto** (só via `shared/ui`) **nem outra feature — nem para tipo.** Dependência aponta só para baixo. (ADR-05 · `.claude/rules/frontend-fsliced.md`)
7. **Financeiro nunca bloqueia ação** — é registro histórico, não gate.
8. **Definition of done = critério de aceite PROVADO, não pacote instalado.**

## 6. Comandos

Backend roda **no container** `app` (host WSL não tem mbstring):

```bash
docker compose up -d
docker compose exec -T app php artisan test                    # suíte (sqlite :memory:)
docker compose exec -T app php artisan test --filter=NomeTest   # teste único
docker compose exec -T app php artisan typescript:transform     # regenera generated.ts
docker compose exec -T app php artisan migrate && ... db:seed
```

**Entrar em `main` e espelhar para o corporativo:** o caminho, o hook `pre-push` e o script de
espelho estão em [`CONTRIBUINDO.md`](./CONTRIBUINDO.md). Push direto em `main` é recusado na
máquina e não vira imagem no servidor.

Pint é a exceção: roda **no host, de dentro de `backend/`** (não precisa do container).

```bash
cd backend && ./vendor/bin/pint <arquivos>   # NUNCA sem argumento — reformata o repo inteiro
```

Frontend (de `frontend/`, nativo no WSL — Node 22/pnpm):

```bash
pnpm dev      # Vite dev server
pnpm build    # tsc -b && vite build (type-check antes de bundlar)
pnpm lint     # eslint .
pnpm test     # vitest run (jsdom) — hooks de shared/; pnpm test:watch para iterar
```

Inspeção visual de PDF (Poppler disponível no host e no container `app`):

```bash
pdfinfo <documento.pdf>                                      # metadados e número de páginas
pdftoppm -png -r 144 -f 1 -l 1 <documento.pdf> /tmp/pdf-page # gera /tmp/pdf-page-1.png
```

Gere somente as páginas necessárias e sempre em `/tmp`, sem materializar derivados ao lado do
documento fonte. Claude lê os PNGs gerados com `Read`; Codex os abre com `view_image`.

Backend via nginx: http://localhost:8080 · Frontend: http://localhost:5173 — **defaults do offset
zero**. Cada árvore de trabalho tem o seu offset no `.env` da raiz (molde em `.env.example`; o `lane.sh abrir` reserva e escreve o de cada lane),
porque o Compose isola projeto e volume por diretório mas não isola porta host (ADR-13, emenda de
2026-08-24). Compose: `app` (PHP-FPM Alpine), `nginx`, `mysql` (host :3307 no offset zero), `gotenberg` (PDF),
`minio` (S3 dev) e `createbuckets` (job de bootstrap do bucket do MinIO; sobe, cria e sai).
