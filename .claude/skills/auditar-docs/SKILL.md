---
name: auditar-docs
description: "Audita se a documentação do Lotus ainda reflete o código real e reporta divergências SEM corrigir nada. Use quando o João pedir 'sync docs', 'auditar docs', 'os docs ainda batem?', 'o que divergiu', ao fechar uma sprint, ou depois de um bloco que mudou schema/estrutura. NÃO use para escrever doc novo nem para corrigir divergência — só reporta."
---

# Auditar docs — o doc ainda descreve o que existe?

**Regra número um: reporte, não corrija.** O canônico é o Google Drive e alinhá-lo exige autorização
do João (write externo). Corrigir sem perguntar é o que transforma auditoria em drift silencioso.

## Antes de começar

Leia `docs/superpowers/pendencias/abertas.md`. **Nada que estiver lá é achado novo** — não reporte.

## Como rodar

Despache o subagent `auditor-docs` (Agent tool) com o escopo abaixo. A leitura é pesada — 5 docs
contra a árvore inteira — e os resultados intermediários não interessam à sessão principal; só a
tabela final volta.

Se o subagent não estiver disponível, rode inline, mas leia só o que a checagem exige.

## O que checar

1. **`docs/der-fisico.md`** vs `backend/database/migrations/` — tabela/coluna no código e não no
   DER (ou vice-versa).
2. **`docs/estrutura-monolito.md`** vs a árvore real de `backend/app/Domains/` e `frontend/src/` —
   domínio/feature novo, pasta que sumiu.
3. **`docs/adrs.md`** — decisão que virou padrão de fato mas não tem ADR escrito.
4. **`docs/superpowers/historico/progress.md`** — feature entregue ainda marcada `Ativo`; plano/spec fora de
   `archive/`; linha do bloco ativo sem coluna `Contexto`.
5. **`.claude/rules/*`** — regra que contradiz o código real; `paths:` que não casa com nenhum
   arquivo existente; regra de código que voltou a viver no `CLAUDE.md` ou no `INSTRUÇÕES`.
6. **`CLAUDE.md`** — comando que não roda mais; lei §5 sem mecanismo correspondente no código.
7. **Código sem doc** — domínio/feature/tabela real que nenhum doc menciona.
8. **`docs/superpowers/pendencias/abertas.md`** — pendência com **gatilho vencido** (reporte como achado: pendência
   vencida é dívida, não silenciador).

## Fonte externa se referencia por ID, nunca por nome (2026-07-30)

Quando a auditoria confrontar Drive, Notion ou Figma, cite o **ID** do arquivo, da página ou da
collection — não o título. O workspace tem mais de uma base chamada `Tasks · Lotus Fase 2`, e a
obsoleta responde `search`/`fetch` sem sinalizar nada: o doc-sync de 2026-07-30 auditou a errada e
produziu 12 divergências falsas. A base canônica é
`collection://e64b7d57-d000-4433-b652-a410e75193cc`. Achado externo sem ID na coluna de evidência é
achado sem proveniência — não conta.

## O que procurar em especial (lição 13)

**Doc que descreve intenção não-construída é pior que doc ausente.** Procure ativamente por
afirmação de arquitetura que nunca existiu — foi assim que o `app/Data` sobreviveu nas leis
invioláveis por semanas. Doc afirma o que **é**; o que se pretende vai marcado como pendência.

## Saída

Tabela, e nada além dela:

| Doc | Divergência | Evidência (arquivo:linha) | Sugestão |

Se não houver divergência, diga isso — achado inventado destrói a confiança na auditoria.
Ao final: quantas divergências, e quantas pendências venceram.