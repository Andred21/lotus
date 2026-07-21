# Pendências conhecidas

> Divergências e dívidas **já registradas**. A skill `auditar-docs` lê este arquivo e **não reporta
> nada daqui como achado novo**. Toda linha tem gatilho — pendência sem prazo vira mentira permanente
> (lição 13). Revisado a cada `/fechar-sprint`.
>
> Isto NÃO é backlog de produto — item de código/feature vai para o backlog do
> `docs/superpowers/progress.md`. Aqui mora só o que faz um doc ou um mecanismo divergir da realidade.


| ID | Pendência | Por que está aberta | Gatilho de expiração |
|---|---|---|---|
| P-01 | `docs/der-fisico.md` em PT/ES vs. schema implementado em inglês | Alinhar o canônico exige write no Drive — pendente de autorização do João | Quando o João autorizar o write externo |
| P-02 | ADR-08 (pruning/retenção da auditoria) segue **aberto** | Política de retenção nunca decidida; `audits` cresce sem poda | Antes de subir para produção |
| P-03 | Compose por worktree não existe | Bloco de backend não pode usar `using-git-worktrees` — o stack monta o main tree e o teste rodaria contra o código errado. **6a (Sprint 3) rodou em main-tree sem atrito — abordagem confirmada** | Reavaliar só se a concorrência de blocos backend passar a doer |
| P-04 | Leis invioláveis (§5) são instrução, não guardrail | Prompt não garante regra sob pressão; Pest Arch tests + eslint-boundaries adiados por decisão | Reavaliar quando a Sprint 3 fechar |
| P-05 | Migrations "adicionais" não consolidadas nas originais | Decisão do João no Bloco 2 — evitar inchaço do folder | Antes de subir para produção |
| P-06 | `der-fisico.md`: `turmas.redator_id` (FK 1:N) vs. pivot `turma_redator` (N:N) implementado | Bloco 6b (2026-07-21, decisão do João): a premissa "ocasionalmente >1 redator por turma" pediu N:N. O der-fisico ainda modela `turmas.redator_id` FK simples e lista `turmas` em "PLANEJADAS" — precisa migrar para implementadas (nomes finais em inglês, colunas reais) e trocar a relação `redatores 1:N → turmas` por N:N via `turma_redator` | Doc-sync da Sprint 3 (`/auditar-docs` no `/fechar-sprint`) |

## Encerradas (mantidas 1 sprint para rastro, depois saem)

| ID | Pendência | Como fechou |
|---|---|---|
| _(nenhuma no momento)_ | — | — |