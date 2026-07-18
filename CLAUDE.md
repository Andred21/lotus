# CLAUDE.md — Lotus Platform

> Guia operacional do Claude Code neste repositório. Leia por completo antes de qualquer tarefa.
> Este arquivo é o **mapa da sessão**: o que é o projeto, como achar contexto, as leis invioláveis, o fluxo de trabalho e os comandos. 
> **Padrões técnicos e mecânica de código NÃO vivem aqui** — moram em `.claude/rules/` e **carregam sozinhos** quando você toca os arquivos 
  que eles cobrem (não os leia "por precaução"). 
> Postura e cláusulas de exceção: estão em [`INSTRUÇÕES-DO-PROJETO.md`](./INSTRUÇÕES-DO-PROJETO.md). 
> O planejamento datado, em `/docs`.

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
  o que foi construído, o desfecho, o contexto que ele exige e onde estão plano/spec). É barato e ancora a sessão.
  Features entregues têm plano/spec em `plans/archive/` e `specs/archive/`.
- **SE a task implementa/mexe numa feature:** o plano e o spec dela (caminho está no `progress.md`)
  e o que a coluna **Contexto** daquela linha listar — só isso.
- **SE a task implementa/mexe numa feature:** o plano e o spec mais recentes dela em
  `docs/superpowers/plans/` e `docs/superpowers/specs/`.
- **SE a task toca schema/DB/infra:** `docs/adrs.md` e `docs/der-fisico.md`.  
- **OPCIONAL (se presente):** `.superpowers/sdd/progress.md` — ledger local de execução task-a-task
  (não versionado). Só para detalhe fino; a âncora canônica é o versionado acima.


| Doc                               | Consulte antes de                                               |
| --------------------------------- | ----------------------------------------------------------------|
| `docs/adrs.md`                    | qualquer decisão de stack, padrão, estrutura ou infra           |
| `docs/der-fisico.md`              | criar migration/model ou mexer em schema                        |
| `docs/estrutura-monolito.md`      | criar arquivo novo — para saber ONDE ele vai                    |
| `docs/README.md` (lições)         | iniciar feature — não repetir erro já mapeado                   |
| `docs/pendencias.md`              | antes de reportar divergência de doc — pode já estar registrada |

> Planejamento canônico vive no Google Drive -> (Viagem Chile/Projetos/Lotus.cl/V2); 
> Tasks no Notion -> Lotus/Lotus-Desenvolvimento/Tasks-Lotus Fase 2. 
> Os `/docs` são snapshots datados;
> Se divergirem do Drive, o Drive vence.

## 4. Fluxo de trabalho (superpowers)

**O dono do fluxo é a skill `using-superpowers`.** Não reproduza a sequência de cabeça, não pule
etapa, não reinicie etapa concluída — pergunte a ela qual é a próxima. O ciclo canônico:

`brainstorming` → `using-git-worktrees` → `writing-plans` → `subagent-driven-development` /
`executing-plans` → `test-driven-development` → `requesting-code-review` →
`finishing-a-development-branch`.

Comandos do projeto: `/planejar-bloco` (entrada) · `/executar-bloco` (execução) · `/revisar-sprint`
(review) · `/fechar-sprint` (gate). Planos e specs ativos em `docs/superpowers/`; concluídos em
`plans/archive/` e `specs/archive/`. Ledger local em `.superpowers/sdd/`; índice versionado em
`docs/superpowers/progress.md` (§3).

**Planejamento just-in-time:** escreva o plano/spec detalhado de um bloco só imediatamente antes
de executá-lo. O roadmap adiante vive como títulos no backlog do `progress.md`, não como planos
prontos que envelhecem.

**Exceção inline — os 5 critérios.** Pode executar sem `brainstorming`/`writing-plans` quando TODOS
forem verdade:
1. envolve **um** arquivo;
2. não altera regra de negócio;
3. não exige reconstrução significativa de contexto;
4. é validável localmente sem impactar outras camadas;
5. **não toca superfície de lei inviolável** (§5) — migration, `generated.ts`, auth/Sanctum,
   auditoria, RBAC.

Declare a classificação em 1 linha ("trivial: 1 arquivo, sem regra, sem lei → inline") e siga.
Qualquer critério falhou → fluxo completo. **Na dúvida, não é trivial.**

**Worktree — gate honesto (estado atual):**
- Bloco **frontend-only** → `using-git-worktrees` normalmente (roda nativo no WSL).
- Bloco que **toca backend** → **main tree**, com a disciplina git abaixo. O `docker-compose.yml`
  monta o path do main tree; um worktree não é servido pelo stack e os testes rodariam contra o
  código errado — **verde mentiroso**. Compose por worktree é pendência aberta (`docs/pendencias.md`).

