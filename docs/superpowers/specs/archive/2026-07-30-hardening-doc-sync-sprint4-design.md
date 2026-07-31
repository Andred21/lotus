# Design — Hardening · H.1.3.1 · Sincronização de documentação e fontes canônicas

**Work item:** `hardening-doc-sync-sprint4` · **Data:** 2026-07-30 · **Packet:**
`docs/superpowers/context-packets/hardening-doc-sync-sprint4.md` (`ready`)

## 1. Contexto

O Lotus tem quatro registros da mesma verdade: o código, os snapshots em `/docs`, o planejamento
canônico no Google Drive e a organização de tasks no Notion. Por lei do projeto o Drive vence — logo
um Drive desatualizado não é detalhe cosmético: é a fonte que um bloco futuro vai consultar para
derivar o fato errado. Três pendências vivem exatamente nesse buraco (P-01, P-06, P-14) e duas delas
esperam autorização de write externo desde a Sprint 1.

O packet recuperou 5 fontes (4 documentos do Drive canônico + a task H.1.3.1 no Notion) e já
confirmou o dano: o Drive ainda determina `turmas.redator_id` 1:N contra o pivot `turma_redator` N:N
implementado, ainda escreve `/api/alunos` contra `/api/students`, e não tem ADR-16/18/19 nem a
revisão de 2026-07-17 do ADR-15. A task do Notion está sem critério de aceite, então o escopo
declarado no backlog é a definição mais completa que existe.

O bloco também nasce com um achado sobre si mesmo: `AGENTS.md` §3 e
`.agents/skills/lotus-context-packet/SKILL.md` §External retrieval afirmam que o Notion não carrega
no runtime do Codex, e a geração do packet de hoje refutou isso por chamada real. Doc de agente que
mente sobre tooling é o caso mais caro da categoria — o v1 do packet do bloco visual voltou
`blocked` por um gap de tooling que não existia.

## 2. Escopo

**Objetivo:** auditar código ↔ `/docs` ↔ Drive ↔ Notion; tornar explícita cada divergência e cada
decisão sem proveniência; corrigir o que é fato; aplicar somente writes externos aprovados um a um;
repor gatilhos válidos nas pendências que sobrarem; e provar o resultado reexecutando a auditoria.

**Não-objetivos:** implementar feature, alterar schema ou comportamento, redesenhar arquitetura,
auditoria visual de UI, implementar os guardrails de P-04, escrever em fonte externa sem aprovação
explícita e nominal.

## 3. Decisões

- **D1 — Write externo é autorizado, item a item.** Cada escrita em fonte canônica é uma parada
  própria: texto final + diff contra o conteúdo atual, aprovação do João para aquele documento,
  aplicação, releitura pelo conector. Escrita em lote foi rejeitada: canônico errado em massa é pior
  que canônico velho.
- **D2 — Varredura aberta, não conjunto fechado.** Nenhuma lista prévia limita o levantamento; as
  divergências já conhecidas entram como piso, não como teto. Lição 13 nasceu de doc que ninguém
  conferiu.
- **D3 — P-04 fica fora.** O assunto de P-04 são as leis §5 (Pest Arch tests + eslint-boundaries),
  não drift de documentação. O bloco registra que o gatilho "quando a Sprint 3 fechar" venceu, repõe
  um gatilho datado e verificável e manda o guardrail para o backlog como item explícito. O gatilho
  novo é escolhido na triagem, com aprovação do João — o bloco não arbitra prazo sozinho.
- **D4 — A via do write no Drive é decidida por sondagem, não por suposição.** O conector desta
  sessão (`mcp__claude_ai_Google_Drive__*`) lê e cria, mas **não atualiza** arquivo existente —
  editar `decisao-stack.md` no lugar é impossível daqui. A Task 1 sonda o runtime do Codex
  (`mcp__codex_apps__google_drive_*`) com uma escrita real em arquivo descartável, em pasta de
  rascunho, nunca no canônico. Falha registra a linha decisiva do erro.
- **D5 — Fallback declarado, não improvisado.** Sem escrita no Drive, o bloco gera um patch por
  documento em `docs/superpowers/audits/2026-07-30-drive-patches/`, com o texto final pronto para o
  João colar. P-01 e P-14 permanecem abertas com gatilho novo: fecham quando ele confirmar aplicado.
- **D6 — Divisão de trabalho por custo de leitura.** O eixo código ↔ `/docs` vai para o subagente
  `auditor-docs`, que existe para isso e devolve só a tabela. O eixo externo e a triagem ficam com
  Claude, que tem os conectores e o contexto das decisões. O Codex entra apenas como braço de
  escrita externa, com prompt fechado, sem tocar o repositório.
- **D7 — Duas fases separadas por portão humano.** Fase 1 levanta e não muda nada; a triagem
  classifica; Fase 2 aplica e prova. Corrigir antes do mapa completo produz correção que a triagem
  global mandaria virar pendência.
- **D8 — O relatório é artefato durável.** `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md`
  (diretório novo). A re-auditoria do DoD compara contra um registro versionado, não contra memória
  de sessão.
- **D9 — Ratificação só para decisão com efeito vivo.** Toda decisão sem proveniência entra na
  tabela; exige ratificação do João apenas quando existe hoje código, schema, permissão ou rota que
  se comporta como ela manda. Decisão sobre o que nunca foi construído, ou já substituída, fica
  registrada e para aí.
