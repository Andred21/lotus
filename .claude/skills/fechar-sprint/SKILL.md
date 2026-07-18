---
name: fechar-sprint
description: "Gate de fechamento de sprint ou bloco do Lotus: prova o critério de aceite, roda testes/lint/build/Pint, checa tipos e código morto, arquiva plano/spec e atualiza o índice progress.md. Use quando o João disser 'fechar a sprint', 'fechar o bloco', 'gate de fechamento', ou invocar /fechar-sprint. NÃO use no meio da execução — é o último passo, depois do comportamento provado."
---

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
Nenhuma lei do CLAUDE.md §5 contrariada sem registro no ledger.

## 7. Pendências
`docs/pendencias.md`: algum gatilho venceu? Alguma pendência fechou (move para "Encerradas")?
Alguma nasceu nesta sprint?

## 8. Arquivamento
`git mv` do plano+spec da sprint para `plans/archive/` e `specs/archive/`.

## 9. Índice
Atualize `docs/superpowers/progress.md`:
- Status → `Entregue`; caminhos → `archive/`.
- **Desfecho em 1 linha**, priorizando o que evita retrabalho futuro (ex.: "wizard usa useState —
  não promover a Zustand").
- Coluna `Contexto` da linha entregue → `—` (o plano arquivado já carrega o detalhe).
- Bloco sai do backlog; se o próximo bloco já é conhecido, ele entra no backlog **com o contexto
  que vai exigir**.
- Índice passou de 25 linhas? Particione conforme a política no cabeçalho do `progress.md`.

## Saída

Resumo do que foi fechado + o que ficou aberto.