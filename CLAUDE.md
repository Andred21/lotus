# CLAUDE.md — Lotus Platform

Guia operacional para o Claude Code neste repositório. Leia por completo antes de qualquer tarefa.

Este arquivo é o **essencial de toda sessão**: o que é o projeto, as regras que nunca se quebra, a disciplina de como escrever código, e os comandos. O detalhe de arquitetura (backend, frontend, auth, tipos) está em **[`INSTRUÇÕES-DO-PROJETO.md`](./INSTRUÇÕES-DO-PROJETO.md)** — consulte-o antes de implementar em profundidade. O contexto de planejamento (ADRs, DER, estrutura) está em `/docs` (índice no fim daquele arquivo).

> Planejamento canônico vive no Google Drive; tasks no Notion — não neste repo. Os `/docs` são snapshots datados; se divergirem do Drive, o Drive vence.

---

## 1. O que é o Lotus

Plataforma corporativa de gestão de capacitação profissional para a **Lotus** (cliente chileno, setor elétrico de alta tensão regulado). Ciclo: cotação → curso → turma → matrícula → certificado com validação por QR. **Certificados têm peso legal** — correção e rastreabilidade não são negociáveis.

Refatoração completa (**v2, greenfield**). A v1 é referência de domínio, não base de código — documenta *o quê*, nunca *como*. ~10 usuários internos, baixa concorrência: escolhas proporcionais, sem superdimensionar.

## 2. Stack

Laravel 13 (PHP 8.3) API · React 19 + TypeScript (Vite) · MySQL 8 (RDS em prod) · Sanctum SPA cookie/CSRF · spatie/laravel-permission (RBAC) · owen-it/laravel-auditing · spatie/laravel-data + typescript-transformer · TanStack Query + Zustand · PrimeReact (via wrappers) + Tailwind v4 · RFC 7807 · Gotenberg (PDF) · S3 · Docker Compose + EC2 + RDS.

> Tailwind está instalado e em uso, mas **sem ADR formal** (falta ADR-16). Use como camada de *layout*; NUNCA para reestilizar por dentro um componente PrimeReact — customização de componente vai no wrapper `shared/ui`.

---

## 3. Regras invioláveis

Vêm dos ADRs. Se uma tarefa parecer pedir que você quebre uma destas, **PARE e confirme com o João Victor**.

1. **DDD-lite, SEM Repository sobre Eloquent.** Regra de negócio → Actions (`execute()`/`__invoke()`) e Domain Services. Consulta complexa → Custom Query Builders. CRUD sem regra → Controller direto ao Eloquent. Testes: integração contra sqlite `:memory:`, não mock. (ADR-02) **Toda entidade de cadastro segue a MESMA forma, sem diferenciar por entidade (DRY):** Controller fino → `Data::fromModel` → Action; regra compartilhada entre entidades num Domain Service (ex.: `Identity/Services/UserProvisioner`, usado por cliente e redator). Detalhe: "Padrão de entidade (CRUD)" em [`INSTRUÇÕES-DO-PROJETO.md`](./INSTRUÇÕES-DO-PROJETO.md).
2. **Auditoria só na aplicação, nunca em trigger de banco** — trigger não enxerga o usuário autenticado. (ADR-08)
3. **Tipos TS são gerados do backend.** Fonte = DTO `spatie/laravel-data` em `app/Data/` com `#[TypeScript]`. `shared/types/generated.ts` NÃO se edita à mão. Tipo à mão no front = dívida temporária marcada. (ADR-04)
4. **Auth é cookie de sessão Sanctum + CSRF.** Nunca token/localStorage. `initCsrf()` antes da primeira mutação. Controllers deixam exceções subirem (handler global formata) — não montar erro à mão. (ADR-06 / ADR-03)
5. **Só admin e redator autenticam.** Cliente e aluno NÃO logam (RN-01). `students`/`clients` são entidades, não usuários que logam.
6. **Features não importam PrimeReact direto** (só via `shared/ui`) **nem outra feature.** Dependência aponta só para baixo: features → shared, nunca o inverso. (ADR-05)
7. **Financeiro nunca bloqueia ação** — é registro histórico, não gate.
8. **Definition of done = critério de aceite PROVADO, não pacote instalado.** Infra só fecha quando o comportamento é comprovado (tabela existe e grava).

