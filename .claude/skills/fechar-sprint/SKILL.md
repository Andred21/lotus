---
name: fechar-sprint
description: "Gate de fechamento de sprint ou bloco do Lotus: prova o critério de aceite, roda testes/lint/build/Pint, checa tipos e código morto, arquiva plano/spec e atualiza o histórico progress.md. Use quando o João disser 'fechar a sprint', 'fechar o bloco', 'gate de fechamento', ou invocar /fechar-sprint. NÃO use no meio da execução — é o último passo, depois do comportamento provado."
disable-model-invocation: true
---

## Gate de estado

Leia `docs/superpowers/state.md` primeiro. `workflow_state` deve ser `ready_for_closure`, e o
argumento, quando fornecido, deve corresponder a `active_work_item`.

Qualquer outro estado → PARE:
- `ready_for_review` ou `reviewing`: review ainda não terminou;
- `executing`: implementação ainda está em andamento;
- `planning`: não existe entrega para fechar;
- `blocked`: resolva o bloqueio primeiro.

Não deduza o item a fechar por commits, arquivos, `progress.md` ou backlog.

# Gate de fechamento — $ARGUMENTS

Execute o checklist na ordem. Reporte cada item como ✅/❌ e **PARE no primeiro ❌ que exija
decisão do João.**

## 0. Prove o critério de aceite DESTE bloco (não a higiene genérica)

Rode a verificação própria do bloco e mostre o resultado.
- Bloco corrigiu docs → rode `auditar-docs` e reporte quantas divergências restaram.
- Bloco tocou código → prove o comportamento **end-to-end contra a API real**.

Suíte verde NÃO prova o critério de aceite do bloco. Este item não se pula.

> Prova e2e via curl precisa de `-H 'Origin: <FRONTEND_URL>'` **e** `-H 'Accept: application/json'`.
> Sem `Origin`, o Sanctum não trata a request como stateful → 500. Sem `Accept`, o middleware de auth
> tenta redirecionar para uma rota `login` inexistente → 500. Os dois 500 são do curl, não do código.

## 1. Testes
`docker compose exec -T app php artisan test` (suíte completa, sqlite `:memory:`).

## 2. Front
De `frontend/`: `pnpm lint` e `pnpm build`.

## 3. Pint
`./vendor/bin/pint <arquivos da sprint>` — **NUNCA sem argumento** (reformata o repo inteiro; já
tocou 44 arquivos numa ocorrência, incluindo `use` de classes inexistentes).

## 4. Tipos
DTO mudou → `php artisan typescript:transform`; confirme `generated.ts` commitado e nunca editado
à mão.

## 5. Código morto
`.gitkeep` órfãos, imports não usados, placeholders criados pela sprint. Remova só o que ESTA sprint
criou — dead code alheio se menciona, não se deleta.

## 6. Leis
Nenhuma lei do `CLAUDE.md` §5 foi contrariada. Registro no ledger não autoriza desvio de lei
inviolável; qualquer exceção exige decisão explícita do João Victor e referência dessa decisão.

## 7. Pendências
`docs/pendencias.md`: algum gatilho venceu? Alguma pendência fechou (move para "Encerradas")?
Alguma nasceu nesta sprint?

## 8. Arquivamento

- `git mv` de `active_plan` para `plans/archive/`.
- Arquive `active_spec` em `specs/archive/` somente quando ela não for compartilhada por outro work
  item atual ou futuro já registrado. Spec compartilhada permanece ativa até o último consumidor.
- Atualize referências estritamente necessárias aos paths movidos.

## 9. Histórico e backlog

- Registre a entrega em `docs/superpowers/progress.md` com desfecho em uma linha e referências
  arquivadas. O arquivo continua sendo histórico, nunca estado operacional.
- Mantenha no máximo dez entregas recentes. Ao exceder o limite, mova as mais antigas para
  `docs/superpowers/progress-archive.md` preservando integralmente as linhas históricas.
- Remova de `docs/superpowers/backlog.md` somente o item concluído.
- Nunca selecione nem promova automaticamente o item seguinte, mesmo que a ordem pareça óbvia.

## 10. Estado final

Por padrão, finalize no mesmo commit do fechamento com:

```yaml
active_feature: null
active_work_item: null
workflow_state: idle
next_owner: joao
next_action: select_backlog_item
active_spec: null
active_plan: null
context_packet: null
blocker: null
resume_state: null
last_completed_work_item: <item fechado>
```

Mantenha `state_basis_commit` apontando para o commit anterior que comprova a entrega fechada; não
tente gravar no arquivo o SHA do próprio commit de fechamento.

Somente promova outro item se a mesma instrução atual do João identificar explicitamente esse item.
Nesse caso, valide-o contra o backlog e registre a transição adequada; nunca escolha por ordem.

## Saída

Resumo do que foi fechado, provas executadas, paths arquivados, histórico movido, item removido do
backlog, estado final e o que ficou aberto. Não afirme que testes passaram sem a saída real.
