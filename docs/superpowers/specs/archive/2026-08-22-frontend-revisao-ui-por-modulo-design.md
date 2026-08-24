# Design — Revisão de UI por módulo (item 16, fatia 1 de 2)

**Data:** 2026-08-22 · **Work item:** `frontend-revisao-ui-por-modulo` · **Lane:** `lane-a`
**Árvore:** worktree `fix-frontend` · **Branch:** `refactor/frontend-revisao-ui`
**Fonte:** `backlog.md` item 16; `audits/2026-08-17-lotus-ui-review-dashboard.md`,
`audits/2026-08-17-lotus-ui-review-dashboard-analitico-redator.md`,
`audits/2026-08-22-lotus-ui-review-dashboard.md`; fichas `D-38`, `D-39`.
**Context packet:** `null` — o bloco nasce de medição local, sem fonte externa a recuperar.

## Exceções declaradas na abertura

Duas, decididas pelo João em 2026-08-22 e registradas **antes** da execução, não descobertas nela:

1. **Docs de `docs/superpowers/**` escritos nesta worktree**, contra a invariante do `state.md` que
   os reserva ao main tree. Motivo: o próprio item 16 nasceu aqui (`a259cf80`, `eaa9e15c`) e ainda
   não chegou à `main`; escrever spec e plano no main tree criaria dois backlogs divergentes.
2. **A branch continua**, com merge só no fim. Ela já carrega código do próprio item 16 —
   `ac4eef8a` (os seis defeitos de `shared/ui` do Dashboard) e `a36be316` — não mesclados.

Registro corrigido de passagem: o `state.md` chama `feat/feedbacks-resolver-escopo` de "não
mesclada"; ela está na `main` desde `15e6a72e` (PR #65).

## Problema

A revisão de UI pelo navegador cobriu duas superfícies — Dashboard e `/perfil`. O resto da
aplicação nunca passou pela rubrica. A terceira passada no Dashboard (2026-08-22) achou 8 itens e
**6 moravam em `shared/ui`**: `AppBarChart` nomeando a série pelo `dataKey` (`value : 2` no
tooltip), `AppDatePicker` com `dateFormat` e `locale="es"` fixos, `AppDropdown` congelando o nome
acessível no idioma anterior, `AppCardHeader` sem onde declarar a grandeza do card. Todos
corrigidos em `ac4eef8a`, e todos invisíveis à leitura de código — cada revisão anterior achou
defeito de wrapper que nenhuma leitura tinha achado. O que falta é **descobrir onde os mesmos
padrões aparecem**, tela a tela.

## Escopo desta fatia

Três superfícies, na ordem, **em série** — run, correção dos `C`, próxima run:

| # | Superfície | Rota / papel | Jornada |
|---|---|---|---|
| 1 | Dashboard, view `ready-redator` | `/`, papel **redator** | carga, seções do redator, tema, idioma |
| 2 | Operação | `/operacion` → `/operacion/turmas/:id` | lista, filtro, abrir turma, abas do detalhe |
| 3 | Comercial | `/comercial` → `/comercial/presupuestos/:id` | lista, filtro, abrir orçamento, cotações |

Serial, e não três runs seguidas, porque 6 dos 8 achados de 2026-08-22 eram de wrapper: corrigir
antes da run seguinte impede que o mesmo defeito ocupe três relatórios.

Índice e detalhe formam **uma jornada só** por superfície — é como o operador navega, e o detalhe
é onde a densidade mora.

Mais as duas dívidas nomeadas pelo backlog: **D-38** (decisão, sem execução) e **D-39** (execução).

## Fora desta fatia

- Certificados, Cursos, Pessoas, Administração e o wizard `/operacion/turmas/nueva/:quoteId` —
  bloco irmão, com a mesma mecânica.
- Acessibilidade, foco e overflow: item 8 (`frontend-hardening-final`), que paga as fichas `D-*`.
- Redesenho de tela: Administração é o item 9.
- Qualquer linha de `backend/`. Ver D1.

## Decisões

### D1 — D-38 é decidida aqui e executada no item 7

A pendência chega pronta do backend como
`Documentación obligatoria incompleta: MANUAL, PRUEBAS, EVALUACION_REDATOR.`, escrita em
`backend/app/Domains/Dashboard/Services/OperationMetricsQuery.php`. O `CompliancePanel` já traduz
esses mesmos códigos por `operation.documents.type.*` (`ac4eef8a`), então o mesmo dado aparece
traduzido de um lado da tela e cru do outro.