---

## 4. Disciplina de execução (como escrever código aqui)

Reduz os erros mais comuns de LLM em código. Viés para cautela sobre velocidade; para tarefa trivial, use julgamento.

**Pensar antes de codar.** Não assuma, não esconda confusão, exponha trade-offs. Declare premissas; se há múltiplas interpretações, apresente-as em vez de escolher em silêncio; se existe caminho mais simples, diga; se algo está confuso, **pare e pergunte — alucinar arquitetura é pior que perguntar.**

**Simplicidade primeiro.** Código mínimo que resolve o problema, nada especulativo. Sem feature além do pedido, sem abstração para uso único, sem "flexibilidade" não solicitada, sem tratar erro impossível. Teste: "um sênior diria que isto está complicado demais?" Se sim, simplifique.

**Mudanças cirúrgicas.** Toque só no necessário. Não "melhore" código adjacente, não refatore o que não está quebrado, siga o estilo existente. Dead code não relacionado: **mencione, não delete.** Remova só os órfãos que SUA mudança criou. Toda linha alterada rastreia direto ao que foi pedido.

**Execução orientada a objetivo.** Transforme a tarefa em critério verificável ("corrigir o bug" → "escrever teste que o reproduz, depois fazer passar"). Tarefa multi-passo: declare um plano curto (passo → verificação). Critério forte permite iterar sozinho; critério fraco gera retrabalho.

---

## 5. Postura e parceria

O João Victor busca **nível sênior** e usa este projeto para chegar lá.

- **Explique o "porquê", não só o "como."** Toda decisão vem com razão e trade-off; a decisão final é dele.
- **Honestidade técnica:** não validar ideia fraca para agradar — apontar erro é parte do trabalho.
- **Pragmatismo sênior:** a melhor solução considera o estágio do projeto; evite over-engineering.
- **Passo a passo antes de automação:** ele prefere entender manualmente antes de delegar em bloco.

**Padrão de resposta a ideias** (Caso A/B/C): confirmar e refinar quando ideal (A); reconhecer e melhorar quando parcial (B); corrigir com a solução ideal quando equivocada (C).

**Fora de escopo:** metodologia de planejamento/workflow é outro projeto. Se surgir, registre e volte ao Lotus.

---

## 6. Rodando a stack

Requer WSL2 + Docker + Git.

```bash
cp backend/.env.example backend/.env
docker compose up -d
docker compose run --rm app php artisan key:generate
docker compose run --rm app php artisan migrate
```

Backend (via nginx): http://localhost:8080 · Frontend (Vite, rodado à parte no WSL): http://localhost:5173
Serviços do compose: `app` (PHP-FPM Alpine, `appuser` casando UID/GID do host), `nginx`, `mysql` (host :3307), `gotenberg` (PDF). Frontend roda nativo no WSL (Node 22/pnpm), não em container.

## 7. Comandos comuns

Backend (dentro do container `app` ou PHP 8.3 local — de `backend/`):
```bash
composer dev                        # serve + queue:listen + pail + vite, concorrentes
php artisan test                    # suíte completa (sqlite :memory:)
php artisan test --filter=TestName  # teste único
./vendor/bin/pint                   # code style
php artisan migrate && php artisan db:seed
```

Frontend (de `frontend/`):
```bash
pnpm dev      # Vite dev server
pnpm build    # tsc -b && vite build (type-check antes de bundlar)
pnpm lint     # eslint .
```
Ainda não há test runner de frontend.

---

## 8. Onde buscar mais contexto

Antes de decidir arquitetura, padrão ou schema, **consulte — não assuma.** Se a dúvida não estiver coberta, **pergunte ao João Victor, não invente.**

- **[`INSTRUÇÕES-DO-PROJETO.md`](./INSTRUÇÕES-DO-PROJETO.md)** — arquitetura detalhada (backend DDD, frontend feature-sliced, auth, contratos de tipo, estado atual) + o índice dos `/docs`.
- **`/docs`** — snapshots do planejamento: `adrs.md` (as 15 decisões), `der-fisico.md` (24 tabelas), `estrutura-monolito.md` (onde cada arquivo vai), `README.md` (índice + lições).

Pendências abertas (não decidir sozinho): ADR-16 do Tailwind; biblioteca de i18n (ADR-15); pruning da auditoria (ADR-08).