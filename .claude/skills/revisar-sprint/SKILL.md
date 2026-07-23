---
name: revisar-sprint
description: "Revisão de qualidade pós-sprint do Lotus: acha código órfão e padrões júnior que o agente deixou, comparados com a implementação sênior do PADRÃO DESTE projeto (ADRs, leis §5, lições). Use ao fechar uma sprint, quando o João disser 'revisa o que foi feito', 'code review da sprint', 'tá com cara de júnior', 'limpa o código'. Roda por SPRINT, não por bloco. NÃO use para planejar feature nem para revisar diff pequeno — para diff, use /code-review nativo."
disable-model-invocation: true
---

# Revisar sprint — o que sobrou no caminho

O `/code-review` nativo revisa o **diff** contra boas práticas gerais. Esta skill revisa a **sprint**
contra o padrão **deste** projeto. Lentes diferentes; uma não dispensa a outra.

## Gate de estado

Leia `docs/superpowers/state.md` primeiro. A skill aceita somente:

- `ready_for_review` → valide o trabalho ativo e transicione para `reviewing`;
- `reviewing` → retome a revisão ou as correções já aprovadas do mesmo trabalho.

Qualquer outro estado → PARE e informe `workflow_state`, `next_owner` e `next_action`.

Ao começar a partir de `ready_for_review`, atualize:

```yaml
workflow_state: reviewing
next_owner: claude
next_action: review_active_work_item
```

Revise somente `active_work_item`, usando `active_spec`, `active_plan`, `context_packet` quando
presente e o intervalo Git que prova esse trabalho. Não selecione uma sprint por backlog,
`progress.md` ou heurística.

## Gabarito (nesta ordem de autoridade)

1. **CLAUDE.md §5** — as 8 leis invioláveis. Violação aqui é 🔴 sempre, sem discussão.
2. **`docs/README.md`** — as lições institucionalizadas. Repetir erro já mapeado é 🔴.
3. **`docs/adrs.md`** — os ADRs fechados.
4. **`.claude/rules/*`** — as convenções de código (leia a rule da camada que a sprint tocou).
5. Catálogo universal (abaixo) — só o que os quatro acima não cobrem.

Sem esse gabarito você está fazendo `/code-review` genérico. Carregue-o.

## Escopo

**Só os arquivos que `active_work_item` tocou.** Use o plano e `git log`/`git diff` do intervalo
correspondente. Não é auditoria do repo.

## Passo 1 — Órfãos (existência)

### Backend

Procure Controllers, Actions, Services, Models e métodos sem referência usando:

- `php artisan route:list`;
- `rg` ou `grep`;
- busca por imports e chamadas;
- leitura dos testes relacionados.

`composer-unused` e PHPStan só podem ser executados quando estiverem declarados no
`backend/composer.json`. Não instale ferramentas durante a revisão sem autorização.
  Ferramentas: `php artisan route:list`, `composer-unused`, `./vendor/bin/phpstan analyse`.

### Frontend

Procure componentes sem importação, hooks sem consumidor e páginas fora do router usando:

- busca por imports com `rg` ou `grep`;
- `pnpm lint`;
- `pnpm build`;
- inspeção do router e dos barrels.

`knip` só pode ser executado quando estiver declarado no `frontend/package.json`.
Não use `npx` para baixar uma ferramenta não versionada durante o review.

- **Deps:** pacote sem import.

**Falsos positivos deste projeto (NÃO reportar):** wrappers de `shared/ui` sem uso direto (é
biblioteca); Policies/Observers/Providers do Laravel (auto-discovery); classes citadas só no morph
map; migrations antigas (são histórico — nunca deletar); scaffold vazio de `operation`/`certification`
(dívida consciente, registrada).

## Passo 2 — Padrões júnior vs. sênior

Procure, nesta ordem: 

**Violações de lei (🔴 automático):**
- Repository genérico sobre Eloquent ou regra de negócio implementada diretamente no Controller
  (§5.1 · ADR-02).
- Delete via query builder em model Auditable (§5.2) · pivot sincronizado sem `auditSync`.
- `generated.ts` editado à mão · `Data` fora de `Domains/*/Data` ou `Shared/*/Data` (§5.3).
- `abort(422)` ou erro montado à mão em vez de `ValidationException::withMessages` (§5.4).
- Feature importando `primereact` direto ou outra feature — inclusive só para tipo (§5.6).
- Financeiro usado como gate (§5.7).


**Violações de convenção (🔴/🟡 conforme o dano):**
- `XData::from([...])` montando resposta em vez de `fromModel()`.
- Coleção nested sem `Optional` (apaga em silêncio — peso legal).
- `CreateX` que não sincroniza o que `UpdateX` sincroniza.
- `Field`/`UnmappedErrors` local em vez do kit `shared/ui/FormField/`.
- `key={item.id}` em lista de replace-total.
- `setForm` vazando para o componente via helper solto.
- `useEffect` para resetar form.
- Regra de coleção fechada só no caminho da tela, não nas rotas nested.
- Escrita direta no Controller quando a rule vigente da entidade exige uma Action, ainda que a
  operação pareça CRUD simples. 

**Catálogo universal (só o que o acima não cobre):** duplicação em vez de abstração; classe-deus;
`mixed`/`any` para calar o compilador; catch vazio; string mágica; três jeitos de buscar dado;
N+1 sem eager loading; `env()` fora de `config/`; feature que ninguém pediu.

## Formato de cada achado

```
### [Q-N] Título — arquivo:linhas
**Encontrado:**   [trecho real, enxuto]
**Sênior faria:** [versão alvo, mesma funcionalidade]
**Por quê:**      [princípio + consequência NESTE projeto]
**Fere:**         [lei §N / lição N / ADR-NN / rule — ou "catálogo universal"]
**Severidade:**   🔴 antes do próximo bloco | 🟡 em breve | 🟢 melhoria
**Esforço:**      P (<30min) / M (<2h) / G (>2h)
```

## Regras da revisão

- **Máximo 10 achados**, os de maior impacto. Revisão com 40 itens é ruído, não revisão.
- **Estilo não é achado** — Pint e eslint fazem isso.
- Padrão repetido N vezes = **1 achado** com a lista de ocorrências.
- **Se o código está bom, diga que está bom.** Achado inventado destrói a confiança na skill.
- Achado que é decisão consciente registrada (`backlog.md`, ADR, `pendencias.md`) **não é achado**.

## Saída e handoff

Relatório: órfãos + achados por severidade × esforço. **Aguarde o João aprovar** o que entra.

Quando houver achados aguardando decisão, registre o resumo em `blocker` e transicione:

```yaml
workflow_state: blocked
next_owner: joao
next_action: approve_review_findings
resume_state: reviewing
```

Somente achados aprovados podem ser corrigidos. Após as correções, retome `reviewing` e repita as
checagens pertinentes ao mesmo `active_work_item`.

Trabalho de código deferido vai para `docs/superpowers/backlog.md`. Divergência documental vai para
`docs/pendencias.md`. Nenhum dos dois destinos promove trabalho automaticamente nem substitui o
item ativo.

Não promova automaticamente esse bloco para `state.md` enquanto existir outro
`active_work_item`.

**Padrão reincidente (2+ sprints)** não vira só refactor: vira regra. Proponha o texto para a rule
da camada, ou um ADR se for decisão de arquitetura. Deletar de novo é enxugar gelo.

Quando a revisão estiver limpa, sem achado aguardando decisão ou correção:

```yaml
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
blocker: null
resume_state: null
```

Não execute o fechamento automaticamente.
