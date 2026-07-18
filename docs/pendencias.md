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
| P-03 | Compose por worktree não existe | Bloco de backend não pode usar `using-git-worktrees` — o stack monta o main tree e o teste rodaria contra o código errado | Antes da Sprint 3 (Bloco 6) |
| P-04 | Leis invioláveis (§5) são instrução, não guardrail | Prompt não garante regra sob pressão; Pest Arch tests + eslint-boundaries adiados por decisão | Reavaliar quando a Sprint 3 fechar |
| P-05 | Migrations "adicionais" não consolidadas nas originais | Decisão do João no Bloco 2 — evitar inchaço do folder | Antes de subir para produção |

## Encerradas (mantidas 1 sprint para rastro, depois saem)

| ID | Pendência | Como fechou |
|---|---|---|
| P-00 | ADR-15 (i18n) descrevia arquitetura inexistente ("compilar PHP → JSON via Vite") | Bloco 5.1 reescreveu o ADR contra a realidade (i18next, dicionários separados por camada) |