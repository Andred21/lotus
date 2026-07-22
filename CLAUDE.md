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
- **SEMPRE:** `docs/superpowers/progress.md` — índice vivo versionado (1 linha por feature:
  o que foi construído, o desfecho, o contexto que ele exige e onde estão plano/spec). Barato e ancora a sessão.
  Features entregues têm plano/spec em `plans/archive/` e `specs/archive/`.
- **SE a task implementa ou altera uma feature:** leia o plano e o spec apontados pelo
  `progress.md`, além do que a coluna **Contexto** listar. Se a entrada ainda não apontar caminhos,
  use os arquivos ativos correspondentes em `docs/superpowers/plans/` e `docs/superpowers/specs/`.
- **SE a task toca schema/DB/infra:** `docs/adrs.md` e `docs/der-fisico.md`.  
- **OPCIONAL (se presente):** `.superpowers/sdd/progress.md` — ledger local task-a-task
  (não versionado). Só para detalhe fino; a âncora canônica é o versionado acima.

| Doc                               | Consulte antes de                                               |
| --------------------------------- | ----------------------------------------------------------------|
| `docs/adrs.md`                    | qualquer decisão de stack, padrão, estrutura ou infra           |
| `docs/der-fisico.md`              | criar migration/model ou mexer em schema                        |
| `docs/estrutura-monolito.md`      | criar arquivo novo — para saber ONDE ele vai                    |
| `docs/README.md` (lições)         | iniciar feature — não repetir erro já mapeado                   |
| `docs/pendencias.md`              | antes de reportar divergência de doc — pode já estar registrada |

> Planejamento canônico: Google Drive (`Viagem Chile/Projetos/Lotus.cl/V2`).
> Tasks: Notion (`Lotus/Lotus-Desenvolvimento/Tasks-Lotus Fase 2`).
> Os `/docs` são snapshots datados;
> Se divergirem do Drive, **o Drive vence.**

## 4. Fluxo de trabalho (superpowers)

O dono do fluxo é a skill **`using-superpowers`** — pergunte a ela a próxima etapa, não reproduza a
sequência de cabeça, não pule nem reinicie etapa concluída. Ciclo canônico:

`brainstorming` → `using-git-worktrees` → `writing-plans` → `subagent-driven-development` /
`executing-plans` → `test-driven-development` → `requesting-code-review` →
`finishing-a-development-branch`.

Comandos principais do fluxo: `/planejar-bloco` (entrada) · `/executar-bloco` (execução) · `/revisar-sprint`
(review) · `/fechar-sprint` (gate). Planos/specs ativos em `docs/superpowers/`; concluídos em
`plans/archive/` e `specs/archive/`. Índice versionado: `docs/superpowers/progress.md` (§3).

**Planejamento just-in-time:** escreva o plano/spec detalhado de um bloco só imediatamente antes
de executá-lo. O roadmap adiante vive como títulos no backlog do `progress.md`, não como planos
prontos que envelhecem.

> **A mecânica de execução** — gate inline (5 critérios), gate worktree, disciplina git no main tree
> e DoD end-to-end — **vive no `/executar-bloco`.** Não a duplique aqui.
  
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
./vendor/bin/pint <arquivos>   # NUNCA sem argumento — reformata o repo inteiro
```

Frontend (de `frontend/`, nativo no WSL — Node 22/pnpm, sem test runner ainda):

```bash
pnpm dev      # Vite dev server
pnpm build    # tsc -b && vite build (type-check antes de bundlar)
pnpm lint     # eslint .
```

Backend via nginx: http://localhost:8080 · Frontend: http://localhost:5173. Compose: `app`
(PHP-FPM Alpine), `nginx`, `mysql` (host :3307), `gotenberg` (PDF), `minio` (S3 dev).