- **D10 — Regra de conflito herdada do packet.** Drive vence, exceto quando o repositório registra
  decisão posterior explicitamente do João — foi assim que D3/D5/D7/D10/D11 do bloco de alunos
  sobreviveram ao snapshot antigo. Divergência resolvida não reabre por diferença de data.
- **D11 — Notion recebe escrita mínima.** Só o critério de aceite da task H.1.3.1 (hoje vazio) e
  status de task cuja entrega já aconteceu. Mesmo protocolo de aprovação do D1.
- **D12 — O bloco corrige texto, não comportamento.** Achado de código errado (em vez de doc errado)
  vai para o backlog. Se a triagem mandar tocar rule, teste ou migration, vale a prova mecânica
  normal: suíte verde e Pint nos arquivos tocados.

## 4. Eixos da auditoria

**E1 · código ↔ `/docs`** — `auditor-docs`, escopo dos 8 checks da skill: `der-fisico.md` ↔
`backend/database/migrations/` em tabela, coluna e cardinalidade; `estrutura-monolito.md` ↔ árvore
real de `backend/app/Domains/` e `frontend/src/`; `adrs.md` ↔ padrão de fato sem ADR escrito;
`.claude/rules/*` ↔ código real e `paths:` que não casa com arquivo existente; `CLAUDE.md` ↔ comando
que não roda e lei §5 sem mecanismo; `progress.md` ↔ `plans|specs/archive/`; código sem doc; gatilho
vencido em `pendencias.md`.

**E2 · `/docs` ↔ Drive** — os 4 documentos do registro do packet: `decisao-stack.md` ↔ `adrs.md`,
`modelo-fisico-e-diagramas.md` ↔ `der-fisico.md`, `modelo-conceitual.md` ↔ domínio implementado,
`tela-pessoas.md` ↔ módulo de alunos entregue. Inclui o próprio `docs/README.md`, que afirma
`V2/Planejamento/` como path canônico e lista fontes "não espelhadas" — afirmações nunca conferidas.

**E3 · `/docs` ↔ Notion** — board Sprint 4 e as tasks dos blocos entregues. Escopo fechado: status
de task contra entrega real, e a task H.1.3.1 sem critério de aceite.

**E4 · docs de agente** — `AGENTS.md` §3 e `.agents/skills/lotus-context-packet/SKILL.md` §External
retrieval contra a disponibilidade real dos conectores no runtime do Codex, com a data da
verificação.

## 5. Triagem

Cada linha do relatório recebe exatamente um destino:

| Destino | Critério |
|---|---|
| Corrigir agora | O doc afirma o que não existe e a correção é fato, não decisão |
| Pendência com gatilho | Resolver exige decisão de produto, do contratante, ou trabalho fora do bloco |
| Ratificação | Decisão governa código vivo sem proveniência do João (D9) |
| Write externo | O errado é o canônico: o Drive muda, o repositório fica |

Gatilho novo é datado e verificável. "Quando a Sprint X fechar" não é aceito de novo — foi
exatamente o gatilho que deixou P-04 e P-06 vencerem em silêncio (lição 13).

Decisão ratificada vira ADR em `docs/adrs.md` quando é arquitetura, ou linha em `pendencias.md`
quando é divergência aceita. Rejeitada vira achado de código no backlog.

## 6. Definition of done

1. Re-execução do `auditor-docs` depois da Fase 2 devolve zero achados que não sejam linha
   registrada em `pendencias.md`. A tabela final é a prova.
2. Nenhuma pendência aberta com gatilho vencido ou não verificável.
3. P-06 fechada: `der-fisico.md` modela `turma_redator` N:N e `turmas` entre as tabelas
   implementadas, com colunas reais, conferido contra a migration.
4. `AGENTS.md` §3 e a SKILL.md do packet dizem a verdade sobre o Notion, com data de verificação.
5. Todo write externo aprovado tem evidência de aplicação (ID do arquivo, revisão, timestamp) e
   releitura pelo conector confirmando o conteúdo. No fallback D5: patch entregue e pendência
   mantida aberta.
6. Toda decisão com efeito vivo está ratificada, rejeitada ou explicitamente pendente — nenhuma
   linha sem status.
7. Se a triagem mandar tocar código: suíte verde e Pint nos arquivos tocados.

## 7. Riscos e limitações declaradas

- **O tamanho da Fase 2 só existe depois do portão.** O plano nasce com as tasks da Fase 1 fechadas
  e as da Fase 2 parametrizadas pela triagem.
- **A escrita no Drive pode não existir** em nenhum runtime disponível; nesse caso o fechamento de
  P-01/P-14 depende do João, e o bloco entrega o patch, não o alinhamento.
- **A task do Notion não tem critério de aceite** — o escopo do backlog é a definição mais completa
  disponível (fato 1 do packet), e o bloco não inventa critério externo.
- **Figma fora do escopo:** o bloco não é de UI, e o packet registra a decisão. Revalidação de P-16
  fica diferida.
- **Autorização de write externo é por documento e nominal.** Aprovação de um documento não se
  estende ao seguinte.

## 8. Fontes

Packet `hardening-doc-sync-sprint4.md` (5 fontes, `ready`) · `docs/superpowers/backlog.md` item 1 ·
`docs/pendencias.md` (P-01, P-04, P-06, P-14/15/16) · `docs/README.md` (lições 13 e 14) ·
`.claude/skills/auditar-docs/SKILL.md` · `.claude/agents/auditor-docs.md`