**Decisão: o backend manda as partes, o cliente compõe.** Localizar a frase no backend exige
`Accept-Language`, que hoje não existe — é exatamente o que o item 7
(`hardening-i18n-e-erros-api`) instala junto de **D-36** e **D-18** ("localizar descrições dinâmicas
do Dashboard", mesma família). Traduzir agora seria construir metade do item 7 fora dele.

Efeito nesta fatia: a ficha `D-38` passa a registrar a decisão e a apontar para o item 7. Nenhuma
linha de código muda por causa dela.

### D2 — D-39 vira helper único, com catraca vista morder

17 arquivos (não 15, medido por `grep -rl "vi.mock('react-i18next'" src`) mockam o hook devolvendo
só `{ t }`. A forma real tem `i18n` e `ready`, e o `AppDropdown` lê `i18n.language` desde
`ac4eef8a` — o primeiro teste que renderizar um dropdown morre com
`Cannot read properties of undefined (reading 'language')`, como já aconteceu em
`HistorialTable.test.tsx`.

Nasce `frontend/src/shared/testing/i18n.ts` com a fábrica da forma real, consumida pelos 17.
Pasta nova em `shared/`, então ganha linha na rule `.claude/rules/frontend-fsliced.md` — precedente
do kit de arquivados. **A catraca entra antes:** um teste que renderiza `AppDropdown` sob o mock
parcial e reprova hoje; só então o helper existe e ela passa.

### D3 — o acesso de redator é provisionado pelas portas reais, e devolvido

A P-47 mede que **nenhum** dos 7 redatores do `OperationDemoSeeder` carrega a role `redator`, e
`/lotus-ui-review` é read-only ("nenhuma mutação além do login"). O acesso é preparado em task
própria, **antes** da run 1: `POST /api/redatores/:id/invitation` atribui a role (achado Q-1 do
bloco de identity) e `/invitation/accept` define a senha. Estado do banco de dev medido antes e
restaurado no fechamento, com o número na mão.

A **P-47 não fecha aqui** — fechá-la seria tocar `backend/database/seeders/`, e o gatilho dela
(bloco que reseeda o banco de dev) segue de pé.

### D4 — quem classifica é a rubrica

`references/review-rubric.md` classifica; a lente `frontend-design` é complementar e, em conflito
com uma rule de `.claude/rules/`, **a rule vence e o conflito é avisado ao João**, não resolvido em
silêncio. Destino por classe:

- **`C`** — fecha no mesmo bloco, com medida antes/depois na tela.
- **`B`** — corrige se couber no escopo; senão vira ficha `D-*` no `backlog.md`.
- **Falso positivo** — entra no relatório com o motivo do descarte, para não voltar na passada
  seguinte. Molde: a §1 de `2026-08-22-lotus-ui-review-dashboard.md`.

Achado de wrapper corrige-se **no wrapper**, nunca no call-site: alcança todo consumidor futuro.

## Artefatos

Um relatório por superfície em `docs/superpowers/audits/`, datado, no molde vigente: §1 escopo e
limites da run (incluindo estados não testados e falsos positivos), §2 `report.txt` **verbatim**,
§3 o que foi feito com ele. A evidência bruta fica em `.artifacts/ui-review/`, coberta pelo
`.gitignore`.

## Definition of done

1. As três superfícies com relatório datado em `audits/`.
2. **Nenhum achado `C` aberto** ao fim do bloco.
3. Cada correção provada **na tela**, no navegador, e não pelo diff — com o número antes e depois
   quando o achado for medível.
4. `D-39` fechada: os 17 arquivos usando o helper, e a catraca do `AppDropdown` vista reprovar
   antes de passar.
5. `D-38` registrada como decidida, apontando para o item 7.
6. Banco de dev devolvido ao estado anterior ao provisionamento do redator, medido.
7. Fence de escopo: `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
   vazio — e por isso Pint e `typescript:transform` ficam N/A **por escopo medido**.
8. Gate: `pnpm build` verde, `pnpm lint` 0, `pnpm test` acima da baseline medida na branch.

## Riscos

- **Volume de achados imprevisível.** Cada passada anterior achou defeito que leitura de código não
  acha. Se uma run render `C` que exija decisão de arquitetura, ela para o bloco e vai ao João —
  não se resolve dentro da run.
- **Achado que atravessa a fronteira do item 8.** Foco e overflow saem por definição; o risco é o
  achado misto (um `C` de i18n cuja correção mexe em foco). Regra: corrige a parte que a rubrica
  classificou, registra o resto como ficha.
- **Estado do banco de dev.** O provisionamento do redator é escrita real. Sem a medição do antes,
  a restauração não é provável — por isso ela é passo do plano, não do fechamento.

## Handoff de execução

`executor: claude`. As runs são sessão de navegador com julgamento de rubrica, e as correções de
`C` tocam `shared/ui` — dono de customização de componente Prime, isto é, decisão de arquitetura
sob a lei §5.6. Não é task mecânica de paths fechados.