**Disciplina git (obrigatória enquanto o bloco rodar no main tree):** antes de tocar em arquivo,
`git status`; antes de editar arquivo SUJO, `git diff <arquivo>`. O João edita o working tree AO VIVO
durante a execução (padrão recorrente). WIP dele é **intocável**: não faça stage/revert/edit fora dos
caminhos exatos da task; `git add` só os caminhos da task; em conflito, o working tree vence. Nenhum
comando git enxerga buffer não-salvo do editor — a garantia real é **Read fresco do arquivo
imediatamente antes de editar** + escopo cirúrgico.

- **Execute em silêncio dentro do definido.** Quando plano+spec+escopo já cobrem a task, implemente
  sem narrar o padrão escolhido. **Explique o "porquê"/trade-off SÓ quando:** (a) a task desvia do
  definido em docs/spec/escopo, ou (b) o João pergunta.
- **Desvio de padrão = justifique e registre** no `.superpowers/sdd/progress.md` (as regras são o
  default, não a prisão — Parte 0 do INSTRUÇÕES). Já as **leis invioláveis (§5)** não se desviam
  sozinho: **PARE e confirme com o João Victor.**
- **DoD = comportamento provado end-to-end contra a API real**, não build/lint/test verde. Bugs de
  peso legal (upload vazio, 422 silencioso) só a verificação real pegou.
  
## 5. Leis invioláveis

Vêm dos ADRs — a mecânica de cada uma está em INSTRUÇÕES. Se uma task parecer pedir que você quebre
uma destas, **PARE e confirme com o João Victor.**

1. **DDD-lite, SEM Repository sobre Eloquent.** Regra de negócio → Actions + Domain Services;
   consulta complexa → Query Builders; CRUD sem regra → Controller direto ao Eloquent. Testes:
   integração sqlite `:memory:`, não mock. Toda entidade de cadastro segue a MESMA forma (DRY). (ADR-02)
2. **Auditoria só na aplicação, nunca em trigger de banco.** Model Auditable+SoftDeletes muda via
   `$model->delete()` (dispara eventos); delete no query builder não audita. (ADR-08)
3. **Tipos TS são gerados do backend.** Fonte = DTO em `app/Domains/<X>/Data/` (ou `app/Shared/`,
   se transversal) com `#[TypeScript]`. `shared/types/generated.ts` NÃO se edita à mão — corrige-se
   o DTO e regenera. (ADR-04)
4. **Auth = cookie de sessão Sanctum + CSRF.** Nunca token/localStorage. `initCsrf()` antes da 1ª
   mutação. Controllers deixam exceções subirem (handler global RFC 7807); validação =
   `ValidationException::withMessages([...])`, nunca `abort(422)` nem erro à mão. (ADR-06/03)
5. **Só admin e redator autenticam.** Cliente e aluno NÃO logam (RN-01) — são entidades, criadas
   com `is_active=false`.
6. **Features não importam PrimeReact direto** (só via `shared/ui`) **nem outra feature — nem para
   tipo.** Dependência aponta só para baixo: features → shared. (ADR-05)
7. **Financeiro nunca bloqueia ação** — é registro histórico, não gate.
8. **Definition of done = critério de aceite PROVADO, não pacote instalado.**

## 6. Disciplina de execução

- **Pensar antes de codar:** declare premissas; múltiplas interpretações → apresente, não escolha
  em silêncio; confuso → pare e pergunte.
- **Simplicidade primeiro:** código mínimo que resolve. Sem feature além do pedido, sem abstração
  de uso único, sem tratar erro impossível. Teste: "um sênior diria que está complicado demais?"
- **Mudanças cirúrgicas:** toque só o necessário; não "melhore" código adjacente; siga o estilo.
  Dead code alheio: mencione, não delete. Remova só órfãos que SUA mudança criou.

## 7. Postura e parceria

O João Victor busca nível sênior e usa este projeto para chegar lá.

- **Explique o "porquê" (quando for explicar — ver §4):** decisão vem com razão e trade-off; a
  decisão final é dele.
- **Honestidade técnica:** não validar ideia fraca para agradar — apontar erro é parte do trabalho.
- **Pragmatismo sênior:** solução proporcional ao estágio; evite over-engineering.
- **Resposta a ideias (Caso A/B/C):** confirmar e refinar quando ideal (A); reconhecer e melhorar
  quando parcial (B); corrigir com a solução ideal quando equivocada (C).
- **Fora de escopo:** metodologia de planejamento/workflow é outro projeto — registre e volte ao Lotus.

## 8. Comandos

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
