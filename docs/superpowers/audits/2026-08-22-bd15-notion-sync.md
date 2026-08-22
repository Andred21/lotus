# BD-15 · Sincronização do Notion — antes e depois

> Base canônica `collection://e64b7d57-d000-4433-b652-a410e75193cc`
> (database `7e55d684-cdd4-4bf3-b152-e15ce70d324b`). Todo acesso por **ID**; zero busca por título —
> a base homônima obsoleta `collection://6adbc960-3dfa-8269-9d57-8719e44eed2c` ainda responde busca e
> já produziu 12 falsos positivos.
> Escrita **não-destrutiva** (D1): só `update_properties`. Nenhuma página apagada, movida ou mesclada.

**Propriedade de status:** `Status` · **opções:** `Backlog`, `A fazer`, `Em progresso`, `Bloqueada`,
`Concluída`

## Dashboard — 8.4.0 a 8.4.7 (feature entregue em 2026-08-17)

| EAP | Page ID | Antes | Depois |
|---|---|---|---|
| 8.4.0 | `3bcbc9603dfa81c89df1de7d7805816b` | Backlog | Concluída |
| 8.4.1 | `3aabc9603dfa812b9a63d302ef93f44a` | Backlog | Concluída |
| 8.4.2 | `3aabc9603dfa815895d9e9377665fe42` | Backlog | Concluída |
| 8.4.3 | `3aabc9603dfa819a9aa6f6ec245867a0` | Backlog | Concluída |
| 8.4.4 | `3aabc9603dfa81d3a4edcd392b000b56` | Backlog | Concluída |
| 8.4.5 | `3aabc9603dfa8136a4c6db9b4219b026` | Backlog | Concluída |
| 8.4.6 | `3aabc9603dfa81c3ba69f8fdc5b4c925` | Backlog | Concluída |
| 8.4.7 | `3bcbc9603dfa811c8223e910c453f3bc` | Backlog | Concluída |

## Meu Perfil — 8.5.1 a 8.5.9 (feature entregue em 2026-08-18)

| EAP | Page ID | Antes | Depois |
|---|---|---|---|
| 8.5.1 | `3b1bc9603dfa8148b646d019ff354623` | Backlog | Concluída |
| 8.5.2 | `3b1bc9603dfa81968ff1f2802994cc13` | Backlog | Concluída |
| 8.5.3 | `3b1bc9603dfa8181a39df34752c1b98f` | Backlog | Concluída |
| 8.5.4 | `3b1bc9603dfa8181a71bf96b85fbc709` | Backlog | Concluída |
| 8.5.5 | `3b1bc9603dfa81e6914fed4f228b1632` | Backlog | Concluída |
| 8.5.6 | `3bcbc9603dfa8137a7f3df9ab8df33e5` | Backlog | Concluída |
| 8.5.7 | `3bcbc9603dfa8123bb33f91532f6b38b` | Backlog | Concluída |
| 8.5.8 | `3bcbc9603dfa81c79018d783e2fe73c7` | Backlog | Concluída |
| 8.5.9 | `3bcbc9603dfa81958397d1581ce0d854` | Backlog | Concluída |

## 9.1.4 — cobertura de teste que a `main` já tem

| EAP | Page ID | Antes | Depois |
|---|---|---|---|
| 9.1.4 | `388bc9603dfa8119a5ecc157b2cc18d3` | A fazer | Concluída |

A `main` já possui testes dedicados de conclusão de turma, aprovação de cotação e emissão de
certificado. **Nenhum bloco de código foi aberto para repetir essa cobertura** — o backlog proíbe
explicitamente, e o que estava errado era o status da página.

## P-18 — página de fechamento com `Sprint` divergente

O ID que a ficha citava (`f88bc9603dfa8253b40981686f8ae023`) pertence à base **obsoleta**
`collection://6adbc960-3dfa-8269-9d57-8719e44eed2c` e está `deleted`. O alvo canônico é outro.

| Página | Page ID | Campo | Antes | Depois |
|---|---|---|---|---|
| H.1.3.2 fechamento | `3a2bc9603dfa8067902cf3c62bffdb0d` | descrição | Fechamento — Sprint 3 | Fechamento — Sprint 2 |
| H.1.3.2 fechamento | `3a2bc9603dfa8067902cf3c62bffdb0d` | propriedade `Sprint` | Sprint 2 · Comercial | Sprint 2 · Comercial (não tocada) |

**Evidência que decidiu qual lado cede:** a página irmã `3a2bc9603dfa8028a1fbf8a3863690ed` carrega o
mesmo EAP `H.1.3.2` e a mesma descrição `Fechamento — Sprint 3`, mas com a propriedade
`Sprint 3 · Acadêmico`. A Sprint 3 já tem a página de fechamento dela; logo a canônica é a da
Sprint 2 e a descrição é que era resíduo de cópia. A propriedade ficou.

**Medido e deliberadamente NÃO escrito:** as duas páginas compartilham o EAP `H.1.3.2`. Corrigir o
EAP de uma delas escolheria qual das duas sprints perde o código — decisão do João, fora do que
este bloco autorizou.
